import api from '@/api/api'

/**
 * Domínio: Inteligência de carteira (produção, somente leitura).
 * Escopo por vendedor logado — cada conta só vê a própria carteira.
 */

/** Clientes em risco/queda do vendedor. */
export async function getRadarRisco() {
  const { data } = await api.get('/api/carteira/risco')
  return data // { resumo, clientes }
}

/** Clientes com oportunidade de cross-sell (produto faltando). */
export async function getCrossSell() {
  const { data } = await api.get('/api/carteira/cross-sell')
  return data // { resumo, clientes }
}
