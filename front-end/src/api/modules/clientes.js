import api from '@/api/api'

/**
 * Domínio: Clientes do vendedor (produção, somente leitura).
 * O backend escopa tudo pelo vendedor logado — cada um vê só os próprios clientes.
 */

/**
 * Lista paginada dos clientes do vendedor logado (20 por página por padrão).
 * `filtros` aceita: busca, uf, cidade, segmento, status, page, limit.
 * Retorna { clientes, total, page, limit, resumo, filtros }.
 */
export async function listarClientes(filtros = {}) {
  const { data } = await api.get('/api/clientes', { params: filtros })
  return data
}

/** Ficha + métricas de um cliente do vendedor. `mes`/`ano` filtram as métricas "do mês". */
export async function buscarCliente(id, mes, ano) {
  const params = {}
  if (mes) params.mes = mes
  if (ano) params.ano = ano
  const { data } = await api.get(`/api/clientes/${id}`, { params })
  return data // { cliente, metricas }
}

/** Prospecção por CNPJ: verifica se já é cliente; se não, puxa dados públicos. */
export async function prospectarCnpj(cnpj) {
  // Timeout local (a consulta cruza banco de produção + API externa da Receita).
  // Garante que a tela nunca fique carregando indefinidamente.
  const { data } = await api.get('/api/clientes/prospeccao', {
    params: { cnpj },
    timeout: 25000,
  })
  return data // { status, ... }
}
