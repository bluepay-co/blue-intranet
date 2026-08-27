import { useEffect, useState, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft, Plus, Pencil, Trash2, ChevronUp, ChevronDown, LayoutList, ExternalLink,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import PageHeader from '@/components/layout/PageHeader'
import BlueloverFormDialog from '@/components/bluelovers/BlueloverFormDialog'
import BlocoFormDialog from '@/components/bluelovers/BlocoFormDialog'
import {
  buscarAdmin,
  deletarBloco,
  reordenarBlocos,
  urlFoto,
} from '@/api/modules/bluelovers'

export default function BlueloverEditor() {
  const { id }   = useParams()
  const navigate = useNavigate()

  const [bluelover, setBluelover] = useState(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro]           = useState('')

  const [perfilAberto, setPerfilAberto] = useState(false)
  const [blocoAberto, setBlocoAberto]   = useState(false)
  const [blocoEditando, setBlocoEditando] = useState(null)

  const buscar = useCallback(async () => {
    setErro('')
    try {
      const data = await buscarAdmin(id)
      setBluelover(data)
    } catch {
      setErro('Não foi possível carregar o perfil.')
    } finally {
      setCarregando(false)
    }
  }, [id])

  useEffect(() => { buscar() }, [buscar])

  function abrirNovoBloco() {
    setBlocoEditando(null)
    setBlocoAberto(true)
  }

  function abrirEditarBloco(bloco) {
    setBlocoEditando(bloco)
    setBlocoAberto(true)
  }

  async function handleDeletarBloco(bloco) {
    if (!confirm(`Remover a seção "${bloco.titulo}"? Esta ação não pode ser desfeita.`)) return

    try {
      await deletarBloco(bloco.id)
      buscar()
    } catch {
      alert('Erro ao remover a seção.')
    }
  }

  /** Move a seção uma posição para cima ou para baixo e persiste a nova ordem. */
  async function mover(indice, direcao) {
    const destino = indice + direcao
    const blocos = [...bluelover.blocos]
    if (destino < 0 || destino >= blocos.length) return

    ;[blocos[indice], blocos[destino]] = [blocos[destino], blocos[indice]]

    // Atualiza otimista para o clique responder na hora; se o PATCH falhar,
    // o buscar() ressincroniza com o banco.
    setBluelover({ ...bluelover, blocos })

    try {
      await reordenarBlocos(bluelover.id, blocos.map((b) => b.id))
    } catch {
      alert('Erro ao reordenar as seções.')
      buscar()
    }
  }

  if (carregando) {
    return (
      <div className="flex animate-pulse flex-col gap-6">
        <div className="h-8 w-1/3 rounded bg-muted" />
        <div className="h-40 w-full rounded-xl bg-muted" />
        <div className="h-64 w-full rounded-xl bg-muted" />
      </div>
    )
  }

  if (erro || !bluelover) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
          <p className="text-sm text-destructive">{erro || 'Perfil não encontrado.'}</p>
          <Button variant="outline" size="sm" onClick={() => navigate('/marketing/bluelovers')}>
            Voltar ao painel
          </Button>
        </CardContent>
      </Card>
    )
  }

  const capaSrc = urlFoto(bluelover.foto_capa_url)

  return (
    <div className="flex flex-col gap-6">
      <Button
        variant="ghost"
        size="sm"
        className="w-fit gap-2"
        onClick={() => navigate('/marketing/bluelovers')}
      >
        <ArrowLeft className="size-4" />
        Voltar ao painel
      </Button>

      <PageHeader
        title={bluelover.nome}
        subtitle={bluelover.cargo || 'Sem cargo definido'}
      >
        <div className="flex items-center gap-2">
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
              bluelover.publicado
                ? 'bg-green-500/10 text-green-600 dark:text-green-400'
                : 'bg-muted text-muted-foreground'
            }`}
          >
            {bluelover.publicado ? 'Publicado' : 'Rascunho'}
          </span>
          {bluelover.publicado && (
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => navigate(`/bluelovers/${bluelover.id}`)}
            >
              <ExternalLink className="size-4" />
              Ver perfil
            </Button>
          )}
        </div>
      </PageHeader>

      {/* Dados do perfil */}
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Dados do perfil</CardTitle>
          <Button variant="outline" size="sm" className="gap-2" onClick={() => setPerfilAberto(true)}>
            <Pencil className="size-4" />
            Editar
          </Button>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 sm:flex-row">
          <div className="h-40 w-32 shrink-0 overflow-hidden rounded-lg bg-muted">
            {capaSrc && (
              <img src={capaSrc} alt={bluelover.nome} className="h-full w-full object-cover" />
            )}
          </div>
          <div className="flex flex-col gap-2 text-sm">
            {bluelover.setor && <Badge variant="secondary" className="w-fit">{bluelover.setor}</Badge>}
            {bluelover.frase ? (
              <p className="italic text-muted-foreground">“{bluelover.frase}”</p>
            ) : (
              <p className="text-muted-foreground">Sem frase de efeito.</p>
            )}
            <p className="text-xs text-muted-foreground">
              Ordem na vitrine: {bluelover.ordem}
              {' · '}
              Imagem de destaque: {bluelover.foto_destaque_url ? 'definida' : 'não definida'}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Seções do mini jornal */}
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Seções do perfil</CardTitle>
          <Button variant="outline" size="sm" className="gap-2" onClick={abrirNovoBloco}>
            <Plus className="size-4" />
            Adicionar seção
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {bluelover.blocos.length === 0 && (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <div className="grid size-12 place-items-center rounded-full bg-muted">
                <LayoutList className="size-6 text-muted-foreground" />
              </div>
              <p className="font-medium">Nenhuma seção ainda</p>
              <p className="text-sm text-muted-foreground">
                Adicione seções como “Eu amo, eu adoro” ou “Meus sonhos”.
              </p>
            </div>
          )}

          {bluelover.blocos.map((bloco, i) => {
            const fotoSrc = urlFoto(bloco.foto_url)

            return (
              <div
                key={bloco.id}
                className="flex items-center gap-4 rounded-lg border p-3"
              >
                <div className="flex shrink-0 flex-col">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    title="Subir"
                    disabled={i === 0}
                    onClick={() => mover(i, -1)}
                  >
                    <ChevronUp className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    title="Descer"
                    disabled={i === bluelover.blocos.length - 1}
                    onClick={() => mover(i, 1)}
                  >
                    <ChevronDown className="size-4" />
                  </Button>
                </div>

                <div className="size-14 shrink-0 overflow-hidden rounded-lg bg-muted">
                  {fotoSrc && (
                    <img src={fotoSrc} alt={bloco.titulo} className="h-full w-full object-cover" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{bloco.titulo}</p>
                  <p className="line-clamp-2 text-xs text-muted-foreground">{bloco.texto}</p>
                </div>

                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    title="Editar seção"
                    onClick={() => abrirEditarBloco(bloco)}
                  >
                    <Pencil className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    title="Remover seção"
                    className="text-destructive hover:text-destructive"
                    onClick={() => handleDeletarBloco(bloco)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
            )
          })}
        </CardContent>
      </Card>

      {perfilAberto && (
        <BlueloverFormDialog
          key={`perfil-${bluelover.id}`}
          aberto={perfilAberto}
          onFechar={() => setPerfilAberto(false)}
          perfilEditando={bluelover}
          onSalvo={buscar}
        />
      )}

      {blocoAberto && (
        <BlocoFormDialog
          key={blocoEditando?.id ?? 'novo-bloco'}
          aberto={blocoAberto}
          onFechar={() => setBlocoAberto(false)}
          blueloverId={bluelover.id}
          blocoEditando={blocoEditando}
          onSalvo={buscar}
        />
      )}
    </div>
  )
}
