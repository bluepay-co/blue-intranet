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

/** Campos de texto do perfil enviados como estão (o back valida e normaliza). */
const CAMPOS_TEXTO = [
  'nome', 'cargo', 'setor', 'frase',
  'apelido', 'data_nascimento', 'bio', 'talento',
  'gosto_comida', 'gosto_assiste', 'gosto_musica', 'gosto_cor', 'gosto_rede_social', 'gosto_emoji',
  'hobby', 'presente_perfeito',
  'viagem_favorita_texto', 'viagem_sonho',
  'inspiracao_texto', 'bluepay_pessoa_texto',
  'momento_marcante',
]

/** Cada imagem: arquivo novo tem precedência; senão vale o path atual ('' remove). */
const IMAGENS = [
  ['foto_capa', 'foto_capa_url'],
  ['foto_destaque', 'foto_destaque_url'],
  ['foto_viagem', 'viagem_favorita_foto_url'],
  ['foto_viagem_sonho', 'viagem_sonho_foto_url'],
  ['foto_inspiracao', 'inspiracao_foto_url'],
  ['foto_bluepay', 'bluepay_pessoa_foto_url'],
  ['foto_momento_marcante', 'momento_marcante_foto_url'],
]

/**
 * Payload completo a partir do perfil salvo. O PUT substitui todos os campos,
 * então quem edita só uma seção precisa reenviar o resto sem alteração.
 * @param {object} perfil
 */
export function payloadDoPerfil(perfil) {
  const base = {
    ordem: perfil.ordem ?? 0,
    habilidades: perfil.habilidades ?? [],
    rotulos_gostos: perfil.rotulos_gostos ?? {},
    data_nascimento: (perfil.data_nascimento ?? '').slice(0, 10),
  }
  CAMPOS_TEXTO.forEach((campo) => {
    if (base[campo] === undefined) base[campo] = perfil[campo] ?? ''
  })
  IMAGENS.forEach(([, campoUrl]) => {
    base[campoUrl] = perfil[campoUrl] ?? ''
  })
  return base
}

/** Monta o FormData do perfil, aplicando a convenção de manter/trocar imagem. */
function formPerfil(payload) {
  const form = new FormData()
  CAMPOS_TEXTO.forEach((campo) => form.append(campo, payload[campo] ?? ''))
  form.append('ordem', String(payload.ordem ?? 0))
  form.append('habilidades', JSON.stringify(payload.habilidades ?? []))
  form.append('rotulos_gostos', JSON.stringify(payload.rotulos_gostos ?? {}))

  IMAGENS.forEach(([campoArquivo, campoUrl]) => {
    if (payload[campoArquivo]) {
      form.append(campoArquivo, payload[campoArquivo])
    } else {
      form.append(campoUrl, payload[campoUrl] ?? '')
    }
  })

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

/** Campos comuns de uma seção: card de conquista (seção 02) ou momento (seção 06). */
function formBloco(payload) {
  const form = new FormData()
  form.append('titulo', payload.titulo)
  form.append('texto', payload.texto)
  form.append('tipo', payload.tipo ?? 'livre')
  if (payload.chave) form.append('chave', payload.chave)
  if (payload.rotulo_data != null) form.append('rotulo_data', payload.rotulo_data)
  return form
}

/**
 * Adiciona uma seção ao fim do perfil.
 * @param {number} blueloverId
 * @param {{ titulo: string, texto: string, tipo?: string, chave?: string,
 *           rotulo_data?: string|null, foto?: File }} payload
 * @returns {Promise<object>} a seção criada
 */
export async function criarBloco(blueloverId, payload) {
  const form = formBloco(payload)
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
  const form = formBloco(payload)
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
