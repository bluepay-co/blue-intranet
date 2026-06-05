import { Plus, CalendarDays, Clock, Briefcase, UserX, ListTodo } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'

const OPCOES = [
  { tipo: 'evento', label: 'Evento', icon: CalendarDays },
  { tipo: 'ausente', label: 'Ausente', icon: UserX },
  { tipo: 'foco', label: 'Hora de se concentrar', icon: Clock },
  { tipo: 'local', label: 'Local de trabalho', icon: Briefcase },
  { tipo: 'tarefa', label: 'Tarefa', icon: ListTodo },
]

/**
 * Botão "Criar" com menu de tipos (Evento, Ausente, Foco, Local, Tarefa).
 * @param {{ onSelecionar: (tipo: string) => void }} props
 */
export default function BotaoCriar({ onSelecionar }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button className="bg-brand-accent text-brand-accent-foreground hover:bg-brand-accent/90">
          <Plus className="size-4" />
          Criar
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[14rem]">
        <DropdownMenuLabel>Adicionar à agenda</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {OPCOES.map(({ tipo, label, icon: Icon }) => (
          <DropdownMenuItem key={tipo} onSelect={() => onSelecionar(tipo)}>
            <Icon className="size-4 text-muted-foreground" />
            {label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
