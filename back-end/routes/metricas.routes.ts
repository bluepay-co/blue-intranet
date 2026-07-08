import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { meuResumo, topClientes, minhaEquipe, metricasGerais, meuResumoCX, equipeResumoCX } from '../controllers/metricas.controller';

export const metricasRouter = Router();

metricasRouter.use(authMiddleware);

// GET /api/metricas/meu-resumo?mes=6&ano=2026
metricasRouter.get('/meu-resumo', meuResumo);

// GET /api/metricas/top-clientes?mes=6&ano=2026&limite=10
metricasRouter.get('/top-clientes', topClientes);

// GET /api/metricas/equipe?mes=6&ano=2026
metricasRouter.get('/equipe', minhaEquipe);

// GET /api/metricas/geral?mes=6&ano=2026  — visão consolidada, qualquer role
metricasRouter.get('/geral', metricasGerais);

// GET /api/metricas/meu-resumo-cx?mes=6&ano=2026
metricasRouter.get('/meu-resumo-cx', meuResumoCX);

// GET /api/metricas/equipe-cx?mes=6&ano=2026
metricasRouter.get('/equipe-cx', equipeResumoCX);
