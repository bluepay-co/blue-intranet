import { useCallback, useMemo, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { BarChart3, CheckCircle2, Heart, MessageCircle, Pencil, Trash2, Trophy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { urlImagem } from '@/api/modules/blog'
import EstadoPainel from '@/components/blog/EstadoPainel'
import PostMetricasDialog from '@/components/blog/PostMetricasDialog'
import { REACOES, dataCurta, totalReacoes } from '@/components/blog/reacoes'

const ORDENS = [
  ['recentes', 'Mais recentes'],
  ['engajados', 'Mais engajados'],
]

/** Engajamento = reações + comentários (usado no ranking e na ordenação). */
const engajamento = (p) => totalReacoes(p) + (p.comentarios_count ?? 0)

/** Aba "Publicados": métricas por post. Clicar num post abre o detalhe. */
export default function BlogPublicados() {
  const { posts, carregando, erro, buscar, abrirEditar, deletar } = useOutletContext()
  const [ordem, setOrdem] = useState('recentes')
  const [aberto, setAberto] = useState(null)
  // Referência estável: o modal depende dela para buscar; uma função nova a cada
  // render faria o modal limpar e buscar tudo de novo a cada atualização da lista.
  const fecharMetricas = useCallback(() => setAberto(null), [])

  const publicados = useMemo(() => {
    const lista = posts.filter((p) => p.publicado)
    return ordem === 'engajados' ? [...lista].sort((a, b) => engajamento(b) - engajamento(a)) : lista
  }, [posts, ordem])

  const reacoes = publicados.reduce((s, p) => s + totalReacoes(p), 0)
  const comentarios = publicados.reduce((s, p) => s + (p.comentarios_count ?? 0), 0)
  const destaque = publicados.reduce((top, p) => (!top || engajamento(p) > engajamento(top) ? p : top), null)

  const cards = [
    { label: 'Publicados', valor: publicados.length, icon: CheckCircle2, cor: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' },
    { label: 'Reações', valor: reacoes, icon: Heart, cor: 'bg-pink-500/10 text-pink-600 dark:text-pink-400' },
    { label: 'Comentários', valor: comentarios, icon: MessageCircle, cor: 'bg-blue-500/10 text-blue-600 dark:text-blue-400' },
  ]

  const estado = (
    <EstadoPainel
      carregando={carregando}
      erro={erro}
      onTentar={buscar}
      vazio={publicados.length === 0}
      titulo="Nenhum post publicado"
      descricao='Publique um rascunho na aba "Rascunhos" para acompanhar as métricas aqui.'
    />
  )

  return (
    <div className="flex flex-col gap-6">
      {!carregando && !erro && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map(({ label, valor, icon: Icon, cor }) => (
            <Card key={label}>
              <CardContent className="flex items-center gap-3 py-4">
                <div className={cn('grid size-10 place-items-center rounded-lg', cor)}>
                  <Icon className="size-5" />
                </div>
                <div>
                  <p className="text-2xl font-semibold">{valor}</p>
                  <p className="text-xs text-muted-foreground">{label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
          <Card>
            <CardContent className="flex items-center gap-3 py-4">
              <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <Trophy className="size-5" />
              </div>
              <div className="min-w-0">
                <p className="truncate font-semibold" title={destaque?.titulo}>
                  {destaque && engajamento(destaque) > 0 ? destaque.titulo : '—'}
                </p>
                <p className="text-xs text-muted-foreground">
                  Mais engajado{destaque && engajamento(destaque) > 0 ? ` · ${engajamento(destaque)} interações` : ''}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {estado}

      {!carregando && !erro && publicados.length > 0 && (
        <>
          <div className="flex justify-end">
            <div className="inline-flex rounded-lg border bg-card p-0.5">
              {ORDENS.map(([k, l]) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setOrdem(k)}
                  className={cn(
                    'rounded-md px-3 py-1 text-xs font-medium text-muted-foreground',
                    ordem === k && 'bg-muted font-semibold text-foreground',
                  )}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            {publicados.map((post) => {
              const imagemSrc = urlImagem(post.imagem_url)
              return (
                <Card key={post.id} className="transition-colors hover:border-foreground/20">
                  <CardContent className="flex items-center gap-4 py-3">
                    <button
                      type="button"
                      onClick={() => setAberto(post)}
                      className="flex min-w-0 flex-1 items-center gap-4 text-left"
                      title="Ver métricas do post"
                    >
                      <div className="size-14 shrink-0 overflow-hidden rounded-lg bg-muted">
                        {imagemSrc && <img src={imagemSrc} alt={post.titulo} className="h-full w-full object-cover" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{post.titulo}</p>
                        <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                          <span>{dataCurta(post.criado_em)}</span>
                          {REACOES.map(({ tipo, emoji, label }) => (
                            <span key={tipo} title={label} className="tabular-nums">
                              {emoji} {post[`${tipo}_count`] ?? 0}
                            </span>
                          ))}
                          <span className="flex items-center gap-1 tabular-nums" title="Comentários">
                            <MessageCircle className="size-3.5" /> {post.comentarios_count ?? 0}
                          </span>
                        </p>
                      </div>
                    </button>

                    <div className="flex shrink-0 items-center gap-1">
                      <Button variant="ghost" size="icon" title="Ver métricas" onClick={() => setAberto(post)}>
                        <BarChart3 className="size-4" />
                      </Button>
                      <Button variant="ghost" size="icon" title="Editar" onClick={() => abrirEditar(post)}>
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Remover"
                        className="text-destructive hover:text-destructive"
                        onClick={() => deletar(post)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </>
      )}

      <PostMetricasDialog post={aberto} onFechar={fecharMetricas} onMudou={buscar} />
    </div>
  )
}
