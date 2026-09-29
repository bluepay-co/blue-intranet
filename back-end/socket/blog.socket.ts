import type { Server } from 'socket.io';
import { pool } from '../database/pool';
import { salaPostBlog } from './sync';

/** Conversas abertas ao mesmo tempo por conexão (freio contra emissão em loop). */
const MAX_SALAS_BLOG = 20;

/**
 * Salas dos comentários do Blog: quem está com a conversa de um post aberta
 * (feed ou painel do Marketing) entra em `blog_post_<id>` e recebe o aviso
 * `sync` "blog_comentarios" quando alguém comenta ou apaga ali. Quem não está
 * com a conversa aberta não recebe nada — nenhuma busca extra na empresa.
 * A autenticação do socket já roda no middleware registrado pelo chat.
 */
export function registrarBlogSocket(io: Server): void {
  io.on('connection', (socket) => {
    socket.on('blog_assistir', async ({ post_id }: { post_id: number }) => {
      const id = Number(post_id);
      if (!Number.isInteger(id) || id <= 0) return;
      const sala = salaPostBlog(id);
      if (socket.rooms.has(sala)) return; // já está: não consulta o banco de novo
      const abertas = [...socket.rooms].filter((r) => r.startsWith('blog_post_')).length;
      if (abertas >= MAX_SALAS_BLOG) return;
      try {
        // Comentários só existem em posts publicados (os mesmos que o feed mostra).
        const { rowCount } = await pool.query('SELECT 1 FROM blog_posts WHERE id = $1 AND publicado = true', [id]);
        if (rowCount) await socket.join(sala);
      } catch (err) {
        console.error('[blog.socket] falha ao entrar na sala do post:', err);
      }
    });

    socket.on('blog_parar', ({ post_id }: { post_id: number }) => {
      const id = Number(post_id);
      if (Number.isInteger(id) && id > 0) socket.leave(salaPostBlog(id));
    });
  });
}
