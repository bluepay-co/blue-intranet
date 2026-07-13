import type { Server } from 'socket.io';

/**
 * Guarda a instância singleton do Socket.IO para que controllers REST
 * (ex.: envio de anexos via multipart) possam emitir eventos para as rooms.
 * Registrada uma vez no bootstrap do servidor (`server.ts`).
 */
let io: Server | null = null;

export function setIo(instancia: Server): void {
  io = instancia;
}

export function getIo(): Server {
  if (!io) {
    throw new Error('Socket.IO ainda não foi inicializado.');
  }
  return io;
}
