import { useState, useEffect, useCallback } from 'react'
import { getEquipe } from '@/api/modules/metricas'
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
  UserPlus, UserMinus, RefreshCw, AlertCircle, Loader2,
  ChevronLeft, ChevronRight, Target,
} from 'lucide-react'

const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

const LABEL_PRODUTO = {
  bank_deposit:    'Depósito Bancário',
  card_deposit:    'Depósito Cartão',
  virtual_deposit: 'Depósito Virtual',
}

const LABEL_EQUIPE = {
  KAM:           'Equipe KAM',
  INSIGHT_SALES: 'Equipe Insight Sales',
  VENDAS:        'Equipe Vendas',
  GERAL:         'Todas as Equipes',
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
      {d.crescimentoReceita !== null && d.crescimentoReceita !== undefined && (
        <p className={`text-xs ${d.crescimentoReceita >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
          MoM: {pct(d.crescimentoReceita)}
        </p>
      )}
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

export default function DashboardEquipe({ equipeFixa }) {
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
      setDados(await getEquipe(mes, ano, equipeFixa))
    } catch (e) {
      if (e.response?.status === 404) {
        setErro('Nenhum dado de equipe encontrado para este cargo e período.')
      } else {
        setErro('Erro ao carregar métricas da equipe. Tente novamente.')
      }
    } finally {
      setCarregando(false)
    }
  }, [mes, ano, equipeFixa])

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
        title="Dashboard Equipe"
        subtitle={dados ? (LABEL_EQUIPE[dados.equipe] ?? `Equipe ${dados.equipe}`) : 'Carregando...'}
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
        const {
          totalReceita, totalTpv, totalTickets, totalClientesAtivos,
          taxaMedia, ticketMedio, meta_equipe, pct_meta_equipe,
          mesAnterior, hoje, retencao,
          mixProduto, historicoMensal, topClientes, membros,
        } = dados

        const agora_ref  = new Date()
        const ehMesAtual = mes === agora_ref.getMonth() + 1 && ano === agora_ref.getFullYear()

        const deltaReceita = mesAnterior?.receita
          ? Math.round(((totalReceita - mesAnterior.receita) / mesAnterior.receita) * 1000) / 10
          : null

        // Determina equipe para YoY
        const equipeYoY = equipeFixa === 'IS' ? 'IS'
          : equipeFixa === 'KAM' ? 'KAM'
          : dados.equipe === 'KAM' ? 'KAM'
          : dados.equipe === 'INSIGHT_SALES' ? 'IS'
          : 'GERAL'

        // Dados para o gráfico YoY
        const dadosYoY = Array.from({ length: 12 }, (_, i) => {
          const m = i + 1
          const item2026 = historicoMensal?.find(h => h.mes === m && h.ano === ano)
          const val2025  = getRealizadoEquipe2025(equipeYoY, m)
          return {
            mes:   m,
            r2026: item2026?.receita ?? null,
            r2025: val2025 > 0 ? val2025 : null,
          }
        }).filter(d => d.r2026 !== null || d.r2025 !== null)

        return (
          <>
            {/* Cards de Meta — topo do dashboard (igual ao Dashboard Comercial) */}
            {meta_equipe > 0 && (() => {
              const falta = Math.max(0, meta_equipe - totalReceita)
              return (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <KpiCard icon={Target} cor="bg-indigo-500/10 text-indigo-600" valor={moeda(meta_equipe)}  rotulo="Meta da equipe no mês" />
                  <KpiCard icon={Wallet} cor="bg-blue-500/10 text-blue-600"     valor={moeda(totalReceita)} rotulo="Receita Total da Equipe" />
                  <Card>
                    <CardContent className="flex items-center gap-3 py-4">
                      <div className={`grid size-10 place-items-center rounded-lg ${pct_meta_equipe >= 100 ? 'bg-emerald-500/10 text-emerald-600' : pct_meta_equipe >= 70 ? 'bg-amber-500/10 text-amber-600' : 'bg-red-500/10 text-red-500'}`}>
                        <Target className="size-5" />
                      </div>
                      <div className="flex-1">
                        <p className="text-2xl font-semibold leading-tight">{(pct_meta_equipe ?? 0).toFixed(1)}%</p>
                        <p className="text-xs text-muted-foreground">% da meta atingida</p>
                        <div className="mt-1.5 h-1.5 w-full rounded-full bg-muted overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${pct_meta_equipe >= 100 ? 'bg-emerald-500' : pct_meta_equipe >= 70 ? 'bg-amber-500' : 'bg-red-500'}`}
                            style={{ width: `${Math.min(pct_meta_equipe ?? 0, 100)}%` }}
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

            {/* Hoje — só quando é o mês corrente */}
            {ehMesAtual && hoje && (
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
                      <div className="sm:pl-8">
                        <p className="text-xs text-muted-foreground mb-0.5">Transações</p>
                        <p className="text-base font-bold">{numero(hoje.qtdTickets)}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Strip vs Mês Anterior */}
            {mesAnterior && (
              <Card className="border-l-4 border-l-muted-foreground/30">
                <CardContent className="py-3 px-5">
                  <div className="flex flex-wrap items-center gap-6">
                    <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">vs Mês Anterior</span>
                    <div className="flex flex-wrap gap-6">
                      <div>
                        <p className="text-xs text-muted-foreground">Receita</p>
                        <div className="flex items-center gap-1.5">
                          <p className="font-bold">{moeda(mesAnterior.receita)}</p>
                          <DeltaTag value={deltaReceita} />
                        </div>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">TPV</p>
                        <p className="font-bold">{moeda(mesAnterior.tpv)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Transações</p>
                        <p className="font-bold">{numero(mesAnterior.qtdTickets)}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* KPIs linha 1 */}
            <div className="grid gap-4 sm:grid-cols-2">
              <KpiCard icon={TrendingUp} cor="bg-sky-500/10 text-sky-600"     valor={moeda(totalTpv)}           rotulo="TPV — volume processado" />
              <KpiCard icon={BarChart3}  cor="bg-amber-500/10 text-amber-600" valor={numero(totalTickets)}       rotulo="Transações processadas" />
            </div>

            {/* KPIs linha 2 */}
            <div className="grid gap-4 sm:grid-cols-3">
              <KpiCard icon={BarChart3}  cor="bg-orange-500/10 text-orange-600"  valor={`${(taxaMedia ?? 0).toFixed(3)}%`}  rotulo="Taxa média" />
              <KpiCard icon={Wallet}     cor="bg-pink-500/10 text-pink-600"       valor={moeda(ticketMedio)}                  rotulo="Ticket médio" />
              <KpiCard icon={RefreshCw}  cor="bg-teal-500/10 text-teal-600"      valor={`${retencao?.taxaRetencao ?? 0}%`}   rotulo={`Retenção · ${numero(retencao?.recorrentes ?? 0)} recorrentes`} />
            </div>

            {/* Evolução Mensal */}
            {historicoMensal?.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Evolução Mensal — Receita da Equipe</CardTitle>
                </CardHeader>
                <CardContent>
                  <ChartContainer className="h-64">
                    <BarChart data={historicoMensal} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="gradBarEquipe" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={CORES_GRAFICO[0]} stopOpacity={1} />
                          <stop offset="100%" stopColor={CORES_GRAFICO[0]} stopOpacity={0.7} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="currentColor" className="stroke-border/30" />
                      <XAxis dataKey="mes" tickFormatter={m => MESES[m - 1]} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                      <YAxis tickFormatter={v => moeda(v)} tick={{ fontSize: 11 }} width={110} tickLine={false} axisLine={false} />
                      <Tooltip content={<TooltipReceita />} cursor={{ fill: 'currentColor', className: 'fill-muted/40' }} />
                      <Bar dataKey="receita" radius={[5, 5, 0, 0]}>
                        {historicoMensal.map((entry, i) => (
                          <Cell
                            key={i}
                            fill={entry.mes === mes && entry.ano === ano
                              ? `url(#gradBarEquipe)`
                              : `${CORES_GRAFICO[0]}44`}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ChartContainer>
                </CardContent>
              </Card>
            )}

            {/* Gráfico YoY — Comparativo Ano × Ano */}
            {dadosYoY.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Comparativo Ano × Ano — Receita da Equipe</CardTitle>
                </CardHeader>
                <CardContent>
                  <ChartContainer className="h-64">
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
              {retencao && (
                <Card>
                  <CardHeader>
                    <CardTitle>Retenção de Clientes da Equipe</CardTitle>
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
              )}

              {mixProduto?.length > 0 && (
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
              )}
            </div>

            {/* Top Clientes da Equipe */}
            {topClientes?.length > 0 && (
              <Card className="overflow-hidden">
                <CardHeader className="border-b bg-muted/30">
                  <CardTitle>Top Clientes da Equipe</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-xs text-muted-foreground">
                        <th className="px-4 py-2 text-left font-medium">#</th>
                        <th className="px-4 py-2 text-left font-medium">Cliente</th>
                        <th className="px-4 py-2 text-right font-medium">Receita</th>
                        <th className="px-4 py-2 text-right font-medium">TPV</th>
                        <th className="px-4 py-2 text-right font-medium">Taxa</th>
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
                          <td className="px-4 py-2.5 max-w-[200px] truncate font-medium">{c.nome}</td>
                          <td className="px-4 py-2.5 text-right text-primary font-semibold">{moeda(c.receita)}</td>
                          <td className="px-4 py-2.5 text-right text-muted-foreground">{moeda(c.tpv)}</td>
                          <td className="px-4 py-2.5 text-right">{(c.taxa ?? 0).toFixed(2)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            )}

            {/* Ranking da Equipe */}
            <Card className="overflow-hidden">
              <CardHeader className="border-b bg-muted/30">
                <CardTitle>Ranking da Equipe — {MESES[mes - 1]}/{ano}</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {membros.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">Nenhum dado para este período.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-xs text-muted-foreground">
                          <th className="px-4 py-2 text-left font-medium">#</th>
                          <th className="px-4 py-2 text-left font-medium">Vendedor</th>
                          <th className="px-4 py-2 text-right font-medium">Receita</th>
                          <th className="px-4 py-2 text-right font-medium">Meta</th>
                          <th className="px-4 py-2 text-right font-medium">% Meta</th>
                          <th className="px-4 py-2 text-right font-medium">TPV</th>
                          <th className="px-4 py-2 text-right font-medium">Taxa</th>
                          <th className="px-4 py-2 text-right font-medium">Ticket Médio</th>
                          <th className="px-4 py-2 text-right font-medium">Transações</th>
                          <th className="px-4 py-2 text-right font-medium">Clientes</th>
                          {ehMesAtual && <th className="px-4 py-2 text-right font-medium">Hoje</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {membros.map((m, i) => (
                          <tr key={m.vendedorId} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                            <td className="px-4 py-2.5">
                              <Badge
                                variant={i === 0 ? 'default' : 'outline'}
                                className="w-6 h-6 flex items-center justify-center p-0 text-xs"
                              >
                                {i + 1}
                              </Badge>
                            </td>
                            <td className="px-4 py-2.5 font-medium">{m.nome}</td>
                            <td className="px-4 py-2.5 text-right font-semibold text-primary">{moeda(m.receita)}</td>
                            <td className="px-4 py-2.5 text-right text-muted-foreground">{m.meta > 0 ? moeda(m.meta) : '—'}</td>
                            <td className="px-4 py-2.5 text-right">
                              {m.meta > 0 ? (
                                <span className={`font-semibold text-xs ${m.pct_meta >= 100 ? 'text-emerald-600' : m.pct_meta >= 70 ? 'text-amber-600' : 'text-red-500'}`}>
                                  {m.pct_meta.toFixed(1)}%
                                </span>
                              ) : '—'}
                            </td>
                            <td className="px-4 py-2.5 text-right text-muted-foreground">{moeda(m.tpv)}</td>
                            <td className="px-4 py-2.5 text-right">{(m.taxaMedia ?? 0).toFixed(2)}%</td>
                            <td className="px-4 py-2.5 text-right">{moeda(m.ticketMedio)}</td>
                            <td className="px-4 py-2.5 text-right">{numero(m.qtdTickets)}</td>
                            <td className="px-4 py-2.5 text-right">{numero(m.clientesAtivos)}</td>
                            {ehMesAtual && (
                              <td className="px-4 py-2.5 text-right">
                                <span className="text-primary font-semibold">{moeda(m.receitaHoje)}</span>
                                <span className="text-xs text-muted-foreground ml-1">({numero(m.ticketsHoje)}t)</span>
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )
      })()}
    </div>
  )
}
