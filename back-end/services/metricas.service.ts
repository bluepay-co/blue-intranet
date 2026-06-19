import { pool } from '../database/pool';
import { consultaPool } from '../database/consulta-pool';
import type {
  MetricasMes, MetricasHoje, MetricasHistorico,
  MetricasVendedor, TopCliente,
  MetricasEquipe, MetricasEquipeMembro,
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
      cl.name                                       AS nome,
      COUNT(*)::int                                 AS "qtdTickets",
      COALESCE(SUM(t.excel_total_bonus), 0)::float  AS tpv,
      COALESCE(SUM(t.excel_total_rate), 0)::float   AS receita
    FROM tickets t
    LEFT JOIN clients cl ON cl.id = t.client_id
    WHERE ${FILTROS_BASE}
      AND ${MANAGER_ID_REMAPPED} = $1
      AND EXTRACT(MONTH FROM t.invoice_payment_date) = $2
      AND EXTRACT(YEAR  FROM t.invoice_payment_date) = $3
    GROUP BY cl.name
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

  const [mesAtual, hoje, historico] = await Promise.all([
    buscarMetricasMes(vendedor.id, mesConsulta, anoConsulta),
    buscarMetricasHoje(vendedor.id),
    buscarHistorico(vendedor.id, 6),
  ]);

  return {
    vendedorId: vendedor.id,
    nome:       vendedor.nome,
    email,
    mesAtual,
    hoje,
    historico,
  };
}

export async function buscarMetricasEquipe(
  role: string,
  mes: number,
  ano: number
): Promise<MetricasEquipe | null> {
  // 1. Busca emails de todos os membros ativos desse cargo no banco da intranet
  const { rows: usuariosIntranet } = await pool.query(
    `SELECT email FROM blue_intranet.usuarios WHERE role = $1 AND ativo = true`,
    [role]
  );

  if (usuariosIntranet.length === 0) return null;

  const emails = usuariosIntranet.map((u: { email: string }) => u.email);

  // 2. Busca os IDs de vendedor no banco de produção para esses emails
  const { rows: vendedoresProd } = await consultaPool.query(
    `SELECT id, name AS nome FROM users WHERE email = ANY($1::text[])`,
    [emails]
  );

  if (vendedoresProd.length === 0) return null;

  const managerIds = vendedoresProd.map((v: { id: number }) => v.id);

  // 3. Agrega métricas totais da equipe no mês atual
  const { rows: totais } = await consultaPool.query(`
    SELECT
      COUNT(*)::int                               AS "totalTickets",
      COUNT(DISTINCT t.client_id)::int            AS "totalClientesAtivos",
      COALESCE(SUM(t.excel_total_rate), 0)::float  AS "totalReceita",
      COALESCE(SUM(t.excel_total_bonus), 0)::float AS "totalTpv"
    FROM tickets t
    LEFT JOIN clients c ON c.id = t.client_id
    WHERE ${FILTROS_BASE}
      AND ${MANAGER_ID_REMAPPED} = ANY($1::int[])
      AND EXTRACT(MONTH FROM t.invoice_payment_date) = $2
      AND EXTRACT(YEAR  FROM t.invoice_payment_date) = $3
  `, [managerIds, mes, ano]);

  // 4. Breakdown por membro (ranking da equipe)
  const { rows: membrosRows } = await consultaPool.query(`
    SELECT
      ${MANAGER_ID_REMAPPED}                        AS "managerId",
      COUNT(*)::int                                  AS "qtdTickets",
      COUNT(DISTINCT t.client_id)::int               AS "clientesAtivos",
      COALESCE(SUM(t.excel_total_rate), 0)::float    AS receita,
      COALESCE(SUM(t.excel_total_bonus), 0)::float   AS tpv
    FROM tickets t
    LEFT JOIN clients c ON c.id = t.client_id
    WHERE ${FILTROS_BASE}
      AND ${MANAGER_ID_REMAPPED} = ANY($1::int[])
      AND EXTRACT(MONTH FROM t.invoice_payment_date) = $2
      AND EXTRACT(YEAR  FROM t.invoice_payment_date) = $3
    GROUP BY ${MANAGER_ID_REMAPPED}
    ORDER BY receita DESC
  `, [managerIds, mes, ano]);

  // 5. Mês anterior para comparativo
  const mesAnteriorNum = mes === 1 ? 12 : mes - 1;
  const anoAnteriorNum = mes === 1 ? ano - 1 : ano;

  const { rows: anterior } = await consultaPool.query(`
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
  `, [managerIds, mesAnteriorNum, anoAnteriorNum]);

  // Mapeia manager ID → nome do vendedor
  const nomeMap = new Map<number, string>(
    vendedoresProd.map((v: { id: number; nome: string }) => [v.id, v.nome])
  );

  const membros: MetricasEquipeMembro[] = membrosRows.map(r => ({
    vendedorId:     r.managerId,
    nome:           nomeMap.get(r.managerId) ?? 'Desconhecido',
    receita:        r.receita,
    tpv:            r.tpv,
    qtdTickets:     r.qtdTickets,
    clientesAtivos: r.clientesAtivos,
  }));

  const t = totais[0];
  const a = anterior[0];

  return {
    equipe:              role,
    mes,
    ano,
    totalReceita:        t.totalReceita,
    totalTpv:            t.totalTpv,
    totalTickets:        t.totalTickets,
    totalClientesAtivos: t.totalClientesAtivos,
    mesAnterior: {
      receita:    a.receita,
      tpv:        a.tpv,
      qtdTickets: a.qtdTickets,
    },
    membros,
  };
}
