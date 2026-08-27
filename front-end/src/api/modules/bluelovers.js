import api from '@/api/api'

/**
 * Domínio: Bluelovers — perfis do time mantidos pelo Marketing.
 * Rotas públicas (vitrine + perfil): qualquer usuário autenticado.
 * Rotas admin (/admin/*): exclusivo para MARKETING (validado também no backend).
 */

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'

/**
 * Constrói a URL completa de exibição de uma foto.
 * Precisa ser absoluta: o Vite faz proxy de `/api`, mas não de `/uploads`.
 * @param {string|null} fotoPath - Caminho relativo como `/uploads/bluelovers/file.jpg`.
 * @returns {string|null}
 */
export function urlFoto(fotoPath) {
  if (!fotoPath) return null
  return `${API_BASE}${fotoPath}`
}

/** Monta o FormData do perfil, aplicando a convenção de manter/trocar imagem. */
function formPerfil(payload) {
  const form = new FormData()
  form.append('nome', payload.nome)
  form.append('cargo', payload.cargo ?? '')
  form.append('setor', payload.setor ?? '')
  form.append('frase', payload.frase ?? '')
  form.append('ordem', String(payload.ordem ?? 0))

  // Arquivo novo tem precedência; senão reenvia o path que já está no banco
  // (string vazia = remover a imagem).
  if (payload.foto_capa) {
    form.append('foto_capa', payload.foto_capa)
  } else {
    form.append('foto_capa_url', payload.foto_capa_url ?? '')
  }

  if (payload.foto_destaque) {
    form.append('foto_destaque', payload.foto_destaque)
  } else {
    form.append('foto_destaque_url', payload.foto_destaque_url ?? '')
  }

  return form
}

const MULTIPART = { headers: { 'Content-Type': 'multipart/form-data' } }

/**
 * Vitrine pública — apenas perfis publicados, já ordenados.
 * @returns {Promise<Array<{ id: number, nome: string, cargo: string|null, setor: string|null,
 *                           frase: string|null, foto_capa_url: string, ordem: number }>>}
 */
export async function listarVitrine() {
  const { data } = await api.get('/api/bluelovers')
  return data.bluelovers
}

/**
 * Perfil publicado com suas seções.
 * @param {number|string} id
 * @returns {Promise<object>} perfil com `blocos: Array`
 */
export async function buscarPerfil(id) {
  const { data } = await api.get(`/api/bluelovers/${id}`)
  return data.bluelover
}

/**
 * Todos os perfis (publicados + rascunhos) com `total_blocos`. Somente MARKETING.
 * @returns {Promise<Array>}
 */
export async function listarAdmin() {
  const { data } = await api.get('/api/bluelovers/admin')
  return data.bluelovers
}

/**
 * Perfil para edição, incluindo rascunhos. Somente MARKETING.
 * @param {number|string} id
 * @returns {Promise<object>} perfil com `blocos: Array`
 */
export async function buscarAdmin(id) {
  const { data } = await api.get(`/api/bluelovers/admin/${id}`)
  return data.bluelover
}

/**
 * Cria um perfil. A capa é obrigatória; as seções são adicionadas depois.
 * @param {{ nome: string, cargo?: string, setor?: string, frase?: string, ordem?: number,
 *           foto_capa?: File, foto_destaque?: File }} payload
 * @returns {Promise<{ id: number }>}
 */
export async function criarPerfil(payload) {
  const { data } = await api.post('/api/bluelovers/admin', formPerfil(payload), MULTIPART)
  return data.bluelover
}

/**
 * Edita os dados do perfil.
 * @param {number} id
 * @param {{ nome: string, cargo?: string, setor?: string, frase?: string, ordem?: number,
 *           foto_capa?: File, foto_capa_url?: string|null,
 *           foto_destaque?: File, foto_destaque_url?: string|null }} payload
 */
export async function editarPerfil(id, payload) {
  const { data } = await api.put(`/api/bluelovers/admin/${id}`, formPerfil(payload), MULTIPART)
  return data.bluelover
}

/**
 * Remove o perfil, suas seções e todas as imagens do disco.
 * @param {number} id
 */
export async function deletarPerfil(id) {
  await api.delete(`/api/bluelovers/admin/${id}`)
}

/**
 * Alterna rascunho ↔ publicado (bidirecional).
 * @param {number} id
 * @returns {Promise<{ publicado: boolean }>}
 */
export async function alternarPublicacao(id) {
  const { data } = await api.patch(`/api/bluelovers/admin/${id}/publicar`)
  return data
}

/**
 * Adiciona uma seção ao fim do perfil.
 * @param {number} blueloverId
 * @param {{ titulo: string, texto: string, foto?: File }} payload
 * @returns {Promise<object>} a seção criada
 */
export async function criarBloco(blueloverId, payload) {
  const form = new FormData()
  form.append('titulo', payload.titulo)
  form.append('texto', payload.texto)
  if (payload.foto) form.append('foto', payload.foto)

  const { data } = await api.post(
    `/api/bluelovers/admin/${blueloverId}/blocos`,
    form,
    MULTIPART,
  )
  return data.bloco
}

/**
 * Edita uma seção.
 * - `payload.foto` presente → troca o arquivo.
 * - Senão, `payload.foto_url` mantém (string) ou remove (null/vazio) a foto atual.
 *
 * @param {number} blocoId
 * @param {{ titulo: string, texto: string, foto?: File, foto_url?: string|null }} payload
 * @returns {Promise<object>} a seção atualizada
 */
export async function editarBloco(blocoId, payload) {
  const form = new FormData()
  form.append('titulo', payload.titulo)
  form.append('texto', payload.texto)
  if (payload.foto) {
    form.append('foto', payload.foto)
  } else {
    form.append('foto_url', payload.foto_url ?? '')
  }

  const { data } = await api.put(`/api/bluelovers/admin/blocos/${blocoId}`, form, MULTIPART)
  return data.bloco
}

/**
 * Remove uma seção e sua foto.
 * @param {number} blocoId
 */
export async function deletarBloco(blocoId) {
  await api.delete(`/api/bluelovers/admin/blocos/${blocoId}`)
}

/**
 * Reordena as seções do perfil.
 * @param {number} blueloverId
 * @param {number[]} ids - ids das seções na ordem desejada.
 * @returns {Promise<{ ordenados: number }>}
 */
export async function reordenarBlocos(blueloverId, ids) {
  const { data } = await api.patch(`/api/bluelovers/admin/${blueloverId}/blocos/ordem`, { ids })
  return data
}
