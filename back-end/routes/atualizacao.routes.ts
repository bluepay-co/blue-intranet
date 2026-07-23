import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { roleMiddleware } from '../middleware/role.middleware';
import { Role } from '../models/usuario.model';
import {
  getRecentes,
  getTodas,
  postAtualizacao,
  putAtualizacao,
  deleteAtualizacao,
} from '../controllers/atualizacao.controller';

export const atualizacaoRouter = Router();

atualizacaoRouter.use(authMiddleware);

// GET /api/atualizacoes/recentes — avisos recentes para o card modal (qualquer usuário logado)
atualizacaoRouter.get('/recentes', getRecentes);

// Gestão dos avisos — restrita ao T.I. / Desenvolvedor
const GESTAO = roleMiddleware(Role.TI, Role.DESENVOLVEDOR);

atualizacaoRouter.get('/', GESTAO, getTodas);
atualizacaoRouter.post('/', GESTAO, postAtualizacao);
atualizacaoRouter.put('/:id', GESTAO, putAtualizacao);
atualizacaoRouter.delete('/:id', GESTAO, deleteAtualizacao);
