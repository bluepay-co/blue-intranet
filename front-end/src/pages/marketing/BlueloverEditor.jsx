import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft, Plus, Pencil, Trash2, ChevronUp, ChevronDown, ExternalLink, ImageIcon,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import PageHeader from '@/components/layout/PageHeader'
import BlueloverFormDialog from '@/components/bluelovers/BlueloverFormDialog'
import BlocoFormDialog from '@/components/bluelovers/BlocoFormDialog'
import SecoesPerfilForm from '@/components/bluelovers/SecoesPerfilForm'
import {
  buscarAdmin,
  deletarBloco,
  reordenarBlocos,
  urlFoto,
} from '@/api/modules/bluelovers'

const CONQUISTAS = [
  ['realizacao_pessoal', 'Maior realização pessoal'],
  ['realizacao_profissional', 'Maior realização profissional'],
  ['sonho', 'Meu maior sonho'],
  ['desenvolver', 'Quero aprender e desenvolver na Bluepay'],
]

function Miniatura({ src, alt, className = 'size-14' }) {
  return (
    <div className={`${className} shrink-0 overflow-hidden rounded-lg bg-muted`}>
      {src ? (
        <img src={src} alt={alt} className="h-full w-full object-cover" />
      ) : (
        <div className="grid h-full w-full place-items-center">
          <ImageIcon className="size-4 text-muted-foreground" />
        </div>
      )}
    </div>
  )
}

export default function BlueloverEditor() {
  const { id }   = useParams()
  const navigate = useNavigate()

  const [bluelover, setBluelover] = useState(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro]           = useState('')
  const [tentativa, setTentativa] = useState(0)

  const [perfilAberto, setPerfilAberto] = useState(false)
  const [blocoAberto, setBlocoAberto]   = useState(false)
  const [blocoEditando, setBlocoEditando] = useState(null)
  const [novoBloco, setNovoBloco] = useState({ tipo: 'momento', chave: null, tituloPadrao: '' })

  useEffect(() => {
    async function buscar() {
      try {
        setBluelover(await buscarAdmin(id))
      } catch {
        setErro('Não foi possível carregar o perfil.')
      } finally {
        setCarregando(false)
      }
    }
    buscar()
  }, [id, tentativa])

  function abrirBloco(config, bloco = null) {
    setNovoBloco(config)
    setBlocoEditando(bloco)
    setBlocoAberto(true)
  }

  async function handleDeletarBloco(bloco) {
    if (!confirm(`Remover "${bloco.titulo}"? Esta ação não pode ser desfeita.`)) return
    try {
      await deletarBloco(bloco.id)
      setTentativa((t) => t + 1)
    } catch {
      alert('Erro ao remover.')
    }
  }

  /** Move um momento e persiste a nova ordem (só os momentos são reordenáveis). */
  async function mover(momentos, indice, direcao) {
    const destino = indice + direcao
    if (destino < 0 || destino >= momentos.length) return

    const ordenados = [...momentos]
    ;[ordenados[indice], ordenados[destino]] = [ordenados[destino], ordenados[indice]]
    setBluelover({
      ...bluelover,
      blocos: [...bluelover.blocos.filter((b) => b.tipo !== 'momento'), ...ordenados],
    })

    try {
      await reordenarBlocos(bluelover.id, ordenados.map((b) => b.id))
    } catch {
      alert('Erro ao reordenar os momentos.')
      setTentativa((t) => t + 1)
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

  const conquistas = bluelover.blocos.filter((b) => b.tipo === 'conquista')
  const momentos   = bluelover.blocos.filter((b) => b.tipo === 'momento')
  const antigos    = bluelover.blocos.filter((b) => b.tipo === 'livre')

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

      <PageHeader title={bluelover.nome} subtitle={bluelover.cargo || 'Sem cargo definido'}>
        <div className="flex items-center gap-2">
          <Badge variant={bluelover.publicado ? 'secondary' : 'outline'}>
            {bluelover.publicado ? 'Publicado' : 'Rascunho'}
          </Badge>
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

      {/* Seção 01 */}
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Informações básicas</CardTitle>
          <Button variant="outline" size="sm" className="gap-2" onClick={() => setPerfilAberto(true)}>
            <Pencil className="size-4" />
            Editar
          </Button>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 sm:flex-row">
          <Miniatura
            src={urlFoto(bluelover.foto_destaque_url || bluelover.foto_capa_url)}
            alt={bluelover.nome}
            className="h-40 w-32"
          />
          <div className="flex flex-col gap-2 text-sm">
            <p className="text-muted-foreground">
              {bluelover.apelido ? `Chamam de ${bluelover.apelido}` : 'Sem apelido'}
              {bluelover.data_nascimento &&
                ` · ${new Date(bluelover.data_nascimento).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}`}
            </p>
            {bluelover.setor && <Badge variant="secondary" className="w-fit">{bluelover.setor}</Badge>}
            <p className={bluelover.bio ? '' : 'text-muted-foreground'}>
              {bluelover.bio || 'Sem descrição.'}
            </p>
            {bluelover.talento && (
              <p className="text-muted-foreground">Talento: {bluelover.talento}</p>
            )}
            <div className="flex flex-wrap gap-1.5">
              {bluelover.habilidades?.length ? (
                bluelover.habilidades.map((h) => <Badge key={h} variant="outline">{h}</Badge>)
              ) : (
                <span className="text-xs text-muted-foreground">Sem habilidades cadastradas.</span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Ordem na vitrine: {bluelover.ordem}
              {' · '}
              Capa do card: {bluelover.foto_capa_url ? 'definida' : 'não definida'}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Seção 02 */}
      <Card>
        <CardHeader>
          <CardTitle>Conquistas & sonhos</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          {CONQUISTAS.map(([chave, rotulo]) => {
            const card = conquistas.find((c) => c.chave === chave)
            return (
              <div key={chave} className="flex items-center gap-3 rounded-lg border p-3">
                <Miniatura src={urlFoto(card?.foto_url)} alt={rotulo} />
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-muted-foreground">{rotulo}</p>
                  {card ? (
                    <>
                      <p className="truncate font-medium">{card.titulo}</p>
                      <p className="line-clamp-1 text-xs text-muted-foreground">{card.texto}</p>
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground">Ainda não preenchido.</p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    title={card ? 'Editar card' : 'Preencher'}
                    onClick={() => abrirBloco({ tipo: 'conquista', chave, tituloPadrao: rotulo }, card)}
                  >
                    {card ? <Pencil className="size-4" /> : <Plus className="size-4" />}
                  </Button>
                  {card && (
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Remover card"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleDeletarBloco(card)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  )}
                </div>
              </div>
            )
          })}
        </CardContent>
      </Card>

      {/* Seção 06 */}
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Minha história na Bluepay</CardTitle>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => abrirBloco({ tipo: 'momento', chave: null, tituloPadrao: '' })}
          >
            <Plus className="size-4" />
            Adicionar momento
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {momentos.length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Nenhum momento na timeline ainda.
            </p>
          )}

          {momentos.map((bloco, i) => (
            <div key={bloco.id} className="flex items-center gap-4 rounded-lg border p-3">
              <div className="flex shrink-0 flex-col">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  title="Subir"
                  disabled={i === 0}
                  onClick={() => mover(momentos, i, -1)}
                >
                  <ChevronUp className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  title="Descer"
                  disabled={i === momentos.length - 1}
                  onClick={() => mover(momentos, i, 1)}
                >
                  <ChevronDown className="size-4" />
                </Button>
              </div>

              <Miniatura src={urlFoto(bloco.foto_url)} alt={bloco.titulo} />

              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">
                  {bloco.titulo}
                  {bloco.rotulo_data && (
                    <span className="ml-2 text-xs font-normal text-muted-foreground">
                      {bloco.rotulo_data}
                    </span>
                  )}
                </p>
                <p className="line-clamp-2 text-xs text-muted-foreground">{bloco.texto}</p>
              </div>

              <div className="flex shrink-0 items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  title="Editar momento"
                  onClick={() => abrirBloco({ tipo: 'momento', chave: null, tituloPadrao: '' }, bloco)}
                >
                  <Pencil className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  title="Remover momento"
                  className="text-destructive hover:text-destructive"
                  onClick={() => handleDeletarBloco(bloco)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Seções 03 a 09 */}
      <SecoesPerfilForm
        key={`secoes-${bluelover.id}-${bluelover.atualizado_em}`}
        perfil={bluelover}
        onSalvo={() => setTentativa((t) => t + 1)}
      />

      {antigos.length > 0 && (
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle className="text-base">Seções do formato antigo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Criadas antes do novo perfil. Não aparecem mais na página; remova quando o conteúdo
              já estiver nas seções acima.
            </p>
            {antigos.map((bloco) => (
              <div key={bloco.id} className="flex items-center gap-4 rounded-lg border p-3">
                <Miniatura src={urlFoto(bloco.foto_url)} alt={bloco.titulo} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{bloco.titulo}</p>
                  <p className="line-clamp-2 text-xs text-muted-foreground">{bloco.texto}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  title="Remover"
                  className="text-destructive hover:text-destructive"
                  onClick={() => handleDeletarBloco(bloco)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {perfilAberto && (
        <BlueloverFormDialog
          key={`perfil-${bluelover.id}-${bluelover.atualizado_em}`}
          aberto={perfilAberto}
          onFechar={() => setPerfilAberto(false)}
          perfilEditando={bluelover}
          onSalvo={() => setTentativa((t) => t + 1)}
        />
      )}

      {blocoAberto && (
        <BlocoFormDialog
          key={blocoEditando?.id ?? `novo-${novoBloco.chave ?? novoBloco.tipo}`}
          aberto={blocoAberto}
          onFechar={() => setBlocoAberto(false)}
          blueloverId={bluelover.id}
          blocoEditando={blocoEditando}
          tipo={novoBloco.tipo}
          chave={novoBloco.chave}
          tituloPadrao={novoBloco.tituloPadrao}
          onSalvo={() => setTentativa((t) => t + 1)}
        />
      )}
    </div>
  )
}
