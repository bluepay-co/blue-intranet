/**
 * Cabeçalho padrão das páginas: título + subtítulo, com borda inferior.
 * O slot `children` (opcional) fica alinhado à direita — ideal para badges/ações.
 *
 * @param {{ title: string, subtitle?: React.ReactNode, children?: React.ReactNode }} props
 */
export default function PageHeader({ title, subtitle, children }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 border-b pb-4">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {children}
    </div>
  )
}
