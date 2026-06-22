import { Outlet } from 'react-router-dom'
import { NotificacoesBlogProvider } from '@/notificacoes/NotificacoesBlogProvider'
import { NotificacoesChamadosProvider } from '@/notificacoes/NotificacoesChamadosProvider'
import ChatProvider from '@/chat/ChatProvider'
import ChatFAB from '@/components/chat/ChatFAB'
import ChatPainel from '@/components/chat/ChatPainel'
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import { TooltipProvider } from '@/components/ui/tooltip'
import AppSidebar from './Sidebar'

export default function AppLayout() {
  return (
    <NotificacoesBlogProvider>
    <NotificacoesChamadosProvider>
    <ChatProvider>
    <TooltipProvider>
    <SidebarProvider>
      <AppSidebar />
      <div className="flex min-w-0 flex-1 flex-col h-svh overflow-hidden">
        <header className="flex items-center gap-3 border-b px-4 py-3 md:hidden">
          <SidebarTrigger />
          <img src="/logo-azul.svg" alt="Blue Pay Solutions" className="h-6 w-auto" />
        </header>
        <main className="flex-1 overflow-auto p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </SidebarProvider>
    </TooltipProvider>
    <ChatFAB />
    <ChatPainel />
    </ChatProvider>
    </NotificacoesChamadosProvider>
    </NotificacoesBlogProvider>
  )
}
