// Realizado 2025 por equipe — fonte: CSV "Real 2025.csv"
// Usado para o gráfico de comparação Ano × Ano nos dashboards

// Soma dos KAMs individuais (Marcos+Guilherme+Ricardo+Lael+Rafael+Leandro) por mês
const KAM_2025 = [
  1044613, // Jan: 548880+0+223624+126470+61363+84276
   938465, // Fev
  1019327, // Mar
  1138336, // Abr
  1013346, // Mai
   494591, // Jun: Marcos saiu, soma menor
   755653, // Jul
   655787, // Ago
   733437, // Set
   660341, // Out
   749763, // Nov
   884525, // Dez
]

// Total IS direto do CSV (André + Luis + Daniel)
const IS_2025 = [
   53791, // Jan
   32626, // Fev
       0, // Mar
       0, // Abr
       0, // Mai
   95590, // Jun
  111513, // Jul
  112410, // Ago
  106464, // Set
   81396, // Out
   82589, // Nov
   89391, // Dez
]

// Total da equipe comercial (linha "Total equipe" / "CRO" do CSV)
const TOTAL_EQUIPE_2025 = [
  1750607, // Jan
  1390990, // Fev
  1337884, // Mar
  1421207, // Abr
  1461292, // Mai
  1235741, // Jun
  1734435, // Jul
  1605973, // Ago
  1657947, // Set
  1432357, // Out
  1385989, // Nov
  1540094, // Dez
]

/**
 * Retorna o realizado de 2025 para a equipe e mês informados.
 * @param {'KAM' | 'IS' | 'GERAL'} equipe
 * @param {number} mes - 1 a 12
 */
export function getRealizadoEquipe2025(equipe, mes) {
  if (equipe === 'KAM') return KAM_2025[mes - 1] ?? 0
  if (equipe === 'IS')  return IS_2025[mes - 1]  ?? 0
  return TOTAL_EQUIPE_2025[mes - 1] ?? 0
}
