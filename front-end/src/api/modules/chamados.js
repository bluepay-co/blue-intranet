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

/** Categorias específicas para chamados abertos pelo CX (fluxo CX → Produtos). */
export const CATEGORIAS_CX = [
  { value: 'BUG', label: 'Bug' },
  { value: 'MELHORIA', label: 'Melhoria' },
  { value: 'DUVIDA', label: 'Dúvida' },
  { value: 'INTEGRACAO', label: 'Integração' },
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

// ── Fluxo Infra/T.I. — proxied para o BluePay Backoffice (API externa) ──────────

/** Lista os chamados de infra do próprio usuário logado. */
export async function listarMeus() {
  const { data } = await api.get('/api/backoffice/chamados')
  return data.chamados
}

/** Lista TODOS os chamados de infra (T.I.), com filtros opcionais. */
export async function listarTodos(filtros = {}) {
  const { data } = await api.get('/api/backoffice/chamados/admin/todos', { params: filtros })
  return data.chamados
}

/** Busca a ficha completa de um chamado de infra (inclui o chat). */
export async function buscarChamado(id) {
  const { data } = await api.get(`/api/backoffice/chamados/${id}`)
  return data.chamado
}

/**
 * Abre um chamado de infra no backoffice (multipart, anexo opcional).
 * @param {{ titulo, descricao, categoria, criticidade, patrimonio?, anexo?: File }} payload
 */
export async function criarChamado(payload) {
  const form = new FormData()
  form.append('titulo', payload.titulo)
  form.append('descricao', payload.descricao)
  form.append('categoria', payload.categoria)
  form.append('criticidade', payload.criticidade)
  if (payload.patrimonio) form.append('patrimonio', payload.patrimonio)
  if (payload.anexo) form.append('anexo', payload.anexo)
  const { data } = await api.post('/api/backoffice/chamados', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data.chamado
}

/** Edita título/descrição do chamado de infra (só o dono). */
export async function editarChamado(id, payload) {
  const { data } = await api.put(`/api/backoffice/chamados/${id}`, {
    titulo: payload.titulo,
    descricao: payload.descricao,
  })
  return data.chamado
}

/** Altera o status do chamado de infra (T.I.). */
export async function alterarStatus(id, status) {
  const { data } = await api.patch(`/api/backoffice/chamados/${id}/status`, { status })
  return data.chamado
}

/** Envia um comentário ao chamado de infra. */
export async function adicionarComentario(id, conteudo) {
  const { data } = await api.post(`/api/backoffice/chamados/${id}/comentarios`, { conteudo })
  return data.comentario
}

/** Resumo leve dos chamados de infra (polling de notificações). */
export async function resumo() {
  const { data } = await api.get('/api/backoffice/chamados/resumo')
  return data.chamados
}

/** Métricas do painel de infra da T.I. (KPIs + gráficos). */
export async function dashboard() {
  const { data } = await api.get('/api/backoffice/chamados/admin/dashboard')
  return data
}

/** Lista chamados do CX para o time de Produtos, com filtro opcional por colaborador. */
export async function listarProdutos(filtros = {}) {
  const { data } = await api.get('/api/chamados/produtos/todos', { params: filtros })
  return data.chamados
}

// ── Fluxo CX/Produtos — permanece no banco da intranet (não migrou) ─────────────
// Abertura/edição pelo CX foi removida (o time CX não usa mais o portal); o que
// resta aqui é só o necessário para o time de Produtos visualizar/responder os
// chamados que já existem (ficha, comentário, status).

/** Busca a ficha de um chamado do CX (banco). */
export async function buscarChamadoCx(id) {
  const { data } = await api.get(`/api/chamados/${id}`)
  return data.chamado
}

/** Comentário num chamado do CX (banco, cifrado). */
export async function adicionarComentarioCx(id, conteudo) {
  const { data } = await api.post(`/api/chamados/${id}/comentarios`, { conteudo })
  return data.comentario
}

/** Altera status de um chamado do CX (banco, T.I.). */
export async function alterarStatusCx(id, status) {
  const { data } = await api.patch(`/api/chamados/${id}/status`, { status })
  return data.chamado
}
