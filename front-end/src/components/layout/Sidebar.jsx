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

export default function AppSidebar() {
  const { usuario, logout } = useAuth()
  const { naoVistos } = useNotificacoesBlog()
  const { naoVistos: chamadosNaoVistos } = useNotificacoesChamados()
  const secoes = secoesVisiveis(usuario?.role)

  return (
    <Sidebar>
      <SidebarHeader className="h-16 items-center justify-start border-b border-sidebar-border px-5 py-0">
        <img src="/logo-branca.svg" alt="Blue Pay Solutions" className="h-7 w-auto" />
      </SidebarHeader>

      <SidebarContent className="px-3 py-3">
        {secoes.map((secao, i) => (
          <span key={secao.label}>
            {i > 0 && <SidebarSeparator className="my-2 bg-sidebar-border" />}
            <SidebarGroup className="p-0">
              <SidebarGroupLabel className="px-2 pb-0.5 text-[0.6rem] font-semibold tracking-widest text-sidebar-foreground/30 uppercase">
                {secao.label}
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {secao.items.map((item) =>
                    item.children ? (
                      <NavGroup key={item.label} item={item} />
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
                      />
                    ),
                  )}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </span>
        ))}
      </SidebarContent>

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
