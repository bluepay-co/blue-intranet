import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

function moeda(v) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2,
  }).format(v ?? 0)
}

function numero(v) {
  return new Intl.NumberFormat('pt-BR').format(v ?? 0)
}

/**
 * Ranking dos membros de uma equipe — compartilhado entre o Dashboard Equipe
 * (mês/anual) e as telas de gerência (dia/semana). `membros` segue o shape de
 * `MetricasEquipeMembro`: `meta`/`pct_meta` iguais a 0 são exibidos como "—"
 * (períodos menores que um mês não têm meta própria).
 */
export default function RankingTabela({ titulo, membros, mostrarHoje, ocultarSigilosas }) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b bg-muted/30">
        <CardTitle>{titulo}</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {(!membros || membros.length === 0) ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Nenhum dado para este período.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-xs text-muted-foreground">
                  <th className="px-4 py-2 text-left font-medium">#</th>
                  <th className="px-4 py-2 text-left font-medium">Vendedor</th>
                  <th className="px-4 py-2 text-right font-medium">Receita</th>
                  <th className="px-4 py-2 text-right font-medium">Meta</th>
                  <th className="px-4 py-2 text-right font-medium">% Meta</th>
                  <th className="px-4 py-2 text-right font-medium">TPV</th>
                  {!ocultarSigilosas && <th className="px-4 py-2 text-right font-medium">Taxa</th>}
                  {!ocultarSigilosas && <th className="px-4 py-2 text-right font-medium">Ticket Médio</th>}
                  {!ocultarSigilosas && <th className="px-4 py-2 text-right font-medium">Transações</th>}
                  {!ocultarSigilosas && <th className="px-4 py-2 text-right font-medium">Clientes</th>}
                  {mostrarHoje && <th className="px-4 py-2 text-right font-medium">Hoje</th>}
                </tr>
              </thead>
              <tbody>
                {membros.map((m, i) => (
                  <tr key={m.vendedorId} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-2.5">
                      <Badge variant={i === 0 ? 'default' : 'outline'} className="w-6 h-6 flex items-center justify-center p-0 text-xs">{i + 1}</Badge>
                    </td>
                    <td className="px-4 py-2.5 font-medium">{m.nome}</td>
                    <td className="px-4 py-2.5 text-right font-semibold text-primary">{moeda(m.receita)}</td>
                    <td className="px-4 py-2.5 text-right text-muted-foreground">{m.meta > 0 ? moeda(m.meta) : '—'}</td>
                    <td className="px-4 py-2.5 text-right">
                      {m.meta > 0 ? (
                        <span className={`font-semibold text-xs ${m.pct_meta >= 100 ? 'text-emerald-600' : m.pct_meta >= 70 ? 'text-amber-600' : 'text-red-500'}`}>
                          {m.pct_meta.toFixed(1)}%
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-2.5 text-right text-muted-foreground">{moeda(m.tpv)}</td>
                    {!ocultarSigilosas && <td className="px-4 py-2.5 text-right">{(m.taxaMedia ?? 0).toFixed(2)}%</td>}
                    {!ocultarSigilosas && <td className="px-4 py-2.5 text-right">{moeda(m.ticketMedio)}</td>}
                    {!ocultarSigilosas && <td className="px-4 py-2.5 text-right">{numero(m.qtdTickets)}</td>}
                    {!ocultarSigilosas && <td className="px-4 py-2.5 text-right">{numero(m.clientesAtivos)}</td>}
                    {mostrarHoje && (
                      <td className="px-4 py-2.5 text-right">
                        <span className="text-primary font-semibold">{moeda(m.receitaHoje)}</span>
                        <span className="text-xs text-muted-foreground ml-1">({numero(m.ticketsHoje)}t)</span>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
