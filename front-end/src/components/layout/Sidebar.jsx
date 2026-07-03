import { ChevronLeft, ChevronRight, LogOut } from 'lucide-react'
import { cn } from '@/lib/utils'
import { LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarSeparator,
} from '@/components/ui/sidebar'
import { useAuth } from '@/auth/auth-context'
import { useNotificacoesBlog } from '@/notificacoes/notificacoes-blog'
import { useNotificacoesChamados } from '@/notificacoes/notificacoes-chamados'
import { secoesVisiveis } from './nav-items'
import NavItemLink from './NavItemLink'
import NavGroup from './NavGroup'

function inicial(nome) {
  return (nome?.trim()?.[0] ?? '?').toUpperCase()
}

export default function Sidebar({ className, onNavigate, collapsed = false, onToggle }) {
export default function AppSidebar() {
  const { usuario, logout } = useAuth()
  const { naoVistos } = useNotificacoesBlog()
  const { naoVistos: chamadosNaoVistos } = useNotificacoesChamados()
  const secoes = secoesVisiveis(usuario?.role)

  return (
    <aside
      className={cn(
        'relative flex h-svh flex-col overflow-hidden bg-brand text-brand-foreground',
        className,
      )}
    >
      {/* Brilho decorativo */}
      <div className="pointer-events-none absolute -top-24 -left-16 h-56 w-56 rounded-full bg-brand-accent/15 blur-3xl" />

      {/* Marca + botão de colapso */}
      <div className="relative flex h-16 items-center border-b border-white/10 px-3">
        {!collapsed && (
          <img src="/logo-branca.svg" alt="Blue Pay Solutions" className="h-7 w-auto flex-1" />
        )}
        {onToggle && (
          <button
            onClick={onToggle}
            title={collapsed ? 'Expandir menu' : 'Recolher menu'}
            className={cn(
              'grid size-8 shrink-0 place-items-center rounded-lg text-brand-foreground/60 transition-colors hover:bg-white/10 hover:text-white',
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
    <Sidebar>
      <SidebarHeader className="h-16 items-center justify-start border-b border-sidebar-border px-5 py-0">
        <img src="/logo-branca.svg" alt="Blue Pay Solutions" className="h-7 w-auto" />
      </SidebarHeader>

      {/* Navegação */}
      <nav className="relative flex-1 space-y-3 overflow-y-auto px-2 py-3">
        {secoes.map((secao) => (
          <div key={secao.label} className="space-y-1">
            {!collapsed && (
              <p className="px-3 pb-1 text-[0.7rem] font-semibold tracking-wider text-brand-foreground/40 uppercase">
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
                        : 0
                  }
                  onNavigate={onNavigate}
                  collapsed={collapsed}
                />
              ),
            )}
          </div>
        ))}
      </SidebarContent>

      {/* Usuário + sair */}
      <div className="relative border-t border-white/10 p-3">
        {collapsed ? (
          <div className="flex flex-col items-center gap-2">
            <div
              title={usuario?.nome}
              className="grid size-9 place-items-center rounded-full bg-brand-accent text-sm font-semibold text-brand-accent-foreground ring-2 ring-white/10 cursor-default"
            >
              {inicial(usuario?.nome)}
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={logout}
              title="Sair"
              className="size-8 text-brand-foreground/60 hover:bg-white/5 hover:text-white"
            >
              <LogOut className="size-4" />
            </Button>
          </div>
        ) : (
          <>
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
          </>
        )}
      </div>
    </aside>
      <SidebarFooter className="border-t border-sidebar-border p-3">
        <div className="flex items-center gap-2.5 rounded-lg bg-sidebar-accent px-2.5 py-2">
          <div className="grid size-7 shrink-0 place-items-center rounded-full bg-sidebar-primary text-xs font-semibold text-sidebar-primary-foreground ring-1 ring-sidebar-border">
            {inicial(usuario?.nome)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-sidebar-foreground">{usuario?.nome}</p>
            <span className="text-[0.6rem] font-semibold tracking-wide text-sidebar-primary uppercase">
              {usuario?.role}
            </span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={logout}
            className="size-7 shrink-0 text-sidebar-foreground/50 hover:bg-white/5 hover:text-sidebar-foreground"
            title="Sair"
          >
            <LogOut className="size-3.5" />
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
