import { cn } from '@/lib/utils'

/**
 * Primitivos de tabela reutilizáveis (padrão Shadcn/Nova).
 * Composição: <Table><TableHeader><TableRow><TableHead/>… e
 * <TableBody><TableRow><TableCell/>…
 *
 * O wrapper já trata overflow horizontal e ocupa 100% da largura disponível.
 */
function Table({ className, containerClassName, ...props }) {
  return (
    <div className={cn('relative w-full overflow-x-auto', containerClassName)}>
      <table className={cn('w-full caption-bottom border-collapse text-sm', className)} {...props} />
    </div>
  )
}

function TableHeader({ className, ...props }) {
  return <thead className={cn('bg-muted/50 [&_tr]:border-b', className)} {...props} />
}

function TableBody({ className, ...props }) {
  return <tbody className={cn('[&_tr:last-child]:border-0', className)} {...props} />
}

function TableRow({ className, ...props }) {
  return (
    <tr
      className={cn(
        'border-b border-border/60 transition-colors hover:bg-muted/40 data-[state=selected]:bg-muted',
        className,
      )}
      {...props}
    />
  )
}

function TableHead({ className, ...props }) {
  return (
    <th
      className={cn(
        'h-11 px-4 text-left align-middle text-xs font-semibold tracking-wide text-muted-foreground uppercase whitespace-nowrap',
        className,
      )}
      {...props}
    />
  )
}

function TableCell({ className, ...props }) {
  return <td className={cn('px-4 py-3 align-middle', className)} {...props} />
}

export { Table, TableHeader, TableBody, TableRow, TableHead, TableCell }
