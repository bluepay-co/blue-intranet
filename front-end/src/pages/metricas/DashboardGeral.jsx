import React, { useState, useEffect, useCallback } from 'react'
import { getMetricasGerais } from '@/api/modules/metricas'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts'
import {
  TrendingUp, TrendingDown, Wallet, Users, BarChart3,
  ChevronLeft, ChevronRight, AlertCircle, Activity,
  UserPlus, UserMinus, RefreshCw,
} from 'lucide-react'

const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

const LABEL_PRODUTO = {
  bank_deposit:    'Depósito Bancário',
  card_deposit:    'Depósito Cartão',
  virtual_deposit: 'Depósito Virtual',
}

function fmt(v) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v)
}
function fmtK(v) {
  if (v >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000)     return `R$ ${(v / 1_000).toFixed(0)}K`
  return fmt(v)
}
function fmtPct(v) {
  if (v === null || v === undefined) return '—'
  const sign = v > 0 ? '+' : ''
  return `${sign}${v.toFixed(1)}%`
}

function KpiCard({ icon: Icon, label, value, sub, color = 'text-foreground' }) {
  return (
    <Card>
      <CardContent className="pt-5 pb-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-1">{label}</p>
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
          </div>
          <div className="p-2 rounded-lg bg-muted">
            <Icon className="h-5 w-5 text-muted-foreground" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function DeltaBadge({ value }) {
  if (value === null || value === undefined) return <span className="text-xs text-muted-foreground">—</span>
  const up = value >= 0
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-semibold ${up ? 'text-emerald-600' : 'text-red-500'}`}>
      {up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {fmtPct(value)}
    </span>
  )
}

function TooltipEvolucao({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload
  return (
    <div className="bg-background border rounded-lg shadow-md px-3 py-2 text-sm space-y-1">
      <p className="font-semibold">{MESES[(Number(label) - 1)]} / {d?.ano}</p>
      <p className="text-primary">{fmt(payload[0].value)}</p>
      {d?.crescimentoReceita !== null && (
        <p className={d?.crescimentoReceita >= 0 ? 'text-emerald-600' : 'text-red-500'}>
          MoM: {fmtPct(d?.crescimentoReceita)}
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
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState(null)

  const carregar = useCallback(async () => {
    setLoading(true)
    setErro(null)
    try {
      const d = await getMetricasGerais(mes, ano)
      setDados(d)
    } catch {
      setErro('Erro ao carregar métricas gerais. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }, [mes, ano])

  useEffect(() => { carregar() }, [carregar])

  function mudarMes(delta) {
    let m = mes + delta
    let a = ano
    if (m > 12) { m = 1;  a++ }
    if (m < 1)  { m = 12; a-- }
    setMes(m)
    setAno(a)
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Métricas Gerais</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Visão consolidada da empresa</p>
        </div>
        <div className="flex items-center gap-2 bg-muted rounded-lg px-3 py-2">
          <button onClick={() => mudarMes(-1)} className="hover:text-primary transition-colors">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm font-semibold min-w-[90px] text-center">
            {MESES[mes - 1]} / {ano}
          </span>
          <button onClick={() => mudarMes(1)} className="hover:text-primary transition-colors">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="space-y-4">
          <Skeleton className="h-16 w-full" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-28" />)}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Skeleton className="h-64" />
            <Skeleton className="h-64" />
          </div>
        </div>
      )}

      {/* Erro */}
      {!loading && erro && (
        <div className="flex flex-col items-center justify-center min-h-[40vh] gap-3 text-muted-foreground">
          <AlertCircle className="h-10 w-10" />
          <p className="text-sm font-medium">{erro}</p>
        </div>
      )}

      {/* Dados */}
      {!loading && !erro && dados && (() => {
        const { resumo, hoje, retencao, mixProduto, evolucaoMensal, topClientes, faixasTaxa, ytd, novosClientesMes } = dados

        const ytdAtual    = ytd.find(y => y.ano === ano)
        const ytdAnterior = ytd.find(y => y.ano === ano - 1)

        return (
          <>
            {/* Strip Hoje */}
            <Card className="border-l-4 border-l-primary">
              <CardContent className="py-3 px-5">
                <div className="flex flex-wrap gap-6 items-center">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Hoje</p>
                  <div className="flex gap-6 flex-wrap">
                    <div>
                      <p className="text-xs text-muted-foreground">Receita</p>
                      <p className="font-bold text-primary">{fmt(hoje.receita)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">TPV</p>
                      <p className="font-bold">{fmtK(hoje.tpv)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Tickets</p>
                      <p className="font-bold">{hoje.qtdTickets}</p>
                    </div>
                    <div className="border-l pl-6 ml-2">
                      <p className="text-xs text-muted-foreground">Média diária / mês</p>
                      <p className="font-bold">{fmt(hoje.mediaDiariaReceita)} · {Math.round(hoje.mediaDiariaTickets)} tickets</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* KPI Cards linha 1 */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <KpiCard icon={Wallet}   label="Receita no Mês"    value={fmtK(resumo.receita)}   color="text-primary" />
              <KpiCard icon={TrendingUp} label="TPV"             value={fmtK(resumo.tpv)}        sub="Volume processado" />
              <KpiCard icon={BarChart3}  label="Tickets"         value={resumo.qtdTickets}       />
              <KpiCard icon={Users}      label="Clientes Ativos" value={resumo.clientesAtivos}   />
            </div>

            {/* KPI Cards linha 2 */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <KpiCard icon={Activity} label="Vendedores Ativos" value={resumo.vendedoresAtivos} />
              <KpiCard icon={BarChart3} label="Taxa Média"       value={`${resumo.taxaMedia.toFixed(2)}%`} />
              <KpiCard icon={Wallet}   label="Ticket Médio"      value={fmtK(resumo.ticketMedio)} />
              <KpiCard icon={RefreshCw} label="Retenção"         value={`${retencao.taxaRetencao}%`} sub={`${retencao.recorrentes} recorrentes`} color="text-emerald-600" />
            </div>

            {/* Evolução Mensal + YTD */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-2">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold">Evolução Mensal — Receita</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={evolucaoMensal} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="mes" tickFormatter={m => MESES[m - 1]} tick={{ fontSize: 11 }} />
                      <YAxis tickFormatter={v => fmtK(v)} tick={{ fontSize: 11 }} width={64} />
                      <Tooltip content={<TooltipEvolucao />} />
                      <Bar dataKey="receita" radius={[4, 4, 0, 0]}>
                        {evolucaoMensal.map((entry, i) => (
                          <Cell key={i} fill={entry.mes === mes && entry.ano === ano ? 'hsl(var(--primary))' : 'hsl(var(--primary)/0.4)'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* YTD */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold">YTD — Jan → {MESES[mes - 1]}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {[
                    { label: 'Receita', curr: ytdAtual?.receita, prev: ytdAnterior?.receita, fmt: fmtK },
                    { label: 'TPV',     curr: ytdAtual?.tpv,     prev: ytdAnterior?.tpv,     fmt: fmtK },
                    { label: 'Clientes', curr: ytdAtual?.clientesUnicos, prev: ytdAnterior?.clientesUnicos, fmt: v => v },
                  ].map(({ label, curr, prev, fmt: f }) => {
                    const pct = prev && curr ? ((curr - prev) / prev) * 100 : null
                    return (
                      <div key={label} className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{label}</span>
                        <div className="text-right">
                          <p className="font-semibold">{curr != null ? f(curr) : '—'}</p>
                          <DeltaBadge value={pct !== null ? Math.round(pct * 10) / 10 : null} />
                        </div>
                      </div>
                    )
                  })}
                  {ytdAnterior && (
                    <p className="text-xs text-muted-foreground pt-1 border-t">vs {ano - 1}: {fmtK(ytdAnterior.receita)}</p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Retenção + Mix de Produto */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Retenção */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold">Retenção de Clientes</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/20 p-3">
                      <UserPlus className="h-5 w-5 text-emerald-600 mx-auto mb-1" />
                      <p className="text-2xl font-bold text-emerald-600">{retencao.novos}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Novos</p>
                    </div>
                    <div className="rounded-lg bg-blue-50 dark:bg-blue-950/20 p-3">
                      <RefreshCw className="h-5 w-5 text-blue-600 mx-auto mb-1" />
                      <p className="text-2xl font-bold text-blue-600">{retencao.recorrentes}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Recorrentes</p>
                    </div>
                    <div className="rounded-lg bg-red-50 dark:bg-red-950/20 p-3">
                      <UserMinus className="h-5 w-5 text-red-500 mx-auto mb-1" />
                      <p className="text-2xl font-bold text-red-500">{retencao.perdidos}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Perdidos</p>
                    </div>
                  </div>
                  <p className="text-center text-sm text-muted-foreground mt-4">
                    Taxa de retenção: <span className="font-semibold text-emerald-600">{retencao.taxaRetencao}%</span>
                  </p>
                </CardContent>
              </Card>

              {/* Mix de Produto */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold">Mix de Produto</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={160}>
                    <BarChart
                      layout="vertical"
                      data={mixProduto.map(p => ({ ...p, nome: LABEL_PRODUTO[p.produto] ?? p.produto }))}
                      margin={{ top: 0, right: 8, left: 0, bottom: 0 }}
                    >
                      <XAxis type="number" tickFormatter={v => fmtK(v)} tick={{ fontSize: 10 }} />
                      <YAxis type="category" dataKey="nome" tick={{ fontSize: 10 }} width={110} />
                      <Tooltip formatter={v => [fmt(v), 'Receita']} />
                      <Bar dataKey="receita" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]}>
                        {mixProduto.map((_, i) => (
                          <Cell key={i} fill={`hsl(var(--primary)/${1 - i * 0.25})`} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                  <div className="space-y-1 mt-2">
                    {mixProduto.map(p => (
                      <div key={p.produto} className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{LABEL_PRODUTO[p.produto] ?? p.produto}</span>
                        <span className="font-medium">{p.percentualReceita?.toFixed(1)}%</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Top Clientes + Faixas de Taxa */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold">Top Clientes do Mês</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {topClientes.slice(0, 8).map((c, i) => (
                      <div key={c.nome} className="flex items-center justify-between text-sm py-1 border-b last:border-0">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs w-6 h-6 flex items-center justify-center p-0 shrink-0">
                            {i + 1}
                          </Badge>
                          <span className="truncate max-w-[180px]">{c.nome}</span>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-semibold text-primary">{fmt(c.receita)}</p>
                          <p className="text-xs text-muted-foreground">{c.qtdTickets} tickets · {c.taxa.toFixed(2)}%</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold">Distribuição por Faixa de Taxa</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {faixasTaxa.map(f => (
                      <div key={f.faixa} className="flex items-center justify-between text-sm py-1 border-b last:border-0">
                        <span className="text-muted-foreground min-w-[130px]">{f.faixa}</span>
                        <div className="flex gap-4 text-right">
                          <div>
                            <p className="font-semibold">{f.clientes}</p>
                            <p className="text-xs text-muted-foreground">clientes</p>
                          </div>
                          <div>
                            <p className="font-semibold text-primary">{fmt(f.receita)}</p>
                            <p className="text-xs text-muted-foreground">{f.tickets} tickets</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Novos Clientes no Ano */}
            {novosClientesMes.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold">Novos Clientes por Mês — {ano}</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={160}>
                    <BarChart data={novosClientesMes} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="mes" tickFormatter={m => MESES[m - 1]} tick={{ fontSize: 11 }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                      <Tooltip formatter={v => [v, 'Novos clientes']} labelFormatter={m => MESES[m - 1]} />
                      <Bar dataKey="quantidade" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </>
        )
      })()}
    </div>
  )
}
