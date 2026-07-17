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
  anual: MetricasEquipeAnual;
}

/** Consolidado anual da equipe (espelha a aba Anual do Dashboard Pessoal). */
export interface MetricasEquipeAnual {
  meta: number;
  realizado: number;
  pct_meta: number;
  em_aberto: number;
  tpv: number;
  qtdTickets: number;
  clientesAtivos: number;
  ticketMedio: number;
  taxaMedia: number;
  anterior: {
    receita: number;
    tpv: number;
    qtdTickets: number;
    clientesAtivos: number;
    ateMes: number;
  };
  topClientes: TopClienteGeral[];
  membros: MetricasEquipeMembro[];
  yoy: {
    anoAtual: number;
    anoAnterior: number;
    meses: { mes: number; atual: number; anterior: number }[];
  };
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
  ytd: ComparativoYTD[];
  novosClientesMes: NovosClientesMes[];
  /** Receita mensal da empresa inteira no ano filtrado (array[12], Jan–Dez), para o comparativo Ano × Ano. */
  receitaMensalAno: number[];
  /** Ranking combinado de vendedores de Inside Sales + KAM, ordenado por receita. */
  rankingComercial: MetricasEquipeMembro[];
}

// ── Visão Geral (Inside Sales / KAM) ────────────────────────────────────

/** Linha bem resumida de cliente dentro de um dia — usada no detalhe do calendário. */
export interface VisaoGeralDiaCliente {
  clienteId: number;
  nome: string;
  receita: number;
  tpv: number;
}

export interface VisaoGeralDia {
  dia: string; // 'YYYY-MM-DD' (fuso America/Sao_Paulo)
  receita: number;
  tpv: number;
  qtdTickets: number;
  clientesAtivos: number;
  clientesNovos: number;
  /** Clientes que faturaram nesse dia, ordenados por receita desc. */
  clientes: VisaoGeralDiaCliente[];
}

export interface VisaoGeralSemana {
  inicio: string; // 'YYYY-MM-DD', domingo
  fim: string;    // 'YYYY-MM-DD', sábado
  receita: number;
  tpv: number;
  qtdTickets: number;
  clientesAtivos: number;
  clientesNovos: number;
}

/** Projeção de fechamento do mês por ritmo diário — só existe para o mês corrente. */
export interface VisaoGeralPrevisao {
  diasDecorridos: number;
  diasTotais: number;
  receitaProjetada: number;
  tpvProjetado: number;
}

export interface VisaoGeralResumoMes {
  receita: number;
  tpv: number;
  qtdTickets: number;
  clientesAtivos: number;
  clientesNovos: number;
}

/** Linha de cliente na Visão Geral — mesmo padrão visual do Ranking Geral do Dashboard Comercial. */
export interface VisaoGeralCliente {
  clienteId: number;
  nome: string;
  receita: number;
  tpv: number;
  qtdTickets: number;
  taxaMedia: number;
  /** 'YYYY-MM-DD' — só presente para clientes novos do mês. */
  primeiraCompra?: string;
}

export interface VisaoGeral {
  mes: number;
  ano: number;
  resumoMes: VisaoGeralResumoMes;
  semanas: VisaoGeralSemana[];
  dias: VisaoGeralDia[];
  previsao: VisaoGeralPrevisao | null;
  /** Todos os clientes que faturaram no mês, ordenados por receita desc. */
  clientesDoMes: VisaoGeralCliente[];
  /** Subconjunto de clientesDoMes cuja primeira transação com o vendedor caiu neste mês. */
  clientesNovosDoMes: VisaoGeralCliente[];
}

