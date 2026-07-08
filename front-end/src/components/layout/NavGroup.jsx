import { useState } from 'react'
import { useLocation, NavLink } from 'react-router-dom'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
} from '@/components/ui/sidebar'
import { NavLink } from 'react-router-dom'

export default function NavGroup({ item, onNavigate, collapsed = false }) {
export default function NavGroup({ item }) {
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
              ? 'bg-white/10 text-white'
              : 'text-brand-foreground/65 hover:bg-white/5 hover:text-white',
          )}
        >
          {algumAtivo && (
            <span className="absolute bottom-0.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-brand-accent" />
          )}
          {Icon && (
            <Icon
              className={cn(
                'size-4 shrink-0 transition-colors',
                algumAtivo ? 'text-brand-accent' : 'text-brand-foreground/50 group-hover:text-white',
              )}
            />
          )}
        </span>
      </NavLink>
    )
  }

  /* Modo expandido */
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        onClick={() => setOverride(!aberto)}
        aria-expanded={aberto}
        className={cn(
          'group flex w-full items-center gap-3 rounded-lg px-3 py-1.5 text-sm font-medium transition-all',
          algumAtivo ? 'text-white' : 'text-brand-foreground/65 hover:bg-white/5 hover:text-white',
        )}
      >
        {Icon && <Icon className="size-3.5 shrink-0" />}
        <span className="flex-1 text-left">{item.label}</span>
        <ChevronDown className={cn('size-4 shrink-0 transition-transform', aberto && 'rotate-180')} />
      </SidebarMenuButton>

      {aberto && (
        <SidebarMenuSub>
          {item.children.map((filho) => {
            const isActive = pathname === filho.to || pathname.startsWith(`${filho.to}/`)
            const ChildIcon = filho.icon
            return (
              <SidebarMenuSubItem key={filho.to}>
                <SidebarMenuSubButton asChild isActive={isActive}>
                  <NavLink to={filho.to} end={filho.end}>
                    {ChildIcon && <ChildIcon className="size-3.5 shrink-0" />}
                    <span>{filho.label}</span>
                  </NavLink>
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>
            )
          })}
        </SidebarMenuSub>
      )}
    </SidebarMenuItem>
  )
}
