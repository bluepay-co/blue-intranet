import api from '@/api/api'

/**
 * Domínio: avisos de atualização da intranet.
 * A gestão (criar/editar/excluir/listar tudo) é exclusiva do T.I. (validado no
 * backend). `listarRecentes` é liberado para qualquer usuário logado — é a
 * fonte do card modal global.
 */

/** Lista completa dos avisos (página de gestão do T.I.). */
export async function listarAtualizacoes() {
  const { data } = await api.get('/api/atualizacoes')
  return data.atualizacoes
}

/** Avisos recentes (últimos dias) — fonte do card modal. */
export async function listarRecentes() {
  const { data } = await api.get('/api/atualizacoes/recentes')
  return data.atualizacoes
}

/** Cria um aviso. `payload` = { titulo, subtitulo }. */
export async function criarAtualizacao(payload) {
  const { data } = await api.post('/api/atualizacoes', payload)
  return data.atualizacao
}

/** Edita um aviso. `payload` = { titulo, subtitulo }. */
export async function editarAtualizacao(id, payload) {
  const { data } = await api.put(`/api/atualizacoes/${id}`, payload)
  return data.atualizacao
}

/** Remove um aviso. */
export async function removerAtualizacao(id) {
  await api.delete(`/api/atualizacoes/${id}`)
}
