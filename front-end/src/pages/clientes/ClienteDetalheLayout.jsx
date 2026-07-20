import { NavLink, Outlet, useNavigate, useParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { ArrowLeft } from 'lucide-react'

export default function ClienteDetalheLayout() {
  const { id } = useParams()
  const navigate = useNavigate()

  const ABAS = [
    { to: `/clientes/${id}`,     label: 'Geral', end: true },
    { to: `/clientes/${id}/mes`, label: 'Mês',   end: false },
  ]

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" className="gap-1.5 -mb-2" onClick={() => navigate('/clientes')}>
        <ArrowLeft className="size-4" /> Voltar para Meus Clientes
      </Button>

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
