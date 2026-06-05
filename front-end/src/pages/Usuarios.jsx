import { Users, ShieldCheck } from 'lucide-react'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card'

export default function Usuarios() {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="flex items-center gap-2">
        <div className="space-y-1">
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            Usuários
            <span className="inline-flex items-center gap-1 rounded-full bg-brand-accent/10 px-2.5 py-0.5 text-xs font-medium text-brand-accent">
              <ShieldCheck className="size-3" />
              Somente T.I
            </span>
          </h1>
          <p className="text-muted-foreground">
            Gestão de acessos e cargos (RBAC) da intranet.
          </p>
        </div>
      </header>

      <Card>
        <CardHeader>
          <div className="mb-2 grid size-10 place-items-center rounded-lg bg-brand text-brand-foreground">
            <Users className="size-5" />
          </div>
          <CardTitle>Gestão de usuários</CardTitle>
          <CardDescription>
            Listagem, promoção de cargos e controle de acessos dos colaboradores.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">🚧 Em construção.</p>
        </CardContent>
      </Card>
    </div>
  )
}
