import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { roleMiddleware } from '../middleware/role.middleware';
import { KANBAN_ROLES } from '../utils/equipes';
import { kanbanEscritaRateLimit } from '../middleware/kanban-rate-limit.middleware';
import {
  getTarefas,
  getTarefa,
  getUsuarios,
  postTarefa,
  putTarefa,
  deleteTarefa,
  patchStatus,
  patchPrioridade,
  postComentario,
  postCobranca,
  postAdiarLembrete,
  postItemChecklist,
  patchItemChecklist,
  deleteItemChecklist,
  getNotificacoes,
} from '../controllers/kanban.controller';

const kanbanRouter = Router();

// Restrito aos cargos com Kanban; o escopo por equipe/visibilidade é aplicado no service.
kanbanRouter.use(authMiddleware, roleMiddleware(...KANBAN_ROLES), kanbanEscritaRateLimit);

kanbanRouter.get('/usuarios', getUsuarios);
kanbanRouter.get('/notificacoes', getNotificacoes);

kanbanRouter.get('/tarefas', getTarefas);
kanbanRouter.post('/tarefas', postTarefa);
kanbanRouter.get('/tarefas/:id', getTarefa);
kanbanRouter.put('/tarefas/:id', putTarefa);
kanbanRouter.delete('/tarefas/:id', deleteTarefa);
kanbanRouter.patch('/tarefas/:id/status', patchStatus);
kanbanRouter.patch('/tarefas/:id/prioridade', patchPrioridade);
kanbanRouter.post('/tarefas/:id/comentarios', postComentario);
kanbanRouter.post('/tarefas/:id/cobrar', postCobranca);
kanbanRouter.post('/tarefas/:id/adiar-lembrete', postAdiarLembrete);
kanbanRouter.post('/tarefas/:id/checklist', postItemChecklist);
kanbanRouter.patch('/tarefas/:id/checklist/:itemId', patchItemChecklist);
kanbanRouter.delete('/tarefas/:id/checklist/:itemId', deleteItemChecklist);

export { kanbanRouter };
