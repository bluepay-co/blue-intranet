import { pool } from '../database/pool';
import { AppError } from '../utils/app-error';
import { getMetaSdr, getMultiplicador } from '../data/metas-prevendas';

// ── Tipos ────────────────────────────────────────────────────────────────────

const STATUS_VALIDOS = new Set(['AGENDADA', 'REALIZADA', 'QUALIFICADA']);

export interface NovaReuniao {
  empresa: string;
  vendedorNome: string | null;
  segmento: string | null;
  ano: number;
  mes: number;
  semana: number;
  status: string;
}

export interface LigacoesSemana {
  ano: number;
  mes: number;
  semana: number;
  quantidade: number;
}

export interface ResumoSdr {
  sdrId: number;
  nome: string;
  mes: number;
  ano: number;
  agendadas: number;
  realizadas: number;
  qualificadas: number;
  ligacoes: number;
  meta: number;
  pctMeta: number;        // realizadas / meta * 100
  multiplicador: number;  // fator de bônus (ex.: 1.1)
  faixaMulti: string;     // rótulo da faixa (ex.: '100-109,99%')
  faltaParaBater: number; // reuniões faltando para atingir a meta (>= 0)
  taxaConversao: number;  // qualificadas / agendadas * 100
}

export interface ResumoEquipe {
  mes: number;
  ano: number;
  sdrs: ResumoSdr[];
  totalAgendadas: number;
  totalRealizadas: number;
  totalQualificadas: number;
  totalLigacoes: number;
  porVendedor: { rotulo: string; total: number }[];
  porSegmento: { rotulo: string; total: number }[];
}

// ── Validações ───────────────────────────────────────────────────────────────

function validarPeriodo(ano: unknown, mes: unknown, semana: unknown) {
  const a = Number(ano);
  const m = Number(mes);
  const s = Number(semana);
  if (!Number.isInteger(a) || a < 2000 || a > 2100) throw new AppError('Ano inválido.', 400);
  if (!Number.isInteger(m) || m < 1 || m > 12) throw new AppError('Mês inválido.', 400);
  if (!Number.isInteger(s) || s < 1 || s > 6) throw new AppError('Semana inválida (1 a 6).', 400);
  return { a, m, s };
}

// ── Escrita (lançamento) ─────────────────────────────────────────────────────

/** Registra uma reunião no log da SDR. */
export async function registrarReuniao(sdrId: number, dados: NovaReuniao): Promise<{ id: number }> {
  const empresa = dados.empresa?.trim() ?? '';
  if (!empresa) throw new AppError('Empresa é obrigatória.', 400);
  if (empresa.length > 200) throw new AppError('Empresa excede 200 caracteres.', 400);
  if (!STATUS_VALIDOS.has(dados.status)) throw new AppError('Status de reunião inválido.', 400);
  const { a, m, s } = validarPeriodo(dados.ano, dados.mes, dados.semana);

  const vendedor = dados.vendedorNome?.trim() || null;
  const segmento = dados.segmento?.trim() || null;

  const { rows } = await pool.query<{ id: number }>(
    `INSERT INTO pv_reuniao
       (sdr_id, empresa, vendedor_nome, segmento, ano, mes, semana, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING id`,
    [sdrId, empresa, vendedor, segmento, a, m, s, dados.status],
  );
  if (!rows[0]) throw new AppError('Falha ao registrar a reunião.', 500);
  return rows[0];
}

/** Define (upsert) o total de ligações de uma SDR numa semana. */
export async function definirLigacoes(sdrId: number, dados: LigacoesSemana): Promise<void> {
  const { a, m, s } = validarPeriodo(dados.ano, dados.mes, dados.semana);
  const qtd = Number(dados.quantidade);
  if (!Number.isInteger(qtd) || qtd < 0) throw new AppError('Quantidade de ligações inválida.', 400);

  await pool.query(
    `INSERT INTO pv_ligacao_semana (sdr_id, ano, mes, semana, quantidade, atualizado_em)
     VALUES ($1, $2, $3, $4, $5, now())
     ON CONFLICT (sdr_id, ano, mes, semana)
     DO UPDATE SET quantidade = EXCLUDED.quantidade, atualizado_em = now()`,
    [sdrId, a, m, s, qtd],
  );
}

// ── Leitura (KPIs) ───────────────────────────────────────────────────────────

/** Monta o resumo de KPIs de uma SDR num mês (contadores + meta + conversão). */
export async function resumoDaSdr(sdrId: number, nome: string, mes: number, ano: number): Promise<ResumoSdr> {
  const [contagens, ligacoes] = await Promise.all([
    pool.query<{ status: string; n: number }>(
      `SELECT status, COUNT(*)::int AS n
         FROM pv_reuniao
        WHERE sdr_id = $1 AND ano = $2 AND mes = $3
        GROUP BY status`,
      [sdrId, ano, mes],
    ),
    pool.query<{ total: number }>(
      `SELECT COALESCE(SUM(quantidade), 0)::int AS total
         FROM pv_ligacao_semana
        WHERE sdr_id = $1 AND ano = $2 AND mes = $3`,
      [sdrId, ano, mes],
    ),
  ]);

  let agendadas = 0, realizadas = 0, qualificadas = 0;
  for (const r of contagens.rows) {
    if (r.status === 'AGENDADA') agendadas = r.n;
    else if (r.status === 'REALIZADA') realizadas = r.n;
    else if (r.status === 'QUALIFICADA') qualificadas = r.n;
  }

  const meta = getMetaSdr(nome, mes, ano);
  const pctMeta = meta > 0 ? (realizadas / meta) * 100 : 0;
  const faixa = getMultiplicador(pctMeta);
  const faltaParaBater = Math.max(meta - realizadas, 0);
  const taxaConversao = agendadas > 0 ? (qualificadas / agendadas) * 100 : 0;

  return {
    sdrId,
    nome,
    mes,
    ano,
    agendadas,
    realizadas,
    qualificadas,
    ligacoes: ligacoes.rows[0]?.total ?? 0,
    meta,
    pctMeta,
    multiplicador: faixa.mult,
    faixaMulti: faixa.rotulo,
    faltaParaBater,
    taxaConversao,
  };
}

/** Consolidado da equipe de Pré-Vendas: por SDR + distribuições por vendedor/segmento. */
export async function resumoEquipe(mes: number, ano: number): Promise<ResumoEquipe> {
  const { rows: sdrsRows } = await pool.query<{ id: number; nome: string }>(
    `SELECT id, nome FROM usuarios
      WHERE role = 'PRE_VENDAS' AND bloqueado = false
      ORDER BY nome`,
  );

  const sdrs = await Promise.all(
    sdrsRows.map((u) => resumoDaSdr(u.id, u.nome, mes, ano)),
  );

  const [porVendedor, porSegmento] = await Promise.all([
    pool.query<{ rotulo: string; total: number }>(
      `SELECT COALESCE(vendedor_nome, 'Sem vendedor') AS rotulo, COUNT(*)::int AS total
         FROM pv_reuniao
        WHERE ano = $1 AND mes = $2
        GROUP BY vendedor_nome
        ORDER BY total DESC`,
      [ano, mes],
    ),
    pool.query<{ rotulo: string; total: number }>(
      `SELECT COALESCE(segmento, 'Sem segmento') AS rotulo, COUNT(*)::int AS total
         FROM pv_reuniao
        WHERE ano = $1 AND mes = $2
        GROUP BY segmento
        ORDER BY total DESC`,
      [ano, mes],
    ),
  ]);

  return {
    mes,
    ano,
    sdrs,
    totalAgendadas: sdrs.reduce((s, x) => s + x.agendadas, 0),
    totalRealizadas: sdrs.reduce((s, x) => s + x.realizadas, 0),
    totalQualificadas: sdrs.reduce((s, x) => s + x.qualificadas, 0),
    totalLigacoes: sdrs.reduce((s, x) => s + x.ligacoes, 0),
    porVendedor: porVendedor.rows,
    porSegmento: porSegmento.rows,
  };
}

/** Resolve o usuário logado (id + nome) validando que é uma SDR/gestor com acesso. */
export async function buscarSdr(sdrId: number): Promise<{ id: number; nome: string } | null> {
  const { rows } = await pool.query<{ id: number; nome: string }>(
    `SELECT id, nome FROM usuarios WHERE id = $1 AND bloqueado = false`,
    [sdrId],
  );
  return rows[0] ?? null;
}
