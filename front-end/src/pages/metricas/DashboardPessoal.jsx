import { useState, useEffect, useCallback } from 'react'
import { getMeuResumo, getTopClientes } from '@/api/modules/metricas'
import { useAuth } from '@/auth/auth-context'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { TrendingUp, Users, Wallet, BarChart3, ChevronLeft, ChevronRight, AlertCircle, FlaskConical } from 'lucide-react'

const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

function fmt(valor) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(valor)
}
function fmtK(valor) {
  if (valor >= 1_000_000) return `R$ ${(valor / 1_000_000).toFixed(1)}M`
  if (valor >= 1_000) return `R$ ${(valor / 1_000).toFixed(0)}K`
  return fmt(valor)
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

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-background border rounded-lg shadow-md px-3 py-2 text-sm">
      <p className="font-semibold mb-1">{MESES[Number(label) - 1]}</p>
      <p className="text-primary">{fmt(payload[0].value)}</p>
    </div>
  )
}

export default function DashboardPessoal() {
  const { usuario } = useAuth()
  const isDesenvolvedor = usuario?.role === 'DESENVOLVEDOR'

  const agora = new Date()
  const [mes, setMes] = useState(agora.getMonth() + 1)
  const [ano, setAno] = useState(agora.getFullYear())
  const [dados, setDados] = useState(null)
  const [clientes, setClientes] = useState([])
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState(null)
  const [testEmail, setTestEmail] = useState('andrecamargo@bluepaysolutions.com.br')
  const [testEmailInput, setTestEmailInput] = useState('andrecamargo@bluepaysolutions.com.br')

  const carregar = useCallback(async () => {
    setLoading(true)
    setErro(null)
    try {
      const email = isDesenvolvedor ? testEmail : undefined
      const [resumo, tops] = await Promise.all([
        getMeuResumo(mes, ano, email),
        getTopClientes(mes, ano, 10, email),
      ])
      setDados(resumo)
      setClientes(tops)
    } catch (e) {
      if (e.response?.status === 404) {
        setErro(isDesenvolvedor
          ? 'Email de teste não encontrado no banco de produção. Use um email válido de vendedor.'
          : 'Você não possui métricas cadastradas no banco de produção.')
      } else {
        setErro('Erro ao carregar métricas. Tente novamente.')
      }
    } finally {
      setLoading(false)
    }
  }, [mes, ano, testEmail, isDesenvolvedor])

  useEffect(() => { carregar() }, [carregar])

  function mudarMes(delta) {
    let m = mes + delta
    let a = ano
    if (m > 12) { m = 1; a++ }
    if (m < 1)  { m = 12; a-- }
    setMes(m)
    setAno(a)
  }

  const dadosCarregados = !loading && !erro && dados
  const { nome, mesAtual, hoje, historico } = dadosCarregados
    ? dados
    : { nome: null, mesAtual: null, hoje: null, historico: [] }
  const chartData = historico.map(h => ({ mes: h.mes, receita: h.receita }))

  return (
    <div className="p-6 space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard Pessoal</h1>
          {nome && <p className="text-sm text-muted-foreground mt-0.5">Olá, {nome} 👋</p>}
        </div>

        {/* Seletor de período */}
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

      {/* Painel de simulação — visível só para DESENVOLVEDOR */}
      {isDesenvolvedor && (
        <Card className="border border-amber-300 bg-amber-50 dark:bg-amber-950/20">
          <CardContent className="py-3 px-5">
            <div className="flex items-center gap-3 flex-wrap">
              <FlaskConical className="h-4 w-4 text-amber-600 shrink-0" />
              <span className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wide">Modo Dev</span>
              <input
                type="email"
                value={testEmailInput}
                onChange={e => setTestEmailInput(e.target.value)}
                placeholder="email@bluepaysolutions.com.br"
                className="flex-1 min-w-[260px] text-sm border border-amber-300 rounded px-2 py-1 bg-white dark:bg-background"
              />
              <button
                onClick={() => setTestEmail(testEmailInput)}
                className="text-xs font-semibold bg-amber-500 hover:bg-amber-600 text-white px-3 py-1 rounded transition-colors"
              >
                Simular
              </button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loading */}
      {loading && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28" />)}
          </div>
          <Skeleton className="h-64" />
        </div>
      )}

      {/* Erro */}
      {!loading && erro && (
        <div className="flex flex-col items-center justify-center min-h-[30vh] gap-3 text-muted-foreground">
          <AlertCircle className="h-10 w-10" />
          <p className="text-sm font-medium">{erro}</p>
        </div>
      )}

      {/* Dados carregados */}
      {dadosCarregados && (
        <>
          {/* Strip Hoje */}
          <Card className="border-l-4 border-l-primary">
            <CardContent className="py-3 px-5">
              <div className="flex flex-wrap gap-6 items-center">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Hoje</p>
                <div className="flex gap-6">
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
                </div>
              </div>
            </CardContent>
          </Card>

          {/* KPI Cards principais */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard icon={Wallet} label="Receita no Mês" value={fmtK(mesAtual.receita)} color="text-primary" />
            <KpiCard icon={TrendingUp} label="TPV" value={fmtK(mesAtual.tpv)} sub="Volume processado" />
            <KpiCard icon={Users} label="Clientes Ativos" value={mesAtual.clientesAtivos} sub={`${mesAtual.clientesNovos} novos este mês`} />
            <KpiCard icon={BarChart3} label="Tickets" value={mesAtual.qtdTickets} />
          </div>

          {/* KPI Cards secundários */}
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-4 pb-3 text-center">
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Taxa Média</p>
                <p className="text-xl font-bold">{mesAtual.taxaMedia.toFixed(2)}%</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-3 text-center">
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Ticket Médio</p>
                <p className="text-xl font-bold">{fmtK(mesAtual.ticketMedio)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-3 text-center">
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Clientes Novos</p>
                <p className="text-xl font-bold">{mesAtual.clientesNovos}</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Gráfico histórico */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Receita — Últimos 6 Meses</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="mes" tickFormatter={m => MESES[m - 1]} tick={{ fontSize: 11 }} />
                    <YAxis tickFormatter={v => fmtK(v)} tick={{ fontSize: 11 }} width={60} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="receita" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Top clientes */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Top Clientes do Mês</CardTitle>
              </CardHeader>
              <CardContent>
                {clientes.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">Nenhum cliente neste período.</p>
                ) : (
                  <div className="space-y-2">
                    {clientes.slice(0, 8).map((c, i) => (
                      <div key={c.nome} className="flex items-center justify-between text-sm py-1 border-b last:border-0">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs w-6 h-6 flex items-center justify-center p-0 shrink-0">
                            {i + 1}
                          </Badge>
                          <span className="truncate max-w-[160px]">{c.nome}</span>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-semibold text-primary">{fmt(c.receita)}</p>
                          <p className="text-xs text-muted-foreground">{c.qtdTickets} tickets</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}
