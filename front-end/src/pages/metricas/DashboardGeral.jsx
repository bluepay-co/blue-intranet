import { useState, useEffect, useCallback } from 'react'
import { getMetricasGerais } from '@/api/modules/metricas'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ChartContainer, CORES_GRAFICO } from '@/components/ui/chart'
import PageHeader from '@/components/layout/PageHeader'
import { getRealizadoEquipe2025 } from '@/data/realizado2025'
import {
  BarChart, Bar, LineChart, Line, Legend,
  XAxis, YAxis, CartesianGrid, Tooltip, Cell,
} from 'recharts'
import {
  Wallet, Users, BarChart3, TrendingUp, TrendingDown,
  UserPlus, UserMinus, RefreshCw, Target,
  AlertCircle, Loader2, ChevronLeft, ChevronRight,
} from 'lucide-react'

const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

const LABEL_PRODUTO = {
  bank_deposit:    'Depósito Bancário',
  card_deposit:    'Depósito Cartão',
  virtual_deposit: 'Depósito Virtual',
}

function moeda(v) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2,
  }).format(v ?? 0)
}

function numero(v) {
  return new Intl.NumberFormat('pt-BR').format(v ?? 0)
}

function pct(v) {
  if (v === null || v === undefined) return '—'
  return `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`
}

function KpiCard({ icon: Icon, cor, valor, rotulo }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 py-4">
        <div className={`grid size-10 place-items-center rounded-lg ${cor}`}>
          <Icon className="size-5" />
        </div>
        <div>
          <p className="text-2xl font-semibold leading-tight">{valor}</p>
          <p className="text-xs text-muted-foreground">{rotulo}</p>
        </div>
      </CardContent>
    </Card>
  )
}

function DeltaTag({ value }) {
  if (value === null || value === undefined) return <span className="text-xs text-muted-foreground">—</span>
  const up = value >= 0
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-semibold ${up ? 'text-emerald-600' : 'text-red-500'}`}>
      {up ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
      {pct(value)}
    </span>
  )
}

function TooltipReceita({ active, payload }) {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload
  return (
    <div className="rounded-xl border bg-background px-3.5 py-2.5 text-sm shadow-xl space-y-1">
      <p className="font-semibold text-foreground">{MESES[(d.mes ?? 1) - 1]} / {d.ano}</p>
      <p className="text-primary font-medium">{moeda(d.receita)}</p>
      {d.crescimentoReceita !== null && (
        <p className={`text-xs ${d.crescimentoReceita >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
          MoM: {pct(d.crescimentoReceita)}
        </p>
      )}
    </div>
  )
}

function TooltipNovosClientes({ active, payload }) {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload
  return (
    <div className="rounded-xl border bg-background px-3.5 py-2.5 text-sm shadow-xl space-y-1">
      <p className="font-semibold text-foreground">{MESES[(d.mes ?? 1) - 1]}</p>
      <p className="text-primary font-medium">{numero(d.quantidade)} novos clientes</p>
    </div>
  )
}

function TooltipYoY({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const r2026 = payload.find(p => p.dataKey === 'r2026')?.value
  const r2025 = payload.find(p => p.dataKey === 'r2025')?.value
  const delta = r2025 && r2026 ? Math.round(((r2026 - r2025) / r2025) * 1000) / 10 : null
  return (
    <div className="rounded-xl border bg-background px-3.5 py-2.5 text-sm shadow-xl space-y-1 min-w-[180px]">
      <p className="font-semibold text-foreground">{MESES[(label ?? 1) - 1]}</p>
      {r2026 != null && <p className="text-primary font-medium">2026: {moeda(r2026)}</p>}
      {r2025 != null && <p className="text-muted-foreground">2025: {moeda(r2025)}</p>}
      {delta !== null && (
        <p className={`text-xs font-semibold ${delta >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
          YoY: {pct(delta)}
        </p>
      )}
    </div>
  )
}

function TooltipYTD({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const y2026 = payload.find(p => p.dataKey === 'ytd2026')?.value
  const y2025 = payload.find(p => p.dataKey === 'ytd2025')?.value
  const delta = y2025 && y2026 ? Math.round(((y2026 - y2025) / y2025) * 1000) / 10 : null
  return (
    <div className="rounded-xl border bg-background px-3.5 py-2.5 text-sm shadow-xl space-y-1 min-w-[180px]">
      <p className="font-semibold text-foreground">Jan → {MESES[(label ?? 1) - 1]}</p>
      {y2026 != null && <p className="text-primary font-medium">2026: {moeda(y2026)}</p>}
      {y2025 != null && <p className="text-muted-foreground">2025: {moeda(y2025)}</p>}
      {delta !== null && (
        <p className={`text-xs font-semibold ${delta >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
          YTD: {pct(delta)}
        </p>
      )}
    </div>
  )
}

export default function DashboardGeral() {
  const agora = new Date()
  const [mes, setMes] = useState(agora.getMonth() + 1)
  const [ano, setAno] = useState(agora.getFullYear())
  const [dados, setDados] = useState(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')

  const carregar = useCallback(async () => {
    setErro('')
    setCarregando(true)
    try {
      setDados(await getMetricasGerais(mes, ano))
    } catch {
      setErro('Falha ao carregar métricas gerais.')
    } finally {
      setCarregando(false)
    }
  }, [mes, ano])

  useEffect(() => { carregar() }, [carregar])

  function mudarMes(delta) {
    let m = mes + delta, a = ano
    if (m > 12) { m = 1; a++ }
    if (m < 1)  { m = 12; a-- }
    setMes(m); setAno(a)
  }

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
        title="Dashboard Comercial"
        subtitle="Visão Consolidada da Empresa"
      >
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={carregar} disabled={carregando} title="Atualizar">
            <RefreshCw className={`size-4 ${carregando ? 'animate-spin' : ''}`} />
          </Button>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => mudarMes(-1)} disabled={carregando}>
              <ChevronLeft className="size-4" />
            </Button>
            <span className="min-w-[100px] text-center text-sm font-medium">
              {MESES[mes - 1]} / {ano}
            </span>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => mudarMes(1)} disabled={carregando}>
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

      {dados && (() => {
        const { resumo, hoje, retencao, mixProduto, evolucaoMensal, topClientes, ytd, novosClientesMes, receitaMensalAno } = dados
        const ytdAtual    = ytd.find(y => y.ano === ano)
        const ytdAnterior = ytd.find(y => y.ano === ano - 1)
        const agora_ref   = new Date()
        const ehMesAtual  = mes === agora_ref.getMonth() + 1 && ano === agora_ref.getFullYear()

        // Dados YoY — combina receitaMensalAno (ano inteiro, não só a janela de 6 meses de evolucaoMensal) com realizado2025 estático
        const dadosYoY = Array.from({ length: 12 }, (_, i) => {
          const m = i + 1
          const val2026 = receitaMensalAno?.[i] ?? 0
          const val2025 = getRealizadoEquipe2025('GERAL', m)
          return {
            mes:   m,
            r2026: val2026 > 0 ? val2026 : null,
            r2025: val2025 > 0 ? val2025 : null,
          }
        }).filter(d => d.r2026 !== null || d.r2025 !== null)

        // Dados YTD acumulado — mesma fonte do YoY, mas somando mês a mês.
        // A linha de 2026 para no mês filtrado (meses futuros não têm dado ainda);
        // a de 2025 (ano fechado) segue somando até dezembro.
        let acc2026 = 0, acc2025 = 0
        const dadosYTD = Array.from({ length: 12 }, (_, i) => {
          const m = i + 1
          const ehFuturo = ano === agora_ref.getFullYear() && m > mes
          acc2025 += getRealizadoEquipe2025('GERAL', m)
          if (!ehFuturo) acc2026 += receitaMensalAno?.[i] ?? 0
          return {
            mes: m,
            ytd2026: ehFuturo ? null : acc2026,
            ytd2025: acc2025,
          }
        })

        return (
          <>
            {/* Cards de Meta — topo do dashboard */}
            {resumo.meta_total > 0 && (() => {
              const falta = Math.max(0, resumo.meta_total - resumo.receita)
              return (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <KpiCard icon={Target} cor="bg-indigo-500/10 text-indigo-600" valor={moeda(resumo.meta_total)} rotulo="Meta total da equipe comercial" />
                  <KpiCard icon={Wallet} cor="bg-blue-500/10 text-blue-600"     valor={moeda(resumo.receita)}    rotulo="Receita Total do Mês" />
                  <Card>
                    <CardContent className="flex items-center gap-3 py-4">
                      <div className={`grid size-10 place-items-center rounded-lg ${resumo.pct_meta_total >= 100 ? 'bg-emerald-500/10 text-emerald-600' : resumo.pct_meta_total >= 70 ? 'bg-amber-500/10 text-amber-600' : 'bg-red-500/10 text-red-500'}`}>
                        <Target className="size-5" />
                      </div>
                      <div className="flex-1">
                        <p className="text-2xl font-semibold leading-tight">{(resumo.pct_meta_total ?? 0).toFixed(1)}%</p>
                        <p className="text-xs text-muted-foreground">% da meta total atingida</p>
                        <div className="mt-1.5 h-1.5 w-full rounded-full bg-muted overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${resumo.pct_meta_total >= 100 ? 'bg-emerald-500' : resumo.pct_meta_total >= 70 ? 'bg-amber-500' : 'bg-red-500'}`}
                            style={{ width: `${Math.min(resumo.pct_meta_total ?? 0, 100)}%` }}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="flex items-center gap-3 py-4">
                      <div className={`grid size-10 place-items-center rounded-lg ${falta === 0 ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'}`}>
                        <Target className="size-5" />
                      </div>
                      <div>
                        <p className="text-2xl font-semibold leading-tight">
                          {falta === 0 ? 'Meta batida!' : moeda(falta)}
                        </p>
                        <p className="text-xs text-muted-foreground">Meta Mensal em Aberto</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )
            })()}

            {/* Hoje */}
            {ehMesAtual && (
              <Card className="border-l-4 border-l-primary bg-primary/[0.03]">
                <CardContent className="py-4 px-5">
                  <div className="flex flex-wrap items-center gap-6">
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="relative flex size-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-60" />
                        <span className="relative inline-flex size-2 rounded-full bg-primary" />
                      </span>
                      <span className="text-xs font-bold uppercase tracking-widest text-primary">Hoje</span>
                    </div>
                    <div className="flex flex-wrap gap-6 sm:gap-8 sm:divide-x sm:divide-border">
                      <div className="sm:pr-8">
                        <p className="text-xs text-muted-foreground mb-0.5">Receita</p>
                        <p className="text-base font-bold text-primary">{moeda(hoje.receita)}</p>
                      </div>
                      <div className="sm:pl-8 sm:pr-8">
                        <p className="text-xs text-muted-foreground mb-0.5">TPV</p>
                        <p className="text-base font-bold">{moeda(hoje.tpv)}</p>
                      </div>
                      <div className="sm:pl-8 sm:pr-8">
                        <p className="text-xs text-muted-foreground mb-0.5">Transações</p>
                        <p className="text-base font-bold">{numero(hoje.qtdTickets)}</p>
                      </div>
                      <div className="sm:pl-8 border-l border-border pl-6 sm:border-0 sm:pl-8">
                        <p className="text-xs text-muted-foreground mb-0.5">Média diária do mês</p>
                        <p className="text-base font-bold">{moeda(hoje.mediaDiariaReceita)} <span className="text-sm font-normal text-muted-foreground">· {numero(Math.round(hoje.mediaDiariaTickets))} transações/dia</span></p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* KPIs linha 1 */}
            <div className="grid gap-4 sm:grid-cols-2">
              <KpiCard icon={TrendingUp} cor="bg-sky-500/10 text-sky-600"     valor={moeda(resumo.tpv)}          rotulo="TPV — volume processado" />
              <KpiCard icon={BarChart3}  cor="bg-amber-500/10 text-amber-600" valor={numero(resumo.qtdTickets)}  rotulo="Transações processadas" />
            </div>

            {/* KPIs linha 2 */}
            <div className="grid gap-4 sm:grid-cols-3">
              <KpiCard icon={BarChart3}  cor="bg-orange-500/10 text-orange-600"   valor={`${resumo.taxaMedia.toFixed(3)}%`}     rotulo="Taxa média" />
              <KpiCard icon={Wallet}     cor="bg-pink-500/10 text-pink-600"        valor={moeda(resumo.ticketMedio)}             rotulo="Ticket médio" />
              <KpiCard icon={RefreshCw}  cor="bg-teal-500/10 text-teal-600"       valor={`${retencao.taxaRetencao}%`}           rotulo={`Retenção · ${numero(retencao.recorrentes)} recorrentes`} />
            </div>

            {/* Evolução Mensal */}
            <Card>
              <CardHeader>
                <CardTitle>Evolução Mensal — Receita</CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer className="h-64">
                  <BarChart data={evolucaoMensal} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gradBarGeral" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={CORES_GRAFICO[0]} stopOpacity={1} />
                        <stop offset="100%" stopColor={CORES_GRAFICO[0]} stopOpacity={0.7} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="currentColor" className="stroke-border/30" />
                    <XAxis dataKey="mes" tickFormatter={m => MESES[m - 1]} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                    <YAxis tickFormatter={v => moeda(v)} tick={{ fontSize: 11 }} width={110} tickLine={false} axisLine={false} />
                    <Tooltip content={<TooltipReceita />} cursor={{ fill: 'currentColor', className: 'fill-muted/40' }} />
                    <Bar dataKey="receita" radius={[5, 5, 0, 0]}>
                      {evolucaoMensal.map((entry, i) => (
                        <Cell
                          key={i}
                          fill={entry.mes === mes && entry.ano === ano
                            ? 'url(#gradBarGeral)'
                            : `${CORES_GRAFICO[0]}44`}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>

            {/* YTD — gráfico de receita acumulada + card resumo */}
            <div className="grid gap-4 lg:grid-cols-3">
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>YTD — Receita Acumulada</CardTitle>
                </CardHeader>
                <CardContent>
                  <ChartContainer className="h-72">
                    <LineChart data={dadosYTD} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="currentColor" className="stroke-border/30" />
                      <XAxis dataKey="mes" tickFormatter={m => MESES[m - 1]} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                      <YAxis tickFormatter={v => moeda(v)} tick={{ fontSize: 11 }} width={110} tickLine={false} axisLine={false} />
                      <Tooltip content={<TooltipYTD />} />
                      <Legend
                        formatter={v => v === 'ytd2026' ? '2026 (atual)' : '2025 (realizado)'}
                        wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="ytd2025"
                        stroke={`${CORES_GRAFICO[0]}88`}
                        strokeWidth={2}
                        strokeDasharray="5 4"
                        dot={false}
                        connectNulls
                      />
                      <Line
                        type="monotone"
                        dataKey="ytd2026"
                        stroke={CORES_GRAFICO[0]}
                        strokeWidth={2.5}
                        dot={{ r: 3.5, fill: CORES_GRAFICO[0], strokeWidth: 0 }}
                        activeDot={{ r: 5 }}
                        connectNulls
                      />
                    </LineChart>
                  </ChartContainer>
                </CardContent>
              </Card>

              {/* YTD — resumo em card */}
              <Card>
                <CardHeader>
                  <CardTitle>YTD — Jan → {MESES[mes - 1]}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 pt-2">
                  {[
                    { label: 'Receita',  curr: ytdAtual?.receita,       prev: ytdAnterior?.receita,       f: moeda },
                    { label: 'TPV',      curr: ytdAtual?.tpv,            prev: ytdAnterior?.tpv,            f: moeda },
                    { label: 'Clientes', curr: ytdAtual?.clientesUnicos, prev: ytdAnterior?.clientesUnicos, f: numero },
                  ].map(({ label, curr, prev, f }) => {
                    const delta = prev && curr ? Math.round(((curr - prev) / prev) * 1000) / 10 : null
                    return (
                      <div key={label} className="flex items-center justify-between text-sm border-b pb-3 last:border-0 last:pb-0">
                        <span className="text-muted-foreground">{label}</span>
                        <div className="text-right">
                          <p className="font-semibold">{curr != null ? f(curr) : '—'}</p>
                          <DeltaTag value={delta} />
                        </div>
                      </div>
                    )
                  })}
                  {ytdAnterior && (
                    <p className="text-xs text-muted-foreground border-t pt-2">
                      {ano - 1}: {moeda(ytdAnterior.receita)}
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Gráfico YoY — Comparativo Ano × Ano */}
            {dadosYoY.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>YoY — Comparativo Ano × Ano — Receita Total</CardTitle>
                </CardHeader>
                <CardContent>
                  <ChartContainer className="h-72">
                    <LineChart data={dadosYoY} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="currentColor" className="stroke-border/30" />
                      <XAxis dataKey="mes" tickFormatter={m => MESES[m - 1]} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                      <YAxis tickFormatter={v => moeda(v)} tick={{ fontSize: 11 }} width={110} tickLine={false} axisLine={false} />
                      <Tooltip content={<TooltipYoY />} />
                      <Legend
                        formatter={v => v === 'r2026' ? '2026 (atual)' : '2025 (realizado)'}
                        wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="r2025"
                        stroke={`${CORES_GRAFICO[0]}88`}
                        strokeWidth={2}
                        strokeDasharray="5 4"
                        dot={false}
                        connectNulls
                      />
                      <Line
                        type="monotone"
                        dataKey="r2026"
                        stroke={CORES_GRAFICO[0]}
                        strokeWidth={2.5}
                        dot={{ r: 3.5, fill: CORES_GRAFICO[0], strokeWidth: 0 }}
                        activeDot={{ r: 5 }}
                        connectNulls
                      />
                    </LineChart>
                  </ChartContainer>
                </CardContent>
              </Card>
            )}

            {/* Retenção + Mix de Produto */}
            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Retenção de Clientes</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="rounded-lg bg-emerald-500/10 p-4">
                      <UserPlus className="size-5 text-emerald-600 mx-auto mb-2" />
                      <p className="text-2xl font-bold text-emerald-600">{numero(retencao.novos)}</p>
                      <p className="text-xs text-muted-foreground mt-1">Novos</p>
                    </div>
                    <div className="rounded-lg bg-blue-500/10 p-4">
                      <RefreshCw className="size-5 text-blue-600 mx-auto mb-2" />
                      <p className="text-2xl font-bold text-blue-600">{numero(retencao.recorrentes)}</p>
                      <p className="text-xs text-muted-foreground mt-1">Recorrentes</p>
                    </div>
                    <div className="rounded-lg bg-red-500/10 p-4">
                      <UserMinus className="size-5 text-red-500 mx-auto mb-2" />
                      <p className="text-2xl font-bold text-red-500">{numero(retencao.perdidos)}</p>
                      <p className="text-xs text-muted-foreground mt-1">Perdidos</p>
                    </div>
                  </div>
                  <p className="mt-4 text-center text-sm text-muted-foreground">
                    Taxa de retenção:{' '}
                    <span className="font-semibold text-emerald-600">{retencao.taxaRetencao}%</span>
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Mix de Produto</CardTitle>
                </CardHeader>
                <CardContent>
                  <ChartContainer className="h-44">
                    <BarChart
                      layout="vertical"
                      data={mixProduto.map(p => ({ ...p, nome: LABEL_PRODUTO[p.produto] ?? p.produto }))}
                      margin={{ top: 0, right: 8, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="4 4" horizontal={false} stroke="currentColor" className="stroke-border/30" />
                      <XAxis type="number" tickFormatter={v => moeda(v)} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                      <YAxis type="category" dataKey="nome" tick={{ fontSize: 11 }} width={130} tickLine={false} axisLine={false} />
                      <Tooltip formatter={v => [moeda(v), 'Receita']} />
                      <Bar dataKey="receita" radius={[0, 5, 5, 0]}>
                        {mixProduto.map((_, i) => (
                          <Cell key={i} fill={CORES_GRAFICO[i % CORES_GRAFICO.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ChartContainer>
                  <div className="mt-2 space-y-1">
                    {mixProduto.map(p => (
                      <div key={p.produto} className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{LABEL_PRODUTO[p.produto] ?? p.produto}</span>
                        <span className="font-medium">{p.percentualReceita?.toFixed(1)}% · {moeda(p.receita)}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Top Clientes */}
            <Card className="overflow-hidden">
              <CardHeader className="border-b bg-muted/30">
                <CardTitle>Top Clientes do Mês</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-xs text-muted-foreground">
                      <th className="px-4 py-2 text-left font-medium">#</th>
                      <th className="px-4 py-2 text-left font-medium">Cliente</th>
                      <th className="px-4 py-2 text-right font-medium">Receita</th>
                      <th className="px-4 py-2 text-right font-medium">TPV</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topClientes.map((c, i) => (
                      <tr key={c.nome} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-2.5">
                          <Badge variant="outline" className="w-6 h-6 flex items-center justify-center p-0 text-xs">
                            {i + 1}
                          </Badge>
                        </td>
                        <td className="px-4 py-2.5 max-w-[180px] truncate font-medium">{c.nome}</td>
                        <td className="px-4 py-2.5 text-right text-primary font-semibold">{moeda(c.receita)}</td>
                        <td className="px-4 py-2.5 text-right text-muted-foreground">{moeda(c.tpv)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>

            {/* Novos Clientes no Ano */}
            {novosClientesMes.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Novos Clientes por Mês — {ano}</CardTitle>
                </CardHeader>
                <CardContent>
                  <ChartContainer className="h-48">
                    <BarChart data={novosClientesMes} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="gradBarNovos" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={CORES_GRAFICO[3]} stopOpacity={1} />
                          <stop offset="100%" stopColor={CORES_GRAFICO[3]} stopOpacity={0.7} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="currentColor" className="stroke-border/30" />
                      <XAxis dataKey="mes" tickFormatter={m => MESES[m - 1]} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                      <Tooltip content={<TooltipNovosClientes />} cursor={{ fill: 'currentColor', className: 'fill-muted/40' }} />
                      <Bar dataKey="quantidade" fill="url(#gradBarNovos)" radius={[5, 5, 0, 0]} />
                    </BarChart>
                  </ChartContainer>
                </CardContent>
              </Card>
            )}
          </>
        )
      })()}
    </div>
  )
}
