import api from '@/api/api'

/**
 * Domínio: Usuários (gestão de acessos e cargos).
 * Todas as rotas são exclusivas da T.I (validado também no backend via RBAC).
 */

/** Setores atribuíveis — espelha o enum Role do backend (models/usuario.model.ts). */
export const ROLES = [
  'TI',
  'DESENVOLVEDOR',
  'MARKETING',
  'INSIGHT_SALES',
  'KAM',
  'RH',
  'VENDAS',
  'FINANCEIRO',
  'DIRETORIA',
  'COLABORADOR',
]

/**
 * Rótulos de exibição dos setores (o valor enviado à API continua sendo a chave).
 * Ex.: 'TI' aparece como 'T.I'.
 */
export const ROTULOS_ROLE = {
  TI: 'T.I',
  DESENVOLVEDOR: 'Desenvolvedor',
  MARKETING: 'Marketing',
  INSIGHT_SALES: 'Inside Sales',
  KAM: 'KAM',
  RH: 'RH',
  VENDAS: 'Vendas',
  FINANCEIRO: 'Financeiro',
  DIRETORIA: 'Diretoria',
  COLABORADOR: 'Colaborador',
  CX: 'CX',
  PRODUTOS: 'Produtos',
  PRE_VENDAS: 'Pré-Vendas',
}

/** Retorna o rótulo de exibição de um setor (fallback: o próprio valor). */
export function rotuloRole(role) {
  return ROTULOS_ROLE[role] ?? role
}

/**
 * Lista todos os usuários cadastrados.
 * @returns {Promise<Array<{ id: number, nome: string, email: string, role: string, bloqueado: boolean, criado_em: string }>>}
 */
export async function listarUsuarios() {
  const { data } = await api.get('/api/usuarios')
  return data.usuarios
}

/**
 * Bloqueia ou desbloqueia o acesso de um usuário.
 * @param {number} id
 * @param {boolean} bloqueado
 * @returns {Promise<object>} usuário atualizado
 */
export async function definirBloqueio(id, bloqueado) {
  const { data } = await api.patch(`/api/usuarios/${id}/bloqueio`, { bloqueado })
  return data.usuario
}

/**
 * Altera o cargo (role) de um usuário.
 * @param {number} id
 * @param {string} role
 * @returns {Promise<object>} usuário atualizado
 */
export async function definirRole(id, role) {
  const { data } = await api.patch(`/api/usuarios/${id}/role`, { role })
  return data.usuario
}
