import api from '@/api/api'

/**
 * Domínio: Blog de Marketing.
 * Rotas públicas (feed + reações): qualquer usuário autenticado.
 * Rotas admin (/admin/*): exclusivo para MARKETING (validado também no backend).
 */

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'

/**
 * Constrói a URL completa de exibição de uma imagem de post.
 * @param {string|null} imagemPath - Caminho relativo como `/uploads/blog/file.jpg`.
 * @returns {string|null}
 */
export function urlImagem(imagemPath) {
  if (!imagemPath) return null
  return `${API_BASE}${imagemPath}`
}

/**
 * Lista posts publicados com contagens de reações e a reação do usuário logado.
 * @returns {Promise<Array>}
 */
export async function listarFeed() {
  const { data } = await api.get('/api/blog')
  return data.posts
}

/**
 * Lista todos os posts (publicados + rascunhos). Somente MARKETING.
 * @returns {Promise<Array>}
 */
export async function listarAdmin() {
  const { data } = await api.get('/api/blog/admin/posts')
  return data.posts
}

/**
 * Cria um novo post. Envia como multipart/form-data para suportar upload de imagem.
 * @param {{ titulo: string, conteudo: string, publicado: boolean, imagem?: File }} payload
 * @returns {Promise<{ id: number }>}
 */
export async function criarPost(payload) {
  const form = new FormData()
  form.append('titulo', payload.titulo)
  form.append('conteudo', payload.conteudo)
  form.append('publicado', String(payload.publicado))
  if (payload.imagem) form.append('imagem', payload.imagem)
  const { data } = await api.post('/api/blog/admin/posts', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data.post
}

/**
 * Edita um post existente.
 * - Se `payload.imagem` existe → envia novo arquivo.
 * - Se não existe e `payload.imagem_url` é string → mantém path original.
 * - Se `payload.imagem_url` é null/vazio → remove a imagem.
 *
 * @param {number} id
 * @param {{ titulo: string, conteudo: string, publicado: boolean, imagem?: File, imagem_url?: string|null }} payload
 */
export async function editarPost(id, payload) {
  const form = new FormData()
  form.append('titulo', payload.titulo)
  form.append('conteudo', payload.conteudo)
  form.append('publicado', String(payload.publicado))
  if (payload.imagem) {
    form.append('imagem', payload.imagem)
  } else {
    form.append('imagem_url', payload.imagem_url ?? '')
  }
  const { data } = await api.put(`/api/blog/admin/posts/${id}`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data.post
}

/**
 * Remove um post permanentemente.
 * @param {number} id
 */
export async function deletarPost(id) {
  await api.delete(`/api/blog/admin/posts/${id}`)
}

/**
 * Alterna o estado publicado/rascunho de um post.
 * @param {number} id
 * @returns {Promise<{ publicado: boolean }>}
 */
export async function togglePublicar(id) {
  const { data } = await api.patch(`/api/blog/admin/posts/${id}/publicar`)
  return data
}

/**
 * Adiciona, troca ou remove a reação do usuário logado em um post.
 * - Sem reação prévia → insere.
 * - Mesma reação → remove (toggle off).
 * - Reação diferente → substitui.
 *
 * @param {number} postId
 * @param {'like'|'heart'|'aplauso'|'foguete'} tipo
 * @returns {Promise<{ acao: string, tipo: string|null }>}
 */
export async function reagir(postId, tipo) {
  const { data } = await api.post(`/api/blog/${postId}/reagir`, { tipo })
  return data
}
