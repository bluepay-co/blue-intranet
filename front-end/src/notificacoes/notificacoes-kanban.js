import { createContext, useContext } from 'react'

/** Contexto das notificações do Kanban de Tarefas (popups + versão para recarregar o quadro). */
export const NotificacoesKanbanContext = createContext(null)

/** Hook de acesso ao contexto de notificações do Kanban. */
export function useKanbanNotificacoes() {
  const ctx = useContext(NotificacoesKanbanContext)
  if (!ctx) {
    throw new Error('useKanbanNotificacoes deve ser usado dentro de <NotificacoesKanbanProvider>.')
  }
  return ctx
}
