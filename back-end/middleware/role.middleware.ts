import type { Request, Response, NextFunction } from 'express';
import { Role } from '../models/usuario.model';

/**
 * Restringe a rota aos cargos informados (RBAC). Deve ser usado SEMPRE depois
 * do `authMiddleware`, que popula `req.usuario`.
 *
 * @example router.get('/rh', authMiddleware, roleMiddleware(Role.RH, Role.TI), handler)
 */
export function roleMiddleware(...rolesPermitidos: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const usuario = req.usuario;

    if (!usuario) {
      return res.status(401).json({ message: 'Usuário não autenticado.' });
    }

    if (!rolesPermitidos.includes(usuario.role)) {
      return res.status(403).json({ message: 'Acesso negado para o seu cargo.' });
    }

    return next();
  };
}

/**
 * Inverso do `roleMiddleware`: libera todos os cargos MENOS os informados.
 * Existe para não precisar listar os outros ~15 cargos (lista que ficaria
 * desatualizada a cada cargo novo) quando a regra é "todos, exceto estes".
 *
 * @example router.post('/', authMiddleware, roleBloqueadoMiddleware(Role.TI), handler)
 */
export function roleBloqueadoMiddleware(...rolesBloqueados: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const usuario = req.usuario;

    if (!usuario) {
      return res.status(401).json({ message: 'Usuário não autenticado.' });
    }

    if (rolesBloqueados.includes(usuario.role)) {
      return res.status(403).json({ message: 'Acesso negado para o seu cargo.' });
    }

    return next();
  };
}
