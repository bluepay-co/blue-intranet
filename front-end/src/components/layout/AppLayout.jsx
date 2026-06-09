import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Menu } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { NotificacoesBlogProvider } from '@/notificacoes/NotificacoesBlogProvider'
import Sidebar from './Sidebar'

/**
 * Casca autenticada da Intranet: sidebar fixa no desktop e gaveta no mobile,
 * com a área de conteúdo renderizada pelo <Outlet/> das rotas filhas.
 */
export default function AppLayout() {
  const [menuAberto, setMenuAberto] = useState(false)

  return (
    <NotificacoesBlogProvider>
    <div className="flex h-svh overflow-hidden bg-background text-foreground">
      {/* Sidebar fixa (desktop) */}
      <Sidebar className="hidden w-64 shrink-0 border-r border-white/5 md:flex" />

      {/* Sidebar em gaveta (mobile) */}
      <div
        className={cn(
          'fixed inset-0 z-40 bg-black/50 transition-opacity md:hidden',
          menuAberto ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
        onClick={() => setMenuAberto(false)}
      />
      <Sidebar
        onNavigate={() => setMenuAberto(false)}
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-64 transition-transform md:hidden',
          menuAberto ? 'translate-x-0' : '-translate-x-full',
        )}
      />

      {/* Conteúdo */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 border-b px-4 py-3 md:hidden">
          <Button variant="ghost" size="icon" onClick={() => setMenuAberto(true)}>
            <Menu className="size-5" />
          </Button>
          <img src="/logo-azul.svg" alt="Blue Pay Solutions" className="h-6 w-auto" />
        </header>

        <main className="flex-1 overflow-auto p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
    </NotificacoesBlogProvider>
  )
}
