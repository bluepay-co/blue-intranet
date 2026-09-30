import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { JWT_ALGORITHM, SESSION_COOKIE } from './auth-constants';

export const UPLOADS_COOKIE = SESSION_COOKIE;

function lerCookie(req: Request, nome: string): string | undefined {
  const raw = req.headers.cookie;
  if (!raw) return undefined;
  const par = raw.split(';').find((c) => c.trim().startsWith(`${nome}=`));
  return par?.split('=').slice(1).join('=').trim();
}

const VERIFY_OPTS = { algorithms: [JWT_ALGORITHM] as [typeof JWT_ALGORITHM] };

/**
 * Protege `/uploads` exigindo JWT válido via header Authorization ou
 * cookie httpOnly (para <img src>, <a href> e downloads diretos).
 */
export function uploadsAuthMiddleware(req: Request, res: Response, next: NextFunction) {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    return res.status(500).json({ message: 'Configuração de autenticação ausente.' });
  }

  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) {
    try {
      jwt.verify(header.slice(7).trim(), secret, VERIFY_OPTS);
      return next();
    } catch { /* cai pro cookie */ }
  }

  const cookieToken = lerCookie(req, UPLOADS_COOKIE);
  if (cookieToken) {
    try {
      jwt.verify(cookieToken, secret, VERIFY_OPTS);
      return next();
    } catch { /* expirado/inválido */ }
  }

  return res.status(401).json({ message: 'Autenticação necessária para acessar este arquivo.' });
}
