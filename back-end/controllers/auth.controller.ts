import type { Request, Response } from 'express';
import { autenticarComGoogle } from '../services/auth.service';
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
