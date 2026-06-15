import { cn } from '@/lib/utils'
import { rotuloStatus, rotuloCriticidade } from '@/api/modules/chamados'

const ESTILO_STATUS = {
  ABERTO: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  EM_ANDAMENTO: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  FECHADO: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
}

const ESTILO_CRITICIDADE = {
  BAIXO: 'bg-muted text-muted-foreground',
  MEDIO: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  ALTO: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  CRITICO: 'bg-destructive/10 text-destructive',
}

const base =
  'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap'

/** Selo colorido do status do chamado. */
export function StatusBadge({ status, className }) {
  return (
    <span className={cn(base, ESTILO_STATUS[status] ?? 'bg-muted text-muted-foreground', className)}>
      {rotuloStatus(status)}
    </span>
  )
}

/** Selo colorido da criticidade (SLA) do chamado. */
export function CriticidadeBadge({ criticidade, className }) {
  return (
    <span
      className={cn(
        base,
        ESTILO_CRITICIDADE[criticidade] ?? 'bg-muted text-muted-foreground',
        className,
      )}
    >
      {rotuloCriticidade(criticidade)}
    </span>
  )
}
