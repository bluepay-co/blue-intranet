import { pool } from '../database/pool';
import { consultaPool } from '../database/consulta-pool';
import { getMetaIndividual, getMetaEquipe } from '../data/metas2026';
import type {
  MetricasMes, MetricasHoje, MetricasHistorico,
  MetricasVendedor, TopCliente,
  MetricasEquipe, MetricasEquipeMembro, MetricasEquipeHoje,
  ResumoGeral, MetricasHojeGeral, RetencaoClientes, MixProduto,
  CrescimentoMoM, TopClienteGeral, ComparativoYTD,
  NovosClientesMes, MetricasGerais,
  VisaoGeral, VisaoGeralDia, VisaoGeralSemana, VisaoGeralResumoMes, VisaoGeralCliente,
  VisaoGeralDiaCliente,
} from '../models/metricas.model';

export const FILTROS_BASE = `
  t.status = 'done'
  AND t.invoice_status = 'received'
  AND t.excel_total_value > 0
  AND t.kind <> 'virtual_batch_payment'
  AND t.client_id NOT IN (43, 44, 333)
`;

/**
 * Normaliza manager_id legados para seus IDs corretos.
 * Aplicar em TODAS as queries que filtram por manager_id de clients.
 */
export const MANAGER_ID_REMAPPED = `
  CASE
    WHEN c.manager_id = 64   THEN 123
    WHEN c.manager_id = 2    THEN 123
    WHEN c.manager_id = 2554 THEN 1234
    ELSE c.manager_id
  END
`;

export async function buscarVendedorPorEmail(
  email: string
): Promise<{ id: number; nome: string } | null> {
  const { rows } = await consultaPool.query(
    `SELECT id, name AS nome FROM users WHERE email = $1 LIMIT 1`,
    [email]
  );
  return rows[0] ?? null;
}

export async function buscarMetricasMes(
  managerId: number,
  mes: number,
  ano: number
): Promise<MetricasMes> {
  const { rows } = await consultaPool.query(`
    WITH base AS (
      SELECT
        t.client_id,
        t.excel_total_bonus AS tpv,
        t.excel_total_rate  AS receita,
        t.excel_rate        AS taxa
      FROM tickets t
      LEFT JOIN clients c ON c.id = t.client_id
      WHERE ${FILTROS_BASE}
        AND ${MANAGER_ID_REMAPPED} = $1
        AND EXTRACT(MONTH FROM t.invoice_payment_date) = $2
        AND EXTRACT(YEAR  FROM t.invoice_payment_date) = $3
    ),
    anteriores AS (
      SELECT DISTINCT t.client_id
      FROM tickets t
      LEFT JOIN clients c ON c.id = t.client_id
      WHERE ${MANAGER_ID_REMAPPED} = $1
        AND ${FILTROS_BASE}
        AND t.invoice_payment_date < MAKE_DATE($3::int, $2::int, 1)
    )
    SELECT
      COUNT(*)::int                                                   AS "qtdTickets",
      COUNT(DISTINCT base.client_id)::int                             AS "clientesAtivos",
      COUNT(DISTINCT CASE WHEN anteriores.client_id IS NULL
            THEN base.client_id END)::int                             AS "clientesNovos",
      COALESCE(SUM(base.tpv), 0)::float                              AS tpv,
      COALESCE(SUM(base.receita), 0)::float                          AS receita,
      COALESCE(AVG(base.taxa) * 100, 0)::float                       AS "taxaMedia",
      COALESCE(AVG(base.tpv), 0)::float                              AS "ticketMedio"
    FROM base
    LEFT JOIN anteriores ON anteriores.client_id = base.client_id
  `, [managerId, mes, ano]);

  const r = rows[0];
  return {
    mes, ano,
    qtdTickets:     r.qtdTickets,
    clientesAtivos: r.clientesAtivos,
    clientesNovos:  r.clientesNovos,
    tpv:            r.tpv,
    receita:        r.receita,
    taxaMedia:      r.taxaMedia,
    ticketMedio:    r.ticketMedio,
    meta:           0,
    pct_meta:       0,
  };
}

interface LinhaTicketDia {
  clientId: number;
  nome: string;
  dia: string; // 'YYYY-MM-DD' já em fuso America/Sao_Paulo
  receita: number;
  tpv: number;
  taxa: number;
  ehPrimeiroDia: boolean;
  vendedorId: number;
  vendedorNome: string | null;
}

interface AcumuladorCliente {
  nome: string;
  receita: number;
  tpv: number;
  qtdTickets: number;
  somaTaxa: number;
  ehNovo: boolean;
  primeiraCompra: string | null;
  vendedorId: number;
  vendedorNome: string | null;
}

interface AcumuladorVisaoGeral {
  receita: number;
  tpv: number;
  qtdTickets: number;
  clientesAtivos: Set<number>;
  clientesNovos: Set<number>;
}

function novoAcumuladorVisaoGeral(): AcumuladorVisaoGeral {
  return { receita: 0, tpv: 0, qtdTickets: 0, clientesAtivos: new Set(), clientesNovos: new Set() };
}

function acumularVisaoGeral(acc: AcumuladorVisaoGeral, linha: LinhaTicketDia): void {
  acc.receita += linha.receita;
  acc.tpv += linha.tpv;
  acc.qtdTickets += 1;
  acc.clientesAtivos.add(linha.clientId);
  if (linha.ehPrimeiroDia) acc.clientesNovos.add(linha.clientId);
}

interface TotaisVisaoGeral {
  receita: number;
  tpv: number;
  qtdTickets: number;
  clientesAtivos: number;
  clientesNovos: number;
}

function finalizarVisaoGeral(acc: AcumuladorVisaoGeral): TotaisVisaoGeral {
  return {
    receita: acc.receita,
    tpv: acc.tpv,
    qtdTickets: acc.qtdTickets,
    clientesAtivos: acc.clientesAtivos.size,
    clientesNovos: acc.clientesNovos.size,
  };
}

/**
 * Início (domingo) e fim (sábado) da semana civil de `diaISO`, calculados em
 * "UTC de calendário" (sem relação com fuso real) só para não depender do
 * fuso do processo Node — `diaISO` já vem convertido para America/Sao_Paulo
 * na query, então esse cálculo é puramente aritmético sobre a data civil.
 */
function semanaDoDia(diaISO: string): { inicio: string; fim: string } {
  const [ano, mes, dia] = diaISO.split('-').map(Number);
  const data = new Date(Date.UTC(ano!, mes! - 1, dia));
  const diaSemana = data.getUTCDay(); // 0 = domingo
  const inicio = new Date(data);
  inicio.setUTCDate(inicio.getUTCDate() - diaSemana);
  const fim = new Date(inicio);
  fim.setUTCDate(fim.getUTCDate() + 6);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return { inicio: fmt(inicio), fim: fmt(fim) };
}

/**
 * Visão Geral (Fase 1): novos clientes/receita por dia e por semana. "Cliente
 * novo" = primeira transação válida daquele cliente com ESSE vendedor (mesma
 * definição de `clientesNovos` em `buscarMetricasMes`).
 *
 * Precisão: busca as linhas CRUAS de ticket (não pré-agregadas por dia em
 * SQL) e faz uma única passada em JS acumulando dia/semana/mês ao mesmo
 * tempo, usando Set<client_id> para clientesAtivos/clientesNovos — nunca
 * soma contagens distintas já agregadas (evitaria contar um cliente duas
 * vezes por ter transacionado em dois dias/semanas do mesmo mês). Por isso
 * `resumoMes` aqui é calculado a partir das mesmas linhas de `dias`/`semanas`
 * (garantindo soma exata entre os três), e não reaproveita `buscarMetricasMes`
 * — aquela função usa `EXTRACT(...)` cru em UTC para o corte de mês, enquanto
 * aqui o corte é em fuso America/Sao_Paulo (necessário para os dias do
 * calendário baterem com o dia civil do vendedor); os dois podem divergir por
 * poucas transações-limite nas primeiras horas UTC do dia 1 do mês — não é bug.
 */
export async function buscarVisaoGeralMes(
  managerIds: number[],
  meta: number,
  mes: number,
  ano: number
): Promise<VisaoGeral> {
  const ticketsResult = await consultaPool.query(`
      WITH primeira AS (
        SELECT t.client_id, MIN(t.invoice_payment_date) AS primeiro
        FROM tickets t
        LEFT JOIN clients c ON c.id = t.client_id
        WHERE ${FILTROS_BASE}
          AND ${MANAGER_ID_REMAPPED} = ANY($1::int[])
        GROUP BY t.client_id
      )
      SELECT
        t.client_id::int AS "clientId",
        c.name AS nome,
        TO_CHAR(t.invoice_payment_date AT TIME ZONE 'UTC' AT TIME ZONE 'America/Sao_Paulo', 'YYYY-MM-DD') AS dia,
        t.excel_total_rate::float  AS receita,
        t.excel_total_bonus::float AS tpv,
        t.excel_rate::float        AS taxa,
        (
          TO_CHAR(p.primeiro AT TIME ZONE 'UTC' AT TIME ZONE 'America/Sao_Paulo', 'YYYY-MM-DD')
          = TO_CHAR(t.invoice_payment_date AT TIME ZONE 'UTC' AT TIME ZONE 'America/Sao_Paulo', 'YYYY-MM-DD')
        ) AS "ehPrimeiroDia",
        ${MANAGER_ID_REMAPPED} AS "vendedorId",
        vend.name              AS "vendedorNome"
      FROM tickets t
      LEFT JOIN clients c ON c.id = t.client_id
      LEFT JOIN users vend ON vend.id = ${MANAGER_ID_REMAPPED}
      JOIN primeira p ON p.client_id = t.client_id
      WHERE ${FILTROS_BASE}
        AND ${MANAGER_ID_REMAPPED} = ANY($1::int[])
        AND EXTRACT(YEAR  FROM (t.invoice_payment_date AT TIME ZONE 'UTC' AT TIME ZONE 'America/Sao_Paulo')) = $2
        AND EXTRACT(MONTH FROM (t.invoice_payment_date AT TIME ZONE 'UTC' AT TIME ZONE 'America/Sao_Paulo')) = $3
    `, [managerIds, ano, mes]);

  const linhas = ticketsResult.rows as LinhaTicketDia[];

  const porDia = new Map<string, AcumuladorVisaoGeral>();
  const porSemana = new Map<string, { inicio: string; fim: string; acc: AcumuladorVisaoGeral }>();
  const porCliente = new Map<number, AcumuladorCliente>();
  const porDiaCliente = new Map<string, Map<number, { nome: string; receita: number; tpv: number; vendedorId: number; vendedorNome: string | null }>>();
  const doMes = novoAcumuladorVisaoGeral();

  for (const linha of linhas) {
    if (!porDia.has(linha.dia)) porDia.set(linha.dia, novoAcumuladorVisaoGeral());
    acumularVisaoGeral(porDia.get(linha.dia)!, linha);

    const { inicio, fim } = semanaDoDia(linha.dia);
    if (!porSemana.has(inicio)) porSemana.set(inicio, { inicio, fim, acc: novoAcumuladorVisaoGeral() });
    acumularVisaoGeral(porSemana.get(inicio)!.acc, linha);

    acumularVisaoGeral(doMes, linha);

    if (!porDiaCliente.has(linha.dia)) porDiaCliente.set(linha.dia, new Map());
    const clientesDoDia = porDiaCliente.get(linha.dia)!;
    if (!clientesDoDia.has(linha.clientId)) {
      clientesDoDia.set(linha.clientId, {
        nome: linha.nome, receita: 0, tpv: 0, vendedorId: linha.vendedorId, vendedorNome: linha.vendedorNome,
      });
    }
    const cd = clientesDoDia.get(linha.clientId)!;
    cd.receita += linha.receita;
    cd.tpv += linha.tpv;

    if (!porCliente.has(linha.clientId)) {
      porCliente.set(linha.clientId, {
        nome: linha.nome, receita: 0, tpv: 0, qtdTickets: 0, somaTaxa: 0, ehNovo: false, primeiraCompra: null,
        vendedorId: linha.vendedorId, vendedorNome: linha.vendedorNome,
      });
    }
    const c = porCliente.get(linha.clientId)!;
    c.receita += linha.receita;
    c.tpv += linha.tpv;
    c.qtdTickets += 1;
    c.somaTaxa += linha.taxa;
    if (linha.ehPrimeiroDia) { c.ehNovo = true; c.primeiraCompra = linha.dia; }
  }

  const dias: VisaoGeralDia[] = Array.from(porDia.entries())
    .map(([dia, acc]) => {
      const clientes: VisaoGeralDiaCliente[] = Array.from((porDiaCliente.get(dia) ?? new Map()).entries())
        .map(([clienteId, c]) => ({
          clienteId, nome: c.nome, receita: c.receita, tpv: c.tpv,
          vendedorId: c.vendedorId, vendedorNome: c.vendedorNome,
        }))
        .sort((a, b) => b.receita - a.receita);
      return { dia, ...finalizarVisaoGeral(acc), clientes };
    })
    .sort((a, b) => a.dia.localeCompare(b.dia));

  const semanas: VisaoGeralSemana[] = Array.from(porSemana.values())
    .map(({ inicio, fim, acc }) => ({ inicio, fim, ...finalizarVisaoGeral(acc) }))
    .sort((a, b) => a.inicio.localeCompare(b.inicio));

  const totaisMes = finalizarVisaoGeral(doMes);
  const pctMeta = meta > 0 ? Math.round((totaisMes.receita / meta) * 1000) / 10 : 0;
  const metaEmAberto = Math.max(0, meta - totaisMes.receita);
  const resumoMes: VisaoGeralResumoMes = { ...totaisMes, meta, pctMeta, metaEmAberto };

  const clientesDoMes: VisaoGeralCliente[] = Array.from(porCliente.entries())
    .map(([clienteId, c]) => ({
      clienteId, nome: c.nome, receita: c.receita, tpv: c.tpv, qtdTickets: c.qtdTickets,
      taxaMedia: (c.somaTaxa / c.qtdTickets) * 100,
      vendedorId: c.vendedorId, vendedorNome: c.vendedorNome,
    }))
    .sort((a, b) => b.receita - a.receita);

  const clientesNovosDoMes: VisaoGeralCliente[] = Array.from(porCliente.entries())
    .filter(([, c]) => c.ehNovo)
    .map(([clienteId, c]) => ({
      clienteId, nome: c.nome, receita: c.receita, tpv: c.tpv, qtdTickets: c.qtdTickets,
      taxaMedia: (c.somaTaxa / c.qtdTickets) * 100,
      vendedorId: c.vendedorId, vendedorNome: c.vendedorNome,
      ...(c.primeiraCompra ? { primeiraCompra: c.primeiraCompra } : {}),
    }))
    .sort((a, b) => b.receita - a.receita);

  return { mes, ano, resumoMes, semanas, dias, clientesDoMes, clientesNovosDoMes };
}

export async function buscarMetricasHoje(
  managerId: number
): Promise<MetricasHoje> {
  const { rows } = await consultaPool.query(`
    SELECT
      COUNT(*)::int                               AS "qtdTickets",
      COALESCE(SUM(t.excel_total_rate), 0)::float  AS receita,
      COALESCE(SUM(t.excel_total_bonus), 0)::float AS tpv
    FROM tickets t
    LEFT JOIN clients c ON c.id = t.client_id
    WHERE ${FILTROS_BASE}
      AND ${MANAGER_ID_REMAPPED} = $1
      AND DATE(t.invoice_payment_date AT TIME ZONE 'UTC' AT TIME ZONE 'America/Sao_Paulo') = CURRENT_DATE
  `, [managerId]);

  const r = rows[0];
  return { qtdTickets: r.qtdTickets, receita: r.receita, tpv: r.tpv };
}

export async function buscarHistorico(
  managerId: number,
  meses: number = 6
): Promise<MetricasHistorico[]> {
  const { rows } = await consultaPool.query(`
    SELECT
      EXTRACT(YEAR  FROM t.invoice_payment_date)::int AS ano,
      EXTRACT(MONTH FROM t.invoice_payment_date)::int AS mes,
      COUNT(*)::int                                   AS "qtdTickets",
      COUNT(DISTINCT t.client_id)::int                AS "clientesAtivos",
      COALESCE(SUM(t.excel_total_rate), 0)::float     AS receita,
      COALESCE(SUM(t.excel_total_bonus), 0)::float    AS tpv
    FROM tickets t
    LEFT JOIN clients c ON c.id = t.client_id
    WHERE ${FILTROS_BASE}
      AND ${MANAGER_ID_REMAPPED} = $1
      AND t.invoice_payment_date >= DATE_TRUNC('month', NOW()) - INTERVAL '1 month' * $2
    GROUP BY ano, mes
    ORDER BY ano ASC, mes ASC
  `, [managerId, meses]);

  return rows.map(r => ({
    ano:            r.ano,
    mes:            r.mes,
    qtdTickets:     r.qtdTickets,
    clientesAtivos: r.clientesAtivos,
    receita:        r.receita,
    tpv:            r.tpv,
  }));
}

export async function buscarTopClientes(
  managerId: number,
  mes: number,
  ano: number,
  limite: number = 10
): Promise<TopCliente[]> {
  const { rows } = await consultaPool.query(`
    SELECT
      c.name                                        AS nome,
      COUNT(*)::int                                 AS "qtdTickets",
      COALESCE(SUM(t.excel_total_bonus), 0)::float  AS tpv,
      COALESCE(SUM(t.excel_total_rate), 0)::float   AS receita
    FROM tickets t
    LEFT JOIN clients c ON c.id = t.client_id
    WHERE ${FILTROS_BASE}
      AND ${MANAGER_ID_REMAPPED} = $1
      AND EXTRACT(MONTH FROM t.invoice_payment_date) = $2
      AND EXTRACT(YEAR  FROM t.invoice_payment_date) = $3
    GROUP BY c.name
    ORDER BY receita DESC
    LIMIT $4
  `, [managerId, mes, ano, limite]);

  return rows.map(r => ({
    nome:       r.nome,
    qtdTickets: r.qtdTickets,
    tpv:        r.tpv,
    receita:    r.receita,
  }));
}

/**
 * Agregados do vendedor no ano (YTD — meses futuros somam 0).
 * `ateMes` (opcional) limita a soma aos meses 1..ateMes — usado para comparar o
 * ano anterior no MESMO período do ano atual (ex.: Jan–Jul vs Jan–Jul).
 */
export async function buscarMetricasAnual(
  managerId: number,
  ano: number,
  ateMes?: number,
): Promise<{
  receita: number; tpv: number; qtdTickets: number;
  clientesAtivos: number; ticketMedio: number; taxaMedia: number;
}> {
  const filtroMes = ateMes != null ? 'AND EXTRACT(MONTH FROM t.invoice_payment_date) <= $3' : '';
  const params = ateMes != null ? [managerId, ano, ateMes] : [managerId, ano];
  const { rows } = await consultaPool.query(`
    WITH base AS (
      SELECT
        t.client_id,
        t.excel_total_bonus AS tpv,
        t.excel_total_rate  AS receita,
        t.excel_rate        AS taxa
      FROM tickets t
      LEFT JOIN clients c ON c.id = t.client_id
      WHERE ${FILTROS_BASE}
        AND ${MANAGER_ID_REMAPPED} = $1
        AND EXTRACT(YEAR FROM t.invoice_payment_date) = $2
        ${filtroMes}
    )
    SELECT
      COUNT(*)::int                         AS "qtdTickets",
      COUNT(DISTINCT base.client_id)::int   AS "clientesAtivos",
      COALESCE(SUM(base.tpv), 0)::float      AS tpv,
      COALESCE(SUM(base.receita), 0)::float  AS receita,
      COALESCE(AVG(base.taxa) * 100, 0)::float AS "taxaMedia",
      COALESCE(AVG(base.tpv), 0)::float       AS "ticketMedio"
    FROM base
  `, params);

  const r = rows[0];
  return {
    receita:        r?.receita ?? 0,
    tpv:            r?.tpv ?? 0,
    qtdTickets:     r?.qtdTickets ?? 0,
    clientesAtivos: r?.clientesAtivos ?? 0,
    ticketMedio:    r?.ticketMedio ?? 0,
    taxaMedia:      r?.taxaMedia ?? 0,
  };
}

/** Top clientes do vendedor no ano inteiro (receita/TPV acumulados). */
async function buscarTopClientesAno(
  managerId: number,
  ano: number,
  limite: number = 10,
): Promise<TopCliente[]> {
  const { rows } = await consultaPool.query(`
    SELECT
      c.name                                        AS nome,
      COUNT(*)::int                                 AS "qtdTickets",
      COALESCE(SUM(t.excel_total_bonus), 0)::float  AS tpv,
      COALESCE(SUM(t.excel_total_rate), 0)::float   AS receita
    FROM tickets t
    LEFT JOIN clients c ON c.id = t.client_id
    WHERE ${FILTROS_BASE}
      AND ${MANAGER_ID_REMAPPED} = $1
      AND EXTRACT(YEAR FROM t.invoice_payment_date) = $2
    GROUP BY c.name
    ORDER BY receita DESC
    LIMIT $3
  `, [managerId, ano, limite]);

  return rows.map(r => ({
    nome: r.nome, qtdTickets: r.qtdTickets, tpv: r.tpv, receita: r.receita,
  }));
}

/** Receita mensal do vendedor num ano (array[12], índice 0 = janeiro). */
async function buscarReceitaMensalAno(managerId: number, ano: number): Promise<number[]> {
  const { rows } = await consultaPool.query(`
    SELECT
      EXTRACT(MONTH FROM t.invoice_payment_date)::int AS mes,
      COALESCE(SUM(t.excel_total_rate), 0)::float     AS receita
    FROM tickets t
    LEFT JOIN clients c ON c.id = t.client_id
    WHERE ${FILTROS_BASE}
      AND ${MANAGER_ID_REMAPPED} = $1
      AND EXTRACT(YEAR FROM t.invoice_payment_date) = $2
    GROUP BY mes
    ORDER BY mes
  `, [managerId, ano]);

  const arr = new Array<number>(12).fill(0);
  for (const r of rows) arr[r.mes - 1] = r.receita;
  return arr;
}

export async function buscarMetricasCompletas(
  email: string,
  mes?: number,
  ano?: number
): Promise<MetricasVendedor | null> {
  const agora = new Date();
  const mesConsulta = mes ?? (agora.getMonth() + 1);
  const anoConsulta = ano ?? agora.getFullYear();

  const vendedor = await buscarVendedorPorEmail(email);
  if (!vendedor) return null;

  // Corte de período para o comparativo "vs Ano Anterior" (mesmo período):
  // no ano corrente compara até o mês atual; em anos já fechados, o ano inteiro.
  const hojeRef = new Date();
  const ateMes = anoConsulta > hojeRef.getFullYear() ? 0
    : anoConsulta === hojeRef.getFullYear() ? hojeRef.getMonth() + 1
    : 12;

  const [mesAtual, hoje, historico, anualAgg, anualAggAnterior, mensalAtual, mensalAnterior, topClientesAno] = await Promise.all([
    buscarMetricasMes(vendedor.id, mesConsulta, anoConsulta),
    buscarMetricasHoje(vendedor.id),
    buscarHistorico(vendedor.id, 6),
    buscarMetricasAnual(vendedor.id, anoConsulta),
    buscarMetricasAnual(vendedor.id, anoConsulta - 1, ateMes),
    buscarReceitaMensalAno(vendedor.id, anoConsulta),
    buscarReceitaMensalAno(vendedor.id, anoConsulta - 1),
    buscarTopClientesAno(vendedor.id, anoConsulta, 10),
  ]);

  const meta = getMetaIndividual(vendedor.nome, mesConsulta, anoConsulta, vendedor.id);
  mesAtual.meta     = meta;
  mesAtual.pct_meta = meta > 0 ? Math.round((mesAtual.receita / meta) * 1000) / 10 : 0;

  // Meta anual = soma das 12 metas mensais do vendedor no ano.
  let metaAnual = 0;
  for (let m = 1; m <= 12; m++) metaAnual += getMetaIndividual(vendedor.nome, m, anoConsulta, vendedor.id);

  const anual = {
    meta:           metaAnual,
    realizado:      anualAgg.receita,
    pct_meta:       metaAnual > 0 ? Math.round((anualAgg.receita / metaAnual) * 1000) / 10 : 0,
    em_aberto:      Math.max(0, metaAnual - anualAgg.receita),
    tpv:            anualAgg.tpv,
    qtdTickets:     anualAgg.qtdTickets,
    clientesAtivos: anualAgg.clientesAtivos,
    ticketMedio:    anualAgg.ticketMedio,
    taxaMedia:      anualAgg.taxaMedia,
    anterior: {
      receita:        anualAggAnterior.receita,
      tpv:            anualAggAnterior.tpv,
      qtdTickets:     anualAggAnterior.qtdTickets,
      clientesAtivos: anualAggAnterior.clientesAtivos,
      ateMes,
    },
    topClientes: topClientesAno,
    yoy: {
      anoAtual:    anoConsulta,
      anoAnterior: anoConsulta - 1,
      meses: Array.from({ length: 12 }, (_, i) => ({
        mes:      i + 1,
        atual:    mensalAtual[i] ?? 0,
        anterior: mensalAnterior[i] ?? 0,
      })),
    },
  };

  return {
    vendedorId: vendedor.id,
    nome:       vendedor.nome,
    email,
    mesAtual,
    hoje,
    historico,
    anual,
  };
}

// ── Sub-funções privadas da equipe ──────────────────────────────────────────

async function buscarHojeEquipe(
  managerIds: number[]
): Promise<MetricasEquipeHoje> {
  const { rows } = await consultaPool.query(`
    SELECT
      COUNT(*)::int                               AS "qtdTickets",
      COALESCE(SUM(t.excel_total_rate), 0)::float  AS receita,
      COALESCE(SUM(t.excel_total_bonus), 0)::float AS tpv
    FROM tickets t
    LEFT JOIN clients c ON c.id = t.client_id
    WHERE ${FILTROS_BASE}
      AND ${MANAGER_ID_REMAPPED} = ANY($1::int[])
      AND DATE(t.invoice_payment_date AT TIME ZONE 'UTC' AT TIME ZONE 'America/Sao_Paulo') = CURRENT_DATE
  `, [managerIds]);
  const r = rows[0];
  return { qtdTickets: r.qtdTickets, receita: r.receita, tpv: r.tpv };
}

async function buscarRetencaoEquipe(
  managerIds: number[],
  mes: number,
  ano: number
): Promise<RetencaoClientes> {
  const mesAnt = mes === 1 ? 12 : mes - 1;
  const anoAnt = mes === 1 ? ano - 1 : ano;

  const { rows } = await consultaPool.query(`
    WITH atual AS (
      SELECT DISTINCT t.client_id
      FROM tickets t
      LEFT JOIN clients c ON c.id = t.client_id
      WHERE ${FILTROS_BASE}
        AND ${MANAGER_ID_REMAPPED} = ANY($1::int[])
        AND EXTRACT(MONTH FROM t.invoice_payment_date) = $2
        AND EXTRACT(YEAR  FROM t.invoice_payment_date) = $3
    ),
    anterior AS (
      SELECT DISTINCT t.client_id
      FROM tickets t
      LEFT JOIN clients c ON c.id = t.client_id
      WHERE ${FILTROS_BASE}
        AND ${MANAGER_ID_REMAPPED} = ANY($1::int[])
        AND EXTRACT(MONTH FROM t.invoice_payment_date) = $4
        AND EXTRACT(YEAR  FROM t.invoice_payment_date) = $5
    )
    SELECT
      COUNT(DISTINCT atual.client_id) FILTER (WHERE anterior.client_id IS NULL)    AS novos,
      COUNT(DISTINCT atual.client_id) FILTER (WHERE anterior.client_id IS NOT NULL) AS recorrentes,
      COUNT(DISTINCT anterior.client_id) FILTER (WHERE atual.client_id IS NULL)     AS perdidos
    FROM atual FULL OUTER JOIN anterior ON atual.client_id = anterior.client_id
  `, [managerIds, mes, ano, mesAnt, anoAnt]);

  const r = rows[0];
  const total = Number(r.novos ?? 0) + Number(r.recorrentes ?? 0);
  return {
    novos:        Number(r.novos ?? 0),
    recorrentes:  Number(r.recorrentes ?? 0),
    perdidos:     Number(r.perdidos ?? 0),
    taxaRetencao: total > 0 ? Math.round((Number(r.recorrentes) / total) * 1000) / 10 : 0,
  };
}

async function buscarMixProdutoEquipe(
  managerIds: number[],
  mes: number,
  ano: number
): Promise<MixProduto[]> {
  const { rows } = await consultaPool.query(`
    SELECT
      t.kind AS produto,
      COUNT(*)::int                              AS "qtdTickets",
      COALESCE(SUM(t.excel_total_rate), 0)::float AS receita,
      ROUND((SUM(t.excel_total_rate) /
        NULLIF(SUM(SUM(t.excel_total_rate)) OVER (), 0) * 100)::numeric, 2)::float AS "percentualReceita"
    FROM tickets t
    LEFT JOIN clients c ON c.id = t.client_id
    WHERE ${FILTROS_BASE}
      AND ${MANAGER_ID_REMAPPED} = ANY($1::int[])
      AND EXTRACT(MONTH FROM t.invoice_payment_date) = $2
      AND EXTRACT(YEAR  FROM t.invoice_payment_date) = $3
    GROUP BY t.kind
    ORDER BY receita DESC
  `, [managerIds, mes, ano]);

  return rows.map(r => ({
    produto:           r.produto,
    qtdTickets:        r.qtdTickets,
    receita:           r.receita,
    percentualReceita: r.percentualReceita,
  }));
}

async function buscarHistoricoEquipe(
  managerIds: number[],
  mes: number,
  ano: number,
  meses: number = 6
): Promise<CrescimentoMoM[]> {
  const { rows } = await consultaPool.query(`
    SELECT
      EXTRACT(YEAR  FROM t.invoice_payment_date)::int AS ano,
      EXTRACT(MONTH FROM t.invoice_payment_date)::int AS mes,
      COUNT(*)::int                                   AS "qtdTickets",
      COUNT(DISTINCT t.client_id)::int                AS "clientesAtivos",
      COALESCE(SUM(t.excel_total_rate), 0)::float     AS receita,
      COALESCE(SUM(t.excel_total_bonus), 0)::float    AS tpv,
      COALESCE(AVG(t.excel_rate) * 100, 0)::float     AS "taxaMedia"
    FROM tickets t
    LEFT JOIN clients c ON c.id = t.client_id
    WHERE ${FILTROS_BASE}
      AND ${MANAGER_ID_REMAPPED} = ANY($1::int[])
      AND t.invoice_payment_date >= DATE_TRUNC('month', MAKE_DATE($3::int, $2::int, 1)) - INTERVAL '1 month' * ($4 - 1)
      AND t.invoice_payment_date <  DATE_TRUNC('month', MAKE_DATE($3::int, $2::int, 1)) + INTERVAL '1 month'
    GROUP BY ano, mes
    ORDER BY ano ASC, mes ASC
  `, [managerIds, mes, ano, meses]);

  return rows.map((r, i) => {
    const prev = rows[i - 1];
    return {
      ano:                 r.ano,
      mes:                 r.mes,
      receita:             r.receita,
      tpv:                 r.tpv,
      qtdTickets:          r.qtdTickets,
      clientesAtivos:      r.clientesAtivos,
      taxaMedia:           r.taxaMedia,
      crescimentoReceita:  prev && prev.receita ? Math.round(((r.receita - prev.receita) / prev.receita) * 1000) / 10 : null,
      crescimentoTpv:      prev && prev.tpv     ? Math.round(((r.tpv - prev.tpv) / prev.tpv) * 1000) / 10 : null,
      crescimentoClientes: prev && prev.clientesAtivos ? Math.round(((r.clientesAtivos - prev.clientesAtivos) / prev.clientesAtivos) * 1000) / 10 : null,
    };
  });
}

async function buscarTopClientesEquipe(
  managerIds: number[],
  mes: number,
  ano: number,
  limite: number = 10
): Promise<TopClienteGeral[]> {
  const { rows } = await consultaPool.query(`
    SELECT
      c.name                                        AS nome,
      COUNT(*)::int                                 AS "qtdTickets",
      COALESCE(SUM(t.excel_total_bonus), 0)::float  AS tpv,
      COALESCE(SUM(t.excel_total_rate), 0)::float   AS receita
    FROM tickets t
    LEFT JOIN clients c ON c.id = t.client_id
    WHERE ${FILTROS_BASE}
      AND ${MANAGER_ID_REMAPPED} = ANY($1::int[])
      AND EXTRACT(MONTH FROM t.invoice_payment_date) = $2
      AND EXTRACT(YEAR  FROM t.invoice_payment_date) = $3
    GROUP BY c.name
    ORDER BY receita DESC
    LIMIT $4
  `, [managerIds, mes, ano, limite]);

  return rows.map(r => ({
    nome:       r.nome,
    qtdTickets: r.qtdTickets,
    tpv:        r.tpv,
    receita:    r.receita,
  }));
}

/** Agregados anuais da equipe (com corte de mês opcional p/ "vs ano anterior"). */
async function buscarMetricasAnualEquipe(managerIds: number[], ano: number, ateMes?: number) {
  const filtroMes = ateMes != null ? 'AND EXTRACT(MONTH FROM t.invoice_payment_date) <= $3' : '';
  const params = ateMes != null ? [managerIds, ano, ateMes] : [managerIds, ano];
  const { rows } = await consultaPool.query(`
    WITH base AS (
      SELECT t.client_id, t.excel_total_bonus AS tpv, t.excel_total_rate AS receita, t.excel_rate AS taxa
      FROM tickets t LEFT JOIN clients c ON c.id = t.client_id
      WHERE ${FILTROS_BASE}
        AND ${MANAGER_ID_REMAPPED} = ANY($1::int[])
        AND EXTRACT(YEAR FROM t.invoice_payment_date) = $2
        ${filtroMes}
    )
    SELECT
      COUNT(*)::int                          AS "qtdTickets",
      COUNT(DISTINCT base.client_id)::int    AS "clientesAtivos",
      COALESCE(SUM(base.tpv), 0)::float       AS tpv,
      COALESCE(SUM(base.receita), 0)::float   AS receita,
      COALESCE(AVG(base.taxa) * 100, 0)::float AS "taxaMedia",
      COALESCE(AVG(base.tpv), 0)::float        AS "ticketMedio"
    FROM base
  `, params);
  const r = rows[0];
  return {
    receita: r?.receita ?? 0, tpv: r?.tpv ?? 0, qtdTickets: r?.qtdTickets ?? 0,
    clientesAtivos: r?.clientesAtivos ?? 0, ticketMedio: r?.ticketMedio ?? 0, taxaMedia: r?.taxaMedia ?? 0,
  };
}

/** Receita mensal da equipe num ano (array[12]). */
async function buscarReceitaMensalAnoEquipe(managerIds: number[], ano: number): Promise<number[]> {
  const { rows } = await consultaPool.query(`
    SELECT EXTRACT(MONTH FROM t.invoice_payment_date)::int AS mes,
           COALESCE(SUM(t.excel_total_rate), 0)::float AS receita
    FROM tickets t LEFT JOIN clients c ON c.id = t.client_id
    WHERE ${FILTROS_BASE} AND ${MANAGER_ID_REMAPPED} = ANY($1::int[])
      AND EXTRACT(YEAR FROM t.invoice_payment_date) = $2
    GROUP BY mes ORDER BY mes
  `, [managerIds, ano]);
  const arr = new Array<number>(12).fill(0);
  for (const r of rows) arr[r.mes - 1] = r.receita;
  return arr;
}

/** Top clientes da equipe no ano inteiro. */
async function buscarTopClientesEquipeAno(managerIds: number[], ano: number, limite = 10): Promise<TopClienteGeral[]> {
  const { rows } = await consultaPool.query(`
    SELECT c.name AS nome, COUNT(*)::int AS "qtdTickets",
      COALESCE(SUM(t.excel_total_bonus), 0)::float AS tpv,
      COALESCE(SUM(t.excel_total_rate), 0)::float  AS receita
    FROM tickets t LEFT JOIN clients c ON c.id = t.client_id
    WHERE ${FILTROS_BASE} AND ${MANAGER_ID_REMAPPED} = ANY($1::int[])
      AND EXTRACT(YEAR FROM t.invoice_payment_date) = $2
    GROUP BY c.name ORDER BY receita DESC LIMIT $3
  `, [managerIds, ano, limite]);
  return rows.map(r => ({ nome: r.nome, qtdTickets: r.qtdTickets, tpv: r.tpv, receita: r.receita }));
}

/** Ranking anual dos membros (agregados do ano + meta anual individual). */
async function buscarMembrosAnualEquipe(
  managerIds: number[], ano: number, nomeMap: Map<number, string>,
): Promise<MetricasEquipeMembro[]> {
  const { rows } = await consultaPool.query(`
    SELECT ${MANAGER_ID_REMAPPED} AS "managerId",
      COUNT(*)::int AS "qtdTickets",
      COUNT(DISTINCT t.client_id)::int AS "clientesAtivos",
      COALESCE(SUM(t.excel_total_rate), 0)::float  AS receita,
      COALESCE(SUM(t.excel_total_bonus), 0)::float AS tpv,
      COALESCE(AVG(t.excel_rate) * 100, 0)::float  AS "taxaMedia",
      CASE WHEN COUNT(*) = 0 THEN 0 ELSE (COALESCE(SUM(t.excel_total_rate), 0) / COUNT(*))::float END AS "ticketMedio"
    FROM tickets t LEFT JOIN clients c ON c.id = t.client_id
    WHERE ${FILTROS_BASE} AND ${MANAGER_ID_REMAPPED} = ANY($1::int[])
      AND EXTRACT(YEAR FROM t.invoice_payment_date) = $2
    GROUP BY ${MANAGER_ID_REMAPPED} ORDER BY receita DESC
  `, [managerIds, ano]);
  return rows.map((r: { managerId: number; qtdTickets: number; clientesAtivos: number; receita: number; tpv: number; taxaMedia: number; ticketMedio: number }) => {
    const nome = nomeMap.get(r.managerId) ?? 'Desconhecido';
    let metaAnual = 0;
    for (let m = 1; m <= 12; m++) metaAnual += getMetaIndividual(nome, m, ano, r.managerId);
    return {
      vendedorId: r.managerId, nome, receita: r.receita, tpv: r.tpv,
      qtdTickets: r.qtdTickets, clientesAtivos: r.clientesAtivos,
      taxaMedia: r.taxaMedia, ticketMedio: r.ticketMedio,
      receitaHoje: 0, ticketsHoje: 0,
      meta: metaAnual, pct_meta: metaAnual > 0 ? Math.round((r.receita / metaAnual) * 1000) / 10 : 0,
    };
  });
}

/**
 * Ranking enxuto de membros para um conjunto de roles, sem o restante das
 * agregações de `buscarMetricasEquipe` (retenção, mix de produto, histórico,
 * anual etc.) — usado para compor rankings combinados (ex.: IS + KAM) sem
 * pagar o custo das outras queries.
 */
export async function buscarRankingMembros(
  roles: string[],
  mes: number,
  ano: number
): Promise<MetricasEquipeMembro[]> {
  const { rows: usuariosIntranet } = await pool.query(
    `SELECT email FROM blue_intranet.usuarios WHERE role = ANY($1::text[]) AND bloqueado = false`,
    [roles]
  );
  if (usuariosIntranet.length === 0) return [];

  const emails = usuariosIntranet.map((u: { email: string }) => u.email);

  const { rows: vendedoresProd } = await consultaPool.query(
    `SELECT id, name AS nome FROM users WHERE email = ANY($1::text[])`,
    [emails]
  );
  if (vendedoresProd.length === 0) return [];

  const managerIds = vendedoresProd.map((v: { id: number }) => v.id);
  const nomeMap = new Map<number, string>(
    vendedoresProd.map((v: { id: number; nome: string }) => [v.id, v.nome])
  );

  const [membrosRows, hojeMembroRows] = await Promise.all([
    consultaPool.query(`
      SELECT
        ${MANAGER_ID_REMAPPED}                         AS "managerId",
        COUNT(*)::int                                  AS "qtdTickets",
        COUNT(DISTINCT t.client_id)::int               AS "clientesAtivos",
        COALESCE(SUM(t.excel_total_rate), 0)::float    AS receita,
        COALESCE(SUM(t.excel_total_bonus), 0)::float   AS tpv,
        COALESCE(AVG(t.excel_rate) * 100, 0)::float    AS "taxaMedia",
        CASE WHEN COUNT(*) = 0 THEN 0
             ELSE (COALESCE(SUM(t.excel_total_rate), 0) / COUNT(*))::float
        END AS "ticketMedio"
      FROM tickets t
      LEFT JOIN clients c ON c.id = t.client_id
      WHERE ${FILTROS_BASE}
        AND ${MANAGER_ID_REMAPPED} = ANY($1::int[])
        AND EXTRACT(MONTH FROM t.invoice_payment_date) = $2
        AND EXTRACT(YEAR  FROM t.invoice_payment_date) = $3
      GROUP BY ${MANAGER_ID_REMAPPED}
      ORDER BY receita DESC
    `, [managerIds, mes, ano]),

    consultaPool.query(`
      SELECT
        ${MANAGER_ID_REMAPPED}                         AS "managerId",
        COUNT(*)::int                                  AS "ticketsHoje",
        COALESCE(SUM(t.excel_total_rate), 0)::float    AS "receitaHoje"
      FROM tickets t
      LEFT JOIN clients c ON c.id = t.client_id
      WHERE ${FILTROS_BASE}
        AND ${MANAGER_ID_REMAPPED} = ANY($1::int[])
        AND DATE(t.invoice_payment_date AT TIME ZONE 'UTC' AT TIME ZONE 'America/Sao_Paulo') = CURRENT_DATE
      GROUP BY ${MANAGER_ID_REMAPPED}
    `, [managerIds]),
  ]);

  const hojeMembroMap = new Map<number, { receitaHoje: number; ticketsHoje: number }>(
    hojeMembroRows.rows.map((r: { managerId: number; receitaHoje: number; ticketsHoje: number }) => [
      r.managerId,
      { receitaHoje: r.receitaHoje, ticketsHoje: r.ticketsHoje },
    ])
  );

  return membrosRows.rows.map(
    (r: { managerId: number; qtdTickets: number; clientesAtivos: number; receita: number; tpv: number; taxaMedia: number; ticketMedio: number }) => {
      const nome = nomeMap.get(r.managerId) ?? 'Desconhecido';
      const meta = getMetaIndividual(nome, mes, ano, r.managerId);
      return {
        vendedorId:     r.managerId,
        nome,
        receita:        r.receita,
        tpv:            r.tpv,
        qtdTickets:     r.qtdTickets,
        clientesAtivos: r.clientesAtivos,
        taxaMedia:      r.taxaMedia,
        ticketMedio:    r.ticketMedio,
        receitaHoje:    hojeMembroMap.get(r.managerId)?.receitaHoje ?? 0,
        ticketsHoje:    hojeMembroMap.get(r.managerId)?.ticketsHoje ?? 0,
        meta,
        pct_meta:       meta > 0 ? Math.round((r.receita / meta) * 1000) / 10 : 0,
      };
    }
  );
}

/**
 * Resolve a lista de vendedores (managerIds de produção) que pertencem a um
 * conjunto de roles da intranet: busca os e-mails dos usuários ativos com
 * essas roles, depois casa por e-mail com `users` de produção.
 */
export async function resolverManagerIdsDaEquipe(
  roles: string[]
): Promise<{ managerIds: number[]; nomeMap: Map<number, string> } | null> {
  // 1. Emails dos membros ativos no banco da intranet
  const { rows: usuariosIntranet } = await pool.query(
    `SELECT email FROM blue_intranet.usuarios WHERE role = ANY($1::text[]) AND bloqueado = false`,
    [roles]
  );
  if (usuariosIntranet.length === 0) return null;

  const emails = usuariosIntranet.map((u: { email: string }) => u.email);

  // 2. IDs dos vendedores no banco de produção
  const { rows: vendedoresProd } = await consultaPool.query(
    `SELECT id, name AS nome FROM users WHERE email = ANY($1::text[])`,
    [emails]
  );
  if (vendedoresProd.length === 0) return null;

  const managerIds = vendedoresProd.map((v: { id: number }) => v.id);
  const nomeMap = new Map<number, string>(
    vendedoresProd.map((v: { id: number; nome: string }) => [v.id, v.nome])
  );

  return { managerIds, nomeMap };
}

export async function buscarMetricasEquipe(
  roles: string[],
  mes: number,
  ano: number
): Promise<MetricasEquipe | null> {
  const resolvido = await resolverManagerIdsDaEquipe(roles);
  if (!resolvido) return null;
  const { managerIds, nomeMap } = resolvido;

  const mesAnteriorNum = mes === 1 ? 12 : mes - 1;
  const anoAnteriorNum = mes === 1 ? ano - 1 : ano;

  // 3. Todas as queries em paralelo
  const [
    totaisRows,
    membrosRows,
    anteriorRows,
    hojeMembroRows,
    clientesNovosRows,
    hoje,
    retencao,
    mixProduto,
    historicoMensal,
    topClientes,
  ] = await Promise.all([
    consultaPool.query(`
      SELECT
        COUNT(*)::int                                AS "totalTickets",
        COUNT(DISTINCT t.client_id)::int             AS "totalClientesAtivos",
        COALESCE(SUM(t.excel_total_rate), 0)::float   AS "totalReceita",
        COALESCE(SUM(t.excel_total_bonus), 0)::float  AS "totalTpv",
        COALESCE(AVG(t.excel_rate) * 100, 0)::float   AS "taxaMedia",
        CASE WHEN COUNT(*) = 0 THEN 0
             ELSE (COALESCE(SUM(t.excel_total_rate), 0) / COUNT(*))::float
        END AS "ticketMedio"
      FROM tickets t
      LEFT JOIN clients c ON c.id = t.client_id
      WHERE ${FILTROS_BASE}
        AND ${MANAGER_ID_REMAPPED} = ANY($1::int[])
        AND EXTRACT(MONTH FROM t.invoice_payment_date) = $2
        AND EXTRACT(YEAR  FROM t.invoice_payment_date) = $3
    `, [managerIds, mes, ano]),

    consultaPool.query(`
      SELECT
        ${MANAGER_ID_REMAPPED}                         AS "managerId",
        COUNT(*)::int                                  AS "qtdTickets",
        COUNT(DISTINCT t.client_id)::int               AS "clientesAtivos",
        COALESCE(SUM(t.excel_total_rate), 0)::float    AS receita,
        COALESCE(SUM(t.excel_total_bonus), 0)::float   AS tpv,
        COALESCE(AVG(t.excel_rate) * 100, 0)::float    AS "taxaMedia",
        CASE WHEN COUNT(*) = 0 THEN 0
             ELSE (COALESCE(SUM(t.excel_total_rate), 0) / COUNT(*))::float
        END AS "ticketMedio"
      FROM tickets t
      LEFT JOIN clients c ON c.id = t.client_id
      WHERE ${FILTROS_BASE}
        AND ${MANAGER_ID_REMAPPED} = ANY($1::int[])
        AND EXTRACT(MONTH FROM t.invoice_payment_date) = $2
        AND EXTRACT(YEAR  FROM t.invoice_payment_date) = $3
      GROUP BY ${MANAGER_ID_REMAPPED}
      ORDER BY receita DESC
    `, [managerIds, mes, ano]),

    consultaPool.query(`
      SELECT
        COUNT(*)::int                               AS "qtdTickets",
        COALESCE(SUM(t.excel_total_rate), 0)::float  AS receita,
        COALESCE(SUM(t.excel_total_bonus), 0)::float AS tpv
      FROM tickets t
      LEFT JOIN clients c ON c.id = t.client_id
      WHERE ${FILTROS_BASE}
        AND ${MANAGER_ID_REMAPPED} = ANY($1::int[])
        AND EXTRACT(MONTH FROM t.invoice_payment_date) = $2
        AND EXTRACT(YEAR  FROM t.invoice_payment_date) = $3
    `, [managerIds, mesAnteriorNum, anoAnteriorNum]),

    consultaPool.query(`
      SELECT
        ${MANAGER_ID_REMAPPED}                         AS "managerId",
        COUNT(*)::int                                  AS "ticketsHoje",
        COALESCE(SUM(t.excel_total_rate), 0)::float    AS "receitaHoje"
      FROM tickets t
      LEFT JOIN clients c ON c.id = t.client_id
      WHERE ${FILTROS_BASE}
        AND ${MANAGER_ID_REMAPPED} = ANY($1::int[])
        AND DATE(t.invoice_payment_date AT TIME ZONE 'UTC' AT TIME ZONE 'America/Sao_Paulo') = CURRENT_DATE
      GROUP BY ${MANAGER_ID_REMAPPED}
    `, [managerIds]),

    consultaPool.query(`
      WITH base AS (
        SELECT DISTINCT t.client_id, ${MANAGER_ID_REMAPPED} AS "managerId"
        FROM tickets t
        LEFT JOIN clients c ON c.id = t.client_id
        WHERE ${FILTROS_BASE}
          AND ${MANAGER_ID_REMAPPED} = ANY($1::int[])
          AND EXTRACT(MONTH FROM t.invoice_payment_date) = $2
          AND EXTRACT(YEAR  FROM t.invoice_payment_date) = $3
      ),
      anteriores AS (
        SELECT DISTINCT t.client_id, ${MANAGER_ID_REMAPPED} AS "managerId"
        FROM tickets t
        LEFT JOIN clients c ON c.id = t.client_id
        WHERE ${FILTROS_BASE}
          AND ${MANAGER_ID_REMAPPED} = ANY($1::int[])
          AND t.invoice_payment_date < MAKE_DATE($3::int, $2::int, 1)
      )
      SELECT
        base."managerId",
        COUNT(DISTINCT CASE WHEN ant.client_id IS NULL THEN base.client_id END)::int AS "clientesNovos"
      FROM base
      LEFT JOIN anteriores ant
        ON ant.client_id = base.client_id AND ant."managerId" = base."managerId"
      GROUP BY base."managerId"
    `, [managerIds, mes, ano]),

    buscarHojeEquipe(managerIds),
    buscarRetencaoEquipe(managerIds, mes, ano),
    buscarMixProdutoEquipe(managerIds, mes, ano),
    buscarHistoricoEquipe(managerIds, mes, ano, 6),
    buscarTopClientesEquipe(managerIds, mes, ano, 10),
  ]);

  const hojeMembroMap = new Map<number, { receitaHoje: number; ticketsHoje: number }>(
    hojeMembroRows.rows.map((r: { managerId: number; receitaHoje: number; ticketsHoje: number }) => [
      r.managerId,
      { receitaHoje: r.receitaHoje, ticketsHoje: r.ticketsHoje },
    ])
  );

  const clientesNovosMap = new Map<number, number>(
    clientesNovosRows.rows.map((r: { managerId: number; clientesNovos: number }) => [r.managerId, r.clientesNovos])
  );

  const membros: MetricasEquipeMembro[] = membrosRows.rows.map(
    (r: { managerId: number; qtdTickets: number; clientesAtivos: number; receita: number; tpv: number; taxaMedia: number; ticketMedio: number }) => {
      const nome          = nomeMap.get(r.managerId) ?? 'Desconhecido';
      const meta          = getMetaIndividual(nome, mes, ano, r.managerId);
      return {
        vendedorId:     r.managerId,
        nome,
        receita:        r.receita,
        tpv:            r.tpv,
        qtdTickets:     r.qtdTickets,
        clientesAtivos: r.clientesAtivos,
        clientesNovos:  clientesNovosMap.get(r.managerId) ?? 0,
        taxaMedia:      r.taxaMedia,
        ticketMedio:    r.ticketMedio,
        receitaHoje:    hojeMembroMap.get(r.managerId)?.receitaHoje ?? 0,
        ticketsHoje:    hojeMembroMap.get(r.managerId)?.ticketsHoje ?? 0,
        meta,
        pct_meta:       meta > 0 ? Math.round((r.receita / meta) * 1000) / 10 : 0,
      };
    }
  );

  const t = totaisRows.rows[0];
  const a = anteriorRows.rows[0];

  let equipeType: 'KAM' | 'IS' | 'GERAL' = 'GERAL';
  if (roles.length === 1) {
    const role = roles[0];
    if (role === 'KAM') equipeType = 'KAM';
    else if (role === 'INSIGHT_SALES') equipeType = 'IS';
  }
  const meta_equipe    = getMetaEquipe(equipeType, mes, ano);
  const totalReceita   = t.totalReceita as number;

  // ── Consolidado anual da equipe (para a aba Anual) ──────────────────────────
  const hojeRef = new Date();
  const ateMesAnual = ano > hojeRef.getFullYear() ? 0
    : ano === hojeRef.getFullYear() ? hojeRef.getMonth() + 1
    : 12;

  const [anualAgg, anualAggAnterior, mensalAtualAno, mensalAnteriorAno, topClientesAno, membrosAnual] = await Promise.all([
    buscarMetricasAnualEquipe(managerIds, ano),
    buscarMetricasAnualEquipe(managerIds, ano - 1, ateMesAnual),
    buscarReceitaMensalAnoEquipe(managerIds, ano),
    buscarReceitaMensalAnoEquipe(managerIds, ano - 1),
    buscarTopClientesEquipeAno(managerIds, ano, 10),
    buscarMembrosAnualEquipe(managerIds, ano, nomeMap),
  ]);

  let metaAnualEquipe = 0;
  for (let m = 1; m <= 12; m++) metaAnualEquipe += getMetaEquipe(equipeType, m, ano);

  const anual = {
    meta:           metaAnualEquipe,
    realizado:      anualAgg.receita,
    pct_meta:       metaAnualEquipe > 0 ? Math.round((anualAgg.receita / metaAnualEquipe) * 1000) / 10 : 0,
    em_aberto:      Math.max(0, metaAnualEquipe - anualAgg.receita),
    tpv:            anualAgg.tpv,
    qtdTickets:     anualAgg.qtdTickets,
    clientesAtivos: anualAgg.clientesAtivos,
    ticketMedio:    anualAgg.ticketMedio,
    taxaMedia:      anualAgg.taxaMedia,
    anterior: {
      receita:        anualAggAnterior.receita,
      tpv:            anualAggAnterior.tpv,
      qtdTickets:     anualAggAnterior.qtdTickets,
      clientesAtivos: anualAggAnterior.clientesAtivos,
      ateMes:         ateMesAnual,
    },
    topClientes: topClientesAno,
    membros:     membrosAnual,
    yoy: {
      anoAtual:    ano,
      anoAnterior: ano - 1,
      meses: Array.from({ length: 12 }, (_, i) => ({
        mes:      i + 1,
        atual:    mensalAtualAno[i] ?? 0,
        anterior: mensalAnteriorAno[i] ?? 0,
      })),
    },
  };

  return {
    equipe:              roles.length > 1 ? 'GERAL' : (roles[0] ?? 'GERAL'),
    mes,
    ano,
    totalReceita,
    totalTpv:            t.totalTpv,
    totalTickets:        t.totalTickets,
    totalClientesAtivos: t.totalClientesAtivos,
    taxaMedia:           t.taxaMedia,
    ticketMedio:         t.ticketMedio,
    meta_equipe,
    pct_meta_equipe:     meta_equipe > 0 ? Math.round((totalReceita / meta_equipe) * 1000) / 10 : 0,
    mesAnterior: {
      receita:    a.receita,
      tpv:        a.tpv,
      qtdTickets: a.qtdTickets,
    },
    hoje,
    retencao,
    mixProduto,
    historicoMensal,
    topClientes,
    membros,
    anual,
  };
}

// ═══════════════════════════════════════════════════════════════
//  MÉTRICAS GERAIS DA EMPRESA (visão consolidada — sem filtro por vendedor)
// ═══════════════════════════════════════════════════════════════

async function buscarResumoGeral(mes: number, ano: number): Promise<ResumoGeral> {
  const { rows } = await consultaPool.query(`
    SELECT
      COUNT(*)::int                              AS "qtdTickets",
      COUNT(DISTINCT t.client_id)::int           AS "clientesAtivos",
      COUNT(DISTINCT (${MANAGER_ID_REMAPPED}))::int  AS "vendedoresAtivos",
      COALESCE(SUM(t.excel_total_bonus), 0)::float   AS tpv,
      COALESCE(SUM(t.excel_total_rate), 0)::float    AS receita,
      COALESCE(AVG(t.excel_rate) * 100, 0)::float    AS "taxaMedia",
      CASE WHEN COUNT(*) = 0 THEN 0
           ELSE (COALESCE(SUM(t.excel_total_rate), 0) / COUNT(*))::float
      END AS "ticketMedio"
    FROM tickets t
    LEFT JOIN clients c ON c.id = t.client_id
    WHERE ${FILTROS_BASE}
      AND EXTRACT(MONTH FROM t.invoice_payment_date) = $1
      AND EXTRACT(YEAR  FROM t.invoice_payment_date) = $2
  `, [mes, ano]);

  const r = rows[0];
  const receita       = r.receita as number;
  const meta_total    = getMetaEquipe('GERAL', mes, ano);
  return {
    mes, ano,
    qtdTickets:       r.qtdTickets,
    clientesAtivos:   r.clientesAtivos,
    vendedoresAtivos: r.vendedoresAtivos,
    tpv:              r.tpv,
    receita,
    taxaMedia:        r.taxaMedia,
    ticketMedio:      r.ticketMedio,
    meta_total,
    pct_meta_total:   meta_total > 0 ? Math.round((receita / meta_total) * 1000) / 10 : 0,
  };
}

async function buscarHojeGeral(mes: number, ano: number): Promise<MetricasHojeGeral> {
  const { rows } = await consultaPool.query(`
    SELECT
      COUNT(*) FILTER (
        WHERE DATE(invoice_payment_date AT TIME ZONE 'UTC' AT TIME ZONE 'America/Sao_Paulo') = CURRENT_DATE
      )::int AS "qtdTickets",
      COALESCE(SUM(excel_total_rate) FILTER (
        WHERE DATE(invoice_payment_date AT TIME ZONE 'UTC' AT TIME ZONE 'America/Sao_Paulo') = CURRENT_DATE
      ), 0)::float AS receita,
      COALESCE(SUM(excel_total_bonus) FILTER (
        WHERE DATE(invoice_payment_date AT TIME ZONE 'UTC' AT TIME ZONE 'America/Sao_Paulo') = CURRENT_DATE
      ), 0)::float AS tpv,
      (COUNT(*)::float /
        NULLIF(COUNT(DISTINCT DATE(invoice_payment_date AT TIME ZONE 'UTC' AT TIME ZONE 'America/Sao_Paulo')), 0)
      )::float AS "mediaDiariaTickets",
      (COALESCE(SUM(excel_total_rate), 0) /
        NULLIF(COUNT(DISTINCT DATE(invoice_payment_date AT TIME ZONE 'UTC' AT TIME ZONE 'America/Sao_Paulo')), 0)
      )::float AS "mediaDiariaReceita"
    FROM tickets
    WHERE status = 'done' AND invoice_status = 'received'
      AND excel_total_value > 0 AND kind <> 'virtual_batch_payment'
      AND client_id NOT IN (43, 44, 333)
      AND EXTRACT(MONTH FROM invoice_payment_date) = $1
      AND EXTRACT(YEAR  FROM invoice_payment_date) = $2
  `, [mes, ano]);

  const r = rows[0];
  return {
    qtdTickets:          r.qtdTickets,
    receita:             r.receita,
    tpv:                 r.tpv,
    mediaDiariaTickets:  r.mediaDiariaTickets ?? 0,
    mediaDiariaReceita:  r.mediaDiariaReceita ?? 0,
  };
}

async function buscarRetencao(mes: number, ano: number): Promise<RetencaoClientes> {
  const mesAnterior = mes === 1 ? 12 : mes - 1;
  const anoAnterior = mes === 1 ? ano - 1 : ano;

  const { rows } = await consultaPool.query(`
    WITH atual AS (
      SELECT DISTINCT client_id FROM tickets
      WHERE status='done' AND invoice_status='received' AND excel_total_value > 0
        AND kind <> 'virtual_batch_payment'
        AND client_id NOT IN (43,44,333)
        AND EXTRACT(MONTH FROM invoice_payment_date) = $1
        AND EXTRACT(YEAR  FROM invoice_payment_date) = $2
    ),
    anterior AS (
      SELECT DISTINCT client_id FROM tickets
      WHERE status='done' AND invoice_status='received' AND excel_total_value > 0
        AND kind <> 'virtual_batch_payment'
        AND client_id NOT IN (43,44,333)
        AND EXTRACT(MONTH FROM invoice_payment_date) = $3
        AND EXTRACT(YEAR  FROM invoice_payment_date) = $4
    )
    SELECT
      COUNT(DISTINCT atual.client_id) FILTER (WHERE anterior.client_id IS NULL)     AS novos,
      COUNT(DISTINCT atual.client_id) FILTER (WHERE anterior.client_id IS NOT NULL)  AS recorrentes,
      COUNT(DISTINCT anterior.client_id) FILTER (WHERE atual.client_id IS NULL)      AS perdidos
    FROM atual FULL OUTER JOIN anterior ON atual.client_id = anterior.client_id
  `, [mes, ano, mesAnterior, anoAnterior]);

  const r = rows[0];
  const total = (r.novos ?? 0) + (r.recorrentes ?? 0);
  return {
    novos:        Number(r.novos ?? 0),
    recorrentes:  Number(r.recorrentes ?? 0),
    perdidos:     Number(r.perdidos ?? 0),
    taxaRetencao: total > 0 ? Math.round((Number(r.recorrentes) / total) * 1000) / 10 : 0,
  };
}

async function buscarMixProduto(mes: number, ano: number): Promise<MixProduto[]> {
  const { rows } = await consultaPool.query(`
    SELECT
      kind AS produto,
      COUNT(*)::int              AS "qtdTickets",
      COALESCE(SUM(excel_total_rate), 0)::float AS receita,
      ROUND((SUM(excel_total_rate) /
        NULLIF(SUM(SUM(excel_total_rate)) OVER (), 0) * 100)::numeric, 2)::float AS "percentualReceita"
    FROM tickets
    WHERE status='done' AND invoice_status='received'
      AND excel_total_value > 0 AND kind <> 'virtual_batch_payment'
      AND client_id NOT IN (43,44,333)
      AND EXTRACT(MONTH FROM invoice_payment_date) = $1
      AND EXTRACT(YEAR  FROM invoice_payment_date) = $2
    GROUP BY kind
    ORDER BY receita DESC
  `, [mes, ano]);

  return rows.map(r => ({
    produto:           r.produto,
    qtdTickets:        r.qtdTickets,
    receita:           r.receita,
    percentualReceita: r.percentualReceita,
  }));
}

async function buscarEvolucaoMensal(mes: number, ano: number, meses: number = 6): Promise<CrescimentoMoM[]> {
  const { rows } = await consultaPool.query(`
    SELECT
      EXTRACT(YEAR  FROM t.invoice_payment_date)::int AS ano,
      EXTRACT(MONTH FROM t.invoice_payment_date)::int AS mes,
      COUNT(*)::int                                   AS "qtdTickets",
      COUNT(DISTINCT t.client_id)::int                AS "clientesAtivos",
      COALESCE(SUM(t.excel_total_rate), 0)::float     AS receita,
      COALESCE(SUM(t.excel_total_bonus), 0)::float    AS tpv,
      COALESCE(AVG(t.excel_rate) * 100, 0)::float     AS "taxaMedia"
    FROM tickets t
    WHERE t.status='done' AND t.invoice_status='received'
      AND t.excel_total_value > 0 AND t.kind <> 'virtual_batch_payment'
      AND t.client_id NOT IN (43,44,333)
      AND t.invoice_payment_date >= DATE_TRUNC('month', MAKE_DATE($2::int, $1::int, 1)) - INTERVAL '1 month' * ($3 - 1)
      AND t.invoice_payment_date <  DATE_TRUNC('month', MAKE_DATE($2::int, $1::int, 1)) + INTERVAL '1 month'
    GROUP BY ano, mes
    ORDER BY ano ASC, mes ASC
  `, [mes, ano, meses]);

  return rows.map((r, i) => {
    const prev = rows[i - 1];
    return {
      ano:                r.ano,
      mes:                r.mes,
      receita:            r.receita,
      tpv:                r.tpv,
      qtdTickets:         r.qtdTickets,
      clientesAtivos:     r.clientesAtivos,
      taxaMedia:          r.taxaMedia,
      crescimentoReceita:  prev && prev.receita ? Math.round(((r.receita - prev.receita) / prev.receita) * 1000) / 10 : null,
      crescimentoTpv:      prev && prev.tpv     ? Math.round(((r.tpv     - prev.tpv)     / prev.tpv)     * 1000) / 10 : null,
      crescimentoClientes: prev && prev.clientesAtivos ? Math.round(((r.clientesAtivos - prev.clientesAtivos) / prev.clientesAtivos) * 1000) / 10 : null,
    };
  });
}

/** Receita mensal da empresa inteira num ano (array[12]) — alimenta o comparativo Ano × Ano. */
async function buscarReceitaMensalAnoGeral(ano: number): Promise<number[]> {
  const { rows } = await consultaPool.query(`
    SELECT
      EXTRACT(MONTH FROM t.invoice_payment_date)::int AS mes,
      COALESCE(SUM(t.excel_total_rate), 0)::float     AS receita
    FROM tickets t
    LEFT JOIN clients c ON c.id = t.client_id
    WHERE ${FILTROS_BASE}
      AND EXTRACT(YEAR FROM t.invoice_payment_date) = $1
    GROUP BY mes
    ORDER BY mes
  `, [ano]);

  const arr = new Array<number>(12).fill(0);
  for (const r of rows) arr[r.mes - 1] = r.receita;
  return arr;
}

async function buscarTopClientesGeral(mes: number, ano: number, limite = 10): Promise<TopClienteGeral[]> {
  const { rows } = await consultaPool.query(`
    SELECT
      cl.name                                       AS nome,
      COUNT(*)::int                                 AS "qtdTickets",
      COALESCE(SUM(t.excel_total_bonus), 0)::float  AS tpv,
      COALESCE(SUM(t.excel_total_rate), 0)::float   AS receita
    FROM tickets t
    JOIN clients cl ON cl.id = t.client_id
    WHERE t.status='done' AND t.invoice_status='received'
      AND t.excel_total_value > 0 AND t.kind <> 'virtual_batch_payment'
      AND t.client_id NOT IN (43,44,333)
      AND EXTRACT(MONTH FROM t.invoice_payment_date) = $1
      AND EXTRACT(YEAR  FROM t.invoice_payment_date) = $2
    GROUP BY cl.name
    ORDER BY receita DESC
    LIMIT $3
  `, [mes, ano, limite]);

  return rows.map(r => ({
    nome:       r.nome,
    qtdTickets: r.qtdTickets,
    tpv:        r.tpv,
    receita:    r.receita,
  }));
}

async function buscarYTD(mes: number, ano: number): Promise<ComparativoYTD[]> {
  const { rows } = await consultaPool.query(`
    SELECT
      EXTRACT(YEAR FROM t.invoice_payment_date)::int AS ano,
      COALESCE(SUM(t.excel_total_rate), 0)::float    AS receita,
      COALESCE(SUM(t.excel_total_bonus), 0)::float   AS tpv,
      COUNT(DISTINCT t.client_id)::int               AS "clientesUnicos"
    FROM tickets t
    WHERE t.status='done' AND t.invoice_status='received'
      AND t.excel_total_value > 0 AND t.kind <> 'virtual_batch_payment'
      AND t.client_id NOT IN (43,44,333)
      AND EXTRACT(MONTH FROM t.invoice_payment_date) <= $1
      AND EXTRACT(YEAR  FROM t.invoice_payment_date) IN ($2, $3)
    GROUP BY ano
    ORDER BY ano ASC
  `, [mes, ano - 1, ano]);

  return rows.map(r => ({
    ano:            r.ano,
    receita:        r.receita,
    tpv:            r.tpv,
    clientesUnicos: r.clientesUnicos,
  }));
}

async function buscarNovosClientesMes(ano: number): Promise<NovosClientesMes[]> {
  const { rows } = await consultaPool.query(`
    SELECT
      EXTRACT(MONTH FROM primeiro_ticket)::int AS mes,
      EXTRACT(YEAR  FROM primeiro_ticket)::int AS ano,
      COUNT(*)::int                            AS quantidade
    FROM (
      SELECT client_id, MIN(invoice_payment_date) AS primeiro_ticket
      FROM tickets
      WHERE status='done' AND invoice_status='received'
        AND excel_total_value > 0 AND kind <> 'virtual_batch_payment'
        AND client_id NOT IN (43,44,333)
      GROUP BY client_id
    ) primeiros
    WHERE EXTRACT(YEAR FROM primeiro_ticket) = $1
    GROUP BY mes, ano
    ORDER BY mes ASC
  `, [ano]);

  return rows.map(r => ({
    mes:        r.mes,
    ano:        r.ano,
    quantidade: r.quantidade,
  }));
}

export async function buscarMetricasGerais(
  mes?: number,
  ano?: number
): Promise<MetricasGerais> {
  const agora  = new Date();
  const mesRef = mes ?? (agora.getMonth() + 1);
  const anoRef = ano ?? agora.getFullYear();

  const [
    resumo,
    hoje,
    retencao,
    mixProduto,
    evolucaoMensal,
    topClientes,
    ytd,
    novosClientesMes,
    receitaMensalAno,
    rankingComercial,
  ] = await Promise.all([
    buscarResumoGeral(mesRef, anoRef),
    buscarHojeGeral(mesRef, anoRef),
    buscarRetencao(mesRef, anoRef),
    buscarMixProduto(mesRef, anoRef),
    buscarEvolucaoMensal(mesRef, anoRef, 6),
    buscarTopClientesGeral(mesRef, anoRef, 10),
    buscarYTD(mesRef, anoRef),
    buscarNovosClientesMes(anoRef),
    buscarReceitaMensalAnoGeral(anoRef),
    buscarRankingMembros(['INSIGHT_SALES', 'KAM'], mesRef, anoRef),
  ]);

  return { resumo, hoje, retencao, mixProduto, evolucaoMensal, topClientes, ytd, novosClientesMes, receitaMensalAno, rankingComercial };
}
