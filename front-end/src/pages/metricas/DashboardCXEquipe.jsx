import { useState, useEffect, useCallback } from 'react'
import { getEquipeCX } from '@/api/modules/metricas'
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
  Clock, AlertCircle, Loader2, RefreshCw, ChevronLeft, ChevronRight,
} from 'lucide-react'

const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

const TIPO_LABEL = {
  bank_deposit:      'Depósito Bancário',
  card_deposit:      'Depósito Cartão',
  virtual_deposit:   'Depósito Virtual',
  card_registration: 'Registro Cartão',
}

function moeda(v) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency', currency: 'BRL', maximumFractionDigits: 0,
  }).format(v ?? 0)
}

function pct(v) {
  if (v == null) return '—'
  return `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`
}

function formatarMinutos(min) {
  if (min == null || min === 0) return '—'
  if (min < 60) return `${Math.round(min)} min`
  const h = Math.floor(min / 60)
  const m = Math.round(min % 60)
  return m > 0 ? `${h}h ${m}min` : `${h}h`
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
  if (value == null) return <span className="text-xs text-muted-foreground">—</span>
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
      <p className="text-muted-foreground text-xs">{d.qtdTickets} tickets</p>
    </div>
  )
}

export default function DashboardCXEquipe() {
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
      const equipe = await getEquipeCX(mes, ano)
      setDados(equipe)
    } catch (e) {
      if (e.response?.status === 404)
        setErro('Nenhum dado de equipe CX encontrado para este período.')
      else
        setErro('Erro ao carregar métricas. Tente novamente.')
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
        title="Dashboard Equipe CX"
        subtitle="Customer Experience — visão consolidada"
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
        const { historico, mixTipo, sla, membros, hoje } = dados
        const agoraRef   = new Date()
        const ehMesAtual = mes === agoraRef.getMonth() + 1 && ano === agoraRef.getFullYear()

        const mesAnterior = historico.length >= 2 ? historico[historico.length - 2] : null
        const delta = (curr, prev) =>
          prev && curr ? Math.round(((curr - prev) / prev) * 1000) / 10 : null

        return (
          <>
            {/* Strip Hoje */}
            {ehMesAtual && hoje && (
              <Card className="border-l-4 border-l-primary">
                <CardContent className="py-3 px-5">
                  <div className="flex flex-wrap items-center gap-6">
                    <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Hoje — Equipe</span>
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
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* KPIs linha 1 */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <KpiCard icon={Wallet}     cor="bg-blue-500/10 text-blue-600"     valor={moeda(dados.totalReceita)}        rotulo="Receita total" />
              <KpiCard icon={TrendingUp} cor="bg-sky-500/10 text-sky-600"       valor={moeda(dados.totalTpv)}            rotulo="TPV total operado" />
              <KpiCard icon={BarChart3}  cor="bg-amber-500/10 text-amber-600"   valor={dados.totalQtdTickets}            rotulo="Tickets processados" />
              <KpiCard icon={Users}      cor="bg-violet-500/10 text-violet-600" valor={dados.totalClientesAtivos}        rotulo="Clientes atendidos" />
            </div>

            {/* KPIs linha 2 */}
            <div className="grid gap-4 sm:grid-cols-3">
              <KpiCard icon={BarChart3}   cor="bg-orange-500/10 text-orange-600" valor={`${(dados.taxaMedia ?? 0).toFixed(3)}%`} rotulo="Taxa média" />
              <KpiCard icon={Wallet}      cor="bg-pink-500/10 text-pink-600"     valor={moeda(dados.ticketMedio)}               rotulo="Ticket médio" />
              <KpiCard icon={AlertCircle} cor="bg-red-500/10 text-red-600"       valor={dados.totalCancelamentos}               rotulo="Cancelamentos" />
            </div>

            {/* Evolução + vs Mês Anterior */}
            <div className="grid gap-4 lg:grid-cols-3">
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Evolução Mensal — Receita da Equipe</CardTitle>
                </CardHeader>
                <CardContent>
                  <ChartContainer className="h-64">
                    <BarChart data={historico} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="mes" tickFormatter={m => MESES[m - 1]} className="text-xs" />
                      <YAxis tickFormatter={v => moeda(v)} className="text-xs" width={110} />
                      <Tooltip content={<TooltipReceita />} />
                      <Bar dataKey="receita" radius={[4, 4, 0, 0]}>
                        {historico.map((entry, i) => (
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

              <Card>
                <CardHeader>
                  <CardTitle>vs Mês Anterior</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 pt-2">
                  {[
                    { label: 'Receita',  curr: dados.totalReceita,        prev: mesAnterior?.receita,        f: moeda },
                    { label: 'TPV',      curr: dados.totalTpv,            prev: mesAnterior?.tpv,            f: moeda },
                    { label: 'Tickets',  curr: dados.totalQtdTickets,     prev: mesAnterior?.qtdTickets,     f: v => v },
                    { label: 'Clientes', curr: dados.totalClientesAtivos, prev: mesAnterior?.clientesAtivos, f: v => v },
                  ].map(({ label, curr, prev, f }) => {
                    const d = delta(curr, prev)
                    return (
                      <div key={label} className="flex items-center justify-between text-sm border-b pb-3 last:border-0 last:pb-0">
                        <span className="text-muted-foreground">{label}</span>
                        <div className="text-right">
                          <p className="font-semibold">{curr != null ? f(curr) : '—'}</p>
                          <DeltaTag value={d} />
                        </div>
                      </div>
                    )
                  })}
                </CardContent>
              </Card>
            </div>

            {/* Mix por Tipo + SLA */}
            <div className="grid gap-4 lg:grid-cols-2">
              <Card className="overflow-hidden">
                <CardHeader className="border-b bg-muted/30">
                  <CardTitle>Mix por Tipo de Operação</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {mixTipo.length === 0 ? (
                    <p className="py-8 text-center text-sm text-muted-foreground">Nenhuma operação neste período.</p>
                  ) : (
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-xs text-muted-foreground">
                          <th className="px-4 py-2 text-left font-medium">Tipo</th>
                          <th className="px-4 py-2 text-right font-medium">Qtd</th>
                          <th className="px-4 py-2 text-right font-medium">Volume</th>
                          <th className="px-4 py-2 text-right font-medium">%</th>
                        </tr>
                      </thead>
                      <tbody>
                        {mixTipo.map((m) => (
                          <tr key={m.tipo} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                            <td className="px-4 py-2.5 font-medium">{TIPO_LABEL[m.tipo] ?? m.tipo}</td>
                            <td className="px-4 py-2.5 text-right">{m.qtd}</td>
                            <td className="px-4 py-2.5 text-right text-primary font-semibold">{moeda(m.volume)}</td>
                            <td className="px-4 py-2.5 text-right text-muted-foreground">{m.percentual?.toFixed(1)}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </CardContent>
              </Card>

              <Card className="overflow-hidden">
                <CardHeader className="border-b bg-muted/30">
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="size-4 text-muted-foreground" />
                    SLA — Tempo de Atendimento
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {sla.length === 0 ? (
                    <p className="py-8 text-center text-sm text-muted-foreground">Sem dados de SLA neste período.</p>
                  ) : (
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-xs text-muted-foreground">
                          <th className="px-4 py-2 text-left font-medium">Tipo</th>
                          <th className="px-4 py-2 text-right font-medium">Qtd</th>
                          <th className="px-4 py-2 text-right font-medium">Mediana</th>
                          <th className="px-4 py-2 text-right font-medium">Média</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sla.map((s) => (
                          <tr key={s.tipo} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                            <td className="px-4 py-2.5 font-medium">{TIPO_LABEL[s.tipo] ?? s.tipo}</td>
                            <td className="px-4 py-2.5 text-right">{s.qtd}</td>
                            <td className="px-4 py-2.5 text-right text-primary font-semibold">{formatarMinutos(s.medianaMinutos)}</td>
                            <td className="px-4 py-2.5 text-right text-muted-foreground">{formatarMinutos(s.mediaMinutos)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Ranking da Equipe */}
            <Card className="overflow-hidden">
              <CardHeader className="border-b bg-muted/30">
                <CardTitle>Ranking da Equipe</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {membros.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">Nenhum dado de membros neste período.</p>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-xs text-muted-foreground">
                        <th className="px-4 py-2 text-left font-medium">#</th>
                        <th className="px-4 py-2 text-left font-medium">Operadora</th>
                        <th className="px-4 py-2 text-right font-medium">Tickets</th>
                        <th className="px-4 py-2 text-right font-medium">Volume</th>
                        <th className="px-4 py-2 text-right font-medium">Receita</th>
                        <th className="px-4 py-2 text-right font-medium">Taxa</th>
                      </tr>
                    </thead>
                    <tbody>
                      {membros.map((m, i) => (
                        <tr key={m.userId} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-2.5">
                            <Badge variant={i === 0 ? 'default' : 'outline'} className="w-6 h-6 flex items-center justify-center p-0 text-xs">
                              {i + 1}
                            </Badge>
                          </td>
                          <td className="px-4 py-2.5 font-medium">{m.nome}</td>
                          <td className="px-4 py-2.5 text-right">{m.qtdTickets}</td>
                          <td className="px-4 py-2.5 text-right text-muted-foreground">{moeda(m.volume)}</td>
                          <td className="px-4 py-2.5 text-right text-primary font-semibold">{moeda(m.receita)}</td>
                          <td className="px-4 py-2.5 text-right text-muted-foreground">{(m.taxaMedia ?? 0).toFixed(3)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </CardContent>
            </Card>
          </>
        )
      })()}
    </div>
  )
}
