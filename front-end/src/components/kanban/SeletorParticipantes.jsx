import { useMemo, useState } from 'react'
import { X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { ROTULOS_ROLE } from '@/api/modules/usuarios'
import { Avatar } from './TarefaCard'

const MAX_SUGESTOES = 6

/**
 * Busca e seleção de participantes (qualquer equipe com Kanban).
 * `excluir` recebe ids que já acompanham a tarefa por outro papel.
 */
export default function SeletorParticipantes({ usuarios, selecionados, onChange, excluir = [] }) {
  const [busca, setBusca] = useState('')

  const escolhidos = selecionados.map((id) => usuarios.find((u) => u.id === id)).filter(Boolean)

  const sugestoes = useMemo(() => {
    const q = busca.trim().toLowerCase()
    if (!q) return []
    return usuarios
      .filter((u) => !selecionados.includes(u.id) && !excluir.includes(u.id))
      .filter((u) => `${u.nome} ${ROTULOS_ROLE[u.role] ?? u.role}`.toLowerCase().includes(q))
      .slice(0, MAX_SUGESTOES)
  }, [busca, usuarios, selecionados, excluir])

  function adicionar(id) {
    onChange([...selecionados, id])
    setBusca('')
  }

  return (
    <div className="grid gap-2">
      {escolhidos.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {escolhidos.map((u) => (
            <span key={u.id} className="flex items-center gap-1.5 rounded-full border bg-card py-0.5 pr-1 pl-0.5 text-xs text-foreground">
              <Avatar nome={u.nome} />
              {u.nome.split(' ').slice(0, 2).join(' ')}
              <button
                type="button"
                onClick={() => onChange(selecionados.filter((id) => id !== u.id))}
                className="rounded-full p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label={`Remover ${u.nome}`}
              >
                <X className="size-3" />
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="relative">
        <Input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              if (sugestoes[0]) adicionar(sugestoes[0].id)
            }
          }}
          placeholder="Buscar pessoa por nome ou equipe…"
          className="h-9"
        />
        {sugestoes.length > 0 && (
          <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-lg border bg-popover text-popover-foreground shadow-md">
            {sugestoes.map((u) => (
              <li key={u.id}>
                <button
                  type="button"
                  onClick={() => adicionar(u.id)}
                  className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-sm hover:bg-muted"
                >
                  <Avatar nome={u.nome} />
                  <span className="flex-1 truncate">{u.nome}</span>
                  <span className="text-[11px] text-muted-foreground">{ROTULOS_ROLE[u.role] ?? u.role}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
