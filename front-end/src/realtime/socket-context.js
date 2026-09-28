import { createContext, useContext } from 'react'

/**
 * Conexão Socket.IO única da sessão (chat + avisos de sincronização).
 * Fora do <SocketProvider> devolve um socket nulo — o polling segue sozinho.
 */
export const SocketContext = createContext({ socket: null, conectado: false })

/** @returns {{ socket: import('socket.io-client').Socket | null, conectado: boolean }} */
export function useSocket() {
  return useContext(SocketContext)
}
