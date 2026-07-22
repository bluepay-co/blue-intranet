import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { getReceitasEquipeGerente, getMembrosEquipeGerente, getRankingPeriodoGerente } from '@/api/modules/gerente'
import { getEquipe } from '@/api/modules/metricas'
import RankingTabela from '@/components/metricas/RankingTabela'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ChartContainer, CORES_GRAFICO } from '@/components/ui/chart'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import PageHeader from '@/components/layout/PageHeader'
import { cn } from '@/lib/utils'
import { gradeDoMes, diasDaSemana, chaveDia, mesmoMes, fmt, capitalizar } from '@/lib/datas'
import { BarChart, Bar, LineChart, Line, Legend, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from 'recharts'
import {
  Wallet, Users, UserPlus, RefreshCw, AlertCircle, Loader2,
  ChevronLeft, ChevronRight, ChevronDown, Target, BarChart3, TrendingUp, TrendingDown,
  CalendarRange,
} from 'lucide-react'

/** Métricas dos 4 cards do topo que abrem ranking da equipe ao clicar. */
const METRICAS_RANKING = {
  receita:        { titulo: 'Receita no Mês',              campo: 'receita',        formato: (v) => moeda(v) },
  tpv:            { titulo: 'TPV no Mês',                  campo: 'tpv',            formato: (v) => moeda(v) },
  clientesNovos:  { titulo: 'Clientes Novos no Mês',        campo: 'clientesNovos',  formato: (v) => numero(v) },
  clientesAtivos: { titulo: 'Clientes que Faturaram',       campo: 'clientesAtivos', formato: (v) => numero(v) },
}

const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

const selectCls =
  'h-9 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50'

function moeda(v) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2,
  }).format(v ?? 0)
}
function moedaCompacta(v) {
  if (!v) return '—'
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency', currency: 'BRL', notation: 'compact', maximumFractionDigits: 1,
  }).format(v)
}
function numero(v) {
  return new Intl.NumberFormat('pt-BR').format(v ?? 0)
}
function pct(v) {
  if (v === null || v === undefined) return '—'
  return `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`
}
/** Parseia 'YYYY-MM-DD' em horário local (evita o shift de fuso do `new Date('YYYY-MM-DD')` cru). */
function parseDia(iso) {
  return new Date(`${iso}T00:00:00`)
}

/** KpiCard do gerente — quando `onClick` é passado, fica clicável e expande o ranking da equipe por baixo. */
function KpiCard({ icon: Icon, cor, valor, rotulo, onClick, ativo }) {
  return (
    <Card
      onClick={onClick}
      className={cn(
        onClick && 'cursor-pointer transition-colors hover:border-primary/50',
        ativo && 'border-primary ring-1 ring-primary',
      )}
    >
      <CardContent className="flex items-center gap-3 py-4">
        <div className={`grid size-10 shrink-0 place-items-center rounded-lg ${cor}`}>
          <Icon className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-2xl font-semibold leading-tight">{valor}</p>
          <p className="text-xs text-muted-foreground">{rotulo}</p>
        </div>
        {onClick && (
          <ChevronDown className={cn('size-4 shrink-0 text-muted-foreground transition-transform', ativo && 'rotate-180')} />
        )}
      </CardContent>
    </Card>
  )
}

/** Ranking da equipe por uma métrica específica — abre ao clicar num dos KpiCards do topo. */
function RankingMetricaEquipe({ titulo, membros, campo, formato, onSelecionarVendedor }) {
  const ordenado = [...(membros ?? [])].sort((a, b) => (b[campo] ?? 0) - (a[campo] ?? 0))
  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b bg-muted/30">
        <CardTitle>Ranking da Equipe — {titulo}</CardTitle>
        <p className="text-xs text-muted-foreground">Clique num funcionário para ver a visão individual dele.</p>
      </CardHeader>
      <CardContent className="p-0">
        {ordenado.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Sem dados para este período.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-xs text-muted-foreground">
                <th className="px-4 py-2 text-left font-medium">#</th>
                <th className="px-4 py-2 text-left font-medium">Funcionário</th>
                <th className="px-4 py-2 text-right font-medium">{titulo}</th>
                <th className="px-2 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {ordenado.map((m, i) => (
                <tr
                  key={m.vendedorId}
                  onClick={() => onSelecionarVendedor(m.vendedorId)}
                  className="border-b last:border-0 cursor-pointer hover:bg-muted/30 transition-colors"
                >
                  <td className="px-4 py-2.5">
                    <Badge variant={i === 0 ? 'default' : 'outline'} className="w-6 h-6 flex items-center justify-center p-0 text-xs">{i + 1}</Badge>
                  </td>
                  <td className="px-4 py-2.5 font-medium">{m.nome}</td>
                  <td className="px-4 py-2.5 text-right font-semibold text-primary">{formato(m[campo] ?? 0)}</td>
                  <td className="px-2 py-2.5 text-muted-foreground"><ChevronRight className="size-4" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CardContent>
    </Card>
  )
}

function TooltipSemana({ active, payload }) {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload
  return (
    <div className="rounded-xl border bg-background px-3.5 py-2.5 text-sm shadow-xl space-y-1">
      <p className="font-semibold text-foreground">
        Semana de {fmt.diaMes.format(parseDia(d.inicio))} a {fmt.diaMes.format(parseDia(d.fim))}
      </p>
      <p className="text-primary font-medium">{moeda(d.receita)}</p>
      <p className="text-xs text-muted-foreground">{d.clientesNovos} cliente{d.clientesNovos === 1 ? '' : 's'} novo{d.clientesNovos === 1 ? '' : 's'}</p>
    </div>
  )
}

function TooltipDiaUtil({ active, payload, mes, ano }) {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload
  return (
    <div className="rounded-xl border bg-background px-3.5 py-2.5 text-sm shadow-xl space-y-1">
      <p className="font-semibold text-foreground">
        {capitalizar(fmt.diaSemanaCurto.format(new Date(ano, mes - 1, d.dia)))}, {d.dia} de {MESES[mes - 1]}
      </p>
      <p className="text-primary font-medium">{moeda(d.receita)}</p>
      {d.delta !== null && (
        <p className={`text-xs font-semibold ${d.delta >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
          {pct(d.delta)} vs dia útil anterior
        </p>
      )}
    </div>
  )
}

function TooltipComparativoDiario({ active, payload, label, mesAtualLabel, mesAnteriorLabel }) {
  if (!active || !payload?.length) return null
  const atual = payload.find((p) => p.dataKey === 'atual')?.value
  const anterior = payload.find((p) => p.dataKey === 'anterior')?.value
  const delta = (anterior ? Math.round(((atual - anterior) / anterior) * 1000) / 10 : null)
  return (
    <div className="rounded-xl border bg-background px-3.5 py-2.5 text-sm shadow-xl space-y-1 min-w-[180px]">
      <p className="font-semibold text-foreground">Dia {label}</p>
      {atual != null && <p className="text-primary font-medium">{mesAtualLabel}: {moeda(atual)}</p>}
      {anterior != null && <p className="text-muted-foreground">{mesAnteriorLabel}: {moeda(anterior)}</p>}
      {delta !== null && (
        <p className={`text-xs font-semibold ${delta >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
          {pct(delta)} vs {mesAnteriorLabel}
        </p>
      )}
    </div>
  )
}

/** Receita diária do mês atual vs. mesmo dia do mês anterior (dia 1 com dia 1, dia 2 com dia 2...). */
function ComparativoMensalDiario({ serie, mesAtualLabel, mesAnteriorLabel }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Receita Diária — {mesAtualLabel} vs {mesAnteriorLabel}</CardTitle>
        <p className="text-xs text-muted-foreground">Compara o mesmo dia do mês (dia 1 com dia 1, dia 2 com dia 2...).</p>
      </CardHeader>
      <CardContent>
        {serie.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Sem dados suficientes para comparar.</p>
        ) : (
          <ChartContainer className="h-64">
            <LineChart data={serie} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="currentColor" className="stroke-border/30" />
              <XAxis dataKey="dia" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis tickFormatter={(v) => moedaCompacta(v)} tick={{ fontSize: 11 }} width={70} tickLine={false} axisLine={false} />
              <Tooltip content={<TooltipComparativoDiario mesAtualLabel={mesAtualLabel} mesAnteriorLabel={mesAnteriorLabel} />} />
              <Legend
                formatter={(v) => (v === 'atual' ? mesAtualLabel : mesAnteriorLabel)}
                wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
              />
              <Line
                type="monotone"
                dataKey="anterior"
                stroke={`${CORES_GRAFICO[0]}88`}
                strokeWidth={2}
                strokeDasharray="5 4"
                dot={false}
                connectNulls
              />
              <Line
                type="monotone"
                dataKey="atual"
                stroke={CORES_GRAFICO[0]}
                strokeWidth={2.5}
                dot={{ r: 3, fill: CORES_GRAFICO[0], strokeWidth: 0 }}
                activeDot={{ r: 5 }}
                connectNulls
              />
            </LineChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}

/**
 * Tile compacto de resumo da semana — mesmo padrão visual dos KPIs do topo
 * da página. Clicar abre o detalhe (TPV, clientes, dia a dia) num Dialog.
 */
function SemanaMiniCard({ numeroSemana, semana, onClick }) {
  return (
    <button type="button" onClick={onClick} className="cursor-pointer text-left">
      <Card className="h-full cursor-pointer transition-colors hover:border-primary/50">
        <CardContent className="py-3.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-muted-foreground">Semana {numeroSemana}</span>
            <CalendarRange className="size-3.5 shrink-0 text-muted-foreground" />
          </div>
          <p className="mt-1 truncate text-lg font-bold text-primary">{moeda(semana.receita)}</p>
          <p className="text-[11px] text-muted-foreground">
            {fmt.diaMes.format(parseDia(semana.inicio))} – {fmt.diaMes.format(parseDia(semana.fim))}
          </p>
        </CardContent>
      </Card>
    </button>
  )
}

/** Mesmo padrão visual do Ranking Geral, adaptado para clientes da equipe. */
function RankingClientesTabela({ titulo, clientes, mostrarPrimeiraCompra, mostrarVendedor }) {
  const navigate = useNavigate()
  const totais = (clientes ?? []).reduce((acc, c) => ({
    receita: acc.receita + c.receita,
    tpv: acc.tpv + c.tpv,
    qtdTickets: acc.qtdTickets + c.qtdTickets,
  }), { receita: 0, tpv: 0, qtdTickets: 0 })
  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b bg-muted/30">
        <CardTitle>{titulo}</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {(!clientes || clientes.length === 0) ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Nenhum cliente neste período.</p>
        ) : (
          <div className="max-h-[420px] overflow-y-auto overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10 bg-card">
                <tr className="border-b text-xs text-muted-foreground">
                  <th className="px-4 py-2 text-left font-medium">#</th>
                  <th className="px-4 py-2 text-left font-medium">Cliente</th>
                  {mostrarVendedor && <th className="px-4 py-2 text-left font-medium">Vendedor</th>}
                  {mostrarPrimeiraCompra && <th className="px-4 py-2 text-left font-medium">1ª compra</th>}
                  <th className="px-4 py-2 text-right font-medium">Receita</th>
                  <th className="px-4 py-2 text-right font-medium">TPV</th>
                  <th className="px-4 py-2 text-right font-medium">Taxa média</th>
                  <th className="px-4 py-2 text-right font-medium">Transações</th>
                  <th className="px-2 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {clientes.map((c, i) => (
                  <tr
                    key={c.clienteId}
                    onClick={() => navigate(`/gerente/is/clientes/${c.clienteId}`)}
                    className="border-b last:border-0 cursor-pointer hover:bg-muted/30 transition-colors"
                  >
                    <td className="px-4 py-2.5">
                      <Badge variant={i === 0 ? 'default' : 'outline'} className="w-6 h-6 flex items-center justify-center p-0 text-xs">{i + 1}</Badge>
                    </td>
                    <td className="px-4 py-2.5 max-w-[220px] truncate font-medium" title={c.nome}>{c.nome}</td>
                    {mostrarVendedor && (
                      <td className="px-4 py-2.5 text-muted-foreground whitespace-nowrap">{c.vendedorNome ?? '—'}</td>
                    )}
                    {mostrarPrimeiraCompra && (
                      <td className="px-4 py-2.5 text-muted-foreground whitespace-nowrap">
                        {c.primeiraCompra ? fmt.diaMes.format(parseDia(c.primeiraCompra)) : '—'}
                      </td>
                    )}
                    <td className="px-4 py-2.5 text-right font-semibold text-primary">{moeda(c.receita)}</td>
                    <td className="px-4 py-2.5 text-right text-muted-foreground">{moeda(c.tpv)}</td>
                    <td className="px-4 py-2.5 text-right text-muted-foreground">{(c.taxaMedia ?? 0).toFixed(2)}%</td>
                    <td className="px-4 py-2.5 text-right">{numero(c.qtdTickets)}</td>
                    <td className="px-2 py-2.5 text-muted-foreground"><ChevronRight className="size-4" /></td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="sticky bottom-0 z-10 bg-card">
                <tr className="border-t-2 font-semibold">
                  <td className="px-4 py-2.5"></td>
                  <td className="px-4 py-2.5">Total</td>
                  {mostrarVendedor && <td className="px-4 py-2.5"></td>}
                  {mostrarPrimeiraCompra && <td className="px-4 py-2.5"></td>}
                  <td className="px-4 py-2.5 text-right text-primary">{moeda(totais.receita)}</td>
                  <td className="px-4 py-2.5 text-right">{moeda(totais.tpv)}</td>
                  <td className="px-4 py-2.5 text-right text-muted-foreground font-normal">—</td>
                  <td className="px-4 py-2.5 text-right">{numero(totais.qtdTickets)}</td>
                  <td className="px-2 py-2.5"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

/**
 * Receitas por Período — visão do gerente, dia/semana/mês. Mesmo padrão de
 * `DashboardVisaoGeral.jsx` (individual), generalizado para "Toda a equipe"
 * ou um funcionário específico via seletor no cabeçalho.
 */
export default function ReceitasEquipe() {
  const navigate = useNavigate()
  const agora = new Date()
  const [mes, setMes] = useState(agora.getMonth() + 1)
  const [ano, setAno] = useState(agora.getFullYear())
  const [vendedorId, setVendedorId] = useState('')
  const [membros, setMembros] = useState([])
  const [membrosRanking, setMembrosRanking] = useState([])
  const [metricaAberta, setMetricaAberta] = useState(null)
  const [periodoRanking, setPeriodoRanking] = useState('dia')
  const [rankingPeriodo, setRankingPeriodo] = useState([])
  const [carregandoRankingPeriodo, setCarregandoRankingPeriodo] = useState(true)
  const [dados, setDados] = useState(null)
  const [dadosAnterior, setDadosAnterior] = useState(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [diaSelecionado, setDiaSelecionado] = useState(null)
  const [semanaSelecionada, setSemanaSelecionada] = useState(null)

  const anoAnterior = ano - 1

  useEffect(() => {
    getMembrosEquipeGerente().then(setMembros).catch(() => {})
  }, [])

  const carregar = useCallback(async () => {
    setErro('')
    setCarregando(true)
    try {
      const chamadas = [
        getReceitasEquipeGerente(mes, ano, vendedorId || undefined),
        getReceitasEquipeGerente(mes, ano - 1, vendedorId || undefined),
      ]
      if (!vendedorId) chamadas.push(getEquipe(mes, ano, 'IS'))
      const [data, dataAnterior, dataEquipe] = await Promise.all(chamadas)
      setDados(data)
      setDadosAnterior(dataAnterior)
      setMembrosRanking(dataEquipe?.membros ?? [])
    } catch (e) {
      if (e.response?.status === 404) setErro('Nenhum dado encontrado para este período.')
      else setErro('Erro ao carregar as receitas. Tente novamente.')
    } finally {
      setCarregando(false)
    }
  }, [mes, ano, vendedorId])

  useEffect(() => { carregar() }, [carregar])

  const carregarRankingPeriodo = useCallback(async () => {
    if (vendedorId) return
    setCarregandoRankingPeriodo(true)
    try {
      const data = await getRankingPeriodoGerente(periodoRanking)
      setRankingPeriodo(data.membros)
    } catch {
      setRankingPeriodo([])
    } finally {
      setCarregandoRankingPeriodo(false)
    }
  }, [vendedorId, periodoRanking])

  useEffect(() => { carregarRankingPeriodo() }, [carregarRankingPeriodo])

  function alternarRanking(chave) {
    setMetricaAberta((atual) => (atual === chave ? null : chave))
  }

  function selecionarVendedorDoRanking(id) {
    setVendedorId(String(id))
    setMetricaAberta(null)
  }

  function mudarMes(delta) {
    let m = mes + delta, a = ano
    if (m > 12) { m = 1; a++ }
    if (m < 1)  { m = 12; a-- }
    setMes(m); setAno(a)
  }

  const diasPorChave = useMemo(() => {
    const mapa = new Map()
    for (const d of dados?.dias ?? []) mapa.set(d.dia, d)
    return mapa
  }, [dados])

  const maxReceitaDia = useMemo(() => {
    return Math.max(0, ...(dados?.dias ?? []).map((d) => d.receita))
  }, [dados])

  const grade = useMemo(() => gradeDoMes(new Date(ano, mes - 1, 1)), [mes, ano])
  const hojeChave = useMemo(() => chaveDia(new Date()), [])

  const semanasDoMes = useMemo(() => {
    const dataMesRef = new Date(ano, mes - 1, 1)
    const semanasPorInicio = new Map((dados?.semanas ?? []).map((s) => [s.inicio, s]))
    const blocos = []
    for (let i = 0; i < grade.length; i += 7) blocos.push(grade.slice(i, i + 7))
    return blocos
      .filter((dias7) => dias7.some((d) => mesmoMes(d, dataMesRef)))
      .map((dias7) => {
        const inicio = chaveDia(dias7[0])
        const fim = chaveDia(dias7[6])
        const existente = semanasPorInicio.get(inicio)
        return {
          dias7,
          semana: existente ?? { inicio, fim, receita: 0, tpv: 0, qtdTickets: 0, clientesAtivos: 0, clientesNovos: 0 },
        }
      })
  }, [dados, grade, mes, ano])

  /** Receita diária do mês atual vs. o mesmo dia do mesmo mês no ano anterior. */
  const serieComparativoMensal = useMemo(() => {
    if (!dados) return []
    const diasNoMesAtual = new Date(ano, mes, 0).getDate()
    const diasNoMesAnoAnterior = new Date(anoAnterior, mes, 0).getDate()

    const anteriorPorNumeroDia = new Map()
    for (const d of dadosAnterior?.dias ?? []) {
      anteriorPorNumeroDia.set(Number(d.dia.slice(8, 10)), d.receita)
    }

    const linhas = []
    for (let dia = 1; dia <= diasNoMesAtual; dia++) {
      const chaveAtual = `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`
      linhas.push({
        dia,
        atual: diasPorChave.get(chaveAtual)?.receita ?? 0,
        anterior: dia <= diasNoMesAnoAnterior ? (anteriorPorNumeroDia.get(dia) ?? 0) : null,
      })
    }
    return linhas
  }, [dados, dadosAnterior, diasPorChave, mes, ano, anoAnterior])

  function abrirSemana(numeroSemana, semana, dias7) {
    setSemanaSelecionada({ numeroSemana, semana, dias7 })
  }

  /** Receita por dia ÚTIL do mês (pula sáb/dom), com variação vs. o dia útil anterior. */
  const serieDiaUtil = useMemo(() => {
    if (!dados) return []
    const hoje = new Date()
    const ehMesAtual = mes === hoje.getMonth() + 1 && ano === hoje.getFullYear()
    const totalDias = new Date(ano, mes, 0).getDate()
    const limite = ehMesAtual ? hoje.getDate() : totalDias

    const bruto = []
    for (let d = 1; d <= limite; d++) {
      const data = new Date(ano, mes - 1, d)
      const diaSemana = data.getDay()
      if (diaSemana === 0 || diaSemana === 6) continue // pula fim de semana
      const chave = chaveDia(data)
      const receita = diasPorChave.get(chave)?.receita ?? 0
      bruto.push({ dia: d, chave, receita })
    }
    return bruto.map((item, i) => {
      const anterior = i > 0 ? bruto[i - 1].receita : null
      const delta = anterior ? Math.round(((item.receita - anterior) / anterior) * 1000) / 10 : null
      return { ...item, delta }
    })
  }, [dados, diasPorChave, mes, ano])

  const insightDiario = useMemo(() => {
    const comReceita = serieDiaUtil.filter((d) => d.receita > 0)
    if (comReceita.length === 0) return null
    const melhorDia = comReceita.reduce((a, b) => (b.receita > a.receita ? b : a))
    const comDelta = serieDiaUtil.filter((d) => d.delta !== null)
    const maiorAlta = comDelta.length ? comDelta.reduce((a, b) => (b.delta > a.delta ? b : a)) : null
    const maiorQueda = comDelta.length ? comDelta.reduce((a, b) => (b.delta < a.delta ? b : a)) : null
    const mediaDiaUtil = comReceita.reduce((acc, d) => acc + d.receita, 0) / comReceita.length
    return { melhorDia, maiorAlta, maiorQueda, mediaDiaUtil }
  }, [serieDiaUtil])

  function abrirDia(chave) {
    setDiaSelecionado(diasPorChave.get(chave) ?? { dia: chave, receita: 0, tpv: 0, qtdTickets: 0, clientesAtivos: 0, clientesNovos: 0, clientes: [] })
  }

  /** Ranking de quem mais vendeu no dia selecionado — soma a receita dos clientes do dia por vendedor. */
  const rankingVendedoresDia = useMemo(() => {
    if (vendedorId || !diaSelecionado?.clientes?.length) return []
    const porVendedor = new Map()
    for (const c of diaSelecionado.clientes) {
      const chave = c.vendedorId ?? 'sem-vendedor'
      if (!porVendedor.has(chave)) {
        porVendedor.set(chave, { vendedorId: c.vendedorId, nome: c.vendedorNome ?? 'Desconhecido', receita: 0 })
      }
      porVendedor.get(chave).receita += c.receita
    }
    return Array.from(porVendedor.values()).sort((a, b) => b.receita - a.receita)
  }, [diaSelecionado, vendedorId])

  if (carregando && !dados) {
    return (
      <div className="grid place-items-center py-24">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Visão Geral"
        subtitle="Receita da equipe ou de um funcionário específico, dia a dia e semana a semana"
      >
        <div className="flex items-center gap-2">
          <select className={selectCls} value={vendedorId} onChange={(e) => { setVendedorId(e.target.value); setMetricaAberta(null) }}>
            <option value="">Toda a equipe</option>
            {membros.map((m) => <option key={m.id} value={m.id}>{m.nome}</option>)}
          </select>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={carregar} disabled={carregando} title="Atualizar">
            <RefreshCw className={`size-4 ${carregando ? 'animate-spin' : ''}`} />
          </Button>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => mudarMes(-1)} disabled={carregando} title="Mês anterior">
              <ChevronLeft className="size-4" />
            </Button>
            <span className="min-w-[100px] text-center text-sm font-medium">
              {MESES[mes - 1]} / {ano}
            </span>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => mudarMes(1)} disabled={carregando} title="Próximo mês">
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      </PageHeader>

      {erro && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="size-4 shrink-0" />
          {erro}
        </div>
      )}

      {dados && (
        <>
          {/* KPIs do mês — clicáveis quando "Toda a equipe" está selecionada, abrem o ranking por baixo */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard icon={Wallet}    cor="bg-blue-500/10 text-blue-600"      valor={moeda(dados.resumoMes.receita)}       rotulo="Receita no mês"
              onClick={!vendedorId ? () => alternarRanking('receita') : undefined} ativo={metricaAberta === 'receita'} />
            <KpiCard icon={BarChart3} cor="bg-sky-500/10 text-sky-600"        valor={moeda(dados.resumoMes.tpv)}           rotulo="TPV no mês"
              onClick={!vendedorId ? () => alternarRanking('tpv') : undefined} ativo={metricaAberta === 'tpv'} />
            <KpiCard icon={UserPlus}  cor="bg-emerald-500/10 text-emerald-600" valor={numero(dados.resumoMes.clientesNovos)} rotulo="Clientes novos no mês"
              onClick={!vendedorId ? () => alternarRanking('clientesNovos') : undefined} ativo={metricaAberta === 'clientesNovos'} />
            <KpiCard icon={Users}     cor="bg-violet-500/10 text-violet-600"  valor={numero(dados.resumoMes.clientesAtivos)} rotulo="Clientes que faturaram"
              onClick={!vendedorId ? () => alternarRanking('clientesAtivos') : undefined} ativo={metricaAberta === 'clientesAtivos'} />
          </div>

          {metricaAberta && (
            <RankingMetricaEquipe
              titulo={METRICAS_RANKING[metricaAberta].titulo}
              membros={membrosRanking}
              campo={METRICAS_RANKING[metricaAberta].campo}
              formato={METRICAS_RANKING[metricaAberta].formato}
              onSelecionarVendedor={selecionarVendedorDoRanking}
            />
          )}

          {/* Meta do mês — % já batido e quanto falta */}
          {dados.resumoMes.meta > 0 && (
            <Card>
              <CardContent className="flex items-center gap-4 py-4 px-5">
                <div className={cn(
                  'grid size-10 shrink-0 place-items-center rounded-lg',
                  dados.resumoMes.pctMeta >= 100 ? 'bg-emerald-500/10 text-emerald-600'
                    : dados.resumoMes.pctMeta >= 70 ? 'bg-amber-500/10 text-amber-600'
                    : 'bg-red-500/10 text-red-500',
                )}>
                  <Target className="size-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                    <p className="text-lg font-bold">{dados.resumoMes.pctMeta.toFixed(1)}% da meta batida</p>
                    <p className="text-sm text-muted-foreground">
                      {dados.resumoMes.metaEmAberto === 0 ? 'Meta batida!' : `faltam ${moeda(dados.resumoMes.metaEmAberto)}`}
                    </p>
                  </div>
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className={cn(
                        'h-full rounded-full transition-all',
                        dados.resumoMes.pctMeta >= 100 ? 'bg-emerald-500'
                          : dados.resumoMes.pctMeta >= 70 ? 'bg-amber-500'
                          : 'bg-red-500',
                      )}
                      style={{ width: `${Math.min(dados.resumoMes.pctMeta, 100)}%` }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Ranking Geral da equipe — flexível entre Dia (hoje) e Semana (atual) */}
          {!vendedorId && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-sm font-medium text-muted-foreground">Ranking da Equipe</h2>
                <div className="flex gap-1 rounded-lg border border-border p-0.5">
                  <button
                    type="button"
                    onClick={() => setPeriodoRanking('dia')}
                    className={cn(
                      'px-3 py-1 text-xs font-medium rounded-md transition-colors',
                      periodoRanking === 'dia' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    Dia
                  </button>
                  <button
                    type="button"
                    onClick={() => setPeriodoRanking('semana')}
                    className={cn(
                      'px-3 py-1 text-xs font-medium rounded-md transition-colors',
                      periodoRanking === 'semana' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    Semana
                  </button>
                </div>
              </div>
              {carregandoRankingPeriodo ? (
                <div className="grid place-items-center py-12">
                  <Loader2 className="size-5 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <RankingTabela
                  titulo={`Ranking da Equipe — ${periodoRanking === 'dia' ? 'Hoje' : 'Esta Semana'}`}
                  membros={rankingPeriodo}
                  mostrarHoje={false}
                  ocultarSigilosas={false}
                />
              )}
            </div>
          )}

          {/* Resumo semanal — Semana 1, 2, 3... clicável, abre o detalhe dia a dia */}
          <div>
            <h2 className="text-sm font-medium text-muted-foreground mb-2">Resumo Semanal</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {semanasDoMes.map(({ dias7, semana }, i) => (
                <SemanaMiniCard
                  key={semana.inicio}
                  numeroSemana={i + 1}
                  semana={semana}
                  onClick={() => abrirSemana(i + 1, semana, dias7)}
                />
              ))}
            </div>
          </div>

          {/* Receita por semana */}
          <Card>
            <CardHeader>
              <CardTitle>Receita por Semana</CardTitle>
            </CardHeader>
            <CardContent>
              {dados.semanas.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">Sem movimentação neste mês.</p>
              ) : (
                <ChartContainer className="h-56">
                  <BarChart data={dados.semanas} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="currentColor" className="stroke-border/30" />
                    <XAxis dataKey="inicio" tickFormatter={(v) => fmt.diaMes.format(parseDia(v))} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                    <YAxis tickFormatter={(v) => moedaCompacta(v)} tick={{ fontSize: 11 }} width={70} tickLine={false} axisLine={false} />
                    <Tooltip content={<TooltipSemana />} cursor={{ fill: 'currentColor', className: 'fill-muted/40' }} />
                    <Bar dataKey="receita" radius={[5, 5, 0, 0]}>
                      {dados.semanas.map((s, i) => (
                        <Cell key={i} fill={s.inicio <= hojeChave && hojeChave <= s.fim ? CORES_GRAFICO[0] : `${CORES_GRAFICO[0]}66`} />
                      ))}
                    </Bar>
                  </BarChart>
                </ChartContainer>
              )}
            </CardContent>
          </Card>

          {/* Receita diária vs. o mesmo mês no ano anterior */}
          <ComparativoMensalDiario
            serie={serieComparativoMensal}
            mesAtualLabel={`${MESES[mes - 1]}/${ano}`}
            mesAnteriorLabel={`${MESES[mes - 1]}/${anoAnterior}`}
          />

          {/* Evolução diária de receita — dias úteis do mês */}
          <Card>
            <CardHeader>
              <CardTitle>Evolução Diária de Receita — Dias Úteis</CardTitle>
              <p className="text-xs text-muted-foreground">Fins de semana são ignorados na comparação dia a dia. Clique num ponto para ver o ranking de quem mais vendeu naquele dia.</p>
            </CardHeader>
            <CardContent className="space-y-4">
              {serieDiaUtil.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">Sem dias úteis com movimentação ainda.</p>
              ) : (
                <>
                  <ChartContainer className="h-64">
                    <LineChart data={serieDiaUtil} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="currentColor" className="stroke-border/30" />
                      <XAxis dataKey="dia" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                      <YAxis tickFormatter={(v) => moedaCompacta(v)} tick={{ fontSize: 11 }} width={70} tickLine={false} axisLine={false} />
                      <Tooltip content={<TooltipDiaUtil mes={mes} ano={ano} />} />
                      <Line
                        type="monotone"
                        dataKey="receita"
                        stroke={CORES_GRAFICO[0]}
                        strokeWidth={2.5}
                        dot={(props) => {
                          const { cx, cy, payload, index } = props
                          const cor = payload.delta === null ? CORES_GRAFICO[0] : payload.delta >= 0 ? '#10b981' : '#ef4444'
                          return (
                            <circle
                              key={`dot-${payload.dia}-${index}`}
                              cx={cx} cy={cy} r={3.5} fill={cor} stroke="none"
                              cursor="pointer"
                              onClick={() => abrirDia(payload.chave)}
                            />
                          )
                        }}
                        activeDot={(props) => {
                          const { cx, cy, payload, index } = props
                          return (
                            <circle
                              key={`dot-ativo-${payload.dia}-${index}`}
                              cx={cx} cy={cy} r={5} fill={CORES_GRAFICO[0]} stroke="none"
                              cursor="pointer"
                              onClick={() => abrirDia(payload.chave)}
                            />
                          )
                        }}
                      />
                    </LineChart>
                  </ChartContainer>

                  {insightDiario && (
                    <div className="grid gap-3 sm:grid-cols-3 border-t pt-4">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Melhor dia útil</p>
                        <p className="text-sm font-semibold">
                          Dia {insightDiario.melhorDia.dia} · {moeda(insightDiario.melhorDia.receita)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Maior alta vs dia anterior</p>
                        {insightDiario.maiorAlta ? (
                          <p className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-600">
                            <TrendingUp className="size-3.5" /> Dia {insightDiario.maiorAlta.dia} · {pct(insightDiario.maiorAlta.delta)}
                          </p>
                        ) : <p className="text-sm text-muted-foreground">—</p>}
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Maior queda vs dia anterior</p>
                        {insightDiario.maiorQueda && insightDiario.maiorQueda.delta < 0 ? (
                          <p className="inline-flex items-center gap-1 text-sm font-semibold text-red-500">
                            <TrendingDown className="size-3.5" /> Dia {insightDiario.maiorQueda.dia} · {pct(insightDiario.maiorQueda.delta)}
                          </p>
                        ) : <p className="text-sm text-muted-foreground">—</p>}
                      </div>
                      <p className="sm:col-span-3 text-xs text-muted-foreground">
                        Média por dia útil com movimento: <span className="font-semibold text-foreground">{moeda(insightDiario.mediaDiaUtil)}</span>
                      </p>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Calendário do mês */}
          <Card>
            <CardHeader>
              <CardTitle>Calendário do Mês</CardTitle>
              <p className="text-xs text-muted-foreground">Clique em um dia para ver o detalhe de receita, TPV e clientes.</p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-1.5 text-center text-xs font-medium text-muted-foreground mb-1.5">
                {diasDaSemana(new Date(ano, mes - 1, 1)).map((d) => (
                  <div key={d.toISOString()}>{capitalizar(fmt.diaSemanaCurto.format(d))}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1.5">
                {grade.map((data) => {
                  const dentroDoMes = mesmoMes(data, new Date(ano, mes - 1, 1))
                  const chave = chaveDia(data)
                  const infoDia = diasPorChave.get(chave)
                  const receitaDia = infoDia?.receita ?? 0
                  const intensidade = maxReceitaDia > 0 ? Math.max(0.08, receitaDia / maxReceitaDia) : 0

                  return (
                    <button
                      key={chave}
                      type="button"
                      disabled={!dentroDoMes}
                      onClick={() => abrirDia(chave)}
                      className={cn(
                        'aspect-square rounded-lg border p-1.5 text-left transition-colors flex flex-col justify-between',
                        dentroDoMes ? 'cursor-pointer hover:border-primary' : 'opacity-30 cursor-default',
                        chave === hojeChave && 'ring-2 ring-primary',
                      )}
                      style={dentroDoMes && receitaDia > 0 ? { backgroundColor: `${CORES_GRAFICO[0]}${Math.round(intensidade * 60).toString(16).padStart(2, '0')}` } : undefined}
                    >
                      <span className="text-xs font-medium">{data.getDate()}</span>
                      {dentroDoMes && receitaDia > 0 && (
                        <span className="text-[10px] font-semibold text-foreground truncate">{moedaCompacta(receitaDia)}</span>
                      )}
                    </button>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {/* Clientes que faturaram + clientes novos do mês */}
          <RankingClientesTabela titulo="Clientes que Faturaram no Mês" clientes={dados.clientesDoMes} mostrarVendedor={!vendedorId} />
          <RankingClientesTabela titulo="Clientes Novos do Mês" clientes={dados.clientesNovosDoMes} mostrarPrimeiraCompra mostrarVendedor={!vendedorId} />
        </>
      )}

      <Dialog open={!!diaSelecionado} onOpenChange={(v) => !v && setDiaSelecionado(null)}>
        <DialogContent>
          {diaSelecionado && (
            <>
              <DialogHeader>
                <DialogTitle>{capitalizar(fmt.diaMesAno.format(parseDia(diaSelecionado.dia)))}</DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Receita</p>
                  <p className="text-lg font-bold text-primary">{moeda(diaSelecionado.receita)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">TPV</p>
                  <p className="text-lg font-bold">{moeda(diaSelecionado.tpv)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Clientes que faturaram</p>
                  <p className="text-lg font-bold">{numero(diaSelecionado.clientesAtivos)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Clientes novos</p>
                  <p className="text-lg font-bold">{numero(diaSelecionado.clientesNovos)}</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground border-t pt-3">{numero(diaSelecionado.qtdTickets)} transaç{diaSelecionado.qtdTickets === 1 ? 'ão' : 'ões'} neste dia</p>

              {rankingVendedoresDia.length > 0 && (
                <div className="min-w-0 border-t pt-3">
                  <p className="text-xs font-medium text-muted-foreground mb-2">Ranking do dia — quem mais vendeu</p>
                  <div className="min-w-0 space-y-0.5">
                    {rankingVendedoresDia.map((v, i) => (
                      <div key={v.vendedorId ?? i} className="flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-sm">
                        <span className="flex min-w-0 items-center gap-2">
                          <Badge variant={i === 0 ? 'default' : 'outline'} className="w-5 h-5 flex items-center justify-center p-0 text-[10px]">{i + 1}</Badge>
                          <span className="min-w-0 truncate font-medium" title={v.nome}>{v.nome}</span>
                        </span>
                        <span className="shrink-0 font-semibold text-primary">{moeda(v.receita)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {diaSelecionado.clientes?.length > 0 && (
                <div className="min-w-0 border-t pt-3">
                  <p className="text-xs font-medium text-muted-foreground mb-2">
                    Quem faturou ({diaSelecionado.clientes.length}) — maior para menor
                  </p>
                  <div className="min-w-0 max-h-52 space-y-0.5 overflow-y-auto pr-1">
                    {diaSelecionado.clientes.map((c, i) => (
                      <button
                        key={c.clienteId}
                        type="button"
                        onClick={() => { setDiaSelecionado(null); navigate(`/gerente/is/clientes/${c.clienteId}`) }}
                        className="flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-muted/50"
                      >
                        <span className="flex min-w-0 items-center gap-2">
                          <span className="w-4 shrink-0 text-xs text-muted-foreground">{i + 1}.</span>
                          <span className="min-w-0 truncate font-medium" title={c.nome}>{c.nome}</span>
                        </span>
                        <span className="shrink-0 font-semibold text-primary">{moeda(c.receita)}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!semanaSelecionada} onOpenChange={(v) => !v && setSemanaSelecionada(null)}>
        <DialogContent>
          {semanaSelecionada && (
            <>
              <DialogHeader>
                <DialogTitle>
                  Semana {semanaSelecionada.numeroSemana} · {fmt.diaMes.format(parseDia(semanaSelecionada.semana.inicio))} a {fmt.diaMes.format(parseDia(semanaSelecionada.semana.fim))}
                </DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Receita</p>
                  <p className="text-lg font-bold text-primary">{moeda(semanaSelecionada.semana.receita)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">TPV</p>
                  <p className="text-lg font-bold">{moeda(semanaSelecionada.semana.tpv)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Clientes novos</p>
                  <p className="text-lg font-bold">{numero(semanaSelecionada.semana.clientesNovos)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Clientes que faturaram</p>
                  <p className="text-lg font-bold">{numero(semanaSelecionada.semana.clientesAtivos)}</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground border-t pt-3">
                {numero(semanaSelecionada.semana.qtdTickets)} transaç{semanaSelecionada.semana.qtdTickets === 1 ? 'ão' : 'ões'} nesta semana
              </p>

              <div className="min-w-0 border-t pt-3">
                <p className="text-xs font-medium text-muted-foreground mb-2">Receita dia a dia</p>
                <div className="grid grid-cols-7 gap-1.5">
                  {semanaSelecionada.dias7.map((data) => {
                    const dentroDoMes = mesmoMes(data, new Date(ano, mes - 1, 1))
                    const receitaDia = dentroDoMes ? (diasPorChave.get(chaveDia(data))?.receita ?? 0) : null
                    return (
                      <div key={data.toISOString()} className={cn('rounded-md border px-1 py-1.5 text-center', !dentroDoMes && 'opacity-30')}>
                        <p className="text-[10px] text-muted-foreground">{capitalizar(fmt.diaSemanaCurto.format(data)).slice(0, 3)}</p>
                        <p className="text-xs font-medium">{data.getDate()}</p>
                        <p className="text-[10px] font-semibold text-primary">
                          {receitaDia ? moedaCompacta(receitaDia) : '—'}
                        </p>
                      </div>
                    )
                  })}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
