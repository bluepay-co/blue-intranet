import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Cake, ImageIcon, Pencil, Plane, Sparkles, Star } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { buscarPerfil, urlFoto } from '@/api/modules/bluelovers'
import { GOSTOS } from '@/components/bluelovers/gostos'
import { useAuth } from '@/auth/auth-context'

const CARGOS_ADMIN = ['MARKETING', 'DESENVOLVEDOR']

const ORDEM_CONQUISTAS = ['realizacao_pessoal', 'realizacao_profissional', 'sonho']

const dataBR = (iso) =>
  iso ? new Date(iso).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : null

/** Classe comum dos cards: sobe de leve e ganha sombra no hover. */
const CARD_HOVER = 'transition-all duration-300 hover:-translate-y-1 hover:shadow-lg'

/** Cada seção entra com um fade curto para dar ritmo à leitura. */
function Secao({ titulo, children, className }) {
  return (
    <section className={cn('animate-in fade-in slide-in-from-bottom-3 duration-500', className)}>
      {titulo && (
        <h2 className="mb-4 flex items-center gap-3 text-xs font-semibold tracking-[0.2em] text-muted-foreground uppercase">
          <span className="h-4 w-1 rounded-full bg-gradient-to-b from-brand-accent to-brand-accent/30" />
          {titulo}
        </h2>
      )}
      {children}
    </section>
  )
}

function Foto({ src, alt, className }) {
  return (
    <div className={cn('overflow-hidden bg-muted', className)}>
      {src ? (
        <img
          src={src}
          alt={alt}
          className="h-full w-full object-cover transition-transform duration-500 hover:scale-105"
        />
      ) : (
        <div className="grid h-full w-full place-items-center">
          <ImageIcon className="size-6 text-muted-foreground" />
        </div>
      )}
    </div>
  )
}

export default function BlueloverPerfil() {
  const { id }     = useParams()
  const navigate   = useNavigate()
  const { usuario } = useAuth()

  const [bluelover, setBluelover] = useState(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro]           = useState('')

  const podeGerenciar = CARGOS_ADMIN.includes(usuario?.role)

  useEffect(() => {
    async function buscar() {
      try {
        setBluelover(await buscarPerfil(id))
      } catch (err) {
        setErro(
          err?.response?.status === 404
            ? 'Perfil não encontrado.'
            : 'Não foi possível carregar o perfil. Tente novamente.',
        )
      } finally {
        setCarregando(false)
      }
    }
    buscar()
  }, [id])

  if (carregando) {
    return (
      <div className="flex animate-pulse flex-col gap-8">
        <div className="grid items-center gap-8 md:grid-cols-2">
          <div className="aspect-[4/3] w-full rounded-2xl bg-muted" />
          <div className="space-y-3">
            <div className="h-3 w-24 rounded bg-muted" />
            <div className="h-10 w-2/3 rounded bg-muted" />
            <div className="h-4 w-1/2 rounded bg-muted" />
          </div>
        </div>
        <div className="mx-auto w-full max-w-4xl space-y-4">
          <div className="h-6 w-1/3 rounded bg-muted" />
          <div className="h-24 w-full rounded bg-muted" />
        </div>
      </div>
    )
  }

  if (erro || !bluelover) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
          <p className="text-sm text-destructive">{erro || 'Perfil não encontrado.'}</p>
          <Button variant="outline" size="sm" onClick={() => navigate('/bluelovers')}>
            Voltar aos Bluelovers
          </Button>
        </CardContent>
      </Card>
    )
  }

  const b = bluelover
  const conquistas = b.blocos
    .filter((x) => x.tipo === 'conquista' && ORDEM_CONQUISTAS.includes(x.chave))
    .sort((x, y) => ORDEM_CONQUISTAS.indexOf(x.chave) - ORDEM_CONQUISTAS.indexOf(y.chave))
  const aprender = b.blocos.find((x) => x.chave === 'desenvolver')

  // Faixa da Bluepay: mesmos cards em linha, no estilo de Conquistas & sonhos.
  const cardsBluepay = [
    b.bluepay_pessoa_texto || b.bluepay_pessoa_foto_url
      ? {
          id: 'pessoa',
          rotulo: 'Se a Bluepay fosse uma pessoa',
          titulo: b.bluepay_pessoa_texto,
          foto: b.bluepay_pessoa_foto_url,
        }
      : null,
    aprender
      ? {
          id: 'aprender',
          rotulo: 'O que quero aprender na Bluepay',
          titulo: aprender.titulo,
          texto: aprender.texto,
          foto: aprender.foto_url,
        }
      : null,
    b.mais_sobre_mim
      ? { id: 'mais', rotulo: 'Mais sobre mim', titulo: b.mais_sobre_mim, foto: null }
      : null,
  ].filter(Boolean)
  const momentos = b.blocos.filter((x) => x.tipo === 'momento')
  const gostos = GOSTOS.filter(([campo]) => b[campo])
  const temViagem =
    b.viagem_favorita_texto || b.viagem_favorita_foto_url || b.viagem_sonho || b.viagem_sonho_foto_url

  return (
    <div className="flex flex-col gap-12 pb-8">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" className="gap-2" onClick={() => navigate('/bluelovers')}>
          <ArrowLeft className="size-4" />
          Voltar
        </Button>
        {podeGerenciar && (
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => navigate(`/marketing/bluelovers/${b.id}`)}
          >
            <Pencil className="size-4" />
            Editar
          </Button>
        )}
      </div>

      {/* Seção 01 — Informações básicas */}
      <Secao>
        <Card className="overflow-hidden border-none bg-gradient-to-br from-brand-accent/10 via-transparent to-transparent py-0">
          <div className="grid items-center gap-8 p-6 md:grid-cols-[minmax(0,360px)_1fr] md:p-8">
            <Foto
              src={urlFoto(b.foto_destaque_url || b.foto_capa_url)}
              alt={b.nome}
              className="aspect-[4/5] w-full rounded-3xl shadow-lg"
            />

            <div className="flex flex-col gap-5">
              <div>
                <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
                  {b.nome}
                  {b.apelido && (
                    <span className="ml-3 text-2xl font-normal text-brand-accent sm:text-3xl">
                      ({b.apelido})
                    </span>
                  )}
                </h1>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {b.cargo && (
                    <span className="rounded-full bg-brand-accent px-4 py-1.5 text-sm font-medium text-brand-accent-foreground">
                      {b.cargo}
                    </span>
                  )}
                  {b.setor && (
                    <span className="rounded-full border border-brand-accent/40 px-4 py-1.5 text-sm text-brand-accent">
                      {b.setor}
                    </span>
                  )}
                  {b.data_nascimento && (
                    <span className="flex items-center gap-1.5 rounded-full bg-muted px-4 py-1.5 text-sm text-muted-foreground">
                      <Cake className="size-4" />
                      {dataBR(b.data_nascimento)}
                    </span>
                  )}
                </div>
              </div>

              {(b.bio || b.frase) && (
                <p className="max-w-prose text-lg leading-relaxed text-muted-foreground">
                  {b.bio || `“${b.frase}”`}
                </p>
              )}

              {b.habilidades?.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {b.habilidades.map((h) => (
                    <Badge key={h} variant="secondary" className="px-3 py-1 text-sm">
                      {h}
                    </Badge>
                  ))}
                </div>
              )}

              {b.talento && (
                <div className="flex items-start gap-3 rounded-2xl border border-brand-accent/30 bg-background/60 px-4 py-3">
                  <Star className="mt-0.5 size-5 shrink-0 text-brand-accent" />
                  <div>
                    <p className="text-xs tracking-wider text-muted-foreground uppercase">
                      Meu maior talento
                    </p>
                    <p className="mt-0.5 text-lg">{b.talento}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </Card>
      </Secao>

      {/* Seção 02 — Conquistas & Sonhos */}
      {conquistas.length > 0 && (
        <Secao titulo="Conquistas & sonhos">
          <div
            className={cn(
              'grid gap-4 sm:grid-cols-2',
              conquistas.length >= 4 ? 'lg:grid-cols-4' : 'lg:grid-cols-3',
            )}
          >
            {conquistas.map((c) => (
              <Card
                key={c.id}
                className={cn(CARD_HOVER, 'overflow-hidden border-brand-accent/15 py-0')}
              >
                <Foto src={urlFoto(c.foto_url)} alt={c.titulo} className="aspect-[4/3] w-full" />
                <CardContent className="bg-gradient-to-b from-brand-accent/5 to-transparent p-4">
                  <p className="font-medium">{c.titulo}</p>
                  <p className="mt-1 line-clamp-3 text-sm text-muted-foreground">{c.texto}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </Secao>
      )}

      {/* Seção 03 — Gostos & Personalidade */}
      {gostos.length > 0 && (
        <Secao titulo="Gostos & personalidade">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {gostos.map(([campo, emoji, padrao]) => (
              <Card
                key={campo}
                className={cn(
                  CARD_HOVER,
                  'border-brand-accent/15 bg-gradient-to-br from-brand-accent/10 via-transparent to-transparent',
                )}
              >
                <CardContent className="flex items-center gap-4 py-5">
                  <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-brand-accent/20 to-brand-accent/5 text-3xl">
                    {emoji}
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs tracking-wider text-muted-foreground uppercase">
                      {b.rotulos_gostos?.[campo] || padrao}
                    </p>
                    <p className="line-clamp-2 text-lg leading-snug font-medium">{b[campo]}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </Secao>
      )}

      {/* Seção 04 — Viagens */}
      {temViagem && (
        <Secao titulo="Viagens">
          <div className="grid gap-4 lg:grid-cols-2">
            {(b.viagem_favorita_texto || b.viagem_favorita_foto_url) && (
              <Card className={cn(CARD_HOVER, 'overflow-hidden border-brand-accent/15 py-0')}>
                <Foto
                  src={urlFoto(b.viagem_favorita_foto_url)}
                  alt="Viagem favorita"
                  className="aspect-[16/9] w-full"
                />
                <CardContent className="bg-gradient-to-b from-brand-accent/5 to-transparent p-6">
                  <p className="text-xs tracking-wider text-muted-foreground uppercase">
                    Minha viagem favorita
                  </p>
                  {b.viagem_favorita_texto && (
                    <p className="mt-2 text-lg leading-relaxed">{b.viagem_favorita_texto}</p>
                  )}
                </CardContent>
              </Card>
            )}

            {(b.viagem_sonho || b.viagem_sonho_foto_url) && (
              <Card className={cn(CARD_HOVER, 'overflow-hidden border-brand-accent/15 py-0')}>
                {b.viagem_sonho_foto_url ? (
                  <Foto
                    src={urlFoto(b.viagem_sonho_foto_url)}
                    alt="Viagem dos sonhos"
                    className="aspect-[16/9] w-full"
                  />
                ) : (
                  <div className="grid aspect-[16/9] w-full place-items-center bg-gradient-to-br from-brand-accent/20 to-transparent">
                    <Plane className="size-10 text-brand-accent" />
                  </div>
                )}
                <CardContent className="bg-gradient-to-b from-brand-accent/5 to-transparent p-6">
                  <p className="text-xs tracking-wider text-muted-foreground uppercase">
                    Viagem dos sonhos
                  </p>
                  <p className="mt-2 text-lg leading-relaxed">{b.viagem_sonho}</p>
                </CardContent>
              </Card>
            )}
          </div>
        </Secao>
      )}

      {/* Seção 05 — Inspirações */}
      {(b.inspiracao_texto || b.inspiracao_foto_url) && (
        <Secao>
          <Card className="overflow-hidden border-none bg-gradient-to-r from-brand-accent/15 via-brand-accent/5 to-transparent py-0">
            <div className="grid items-center gap-6 p-6 sm:grid-cols-[minmax(0,240px)_1fr] sm:p-8">
              {b.inspiracao_foto_url && (
                <Foto
                  src={urlFoto(b.inspiracao_foto_url)}
                  alt="Inspiração"
                  className="aspect-square w-full rounded-3xl"
                />
              )}
              <div>
                <p className="text-xs font-semibold tracking-[0.2em] text-muted-foreground uppercase">
                  O que me inspira
                </p>
                {b.inspiracao_texto && (
                  <p className="mt-3 text-2xl leading-snug font-light text-balance sm:text-3xl">
                    “{b.inspiracao_texto}”
                  </p>
                )}
                <p className="mt-4 text-sm text-muted-foreground">— {b.apelido || b.nome}</p>
              </div>
            </div>
          </Card>
        </Secao>
      )}

      {/* Seção 06 — Minha história na Bluepay */}
      {momentos.length > 0 && (
        <Secao titulo="Minha história na Bluepay">
          <div className="relative">
            {/* Alinhada ao centro dos pontos: foto (8rem) + margem (1rem) + metade do ponto. */}
            <div className="absolute top-[9.375rem] right-[12%] left-[12%] hidden h-px bg-border lg:block" />
            <div
              className={cn(
                'grid gap-6 sm:grid-cols-2',
                momentos.length >= 4 ? 'lg:grid-cols-4' : 'lg:grid-cols-3',
              )}
            >
              {momentos.map((m) => (
                <div
                  key={m.id}
                  className="group relative flex flex-col items-center text-center transition-transform duration-300 hover:-translate-y-1"
                >
                  <Foto
                    src={urlFoto(m.foto_url)}
                    alt={m.titulo}
                    className="size-32 rounded-full ring-4 ring-background transition-shadow duration-300 group-hover:ring-brand-accent/30"
                  />
                  <span className="relative z-10 mt-4 size-3 rounded-full bg-brand-accent ring-4 ring-background" />
                  {m.rotulo_data && (
                    <p className="mt-3 text-sm font-semibold text-brand-accent">{m.rotulo_data}</p>
                  )}
                  <p className="mt-1 font-medium">{m.titulo}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{m.texto}</p>
                </div>
              ))}
            </div>
          </div>
        </Secao>
      )}

      {/* Seções 07 e 09 — a Bluepay e eu */}
      {cardsBluepay.length > 0 && (
        <Secao titulo="A Bluepay e eu">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {cardsBluepay.map((card) => (
              <Card
                key={card.id}
                className={cn(CARD_HOVER, 'overflow-hidden border-brand-accent/15 py-0')}
              >
                {card.foto ? (
                  <Foto src={urlFoto(card.foto)} alt={card.rotulo} className="aspect-[4/3] w-full" />
                ) : (
                  <div className="grid aspect-[4/3] w-full place-items-center bg-gradient-to-br from-brand-accent/20 to-transparent">
                    <Sparkles className="size-8 text-brand-accent" />
                  </div>
                )}
                <CardContent className="bg-gradient-to-b from-brand-accent/5 to-transparent p-4">
                  <p className="text-xs tracking-wider text-muted-foreground uppercase">
                    {card.rotulo}
                  </p>
                  <p className="mt-1 font-medium">{card.titulo}</p>
                  {card.texto && (
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{card.texto}</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </Secao>
      )}
    </div>
  )
}
