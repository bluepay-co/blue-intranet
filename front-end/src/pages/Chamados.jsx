import { useCallback, useEffect, useState } from 'react'
import { LifeBuoy, Plus, Eye, Pencil, Search, AlertCircle, Clock, Loader2, CheckCircle2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import DataTable from '@/components/ui/data-table'
import PageHeader from '@/components/layout/PageHeader'
import { listarMeus, rotuloCategoria } from '@/api/modules/chamados'
import { useNotificacoesChamados } from '@/notificacoes/notificacoes-chamados'
import { StatusBadge, CriticidadeBadge } from '@/components/chamados/badges'
import ChamadoFormDialog from '@/components/chamados/ChamadoFormDialog'
import ChamadoDetalheDialog from '@/components/chamados/ChamadoDetalheDialog'

function formatarData(iso) {
  return iso ? new Date(iso).toLocaleDateString('pt-BR') : '—'
}

export default function Chamados() {
  const { marcarVisto } = useNotificacoesChamados()
  const [chamados, setChamados] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [busca, setBusca] = useState('')
  const [dataFiltro, setDataFiltro] = useState('')
  const [formAberto, setFormAberto] = useState(false)
  const [editando, setEditando] = useState(null)
  const [detalheId, setDetalheId] = useState(null)

  const carregar = useCallback(async () => {
    setErro('')
    try {
      setChamados(await listarMeus())
    } catch (e) {
      setErro(e?.response?.data?.message ?? 'Falha ao carregar seus chamados.')
    } finally {
      setCarregando(false)
    }
  }, [])

  useEffect(() => {
    let ativo = true
    ;(async () => {
      try {
        const data = await listarMeus()
        if (ativo) setChamados(data)
      } catch (e) {
        if (ativo) setErro(e?.response?.data?.message ?? 'Falha ao carregar seus chamados.')
      } finally {
        if (ativo) setCarregando(false)
      }
    })()
    return () => {
      ativo = false
    }
  }, [])

  const metricas = {
    ABERTO: chamados.filter((c) => c.status === 'ABERTO').length,
    EM_ANDAMENTO: chamados.filter((c) => c.status === 'EM_ANDAMENTO').length,
    FECHADO: chamados.filter((c) => c.status === 'FECHADO').length,
  }

  const termo = busca.trim().toLowerCase()
  const filtrados = chamados.filter((c) => {
    if (termo && !c.titulo.toLowerCase().includes(termo)) return false
    if (dataFiltro && new Date(c.criado_em).toISOString().slice(0, 10) !== dataFiltro) return false
    return true
  })

  function abrirNovo() {
    setEditando(null)
    setFormAberto(true)
  }

  function abrirEdicao(c) {
    setEditando(c)
    setFormAberto(true)
  }

  function abrirDetalhe(c) {
    setDetalheId(c.id)
    marcarVisto(c.id)
  }

  const colunas = [
    { key: 'titulo', header: 'Chamado', cell: (c) => (
      <div className="min-w-0">
        <p className="truncate font-medium text-foreground">{c.titulo}</p>
        <p className="text-xs text-muted-foreground">{rotuloCategoria(c.categoria)}</p>
      </div>
    ) },
    { key: 'criticidade', header: 'Criticidade', cell: (c) => <CriticidadeBadge criticidade={c.criticidade} /> },
    { key: 'status', header: 'Status', cell: (c) => <StatusBadge status={c.status} /> },
    { key: 'criado_em', header: 'Abertura', className: 'whitespace-nowrap text-muted-foreground', cell: (c) => formatarData(c.criado_em) },
    {
      key: 'acoes',
      header: '',
      headerClassName: 'text-right',
      className: 'text-right',
      cell: (c) => (
        <div className="flex justify-end gap-1.5">
          {c.status === 'ABERTO' && (
            <Button variant="ghost" size="sm" className="h-8 gap-1.5" onClick={() => abrirEdicao(c)}>
              <Pencil className="size-3.5" />
              Editar
            </Button>
          )}
          <Button variant="outline" size="sm" className="h-8 gap-1.5" onClick={() => abrirDetalhe(c)}>
            <Eye className="size-3.5" />
            Detalhes
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader title="Meus chamados" subtitle="Abra e acompanhe seus chamados de suporte de T.I.">
        <Button onClick={abrirNovo} className="gap-2">
          <Plus className="size-4" />
          Novo chamado
        </Button>
      </PageHeader>

      {erro && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="size-4 shrink-0" />
          {erro}
        </div>
      )}

      {/* Métricas */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3 py-4">
            <div className="grid size-10 place-items-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Clock className="size-5" />
            </div>
            <div>
              <p className="text-2xl font-semibold">{metricas.ABERTO}</p>
              <p className="text-xs text-muted-foreground">Em Aberto</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 py-4">
            <div className="grid size-10 place-items-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Loader2 className="size-5" />
            </div>
            <div>
              <p className="text-2xl font-semibold">{metricas.EM_ANDAMENTO}</p>
              <p className="text-xs text-muted-foreground">Em Andamento</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 py-4">
            <div className="grid size-10 place-items-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="size-5" />
            </div>
            <div>
              <p className="text-2xl font-semibold">{metricas.FECHADO}</p>
              <p className="text-xs text-muted-foreground">Finalizados</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 border-b px-4 py-3">
          <div className="relative w-full max-w-xs">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar pelo título…"
              className="h-9 pl-8"
            />
          </div>
          <Input
            type="date"
            value={dataFiltro}
            onChange={(e) => setDataFiltro(e.target.value)}
            className="h-9 w-auto"
          />
          {(busca || dataFiltro) && (
            <Button
              variant="ghost"
              size="sm"
              className="h-9 text-muted-foreground"
              onClick={() => {
                setBusca('')
                setDataFiltro('')
              }}
            >
              Limpar
            </Button>
          )}
        </div>

        <CardContent className="p-0">
          <DataTable
            columns={colunas}
            data={filtrados}
            carregando={carregando}
            vazio={
              <>
                <LifeBuoy className="size-6" />
                <p className="text-sm">
                  {chamados.length === 0 ? 'Você ainda não abriu chamados.' : 'Nenhum chamado encontrado.'}
                </p>
              </>
            }
          />
        </CardContent>
      </Card>

      <ChamadoFormDialog
        key={editando?.id ?? 'novo'}
        aberto={formAberto}
        onFechar={() => setFormAberto(false)}
        chamadoEditando={editando}
        onSalvo={carregar}
      />
      <ChamadoDetalheDialog
        key={detalheId ?? 'nenhum'}
        aberto={detalheId !== null}
        chamadoId={detalheId}
        onFechar={() => setDetalheId(null)}
        onAtualizado={carregar}
      />
    </div>
  )
}
