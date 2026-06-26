import { useState, useEffect, useCallback } from 'react'
import { getMeuResumo, getTopClientes } from '@/api/modules/metricas'
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
  UserPlus, RefreshCw, AlertCircle, Loader2,
  ChevronLeft, ChevronRight, Target,
} from 'lucide-react'

const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

function moeda(v) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2,
  }).format(v ?? 0)
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
    <div className="rounded-lg border bg-background px-3 py-2 text-sm shadow-md space-y-0.5">
      <p className="font-semibold">{MESES[(d.mes ?? 1) - 1]} / {d.ano}</p>
      <p className="text-primary">{moeda(d.receita)}</p>
    </div>
  )
}

export default function DashboardPessoal() {
  const agora = new Date()
  const [mes, setMes] = useState(agora.getMonth() + 1)
  const [ano, setAno] = useState(agora.getFullYear())
  const [dados, setDados] = useState(null)
  const [clientes, setClientes] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')

  const carregar = useCallback(async () => {
    setErro('')
    setCarregando(true)
    try {
      const [resumo, tops] = await Promise.all([
        getMeuResumo(mes, ano),
        getTopClientes(mes, ano, 10),
      ])
      setDados(resumo)
      setClientes(tops)
    } catch (e) {
      if (e.response?.status === 404)
        setErro('Você não possui métricas cadastradas no banco de produção.')
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
        title="Dashboard Pessoal"
        subtitle={dados ? dados.nome : 'Carregando...'}
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
        const { mesAtual, hoje, historico } = dados
        const agora_ref  = new Date()
        const ehMesAtual = mes === agora_ref.getMonth() + 1 && ano === agora_ref.getFullYear()

        const mesAnterior = historico.length >= 2
          ? historico[historico.length - 2]
          : null
        const deltaReceita = mesAnterior?.receita
          ? Math.round(((mesAtual.receita - mesAnterior.receita) / mesAnterior.receita) * 1000) / 10
          : null

        return (
          <>
            {/* Cards de Meta — topo do dashboard */}
            {mesAtual.meta > 0 && (() => {
              const falta = Math.max(0, mesAtual.meta - mesAtual.receita)
              return (
                <div className="grid gap-4 sm:grid-cols-3">
                  <KpiCard icon={Target} cor="bg-indigo-500/10 text-indigo-600" valor={moeda(mesAtual.meta)} rotulo="Meta do mês" />
                  <Card>
                    <CardContent className="flex items-center gap-3 py-4">
                      <div className={`grid size-10 place-items-center rounded-lg ${mesAtual.pct_meta >= 100 ? 'bg-emerald-500/10 text-emerald-600' : mesAtual.pct_meta >= 70 ? 'bg-amber-500/10 text-amber-600' : 'bg-red-500/10 text-red-500'}`}>
                        <Target className="size-5" />
                      </div>
                      <div className="flex-1">
                        <p className="text-2xl font-semibold leading-tight">{mesAtual.pct_meta.toFixed(1)}%</p>
                        <p className="text-xs text-muted-foreground">% da meta atingida</p>
                        <div className="mt-1.5 h-1.5 w-full rounded-full bg-muted overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${mesAtual.pct_meta >= 100 ? 'bg-emerald-500' : mesAtual.pct_meta >= 70 ? 'bg-amber-500' : 'bg-red-500'}`}
                            style={{ width: `${Math.min(mesAtual.pct_meta, 100)}%` }}
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
                        <p className="text-xs text-muted-foreground">Falta para bater a meta</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )
            })()}

            {/* Strip Hoje — só no mês corrente */}
            {ehMesAtual && hoje && (
              <Card className="border-l-4 border-l-primary">
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
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* KPIs linha 1 */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <KpiCard icon={Wallet}     cor="bg-blue-500/10 text-blue-600"      valor={moeda(mesAtual.receita)}       rotulo="Receita no mês" />
              <KpiCard icon={TrendingUp} cor="bg-sky-500/10 text-sky-600"        valor={moeda(mesAtual.tpv)}           rotulo="TPV — volume processado" />
              <KpiCard icon={BarChart3}  cor="bg-amber-500/10 text-amber-600"    valor={mesAtual.qtdTickets}           rotulo="Tickets processados" />
              <KpiCard icon={Users}      cor="bg-violet-500/10 text-violet-600"  valor={mesAtual.clientesAtivos}       rotulo="Clientes ativos" />
            </div>

            {/* KPIs linha 2 */}
            <div className="grid gap-4 sm:grid-cols-3">
              <KpiCard icon={BarChart3}  cor="bg-orange-500/10 text-orange-600"  valor={`${(mesAtual.taxaMedia ?? 0).toFixed(3)}%`} rotulo="Taxa média" />
              <KpiCard icon={Wallet}     cor="bg-pink-500/10 text-pink-600"       valor={moeda(mesAtual.ticketMedio)}                rotulo="Ticket médio" />
              <KpiCard icon={UserPlus}   cor="bg-emerald-500/10 text-emerald-600" valor={mesAtual.clientesNovos}                     rotulo="Clientes novos no mês" />
            </div>

            {/* Evolução + vs Mês Anterior */}
            <div className="grid gap-4 lg:grid-cols-3">
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Evolução Mensal — Receita</CardTitle>
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

              {/* vs Mês Anterior */}
              <Card>
                <CardHeader>
                  <CardTitle>vs Mês Anterior</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 pt-2">
                  {[
                    { label: 'Receita',        curr: mesAtual.receita,        prev: mesAnterior?.receita,        f: moeda },
                    { label: 'TPV',            curr: mesAtual.tpv,            prev: mesAnterior?.tpv,            f: moeda },
                    { label: 'Tickets',        curr: mesAtual.qtdTickets,     prev: mesAnterior?.qtdTickets,     f: v => v },
                    { label: 'Clientes Ativos', curr: mesAtual.clientesAtivos, prev: mesAnterior?.clientesAtivos, f: v => v },
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
                  {deltaReceita !== null && (
                    <p className="text-xs text-muted-foreground border-t pt-2">
                      Receita: <span className={`font-semibold ${deltaReceita >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>{pct(deltaReceita)}</span> vs mês anterior
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Top Clientes */}
            <Card className="overflow-hidden">
              <CardHeader className="border-b bg-muted/30">
                <CardTitle>Top Clientes do Mês</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {clientes.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">Nenhum cliente neste período.</p>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-xs text-muted-foreground">
                        <th className="px-4 py-2 text-left font-medium">#</th>
                        <th className="px-4 py-2 text-left font-medium">Cliente</th>
                        <th className="px-4 py-2 text-right font-medium">Receita</th>
                        <th className="px-4 py-2 text-right font-medium">TPV</th>
                        <th className="px-4 py-2 text-right font-medium">Tickets</th>
                      </tr>
                    </thead>
                    <tbody>
                      {clientes.map((c, i) => (
                        <tr key={c.nome} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-2.5">
                            <Badge variant={i === 0 ? 'default' : 'outline'} className="w-6 h-6 flex items-center justify-center p-0 text-xs">
                              {i + 1}
                            </Badge>
                          </td>
                          <td className="px-4 py-2.5 max-w-[200px] truncate font-medium">{c.nome}</td>
                          <td className="px-4 py-2.5 text-right text-primary font-semibold">{moeda(c.receita)}</td>
                          <td className="px-4 py-2.5 text-right text-muted-foreground">{moeda(c.tpv)}</td>
                          <td className="px-4 py-2.5 text-right">{c.qtdTickets}</td>
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
