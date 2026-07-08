import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { getRadarRisco } from '@/api/modules/carteira'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import PageHeader from '@/components/layout/PageHeader'
import {
  AlertCircle, Loader2, RefreshCw, Search, ChevronRight,
  AlertTriangle, TrendingDown, UserX, Wallet, X,
} from 'lucide-react'

const CATEGORIAS = {
  PAROU:   { label: 'Parou',    cls: 'bg-red-500/10 text-red-600' },
  QUEDA:   { label: 'Em queda', cls: 'bg-orange-500/10 text-orange-600' },
  ATENCAO: { label: 'Atenção',  cls: 'bg-amber-500/10 text-amber-600' },
}

function moeda(v) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(v ?? 0)
}
function numero(v) {
  return new Intl.NumberFormat('pt-BR').format(v ?? 0)
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

export default function RadarRisco() {
  const navigate = useNavigate()
  const [dados, setDados] = useState(null)
  const [busca, setBusca] = useState('')
  const [categoria, setCategoria] = useState('')
  const [uf, setUf] = useState('')
  const [segmento, setSegmento] = useState('')
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')

  const carregar = useCallback(async () => {
    setErro('')
    setCarregando(true)
    try {
      setDados(await getRadarRisco())
    } catch (e) {
      if (e.response?.status === 404) setErro('Você não possui carteira no banco de produção.')
      else if (e.response?.status === 403) setErro('Seu cargo não tem acesso a esta área.')
      else setErro('Erro ao carregar o radar de risco. Tente novamente.')
    } finally {
      setCarregando(false)
    }
  }, [])

  useEffect(() => { carregar() }, [carregar])

  const clientes = dados?.clientes ?? []
  const resumo = dados?.resumo

  const ufs = useMemo(() => [...new Set(clientes.map((c) => c.uf).filter(Boolean))].sort(), [clientes])
  const segmentos = useMemo(() => [...new Set(clientes.map((c) => c.segmento).filter(Boolean))].sort(), [clientes])

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    return clientes.filter((c) => {
      if (categoria && c.categoria !== categoria) return false
      if (uf && c.uf !== uf) return false
      if (segmento && c.segmento !== segmento) return false
      if (termo && !(c.nome?.toLowerCase().includes(termo) || c.cnpj?.toLowerCase().includes(termo) || c.cidade?.toLowerCase().includes(termo))) return false
      return true
    })
  }, [clientes, busca, categoria, uf, segmento])

  const temFiltro = busca || categoria || uf || segmento
  function limpar() { setBusca(''); setCategoria(''); setUf(''); setSegmento('') }

  if (carregando && !dados) {
    return (
      <div className="grid place-items-center py-24">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Radar de Risco" subtitle="Clientes que pararam ou estão em queda — aja antes de perder receita">
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
      {resumo && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard icon={AlertTriangle} cor="bg-red-500/10 text-red-600"        valor={numero(resumo.total)}          rotulo="Clientes em risco" />
          <KpiCard icon={Wallet}        cor="bg-rose-500/10 text-rose-600"      valor={moeda(resumo.receitaEmRisco)}  rotulo="Receita em risco (90d)" />
          <KpiCard icon={UserX}         cor="bg-red-500/10 text-red-600"        valor={numero(resumo.parou)}          rotulo="Pararam de transacionar" />
          <KpiCard icon={TrendingDown}  cor="bg-orange-500/10 text-orange-600"  valor={numero(resumo.queda)}          rotulo="Em queda (>40%)" />
        </div>
      )}

      {/* Busca + filtros */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por nome, CNPJ ou cidade…" className="h-9 pl-8" />
        </div>
        <select className={selectCls} value={categoria} onChange={(e) => setCategoria(e.target.value)}>
          <option value="">Faixa</option>
          <option value="PAROU">Parou</option>
          <option value="QUEDA">Em queda</option>
          <option value="ATENCAO">Atenção</option>
        </select>
        <select className={selectCls} value={uf} onChange={(e) => setUf(e.target.value)}>
          <option value="">Estado (UF)</option>
          {ufs.map((u) => <option key={u} value={u}>{u}</option>)}
        </select>
        <select className={selectCls} value={segmento} onChange={(e) => setSegmento(e.target.value)}>
          <option value="">Segmento</option>
          {segmentos.map((s) => <option key={s} value={s}>{s}</option>)}
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
              {temFiltro ? 'Nenhum cliente com esses filtros.' : 'Nenhum cliente em risco no momento. 🎉'}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-xs text-muted-foreground">
                    <th className="px-4 py-2.5 text-left font-medium">Cliente</th>
                    <th className="px-4 py-2.5 text-left font-medium">Faixa</th>
                    <th className="px-4 py-2.5 text-right font-medium">Receita 90d</th>
                    <th className="px-4 py-2.5 text-right font-medium">90d anteriores</th>
                    <th className="px-4 py-2.5 text-right font-medium">Variação</th>
                    <th className="px-4 py-2.5 text-right font-medium">Sem transação</th>
                    <th className="px-4 py-2.5 text-right font-medium">R$ em risco</th>
                    <th className="px-2 py-2.5"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtrados.map((c) => {
                    const cat = CATEGORIAS[c.categoria] ?? { label: c.categoria, cls: 'bg-muted text-foreground' }
                    return (
                      <tr key={c.id} onClick={() => navigate(`/clientes/${c.id}`)} className="border-b last:border-0 cursor-pointer hover:bg-muted/40 transition-colors">
                        <td className="px-4 py-2.5 max-w-[240px]">
                          <p className="font-medium truncate">{c.nome}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {c.cidade ? `${c.cidade}${c.uf ? '/' + c.uf : ''}` : c.cnpj ?? ''}
                          </p>
                        </td>
                        <td className="px-4 py-2.5">
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${cat.cls}`}>{cat.label}</span>
                        </td>
                        <td className="px-4 py-2.5 text-right whitespace-nowrap">{moeda(c.receitaRecente)}</td>
                        <td className="px-4 py-2.5 text-right text-muted-foreground whitespace-nowrap">{moeda(c.receitaAnterior)}</td>
                        <td className="px-4 py-2.5 text-right whitespace-nowrap">
                          <span className={`font-semibold ${(c.variacaoPct ?? 0) < 0 ? 'text-red-500' : 'text-emerald-600'}`}>
                            {c.variacaoPct == null ? '—' : `${c.variacaoPct}%`}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-right text-muted-foreground whitespace-nowrap">
                          {c.diasSemTransacao == null ? '—' : `${numero(c.diasSemTransacao)} dias`}
                        </td>
                        <td className="px-4 py-2.5 text-right font-semibold text-primary whitespace-nowrap">{moeda(c.valorEmRisco)}</td>
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
