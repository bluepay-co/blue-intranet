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
