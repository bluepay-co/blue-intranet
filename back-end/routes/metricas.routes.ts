import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { meuResumo, topClientes, minhaEquipe } from '../controllers/metricas.controller';

export const metricasRouter = Router();

metricasRouter.use(authMiddleware);

// GET /api/metricas/meu-resumo?mes=6&ano=2026
metricasRouter.get('/meu-resumo', meuResumo);

// GET /api/metricas/top-clientes?mes=6&ano=2026&limite=10
metricasRouter.get('/top-clientes', topClientes);

// GET /api/metricas/equipe?mes=6&ano=2026
metricasRouter.get('/equipe', minhaEquipe);
