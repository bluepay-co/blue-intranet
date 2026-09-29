import { useState } from 'react'
import { MessageCircle } from 'lucide-react'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { urlImagem, reagir } from '@/api/modules/blog'
import ComentariosPost from './ComentariosPost'
import { REACOES, totalReacoes } from './reacoes'

/**
 * Card de post do blog de marketing exibido no feed.
 *
 * @param {{ post: object, onReagir: () => void }} props
 *   `onReagir` é chamado após cada reação para o pai re-buscar os dados atualizados.
 */
export default function PostCard({ post, onReagir }) {
  const [carregando, setCarregando] = useState(null)
  const [comentariosAbertos, setComentariosAbertos] = useState(false)
  // Total atualizado pela conversa aberta (inclusive em tempo real); null = usa o do feed.
  const [totalAoVivo, setTotalAoVivo] = useState(null)

  async function handleReagir(tipo) {
    if (carregando) return
    setCarregando(tipo)
    try {
      await reagir(post.id, tipo)
      onReagir?.()
    } catch {
      // Silencia — o usuário pode tentar novamente.
    } finally {
      setCarregando(null)
    }
  }

  const imagemSrc = urlImagem(post.imagem_url)
  const reacoes = totalReacoes(post)
  const totalComentarios = totalAoVivo ?? post.comentarios_count ?? 0

  return (
    <Card>
      {imagemSrc && (
        <img
          src={imagemSrc}
          alt={post.titulo}
          className="aspect-[16/9] w-full rounded-t-xl object-cover"
        />
      )}
      <CardHeader>
        <CardTitle className="text-base leading-snug [overflow-wrap:anywhere]">{post.titulo}</CardTitle>
        <p className="text-xs text-muted-foreground">
          {post.autor_nome} &middot;{' '}
          {new Date(post.criado_em).toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
          })}
        </p>
      </CardHeader>

      <CardContent>
        <p className="whitespace-pre-wrap text-sm text-muted-foreground [overflow-wrap:anywhere]">
          {post.conteudo}
        </p>
      </CardContent>

      {/* Resumo: quais reações o post recebeu + atalho para a conversa. */}
      {(reacoes > 0 || totalComentarios > 0) && (
        <div className="flex items-center justify-between gap-3 px-(--card-spacing) pb-3 text-xs text-muted-foreground">
          <span className="flex min-w-0 items-center gap-1.5">
            {reacoes > 0 && (
              <>
                <span className="flex -space-x-1">
                  {REACOES.filter(({ tipo }) => (post[`${tipo}_count`] ?? 0) > 0).map(({ tipo, emoji }) => (
                    <span key={tipo} className="grid size-5 place-items-center rounded-full bg-background text-[11px] ring-2 ring-card">
                      {emoji}
                    </span>
                  ))}
                </span>
                <span className="tabular-nums">{reacoes}</span>
              </>
            )}
          </span>
          {totalComentarios > 0 && (
            <button type="button" onClick={() => setComentariosAbertos((a) => !a)} className="shrink-0 hover:underline">
              {totalComentarios} comentário{totalComentarios === 1 ? '' : 's'}
            </button>
          )}
        </div>
      )}

      {/* Footer em coluna: a barra de ações e, abaixo, a conversa em largura total. */}
      <CardFooter className="flex-col items-stretch gap-3 py-2">
        <div className="flex flex-wrap items-center gap-1">
          {REACOES.map(({ tipo, emoji, label }) => {
            const ativo = post.minha_reacao === tipo
            return (
              <Button
                key={tipo}
                variant={ativo ? 'secondary' : 'ghost'}
                size="sm"
                className={cn('gap-1.5 text-xs', ativo && 'ring-1 ring-primary/40')}
                disabled={carregando !== null}
                onClick={() => handleReagir(tipo)}
                title={label}
                aria-pressed={ativo}
              >
                <span className="text-base leading-none">{emoji}</span>
                <span className="max-sm:hidden">{label}</span>
              </Button>
            )
          })}
          <Button
            variant={comentariosAbertos ? 'secondary' : 'ghost'}
            size="sm"
            className="ml-auto gap-1.5 text-xs"
            onClick={() => setComentariosAbertos((a) => !a)}
            aria-expanded={comentariosAbertos}
          >
            <MessageCircle className="size-4" />
            Comentar
          </Button>
        </div>

        {comentariosAbertos && (
          <div className="border-t pt-3">
            <ComentariosPost postId={post.id} onTotal={setTotalAoVivo} />
          </div>
        )}
      </CardFooter>
    </Card>
  )
}
