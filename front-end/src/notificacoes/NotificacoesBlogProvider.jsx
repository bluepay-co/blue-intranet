import { useEffect, useRef, useState } from 'react'
import { useAuth } from '@/auth/auth-context'
import { listarFeed } from '@/api/modules/blog'
import { NotificacoesBlogContext } from './notificacoes-blog'

/**
 * Notificações de novos posts do Marketing.
 *
 * Estratégia (sem backend dedicado): faz polling do feed publicado e compara o
 * post mais recente com o último que o usuário já viu (persistido por usuário no
 * localStorage). Alimenta a contagem de não vistos (badge na sidebar) e dispara
 * uma notificação do navegador quando surge um post novo após a carga inicial.
 */

const INTERVALO_MS = 60_000 // verifica a cada 1 min

const chaveLastSeen = (userId) => `blog_last_seen_${userId ?? 'anon'}`

/** Atualiza o "último visto" (apenas avança, nunca retrocede) e persiste. */
function persistirVisto(setLastSeenId, userId, id) {
  setLastSeenId((anterior) => {
    if (id > anterior) {
      localStorage.setItem(chaveLastSeen(userId), String(id))
      return id
    }
    return anterior
  })
}

function notificarDesktop(post) {
  if (!('Notification' in window) || Notification.permission !== 'granted' || !post) return
  try {
    new Notification('Novo post do Marketing', {
      body: post.titulo,
      icon: '/logo-azul.svg',
    })
  } catch {
    // alguns navegadores exigem Service Worker — ignora silenciosamente
  }
}

export function NotificacoesBlogProvider({ children }) {
  const { usuario } = useAuth()
  const userId = usuario?.id
  const [posts, setPosts] = useState([])
  const [lastSeenId, setLastSeenId] = useState(
    () => Number(localStorage.getItem(chaveLastSeen(userId)) ?? 0),
  )
  // id do post mais recente conhecido no ciclo anterior (null = ainda não carregou)
  const ultimoIdConhecido = useRef(null)

  const naoVistos = posts.filter((p) => p.id > lastSeenId).length

  useEffect(() => {
    let ativo = true

    async function buscar() {
      try {
        const data = await listarFeed() // feed já vem ordenado por mais recente
        if (!ativo) return
        setPosts(data)

        const idMaisRecente = data[0]?.id ?? 0
        const vistoSalvo = Number(localStorage.getItem(chaveLastSeen(userId)) ?? 0)
        const semHistorico = localStorage.getItem(chaveLastSeen(userId)) === null

        if (ultimoIdConhecido.current === null && semHistorico) {
          // Primeiro acesso absoluto: considera tudo que já existe como visto.
          persistirVisto(setLastSeenId, userId, idMaisRecente)
        } else if (idMaisRecente > vistoSalvo && idMaisRecente > (ultimoIdConhecido.current ?? 0)) {
          // Post mais recente do que o último visto — seja na abertura do app
          // (usuário recorrente) ou num ciclo de polling seguinte. Notifica uma vez.
          notificarDesktop(data[0])
        }
        ultimoIdConhecido.current = idMaisRecente
      } catch {
        // silencioso — tenta de novo no próximo ciclo
      }
    }

    buscar()
    const intervalo = setInterval(buscar, INTERVALO_MS)
    return () => {
      ativo = false
      clearInterval(intervalo)
    }
  }, [userId])

  // Pede permissão de notificação do navegador uma única vez.
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {})
    }
  }, [])

  /** Marca como vistos os posts até `idAteAqui` (ou o mais recente conhecido). */
  function marcarVisto(idAteAqui) {
    persistirVisto(setLastSeenId, userId, idAteAqui ?? posts[0]?.id ?? 0)
  }

  return (
    <NotificacoesBlogContext.Provider value={{ naoVistos, marcarVisto }}>
      {children}
    </NotificacoesBlogContext.Provider>
  )
}
