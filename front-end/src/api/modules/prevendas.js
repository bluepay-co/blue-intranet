import api from '@/api/api'

/**
 * Domínio: Pré-Vendas (SDRs).
 * Diferente de `metricas` (receita, banco de produção, somente leitura), aqui os
 * dados são ATIVIDADES (reuniões/ligações) lançadas na própria intranet.
 */

/** Status de uma reunião (espelha o CHECK de pv_reuniao no backend). */
export const STATUS_REUNIAO = [
  { value: 'AGENDADA',    label: 'Agendada' },
  { value: 'REALIZADA',   label: 'Realizada' },
  { value: 'QUALIFICADA', label: 'Qualificada' },
]

/** Vendedores (IS/KAM) para os quais as SDRs agendam — sugestões do formulário. */
export const VENDEDORES = [
  'André Camargo', 'João Lima', 'Luis Bispo', 'Samuel Neves', 'Tiago Couto',
  'Guilherme Bacco', 'Lael Carvalho', 'Leandro Almeida', 'Marcos Marques',
  'Rafael Pina', 'Daniel Goes', 'Marcio Miranda', 'Ricardo Alonso', 'Bruno Camargo',
]

/** Segmentos frequentes — sugestões (campo é livre). */
export const SEGMENTOS = [
  'Serviços Financeiros', 'Indústria Alimentícia', 'Varejo', 'Tecnologia',
  'Saúde', 'Educação', 'Logística', 'Outros',
]

/** KPIs da SDR logada no mês. */
export async function getMeuResumo(mes, ano) {
  const params = {}
  if (mes) params.mes = mes
  if (ano) params.ano = ano
  const { data } = await api.get('/api/prevendas/meu-resumo', { params })
  return data
}

/** Consolidado da equipe de Pré-Vendas no mês (visão de gestão). */
export async function getEquipe(mes, ano) {
  const params = {}
  if (mes) params.mes = mes
  if (ano) params.ano = ano
  const { data } = await api.get('/api/prevendas/equipe', { params })
  return data
}

/**
 * Registra uma reunião.
 * @param {{ empresa, vendedorNome?, segmento?, ano, mes, semana, status, sdrId? }} payload
 */
export async function postReuniao(payload) {
  const { data } = await api.post('/api/prevendas/reunioes', payload)
  return data
}

/**
 * Define (upsert) o total de ligações de uma semana.
 * @param {{ ano, mes, semana, quantidade, sdrId? }} payload
 */
export async function putLigacoes(payload) {
  const { data } = await api.put('/api/prevendas/ligacoes', payload)
  return data
}
