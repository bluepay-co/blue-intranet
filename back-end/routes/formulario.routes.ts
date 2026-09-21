import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { roleMiddleware } from '../middleware/role.middleware';
import { Role } from '../models/usuario.model';
import {
  getConexao,
  postConexao,
  getFormularios,
  getFormulario,
  postFormulario,
  putFormulario,
  patchRecebimento,
  deleteFormulario,
  getRespostas,
} from '../controllers/formulario.controller';

const formularioRouter = Router();

formularioRouter.use(authMiddleware, roleMiddleware(Role.MARKETING, Role.DESENVOLVEDOR));

// `/conexao` antes de `/:id`.
formularioRouter.get('/conexao', getConexao);
formularioRouter.post('/conexao', postConexao);

formularioRouter.get('/', getFormularios);
formularioRouter.post('/', postFormulario);
formularioRouter.get('/:id', getFormulario);
formularioRouter.put('/:id', putFormulario);
formularioRouter.patch('/:id/recebimento', patchRecebimento);
formularioRouter.delete('/:id', deleteFormulario);
formularioRouter.get('/:id/respostas', getRespostas);

export { formularioRouter };
