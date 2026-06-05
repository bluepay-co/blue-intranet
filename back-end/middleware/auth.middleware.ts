import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { Role } from '../models/usuario.model';

/** Conteúdo assinado dentro do JWT da sessão. */
export interface AuthPayload {
  id: number;
  email: string;
  role: Role;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      /** Usuário autenticado, populado pelo authMiddleware. */
      usuario?: AuthPayload;
    }
  }
}

/**
 * Valida o JWT do header Authorization (`Bearer <token>`) e injeta o usuário
 * autenticado em `req.usuario`. Responde 401 quando ausente/ inválido/ expirado.
 */
export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Token de autenticação não fornecido.' });
  }

  const token = header.slice(7).trim();
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    return res.status(500).json({ message: 'Configuração de autenticação ausente no servidor.' });
  }

  try {
    req.usuario = jwt.verify(token, secret) as AuthPayload;
    return next();
  } catch {
    return res.status(401).json({ message: 'Token inválido ou expirado.' });
  }
}
