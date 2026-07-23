import { useState, useEffect, useCallback, useMemo } from 'react'
import { getMeuResumo, getVisaoGeral } from '@/api/modules/metricas'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import PageHeader from '@/components/layout/PageHeader'
import { KpiCard, InsightCard } from '@/components/metricas/ForecastCards'
import { cn } from '@/lib/utils'
import { addDias, fmt } from '@/lib/datas'
import {
  calcularForecast, calcularTendencia, calcularReceitaMesmoPeriodoAnterior,
  calcularForecastSemana, corPorProjecao,
} from '@/lib/forecast'
import {
  Wallet, TrendingUp, TrendingDown, Minus, Target, Gauge, History,
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

/**
 * Forecast pessoal — mesma lógica e os mesmos cards de `ForecastIS.jsx` (o
 * forecast do gerente), só que escopados no vendedor logado, via os mesmos
 * endpoints individuais que o Dashboard Pessoal já usa (`getMeuResumo`,
 * `getVisaoGeral`). Sem tabela de ranking, porque aqui é uma pessoa só.
 */
export default function ForecastPessoal() {
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
      setDados(await getMeuResumo(mes, ano))
    } catch (e) {
      if (e.response?.status === 404) setErro('Você não possui métricas cadastradas no banco de produção.')
      else setErro('Erro ao carregar o forecast. Tente novamente.')
      setCarregando(false)
      return
    }

    // Insights de tendência/comparativo são "nice to have" — se falharem, a página principal continua de pé.
    try {
      const [atual, anterior] = await Promise.all([
        getVisaoGeral(mes, ano),
        getVisaoGeral(mesAnteriorNum, anoAnteriorNum),
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

  const forecastMes = dados ? calcularForecast(dados.mesAtual.receita, dados.mesAtual.meta, diasDecorridos, diasNoMes, diasRestantes) : null
  const corMes = forecastMes ? corPorProjecao(forecastMes.pctProjetado) : null

  const tendencia = forecastMes ? calcularTendencia(diasPorChaveAtual, agora, diasDecorridos, forecastMes.ritmoDiario) : null
  const receitaMesmoPeriodoAnterior = calcularReceitaMesmoPeriodoAnterior(diasPorChaveAnterior, mesAnteriorNum, anoAnteriorNum, diasDecorridos)
  const deltaVsMesPassado = dados
    ? (receitaMesmoPeriodoAnterior > 0 ? ((dados.mesAtual.receita - receitaMesmoPeriodoAnterior) / receitaMesmoPeriodoAnterior) * 100 : null)
    : null

  const forecastSemana = calcularForecastSemana(diasPorChaveCombinado, agora)
  const fimSemanaAtual = addDias(forecastSemana.inicioSemanaAtual, 6)
  // Essa semana está ajudando ou atrapalhando o fechamento do mês? Compara o ritmo da semana com o ritmo mensal necessário.
  const semanaAjudaMeta = forecastMes?.ritmoNecessario !== null && forecastMes?.ritmoNecessario !== undefined
    ? forecastSemana.ritmoDiario >= forecastMes.ritmoNecessario
    : null

  return (
    <div className="space-y-6">
      <PageHeader
        title="Meu Forecast"
        subtitle={`Projeção de fechamento de ${MESES[mes - 1]}/${ano} com base no seu ritmo atual`}
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

      {dados && forecastMes && (
        <>
          {/* KPIs do mês */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard icon={Wallet}     cor="bg-blue-500/10 text-blue-600"     valor={moeda(dados.mesAtual.receita)}  rotulo="Realizado até hoje"
              dica="Quanto você já vendeu (receita) neste mês, do dia 1 até hoje." />
            <KpiCard icon={Gauge}      cor="bg-sky-500/10 text-sky-600"       valor={moeda(forecastMes.ritmoDiario)} rotulo="Ritmo diário (média/dia)"
              dica="Média de quanto você vendeu por dia neste mês (receita total até hoje ÷ dias já passados)." />
            <KpiCard icon={TrendingUp} cor="bg-violet-500/10 text-violet-600" valor={moeda(forecastMes.projecao)}    rotulo="Projeção de fechamento"
              dica="Se você mantiver esse mesmo ritmo diário até o fim do mês, é esse o total que deve fechar." />
            <KpiCard icon={Target}     cor="bg-indigo-500/10 text-indigo-600" valor={moeda(dados.mesAtual.meta)}     rotulo="Sua meta"
              dica="Quanto você precisa vender no mês inteiro para bater a sua meta." />
          </div>

          {/* Card de destaque: % projetado da meta + ritmo necessário */}
          <Card
            title="Compara a sua projeção de fechamento com a sua meta do mês. Acima de 100% quer dizer que, no ritmo atual, você deve ultrapassar a meta."
            className="cursor-help"
          >
            <CardContent className="flex items-center gap-4 py-4 px-5">
              <div className={cn('grid size-10 shrink-0 place-items-center rounded-lg', corMes.bg, corMes.texto)}>
                <Target className="size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                  <p className="text-lg font-bold">
                    {forecastMes.pctProjetado.toFixed(1)}% da meta projetada · <span className={corMes.texto}>{corMes.label}</span>
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {forecastMes.gap <= 0
                      ? `supera a meta em ${moeda(Math.abs(forecastMes.gap))}`
                      : `projeção fica ${moeda(forecastMes.gap)} abaixo da meta`}
                  </p>
                </div>
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn('h-full rounded-full transition-all', corMes.barra)}
                    style={{ width: `${Math.min(forecastMes.pctProjetado, 100)}%` }}
                  />
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Dia {diasDecorridos} de {diasNoMes} do mês · {diasRestantes} dia{diasRestantes === 1 ? '' : 's'} restante{diasRestantes === 1 ? '' : 's'}
                  {forecastMes.ritmoNecessario !== null && forecastMes.faltante > 0 && (
                    <> · precisa manter <span className="font-semibold text-foreground">{moeda(forecastMes.ritmoNecessario)}/dia</span> pra bater a meta</>
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
                    ? `Acelerando: ${pct(tendencia.variacao)} vs a sua média do mês`
                    : tendencia.variacao < -10
                      ? `Desacelerando: ${pct(tendencia.variacao)} vs a sua média do mês`
                      : `Estável — próximo da sua média do mês (${pct(tendencia.variacao)})`
                }
                dica="Compara quanto você vendeu por dia nos últimos dias com a sua média de todo o mês — mostra se você está vendendo mais rápido ou mais devagar do que vinha vendendo."
              />
            ) : (
              <InsightCard icon={Minus} cor="text-muted-foreground" bg="bg-muted" titulo="Tendência recente" valor="—" descricao="Sem dados suficientes ainda."
                dica="Compara quanto você vendeu por dia nos últimos dias com a sua média de todo o mês." />
            )}

            <InsightCard
              icon={History}
              cor={deltaVsMesPassado === null ? 'text-muted-foreground' : deltaVsMesPassado >= 0 ? 'text-emerald-600' : 'text-red-500'}
              bg={deltaVsMesPassado === null ? 'bg-muted' : deltaVsMesPassado >= 0 ? 'bg-emerald-500/10' : 'bg-red-500/10'}
              titulo={`vs mesmo período de ${MESES[mesAnteriorNum - 1]}`}
              valor={deltaVsMesPassado === null ? '—' : pct(deltaVsMesPassado)}
              descricao={
                receitaMesmoPeriodoAnterior > 0
                  ? `Até o dia ${diasDecorridos}: ${moeda(dados.mesAtual.receita)} vs ${moeda(receitaMesmoPeriodoAnterior)}`
                  : 'Sem dados do mês anterior para comparar.'
              }
              dica="Compara o quanto você já vendeu este mês (até hoje) com o quanto tinha vendido no mesmo dia do mês passado."
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
                dica="Quanto você já vendeu (receita) nesta semana, de domingo até hoje." />
              <KpiCard icon={Gauge}         cor="bg-sky-500/10 text-sky-600"       valor={moeda(forecastSemana.ritmoDiario)} rotulo="Ritmo diário da semana"
                dica="Média de venda por dia dentro desta semana (receita da semana ÷ dias já passados dela)." />
              <KpiCard icon={CalendarRange} cor="bg-violet-500/10 text-violet-600" valor={moeda(forecastSemana.projecao)}    rotulo="Projeção de fechamento da semana"
                dica="Se você mantiver o ritmo diário desta semana até sábado, é esse o total que a semana deve fechar." />
              <KpiCard
                icon={TrendingUp}
                cor={semanaAjudaMeta === null ? 'bg-muted text-muted-foreground' : semanaAjudaMeta === false ? 'bg-red-500/10 text-red-500' : 'bg-emerald-500/10 text-emerald-600'}
                valor={forecastMes?.ritmoNecessario !== null && forecastMes?.ritmoNecessario !== undefined ? moeda(forecastMes.ritmoNecessario) : '—'}
                rotulo="Ritmo necessário do mês (referência)"
                dica="Quanto você precisa vender por dia, nos dias que restam do mês inteiro, para bater a sua meta mensal — não é sobre a semana, é uma referência pra comparar com o ritmo da semana."
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
                dica="Compara o quanto você já vendeu nesta semana (de domingo até hoje) com o quanto tinha vendido na semana passada, contando até o mesmo dia da semana."
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
                    : `Ritmo da semana: ${moeda(forecastSemana.ritmoDiario)}/dia vs necessário: ${moeda(forecastMes.ritmoNecessario)}/dia`
                }
                dica="Se o ritmo diário desta semana for igual ou maior que o ritmo diário que falta pra bater a meta do mês, essa semana está no caminho certo. Se for menor, essa semana sozinha não seria suficiente."
              />
            </div>
          </div>
        </>
      )}
    </div>
  )
}
