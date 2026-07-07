import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { buscarCliente } from '@/api/modules/clientes'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ChartContainer, CORES_GRAFICO } from '@/components/ui/chart'
import PageHeader from '@/components/layout/PageHeader'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from 'recharts'
import {
  Wallet, TrendingUp, BarChart3, Percent, Calendar, CalendarDays,
  Building2, MapPin, Phone, Mail, FileText, ArrowLeft, AlertCircle, Loader2,
} from 'lucide-react'

const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

function moeda(v) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2,
  }).format(v ?? 0)
}
function numero(v) {
  return new Intl.NumberFormat('pt-BR').format(v ?? 0)
}
function dataLonga(v) {
  if (!v) return '—'
  return new Date(v).toLocaleDateString('pt-BR')
}

function KpiCard({ icon: Icon, cor, valor, rotulo }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 py-4">
        <div className={`grid size-10 place-items-center rounded-lg ${cor}`}>
          <Icon className="size-5" />
        </div>
        <div>
          <p className="text-xl font-semibold leading-tight">{valor}</p>
          <p className="text-xs text-muted-foreground">{rotulo}</p>
        </div>
      </CardContent>
    </Card>
  )
}

function Campo({ icon: Icon, label, children }) {
  return (
    <div className="flex items-start gap-2">
      {Icon && <Icon className="size-4 shrink-0 text-muted-foreground mt-0.5" />}
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium break-words">{children || '—'}</p>
      </div>
    </div>
  )
}

function TooltipReceita({ active, payload }) {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload
  return (
    <div className="rounded-xl border bg-background px-3.5 py-2.5 text-sm shadow-xl space-y-1">
      <p className="font-semibold text-foreground">{MESES[(d.mes ?? 1) - 1]} / {d.ano}</p>
      <p className="text-primary font-medium">{moeda(d.receita)}</p>
    </div>
  )
}

export default function ClienteDetalhe() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [dados, setDados] = useState(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')

  const carregar = useCallback(async () => {
    setErro('')
    setCarregando(true)
    try {
      setDados(await buscarCliente(id))
    } catch (e) {
      if (e.response?.status === 404) setErro('Cliente não encontrado ou sem acesso.')
      else setErro('Erro ao carregar o cliente. Tente novamente.')
    } finally {
      setCarregando(false)
    }
  }, [id])

  useEffect(() => { carregar() }, [carregar])

  if (carregando) {
    return (
      <div className="grid place-items-center py-24">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (erro || !dados) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => navigate('/clientes')}>
          <ArrowLeft className="size-4" /> Voltar
        </Button>
        <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="size-4 shrink-0" />
          {erro || 'Cliente não encontrado.'}
        </div>
      </div>
    )
  }

  const { cliente, metricas } = dados
  const end = cliente.endereco ?? {}
  const enderecoLinha = [
    [end.logradouro, end.numero].filter(Boolean).join(', '),
    end.complemento, end.bairro,
    [end.cidade, end.uf].filter(Boolean).join('/'),
    end.cep,
  ].filter(Boolean).join(' · ')

  const produtos = [
    cliente.produtos?.virtual && 'Virtual',
    cliente.produtos?.cartao && 'Cartão',
    cliente.produtos?.bancario && 'Bancário',
  ].filter(Boolean)

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" className="gap-1.5 -mb-2" onClick={() => navigate('/clientes')}>
        <ArrowLeft className="size-4" /> Voltar para Meus Clientes
      </Button>

      <PageHeader
        title={cliente.nome}
        subtitle={cliente.cnpj ? `CNPJ ${cliente.cnpj}` : 'Ficha do cliente'}
      >
        {cliente.segmento && <Badge variant="outline">{cliente.segmento}</Badge>}
      </PageHeader>

      {/* KPIs de receita */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard icon={Wallet}     cor="bg-blue-500/10 text-blue-600"      valor={moeda(metricas.receitaTotal)} rotulo="Receita total gerada" />
        <KpiCard icon={TrendingUp} cor="bg-sky-500/10 text-sky-600"        valor={moeda(metricas.tpvTotal)}     rotulo="TPV total" />
        <KpiCard icon={BarChart3}  cor="bg-amber-500/10 text-amber-600"    valor={numero(metricas.qtdTickets)}  rotulo="Transações" />
        <KpiCard icon={Wallet}     cor="bg-violet-500/10 text-violet-600"  valor={moeda(metricas.ticketMedio)}  rotulo="Ticket médio" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard icon={Percent}     cor="bg-orange-500/10 text-orange-600"  valor={`${(metricas.taxaMedia ?? 0).toFixed(3)}%`} rotulo="Taxa média" />
        <KpiCard icon={Wallet}      cor="bg-emerald-500/10 text-emerald-600" valor={moeda(metricas.receitaAno)}  rotulo="Receita no ano" />
        <KpiCard icon={Wallet}      cor="bg-pink-500/10 text-pink-600"       valor={moeda(metricas.receitaMes)}  rotulo="Receita no mês" />
        <KpiCard icon={CalendarDays} cor="bg-teal-500/10 text-teal-600"      valor={dataLonga(metricas.primeiroTicket)} rotulo="Cliente ativo desde" />
      </div>

      {/* Ficha + Evolução */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Ficha cadastral */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Building2 className="size-4 text-muted-foreground" /> Ficha Cadastral</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Campo icon={Building2} label="Razão social">{cliente.nome}</Campo>
            {cliente.nomeComercial && cliente.nomeComercial !== cliente.nome && (
              <Campo label="Nome comercial">{cliente.nomeComercial}</Campo>
            )}
            <Campo icon={FileText} label="CNPJ">{cliente.cnpj}</Campo>
            <div className="grid grid-cols-2 gap-3">
              <Campo label="Inscr. estadual">{cliente.inscricaoEstadual}</Campo>
              <Campo label="Inscr. municipal">{cliente.inscricaoMunicipal}</Campo>
            </div>
            <Campo icon={MapPin} label="Endereço">{enderecoLinha}</Campo>
            <Campo icon={Phone} label="Contato / Telefone">
              {[cliente.contato, cliente.telefone].filter(Boolean).join(' · ')}
            </Campo>
            <Campo icon={Mail} label="E-mail">{cliente.email}</Campo>
            <div className="grid grid-cols-2 gap-3">
              <Campo label="Produtos">{produtos.length ? produtos.join(', ') : '—'}</Campo>
              <Campo label="Contrato">{cliente.contrato}</Campo>
            </div>
            <Campo icon={Calendar} label="Cadastrado em">{dataLonga(cliente.criadoEm)}</Campo>
          </CardContent>
        </Card>

        {/* Evolução de receita */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Evolução de Receita — últimos 12 meses</CardTitle>
          </CardHeader>
          <CardContent>
            {(!metricas.evolucao || metricas.evolucao.length === 0) ? (
              <p className="py-16 text-center text-sm text-muted-foreground">Sem transações registradas no período.</p>
            ) : (
              <ChartContainer className="h-72">
                <BarChart data={metricas.evolucao} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradCliente" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={CORES_GRAFICO[0]} stopOpacity={1} />
                      <stop offset="100%" stopColor={CORES_GRAFICO[0]} stopOpacity={0.7} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="currentColor" className="stroke-border/30" />
                  <XAxis dataKey="mes" tickFormatter={m => MESES[m - 1]} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis tickFormatter={v => moeda(v)} tick={{ fontSize: 11 }} width={110} tickLine={false} axisLine={false} />
                  <Tooltip content={<TooltipReceita />} cursor={{ fill: 'currentColor', className: 'fill-muted/40' }} />
                  <Bar dataKey="receita" radius={[5, 5, 0, 0]}>
                    {metricas.evolucao.map((_, i) => (<Cell key={i} fill="url(#gradCliente)" />))}
                  </Bar>
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
