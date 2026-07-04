import { useState, useEffect, useCallback } from 'react'
import { getMeuResumo } from '@/api/modules/prevendas'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import PageHeader from '@/components/layout/PageHeader'
import {
  Calendar, CalendarCheck, CheckCircle2, Phone, Target, Percent, Award,
  AlertCircle, Loader2, RefreshCw, ChevronLeft, ChevronRight,
} from 'lucide-react'

const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

function numero(v) {
  return new Intl.NumberFormat('pt-BR').format(v ?? 0)
}

function pct(v) {
  if (v == null) return '—'
  return `${v.toFixed(1)}%`
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

export default function DashboardPreVendas() {
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
      const resumo = await getMeuResumo(mes, ano)
      setDados(resumo)
    } catch (e) {
      if (e.response?.status === 404)
        setErro('Usuário não encontrado ou bloqueado. Contate o T.I.')
      else if (e.response?.status === 403)
        setErro('Seu cargo não tem acesso às métricas de Pré-Vendas.')
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
        title="Pré-Vendas — Dashboard Pessoal"
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

      {dados && (
        <>
          {/* Strip de Meta */}
          <Card className="border-l-4 border-l-primary">
            <CardContent className="py-3 px-5">
              <div className="flex flex-wrap items-center gap-8">
                <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  Meta do mês
                </span>
                <div>
                  <p className="text-xs text-muted-foreground">Meta (reuniões)</p>
                  <p className="font-bold">{numero(dados.meta)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Realizadas</p>
                  <p className="font-bold text-primary">{numero(dados.realizadas)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">% atingido</p>
                  <p className="font-bold">{pct(dados.pctMeta)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Falta para bater</p>
                  <p className="font-bold text-amber-600">{numero(dados.faltaParaBater)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Multiplicador</p>
                  <p className="font-bold text-emerald-600">
                    {Math.round((dados.multiplicador ?? 0) * 100)}%
                    <span className="ml-1 text-xs font-normal text-muted-foreground">({dados.faixaMulti})</span>
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* KPIs de atividade */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard icon={Calendar}      cor="bg-blue-500/10 text-blue-600"     valor={numero(dados.agendadas)}    rotulo="Reuniões agendadas" />
            <KpiCard icon={CalendarCheck} cor="bg-sky-500/10 text-sky-600"       valor={numero(dados.realizadas)}   rotulo="Reuniões realizadas" />
            <KpiCard icon={CheckCircle2}  cor="bg-emerald-500/10 text-emerald-600" valor={numero(dados.qualificadas)} rotulo="Reuniões qualificadas" />
            <KpiCard icon={Phone}         cor="bg-violet-500/10 text-violet-600" valor={numero(dados.ligacoes)}     rotulo="Ligações realizadas" />
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard icon={Percent} cor="bg-orange-500/10 text-orange-600" valor={pct(dados.taxaConversao)}                       rotulo="Taxa de conversão" />
            <KpiCard icon={Target}  cor="bg-indigo-500/10 text-indigo-600" valor={numero(dados.meta)}                             rotulo="Meta de reuniões" />
            <KpiCard icon={Award}   cor="bg-pink-500/10 text-pink-600"     valor={`${Math.round((dados.multiplicador ?? 0) * 100)}%`} rotulo="Multiplicador de bônus" />
            <KpiCard icon={Target}  cor="bg-amber-500/10 text-amber-600"   valor={pct(dados.pctMeta)}                             rotulo="% da meta atingido" />
          </div>
        </>
      )}
    </div>
  )
}
