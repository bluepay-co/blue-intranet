import type { Server } from 'socket.io';

/** Referência global ao servidor Socket.io. Definida em server.ts antes de iniciar o HTTP. */
let _io: Server | null = null;

export function setIo(instance: Server): void {
  _io = instance;
}

/** Retorna o servidor Socket.io. Lança se chamado antes de server.ts inicializar. */
export function getIo(): Server {
  if (!_io) throw new Error('Socket.io não foi inicializado ainda.');
  return _io;
}
