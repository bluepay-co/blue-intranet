import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

/**
 * Carregando / erro / vazio das abas do Painel de Blog. Devolve null quando há
 * conteúdo para mostrar — a aba renderiza a lista normalmente.
 */
export default function EstadoPainel({ carregando, erro, onTentar, vazio, titulo, descricao, acao }) {
  if (carregando) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="flex items-center gap-4 py-4">
              <div className="h-12 w-12 shrink-0 rounded-lg bg-muted" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-1/2 rounded bg-muted" />
                <div className="h-3 w-1/4 rounded bg-muted" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }
  if (erro) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-12 text-center">
          <p className="text-sm text-destructive">{erro}</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={onTentar}>
            Tentar novamente
          </Button>
        </CardContent>
      </Card>
    )
  }
  if (vazio) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-16 text-center">
          <p className="font-medium">{titulo}</p>
          <p className="mt-1 text-sm text-muted-foreground">{descricao}</p>
          {acao}
        </CardContent>
      </Card>
    )
  }
  return null
}
