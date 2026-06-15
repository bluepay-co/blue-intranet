import { pool } from '../database/pool';
import { Role } from '../models/usuario.model';
import type { UsuarioAdmin } from '../models/usuario.model';
import { AppError } from '../utils/app-error';

/** Colunas seguras devolvidas ao painel da T.I (nunca expõe tokens do Google). */
const COLUNAS_ADMIN = 'id, nome, email, role, bloqueado, criado_em';

/** Conjunto de cargos válidos, espelhando o enum Role (única fonte de verdade). */
const ROLES_VALIDOS = new Set<string>(Object.values(Role));

/** Valida e normaliza o id do usuário-alvo vindo da rota. */
function validarId(id: unknown): number {
  const n = Number(id);
  if (!Number.isInteger(n) || n <= 0) {
    throw new AppError('Identificador de usuário inválido.', 400);
  }
  return n;
}

/**
 * Lista todos os usuários cadastrados (ordem alfabética) para o painel da T.I.
 * @returns Dados administrativos de cada usuário (sem tokens do Google).
 */
export async function listarUsuarios(): Promise<UsuarioAdmin[]> {
  const { rows } = await pool.query<UsuarioAdmin>(
    `SELECT ${COLUNAS_ADMIN} FROM usuarios ORDER BY nome ASC`,
  );
  return rows;
}

/**
 * Bloqueia ou desbloqueia o acesso de um usuário.
 *
 * @param actorId  Id da T.I que está executando a ação (não pode ser o alvo).
 * @param alvoId   Id do usuário a ter o acesso alterado.
 * @param bloqueado Novo estado de bloqueio (boolean estrito).
 * @returns Usuário atualizado.
 * @throws {AppError} 400 payload inválido, 409 alvo é a própria conta, 404 inexistente.
 */
export async function definirBloqueio(
  actorId: number,
  alvoId: unknown,
  bloqueado: unknown,
): Promise<UsuarioAdmin> {
  const id = validarId(alvoId);

  if (typeof bloqueado !== 'boolean') {
    throw new AppError('O campo `bloqueado` deve ser booleano.', 400);
  }
  if (id === actorId) {
    throw new AppError('Você não pode bloquear a própria conta.', 409);
  }

  const { rows } = await pool.query<UsuarioAdmin>(
    `UPDATE usuarios SET bloqueado = $1, atualizado_em = now()
     WHERE id = $2 RETURNING ${COLUNAS_ADMIN}`,
    [bloqueado, id],
  );

  const usuario = rows[0];
  if (!usuario) {
    throw new AppError('Usuário não encontrado.', 404);
  }
  return usuario;
}

/**
 * Altera o cargo (role) de um usuário, controlando o que ele enxerga no sistema.
 *
 * @param actorId Id da T.I que está executando a ação (não pode ser o alvo).
 * @param alvoId  Id do usuário a ter o cargo alterado.
 * @param role    Novo cargo; precisa pertencer ao enum Role.
 * @returns Usuário atualizado.
 * @throws {AppError} 400 cargo inválido, 409 alvo é a própria conta, 404 inexistente.
 */
export async function definirRole(
  actorId: number,
  alvoId: unknown,
  role: unknown,
): Promise<UsuarioAdmin> {
  const id = validarId(alvoId);

  if (typeof role !== 'string' || !ROLES_VALIDOS.has(role)) {
    throw new AppError('Cargo inválido.', 400);
  }
  if (id === actorId) {
    throw new AppError('Você não pode alterar o próprio cargo.', 409);
  }

  const { rows } = await pool.query<UsuarioAdmin>(
    `UPDATE usuarios SET role = $1, atualizado_em = now()
     WHERE id = $2 RETURNING ${COLUNAS_ADMIN}`,
    [role, id],
  );

  const usuario = rows[0];
  if (!usuario) {
    throw new AppError('Usuário não encontrado.', 404);
  }
  return usuario;
}
