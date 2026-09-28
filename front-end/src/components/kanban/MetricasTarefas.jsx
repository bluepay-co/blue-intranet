import { AlertTriangle, CheckCircle2, Clock, Flame, PauseCircle } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { FILTROS_RAPIDOS } from './regras'

const METRICAS = [
  ['late', 'Atrasadas', AlertTriangle, 'bg-destructive/10 text-destructive', 'ring-destructive/40'],
  ['urgent', 'Urgentes', Flame, 'bg-orange-500/10 text-orange-600 dark:text-orange-400', 'ring-orange-500/40'],
  ['sla', 'SLA apertado', Clock, 'bg-amber-500/10 text-amber-600 dark:text-amber-400', 'ring-amber-500/40'],
  ['stale', 'Esquecidas', PauseCircle, 'bg-purple-500/10 text-purple-600 dark:text-purple-400', 'ring-purple-500/40'],
  ['done', 'Finalizadas', CheckCircle2, 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400', 'ring-emerald-500/40'],
]

/** Métricas da aba atual; clicar filtra o quadro (clicar de novo limpa). */
export default function MetricasTarefas({ tarefas, ativo, onSelecionar }) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
      {METRICAS.map(([chave, rotulo, Icone, corIcone, corAtivo]) => (
        <button
          key={chave}
          type="button"
          aria-pressed={ativo === chave}
          onClick={() => onSelecionar(ativo === chave ? null : chave)}
          className="rounded-xl text-left focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <Card size="sm" className={cn('transition-shadow hover:ring-2 hover:ring-border', ativo === chave && `ring-2 ${corAtivo}`)}>
            <CardContent className="flex items-center gap-2.5 py-px">
              <div className={cn('grid size-8 place-items-center rounded-lg', corIcone)}>
                <Icone className="size-4" />
              </div>
              <div>
                <p className="text-lg leading-tight font-semibold">{tarefas.filter(FILTROS_RAPIDOS[chave]).length}</p>
                <p className="text-xs text-muted-foreground">{rotulo}</p>
              </div>
            </CardContent>
          </Card>
        </button>
      ))}
    </div>
  )
}
