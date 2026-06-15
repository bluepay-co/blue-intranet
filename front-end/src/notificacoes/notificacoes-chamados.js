import { createContext, useContext } from 'react'

/** Contexto das notificações de chamados (movimentações de status/chat). */
export const NotificacoesChamadosContext = createContext(null)

/** Hook de acesso ao contexto de notificações de chamados. */
export function useNotificacoesChamados() {
  const ctx = useContext(NotificacoesChamadosContext)
  if (!ctx) {
    throw new Error('useNotificacoesChamados deve ser usado dentro de <NotificacoesChamadosProvider>.')
  }
  return ctx
}
