import { useLocation, NavLink } from 'react-router-dom'
import { SidebarMenuItem, SidebarMenuButton, useSidebar } from '@/components/ui/sidebar'

export default function NavItemLink({ to, label, icon: Icon, end, badge = 0 }) {
  const { pathname } = useLocation()
  const { isMobile, setOpenMobile } = useSidebar()
  const isActive = end ? pathname === to : pathname.startsWith(to)

  function handleClick() {
    if (isMobile) setOpenMobile(false)
  }

export default function NavItemLink({ to, label, icon: Icon, end, onNavigate, nested = false, badge = 0, collapsed = false }) {
  return (
    <NavLink to={to} end={end} onClick={onNavigate} className="group block">
      {({ isActive }) => (
        <span
          title={collapsed ? label : undefined}
          className={cn(
            'relative flex items-center rounded-lg py-1.5 text-sm font-medium transition-all',
            collapsed
              ? 'justify-center px-2'
              : nested ? 'gap-3 pr-3 pl-9' : 'gap-3 px-3',
            isActive
              ? 'bg-white/10 text-white'
              : 'text-brand-foreground/65 hover:bg-white/5 hover:text-white',
          )}
        >
          {/* Indicador ativo — barra lateral quando expandido, ponto embaixo quando colapsado */}
          {isActive && !collapsed && (
            <span className="absolute inset-y-1.5 left-0 w-1 rounded-r-full bg-brand-accent" />
          )}
          {isActive && collapsed && (
            <span className="absolute bottom-0.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-brand-accent" />
          )}

          {Icon && (
            <Icon
              className={cn(
                'size-4 shrink-0 transition-colors',
                isActive ? 'text-brand-accent' : 'text-brand-foreground/50 group-hover:text-white',
              )}
            />
          )}

          {!collapsed && label}

          {/* Badge expandido */}
          {!collapsed && badge > 0 && (
            <span className="ml-auto grid min-w-5 place-items-center rounded-full bg-brand-accent px-1.5 text-[0.65rem] font-bold text-brand-accent-foreground">
              {badge > 99 ? '99+' : badge}
            </span>
          )}

          {/* Badge colapsado — ponto no canto do ícone */}
          {collapsed && badge > 0 && (
            <span className="absolute -top-0.5 -right-0.5 grid min-w-4 place-items-center rounded-full bg-brand-accent px-1 text-[0.6rem] font-bold text-brand-accent-foreground leading-none py-0.5">
              {badge > 9 ? '9+' : badge}
            </span>
          )}
        </span>
      )}
    </NavLink>
  )
}
