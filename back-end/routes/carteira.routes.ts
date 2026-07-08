import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { roleMiddleware } from '../middleware/role.middleware';
import { Role } from '../models/usuario.model';
import { getRadarRisco, getCrossSell } from '../controllers/carteira.controller';

export const carteiraRouter = Router();

carteiraRouter.use(authMiddleware);

// Exclusivo dos vendedores (cada um vê apenas a própria carteira).
const ACESSO = roleMiddleware(Role.KAM, Role.INSIGHT_SALES, Role.DESENVOLVEDOR);

// GET /api/carteira/risco       — clientes em risco/queda do vendedor logado
carteiraRouter.get('/risco', ACESSO, getRadarRisco);

// GET /api/carteira/cross-sell  — clientes com produto faltando (potencial)
carteiraRouter.get('/cross-sell', ACESSO, getCrossSell);
