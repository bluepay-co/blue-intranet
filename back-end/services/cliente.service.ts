import { consultaPool } from '../database/consulta-pool';
import { FILTROS_BASE, MANAGER_ID_REMAPPED } from './metricas.service';
import { normalizarCnpj, formatarCnpj } from '../utils/cnpj';
import { consultarReceita } from './prospeccao/receita.client';
import { mapearSegmento } from './prospeccao/cnae-segmento';
import type {
  ClienteResumo,
  ClienteDetalhe,
  ClienteMetricas,
  ProspeccaoResultado,
  ClientesPaginados,
  ResumoCarteira,
  FiltrosClientes,
  GrupoEconomico,
} from '../models/cliente.model';

/**
 * Domínio: Clientes de um vendedor (bluepay3_production, somente leitura).
 * Segurança: o escopo é SEMPRE o manager_id do vendedor logado — nenhuma query
 * aceita id de vendedor vindo do request. O detalhe também filtra por manager_id,
 * então um vendedor nunca acessa cliente de outro.
 */

/** Classificação de status por dias desde a última atividade (mesma regra do front). */
const STATUS_CASE = `
  CASE
    WHEN agg."ultimaAtividade" IS NULL THEN 'risco'
    WHEN CURRENT_DATE - agg."ultimaAtividade"::date <= 30 THEN 'ativo'
    WHEN CURRENT_DATE - agg."ultimaAtividade"::date <= 60 THEN 'atencao'
    ELSE 'risco'
  END
`;

const AGG_CLIENTES_CTE = `
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
      AND ${MANAGER_ID_REMAPPED} = ANY($1::int[])
    GROUP BY t.client_id
  )
`;

export interface FiltrosListaClientes {
  busca?: string | undefined;
  uf?: string | undefined;
  cidade?: string | undefined;
  segmento?: string | undefined;
  status?: string | undefined;
  page?: number | undefined;
  limit?: number | undefined;
}

/** Lista paginada dos clientes do vendedor(es), com receita/atividade agregadas. */
export async function listarClientesDoVendedor(
  managerIds: number[],
  filtros: FiltrosListaClientes = {},
): Promise<ClientesPaginados> {
  const termo = filtros.busca?.trim() ? filtros.busca.trim() : null;
  const uf = filtros.uf?.trim() ? filtros.uf.trim() : null;
  const cidade = filtros.cidade?.trim() ? filtros.cidade.trim() : null;
  const segmento = filtros.segmento?.trim() ? filtros.segmento.trim() : null;
  const status = filtros.status?.trim() ? filtros.status.trim() : null;
  const page = Math.max(1, Math.trunc(filtros.page ?? 1));
  const limit = Math.min(100, Math.max(1, Math.trunc(filtros.limit ?? 20)));
  const offset = (page - 1) * limit;

  const { rows } = await consultaPool.query(`
    ${AGG_CLIENTES_CTE},
    ultimo_pedido AS (
      SELECT DISTINCT ON (t.client_id)
        t.client_id,
        t.excel_total_rate::float AS "ultimaReceita"
      FROM tickets t
      JOIN clients c ON c.id = t.client_id
      WHERE ${FILTROS_BASE}
        AND ${MANAGER_ID_REMAPPED} = ANY($1::int[])
      ORDER BY t.client_id, t.invoice_payment_date DESC
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
      agg."ultimaAtividade"          AS "ultimaAtividade",
      COALESCE(up."ultimaReceita", 0)::float AS "ultimaReceita",
      vend.name                      AS "vendedorNome",
      ${MANAGER_ID_REMAPPED}         AS "vendedorId",
      COUNT(*) OVER()::int           AS "totalCount"
    FROM clients c
    LEFT JOIN agg      ON agg.client_id = c.id
    LEFT JOIN ultimo_pedido up ON up.client_id = c.id
    LEFT JOIN segments s ON s.id = c.segment_id
    LEFT JOIN users vend ON vend.id = ${MANAGER_ID_REMAPPED}
    WHERE ${MANAGER_ID_REMAPPED} = ANY($1::int[])
      AND (
        $2::text IS NULL
        OR c.name ILIKE '%' || $2 || '%'
        OR c.cnpj ILIKE '%' || $2 || '%'
        OR c.commercial_name ILIKE '%' || $2 || '%'
      )
      AND ($3::text IS NULL OR c.address_uf = $3)
      AND ($4::text IS NULL OR c.address_city = $4)
      AND ($5::text IS NULL OR s.name = $5)
      AND ($6::text IS NULL OR ${STATUS_CASE} = $6)
    ORDER BY COALESCE(agg.receita, 0) DESC, c.name ASC
    LIMIT $7 OFFSET $8
  `, [managerIds, termo, uf, cidade, segmento, status, limit, offset]);

  const total = rows[0]?.totalCount ?? 0;
  const clientes = rows.map(({ totalCount, ...resto }) => resto) as ClienteResumo[];
  return { clientes, total, page, limit };
}

/** Resumo agregado da carteira inteira do(s) vendedor(es) (independe de filtros/página). */
export async function buscarResumoCarteira(managerIds: number[]): Promise<ResumoCarteira> {
  const { rows } = await consultaPool.query(`
    ${AGG_CLIENTES_CTE}
    SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE ${STATUS_CASE} = 'ativo')::int AS ativos,
      COUNT(*) FILTER (WHERE ${STATUS_CASE} = 'risco')::int AS risco,
      COALESCE(SUM(COALESCE(agg.receita, 0)), 0)::float AS receita
    FROM clients c
    LEFT JOIN agg ON agg.client_id = c.id
    WHERE ${MANAGER_ID_REMAPPED} = ANY($1::int[])
  `, [managerIds]);

  const r = rows[0] ?? { total: 0, ativos: 0, risco: 0, receita: 0 };
  return { total: r.total, ativos: r.ativos, risco: r.risco, receita: r.receita };
}

/** Opções distintas de UF/cidade/segmento entre os clientes do(s) vendedor(es) (para os filtros). */
export async function buscarFiltrosClientes(managerIds: number[]): Promise<FiltrosClientes> {
  const [ufs, cidades, segmentos] = await Promise.all([
    consultaPool.query(`
      SELECT DISTINCT c.address_uf AS uf FROM clients c
      WHERE ${MANAGER_ID_REMAPPED} = ANY($1::int[]) AND c.address_uf IS NOT NULL
      ORDER BY uf
    `, [managerIds]),
    consultaPool.query(`
      SELECT DISTINCT c.address_city AS cidade, c.address_uf AS uf FROM clients c
      WHERE ${MANAGER_ID_REMAPPED} = ANY($1::int[]) AND c.address_city IS NOT NULL
      ORDER BY cidade
    `, [managerIds]),
    consultaPool.query(`
      SELECT DISTINCT s.name AS segmento FROM clients c
      JOIN segments s ON s.id = c.segment_id
      WHERE ${MANAGER_ID_REMAPPED} = ANY($1::int[]) AND s.name IS NOT NULL
      ORDER BY segmento
    `, [managerIds]),
  ]);

  return {
    ufs: ufs.rows.map((r: { uf: string }) => r.uf),
    cidades: cidades.rows.map((r: { cidade: string; uf: string | null }) => ({ cidade: r.cidade, uf: r.uf })),
    segmentos: segmentos.rows.map((r: { segmento: string }) => r.segmento),
  };
}

interface ClienteGrupoRow extends ClienteResumo {
  grupoId: number;
  grupoNome: string;
}

/**
 * Agrupa os clientes da carteira do vendedor pelo grupo econômico oficial
 * (`clients.economic_group_id` → `economic_groups`, cadastro real mantido no
 * banco de produção — não é uma heurística). Só retorna grupos com 2+
 * clientes na carteira do vendedor (um cliente isolado não forma "grupo").
 */
export async function buscarGruposEconomicos(managerId: number): Promise<GrupoEconomico[]> {
  const { rows } = await consultaPool.query(`
    ${AGG_CLIENTES_CTE}
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
      agg."ultimaAtividade"          AS "ultimaAtividade",
      c.economic_group_id::int       AS "grupoId",
      eg.name                        AS "grupoNome"
    FROM clients c
    LEFT JOIN agg      ON agg.client_id = c.id
    LEFT JOIN segments s ON s.id = c.segment_id
    JOIN economic_groups eg ON eg.id = c.economic_group_id
    WHERE ${MANAGER_ID_REMAPPED} = ANY($1::int[])
  `, [[managerId]]);

  const porGrupo = new Map<number, { nome: string; clientes: ClienteResumo[] }>();
  for (const r of rows as ClienteGrupoRow[]) {
    const { grupoId, grupoNome, ...cliente } = r;
    const entrada = porGrupo.get(grupoId) ?? { nome: grupoNome, clientes: [] };
    entrada.clientes.push(cliente);
    porGrupo.set(grupoId, entrada);
  }

  const grupos: GrupoEconomico[] = [];
  for (const [id, { nome, clientes }] of porGrupo) {
    if (clientes.length < 2) continue;
    clientes.sort((a, b) => b.receita - a.receita);
    grupos.push({
      id,
      nome,
      clientes,
      receitaTotal: clientes.reduce((acc, c) => acc + c.receita, 0),
      tpvTotal: clientes.reduce((acc, c) => acc + c.tpv, 0),
      qtdClientes: clientes.length,
    });
  }

  grupos.sort((a, b) => b.receitaTotal - a.receitaTotal);
  return grupos;
}

/** Ficha do cliente — retorna null se o cliente não pertence a nenhum dos vendedores. */
export async function buscarClienteDoVendedor(
  managerIds: number[],
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
    WHERE c.id = $1 AND ${MANAGER_ID_REMAPPED} = ANY($2::int[])
    LIMIT 1
  `, [clienteId, managerIds]);

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

/**
 * Métricas agregadas do cliente (só chamar após confirmar a propriedade).
 * `mes`/`ano` são opcionais: quando ausentes, os campos "do mês" e o YoY usam
 * o mês/ano corrente (comportamento da aba Geral); quando informados, ficam
 * escopados a esse período (usado pela aba Mês da ficha do cliente).
 */
export async function buscarMetricasCliente(
  clienteId: number,
  mes?: number,
  ano?: number,
): Promise<ClienteMetricas> {
  const agora  = new Date();
  const mesRef = mes ?? (agora.getMonth() + 1);
  const anoRef = ano ?? agora.getFullYear();

  const [totais, mesAgg, evolucao, comparativo] = await Promise.all([
    consultaPool.query(`
      SELECT
        COUNT(*)::int                                AS "qtdTickets",
        COALESCE(SUM(t.excel_total_rate), 0)::float   AS "receitaTotal",
        COALESCE(SUM(t.excel_total_bonus), 0)::float  AS "tpvTotal",
        COALESCE(AVG(t.excel_rate) * 100, 0)::float   AS "taxaMedia",
        COALESCE(AVG(t.excel_total_bonus), 0)::float  AS "ticketMedio",
        MIN(t.invoice_payment_date) AS "primeiroTicket",
        MAX(t.invoice_payment_date) AS "ultimoTicket"
      FROM tickets t
      WHERE ${FILTROS_BASE} AND t.client_id = $1
    `, [clienteId]),
    consultaPool.query(`
      SELECT
        COUNT(*)::int                                AS "qtdTicketsMes",
        COALESCE(SUM(t.excel_total_rate), 0)::float   AS "receitaMes",
        COALESCE(SUM(t.excel_total_bonus), 0)::float  AS "tpvMes",
        COALESCE(AVG(t.excel_rate) * 100, 0)::float   AS "taxaMediaMes",
        COALESCE(AVG(t.excel_total_bonus), 0)::float  AS "ticketMedioMes"
      FROM tickets t
      WHERE ${FILTROS_BASE} AND t.client_id = $1
        AND EXTRACT(YEAR  FROM t.invoice_payment_date) = $2
        AND EXTRACT(MONTH FROM t.invoice_payment_date) = $3
    `, [clienteId, anoRef, mesRef]),
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
    `, [clienteId, anoRef, anoRef - 1]),
  ]);

  // Monta o comparativo Ano × Ano (12 meses de cada ano) e a receita do ano de referência.
  const mAtual = new Array<number>(12).fill(0);
  const mAnterior = new Array<number>(12).fill(0);
  for (const e of comparativo.rows as { ano: number; mes: number; receita: number }[]) {
    if (e.ano === anoRef) mAtual[e.mes - 1] = e.receita;
    else if (e.ano === anoRef - 1) mAnterior[e.mes - 1] = e.receita;
  }
  const receitaAno = mAtual.reduce((acc, v) => acc + v, 0);

  const r  = totais.rows[0];
  const rm = mesAgg.rows[0];
  return {
    receitaTotal:   r?.receitaTotal ?? 0,
    tpvTotal:       r?.tpvTotal ?? 0,
    qtdTickets:     r?.qtdTickets ?? 0,
    ticketMedio:    r?.ticketMedio ?? 0,
    taxaMedia:      r?.taxaMedia ?? 0,
    receitaAno,
    receitaMes:     rm?.receitaMes ?? 0,
    tpvMes:         rm?.tpvMes ?? 0,
    qtdTicketsMes:  rm?.qtdTicketsMes ?? 0,
    ticketMedioMes: rm?.ticketMedioMes ?? 0,
    taxaMediaMes:   rm?.taxaMediaMes ?? 0,
    primeiroTicket: r?.primeiroTicket ?? null,
    ultimoTicket:   r?.ultimoTicket ?? null,
    evolucao:       evolucao.rows.map((e: { ano: number; mes: number; receita: number }) => ({
      mes: e.mes, ano: e.ano, receita: e.receita,
    })),
    yoy: {
      anoAtual: anoRef,
      anoAnterior: anoRef - 1,
      meses: Array.from({ length: 12 }, (_, i) => ({
        mes: i + 1, atual: mAtual[i] ?? 0, anterior: mAnterior[i] ?? 0,
      })),
    },
  };
}

interface ClienteCnpjMatch {
  id: number;
  commercial_name: string | null;
  name: string | null;
  mgr: number | null;
}

/**
 * Localiza clientes por CNPJ na base de produção, sem travar a request.
 *
 * A coluna `clients.cnpj` não tem formato garantido, então tentamos primeiro
 * uma igualdade exata contra os dois formatos mais comuns (só dígitos e
 * mascarado) — isso usa índice quando existe e é instantâneo. Só se nada casar
 * caímos no `regexp_replace` (varredura), e ainda assim sob `statement_timeout`
 * para nunca pendurar a conexão indefinidamente.
 */
async function buscarClientesPorCnpj(cnpjLimpo: string): Promise<ClienteCnpjMatch[]> {
  const formatos = [cnpjLimpo, formatarCnpj(cnpjLimpo)];
  const cliente = await consultaPool.connect();
  try {
    // Transação só para limitar o tempo via SET LOCAL (auto-reseta no COMMIT;
    // não contamina a conexão devolvida ao pool). Evita loading infinito.
    await cliente.query('BEGIN');
    await cliente.query('SET LOCAL statement_timeout = 8000');

    // 1) Match exato (rápido, index-friendly) contra formatos conhecidos.
    const exato = await cliente.query<ClienteCnpjMatch>(
      `SELECT c.id::int AS id, c.commercial_name, c.name, ${MANAGER_ID_REMAPPED} AS mgr
         FROM clients c
        WHERE c.cnpj = ANY($1::text[])`,
      [formatos],
    );
    if (exato.rows.length > 0) {
      await cliente.query('COMMIT');
      return exato.rows;
    }

    // 2) Rede de segurança: normaliza no banco (cobre formatos incomuns).
    const fuzzy = await cliente.query<ClienteCnpjMatch>(
      `SELECT c.id::int AS id, c.commercial_name, c.name, ${MANAGER_ID_REMAPPED} AS mgr
         FROM clients c
        WHERE regexp_replace(COALESCE(c.cnpj, ''), '\\D', '', 'g') = $1`,
      [cnpjLimpo],
    );
    await cliente.query('COMMIT');
    return fuzzy.rows;
  } catch (err) {
    await cliente.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    cliente.release();
  }
}

/**
 * Prospecção por CNPJ. Decide entre três status, sem vazar carteira alheia:
 * 1. Já é cliente do vendedor logado  → MEU_CLIENTE (id da ficha existente).
 * 2. É cliente de outro manager        → CLIENTE_DE_OUTRO (só nome comercial).
 * 3. Não é cliente de ninguém          → DISPONIVEL (dados públicos da Receita).
 *
 * IMPORTANTE — `buscarClientesPorCnpj` NÃO filtra por manager_id: ela busca o
 * CNPJ contra TODA a base de clientes (`clients`), de QUALQUER vendedor da
 * empresa. Isso é proposital e não pode ser "otimizado" para escopar só o
 * vendedor logado: o objetivo da checagem é impedir que um CNPJ que já é
 * cliente de outro vendedor (ex.: um cliente do André Camargo) apareça como
 * "disponível" para outra pessoa prospectar, evitando conflito/canibalização
 * de carteira dentro da empresa. Só depois de confirmar que o CNPJ não
 * pertence a NINGUÉM na empresa é que caímos na consulta à Receita Federal.
 *
 * Segurança: o `managerId` do vendedor logado só é usado para decidir se o
 * match encontrado é MEU_CLIENTE ou CLIENTE_DE_OUTRO — nunca para restringir
 * a busca em si. O CNPJ é normalizado nos dois lados (a coluna `clients.cnpj`
 * pode ter máscara).
 */
export async function prospectarCnpj(
  managerId: number,
  cnpj: string,
): Promise<ProspeccaoResultado> {
  const cnpjLimpo = normalizarCnpj(cnpj);
  const rows = await buscarClientesPorCnpj(cnpjLimpo);

  if (rows.length > 0) {
    const meu = rows.find((r) => r.mgr === managerId);
    if (meu) {
      return { status: 'MEU_CLIENTE', clienteId: meu.id };
    }
    console.info(`[prospeccao] CNPJ ${cnpjLimpo} bloqueado para manager ${managerId}: já é cliente do manager ${rows[0]!.mgr}.`);
    return { status: 'CLIENTE_DE_OUTRO', nomeComercial: rows[0]!.commercial_name ?? rows[0]!.name };
  }

  // Disponível para prospecção → dados públicos da Receita.
  const receita = await consultarReceita(cnpjLimpo);
  const segmento = mapearSegmento(receita?.cnaePrincipal?.codigo ?? null);

  if (!receita) {
    return { status: 'DISPONIVEL', cnpj: cnpjLimpo, segmento, receitaIndisponivel: true };
  }

  return {
    status: 'DISPONIVEL',
    cnpj: cnpjLimpo,
    segmento,
    receitaIndisponivel: false,
    ...receita,
  };
}
