import type { Request, Response } from 'express';
import { autenticarComGoogle, buscarUsuarioPorId } from '../services/auth.service';
import { AppError } from '../utils/app-error';

/**
 * POST /api/auth/google
 * Recebe `{ code }` do Frontend, delega ao service e devolve `{ token, usuario }`.
 * Sem lógica de negócio: apenas orquestra requisição/resposta e mapeia erros.
 */
export async function loginGoogle(req: Request, res: Response) {
  try {
    const { code } = req.body as { code?: string };
    const result = await autenticarComGoogle(code ?? '');
    return res.status(200).json(result);
  } catch (err) {
    if (err instanceof AppError) {
      return res.status(err.statusCode).json({ message: err.message });
    }
    console.error('[auth.controller] erro inesperado:', err);
    return res.status(500).json({ message: 'Erro interno ao autenticar.' });
  }
}

/**
 * GET /api/auth/me  (protegida por authMiddleware)
 * Devolve os dados públicos do usuário do JWT — usada pelo Frontend para
 * restaurar/validar a sessão e montar a navegação por cargo (RBAC).
 */
export async function me(req: Request, res: Response) {
  try {
    if (!req.usuario) {
      return res.status(401).json({ message: 'Usuário não autenticado.' });
    }
    const usuario = await buscarUsuarioPorId(req.usuario.id);
    return res.status(200).json({ usuario });
  } catch (err) {
    if (err instanceof AppError) {
      return res.status(err.statusCode).json({ message: err.message });
    }
    console.error('[auth.controller] erro inesperado em /me:', err);
    return res.status(500).json({ message: 'Erro interno ao carregar o usuário.' });
  }
}
