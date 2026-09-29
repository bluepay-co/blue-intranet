import { useState } from 'react'
import { Check, ListChecks, Plus, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { adicionarItemChecklist, atualizarItemChecklist, removerItemChecklist } from '@/api/modules/kanban'

/** Barra de progresso do checklist (usada no modal e no card). */
export function ProgressoChecklist({ feitos, total, className }) {
  const pct = total ? Math.round((feitos / total) * 100) : 0
  return (
    <div className={cn('h-1.5 overflow-hidden rounded-full bg-muted', className)}>
      <div className={cn('h-full rounded-full transition-all', pct === 100 ? 'bg-emerald-500' : 'bg-primary')} style={{ width: `${pct}%` }} />
    </div>
  )
}

/**
 * Checklist dentro do modal da tarefa. Marcar é otimista (a lista muda na hora
 * e volta ao estado do servidor se der erro); `onMudou` recarrega o detalhe.
 */
export default function ChecklistTarefa({ tarefaId, itens, podeEditar, onMudou }) {
  const [novo, setNovo] = useState('')
  const [marcados, setMarcados] = useState({})
  const [salvando, setSalvando] = useState(false)

  const concluido = (item) => marcados[item.id] ?? item.concluido
  const feitos = itens.filter(concluido).length

  /**
   * Executa a ação e recarrega o detalhe. O estado otimista do item só é
   * descartado DEPOIS da recarga (senão ele "pisca" o valor antigo) e só o do
   * próprio item (cliques rápidos em outros itens continuam valendo).
   */
  async function executar(acao, mensagemErro, itemId) {
    try {
      await acao()
    } catch (err) {
      toast.error(err.response?.data?.message ?? mensagemErro)
    } finally {
      await onMudou()
      if (itemId !== undefined) {
        setMarcados((m) => {
          const resto = { ...m }
          delete resto[itemId]
          return resto
        })
      }
    }
  }

  function alternar(item) {
    const valor = !concluido(item)
    setMarcados((m) => ({ ...m, [item.id]: valor }))
    executar(() => atualizarItemChecklist(tarefaId, item.id, { concluido: valor }), 'Não foi possível atualizar o item.', item.id)
  }

  async function adicionar(e) {
    e.preventDefault()
    if (!novo.trim()) return
    setSalvando(true)
    await executar(async () => {
      await adicionarItemChecklist(tarefaId, novo.trim())
      setNovo('')
    }, 'Não foi possível adicionar o item.')
    setSalvando(false)
  }

  // Sem itens e sem permissão, a seção não acrescenta nada.
  if (!itens.length && !podeEditar) return null

  return (
    <section className="space-y-2">
      <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
        <ListChecks className="size-4" />
        Checklist
        {itens.length > 0 && (
          <span className="font-normal">
            {feitos}/{itens.length}
          </span>
        )}
      </div>
      {itens.length > 0 && <ProgressoChecklist feitos={feitos} total={itens.length} />}

      <ul className="space-y-0.5">
        {itens.map((item) => (
          <li key={item.id} className="group flex items-start gap-2 rounded-md px-1 py-1 hover:bg-muted/50">
            <button
              type="button"
              role="checkbox"
              aria-checked={concluido(item)}
              disabled={!podeEditar}
              onClick={() => alternar(item)}
              className={cn(
                'mt-0.5 grid size-4 shrink-0 place-items-center rounded border transition-colors disabled:cursor-default',
                concluido(item) ? 'border-primary bg-primary text-primary-foreground' : 'border-input',
              )}
            >
              {concluido(item) && <Check className="size-3" />}
            </button>
            <span
              className={cn('min-w-0 flex-1 text-sm [overflow-wrap:anywhere]', concluido(item) && 'text-muted-foreground line-through')}
              title={item.concluido_por_nome ? `Concluído por ${item.concluido_por_nome}` : undefined}
            >
              {item.texto}
            </span>
            {podeEditar && (
              <button
                type="button"
                onClick={() => executar(() => removerItemChecklist(tarefaId, item.id), 'Não foi possível remover o item.')}
                className="rounded p-0.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-destructive focus-visible:opacity-100"
                aria-label={`Remover "${item.texto}"`}
              >
                <X className="size-3.5" />
              </button>
            )}
          </li>
        ))}
      </ul>

      {podeEditar && (
        <form onSubmit={adicionar} className="flex gap-2">
          <Input value={novo} onChange={(e) => setNovo(e.target.value)} placeholder="Adicionar item…" maxLength={300} className="h-8" />
          <Button type="submit" size="icon-sm" variant="outline" disabled={salvando || !novo.trim()} aria-label="Adicionar item">
            <Plus />
          </Button>
        </form>
      )}
    </section>
  )
}
