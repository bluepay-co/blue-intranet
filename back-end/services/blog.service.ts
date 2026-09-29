import { pool } from '../database/pool';
import { AppError } from '../utils/app-error';
import type { AuthPayload } from '../middleware/auth.middleware';
import { Role } from '../models/usuario.model';
import { salaPostBlog, sincronizarSalas } from '../socket/sync';
import type {
  BlogComentario,
  BlogPostFeed,
  BlogPostAdmin,
  BlogReacaoDetalhe,
  ReacaoResult,
  TipoReacao,
} from '../models/blog.model';

const TIPOS_VALIDOS: TipoReacao[] = ['like', 'heart', 'aplauso', 'foguete'];
const MAX_COMENTARIO = 1000;
/** Moderam os comentários (apagam qualquer um). */
const MODERADORES: Role[] = [Role.MARKETING, Role.DESENVOLVEDOR];

/** SQL base reutilizado por listarFeed e listarAdmin. */
const SELECT_POSTS_SQL = `
  SELECT
    bp.id, bp.titulo, bp.conteudo, bp.imagem_url, bp.publicado,
    bp.criado_em, bp.atualizado_em, bp.autor_id,
    u.nome  AS autor_nome,
    u.email AS autor_email,
    COUNT(br.id) FILTER (WHERE br.tipo = 'like')::int    AS like_count,
    COUNT(br.id) FILTER (WHERE br.tipo = 'heart')::int   AS heart_count,
    COUNT(br.id) FILTER (WHERE br.tipo = 'aplauso')::int AS aplauso_count,
    COUNT(br.id) FILTER (WHERE br.tipo = 'foguete')::int AS foguete_count,
    MAX(CASE WHEN br.usuario_id = $1 THEN br.tipo END)   AS minha_reacao,
    (SELECT COUNT(*)::int FROM blog_comentarios bc WHERE bc.post_id = bp.id) AS comentarios_count
  FROM blog_posts bp
  JOIN  usuarios     u  ON u.id  = bp.autor_id
  LEFT JOIN blog_reacoes br ON br.post_id = bp.id
`;

/**
 * Feed público — apenas posts publicados, com contagem de reações e a
 * reação do usuário solicitante (`minha_reacao`).
 */
export async function listarFeed(usuarioId: number): Promise<BlogPostFeed[]> {
  const { rows } = await pool.query<BlogPostFeed>(
    `${SELECT_POSTS_SQL}
     WHERE bp.publicado = true
     GROUP BY bp.id, u.nome, u.email
     ORDER BY bp.criado_em DESC`,
    [usuarioId],
  );
  return rows;
}

/**
 * Painel admin — todos os posts (publicados e rascunhos), visível só para MARKETING.
 */
export async function listarAdmin(usuarioId: number): Promise<BlogPostAdmin[]> {
  const { rows } = await pool.query<BlogPostAdmin>(
    `${SELECT_POSTS_SQL}
     GROUP BY bp.id, u.nome, u.email
     ORDER BY bp.criado_em DESC`,
    [usuarioId],
  );
  return rows;
}

/**
 * Cria um novo post de blog.
 * @param autorId  ID do usuário MARKETING que está criando.
 * @param titulo   Título do post (obrigatório, max 200 chars).
 * @param conteudo Conteúdo completo (obrigatório).
 * @param imagemUrl Caminho relativo do arquivo enviado, ou null.
 * @param publicado Publica imediatamente ou salva como rascunho.
 */
export async function criarPost(
  autorId: number,
  titulo: string,
  conteudo: string,
  imagemUrl: string | null,
  publicado: boolean,
): Promise<{ id: number }> {
  if (!titulo.trim()) throw new AppError('Título é obrigatório.', 400);
  if (!conteudo.trim()) throw new AppError('Conteúdo é obrigatório.', 400);
  if (titulo.trim().length > 200) throw new AppError('Título excede 200 caracteres.', 400);
  if (conteudo.trim().length > 3000) throw new AppError('Conteúdo excede 3000 caracteres.', 400);

  const { rows } = await pool.query<{ id: number }>(
    `INSERT INTO blog_posts (titulo, conteudo, imagem_url, autor_id, publicado)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id`,
    [titulo.trim(), conteudo.trim(), imagemUrl, autorId, publicado],
  );
  if (!rows[0]) throw new AppError('Falha ao persistir o post.', 500);
  return rows[0];
}

/**
 * Edita um post existente. Valida se o post existe antes de atualizar.
 */
export async function editarPost(
  id: number,
  titulo: string,
  conteudo: string,
  imagemUrl: string | null,
  publicado: boolean,
): Promise<void> {
  if (!titulo.trim()) throw new AppError('Título é obrigatório.', 400);
  if (!conteudo.trim()) throw new AppError('Conteúdo é obrigatório.', 400);
  if (titulo.trim().length > 200) throw new AppError('Título excede 200 caracteres.', 400);
  if (conteudo.trim().length > 3000) throw new AppError('Conteúdo excede 3000 caracteres.', 400);

  // `publicado = (publicado OR $4)`: garante o fluxo unidirecional — um post já
  // publicado permanece publicado (edição básica não o devolve a rascunho); um
  // rascunho ainda pode ser publicado marcando a opção no formulário.
  const { rowCount } = await pool.query(
    `UPDATE blog_posts
     SET titulo = $1, conteudo = $2, imagem_url = $3,
         publicado = (publicado OR $4), atualizado_em = now()
     WHERE id = $5`,
    [titulo.trim(), conteudo.trim(), imagemUrl, publicado, id],
  );
  if (!rowCount) throw new AppError('Post não encontrado.', 404);
}

/**
 * Remove um post e retorna o imagem_url para que o controller possa
 * deletar o arquivo físico do disco.
 */
export async function deletarPost(id: number): Promise<string | null> {
  const { rows } = await pool.query<{ imagem_url: string | null }>(
    `DELETE FROM blog_posts WHERE id = $1 RETURNING imagem_url`,
    [id],
  );
  const deletado = rows[0];
  if (!deletado) throw new AppError('Post não encontrado.', 404);
  return deletado.imagem_url;
}

/**
 * Publica um post (rascunho → publicado). Operação IRREVERSÍVEL: um post já
 * publicado não pode voltar para rascunho (responde 409).
 */
export async function togglePublicar(id: number): Promise<{ publicado: boolean }> {
  const { rows } = await pool.query<{ publicado: boolean }>(
    `SELECT publicado FROM blog_posts WHERE id = $1`,
    [id],
  );
  const atual = rows[0];
  if (!atual) throw new AppError('Post não encontrado.', 404);
  if (atual.publicado) {
    throw new AppError('Um post publicado não pode voltar para rascunho.', 409);
  }

  await pool.query(
    `UPDATE blog_posts SET publicado = true, atualizado_em = now() WHERE id = $1`,
    [id],
  );
  return { publicado: true };
}

/**
 * Gerencia a reação de um usuário em um post (toggle):
 * - Sem reação existente → insere.
 * - Mesma reação → remove (toggle off).
 * - Reação diferente → substitui.
 */
export async function reagirPost(
  postId: number,
  usuarioId: number,
  tipo: string,
): Promise<ReacaoResult> {
  if (!TIPOS_VALIDOS.includes(tipo as TipoReacao)) {
    throw new AppError('Tipo de reação inválido.', 400);
  }

  const tipoValidado = tipo as TipoReacao;

  // Verifica se o post existe e está publicado
  const { rows: postRows } = await pool.query(
    `SELECT id FROM blog_posts WHERE id = $1 AND publicado = true`,
    [postId],
  );
  if (!postRows.length) throw new AppError('Post não encontrado.', 404);

  // Verifica reação existente do usuário
  const { rows: reacaoRows } = await pool.query<{ id: number; tipo: TipoReacao }>(
    `SELECT id, tipo FROM blog_reacoes WHERE post_id = $1 AND usuario_id = $2`,
    [postId, usuarioId],
  );

  const reacaoExistente = reacaoRows[0];

  if (!reacaoExistente) {
    await pool.query(
      `INSERT INTO blog_reacoes (post_id, usuario_id, tipo) VALUES ($1, $2, $3)`,
      [postId, usuarioId, tipoValidado],
    );
    return { acao: 'inserida', tipo: tipoValidado };
  }

  if (reacaoExistente.tipo === tipoValidado) {
    await pool.query(`DELETE FROM blog_reacoes WHERE id = $1`, [reacaoExistente.id]);
    return { acao: 'removida', tipo: null };
  }

  await pool.query(`UPDATE blog_reacoes SET tipo = $1 WHERE id = $2`, [tipoValidado, reacaoExistente.id]);
  return { acao: 'atualizada', tipo: tipoValidado };
}

/* ---------- comentários ---------- */

function idValido(valor: unknown, campo: string): number {
  const id = Number(valor);
  if (!Number.isInteger(id) || id <= 0) throw new AppError(`${campo} inválido.`, 400);
  return id;
}

/** Comentários só existem em posts publicados (rascunho não aparece no feed). */
async function garantirPostPublicado(postId: number) {
  const { rowCount } = await pool.query('SELECT 1 FROM blog_posts WHERE id = $1 AND publicado = true', [postId]);
  if (!rowCount) throw new AppError('Post não encontrado.', 404);
}

/** Comentários de um post, do mais antigo ao mais novo (leitura como conversa). */
export async function listarComentarios(usuario: AuthPayload, postIdBruto: unknown): Promise<BlogComentario[]> {
  const postId = idValido(postIdBruto, 'Post');
  await garantirPostPublicado(postId);
  const { rows } = await pool.query<BlogComentario>(
    `SELECT c.id, c.post_id, c.usuario_id, u.nome AS usuario_nome, c.texto, c.criado_em,
            (c.usuario_id = $2 OR $3) AS pode_apagar
       FROM blog_comentarios c
       JOIN usuarios u ON u.id = c.usuario_id
      WHERE c.post_id = $1
      ORDER BY c.criado_em`,
    [postId, usuario.id, MODERADORES.includes(usuario.role)],
  );
  return rows;
}

export async function comentarPost(usuario: AuthPayload, postIdBruto: unknown, textoBruto: unknown): Promise<void> {
  const postId = idValido(postIdBruto, 'Post');
  const texto = typeof textoBruto === 'string' ? textoBruto.trim() : '';
  if (!texto) throw new AppError('Escreva o comentário.', 400);
  if (texto.length > MAX_COMENTARIO) throw new AppError(`Comentário excede ${MAX_COMENTARIO} caracteres.`, 400);
  await garantirPostPublicado(postId);
  await pool.query('INSERT INTO blog_comentarios (post_id, usuario_id, texto) VALUES ($1, $2, $3)', [
    postId,
    usuario.id,
    texto,
  ]);
  // Depois de gravado: quem está com a conversa aberta busca de novo.
  sincronizarSalas([salaPostBlog(postId)], 'blog_comentarios');
}

/** O autor apaga o próprio comentário; Marketing/Desenvolvedor apagam qualquer um. */
export async function apagarComentario(usuario: AuthPayload, idBruto: unknown): Promise<void> {
  const id = idValido(idBruto, 'Comentário');
  const { rows } = await pool.query<{ usuario_id: number; post_id: number }>(
    'SELECT usuario_id, post_id FROM blog_comentarios WHERE id = $1',
    [id],
  );
  const comentario = rows[0];
  if (!comentario) throw new AppError('Comentário não encontrado.', 404);
  if (comentario.usuario_id !== usuario.id && !MODERADORES.includes(usuario.role)) {
    throw new AppError('Você só pode apagar os seus comentários.', 403);
  }
  await pool.query('DELETE FROM blog_comentarios WHERE id = $1', [id]);
  sincronizarSalas([salaPostBlog(comentario.post_id)], 'blog_comentarios');
}

/* ---------- métricas (painel do Marketing) ---------- */

/** Quem reagiu a um post (mais recente primeiro), com o cargo para o engajamento por setor. */
export async function listarReacoesDoPost(postIdBruto: unknown): Promise<BlogReacaoDetalhe[]> {
  const postId = idValido(postIdBruto, 'Post');
  const { rowCount } = await pool.query('SELECT 1 FROM blog_posts WHERE id = $1', [postId]);
  if (!rowCount) throw new AppError('Post não encontrado.', 404);
  const { rows } = await pool.query<BlogReacaoDetalhe>(
    `SELECT br.tipo, br.criado_em, u.nome AS usuario_nome, u.role AS usuario_role
       FROM blog_reacoes br
       JOIN usuarios u ON u.id = br.usuario_id
      WHERE br.post_id = $1
      ORDER BY br.criado_em DESC`,
    [postId],
  );
  return rows;
}
