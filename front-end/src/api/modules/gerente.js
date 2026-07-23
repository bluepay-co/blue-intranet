import api from '@/api/api'

/**
 * Domínio: visão de equipe para os cargos de gerência (GERENTE_*).
 * O backend escopa tudo pela role de quem chama e valida o time pedido —
 * nunca por id vindo do front. O parâmetro `equipe` ('IS' | 'KAM') seleciona
 * qual time o gerente está visualizando; o backend rejeita (403) times fora
 * do escopo da role. Default 'IS' para manter compatível a visão de Inside Sales.
 */

/** Membros do time gerenciado ({ id, nome }[]), para popular o filtro de vendedor. */
export async function getMembrosEquipeGerente(equipe = 'IS') {
  const { data } = await api.get('/api/gerente/membros', { params: { equipe } })
  return data.membros
}

/**
 * Lista paginada dos clientes de todo o time (ou de um vendedor específico via `vendedorId`).
 * `filtros` aceita: busca, uf, cidade, segmento, status, page, limit, vendedorId.
 * Retorna { clientes, total, page, limit, resumo, filtros }.
 */
export async function listarClientesEquipeGerente(filtros = {}, equipe = 'IS') {
  const { data } = await api.get('/api/gerente/clientes', { params: { ...filtros, equipe } })
  return data
}

/** Ficha + métricas do cliente (escopo: qualquer vendedor do time do gerente). */
export async function getClienteEquipeGerente(id, mes, ano, equipe = 'IS') {
  const params = { equipe }
  if (mes) params.mes = mes
  if (ano) params.ano = ano
  const { data } = await api.get(`/api/gerente/clientes/${id}`, { params })
  return data // { cliente, metricas }
}

/**
 * Receita/clientes novos por dia e por semana do mês, para todo o time ou
 * um vendedor específico (`vendedorId`).
 */
export async function getReceitasEquipeGerente(mes, ano, vendedorId, equipe = 'IS') {
  const params = { equipe }
  if (mes) params.mes = mes
  if (ano) params.ano = ano
  if (vendedorId) params.vendedorId = vendedorId
  const { data } = await api.get('/api/gerente/receitas', { params })
  return data
}

/** Ranking do time hoje ('dia') ou na semana atual ('semana') — { periodo, membros }. */
export async function getRankingPeriodoGerente(periodo, equipe = 'IS') {
  const { data } = await api.get('/api/gerente/ranking-periodo', { params: { periodo, equipe } })
  return data
}

/** Dashboard pessoal (réplica do Dashboard Pessoal) de um funcionário específico do time. */
export async function getPessoalEquipeGerente(vendedorId, mes, ano, equipe = 'IS') {
  const params = { equipe }
  if (mes) params.mes = mes
  if (ano) params.ano = ano
  const { data } = await api.get(`/api/gerente/pessoal/${vendedorId}`, { params })
  return data // { resumo, topClientesMes }
}
