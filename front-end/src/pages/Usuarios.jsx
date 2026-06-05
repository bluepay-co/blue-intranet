import { Users, ShieldCheck } from 'lucide-react'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card'
import PageHeader from '@/components/layout/PageHeader'

export default function Usuarios() {
  return (
    <div className="max-w-5xl space-y-6">
      <PageHeader title="Usuários" subtitle="Gestão de acessos e cargos (RBAC) da intranet.">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-accent/10 px-3 py-1 text-xs font-semibold tracking-wide text-brand-accent uppercase">
          <ShieldCheck className="size-3.5" />
          Somente T.I
        </span>
      </PageHeader>

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
          <p className="text-sm text-muted-foreground">Em construção.</p>
        </CardContent>
      </Card>
    </div>
  )
}
