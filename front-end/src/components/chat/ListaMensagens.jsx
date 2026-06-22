import { useEffect, useRef, useLayoutEffect, useCallback } from 'react'
import { useChat } from '@/chat/chat-context'
import BolhaMensagem from './BolhaMensagem'

/** Área scrollável com as mensagens do canal ativo. */
export default function ListaMensagens({ canalId }) {
  const { mensagensDoCanal, carregarMaisAntigos } = useChat()
  const mensagens = mensagensDoCanal(canalId)
  const containerRef = useRef(null)
  const topoRef = useRef(null)
  const prevScrollHeightRef = useRef(0)
  const isFirstLoadRef = useRef(true)

  // Scroll para o fim quando novas mensagens chegam (mas não ao paginar para cima)
  useEffect(() => {
    if (isFirstLoadRef.current && mensagens.length > 0) {
      containerRef.current?.scrollTo({ top: containerRef.current.scrollHeight })
      isFirstLoadRef.current = false
    }
  }, [mensagens.length])

  // Restaura a posição de scroll ao carregar mensagens antigas
  useLayoutEffect(() => {
    const container = containerRef.current
    if (!container || prevScrollHeightRef.current === 0) return
    const diff = container.scrollHeight - prevScrollHeightRef.current
    if (diff > 0) {
      container.scrollTop = diff
    }
    prevScrollHeightRef.current = 0
  }, [mensagens])

  // Scroll para baixo quando chega mensagem nova (canal ativo)
  const prevCountRef = useRef(0)
  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    if (mensagens.length > prevCountRef.current) {
      const isAtBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 80
      if (isAtBottom || prevCountRef.current === 0) {
        container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' })
      }
    }
    prevCountRef.current = mensagens.length
  }, [mensagens.length])

  // IntersectionObserver no topo para paginação
  const handleTopoVisivel = useCallback(async () => {
    if (!containerRef.current) return
    prevScrollHeightRef.current = containerRef.current.scrollHeight
    await carregarMaisAntigos(canalId)
  }, [canalId, carregarMaisAntigos])

  useEffect(() => {
    const el = topoRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) handleTopoVisivel()
      },
      { root: containerRef.current, threshold: 0 },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [handleTopoVisivel])

  if (mensagens.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
        Nenhuma mensagem ainda. Diga olá!
      </div>
    )
  }

  return (
    <div ref={containerRef} className="flex flex-1 flex-col overflow-y-auto py-2">
      <div ref={topoRef} className="h-1" />
      {mensagens.map((m) => (
        <BolhaMensagem key={m.id} mensagem={m} />
      ))}
    </div>
  )
}
