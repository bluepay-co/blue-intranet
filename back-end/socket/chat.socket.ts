import type { Server } from 'socket.io';
import { pool } from '../database/pool';
import { socketAuthMiddleware } from './socket-auth.middleware';
import * as chatService from '../services/chat.service';

export function registrarChatSocket(io: Server): void {
  io.use(socketAuthMiddleware);

  io.on('connection', (socket) => {
    const usuario = socket.data.usuario;

    /** Verifica se o usuário é membro de um canal (sem lançar exceção — retorna boolean). */
    async function isMembro(canalId: number): Promise<boolean> {
      const { rows } = await pool.query(
        `SELECT 1 FROM chat_canal_membros WHERE canal_id = $1 AND usuario_id = $2`,
        [canalId, usuario.id],
      );
      return rows.length > 0;
    }

    socket.on('join_canal', async ({ canal_id }: { canal_id: number }) => {
      try {
        if (!(await isMembro(canal_id))) {
          socket.emit('erro', { message: 'Acesso negado a este canal.' });
          return;
        }
        await socket.join(`canal_${canal_id}`);
      } catch (err) {
        socket.emit('erro', { message: 'Erro ao entrar no canal.' });
      }
    });

    socket.on('leave_canal', ({ canal_id }: { canal_id: number }) => {
      socket.leave(`canal_${canal_id}`);
    });

    socket.on(
      'nova_mensagem',
      async ({
        canal_id,
        conteudo,
        anexo_url,
        anexo_nome,
        anexo_mime,
      }: {
        canal_id: number;
        conteudo?: string;
        anexo_url?: string;
        anexo_nome?: string;
        anexo_mime?: string;
      }) => {
        try {
          const anexo =
            anexo_url && anexo_nome && anexo_mime
              ? { url: anexo_url, nome: anexo_nome, mime: anexo_mime }
              : undefined;

          const mensagem = await chatService.enviarMensagem(
            canal_id,
            usuario.id,
            conteudo ?? null,
            anexo,
          );

          io.to(`canal_${canal_id}`).emit('nova_mensagem', mensagem);
        } catch (err: any) {
          socket.emit('erro', { message: err?.message ?? 'Erro ao enviar mensagem.' });
        }
      },
    );

    socket.on(
      'editar_mensagem',
      async ({ mensagem_id, novo_conteudo }: { mensagem_id: number; novo_conteudo: string }) => {
        try {
          const mensagem = await chatService.editarMensagem(mensagem_id, usuario.id, novo_conteudo);
          io.to(`canal_${mensagem.canal_id}`).emit('mensagem_editada', mensagem);
        } catch (err: any) {
          socket.emit('erro', { message: err?.message ?? 'Erro ao editar mensagem.' });
        }
      },
    );

    socket.on('deletar_mensagem', async ({ mensagem_id }: { mensagem_id: number }) => {
      try {
        const { rows } = await pool.query<{ canal_id: number }>(
          `SELECT canal_id FROM chat_mensagens WHERE id = $1`,
          [mensagem_id],
        );
        const canalId = rows[0]?.canal_id;

        await chatService.deletarMensagem(mensagem_id, usuario.id);

        if (canalId) {
          io.to(`canal_${canalId}`).emit('mensagem_deletada', {
            mensagem_id,
            canal_id: canalId,
          });
        }
      } catch (err: any) {
        socket.emit('erro', { message: err?.message ?? 'Erro ao excluir mensagem.' });
      }
    });

    socket.on('marcar_lido', async ({ canal_id }: { canal_id: number }) => {
      try {
        await chatService.marcarLido(canal_id, usuario.id);
      } catch {
        // Silencia — não crítico
      }
    });
  });
}
