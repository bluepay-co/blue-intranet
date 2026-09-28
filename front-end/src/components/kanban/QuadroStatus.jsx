import { DndContext, PointerSensor, useDraggable, useDroppable, useSensor, useSensors } from '@dnd-kit/core'
import { cn } from '@/lib/utils'
import TarefaCard from './TarefaCard'
import { COLUNAS, coluna } from './regras'

function CardArrastavel({ tarefa, ...props }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: tarefa.id,
    disabled: !tarefa.pode_mover,
  })
  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, zIndex: 10 } : undefined
  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes} className="touch-none">
      <TarefaCard tarefa={tarefa} arrastando={isDragging} {...props} />
    </div>
  )
}

function Coluna({ def, tarefas, ...props }) {
  const { setNodeRef, isOver } = useDroppable({ id: def.chave, disabled: def.semDrop })
  return (
    <div
      ref={setNodeRef}
      className={cn(
        'min-h-32 rounded-2xl border bg-muted/30 p-2.5 transition-colors',
        isOver && 'border-primary bg-primary/5',
      )}
    >
      <h3 className="mx-1 mb-2.5 flex items-center gap-2 text-xs font-semibold">
        <i className={cn('size-2 rounded-full', def.cor)} />
        {def.label}
        <em className="text-[11px] font-medium not-italic text-muted-foreground">{tarefas.length}</em>
      </h3>
      <div className="flex flex-col gap-2">
        {tarefas.map((t) => (
          <CardArrastavel key={t.id} tarefa={t} {...props} />
        ))}
        {!tarefas.length && <p className="py-3 text-center text-[11px] text-muted-foreground">Nenhuma tarefa</p>}
      </div>
    </div>
  )
}

/** Kanban: A fazer / Em andamento / Finalizado + Urgente (drop muda prioridade) + Atrasado (calculada). */
export default function QuadroStatus({ tarefas, onAbrir, onStatus, onMover }) {
  // Distância mínima para diferenciar clique (abrir) de arraste.
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  function aoSoltar({ active, over }) {
    const destino = COLUNAS.find((c) => c.chave === over?.id)
    const tarefa = tarefas.find((t) => t.id === active.id)
    if (!destino || destino.semDrop || !tarefa || coluna(tarefa) === destino.chave) return

    if (destino.chave === 'urgent') return onMover(tarefa.id, { prioridade: 'urgent' })
    // Saindo de "Urgente" para A fazer/Em andamento: rebaixa para Importante,
    // senão o card voltaria para a coluna Urgente.
    const saiDeUrgente = tarefa.prioridade === 'urgent' && destino.chave !== 'done'
    onMover(tarefa.id, {
      ...(tarefa.status !== destino.chave && { status: destino.chave }),
      ...(saiDeUrgente && { prioridade: 'high' }),
    })
  }

  return (
    <DndContext sensors={sensors} onDragEnd={aoSoltar}>
      <div className="grid grid-cols-[repeat(5,minmax(220px,1fr))] items-start gap-3 overflow-x-auto pb-2">
        {COLUNAS.map((def) => (
          <Coluna
            key={def.chave}
            def={def}
            tarefas={tarefas.filter((t) => coluna(t) === def.chave)}
            onAbrir={onAbrir}
            onStatus={onStatus}
          />
        ))}
      </div>
    </DndContext>
  )
}
