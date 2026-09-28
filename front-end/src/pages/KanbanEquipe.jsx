import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Loader2, Plus, RotateCw } from 'lucide-react'
import { toast } from 'sonner'
import PageHeader from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { useAuth } from '@/auth/auth-context'
import {
  alterarPrioridade,
  alterarStatus,
  criarTarefa,
  editarTarefa,
  excluirTarefa,
  listarTarefas,
  listarUsuarios,
} from '@/api/modules/kanban'
import MetricasTarefas from '@/components/kanban/MetricasTarefas'
import HojeTarefas from '@/components/kanban/HojeTarefas'
import QuadroStatus from '@/components/kanban/QuadroStatus'
import VisaoPrioridade from '@/components/kanban/VisaoPrioridade'
import TarefaDrawer from '@/components/kanban/TarefaDrawer'
import TarefaFormDialog from '@/components/kanban/TarefaFormDialog'
import { ABAS, FILTROS_RAPIDOS, PRIORIDADES, selectCls } from '@/components/kanban/regras'
import { useKanbanNotificacoes } from '@/notificacoes/notificacoes-kanban'

const DEF_ABAS = [
  ['minhas', 'Minhas tarefas'],
  ['solicitei', 'Que solicitei'],
  ['equipe', 'Da equipe e compartilhadas'],
]

const MODOS = [
  ['status', 'Por status'],
  ['prioridade', 'Por prioridade'],
]

export default function KanbanEquipe() {
  const { usuario } = useAuth()
  const { versao: versaoNotificacoes } = useKanbanNotificacoes()
  const [params, setParams] = useSearchParams()
  const [tarefas, setTarefas] = useState([])
  const [usuarios, setUsuarios] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [versao, setVersao] = useState(0)

  const [aba, setAba] = useState('minhas')
  const [rapido, setRapido] = useState(null)
  const [area, setArea] = useState('')
  const [prioridade, setPrioridade] = useState('')
  const [pessoa, setPessoa] = useState('')
  const [busca, setBusca] = useState('')
  const [modo, setModo] = useState('status')
  const [form, setForm] = useState({ aberto: false, tarefa: null })

  // `?tarefa=<id>` abre o drawer (usado pelos popups de notificação).
  const abertaId = Number(params.get('tarefa')) || null
  const abrir = useCallback((id) => setParams(id ? { tarefa: String(id) } : {}), [setParams])
  const fecharDrawer = useCallback(() => setParams({}), [setParams])

  const carregar = useCallback(async () => {
    try {
      setTarefas(await listarTarefas())
      setErro('')
    } catch {
      setErro('Não foi possível carregar as tarefas.')
    } finally {
      setCarregando(false)
      setVersao((v) => v + 1)
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial/recarga do servidor
    carregar()
  }, [carregar, versaoNotificacoes])

  useEffect(() => {
    listarUsuarios().then(setUsuarios).catch(() => {})
  }, [])

  // Recalcula os alertas derivados do relógio (Atrasada/Esquecida) a cada minuto.
  const [, setTick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 60_000)
    return () => clearInterval(id)
  }, [])

  const daAba = useMemo(() => tarefas.filter((t) => ABAS[aba](t, usuario.id)), [tarefas, aba, usuario.id])
  const areas = useMemo(() => [...new Set(tarefas.map((t) => t.area_solicitante))].sort(), [tarefas])
  // Pessoas responsáveis pelas tarefas da aba "Da equipe e compartilhadas".
  const pessoas = useMemo(
    () =>
      [...new Map(daAba.map((t) => [t.responsavel_id, t.responsavel_nome])).entries()].sort((a, b) =>
        a[1].localeCompare(b[1]),
      ),
    [daAba],
  )

  const filtradas = useMemo(() => {
    const q = busca.trim().toLowerCase()
    return daAba.filter(
      (t) =>
        (!rapido || FILTROS_RAPIDOS[rapido](t)) &&
        (!area || t.area_solicitante === area) &&
        (!prioridade || t.prioridade === prioridade) &&
        (aba !== 'equipe' || !pessoa || t.responsavel_id === Number(pessoa)) &&
        (!q || `${t.titulo} ${t.responsavel_nome} ${t.solicitante_nome} ${t.participantes.map((p) => p.nome).join(' ')}`.toLowerCase().includes(q)),
    )
  }, [daAba, rapido, area, prioridade, busca, aba, pessoa])

  async function executar(acao, mensagem) {
    try {
      await acao()
      if (mensagem) toast.success(mensagem)
    } catch (err) {
      toast.error(err.response?.data?.message ?? 'Não foi possível concluir a ação.')
    } finally {
      await carregar()
    }
  }

  const mudarStatus = (id, status) => {
    // Atualização otimista: o card muda de coluna antes da resposta.
    setTarefas((lista) => lista.map((t) => (t.id === id ? { ...t, status, atualizado_em: new Date().toISOString() } : t)))
    const msg = { todo: 'Tarefa reaberta', doing: 'Tarefa em andamento', done: 'Tarefa finalizada' }[status]
    executar(() => alterarStatus(id, status), msg)
  }

  /** Drag no quadro: pode mudar status, prioridade (coluna Urgente) ou os dois. */
  const mover = (id, { status, prioridade: novaPrioridade }) => {
    setTarefas((lista) =>
      lista.map((t) =>
        t.id === id
          ? { ...t, ...(status && { status }), ...(novaPrioridade && { prioridade: novaPrioridade }), atualizado_em: new Date().toISOString() }
          : t,
      ),
    )
    const msg = novaPrioridade === 'urgent' ? 'Tarefa marcada como urgente' : status ? { todo: 'Tarefa reaberta', doing: 'Tarefa em andamento', done: 'Tarefa finalizada' }[status] : 'Prioridade atualizada'
    executar(async () => {
      if (novaPrioridade) await alterarPrioridade(id, novaPrioridade)
      if (status) await alterarStatus(id, status)
    }, msg)
  }

  async function salvar(entrada) {
    if (form.tarefa) {
      await editarTarefa(form.tarefa.id, entrada)
      toast.success('Tarefa atualizada')
    } else {
      await criarTarefa(entrada)
      toast.success(entrada.responsavelId === usuario.id ? 'Tarefa criada' : 'Solicitação enviada')
      setAba(entrada.responsavelId === usuario.id ? 'minhas' : 'solicitei')
      setRapido(null)
    }
    await carregar()
  }

  const excluir = (id) => {
    fecharDrawer()
    executar(() => excluirTarefa(id), 'Tarefa excluída')
  }

  const propsVisao = { tarefas: [...filtradas].sort((a, b) => new Date(a.prazo) - new Date(b.prazo)), onAbrir: abrir, onStatus: mudarStatus, onMover: mover }

  return (
    <div className="space-y-5">
      <PageHeader title="Kanban da Equipe" subtitle={`${usuario.nome ?? usuario.email}`}>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={carregar} title="Atualizar">
            <RotateCw />
          </Button>
          <Button onClick={() => setForm({ aberto: true, tarefa: null })}>
            <Plus /> Nova tarefa
          </Button>
        </div>
      </PageHeader>

      <nav className="flex gap-1 overflow-x-auto border-b" role="tablist">
        {DEF_ABAS.map(([k, l]) => (
          <button
            key={k}
            type="button"
            role="tab"
            aria-selected={aba === k}
            onClick={() => {
              setAba(k)
              setRapido(null)
              setPessoa('')
            }}
            className={cn(
              '-mb-px flex items-center gap-2 border-b-2 px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors',
              aba === k ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            {l}
            <em className="rounded-full bg-muted px-1.5 text-[10px] leading-[17px] not-italic text-muted-foreground">
              {tarefas.filter((t) => ABAS[k](t, usuario.id) && t.status !== 'done').length}
            </em>
          </button>
        ))}
      </nav>

      <HojeTarefas tarefas={tarefas.filter((t) => t.responsavel_id === usuario.id)} onAbrir={abrir} />

      <MetricasTarefas tarefas={daAba} ativo={rapido} onSelecionar={setRapido} />

      <section className="flex flex-wrap items-center gap-2">
        <Input className="h-9 w-56" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar tarefa ou pessoa" />
        <select className={cn(selectCls, 'w-auto')} value={area} onChange={(e) => setArea(e.target.value)} aria-label="Área solicitante">
          <option value="">Todas as áreas</option>
          {areas.map((a) => (
            <option key={a}>{a}</option>
          ))}
        </select>
        {aba === 'equipe' && (
          <select className={cn(selectCls, 'w-auto')} value={pessoa} onChange={(e) => setPessoa(e.target.value)} aria-label="Pessoa do time">
            <option value="">Todas as pessoas</option>
            {pessoas.map(([id, nome]) => (
              <option key={id} value={id}>
                {nome}
              </option>
            ))}
          </select>
        )}
        <select className={cn(selectCls, 'w-auto')} value={prioridade} onChange={(e) => setPrioridade(e.target.value)} aria-label="Prioridade">
          <option value="">Todas as prioridades</option>
          {Object.entries(PRIORIDADES).map(([k, p]) => (
            <option key={k} value={k}>
              {p.label}
            </option>
          ))}
        </select>
        <div className="ml-auto inline-flex rounded-lg border bg-card p-0.5">
          {MODOS.map(([k, l]) => (
            <button
              key={k}
              type="button"
              onClick={() => setModo(k)}
              className={cn(
                'rounded-md px-3 py-1 text-xs font-medium text-muted-foreground',
                modo === k && 'bg-muted font-semibold text-foreground',
              )}
            >
              {l}
            </button>
          ))}
        </div>
      </section>

      {carregando ? (
        <div className="grid h-40 place-items-center">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      ) : erro ? (
        <p className="text-sm text-destructive">{erro}</p>
      ) : modo === 'status' ? (
        <QuadroStatus {...propsVisao} />
      ) : (
        <VisaoPrioridade {...propsVisao} />
      )}

      <TarefaDrawer
        tarefaId={abertaId}
        versao={versao}
        usuario={usuario}
        onFechar={fecharDrawer}
        onStatus={mudarStatus}
        onEditar={(t) => setForm({ aberto: true, tarefa: t })}
        onExcluir={excluir}
        onAviso={(m) => toast.success(m)}
      />

      <TarefaFormDialog
        aberto={form.aberto}
        tarefa={form.tarefa}
        usuario={usuario}
        usuarios={usuarios}
        onFechar={() => setForm({ aberto: false, tarefa: null })}
        onSalvar={salvar}
      />
    </div>
  )
}
