import { Calendar, ListTodo, Users, Newspaper, LayoutList, LifeBuoy, Headset, BarChart3, PackageSearch, TrendingUp, Activity, PhoneCall, Building2, AlertTriangle, Sparkles, MessageSquare, CalendarDays, Target } from 'lucide-react'

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
      { to: '/metricas/comercial', label: 'Dashboard Comercial', icon: Activity },
      { to: '/agenda', label: 'Agenda', icon: Calendar, end: true },
      { to: '/tarefas', label: 'Tarefas', icon: ListTodo },
      { to: '/blog', label: 'Blog', icon: Newspaper },
      { to: '/chamados', label: 'Chamados', icon: LifeBuoy },
      { to: '/chat', label: 'Mensagens', icon: MessageSquare },
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
      { to: '/metricas/visao-geral', label: 'Visão Geral',       icon: CalendarDays },
      { to: '/metricas/pessoal',     label: 'Dashboard Pessoal', icon: TrendingUp },
      { to: '/metricas/kam/equipe',  label: 'Dashboard Equipe',  icon: Users },
      { to: '/clientes',             label: 'Meus Clientes',     icon: Building2 },
      { to: '/carteira/risco',      label: 'Radar de Risco',    icon: AlertTriangle },
      { to: '/carteira/cross-sell', label: 'Cross-sell',        icon: Sparkles },
    ],
  },
  {
    label: 'Inside Sales',
    roles: ['INSIGHT_SALES', 'DESENVOLVEDOR'],
    items: [
      { to: '/metricas/visao-geral', label: 'Visão Geral',       icon: CalendarDays },
      { to: '/metricas/pessoal',     label: 'Dashboard Pessoal', icon: TrendingUp },
      { to: '/metricas/is/equipe',   label: 'Dashboard Equipe',  icon: Users },
      { to: '/clientes',             label: 'Meus Clientes',     icon: Building2 },
      { to: '/carteira/risco',      label: 'Radar de Risco',    icon: AlertTriangle },
      { to: '/carteira/cross-sell', label: 'Cross-sell',        icon: Sparkles },
    ],
  },
  {
    label: 'Ger. Inside Sales & CX',
    roles: ['GERENTE_INSIDE_CX', 'DESENVOLVEDOR'],
    items: [
      { to: '/gerente/is/receitas',    label: 'Visão Geral',        icon: CalendarDays },
      { to: '/gerente/is/visao-geral', label: 'Insight Sales',      icon: Target },
      { to: '/gerente/is/clientes',    label: 'Clientes da Equipe', icon: Building2 },
    ],
  },
  {
    label: 'Vendas',
    roles: ['VENDAS'],
    items: [
      { to: '/metricas/pessoal', label: 'Dashboard Pessoal', icon: TrendingUp },
    ],
  },
  {
    label: 'Pré-Vendas',
    roles: ['PRE_VENDAS', 'DIRETORIA', 'DESENVOLVEDOR'],
    items: [
      { to: '/metricas/prevendas',        label: 'Dashboard Pessoal', icon: TrendingUp },
      { to: '/metricas/prevendas/equipe', label: 'Dashboard Equipe',  icon: Users },
      { to: '/prevendas/lancamento',      label: 'Lançamento',        icon: PhoneCall },
    ],
  },
]

/** Filtra as seções visíveis para o cargo informado (RBAC). */
export function secoesVisiveis(role) {
  return NAV_SECTIONS.filter((secao) => !secao.roles || secao.roles.includes(role))
}
