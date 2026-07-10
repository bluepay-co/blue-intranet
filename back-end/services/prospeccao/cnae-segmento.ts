/**
 * De-para CNAE → segmento no vocabulário Bluepay.
 *
 * A Receita entrega o CNAE (código de atividade), não o segmento. Este mapa
 * estático casa pelo **prefixo** do CNAE (divisão/grupo) e cai em "Outros"
 * quando não há correspondência.
 *
 * São rótulos de exibição para prospecção (não precisam casar com a tabela
 * `segments` do banco). Lista ilustrativa — revisar com o time comercial.
 */

/** Prefixos de CNAE (só dígitos) → segmento. Ordem: mais específico primeiro. */
const MAPA: Array<{ prefixos: string[]; segmento: string }> = [
  { prefixos: ['6201', '6202', '6203', '6204', '6209'], segmento: 'Tecnologia / Software' },
  { prefixos: ['4711', '4712', '4713', '4721', '4729', '4751', '4754', '4781'], segmento: 'Varejo' },
  { prefixos: ['5611', '5612'], segmento: 'Alimentação / Food Service' },
  { prefixos: ['8610', '8630', '8640', '8650', '8660', '8690'], segmento: 'Saúde' },
  { prefixos: ['6810', '6821', '6822'], segmento: 'Imobiliário' },
  { prefixos: ['8511', '8512', '8513', '8520', '8531', '8532', '8541', '8550'], segmento: 'Educação' },
  { prefixos: ['4110', '4120', '4211', '4212', '4213', '4221', '4222', '4291', '4292', '4299'], segmento: 'Construção' },
  { prefixos: ['4911', '4912', '4921', '4922', '4923', '4924', '4929', '4930', '5320'], segmento: 'Transporte / Logística' },
  { prefixos: ['6411', '6421', '6422', '6423', '6424', '6431', '6438', '6491', '6492', '6499', '6611', '6612', '6613', '6619'], segmento: 'Serviços Financeiros' },
];

/**
 * Mapeia um CNAE principal para o segmento Bluepay.
 * @param cnaeCodigo código do CNAE (com ou sem máscara, ex. "6201-5/01" ou "6201501")
 */
export function mapearSegmento(cnaeCodigo: string | null | undefined): string {
  const digitos = (cnaeCodigo ?? '').replace(/\D/g, '');
  if (!digitos) return 'Outros';

  for (const { prefixos, segmento } of MAPA) {
    if (prefixos.some((p) => digitos.startsWith(p))) return segmento;
  }
  return 'Outros';
}
