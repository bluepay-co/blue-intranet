import { LogOut } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/auth/auth-context'
import { useNotificacoesBlog } from '@/notificacoes/notificacoes-blog'
import { useNotificacoesChamados } from '@/notificacoes/notificacoes-chamados'
import { secoesVisiveis } from './nav-items'
import NavItemLink from './NavItemLink'
import NavGroup from './NavGroup'

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
  const { naoVistos } = useNotificacoesBlog()
  const { naoVistos: chamadosNaoVistos } = useNotificacoesChamados()
  const secoes = secoesVisiveis(usuario?.role)

  return (
    <aside
      className={cn(
        'flex h-svh flex-col bg-brand text-brand-foreground',
        className,
      )}
    >
      {/* Marca */}
      <div className="flex h-16 items-center border-b border-white/10 px-5">
        <img src="/logo-branca.svg" alt="Blue Pay Solutions" className="h-7 w-auto" />
      </div>

      {/* Navegação — agrupada por seção/setor */}
      <nav className="flex-1 space-y-2 overflow-y-auto px-3 py-3">
        {secoes.map((secao) => (
          <div key={secao.label} className="space-y-0.5">
            <p className="px-2 pb-0.5 pt-1 text-[0.6rem] font-semibold tracking-widest text-brand-foreground/30 uppercase">
              {secao.label}
            </p>
            {secao.items.map((item) =>
              item.children ? (
                <NavGroup key={item.label} item={item} onNavigate={onNavigate} />
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
                />
              ),
            )}
          </div>
        ))}
      </nav>

      {/* Usuário + sair */}
      <div className="relative shrink-0 border-t border-white/10 p-3">
        <div className="flex items-center gap-2.5 rounded-lg bg-white/5 px-2.5 py-2">
          <div className="grid size-7 shrink-0 place-items-center rounded-full bg-brand-accent text-xs font-semibold text-brand-accent-foreground ring-1 ring-white/10">
            {inicial(usuario?.nome)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-white">{usuario?.nome}</p>
            <span className="text-[0.6rem] font-semibold tracking-wide text-brand-accent uppercase">
              {usuario?.role}
            </span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={logout}
            className="size-7 shrink-0 text-brand-foreground/50 hover:bg-white/5 hover:text-white"
            title="Sair"
          >
            <LogOut className="size-3.5" />
          </Button>
        </div>
      </div>
    </aside>
  )
}
