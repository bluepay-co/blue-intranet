import { NavLink, Outlet } from 'react-router-dom'
import { cn } from '@/lib/utils'

const ABAS = [
  { to: '/metricas/comercial',     label: 'Geral',         end: true },
  { to: '/metricas/comercial/is',  label: 'Inside Sales',  end: false },
  { to: '/metricas/comercial/kam', label: 'KAM',           end: false },
]

export default function DashboardComercialLayout() {
  return (
    <div className="space-y-6">
      <div className="flex gap-1 border-b border-border">
        {ABAS.map(({ to, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
                isActive
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground',
              )
            }
          >
            {label}
          </NavLink>
        ))}
      </div>
      <Outlet />
    </div>
  )
}
