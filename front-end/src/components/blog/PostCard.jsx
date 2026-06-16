import { useState } from 'react'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { urlImagem, reagir } from '@/api/modules/blog'

const REACOES = [
  { tipo: 'like',    emoji: '👍', label: 'Curtir' },
  { tipo: 'heart',   emoji: '❤️',  label: 'Amei' },
  { tipo: 'aplauso', emoji: '👏', label: 'Aplaudir' },
  { tipo: 'foguete', emoji: '🚀', label: 'Foguete' },
]

/**
 * Card de post do blog de marketing exibido no feed.
 *
 * @param {{ post: object, onReagir: () => void }} props
 *   `onReagir` é chamado após cada reação para o pai re-buscar os dados atualizados.
 */
export default function PostCard({ post, onReagir }) {
  const [carregando, setCarregando] = useState(null)

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

  return (
    <Card>
      {imagemSrc && (
        <img
          src={imagemSrc}
          alt={post.titulo}
          className="aspect-[4/5] w-full rounded-t-xl object-cover"
        />
      )}
      <CardHeader>
        <CardTitle className="text-base leading-snug">{post.titulo}</CardTitle>
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
        <p className="line-clamp-5 whitespace-pre-wrap text-sm text-muted-foreground">
          {post.conteudo}
        </p>
      </CardContent>

      <CardFooter className="flex flex-wrap gap-1">
        {REACOES.map(({ tipo, emoji, label }) => {
          const count = post[`${tipo}_count`] ?? 0
          const ativo = post.minha_reacao === tipo
          return (
            <Button
              key={tipo}
              variant={ativo ? 'default' : 'ghost'}
              size="sm"
              className="gap-1.5 text-xs"
              disabled={carregando !== null}
              onClick={() => handleReagir(tipo)}
              title={label}
            >
              <span>{emoji}</span>
              {count > 0 && <span>{count}</span>}
            </Button>
          )
        })}
      </CardFooter>
    </Card>
  )
}
