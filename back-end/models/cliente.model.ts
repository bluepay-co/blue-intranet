/**
 * Tipagem dos clientes de um vendedor (banco de produção bluepay3_production).
 * Somente leitura — escopo sempre por manager_id do vendedor logado.
 */

/** Linha da lista "Meus Clientes" (identidade + receita/atividade). */
export interface ClienteResumo {
  id: number;
  nome: string;
  nomeComercial: string | null;
  cnpj: string | null;
  cidade: string | null;
  uf: string | null;
  segmento: string | null;
  receita: number;
  tpv: number;
  qtdTickets: number;
  taxaMedia: number;
  ultimaAtividade: string | null;
}

/** Ficha completa do cliente. */
export interface ClienteDetalhe {
  id: number;
  nome: string;
  nomeComercial: string | null;
  cnpj: string | null;
  inscricaoEstadual: string | null;
  inscricaoMunicipal: string | null;
  contato: string | null;
  telefone: string | null;
  email: string | null;
  emailNf: string | null;
  endereco: {
    logradouro: string | null;
    numero: string | null;
    complemento: string | null;
    bairro: string | null;
    cidade: string | null;
    uf: string | null;
    cep: string | null;
  };
  segmento: string | null;
  produtos: {
    virtual: boolean;
    cartao: boolean;
    bancario: boolean;
  };
  contrato: string | null;
  criadoEm: string | null;
}

/** Métricas agregadas do cliente (todas somente leitura). */
export interface ClienteMetricas {
  receitaTotal: number;
  tpvTotal: number;
  qtdTickets: number;
  ticketMedio: number;
  taxaMedia: number;
  receitaAno: number;
  receitaMes: number;
  primeiroTicket: string | null;
  ultimoTicket: string | null;
  evolucao: { mes: number; ano: number; receita: number }[];
}

/** Resposta do endpoint de detalhe. */
export interface ClienteDetalheResposta {
  cliente: ClienteDetalhe;
  metricas: ClienteMetricas;
}
