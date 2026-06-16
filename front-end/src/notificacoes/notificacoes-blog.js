import { createContext, useContext } from 'react'

/**
 * Contexto das notificações de novos posts do Marketing.
 * Expõe `naoVistos` (contagem para o badge da sidebar) e `marcarVisto`.
 * O provider que alimenta esses valores fica em <NotificacoesBlogProvider/>.
 */
export const NotificacoesBlogContext = createContext(null)

/** Hook de acesso às notificações do blog. */
export function useNotificacoesBlog() {
  const ctx = useContext(NotificacoesBlogContext)
  if (!ctx) {
    throw new Error('useNotificacoesBlog deve ser usado dentro de <NotificacoesBlogProvider>.')
  }
  return ctx
}
