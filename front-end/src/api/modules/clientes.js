import api from '@/api/api'

/**
 * Domínio: Clientes do vendedor (produção, somente leitura).
 * O backend escopa tudo pelo vendedor logado — cada um vê só os próprios clientes.
 */

/** Lista os clientes do vendedor logado (busca opcional por nome/CNPJ). */
export async function listarClientes(busca) {
  const params = {}
  if (busca) params.busca = busca
  const { data } = await api.get('/api/clientes', { params })
  return data.clientes
}

/** Ficha + métricas de um cliente do vendedor. */
export async function buscarCliente(id) {
  const { data } = await api.get(`/api/clientes/${id}`)
  return data // { cliente, metricas }
}

/** Prospecção por CNPJ: verifica se já é cliente; se não, puxa dados públicos. */
export async function prospectarCnpj(cnpj) {
  const { data } = await api.get('/api/clientes/prospeccao', { params: { cnpj } })
  return data // { status, ... }
}
