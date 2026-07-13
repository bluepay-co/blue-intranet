import type { Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import type { AuthPayload } from '../middleware/auth.middleware';

/**
 * Middleware de handshake do Socket.IO: valida o JWT enviado em
 * `socket.handshake.auth.token` e injeta o usuário em `socket.data.usuario`.
 * Espelha o `authMiddleware` das rotas REST.
 */
export function socketAuthMiddleware(socket: Socket, next: (err?: Error) => void): void {
  const token = socket.handshake.auth?.token as string | undefined;

  if (!token) {
    return next(new Error('Unauthorized'));
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    return next(new Error('Configuração de autenticação ausente no servidor.'));
  }

  try {
    socket.data.usuario = jwt.verify(token, secret) as AuthPayload;
    return next();
  } catch {
    return next(new Error('Unauthorized'));
  }
}
