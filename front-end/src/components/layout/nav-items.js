import { Calendar, ListTodo, Users, Newspaper, LayoutList, LifeBuoy, Headset, BarChart3, PackageSearch, TrendingUp, Activity, PhoneCall, Building2, AlertTriangle, Sparkles, MessageSquare, CalendarDays, Target, UserRound, Megaphone, ClipboardList, KanbanSquare } from 'lucide-react'

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
 * `roles` também pode ir no item, para escondê-lo de parte dos cargos da seção
 * (ex.: o Kanban da Equipe aparece só uma vez para quem vê várias seções).
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
      { to: '/bluelovers', label: 'Bluelovers', icon: UserRound },
      { to: '/chamados', label: 'Chamados', icon: LifeBuoy, rolesBloqueados: ['TI', 'DESENVOLVEDOR'] },
      { to: '/chat', label: 'Mensagens', icon: MessageSquare },
    ],
  },
  {
    label: 'Tecnologia',
    roles: ['TI', 'DESENVOLVEDOR'],
    items: [
      { to: '/ti/dashboard', label: 'Painel T.I.', icon: BarChart3 },
      { to: '/usuarios', label: 'Usuários', icon: Users },
      { to: '/ti/chamados', label: 'Chamados', icon: Headset },
      { to: '/ti/atualizacoes', label: 'Atualizações', icon: Megaphone },
      { to: '/kanban', label: 'Kanban da Equipe', icon: KanbanSquare, roles: ['TI', 'DESENVOLVEDOR'] },
    ],
  },
  {
    label: 'Marketing',
    roles: ['MARKETING', 'DESENVOLVEDOR'],
    items: [
      { to: '/marketing/admin', label: 'Blog', icon: LayoutList },
      { to: '/marketing/formularios', label: 'Formulários', icon: ClipboardList },
      { to: '/marketing/bluelovers', label: 'Bluelovers', icon: Sparkles },
      { to: '/kanban', label: 'Kanban da Equipe', icon: KanbanSquare, roles: ['MARKETING'] },
    ],
  },
  {
    label: 'Produtos',
    roles: ['PRODUTOS', 'DESENVOLVEDOR'],
    items: [
      { to: '/produtos/chamados', label: 'Chamados (Produtos)', icon: PackageSearch },
      { to: '/kanban', label: 'Kanban da Equipe', icon: KanbanSquare, roles: ['PRODUTOS'] },
    ],
  },
  {
    label: 'KAM',
    roles: ['KAM', 'DESENVOLVEDOR'],
    items: [
      { to: '/metricas/visao-geral', label: 'Visão Geral',       icon: CalendarDays },
      { to: '/metricas/pessoal',     label: 'Dashboard Pessoal', icon: TrendingUp },
      { to: '/metricas/forecast',    label: 'Meu Forecast',      icon: Target },
      { to: '/metricas/kam/equipe',  label: 'Dashboard Equipe',  icon: Users },
      { to: '/clientes',             label: 'Meus Clientes',     icon: Building2 },
      { to: '/carteira/risco',      label: 'Radar de Risco',    icon: AlertTriangle },
      { to: '/carteira/cross-sell', label: 'Cross-sell',        icon: Sparkles },
      { to: '/kanban', label: 'Kanban da Equipe', icon: KanbanSquare, roles: ['KAM'] },
    ],
  },
  {
    label: 'Inside Sales',
    // CX faz parte da equipe Inside Sales & CX, mas só usa o Kanban por enquanto.
    roles: ['INSIGHT_SALES', 'CX', 'DESENVOLVEDOR'],
    items: [
      { to: '/metricas/visao-geral', label: 'Visão Geral',       icon: CalendarDays, roles: ['INSIGHT_SALES', 'DESENVOLVEDOR'] },
      { to: '/metricas/pessoal',     label: 'Dashboard Pessoal', icon: TrendingUp, roles: ['INSIGHT_SALES', 'DESENVOLVEDOR'] },
      { to: '/metricas/forecast',    label: 'Meu Forecast',      icon: Target, roles: ['INSIGHT_SALES', 'DESENVOLVEDOR'] },
      { to: '/metricas/is/equipe',   label: 'Dashboard Equipe',  icon: Users, roles: ['INSIGHT_SALES', 'DESENVOLVEDOR'] },
      { to: '/clientes',             label: 'Meus Clientes',     icon: Building2, roles: ['INSIGHT_SALES', 'DESENVOLVEDOR'] },
      { to: '/carteira/risco',      label: 'Radar de Risco',    icon: AlertTriangle, roles: ['INSIGHT_SALES', 'DESENVOLVEDOR'] },
      { to: '/carteira/cross-sell', label: 'Cross-sell',        icon: Sparkles, roles: ['INSIGHT_SALES', 'DESENVOLVEDOR'] },
      { to: '/kanban', label: 'Kanban da Equipe', icon: KanbanSquare, roles: ['INSIGHT_SALES', 'CX'] },
    ],
  },
  {
    label: 'Ger. Inside Sales & CX',
    // O Gerente Comercial gerencia os dois times, então enxerga esta seção como
    // "Equipe - Inside Sales" (o rótulo padrão fica para o Gerente de IS).
    labelPorRole: { GERENTE_COMERCIAL: 'Equipe - Inside Sales' },
    roles: ['GERENTE_INSIDE_CX', 'GERENTE_COMERCIAL', 'DESENVOLVEDOR'],
    items: [
      { to: '/gerente/is/receitas',       label: 'Visão Geral IS', icon: CalendarDays },
      { to: '/gerente/is/visao-geral',    label: 'Insights IS',    icon: Target },
      { to: '/gerente/is/equipe-pessoal', label: 'Métricas IS',    icon: UserRound },
      { to: '/gerente/is/forecast',       label: 'Forecast IS',    icon: TrendingUp },
      { to: '/gerente/is/clientes',       label: 'Clientes do IS', icon: Building2 },
      { to: '/kanban', label: 'Kanban da Equipe', icon: KanbanSquare, roles: ['GERENTE_INSIDE_CX'] },
    ],
  },
  {
    label: 'Ger. Comercial — KAM',
    labelPorRole: { GERENTE_COMERCIAL: 'Equipe - KAM' },
    roles: ['GERENTE_COMERCIAL', 'DESENVOLVEDOR'],
    items: [
      { to: '/gerente/kam/receitas',       label: 'Visão Geral KAM', icon: CalendarDays },
      { to: '/gerente/kam/visao-geral',    label: 'Insights KAM',    icon: Target },
      { to: '/gerente/kam/equipe-pessoal', label: 'Métricas KAM',    icon: UserRound },
      { to: '/gerente/kam/forecast',       label: 'Forecast KAM',    icon: TrendingUp },
      { to: '/gerente/kam/clientes',       label: 'Clientes do KAM', icon: Building2 },
      { to: '/kanban', label: 'Kanban da Equipe', icon: KanbanSquare, roles: ['GERENTE_COMERCIAL'] },
    ],
  },
  {
    label: 'Vendas',
    roles: ['VENDAS'],
    items: [
      { to: '/metricas/pessoal', label: 'Dashboard Pessoal', icon: TrendingUp },
      { to: '/kanban', label: 'Kanban da Equipe', icon: KanbanSquare, roles: ['VENDAS'] },
    ],
  },
  {
    label: 'Pré-Vendas',
    labelPorRole: { GERENTE_PRE_VENDAS: 'Coord. Pré-Vendas' },
    roles: ['PRE_VENDAS', 'GERENTE_PRE_VENDAS', 'DIRETORIA', 'DESENVOLVEDOR'],
    items: [
      { to: '/metricas/prevendas',        label: 'Dashboard Pessoal', icon: TrendingUp, roles: ['PRE_VENDAS', 'DIRETORIA', 'DESENVOLVEDOR'] },
      { to: '/metricas/prevendas/equipe', label: 'Dashboard Equipe',  icon: Users,      roles: ['PRE_VENDAS', 'DIRETORIA', 'DESENVOLVEDOR'] },
      { to: '/prevendas/lancamento',      label: 'Lançamento',        icon: PhoneCall,  roles: ['PRE_VENDAS', 'DIRETORIA', 'DESENVOLVEDOR'] },
      { to: '/kanban', label: 'Kanban da Equipe', icon: KanbanSquare, roles: ['PRE_VENDAS', 'GERENTE_PRE_VENDAS'] },
    ],
  },
  {
    label: 'RH',
    roles: ['RH'],
    items: [
      { to: '/kanban', label: 'Kanban da Equipe', icon: KanbanSquare },
    ],
  },
  {
    label: 'Financeiro',
    roles: ['FINANCEIRO'],
    items: [
      { to: '/kanban', label: 'Kanban da Equipe', icon: KanbanSquare },
    ],
  },
  {
    label: 'Diretoria',
    roles: ['DIRETORIA'],
    items: [
      { to: '/kanban', label: 'Kanban da Equipe', icon: KanbanSquare },
    ],
  },
]

/**
 * Filtra as seções visíveis para o cargo informado (RBAC) e resolve o rótulo
 * da seção. Se a seção tiver `labelPorRole[role]`, esse rótulo substitui o
 * `label` padrão só para aquele cargo (ex.: o Gerente Comercial vê as seções
 * de gerência como "Equipe - Inside Sales" / "Equipe KAM").
 */
export function secoesVisiveis(role) {
  return NAV_SECTIONS
    .filter((secao) => !secao.roles || secao.roles.includes(role))
    .map((secao) => ({
      ...secao,
      label: secao.labelPorRole?.[role] ?? secao.label,
      items: secao.items.filter(
        (item) =>
          (!item.roles || item.roles.includes(role)) &&
          !item.rolesBloqueados?.includes(role),
      ),
    }))
    .filter((secao) => secao.items.length)
}
