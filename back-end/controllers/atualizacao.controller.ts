import type { Request, Response } from 'express';
import { AppError } from '../utils/app-error';
import {
  listarTodas,
  listarRecentes,
  criar,
  atualizar,
  remover,
} from '../services/atualizacao.service';

/**
 * Categorias aceitas — espelham o catálogo do front
 * (`front-end/src/lib/categoriasAtualizacao.js`). Ao criar uma categoria nova,
 * adicione aqui também. Valor desconhecido cai no padrão.
 */
const CATEGORIAS_VALIDAS = ['ATUALIZACAO', 'AVISO', 'NOVIDADE', 'MANUTENCAO'];
const CATEGORIA_PADRAO = 'ATUALIZACAO';

/** Lê e valida título (obrigatório), descrição (obrigatória), categoria e agendamento (opcional). */
function lerCorpo(req: Request): { titulo: string; subtitulo: string | null; categoria: string; publicarEm: Date | null } {
  const titulo = typeof req.body?.titulo === 'string' ? req.body.titulo.trim() : '';
  if (!titulo) throw new AppError('O título é obrigatório.', 400);
  if (titulo.length > 120) throw new AppError('O título deve ter no máximo 120 caracteres.', 400);

  const subBruto = typeof req.body?.subtitulo === 'string' ? req.body.subtitulo.trim() : '';
  if (!subBruto) throw new AppError('A descrição é obrigatória.', 400);
  if (subBruto.length > 2000) throw new AppError('A descrição deve ter no máximo 2000 caracteres.', 400);

  const catBruta = typeof req.body?.categoria === 'string' ? req.body.categoria.trim().toUpperCase() : '';
  const categoria = CATEGORIAS_VALIDAS.includes(catBruta) ? catBruta : CATEGORIA_PADRAO;

  const pubBruto = typeof req.body?.publicar_em === 'string' ? req.body.publicar_em.trim() : '';
  let publicarEm: Date | null = null;
  if (pubBruto) {
    const d = new Date(pubBruto);
    if (Number.isNaN(d.getTime())) throw new AppError('Data de agendamento inválida.', 400);
    publicarEm = d;
  }

  return { titulo, subtitulo: subBruto, categoria, publicarEm };
}

function lerId(req: Request): number {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) throw new AppError('Identificador inválido.', 400);
  return id;
}

/** GET /api/atualizacoes/recentes — avisos recentes para o card (qualquer usuário logado). */
export async function getRecentes(_req: Request, res: Response) {
  try {
    const atualizacoes = await listarRecentes();
    return res.status(200).json({ atualizacoes });
  } catch (err) {
    if (err instanceof AppError) return res.status(err.statusCode).json({ message: err.message });
    console.error('[atualizacao.controller] getRecentes:', err);
    return res.status(500).json({ message: 'Erro ao buscar as atualizações.' });
  }
}

/** GET /api/atualizacoes — lista completa (T.I.). */
export async function getTodas(_req: Request, res: Response) {
  try {
    const atualizacoes = await listarTodas();
    return res.status(200).json({ atualizacoes });
  } catch (err) {
    if (err instanceof AppError) return res.status(err.statusCode).json({ message: err.message });
    console.error('[atualizacao.controller] getTodas:', err);
    return res.status(500).json({ message: 'Erro ao buscar as atualizações.' });
  }
}

/** POST /api/atualizacoes — cria um aviso (T.I.). */
export async function postAtualizacao(req: Request, res: Response) {
  try {
    const { titulo, subtitulo, categoria, publicarEm } = lerCorpo(req);
    const criadoPor = req.usuario?.id ?? null;
    const atualizacao = await criar(titulo, subtitulo, categoria, publicarEm, criadoPor);
    return res.status(201).json({ atualizacao });
  } catch (err) {
    if (err instanceof AppError) return res.status(err.statusCode).json({ message: err.message });
    console.error('[atualizacao.controller] postAtualizacao:', err);
    return res.status(500).json({ message: 'Erro ao criar a atualização.' });
  }
}

/** PUT /api/atualizacoes/:id — edita um aviso (T.I.). */
export async function putAtualizacao(req: Request, res: Response) {
  try {
    const id = lerId(req);
    const { titulo, subtitulo, categoria, publicarEm } = lerCorpo(req);
    const atualizacao = await atualizar(id, titulo, subtitulo, categoria, publicarEm);
    if (!atualizacao) return res.status(404).json({ message: 'Atualização não encontrada.' });
    return res.status(200).json({ atualizacao });
  } catch (err) {
    if (err instanceof AppError) return res.status(err.statusCode).json({ message: err.message });
    console.error('[atualizacao.controller] putAtualizacao:', err);
    return res.status(500).json({ message: 'Erro ao editar a atualização.' });
  }
}

/** DELETE /api/atualizacoes/:id — remove um aviso (T.I.). */
export async function deleteAtualizacao(req: Request, res: Response) {
  try {
    const id = lerId(req);
    const removido = await remover(id);
    if (!removido) return res.status(404).json({ message: 'Atualização não encontrada.' });
    return res.status(204).send();
  } catch (err) {
    if (err instanceof AppError) return res.status(err.statusCode).json({ message: err.message });
    console.error('[atualizacao.controller] deleteAtualizacao:', err);
    return res.status(500).json({ message: 'Erro ao remover a atualização.' });
  }
}
