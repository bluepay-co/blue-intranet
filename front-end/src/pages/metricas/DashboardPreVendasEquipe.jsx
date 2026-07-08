import { useState, useEffect, useCallback } from 'react'
import { getEquipe } from '@/api/modules/prevendas'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ChartContainer, CORES_GRAFICO } from '@/components/ui/chart'
import PageHeader from '@/components/layout/PageHeader'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell,
} from 'recharts'
import {
  Calendar, CalendarCheck, CheckCircle2, Phone,
  AlertCircle, Loader2, RefreshCw, ChevronLeft, ChevronRight,
} from 'lucide-react'

const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

const numero = (v) => new Intl.NumberFormat('pt-BR').format(v ?? 0)
const pct = (v) => (v == null ? '—' : `${v.toFixed(1)}%`)

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

function DistribuicaoChart({ titulo, dados }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{titulo}</CardTitle>
      </CardHeader>
      <CardContent>
        {(!dados || dados.length === 0) ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Sem dados neste período.</p>
        ) : (
          <ChartContainer className="h-64">
            <BarChart data={dados} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" horizontal={false} />
              <XAxis type="number" allowDecimals={false} className="text-xs" />
              <YAxis type="category" dataKey="rotulo" width={130} className="text-xs" />
              <Tooltip cursor={{ fill: 'transparent' }} />
              <Bar dataKey="total" radius={[0, 4, 4, 0]}>
                {dados.map((_, i) => (
                  <Cell key={i} fill={CORES_GRAFICO[i % CORES_GRAFICO.length]} />
                ))}
              </Bar>
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}

export default function DashboardPreVendasEquipe() {
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
      const resumo = await getEquipe(mes, ano)
      setDados(resumo)
    } catch (e) {
      if (e.response?.status === 403)
        setErro('Seu cargo não tem acesso ao consolidado de Pré-Vendas.')
      else
        setErro('Erro ao carregar métricas da equipe. Tente novamente.')
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
      <PageHeader title="Pré-Vendas — Dashboard Equipe" subtitle="Consolidado das SDRs">
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
          {/* Totais da equipe */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard icon={Calendar}      cor="bg-blue-500/10 text-blue-600"       valor={numero(dados.totalAgendadas)}    rotulo="Agendadas (equipe)" />
            <KpiCard icon={CalendarCheck} cor="bg-sky-500/10 text-sky-600"         valor={numero(dados.totalRealizadas)}   rotulo="Realizadas (equipe)" />
            <KpiCard icon={CheckCircle2}  cor="bg-emerald-500/10 text-emerald-600" valor={numero(dados.totalQualificadas)} rotulo="Qualificadas (equipe)" />
            <KpiCard icon={Phone}         cor="bg-violet-500/10 text-violet-600"   valor={numero(dados.totalLigacoes)}     rotulo="Ligações (equipe)" />
          </div>

          {/* Ranking por SDR */}
          <Card className="overflow-hidden">
            <CardHeader className="border-b bg-muted/30">
              <CardTitle>Desempenho por SDR</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {dados.sdrs.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  Nenhuma SDR cadastrada com o cargo PRE_VENDAS.
                </p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-xs text-muted-foreground">
                      <th className="px-4 py-2 text-left font-medium">SDR</th>
                      <th className="px-4 py-2 text-right font-medium">Agend.</th>
                      <th className="px-4 py-2 text-right font-medium">Realiz.</th>
                      <th className="px-4 py-2 text-right font-medium">Qualif.</th>
                      <th className="px-4 py-2 text-right font-medium">Ligações</th>
                      <th className="px-4 py-2 text-right font-medium">Meta</th>
                      <th className="px-4 py-2 text-right font-medium">% Meta</th>
                      <th className="px-4 py-2 text-right font-medium">Conv.</th>
                      <th className="px-4 py-2 text-right font-medium">Mult.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dados.sdrs.map((s) => (
                      <tr key={s.sdrId} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-2.5 font-medium">{s.nome}</td>
                        <td className="px-4 py-2.5 text-right">{numero(s.agendadas)}</td>
                        <td className="px-4 py-2.5 text-right text-primary font-semibold">{numero(s.realizadas)}</td>
                        <td className="px-4 py-2.5 text-right">{numero(s.qualificadas)}</td>
                        <td className="px-4 py-2.5 text-right">{numero(s.ligacoes)}</td>
                        <td className="px-4 py-2.5 text-right text-muted-foreground">{numero(s.meta)}</td>
                        <td className="px-4 py-2.5 text-right">{pct(s.pctMeta)}</td>
                        <td className="px-4 py-2.5 text-right text-muted-foreground">{pct(s.taxaConversao)}</td>
                        <td className="px-4 py-2.5 text-right text-emerald-600 font-semibold">
                          {Math.round((s.multiplicador ?? 0) * 100)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>

          {/* Distribuições */}
          <div className="grid gap-4 lg:grid-cols-2">
            <DistribuicaoChart titulo="Reuniões por Vendedor (IS/KAM)" dados={dados.porVendedor} />
            <DistribuicaoChart titulo="Reuniões por Segmento" dados={dados.porSegmento} />
          </div>
        </>
      )}
    </div>
  )
}
