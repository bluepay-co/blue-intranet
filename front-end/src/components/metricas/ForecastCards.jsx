import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

/**
 * Cards de KPI/insight compartilhados entre as telas de forecast (equipe do
 * gerente e pessoal do funcionário). `dica` é uma explicação curta em
 * linguagem simples, mostrada ao passar o mouse (title nativo).
 */

export function KpiCard({ icon: Icon, cor, valor, rotulo, dica }) {
  return (
    <Card title={dica} className={dica ? 'cursor-help' : undefined}>
      <CardContent className="flex items-center gap-3 py-4">
        <div className={`grid size-10 place-items-center rounded-lg ${cor}`}>
          <Icon className="size-5" />
        </div>
        <div>
          <p className="text-2xl font-semibold leading-tight">{valor}</p>
          <p className="text-xs text-muted-foreground">{rotulo}</p>
        </div>
      </CardContent>
    </Card>
  )
}

/** Card compacto de insight (tendência / comparativo), no mesmo padrão visual do card de meta. */
export function InsightCard({ icon: Icon, cor, bg, titulo, valor, descricao, dica }) {
  return (
    <Card title={dica} className={dica ? 'cursor-help' : undefined}>
      <CardContent className="flex items-center gap-4 py-4 px-5">
        <div className={cn('grid size-10 shrink-0 place-items-center rounded-lg', bg, cor)}>
          <Icon className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs text-muted-foreground">{titulo}</p>
          <p className="text-lg font-bold leading-tight">{valor}</p>
          <p className="text-xs text-muted-foreground">{descricao}</p>
        </div>
      </CardContent>
    </Card>
  )
}
