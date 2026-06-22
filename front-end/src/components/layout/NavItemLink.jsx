import { useLocation, NavLink } from 'react-router-dom'
import { SidebarMenuItem, SidebarMenuButton, useSidebar } from '@/components/ui/sidebar'

export default function NavItemLink({ to, label, icon: Icon, end, badge = 0 }) {
  const { pathname } = useLocation()
  const { isMobile, setOpenMobile } = useSidebar()
  const isActive = end ? pathname === to : pathname.startsWith(to)

  function handleClick() {
    if (isMobile) setOpenMobile(false)
  }

  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild isActive={isActive} onClick={handleClick}>
        <NavLink to={to} end={end}>
          {Icon && <Icon className="size-3.5 shrink-0" />}
          <span>{label}</span>
          {badge > 0 && (
            <span className="ml-auto grid min-w-5 place-items-center rounded-full bg-sidebar-primary px-1.5 text-[0.65rem] font-bold text-sidebar-primary-foreground">
              {badge > 99 ? '99+' : badge}
            </span>
          )}
        </NavLink>
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
}
