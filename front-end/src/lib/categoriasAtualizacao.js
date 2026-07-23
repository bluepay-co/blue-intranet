import { Megaphone, Sparkles, Rocket, Wrench } from 'lucide-react'

/**
 * Catálogo de categorias de aviso de atualização.
 *
 * `valor` é o que vai pro banco (coluna `categoria`); o resto (label, ícone e
 * cores) é usado no card modal, na página de gestão e no formulário. Para
 * acrescentar uma categoria nova, basta adicionar um item aqui — o card usa o
 * ícone/cor correspondente automaticamente.
 */
export const CATEGORIAS_ATUALIZACAO = [
  {
    valor: 'ATUALIZACAO',
    label: 'Atualização',
    icon: Sparkles,
    corIcone: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
    corBadge: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  },
  {
    valor: 'AVISO',
    label: 'Aviso',
    icon: Megaphone,
    corIcone: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    corBadge: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  },
  {
    valor: 'NOVIDADE',
    label: 'Novidade',
    icon: Rocket,
    corIcone: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
    corBadge: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
  },
  {
    valor: 'MANUTENCAO',
    label: 'Manutenção',
    icon: Wrench,
    corIcone: 'bg-slate-500/10 text-slate-600 dark:text-slate-300',
    corBadge: 'bg-slate-500/10 text-slate-600 dark:text-slate-300',
  },
]

export const CATEGORIA_PADRAO = 'ATUALIZACAO'

/** Descritor da categoria (com fallback para a categoria padrão se desconhecida). */
export function categoriaInfo(valor) {
  return (
    CATEGORIAS_ATUALIZACAO.find((c) => c.valor === valor) ??
    CATEGORIAS_ATUALIZACAO.find((c) => c.valor === CATEGORIA_PADRAO)
  )
}
