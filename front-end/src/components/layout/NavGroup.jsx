import { useState } from 'react'
import { useLocation } from 'react-router-dom'
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

export default function NavGroup({ item }) {
  const { pathname } = useLocation()
  const Icon = item.icon

  const algumAtivo = item.children.some(
    (c) => pathname === c.to || pathname.startsWith(`${c.to}/`),
  )
  const [override, setOverride] = useState(null)
  const aberto = override ?? algumAtivo

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        onClick={() => setOverride(!aberto)}
        aria-expanded={aberto}
        isActive={algumAtivo}
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
