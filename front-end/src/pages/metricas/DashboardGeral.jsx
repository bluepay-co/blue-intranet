import { useState, useEffect, useCallback } from 'react'
import { getMetricasGerais } from '@/api/modules/metricas'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ChartContainer, CORES_GRAFICO } from '@/components/ui/chart'
import PageHeader from '@/components/layout/PageHeader'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell,
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
    style: 'currency', currency: 'BRL', maximumFractionDigits: 0,
  }).format(v ?? 0)
}

function pct(v) {
  if (v === null || v === undefined) return '—'
  return `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`
}

/** KPI card no padrão TI: ícone colorido + valor + rótulo */
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
    <div className="rounded-lg border bg-background px-3 py-2 text-sm shadow-md space-y-0.5">
      <p className="font-semibold">{MESES[(d.mes ?? 1) - 1]} / {d.ano}</p>
      <p className="text-primary">{moeda(d.receita)}</p>
      {d.crescimentoReceita !== null && (
        <p className={d.crescimentoReceita >= 0 ? 'text-emerald-600' : 'text-red-500'}>
          MoM: {pct(d.crescimentoReceita)}
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
        title="Dashboard Geral"
        subtitle="Visão Consolidada da Empresa"
      >
        <div className="flex items-center gap-2">
          {/* Botão de atualização */}
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={carregar} disabled={carregando} title="Atualizar">
            <RefreshCw className={`size-4 ${carregando ? 'animate-spin' : ''}`} />
          </Button>
          {/* Seletor de período */}
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
        const { resumo, hoje, retencao, mixProduto, evolucaoMensal, topClientes, faixasTaxa, ytd, novosClientesMes } = dados
        const ytdAtual    = ytd.find(y => y.ano === ano)
        const ytdAnterior = ytd.find(y => y.ano === ano - 1)
        const agora_ref   = new Date()
        const ehMesAtual  = mes === agora_ref.getMonth() + 1 && ano === agora_ref.getFullYear()

        return (
          <>
            {/* Strip Hoje — só exibida quando o período selecionado é o mês corrente */}
            {ehMesAtual && <Card className="border-l-4 border-l-primary">
              <CardContent className="py-3 px-5">
                <div className="flex flex-wrap items-center gap-6">
                  <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Hoje</span>
                  <div className="flex flex-wrap gap-6">
                    <div>
                      <p className="text-xs text-muted-foreground">Receita</p>
                      <p className="font-bold text-primary">{moeda(hoje.receita)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">TPV</p>
                      <p className="font-bold">{moeda(hoje.tpv)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Tickets</p>
                      <p className="font-bold">{hoje.qtdTickets}</p>
                    </div>
                    <div className="border-l pl-6">
                      <p className="text-xs text-muted-foreground">Média diária do mês</p>
                      <p className="font-bold">{moeda(hoje.mediaDiariaReceita)} · {Math.round(hoje.mediaDiariaTickets)} tickets</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>}

            {/* KPIs linha 1 */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <KpiCard icon={Wallet}    cor="bg-blue-500/10 text-blue-600"    valor={moeda(resumo.receita)}       rotulo="Receita no mês" />
              <KpiCard icon={TrendingUp} cor="bg-sky-500/10 text-sky-600"     valor={moeda(resumo.tpv)}            rotulo="TPV — volume processado" />
              <KpiCard icon={BarChart3}  cor="bg-amber-500/10 text-amber-600" valor={resumo.qtdTickets}            rotulo="Tickets processados" />
              <KpiCard icon={Users}      cor="bg-violet-500/10 text-violet-600" valor={resumo.clientesAtivos}     rotulo="Clientes ativos" />
            </div>

            {/* KPIs linha 2 */}
            <div className="grid gap-4 sm:grid-cols-3">
              <KpiCard icon={BarChart3}  cor="bg-orange-500/10 text-orange-600"   valor={`${resumo.taxaMedia.toFixed(3)}%`}  rotulo="Taxa média" />
              <KpiCard icon={Wallet}     cor="bg-pink-500/10 text-pink-600"        valor={moeda(resumo.ticketMedio)}          rotulo="Ticket médio" />
              <KpiCard icon={RefreshCw}  cor="bg-teal-500/10 text-teal-600"       valor={`${retencao.taxaRetencao}%`}        rotulo={`Retenção · ${retencao.recorrentes} recorrentes`} />
            </div>

            {/* KPIs de Meta Geral */}
            {resumo.meta_total > 0 && (
              <div className="grid gap-4 sm:grid-cols-2">
                <KpiCard icon={Target} cor="bg-indigo-500/10 text-indigo-600" valor={moeda(resumo.meta_total)} rotulo="Meta total da equipe comercial" />
                <Card>
                  <CardContent className="flex items-center gap-3 py-4">
                    <div className={`grid size-10 place-items-center rounded-lg ${resumo.pct_meta_total >= 100 ? 'bg-emerald-500/10 text-emerald-600' : resumo.pct_meta_total >= 70 ? 'bg-amber-500/10 text-amber-600' : 'bg-red-500/10 text-red-500'}`}>
                      <Target className="size-5" />
                    </div>
                    <div className="flex-1">
                      <p className="text-2xl font-semibold leading-tight">
                        {(resumo.pct_meta_total ?? 0).toFixed(1)}%
                      </p>
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
              </div>
            )}

            {/* Evolução Mensal + YTD */}
            <div className="grid gap-4 lg:grid-cols-3">
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Evolução Mensal — Receita</CardTitle>
                </CardHeader>
                <CardContent>
                  <ChartContainer className="h-64">
                    <BarChart data={evolucaoMensal} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="mes" tickFormatter={m => MESES[m - 1]} className="text-xs" />
                      <YAxis tickFormatter={v => moeda(v)} className="text-xs" width={110} />
                      <Tooltip content={<TooltipReceita />} />
                      <Bar dataKey="receita" radius={[4, 4, 0, 0]}>
                        {evolucaoMensal.map((entry, i) => (
                          <Cell
                            key={i}
                            fill={entry.mes === mes && entry.ano === ano
                              ? CORES_GRAFICO[0]
                              : `${CORES_GRAFICO[0]}66`}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ChartContainer>
                </CardContent>
              </Card>

              {/* YTD */}
              <Card>
                <CardHeader>
                  <CardTitle>YTD — Jan → {MESES[mes - 1]}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 pt-2">
                  {[
                    { label: 'Receita',  curr: ytdAtual?.receita,       prev: ytdAnterior?.receita,       f: moeda },
                    { label: 'TPV',      curr: ytdAtual?.tpv,            prev: ytdAnterior?.tpv,            f: moeda },
                    { label: 'Clientes', curr: ytdAtual?.clientesUnicos, prev: ytdAnterior?.clientesUnicos, f: v => v },
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
                      <p className="text-2xl font-bold text-emerald-600">{retencao.novos}</p>
                      <p className="text-xs text-muted-foreground mt-1">Novos</p>
                    </div>
                    <div className="rounded-lg bg-blue-500/10 p-4">
                      <RefreshCw className="size-5 text-blue-600 mx-auto mb-2" />
                      <p className="text-2xl font-bold text-blue-600">{retencao.recorrentes}</p>
                      <p className="text-xs text-muted-foreground mt-1">Recorrentes</p>
                    </div>
                    <div className="rounded-lg bg-red-500/10 p-4">
                      <UserMinus className="size-5 text-red-500 mx-auto mb-2" />
                      <p className="text-2xl font-bold text-red-500">{retencao.perdidos}</p>
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
                      <XAxis type="number" tickFormatter={v => moeda(v)} className="text-xs" />
                      <YAxis type="category" dataKey="nome" className="text-xs" width={130} />
                      <Tooltip formatter={v => [moeda(v), 'Receita']} />
                      <Bar dataKey="receita" radius={[0, 4, 4, 0]}>
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

            {/* Top Clientes + Faixas de Taxa */}
            <div className="grid gap-4 lg:grid-cols-2">
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
                          <td className="px-4 py-2.5 max-w-[180px] truncate font-medium">{c.nome}</td>
                          <td className="px-4 py-2.5 text-right text-primary font-semibold">{moeda(c.receita)}</td>
                          <td className="px-4 py-2.5 text-right text-muted-foreground">{moeda(c.tpv)}</td>
                          <td className="px-4 py-2.5 text-right">{c.taxa.toFixed(2)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>

              <Card className="overflow-hidden">
                <CardHeader className="border-b bg-muted/30">
                  <CardTitle>Distribuição por Faixa de Taxa</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-xs text-muted-foreground">
                        <th className="px-4 py-2 text-left font-medium">Faixa</th>
                        <th className="px-4 py-2 text-right font-medium">Clientes</th>
                        <th className="px-4 py-2 text-right font-medium">Tickets</th>
                        <th className="px-4 py-2 text-right font-medium">Receita</th>
                      </tr>
                    </thead>
                    <tbody>
                      {faixasTaxa.map(f => (
                        <tr key={f.faixa} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-2.5 text-muted-foreground">{f.faixa}</td>
                          <td className="px-4 py-2.5 text-right font-medium">{f.clientes}</td>
                          <td className="px-4 py-2.5 text-right text-muted-foreground">{f.tickets}</td>
                          <td className="px-4 py-2.5 text-right text-primary font-semibold">{moeda(f.receita)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            </div>

            {/* Novos Clientes no Ano */}
            {novosClientesMes.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Novos Clientes por Mês — {ano}</CardTitle>
                </CardHeader>
                <CardContent>
                  <ChartContainer className="h-48">
                    <BarChart data={novosClientesMes} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="mes" tickFormatter={m => MESES[m - 1]} className="text-xs" />
                      <YAxis allowDecimals={false} className="text-xs" />
                      <Tooltip formatter={v => [v, 'Novos clientes']} labelFormatter={m => MESES[m - 1]} />
                      <Bar dataKey="quantidade" fill={CORES_GRAFICO[3]} radius={[4, 4, 0, 0]} />
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
