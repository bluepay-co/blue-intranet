import api from '@/api/api'

/**
 * Domínio: Autenticação (Google Workspace + JWT).
 * Consome a instância central do Axios. Componentes nunca chamam o Axios direto.
 */

/**
 * Troca o código OAuth2 do Google por um JWT de sessão.
 *
 * @param {string} code - Código de autorização devolvido pelo Google.
 * @returns {Promise<{ token: string, usuario: { id: number, nome: string, email: string, role: string } }>}
 *          Token JWT e dados públicos do usuário autenticado.
 */
export async function loginComGoogle(code) {
  const { data } = await api.post('/api/auth/google', { code })
  return data
}
