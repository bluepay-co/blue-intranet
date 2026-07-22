import api from '@/api/api'

/**
 * Domínio: visão de equipe para os cargos de gerência (GERENTE_*).
 * O backend escopa tudo pela role de quem chama — nunca por id vindo do front.
 */

/** Membros do time gerenciado ({ id, nome }[]), para popular o filtro de vendedor. */
export async function getMembrosEquipeGerente() {
  const { data } = await api.get('/api/gerente/membros')
  return data.membros
}

/**
 * Lista paginada dos clientes de toda a equipe (ou de um vendedor específico via `vendedorId`).
 * `filtros` aceita: busca, uf, cidade, segmento, status, page, limit, vendedorId.
 * Retorna { clientes, total, page, limit, resumo, filtros }.
 */
export async function listarClientesEquipeGerente(filtros = {}) {
  const { data } = await api.get('/api/gerente/clientes', { params: filtros })
  return data
}

/** Ficha + métricas do cliente (escopo: qualquer vendedor da equipe do gerente). */
export async function getClienteEquipeGerente(id, mes, ano) {
  const params = {}
  if (mes) params.mes = mes
  if (ano) params.ano = ano
  const { data } = await api.get(`/api/gerente/clientes/${id}`, { params })
  return data // { cliente, metricas }
}

/**
 * Receita/clientes novos por dia e por semana do mês, para toda a equipe ou
 * um vendedor específico (`vendedorId`).
 */
export async function getReceitasEquipeGerente(mes, ano, vendedorId) {
  const params = {}
  if (mes) params.mes = mes
  if (ano) params.ano = ano
  if (vendedorId) params.vendedorId = vendedorId
  const { data } = await api.get('/api/gerente/receitas', { params })
  return data
}

/** Ranking da equipe hoje ('dia') ou na semana atual ('semana') — { periodo, membros }. */
export async function getRankingPeriodoGerente(periodo) {
  const { data } = await api.get('/api/gerente/ranking-periodo', { params: { periodo } })
  return data
}
