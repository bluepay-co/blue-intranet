import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Heart } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import PageHeader from '@/components/layout/PageHeader'
import BlueloverCard from '@/components/bluelovers/BlueloverCard'
import { listarVitrine } from '@/api/modules/bluelovers'
import { useAuth } from '@/auth/auth-context'

const CARGOS_ADMIN = ['MARKETING', 'DESENVOLVEDOR']

export default function Bluelovers() {
  const [bluelovers, setBluelovers] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro]             = useState('')
  const { usuario }                 = useAuth()

  const podeGerenciar = CARGOS_ADMIN.includes(usuario?.role)

  const buscar = useCallback(async () => {
    setErro('')
    try {
      const data = await listarVitrine()
      setBluelovers(data)
    } catch {
      setErro('Não foi possível carregar os Bluelovers. Tente novamente.')
    } finally {
      setCarregando(false)
    }
  }, [])

  useEffect(() => { buscar() }, [buscar])

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Bluelovers"
        subtitle="Conheça quem faz a Bluepay acontecer."
      >
        {podeGerenciar && (
          <Button variant="outline" size="sm" asChild>
            <Link to="/marketing/bluelovers">Gerenciar</Link>
          </Button>
        )}
      </PageHeader>

      {carregando && (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i} className="animate-pulse pt-0">
              <div className="aspect-[4/5] w-full rounded-t-xl bg-muted" />
              <CardContent className="space-y-2 py-4">
                <div className="h-4 w-3/4 rounded bg-muted" />
                <div className="h-3 w-1/2 rounded bg-muted" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!carregando && erro && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <p className="text-sm text-destructive">{erro}</p>
            <Button variant="outline" size="sm" onClick={buscar}>
              Tentar novamente
            </Button>
          </CardContent>
        </Card>
      )}

      {!carregando && !erro && bluelovers.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <div className="grid size-12 place-items-center rounded-full bg-muted">
              <Heart className="size-6 text-muted-foreground" />
            </div>
            <p className="font-medium">Nenhum Bluelover publicado ainda</p>
            <p className="text-sm text-muted-foreground">
              Em breve o Marketing vai apresentar o time por aqui.
            </p>
          </CardContent>
        </Card>
      )}

      {!carregando && !erro && bluelovers.length > 0 && (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {bluelovers.map((bluelover) => (
            <BlueloverCard key={bluelover.id} bluelover={bluelover} />
          ))}
        </div>
      )}
    </div>
  )
}
