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
