import { Link } from 'react-router-dom'
import { Calendar, Users, ArrowRight } from 'lucide-react'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { useAuth } from '@/auth/auth-context'

/** Atalhos do dashboard, filtrados por cargo. */
const ATALHOS = [
  {
    to: '/agenda',
    titulo: 'Agenda',
    descricao: 'Seus compromissos sincronizados com o Google Calendar.',
    icon: Calendar,
  },
  {
    to: '/usuarios',
    titulo: 'Usuários',
    descricao: 'Gestão de acessos e cargos da intranet.',
    icon: Users,
    roles: ['TI'],
  },
]

export default function Dashboard() {
  const { usuario } = useAuth()
  const primeiroNome = usuario?.nome?.trim()?.split(' ')[0] ?? ''
  const atalhos = ATALHOS.filter((a) => !a.roles || a.roles.includes(usuario?.role))

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          Olá, {primeiroNome} 👋
        </h1>
        <p className="text-muted-foreground">
          Bem-vindo à intranet da Blue Pay Solutions.
          <span className="ml-2 rounded-full bg-brand-accent/10 px-2.5 py-0.5 text-xs font-medium text-brand-accent">
            {usuario?.role}
          </span>
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2">
        {atalhos.map(({ to, titulo, descricao, icon: Icon }) => (
          <Link key={to} to={to} className="group">
            <Card className="h-full transition-colors hover:border-brand-accent/50">
              <CardHeader>
                <div className="mb-2 grid size-10 place-items-center rounded-lg bg-brand text-brand-foreground">
                  <Icon className="size-5" />
                </div>
                <CardTitle className="flex items-center justify-between">
                  {titulo}
                  <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                </CardTitle>
                <CardDescription>{descricao}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </section>
    </div>
  )
}
