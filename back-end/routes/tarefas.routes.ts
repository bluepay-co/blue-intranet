import { Router } from 'express';
import {
  getTarefas,
  postTarefa,
  patchTarefa,
  deleteTarefa,
} from '../controllers/tarefas.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const tarefasRouter = Router();

// Todas as rotas exigem sessão válida (Google Tasks do usuário logado).
tarefasRouter.use(authMiddleware);

tarefasRouter.get('/', getTarefas);
tarefasRouter.post('/', postTarefa);
tarefasRouter.patch('/:id', patchTarefa);
tarefasRouter.delete('/:id', deleteTarefa);

export { tarefasRouter };
