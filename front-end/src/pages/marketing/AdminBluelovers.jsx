import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Users, CheckCircle2, FileEdit, LayoutList,
  Plus, Pencil, Trash2, Eye, EyeOff,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import PageHeader from '@/components/layout/PageHeader'
import BlueloverFormDialog from '@/components/bluelovers/BlueloverFormDialog'
import {
  listarAdmin,
  deletarPerfil,
  alternarPublicacao,
  urlFoto,
} from '@/api/modules/bluelovers'

export default function AdminBluelovers() {
  const navigate = useNavigate()

  const [bluelovers, setBluelovers] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro]             = useState('')
  const [dialogAberto, setDialogAberto] = useState(false)

  const buscar = useCallback(async () => {
    setErro('')
    try {
      const data = await listarAdmin()
      setBluelovers(data)
    } catch {
      setErro('Não foi possível carregar os perfis.')
    } finally {
      setCarregando(false)
    }
  }, [])

  useEffect(() => { buscar() }, [buscar])

  async function handleDeletar(bluelover) {
    if (!confirm(
      `Remover o perfil de "${bluelover.nome}"? Isso apaga também as seções e as imagens. Esta ação não pode ser desfeita.`,
    )) return

    try {
      await deletarPerfil(bluelover.id)
      buscar()
    } catch {
      alert('Erro ao remover o perfil.')
    }
  }

  async function handlePublicar(bluelover) {
    try {
      await alternarPublicacao(bluelover.id)
      buscar()
    } catch {
      alert('Erro ao alterar a publicação.')
    }
  }

  const metricas = {
    total: bluelovers.length,
    publicados: bluelovers.filter((b) => b.publicado).length,
    rascunhos: bluelovers.filter((b) => !b.publicado).length,
    blocos: bluelovers.reduce((soma, b) => soma + (b.total_blocos ?? 0), 0),
  }

  const cards = [
    { label: 'Total de perfis', valor: metricas.total, icon: Users, cor: 'bg-blue-500/10 text-blue-600 dark:text-blue-400' },
    { label: 'Publicados', valor: metricas.publicados, icon: CheckCircle2, cor: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' },
    { label: 'Rascunhos', valor: metricas.rascunhos, icon: FileEdit, cor: 'bg-amber-500/10 text-amber-600 dark:text-amber-400' },
    { label: 'Seções escritas', valor: metricas.blocos, icon: LayoutList, cor: 'bg-violet-500/10 text-violet-600 dark:text-violet-400' },
  ]

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Painel Bluelovers"
        subtitle="Cadastre e mantenha os perfis do time exibidos na vitrine."
      >
        <Button className="gap-2" onClick={() => setDialogAberto(true)}>
          <Plus className="size-4" />
          Novo Bluelover
        </Button>
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map(({ label, valor, icon: Icon, cor }) => (
          <Card key={label}>
            <CardContent className="flex items-center gap-3 py-4">
              <div className={`grid size-10 place-items-center rounded-lg ${cor}`}>
                <Icon className="size-5" />
              </div>
              <div>
                <p className="text-2xl font-semibold">{valor}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {carregando && (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="flex items-center gap-4 py-4">
                <div className="h-16 w-[3.25rem] shrink-0 rounded-lg bg-muted" />
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

      {!carregando && !erro && bluelovers.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <div className="grid size-12 place-items-center rounded-full bg-muted">
              <Users className="size-6 text-muted-foreground" />
            </div>
            <p className="font-medium">Nenhum Bluelover cadastrado</p>
            <p className="text-sm text-muted-foreground">
              Comece criando o primeiro perfil com a foto 1080x1350.
            </p>
          </CardContent>
        </Card>
      )}

      {!carregando && !erro && bluelovers.length > 0 && (
        <div className="space-y-3">
          {bluelovers.map((bluelover) => {
            const capaSrc = urlFoto(bluelover.foto_capa_url)
            const blocos = bluelover.total_blocos ?? 0

            return (
              <Card key={bluelover.id}>
                <CardContent className="flex items-center gap-4 py-3">
                  <div className="h-16 w-[3.25rem] shrink-0 overflow-hidden rounded-lg bg-muted">
                    {capaSrc && (
                      <img
                        src={capaSrc}
                        alt={bluelover.nome}
                        className="h-full w-full object-cover"
                      />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{bluelover.nome}</p>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {bluelover.cargo || 'Sem cargo'}
                      {' · '}
                      {blocos} {blocos === 1 ? 'seção' : 'seções'}
                      {' · '}
                      ordem {bluelover.ordem}
                    </p>
                  </div>

                  <span
                    className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      bluelover.publicado
                        ? 'bg-green-500/10 text-green-600 dark:text-green-400'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {bluelover.publicado ? 'Publicado' : 'Rascunho'}
                  </span>

                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      title={bluelover.publicado ? 'Despublicar' : 'Publicar'}
                      onClick={() => handlePublicar(bluelover)}
                    >
                      {bluelover.publicado
                        ? <EyeOff className="size-4" />
                        : <Eye className="size-4" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Editar perfil e seções"
                      onClick={() => navigate(`/marketing/bluelovers/${bluelover.id}`)}
                    >
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Remover"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleDeletar(bluelover)}
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

      {dialogAberto && (
        <BlueloverFormDialog
          key="novo"
          aberto={dialogAberto}
          onFechar={() => setDialogAberto(false)}
          perfilEditando={null}
          onSalvo={(id) => navigate(`/marketing/bluelovers/${id}`)}
        />
      )}
    </div>
  )
}
