export interface MetricasMes {
  mes: number;
  ano: number;
  receita: number;
  tpv: number;
  qtdTickets: number;
  clientesAtivos: number;
  clientesNovos: number;
  taxaMedia: number;
  ticketMedio: number;
  meta: number;
  pct_meta: number;
}

export interface MetricasHoje {
  qtdTickets: number;
  receita: number;
  tpv: number;
}

export interface MetricasHistorico {
  mes: number;
  ano: number;
  receita: number;
  tpv: number;
  qtdTickets: number;
  clientesAtivos: number;
}

/** Consolidado anual do vendedor (meta somada dos 12 meses vs. realizado no ano). */
export interface MetricasAnual {
  meta: number;           // soma das metas mensais do ano
  realizado: number;      // receita acumulada no ano (YTD)
  pct_meta: number;       // realizado / meta * 100
  em_aberto: number;      // quanto falta para bater a meta anual (>= 0)
  tpv: number;            // TPV acumulado no ano
  qtdTickets: number;     // transações no ano
  clientesAtivos: number; // clientes distintos atendidos no ano
  ticketMedio: number;    // TPV médio por transação no ano
  taxaMedia: number;      // taxa média (%) no ano
  /** Totais do ano anterior no MESMO período do ano atual (comparativo justo). */
  anterior: {
    receita: number;
    tpv: number;
    qtdTickets: number;
    clientesAtivos: number;
    ateMes: number; // período comparado (1..12); acompanha o mês corrente no ano atual
  };
  /** Top clientes do ano (receita/TPV acumulados). */
  topClientes: TopCliente[];
  /** Comparativo Ano × Ano — receita mensal do ano atual vs. ano anterior. */
  yoy: {
    anoAtual: number;
    anoAnterior: number;
    meses: { mes: number; atual: number; anterior: number }[];
  };
}

export interface MetricasVendedor {
  vendedorId: number;
  nome: string;
  email: string;
  mesAtual: MetricasMes;
  hoje: MetricasHoje;
  historico: MetricasHistorico[];
  anual: MetricasAnual;
}

export interface TopCliente {
  nome: string;
  qtdTickets: number;
  tpv: number;
  receita: number;
}

export interface MetricasEquipeMembro {
  vendedorId: number;
  nome: string;
  receita: number;
  tpv: number;
  qtdTickets: number;
  clientesAtivos: number;
  taxaMedia: number;
  ticketMedio: number;
  receitaHoje: number;
  ticketsHoje: number;
  meta: number;
  pct_meta: number;
}

export interface MetricasEquipeHoje {
  receita: number;
  tpv: number;
  qtdTickets: number;
}

export interface MetricasEquipe {
  equipe: string;
  mes: number;
  ano: number;
  totalReceita: number;
  totalTpv: number;
  totalTickets: number;
  totalClientesAtivos: number;
  taxaMedia: number;
  ticketMedio: number;
  meta_equipe: number;
  pct_meta_equipe: number;
  mesAnterior: {
    receita: number;
    tpv: number;
    qtdTickets: number;
  };
  hoje: MetricasEquipeHoje;
  retencao: RetencaoClientes;
  mixProduto: MixProduto[];
  historicoMensal: CrescimentoMoM[];
  topClientes: TopClienteGeral[];
  membros: MetricasEquipeMembro[];
}

// ── Métricas Gerais da Empresa ──────────────────────────────────────────

export interface ResumoGeral {
  mes: number;
  ano: number;
  receita: number;
  tpv: number;
  qtdTickets: number;
  clientesAtivos: number;
  vendedoresAtivos: number;
  taxaMedia: number;
  ticketMedio: number;
  meta_total: number;
  pct_meta_total: number;
}

export interface MetricasHojeGeral {
  qtdTickets: number;
  receita: number;
  tpv: number;
  mediaDiariaTickets: number;
  mediaDiariaReceita: number;
}

export interface RetencaoClientes {
  novos: number;
  recorrentes: number;
  perdidos: number;
  taxaRetencao: number;
}

export interface MixProduto {
  produto: string;
  qtdTickets: number;
  receita: number;
  percentualReceita: number;
}

export interface CrescimentoMoM {
  mes: number;
  ano: number;
  receita: number;
  tpv: number;
  qtdTickets: number;
  clientesAtivos: number;
  crescimentoReceita: number | null;
  crescimentoTpv: number | null;
  crescimentoClientes: number | null;
  taxaMedia: number;
}

export interface TopClienteGeral {
  nome: string;
  qtdTickets: number;
  tpv: number;
  receita: number;
  taxa: number;
}

export interface FaixaTaxa {
  faixa: string;
  clientes: number;
  tickets: number;
  receita: number;
}

export interface ComparativoYTD {
  ano: number;
  receita: number;
  tpv: number;
  clientesUnicos: number;
}

export interface NovosClientesMes {
  mes: number;
  ano: number;
  quantidade: number;
}

export interface MetricasGerais {
  resumo: ResumoGeral;
  hoje: MetricasHojeGeral;
  retencao: RetencaoClientes;
  mixProduto: MixProduto[];
  evolucaoMensal: CrescimentoMoM[];
  topClientes: TopClienteGeral[];
  faixasTaxa: FaixaTaxa[];
  ytd: ComparativoYTD[];
  novosClientesMes: NovosClientesMes[];
}

// ── Métricas CX ─────────────────────────────────────────────────────────────

export interface MetricasCXMes {
  mes: number; ano: number;
  qtdTickets: number; clientesAtivos: number;
  volume: number; tpv: number; receita: number;
  taxaMedia: number; ticketMedio: number; cancelamentos: number;
}

export interface MetricasCXHoje {
  qtdTickets: number; volume: number; receita: number; tpv: number; cartoesHoje: number;
}

export interface MetricasCXHistorico {
  mes: number; ano: number;
  qtdTickets: number; clientesAtivos: number; volume: number; receita: number; tpv: number;
}

export interface MetricasCXMixTipo {
  tipo: string; qtd: number; volume: number; receita: number; percentual: number;
}

export interface MetricasCXSla {
  tipo: string; qtd: number; mediaMinutos: number; medianaMinutos: number;
}

export interface MetricasCXBacklog {
  total: number; bankDeposit: number; cardDeposit: number;
  virtualDeposit: number; cardRegistration: number; maisAntigo: string | null;
}

export interface MetricasCXCompletas {
  userId: number; nome: string; email: string;
  mesAtual: MetricasCXMes; hoje: MetricasCXHoje;
  historico: MetricasCXHistorico[]; mixTipo: MetricasCXMixTipo[];
  sla: MetricasCXSla[]; cartoesNoMes: number; backlog: MetricasCXBacklog;
}

export interface MetricasCXMembroEquipe {
  userId: number; nome: string;
  qtdTickets: number; volume: number; receita: number; tpv: number;
  taxaMedia: number; clientesAtivos: number;
}

export interface MetricasCXEquipe {
  mes: number; ano: number;
  totalQtdTickets: number; totalVolume: number; totalReceita: number; totalTpv: number;
  taxaMedia: number; ticketMedio: number; totalClientesAtivos: number; totalCancelamentos: number;
  hoje: MetricasCXHoje;
  historico: MetricasCXHistorico[];
  mixTipo: MetricasCXMixTipo[];
  sla: MetricasCXSla[];
  membros: MetricasCXMembroEquipe[];
}
