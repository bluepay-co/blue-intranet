import api from '@/api/api'

/**
 * Domínio: Tarefas (Google Tasks do usuário logado).
 * Consome a instância central do Axios (Bearer token via interceptor).
 */

/**
 * @typedef {Object} Tarefa
 * @property {string} id
 * @property {string} titulo
 * @property {string|null} notas
 * @property {boolean} concluida
 * @property {string|null} vencimento   RFC3339 (normalmente só a data importa)
 * @property {string|null} concluidaEm
 */

/**
 * Lista as tarefas (inclui concluídas).
 * @returns {Promise<Tarefa[]>}
 */
export async function listarTarefas() {
  const { data } = await api.get('/api/tarefas')
  return data.tarefas
}

/**
 * Cria uma tarefa.
 * @param {{ titulo: string, notas?: string|null, vencimento?: string|null }} entrada
 * @returns {Promise<Tarefa>}
 */
export async function criarTarefa(entrada) {
  const { data } = await api.post('/api/tarefas', entrada)
  return data.tarefa
}

/**
 * Atualiza uma tarefa (título, notas, vencimento e/ou conclusão).
 * @param {string} id
 * @param {{ titulo?: string, notas?: string|null, vencimento?: string|null, concluida?: boolean }} entrada
 * @returns {Promise<Tarefa>}
 */
export async function atualizarTarefa(id, entrada) {
  const { data } = await api.patch(`/api/tarefas/${id}`, entrada)
  return data.tarefa
}

/**
 * Exclui uma tarefa.
 * @param {string} id
 * @returns {Promise<void>}
 */
export async function removerTarefa(id) {
  await api.delete(`/api/tarefas/${id}`)
}
