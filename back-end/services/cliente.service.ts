import { consultaPool } from '../database/consulta-pool';
import { FILTROS_BASE, MANAGER_ID_REMAPPED } from './metricas.service';
import type { ClienteResumo, ClienteDetalhe, ClienteMetricas } from '../models/cliente.model';

/**
 * Domínio: Clientes de um vendedor (bluepay3_production, somente leitura).
 * Segurança: o escopo é SEMPRE o manager_id do vendedor logado — nenhuma query
 * aceita id de vendedor vindo do request. O detalhe também filtra por manager_id,
 * então um vendedor nunca acessa cliente de outro.
 */

/** Lista todos os clientes do vendedor, com receita/atividade agregadas. */
export async function listarClientesDoVendedor(
  managerId: number,
  busca?: string,
): Promise<ClienteResumo[]> {
  const termo = busca?.trim() ? busca.trim() : null;

  const { rows } = await consultaPool.query(`
    WITH agg AS (
      SELECT
        t.client_id,
        COALESCE(SUM(t.excel_total_rate), 0)::float  AS receita,
        COALESCE(SUM(t.excel_total_bonus), 0)::float AS tpv,
        COUNT(*)::int                                AS "qtdTickets",
        COALESCE(AVG(t.excel_rate) * 100, 0)::float  AS "taxaMedia",
        MAX(t.invoice_payment_date)                  AS "ultimaAtividade"
      FROM tickets t
      JOIN clients c ON c.id = t.client_id
      WHERE ${FILTROS_BASE}
        AND ${MANAGER_ID_REMAPPED} = $1
      GROUP BY t.client_id
    )
    SELECT
      c.id::int                      AS id,
      c.name                         AS nome,
      c.commercial_name              AS "nomeComercial",
      c.cnpj,
      c.address_city                 AS cidade,
      c.address_uf                   AS uf,
      s.name                         AS segmento,
      COALESCE(agg.receita, 0)::float     AS receita,
      COALESCE(agg.tpv, 0)::float         AS tpv,
      COALESCE(agg."qtdTickets", 0)::int  AS "qtdTickets",
      COALESCE(agg."taxaMedia", 0)::float AS "taxaMedia",
      agg."ultimaAtividade"          AS "ultimaAtividade"
    FROM clients c
    LEFT JOIN agg      ON agg.client_id = c.id
    LEFT JOIN segments s ON s.id = c.segment_id
    WHERE ${MANAGER_ID_REMAPPED} = $1
      AND (
        $2::text IS NULL
        OR c.name ILIKE '%' || $2 || '%'
        OR c.cnpj ILIKE '%' || $2 || '%'
        OR c.commercial_name ILIKE '%' || $2 || '%'
      )
    ORDER BY COALESCE(agg.receita, 0) DESC, c.name ASC
  `, [managerId, termo]);

  return rows as ClienteResumo[];
}

/** Ficha do cliente — retorna null se o cliente não pertence ao vendedor. */
export async function buscarClienteDoVendedor(
  managerId: number,
  clienteId: number,
): Promise<ClienteDetalhe | null> {
  const { rows } = await consultaPool.query(`
    SELECT
      c.id::int AS id, c.name, c.commercial_name, c.cnpj,
      c.state_enrolment, c.municipal_enrolment,
      c.contact, c.phone, c.email, c.email_nf,
      c.address_street, c.address_number, c.address_complement,
      c.address_district, c.address_city, c.address_uf, c.address_zipcode,
      s.name AS segmento,
      c.product_virtual, c.product_creditcard, c.product_bank,
      c.created_at
    FROM clients c
    LEFT JOIN segments s ON s.id = c.segment_id
    WHERE c.id = $1 AND ${MANAGER_ID_REMAPPED} = $2
    LIMIT 1
  `, [clienteId, managerId]);

  const r = rows[0];
  if (!r) return null;

  return {
    id: r.id,
    nome: r.name,
    nomeComercial: r.commercial_name,
    cnpj: r.cnpj,
    inscricaoEstadual: r.state_enrolment,
    inscricaoMunicipal: r.municipal_enrolment,
    contato: r.contact,
    telefone: r.phone,
    email: r.email,
    emailNf: r.email_nf,
    endereco: {
      logradouro:  r.address_street,
      numero:      r.address_number,
      complemento: r.address_complement,
      bairro:      r.address_district,
      cidade:      r.address_city,
      uf:          r.address_uf,
      cep:         r.address_zipcode,
    },
    segmento: r.segmento,
    produtos: {
      virtual:  !!r.product_virtual,
      cartao:   !!r.product_creditcard,
      bancario: !!r.product_bank,
    },
    criadoEm: r.created_at,
  };
}

/** Métricas agregadas do cliente (só chamar após confirmar a propriedade). */
export async function buscarMetricasCliente(clienteId: number): Promise<ClienteMetricas> {
  const anoAtual = new Date().getFullYear();

  const [totais, evolucao, comparativo] = await Promise.all([
    consultaPool.query(`
      SELECT
        COUNT(*)::int                                AS "qtdTickets",
        COALESCE(SUM(t.excel_total_rate), 0)::float   AS "receitaTotal",
        COALESCE(SUM(t.excel_total_bonus), 0)::float  AS "tpvTotal",
        COALESCE(AVG(t.excel_rate) * 100, 0)::float   AS "taxaMedia",
        COALESCE(AVG(t.excel_total_bonus), 0)::float  AS "ticketMedio",
        COALESCE(SUM(t.excel_total_rate) FILTER (
          WHERE EXTRACT(YEAR FROM t.invoice_payment_date) = EXTRACT(YEAR FROM NOW())
        ), 0)::float AS "receitaAno",
        COALESCE(SUM(t.excel_total_rate) FILTER (
          WHERE EXTRACT(YEAR FROM t.invoice_payment_date)  = EXTRACT(YEAR FROM NOW())
            AND EXTRACT(MONTH FROM t.invoice_payment_date) = EXTRACT(MONTH FROM NOW())
        ), 0)::float AS "receitaMes",
        MIN(t.invoice_payment_date) AS "primeiroTicket",
        MAX(t.invoice_payment_date) AS "ultimoTicket"
      FROM tickets t
      WHERE ${FILTROS_BASE} AND t.client_id = $1
    `, [clienteId]),
    consultaPool.query(`
      SELECT
        EXTRACT(YEAR  FROM t.invoice_payment_date)::int AS ano,
        EXTRACT(MONTH FROM t.invoice_payment_date)::int AS mes,
        COALESCE(SUM(t.excel_total_rate), 0)::float     AS receita
      FROM tickets t
      WHERE ${FILTROS_BASE}
        AND t.client_id = $1
        AND t.invoice_payment_date >= DATE_TRUNC('month', NOW()) - INTERVAL '11 months'
      GROUP BY ano, mes
      ORDER BY ano, mes
    `, [clienteId]),
    consultaPool.query(`
      SELECT
        EXTRACT(YEAR  FROM t.invoice_payment_date)::int AS ano,
        EXTRACT(MONTH FROM t.invoice_payment_date)::int AS mes,
        COALESCE(SUM(t.excel_total_rate), 0)::float     AS receita
      FROM tickets t
      WHERE ${FILTROS_BASE}
        AND t.client_id = $1
        AND EXTRACT(YEAR FROM t.invoice_payment_date) IN ($2, $3)
      GROUP BY ano, mes
    `, [clienteId, anoAtual, anoAtual - 1]),
  ]);

  // Monta o comparativo Ano × Ano (12 meses de cada ano).
  const mAtual = new Array<number>(12).fill(0);
  const mAnterior = new Array<number>(12).fill(0);
  for (const e of comparativo.rows as { ano: number; mes: number; receita: number }[]) {
    if (e.ano === anoAtual) mAtual[e.mes - 1] = e.receita;
    else if (e.ano === anoAtual - 1) mAnterior[e.mes - 1] = e.receita;
  }

  const r = totais.rows[0];
  return {
    receitaTotal:   r?.receitaTotal ?? 0,
    tpvTotal:       r?.tpvTotal ?? 0,
    qtdTickets:     r?.qtdTickets ?? 0,
    ticketMedio:    r?.ticketMedio ?? 0,
    taxaMedia:      r?.taxaMedia ?? 0,
    receitaAno:     r?.receitaAno ?? 0,
    receitaMes:     r?.receitaMes ?? 0,
    primeiroTicket: r?.primeiroTicket ?? null,
    ultimoTicket:   r?.ultimoTicket ?? null,
    evolucao:       evolucao.rows.map((e: { ano: number; mes: number; receita: number }) => ({
      mes: e.mes, ano: e.ano, receita: e.receita,
    })),
    yoy: {
      anoAtual,
      anoAnterior: anoAtual - 1,
      meses: Array.from({ length: 12 }, (_, i) => ({
        mes: i + 1, atual: mAtual[i] ?? 0, anterior: mAnterior[i] ?? 0,
      })),
    },
  };
}
