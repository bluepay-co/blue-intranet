import type { Request, Response } from 'express';
import { AppError } from '../utils/app-error';
import { listarUsuarios, definirBloqueio, definirRole } from '../services/usuario.service';

/**
 * GET /api/usuarios  (T.I)
 * Lista todos os usuários cadastrados para o painel de gestão de acessos.
 */
export async function getUsuarios(_req: Request, res: Response) {
  try {
    const usuarios = await listarUsuarios();
    return res.status(200).json({ usuarios });
  } catch (err) {
    if (err instanceof AppError) return res.status(err.statusCode).json({ message: err.message });
    console.error('[usuario.controller] getUsuarios:', err);
    return res.status(500).json({ message: 'Erro interno ao listar usuários.' });
  }
}

/**
 * PATCH /api/usuarios/:id/bloqueio  (T.I)
 * Bloqueia/desbloqueia o acesso do usuário. Body: `{ bloqueado: boolean }`.
 */
export async function patchBloqueio(req: Request, res: Response) {
  try {
    const { bloqueado } = req.body as { bloqueado?: unknown };
    const usuario = await definirBloqueio(req.usuario!.id, req.params.id, bloqueado);
    return res.status(200).json({ usuario });
  } catch (err) {
    if (err instanceof AppError) return res.status(err.statusCode).json({ message: err.message });
    console.error('[usuario.controller] patchBloqueio:', err);
    return res.status(500).json({ message: 'Erro interno ao alterar o bloqueio.' });
  }
}

/**
 * PATCH /api/usuarios/:id/role  (T.I)
 * Altera o cargo do usuário. Body: `{ role: string }`.
 */
export async function patchRole(req: Request, res: Response) {
  try {
    const { role } = req.body as { role?: unknown };
    const usuario = await definirRole(req.usuario!.id, req.params.id, role);
    return res.status(200).json({ usuario });
  } catch (err) {
    if (err instanceof AppError) return res.status(err.statusCode).json({ message: err.message });
    console.error('[usuario.controller] patchRole:', err);
    return res.status(500).json({ message: 'Erro interno ao alterar o cargo.' });
  }
}
