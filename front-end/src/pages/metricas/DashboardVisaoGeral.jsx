import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { getVisaoGeral } from '@/api/modules/metricas'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ChartContainer, CORES_GRAFICO } from '@/components/ui/chart'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import PageHeader from '@/components/layout/PageHeader'
import { cn } from '@/lib/utils'
import { gradeDoMes, diasDaSemana, chaveDia, mesmoMes, fmt, capitalizar } from '@/lib/datas'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from 'recharts'
import {
  Wallet, Users, UserPlus, RefreshCw, AlertCircle, Loader2,
  ChevronLeft, ChevronRight, Sparkles, BarChart3, TrendingUp, TrendingDown,
} from 'lucide-react'

const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

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

/**
 * Mesmo padrão visual do Ranking Geral (Dashboard Comercial), adaptado para
 * clientes. Linhas clicáveis levam para a ficha do cliente em Meus Clientes
 * (mesma rota/padrão usado em MeusClientes.jsx e GrupoEconomico.jsx).
 */
function RankingClientesTabela({ titulo, clientes, mostrarPrimeiraCompra }) {
  const navigate = useNavigate()
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
                    onClick={() => navigate(`/clientes/${c.clienteId}`)}
                    className="border-b last:border-0 cursor-pointer hover:bg-muted/30 transition-colors"
                  >
                    <td className="px-4 py-2.5">
                      <Badge variant={i === 0 ? 'default' : 'outline'} className="w-6 h-6 flex items-center justify-center p-0 text-xs">{i + 1}</Badge>
                    </td>
                    <td className="px-4 py-2.5 max-w-[220px] truncate font-medium">{c.nome}</td>
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
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default function DashboardVisaoGeral() {
  const agora = new Date()
  const [mes, setMes] = useState(agora.getMonth() + 1)
  const [ano, setAno] = useState(agora.getFullYear())
  const [dados, setDados] = useState(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [diaSelecionado, setDiaSelecionado] = useState(null)

  const carregar = useCallback(async () => {
    setErro('')
    setCarregando(true)
    try {
      const data = await getVisaoGeral(mes, ano)
      setDados(data)
    } catch (e) {
      if (e.response?.status === 404) setErro('Você não possui métricas cadastradas no banco de produção.')
      else setErro('Erro ao carregar a visão geral. Tente novamente.')
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
      const receita = diasPorChave.get(chaveDia(data))?.receita ?? 0
      bruto.push({ dia: d, receita })
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
    setDiaSelecionado(diasPorChave.get(chave) ?? { dia: chave, receita: 0, tpv: 0, qtdTickets: 0, clientesAtivos: 0, clientesNovos: 0 })
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
        title="Visão Geral"
        subtitle="Novos clientes, receita por semana e calendário do mês"
      >
        <div className="flex items-center gap-2">
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
          {/* KPIs do mês */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard icon={Wallet}    cor="bg-blue-500/10 text-blue-600"      valor={moeda(dados.resumoMes.receita)}       rotulo="Receita no mês" />
            <KpiCard icon={BarChart3} cor="bg-sky-500/10 text-sky-600"        valor={moeda(dados.resumoMes.tpv)}           rotulo="TPV no mês" />
            <KpiCard icon={UserPlus}  cor="bg-emerald-500/10 text-emerald-600" valor={numero(dados.resumoMes.clientesNovos)} rotulo="Clientes novos no mês" />
            <KpiCard icon={Users}     cor="bg-violet-500/10 text-violet-600"  valor={numero(dados.resumoMes.clientesAtivos)} rotulo="Clientes que faturaram" />
          </div>

          {/* Previsão de fechamento — só no mês corrente */}
          {dados.previsao && (
            <Card className="border-l-4 border-l-primary bg-primary/[0.03]">
              <CardContent className="flex flex-wrap items-center gap-4 py-4 px-5">
                <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                  <Sparkles className="size-5" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    No ritmo atual (dia {dados.previsao.diasDecorridos} de {dados.previsao.diasTotais}), a previsão é fechar o mês em
                  </p>
                  <p className="text-lg font-bold text-primary">{moeda(dados.previsao.receitaProjetada)}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Receita e novos clientes por semana */}
          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Receita por Semana</CardTitle>
              </CardHeader>
              <CardContent>
                {dados.semanas.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">Sem movimentação neste mês.</p>
                ) : (
                  <ChartContainer className="h-64">
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

            <Card>
              <CardHeader>
                <CardTitle>Novos Clientes por Semana</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 pt-2">
                {dados.semanas.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">Sem dados.</p>
                ) : (
                  dados.semanas.map((s) => (
                    <div key={s.inicio} className="flex items-center justify-between text-sm border-b pb-3 last:border-0 last:pb-0">
                      <span className="text-muted-foreground">
                        {fmt.diaMes.format(parseDia(s.inicio))} – {fmt.diaMes.format(parseDia(s.fim))}
                      </span>
                      <span className="font-semibold">{numero(s.clientesNovos)}</span>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          {/* Evolução diária de receita — dias úteis do mês */}
          <Card>
            <CardHeader>
              <CardTitle>Evolução Diária de Receita — Dias Úteis</CardTitle>
              <p className="text-xs text-muted-foreground">Fins de semana são ignorados na comparação dia a dia.</p>
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
                          return <circle key={`dot-${payload.dia}-${index}`} cx={cx} cy={cy} r={3.5} fill={cor} stroke="none" />
                        }}
                        activeDot={{ r: 5 }}
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
          <RankingClientesTabela titulo="Clientes que Faturaram no Mês" clientes={dados.clientesDoMes} />
          <RankingClientesTabela titulo="Clientes Novos do Mês" clientes={dados.clientesNovosDoMes} mostrarPrimeiraCompra />
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
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
