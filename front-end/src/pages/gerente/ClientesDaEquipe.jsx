import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { listarClientesEquipeGerente, getMembrosEquipeGerente } from '@/api/modules/gerente'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import PageHeader from '@/components/layout/PageHeader'
import {
  AlertCircle, Loader2, RefreshCw, Search, ChevronRight,
  ChevronLeft, Users, UserCheck, X,
} from 'lucide-react'

// Faixas de status por dias desde a última transação recebida (espelha a regra do backend).
const DIAS_ATIVO = 30
const DIAS_ATENCAO = 60
const POR_PAGINA = 20
// Debounce da busca por texto, para não disparar uma query a cada tecla digitada.
const DEBOUNCE_BUSCA_MS = 400

function numero(v) {
  return new Intl.NumberFormat('pt-BR').format(v ?? 0)
}
function moeda(v) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2,
  }).format(v ?? 0)
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

export default function ClientesDaEquipe() {
  const navigate = useNavigate()
  const [clientes, setClientes] = useState([])
  const [total, setTotal] = useState(0)
  const [pagina, setPagina] = useState(1)
  const [resumo, setResumo] = useState({ total: 0, ativos: 0, risco: 0, receita: 0 })
  const [filtrosDisponiveis, setFiltrosDisponiveis] = useState({ ufs: [], cidades: [], segmentos: [] })
  const [membros, setMembros] = useState([])

  const [buscaInput, setBuscaInput] = useState('')
  const [busca, setBusca] = useState('')
  const [uf, setUf] = useState('')
  const [cidade, setCidade] = useState('')
  const [segmento, setSegmento] = useState('')
  const [status, setStatus] = useState('')
  const [vendedorId, setVendedorId] = useState('')

  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')

  useEffect(() => {
    getMembrosEquipeGerente().then(setMembros).catch(() => {})
  }, [])

  // Debounce: só propaga a busca digitada para a query depois de parar de digitar.
  useEffect(() => {
    const t = setTimeout(() => { setBusca(buscaInput); setPagina(1) }, DEBOUNCE_BUSCA_MS)
    return () => clearTimeout(t)
  }, [buscaInput])

  const [carregouUmaVez, setCarregouUmaVez] = useState(false)

  const carregar = useCallback(async () => {
    setErro('')
    setCarregando(true)
    try {
      const data = await listarClientesEquipeGerente({
        busca: busca || undefined,
        uf: uf || undefined,
        cidade: cidade || undefined,
        segmento: segmento || undefined,
        status: status || undefined,
        vendedorId: vendedorId || undefined,
        page: pagina,
        limit: POR_PAGINA,
      })
      setClientes(data.clientes)
      setTotal(data.total)
      setResumo(data.resumo)
      setFiltrosDisponiveis(data.filtros)
    } catch (e) {
      if (e.response?.status === 404) setErro('Nenhum cliente encontrado para a sua equipe.')
      else if (e.response?.status === 403) setErro('Seu cargo não tem acesso a esta área.')
      else setErro('Erro ao carregar os clientes. Tente novamente.')
    } finally {
      setCarregando(false)
      setCarregouUmaVez(true)
    }
  }, [busca, uf, cidade, segmento, status, vendedorId, pagina])

  useEffect(() => { carregar() }, [carregar])

  const temFiltro = uf || cidade || segmento || status || busca || vendedorId
  function limpar() {
    setBuscaInput(''); setBusca(''); setUf(''); setCidade(''); setSegmento(''); setStatus(''); setVendedorId('')
    setPagina(1)
  }
  function aoMudarFiltro(setter) {
    return (valor) => { setter(valor); setPagina(1) }
  }

  const cidadesDaUf = uf
    ? filtrosDisponiveis.cidades.filter((c) => c.uf === uf)
    : filtrosDisponiveis.cidades

  const totalPaginas = Math.max(1, Math.ceil(total / POR_PAGINA))

  if (carregando && !carregouUmaVez) {
    return (
      <div className="grid place-items-center py-24">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Clientes da Equipe"
        subtitle={`${numero(resumo.total)} cliente${resumo.total === 1 ? '' : 's'} na carteira da equipe`}
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
      <div className="grid gap-4 sm:grid-cols-2">
        <KpiCard icon={Users}     cor="bg-blue-500/10 text-blue-600"       valor={numero(resumo.total)}  rotulo="Total de clientes" />
        <KpiCard icon={UserCheck} cor="bg-emerald-500/10 text-emerald-600" valor={numero(resumo.ativos)} rotulo={`Ativos (últimos ${DIAS_ATIVO} dias)`} />
      </div>

      {/* Busca + filtros */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={buscaInput}
            onChange={(e) => setBuscaInput(e.target.value)}
            placeholder="Buscar por nome, CNPJ ou cidade…"
            className="h-9 pl-8"
          />
        </div>
        <select className={selectCls} value={vendedorId} onChange={(e) => aoMudarFiltro(setVendedorId)(e.target.value)}>
          <option value="">Toda a equipe</option>
          {membros.map((m) => <option key={m.id} value={m.id}>{m.nome}</option>)}
        </select>
        <select className={selectCls} value={uf} onChange={(e) => { aoMudarFiltro(setUf)(e.target.value); setCidade('') }}>
          <option value="">Estado (UF)</option>
          {filtrosDisponiveis.ufs.map((u) => <option key={u} value={u}>{u}</option>)}
        </select>
        <select className={selectCls} value={cidade} onChange={(e) => aoMudarFiltro(setCidade)(e.target.value)}>
          <option value="">Cidade</option>
          {cidadesDaUf.map((c) => <option key={c.cidade} value={c.cidade}>{c.cidade}</option>)}
        </select>
        <select className={selectCls} value={segmento} onChange={(e) => aoMudarFiltro(setSegmento)(e.target.value)}>
          <option value="">Segmento</option>
          {filtrosDisponiveis.segmentos.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select className={selectCls} value={status} onChange={(e) => aoMudarFiltro(setStatus)(e.target.value)}>
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
          {clientes.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              {temFiltro ? 'Nenhum cliente encontrado com esses filtros.' : 'Nenhum cliente na carteira da equipe.'}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-xs text-muted-foreground">
                    <th className="px-4 py-2.5 text-left font-medium">Cliente</th>
                    <th className="px-4 py-2.5 text-left font-medium">Vendedor</th>
                    <th className="px-4 py-2.5 text-left font-medium">CNPJ</th>
                    <th className="px-4 py-2.5 text-left font-medium">Cidade/UF</th>
                    <th className="px-4 py-2.5 text-left font-medium">Segmento</th>
                    <th className="px-4 py-2.5 text-right font-medium">Receita</th>
                    <th className="px-4 py-2.5 text-right font-medium">TPV</th>
                    <th className="px-4 py-2.5 text-right font-medium">Transações</th>
                    <th className="px-4 py-2.5 text-right font-medium">Última Receita</th>
                    <th className="px-4 py-2.5 text-left font-medium">Último Pedido</th>
                    <th className="px-4 py-2.5 text-left font-medium">Status</th>
                    <th className="px-2 py-2.5"></th>
                  </tr>
                </thead>
                <tbody>
                  {clientes.map((c) => {
                    const st = statusCliente(c.ultimaAtividade)
                    return (
                      <tr
                        key={c.id}
                        onClick={() => navigate(`/gerente/is/clientes/${c.id}`)}
                        className="border-b last:border-0 cursor-pointer hover:bg-muted/40 transition-colors"
                      >
                        <td className="px-4 py-2.5 max-w-[240px]">
                          <p className="font-medium truncate">{c.nome}</p>
                          {c.nomeComercial && c.nomeComercial !== c.nome && (
                            <p className="text-xs text-muted-foreground truncate">{c.nomeComercial}</p>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-muted-foreground whitespace-nowrap">{c.vendedorNome ?? '—'}</td>
                        <td className="px-4 py-2.5 text-muted-foreground whitespace-nowrap">{c.cnpj ?? '—'}</td>
                        <td className="px-4 py-2.5 whitespace-nowrap">
                          {c.cidade ? `${c.cidade}${c.uf ? '/' + c.uf : ''}` : '—'}
                        </td>
                        <td className="px-4 py-2.5">
                          {c.segmento ? <Badge variant="outline" className="font-normal">{c.segmento}</Badge> : '—'}
                        </td>
                        <td className="px-4 py-2.5 text-right font-semibold text-primary">{moeda(c.receita)}</td>
                        <td className="px-4 py-2.5 text-right text-muted-foreground">{moeda(c.tpv)}</td>
                        <td className="px-4 py-2.5 text-right">{numero(c.qtdTickets)}</td>
                        <td className="px-4 py-2.5 text-right text-muted-foreground">{moeda(c.ultimaReceita)}</td>
                        <td className="px-4 py-2.5 whitespace-nowrap text-muted-foreground">{dataCurta(c.ultimaAtividade)}</td>
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

      {/* Paginação */}
      {total > 0 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Página {pagina} de {totalPaginas} · {numero(total)} cliente{total === 1 ? '' : 's'}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline" size="sm" className="h-8 gap-1"
              disabled={pagina <= 1 || carregando}
              onClick={() => setPagina((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft className="size-4" /> Anterior
            </Button>
            <Button
              variant="outline" size="sm" className="h-8 gap-1"
              disabled={pagina >= totalPaginas || carregando}
              onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
            >
              Próxima <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
