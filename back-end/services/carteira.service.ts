import { consultaPool } from '../database/consulta-pool';
import { FILTROS_BASE, MANAGER_ID_REMAPPED } from './metricas.service';
import type {
  RiscoCliente, RadarResposta, CategoriaRisco,
  CrossSellCliente, CrossSellResposta,
} from '../models/carteira.model';

/**
 * Inteligência de carteira (produção, somente leitura, escopo por manager_id).
 * Limiares em constantes nomeadas — fáceis de calibrar com o time comercial.
 */

// ── Radar de Risco ────────────────────────────────────────────────────────────
const JANELA_DIAS = 90;            // tamanho de cada janela (recente vs anterior)
const FATOR_QUEDA = 0.60;          // recente < 60% do anterior  → queda >40%
const FATOR_ATENCAO = 0.80;        // recente < 80% do anterior  → queda >20% (até 40%)

/** Clientes do vendedor que pararam ou estão em queda de receita. */
export async function radarDeRisco(managerId: number): Promise<RadarResposta> {
  const { rows } = await consultaPool.query(`
    WITH base AS (
      SELECT
        c.id, c.name, c.cnpj, c.address_city, c.address_uf, c.segment_id,
        COALESCE(SUM(t.excel_total_rate) FILTER (
          WHERE t.invoice_payment_date >= NOW() - INTERVAL '${JANELA_DIAS} days'
        ), 0)::float AS recente,
        COALESCE(SUM(t.excel_total_rate) FILTER (
          WHERE t.invoice_payment_date >= NOW() - INTERVAL '${JANELA_DIAS * 2} days'
            AND t.invoice_payment_date <  NOW() - INTERVAL '${JANELA_DIAS} days'
        ), 0)::float AS anterior,
        MAX(t.invoice_payment_date) AS ultima
      FROM clients c
      JOIN tickets t ON t.client_id = c.id
      WHERE ${FILTROS_BASE}
        AND ${MANAGER_ID_REMAPPED} = $1
      GROUP BY c.id, c.name, c.cnpj, c.address_city, c.address_uf, c.segment_id
    )
    SELECT
      b.id::int        AS id,
      b.name           AS nome,
      b.cnpj,
      b.address_city   AS cidade,
      b.address_uf     AS uf,
      s.name           AS segmento,
      b.recente        AS "receitaRecente",
      b.anterior       AS "receitaAnterior",
      b.ultima         AS ultima
    FROM base b
    LEFT JOIN segments s ON s.id = b.segment_id
    WHERE b.anterior > 0
      AND b.recente < b.anterior * ${FATOR_ATENCAO}
    ORDER BY b.anterior DESC
  `, [managerId]);

  const agora = Date.now();
  const clientes: RiscoCliente[] = rows.map((r: {
    id: number; nome: string; cnpj: string | null; cidade: string | null; uf: string | null;
    segmento: string | null; receitaRecente: number; receitaAnterior: number; ultima: Date | null;
  }) => {
    let categoria: CategoriaRisco;
    if (r.receitaRecente === 0) categoria = 'PAROU';
    else if (r.receitaRecente < r.receitaAnterior * FATOR_QUEDA) categoria = 'QUEDA';
    else categoria = 'ATENCAO';

    return {
      id: r.id,
      nome: r.nome,
      cnpj: r.cnpj,
      cidade: r.cidade,
      uf: r.uf,
      segmento: r.segmento,
      receitaRecente: r.receitaRecente,
      receitaAnterior: r.receitaAnterior,
      variacaoPct: r.receitaAnterior > 0
        ? Math.round(((r.receitaRecente - r.receitaAnterior) / r.receitaAnterior) * 1000) / 10
        : null,
      diasSemTransacao: r.ultima
        ? Math.max(0, Math.floor((agora - new Date(r.ultima).getTime()) / 86400000))
        : null,
      valorEmRisco: r.receitaAnterior,
      categoria,
    };
  });

  return {
    resumo: {
      total: clientes.length,
      receitaEmRisco: clientes.reduce((s, c) => s + c.valorEmRisco, 0),
      parou:   clientes.filter((c) => c.categoria === 'PAROU').length,
      queda:   clientes.filter((c) => c.categoria === 'QUEDA').length,
      atencao: clientes.filter((c) => c.categoria === 'ATENCAO').length,
    },
    clientes,
  };
}

// ── Oportunidades de Cross-sell ───────────────────────────────────────────────
// IMPORTANTE: usa o COMPORTAMENTO REAL de transação (kind dos tickets), NÃO os
// flags product_* de clients — esses flags estão desatualizados/desalinhados com
// a realidade (ex.: só 2 clientes com product_creditcard, mas 75 transacionam em
// cartão). "Já usa" = transacionou naquele tipo; "pode ativar" = nunca transacionou.
const DIAS_RECEITA_12M = 365;

/** Clientes do vendedor que transacionam em só 1–2 dos 3 tipos (potencial real). */
export async function oportunidadesCrossSell(managerId: number): Promise<CrossSellResposta> {
  const { rows } = await consultaPool.query(`
    WITH uso AS (
      SELECT
        t.client_id,
        bool_or(t.kind = 'bank_deposit')                         AS usa_bancario,
        bool_or(t.kind = 'virtual_deposit')                      AS usa_virtual,
        bool_or(t.kind IN ('card_deposit', 'card_registration')) AS usa_cartao,
        COALESCE(SUM(t.excel_total_rate) FILTER (
          WHERE t.invoice_payment_date >= NOW() - INTERVAL '${DIAS_RECEITA_12M} days'
        ), 0)::float AS receita12m,
        COUNT(*) FILTER (
          WHERE t.invoice_payment_date >= NOW() - INTERVAL '${DIAS_RECEITA_12M} days'
        )::int AS qtd12m,
        MAX(t.invoice_payment_date) AS ultima
      FROM tickets t
      JOIN clients c ON c.id = t.client_id
      WHERE ${FILTROS_BASE}
        AND ${MANAGER_ID_REMAPPED} = $1
      GROUP BY t.client_id
    )
    SELECT
      c.id::int        AS id,
      c.name           AS nome,
      c.cnpj,
      c.address_city   AS cidade,
      c.address_uf     AS uf,
      s.name           AS segmento,
      u.usa_virtual, u.usa_cartao, u.usa_bancario,
      u.receita12m     AS "receita12m",
      u.qtd12m         AS "qtdTickets",
      u.ultima         AS "ultimaAtividade"
    FROM uso u
    JOIN clients c      ON c.id = u.client_id
    LEFT JOIN segments s ON s.id = c.segment_id
    WHERE (u.usa_virtual::int + u.usa_cartao::int + u.usa_bancario::int) BETWEEN 1 AND 2
    ORDER BY u.receita12m DESC, c.name ASC
  `, [managerId]);

  const clientes: CrossSellCliente[] = rows.map((r: Record<string, unknown>) => {
    const ativos: string[] = [];
    const faltantes: string[] = [];
    const put = (usa: unknown, label: string) => (usa ? ativos : faltantes).push(label);
    put(r.usa_virtual,  'Virtual');
    put(r.usa_cartao,   'Cartão');
    put(r.usa_bancario, 'Bancário');
    return {
      id: r.id as number,
      nome: r.nome as string,
      cnpj: (r.cnpj as string) ?? null,
      cidade: (r.cidade as string) ?? null,
      uf: (r.uf as string) ?? null,
      segmento: (r.segmento as string) ?? null,
      receita12m: r.receita12m as number,
      qtdTickets: r.qtdTickets as number,
      ultimaAtividade: (r.ultimaAtividade as string) ?? null,
      produtosAtivos: ativos,
      produtosFaltantes: faltantes,
    };
  });

  return {
    resumo: {
      total: clientes.length,
      faltaVirtual:  clientes.filter((c) => c.produtosFaltantes.includes('Virtual')).length,
      faltaCartao:   clientes.filter((c) => c.produtosFaltantes.includes('Cartão')).length,
      faltaBancario: clientes.filter((c) => c.produtosFaltantes.includes('Bancário')).length,
      receitaPotencial: clientes.reduce((s, c) => s + c.receita12m, 0),
    },
    clientes,
  };
}
