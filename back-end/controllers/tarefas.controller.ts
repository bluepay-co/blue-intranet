import type { Request, Response } from 'express';
import {
  listarTarefas,
  criarTarefa,
  atualizarTarefa,
  removerTarefa,
} from '../services/tarefas.service';
import { AppError } from '../utils/app-error';
import type { EntradaTarefa } from '../models/tarefa.model';

/** Orquestra a resposta tratando AppError -> status coerente. */
async function responder(res: Response, acao: () => Promise<unknown>) {
  try {
    const dado = await acao();
    return res.status(200).json(dado);
  } catch (err) {
    if (err instanceof AppError) {
      return res.status(err.statusCode).json({ message: err.message });
    }
    console.error('[tarefas.controller] erro inesperado:', err);
    return res.status(500).json({ message: 'Erro interno ao processar a tarefa.' });
  }
}

/** GET /api/tarefas */
export async function getTarefas(req: Request, res: Response) {
  if (!req.usuario) return res.status(401).json({ message: 'Usuário não autenticado.' });
  return responder(res, async () => ({ tarefas: await listarTarefas(req.usuario!.id) }));
}

/** POST /api/tarefas */
export async function postTarefa(req: Request, res: Response) {
  if (!req.usuario) return res.status(401).json({ message: 'Usuário não autenticado.' });
  const entrada = req.body as EntradaTarefa;
  return responder(res, async () => ({ tarefa: await criarTarefa(req.usuario!.id, entrada) }));
}

/** PATCH /api/tarefas/:id */
export async function patchTarefa(req: Request, res: Response) {
  if (!req.usuario) return res.status(401).json({ message: 'Usuário não autenticado.' });
  const entrada = req.body as EntradaTarefa;
  const id = req.params.id as string;
  return responder(res, async () => ({
    tarefa: await atualizarTarefa(req.usuario!.id, id, entrada),
  }));
}

/** DELETE /api/tarefas/:id */
export async function deleteTarefa(req: Request, res: Response) {
  if (!req.usuario) return res.status(401).json({ message: 'Usuário não autenticado.' });
  const id = req.params.id as string;
  return responder(res, async () => {
    await removerTarefa(req.usuario!.id, id);
    return { ok: true };
  });
}
