import { pool } from '../database/pool';
import type { Atualizacao } from '../models/atualizacao.model';

/**
 * Domínio: avisos de atualização da intranet (`update_notify`).
 * Criação/edição/remoção são restritas ao T.I. (validado nas rotas); a leitura
 * dos recentes é liberada para qualquer usuário logado (fonte do card modal).
 */

const COLUNAS = `id, titulo, subtitulo, categoria, publicar_em AS "publicar_em", criado_por AS "criado_por", criado_em AS "criado_em", atualizado_em AS "atualizado_em"`;

/** Momento efetivo em que o aviso passa a valer: o agendado, ou a criação se não houver. */
const QUANDO = `COALESCE(publicar_em, criado_em)`;

/**
 * Todos os avisos (inclusive os agendados para o futuro), ordenados pelo momento
 * efetivo — usado na página de gestão do T.I., que precisa ver os agendados.
 */
export async function listarTodas(): Promise<Atualizacao[]> {
  const { rows } = await pool.query(
    `SELECT ${COLUNAS} FROM blue_intranet.update_notify ORDER BY ${QUANDO} DESC`,
  );
  return rows;
}

/**
 * Avisos já "no ar" (momento efetivo <= agora) e recentes (últimos `dias`) —
 * fonte do card modal global. Avisos agendados para o futuro ficam de fora até
 * a hora chegar.
 */
export async function listarRecentes(dias = 14, limite = 10): Promise<Atualizacao[]> {
  const { rows } = await pool.query(
    `SELECT ${COLUNAS}
       FROM blue_intranet.update_notify
      WHERE ${QUANDO} <= now()
        AND ${QUANDO} >= now() - ($1 || ' days')::interval
      ORDER BY ${QUANDO} DESC
      LIMIT $2`,
    [String(dias), limite],
  );
  return rows;
}

export async function criar(
  titulo: string,
  subtitulo: string | null,
  categoria: string,
  publicarEm: Date | null,
  criadoPor: number | null,
): Promise<Atualizacao> {
  const { rows } = await pool.query(
    `INSERT INTO blue_intranet.update_notify (titulo, subtitulo, categoria, publicar_em, criado_por)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING ${COLUNAS}`,
    [titulo, subtitulo, categoria, publicarEm, criadoPor],
  );
  return rows[0];
}

export async function atualizar(
  id: number,
  titulo: string,
  subtitulo: string | null,
  categoria: string,
  publicarEm: Date | null,
): Promise<Atualizacao | null> {
  const { rows } = await pool.query(
    `UPDATE blue_intranet.update_notify
        SET titulo = $2, subtitulo = $3, categoria = $4, publicar_em = $5, atualizado_em = now()
      WHERE id = $1
      RETURNING ${COLUNAS}`,
    [id, titulo, subtitulo, categoria, publicarEm],
  );
  return rows[0] ?? null;
}

export async function remover(id: number): Promise<boolean> {
  const { rowCount } = await pool.query(
    `DELETE FROM blue_intranet.update_notify WHERE id = $1`,
    [id],
  );
  return (rowCount ?? 0) > 0;
}
