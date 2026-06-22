import api from '@/api/api'

/**
 * Métricas pessoais do vendedor logado.
 * @param {number} [mes] - Mês (1-12). Padrão: mês atual.
 * @param {number} [ano] - Ano. Padrão: ano atual.
 * @returns {Promise<MetricasVendedor>}
 */
export async function getMeuResumo(mes, ano, testEmail) {
  const params = {}
  if (mes) params.mes = mes
  if (ano) params.ano = ano
  if (testEmail) params.testEmail = testEmail
  const { data } = await api.get('/api/metricas/meu-resumo', { params })
  return data
}

/**
 * Top clientes do vendedor logado no período.
 * @param {number} [mes]
 * @param {number} [ano]
 * @param {number} [limite=10]
 * @param {string} [testEmail]
 * @returns {Promise<TopCliente[]>}
 */
export async function getTopClientes(mes, ano, limite = 10, testEmail) {
  const params = { limite }
  if (mes) params.mes = mes
  if (ano) params.ano = ano
  if (testEmail) params.testEmail = testEmail
  const { data } = await api.get('/api/metricas/top-clientes', { params })
  return data
}

/**
 * Métricas agregadas da equipe do cargo do usuário logado.
 * @param {number} [mes]
 * @param {number} [ano]
 * @returns {Promise<MetricasEquipe>}
 */
export async function getEquipe(mes, ano) {
  const params = {}
  if (mes) params.mes = mes
  if (ano) params.ano = ano
  const { data } = await api.get('/api/metricas/equipe', { params })
  return data
}

export async function getMetricasGerais(mes, ano) {
  const params = {}
  if (mes) params.mes = mes
  if (ano) params.ano = ano
  const { data } = await api.get('/api/metricas/geral', { params })
  return data
}

export async function getResumoCX(mes, ano) {
  const params = {}
  if (mes) params.mes = mes
  if (ano) params.ano = ano
  const { data } = await api.get('/api/metricas/meu-resumo-cx', { params })
  return data
}

export async function getEquipeCX(mes, ano) {
  const params = {}
  if (mes) params.mes = mes
  if (ano) params.ano = ano
  const { data } = await api.get('/api/metricas/equipe-cx', { params })
  return data
}
