import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Loader2,
  Paperclip,
  Send,
  ChevronDown,
  Clock,
  User,
  Tag,
  CalendarClock,
  AlertCircle,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu'
import { useAuth } from '@/auth/auth-context'
import {
  STATUS,
  rotuloCategoria,
  prazoCriticidade,
  urlAnexo,
  buscarChamado,
  alterarStatus,
  adicionarComentario,
  buscarChamadoCx,
  alterarStatusCx,
  adicionarComentarioCx,
} from '@/api/modules/chamados'
import { useNotificacoesChamados } from '@/notificacoes/notificacoes-chamados'
import { StatusBadge, CriticidadeBadge } from '@/components/chamados/badges'
import { tempoDecorrido, formatarDataHora } from '@/components/chamados/tempo'

const ROLES_TI = ['TI', 'DESENVOLVEDOR']

/** Linha de metadado da barra lateral. */
function InfoLinha({ icon: Icon, rotulo, children }) {
  return (
    <div className="flex items-start gap-2.5 text-sm">
      <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{rotulo}</p>
        <div className="font-medium">{children}</div>
      </div>
    </div>
  )
}

export default function ChamadoDetalhe({ fonte = 'backoffice' }) {
  const ehCx = fonte === 'cx'
  const { id } = useParams()
  const navigate = useNavigate()
  const { usuario } = useAuth()
  const { marcarVisto } = useNotificacoesChamados()
  const ehTI = ROLES_TI.includes(usuario?.role)

  const [chamado, setChamado] = useState(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [mensagem, setMensagem] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [mudandoStatus, setMudandoStatus] = useState(false)

  useEffect(() => {
    let ativo = true
    ;(async () => {
      try {
        const data = await (ehCx ? buscarChamadoCx : buscarChamado)(id)
        if (ativo) {
          setChamado(data)
          marcarVisto(Number(id))
        }
      } catch (e) {
        if (ativo) setErro(e?.response?.data?.message ?? 'Não foi possível carregar o chamado.')
      } finally {
        if (ativo) setCarregando(false)
      }
    })()
    return () => {
      ativo = false
    }
  }, [id, marcarVisto])

  async function enviar(e) {
    e.preventDefault()
    if (!mensagem.trim()) return
    setEnviando(true)
    try {
      const novo = await (ehCx ? adicionarComentarioCx : adicionarComentario)(id, mensagem.trim())
      setChamado((c) => ({ ...c, comentarios: [...c.comentarios, novo] }))
      setMensagem('')
    } catch (err) {
      setErro(err?.response?.data?.message ?? 'Erro ao enviar a mensagem.')
    } finally {
      setEnviando(false)
    }
  }

  async function trocarStatus(novoStatus) {
    if (novoStatus === chamado?.status) return
    setMudandoStatus(true)
    try {
      const atualizado = await (ehCx ? alterarStatusCx : alterarStatus)(id, novoStatus)
      setChamado((c) => ({ ...c, status: atualizado.status }))
    } catch (err) {
      setErro(err?.response?.data?.message ?? 'Erro ao alterar o status.')
    } finally {
      setMudandoStatus(false)
    }
  }

  if (carregando) {
    return (
      <div className="grid place-items-center py-24">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!chamado) {
    return (
      <div className="mx-auto max-w-md space-y-4 py-16 text-center">
        <AlertCircle className="mx-auto size-8 text-destructive" />
        <p className="text-sm text-muted-foreground">{erro || 'Chamado indisponível.'}</p>
        <Button variant="outline" onClick={() => navigate(-1)} className="gap-2">
          <ArrowLeft className="size-4" />
          Voltar
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="mt-0.5 shrink-0">
            <ArrowLeft className="size-5" />
          </Button>
          <div className="min-w-0">
            <p className="text-xs font-semibold tracking-wide text-muted-foreground">CHAMADO #{chamado.id}</p>
            <h1 className="text-xl font-semibold tracking-tight">{chamado.titulo}</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={chamado.status} />
          <CriticidadeBadge criticidade={chamado.criticidade} />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Coluna principal */}
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Descrição do problema</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm whitespace-pre-wrap">{chamado.descricao}</p>
              {chamado.anexo_url && (
                <a
                  href={urlAnexo(chamado.anexo_url)}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-4 inline-flex w-fit items-center gap-2 rounded-lg border px-3 py-2 text-sm text-brand-accent transition-colors hover:bg-muted"
                >
                  <Paperclip className="size-4" />
                  {chamado.anexo_nome ?? 'Ver anexo'}
                </a>
              )}
            </CardContent>
          </Card>

          {/* Chat */}
          <Card>
            <CardHeader>
              <CardTitle>Conversa</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="max-h-96 space-y-3 overflow-y-auto pr-1">
                {chamado.comentarios.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">
                    Nenhuma mensagem ainda. Use o campo abaixo para conversar com a T.I.
                  </p>
                ) : (
                  chamado.comentarios.map((m) => {
                    const meu = m.autor_id === usuario?.id
                    return (
                      <div key={m.id} className={meu ? 'flex flex-col items-end' : 'flex flex-col items-start'}>
                        <div
                          className={
                            meu
                              ? 'max-w-[80%] rounded-2xl rounded-br-sm bg-brand px-3 py-2 text-sm text-brand-foreground'
                              : 'max-w-[80%] rounded-2xl rounded-bl-sm bg-muted px-3 py-2 text-sm'
                          }
                        >
                          <p className="whitespace-pre-wrap">{m.conteudo}</p>
                        </div>
                        <span className="mt-0.5 text-[0.7rem] text-muted-foreground">
                          {meu ? 'Você' : m.autor_nome} · {formatarDataHora(m.criado_em)}
                        </span>
                      </div>
                    )
                  })
                )}
              </div>

              <form onSubmit={enviar} className="flex items-center gap-2 border-t pt-4">
                <input
                  value={mensagem}
                  onChange={(e) => setMensagem(e.target.value)}
                  placeholder="Escreva uma mensagem…"
                  maxLength={2000}
                  className="flex h-9 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                />
                <Button type="submit" size="sm" className="h-9 gap-1.5" disabled={enviando || !mensagem.trim()}>
                  {enviando ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                  Enviar
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Barra lateral */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Informações</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm text-muted-foreground">Status</span>
                {ehTI ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="h-8 gap-1.5" disabled={mudandoStatus}>
                        {mudandoStatus ? <Loader2 className="size-3.5 animate-spin" /> : null}
                        {STATUS.find((s) => s.value === chamado.status)?.label}
                        <ChevronDown className="size-3.5 opacity-60" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {STATUS.map((s) => (
                        <DropdownMenuItem
                          key={s.value}
                          onSelect={() => trocarStatus(s.value)}
                          className={s.value === chamado.status ? 'font-semibold text-brand-accent' : ''}
                        >
                          {s.label}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  <StatusBadge status={chamado.status} />
                )}
              </div>

              <div className="border-t" />

              <InfoLinha icon={Clock} rotulo="Criticidade (SLA)">
                <span className="flex flex-wrap items-center gap-1.5">
                  <CriticidadeBadge criticidade={chamado.criticidade} />
                  <span className="text-xs text-muted-foreground">{prazoCriticidade(chamado.criticidade)}</span>
                </span>
              </InfoLinha>
              <InfoLinha icon={Tag} rotulo="Categoria">
                {rotuloCategoria(chamado.categoria)}
              </InfoLinha>
              <InfoLinha icon={User} rotulo="Solicitante">
                {chamado.autor_nome}
                <p className="text-xs font-normal text-muted-foreground">{chamado.autor_email}</p>
              </InfoLinha>
              <InfoLinha icon={CalendarClock} rotulo="Aberto em">
                {formatarDataHora(chamado.criado_em)}
                {chamado.status !== 'FECHADO' && (
                  <p className="text-xs font-normal text-muted-foreground">{tempoDecorrido(chamado.criado_em)} em aberto</p>
                )}
              </InfoLinha>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
