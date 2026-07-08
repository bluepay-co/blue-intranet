import { useCallback, useEffect, useMemo, useState } from 'react'
import { ThemeContext } from './theme-context'

const STORAGE_KEY = 'blue-intranet:tema'

/** Lê a preferência salva ou cai na preferência do sistema operacional. */
function temaInicial() {
  if (typeof window === 'undefined') return 'light'
  const salvo = localStorage.getItem(STORAGE_KEY)
  if (salvo === 'light' || salvo === 'dark') return salvo
  const prefereDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  return prefereDark ? 'dark' : 'light'
}

/**
 * Provedor de tema. Aplica/remove a classe `.dark` no <html> (Tailwind v4)
 * e persiste a escolha do usuário no localStorage.
 */
export default function ThemeProvider({ children }) {
  const [tema, setTema] = useState(temaInicial)

  // Reflete o tema na raiz do documento sempre que mudar.
  useEffect(() => {
    const raiz = document.documentElement
    raiz.classList.toggle('dark', tema === 'dark')
    localStorage.setItem(STORAGE_KEY, tema)
  }, [tema])

  const alternarTema = useCallback(() => {
    setTema(t => (t === 'dark' ? 'light' : 'dark'))
  }, [])

  const valor = useMemo(
    () => ({ tema, alternarTema, setTema }),
    [tema, alternarTema],
  )

  return <ThemeContext.Provider value={valor}>{children}</ThemeContext.Provider>
}
