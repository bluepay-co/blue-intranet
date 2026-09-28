import type { Request, Response } from 'express';
import { AppError } from '../utils/app-error';
import {
  listarTarefas,
  detalharTarefa,
  listarUsuarios,
  criarTarefa,
  editarTarefa,
  excluirTarefa,
  alterarStatus,
  alterarPrioridade,
  comentar,
  cobrarAtualizacao,
  adiarLembrete,
  notificacoesPendentes,
} from '../services/kanban.service';

/** Valida o parâmetro de rota antes de qualquer acesso ao banco. */
function lerId(req: Request): number {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) throw new AppError('Identificador inválido.', 400);
  return id;
}

/** Envolve o handler no tratamento padrão de erro do projeto. */
function handler(nome: string, mensagem500: string, fn: (req: Request, res: Response) => Promise<unknown>) {
  return async (req: Request, res: Response) => {
    try {
      return await fn(req, res);
    } catch (err) {
      if (err instanceof AppError) return res.status(err.statusCode).json({ message: err.message });
      console.error(`[kanban.controller] ${nome}:`, err);
      return res.status(500).json({ message: mensagem500 });
    }
  };
}

/** GET /api/kanban/tarefas — Tarefas visíveis ao usuário. */
export const getTarefas = handler('getTarefas', 'Erro interno ao carregar as tarefas.', async (req, res) => {
  const tarefas = await listarTarefas(req.usuario!);
  return res.status(200).json({ tarefas });
});

/** GET /api/kanban/tarefas/:id — Tarefa com histórico e comentários. */
export const getTarefa = handler('getTarefa', 'Erro interno ao carregar a tarefa.', async (req, res) => {
  const detalhe = await detalharTarefa(req.usuario!, lerId(req));
  return res.status(200).json(detalhe);
});

/** GET /api/kanban/usuarios — Pessoas para os selects de responsável/solicitante. */
export const getUsuarios = handler('getUsuarios', 'Erro interno ao carregar os usuários.', async (_req, res) => {
  const usuarios = await listarUsuarios();
  return res.status(200).json({ usuarios });
});

/** POST /api/kanban/tarefas — Cria tarefa (própria ou solicitação). */
export const postTarefa = handler('postTarefa', 'Erro interno ao criar a tarefa.', async (req, res) => {
  const id = await criarTarefa(req.usuario!, req.body ?? {});
  return res.status(201).json({ id });
});

/** PUT /api/kanban/tarefas/:id — Edita/reatribui (coordenador ou criador). */
export const putTarefa = handler('putTarefa', 'Erro interno ao editar a tarefa.', async (req, res) => {
  await editarTarefa(req.usuario!, lerId(req), req.body ?? {});
  return res.status(200).json({ message: 'Tarefa atualizada.' });
});

/** DELETE /api/kanban/tarefas/:id — Remove (coordenador ou criador). */
export const deleteTarefa = handler('deleteTarefa', 'Erro interno ao excluir a tarefa.', async (req, res) => {
  await excluirTarefa(req.usuario!, lerId(req));
  return res.status(200).json({ message: 'Tarefa excluída.' });
});

/** PATCH /api/kanban/tarefas/:id/status — Drag-and-drop e botões Iniciar/Concluir. */
export const patchStatus = handler('patchStatus', 'Erro interno ao alterar o status.', async (req, res) => {
  await alterarStatus(req.usuario!, lerId(req), req.body?.status);
  return res.status(200).json({ message: 'Status atualizado.' });
});

/** PATCH /api/kanban/tarefas/:id/prioridade — Drag para/da coluna Urgente. */
export const patchPrioridade = handler('patchPrioridade', 'Erro interno ao alterar a prioridade.', async (req, res) => {
  await alterarPrioridade(req.usuario!, lerId(req), req.body?.prioridade);
  return res.status(200).json({ message: 'Prioridade atualizada.' });
});

/** POST /api/kanban/tarefas/:id/comentarios */
export const postComentario = handler('postComentario', 'Erro interno ao comentar.', async (req, res) => {
  await comentar(req.usuario!, lerId(req), req.body?.texto);
  return res.status(201).json({ message: 'Comentário registrado.' });
});

/** POST /api/kanban/tarefas/:id/cobrar — Cobra atualização do responsável. */
export const postCobranca = handler('postCobranca', 'Erro interno ao enviar a cobrança.', async (req, res) => {
  await cobrarAtualizacao(req.usuario!, lerId(req));
  return res.status(200).json({ message: 'Cobrança enviada.' });
});

/** POST /api/kanban/tarefas/:id/adiar-lembrete — Adia o lembrete em 10 minutos. */
export const postAdiarLembrete = handler('postAdiarLembrete', 'Erro interno ao adiar o lembrete.', async (req, res) => {
  await adiarLembrete(req.usuario!, lerId(req));
  return res.status(200).json({ message: 'Lembrete adiado.' });
});

/** GET /api/kanban/notificacoes — Polling: lembretes, vencimentos e avisos não entregues. */
export const getNotificacoes = handler('getNotificacoes', 'Erro interno ao carregar as notificações.', async (req, res) => {
  const notificacoes = await notificacoesPendentes(req.usuario!);
  return res.status(200).json({ notificacoes });
});
