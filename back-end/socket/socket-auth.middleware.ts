import type { Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import type { AuthPayload } from '../middleware/auth.middleware';

/** Adiciona `usuario` ao SocketData do socket.io. */
declare module 'socket.io' {
  interface SocketData {
    usuario: AuthPayload;
  }
}

/**
 * Middleware de autenticação para Socket.io.
 * Extrai o JWT de `socket.handshake.auth.token` e injeta `socket.data.usuario`.
 */
export function socketAuthMiddleware(
  socket: Socket,
  next: (err?: Error) => void,
): void {
  const token = socket.handshake.auth?.token as string | undefined;

  if (!token) {
    return next(new Error('Unauthorized'));
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    return next(new Error('Unauthorized'));
  }

  try {
    socket.data.usuario = jwt.verify(token, secret) as AuthPayload;
    next();
  } catch {
    next(new Error('Unauthorized'));
  }
}
