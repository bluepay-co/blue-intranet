import { LayoutDashboard, Calendar, CalendarDays, ListTodo, Users, Newspaper, Megaphone, LayoutList } from 'lucide-react'

/**
 * Itens da navegação principal (sidebar), com controle por cargo (RBAC).
 *
 * - `roles` ausente  -> visível para qualquer usuário logado.
 * - `roles: [...]`    -> visível apenas para os cargos listados.
 *
 * `end: true` casa a rota de forma exata (evita que "/" fique sempre ativo).
 */
export const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  {
    label: 'Agenda',
    icon: Calendar,
    children: [
      { to: '/agenda', label: 'Agenda', icon: CalendarDays, end: true },
      { to: '/tarefas', label: 'Tarefas', icon: ListTodo },
    ],
  },
  { to: '/blog', label: 'Blog', icon: Newspaper },
  {
    label: 'Marketing',
    icon: Megaphone,
    roles: ['MARKETING', 'DESENVOLVEDOR'],
    children: [
      { to: '/marketing/admin', label: 'Painel Blog', icon: LayoutList },
    ],
  },
  { to: '/usuarios', label: 'Usuários', icon: Users, roles: ['TI', 'DESENVOLVEDOR'] },
]

/** Filtra os itens visíveis para o cargo informado. */
export function itensVisiveis(role) {
  return NAV_ITEMS.filter((item) => !item.roles || item.roles.includes(role))
}
