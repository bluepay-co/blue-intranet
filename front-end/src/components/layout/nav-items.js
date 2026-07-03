import { Calendar, CalendarDays, ListTodo, Users, Newspaper, LayoutList, LifeBuoy, Headset, BarChart3, PackageSearch, TrendingUp, Activity } from 'lucide-react'

/**
 * Navegação principal da sidebar, organizada em SEÇÕES por setor.
 *
 * Cada seção tem um título (`label`) exibido como cabeçalho e seus `items`.
 * Os itens comuns ficam na seção "Geral"; cada setor (Tecnologia, Marketing…)
 * ganha sua própria seção com as páginas exclusivas logo abaixo.
 *
 * - `roles` ausente na seção -> visível para qualquer usuário logado.
 * - `roles: [...]`           -> seção visível apenas para os cargos listados.
 *
 * Dentro de um item, `children` cria um subgrupo expansível e `end: true`
 * casa a rota de forma exata (evita que "/" fique sempre ativo).
 */
export const NAV_SECTIONS = [
  {
    label: 'Geral',
    items: [
      { to: '/metricas/geral', label: 'Dashboard Geral', icon: Activity },
      {
        label: 'Agenda',
        icon: Calendar,
        children: [
          { to: '/agenda', label: 'Agenda', icon: CalendarDays, end: true },
          { to: '/tarefas', label: 'Tarefas', icon: ListTodo },
        ],
      },
      { to: '/blog', label: 'Blog', icon: Newspaper },
      { to: '/chamados', label: 'Chamados', icon: LifeBuoy },
    ],
  },
  {
    label: 'Tecnologia',
    roles: ['TI', 'DESENVOLVEDOR'],
    items: [
      { to: '/usuarios', label: 'Usuários', icon: Users },
      { to: '/ti/dashboard', label: 'Painel T.I.', icon: BarChart3 },
      { to: '/ti/chamados', label: 'Chamados (T.I)', icon: Headset },
    ],
  },
  {
    label: 'Marketing',
    roles: ['MARKETING', 'DESENVOLVEDOR'],
    items: [
      { to: '/marketing/admin', label: 'Painel Blog', icon: LayoutList },
    ],
  },
  {
    label: 'Customer Experience',
    roles: ['CX', 'DESENVOLVEDOR'],
    items: [
      { to: '/cx/chamados',        label: 'Chamados',          icon: Headset    },
      { to: '/metricas/cx',        label: 'Dashboard Pessoal', icon: TrendingUp },
      { to: '/metricas/cx/equipe', label: 'Dashboard Equipe',  icon: Users      },
    ],
  },
  {
    label: 'Produtos',
    roles: ['PRODUTOS', 'DESENVOLVEDOR'],
    items: [
      { to: '/produtos/chamados', label: 'Chamados (Produtos)', icon: PackageSearch },
    ],
  },
  {
    label: 'KAM',
    roles: ['KAM', 'DESENVOLVEDOR'],
    items: [
      { to: '/metricas/pessoal',    label: 'Dashboard Pessoal', icon: TrendingUp },
      { to: '/metricas/kam/equipe', label: 'Dashboard Equipe',  icon: Users },
    ],
  },
  {
    label: 'Insight Sales',
    roles: ['INSIGHT_SALES', 'DESENVOLVEDOR'],
    items: [
      { to: '/metricas/pessoal',   label: 'Dashboard Pessoal', icon: TrendingUp },
      { to: '/metricas/is/equipe', label: 'Dashboard Equipe',  icon: Users },
    ],
  },
  {
    label: 'Vendas',
    roles: ['VENDAS'],
    items: [
      { to: '/metricas/pessoal', label: 'Dashboard Pessoal', icon: TrendingUp },
    ],
  },
]

/** Filtra as seções visíveis para o cargo informado (RBAC). */
export function secoesVisiveis(role) {
  return NAV_SECTIONS.filter((secao) => !secao.roles || secao.roles.includes(role))
}
