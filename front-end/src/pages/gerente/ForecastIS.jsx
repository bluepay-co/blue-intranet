import { useState, useEffect, useCallback } from 'react'
import { getEquipe } from '@/api/modules/metricas'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import PageHeader from '@/components/layout/PageHeader'
import { cn } from '@/lib/utils'
import {
  Wallet, TrendingUp, Target, Gauge, RefreshCw, AlertCircle, Loader2, Info,
} from 'lucide-react'

const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

function moeda(v) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2,
  }).format(v ?? 0)
}

/** Verde ≥100% da meta projetada, amarelo ≥70%, vermelho abaixo disso — mesmos cortes já usados no resto do app. */
function corPorProjecao(pct) {
  if (pct >= 100) return { texto: 'text-emerald-600', bg: 'bg-emerald-500/10', barra: 'bg-emerald-500', label: 'Vai bater a meta' }
  if (pct >= 70)  return { texto: 'text-amber-600',   bg: 'bg-amber-500/10',   barra: 'bg-amber-500',   label: 'Perto da meta' }
  return              { texto: 'text-red-500',      bg: 'bg-red-500/10',      barra: 'bg-red-500',     label: 'Abaixo da meta' }
}

/** Ritmo diário → projeção de fechamento do mês, a partir do realizado até hoje. */
function calcularForecast(receita, meta, diasDecorridos, diasNoMes) {
  const ritmoDiario = diasDecorridos > 0 ? receita / diasDecorridos : 0
  const projecao = ritmoDiario * diasNoMes
  const pctProjetado = meta > 0 ? (projecao / meta) * 100 : 0
  const gap = meta - projecao
  return { ritmoDiario, projecao, pctProjetado, gap }
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

export default function ForecastIS() {
  const agora = new Date()
  const mes = agora.getMonth() + 1
  const ano = agora.getFullYear()
  const diasNoMes = new Date(ano, mes, 0).getDate()
  const diasDecorridos = agora.getDate()
  const diasRestantes = diasNoMes - diasDecorridos

  const [dados, setDados] = useState(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')

  const carregar = useCallback(async () => {
    setErro('')
    setCarregando(true)
    try {
      setDados(await getEquipe(mes, ano, 'IS'))
    } catch (e) {
      if (e.response?.status === 404) setErro('Nenhum dado de equipe encontrado para este mês.')
      else setErro('Erro ao carregar o forecast. Tente novamente.')
    } finally {
      setCarregando(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => { carregar() }, [carregar])

  if (carregando && !dados) {
    return (
      <div className="grid place-items-center py-24">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const forecastEquipe = dados ? calcularForecast(dados.totalReceita, dados.meta_equipe, diasDecorridos, diasNoMes) : null
  const corEquipe = forecastEquipe ? corPorProjecao(forecastEquipe.pctProjetado) : null

  const membrosForecast = (dados?.membros ?? [])
    .map((m) => ({ ...m, ...calcularForecast(m.receita, m.meta, diasDecorridos, diasNoMes) }))
    .sort((a, b) => b.pctProjetado - a.pctProjetado)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Forecast IS"
        subtitle={`Projeção de fechamento de ${MESES[mes - 1]}/${ano} com base no ritmo atual da equipe`}
      >
        <Button variant="outline" size="icon" className="h-8 w-8" onClick={carregar} disabled={carregando} title="Atualizar">
          <RefreshCw className={`size-4 ${carregando ? 'animate-spin' : ''}`} />
        </Button>
      </PageHeader>

      {erro && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="size-4 shrink-0" />
          {erro}
        </div>
      )}

      {diasDecorridos <= 3 && (
        <div className="flex items-center gap-2 rounded-lg border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
          <Info className="size-4 shrink-0" />
          Mês ainda no início (dia {diasDecorridos} de {diasNoMes}) — a projeção tende a ficar mais confiável conforme os dias passam.
        </div>
      )}

      {dados && forecastEquipe && (
        <>
          {/* KPIs da equipe */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard icon={Wallet}     cor="bg-blue-500/10 text-blue-600"     valor={moeda(dados.totalReceita)}            rotulo="Realizado até hoje" />
            <KpiCard icon={Gauge}      cor="bg-sky-500/10 text-sky-600"       valor={moeda(forecastEquipe.ritmoDiario)}     rotulo="Ritmo diário (média/dia)" />
            <KpiCard icon={TrendingUp} cor="bg-violet-500/10 text-violet-600" valor={moeda(forecastEquipe.projecao)}        rotulo="Projeção de fechamento" />
            <KpiCard icon={Target}     cor="bg-indigo-500/10 text-indigo-600" valor={moeda(dados.meta_equipe)}              rotulo="Meta da equipe" />
          </div>

          {/* Card de destaque: % projetado da meta */}
          <Card>
            <CardContent className="flex items-center gap-4 py-4 px-5">
              <div className={cn('grid size-10 shrink-0 place-items-center rounded-lg', corEquipe.bg, corEquipe.texto)}>
                <Target className="size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                  <p className="text-lg font-bold">
                    {forecastEquipe.pctProjetado.toFixed(1)}% da meta projetada · <span className={corEquipe.texto}>{corEquipe.label}</span>
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {forecastEquipe.gap <= 0
                      ? `supera a meta em ${moeda(Math.abs(forecastEquipe.gap))}`
                      : `projeção fica ${moeda(forecastEquipe.gap)} abaixo da meta`}
                  </p>
                </div>
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn('h-full rounded-full transition-all', corEquipe.barra)}
                    style={{ width: `${Math.min(forecastEquipe.pctProjetado, 100)}%` }}
                  />
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Dia {diasDecorridos} de {diasNoMes} do mês · {diasRestantes} dia{diasRestantes === 1 ? '' : 's'} restante{diasRestantes === 1 ? '' : 's'}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Ranking de forecast por funcionário */}
          <Card className="overflow-hidden">
            <CardHeader className="border-b bg-muted/30">
              <CardTitle>Forecast por Funcionário</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {membrosForecast.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">Nenhum funcionário com dados neste período.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-xs text-muted-foreground">
                        <th className="px-4 py-2 text-left font-medium">#</th>
                        <th className="px-4 py-2 text-left font-medium">Funcionário</th>
                        <th className="px-4 py-2 text-right font-medium">Realizado</th>
                        <th className="px-4 py-2 text-right font-medium">Meta</th>
                        <th className="px-4 py-2 text-right font-medium">Ritmo Diário</th>
                        <th className="px-4 py-2 text-right font-medium">Projeção</th>
                        <th className="px-4 py-2 text-right font-medium">% Projetado</th>
                        <th className="px-4 py-2 text-left font-medium">Situação</th>
                      </tr>
                    </thead>
                    <tbody>
                      {membrosForecast.map((m, i) => {
                        const cor = corPorProjecao(m.pctProjetado)
                        return (
                          <tr key={m.vendedorId} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                            <td className="px-4 py-2.5">
                              <Badge variant={i === 0 ? 'default' : 'outline'} className="w-6 h-6 flex items-center justify-center p-0 text-xs">{i + 1}</Badge>
                            </td>
                            <td className="px-4 py-2.5 font-medium">{m.nome}</td>
                            <td className="px-4 py-2.5 text-right text-primary font-semibold">{moeda(m.receita)}</td>
                            <td className="px-4 py-2.5 text-right text-muted-foreground">{m.meta > 0 ? moeda(m.meta) : '—'}</td>
                            <td className="px-4 py-2.5 text-right text-muted-foreground">{moeda(m.ritmoDiario)}</td>
                            <td className="px-4 py-2.5 text-right font-semibold">{moeda(m.projecao)}</td>
                            <td className="px-4 py-2.5 text-right">
                              {m.meta > 0 ? (
                                <span className={`font-semibold text-xs ${cor.texto}`}>{m.pctProjetado.toFixed(1)}%</span>
                              ) : '—'}
                            </td>
                            <td className="px-4 py-2.5">
                              {m.meta > 0 ? (
                                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${cor.bg} ${cor.texto}`}>
                                  {cor.label}
                                </span>
                              ) : '—'}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
