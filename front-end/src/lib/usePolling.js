import { useEffect, useRef } from 'react'
import { useSocket } from '@/realtime/socket-context'

/** Teto de espera entre tentativas quando a API responde 429. */
const ESPERA_MAXIMA_MS = 15 * 60_000

/** Com o socket conectado os avisos chegam em tempo real: o polling vira só rede de segurança. */
const INTERVALO_COM_SOCKET_MS = 5 * 60_000

/** Reinício do ciclo (ex.: socket conectou) não repete uma busca feita há menos que isso. */
const BUSCA_RECENTE_MS = 10_000

/** Espalha as buscas disparadas por aviso para todos (ex.: post novo) — evita pico simultâneo. */
const JITTER_AVISO_MS = 2_000

/** Próxima espera após um erro: 429 respeita o Retry-After ou dobra a espera. */
function esperaAposErro(erro, intervaloMs, esperaAtual) {
  if (erro?.response?.status !== 429) return intervaloMs
  const retryAfter = Number(erro.response.headers?.['retry-after'])
  if (retryAfter > 0) return Math.min(retryAfter * 1000, ESPERA_MAXIMA_MS)
  return Math.min(esperaAtual * 2, ESPERA_MAXIMA_MS)
}

/**
 * Mantém um dado sincronizado com o servidor gastando o mínimo de requisições:
 *
 * - `evento` + socket conectado: busca quando o servidor avisa (`sync`) e só
 *   repete a cada 5 min por segurança. Sem socket, volta a `intervaloMs`.
 * - Aba oculta: pausa. Ao voltar, busca na hora se o dado está velho ou se
 *   chegou aviso enquanto estava oculta.
 * - 429: espera o Retry-After (ou dobra a espera) em vez de insistir.
 * - Nunca sobrepõe chamadas; aviso durante uma busca agenda outra ao final.
 *
 * `buscar` pode lançar — o erro é engolido aqui (a próxima rodada tenta de
 * novo). Trocar a identidade de `buscar` não reinicia o ciclo.
 *
 * @param {() => Promise<unknown>} buscar
 * @param {{ intervaloMs: number, ativo?: boolean, evento?: 'blog' | 'atualizacoes' | 'chamados' | 'kanban' }} opcoes
 */
export function usePolling(buscar, { intervaloMs, ativo = true, evento }) {
  const { socket, conectado } = useSocket()
  const viaSocket = Boolean(evento && conectado)
  const intervalo = viaSocket ? INTERVALO_COM_SOCKET_MS : intervaloMs

  const buscarRef = useRef(buscar)
  useEffect(() => {
    buscarRef.current = buscar
  })

  // Sobrevivem ao reinício do ciclo (troca de intervalo ao conectar/desconectar).
  const ultimaExecucaoRef = useRef(0)
  const iniciadoRef = useRef(false)
  const avisoRef = useRef(() => {})

  useEffect(() => {
    if (!ativo) {
      iniciadoRef.current = false
      return undefined
    }

    let timer = null
    let cancelado = false
    let emAndamento = false
    let pendente = false // aviso chegou com a aba oculta ou durante uma busca
    let espera = intervalo

    function agendar(ms) {
      clearTimeout(timer)
      timer = document.hidden ? null : setTimeout(executar, ms)
    }

    async function executar() {
      timer = null
      if (document.hidden || emAndamento) return
      emAndamento = true
      pendente = false
      ultimaExecucaoRef.current = Date.now()
      try {
        await buscarRef.current()
        espera = intervalo
      } catch (erro) {
        espera = esperaAposErro(erro, intervalo, espera)
      } finally {
        emAndamento = false
      }
      if (cancelado) return
      agendar(pendente && espera === intervalo ? 0 : espera)
    }

    function aoMudarVisibilidade() {
      if (document.hidden) {
        clearTimeout(timer)
        timer = null
        return
      }
      if (emAndamento) return
      const decorrido = Date.now() - ultimaExecucaoRef.current
      agendar(pendente ? 0 : Math.max(0, espera - decorrido))
    }

    avisoRef.current = () => {
      pendente = true
      // Recuando de um 429: o aviso não fura a espera.
      if (document.hidden || emAndamento || espera !== intervalo) return
      agendar(Math.random() * JITTER_AVISO_MS)
    }

    // Primeira vez: busca já. Socket (re)conectou: busca já, pois avisos podem
    // ter se perdido — salvo se acabou de buscar (conexão inicial logo após
    // montar). Socket caiu (ex.: deploy): só reprograma, sem pico de
    // requisições contra um back-end que está reiniciando.
    const decorrido = Date.now() - ultimaExecucaoRef.current
    const primeiraVez = !iniciadoRef.current
    iniciadoRef.current = true
    if (primeiraVez || (viaSocket && decorrido >= BUSCA_RECENTE_MS)) executar()
    else agendar(viaSocket ? intervalo - decorrido : intervalo)

    document.addEventListener('visibilitychange', aoMudarVisibilidade)
    return () => {
      cancelado = true
      clearTimeout(timer)
      avisoRef.current = () => {}
      document.removeEventListener('visibilitychange', aoMudarVisibilidade)
    }
  }, [intervalo, ativo, viaSocket])

  // Avisos do servidor (back-end/socket/sync.ts) para este tipo de dado.
  useEffect(() => {
    if (!socket || !evento) return undefined
    const aoSincronizar = ({ tipo }) => {
      if (tipo === evento) avisoRef.current()
    }
    socket.on('sync', aoSincronizar)
    return () => socket.off('sync', aoSincronizar)
  }, [socket, evento])
}
