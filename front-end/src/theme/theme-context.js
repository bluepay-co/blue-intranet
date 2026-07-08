import { createContext, useContext } from 'react'

/**
 * Contexto de tema (claro/escuro) da Intranet.
 * Expõe o tema atual (`tema`) e um alternador (`alternarTema`).
 */
export const ThemeContext = createContext(null)

/** Hook de acesso ao contexto de tema. */
export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) {
    throw new Error('useTheme deve ser usado dentro de <ThemeProvider>.')
  }
  return ctx
}
