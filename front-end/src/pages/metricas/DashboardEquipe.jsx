import { useState, useEffect, useCallback } from 'react'
import { getEquipe } from '@/api/modules/metricas'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { TrendingUp, TrendingDown, Users, Wallet, BarChart3, ChevronLeft, ChevronRight, AlertCircle } from 'lucide-react'

const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

const LABEL_EQUIPE = {
  KAM:           'Equipe KAM',
  INSIGHT_SALES: 'Equipe Insight Sales',
  VENDAS:        'Equipe Vendas',
}

function fmt(valor) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(valor)
}
function fmtK(valor) {
  if (valor >= 1_000_000) return `R$ ${(valor / 1_000_000).toFixed(1)}M`
  if (valor >= 1_000) return `R$ ${(valor / 1_000).toFixed(0)}K`
  return fmt(valor)
}
function variacao(atual, anterior) {
  if (!anterior) return null
  return ((atual - anterior) / anterior) * 100
}

function KpiCard({ icon: Icon, label, value, sub }) {
  return (
    <Card>
      <CardContent className="pt-5 pb-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-1">{label}</p>
            <p className="text-2xl font-bold text-primary">{value}</p>
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

function VariacaoBadge({ pct }) {
  if (pct === null) return null
  const positivo = pct >= 0
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-semibold ${positivo ? 'text-green-600' : 'text-red-500'}`}>
      {positivo ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {Math.abs(pct).toFixed(1)}%
    </span>
  )
}

export default function DashboardEquipe() {
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
      const equipe = await getEquipe(mes, ano)
      setDados(equipe)
    } catch (e) {
      if (e.response?.status === 404) {
        setErro('Nenhum dado de equipe encontrado para este cargo e período.')
      } else {
        setErro('Erro ao carregar métricas da equipe. Tente novamente.')
      }
    } finally {
      setLoading(false)
    }
  }, [mes, ano])

  useEffect(() => { carregar() }, [carregar])

  function mudarMes(delta) {
    let m = mes + delta
    let a = ano
    if (m > 12) { m = 1; a++ }
    if (m < 1)  { m = 12; a-- }
    setMes(m)
    setAno(a)
  }

  if (loading) return (
    <div className="p-6 space-y-6">
      <Skeleton className="h-8 w-64" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28" />)}
      </div>
      <Skeleton className="h-64" />
    </div>
  )

  if (erro) return (
    <div className="p-6 flex flex-col items-center justify-center min-h-[40vh] gap-3 text-muted-foreground">
      <AlertCircle className="h-10 w-10" />
      <p className="text-sm font-medium">{erro}</p>
    </div>
  )

  const { equipe, totalReceita, totalTpv, totalTickets, totalClientesAtivos, mesAnterior, membros } = dados
  const varReceita = variacao(totalReceita, mesAnterior.receita)
  const varTpv = variacao(totalTpv, mesAnterior.tpv)
  const nomeEquipe = LABEL_EQUIPE[equipe] ?? `Equipe ${equipe}`

  return (
    <div className="p-6 space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard Equipe</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{nomeEquipe}</p>
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

      {/* Comparativo mês anterior */}
      <Card className="border-l-4 border-l-primary">
        <CardContent className="py-3 px-5">
          <div className="flex flex-wrap gap-6 items-center">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">vs Mês Anterior</p>
            <div className="flex gap-6">
              <div>
                <p className="text-xs text-muted-foreground">Receita</p>
                <div className="flex items-center gap-1.5">
                  <p className="font-bold">{fmtK(mesAnterior.receita)}</p>
                  <VariacaoBadge pct={varReceita} />
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">TPV</p>
                <div className="flex items-center gap-1.5">
                  <p className="font-bold">{fmtK(mesAnterior.tpv)}</p>
                  <VariacaoBadge pct={varTpv} />
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Tickets</p>
                <p className="font-bold">{mesAnterior.qtdTickets}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPI cards totais */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard icon={Wallet} label="Receita Total" value={fmtK(totalReceita)} />
        <KpiCard icon={TrendingUp} label="TPV Total" value={fmtK(totalTpv)} />
        <KpiCard icon={Users} label="Clientes Ativos" value={totalClientesAtivos} />
        <KpiCard icon={BarChart3} label="Total Tickets" value={totalTickets} />
      </div>

      {/* Ranking da equipe */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">
            Ranking da Equipe — {MESES[mes - 1]}/{ano}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {membros.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhum dado para este período.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground uppercase tracking-wide">
                    <th className="pb-2 pr-4">#</th>
                    <th className="pb-2 pr-4">Vendedor</th>
                    <th className="pb-2 pr-4 text-right">Receita</th>
                    <th className="pb-2 pr-4 text-right">TPV</th>
                    <th className="pb-2 pr-4 text-right">Tickets</th>
                    <th className="pb-2 text-right">Clientes</th>
                  </tr>
                </thead>
                <tbody>
                  {membros.map((m, i) => (
                    <tr key={m.vendedorId} className="border-b last:border-0 hover:bg-muted/40 transition-colors">
                      <td className="py-3 pr-4">
                        <Badge
                          variant={i === 0 ? 'default' : 'outline'}
                          className="w-6 h-6 flex items-center justify-center p-0 text-xs"
                        >
                          {i + 1}
                        </Badge>
                      </td>
                      <td className="py-3 pr-4 font-medium">{m.nome}</td>
                      <td className="py-3 pr-4 text-right font-semibold text-primary">{fmt(m.receita)}</td>
                      <td className="py-3 pr-4 text-right text-muted-foreground">{fmtK(m.tpv)}</td>
                      <td className="py-3 pr-4 text-right">{m.qtdTickets}</td>
                      <td className="py-3 text-right">{m.clientesAtivos}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
