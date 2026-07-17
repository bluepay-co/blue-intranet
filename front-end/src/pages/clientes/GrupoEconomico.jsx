import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { buscarGruposEconomicos } from '@/api/modules/clientes'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import PageHeader from '@/components/layout/PageHeader'
import {
  AlertCircle, Loader2, RefreshCw, ChevronRight, Building2, Users,
} from 'lucide-react'

// Faixas de status por dias desde a última transação recebida (espelha MeusClientes.jsx).
const DIAS_ATIVO = 30
const DIAS_ATENCAO = 60

function numero(v) {
  return new Intl.NumberFormat('pt-BR').format(v ?? 0)
}
function moeda(v) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v ?? 0)
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
  if (d <= DIAS_ATIVO)   return { label: 'Ativo',    cls: 'bg-emerald-500/10 text-emerald-600' }
  if (d <= DIAS_ATENCAO) return { label: 'Atenção',  cls: 'bg-amber-500/10 text-amber-600' }
  return { label: 'Em risco', cls: 'bg-red-500/10 text-red-600' }
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

export default function GrupoEconomico() {
  const navigate = useNavigate()
  const [grupos, setGrupos] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [carregouUmaVez, setCarregouUmaVez] = useState(false)
  const [erro, setErro] = useState('')

  const carregar = useCallback(async () => {
    setErro('')
    setCarregando(true)
    try {
      const data = await buscarGruposEconomicos()
      setGrupos(data.grupos)
    } catch (e) {
      if (e.response?.status === 404) setErro('Você não possui clientes no banco de produção.')
      else if (e.response?.status === 403) setErro('Seu cargo não tem acesso a esta área.')
      else setErro('Erro ao carregar os grupos econômicos. Tente novamente.')
    } finally {
      setCarregando(false)
      setCarregouUmaVez(true)
    }
  }, [])

  useEffect(() => { carregar() }, [carregar])

  const totalClientesAgrupados = grupos.reduce((acc, g) => acc + g.qtdClientes, 0)

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
        title="Grupo Econômico"
        subtitle="Clientes da sua carteira agrupados pelo grupo econômico cadastrado"
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
        <KpiCard icon={Building2} cor="bg-blue-500/10 text-blue-600" valor={numero(grupos.length)} rotulo="Grupos encontrados" />
        <KpiCard icon={Users}     cor="bg-emerald-500/10 text-emerald-600" valor={numero(totalClientesAgrupados)} rotulo="Clientes agrupados" />
      </div>

      {/* Grupos */}
      {grupos.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Nenhum grupo econômico identificado na sua carteira.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {grupos.map((g) => (
            <Card key={g.id} className="overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-muted/30 px-4 py-3">
                <div className="flex items-center gap-2">
                  <Building2 className="size-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{g.nome}</span>
                  <Badge variant="outline" className="font-normal">{g.qtdClientes} clientes</Badge>
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span>Receita: <span className="font-medium text-foreground">{moeda(g.receitaTotal)}</span></span>
                  <span>TPV: <span className="font-medium text-foreground">{moeda(g.tpvTotal)}</span></span>
                </div>
              </div>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-xs text-muted-foreground">
                        <th className="px-4 py-2.5 text-left font-medium">Cliente</th>
                        <th className="px-4 py-2.5 text-left font-medium">Cidade/UF</th>
                        <th className="px-4 py-2.5 text-right font-medium">Receita</th>
                        <th className="px-4 py-2.5 text-left font-medium">Status</th>
                        <th className="px-2 py-2.5"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {g.clientes.map((c) => {
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
                            <td className="px-4 py-2.5 whitespace-nowrap">
                              {c.cidade ? `${c.cidade}${c.uf ? '/' + c.uf : ''}` : '—'}
                            </td>
                            <td className="px-4 py-2.5 text-right whitespace-nowrap">{moeda(c.receita)}</td>
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
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
