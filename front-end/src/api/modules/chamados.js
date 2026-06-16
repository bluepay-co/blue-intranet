import api from '@/api/api'

/**
 * Domínio: Chamados (help desk de T.I.).
 * Abertura/visualização: qualquer colaborador (só os próprios chamados).
 * Gestão de status e visão geral: exclusivo T.I. (validado também no backend).
 */

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'

/** Categorias de alto nível (espelha o enum CategoriaChamado do backend). */
export const CATEGORIAS = [
  { value: 'IMPRESSORA', label: 'Impressora' },
  { value: 'COMPUTADOR', label: 'Computador' },
  { value: 'REDE', label: 'Rede/Internet' },
  { value: 'ACESSOS', label: 'Acessos/Senhas' },
  { value: 'OUTROS', label: 'Outros' },
]

/** Níveis de criticidade com o rótulo de prazo (SLA) exibido ao usuário. */
export const CRITICIDADES = [
  { value: 'BAIXO', label: 'Baixo', prazo: 'até 5 dias úteis' },
  { value: 'MEDIO', label: 'Médio', prazo: 'até 3 dias úteis' },
  { value: 'ALTO', label: 'Alto', prazo: 'até 1 dia útil' },
  { value: 'CRITICO', label: 'Crítico', prazo: 'imediato' },
]

/** Status do chamado. */
export const STATUS = [
  { value: 'ABERTO', label: 'Em Aberto' },
  { value: 'EM_ANDAMENTO', label: 'Em Andamento' },
  { value: 'FECHADO', label: 'Finalizado' },
]

const acharLabel = (lista, value) => lista.find((i) => i.value === value)?.label ?? value

export const rotuloCategoria = (v) => acharLabel(CATEGORIAS, v)
export const rotuloCriticidade = (v) => acharLabel(CRITICIDADES, v)
export const rotuloStatus = (v) => acharLabel(STATUS, v)
export const prazoCriticidade = (v) => CRITICIDADES.find((i) => i.value === v)?.prazo ?? ''

/** Monta a URL completa de um anexo a partir do caminho relativo do backend. */
export function urlAnexo(anexoPath) {
  if (!anexoPath) return null
  return `${API_BASE}${anexoPath}`
}

/** Lista os chamados do próprio usuário logado. */
export async function listarMeus() {
  const { data } = await api.get('/api/chamados')
  return data.chamados
}

/** Lista TODOS os chamados (T.I.), com filtros opcionais. */
export async function listarTodos(filtros = {}) {
  const { data } = await api.get('/api/chamados/admin/todos', { params: filtros })
  return data.chamados
}

/** Busca a ficha completa de um chamado (inclui o chat). */
export async function buscarChamado(id) {
  const { data } = await api.get(`/api/chamados/${id}`)
  return data.chamado
}

/**
 * Abre um chamado (multipart, anexo opcional).
 * @param {{ titulo: string, descricao: string, categoria: string, criticidade: string, anexo?: File }} payload
 */
export async function criarChamado(payload) {
  const form = new FormData()
  form.append('titulo', payload.titulo)
  form.append('descricao', payload.descricao)
  form.append('categoria', payload.categoria)
  form.append('criticidade', payload.criticidade)
  if (payload.anexo) form.append('anexo', payload.anexo)
  const { data } = await api.post('/api/chamados', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data.chamado
}

/** Edita título/descrição (só o dono e enquanto o status for "Em Aberto"). */
export async function editarChamado(id, payload) {
  const { data } = await api.put(`/api/chamados/${id}`, {
    titulo: payload.titulo,
    descricao: payload.descricao,
  })
  return data.chamado
}

/** Altera o status do chamado (T.I.). */
export async function alterarStatus(id, status) {
  const { data } = await api.patch(`/api/chamados/${id}/status`, { status })
  return data.chamado
}

/** Envia uma mensagem ao chat do chamado (será cifrada no backend). */
export async function adicionarComentario(id, conteudo) {
  const { data } = await api.post(`/api/chamados/${id}/comentarios`, { conteudo })
  return data.comentario
}

/** Resumo leve dos chamados relevantes (para o polling de notificações). */
export async function resumo() {
  const { data } = await api.get('/api/chamados/resumo')
  return data.chamados
}

/** Métricas globais do painel da T.I. (KPIs + dados dos gráficos). */
export async function dashboard() {
  const { data } = await api.get('/api/chamados/admin/dashboard')
  return data
}
