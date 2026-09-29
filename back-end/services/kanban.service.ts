import type { PoolClient } from 'pg';
import { pool } from '../database/pool';
import { AppError } from '../utils/app-error';
import type { AuthPayload } from '../middleware/auth.middleware';
import { KANBAN_ROLES, equipeDaRole } from '../utils/equipes';
import { criptografar, descriptografar } from '../utils/crypto-kanban';
import { permissoes, podeVer, rolesVisiveis } from './kanban-permissoes';
import { salaUsuario, sincronizarSalas } from '../socket/sync';
import type {
  KanbanChecklistItem,
  KanbanHistorico,
  KanbanNotificacao,
  KanbanTarefaDetalhada,
  KanbanTarefaVisao,
  KanbanUsuario,
  PrioridadeTarefa,
  StatusTarefa,
  TipoNotificacao,
  VisibilidadeTarefa,
} from '../models/kanban.model';

/** Campos editáveis da tarefa, crus do body (validados aqui). */
export interface TarefaEntrada {
  titulo?: unknown;
  descricao?: unknown;
  responsavelId?: unknown;
  solicitanteId?: unknown;
  areaSolicitante?: unknown;
  prioridade?: unknown;
  prazo?: unknown;
  lembreteMin?: unknown;
  visibilidade?: unknown;
  participantesIds?: unknown;
  /** Só na criação: itens iniciais do checklist. */
  checklist?: unknown;
}

const PRIORIDADES: PrioridadeTarefa[] = ['urgent', 'high', 'normal', 'low'];
const STATUS: StatusTarefa[] = ['todo', 'doing', 'done'];
const VISIBILIDADES: VisibilidadeTarefa[] = ['private', 'requester', 'team'];
const LEMBRETES = [0, 15, 30, 60, 180, 1440];
const ADIAR_MIN = 10;
const MAX_PARTICIPANTES = 20;
const MAX_ITENS_CHECKLIST = 50;

const ROTULO_PRIORIDADE: Record<PrioridadeTarefa, string> = { urgent: 'Urgente', high: 'Importante', normal: 'Normal', low: 'Baixa' };

const ROTULO_STATUS: Record<StatusTarefa, string> = { todo: 'A fazer', doing: 'Em andamento', done: 'Finalizado' };

const TEXTO_STATUS: Record<StatusTarefa, string> = {
  todo: 'reabriu a tarefa',
  doing: 'iniciou a tarefa',
  done: 'finalizou a tarefa',
};

const SELECT_TAREFA = `
  SELECT t.*, r.nome AS responsavel_nome, r.role AS responsavel_role,
         s.nome AS solicitante_nome, s.role AS solicitante_role,
         COALESCE((
           SELECT json_agg(json_build_object('id', pu.id, 'nome', pu.nome) ORDER BY pu.nome)
             FROM blue_intranet.kanban_participantes p
             JOIN blue_intranet.usuarios pu ON pu.id = p.usuario_id
            WHERE p.tarefa_id = t.id
         ), '[]') AS participantes,
         (SELECT COUNT(*)::int FROM blue_intranet.kanban_checklist c WHERE c.tarefa_id = t.id) AS checklist_total,
         (SELECT COUNT(*)::int FROM blue_intranet.kanban_checklist c WHERE c.tarefa_id = t.id AND c.concluido) AS checklist_feitos
    FROM blue_intranet.kanban_tarefas t
    JOIN blue_intranet.usuarios r ON r.id = t.responsavel_id
    JOIN blue_intranet.usuarios s ON s.id = t.solicitante_id`;

type Executor = Pick<PoolClient, 'query'>;

/* ---------- validação ---------- */

function texto(valor: unknown, campo: string, max: number, obrigatorio = true): string {
  const v = typeof valor === 'string' ? valor.trim() : '';
  if (obrigatorio && !v) throw new AppError(`Informe ${campo}.`, 400);
  if (v.length > max) throw new AppError(`${campo} excede ${max} caracteres.`, 400);
  return v;
}

function opcao<T extends string>(valor: unknown, opcoes: T[], campo: string): T {
  if (!opcoes.includes(valor as T)) throw new AppError(`${campo} inválido(a).`, 400);
  return valor as T;
}

function idUsuario(valor: unknown, campo: string): number {
  const id = Number(valor);
  if (!Number.isInteger(id) || id <= 0) throw new AppError(`${campo} inválido.`, 400);
  return id;
}

interface TarefaValidada {
  titulo: string;
  descricao: string;
  responsavelId: number;
  solicitanteId: number;
  areaSolicitante: string;
  prioridade: PrioridadeTarefa;
  prazo: Date;
  lembreteMin: number;
  visibilidade: VisibilidadeTarefa;
  participantesIds: number[];
}

async function validarTarefa(e: TarefaEntrada, criadorId: number): Promise<TarefaValidada> {
  const prazo = new Date(String(e.prazo ?? ''));
  if (Number.isNaN(prazo.getTime())) throw new AppError('Prazo inválido.', 400);

  const lembreteMin = Number(e.lembreteMin ?? 0);
  if (!LEMBRETES.includes(lembreteMin)) throw new AppError('Lembrete inválido.', 400);

  const dados: TarefaValidada = {
    titulo: texto(e.titulo, 'o título', 200),
    descricao: texto(e.descricao, 'a descrição', 5000, false),
    responsavelId: idUsuario(e.responsavelId, 'Responsável'),
    solicitanteId: idUsuario(e.solicitanteId, 'Solicitante'),
    areaSolicitante: texto(e.areaSolicitante, 'a área solicitante', 60),
    prioridade: opcao(e.prioridade, PRIORIDADES, 'Prioridade'),
    prazo,
    lembreteMin,
    visibilidade: opcao(e.visibilidade, VISIBILIDADES, 'Visibilidade'),
    participantesIds: [],
  };

  const brutos = e.participantesIds ?? [];
  if (!Array.isArray(brutos)) throw new AppError('Participantes inválidos.', 400);
  // Responsável e solicitante já acompanham a tarefa: não entram como participantes.
  dados.participantesIds = [...new Set(brutos.map((v) => idUsuario(v, 'Participante')))].filter(
    (id) => id !== dados.responsavelId && id !== dados.solicitanteId,
  );
  if (dados.participantesIds.length > MAX_PARTICIPANTES) {
    throw new AppError(`Máximo de ${MAX_PARTICIPANTES} participantes por tarefa.`, 400);
  }
  if (dados.visibilidade === 'private' && dados.participantesIds.length) {
    throw new AppError('Tarefas "Só eu" não podem ter participantes.', 400);
  }

  // Tarefa privada só faz sentido como anotação pessoal de quem a criou.
  if (dados.visibilidade === 'private' && dados.responsavelId !== criadorId) {
    throw new AppError('Tarefas "Só eu" precisam ter você como responsável.', 400);
  }

  const { rows } = await pool.query<{ id: number }>(
    'SELECT id FROM blue_intranet.usuarios WHERE id = ANY($1) AND bloqueado = false AND role = ANY($2)',
    [[dados.responsavelId, dados.solicitanteId, ...dados.participantesIds], KANBAN_ROLES],
  );
  const ativos = new Set(rows.map((r) => r.id));
  if (!ativos.has(dados.responsavelId) || !ativos.has(dados.solicitanteId)) {
    throw new AppError('Responsável ou solicitante não encontrado.', 400);
  }
  if (dados.participantesIds.some((id) => !ativos.has(id))) {
    throw new AppError('Algum participante não foi encontrado ou não tem acesso ao Kanban.', 400);
  }
  return dados;
}

/** Sincroniza os participantes e devolve quem foi adicionado agora (para notificar). */
async function salvarParticipantes(db: Executor, tarefaId: number, ids: number[], autorId: number): Promise<number[]> {
  const { rows } = await db.query<{ usuario_id: number }>(
    'SELECT usuario_id FROM blue_intranet.kanban_participantes WHERE tarefa_id = $1',
    [tarefaId],
  );
  const atuais = new Set(rows.map((r) => r.usuario_id));
  await db.query('DELETE FROM blue_intranet.kanban_participantes WHERE tarefa_id = $1 AND NOT (usuario_id = ANY($2))', [
    tarefaId,
    ids,
  ]);
  const novos = ids.filter((id) => !atuais.has(id));
  for (const id of novos) {
    await db.query(
      'INSERT INTO blue_intranet.kanban_participantes (tarefa_id, usuario_id, adicionado_por) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
      [tarefaId, id, autorId],
    );
  }
  return novos;
}

/** Todos que acompanham a tarefa e devem ser avisados de novidades. */
function interessadosDe(tarefa: KanbanTarefaDetalhada): number[] {
  if (tarefa.visibilidade === 'private') return [];
  return [tarefa.responsavel_id, tarefa.solicitante_id, ...tarefa.participantes.map((p) => p.id)];
}

const lembreteEm = (prazo: Date, min: number) => (min ? new Date(prazo.getTime() - min * 60_000) : null);

/* ---------- apoio ---------- */

/**
 * Grava um item do histórico. Comentários (texto do usuário) vão SEMPRE cifrados
 * (AES-256-GCM); eventos do sistema ("iniciou a tarefa"…) ficam em claro.
 */
async function registrarHistorico(db: Executor, tarefaId: number, usuarioId: number, tipo: 'evento' | 'comentario', texto: string) {
  if (tipo === 'comentario') {
    const c = criptografar(texto);
    await db.query(
      `INSERT INTO blue_intranet.kanban_historico (tarefa_id, usuario_id, tipo, conteudo_cifrado, iv, auth_tag)
       VALUES ($1, $2, 'comentario', $3, $4, $5)`,
      [tarefaId, usuarioId, c.conteudo, c.iv, c.authTag],
    );
    return;
  }
  await db.query('INSERT INTO blue_intranet.kanban_historico (tarefa_id, usuario_id, tipo, texto) VALUES ($1, $2, $3, $4)', [
    tarefaId,
    usuarioId,
    tipo,
    texto,
  ]);
}

type LinhaHistorico = Omit<KanbanHistorico, 'texto'> & {
  texto: string | null;
  conteudo_cifrado: string | null;
  iv: string | null;
  auth_tag: string | null;
};

/**
 * Destinatários notificados em cada transação aberta. O aviso em tempo real
 * (socket) só sai depois do COMMIT — antes disso o cliente buscaria e ainda
 * não enxergaria a notificação.
 */
const avisosPendentes = new WeakMap<Executor, Set<number>>();

/**
 * Agenda o aviso em tempo real para quem acompanha a tarefa, sem gerar
 * notificação (mudança pequena, como marcar item do checklist).
 */
function avisarSemNotificar(db: Executor, autorId: number, destinatarios: number[]) {
  const pendentes = avisosPendentes.get(db);
  destinatarios.filter((id) => id !== autorId).forEach((id) => pendentes?.add(id));
}

/** Notifica cada destinatário uma vez, nunca o próprio autor da ação. */
async function notificar(db: Executor, tarefaId: number, autorId: number, destinatarios: number[], tipo: TipoNotificacao, texto: string) {
  const alvos = [...new Set(destinatarios)].filter((id) => id !== autorId);
  for (const id of alvos) {
    await db.query('INSERT INTO blue_intranet.kanban_notificacoes (destinatario_id, tarefa_id, tipo, texto) VALUES ($1, $2, $3, $4)', [
      id,
      tarefaId,
      tipo,
      texto,
    ]);
    avisosPendentes.get(db)?.add(id);
  }
}

async function transacao<T>(fn: (db: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  const avisar = new Set<number>();
  avisosPendentes.set(client, avisar);
  try {
    await client.query('BEGIN');
    const resultado = await fn(client);
    await client.query('COMMIT');
    sincronizarSalas([...avisar].map(salaUsuario), 'kanban');
    return resultado;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    avisosPendentes.delete(client);
    client.release();
  }
}

async function buscarTarefa(id: number): Promise<KanbanTarefaDetalhada> {
  const { rows } = await pool.query<KanbanTarefaDetalhada>(`${SELECT_TAREFA} WHERE t.id = $1`, [id]);
  if (!rows[0]) throw new AppError('Tarefa não encontrada.', 404);
  return rows[0];
}

/** Busca a tarefa garantindo que o usuário pode vê-la (404 para não vazar existência). */
async function tarefaVisivel(usuario: AuthPayload, id: number): Promise<KanbanTarefaDetalhada> {
  const tarefa = await buscarTarefa(id);
  if (!podeVer(usuario, tarefa)) throw new AppError('Tarefa não encontrada.', 404);
  return tarefa;
}

const comPermissoes = (usuario: AuthPayload, t: KanbanTarefaDetalhada): KanbanTarefaVisao => ({
  ...t,
  ...permissoes(usuario, t),
});

/**
 * Descriptografa um comentário isoladamente: uma cifra corrompida (ou chave
 * trocada) vira aviso naquele item, sem impedir a abertura da tarefa inteira.
 */
function lerComentario(historicoId: number, conteudo: string, iv: string, authTag: string): string {
  try {
    return descriptografar({ conteudo, iv, authTag });
  } catch (err) {
    console.error(`[kanban.service] comentário ${historicoId} ilegível:`, err);
    return '[comentário ilegível]';
  }
}

/* ---------- consultas ---------- */

/** Todas as tarefas visíveis ao usuário; o front separa em abas. */
export async function listarTarefas(usuario: AuthPayload): Promise<KanbanTarefaVisao[]> {
  const { rows } = await pool.query<KanbanTarefaDetalhada>(
    `${SELECT_TAREFA}
      WHERE t.responsavel_id = $1
         OR (t.visibilidade <> 'private' AND t.solicitante_id = $1)
         OR (t.visibilidade = 'team' AND r.role = ANY($2))
         OR (t.visibilidade <> 'private' AND EXISTS (
               SELECT 1 FROM blue_intranet.kanban_participantes p
                WHERE p.tarefa_id = t.id AND p.usuario_id = $1))
      ORDER BY t.prazo`,
    [usuario.id, rolesVisiveis(usuario)],
  );
  return rows.map((t) => comPermissoes(usuario, t));
}

export async function detalharTarefa(usuario: AuthPayload, id: number) {
  const tarefa = await tarefaVisivel(usuario, id);
  const { rows } = await pool.query<LinhaHistorico>(
    `SELECT h.*, u.nome AS usuario_nome
       FROM blue_intranet.kanban_historico h JOIN blue_intranet.usuarios u ON u.id = h.usuario_id
      WHERE h.tarefa_id = $1 ORDER BY h.criado_em`,
    [id],
  );
  // Só o texto em claro sai para o front — cifra, iv e authTag ficam no servidor.
  const historico: KanbanHistorico[] = rows.map(({ conteudo_cifrado, iv, auth_tag, texto, ...h }) => ({
    ...h,
    texto: conteudo_cifrado && iv && auth_tag ? lerComentario(h.id, conteudo_cifrado, iv, auth_tag) : (texto ?? ''),
  }));
  const { rows: checklist } = await pool.query<KanbanChecklistItem>(
    `SELECT c.*, u.nome AS concluido_por_nome
       FROM blue_intranet.kanban_checklist c
       LEFT JOIN blue_intranet.usuarios u ON u.id = c.concluido_por
      WHERE c.tarefa_id = $1 ORDER BY c.ordem, c.id`,
    [id],
  );
  return { tarefa: comPermissoes(usuario, tarefa), historico, checklist };
}

export async function listarUsuarios(): Promise<KanbanUsuario[]> {
  const { rows } = await pool.query<Omit<KanbanUsuario, 'equipe'>>(
    'SELECT id, nome, role FROM blue_intranet.usuarios WHERE bloqueado = false AND role = ANY($1) ORDER BY nome',
    [KANBAN_ROLES],
  );
  return rows.map((u) => ({ ...u, equipe: equipeDaRole(u.role) }));
}

/* ---------- escrita ---------- */

export async function criarTarefa(usuario: AuthPayload, entrada: TarefaEntrada): Promise<number> {
  const d = await validarTarefa(entrada, usuario.id);
  const itensChecklist = validarItensIniciais(entrada.checklist);
  return transacao(async (db) => {
    const { rows } = await db.query<{ id: number }>(
      `INSERT INTO blue_intranet.kanban_tarefas
         (titulo, descricao, responsavel_id, solicitante_id, criador_id, area_solicitante,
          prioridade, visibilidade, prazo, lembrete_min, lembrete_em, lembrete_enviado, vencimento_notificado)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING id`,
      [
        d.titulo, d.descricao, d.responsavelId, d.solicitanteId, usuario.id, d.areaSolicitante,
        d.prioridade, d.visibilidade, d.prazo, d.lembreteMin, lembreteEm(d.prazo, d.lembreteMin),
        (lembreteEm(d.prazo, d.lembreteMin)?.getTime() ?? 0) < Date.now(), d.prazo.getTime() < Date.now(),
      ],
    );
    const id = rows[0]!.id;
    await registrarHistorico(db, id, usuario.id, 'evento', 'criou a tarefa');
    await notificar(db, id, usuario.id, [d.responsavelId], 'solicitacao', `Nova solicitação: "${d.titulo}"`);
    const novos = await salvarParticipantes(db, id, d.participantesIds, usuario.id);
    await notificar(db, id, usuario.id, novos, 'solicitacao', `Você foi adicionado a "${d.titulo}"`);
    await inserirItens(db, id, usuario.id, itensChecklist);
    return id;
  });
}

export async function editarTarefa(usuario: AuthPayload, id: number, entrada: TarefaEntrada) {
  const atual = await tarefaVisivel(usuario, id);
  if (!permissoes(usuario, atual).pode_editar) throw new AppError('Sem permissão para editar esta tarefa.', 403);
  const d = await validarTarefa(entrada, atual.criador_id);

  await transacao(async (db) => {
    const novoLembrete = lembreteEm(d.prazo, d.lembreteMin);
    await db.query(
      `UPDATE blue_intranet.kanban_tarefas SET
         titulo = $2, descricao = $3, responsavel_id = $4, solicitante_id = $5, area_solicitante = $6,
         prioridade = $7, visibilidade = $8, prazo = $9, lembrete_min = $10, lembrete_em = $11,
         lembrete_enviado = $12, vencimento_notificado = $13, atualizado_em = NOW()
       WHERE id = $1`,
      [
        id, d.titulo, d.descricao, d.responsavelId, d.solicitanteId, d.areaSolicitante,
        d.prioridade, d.visibilidade, d.prazo, d.lembreteMin, novoLembrete,
        (novoLembrete?.getTime() ?? 0) < Date.now(), d.prazo.getTime() < Date.now(),
      ],
    );
    await registrarHistorico(db, id, usuario.id, 'evento', 'editou a tarefa');
    if (d.responsavelId !== atual.responsavel_id) {
      await notificar(db, id, usuario.id, [d.responsavelId], 'solicitacao', `Tarefa atribuída a você: "${d.titulo}"`);
    }
    const novos = await salvarParticipantes(db, id, d.participantesIds, usuario.id);
    await notificar(db, id, usuario.id, novos, 'solicitacao', `Você foi adicionado a "${d.titulo}"`);
  });
}

export async function excluirTarefa(usuario: AuthPayload, id: number) {
  const tarefa = await tarefaVisivel(usuario, id);
  if (!permissoes(usuario, tarefa).pode_excluir) throw new AppError('Sem permissão para excluir esta tarefa.', 403);
  await pool.query('DELETE FROM blue_intranet.kanban_tarefas WHERE id = $1', [id]);
}

export async function alterarStatus(usuario: AuthPayload, id: number, statusBruto: unknown) {
  const status = opcao(statusBruto, STATUS, 'Status');
  const tarefa = await tarefaVisivel(usuario, id);
  if (!permissoes(usuario, tarefa).pode_mover) throw new AppError('Só o responsável ou o coordenador altera o status.', 403);
  if (tarefa.status === status) return;

  await transacao(async (db) => {
    await db.query(
      'UPDATE blue_intranet.kanban_tarefas SET status = $2, atualizado_em = NOW(), concluido_em = $3 WHERE id = $1',
      [id, status, status === 'done' ? new Date() : null],
    );
    await registrarHistorico(db, id, usuario.id, 'evento', TEXTO_STATUS[status]);
    await notificar(db, id, usuario.id, interessadosDe(tarefa), 'status', `"${tarefa.titulo}" agora está em ${ROTULO_STATUS[status]}`);
  });
}

/** Troca só a prioridade (drag para/da coluna "Urgente"). Mesma permissão de mover. */
export async function alterarPrioridade(usuario: AuthPayload, id: number, prioridadeBruta: unknown) {
  const prioridade = opcao(prioridadeBruta, PRIORIDADES, 'Prioridade');
  const tarefa = await tarefaVisivel(usuario, id);
  if (!permissoes(usuario, tarefa).pode_mover) throw new AppError('Só o responsável ou o coordenador altera a prioridade.', 403);
  if (tarefa.prioridade === prioridade) return;

  await transacao(async (db) => {
    await db.query('UPDATE blue_intranet.kanban_tarefas SET prioridade = $2, atualizado_em = NOW() WHERE id = $1', [id, prioridade]);
    await registrarHistorico(db, id, usuario.id, 'evento', `mudou a prioridade para ${ROTULO_PRIORIDADE[prioridade]}`);
  });
}

export async function comentar(usuario: AuthPayload, id: number, textoBruto: unknown) {
  const comentario = texto(textoBruto, 'o comentário', 2000);
  const tarefa = await tarefaVisivel(usuario, id);
  await transacao(async (db) => {
    await registrarHistorico(db, id, usuario.id, 'comentario', comentario);
    await db.query('UPDATE blue_intranet.kanban_tarefas SET atualizado_em = NOW() WHERE id = $1', [id]);
    await notificar(db, id, usuario.id, interessadosDe(tarefa), 'comentario', `Novo comentário em "${tarefa.titulo}"`);
  });
}

export async function cobrarAtualizacao(usuario: AuthPayload, id: number) {
  const tarefa = await tarefaVisivel(usuario, id);
  if (tarefa.responsavel_id === usuario.id) throw new AppError('Você é o responsável por esta tarefa.', 400);
  if (tarefa.status === 'done') throw new AppError('A tarefa já foi finalizada.', 400);
  await transacao(async (db) => {
    await registrarHistorico(db, id, usuario.id, 'evento', 'cobrou atualização');
    await notificar(db, id, usuario.id, [tarefa.responsavel_id], 'cobranca', `Cobrança de atualização em "${tarefa.titulo}"`);
  });
}

export async function adiarLembrete(usuario: AuthPayload, id: number) {
  const { rowCount } = await pool.query(
    `UPDATE blue_intranet.kanban_tarefas
        SET lembrete_em = NOW() + make_interval(mins => $3), lembrete_enviado = false
      WHERE id = $1 AND responsavel_id = $2 AND status <> 'done'`,
    [id, usuario.id, ADIAR_MIN],
  );
  if (!rowCount) throw new AppError('Tarefa não encontrada.', 404);
}

/**
 * Responsáveis com lembrete ou prazo vencendo ainda não notificado. Usado pelo
 * job de lembretes (socket/lembretes-kanban.ts): uma consulta por minuto no
 * servidor avisa só quem tem algo vencendo, em vez de cada aba perguntar.
 */
export async function responsaveisComAvisoVencido(): Promise<number[]> {
  const { rows } = await pool.query<{ responsavel_id: number }>(
    `SELECT DISTINCT responsavel_id FROM blue_intranet.kanban_tarefas
      WHERE status <> 'done'
        AND ((NOT lembrete_enviado AND lembrete_em <= NOW())
          OR (NOT vencimento_notificado AND prazo < NOW()))`,
  );
  return rows.map((r) => r.responsavel_id);
}

/**
 * Consulta das notificações: gera sob demanda os lembretes e avisos de
 * vencimento do usuário e devolve as notificações não lidas, marcando-as como
 * entregues na mesma operação. O job de lembretes só avisa o cliente para
 * chamar esta rota — a geração continua aqui.
 */
export async function notificacoesPendentes(usuario: AuthPayload): Promise<KanbanNotificacao[]> {
  return transacao(async (db) => {
    await db.query(
      `WITH vencendo AS (
         UPDATE blue_intranet.kanban_tarefas SET lembrete_enviado = true
          WHERE responsavel_id = $1 AND status <> 'done' AND NOT lembrete_enviado AND lembrete_em <= NOW()
          RETURNING id, titulo)
       INSERT INTO blue_intranet.kanban_notificacoes (destinatario_id, tarefa_id, tipo, texto)
       SELECT $1, id, 'lembrete', 'Lembrete: "' || titulo || '"' FROM vencendo`,
      [usuario.id],
    );
    await db.query(
      `WITH vencidas AS (
         UPDATE blue_intranet.kanban_tarefas SET vencimento_notificado = true
          WHERE responsavel_id = $1 AND status <> 'done' AND NOT vencimento_notificado AND prazo < NOW()
          RETURNING id, titulo)
       INSERT INTO blue_intranet.kanban_notificacoes (destinatario_id, tarefa_id, tipo, texto)
       SELECT $1, id, 'vencido', 'Prazo vencido: "' || titulo || '"' FROM vencidas`,
      [usuario.id],
    );
    const { rows } = await db.query<KanbanNotificacao>(
      `WITH entregues AS (
         UPDATE blue_intranet.kanban_notificacoes SET lida = true
          WHERE destinatario_id = $1 AND NOT lida
          RETURNING *)
       SELECT e.*, t.titulo AS tarefa_titulo
         FROM entregues e JOIN blue_intranet.kanban_tarefas t ON t.id = e.tarefa_id
        ORDER BY e.criado_em`,
      [usuario.id],
    );
    return rows;
  });
}

/* ---------- checklist ---------- */

function textoItem(valor: unknown): string {
  return texto(valor, 'o item do checklist', 300);
}

/** Lista de itens enviada na criação da tarefa (vazios são ignorados). */
function validarItensIniciais(valor: unknown): string[] {
  if (valor === undefined || valor === null) return [];
  if (!Array.isArray(valor)) throw new AppError('Checklist inválido.', 400);
  const itens = valor.filter((v) => typeof v === 'string' && v.trim()).map(textoItem);
  if (itens.length > MAX_ITENS_CHECKLIST) throw new AppError(`Máximo de ${MAX_ITENS_CHECKLIST} itens no checklist.`, 400);
  return itens;
}

async function inserirItens(db: Executor, tarefaId: number, autorId: number, itens: string[]) {
  const { rows } = await db.query<{ proxima: number }>(
    'SELECT COALESCE(MAX(ordem), -1) + 1 AS proxima FROM blue_intranet.kanban_checklist WHERE tarefa_id = $1',
    [tarefaId],
  );
  let ordem = rows[0]!.proxima;
  for (const item of itens) {
    await db.query(
      'INSERT INTO blue_intranet.kanban_checklist (tarefa_id, texto, ordem, criado_por) VALUES ($1, $2, $3, $4)',
      [tarefaId, item, ordem++, autorId],
    );
  }
}

/** Tarefa visível + permissão de mexer no checklist. */
async function tarefaDoChecklist(usuario: AuthPayload, tarefaId: number): Promise<KanbanTarefaDetalhada> {
  const tarefa = await tarefaVisivel(usuario, tarefaId);
  if (!permissoes(usuario, tarefa).pode_checklist) {
    throw new AppError('Só o responsável, quem criou ou a coordenação alteram o checklist.', 403);
  }
  return tarefa;
}

/** Item precisa pertencer à tarefa da rota (evita mexer em item de outra tarefa pelo id). */
async function garantirItemDaTarefa(db: Executor, tarefaId: number, itemId: number) {
  const { rowCount } = await db.query('SELECT 1 FROM blue_intranet.kanban_checklist WHERE id = $1 AND tarefa_id = $2', [
    itemId,
    tarefaId,
  ]);
  if (!rowCount) throw new AppError('Item do checklist não encontrado.', 404);
}

export async function adicionarItemChecklist(usuario: AuthPayload, tarefaId: number, textoBruto: unknown) {
  const item = textoItem(textoBruto);
  const tarefa = await tarefaDoChecklist(usuario, tarefaId);
  if (tarefa.checklist_total >= MAX_ITENS_CHECKLIST) {
    throw new AppError(`Máximo de ${MAX_ITENS_CHECKLIST} itens no checklist.`, 400);
  }
  await transacao(async (db) => {
    await inserirItens(db, tarefaId, usuario.id, [item]);
    await db.query('UPDATE blue_intranet.kanban_tarefas SET atualizado_em = NOW() WHERE id = $1', [tarefaId]);
    avisarSemNotificar(db, usuario.id, interessadosDe(tarefa));
  });
}

/** Marca/desmarca e/ou renomeia um item. */
export async function atualizarItemChecklist(
  usuario: AuthPayload,
  tarefaId: number,
  itemId: number,
  entrada: { concluido?: unknown; texto?: unknown },
) {
  if (entrada.concluido === undefined && entrada.texto === undefined) throw new AppError('Nada para atualizar.', 400);
  if (entrada.concluido !== undefined && typeof entrada.concluido !== 'boolean') {
    throw new AppError('Valor de "concluído" inválido.', 400);
  }
  const novoTexto = entrada.texto === undefined ? null : textoItem(entrada.texto);
  const tarefa = await tarefaDoChecklist(usuario, tarefaId);

  await transacao(async (db) => {
    await garantirItemDaTarefa(db, tarefaId, itemId);
    if (novoTexto !== null) {
      await db.query('UPDATE blue_intranet.kanban_checklist SET texto = $2 WHERE id = $1', [itemId, novoTexto]);
    }
    if (typeof entrada.concluido === 'boolean') {
      await db.query(
        `UPDATE blue_intranet.kanban_checklist
            SET concluido = $2,
                concluido_por = CASE WHEN $2 THEN $3::int ELSE NULL END,
                concluido_em  = CASE WHEN $2 THEN NOW() ELSE NULL END
          WHERE id = $1`,
        [itemId, entrada.concluido, usuario.id],
      );
    }
    await db.query('UPDATE blue_intranet.kanban_tarefas SET atualizado_em = NOW() WHERE id = $1', [tarefaId]);
    avisarSemNotificar(db, usuario.id, interessadosDe(tarefa));
  });
}

export async function removerItemChecklist(usuario: AuthPayload, tarefaId: number, itemId: number) {
  const tarefa = await tarefaDoChecklist(usuario, tarefaId);
  await transacao(async (db) => {
    await garantirItemDaTarefa(db, tarefaId, itemId);
    await db.query('DELETE FROM blue_intranet.kanban_checklist WHERE id = $1', [itemId]);
    await db.query('UPDATE blue_intranet.kanban_tarefas SET atualizado_em = NOW() WHERE id = $1', [tarefaId]);
    avisarSemNotificar(db, usuario.id, interessadosDe(tarefa));
  });
}
