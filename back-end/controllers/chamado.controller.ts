import type { Request, Response } from 'express';
import { AppError } from '../utils/app-error';
import {
  criarChamado,
  listarMeusChamados,
  listarTodos,
  listarChamadosCX,
  listarChamadosProdutos,
  buscarChamado,
  editarChamado,
  alterarStatus,
  adicionarComentario,
  resumoChamados,
  dashboardTI,
} from '../services/chamado.service';

/** POST /api/chamados — abre um chamado (multipart, anexo opcional). */
export async function postCriar(req: Request, res: Response) {
  try {
    const { titulo, descricao, categoria, criticidade } = req.body as {
      titulo?: string;
      descricao?: string;
      categoria?: string;
      criticidade?: string;
    };

    const { identificadorUrl } = req.body as { identificadorUrl?: string };

    const chamado = await criarChamado(req.usuario!.id, {
      titulo: titulo ?? '',
      descricao: descricao ?? '',
      categoria: categoria ?? '',
      criticidade: criticidade ?? '',
      anexoUrl: req.file ? `/uploads/chamados/${req.file.filename}` : null,
      anexoNome: req.file ? req.file.originalname : null,
      anexoMime: req.file ? req.file.mimetype : null,
      identificadorUrl: identificadorUrl?.trim() || null,
    });

    return res.status(201).json({ chamado });
  } catch (err) {
    if (err instanceof AppError) return res.status(err.statusCode).json({ message: err.message });
    console.error('[chamado.controller] postCriar:', err);
    return res.status(500).json({ message: 'Erro interno ao abrir o chamado.' });
  }
}

/** GET /api/chamados — chamados do próprio usuário. */
export async function getMeus(req: Request, res: Response) {
  try {
    const chamados = await listarMeusChamados(req.usuario!.id);
    return res.status(200).json({ chamados });
  } catch (err) {
    if (err instanceof AppError) return res.status(err.statusCode).json({ message: err.message });
    console.error('[chamado.controller] getMeus:', err);
    return res.status(500).json({ message: 'Erro interno ao listar seus chamados.' });
  }
}

/** GET /api/chamados/admin/todos — todos os chamados (T.I.). */
export async function getTodos(req: Request, res: Response) {
  try {
    const { status, categoria, criticidade, busca } = req.query as {
      status?: string;
      categoria?: string;
      criticidade?: string;
      busca?: string;
    };
    const chamados = await listarTodos({ status, categoria, criticidade, busca });
    return res.status(200).json({ chamados });
  } catch (err) {
    if (err instanceof AppError) return res.status(err.statusCode).json({ message: err.message });
    console.error('[chamado.controller] getTodos:', err);
    return res.status(500).json({ message: 'Erro interno ao listar os chamados.' });
  }
}

/** GET /api/chamados/admin/dashboard — métricas globais (T.I.). */
export async function getDashboard(_req: Request, res: Response) {
  try {
    const dados = await dashboardTI();
    return res.status(200).json(dados);
  } catch (err) {
    if (err instanceof AppError) return res.status(err.statusCode).json({ message: err.message });
    console.error('[chamado.controller] getDashboard:', err);
    return res.status(500).json({ message: 'Erro interno ao carregar o painel.' });
  }
}

/** GET /api/chamados/produtos/todos — chamados do CX visíveis para o time de Produtos. */
export async function getChamadosProdutos(req: Request, res: Response) {
  try {
    const { busca } = req.query as { busca?: string };
    const chamados = await listarChamadosProdutos({ busca });
    return res.status(200).json({ chamados });
  } catch (err) {
    if (err instanceof AppError) return res.status(err.statusCode).json({ message: err.message });
    console.error('[chamado.controller] getChamadosProdutos:', err);
    return res.status(500).json({ message: 'Erro interno ao listar os chamados de Produtos.' });
  }
}

/** GET /api/chamados/cx/todos — todos os chamados do time CX. */
export async function getChamadosCX(req: Request, res: Response) {
  try {
    const { busca } = req.query as { busca?: string };
    const chamados = await listarChamadosCX({ busca });
    return res.status(200).json({ chamados });
  } catch (err) {
    if (err instanceof AppError) return res.status(err.statusCode).json({ message: err.message });
    console.error('[chamado.controller] getChamadosCX:', err);
    return res.status(500).json({ message: 'Erro interno ao listar os chamados do CX.' });
  }
}

/** GET /api/chamados/resumo — resumo leve p/ notificações. */
export async function getResumo(req: Request, res: Response) {
  try {
    const chamados = await resumoChamados(req.usuario!);
    return res.status(200).json({ chamados });
  } catch (err) {
    if (err instanceof AppError) return res.status(err.statusCode).json({ message: err.message });
    console.error('[chamado.controller] getResumo:', err);
    return res.status(500).json({ message: 'Erro interno ao carregar o resumo.' });
  }
}

/** GET /api/chamados/:id — ficha completa + chat (isolamento no service). */
export async function getChamado(req: Request, res: Response) {
  try {
    const chamado = await buscarChamado(req.params.id, req.usuario!);
    return res.status(200).json({ chamado });
  } catch (err) {
    if (err instanceof AppError) return res.status(err.statusCode).json({ message: err.message });
    console.error('[chamado.controller] getChamado:', err);
    return res.status(500).json({ message: 'Erro interno ao carregar o chamado.' });
  }
}

/** PUT /api/chamados/:id — edita título/descrição (dono, só se ABERTO). */
export async function putEditar(req: Request, res: Response) {
  try {
    const { titulo, descricao } = req.body as { titulo?: string; descricao?: string };
    const chamado = await editarChamado(req.params.id, req.usuario!.id, {
      titulo: titulo ?? '',
      descricao: descricao ?? '',
    });
    return res.status(200).json({ chamado });
  } catch (err) {
    if (err instanceof AppError) return res.status(err.statusCode).json({ message: err.message });
    console.error('[chamado.controller] putEditar:', err);
    return res.status(500).json({ message: 'Erro interno ao editar o chamado.' });
  }
}

/** PATCH /api/chamados/:id/status — altera o status (T.I.). */
export async function patchStatus(req: Request, res: Response) {
  try {
    const { status } = req.body as { status?: unknown };
    const chamado = await alterarStatus(req.params.id, req.usuario!.id, status);
    return res.status(200).json({ chamado });
  } catch (err) {
    if (err instanceof AppError) return res.status(err.statusCode).json({ message: err.message });
    console.error('[chamado.controller] patchStatus:', err);
    return res.status(500).json({ message: 'Erro interno ao alterar o status.' });
  }
}

/** POST /api/chamados/:id/comentarios — envia mensagem cifrada ao chat. */
export async function postComentario(req: Request, res: Response) {
  try {
    const { conteudo } = req.body as { conteudo?: unknown };
    const comentario = await adicionarComentario(req.params.id, req.usuario!, conteudo);
    return res.status(201).json({ comentario });
  } catch (err) {
    if (err instanceof AppError) return res.status(err.statusCode).json({ message: err.message });
    console.error('[chamado.controller] postComentario:', err);
    return res.status(500).json({ message: 'Erro interno ao enviar a mensagem.' });
  }
}
