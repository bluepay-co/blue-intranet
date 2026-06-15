import { useEffect, useRef, useState } from 'react'
import { useAuth } from '@/auth/auth-context'
import { resumo } from '@/api/modules/chamados'
import { NotificacoesChamadosContext } from './notificacoes-chamados'

/**
 * Notificações de movimentação em chamados (dois lados).
 *
 * Faz polling do resumo dos chamados relevantes (o dono vê os próprios; a T.I.
 * vê todos) e compara a "assinatura" de cada um (status + data do último
 * comentário) com o que o usuário já viu (persistido por usuário no
 * localStorage). Dispara notificação do navegador quando há novidade causada
 * por OUTRA pessoa:
 *  - novo comentário cujo autor não é o próprio usuário;
 *  - mudança de status percebida pelo dono do chamado (quem altera é a T.I.);
 *  - chamado novo de outra pessoa (a T.I. é avisada de aberturas).
 */

const INTERVALO_MS = 60_000

const chaveSeen = (userId) => `chamados_seen_${userId ?? 'anon'}`
const assinatura = (c) => `${c.status}|${c.ultimo_comentario_em ?? ''}`

function carregarVistos(userId) {
  try {
    return JSON.parse(localStorage.getItem(chaveSeen(userId)) ?? '{}')
  } catch {
    return {}
  }
}

function notificarDesktop(c) {
  if (!('Notification' in window) || Notification.permission !== 'granted' || !c) return
  try {
    new Notification('Chamado atualizado', {
      body: `#${c.id} · ${c.titulo}`,
      icon: '/logo-azul.svg',
    })
  } catch {
    // alguns navegadores exigem Service Worker — ignora silenciosamente
  }
}

/** Avalia se um chamado tem novidade relevante p/ o usuário, dado o que ele já viu. */
function temNovidade(c, vistoAnterior, userId) {
  const ass = assinatura(c)
  if (vistoAnterior === ass) return false

  const novoTicket = vistoAnterior === undefined
  const [statusAnterior, comentAnterior] = vistoAnterior ? vistoAnterior.split('|') : [null, '']

  const comentarioNovo =
    !!c.ultimo_comentario_em &&
    String(c.ultimo_comentario_em) !== comentAnterior &&
    c.ultimo_comentario_autor_id !== userId
  const statusRelevante = statusAnterior !== null && statusAnterior !== c.status && c.autor_id === userId
  const ticketRelevante = novoTicket && c.autor_id !== userId

  return comentarioNovo || statusRelevante || ticketRelevante
}

export function NotificacoesChamadosProvider({ children }) {
  const { usuario } = useAuth()
  const userId = usuario?.id
  const [chamados, setChamados] = useState([])
  const [vistos, setVistos] = useState(() => carregarVistos(userId))
  // assinatura já notificada (evita repetir a notificação a cada ciclo de polling)
  const notificadosRef = useRef({})

  const naoVistos = chamados.filter((c) => temNovidade(c, vistos[c.id], userId)).length

  useEffect(() => {
    let ativo = true

    async function buscar() {
      try {
        const data = await resumo()
        if (!ativo) return
        setChamados(data)

        const chave = chaveSeen(userId)
        const semHistorico = localStorage.getItem(chave) === null

        if (semHistorico) {
          // Primeiro acesso: considera tudo o que já existe como visto.
          const inicial = {}
          for (const c of data) inicial[c.id] = assinatura(c)
          localStorage.setItem(chave, JSON.stringify(inicial))
          setVistos(inicial)
          return
        }

        const jaVistos = carregarVistos(userId)
        setVistos(jaVistos) // mantém o badge em sincronia com o que está salvo
        for (const c of data) {
          if (!temNovidade(c, jaVistos[c.id], userId)) continue
          const ass = assinatura(c)
          if (notificadosRef.current[c.id] !== ass) {
            notificarDesktop(c)
            notificadosRef.current[c.id] = ass
          }
        }
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

  /** Marca um chamado como visto (chamado ao abrir os detalhes). */
  function marcarVisto(id) {
    const alvo = chamados.find((c) => c.id === id)
    if (!alvo) return
    setVistos((anterior) => {
      const atualizado = { ...anterior, [id]: assinatura(alvo) }
      localStorage.setItem(chaveSeen(userId), JSON.stringify(atualizado))
      return atualizado
    })
  }

  return (
    <NotificacoesChamadosContext.Provider value={{ naoVistos, marcarVisto }}>
      {children}
    </NotificacoesChamadosContext.Provider>
  )
}
