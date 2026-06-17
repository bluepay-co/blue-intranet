import api from '@/api/api'

/**
 * Lista todos os canais dos quais o usuário autenticado é membro.
 * @returns {Promise<import('@/chat/chat-context').CanalListaItem[]>}
 */
export async function listarCanais() {
  const { data } = await api.get('/api/chat/canais')
  return data
}

/**
 * Conta o total de mensagens não lidas em todos os canais.
 * @returns {Promise<number>}
 */
export async function contarNaoLidos() {
  const { data } = await api.get('/api/chat/nao-lidos')
  return data.total
}

/**
 * Cria um canal customizado.
 * @param {string} nome
 * @param {number[]} membroIds
 * @returns {Promise<{ canal_id: number }>}
 */
export async function criarCanalCustomizado(nome, membroIds) {
  const { data } = await api.post('/api/chat/canais', { nome, membro_ids: membroIds })
  return data
}

/**
 * Abre ou localiza um canal privado (1:1) com outro usuário.
 * @param {number} usuarioId
 * @returns {Promise<{ canal_id: number; novo: boolean }>}
 */
export async function abrirConversa(usuarioId) {
  const { data } = await api.post('/api/chat/canais/privado', { usuario_id: usuarioId })
  return data
}

/**
 * Lista mensagens paginadas de um canal.
 * @param {number} canalId
 * @param {string} [antes] ISO date string para paginação
 * @returns {Promise<import('@/chat/chat-context').MensagemPublica[]>}
 */
export async function listarMensagens(canalId, antes) {
  const params = {}
  if (antes) params.antes = antes
  const { data } = await api.get(`/api/chat/canais/${canalId}/mensagens`, { params })
  return data
}

/**
 * Envia uma mensagem com texto e/ou anexo.
 * @param {number} canalId
 * @param {FormData} formData campo `conteudo` (opcional) + `anexo` (opcional)
 * @returns {Promise<import('@/chat/chat-context').MensagemPublica>}
 */
export async function enviarMensagem(canalId, formData) {
  const { data } = await api.post(`/api/chat/canais/${canalId}/mensagens`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data
}

/**
 * Edita o texto de uma mensagem.
 * @param {number} mensagemId
 * @param {string} novoConteudo
 * @returns {Promise<import('@/chat/chat-context').MensagemPublica>}
 */
export async function editarMensagem(mensagemId, novoConteudo) {
  const { data } = await api.patch(`/api/chat/mensagens/${mensagemId}`, { conteudo: novoConteudo })
  return data
}

/**
 * Remove (soft-delete) uma mensagem.
 * @param {number} mensagemId
 */
export async function deletarMensagem(mensagemId) {
  await api.delete(`/api/chat/mensagens/${mensagemId}`)
}

/**
 * Marca um canal como lido pelo usuário autenticado.
 * @param {number} canalId
 */
export async function marcarLido(canalId) {
  await api.patch(`/api/chat/canais/${canalId}/leitura`)
}

/**
 * Busca usuários por nome ou e-mail para iniciar DM.
 * @param {string} q texto de busca (mínimo 2 chars)
 * @returns {Promise<Array<{ id: number; nome: string; email: string; role: string }>>}
 */
export async function buscarUsuarios(q) {
  const { data } = await api.get('/api/chat/usuarios', { params: { q } })
  return data
}
