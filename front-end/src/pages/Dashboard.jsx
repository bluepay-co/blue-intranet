import { Link } from 'react-router-dom'
import { Calendar, ListTodo, Users, ArrowRight } from 'lucide-react'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import PageHeader from '@/components/layout/PageHeader'
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
    to: '/tarefas',
    titulo: 'Tarefas',
    descricao: 'Crie e acompanhe suas tarefas do Google Tasks.',
    icon: ListTodo,
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
    <div className="max-w-5xl space-y-8">
      <PageHeader
        title={`Olá, ${primeiroNome}`}
        subtitle="Bem-vindo à intranet da Blue Pay Solutions."
      >
        <span className="rounded-full bg-brand-accent/10 px-3 py-1 text-xs font-semibold tracking-wide text-brand-accent uppercase">
          {usuario?.role}
        </span>
      </PageHeader>

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
