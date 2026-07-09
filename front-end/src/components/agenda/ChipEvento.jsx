import { horario } from '@/lib/datas'
import { cn } from '@/lib/utils'

/**
 * Chip compacto de evento, usado nas visões de semana e mês.
 *
 * @param {{ evento: object, onClick: () => void, compacto?: boolean }} props
 *        `compacto` esconde o horário (útil nas células apertadas do mês).
 */
export default function ChipEvento({ evento, onClick, compacto = false }) {
  if (evento.diaInteiro) {
    return (
      <button
        onClick={onClick}
        title={evento.titulo}
        style={evento.cor ? { backgroundColor: evento.cor } : undefined}
        className={cn(
          'block w-full truncate rounded-md bg-brand-accent px-2 py-1 text-left text-xs font-medium transition-opacity hover:opacity-90',
          evento.cor ? 'text-white' : 'text-brand-accent-foreground',
        )}
      >
        {evento.titulo}
      </button>
    )
  }

  return (
    <button
      onClick={onClick}
      title={evento.titulo}
      className="flex w-full items-center gap-1.5 rounded-md px-2 py-1 text-left text-xs transition-colors hover:bg-muted"
    >
      <span
        className="size-1.5 shrink-0 rounded-full bg-brand-accent"
        style={evento.cor ? { backgroundColor: evento.cor } : undefined}
      />
      {!compacto && evento.inicio && (
        <span className="shrink-0 font-medium tabular-nums text-muted-foreground">
          {horario(evento.inicio)}
        </span>
      )}
      <span className="truncate">{evento.titulo}</span>
    </button>
  )
}
