import { Calendar } from 'lucide-react'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card'
import { useAuth } from '@/auth/auth-context'

export default function Agenda() {
  const { usuario } = useAuth()

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Agenda</h1>
        <p className="text-muted-foreground">
          Compromissos da conta <strong>{usuario?.email}</strong>.
        </p>
      </header>

      <Card>
        <CardHeader>
          <div className="mb-2 grid size-10 place-items-center rounded-lg bg-brand text-brand-foreground">
            <Calendar className="size-5" />
          </div>
          <CardTitle>Integração com o Google Calendar</CardTitle>
          <CardDescription>
            Em breve seus eventos do Google Workspace aparecerão aqui,
            sincronizados pelo login corporativo.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">🚧 Em construção.</p>
        </CardContent>
      </Card>
    </div>
  )
}
