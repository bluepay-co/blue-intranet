import { useEffect, useState, useCallback } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import PageHeader from '@/components/layout/PageHeader'
import PostFormDialog from '@/components/blog/PostFormDialog'
import { listarAdmin, deletarPost, togglePublicar } from '@/api/modules/blog'

const ABAS = [
  { to: '/marketing/admin', label: 'Publicados', end: true },
  { to: '/marketing/admin/rascunhos', label: 'Rascunhos', end: false },
]

/**
 * Layout do Painel de Blog: busca os posts UMA vez e entrega às abas pelo
 * contexto do Outlet — "Publicados" (métricas) e "Rascunhos" (produção).
 * O formulário de post fica aqui para servir às duas abas.
 */
export default function AdminBlog() {
  const [posts, setPosts] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [dialogAberto, setDialogAberto] = useState(false)
  const [postEditando, setPostEditando] = useState(null)

  const buscar = useCallback(async () => {
    setErro('')
    try {
      setPosts(await listarAdmin())
    } catch {
      setErro('Não foi possível carregar os posts.')
    } finally {
      setCarregando(false)
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial do servidor
    buscar()
  }, [buscar])

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

  async function deletar(post) {
    if (!confirm(`Remover "${post.titulo}"? Esta ação não pode ser desfeita.`)) return
    try {
      await deletarPost(post.id)
      buscar()
    } catch {
      alert('Erro ao remover o post.')
    }
  }

  async function publicar(post) {
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

  const rascunhos = posts.filter((p) => !p.publicado).length

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Painel de Blog" subtitle="Gerencie as publicações da área de Marketing.">
        <Button onClick={abrirCriar} className="gap-2">
          <Plus className="size-4" />
          Novo post
        </Button>
      </PageHeader>

      <nav className="-mt-2 flex gap-1 border-b border-border">
        {ABAS.map(({ to, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-2 border-b-2 -mb-px px-4 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground',
              )
            }
          >
            {label}
            {label === 'Rascunhos' && rascunhos > 0 && (
              <span className="rounded-full bg-muted px-1.5 text-[10px] leading-[17px] text-muted-foreground">
                {rascunhos}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      <Outlet context={{ posts, carregando, erro, buscar, abrirCriar, abrirEditar, deletar, publicar }} />

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
