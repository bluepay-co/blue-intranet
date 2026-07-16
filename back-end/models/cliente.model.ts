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

/** Página de "Meus Clientes" (paginado no banco, 20 por página por padrão). */
export interface ClientesPaginados {
  clientes: ClienteResumo[];
  total: number;
  page: number;
  limit: number;
}

/** Resumo agregado da carteira inteira do vendedor (independe de filtros/página). */
export interface ResumoCarteira {
  total: number;
  ativos: number;
  risco: number;
  receita: number;
}

/** Opções disponíveis para os filtros de "Meus Clientes" (dados de toda a carteira). */
export interface FiltrosClientes {
  ufs: string[];
  cidades: { cidade: string; uf: string | null }[];
  segmentos: string[];
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
  tpvMes: number;
  qtdTicketsMes: number;
  ticketMedioMes: number;
  taxaMediaMes: number;
  primeiroTicket: string | null;
  ultimoTicket: string | null;
  evolucao: { mes: number; ano: number; receita: number }[];
  /** Comparativo Ano × Ano — receita mensal do cliente (ano atual vs. anterior). */
  yoy: {
    anoAtual: number;
    anoAnterior: number;
    meses: { mes: number; atual: number; anterior: number }[];
  };
}

/** Resposta do endpoint de detalhe. */
export interface ClienteDetalheResposta {
  cliente: ClienteDetalhe;
  metricas: ClienteMetricas;
}

// ── Prospecção por CNPJ ───────────────────────────────────────────────────────

/** Dados públicos da Receita normalizados (API externa de CNPJ). */
export interface ReceitaDTO {
  razaoSocial: string | null;
  nomeFantasia: string | null;
  situacaoCadastral: string | null;
  dataSituacaoCadastral: string | null;
  porte: string | null;
  naturezaJuridica: string | null;
  capitalSocial: number | null;
  cnaePrincipal: { codigo: string | null; descricao: string | null };
  cnaesSecundarios: { codigo: string | null; descricao: string | null }[];
  endereco: {
    logradouro: string | null;
    numero: string | null;
    complemento: string | null;
    bairro: string | null;
    cep: string | null;
    cidade: string | null;
    uf: string | null;
  };
  telefone: string | null;
  email: string | null;
  socios: { nome: string | null; qualificacao: string | null }[];
  aberturaEm: string | null;
}

/** Resultado da prospecção — união discriminada por `status`. */
export type ProspeccaoResultado =
  | { status: 'MEU_CLIENTE'; clienteId: number }
  | { status: 'CLIENTE_DE_OUTRO'; nomeComercial: string | null }
  | ({
      status: 'DISPONIVEL';
      cnpj: string;
      segmento: string;
      receitaIndisponivel: boolean;
    } & Partial<ReceitaDTO>);
