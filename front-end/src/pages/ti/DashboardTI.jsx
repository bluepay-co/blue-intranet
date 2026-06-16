import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'
import { Activity, AlertTriangle, Timer, CalendarPlus, AlertCircle, Loader2, ChevronDown } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import DataTable from '@/components/ui/data-table'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu'
import { ChartContainer, CORES_GRAFICO } from '@/components/ui/chart'
import PageHeader from '@/components/layout/PageHeader'
import {
  STATUS,
  listarTodos,
  dashboard,
  rotuloCategoria,
  alterarStatus,
} from '@/api/modules/chamados'
import { rotuloRole } from '@/api/modules/usuarios'
import { StatusBadge, CriticidadeBadge } from '@/components/chamados/badges'

const PRIORIDADE = { CRITICO: 0, ALTO: 1, MEDIO: 2, BAIXO: 3 }

/** Card de indicador (KPI). */
function KpiCard({ icon: Icon, cor, valor, rotulo }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 py-4">
        <div className={`grid size-10 place-items-center rounded-lg ${cor}`}>
          <Icon className="size-5" />
        </div>
        <div>
          <p className="text-2xl font-semibold">{valor}</p>
          <p className="text-xs text-muted-foreground">{rotulo}</p>
        </div>
      </CardContent>
    </Card>
  )
}

function formatarTempoMedio(horas) {
  if (horas == null) return '—'
  if (horas < 24) return `${horas.toFixed(1)} h`
  return `${(horas / 24).toFixed(1)} d`
}

function formatarDiaCurto(iso) {
  const [, m, d] = iso.split('-')
  return `${d}/${m}`
}

export default function DashboardTI() {
  const navigate = useNavigate()
  const [dados, setDados] = useState(null)
  const [chamados, setChamados] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')

  const recarregar = useCallback(async () => {
    setErro('')
    try {
      const [d, lista] = await Promise.all([dashboard(), listarTodos()])
      setDados(d)
      setChamados(lista)
    } catch (e) {
      setErro(e?.response?.data?.message ?? 'Falha ao carregar o painel.')
    } finally {
      setCarregando(false)
    }
  }, [])

  useEffect(() => {
    let ativo = true
    ;(async () => {
      try {
        const [d, lista] = await Promise.all([dashboard(), listarTodos()])
        if (ativo) {
          setDados(d)
          setChamados(lista)
        }
      } catch (e) {
        if (ativo) setErro(e?.response?.data?.message ?? 'Falha ao carregar o painel.')
      } finally {
        if (ativo) setCarregando(false)
      }
    })()
    return () => {
      ativo = false
    }
  }, [])

  async function mudarStatus(c, novoStatus) {
    if (novoStatus === c.status) return
    try {
      await alterarStatus(c.id, novoStatus)
      recarregar()
    } catch (e) {
      setErro(e?.response?.data?.message ?? 'Erro ao alterar o status.')
    }
  }

  const fila = [...chamados].sort((a, b) => {
    const pa = PRIORIDADE[a.criticidade] ?? 9
    const pb = PRIORIDADE[b.criticidade] ?? 9
    if (pa !== pb) return pa - pb
    return new Date(a.criado_em) - new Date(b.criado_em)
  })

  const dataSetor = (dados?.porSetor ?? []).map((s) => ({ name: rotuloRole(s.rotulo), value: s.total }))
  const dataCategoria = (dados?.porCategoria ?? []).map((c) => ({ name: rotuloCategoria(c.rotulo), total: c.total }))
  const dataTendencia = (dados?.tendencia ?? []).map((t) => ({ ...t, dia: formatarDiaCurto(t.dia) }))

  const colunas = [
    {
      key: 'titulo',
      header: 'Chamado',
      cell: (c) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-foreground">
            <span className="text-muted-foreground">#{c.id}</span> {c.titulo}
          </p>
          <p className="text-xs text-muted-foreground">{rotuloCategoria(c.categoria)} · {c.autor_nome}</p>
        </div>
      ),
    },
    { key: 'criticidade', header: 'Criticidade', cell: (c) => <CriticidadeBadge criticidade={c.criticidade} /> },
    { key: 'status', header: 'Status', cell: (c) => <StatusBadge status={c.status} /> },
    {
      key: 'tecnico',
      header: 'Técnico',
      className: 'whitespace-nowrap text-muted-foreground',
      cell: (c) => c.atendente_nome ?? '—',
    },
    {
      key: 'acoes',
      header: '',
      headerClassName: 'text-right',
      className: 'text-right',
      cell: (c) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 gap-1.5" onClick={(e) => e.stopPropagation()}>
              Status
              <ChevronDown className="size-3.5 opacity-60" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {STATUS.map((s) => (
              <DropdownMenuItem
                key={s.value}
                onSelect={() => mudarStatus(c, s.value)}
                className={s.value === c.status ? 'font-semibold text-brand-accent' : ''}
              >
                {s.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ]

  if (carregando) {
    return (
      <div className="grid place-items-center py-24">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Painel da T.I." subtitle="Indicadores e fila de atendimento de chamados em toda a empresa." />

      {erro && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="size-4 shrink-0" />
          {erro}
        </div>
      )}

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard icon={Activity} cor="bg-blue-500/10 text-blue-600 dark:text-blue-400" valor={dados?.kpis.ativos ?? 0} rotulo="Chamados ativos" />
        <KpiCard icon={AlertTriangle} cor="bg-destructive/10 text-destructive" valor={dados?.kpis.criticos ?? 0} rotulo="Críticos / urgentes" />
        <KpiCard icon={Timer} cor="bg-amber-500/10 text-amber-600 dark:text-amber-400" valor={formatarTempoMedio(dados?.kpis.tempoMedioHoras)} rotulo="Tempo médio de resolução" />
        <KpiCard icon={CalendarPlus} cor="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" valor={dados?.kpis.totalMes ?? 0} rotulo="Abertos no mês" />
      </div>

      {/* Gráficos */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Volume por setor</CardTitle>
          </CardHeader>
          <CardContent>
            {dataSetor.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">Sem dados.</p>
            ) : (
              <ChartContainer className="h-64">
                <PieChart>
                  <Pie data={dataSetor} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
                    {dataSetor.map((_, i) => (
                      <Cell key={i} fill={CORES_GRAFICO[i % CORES_GRAFICO.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Gargalo por categoria</CardTitle>
          </CardHeader>
          <CardContent>
            {dataCategoria.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">Sem dados.</p>
            ) : (
              <ChartContainer className="h-64">
                <BarChart data={dataCategoria} layout="vertical" margin={{ left: 16 }}>
                  <CartesianGrid horizontal={false} strokeDasharray="3 3" className="stroke-border" />
                  <XAxis type="number" allowDecimals={false} className="text-xs" />
                  <YAxis type="category" dataKey="name" width={110} className="text-xs" />
                  <Tooltip />
                  <Bar dataKey="total" fill="#2563eb" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Tendência (últimos 30 dias)</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer className="h-72">
              <LineChart data={dataTendencia} margin={{ left: 0, right: 8 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="dia" className="text-xs" interval={4} />
                <YAxis allowDecimals={false} className="text-xs" />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="abertos" name="Abertos" stroke="#f59e0b" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="finalizados" name="Finalizados" stroke="#10b981" strokeWidth={2} dot={false} />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Fila operacional */}
      <Card className="overflow-hidden">
        <CardHeader className="border-b bg-muted/30">
          <CardTitle>Fila de atendimento</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <DataTable
            columns={colunas}
            data={fila}
            getRowId={(c) => c.id}
            rowClassName={() => 'cursor-pointer'}
            onRowClick={(c) => navigate(`/chamados/${c.id}`)}
            vazio={<p className="text-sm">Nenhum chamado na fila.</p>}
          />
        </CardContent>
      </Card>
    </div>
  )
}
