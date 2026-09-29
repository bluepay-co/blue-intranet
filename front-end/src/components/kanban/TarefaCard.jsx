import { ArrowRight, Clock, ListChecks, Lock, Repeat, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { ProgressoChecklist } from './ChecklistTarefa'
import { ALERTAS, PRIORIDADES, VISIBILIDADES, alerta, formatarData, iniciais, relativo, slaApertado } from './regras'

const ICONE_VIS = { private: Lock, requester: Repeat, team: Users }

export function Avatar({ nome, className }) {
  return (
    <span
      title={nome}
      className={cn('grid size-5 shrink-0 place-items-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground', className)}
    >
      {iniciais(nome)}
    </span>
  )
}

/**
 * Card de tarefa. `onStatus` recebe o próximo status (Iniciar/Concluir);
 * os botões só aparecem se o usuário puder mover a tarefa.
 */
export default function TarefaCard({ tarefa: t, onAbrir, onStatus, arrastando }) {
  const al = alerta(t)
  const prio = PRIORIDADES[t.prioridade]
  const IconeVis = ICONE_VIS[t.visibilidade]
  const feita = t.status === 'done'

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={() => onAbrir(t.id)}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onAbrir(t.id))}
      className={cn(
        'w-full cursor-pointer rounded-xl border bg-card p-3 text-left text-sm transition-colors hover:border-foreground/20',
        arrastando && 'opacity-60 shadow-lg',
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className={cn('rounded-md px-1.5 text-[10px] font-semibold leading-[17px]', prio.classe)}>{prio.label}</span>
          {al === 'stale' && <span className={cn('rounded-md px-1.5 text-[10px] font-semibold leading-[17px]', ALERTAS.stale.classe)}>{ALERTAS.stale.label}</span>}
          <span className="rounded-md bg-muted px-1.5 text-[10px] leading-[17px] text-muted-foreground">{t.area_solicitante}</span>
        </div>
        <IconeVis className="size-3.5 text-muted-foreground" aria-label={VISIBILIDADES[t.visibilidade].label} />
      </div>

      <p className={cn('my-2 font-semibold leading-snug', feita && 'text-muted-foreground line-through')}>{t.titulo}</p>

      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Avatar nome={t.solicitante_nome} />
        {t.solicitante_nome.split(' ')[0]}
        <ArrowRight className="size-3" />
        <Avatar nome={t.responsavel_nome} />
        {t.responsavel_nome.split(' ')[0]}
        {t.participantes.length > 0 && (
          <span className="ml-auto flex items-center" title={t.participantes.map((p) => p.nome).join(', ')}>
            {t.participantes.slice(0, 3).map((p) => (
              <Avatar key={p.id} nome={p.nome} className="-ml-1.5 ring-2 ring-card first:ml-0" />
            ))}
            {t.participantes.length > 3 && <span className="ml-1 text-[10px]">+{t.participantes.length - 3}</span>}
          </span>
        )}
      </div>

      {t.checklist_total > 0 && (
        <div className="mt-2.5 flex items-center gap-2 text-[11px] text-muted-foreground">
          <ListChecks className="size-3.5 shrink-0" />
          <ProgressoChecklist feitos={t.checklist_feitos} total={t.checklist_total} className="flex-1" />
          <span className="tabular-nums">
            {t.checklist_feitos}/{t.checklist_total}
          </span>
        </div>
      )}

      <div className="mt-2.5 flex items-center justify-between gap-2">
        <span
          className={cn(
            'flex items-center gap-1 text-xs text-muted-foreground',
            al === 'late' && 'text-destructive',
            slaApertado(t) && 'text-amber-500',
          )}
        >
          <Clock className="size-3" />
          {feita ? 'Concluída' : `${formatarData(t.prazo)} · ${relativo(t.prazo)}`}
        </span>
        {t.pode_mover && !feita && (
          <Button
            size="xs"
            variant="outline"
            onClick={(e) => {
              e.stopPropagation()
              onStatus(t.id, t.status === 'todo' ? 'doing' : 'done')
            }}
            onPointerDown={(e) => e.stopPropagation()}
          >
            {t.status === 'todo' ? 'Iniciar' : 'Concluir'}
          </Button>
        )}
      </div>
    </article>
  )
}
