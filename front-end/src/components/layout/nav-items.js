import { LayoutDashboard, Calendar, Users } from 'lucide-react'

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
  { to: '/agenda', label: 'Agenda', icon: Calendar },
  { to: '/usuarios', label: 'Usuários', icon: Users, roles: ['TI'] },
]

/** Filtra os itens visíveis para o cargo informado. */
export function itensVisiveis(role) {
  return NAV_ITEMS.filter((item) => !item.roles || item.roles.includes(role))
}
