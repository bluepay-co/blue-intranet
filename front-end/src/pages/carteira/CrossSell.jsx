import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { getCrossSell } from '@/api/modules/carteira'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import PageHeader from '@/components/layout/PageHeader'
import {
  AlertCircle, Loader2, RefreshCw, Search, ChevronRight,
  Sparkles, CreditCard, Globe, Landmark, X,
} from 'lucide-react'

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

export default function CrossSell() {
  const navigate = useNavigate()
  const [dados, setDados] = useState(null)
  const [busca, setBusca] = useState('')
  const [produto, setProduto] = useState('')
  const [uf, setUf] = useState('')
  const [segmento, setSegmento] = useState('')
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')

  const carregar = useCallback(async () => {
    setErro('')
    setCarregando(true)
    try {
      setDados(await getCrossSell())
    } catch (e) {
      if (e.response?.status === 404) setErro('Você não possui carteira no banco de produção.')
      else if (e.response?.status === 403) setErro('Seu cargo não tem acesso a esta área.')
      else setErro('Erro ao carregar as oportunidades. Tente novamente.')
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
      if (produto && !c.produtosFaltantes?.includes(produto)) return false
      if (uf && c.uf !== uf) return false
      if (segmento && c.segmento !== segmento) return false
      if (termo && !(c.nome?.toLowerCase().includes(termo) || c.cnpj?.toLowerCase().includes(termo) || c.cidade?.toLowerCase().includes(termo))) return false
      return true
    })
  }, [clientes, busca, produto, uf, segmento])

  const temFiltro = busca || produto || uf || segmento
  function limpar() { setBusca(''); setProduto(''); setUf(''); setSegmento('') }

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
        title="Cross-sell"
        subtitle={resumo ? `${numero(resumo.total)} oportunidades · potencial de ${moeda(resumo.receitaPotencial)} na carteira` : 'Oportunidades de novos produtos'}
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
      {resumo && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard icon={Sparkles}   cor="bg-violet-500/10 text-violet-600" valor={numero(resumo.total)}         rotulo="Oportunidades" />
          <KpiCard icon={CreditCard}  cor="bg-blue-500/10 text-blue-600"     valor={numero(resumo.faltaCartao)}   rotulo="Podem ativar Cartão" />
          <KpiCard icon={Globe}       cor="bg-sky-500/10 text-sky-600"       valor={numero(resumo.faltaVirtual)}  rotulo="Podem ativar Virtual" />
          <KpiCard icon={Landmark}    cor="bg-emerald-500/10 text-emerald-600" valor={numero(resumo.faltaBancario)} rotulo="Podem ativar Bancário" />
        </div>
      )}

      {/* Busca + filtros */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por nome, CNPJ ou cidade…" className="h-9 pl-8" />
        </div>
        <select className={selectCls} value={produto} onChange={(e) => setProduto(e.target.value)}>
          <option value="">Produto faltante</option>
          <option value="Cartão">Falta Cartão</option>
          <option value="Virtual">Falta Virtual</option>
          <option value="Bancário">Falta Bancário</option>
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
              {temFiltro ? 'Nenhum cliente com esses filtros.' : 'Nenhuma oportunidade de cross-sell no momento.'}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-xs text-muted-foreground">
                    <th className="px-4 py-2.5 text-left font-medium">Cliente</th>
                    <th className="px-4 py-2.5 text-left font-medium">Já usa</th>
                    <th className="px-4 py-2.5 text-left font-medium">Pode ativar</th>
                    <th className="px-4 py-2.5 text-right font-medium">Receita 12m</th>
                    <th className="px-4 py-2.5 text-right font-medium">Última atividade</th>
                    <th className="px-2 py-2.5"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtrados.map((c) => (
                    <tr key={c.id} onClick={() => navigate(`/clientes/${c.id}`)} className="border-b last:border-0 cursor-pointer hover:bg-muted/40 transition-colors">
                      <td className="px-4 py-2.5 max-w-[240px]">
                        <p className="font-medium truncate">{c.nome}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {c.cidade ? `${c.cidade}${c.uf ? '/' + c.uf : ''}` : c.cnpj ?? ''}
                        </p>
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex flex-wrap gap-1">
                          {c.produtosAtivos.map((p) => (
                            <Badge key={p} variant="outline" className="font-normal text-emerald-600 border-emerald-500/30">{p}</Badge>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex flex-wrap gap-1">
                          {c.produtosFaltantes.map((p) => (
                            <Badge key={p} className="font-normal bg-violet-500/10 text-violet-600 hover:bg-violet-500/10">{p}</Badge>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-right font-semibold text-primary whitespace-nowrap">{moeda(c.receita12m)}</td>
                      <td className="px-4 py-2.5 text-right text-muted-foreground whitespace-nowrap">{dataCurta(c.ultimaAtividade)}</td>
                      <td className="px-2 py-2.5 text-muted-foreground"><ChevronRight className="size-4" /></td>
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
