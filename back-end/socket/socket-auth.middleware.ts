import type { Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { JWT_ALGORITHM, SESSION_COOKIE } from '../middleware/auth-constants';
import type { AuthPayload } from '../middleware/auth.middleware';

const VERIFY_OPTS = { algorithms: [JWT_ALGORITHM] as [typeof JWT_ALGORITHM] };

function lerCookieDoHandshake(socket: Socket): string | undefined {
  const raw = socket.handshake.headers?.cookie;
  if (!raw) return undefined;
  const par = raw.split(';').find((c) => c.trim().startsWith(`${SESSION_COOKIE}=`));
  return par?.split('=').slice(1).join('=').trim();
}

export function socketAuthMiddleware(socket: Socket, next: (err?: Error) => void): void {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    return next(new Error('Configuração de autenticação ausente no servidor.'));
  }

  // 1. Token explícito no handshake (compatibilidade)
  const authToken = socket.handshake.auth?.token as string | undefined;
  if (authToken) {
    try {
      socket.data.usuario = jwt.verify(authToken, secret, VERIFY_OPTS) as AuthPayload;
      return next();
    } catch { /* cai pro cookie */ }
  }

  // 2. Cookie httpOnly (padrão principal)
  const cookieToken = lerCookieDoHandshake(socket);
  if (cookieToken) {
    try {
      socket.data.usuario = jwt.verify(cookieToken, secret, VERIFY_OPTS) as AuthPayload;
      return next();
    } catch { /* expirado/inválido */ }
  }

  return next(new Error('Unauthorized'));
}
