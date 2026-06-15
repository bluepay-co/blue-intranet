import { useEffect, useState } from 'react'
import { Loader2, Paperclip, Send, ChevronDown, Clock } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
} from '@/api/modules/chamados'
import { StatusBadge, CriticidadeBadge } from './badges'

function formatarDataHora(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * Detalhes do chamado: ficha + chat (timeline) + envio de mensagens.
 * O seletor de status só é renderizado para a equipe de T.I.
 *
 * @param {{ aberto: boolean, onFechar: () => void, chamadoId: number|null, ehTI?: boolean, onAtualizado?: () => void }} props
 */
export default function ChamadoDetalheDialog({ aberto, onFechar, chamadoId, ehTI, onAtualizado }) {
  const { usuario } = useAuth()
  const [chamado, setChamado] = useState(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [mensagem, setMensagem] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [mudandoStatus, setMudandoStatus] = useState(false)

  useEffect(() => {
    if (!aberto || !chamadoId) return
    let ativo = true
    ;(async () => {
      try {
        const data = await buscarChamado(chamadoId)
        if (ativo) setChamado(data)
      } catch (e) {
        if (ativo) setErro(e?.response?.data?.message ?? 'Não foi possível carregar o chamado.')
      } finally {
        if (ativo) setCarregando(false)
      }
    })()
    return () => {
      ativo = false
    }
  }, [aberto, chamadoId])

  async function enviar(e) {
    e.preventDefault()
    if (!mensagem.trim()) return
    setEnviando(true)
    try {
      const novo = await adicionarComentario(chamadoId, mensagem.trim())
      setChamado((c) => ({ ...c, comentarios: [...c.comentarios, novo] }))
      setMensagem('')
      onAtualizado?.()
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
      const atualizado = await alterarStatus(chamadoId, novoStatus)
      setChamado((c) => ({ ...c, status: atualizado.status }))
      onAtualizado?.()
    } catch (err) {
      setErro(err?.response?.data?.message ?? 'Erro ao alterar o status.')
    } finally {
      setMudandoStatus(false)
    }
  }

  return (
    <Dialog open={aberto} onOpenChange={onFechar}>
      <DialogContent className="max-w-2xl">
        {carregando ? (
          <div className="grid place-items-center py-16">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : !chamado ? (
          <div className="py-12 text-center text-sm text-destructive">{erro || 'Chamado indisponível.'}</div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="pr-6">
                <span className="text-muted-foreground">#{chamado.id}</span> {chamado.titulo}
              </DialogTitle>
            </DialogHeader>

            {/* Ficha */}
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={chamado.status} />
              <CriticidadeBadge criticidade={chamado.criticidade} />
              <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">
                {rotuloCategoria(chamado.categoria)}
              </span>
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="size-3.5" />
                SLA: {prazoCriticidade(chamado.criticidade)}
              </span>

              {ehTI && (
                <div className="ml-auto">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="h-8 gap-1.5" disabled={mudandoStatus}>
                        {mudandoStatus ? <Loader2 className="size-3.5 animate-spin" /> : null}
                        Alterar status
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
                </div>
              )}
            </div>

            <p className="text-xs text-muted-foreground">
              Aberto por {chamado.autor_nome} · {formatarDataHora(chamado.criado_em)}
            </p>

            {/* Descrição */}
            <div className="rounded-lg border bg-muted/30 px-3 py-2.5 text-sm whitespace-pre-wrap">
              {chamado.descricao}
            </div>

            {/* Anexo */}
            {chamado.anexo_url && (
              <a
                href={urlAnexo(chamado.anexo_url)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex w-fit items-center gap-2 rounded-lg border px-3 py-2 text-sm text-brand-accent transition-colors hover:bg-muted"
              >
                <Paperclip className="size-4" />
                {chamado.anexo_nome ?? 'Ver anexo'}
              </a>
            )}

            {/* Chat / timeline */}
            <div>
              <p className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                Conversa
              </p>
              <div className="max-h-64 space-y-3 overflow-y-auto pr-1">
                {chamado.comentarios.length === 0 ? (
                  <p className="py-4 text-center text-sm text-muted-foreground">
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
            </div>

            {/* Envio */}
            <form onSubmit={enviar} className="flex items-center gap-2">
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

            {erro && <p className="text-sm text-destructive">{erro}</p>}
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
