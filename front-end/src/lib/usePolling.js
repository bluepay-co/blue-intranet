import { useEffect, useRef } from 'react'

/** Teto de espera entre tentativas quando a API responde 429. */
const ESPERA_MAXIMA_MS = 15 * 60_000

/** Próxima espera após um erro: 429 respeita o Retry-After ou dobra a espera. */
function esperaAposErro(erro, intervaloMs, esperaAtual) {
  if (erro?.response?.status !== 429) return intervaloMs
  const retryAfter = Number(erro.response.headers?.['retry-after'])
  if (retryAfter > 0) return Math.min(retryAfter * 1000, ESPERA_MAXIMA_MS)
  return Math.min(esperaAtual * 2, ESPERA_MAXIMA_MS)
}

/**
 * Executa `buscar` agora e depois a cada `intervaloMs`, de forma econômica:
 *
 * - Aba oculta: pausa. Ao voltar, busca na hora se o dado já está velho.
 * - 429: espera o Retry-After (ou dobra a espera) em vez de insistir.
 * - Nunca sobrepõe chamadas (setTimeout encadeado, não setInterval).
 *
 * `buscar` pode lançar — o erro é engolido aqui (a próxima rodada tenta de
 * novo). Trocar a identidade de `buscar` não reinicia o ciclo.
 *
 * @param {() => Promise<unknown>} buscar
 * @param {number} intervaloMs
 * @param {boolean} [ativo=true] - false desliga o polling (ex.: sem usuário).
 */
export function usePolling(buscar, intervaloMs, ativo = true) {
  const buscarRef = useRef(buscar)
  useEffect(() => {
    buscarRef.current = buscar
  })

  useEffect(() => {
    if (!ativo) return undefined

    let timer = null
    let cancelado = false
    let emAndamento = false
    let ultimaExecucao = 0
    let espera = intervaloMs

    function agendar(ms) {
      clearTimeout(timer)
      timer = document.hidden ? null : setTimeout(executar, ms)
    }

    async function executar() {
      timer = null
      if (document.hidden || emAndamento) return
      emAndamento = true
      ultimaExecucao = Date.now()
      try {
        await buscarRef.current()
        espera = intervaloMs
      } catch (erro) {
        espera = esperaAposErro(erro, intervaloMs, espera)
      } finally {
        emAndamento = false
      }
      if (!cancelado) agendar(espera)
    }

    function aoMudarVisibilidade() {
      if (document.hidden) {
        clearTimeout(timer)
        timer = null
        return
      }
      if (!emAndamento) agendar(Math.max(0, espera - (Date.now() - ultimaExecucao)))
    }

    executar()
    document.addEventListener('visibilitychange', aoMudarVisibilidade)
    return () => {
      cancelado = true
      clearTimeout(timer)
      document.removeEventListener('visibilitychange', aoMudarVisibilidade)
    }
  }, [intervaloMs, ativo])
}
