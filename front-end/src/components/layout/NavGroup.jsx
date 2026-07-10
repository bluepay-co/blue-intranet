import { useState } from 'react'
import { useLocation, NavLink } from 'react-router-dom'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import NavItemLink from './NavItemLink'

export default function NavGroup({ item, onNavigate, collapsed = false }) {
  const { pathname } = useLocation()
  const Icon = item.icon

  const algumAtivo = item.children.some(
    (c) => pathname === c.to || pathname.startsWith(`${c.to}/`),
  )
  const [override, setOverride] = useState(null)
  const aberto = override ?? algumAtivo

  /* Modo colapsado: só ícone, clica navega para o primeiro filho */
  if (collapsed) {
    const firstChild = item.children[0]
    return (
      <NavLink to={firstChild?.to ?? '#'} onClick={onNavigate} className="group block">
        <span
          title={item.label}
          className={cn(
            'relative flex justify-center items-center rounded-lg px-2 py-1.5 text-sm font-medium transition-all',
            algumAtivo
              ? 'bg-foreground/10 text-foreground'
              : 'text-foreground/65 hover:bg-foreground/5 hover:text-foreground',
          )}
        >
          {algumAtivo && (
            <span className="absolute bottom-0.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-brand-accent" />
          )}
          {Icon && (
            <Icon
              className={cn(
                'size-4 shrink-0 transition-colors',
                algumAtivo ? 'text-brand-accent' : 'text-foreground/50 group-hover:text-foreground',
              )}
            />
          )}
        </span>
      </NavLink>
    )
  }

  /* Modo expandido */
  return (
    <div>
      <button
        onClick={() => setOverride(!aberto)}
        aria-expanded={aberto}
        className={cn(
          'group flex w-full items-center gap-3 rounded-lg px-3 py-1.5 text-sm font-medium transition-all',
          algumAtivo ? 'text-foreground' : 'text-foreground/65 hover:bg-foreground/5 hover:text-foreground',
        )}
      >
        {Icon && (
          <Icon
            className={cn(
              'size-4 shrink-0 transition-colors',
              algumAtivo
                ? 'text-brand-accent'
                : 'text-foreground/50 group-hover:text-foreground',
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
