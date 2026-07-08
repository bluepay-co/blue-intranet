import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Headset, Plus, Pencil, Search, User, AlertCircle, Clock, Loader2, CheckCircle2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import PageHeader from '@/components/layout/PageHeader'
import { listarCx, rotuloCategoria } from '@/api/modules/chamados'
import { StatusBadge, CriticidadeBadge } from '@/components/chamados/badges'
import { tempoDecorrido } from '@/components/chamados/tempo'
import ChamadoFormDialogCX from '@/components/chamados/ChamadoFormDialogCX'
import { useAuth } from '@/auth/auth-context'

/** Cor da borda esquerda do card por criticidade. */
const BORDA = {
  CRITICO: 'border-l-destructive',
  ALTO: 'border-l-amber-500',
  MEDIO: 'border-l-blue-500',
  BAIXO: 'border-l-muted-foreground/40',
}

export default function ChamadosCX() {
  const navigate = useNavigate()
  const { usuario } = useAuth()
  const [chamados, setChamados] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [busca, setBusca] = useState('')
  const [colaborador, setColaborador] = useState('')
  const [dataFiltro, setDataFiltro] = useState('')
  const [formAberto, setFormAberto] = useState(false)
  const [editando, setEditando] = useState(null)

  const carregar = useCallback(async (filtroColaborador = colaborador) => {
    setErro('')
    try {
      const params = filtroColaborador.trim() ? { busca: filtroColaborador.trim() } : {}
      setChamados(await listarCx(params))
    } catch (e) {
      setErro(e?.response?.data?.message ?? 'Falha ao carregar os chamados.')
    } finally {
      setCarregando(false)
    }
  }, [colaborador])

  useEffect(() => {
    let ativo = true
    ;(async () => {
      try {
        const data = await listarCx()
        if (ativo) setChamados(data)
      } catch (e) {
        if (ativo) setErro(e?.response?.data?.message ?? 'Falha ao carregar os chamados.')
      } finally {
        if (ativo) setCarregando(false)
      }
    })()
    return () => { ativo = false }
  }, [])

  // Re-busca no servidor ao mudar o filtro de colaborador
  useEffect(() => {
    setCarregando(true)
    carregar(colaborador)
  }, [colaborador]) // eslint-disable-line react-hooks/exhaustive-deps

  const metricas = {
    ABERTO: chamados.filter((c) => c.status === 'ABERTO').length,
    EM_ANDAMENTO: chamados.filter((c) => c.status === 'EM_ANDAMENTO').length,
    FECHADO: chamados.filter((c) => c.status === 'FECHADO').length,
  }

  // Filtro por título feito no cliente
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

  function abrirEdicao(e, c) {
    e.stopPropagation()
    setEditando(c)
    setFormAberto(true)
  }

  const temFiltro = busca || colaborador || dataFiltro

  return (
    <div className="space-y-6">
      <PageHeader
        title="Chamados do time CX"
        subtitle="Acompanhe todos os chamados abertos pelo time de Customer Experience."
      >
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

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar pelo título…"
            className="h-9 pl-8"
          />
        </div>
        <div className="relative w-full max-w-xs">
          <User className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={colaborador}
            onChange={(e) => setColaborador(e.target.value)}
            placeholder="Filtrar por colaborador…"
            className="h-9 pl-8"
          />
        </div>
        <Input
          type="date"
          value={dataFiltro}
          onChange={(e) => setDataFiltro(e.target.value)}
          className="h-9 w-auto"
        />
        {temFiltro && (
          <Button
            variant="ghost"
            size="sm"
            className="h-9 text-muted-foreground"
            onClick={() => {
              setBusca('')
              setColaborador('')
              setDataFiltro('')
            }}
          >
            Limpar
          </Button>
        )}
      </div>

      {/* Lista em cards */}
      {carregando ? (
        <div className="grid place-items-center py-20">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtrados.length === 0 ? (
        <div className="grid place-items-center gap-2 py-20 text-center text-muted-foreground">
          <Headset className="size-6" />
          <p className="text-sm">
            {chamados.length === 0 ? 'Nenhum chamado encontrado para o time CX.' : 'Nenhum chamado corresponde aos filtros.'}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtrados.map((c) => (
            <div
              key={c.id}
              onClick={() => navigate(`/chamados/cx/${c.id}`)}
              className={`flex cursor-pointer flex-col rounded-xl border border-l-4 bg-card p-4 shadow-sm transition-colors hover:bg-muted/40 ${BORDA[c.criticidade] ?? ''}`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-muted-foreground">#{c.id}</span>
                <StatusBadge status={c.status} />
              </div>
              <p className="mt-2 line-clamp-2 font-medium">{c.titulo}</p>
              <p className="mt-1 text-xs text-muted-foreground">{rotuloCategoria(c.categoria)}</p>

              {/* Autor do chamado */}
              <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                <User className="size-3 shrink-0" />
                {c.autor_nome}
              </p>

              <div className="mt-3 flex items-center justify-between gap-2">
                <CriticidadeBadge criticidade={c.criticidade} />
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="size-3" />
                  {tempoDecorrido(c.criado_em)}
                </span>
              </div>

              {/* Botão de edição apenas para o próprio chamado em aberto */}
              {c.status === 'ABERTO' && c.autor_id === usuario?.id && (
                <div className="mt-3 border-t pt-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-full gap-1.5"
                    onClick={(e) => abrirEdicao(e, c)}
                  >
                    <Pencil className="size-3.5" />
                    Editar
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <ChamadoFormDialogCX
        key={editando?.id ?? 'novo'}
        aberto={formAberto}
        onFechar={() => setFormAberto(false)}
        chamadoEditando={editando}
        onSalvo={() => carregar(colaborador)}
      />
    </div>
  )
}
