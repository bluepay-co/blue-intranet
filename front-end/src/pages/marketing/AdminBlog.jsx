import { useEffect, useState, useCallback } from 'react'
import { Plus, Pencil, Trash2, Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import PageHeader from '@/components/layout/PageHeader'
import PostFormDialog from '@/components/blog/PostFormDialog'
import { listarAdmin, deletarPost, togglePublicar, urlImagem } from '@/api/modules/blog'

export default function AdminBlog() {
  const [posts, setPosts]             = useState([])
  const [carregando, setCarregando]   = useState(true)
  const [erro, setErro]               = useState('')
  const [dialogAberto, setDialogAberto] = useState(false)
  const [postEditando, setPostEditando] = useState(null)

  const buscar = useCallback(async () => {
    setErro('')
    try {
      const data = await listarAdmin()
      setPosts(data)
    } catch {
      setErro('Não foi possível carregar os posts.')
    } finally {
      setCarregando(false)
    }
  }, [])

  useEffect(() => { buscar() }, [buscar])

  function abrirCriar() {
    setPostEditando(null)
    setDialogAberto(true)
  }

  function abrirEditar(post) {
    setPostEditando(post)
    setDialogAberto(true)
  }

  function fecharDialog() {
    setDialogAberto(false)
    setPostEditando(null)
  }

  async function handleDeletar(post) {
    if (!confirm(`Remover "${post.titulo}"? Esta ação não pode ser desfeita.`)) return
    try {
      await deletarPost(post.id)
      buscar()
    } catch {
      alert('Erro ao remover o post.')
    }
  }

  async function handlePublicar(post) {
    // Aviso explícito: publicação é definitiva (não volta para rascunho).
    const aviso =
      `Publicar "${post.titulo}"?\n\n` +
      'Atenção: após publicar, o post NÃO volta para rascunho. ' +
      'Só será possível editar título, conteúdo e imagem.'
    if (!confirm(aviso)) return
    try {
      await togglePublicar(post.id)
      buscar()
    } catch (err) {
      alert(err?.response?.data?.message ?? 'Erro ao publicar o post.')
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Painel de Blog" subtitle="Gerencie as publicações da área de Marketing.">
        <Button onClick={abrirCriar} className="gap-2">
          <Plus className="size-4" />
          Novo post
        </Button>
      </PageHeader>

      {carregando && (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="flex items-center gap-4 py-4">
                <div className="h-12 w-12 shrink-0 rounded-lg bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-1/2 rounded bg-muted" />
                  <div className="h-3 w-1/4 rounded bg-muted" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!carregando && erro && (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <p className="text-sm text-destructive">{erro}</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={buscar}>
              Tentar novamente
            </Button>
          </CardContent>
        </Card>
      )}

      {!carregando && !erro && posts.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center">
            <p className="font-medium">Nenhum post ainda</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Crie o primeiro post clicando em "Novo post".
            </p>
          </CardContent>
        </Card>
      )}

      {!carregando && !erro && posts.length > 0 && (
        <div className="space-y-3">
          {posts.map((post) => {
            const imagemSrc = urlImagem(post.imagem_url)
            const totalReacoes =
              (post.like_count ?? 0) +
              (post.heart_count ?? 0) +
              (post.aplauso_count ?? 0) +
              (post.foguete_count ?? 0)

            return (
              <Card key={post.id}>
                <CardContent className="flex items-center gap-4 py-3">
                  {/* Thumbnail */}
                  <div className="size-14 shrink-0 overflow-hidden rounded-lg bg-muted">
                    {imagemSrc && (
                      <img
                        src={imagemSrc}
                        alt={post.titulo}
                        className="h-full w-full object-cover"
                      />
                    )}
                  </div>

                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{post.titulo}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {new Date(post.criado_em).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                      {' · '}
                      {totalReacoes} reação{totalReacoes !== 1 ? 'ões' : ''}
                    </p>
                  </div>

                  {/* Status badge */}
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      post.publicado
                        ? 'bg-green-500/10 text-green-600 dark:text-green-400'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {post.publicado ? 'Publicado' : 'Rascunho'}
                  </span>

                  {/* Ações */}
                  <div className="flex shrink-0 items-center gap-1">
                    {!post.publicado && (
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Publicar"
                        onClick={() => handlePublicar(post)}
                      >
                        <Eye className="size-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Editar"
                      onClick={() => abrirEditar(post)}
                    >
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Remover"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleDeletar(post)}
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

      {/* key garante re-mount do form ao trocar o post editando */}
      <PostFormDialog
        key={postEditando?.id ?? 'novo'}
        aberto={dialogAberto}
        onFechar={fecharDialog}
        postEditando={postEditando}
        onSalvo={buscar}
      />
    </div>
  )
}
