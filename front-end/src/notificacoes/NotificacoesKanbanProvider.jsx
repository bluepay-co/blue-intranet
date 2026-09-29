import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Toaster, toast } from 'sonner'
import { useAuth } from '@/auth/auth-context'
import { useTheme } from '@/theme/theme-context'
import { KANBAN_ROLES, adiarLembrete, alterarStatus, buscarNotificacoes, listarTarefas } from '@/api/modules/kanban'
import { FILTROS_RAPIDOS } from '@/components/kanban/regras'
import { usePolling } from '@/lib/usePolling'
import { NotificacoesKanbanContext } from './notificacoes-kanban'

/**
 * Popups do Kanban de Tarefas.
 *
 * Faz polling de /api/kanban/notificacoes (o back gera lembretes e avisos de
 * vencimento sob demanda e marca tudo como entregue na mesma chamada). Cada
 * notificação vira um popup persistente com ações. Ao entrar, mostra o resumo
 * do dia (atrasadas, SLA apertado, esquecidas). `versao` incrementa quando
 * chega novidade, para a página de Tarefas recarregar o quadro.
 */

const INTERVALO_MS = 60_000

/**
 * Visual dos popups no padrão da intranet (tokens do tema, claro/escuro):
 * fundo de card, borda do tema e faixa lateral colorida por tipo.
 */
const ESTILO_TOAST = {
  unstyled: false,
  classNames: {
    toast: '!bg-card !text-card-foreground !border-border !rounded-xl !shadow-lg !font-sans border-l-4!',
    title: '!text-sm !font-semibold',
    description: '!text-xs !text-muted-foreground [overflow-wrap:anywhere]',
    actionButton: '!bg-primary !text-primary-foreground !rounded-md !text-xs !font-medium',
    cancelButton: '!bg-muted !text-foreground !rounded-md !text-xs !font-medium',
    closeButton: '!bg-card !text-muted-foreground !border-border hover:!text-foreground',
    success: '!border-l-emerald-500 [&_[data-icon]]:!text-emerald-500',
    info: '!border-l-blue-500 [&_[data-icon]]:!text-blue-500',
    warning: '!border-l-amber-500 [&_[data-icon]]:!text-amber-500',
    error: '!border-l-destructive [&_[data-icon]]:!text-destructive',
  },
}

const TITULOS = {
  solicitacao: 'Nova solicitação',
  comentario: 'Novo comentário',
  cobranca: 'Cobrança de atualização',
  status: 'Atualização de tarefa',
  lembrete: 'Lembrete de tarefa',
  vencido: 'Prazo vencido',
  esquecida: 'Tarefa parada',
}

export function NotificacoesKanbanProvider({ children }) {
  const { usuario } = useAuth()
  const { tema } = useTheme()
  const navigate = useNavigate()
  const [versao, setVersao] = useState(0)
  const resumoMostrado = useRef(false)

  const abrir = useCallback((id) => navigate(`/kanban?tarefa=${id}`), [navigate])

  const exibir = useCallback(
    (n) => {
      const acoes = { action: { label: 'Abrir', onClick: () => abrir(n.tarefa_id) } }
      if (n.tipo === 'lembrete') {
        acoes.cancel = {
          label: 'Adiar 10 min',
          onClick: () => adiarLembrete(n.tarefa_id).then(() => toast.success('Lembrete adiado em 10 minutos')),
        }
      }
      if (n.tipo === 'lembrete' || n.tipo === 'vencido') {
        acoes.cancel ??= {
          label: 'Concluir',
          onClick: () => alterarStatus(n.tarefa_id, 'done').then(() => setVersao((v) => v + 1)),
        }
      }
      const tipoToast = n.tipo === 'vencido' ? toast.error : n.tipo === 'cobranca' || n.tipo === 'esquecida' ? toast.warning : toast.info
      tipoToast(TITULOS[n.tipo], { description: n.texto, duration: Infinity, closeButton: true, ...acoes })
    },
    [abrir],
  )

  const buscar = useCallback(async () => {
    const novas = await buscarNotificacoes()
    novas.forEach(exibir)
    if (novas.length) setVersao((v) => v + 1)
  }, [exibir])

  const mostrarResumo = useCallback(async () => {
    try {
      const minhas = (await listarTarefas()).filter((t) => t.responsavel_id === usuario.id && t.status !== 'done')
      const atrasadas = minhas.filter(FILTROS_RAPIDOS.late).length
      const apertadas = minhas.filter(FILTROS_RAPIDOS.sla).length
      const esquecidas = minhas.filter(FILTROS_RAPIDOS.stale).length
      const partes = [
        atrasadas && `${atrasadas} ${atrasadas > 1 ? 'atrasadas' : 'atrasada'}`,
        apertadas && `${apertadas} com SLA apertado`,
        esquecidas && `${esquecidas} ${esquecidas > 1 ? 'paradas' : 'parada'} há dias`,
      ].filter(Boolean)
      if (!partes.length) return
      toast.warning('Resumo do seu dia', {
        description: `Você tem ${partes.join(', ')}.`,
        duration: Infinity,
        closeButton: true,
        action: { label: 'Ver tarefas', onClick: () => navigate('/kanban') },
      })
    } catch {
      // resumo é opcional
    }
  }, [usuario, navigate])

  // Cargos sem Kanban não fazem polling (a API responderia 403).
  const temKanban = Boolean(usuario && KANBAN_ROLES.includes(usuario.role))

  useEffect(() => {
    if (!temKanban || resumoMostrado.current) return
    resumoMostrado.current = true
    mostrarResumo()
  }, [temKanban, mostrarResumo])

  // Busca quando o servidor avisa pelo socket; polling só como segurança (ver usePolling).
  usePolling(buscar, { intervaloMs: INTERVALO_MS, ativo: temKanban, evento: 'kanban' })

  const valor = useMemo(() => ({ versao }), [versao])

  return (
    <NotificacoesKanbanContext.Provider value={valor}>
      {children}
      <Toaster
        position="bottom-right"
        theme={tema === 'dark' ? 'dark' : 'light'}
        visibleToasts={5}
        toastOptions={ESTILO_TOAST}
      />
    </NotificacoesKanbanContext.Provider>
  )
}
