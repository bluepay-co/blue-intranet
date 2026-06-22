import { Activity } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Link } from 'react-router-dom'
import PageHeader from '@/components/layout/PageHeader'
import { useAuth } from '@/auth/auth-context'

export default function Dashboard() {
  const { usuario } = useAuth()
  const primeiroNome = usuario?.nome?.trim()?.split(' ')[0] ?? ''

  return (
    <div className="flex h-full flex-col gap-6">
      <PageHeader
        title={`Olá, ${primeiroNome}`}
        subtitle="Bem-vindo à Intranet da Bluepay Solutions."
      >
        <span className="rounded-full bg-brand-accent/10 px-3 py-1 text-xs font-semibold tracking-wide text-brand-accent uppercase">
          {usuario?.role}
        </span>
      </PageHeader>

      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center gap-4 py-16 text-center">
          <div className="grid size-12 place-items-center rounded-full bg-muted">
            <Activity className="size-6 text-muted-foreground" />
          </div>
          <div className="space-y-1">
            <p className="font-medium">Acesse os indicadores da empresa</p>
            <p className="text-sm text-muted-foreground">
              Visualize receita, TPV, retenção de clientes e muito mais em tempo real.
            </p>
          </div>
          <Button asChild>
            <Link to="/metricas/geral">Abrir Dashboard Geral</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
