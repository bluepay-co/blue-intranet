import { Calendar, MapPin, User, Users, Video } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { horario } from '@/lib/datas'

function CardEvento({ evento, onSelecionar }) {
  return (
    <li
      role="button"
      tabIndex={0}
      onClick={() => onSelecionar(evento)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onSelecionar(evento)
        }
      }}
      className="group flex cursor-pointer items-center gap-4 rounded-xl border bg-card p-4 transition-all hover:-translate-y-px hover:border-brand-accent/40 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {/* Horário */}
      <div className="flex w-14 shrink-0 flex-col items-center text-center">
        {evento.diaInteiro ? (
          <span className="rounded-md bg-brand-accent/10 px-2 py-1 text-[0.7rem] font-medium text-brand-accent">
            Dia todo
          </span>
        ) : (
          <>
            <span className="text-base font-semibold leading-none tabular-nums">
              {horario(evento.inicio)}
            </span>
            {evento.fim && (
              <span className="mt-1.5 text-xs text-muted-foreground tabular-nums">
                {horario(evento.fim)}
              </span>
            )}
          </>
        )}
      </div>

      {/* Trilho */}
      <span className="h-12 w-1 shrink-0 rounded-full bg-brand-accent/60 transition-colors group-hover:bg-brand-accent" />

      {/* Detalhes */}
      <div className="min-w-0 flex-1 space-y-1.5">
        <p className="font-medium leading-snug">{evento.titulo}</p>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
          {evento.local && (
            <span className="flex min-w-0 items-center gap-1.5">
              <MapPin className="size-3.5 shrink-0" />
              <span className="truncate">{evento.local}</span>
            </span>
          )}
          {evento.organizador && (
            <span className="flex min-w-0 items-center gap-1.5">
              <User className="size-3.5 shrink-0" />
              <span className="truncate">{evento.organizador}</span>
            </span>
          )}
          {evento.participantes?.length > 0 && (
            <span className="flex items-center gap-1.5">
              <Users className="size-3.5 shrink-0" />
              {evento.participantes.length}
            </span>
          )}
        </div>
      </div>

      {/* Ação */}
      {evento.linkReuniao && (
        <Button
          asChild
          size="sm"
          variant="outline"
          className="shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          <a href={evento.linkReuniao} target="_blank" rel="noreferrer">
            <Video className="size-4" />
            Entrar
          </a>
        </Button>
      )}
    </li>
  )
}

/**
 * Visão de um dia: lista detalhada de eventos.
 *
 * @param {{ eventos: object[], onSelecionar: (ev:object)=>void }} props
 */
export default function VisaoDia({ eventos, onSelecionar }) {
  if (eventos.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
          <div className="grid size-12 place-items-center rounded-full bg-muted">
            <Calendar className="size-6 text-muted-foreground" />
          </div>
          <div className="space-y-0.5">
            <p className="font-medium">Nenhum evento</p>
            <p className="text-sm text-muted-foreground">Você não tem compromissos neste dia.</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <ul className="space-y-2.5">
      {eventos.map((evento) => (
        <CardEvento key={evento.id} evento={evento} onSelecionar={onSelecionar} />
      ))}
    </ul>
  )
}
