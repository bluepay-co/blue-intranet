import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { roleMiddleware } from '../middleware/role.middleware';
import { Role } from '../models/usuario.model';
import { getUsuarios, patchBloqueio, patchRole } from '../controllers/usuario.controller';

const usuarioRouter = Router();

// Domínio exclusivo da T.I (gestão de acessos e cargos).
usuarioRouter.use(authMiddleware, roleMiddleware(Role.TI, Role.DESENVOLVEDOR));

usuarioRouter.get('/', getUsuarios);
usuarioRouter.patch('/:id/bloqueio', patchBloqueio);
usuarioRouter.patch('/:id/role', patchRole);

export { usuarioRouter };
