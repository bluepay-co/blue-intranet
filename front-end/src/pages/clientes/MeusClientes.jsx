import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { listarClientes } from '@/api/modules/clientes'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import PageHeader from '@/components/layout/PageHeader'
import {
  AlertCircle, Loader2, RefreshCw, Search, ChevronRight,
  Users, UserCheck, AlertTriangle, Wallet, X,
} from 'lucide-react'

// Faixas de status por dias desde a última transação recebida.
const DIAS_ATIVO = 30
const DIAS_ATENCAO = 60

function moeda(v) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(v ?? 0)
}
function numero(v) {
  return new Intl.NumberFormat('pt-BR').format(v ?? 0)
}
function dataCurta(v) {
  if (!v) return '—'
  return new Date(v).toLocaleDateString('pt-BR')
}
function diasDesde(v) {
  if (!v) return Infinity
  return Math.floor((Date.now() - new Date(v).getTime()) / 86400000)
}
function statusCliente(ultimaAtividade) {
  const d = diasDesde(ultimaAtividade)
  if (d <= DIAS_ATIVO)   return { chave: 'ativo',   label: 'Ativo',    cls: 'bg-emerald-500/10 text-emerald-600' }
  if (d <= DIAS_ATENCAO) return { chave: 'atencao', label: 'Atenção',  cls: 'bg-amber-500/10 text-amber-600' }
  return { chave: 'risco', label: 'Em risco', cls: 'bg-red-500/10 text-red-600' }
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

const selectCls =
  'h-9 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50'

export default function MeusClientes() {
  const navigate = useNavigate()
  const [clientes, setClientes] = useState([])
  const [busca, setBusca] = useState('')
  const [uf, setUf] = useState('')
  const [cidade, setCidade] = useState('')
  const [segmento, setSegmento] = useState('')
  const [status, setStatus] = useState('')
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')

  const carregar = useCallback(async () => {
    setErro('')
    setCarregando(true)
    try {
      setClientes(await listarClientes())
    } catch (e) {
      if (e.response?.status === 404) setErro('Você não possui clientes no banco de produção.')
      else if (e.response?.status === 403) setErro('Seu cargo não tem acesso a esta área.')
      else setErro('Erro ao carregar os clientes. Tente novamente.')
    } finally {
      setCarregando(false)
    }
  }, [])

  useEffect(() => { carregar() }, [carregar])

  // Opções dos filtros (distintas), com cidades em cascata pela UF.
  const ufs = useMemo(
    () => [...new Set(clientes.map((c) => c.uf).filter(Boolean))].sort(),
    [clientes],
  )
  const segmentos = useMemo(
    () => [...new Set(clientes.map((c) => c.segmento).filter(Boolean))].sort(),
    [clientes],
  )
  const cidades = useMemo(
    () => [...new Set(clientes.filter((c) => !uf || c.uf === uf).map((c) => c.cidade).filter(Boolean))].sort(),
    [clientes, uf],
  )

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    return clientes.filter((c) => {
      if (uf && c.uf !== uf) return false
      if (cidade && c.cidade !== cidade) return false
      if (segmento && c.segmento !== segmento) return false
      if (status && statusCliente(c.ultimaAtividade).chave !== status) return false
      if (termo && !(
        c.nome?.toLowerCase().includes(termo) ||
        c.nomeComercial?.toLowerCase().includes(termo) ||
        c.cnpj?.toLowerCase().includes(termo) ||
        c.cidade?.toLowerCase().includes(termo)
      )) return false
      return true
    })
  }, [clientes, busca, uf, cidade, segmento, status])

  // Resumo (sobre a carteira inteira).
  const resumo = useMemo(() => {
    let ativos = 0, risco = 0, receita = 0
    for (const c of clientes) {
      const s = statusCliente(c.ultimaAtividade).chave
      if (s === 'ativo') ativos++
      else if (s === 'risco') risco++
      receita += c.receita ?? 0
    }
    return { total: clientes.length, ativos, risco, receita }
  }, [clientes])

  const temFiltro = uf || cidade || segmento || status || busca
  function limpar() { setBusca(''); setUf(''); setCidade(''); setSegmento(''); setStatus('') }

  if (carregando && clientes.length === 0) {
    return (
      <div className="grid place-items-center py-24">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Meus Clientes"
        subtitle={`${numero(clientes.length)} cliente${clientes.length === 1 ? '' : 's'} na sua carteira`}
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

      {/* Cards de resumo */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard icon={Users}        cor="bg-blue-500/10 text-blue-600"       valor={numero(resumo.total)}  rotulo="Total de clientes" />
        <KpiCard icon={UserCheck}    cor="bg-emerald-500/10 text-emerald-600" valor={numero(resumo.ativos)} rotulo={`Ativos (últimos ${DIAS_ATIVO} dias)`} />
        <KpiCard icon={AlertTriangle} cor="bg-red-500/10 text-red-600"        valor={numero(resumo.risco)}  rotulo={`Em risco (+${DIAS_ATENCAO} dias sem movimento)`} />
        <KpiCard icon={Wallet}       cor="bg-violet-500/10 text-violet-600"   valor={moeda(resumo.receita)} rotulo="Receita da carteira" />
      </div>

      {/* Busca + filtros */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por nome, CNPJ ou cidade…"
            className="h-9 pl-8"
          />
        </div>
        <select className={selectCls} value={uf} onChange={(e) => { setUf(e.target.value); setCidade('') }}>
          <option value="">Estado (UF)</option>
          {ufs.map((u) => <option key={u} value={u}>{u}</option>)}
        </select>
        <select className={selectCls} value={cidade} onChange={(e) => setCidade(e.target.value)}>
          <option value="">Cidade</option>
          {cidades.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select className={selectCls} value={segmento} onChange={(e) => setSegmento(e.target.value)}>
          <option value="">Segmento</option>
          {segmentos.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select className={selectCls} value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Status</option>
          <option value="ativo">Ativo</option>
          <option value="atencao">Atenção</option>
          <option value="risco">Em risco</option>
        </select>
        {temFiltro && (
          <Button variant="ghost" size="sm" className="h-9 gap-1 text-muted-foreground" onClick={limpar}>
            <X className="size-4" /> Limpar
          </Button>
        )}
      </div>

      {/* Tabela */}
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          {filtrados.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              {temFiltro ? 'Nenhum cliente encontrado com esses filtros.' : 'Nenhum cliente na carteira.'}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-xs text-muted-foreground">
                    <th className="px-4 py-2.5 text-left font-medium">Cliente</th>
                    <th className="px-4 py-2.5 text-left font-medium">CNPJ</th>
                    <th className="px-4 py-2.5 text-left font-medium">Cidade/UF</th>
                    <th className="px-4 py-2.5 text-left font-medium">Segmento</th>
                    <th className="px-4 py-2.5 text-right font-medium">Receita gerada</th>
                    <th className="px-4 py-2.5 text-right font-medium">Transações</th>
                    <th className="px-4 py-2.5 text-left font-medium">Status</th>
                    <th className="px-2 py-2.5"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtrados.map((c) => {
                    const st = statusCliente(c.ultimaAtividade)
                    return (
                      <tr
                        key={c.id}
                        onClick={() => navigate(`/clientes/${c.id}`)}
                        className="border-b last:border-0 cursor-pointer hover:bg-muted/40 transition-colors"
                      >
                        <td className="px-4 py-2.5 max-w-[240px]">
                          <p className="font-medium truncate">{c.nome}</p>
                          {c.nomeComercial && c.nomeComercial !== c.nome && (
                            <p className="text-xs text-muted-foreground truncate">{c.nomeComercial}</p>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-muted-foreground whitespace-nowrap">{c.cnpj ?? '—'}</td>
                        <td className="px-4 py-2.5 whitespace-nowrap">
                          {c.cidade ? `${c.cidade}${c.uf ? '/' + c.uf : ''}` : '—'}
                        </td>
                        <td className="px-4 py-2.5">
                          {c.segmento ? <Badge variant="outline" className="font-normal">{c.segmento}</Badge> : '—'}
                        </td>
                        <td className="px-4 py-2.5 text-right font-semibold text-primary whitespace-nowrap">{moeda(c.receita)}</td>
                        <td className="px-4 py-2.5 text-right whitespace-nowrap">{numero(c.qtdTickets)}</td>
                        <td className="px-4 py-2.5">
                          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${st.cls}`} title={`Última atividade: ${dataCurta(c.ultimaAtividade)}`}>
                            {st.label}
                          </span>
                        </td>
                        <td className="px-2 py-2.5 text-muted-foreground"><ChevronRight className="size-4" /></td>
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
  )
}
