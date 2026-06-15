import { useCallback, useEffect, useState } from 'react'
import { Headset, Eye, Search, AlertCircle, ChevronDown, SlidersHorizontal } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import DataTable from '@/components/ui/data-table'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu'
import PageHeader from '@/components/layout/PageHeader'
import {
  STATUS,
  CATEGORIAS,
  CRITICIDADES,
  listarTodos,
  rotuloCategoria,
  rotuloStatus,
  rotuloCriticidade,
} from '@/api/modules/chamados'
import { useNotificacoesChamados } from '@/notificacoes/notificacoes-chamados'
import { StatusBadge, CriticidadeBadge } from '@/components/chamados/badges'
import ChamadoDetalheDialog from '@/components/chamados/ChamadoDetalheDialog'

function formatarData(iso) {
  return iso ? new Date(iso).toLocaleDateString('pt-BR') : '—'
}

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

export default function ChamadosTI() {
  const { marcarVisto } = useNotificacoesChamados()
  const [chamados, setChamados] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [busca, setBusca] = useState('')
  const [fStatus, setFStatus] = useState(null)
  const [fCategoria, setFCategoria] = useState(null)
  const [fCriticidade, setFCriticidade] = useState(null)
  const [detalheId, setDetalheId] = useState(null)

  const carregar = useCallback(async () => {
    setErro('')
    try {
      setChamados(await listarTodos())
    } catch (e) {
      setErro(e?.response?.data?.message ?? 'Falha ao carregar os chamados.')
    } finally {
      setCarregando(false)
    }
  }, [])

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
  const filtrados = chamados.filter((c) => {
    if (fStatus && c.status !== fStatus) return false
    if (fCategoria && c.categoria !== fCategoria) return false
    if (fCriticidade && c.criticidade !== fCriticidade) return false
    if (termo && !c.titulo.toLowerCase().includes(termo) && !c.autor_nome.toLowerCase().includes(termo))
      return false
    return true
  })

  const temFiltro = busca || fStatus || fCategoria || fCriticidade

  function abrirDetalhe(c) {
    setDetalheId(c.id)
    marcarVisto(c.id)
  }

  const colunas = [
    {
      key: 'titulo',
      header: 'Chamado',
      cell: (c) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-foreground">
            <span className="text-muted-foreground">#{c.id}</span> {c.titulo}
          </p>
          <p className="text-xs text-muted-foreground">{rotuloCategoria(c.categoria)}</p>
        </div>
      ),
    },
    { key: 'autor', header: 'Solicitante', className: 'whitespace-nowrap', cell: (c) => c.autor_nome },
    { key: 'criticidade', header: 'Criticidade', cell: (c) => <CriticidadeBadge criticidade={c.criticidade} /> },
    { key: 'status', header: 'Status', cell: (c) => <StatusBadge status={c.status} /> },
    { key: 'criado_em', header: 'Abertura', className: 'whitespace-nowrap text-muted-foreground', cell: (c) => formatarData(c.criado_em) },
    {
      key: 'acoes',
      header: '',
      headerClassName: 'text-right',
      className: 'text-right',
      cell: (c) => (
        <Button variant="outline" size="sm" className="h-8 gap-1.5" onClick={() => abrirDetalhe(c)}>
          <Eye className="size-3.5" />
          Atender
        </Button>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader title="Chamados (T.I)" subtitle="Acompanhe e resolva os chamados de toda a empresa." />

      {erro && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="size-4 shrink-0" />
          {erro}
        </div>
      )}

      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 border-b px-4 py-3">
          <div className="relative w-full max-w-xs">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por título ou solicitante…"
              className="h-9 pl-8"
            />
          </div>
          <FiltroDropdown rotulo="Status" valor={fStatus} opcoes={STATUS} onSelecionar={setFStatus} formatar={rotuloStatus} />
          <FiltroDropdown rotulo="Categoria" valor={fCategoria} opcoes={CATEGORIAS} onSelecionar={setFCategoria} formatar={rotuloCategoria} />
          <FiltroDropdown rotulo="Criticidade" valor={fCriticidade} opcoes={CRITICIDADES} onSelecionar={setFCriticidade} formatar={rotuloCriticidade} />
          {temFiltro && (
            <Button
              variant="ghost"
              size="sm"
              className="h-9 text-muted-foreground"
              onClick={() => {
                setBusca('')
                setFStatus(null)
                setFCategoria(null)
                setFCriticidade(null)
              }}
            >
              Limpar
            </Button>
          )}
          <span className="ml-auto text-xs text-muted-foreground">
            {filtrados.length} de {chamados.length}
          </span>
        </div>

        <CardContent className="p-0">
          <DataTable
            columns={colunas}
            data={filtrados}
            carregando={carregando}
            vazio={
              <>
                <Headset className="size-6" />
                <p className="text-sm">
                  {chamados.length === 0 ? 'Nenhum chamado aberto.' : 'Nenhum chamado encontrado.'}
                </p>
              </>
            }
          />
        </CardContent>
      </Card>

      <ChamadoDetalheDialog
        key={detalheId ?? 'nenhum'}
        aberto={detalheId !== null}
        chamadoId={detalheId}
        ehTI
        onFechar={() => setDetalheId(null)}
        onAtualizado={carregar}
      />
    </div>
  )
}
