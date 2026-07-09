import { Router } from 'express';
import {
  getEventos,
  getSalas,
  postEvento,
  patchEvento,
  deleteEvento,
} from '../controllers/agenda.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const agendaRouter = Router();

// Todas as rotas exigem sessão válida (Google Calendar do usuário logado).
agendaRouter.use(authMiddleware);

agendaRouter.get('/salas', getSalas);
agendaRouter.get('/eventos', getEventos);
agendaRouter.post('/eventos', postEvento);
agendaRouter.patch('/eventos/:id', patchEvento);
agendaRouter.delete('/eventos/:id', deleteEvento);

export { agendaRouter };
