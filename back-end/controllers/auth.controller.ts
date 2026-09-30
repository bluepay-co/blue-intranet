import type { Request, Response } from 'express';
import { autenticarComGoogle, buscarUsuarioPorId } from '../services/auth.service';
import { AppError } from '../utils/app-error';
import { SESSION_COOKIE } from '../middleware/auth-constants';

export async function loginGoogle(req: Request, res: Response) {
  try {
    const { code } = req.body as { code?: string };
    const { token, usuario } = await autenticarComGoogle(code ?? '');

    const isProducao = process.env.NODE_ENV === 'production';
    res.cookie(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: isProducao,
      sameSite: 'lax',
      path: '/',
      maxAge: 8 * 60 * 60 * 1000,
    });
    res.clearCookie(SESSION_COOKIE, { path: '/uploads' });

    return res.status(200).json({ usuario });
  } catch (err) {
    if (err instanceof AppError) {
      return res.status(err.statusCode).json({ message: err.message });
    }
    console.error('[auth.controller] erro inesperado:', err);
    return res.status(500).json({ message: 'Erro interno ao autenticar.' });
  }
}

export function logout(_req: Request, res: Response) {
  res.clearCookie(SESSION_COOKIE, { path: '/' });
  res.clearCookie(SESSION_COOKIE, { path: '/uploads' });
  return res.status(200).json({ message: 'Sessão encerrada.' });
}

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
