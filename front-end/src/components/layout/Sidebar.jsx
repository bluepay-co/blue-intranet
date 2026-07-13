import { ChevronLeft, ChevronRight, LogOut } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import ThemeToggle from '@/components/ThemeToggle'
import { useAuth } from '@/auth/auth-context'
import { useNotificacoesBlog } from '@/notificacoes/notificacoes-blog'
import { useNotificacoesChamados } from '@/notificacoes/notificacoes-chamados'
import { useChat } from '@/chat/chat-context'
import { secoesVisiveis } from './nav-items'
import { rotuloRole } from '@/api/modules/usuarios'
import NavItemLink from './NavItemLink'
import NavGroup from './NavGroup'

function inicial(nome) {
  return (nome?.trim()?.[0] ?? '?').toUpperCase()
}

export default function Sidebar({ className, onNavigate, collapsed = false, onToggle }) {
  const { usuario, logout } = useAuth()
  const { naoVistos } = useNotificacoesBlog()
  const { naoVistos: chamadosNaoVistos } = useNotificacoesChamados()
  const { totalNaoLidos } = useChat()
  const secoes = secoesVisiveis(usuario?.role)

  return (
    <aside
      className={cn(
        'relative flex h-svh flex-col overflow-hidden bg-sidebar text-sidebar-foreground',
        className,
      )}
    >
      {/* Marca + botão de colapso */}
      <div className="relative flex h-16 items-center border-b border-sidebar-border px-3">
        {!collapsed && (
          <img src="/logo.png" alt="Blue Pay Solutions" className="h-7 w-auto flex-1 object-contain object-left" />
        )}
        {onToggle && (
          <button
            onClick={onToggle}
            title={collapsed ? 'Expandir menu' : 'Recolher menu'}
            className={cn(
              'grid size-8 shrink-0 place-items-center rounded-lg text-foreground/60 transition-colors hover:bg-foreground/10 hover:text-foreground',
              collapsed && 'mx-auto',
            )}
          >
            {collapsed
              ? <ChevronRight className="size-4" />
              : <ChevronLeft className="size-4" />
            }
          </button>
        )}
      </div>

      {/* Navegação */}
      <nav className="relative flex-1 space-y-3 overflow-y-auto px-2 py-3">
        {secoes.map((secao) => (
          <div key={secao.label} className="space-y-1">
            {!collapsed && (
              <p className="px-3 pb-1 text-[0.7rem] font-semibold tracking-wider text-foreground/40 uppercase">
                {secao.label}
              </p>
            )}
            {secao.items.map((item) =>
              item.children ? (
                <NavGroup
                  key={item.label}
                  item={item}
                  onNavigate={onNavigate}
                  collapsed={collapsed}
                />
              ) : (
                <NavItemLink
                  key={item.to}
                  {...item}
                  badge={
                    item.to === '/blog'
                      ? naoVistos
                      : item.to === '/chamados' || item.to === '/ti/chamados'
                        ? chamadosNaoVistos
                        : item.to === '/chat'
                          ? totalNaoLidos
                          : 0
                  }
                  onNavigate={onNavigate}
                  collapsed={collapsed}
                />
              ),
            )}
          </div>
        ))}
      </nav>

      {/* Usuário + sair */}
      <div className="relative border-t border-sidebar-border p-3">
        {collapsed ? (
          <div className="flex flex-col items-center gap-2">
            <div
              title={usuario?.nome}
              className="grid size-9 place-items-center rounded-full bg-brand-accent text-sm font-semibold text-brand-accent-foreground ring-2 ring-foreground/10 cursor-default"
            >
              {inicial(usuario?.nome)}
            </div>
            <ThemeToggle className="size-8 text-foreground/60 hover:bg-foreground/5 hover:text-foreground" />
            <Button
              variant="ghost"
              size="icon"
              onClick={logout}
              title="Sair"
              className="size-8 text-foreground/60 hover:bg-foreground/5 hover:text-foreground"
            >
              <LogOut className="size-4" />
            </Button>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 rounded-lg bg-foreground/5 p-2.5">
              <div className="grid size-9 shrink-0 place-items-center rounded-full bg-brand-accent text-sm font-semibold text-brand-accent-foreground ring-2 ring-foreground/10">
                {inicial(usuario?.nome)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">{usuario?.nome}</p>
                <span className="mt-0.5 inline-block rounded-full bg-brand-accent/15 px-2 py-0.5 text-[0.65rem] font-semibold tracking-wide text-brand-accent uppercase">
                  {rotuloRole(usuario?.role)}
                </span>
              </div>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <Button
                variant="ghost"
                onClick={logout}
                className="flex-1 justify-start gap-3 text-foreground/60 hover:bg-foreground/5 hover:text-foreground"
              >
                <LogOut className="size-4" />
                Sair
              </Button>
              <ThemeToggle className="shrink-0 text-foreground/60 hover:bg-foreground/5 hover:text-foreground" />
            </div>
          </>
        )}
      </div>
    </aside>
  )
}
