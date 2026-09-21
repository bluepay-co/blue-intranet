import type { Request, Response } from 'express';
import {
  statusConexao,
  conectarGoogleForms,
  listarFormularios,
  obterFormulario,
  criarFormulario,
  atualizarFormulario,
  alterarRecebimento,
  excluirFormulario,
  listarRespostas,
} from '../services/formulario.service';
import { AppError } from '../utils/app-error';
import type { EntradaFormulario } from '../models/formulario.model';

async function responder(res: Response, acao: () => Promise<unknown>, status = 200) {
  try {
    const dado = await acao();
    return res.status(status).json(dado);
  } catch (err) {
    if (err instanceof AppError) {
      return res.status(err.statusCode).json({ message: err.message });
    }
    console.error('[formulario.controller] erro inesperado:', err);
    return res.status(500).json({ message: 'Erro interno ao processar o formulário.' });
  }
}

/** GET /api/formularios/conexao */
export async function getConexao(req: Request, res: Response) {
  return responder(res, async () => ({ conectado: await statusConexao(req.usuario!.id) }));
}

/** POST /api/formularios/conexao  body: { code } */
export async function postConexao(req: Request, res: Response) {
  return responder(res, async () => {
    await conectarGoogleForms(req.usuario!.id, req.usuario!.email, req.body?.code);
    return { conectado: true };
  });
}

/** GET /api/formularios */
export async function getFormularios(_req: Request, res: Response) {
  return responder(res, async () => ({ formularios: await listarFormularios() }));
}

/** GET /api/formularios/:id */
export async function getFormulario(req: Request, res: Response) {
  return responder(res, async () => ({ formulario: await obterFormulario(req.params.id) }));
}

/** POST /api/formularios */
export async function postFormulario(req: Request, res: Response) {
  const entrada = req.body as EntradaFormulario;
  return responder(
    res,
    async () => ({ formulario: await criarFormulario(req.usuario!.id, entrada) }),
    201,
  );
}

/** PUT /api/formularios/:id */
export async function putFormulario(req: Request, res: Response) {
  const entrada = req.body as EntradaFormulario;
  return responder(res, async () => ({
    formulario: await atualizarFormulario(req.params.id, entrada),
  }));
}

/** PATCH /api/formularios/:id/recebimento  body: { aceitando } */
export async function patchRecebimento(req: Request, res: Response) {
  return responder(res, async () => ({
    aceitandoRespostas: await alterarRecebimento(req.params.id, req.body?.aceitando),
  }));
}

/** DELETE /api/formularios/:id */
export async function deleteFormulario(req: Request, res: Response) {
  return responder(res, async () => {
    await excluirFormulario(req.params.id);
    return { ok: true };
  });
}

/** GET /api/formularios/:id/respostas */
export async function getRespostas(req: Request, res: Response) {
  return responder(res, async () => listarRespostas(req.params.id));
}
