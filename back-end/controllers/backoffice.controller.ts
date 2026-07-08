import type { Request, Response } from 'express';
import { AppError } from '../utils/app-error';
import {
  criarChamado, editarChamado, listarMeus, listarTodos, buscarChamado,
  adicionarComentario, alterarStatus, resumo, dashboard,
} from '../services/backoffice.service';

export async function postCriar(req: Request, res: Response) {
  try {
    const usuario = req.usuario;
    if (!usuario) throw new AppError('Usuário não autenticado.', 401);

    const anexo = req.file
      ? { buffer: req.file.buffer, originalname: req.file.originalname, mimetype: req.file.mimetype }
      : undefined;

    const criado = await criarChamado(
      { id: usuario.id, email: usuario.email },
      {
        titulo: req.body?.titulo,
        descricao: req.body?.descricao,
        categoria: req.body?.categoria,
        criticidade: req.body?.criticidade,
        patrimonio: req.body?.patrimonio ?? null,
      },
      anexo,
    );
    return res.status(201).json({ chamado: criado });
  } catch (err) {
    if (err instanceof AppError) return res.status(err.statusCode).json({ message: err.message });
    console.error('[backoffice.controller] postCriar:', err);
    return res.status(500).json({ message: 'Erro ao abrir o chamado.' });
  }
}

export async function putEditar(req: Request, res: Response) {
  try {
    const usuario = req.usuario;
    if (!usuario) throw new AppError('Usuário não autenticado.', 401);
    const chamado = await editarChamado(
      { id: usuario.id, email: usuario.email },
      req.params.id,
      { titulo: req.body?.titulo, descricao: req.body?.descricao },
    );
    return res.status(200).json({ chamado });
  } catch (err) {
    if (err instanceof AppError) return res.status(err.statusCode).json({ message: err.message });
    console.error('[backoffice.controller] putEditar:', err);
    return res.status(500).json({ message: 'Erro ao editar o chamado.' });
  }
}

export async function getMeus(req: Request, res: Response) {
  try {
    const id = req.usuario?.id;
    if (!id) throw new AppError('Usuário não autenticado.', 401);
    const chamados = await listarMeus(id);
    return res.status(200).json({ chamados });
  } catch (err) {
    if (err instanceof AppError) return res.status(err.statusCode).json({ message: err.message });
    console.error('[backoffice.controller] getMeus:', err);
    return res.status(500).json({ message: 'Erro ao listar chamados.' });
  }
}

export async function getTodos(req: Request, res: Response) {
  try {
    const chamados = await listarTodos({
      status: req.query.status as string | undefined,
      categoria: req.query.categoria as string | undefined,
      criticidade: req.query.criticidade as string | undefined,
      busca: req.query.busca as string | undefined,
    });
    return res.status(200).json({ chamados });
  } catch (err) {
    if (err instanceof AppError) return res.status(err.statusCode).json({ message: err.message });
    console.error('[backoffice.controller] getTodos:', err);
    return res.status(500).json({ message: 'Erro ao listar chamados.' });
  }
}

export async function getChamado(req: Request, res: Response) {
  try {
    const usuario = req.usuario;
    if (!usuario) throw new AppError('Usuário não autenticado.', 401);
    const chamado = await buscarChamado({ id: usuario.id, role: usuario.role }, req.params.id);
    return res.status(200).json({ chamado });
  } catch (err) {
    if (err instanceof AppError) return res.status(err.statusCode).json({ message: err.message });
    console.error('[backoffice.controller] getChamado:', err);
    return res.status(500).json({ message: 'Erro ao buscar o chamado.' });
  }
}

export async function postComentario(req: Request, res: Response) {
  try {
    const usuario = req.usuario;
    if (!usuario) throw new AppError('Usuário não autenticado.', 401);
    const comentario = await adicionarComentario(
      { id: usuario.id, role: usuario.role, email: usuario.email },
      req.params.id,
      req.body?.conteudo,
    );
    return res.status(201).json({ comentario });
  } catch (err) {
    if (err instanceof AppError) return res.status(err.statusCode).json({ message: err.message });
    console.error('[backoffice.controller] postComentario:', err);
    return res.status(500).json({ message: 'Erro ao enviar o comentário.' });
  }
}

export async function patchStatus(req: Request, res: Response) {
  try {
    const chamado = await alterarStatus(req.params.id, req.body?.status);
    return res.status(200).json({ chamado });
  } catch (err) {
    if (err instanceof AppError) return res.status(err.statusCode).json({ message: err.message });
    console.error('[backoffice.controller] patchStatus:', err);
    return res.status(500).json({ message: 'Erro ao alterar o status.' });
  }
}

export async function getResumo(req: Request, res: Response) {
  try {
    const usuario = req.usuario;
    if (!usuario) throw new AppError('Usuário não autenticado.', 401);
    const chamados = await resumo({ id: usuario.id, role: usuario.role });
    return res.status(200).json({ chamados });
  } catch (err) {
    if (err instanceof AppError) return res.status(err.statusCode).json({ message: err.message });
    console.error('[backoffice.controller] getResumo:', err);
    return res.status(500).json({ message: 'Erro ao buscar o resumo.' });
  }
}

export async function getDashboard(_req: Request, res: Response) {
  try {
    const dados = await dashboard();
    return res.status(200).json(dados);
  } catch (err) {
    if (err instanceof AppError) return res.status(err.statusCode).json({ message: err.message });
    console.error('[backoffice.controller] getDashboard:', err);
    return res.status(500).json({ message: 'Erro ao carregar o dashboard.' });
  }
}
