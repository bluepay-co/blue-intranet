import { pool } from '../database/pool';
import { consultaPool } from '../database/consulta-pool';
import { getMetaIndividual, getMetaEquipe } from '../data/metas2026';
import type {
  MetricasMes, MetricasHoje, MetricasHistorico,
  MetricasVendedor, TopCliente,
  MetricasEquipe, MetricasEquipeMembro, MetricasEquipeHoje,
  ResumoGeral, MetricasHojeGeral, RetencaoClientes, MixProduto,
  CrescimentoMoM, TopClienteGeral, FaixaTaxa, ComparativoYTD,
  NovosClientesMes, MetricasGerais,
  MetricasCXMes, MetricasCXHoje, MetricasCXHistorico,
  MetricasCXMixTipo, MetricasCXSla, MetricasCXBacklog,
  MetricasCXCompletas, MetricasCXMembroEquipe, MetricasCXEquipe,
} from '../models/metricas.model';

const FILTROS_BASE = `
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
const MANAGER_ID_REMAPPED = `
  CASE
    WHEN c.manager_id = 64   THEN 123
    WHEN c.manager_id = 2    THEN 123
    WHEN c.manager_id = 2554 THEN 1234
    ELSE c.manager_id
  END
`;

const FILTROS_BASE_CX = `
  t.status = 'done'
  AND t.invoice_status = 'received'
  AND t.excel_total_value > 0
  AND t.kind <> 'virtual_batch_payment'
  AND t.client_id NOT IN (43, 44, 333)
  AND t.invoice_payment_date IS NOT NULL
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

  const primeiroNome = vendedor.nome.split(' ')[0] ?? '';
  const meta = getMetaIndividual(primeiroNome, mesConsulta, anoConsulta);
  mesAtual.meta     = meta;
  mesAtual.pct_meta = meta > 0 ? Math.round((mesAtual.receita / meta) * 1000) / 10 : 0;

  // Meta anual = soma das 12 metas mensais do vendedor no ano.
  let metaAnual = 0;
  for (let m = 1; m <= 12; m++) metaAnual += getMetaIndividual(primeiroNome, m, anoConsulta);

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
      COALESCE(SUM(t.excel_total_rate), 0)::float   AS receita,
      COALESCE(AVG(t.excel_rate) * 100, 0)::float   AS taxa
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
    taxa:       r.taxa,
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
      COALESCE(SUM(t.excel_total_rate), 0)::float  AS receita,
      COALESCE(AVG(t.excel_rate) * 100, 0)::float   AS taxa
    FROM tickets t LEFT JOIN clients c ON c.id = t.client_id
    WHERE ${FILTROS_BASE} AND ${MANAGER_ID_REMAPPED} = ANY($1::int[])
      AND EXTRACT(YEAR FROM t.invoice_payment_date) = $2
    GROUP BY c.name ORDER BY receita DESC LIMIT $3
  `, [managerIds, ano, limite]);
  return rows.map(r => ({ nome: r.nome, qtdTickets: r.qtdTickets, tpv: r.tpv, receita: r.receita, taxa: r.taxa }));
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
    const primeiroNome = nome.split(' ')[0] ?? '';
    let metaAnual = 0;
    for (let m = 1; m <= 12; m++) metaAnual += getMetaIndividual(primeiroNome, m, ano);
    return {
      vendedorId: r.managerId, nome, receita: r.receita, tpv: r.tpv,
      qtdTickets: r.qtdTickets, clientesAtivos: r.clientesAtivos,
      taxaMedia: r.taxaMedia, ticketMedio: r.ticketMedio,
      receitaHoje: 0, ticketsHoje: 0,
      meta: metaAnual, pct_meta: metaAnual > 0 ? Math.round((r.receita / metaAnual) * 1000) / 10 : 0,
    };
  });
}

export async function buscarMetricasEquipe(
  roles: string[],
  mes: number,
  ano: number
): Promise<MetricasEquipe | null> {
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

  const mesAnteriorNum = mes === 1 ? 12 : mes - 1;
  const anoAnteriorNum = mes === 1 ? ano - 1 : ano;

  // 3. Todas as queries em paralelo
  const [
    totaisRows,
    membrosRows,
    anteriorRows,
    hojeMembroRows,
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

  const membros: MetricasEquipeMembro[] = membrosRows.rows.map(
    (r: { managerId: number; qtdTickets: number; clientesAtivos: number; receita: number; tpv: number; taxaMedia: number; ticketMedio: number }) => {
      const nome          = nomeMap.get(r.managerId) ?? 'Desconhecido';
      const primeiroNome  = nome.split(' ')[0] ?? '';
      const meta          = getMetaIndividual(primeiroNome, mes, ano);
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

async function buscarTopClientesGeral(mes: number, ano: number, limite = 10): Promise<TopClienteGeral[]> {
  const { rows } = await consultaPool.query(`
    SELECT
      cl.name                                       AS nome,
      COUNT(*)::int                                 AS "qtdTickets",
      COALESCE(SUM(t.excel_total_bonus), 0)::float  AS tpv,
      COALESCE(SUM(t.excel_total_rate), 0)::float   AS receita,
      COALESCE(AVG(t.excel_rate) * 100, 0)::float   AS taxa
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
    taxa:       r.taxa,
  }));
}

async function buscarFaixasTaxa(mes: number, ano: number): Promise<FaixaTaxa[]> {
  const { rows } = await consultaPool.query(`
    SELECT
      CASE
        WHEN t.excel_rate < 0.005                             THEN 'Abaixo de 0.5%'
        WHEN t.excel_rate >= 0.005 AND t.excel_rate < 0.01   THEN '0.5% a 1.0%'
        WHEN t.excel_rate >= 0.01  AND t.excel_rate < 0.02   THEN '1.0% a 2.0%'
        WHEN t.excel_rate >= 0.02  AND t.excel_rate < 0.03   THEN '2.0% a 3.0%'
        WHEN t.excel_rate >= 0.03  AND t.excel_rate < 0.04   THEN '3.0% a 4.0%'
        ELSE 'Acima de 4.0%'
      END AS faixa,
      COUNT(DISTINCT t.client_id)::int            AS clientes,
      COUNT(*)::int                               AS tickets,
      COALESCE(SUM(t.excel_total_rate), 0)::float AS receita
    FROM tickets t
    WHERE t.status='done' AND t.invoice_status='received'
      AND t.excel_total_value > 0 AND t.kind <> 'virtual_batch_payment'
      AND t.client_id NOT IN (43,44,333)
      AND EXTRACT(MONTH FROM t.invoice_payment_date) = $1
      AND EXTRACT(YEAR  FROM t.invoice_payment_date) = $2
    GROUP BY faixa
    ORDER BY MIN(t.excel_rate)
  `, [mes, ano]);

  return rows.map(r => ({
    faixa:    r.faixa,
    clientes: r.clientes,
    tickets:  r.tickets,
    receita:  r.receita,
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
    faixasTaxa,
    ytd,
    novosClientesMes,
  ] = await Promise.all([
    buscarResumoGeral(mesRef, anoRef),
    buscarHojeGeral(mesRef, anoRef),
    buscarRetencao(mesRef, anoRef),
    buscarMixProduto(mesRef, anoRef),
    buscarEvolucaoMensal(mesRef, anoRef, 6),
    buscarTopClientesGeral(mesRef, anoRef, 10),
    buscarFaixasTaxa(mesRef, anoRef),
    buscarYTD(mesRef, anoRef),
    buscarNovosClientesMes(anoRef),
  ]);

  return { resumo, hoje, retencao, mixProduto, evolucaoMensal, topClientes, faixasTaxa, ytd, novosClientesMes };
}

// ── Métricas CX ─────────────────────────────────────────────────────────────

async function buscarMetricasCXMes(
  userId: number,
  mes: number,
  ano: number,
): Promise<MetricasCXMes> {
  const [principal, cancelRow] = await Promise.all([
    consultaPool.query(
      `SELECT
         COUNT(*)::int                                                        AS "qtdTickets",
         COUNT(DISTINCT t.client_id)::int                                     AS "clientesAtivos",
         COALESCE(SUM(t.excel_total_value), 0)::float                        AS "volume",
         COALESCE(SUM(t.excel_total_bonus), 0)::float                        AS "tpv",
         COALESCE(SUM(t.excel_total_rate),  0)::float                        AS "receita",
         COALESCE(AVG(t.excel_rate) * 100,  0)::float                        AS "taxaMedia",
         CASE WHEN COUNT(*) = 0 THEN 0
              ELSE (SUM(t.excel_total_value) / COUNT(*)) END::float           AS "ticketMedio"
       FROM tickets t
       WHERE t.user_id = $1
         AND ${FILTROS_BASE_CX}
         AND EXTRACT(MONTH FROM t.invoice_payment_date) = $2
         AND EXTRACT(YEAR  FROM t.invoice_payment_date) = $3`,
      [userId, mes, ano],
    ),
    consultaPool.query(
      `SELECT COUNT(*)::int AS cnt
       FROM tickets t
       WHERE t.user_id = $1
         AND t.status = 'canceled'
         AND t.invoice_payment_date IS NOT NULL
         AND EXTRACT(MONTH FROM t.invoice_payment_date) = $2
         AND EXTRACT(YEAR  FROM t.invoice_payment_date) = $3`,
      [userId, mes, ano],
    ),
  ]);

  const r = principal.rows[0];
  return {
    mes, ano,
    qtdTickets:     r.qtdTickets     ?? 0,
    clientesAtivos: r.clientesAtivos ?? 0,
    volume:         r.volume         ?? 0,
    tpv:            r.tpv            ?? 0,
    receita:        r.receita        ?? 0,
    taxaMedia:      r.taxaMedia      ?? 0,
    ticketMedio:    r.ticketMedio    ?? 0,
    cancelamentos:  cancelRow.rows[0]?.cnt ?? 0,
  };
}

async function buscarMetricasCXHoje(userId: number): Promise<MetricasCXHoje> {
  const [financeiro, cartoes] = await Promise.all([
    consultaPool.query(
      `SELECT
         COUNT(*)::int                                 AS "qtdTickets",
         COALESCE(SUM(t.excel_total_value), 0)::float AS "volume",
         COALESCE(SUM(t.excel_total_rate),  0)::float AS "receita",
         COALESCE(SUM(t.excel_total_bonus), 0)::float AS "tpv"
       FROM tickets t
       WHERE t.user_id = $1
         AND ${FILTROS_BASE_CX}
         AND DATE(t.invoice_payment_date AT TIME ZONE 'UTC' AT TIME ZONE 'America/Sao_Paulo')
             = CURRENT_DATE`,
      [userId],
    ),
    consultaPool.query(
      `SELECT COUNT(*)::int AS cnt
       FROM tickets t
       WHERE t.user_id = $1
         AND t.kind = 'card_registration'
         AND t.status = 'done'
         AND DATE(t.done_at AT TIME ZONE 'UTC' AT TIME ZONE 'America/Sao_Paulo') = CURRENT_DATE`,
      [userId],
    ),
  ]);

  const r = financeiro.rows[0];
  return {
    qtdTickets:  r.qtdTickets  ?? 0,
    volume:      r.volume      ?? 0,
    receita:     r.receita     ?? 0,
    tpv:         r.tpv         ?? 0,
    cartoesHoje: cartoes.rows[0]?.cnt ?? 0,
  };
}

async function buscarMetricasCXHistorico(
  userId: number,
  mes: number,
  ano: number,
  meses = 6,
): Promise<MetricasCXHistorico[]> {
  const { rows } = await consultaPool.query(
    `SELECT
       EXTRACT(YEAR  FROM t.invoice_payment_date)::int AS "ano",
       EXTRACT(MONTH FROM t.invoice_payment_date)::int AS "mes",
       COUNT(*)::int                                   AS "qtdTickets",
       COUNT(DISTINCT t.client_id)::int                AS "clientesAtivos",
       COALESCE(SUM(t.excel_total_value), 0)::float   AS "volume",
       COALESCE(SUM(t.excel_total_rate),  0)::float   AS "receita",
       COALESCE(SUM(t.excel_total_bonus), 0)::float   AS "tpv"
     FROM tickets t
     WHERE t.user_id = $1
       AND ${FILTROS_BASE_CX}
       AND t.invoice_payment_date >= DATE_TRUNC('month', MAKE_DATE($3::int, $2::int, 1))
           - INTERVAL '1 month' * ($4 - 1)
       AND t.invoice_payment_date <  DATE_TRUNC('month', MAKE_DATE($3::int, $2::int, 1))
           + INTERVAL '1 month'
     GROUP BY ano, mes
     ORDER BY ano ASC, mes ASC`,
    [userId, mes, ano, meses],
  );
  return rows;
}

async function buscarMetricasCXMixTipo(
  userId: number,
  mes: number,
  ano: number,
): Promise<MetricasCXMixTipo[]> {
  const { rows } = await consultaPool.query(
    `SELECT
       t.kind                                          AS "tipo",
       COUNT(*)::int                                   AS "qtd",
       COALESCE(SUM(t.excel_total_value), 0)::float   AS "volume",
       COALESCE(SUM(t.excel_total_rate),  0)::float   AS "receita",
       ROUND(
         (SUM(t.excel_total_value) /
          NULLIF(SUM(SUM(t.excel_total_value)) OVER (), 0) * 100
         )::numeric, 2
       )::float AS "percentual"
     FROM tickets t
     WHERE t.user_id = $1
       AND ${FILTROS_BASE_CX}
       AND EXTRACT(MONTH FROM t.invoice_payment_date) = $2
       AND EXTRACT(YEAR  FROM t.invoice_payment_date) = $3
     GROUP BY t.kind
     ORDER BY "volume" DESC`,
    [userId, mes, ano],
  );
  return rows;
}

async function buscarMetricasCXSla(
  userId: number,
  mes: number,
  ano: number,
): Promise<MetricasCXSla[]> {
  const { rows } = await consultaPool.query(
    `SELECT
       t.kind                                          AS "tipo",
       COUNT(*)::int                                   AS "qtd",
       ROUND(AVG(
         EXTRACT(EPOCH FROM (t.done_at - t.created_at)) / 60
       )::numeric, 0)::float                          AS "mediaMinutos",
       ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (
         ORDER BY EXTRACT(EPOCH FROM (t.done_at - t.created_at)) / 60
       )::numeric, 0)::float                          AS "medianaMinutos"
     FROM tickets t
     WHERE t.user_id = $1
       AND t.status = 'done'
       AND t.done_at IS NOT NULL
       AND t.created_at IS NOT NULL
       AND t.excel_total_value > 0
       AND t.kind <> 'virtual_batch_payment'
       AND t.client_id NOT IN (43, 44, 333)
       AND t.invoice_payment_date IS NOT NULL
       AND EXTRACT(MONTH FROM t.invoice_payment_date) = $2
       AND EXTRACT(YEAR  FROM t.invoice_payment_date) = $3
     GROUP BY t.kind
     ORDER BY "qtd" DESC`,
    [userId, mes, ano],
  );
  return rows;
}

async function buscarRegistrosCartaoCX(
  userId: number,
  mes: number,
  ano: number,
): Promise<number> {
  const { rows } = await consultaPool.query(
    `SELECT COUNT(*)::int AS cnt
     FROM tickets t
     WHERE t.user_id = $1
       AND t.kind = 'card_registration'
       AND t.status = 'done'
       AND EXTRACT(MONTH FROM t.done_at AT TIME ZONE 'UTC' AT TIME ZONE 'America/Sao_Paulo') = $2
       AND EXTRACT(YEAR  FROM t.done_at AT TIME ZONE 'UTC' AT TIME ZONE 'America/Sao_Paulo') = $3`,
    [userId, mes, ano],
  );
  return rows[0]?.cnt ?? 0;
}

async function buscarBacklogCX(userId: number): Promise<MetricasCXBacklog> {
  const { rows } = await consultaPool.query(
    `SELECT
       COUNT(*)::int                                                         AS "total",
       COUNT(*) FILTER (WHERE t.kind = 'bank_deposit')::int                 AS "bankDeposit",
       COUNT(*) FILTER (WHERE t.kind = 'card_deposit')::int                 AS "cardDeposit",
       COUNT(*) FILTER (WHERE t.kind = 'virtual_deposit')::int              AS "virtualDeposit",
       COUNT(*) FILTER (WHERE t.kind = 'card_registration')::int            AS "cardRegistration",
       MIN(t.created_at AT TIME ZONE 'UTC' AT TIME ZONE 'America/Sao_Paulo')::text AS "maisAntigo"
     FROM tickets t
     WHERE t.user_id = $1
       AND t.status NOT IN ('done', 'canceled')`,
    [userId],
  );
  const row = rows[0];
  return {
    total:            row.total            ?? 0,
    bankDeposit:      row.bankDeposit      ?? 0,
    cardDeposit:      row.cardDeposit      ?? 0,
    virtualDeposit:   row.virtualDeposit   ?? 0,
    cardRegistration: row.cardRegistration ?? 0,
    maisAntigo:       row.maisAntigo       ?? null,
  };
}

export async function buscarMetricasCXCompletas(
  email: string,
  mes: number,
  ano: number,
): Promise<MetricasCXCompletas | null> {
  const vendedor = await buscarVendedorPorEmail(email);
  if (!vendedor) return null;

  const [mesAtual, hoje, historico, mixTipo, sla, cartoesNoMes, backlog] = await Promise.all([
    buscarMetricasCXMes(vendedor.id, mes, ano),
    buscarMetricasCXHoje(vendedor.id),
    buscarMetricasCXHistorico(vendedor.id, mes, ano, 6),
    buscarMetricasCXMixTipo(vendedor.id, mes, ano),
    buscarMetricasCXSla(vendedor.id, mes, ano),
    buscarRegistrosCartaoCX(vendedor.id, mes, ano),
    buscarBacklogCX(vendedor.id),
  ]);

  return {
    userId:  vendedor.id,
    nome:    vendedor.nome,
    email,
    mesAtual,
    hoje,
    historico,
    mixTipo,
    sla,
    cartoesNoMes,
    backlog,
  };
}

export async function buscarMetricasCXEquipe(
  mes: number,
  ano: number,
): Promise<MetricasCXEquipe | null> {
  const { rows: usuariosIntranet } = await pool.query(
    `SELECT email FROM blue_intranet.usuarios WHERE role = 'CX' AND bloqueado = false`,
  );
  if (usuariosIntranet.length === 0) return null;

  const emails = usuariosIntranet.map((u: { email: string }) => u.email);

  const { rows: usuariosProd } = await consultaPool.query(
    `SELECT id, name AS nome FROM users WHERE email = ANY($1::text[])`,
    [emails],
  );
  if (usuariosProd.length === 0) return null;

  const userIds = usuariosProd.map((u: { id: number }) => u.id);
  const nomeMap = new Map<number, string>(
    usuariosProd.map((u: { id: number; nome: string }) => [u.id, u.nome]),
  );

  const [totais, membros, cancelRow, hojeRow, historicoRows, mixRows, slaRows] = await Promise.all([
    consultaPool.query(
      `SELECT
         COUNT(*)::int                                                        AS "totalQtdTickets",
         COUNT(DISTINCT t.client_id)::int                                     AS "totalClientesAtivos",
         COALESCE(SUM(t.excel_total_value), 0)::float                        AS "totalVolume",
         COALESCE(SUM(t.excel_total_bonus), 0)::float                        AS "totalTpv",
         COALESCE(SUM(t.excel_total_rate),  0)::float                        AS "totalReceita",
         COALESCE(AVG(t.excel_rate) * 100,  0)::float                        AS "taxaMedia",
         CASE WHEN COUNT(*) = 0 THEN 0
              ELSE (SUM(t.excel_total_value) / COUNT(*)) END::float           AS "ticketMedio"
       FROM tickets t
       WHERE t.user_id = ANY($1::int[])
         AND ${FILTROS_BASE_CX}
         AND EXTRACT(MONTH FROM t.invoice_payment_date) = $2
         AND EXTRACT(YEAR  FROM t.invoice_payment_date) = $3`,
      [userIds, mes, ano],
    ),
    consultaPool.query(
      `SELECT
         t.user_id                                                            AS "userId",
         COUNT(*)::int                                                        AS "qtdTickets",
         COUNT(DISTINCT t.client_id)::int                                     AS "clientesAtivos",
         COALESCE(SUM(t.excel_total_value), 0)::float                        AS "volume",
         COALESCE(SUM(t.excel_total_bonus), 0)::float                        AS "tpv",
         COALESCE(SUM(t.excel_total_rate),  0)::float                        AS "receita",
         COALESCE(AVG(t.excel_rate) * 100,  0)::float                        AS "taxaMedia"
       FROM tickets t
       WHERE t.user_id = ANY($1::int[])
         AND ${FILTROS_BASE_CX}
         AND EXTRACT(MONTH FROM t.invoice_payment_date) = $2
         AND EXTRACT(YEAR  FROM t.invoice_payment_date) = $3
       GROUP BY t.user_id
       ORDER BY "receita" DESC`,
      [userIds, mes, ano],
    ),
    consultaPool.query(
      `SELECT COUNT(*)::int AS cnt
       FROM tickets t
       WHERE t.user_id = ANY($1::int[])
         AND t.status = 'canceled'
         AND t.invoice_payment_date IS NOT NULL
         AND EXTRACT(MONTH FROM t.invoice_payment_date) = $2
         AND EXTRACT(YEAR  FROM t.invoice_payment_date) = $3`,
      [userIds, mes, ano],
    ),
    consultaPool.query(
      `SELECT
         COUNT(*)::int                                 AS "qtdTickets",
         COALESCE(SUM(t.excel_total_value), 0)::float AS "volume",
         COALESCE(SUM(t.excel_total_rate),  0)::float AS "receita",
         COALESCE(SUM(t.excel_total_bonus), 0)::float AS "tpv",
         0::int                                        AS "cartoesHoje"
       FROM tickets t
       WHERE t.user_id = ANY($1::int[])
         AND ${FILTROS_BASE_CX}
         AND DATE(t.invoice_payment_date AT TIME ZONE 'UTC' AT TIME ZONE 'America/Sao_Paulo')
             = CURRENT_DATE`,
      [userIds],
    ),
    consultaPool.query(
      `SELECT
         EXTRACT(YEAR  FROM t.invoice_payment_date)::int AS "ano",
         EXTRACT(MONTH FROM t.invoice_payment_date)::int AS "mes",
         COUNT(*)::int                                   AS "qtdTickets",
         COUNT(DISTINCT t.client_id)::int                AS "clientesAtivos",
         COALESCE(SUM(t.excel_total_value), 0)::float   AS "volume",
         COALESCE(SUM(t.excel_total_rate),  0)::float   AS "receita",
         COALESCE(SUM(t.excel_total_bonus), 0)::float   AS "tpv"
       FROM tickets t
       WHERE t.user_id = ANY($1::int[])
         AND ${FILTROS_BASE_CX}
         AND t.invoice_payment_date >= DATE_TRUNC('month', MAKE_DATE($3::int, $2::int, 1))
             - INTERVAL '1 month' * 5
         AND t.invoice_payment_date <  DATE_TRUNC('month', MAKE_DATE($3::int, $2::int, 1))
             + INTERVAL '1 month'
       GROUP BY ano, mes
       ORDER BY ano ASC, mes ASC`,
      [userIds, mes, ano],
    ),
    consultaPool.query(
      `SELECT
         t.kind                                          AS "tipo",
         COUNT(*)::int                                   AS "qtd",
         COALESCE(SUM(t.excel_total_value), 0)::float   AS "volume",
         COALESCE(SUM(t.excel_total_rate),  0)::float   AS "receita",
         ROUND(
           (SUM(t.excel_total_value) /
            NULLIF(SUM(SUM(t.excel_total_value)) OVER (), 0) * 100
           )::numeric, 2
         )::float AS "percentual"
       FROM tickets t
       WHERE t.user_id = ANY($1::int[])
         AND ${FILTROS_BASE_CX}
         AND EXTRACT(MONTH FROM t.invoice_payment_date) = $2
         AND EXTRACT(YEAR  FROM t.invoice_payment_date) = $3
       GROUP BY t.kind
       ORDER BY "volume" DESC`,
      [userIds, mes, ano],
    ),
    consultaPool.query(
      `SELECT
         t.kind                                          AS "tipo",
         COUNT(*)::int                                   AS "qtd",
         ROUND(AVG(
           EXTRACT(EPOCH FROM (t.done_at - t.created_at)) / 60
         )::numeric, 0)::float                          AS "mediaMinutos",
         ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (
           ORDER BY EXTRACT(EPOCH FROM (t.done_at - t.created_at)) / 60
         )::numeric, 0)::float                          AS "medianaMinutos"
       FROM tickets t
       WHERE t.user_id = ANY($1::int[])
         AND t.status = 'done'
         AND t.done_at IS NOT NULL
         AND t.created_at IS NOT NULL
         AND t.excel_total_value > 0
         AND t.kind <> 'virtual_batch_payment'
         AND t.client_id NOT IN (43, 44, 333)
         AND t.invoice_payment_date IS NOT NULL
         AND EXTRACT(MONTH FROM t.invoice_payment_date) = $2
         AND EXTRACT(YEAR  FROM t.invoice_payment_date) = $3
       GROUP BY t.kind
       ORDER BY "qtd" DESC`,
      [userIds, mes, ano],
    ),
  ]);

  const t = totais.rows[0];
  const h = hojeRow.rows[0];

  return {
    mes, ano,
    totalQtdTickets:     t.totalQtdTickets     ?? 0,
    totalVolume:         t.totalVolume         ?? 0,
    totalReceita:        t.totalReceita        ?? 0,
    totalTpv:            t.totalTpv            ?? 0,
    taxaMedia:           t.taxaMedia           ?? 0,
    ticketMedio:         t.ticketMedio         ?? 0,
    totalClientesAtivos: t.totalClientesAtivos ?? 0,
    totalCancelamentos:  cancelRow.rows[0]?.cnt ?? 0,
    hoje: {
      qtdTickets:  h?.qtdTickets  ?? 0,
      volume:      h?.volume      ?? 0,
      receita:     h?.receita     ?? 0,
      tpv:         h?.tpv         ?? 0,
      cartoesHoje: 0,
    },
    historico: historicoRows.rows,
    mixTipo:   mixRows.rows,
    sla:       slaRows.rows,
    membros:   membros.rows.map((m: { userId: number; qtdTickets: number; clientesAtivos: number; volume: number; tpv: number; receita: number; taxaMedia: number }) => ({
      userId:         m.userId,
      nome:           nomeMap.get(m.userId) ?? 'Desconhecido',
      qtdTickets:     m.qtdTickets,
      clientesAtivos: m.clientesAtivos,
      volume:         m.volume,
      tpv:            m.tpv,
      receita:        m.receita,
      taxaMedia:      m.taxaMedia,
    })),
  };
}
