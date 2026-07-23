import { useState, useEffect, useCallback, useMemo } from 'react'
import { getEquipe } from '@/api/modules/metricas'
import { getReceitasEquipeGerente } from '@/api/modules/gerente'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import PageHeader from '@/components/layout/PageHeader'
import { KpiCard, InsightCard } from '@/components/metricas/ForecastCards'
import { cn } from '@/lib/utils'
import { addDias, fmt } from '@/lib/datas'
import {
  calcularForecast, calcularTendencia, calcularReceitaMesmoPeriodoAnterior,
  calcularForecastSemana, calcularForecastSemanaPorFuncionario, corPorProjecao,
} from '@/lib/forecast'
import {
  Wallet, TrendingUp, TrendingDown, Minus, Target, Gauge, Flame, History,
  RefreshCw, AlertCircle, Loader2, Info, CalendarRange,
} from 'lucide-react'

const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

function moeda(v) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2,
  }).format(v ?? 0)
}
function pct(v) {
  if (v === null || v === undefined) return '—'
  return `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`
}

export default function ForecastIS() {
  const agora = new Date()
  const mes = agora.getMonth() + 1
  const ano = agora.getFullYear()
  const diasNoMes = new Date(ano, mes, 0).getDate()
  const diasDecorridos = agora.getDate()
  const diasRestantes = diasNoMes - diasDecorridos
  const mesAnteriorNum = mes === 1 ? 12 : mes - 1
  const anoAnteriorNum = mes === 1 ? ano - 1 : ano

  const [dados, setDados] = useState(null)
  const [diasAtual, setDiasAtual] = useState([])
  const [diasAnterior, setDiasAnterior] = useState([])
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
      setCarregando(false)
      return
    }

    // Insights de tendência/comparativo são "nice to have" — se falharem, a página principal continua de pé.
    try {
      const [atual, anterior] = await Promise.all([
        getReceitasEquipeGerente(mes, ano),
        getReceitasEquipeGerente(mesAnteriorNum, anoAnteriorNum),
      ])
      setDiasAtual(atual.dias ?? [])
      setDiasAnterior(anterior.dias ?? [])
    } catch {
      setDiasAtual([])
      setDiasAnterior([])
    }

    setCarregando(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => { carregar() }, [carregar])

  const diasPorChaveAtual = useMemo(() => new Map(diasAtual.map((d) => [d.dia, d])), [diasAtual])
  const diasPorChaveAnterior = useMemo(() => new Map(diasAnterior.map((d) => [d.dia, d])), [diasAnterior])
  // Combinado: a semana atual pode começar no mês anterior (ex.: hoje é dia 2 e a semana começou dia 29 do mês passado).
  const diasPorChaveCombinado = useMemo(
    () => new Map([...diasPorChaveAnterior, ...diasPorChaveAtual]),
    [diasPorChaveAnterior, diasPorChaveAtual],
  )

  if (carregando && !dados) {
    return (
      <div className="grid place-items-center py-24">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const forecastEquipe = dados ? calcularForecast(dados.totalReceita, dados.meta_equipe, diasDecorridos, diasNoMes, diasRestantes) : null
  const corEquipe = forecastEquipe ? corPorProjecao(forecastEquipe.pctProjetado) : null

  const tendencia = forecastEquipe ? calcularTendencia(diasPorChaveAtual, agora, diasDecorridos, forecastEquipe.ritmoDiario) : null
  const receitaMesmoPeriodoAnterior = calcularReceitaMesmoPeriodoAnterior(diasPorChaveAnterior, mesAnteriorNum, anoAnteriorNum, diasDecorridos)
  const deltaVsMesPassado = dados
    ? (receitaMesmoPeriodoAnterior > 0 ? ((dados.totalReceita - receitaMesmoPeriodoAnterior) / receitaMesmoPeriodoAnterior) * 100 : null)
    : null

  const membrosForecast = (dados?.membros ?? [])
    .map((m) => ({ ...m, ...calcularForecast(m.receita, m.meta, diasDecorridos, diasNoMes, diasRestantes) }))
    .sort((a, b) => b.pctProjetado - a.pctProjetado)

  const forecastSemana = calcularForecastSemana(diasPorChaveCombinado, agora)
  const semanaFuncionarios = calcularForecastSemanaPorFuncionario(diasPorChaveCombinado, forecastSemana.inicioSemanaAtual, forecastSemana.diasDecorridos)
  const fimSemanaAtual = addDias(forecastSemana.inicioSemanaAtual, 6)
  // Essa semana está ajudando ou atrapalhando o fechamento do mês? Compara o ritmo da semana com o ritmo mensal necessário.
  const semanaAjudaMeta = forecastEquipe?.ritmoNecessario !== null && forecastEquipe?.ritmoNecessario !== undefined
    ? forecastSemana.ritmoDiario >= forecastEquipe.ritmoNecessario
    : null

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
            <KpiCard icon={Wallet}     cor="bg-blue-500/10 text-blue-600"     valor={moeda(dados.totalReceita)}            rotulo="Realizado até hoje"
              dica="Quanto a equipe já vendeu (receita) neste mês, do dia 1 até hoje." />
            <KpiCard icon={Gauge}      cor="bg-sky-500/10 text-sky-600"       valor={moeda(forecastEquipe.ritmoDiario)}     rotulo="Ritmo diário (média/dia)"
              dica="Média de quanto a equipe vendeu por dia neste mês (receita total até hoje ÷ dias já passados)." />
            <KpiCard icon={TrendingUp} cor="bg-violet-500/10 text-violet-600" valor={moeda(forecastEquipe.projecao)}        rotulo="Projeção de fechamento"
              dica="Se a equipe mantiver esse mesmo ritmo diário até o fim do mês, é esse o total que deve fechar." />
            <KpiCard icon={Target}     cor="bg-indigo-500/10 text-indigo-600" valor={moeda(dados.meta_equipe)}              rotulo="Meta da equipe"
              dica="Quanto a equipe precisa vender no mês inteiro para bater a meta." />
          </div>

          {/* Card de destaque: % projetado da meta + ritmo necessário */}
          <Card
            title="Compara a projeção de fechamento com a meta do mês. Acima de 100% quer dizer que, no ritmo atual, a equipe deve ultrapassar a meta."
            className="cursor-help"
          >
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
                  {forecastEquipe.ritmoNecessario !== null && forecastEquipe.faltante > 0 && (
                    <> · precisa manter <span className="font-semibold text-foreground">{moeda(forecastEquipe.ritmoNecessario)}/dia</span> pra bater a meta</>
                  )}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Insights: tendência recente e comparativo com o mês passado */}
          <div className="grid gap-4 sm:grid-cols-2">
            {tendencia && tendencia.variacao !== null ? (
              <InsightCard
                icon={tendencia.variacao > 10 ? TrendingUp : tendencia.variacao < -10 ? TrendingDown : Minus}
                cor={tendencia.variacao > 10 ? 'text-emerald-600' : tendencia.variacao < -10 ? 'text-red-500' : 'text-muted-foreground'}
                bg={tendencia.variacao > 10 ? 'bg-emerald-500/10' : tendencia.variacao < -10 ? 'bg-red-500/10' : 'bg-muted'}
                titulo={`Tendência — últimos ${tendencia.janela} dia${tendencia.janela === 1 ? '' : 's'}`}
                valor={`${moeda(tendencia.ritmoRecente)}/dia`}
                descricao={
                  tendencia.variacao > 10
                    ? `Acelerando: ${pct(tendencia.variacao)} vs a média do mês`
                    : tendencia.variacao < -10
                      ? `Desacelerando: ${pct(tendencia.variacao)} vs a média do mês`
                      : `Estável — próximo da média do mês (${pct(tendencia.variacao)})`
                }
                dica="Compara quanto a equipe vendeu por dia nos últimos dias com a média de todo o mês — mostra se o time está vendendo mais rápido ou mais devagar do que vinha vendendo."
              />
            ) : (
              <InsightCard icon={Minus} cor="text-muted-foreground" bg="bg-muted" titulo="Tendência recente" valor="—" descricao="Sem dados suficientes ainda."
                dica="Compara quanto a equipe vendeu por dia nos últimos dias com a média de todo o mês." />
            )}

            <InsightCard
              icon={History}
              cor={deltaVsMesPassado === null ? 'text-muted-foreground' : deltaVsMesPassado >= 0 ? 'text-emerald-600' : 'text-red-500'}
              bg={deltaVsMesPassado === null ? 'bg-muted' : deltaVsMesPassado >= 0 ? 'bg-emerald-500/10' : 'bg-red-500/10'}
              titulo={`vs mesmo período de ${MESES[mesAnteriorNum - 1]}`}
              valor={deltaVsMesPassado === null ? '—' : pct(deltaVsMesPassado)}
              descricao={
                receitaMesmoPeriodoAnterior > 0
                  ? `Até o dia ${diasDecorridos}: ${moeda(dados.totalReceita)} vs ${moeda(receitaMesmoPeriodoAnterior)}`
                  : 'Sem dados do mês anterior para comparar.'
              }
              dica="Compara o quanto a equipe já vendeu este mês (até hoje) com o quanto tinha vendido no mesmo dia do mês passado."
            />
          </div>

          {/* ===================== FORECAST DA SEMANA ===================== */}
          <div className="space-y-4 border-t pt-6">
            <div>
              <h2 className="text-lg font-semibold tracking-tight">Forecast da Semana</h2>
              <p className="text-sm text-muted-foreground">
                Semana de {fmt.diaMes.format(forecastSemana.inicioSemanaAtual)} a {fmt.diaMes.format(fimSemanaAtual)} — sem meta semanal própria, então a leitura aqui é sempre relativa (semana passada e ritmo necessário do mês).
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <KpiCard icon={Wallet}        cor="bg-blue-500/10 text-blue-600"     valor={moeda(forecastSemana.realizado)}  rotulo="Realizado na semana"
                dica="Quanto a equipe já vendeu (receita) nesta semana, de domingo até hoje." />
              <KpiCard icon={Gauge}         cor="bg-sky-500/10 text-sky-600"       valor={moeda(forecastSemana.ritmoDiario)} rotulo="Ritmo diário da semana"
                dica="Média de venda por dia dentro desta semana (receita da semana ÷ dias já passados dela)." />
              <KpiCard icon={CalendarRange} cor="bg-violet-500/10 text-violet-600" valor={moeda(forecastSemana.projecao)}    rotulo="Projeção de fechamento da semana"
                dica="Se a equipe mantiver o ritmo diário desta semana até sábado, é esse o total que a semana deve fechar." />
              <KpiCard
                icon={TrendingUp}
                cor={semanaAjudaMeta === null ? 'bg-muted text-muted-foreground' : semanaAjudaMeta === false ? 'bg-red-500/10 text-red-500' : 'bg-emerald-500/10 text-emerald-600'}
                valor={forecastEquipe?.ritmoNecessario !== null && forecastEquipe?.ritmoNecessario !== undefined ? moeda(forecastEquipe.ritmoNecessario) : '—'}
                rotulo="Ritmo necessário do mês (referência)"
                dica="Quanto a equipe precisa vender por dia, nos dias que restam do mês inteiro, para bater a meta mensal — não é sobre a semana, é uma referência pra comparar com o ritmo da semana."
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <InsightCard
                icon={History}
                cor={forecastSemana.deltaVsSemanaPassada === null ? 'text-muted-foreground' : forecastSemana.deltaVsSemanaPassada >= 0 ? 'text-emerald-600' : 'text-red-500'}
                bg={forecastSemana.deltaVsSemanaPassada === null ? 'bg-muted' : forecastSemana.deltaVsSemanaPassada >= 0 ? 'bg-emerald-500/10' : 'bg-red-500/10'}
                titulo="vs semana passada (mesmo corte de dias)"
                valor={forecastSemana.deltaVsSemanaPassada === null ? '—' : pct(forecastSemana.deltaVsSemanaPassada)}
                descricao={
                  forecastSemana.realizadoSemanaPassada > 0
                    ? `${moeda(forecastSemana.realizado)} vs ${moeda(forecastSemana.realizadoSemanaPassada)} até o mesmo dia`
                    : 'Sem dados da semana passada para comparar.'
                }
                dica="Compara o quanto a equipe já vendeu nesta semana (de domingo até hoje) com o quanto tinha vendido na semana passada, contando até o mesmo dia da semana."
              />
              <InsightCard
                icon={Target}
                cor={semanaAjudaMeta === null ? 'text-muted-foreground' : semanaAjudaMeta ? 'text-emerald-600' : 'text-amber-600'}
                bg={semanaAjudaMeta === null ? 'bg-muted' : semanaAjudaMeta ? 'bg-emerald-500/10' : 'bg-amber-500/10'}
                titulo="Essa semana está ajudando a bater a meta do mês?"
                valor={semanaAjudaMeta === null ? '—' : semanaAjudaMeta ? 'Sim' : 'Não'}
                descricao={
                  semanaAjudaMeta === null
                    ? 'Mês em fase final — sem margem de dias pra recalcular o ritmo necessário.'
                    : `Ritmo da semana: ${moeda(forecastSemana.ritmoDiario)}/dia vs necessário: ${moeda(forecastEquipe.ritmoNecessario)}/dia`
                }
                dica="Se o ritmo diário desta semana for igual ou maior que o ritmo diário que falta pra bater a meta do mês, essa semana está no caminho certo. Se for menor, essa semana sozinha não seria suficiente."
              />
            </div>

            {semanaFuncionarios.length > 0 && (
              <Card className="overflow-hidden">
                <CardHeader className="border-b bg-muted/30">
                  <CardTitle>Receita da Semana por Funcionário</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-xs text-muted-foreground">
                          <th className="px-4 py-2 text-left font-medium">#</th>
                          <th className="px-4 py-2 text-left font-medium">Funcionário</th>
                          <th className="px-4 py-2 text-right font-medium cursor-help" title="Quanto esse funcionário vendeu nesta semana, de domingo até hoje.">Receita na Semana</th>
                          <th className="px-4 py-2 text-right font-medium cursor-help" title="Média de venda por dia desse funcionário dentro desta semana.">Ritmo Diário</th>
                        </tr>
                      </thead>
                      <tbody>
                        {semanaFuncionarios.map((v, i) => (
                          <tr key={v.vendedorId} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                            <td className="px-4 py-2.5">
                              <Badge variant={i === 0 ? 'default' : 'outline'} className="w-6 h-6 flex items-center justify-center p-0 text-xs">{i + 1}</Badge>
                            </td>
                            <td className="px-4 py-2.5 font-medium">{v.nome}</td>
                            <td className="px-4 py-2.5 text-right text-primary font-semibold">{moeda(v.receita)}</td>
                            <td className="px-4 py-2.5 text-right text-muted-foreground">{moeda(v.ritmoDiario)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

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
                        <th className="px-4 py-2 text-right font-medium cursor-help" title="Quanto esse funcionário já vendeu neste mês, até hoje.">Realizado</th>
                        <th className="px-4 py-2 text-right font-medium cursor-help" title="Meta mensal desse funcionário.">Meta</th>
                        <th className="px-4 py-2 text-right font-medium cursor-help" title="Média de venda por dia desse funcionário neste mês (até hoje).">Ritmo Diário</th>
                        <th className="px-4 py-2 text-right font-medium cursor-help" title="Quanto esse funcionário precisa vender por dia, no que resta do mês, para bater a própria meta.">Ritmo Necessário</th>
                        <th className="px-4 py-2 text-right font-medium cursor-help" title="Se ele mantiver o ritmo diário atual até o fim do mês, é esse o total que deve fechar.">Projeção</th>
                        <th className="px-4 py-2 text-right font-medium cursor-help" title="Quanto a projeção de fechamento representa da meta dele (100% = bate a meta certinho).">% Projetado</th>
                        <th className="px-4 py-2 text-left font-medium cursor-help" title="Resumo visual do % projetado: verde = vai bater a meta, amarelo = perto, vermelho = abaixo.">Situação</th>
                      </tr>
                    </thead>
                    <tbody>
                      {membrosForecast.map((m, i) => {
                        const cor = corPorProjecao(m.pctProjetado)
                        const precisaAcelerar = m.ritmoNecessario !== null && m.ritmoNecessario > m.ritmoDiario
                        return (
                          <tr key={m.vendedorId} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                            <td className="px-4 py-2.5">
                              <Badge variant={i === 0 ? 'default' : 'outline'} className="w-6 h-6 flex items-center justify-center p-0 text-xs">{i + 1}</Badge>
                            </td>
                            <td className="px-4 py-2.5 font-medium">{m.nome}</td>
                            <td className="px-4 py-2.5 text-right text-primary font-semibold">{moeda(m.receita)}</td>
                            <td className="px-4 py-2.5 text-right text-muted-foreground">{m.meta > 0 ? moeda(m.meta) : '—'}</td>
                            <td className="px-4 py-2.5 text-right text-muted-foreground">{moeda(m.ritmoDiario)}</td>
                            <td className="px-4 py-2.5 text-right">
                              {m.meta === 0 ? '—' : m.faltante === 0 ? (
                                <span className="text-emerald-600 font-medium">meta batida</span>
                              ) : m.ritmoNecessario === null ? '—' : (
                                <span className={cn('inline-flex items-center gap-1', precisaAcelerar && 'text-amber-600 font-medium')}>
                                  {precisaAcelerar && <Flame className="size-3.5" />}
                                  {moeda(m.ritmoNecessario)}
                                </span>
                              )}
                            </td>
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
