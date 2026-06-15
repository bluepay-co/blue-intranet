import { Loader2 } from 'lucide-react'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table'

/**
 * Tabela orientada a dados, reutilizável em qualquer página.
 *
 * Encapsula os estados de carregamento e vazio + a renderização por colunas,
 * deixando a página apenas declarar as colunas e fornecer os dados.
 *
 * @param {{
 *   columns: Array<{
 *     key: string,                         // identificador único da coluna
 *     header: React.ReactNode,             // conteúdo do cabeçalho
 *     cell?: (row: object) => React.ReactNode, // render da célula (default: row[key])
 *     className?: string,                  // classes da célula (<td>)
 *     headerClassName?: string,            // classes do cabeçalho (<th>)
 *   }>,
 *   data: object[],
 *   carregando?: boolean,
 *   vazio?: React.ReactNode,               // conteúdo exibido quando não há linhas
 *   getRowId?: (row: object) => string|number,  // default: row.id
 *   rowClassName?: (row: object) => string,
 * }} props
 */
export default function DataTable({
  columns,
  data = [],
  carregando = false,
  vazio,
  getRowId,
  rowClassName,
}) {
  if (carregando) {
    return (
      <div className="grid place-items-center py-20">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className="grid place-items-center gap-2 py-20 text-center text-muted-foreground">
        {vazio ?? <p className="text-sm">Nada por aqui ainda.</p>}
      </div>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          {columns.map((col) => (
            <TableHead key={col.key} className={col.headerClassName}>
              {col.header}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((row) => (
          <TableRow key={getRowId ? getRowId(row) : row.id} className={rowClassName?.(row)}>
            {columns.map((col) => (
              <TableCell key={col.key} className={col.className}>
                {col.cell ? col.cell(row) : row[col.key]}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
