import api from '@/api/api'

/**
 * Domínio: Formulários do Marketing (Google Forms via back-end).
 */

/**
 * @typedef {'texto_curto'|'paragrafo'|'multipla_escolha'|'caixas_selecao'|'lista_suspensa'|'escala'|'data'|'hora'|'nao_suportado'} TipoPergunta
 *
 * @typedef {Object} ItemFormulario
 * @property {string} [id]               itemId do Google (ausente em itens novos)
 * @property {TipoPergunta} tipo
 * @property {string} titulo
 * @property {string|null} descricao
 * @property {boolean} obrigatoria
 * @property {string[]} [opcoes]
 * @property {boolean} [permitirOutro]
 * @property {{ min: number, max: number, rotuloMin: string|null, rotuloMax: string|null }} [escala]
 * @property {boolean} [incluirHora]
 *
 * @typedef {Object} FormularioResumo
 * @property {number} id
 * @property {string} googleFormId
 * @property {string} titulo
 * @property {string} responderUri
 * @property {{ id: number, nome: string }} criadoPor
 * @property {string} criadoEm
 * @property {string} atualizadoEm
 *
 * @typedef {FormularioResumo & {
 *   descricao: string|null, editUri: string, publicado: boolean,
 *   aceitandoRespostas: boolean, coletaEmail: ColetaEmail, revisao: string, itens: ItemFormulario[]
 * }} Formulario
 *
 * @typedef {'nao_coletar'|'verificado'|'informado'} ColetaEmail
 *
 * @typedef {{ titulo: string, descricao?: string|null, itens: ItemFormulario[], coletaEmail?: ColetaEmail, revisao?: string }} EntradaFormulario
 */

/** @returns {Promise<boolean>} se o usuário já autorizou o Google Forms */
export async function buscarConexao() {
  const { data } = await api.get('/api/formularios/conexao')
  return data.conectado
}

/**
 * Envia o `code` do consentimento do Google Forms.
 * @param {string} code
 */
export async function conectarGoogleForms(code) {
  await api.post('/api/formularios/conexao', { code })
}

/** @returns {Promise<FormularioResumo[]>} */
export async function listarFormularios() {
  const { data } = await api.get('/api/formularios')
  return data.formularios
}

/**
 * @param {number} id
 * @returns {Promise<Formulario>}
 */
export async function buscarFormulario(id) {
  const { data } = await api.get(`/api/formularios/${id}`)
  return data.formulario
}

/**
 * @param {EntradaFormulario} entrada
 * @returns {Promise<Formulario>}
 */
export async function criarFormulario(entrada) {
  const { data } = await api.post('/api/formularios', entrada)
  return data.formulario
}

/**
 * Salva o estado completo do formulário. Envie `revisao` para detectar conflito (409).
 * @param {number} id
 * @param {EntradaFormulario} entrada
 * @returns {Promise<Formulario>}
 */
export async function atualizarFormulario(id, entrada) {
  const { data } = await api.put(`/api/formularios/${id}`, entrada)
  return data.formulario
}

/**
 * @param {number} id
 * @param {boolean} aceitando
 * @returns {Promise<boolean>}
 */
export async function alterarRecebimento(id, aceitando) {
  const { data } = await api.patch(`/api/formularios/${id}/recebimento`, { aceitando })
  return data.aceitandoRespostas
}

/** @param {number} id */
export async function excluirFormulario(id) {
  await api.delete(`/api/formularios/${id}`)
}

/**
 * @param {number} id
 * @returns {Promise<{
 *   titulo: string,
 *   perguntas: {
 *     questionId: string, titulo: string, tipo: TipoPergunta,
 *     opcoes?: string[], escala?: ItemFormulario['escala']
 *   }[],
 *   respostas: { id: string, enviadaEm: string|null, email: string|null, valores: Record<string, string[]> }[]
 * }>}
 */
export async function listarRespostas(id) {
  const { data } = await api.get(`/api/formularios/${id}/respostas`)
  return data
}
