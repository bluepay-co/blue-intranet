import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { prospectarCnpj } from '@/api/modules/clientes'
import { formatarCnpj, cnpjValido } from '@/lib/cnpj'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import PageHeader from '@/components/layout/PageHeader'
import {
  AlertCircle, AlertTriangle, Loader2, Search, Building2,
  CheckCircle2, ExternalLink,
} from 'lucide-react'

/** Linha rótulo → valor no card de dados públicos. */
function Campo({ label, children }) {
  return (
    <div className="min-w-0">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="truncate text-sm font-medium">{children ?? '—'}</p>
    </div>
  )
}

export default function Prospeccao() {
  const navigate = useNavigate()
  const [cnpj, setCnpj] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState('')
  const [resultado, setResultado] = useState(null)

  const valido = cnpjValido(cnpj)

  async function consultar(e) {
    e?.preventDefault()
    if (!valido || carregando) return
    setErro('')
    setResultado(null)
    setCarregando(true)
    try {
      setResultado(await prospectarCnpj(cnpj))
    } catch (err) {
      if (err.code === 'ECONNABORTED') setErro('A consulta demorou demais. Tente novamente em instantes.')
      else if (err.response?.status === 400) setErro('CNPJ inválido.')
      else if (err.response?.status === 403) setErro('Seu cargo não tem acesso a esta área.')
      else if (err.response?.status === 404) setErro('Vendedor não encontrado no banco de produção.')
      else if (err.response?.status === 503) setErro('Banco de produção indisponível (verifique a VPN). Tente novamente.')
      else setErro('Erro ao consultar o CNPJ. Tente novamente.')
    } finally {
      setCarregando(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Prospecção"
        subtitle="Consulte um CNPJ para qualificar um novo alvo"
      />

      {/* Busca por CNPJ */}
      <form onSubmit={consultar} className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[240px] flex-1">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={cnpj}
            onChange={(e) => setCnpj(formatarCnpj(e.target.value))}
            placeholder="00.000.000/0000-00"
            inputMode="numeric"
            className="h-9 pl-8"
          />
        </div>
        <Button type="submit" disabled={!valido || carregando} className="h-9 gap-2">
          {carregando ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
          Consultar
        </Button>
      </form>

      {erro && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="size-4 shrink-0" />
          {erro}
        </div>
      )}

      {/* MEU_CLIENTE */}
      {resultado?.status === 'MEU_CLIENTE' && (
        <Card>
          <CardContent className="flex items-center gap-3 py-5">
            <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-blue-500/10 text-blue-600">
              <CheckCircle2 className="size-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-medium">Já está na sua carteira</p>
              <p className="text-sm text-muted-foreground">Este CNPJ é um cliente seu.</p>
            </div>
            <Button className="gap-2" onClick={() => navigate(`/clientes/${resultado.clienteId}`)}>
              <ExternalLink className="size-4" /> Abrir ficha
            </Button>
          </CardContent>
        </Card>
      )}

      {/* CLIENTE_DE_OUTRO */}
      {resultado?.status === 'CLIENTE_DE_OUTRO' && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-500">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <div>
            <p className="font-medium">Empresa já é cliente Bluepay</p>
            <p>
              Está na carteira de outro vendedor
              {resultado.nomeComercial ? ` — ${resultado.nomeComercial}` : ''}. Evite abordar
              para não canibalizar a carteira.
            </p>
          </div>
        </div>
      )}

      {/* DISPONIVEL */}
      {resultado?.status === 'DISPONIVEL' && (
        <Card>
          <CardContent className="space-y-4 py-5">
            <div className="flex items-center gap-3">
              <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-emerald-500/10 text-emerald-600">
                <Building2 className="size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate font-medium">
                    {resultado.razaoSocial ?? formatarCnpj(resultado.cnpj)}
                  </p>
                  <Badge variant="outline" className="shrink-0 border-emerald-500/40 text-emerald-600">
                    Disponível
                  </Badge>
                </div>
                {resultado.nomeFantasia && (
                  <p className="truncate text-sm text-muted-foreground">{resultado.nomeFantasia}</p>
                )}
              </div>
              <Badge variant="outline" className="shrink-0 font-normal">{resultado.segmento}</Badge>
            </div>

            {resultado.receitaIndisponivel ? (
              <div className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-500">
                <AlertTriangle className="size-4 shrink-0" />
                Dados da Receita indisponíveis no momento. Tente novamente mais tarde.
              </div>
            ) : (
              <div className="grid gap-4 border-t pt-4 sm:grid-cols-2 lg:grid-cols-3">
                <Campo label="CNPJ">{formatarCnpj(resultado.cnpj)}</Campo>
                <Campo label="Situação cadastral">{resultado.situacaoCadastral}</Campo>
                <Campo label="Porte">{resultado.porte}</Campo>
                <Campo label="CNAE principal">
                  {resultado.cnaePrincipal?.codigo
                    ? `${resultado.cnaePrincipal.codigo}${resultado.cnaePrincipal.descricao ? ' — ' + resultado.cnaePrincipal.descricao : ''}`
                    : '—'}
                </Campo>
                <Campo label="Cidade/UF">
                  {resultado.endereco?.cidade
                    ? `${resultado.endereco.cidade}${resultado.endereco.uf ? '/' + resultado.endereco.uf : ''}`
                    : '—'}
                </Campo>
                <Campo label="Abertura">
                  {resultado.aberturaEm ? new Date(resultado.aberturaEm).toLocaleDateString('pt-BR') : '—'}
                </Campo>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
