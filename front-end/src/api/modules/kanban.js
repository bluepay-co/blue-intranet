import api from '@/api/api'

/**
 * Domínio: Kanban de Tarefas (por equipe).
 * A visibilidade e as permissões são calculadas no back — o front só reflete
 * `pode_mover`, `pode_editar` e `pode_excluir` de cada tarefa.
 */

/**
 * Cargos com Kanban da Equipe — espelho de `KANBAN_ROLES` em back-end/utils/equipes.ts
 * (Colaborador fica de fora por enquanto).
 */
export const KANBAN_ROLES = [
  'TI', 'DESENVOLVEDOR', 'MARKETING', 'PRODUTOS', 'KAM', 'INSIGHT_SALES', 'CX',
  'GERENTE_INSIDE_CX', 'GERENTE_COMERCIAL', 'VENDAS', 'PRE_VENDAS', 'GERENTE_PRE_VENDAS',
  'RH', 'FINANCEIRO', 'DIRETORIA',
]

/**
 * @typedef {'urgent'|'high'|'normal'|'low'} Prioridade
 * @typedef {'todo'|'doing'|'done'} Status
 * @typedef {'private'|'requester'|'team'} Visibilidade
 *
 * @typedef {Object} TarefaKanban
 * @property {number} id
 * @property {string} titulo
 * @property {string} descricao
 * @property {number} responsavel_id
 * @property {string} responsavel_nome
 * @property {number} solicitante_id
 * @property {string} solicitante_nome
 * @property {number} criador_id
 * @property {string} area_solicitante
 * @property {Prioridade} prioridade
 * @property {Status} status
 * @property {Visibilidade} visibilidade
 * @property {string} prazo            ISO
 * @property {number} lembrete_min
 * @property {string|null} lembrete_em
 * @property {boolean} lembrete_enviado
 * @property {string} atualizado_em
 * @property {boolean} pode_mover
 * @property {boolean} pode_editar
 * @property {boolean} pode_excluir
 * @property {Array<{ id: number, nome: string }>} participantes
 *
 * @typedef {Object} TarefaEntrada
 * @property {string} titulo
 * @property {string} descricao
 * @property {number} responsavelId
 * @property {number} solicitanteId
 * @property {string} areaSolicitante
 * @property {Prioridade} prioridade
 * @property {string} prazo             ISO
 * @property {number} lembreteMin       0 | 15 | 30 | 60 | 180 | 1440
 * @property {Visibilidade} visibilidade
 * @property {number[]} [participantesIds]  Pessoas extras (qualquer equipe com Kanban)
 */

/** @returns {Promise<TarefaKanban[]>} Todas as tarefas visíveis ao usuário. */
export async function listarTarefas() {
  const { data } = await api.get('/api/kanban/tarefas')
  return data.tarefas
}

/** @returns {Promise<{ tarefa: TarefaKanban, historico: Array<{ id: number, usuario_id: number, usuario_nome: string, tipo: 'evento'|'comentario', texto: string, criado_em: string }> }>} */
export async function detalharTarefa(id) {
  const { data } = await api.get(`/api/kanban/tarefas/${id}`)
  return data
}

/** @returns {Promise<Array<{ id: number, nome: string, role: string, equipe: string }>>} */
export async function listarUsuarios() {
  const { data } = await api.get('/api/kanban/usuarios')
  return data.usuarios
}

/** @param {TarefaEntrada} entrada @returns {Promise<number>} id criado */
export async function criarTarefa(entrada) {
  const { data } = await api.post('/api/kanban/tarefas', entrada)
  return data.id
}

/** @param {number} id @param {TarefaEntrada} entrada */
export async function editarTarefa(id, entrada) {
  await api.put(`/api/kanban/tarefas/${id}`, entrada)
}

export async function excluirTarefa(id) {
  await api.delete(`/api/kanban/tarefas/${id}`)
}

/** @param {number} id @param {Status} status */
export async function alterarStatus(id, status) {
  await api.patch(`/api/kanban/tarefas/${id}/status`, { status })
}

/** @param {number} id @param {Prioridade} prioridade */
export async function alterarPrioridade(id, prioridade) {
  await api.patch(`/api/kanban/tarefas/${id}/prioridade`, { prioridade })
}

export async function comentar(id, texto) {
  await api.post(`/api/kanban/tarefas/${id}/comentarios`, { texto })
}

export async function cobrarAtualizacao(id) {
  await api.post(`/api/kanban/tarefas/${id}/cobrar`)
}

export async function adiarLembrete(id) {
  await api.post(`/api/kanban/tarefas/${id}/adiar-lembrete`)
}

/**
 * Polling: devolve (e marca como entregues) lembretes, vencimentos e avisos.
 * @returns {Promise<Array<{ id: number, tarefa_id: number, tarefa_titulo: string, tipo: 'solicitacao'|'comentario'|'cobranca'|'status'|'lembrete'|'vencido', texto: string }>>}
 */
export async function buscarNotificacoes() {
  const { data } = await api.get('/api/kanban/notificacoes')
  return data.notificacoes
}

/**
 * Checklist da tarefa. Só responsável, criador e coordenação (`pode_checklist`).
 * @param {number} tarefaId @param {string} texto
 */
export async function adicionarItemChecklist(tarefaId, texto) {
  await api.post(`/api/kanban/tarefas/${tarefaId}/checklist`, { texto })
}

/** @param {number} tarefaId @param {number} itemId @param {{ concluido?: boolean, texto?: string }} alteracao */
export async function atualizarItemChecklist(tarefaId, itemId, alteracao) {
  await api.patch(`/api/kanban/tarefas/${tarefaId}/checklist/${itemId}`, alteracao)
}

export async function removerItemChecklist(tarefaId, itemId) {
  await api.delete(`/api/kanban/tarefas/${tarefaId}/checklist/${itemId}`)
}
