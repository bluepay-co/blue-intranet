import { pool } from '../database/pool';
import { AppError } from '../utils/app-error';
import { boGet, boPost, boPatch, boUpload } from './backoffice-client';
import type {
  ChamadoLista, ChamadoDetalhe, ComentarioPublico, ChamadoResumo, DashboardTI,
} from '../models/chamado.model';

/**
 * Chamados de INFRA proxied para o BluePay Backoffice (área 7).
 * Devolve os MESMOS DTOs que a UI já espera — a interface não muda.
 * Escopo por usuário via tabela chamado_backoffice (o requester no backoffice é
 * sempre a conta do token; o dono real fica no nosso mapeamento).
 */

const AREA_INFRA = 7;
const CATEGORIA_CATEGORY_ID = 2;

const PRIORIDADE_POR_CRIT: Record<string, string> = { BAIXO: 'low', MEDIO: 'medium', ALTO: 'high', CRITICO: 'critical' };
const CRIT_POR_PRIORIDADE: Record<string, string> = { low: 'BAIXO', medium: 'MEDIO', high: 'ALTO', critical: 'CRITICO' };
const SLA_HORAS: Record<string, number> = { low: 24, medium: 8, high: 4, critical: 2 };
const STATUS_BO_PARA_NOSSO: Record<string, string> = {
  open: 'ABERTO', pending: 'ABERTO',
  in_progress: 'EM_ANDAMENTO', in_tests: 'EM_ANDAMENTO', waiting_tests: 'EM_ANDAMENTO',
  resolved: 'FECHADO', closed: 'FECHADO',
};
const STATUS_NOSSO_PARA_BO: Record<string, string> = { ABERTO: 'open', EM_ANDAMENTO: 'in_progress', FECHADO: 'closed' };
const CATEGORIA_LABEL: Record<string, string> = {
  IMPRESSORA: 'Impressora', COMPUTADOR: 'Computador', REDE: 'Rede/Internet',
  ACESSOS: 'Acessos/Senhas', OUTROS: 'Outros',
};

const TI_ROLES = new Set(['TI', 'DESENVOLVEDOR']);

// ── helpers ───────────────────────────────────────────────────────────────────
function escapeHtml(s: string): string {
  return (s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function htmlParaTexto(html: string): string {
  return (html ?? '')
    .replace(/<\/(p|div|li)>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<hr\s*\/?>/gi, '\n———\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/\n{3,}/g, '\n\n').trim();
}
function ymd(d: Date): string { return d.toISOString().slice(0, 10); }
function validarId(id: unknown): number {
  const n = Number(id);
  if (!Number.isInteger(n) || n <= 0) throw new AppError('Identificador de chamado inválido.', 400);
  return n;
}

interface MapaDono { usuarioId: number; nome: string; email: string; categoria: string; patrimonio: string | null }

async function mapasPorTickets(ticketIds: number[]): Promise<Map<number, MapaDono>> {
  if (!ticketIds.length) return new Map();
  const { rows } = await pool.query(
    `SELECT b.ticket_id, b.usuario_id, b.categoria, b.patrimonio, u.nome, u.email
       FROM chamado_backoffice b
       JOIN usuarios u ON u.id = b.usuario_id
      WHERE b.ticket_id = ANY($1::int[])`,
    [ticketIds],
  );
  return new Map(rows.map((r: { ticket_id: number; usuario_id: number; categoria: string; patrimonio: string | null; nome: string; email: string }) =>
    [r.ticket_id, { usuarioId: r.usuario_id, nome: r.nome, email: r.email, categoria: r.categoria, patrimonio: r.patrimonio }]));
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function mapLista(t: any, m?: MapaDono): ChamadoLista {
  return {
    id: t.id,
    titulo: t.title,
    categoria: m?.categoria ?? 'OUTROS',
    criticidade: CRIT_POR_PRIORIDADE[t.priority] ?? 'MEDIO',
    status: STATUS_BO_PARA_NOSSO[t.status] ?? 'ABERTO',
    tem_anexo: (t.attachments?.length ?? 0) > 0,
    identificador_url: null,
    autor_id: m?.usuarioId ?? 0,
    autor_nome: m?.nome ?? t.requester?.name ?? '—',
    atendente_nome: t.assignee?.name ?? null,
    criado_em: t.created_at,
    atualizado_em: t.updated_at,
  } as ChamadoLista;
}

function mapDetalhe(t: any, comentariosBo: any[], m?: MapaDono): ChamadoDetalhe {
  const anexo = t.attachments?.[0];
  const comentarios: ComentarioPublico[] = (comentariosBo ?? []).map((c) => ({
    id: c.id,
    chamado_id: t.id,
    autor_id: 0,
    autor_nome: 'Suporte',
    conteudo: htmlParaTexto(c.content ?? ''),
    criado_em: c.created_at,
  } as ComentarioPublico));

  return {
    ...mapLista(t, m),
    descricao: htmlParaTexto(t.description ?? ''),
    anexo_url: anexo?.url ?? null,
    anexo_nome: anexo?.filename ?? null,
    anexo_mime: anexo?.content_type ?? null,
    autor_email: m?.email ?? t.requester?.email ?? '',
    atendente_id: null,
    comentarios,
  } as ChamadoDetalhe;
}
/* eslint-enable @typescript-eslint/no-explicit-any */

async function ticketDeInfra(id: number): Promise<any> {
  const t = await boGet<any>(`/tickets/${id}`);
  if (!t || t.requester_area_id !== AREA_INFRA) throw new AppError('Chamado não encontrado.', 404);
  return t;
}

// ── criação ────────────────────────────────────────────────────────────────────
interface NovoChamado { titulo: string; descricao: string; categoria: string; criticidade: string; patrimonio?: string | null }
interface Anexo { buffer: Buffer; originalname: string; mimetype: string }

export async function criarChamado(
  usuario: { id: number; email: string },
  dados: NovoChamado,
  anexo?: Anexo,
): Promise<{ id: number }> {
  const titulo = dados.titulo?.trim() ?? '';
  const descricao = dados.descricao?.trim() ?? '';
  if (!titulo) throw new AppError('Título é obrigatório.', 400);
  if (titulo.length > 200) throw new AppError('Título excede 200 caracteres.', 400);
  if (!descricao) throw new AppError('Descrição é obrigatória.', 400);

  const priority = PRIORIDADE_POR_CRIT[dados.criticidade] ?? 'medium';
  const hoje = new Date();
  const due = new Date(hoje.getTime() + (SLA_HORAS[priority] ?? 8) * 3600_000);

  // Nome do solicitante (o JWT só tem id/email).
  const { rows } = await pool.query('SELECT nome FROM usuarios WHERE id = $1', [usuario.id]);
  const nome: string = rows[0]?.nome ?? usuario.email;

  const descHtml =
    `<p>${escapeHtml(descricao).replace(/\n/g, '<br>')}</p>` +
    `<hr>` +
    `<p><b>Solicitante:</b> ${escapeHtml(nome)} (${escapeHtml(usuario.email)})<br>` +
    `<b>Categoria:</b> ${escapeHtml(CATEGORIA_LABEL[dados.categoria] ?? dados.categoria)}<br>` +
    `<b>Patrimônio:</b> ${escapeHtml(dados.patrimonio?.trim() || '—')}</p>`;

  const ticket = await boPost<any>('/tickets', {
    area_id: AREA_INFRA, requester_area_id: AREA_INFRA, assignee_area_id: AREA_INFRA,
    ticket_category_id: CATEGORIA_CATEGORY_ID,
    priority, title: titulo, description: descHtml,
    start_date: ymd(hoje), due_date: ymd(due),
  });
  if (!ticket?.id) throw new AppError('Falha ao criar o chamado no backoffice.', 502);

  await pool.query(
    `INSERT INTO chamado_backoffice (ticket_id, usuario_id, categoria, patrimonio)
     VALUES ($1, $2, $3, $4) ON CONFLICT (ticket_id) DO NOTHING`,
    [ticket.id, usuario.id, dados.categoria, dados.patrimonio?.trim() || null],
  );

  if (anexo) {
    const up = await boUpload(anexo.buffer, anexo.originalname, anexo.mimetype);
    await boPatch(`/tickets/${ticket.id}`, { ticket: { attachment_signed_ids: [up.signed_id] } });
  }

  return { id: ticket.id };
}

export async function editarChamado(
  usuario: { id: number; email: string },
  idBruto: unknown,
  dados: { titulo: string; descricao: string },
): Promise<{ id: number }> {
  const id = validarId(idBruto);
  const titulo = dados.titulo?.trim() ?? '';
  const descricao = dados.descricao?.trim() ?? '';
  if (!titulo) throw new AppError('Título é obrigatório.', 400);
  if (titulo.length > 200) throw new AppError('Título excede 200 caracteres.', 400);
  if (!descricao) throw new AppError('Descrição é obrigatória.', 400);

  await ticketDeInfra(id);
  const m = (await mapasPorTickets([id])).get(id);
  if (m?.usuarioId !== usuario.id) throw new AppError('Só o autor pode editar o chamado.', 403);

  const nome = m?.nome ?? usuario.email;
  const descHtml =
    `<p>${escapeHtml(descricao).replace(/\n/g, '<br>')}</p><hr>` +
    `<p><b>Solicitante:</b> ${escapeHtml(nome)} (${escapeHtml(m?.email ?? usuario.email)})<br>` +
    `<b>Categoria:</b> ${escapeHtml(CATEGORIA_LABEL[m?.categoria ?? 'OUTROS'] ?? 'Outros')}<br>` +
    `<b>Patrimônio:</b> ${escapeHtml(m?.patrimonio || '—')}</p>`;

  await boPatch(`/tickets/${id}`, { ticket: { title: titulo, description: descHtml } });
  return { id };
}

// ── listagens ──────────────────────────────────────────────────────────────────
export async function listarMeus(usuarioId: number): Promise<ChamadoLista[]> {
  const { rows } = await pool.query(
    'SELECT ticket_id FROM chamado_backoffice WHERE usuario_id = $1 ORDER BY criado_em DESC',
    [usuarioId],
  );
  const ids: number[] = rows.map((r: { ticket_id: number }) => r.ticket_id);
  if (!ids.length) return [];
  const map = await mapasPorTickets(ids);
  const tickets = await Promise.all(ids.map((id) => boGet<any>(`/tickets/${id}`).catch(() => null)));
  return tickets
    .filter((t): t is any => !!t)
    .map((t) => mapLista(t, map.get(t.id)))
    .sort((a, b) => new Date(b.criado_em).getTime() - new Date(a.criado_em).getTime());
}

interface FiltrosTodos { status?: string | undefined; categoria?: string | undefined; criticidade?: string | undefined; busca?: string | undefined }

export async function listarTodos(filtros: FiltrosTodos = {}): Promise<ChamadoLista[]> {
  const all = await boGet<any[]>('/tickets');
  const area7 = (all ?? []).filter((t) => t.requester_area_id === AREA_INFRA);
  const map = await mapasPorTickets(area7.map((t) => t.id));
  let lista = area7.map((t) => mapLista(t, map.get(t.id)));

  if (filtros.status)      lista = lista.filter((c) => c.status === filtros.status);
  if (filtros.criticidade) lista = lista.filter((c) => c.criticidade === filtros.criticidade);
  if (filtros.categoria)   lista = lista.filter((c) => c.categoria === filtros.categoria);
  if (filtros.busca) {
    const q = filtros.busca.toLowerCase();
    lista = lista.filter((c) => c.titulo?.toLowerCase().includes(q) || c.autor_nome?.toLowerCase().includes(q));
  }
  return lista.sort((a, b) => new Date(b.criado_em).getTime() - new Date(a.criado_em).getTime());
}

// ── detalhe / comentários / status ───────────────────────────────────────────
export async function buscarChamado(usuario: { id: number; role: string }, idBruto: unknown): Promise<ChamadoDetalhe> {
  const id = validarId(idBruto);
  const t = await ticketDeInfra(id);
  const m = (await mapasPorTickets([id])).get(id);
  const ehTI = TI_ROLES.has(usuario.role);
  if (!ehTI && m?.usuarioId !== usuario.id) throw new AppError('Acesso negado a este chamado.', 403);
  const comentarios = await boGet<any[]>(`/tickets/${id}/comments`).catch(() => []);
  return mapDetalhe(t, comentarios, m);
}

export async function adicionarComentario(
  usuario: { id: number; role: string; email: string },
  idBruto: unknown,
  texto: string,
): Promise<ComentarioPublico> {
  const id = validarId(idBruto);
  const conteudo = texto?.trim() ?? '';
  if (!conteudo) throw new AppError('Comentário vazio.', 400);
  if (conteudo.length > 2000) throw new AppError('Comentário excede 2000 caracteres.', 400);

  await ticketDeInfra(id);
  const m = (await mapasPorTickets([id])).get(id);
  const ehTI = TI_ROLES.has(usuario.role);
  if (!ehTI && m?.usuarioId !== usuario.id) throw new AppError('Acesso negado a este chamado.', 403);

  const { rows } = await pool.query('SELECT nome FROM usuarios WHERE id = $1', [usuario.id]);
  const c = await boPost<any>(`/tickets/${id}/comments`, { content: conteudo });
  return {
    id: c.id, chamado_id: id, autor_id: usuario.id,
    autor_nome: rows[0]?.nome ?? usuario.email, conteudo, criado_em: c.created_at,
  } as ComentarioPublico;
}

export async function alterarStatus(idBruto: unknown, novoStatus: string): Promise<{ id: number; status: string }> {
  const id = validarId(idBruto);
  const bo = STATUS_NOSSO_PARA_BO[novoStatus];
  if (!bo) throw new AppError('Status inválido.', 400);
  await ticketDeInfra(id);
  await boPatch(`/tickets/${id}`, { ticket: { status: bo } });
  return { id, status: novoStatus };
}

// ── resumo (notificações) e dashboard ─────────────────────────────────────────
export async function resumo(usuario: { id: number; role: string }): Promise<ChamadoResumo[]> {
  let tickets: any[];
  if (TI_ROLES.has(usuario.role)) {
    const all = await boGet<any[]>('/tickets');
    tickets = (all ?? []).filter((t) => t.requester_area_id === AREA_INFRA);
  } else {
    const { rows } = await pool.query('SELECT ticket_id FROM chamado_backoffice WHERE usuario_id = $1', [usuario.id]);
    const ids: number[] = rows.map((r: { ticket_id: number }) => r.ticket_id);
    tickets = (await Promise.all(ids.map((id) => boGet<any>(`/tickets/${id}`).catch(() => null)))).filter(Boolean);
  }
  const map = await mapasPorTickets(tickets.map((t) => t.id));
  return tickets
    .map((t) => ({
      id: t.id,
      titulo: t.title,
      status: STATUS_BO_PARA_NOSSO[t.status] ?? 'ABERTO',
      autor_id: map.get(t.id)?.usuarioId ?? 0,
      atualizado_em: t.updated_at,
      ultimo_comentario_em: null,
      ultimo_comentario_autor_id: null,
    } as ChamadoResumo))
    .sort((a, b) => new Date(b.atualizado_em).getTime() - new Date(a.atualizado_em).getTime());
}

export async function dashboard(): Promise<DashboardTI> {
  const all = await boGet<any[]>('/tickets');
  const area7 = (all ?? []).filter((t) => t.requester_area_id === AREA_INFRA);
  const map = await mapasPorTickets(area7.map((t) => t.id));
  const nossos = area7.map((t) => mapLista(t, map.get(t.id)));

  const ativos = nossos.filter((c) => c.status !== 'FECHADO').length;
  const criticos = nossos.filter((c) => (c.criticidade === 'ALTO' || c.criticidade === 'CRITICO') && c.status !== 'FECHADO').length;
  const inicioMes = new Date(); inicioMes.setDate(1); inicioMes.setHours(0, 0, 0, 0);
  const totalMes = area7.filter((t) => new Date(t.created_at) >= inicioMes).length;
  const fechados = area7.filter((t) => (t.closed_at || t.resolved_at));
  const tempoMedioHoras = fechados.length
    ? Math.round(fechados.reduce((s, t) => s + (new Date(t.closed_at || t.resolved_at).getTime() - new Date(t.created_at).getTime()) / 3600_000, 0) / fechados.length)
    : null;

  const contar = (chave: (c: ChamadoLista) => string) => {
    const m = new Map<string, number>();
    for (const c of nossos) m.set(chave(c), (m.get(chave(c)) ?? 0) + 1);
    return [...m.entries()].map(([rotulo, total]) => ({ rotulo, total }));
  };

  // tendência 30 dias (abertos por dia)
  const dias = new Map<string, { abertos: number; finalizados: number }>();
  for (let i = 29; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); dias.set(ymd(d), { abertos: 0, finalizados: 0 }); }
  for (const t of area7) {
    const cd = ymd(new Date(t.created_at)); if (dias.has(cd)) dias.get(cd)!.abertos++;
    const fd = t.closed_at || t.resolved_at; if (fd) { const k = ymd(new Date(fd)); if (dias.has(k)) dias.get(k)!.finalizados++; }
  }

  return {
    kpis: { ativos, criticos, tempoMedioHoras, totalMes },
    porStatus: contar((c) => c.status),
    porSetor: contar((c) => c.criticidade), // infra: distribui por criticidade
    porCategoria: contar((c) => c.categoria),
    tendencia: [...dias.entries()].map(([dia, v]) => ({ dia, abertos: v.abertos, finalizados: v.finalizados })),
  } as DashboardTI;
}
