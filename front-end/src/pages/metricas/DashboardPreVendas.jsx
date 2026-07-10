import { useState, useEffect, useCallback, useMemo } from 'react'
import { getMeuResumo, getMinhasReunioes } from '@/api/modules/prevendas'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import PageHeader from '@/components/layout/PageHeader'
import {
  Calendar, CalendarCheck, CheckCircle2, Phone, Target, Percent, Award,
  AlertCircle, Loader2, RefreshCw, ChevronLeft, ChevronRight, Search, X,
} from 'lucide-react'

const STATUS_LABEL = {
  AGENDADA:    { label: 'Agendada',    cls: 'bg-blue-500/10 text-blue-600' },
  REALIZADA:   { label: 'Realizada',   cls: 'bg-sky-500/10 text-sky-600' },
  QUALIFICADA: { label: 'Qualificada', cls: 'bg-emerald-500/10 text-emerald-600' },
}

const selectCls =
  'h-9 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50'

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
  const [reunioes, setReunioes] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')

  // Filtros da tabela de reuniões
  const [busca, setBusca] = useState('')
  const [fVendedor, setFVendedor] = useState('')
  const [fStatus, setFStatus] = useState('')
  const [fSegmento, setFSegmento] = useState('')
  const [fSemana, setFSemana] = useState('')

  const carregar = useCallback(async () => {
    setErro('')
    setCarregando(true)
    try {
      const [resumo, lista] = await Promise.all([
        getMeuResumo(mes, ano),
        getMinhasReunioes(mes, ano),
      ])
      setDados(resumo)
      setReunioes(lista)
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

  const vendedores = useMemo(
    () => [...new Set(reunioes.map((r) => r.vendedorNome).filter(Boolean))].sort(),
    [reunioes],
  )
  const segmentos = useMemo(
    () => [...new Set(reunioes.map((r) => r.segmento).filter(Boolean))].sort(),
    [reunioes],
  )
  const semanas = useMemo(
    () => [...new Set(reunioes.map((r) => r.semana))].sort((a, b) => a - b),
    [reunioes],
  )

  const filtradas = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    return reunioes.filter((r) => {
      if (fVendedor && r.vendedorNome !== fVendedor) return false
      if (fStatus && r.status !== fStatus) return false
      if (fSegmento && r.segmento !== fSegmento) return false
      if (fSemana && r.semana !== Number(fSemana)) return false
      if (termo && !r.empresa?.toLowerCase().includes(termo)) return false
      return true
    })
  }, [reunioes, busca, fVendedor, fStatus, fSegmento, fSemana])

  const temFiltro = busca || fVendedor || fStatus || fSegmento || fSemana
  function limpar() { setBusca(''); setFVendedor(''); setFStatus(''); setFSegmento(''); setFSemana('') }

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

          {/* Tabela de reuniões do mês (estilo planilha) */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
                Reuniões de {MESES[mes - 1]}/{ano}
                <span className="ml-2 font-normal normal-case tracking-normal">({numero(filtradas.length)})</span>
              </h2>
            </div>

            {/* Busca + filtros */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative min-w-[200px] flex-1">
                <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar empresa…" className="h-9 pl-8" />
              </div>
              <select className={selectCls} value={fVendedor} onChange={(e) => setFVendedor(e.target.value)}>
                <option value="">Inside / KAM</option>
                {vendedores.map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
              <select className={selectCls} value={fStatus} onChange={(e) => setFStatus(e.target.value)}>
                <option value="">Status</option>
                <option value="AGENDADA">Agendada</option>
                <option value="REALIZADA">Realizada</option>
                <option value="QUALIFICADA">Qualificada</option>
              </select>
              <select className={selectCls} value={fSegmento} onChange={(e) => setFSegmento(e.target.value)}>
                <option value="">Segmento</option>
                {segmentos.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              <select className={selectCls} value={fSemana} onChange={(e) => setFSemana(e.target.value)}>
                <option value="">Período</option>
                {semanas.map((s) => <option key={s} value={s}>Semana {s}</option>)}
              </select>
              {temFiltro && (
                <Button variant="ghost" size="sm" className="h-9 gap-1 text-muted-foreground" onClick={limpar}>
                  <X className="size-4" /> Limpar
                </Button>
              )}
            </div>

            <Card className="overflow-hidden">
              <CardContent className="p-0">
                {filtradas.length === 0 ? (
                  <p className="py-10 text-center text-sm text-muted-foreground">
                    {temFiltro ? 'Nenhuma reunião com esses filtros.' : 'Nenhuma reunião lançada neste mês.'}
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-xs text-muted-foreground">
                          <th className="px-4 py-2.5 text-left font-medium">Empresa</th>
                          <th className="px-4 py-2.5 text-left font-medium">Inside / KAM</th>
                          <th className="px-4 py-2.5 text-left font-medium">Segmento</th>
                          <th className="px-4 py-2.5 text-center font-medium">Mês</th>
                          <th className="px-4 py-2.5 text-center font-medium">Período</th>
                          <th className="px-4 py-2.5 text-left font-medium">Status</th>
                          <th className="px-4 py-2.5 text-center font-medium">Qualificada</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filtradas.map((r) => {
                          const st = STATUS_LABEL[r.status] ?? { label: r.status, cls: 'bg-muted text-foreground' }
                          return (
                            <tr key={r.id} className="border-b last:border-0 hover:bg-muted/40 transition-colors">
                              <td className="px-4 py-2.5 font-medium max-w-[240px] truncate">{r.empresa}</td>
                              <td className="px-4 py-2.5 text-muted-foreground">{r.vendedorNome ?? '—'}</td>
                              <td className="px-4 py-2.5 text-muted-foreground">{r.segmento ?? '—'}</td>
                              <td className="px-4 py-2.5 text-center text-muted-foreground">{MESES[r.mes - 1]}</td>
                              <td className="px-4 py-2.5 text-center text-muted-foreground whitespace-nowrap">Semana {r.semana}</td>
                              <td className="px-4 py-2.5">
                                <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${st.cls}`}>{st.label}</span>
                              </td>
                              <td className="px-4 py-2.5 text-center">
                                {r.qualificada
                                  ? <span className="font-medium text-emerald-600">Sim</span>
                                  : <span className="text-muted-foreground">Não</span>}
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
          </div>
        </>
      )}
    </div>
  )
}
