import { NavLink } from 'react-router-dom'
import { LogOut } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/auth/auth-context'
import { itensVisiveis } from './nav-items'

/** Primeira letra do nome, para o avatar. */
function inicial(nome) {
  return (nome?.trim()?.[0] ?? '?').toUpperCase()
}

/**
 * Sidebar da Intranet — limpa, com ícones e nas cores da marca.
 * Os itens são filtrados pelo cargo do usuário (RBAC).
 *
 * @param {{ className?: string, onNavigate?: () => void }} props
 *        `onNavigate` é chamado ao clicar num item (fecha o menu no mobile).
 */
export default function Sidebar({ className, onNavigate }) {
  const { usuario, logout } = useAuth()
  const itens = itensVisiveis(usuario?.role)

  return (
    <aside
      className={cn(
        'relative flex h-svh flex-col overflow-hidden bg-brand text-brand-foreground',
        className,
      )}
    >
      {/* Brilho decorativo na cor secundária */}
      <div className="pointer-events-none absolute -top-24 -left-16 h-56 w-56 rounded-full bg-brand-accent/15 blur-3xl" />

      {/* Marca */}
      <div className="relative flex h-16 items-center border-b border-white/10 px-5">
        <img src="/logo-branca.svg" alt="Blue Pay Solutions" className="h-7 w-auto" />
      </div>

      {/* Navegação */}
      <nav className="relative flex-1 space-y-1 px-3 py-4">
        <p className="px-3 pb-2 text-[0.7rem] font-semibold tracking-wider text-brand-foreground/40 uppercase">
          Navegação
        </p>
        {itens.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} onClick={onNavigate} className="group block">
            {({ isActive }) => (
              <span
                className={cn(
                  'relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all',
                  isActive
                    ? 'bg-white/10 text-white'
                    : 'text-brand-foreground/65 hover:bg-white/5 hover:text-white',
                )}
              >
                {isActive && (
                  <span className="absolute inset-y-1.5 left-0 w-1 rounded-r-full bg-brand-accent" />
                )}
                <Icon
                  className={cn(
                    'size-4 shrink-0 transition-colors',
                    isActive
                      ? 'text-brand-accent'
                      : 'text-brand-foreground/50 group-hover:text-white',
                  )}
                />
                {label}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Usuário + sair */}
      <div className="relative border-t border-white/10 p-3">
        <div className="flex items-center gap-3 rounded-lg bg-white/5 p-2.5">
          <div className="grid size-9 shrink-0 place-items-center rounded-full bg-brand-accent text-sm font-semibold text-brand-accent-foreground ring-2 ring-white/10">
            {inicial(usuario?.nome)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-white">{usuario?.nome}</p>
            <span className="mt-0.5 inline-block rounded-full bg-brand-accent/15 px-2 py-0.5 text-[0.65rem] font-semibold tracking-wide text-brand-accent uppercase">
              {usuario?.role}
            </span>
          </div>
        </div>
        <Button
          variant="ghost"
          onClick={logout}
          className="mt-2 w-full justify-start gap-3 text-brand-foreground/60 hover:bg-white/5 hover:text-white"
        >
          <LogOut className="size-4" />
          Sair
        </Button>
      </div>
    </aside>
  )
}
