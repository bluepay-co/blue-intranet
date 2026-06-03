import { useState } from 'react'
import { Moon, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'

function App() {
  const [dark, setDark] = useState(false)

  const toggleTheme = () => {
    setDark((prev) => {
      const next = !prev
      document.documentElement.classList.toggle('dark', next)
      return next
    })
  }

  return (
    <div className="min-h-svh bg-background text-foreground flex flex-col items-center justify-center gap-8 p-6">
      <header className="flex flex-col items-center gap-2 text-center">
        <span className="text-sm font-medium text-muted-foreground">
          Blue Intranet
        </span>
        <h1 className="text-4xl font-semibold tracking-tight">
          Ambiente pronto para estilizar
        </h1>
        <p className="max-w-md text-muted-foreground">
          Tailwind CSS v4 + shadcn/ui configurados. Edite{' '}
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-sm">
            src/App.jsx
          </code>{' '}
          para começar.
        </p>
      </header>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button>Primário</Button>
        <Button variant="secondary">Secundário</Button>
        <Button variant="outline">Outline</Button>
        <Button variant="ghost">Ghost</Button>
        <Button variant="destructive">Destrutivo</Button>
      </div>

      <Button variant="outline" size="sm" onClick={toggleTheme}>
        {dark ? <Sun /> : <Moon />}
        {dark ? 'Tema claro' : 'Tema escuro'}
      </Button>
    </div>
  )
}

export default App
