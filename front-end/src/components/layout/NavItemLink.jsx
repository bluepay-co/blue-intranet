import { NavLink } from 'react-router-dom'
import { cn } from '@/lib/utils'

/**
 * Link de navegação da sidebar (com indicador de ativo na cor secundária).
 *
 * @param {{
 *   to: string, label: string, icon?: React.ComponentType,
 *   end?: boolean, onNavigate?: () => void, nested?: boolean, badge?: number,
 * }} props
 */
export default function NavItemLink({ to, label, icon: Icon, end, onNavigate, nested = false, badge = 0 }) {
  return (
    <NavLink to={to} end={end} onClick={onNavigate} className="group block">
      {({ isActive }) => (
        <span
          className={cn(
            'relative flex items-center gap-3 rounded-lg py-1.5 text-sm font-medium transition-all',
            nested ? 'pr-3 pl-9' : 'px-3',
            isActive
              ? 'bg-white/10 text-white'
              : 'text-brand-foreground/65 hover:bg-white/5 hover:text-white',
          )}
        >
          {isActive && (
            <span className="absolute inset-y-1.5 left-0 w-1 rounded-r-full bg-brand-accent" />
          )}
          {Icon && (
            <Icon
              className={cn(
                'size-4 shrink-0 transition-colors',
                isActive ? 'text-brand-accent' : 'text-brand-foreground/50 group-hover:text-white',
              )}
            />
          )}
          {label}
          {badge > 0 && (
            <span className="ml-auto grid min-w-5 place-items-center rounded-full bg-brand-accent px-1.5 text-[0.65rem] font-bold text-brand-accent-foreground">
              {badge > 99 ? '99+' : badge}
            </span>
          )}
        </span>
      )}
    </NavLink>
  )
}
