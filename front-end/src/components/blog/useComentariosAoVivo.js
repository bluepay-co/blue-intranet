import { useEffect, useRef } from 'react'
import { useSocket } from '@/realtime/socket-context'

/**
 * Comentários em tempo real: enquanto a conversa de um post está aberta, entra
 * na sala `blog_post_<id>` (socket/blog.socket.ts) e chama `recarregar` quando o
 * servidor avisa (`sync` "blog_comentarios"). Reentra na sala após reconexão —
 * o servidor esquece as salas quando o socket cai. Sem socket, nada acontece:
 * a conversa segue atualizando ao comentar ou reabrir.
 *
 * @param {number|null} postId - null desliga (ex.: modal fechado).
 * @param {() => unknown} recarregar
 */
export function useComentariosAoVivo(postId, recarregar) {
  const { socket } = useSocket()
  // Ref: trocar a função não pode sair/entrar da sala a cada render.
  const recarregarRef = useRef(recarregar)
  useEffect(() => {
    recarregarRef.current = recarregar
  }, [recarregar])

  useEffect(() => {
    if (!socket || !postId) return undefined
    const entrar = () => socket.emit('blog_assistir', { post_id: postId })
    const aoSincronizar = ({ tipo } = {}) => {
      if (tipo === 'blog_comentarios') recarregarRef.current()
    }
    entrar()
    socket.on('connect', entrar)
    socket.on('sync', aoSincronizar)
    return () => {
      socket.emit('blog_parar', { post_id: postId })
      socket.off('connect', entrar)
      socket.off('sync', aoSincronizar)
    }
  }, [socket, postId])
}
