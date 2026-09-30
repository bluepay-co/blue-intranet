import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { Role } from '../models/usuario.model';
import { JWT_ALGORITHM, SESSION_COOKIE } from './auth-constants';

export interface AuthPayload {
  id: number;
  email: string;
  role: Role;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      usuario?: AuthPayload;
    }
  }
}

// Só este código faz o front deslogar — outros 401 não derrubam a sessão.
export const CODIGO_SESSAO_INVALIDA = 'SESSAO_INVALIDA';

const VERIFY_OPTS = { algorithms: [JWT_ALGORITHM] as [typeof JWT_ALGORITHM] };

function lerCookie(req: Request, nome: string): string | undefined {
  const raw = req.headers.cookie;
  if (!raw) return undefined;
  const par = raw.split(';').find((c) => c.trim().startsWith(`${nome}=`));
  return par?.split('=').slice(1).join('=').trim();
}

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    return res.status(500).json({ message: 'Configuração de autenticação ausente no servidor.' });
  }

  // 1. Header Authorization (compatibilidade com chamadas programáticas)
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) {
    try {
      req.usuario = jwt.verify(header.slice(7).trim(), secret, VERIFY_OPTS) as AuthPayload;
      return next();
    } catch { /* cai pro cookie */ }
  }

  // 2. Cookie httpOnly (navegador — padrão principal)
  const cookieToken = lerCookie(req, SESSION_COOKIE);
  if (cookieToken) {
    try {
      req.usuario = jwt.verify(cookieToken, secret, VERIFY_OPTS) as AuthPayload;
      return next();
    } catch { /* expirado/inválido */ }
  }

  return res.status(401).json({ message: 'Token de autenticação não fornecido.', codigo: CODIGO_SESSAO_INVALIDA });
}
