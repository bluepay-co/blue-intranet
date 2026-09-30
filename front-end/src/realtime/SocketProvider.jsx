import { useEffect, useMemo, useState } from 'react'
import { io as socketIO } from 'socket.io-client'
import { useAuth } from '@/auth/auth-context'
import { SocketContext } from './socket-context'

export default function SocketProvider({ children }) {
  const { autenticado, logout } = useAuth()
  const [socket, setSocket] = useState(null)
  const [conectado, setConectado] = useState(false)

  useEffect(() => {
    if (!autenticado) return undefined

    const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'
    const novo = socketIO(baseURL, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
      tryAllTransports: true,
    })

    novo.on('connect', () => setConectado(true))
    novo.on('disconnect', () => setConectado(false))
    novo.on('connect_error', (err) => {
      setConectado(false)
      if (err.message === 'Unauthorized') logout()
    })

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSocket(novo)
    return () => {
      novo.disconnect()
      setSocket(null)
      setConectado(false)
    }
  }, [autenticado]) // eslint-disable-line react-hooks/exhaustive-deps

  const valor = useMemo(() => ({ socket, conectado }), [socket, conectado])
  return <SocketContext.Provider value={valor}>{children}</SocketContext.Provider>
}
