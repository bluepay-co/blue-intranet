// Metas e faixas de multiplicador das SDRs (Pré-Vendas).
// Fonte: planilha "Controle SQL - Q3/26" (abas por SDR + Resumo).
//
// Diferente de metas2026.ts (receita), aqui a meta é de REUNIÕES no mês.
// Os valores atuais refletem o Q3/26; ajuste conforme o gerente atualizar.

/** Meta mensal de reuniões por SDR (chave = primeiro nome normalizado). */
const META_REUNIOES_SDR: Record<string, number> = {
  ana:     31,
  laura:   18,
  nathaly: 31,
  rayssa:  31,
};

/**
 * Faixas de multiplicador por % de atingimento da meta.
 * `ate` é o limite superior (exclusivo do próximo); a última faixa é aberta (150%+).
 * `mult` é o fator de bônus (0,25 = 25%; 2 = 200%).
 */
export interface FaixaMultiplicador {
  min: number;
  max: number | null; // null = sem teto (150%+)
  mult: number;
  rotulo: string;
}

export const FAIXAS_MULTIPLICADOR: FaixaMultiplicador[] = [
  { min: 0,   max: 50,   mult: 0,    rotulo: '0-49,99%' },
  { min: 50,  max: 75,   mult: 0.25, rotulo: '50-74,99%' },
  { min: 75,  max: 90,   mult: 0.85, rotulo: '75-89,99%' },
  { min: 90,  max: 100,  mult: 1,    rotulo: '90-99,99%' },
  { min: 100, max: 110,  mult: 1.1,  rotulo: '100-109,99%' },
  { min: 110, max: 120,  mult: 1.3,  rotulo: '110-119,99%' },
  { min: 120, max: 135,  mult: 1.5,  rotulo: '120-134,99%' },
  { min: 135, max: 150,  mult: 1.7,  rotulo: '135-149,99%' },
  { min: 150, max: null, mult: 2,    rotulo: '150%+' },
];

function normalizar(nome: string): string {
  const primeiro = (nome ?? '').trim().split(/\s+/)[0] ?? '';
  return primeiro
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

/** Meta de reuniões da SDR no mês. Retorna 0 se não houver meta cadastrada. */
export function getMetaSdr(nome: string, _mes: number, _ano: number): number {
  return META_REUNIOES_SDR[normalizar(nome)] ?? 0;
}

/** Multiplicador de bônus correspondente ao % de atingimento (ex.: 105 → 1.1). */
export function getMultiplicador(pctMeta: number): FaixaMultiplicador {
  const faixa = FAIXAS_MULTIPLICADOR.find(
    (f) => pctMeta >= f.min && (f.max === null || pctMeta < f.max)
  );
  return faixa ?? FAIXAS_MULTIPLICADOR[0]!;
}
