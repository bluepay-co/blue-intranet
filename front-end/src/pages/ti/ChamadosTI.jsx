import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, AlertCircle, ChevronDown, SlidersHorizontal, Clock, User, Loader2, Paperclip } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu'
import PageHeader from '@/components/layout/PageHeader'
import {
  CATEGORIAS,
  CRITICIDADES,
  listarTodos,
  rotuloCategoria,
  rotuloCriticidade,
} from '@/api/modules/chamados'
import { CriticidadeBadge } from '@/components/chamados/badges'
import { tempoDecorrido } from '@/components/chamados/tempo'

/** Prioridade de ordenação (menor = mais urgente). */
const PRIORIDADE = { CRITICO: 0, ALTO: 1, MEDIO: 2, BAIXO: 3 }

/** Cor da borda esquerda do card por criticidade. */
const BORDA = {
  CRITICO: 'border-l-destructive',
  ALTO: 'border-l-amber-500',
  MEDIO: 'border-l-blue-500',
  BAIXO: 'border-l-muted-foreground/40',
}

const COLUNAS = [
  { value: 'ABERTO', label: 'Em Aberto' },
  { value: 'EM_ANDAMENTO', label: 'Em Andamento' },
  { value: 'FECHADO', label: 'Finalizados' },
]

/** Dropdown de filtro genérico (Todos + opções). */
function FiltroDropdown({ rotulo, valor, opcoes, onSelecionar, formatar }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-9 gap-1.5">
          <SlidersHorizontal className="size-3.5" />
          {rotulo}: {valor ? formatar(valor) : 'Todos'}
          <ChevronDown className="size-3.5 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="max-h-72 overflow-y-auto">
        <DropdownMenuItem onSelect={() => onSelecionar(null)} className={!valor ? 'font-semibold text-brand-accent' : ''}>
          Todos
        </DropdownMenuItem>
        {opcoes.map((o) => (
          <DropdownMenuItem
            key={o.value}
            onSelect={() => onSelecionar(o.value)}
            className={valor === o.value ? 'font-semibold text-brand-accent' : ''}
          >
            {o.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/** Card de chamado no kanban. */
function ChamadoCard({ chamado, onAbrir }) {
  return (
    <button
      onClick={() => onAbrir(chamado.id)}
      className={`w-full rounded-lg border border-l-4 bg-card p-3 text-left shadow-sm transition-colors hover:bg-muted/40 ${BORDA[chamado.criticidade] ?? ''}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-muted-foreground">#{chamado.id}</span>
        <CriticidadeBadge criticidade={chamado.criticidade} />
      </div>
      <p className="mt-1.5 line-clamp-2 text-sm font-medium">{chamado.titulo}</p>
      <p className="mt-1 text-xs text-muted-foreground">{rotuloCategoria(chamado.categoria)}</p>
      <div className="mt-2.5 flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <span className="inline-flex min-w-0 items-center gap-1">
          <User className="size-3 shrink-0" />
          <span className="truncate">{chamado.autor_nome}</span>
        </span>
        <span className="inline-flex shrink-0 items-center gap-1">
          {chamado.tem_anexo && <Paperclip className="size-3" />}
          <Clock className="size-3" />
          {tempoDecorrido(chamado.criado_em)}
        </span>
      </div>
    </button>
  )
}

export default function ChamadosTI() {
  const navigate = useNavigate()
  const [chamados, setChamados] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [busca, setBusca] = useState('')
  const [fCategoria, setFCategoria] = useState(null)
  const [fCriticidade, setFCriticidade] = useState(null)

  useEffect(() => {
    let ativo = true
    ;(async () => {
      try {
        const data = await listarTodos()
        if (ativo) setChamados(data)
      } catch (e) {
        if (ativo) setErro(e?.response?.data?.message ?? 'Falha ao carregar os chamados.')
      } finally {
        if (ativo) setCarregando(false)
      }
    })()
    return () => {
      ativo = false
    }
  }, [])

  const termo = busca.trim().toLowerCase()
  const filtrados = chamados
    .filter((c) => {
      if (fCategoria && c.categoria !== fCategoria) return false
      if (fCriticidade && c.criticidade !== fCriticidade) return false
      if (termo && !c.titulo.toLowerCase().includes(termo) && !c.autor_nome.toLowerCase().includes(termo))
        return false
      return true
    })
    .sort((a, b) => {
      const pa = PRIORIDADE[a.criticidade] ?? 9
      const pb = PRIORIDADE[b.criticidade] ?? 9
      if (pa !== pb) return pa - pb
      return new Date(a.criado_em) - new Date(b.criado_em) // mais antigo primeiro
    })

  const temFiltro = busca || fCategoria || fCriticidade

  function abrir(id) {
    navigate(`/chamados/${id}`)
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Chamados (T.I)" subtitle="Quadro de atendimento priorizado por criticidade e tempo em aberto." />

      {erro && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="size-4 shrink-0" />
          {erro}
        </div>
      )}

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por título ou solicitante…"
            className="h-9 pl-8"
          />
        </div>
        <FiltroDropdown rotulo="Categoria" valor={fCategoria} opcoes={CATEGORIAS} onSelecionar={setFCategoria} formatar={rotuloCategoria} />
        <FiltroDropdown rotulo="Criticidade" valor={fCriticidade} opcoes={CRITICIDADES} onSelecionar={setFCriticidade} formatar={rotuloCriticidade} />
        {temFiltro && (
          <Button
            variant="ghost"
            size="sm"
            className="h-9 text-muted-foreground"
            onClick={() => {
              setBusca('')
              setFCategoria(null)
              setFCriticidade(null)
            }}
          >
            Limpar
          </Button>
        )}
      </div>

      {/* Kanban */}
      {carregando ? (
        <div className="grid place-items-center py-20">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-3">
          {COLUNAS.map((col) => {
            const itens = filtrados.filter((c) => c.status === col.value)
            return (
              <div key={col.value} className="rounded-xl bg-muted/30 p-3">
                <div className="mb-3 flex items-center justify-between px-1">
                  <h2 className="text-sm font-semibold">{col.label}</h2>
                  <span className="rounded-full bg-background px-2 py-0.5 text-xs font-semibold text-muted-foreground">
                    {itens.length}
                  </span>
                </div>
                <div className="space-y-3">
                  {itens.length === 0 ? (
                    <p className="py-6 text-center text-xs text-muted-foreground">Nenhum chamado.</p>
                  ) : (
                    itens.map((c) => <ChamadoCard key={c.id} chamado={c} onAbrir={abrir} />)
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
