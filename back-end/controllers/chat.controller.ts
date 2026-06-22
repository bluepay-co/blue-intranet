import type { Request, Response, NextFunction } from 'express';
import * as chatService from '../services/chat.service';
import { pool } from '../database/pool';
import { getIo } from '../socket/io-instance';

export async function getCanais(req: Request, res: Response, next: NextFunction) {
  try {
    const canais = await chatService.listarCanaisDoUsuario(req.usuario!.id);
    res.json(canais);
  } catch (err) {
    next(err);
  }
}

export async function getNaoLidos(req: Request, res: Response, next: NextFunction) {
  try {
    const total = await chatService.contarNaoLidos(req.usuario!.id);
    res.json({ total });
  } catch (err) {
    next(err);
  }
}

export async function postCanalCustomizado(req: Request, res: Response, next: NextFunction) {
  try {
    const { nome, membro_ids } = req.body as { nome: string; membro_ids: number[] };
    const canalId = await chatService.criarCanalCustomizado(req.usuario!.id, nome, membro_ids ?? []);
    res.status(201).json({ canal_id: canalId });
  } catch (err) {
    next(err);
  }
}

export async function getOrCreatePrivado(req: Request, res: Response, next: NextFunction) {
  try {
    const { usuario_id } = req.body as { usuario_id: number };
    const result = await chatService.buscarOuCriarCanalPrivado(req.usuario!.id, Number(usuario_id));
    res.status(result.novo ? 201 : 200).json(result);
  } catch (err) {
    next(err);
  }
}

export async function getMensagens(req: Request, res: Response, next: NextFunction) {
  try {
    const canalId = Number(req.params.id);
    const limite = Math.min(Number(req.query.limite ?? 40), 100);
    const antes = req.query.antes ? new Date(req.query.antes as string) : undefined;
    const mensagens = await chatService.listarMensagens(canalId, req.usuario!.id, limite, antes);
    res.json(mensagens);
  } catch (err) {
    next(err);
  }
}

export async function postMensagem(req: Request, res: Response, next: NextFunction) {
  try {
    const canalId = Number(req.params.id);
    const { conteudo } = req.body as { conteudo?: string };

    let anexo: { url: string; nome: string; mime: string } | undefined;
    if (req.file) {
      anexo = {
        url: `/uploads/chat/${req.file.filename}`,
        nome: req.file.originalname,
        mime: req.file.mimetype,
      };
    }

    const mensagem = await chatService.enviarMensagem(
      canalId,
      req.usuario!.id,
      conteudo ?? null,
      anexo,
    );

    // Broadcast via Socket.io para todos os membros da room
    getIo().to(`canal_${canalId}`).emit('nova_mensagem', mensagem);

    res.status(201).json(mensagem);
  } catch (err) {
    next(err);
  }
}

export async function patchMensagem(req: Request, res: Response, next: NextFunction) {
  try {
    const mensagemId = Number(req.params.id);
    const { conteudo } = req.body as { conteudo: string };
    const mensagem = await chatService.editarMensagem(mensagemId, req.usuario!.id, conteudo);

    getIo().to(`canal_${mensagem.canal_id}`).emit('mensagem_editada', mensagem);

    res.json(mensagem);
  } catch (err) {
    next(err);
  }
}

export async function deleteMensagem(req: Request, res: Response, next: NextFunction) {
  try {
    const mensagemId = Number(req.params.id);

    // Precisamos do canal_id antes de deletar para fazer o broadcast
    const { rows } = await pool.query<{ canal_id: number }>(
      `SELECT canal_id FROM chat_mensagens WHERE id = $1`,
      [mensagemId],
    );
    const canalId = rows[0]?.canal_id;

    await chatService.deletarMensagem(mensagemId, req.usuario!.id);

    if (canalId) {
      getIo().to(`canal_${canalId}`).emit('mensagem_deletada', { mensagem_id: mensagemId, canal_id: canalId });
    }

    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

export async function patchLeitura(req: Request, res: Response, next: NextFunction) {
  try {
    const canalId = Number(req.params.id);
    await chatService.marcarLido(canalId, req.usuario!.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

export async function getBuscarUsuarios(req: Request, res: Response, next: NextFunction) {
  try {
    const q = req.query.q as string;
    const usuarios = await chatService.buscarUsuariosParaDM(q, req.usuario!.id);
    res.json(usuarios);
  } catch (err) {
    next(err);
  }
}
