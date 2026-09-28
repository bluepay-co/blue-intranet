import { cn } from '@/lib/utils'
import TarefaCard from './TarefaCard'
import { GRUPOS, grupo } from './regras'

export default function VisaoPrioridade({ tarefas, onAbrir, onStatus }) {
  return (
    <div className="space-y-6">
      {GRUPOS.map((g) => {
        const itens = tarefas.filter((t) => grupo(t) === g.chave)
        if (!itens.length && g.chave === 'done') return null
        return (
          <section key={g.chave}>
            <h3 className="mb-2.5 flex items-center gap-2 text-xs font-semibold">
              <i className={cn('size-2 rounded-full', g.cor)} />
              {g.label}
              <em className="text-[11px] font-medium not-italic text-muted-foreground">{itens.length}</em>
              <span className="text-[11px] font-normal text-muted-foreground">{g.descricao}</span>
            </h3>
            {itens.length ? (
              <div className="grid grid-cols-[repeat(auto-fill,minmax(270px,1fr))] gap-2.5">
                {itens.map((t) => (
                  <TarefaCard key={t.id} tarefa={t} onAbrir={onAbrir} onStatus={onStatus} />
                ))}
              </div>
            ) : (
              <p className="text-[11px] text-muted-foreground">Nenhuma tarefa</p>
            )}
          </section>
        )
      })}
    </div>
  )
}
