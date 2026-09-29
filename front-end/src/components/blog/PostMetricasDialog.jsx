import { useCallback, useEffect, useState } from 'react'
import { Loader2, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { listarReacoesDoPost, listarComentarios, apagarComentario } from '@/api/modules/blog'
import { ROTULOS_ROLE } from '@/api/modules/usuarios'
import TextoComLinks from '@/components/kanban/TextoComLinks'
import { REACOES, dataCurta, dataHora, totalReacoes } from './reacoes'
import { useComentariosAoVivo } from './useComentariosAoVivo'

const EMOJI = Object.fromEntries(REACOES.map((r) => [r.tipo, r.emoji]))

function Secao({ titulo, children }) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{titulo}</h3>
      {children}
    </section>
  )
}

/**
 * Métricas de um post publicado: reações por tipo, engajamento por setor, quem
 * reagiu e os comentários (com moderação). Busca só ao abrir.
 *
 * @param {{ post: object|null, onFechar: () => void, onMudou: () => void }} props
 */
export default function PostMetricasDialog({ post, onFechar, onMudou }) {
  const [dados, setDados] = useState(null)

  const carregar = useCallback(async () => {
    if (!post) return
    try {
      const [reacoes, comentarios] = await Promise.all([listarReacoesDoPost(post.id), listarComentarios(post.id)])
      setDados({ reacoes, comentarios })
    } catch {
      toast.error('Não foi possível carregar as métricas do post.')
      onFechar()
    }
  }, [post, onFechar])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- limpa e recarrega ao trocar de post
    setDados(null)
    carregar()
  }, [carregar])

  // Comentários chegando/sumindo em tempo real enquanto o modal está aberto.
  useComentariosAoVivo(post?.id ?? null, carregar)

  async function apagar(id) {
    try {
      await apagarComentario(id)
      await carregar()
      onMudou()
    } catch (err) {
      toast.error(err.response?.data?.message ?? 'Não foi possível apagar o comentário.')
    }
  }

  // Contagens vêm do que acabou de ser buscado (o `post` guardado ao abrir fica
  // desatualizado quando um comentário é apagado aqui mesmo).
  const porTipo = (tipo) => (dados ? dados.reacoes.filter((r) => r.tipo === tipo).length : (post?.[`${tipo}_count`] ?? 0))
  const totalRe = dados ? dados.reacoes.length : post ? totalReacoes(post) : 0
  const totalCo = dados ? dados.comentarios.length : (post?.comentarios_count ?? 0)

  // Engajamento por setor: reações agrupadas pelo cargo de quem reagiu.
  const porSetor = dados
    ? Object.entries(
        dados.reacoes.reduce((acc, r) => {
          const setor = ROTULOS_ROLE[r.usuario_role] ?? r.usuario_role
          acc[setor] = (acc[setor] ?? 0) + 1
          return acc
        }, {}),
      ).sort((a, b) => b[1] - a[1])
    : []
  const maiorSetor = porSetor[0]?.[1] ?? 0

  return (
    <Dialog open={Boolean(post)} onOpenChange={(v) => !v && onFechar()}>
      <DialogContent className="max-h-[88vh] max-w-3xl">
        {post && (
          <>
            <DialogHeader>
              <DialogTitle className="pr-6 leading-snug [overflow-wrap:anywhere]">{post.titulo}</DialogTitle>
              <DialogDescription>
                Publicado em {dataCurta(post.criado_em)} · {totalRe} reações · {totalCo} comentários
              </DialogDescription>
            </DialogHeader>

            {!dados ? (
              <div className="grid h-40 place-items-center">
                <Loader2 className="size-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="flex flex-col gap-6">
                <Secao titulo="Reações por tipo">
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {REACOES.map(({ tipo, emoji, label }) => (
                      <div key={tipo} className="flex items-center gap-2 rounded-lg border px-3 py-2">
                        <span className="text-xl">{emoji}</span>
                        <div>
                          <p className="text-lg leading-tight font-semibold tabular-nums">{porTipo(tipo)}</p>
                          <p className="text-[11px] text-muted-foreground">{label}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </Secao>

                <div className="grid gap-6 md:grid-cols-2">
                  <Secao titulo="Engajamento por setor">
                    {porSetor.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Ninguém reagiu ainda.</p>
                    ) : (
                      <ul className="flex flex-col gap-2">
                        {porSetor.map(([setor, total]) => (
                          <li key={setor}>
                            <div className="mb-1 flex justify-between text-sm">
                              <span className="truncate">{setor}</span>
                              <span className="tabular-nums text-muted-foreground">{total}</span>
                            </div>
                            <div className="h-2 rounded bg-muted">
                              <div className="h-full rounded bg-primary" style={{ width: `${(total / maiorSetor) * 100}%` }} />
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </Secao>

                  <Secao titulo={`Quem reagiu (${dados.reacoes.length})`}>
                    {dados.reacoes.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Ninguém reagiu ainda.</p>
                    ) : (
                      <ul className="max-h-56 divide-y overflow-y-auto rounded-lg border">
                        {dados.reacoes.map((r, i) => (
                          <li key={i} className="flex items-center gap-2 px-3 py-1.5 text-sm">
                            <span>{EMOJI[r.tipo]}</span>
                            <span className="min-w-0 flex-1 truncate">{r.usuario_nome}</span>
                            <span className="shrink-0 text-xs text-muted-foreground">
                              {ROTULOS_ROLE[r.usuario_role] ?? r.usuario_role}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </Secao>
                </div>

                <Secao titulo={`Comentários (${dados.comentarios.length})`}>
                  {dados.comentarios.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nenhum comentário ainda.</p>
                  ) : (
                    <ul className="flex flex-col gap-2">
                      {dados.comentarios.map((c) => (
                        <li key={c.id} className="group flex gap-2 rounded-lg border px-3 py-2 text-sm">
                          <div className="min-w-0 flex-1">
                            <p className="text-xs">
                              <b className="font-semibold">{c.usuario_nome}</b>
                              <span className="text-muted-foreground"> · {dataHora(c.criado_em)}</span>
                            </p>
                            <p className="mt-0.5 whitespace-pre-wrap [overflow-wrap:anywhere]">
                              <TextoComLinks texto={c.texto} classeLink="text-primary" />
                            </p>
                          </div>
                          {c.pode_apagar && (
                            <button
                              type="button"
                              onClick={() => apagar(c.id)}
                              className="self-start rounded p-1 text-muted-foreground hover:text-destructive"
                              aria-label="Apagar comentário"
                              title="Apagar comentário (moderação)"
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </Secao>
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
