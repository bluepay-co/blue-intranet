import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import NavItemLink from './NavItemLink'

/**
 * Grupo de navegação expansível na sidebar (ex.: Agenda → Calendário, Tarefas).
 * Abre automaticamente quando uma rota filha está ativa; o usuário pode alternar.
 *
 * @param {{ item: { label: string, icon?: React.ComponentType, children: object[] }, onNavigate?: () => void }} props
 */
export default function NavGroup({ item, onNavigate }) {
  const { pathname } = useLocation()
  const Icon = item.icon

  const algumAtivo = item.children.some(
    (c) => pathname === c.to || pathname.startsWith(`${c.to}/`),
  )
  const [override, setOverride] = useState(null)
  const aberto = override ?? algumAtivo

  return (
    <div>
      <button
        onClick={() => setOverride(!aberto)}
        aria-expanded={aberto}
        className={cn(
          'group flex w-full items-center gap-3 rounded-lg px-3 py-1.5 text-sm font-medium transition-all',
          algumAtivo ? 'text-white' : 'text-brand-foreground/65 hover:bg-white/5 hover:text-white',
        )}
      >
        {Icon && (
          <Icon
            className={cn(
              'size-4 shrink-0 transition-colors',
              algumAtivo
                ? 'text-brand-accent'
                : 'text-brand-foreground/50 group-hover:text-white',
            )}
          />
        )}
        <span className="flex-1 text-left">{item.label}</span>
        <ChevronDown className={cn('size-4 shrink-0 transition-transform', aberto && 'rotate-180')} />
      </button>

      {aberto && (
        <div className="mt-1 space-y-1">
          {item.children.map((filho) => (
            <NavItemLink key={filho.to} {...filho} nested onNavigate={onNavigate} />
          ))}
        </div>
      )}
    </div>
  )
}
