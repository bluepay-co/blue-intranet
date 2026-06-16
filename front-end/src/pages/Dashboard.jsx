import { BarChart3 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import PageHeader from '@/components/layout/PageHeader'
import { useAuth } from '@/auth/auth-context'

const POWERBI_URL = import.meta.env.VITE_POWERBI_EMBED_URL

export default function Dashboard() {
  const { usuario } = useAuth()
  const primeiroNome = usuario?.nome?.trim()?.split(' ')[0] ?? ''

  return (
    <div className="flex h-full flex-col gap-6">
      <PageHeader
        title={`Olá, ${primeiroNome}`}
        subtitle="Indicadores da Blue Pay Solutions em tempo real."
      >
        <span className="rounded-full bg-brand-accent/10 px-3 py-1 text-xs font-semibold tracking-wide text-brand-accent uppercase">
          {usuario?.role}
        </span>
      </PageHeader>

      {POWERBI_URL ? (
        <div className="min-h-[480px] flex-1 overflow-hidden rounded-xl border bg-card shadow-sm">
          <iframe
            title="Dashboard Power BI"
            src={POWERBI_URL}
            className="h-full w-full border-0"
            allowFullScreen
          />
        </div>
      ) : (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <div className="grid size-12 place-items-center rounded-full bg-muted">
              <BarChart3 className="size-6 text-muted-foreground" />
            </div>
            <div className="space-y-0.5">
              <p className="font-medium">Dashboard não configurado</p>
              <p className="text-sm text-muted-foreground">
                Defina <code className="rounded bg-muted px-1">VITE_POWERBI_EMBED_URL</code> no
                arquivo <code className="rounded bg-muted px-1">.env</code> do front-end.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
