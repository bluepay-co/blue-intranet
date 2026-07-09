import api from '@/api/api'

/**
 * Domínio: Agenda (Google Calendar do usuário logado).
 * Consome a instância central do Axios (o Bearer token é injetado por interceptor).
 */

/**
 * @typedef {Object} EventoAgenda
 * @property {string} id
 * @property {string} titulo
 * @property {string|null} inicio       ISO 8601 (ou YYYY-MM-DD se dia inteiro)
 * @property {string|null} fim
 * @property {boolean} diaInteiro
 * @property {string|null} local
 * @property {string|null} descricao
 * @property {string|null} link         Link do evento no Google Calendar
 * @property {string|null} linkReuniao  Link do Google Meet, quando houver
 * @property {string|null} organizador
 * @property {string|null} status
 * @property {string} calendarioId     Id da agenda de origem no Google
 * @property {string} calendario       Nome exibível da agenda de origem (sala/compartilhada)
 * @property {string|null} cor         Cor (hex) da agenda de origem
 * @property {boolean} agendaPrincipal true só na agenda principal (única editável)
 */

/**
 * Lista os eventos do Google Calendar do usuário numa janela de tempo.
 *
 * @param {{ inicio: string, fim: string }} intervalo - Datas ISO (início/fim).
 * @returns {Promise<EventoAgenda[]>} Eventos ordenados por início.
 */
export async function listarEventos({ inicio, fim }) {
  const { data } = await api.get('/api/agenda/eventos', { params: { inicio, fim } })
  return data.eventos
}

/**
 * Cria um evento (tipo: evento | ausente | foco | local).
 * @param {object} evento - Payload do evento.
 * @returns {Promise<EventoAgenda>}
 */
export async function criarEvento(evento) {
  const { data } = await api.post('/api/agenda/eventos', evento)
  return data.evento
}

/**
 * Atualiza um evento existente.
 * @param {string} id
 * @param {object} evento
 * @returns {Promise<EventoAgenda>}
 */
export async function atualizarEvento(id, evento) {
  const { data } = await api.patch(`/api/agenda/eventos/${id}`, evento)
  return data.evento
}

/**
 * Exclui um evento.
 * @param {string} id
 * @returns {Promise<void>}
 */
export async function removerEvento(id) {
  await api.delete(`/api/agenda/eventos/${id}`)
}
