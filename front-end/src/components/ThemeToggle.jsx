import { Moon, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTheme } from '@/theme/theme-context'

/** Botão de alternância entre tema claro e escuro. */
export default function ThemeToggle({ className }) {
  const { tema, alternarTema } = useTheme()
  const escuro = tema === 'dark'

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={alternarTema}
      className={className}
      aria-label={escuro ? 'Ativar tema claro' : 'Ativar tema escuro'}
      title={escuro ? 'Tema claro' : 'Tema escuro'}
    >
      {escuro ? <Sun className="size-5" /> : <Moon className="size-5" />}
    </Button>
  )
}
