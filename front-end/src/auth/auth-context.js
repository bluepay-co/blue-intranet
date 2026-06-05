import { createContext, useContext } from 'react'

/**
 * Contexto de autenticação da Intranet.
 * Mantém o usuário logado (id, nome, email, role) e o estado da sessão.
 */
export const AuthContext = createContext(null)

/** Hook de acesso ao contexto de autenticação. */
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth deve ser usado dentro de <AuthProvider>.')
  }
  return ctx
}
