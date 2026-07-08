/**
 * Inteligência de carteira do vendedor (bluepay3_production, somente leitura).
 * Escopo sempre por manager_id do vendedor logado — sinais estruturados e
 * explicáveis (prontos para agregação futura e/ou leitura por IA).
 */

export type CategoriaRisco = 'PAROU' | 'QUEDA' | 'ATENCAO';

/** Cliente em risco (retenção). */
export interface RiscoCliente {
  id: number;
  nome: string;
  cnpj: string | null;
  cidade: string | null;
  uf: string | null;
  segmento: string | null;
  receitaRecente: number;   // últimos 90 dias
  receitaAnterior: number;  // 90–180 dias atrás
  variacaoPct: number | null; // (recente - anterior) / anterior * 100
  diasSemTransacao: number | null;
  valorEmRisco: number;     // receita que estava sendo gerada e está em risco
  categoria: CategoriaRisco;
}

export interface RadarResposta {
  resumo: {
    total: number;
    receitaEmRisco: number;
    parou: number;
    queda: number;
    atencao: number;
  };
  clientes: RiscoCliente[];
}

/** Cliente com oportunidade de cross-sell (usa 1–2 dos 3 produtos). */
export interface CrossSellCliente {
  id: number;
  nome: string;
  cnpj: string | null;
  cidade: string | null;
  uf: string | null;
  segmento: string | null;
  receita12m: number;
  qtdTickets: number;
  ultimaAtividade: string | null;
  produtosAtivos: string[];
  produtosFaltantes: string[];
}

export interface CrossSellResposta {
  resumo: {
    total: number;
    faltaVirtual: number;
    faltaCartao: number;
    faltaBancario: number;
    receitaPotencial: number;
  };
  clientes: CrossSellCliente[];
}
