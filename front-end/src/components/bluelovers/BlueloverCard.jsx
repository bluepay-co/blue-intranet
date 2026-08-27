import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { urlFoto } from '@/api/modules/bluelovers'

/** Iniciais usadas no placeholder quando a capa não carrega. */
function iniciais(nome) {
  return (nome ?? '')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((parte) => parte[0]?.toUpperCase() ?? '')
    .join('')
}

/**
 * Card do grid da vitrine. A capa é 4:5 (1080x1350), o formato que o Marketing
 * já exporta do template do Photoshop.
 *
 * @param {{ bluelover: object }} props
 */
export default function BlueloverCard({ bluelover }) {
  const capaSrc = urlFoto(bluelover.foto_capa_url)

  return (
    <Link to={`/bluelovers/${bluelover.id}`} className="group block">
      {/* O Card do preset Nova só zera o padding do topo quando a <img> é filha
          direta — daí o pt-0 manual no fallback sem imagem. */}
      <Card
        className={cn(
          'h-full transition-shadow hover:shadow-lg',
          !capaSrc && 'pt-0',
        )}
      >
        {capaSrc ? (
          <img
            src={capaSrc}
            alt={bluelover.nome}
            className="aspect-[4/5] w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
          />
        ) : (
          <div className="grid aspect-[4/5] w-full place-items-center rounded-t-xl bg-muted text-4xl font-semibold text-muted-foreground">
            {iniciais(bluelover.nome)}
          </div>
        )}

        <CardHeader>
          <CardTitle className="truncate">{bluelover.nome}</CardTitle>
          {bluelover.cargo && (
            <CardDescription className="truncate">{bluelover.cargo}</CardDescription>
          )}
        </CardHeader>

        {(bluelover.setor || bluelover.frase) && (
          <CardContent className="flex flex-col gap-2">
            {bluelover.setor && (
              <Badge variant="secondary" className="w-fit">
                {bluelover.setor}
              </Badge>
            )}
            {bluelover.frase && (
              <p className="line-clamp-2 text-xs italic text-muted-foreground">
                “{bluelover.frase}”
              </p>
            )}
          </CardContent>
        )}
      </Card>
    </Link>
  )
}
