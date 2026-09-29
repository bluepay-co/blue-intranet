import { useCallback, useEffect, useRef, useState } from 'react'
import { Bell, Eye, Loader2, Lock, Pencil, Send, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { cobrarAtualizacao, comentar, detalharTarefa } from '@/api/modules/kanban'
import { Avatar } from './TarefaCard'
import TextoComLinks from './TextoComLinks'
import ChecklistTarefa from './ChecklistTarefa'
import { ALERTAS, COLUNAS, LEMBRETES, PRIORIDADES, VISIBILIDADES, alerta, formatarData, relativo } from './regras'

const STATUS = [
  ['todo', 'A fazer'],
  ['doing', 'Em andamento'],
  ['done', 'Finalizado'],
]

/**
 * Painel lateral com detalhes, histórico e comentários da tarefa.
 * `versao` muda quando a lista é recarregada, forçando nova busca do detalhe.
 */
export default function TarefaDrawer({ tarefaId, versao, usuario, onFechar, onStatus, onEditar, onExcluir, onAviso }) {
  const [detalhe, setDetalhe] = useState(null)
  const [comentario, setComentario] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [confirmarExclusao, setConfirmarExclusao] = useState(false)
  const listaConversa = useRef(null)

  const carregar = useCallback(async () => {
    if (!tarefaId) return
    try {
      setDetalhe(await detalharTarefa(tarefaId))
    } catch (err) {
      // 404 = tarefa excluída ou sem acesso; demais = falha do servidor. Nunca fechar em silêncio.
      toast.error(
        err.response?.status === 404
          ? 'Tarefa não encontrada ou sem acesso.'
          : (err.response?.data?.message ?? 'Não foi possível abrir a tarefa.'),
      )
      onFechar()
    }
  }, [tarefaId, onFechar])

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- limpa o painel ao trocar de tarefa */
    setDetalhe(null)
    setConfirmarExclusao(false)
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [tarefaId])

  // Conversa sempre posicionada na última mensagem (ao abrir e a cada novidade).
  const totalHistorico = detalhe?.historico.length ?? 0
  useEffect(() => {
    const lista = listaConversa.current
    if (lista) lista.scrollTop = lista.scrollHeight
  }, [totalHistorico])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial/recarga do servidor
    carregar()
  }, [carregar, versao])

  async function enviarComentario(e) {
    e.preventDefault()
    if (!comentario.trim()) return
    setEnviando(true)
    try {
      await comentar(tarefaId, comentario.trim())
      setComentario('')
      await carregar()
    } catch (err) {
      toast.error(err.response?.data?.message ?? 'Não foi possível enviar o comentário.')
    } finally {
      setEnviando(false)
    }
  }

  async function cobrar() {
    try {
      await cobrarAtualizacao(tarefaId)
      onAviso(`Cobrança enviada para ${detalhe.tarefa.responsavel_nome.split(' ')[0]}.`)
      await carregar()
    } catch (err) {
      toast.error(err.response?.data?.message ?? 'Não foi possível enviar a cobrança.')
    }
  }

  const t = detalhe?.tarefa
  const col = t && COLUNAS.find((c) => c.chave === t.status)
  const al = t && alerta(t)

  return (
    <Dialog open={Boolean(tarefaId)} onOpenChange={(v) => !v && onFechar()}>
      <DialogContent className="h-[90vh] max-h-[90vh] max-w-6xl content-stretch overflow-hidden p-0">
        {!t ? (
          <div className="grid h-40 place-items-center">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid h-full min-h-0 overflow-y-auto text-sm md:grid-cols-[1fr_26rem] md:overflow-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div className="space-y-5 p-8 md:overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <div className="flex flex-wrap gap-1.5 pr-8">
                <span className={cn('rounded-md px-1.5 text-[10px] font-semibold leading-[17px]', PRIORIDADES[t.prioridade].classe)}>
                  {PRIORIDADES[t.prioridade].label}
                </span>
                <span className="flex items-center gap-1 rounded-md bg-muted px-1.5 text-[10px] font-semibold leading-[17px]">
                  <i className={cn('size-1.5 rounded-full', col.cor)} />
                  {col.label}
                </span>
                {al && (
                  <span className={cn('rounded-md px-1.5 text-[10px] font-semibold leading-[17px]', ALERTAS[al].classe)}>
                    {ALERTAS[al].label}
                  </span>
                )}
              </div>

              <div>
                <DialogTitle className="text-xl leading-snug font-semibold [overflow-wrap:anywhere]">{t.titulo}</DialogTitle>
                <p className="mt-1 whitespace-pre-wrap text-muted-foreground [overflow-wrap:anywhere]">{t.descricao ? <TextoComLinks texto={t.descricao} classeLink="text-primary" /> : 'Sem descrição.'}</p>
              </div>

              <dl className="grid grid-cols-[110px_1fr] gap-x-3 gap-y-2.5 border-y py-3.5 text-xs">
                <dt className="text-muted-foreground">Solicitante</dt>
                <dd className="flex items-center gap-1.5">
                  <Avatar nome={t.solicitante_nome} />
                  {t.solicitante_nome} · {t.area_solicitante}
                </dd>
                <dt className="text-muted-foreground">Responsável</dt>
                <dd className="flex items-center gap-1.5">
                  <Avatar nome={t.responsavel_nome} />
                  {t.responsavel_nome}
                </dd>
                {t.participantes.length > 0 && (
                <>
                  <dt className="text-muted-foreground">Participantes</dt>
                  <dd className="flex flex-wrap gap-1.5">
                    {t.participantes.map((p) => (
                      <span key={p.id} className="flex items-center gap-1.5 rounded-full border bg-card py-0.5 pr-2 pl-0.5">
                        <Avatar nome={p.nome} />
                        {p.nome.split(' ').slice(0, 2).join(' ')}
                      </span>
                    ))}
                  </dd>
                </>
              )}
              <dt className="text-muted-foreground">Prazo</dt>
                <dd>
                  {formatarData(t.prazo)} <span className="text-muted-foreground">· {relativo(t.prazo)}</span>
                </dd>
                <dt className="text-muted-foreground">Lembrete</dt>
                <dd className="flex items-center gap-1.5">
                  <Bell className="size-3.5" />
                  {LEMBRETES.find(([v]) => v === t.lembrete_min)?.[1]}
                </dd>
                <dt className="text-muted-foreground">Visibilidade</dt>
                <dd className="flex items-center gap-1.5">
                  <Lock className="size-3.5" />
                  {VISIBILIDADES[t.visibilidade].label}
                </dd>
              </dl>

              <ChecklistTarefa tarefaId={t.id} itens={detalhe.checklist} podeEditar={t.pode_checklist} onMudou={carregar} />

              {t.pode_mover ? (
                <div>
                  <p className="mb-2 text-xs font-semibold text-muted-foreground">Atualizar status</p>
                  <div className="flex flex-wrap gap-1.5">
                    {STATUS.map(([k, l]) => (
                      <Button key={k} size="sm" variant={t.status === k ? 'default' : 'outline'} onClick={() => onStatus(t.id, k)}>
                        {l}
                      </Button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex gap-2 rounded-lg border bg-card p-3 text-xs text-muted-foreground">
                  <Eye className="size-4 shrink-0" />
                  <div>
                    Você acompanha esta tarefa, mas só {t.responsavel_nome.split(' ')[0]} ou a coordenação alteram o status.
                    {t.status !== 'done' && (
                      <Button size="xs" variant="outline" className="mt-2 flex" onClick={cobrar}>
                        <Bell /> Cobrar atualização
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {(t.pode_editar || t.pode_excluir) && (
                <div className="flex flex-wrap gap-1.5">
                  {t.pode_editar && (
                    <Button size="sm" variant="outline" onClick={() => onEditar(t)}>
                      <Pencil /> Editar
                    </Button>
                  )}
                  {t.pode_excluir &&
                    (confirmarExclusao ? (
                      <>
                        <Button size="sm" variant="destructive" onClick={() => onExcluir(t.id)}>
                          Confirmar exclusão
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setConfirmarExclusao(false)}>
                          Cancelar
                        </Button>
                      </>
                    ) : (
                      <Button size="sm" variant="ghost" onClick={() => setConfirmarExclusao(true)}>
                        <Trash2 /> Excluir
                      </Button>
                    ))}
                </div>
              )}

              <div className="flex gap-2 rounded-lg border bg-card p-3 text-xs text-muted-foreground">
                <Lock className="size-4 shrink-0" />
                {VISIBILIDADES[t.visibilidade].descricao} A coordenação só enxerga tarefas marcadas como “Minha equipe”.
              </div>

            </div>

            <div className="flex flex-col border-t bg-muted/20 p-8 md:min-h-0 md:border-t-0 md:border-l">
              <p className="mb-3 text-xs font-semibold text-muted-foreground">Comentários e atividade</p>
              <ul ref={listaConversa} className="min-h-24 flex-1 space-y-3 overflow-y-auto md:min-h-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {detalhe.historico.map((h) => {
                  const meu = h.usuario_id === usuario.id
                  const nome = meu ? 'Você' : h.usuario_nome.split(' ')[0]

                  // Eventos (status, cobrança, prioridade…) ficam discretos no meio da conversa.
                  if (h.tipo !== 'comentario') {
                    return (
                      <li key={h.id} className="py-0.5 text-center text-[11px] text-muted-foreground">
                        <b className="font-medium">{nome}</b> {h.texto} · {formatarData(h.criado_em)}
                      </li>
                    )
                  }

                  return (
                    <li key={h.id} className={cn('flex items-end gap-2 text-xs', meu && 'flex-row-reverse')}>
                      <Avatar nome={h.usuario_nome} />
                      <div className={cn('flex min-w-0 max-w-[85%] flex-col gap-0.5', meu && 'items-end')}>
                        <span className="px-1 text-[10.5px] text-muted-foreground">
                          {!meu && <b className="font-semibold text-foreground">{nome} · </b>}
                          {formatarData(h.criado_em)}
                        </span>
                        <p
                          className={cn(
                            'max-w-full whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm [overflow-wrap:anywhere]',
                            meu ? 'rounded-br-sm bg-primary text-primary-foreground' : 'rounded-bl-sm border bg-card',
                          )}
                        >
                          <TextoComLinks texto={h.texto} classeLink={meu ? 'text-primary-foreground' : 'text-primary'} />
                        </p>
                      </div>
                    </li>
                  )
                })}
              </ul>
              <form onSubmit={enviarComentario} className="mt-3 flex gap-2">
                <Input value={comentario} onChange={(e) => setComentario(e.target.value)} placeholder="Escreva um comentário…" />
                <Button type="submit" size="icon" variant="outline" disabled={enviando} aria-label="Enviar comentário">
                  <Send />
                </Button>
              </form>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
