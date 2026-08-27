import { useEffect, useState, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Pencil } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { buscarPerfil, urlFoto } from '@/api/modules/bluelovers'
import { useAuth } from '@/auth/auth-context'

const CARGOS_ADMIN = ['MARKETING', 'DESENVOLVEDOR']

export default function BlueloverPerfil() {
  const { id }     = useParams()
  const navigate   = useNavigate()
  const { usuario } = useAuth()

  const [bluelover, setBluelover] = useState(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro]           = useState('')

  const podeGerenciar = CARGOS_ADMIN.includes(usuario?.role)

  const buscar = useCallback(async () => {
    setErro('')
    try {
      const data = await buscarPerfil(id)
      setBluelover(data)
    } catch (err) {
      setErro(
        err?.response?.status === 404
          ? 'Perfil não encontrado.'
          : 'Não foi possível carregar o perfil. Tente novamente.',
      )
    } finally {
      setCarregando(false)
    }
  }, [id])

  useEffect(() => { buscar() }, [buscar])

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
            Voltar para os Bluelovers
          </Button>
        </CardContent>
      </Card>
    )
  }

  const destaqueSrc = urlFoto(bluelover.foto_destaque_url || bluelover.foto_capa_url)

  return (
    <div className="flex flex-col gap-8 pb-12">
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
            onClick={() => navigate(`/marketing/bluelovers/${bluelover.id}`)}
          >
            <Pencil className="size-4" />
            Editar
          </Button>
        )}
      </div>

      <header className="grid items-center gap-8 md:grid-cols-2">
        {destaqueSrc && (
          <img
            src={destaqueSrc}
            alt={bluelover.nome}
            className="max-h-[560px] w-full rounded-2xl object-cover ring-1 ring-foreground/10"
          />
        )}
        <div className="space-y-3">
          <p className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
            {bluelover.setor || 'Bluelover'}
          </p>
          <h1 className="text-4xl font-semibold leading-tight tracking-tight md:text-5xl">
            {bluelover.nome}
          </h1>
          {bluelover.cargo && (
            <Badge variant="secondary" className="text-sm">
              {bluelover.cargo}
            </Badge>
          )}
          {bluelover.frase && (
            <p className="border-l-2 pl-4 text-lg italic leading-relaxed text-muted-foreground">
              “{bluelover.frase}”
            </p>
          )}
        </div>
      </header>

      {bluelover.blocos.length > 0 && (
        <div className="mx-auto w-full max-w-4xl space-y-12">
          {bluelover.blocos.map((bloco, i) => {
            // A alternância só liga no md: no mobile a foto vem sempre antes do texto.
            const inverso = i % 2 === 1
            const fotoSrc = urlFoto(bloco.foto_url)

            return (
              <section
                key={bloco.id}
                className="grid items-center gap-6 border-t pt-12 first:border-0 first:pt-0 md:grid-cols-5"
              >
                {fotoSrc && (
                  <div className={cn('md:col-span-2', inverso && 'md:order-2')}>
                    <img
                      src={fotoSrc}
                      alt={bloco.titulo}
                      className="aspect-[4/3] w-full rounded-xl object-cover ring-1 ring-foreground/10"
                    />
                  </div>
                )}
                <div
                  className={cn(
                    'space-y-3',
                    fotoSrc ? cn('md:col-span-3', inverso && 'md:order-1') : 'md:col-span-5',
                  )}
                >
                  <h2 className="text-2xl font-semibold tracking-tight">{bloco.titulo}</h2>
                  <p className="whitespace-pre-wrap text-base leading-relaxed text-muted-foreground">
                    {bloco.texto}
                  </p>
                </div>
              </section>
            )
          })}
        </div>
      )}
    </div>
  )
}
