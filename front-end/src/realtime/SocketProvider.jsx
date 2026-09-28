import { useEffect, useMemo, useState } from 'react'
import { io as socketIO } from 'socket.io-client'
import { useAuth } from '@/auth/auth-context'
import { TOKEN_KEY } from '@/api/api'
import { SocketContext } from './socket-context'

/**
 * Abre UMA conexão Socket.IO por aba e a compartilha: o chat troca mensagens
 * por ela e os provedores de notificação recebem os avisos `sync` ("algo
 * mudou, busque de novo") — ver back-end/socket/sync.ts.
 */
export default function SocketProvider({ children }) {
  const { logout } = useAuth()
  const [socket, setSocket] = useState(null)
  const [conectado, setConectado] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY)
    if (!token) return undefined

    const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'
    // WebSocket direto: pula as requisições HTTP de long-polling do handshake
    // padrão. Se a rede bloquear WebSocket, cai para long-polling sozinho.
    const novo = socketIO(baseURL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      tryAllTransports: true,
    })

    novo.on('connect', () => setConectado(true))
    novo.on('disconnect', () => setConectado(false))
    novo.on('connect_error', (err) => {
      setConectado(false)
      if (err.message === 'Unauthorized') logout()
    })

    // eslint-disable-next-line react-hooks/set-state-in-effect -- expõe a conexão criada aqui
    setSocket(novo)
    return () => {
      novo.disconnect()
      setSocket(null)
      setConectado(false)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const valor = useMemo(() => ({ socket, conectado }), [socket, conectado])
  return <SocketContext.Provider value={valor}>{children}</SocketContext.Provider>
}
