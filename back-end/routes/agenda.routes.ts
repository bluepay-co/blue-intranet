import { Router } from 'express';
import { getEventos } from '../controllers/agenda.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const agendaRouter = Router();

// GET /api/agenda/eventos -> eventos do Google Calendar do usuário logado.
agendaRouter.get('/eventos', authMiddleware, getEventos);

export { agendaRouter };
