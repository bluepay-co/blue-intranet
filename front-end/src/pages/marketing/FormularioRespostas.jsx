import { useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  Inbox,
  ListChecks,
  Pencil,
  RefreshCw,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import DataTable from '@/components/ui/data-table'
import PageHeader from '@/components/layout/PageHeader'
import ResumoPergunta from '@/components/formularios/ResumoPergunta'
import { baixarCsv, dataHora, valoresDe } from '@/components/formularios/respostas'
import { listarRespostas } from '@/api/modules/formularios'
import { cn } from '@/lib/utils'

const ABAS = [
  { valor: 'resumo', rotulo: 'Resumo' },
  { valor: 'individual', rotulo: 'Individual' },
  { valor: 'tabela', rotulo: 'Tabela' },
]

function Indicador({ icon: Icon, valor, rotulo }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 py-4">
        <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-brand-accent/10 text-brand-accent">
          <Icon className="size-5" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-2xl font-semibold tabular-nums">{valor}</p>
          <p className="text-xs text-muted-foreground">{rotulo}</p>
        </div>
      </CardContent>
    </Card>
  )
}

function Individual({ dados }) {
  const [indice, setIndice] = useState(0)
  const resposta = dados.respostas[indice]
  const total = dados.respostas.length

  return (
    <Card className="mx-auto w-full max-w-3xl">
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <div className="min-w-0">
          <CardTitle className="text-base">Resposta {indice + 1} de {total}</CardTitle>
          <CardDescription>
            {dataHora(resposta.enviadaEm)}
            {resposta.email && ` · ${resposta.email}`}
          </CardDescription>
        </div>
        <div className="flex shrink-0 gap-1">
          <Button variant="outline" size="icon" title="Anterior" disabled={indice === 0} onClick={() => setIndice((i) => i - 1)}>
            <ChevronLeft />
          </Button>
          <Button variant="outline" size="icon" title="Próxima" disabled={indice === total - 1} onClick={() => setIndice((i) => i + 1)}>
            <ChevronRight />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <dl className="divide-y">
          {dados.perguntas.map((p) => {
            const valores = valoresDe(p, resposta)
            return (
              <div key={p.questionId} className="flex flex-col gap-1 py-3 first:pt-0 last:pb-0">
                <dt className="text-sm text-muted-foreground">{p.titulo || 'Pergunta sem título'}</dt>
                <dd className={cn('text-sm break-words whitespace-pre-line', !valores.length && 'text-muted-foreground')}>
                  {valores.length ? valores.join(', ') : 'Não respondida'}
                </dd>
              </div>
            )
          })}
        </dl>
      </CardContent>
    </Card>
  )
}

function Tabela({ dados }) {
  const comEmail = dados.respostas.some((r) => r.email)
  const colunas = [
    {
      key: 'enviadaEm',
      header: 'Enviada em',
      cell: (r) => dataHora(r.enviadaEm),
      className: 'whitespace-nowrap tabular-nums text-muted-foreground',
    },
    ...(comEmail ? [{ key: 'email', header: 'E-mail', cell: (r) => r.email ?? '—' }] : []),
    ...dados.perguntas.map((p) => ({
      key: p.questionId,
      header: <span className="block max-w-56 truncate" title={p.titulo}>{p.titulo}</span>,
      cell: (r) => {
        const texto = valoresDe(p, r).join(', ')
        return <span className="block max-w-72 truncate" title={texto}>{texto || '—'}</span>
      },
    })),
  ]

  return (
    <Card className="py-0">
      <DataTable columns={colunas} data={dados.respostas} />
    </Card>
  )
}

export default function FormularioRespostas() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const aba = ABAS.some((a) => a.valor === searchParams.get('aba')) ? searchParams.get('aba') : 'resumo'

  const [dados, setDados] = useState(null)
  const [erro, setErro] = useState('')
  const [atualizando, setAtualizando] = useState(false)
  const [tentativa, setTentativa] = useState(0)

  useEffect(() => {
    async function carregar() {
      try {
        setDados(await listarRespostas(id))
      } catch (e) {
        setErro(e?.response?.data?.message ?? 'Não foi possível carregar as respostas.')
      } finally {
        setAtualizando(false)
      }
    }
    carregar()
  }, [id, tentativa])

  function atualizar() {
    setErro('')
    setAtualizando(true)
    setTentativa((t) => t + 1)
  }

  const total = dados?.respostas.length ?? 0

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={dados?.titulo ?? 'Respostas'} subtitle="Respostas do formulário">
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate('/marketing/formularios')}>
            <ArrowLeft /> Voltar
          </Button>
          <Button variant="outline" size="sm" disabled={atualizando} onClick={atualizar}>
            <RefreshCw className={cn(atualizando && 'animate-spin')} /> Atualizar
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate(`/marketing/formularios/${id}`)}>
            <Pencil /> Editar
          </Button>
          <Button size="sm" disabled={!total} onClick={() => baixarCsv(dados.titulo, dados)}>
            <Download /> Exportar CSV
          </Button>
        </div>
      </PageHeader>

      {!dados && !erro && (
        <div className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-[74px]" />)}
          </div>
          <Skeleton className="h-48 w-full" />
        </div>
      )}

      {erro && (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <p className="text-sm text-destructive">{erro}</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={atualizar}>
              Tentar novamente
            </Button>
          </CardContent>
        </Card>
      )}

      {dados && !erro && (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <Indicador icon={Inbox} valor={total} rotulo={total === 1 ? 'Resposta' : 'Respostas'} />
            <Indicador icon={ListChecks} valor={dados.perguntas.length} rotulo="Perguntas" />
            <div className="col-span-2 sm:col-span-1">
              <Indicador icon={Clock} valor={total ? dataHora(dados.respostas[0].enviadaEm) : '—'} rotulo="Última resposta" />
            </div>
          </div>

          {total === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-16 text-center">
                <p className="font-medium">Nenhuma resposta ainda</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Compartilhe o link do formulário. As respostas aparecem aqui assim que forem enviadas.
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="flex gap-1 overflow-x-auto border-b border-border">
                {ABAS.map((a) => (
                  <button
                    key={a.valor}
                    type="button"
                    onClick={() => setSearchParams({ aba: a.valor }, { replace: true })}
                    className={cn(
                      '-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors',
                      aba === a.valor
                        ? 'border-primary text-primary'
                        : 'border-transparent text-muted-foreground hover:text-foreground',
                    )}
                  >
                    {a.rotulo}
                  </button>
                ))}
              </div>

              {aba === 'resumo' && (
                <div className="grid gap-4 lg:grid-cols-2">
                  {dados.perguntas.map((p) => (
                    <ResumoPergunta key={p.questionId} pergunta={p} respostas={dados.respostas} />
                  ))}
                </div>
              )}
              {aba === 'individual' && <Individual key={total} dados={dados} />}
              {aba === 'tabela' && <Tabela dados={dados} />}
            </>
          )}
        </>
      )}
    </div>
  )
}
