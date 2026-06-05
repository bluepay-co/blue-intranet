import { google } from 'googleapis';
import type { tasks_v1 } from 'googleapis';
import { criarClienteAutenticado, lancarErroGoogle } from '../utils/google-cliente';
import { AppError } from '../utils/app-error';
import type { Tarefa, EntradaTarefa } from '../models/tarefa.model';

const LISTA_PADRAO = '@default';

/** Cliente do Google Tasks autenticado para o usuário. */
async function tasksDoUsuario(usuarioId: number): Promise<tasks_v1.Tasks> {
  const auth = await criarClienteAutenticado(usuarioId);
  return google.tasks({ version: 'v1', auth });
}

/** Normaliza a tarefa bruta do Google para o DTO da aplicação. */
function mapear(t: tasks_v1.Schema$Task): Tarefa {
  return {
    id: t.id ?? '',
    titulo: t.title?.trim() || '(Sem título)',
    notas: t.notes ?? null,
    concluida: t.status === 'completed',
    vencimento: t.due ?? null,
    concluidaEm: t.completed ?? null,
  };
}

/** Converte 'YYYY-MM-DD' em RFC3339; passa adiante o resto (ou null). */
function normalizarVencimento(v: string | null | undefined): string | null | undefined {
  if (v === undefined) return undefined;
  if (v === null || v === '') return null;
  return /^\d{4}-\d{2}-\d{2}$/.test(v) ? `${v}T00:00:00.000Z` : v;
}

/** Valida e sanitiza o título obrigatório. */
function exigirTitulo(titulo: string | undefined): string {
  const limpo = (titulo ?? '').trim();
  if (limpo.length === 0) {
    throw new AppError('O título da tarefa é obrigatório.', 400);
  }
  if (limpo.length > 1024) {
    throw new AppError('O título da tarefa é muito longo.', 400);
  }
  return limpo;
}

/** Lista as tarefas da lista padrão (inclui concluídas). */
export async function listarTarefas(usuarioId: number): Promise<Tarefa[]> {
  const tasks = await tasksDoUsuario(usuarioId);
  try {
    const resp = await tasks.tasks.list({
      tasklist: LISTA_PADRAO,
      showCompleted: true,
      showHidden: true,
      maxResults: 100,
    });
    return (resp.data.items ?? []).map(mapear);
  } catch (err) {
    lancarErroGoogle(err, 'tarefas');
  }
}

/** Cria uma tarefa na lista padrão. */
export async function criarTarefa(usuarioId: number, entrada: EntradaTarefa): Promise<Tarefa> {
  const titulo = exigirTitulo(entrada.titulo);

  const body: tasks_v1.Schema$Task = { title: titulo };
  if (entrada.notas != null) body.notes = entrada.notas;
  const due = normalizarVencimento(entrada.vencimento);
  if (due) body.due = due;

  const tasks = await tasksDoUsuario(usuarioId);
  try {
    const resp = await tasks.tasks.insert({ tasklist: LISTA_PADRAO, requestBody: body });
    return mapear(resp.data);
  } catch (err) {
    lancarErroGoogle(err, 'tarefas');
  }
}

/** Atualiza uma tarefa (título, notas, vencimento e/ou conclusão). */
export async function atualizarTarefa(
  usuarioId: number,
  tarefaId: string,
  entrada: EntradaTarefa,
): Promise<Tarefa> {
  if (!tarefaId) {
    throw new AppError('Tarefa inválida.', 400);
  }

  const body: tasks_v1.Schema$Task = {};
  if (entrada.titulo !== undefined) body.title = exigirTitulo(entrada.titulo);
  if (entrada.notas !== undefined) body.notes = entrada.notas;
  const venc = normalizarVencimento(entrada.vencimento);
  if (venc !== undefined) body.due = venc;
  if (entrada.concluida !== undefined) {
    body.status = entrada.concluida ? 'completed' : 'needsAction';
    if (!entrada.concluida) body.completed = null; // limpa a data de conclusão
  }

  const tasks = await tasksDoUsuario(usuarioId);
  try {
    const resp = await tasks.tasks.patch({
      tasklist: LISTA_PADRAO,
      task: tarefaId,
      requestBody: body,
    });
    return mapear(resp.data);
  } catch (err) {
    lancarErroGoogle(err, 'tarefas');
  }
}

/** Exclui uma tarefa da lista padrão. */
export async function removerTarefa(usuarioId: number, tarefaId: string): Promise<void> {
  if (!tarefaId) {
    throw new AppError('Tarefa inválida.', 400);
  }
  const tasks = await tasksDoUsuario(usuarioId);
  try {
    await tasks.tasks.delete({ tasklist: LISTA_PADRAO, task: tarefaId });
  } catch (err) {
    lancarErroGoogle(err, 'tarefas');
  }
}
