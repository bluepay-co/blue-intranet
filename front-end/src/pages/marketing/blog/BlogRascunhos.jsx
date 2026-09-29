import { useOutletContext } from 'react-router-dom'
import { Pencil, Plus, Send, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { urlImagem } from '@/api/modules/blog'
import EstadoPainel from '@/components/blog/EstadoPainel'
import { dataCurta } from '@/components/blog/reacoes'

/** Aba "Rascunhos": foco em produzir e publicar. Rascunhos não aparecem no feed. */
export default function BlogRascunhos() {
  const { posts, carregando, erro, buscar, abrirCriar, abrirEditar, deletar, publicar } = useOutletContext()
  const rascunhos = posts.filter((p) => !p.publicado)

  const estado = (
    <EstadoPainel
      carregando={carregando}
      erro={erro}
      onTentar={buscar}
      vazio={rascunhos.length === 0}
      titulo="Nenhum rascunho"
      descricao="Escreva o próximo post e publique quando estiver pronto."
      acao={
        <Button onClick={abrirCriar} className="mt-4 gap-2">
          <Plus className="size-4" /> Novo post
        </Button>
      }
    />
  )

  return (
    <div className="flex flex-col gap-4">
      {!carregando && !erro && rascunhos.length > 0 && (
        <p className="text-sm text-muted-foreground">
          Rascunhos não aparecem no feed. Ao publicar, o post vai para a aba “Publicados” e não volta a ser rascunho.
        </p>
      )}

      {estado}

      {!carregando && !erro && rascunhos.length > 0 && (
        <div className="space-y-3">
          {rascunhos.map((post) => {
            const imagemSrc = urlImagem(post.imagem_url)
            return (
              <Card key={post.id}>
                <CardContent className="flex items-center gap-4 py-3">
                  <div className="size-14 shrink-0 overflow-hidden rounded-lg bg-muted">
                    {imagemSrc && <img src={imagemSrc} alt={post.titulo} className="h-full w-full object-cover" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{post.titulo}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Criado em {dataCurta(post.criado_em)}
                      {post.atualizado_em && post.atualizado_em !== post.criado_em && ` · editado em ${dataCurta(post.atualizado_em)}`}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button size="sm" className="gap-1.5" onClick={() => publicar(post)}>
                      <Send className="size-3.5" /> Publicar
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
      )}
    </div>
  )
}
