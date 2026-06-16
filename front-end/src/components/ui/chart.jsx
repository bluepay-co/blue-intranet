import { ResponsiveContainer } from 'recharts'
import { cn } from '@/lib/utils'

/**
 * Contêiner responsivo para gráficos recharts.
 * Defina a altura via `className` (ex.: "h-64"); o gráfico ocupa 100% da largura.
 *
 * @param {{ className?: string, children: React.ReactElement }} props
 */
export function ChartContainer({ className, children }) {
  return (
    <div className={cn('w-full', className)}>
      <ResponsiveContainer width="100%" height="100%">
        {children}
      </ResponsiveContainer>
    </div>
  )
}

/** Paleta de cores dos gráficos (alinhada à marca/estados). */
export const CORES_GRAFICO = [
  '#2563eb',
  '#0ea5e9',
  '#f59e0b',
  '#10b981',
  '#ef4444',
  '#8b5cf6',
  '#ec4899',
  '#14b8a6',
  '#f97316',
  '#64748b',
]
