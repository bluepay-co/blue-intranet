import type { Request, Response } from 'express';
import { listarEventos } from '../services/agenda.service';
import { AppError } from '../utils/app-error';

/** Início do dia (00:00:00.000) da data informada. */
function inicioDoDia(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

/** Fim do dia (23:59:59.999) da data informada. */
function fimDoDia(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

/**
 * GET /api/agenda/eventos?inicio=ISO&fim=ISO  (protegida por authMiddleware)
 * Devolve os eventos do Google Calendar do usuário logado na janela informada.
 * Sem `inicio`/`fim`, assume o dia atual.
 */
export async function getEventos(req: Request, res: Response) {
  try {
    if (!req.usuario) {
      return res.status(401).json({ message: 'Usuário não autenticado.' });
    }

    const { inicio, fim } = req.query as { inicio?: string; fim?: string };
    const dtInicio = inicio ? new Date(inicio) : inicioDoDia(new Date());
    const dtFim = fim ? new Date(fim) : fimDoDia(new Date());

    if (Number.isNaN(dtInicio.getTime()) || Number.isNaN(dtFim.getTime())) {
      return res.status(400).json({ message: 'Parâmetros de data inválidos.' });
    }

    const eventos = await listarEventos(req.usuario.id, { inicio: dtInicio, fim: dtFim });
    return res.status(200).json({ eventos });
  } catch (err) {
    if (err instanceof AppError) {
      return res.status(err.statusCode).json({ message: err.message });
    }
    console.error('[agenda.controller] erro inesperado:', err);
    return res.status(500).json({ message: 'Erro interno ao carregar a agenda.' });
  }
}
