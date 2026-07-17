import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { meuResumo, topClientes, minhaEquipe, metricasGerais, visaoGeral } from '../controllers/metricas.controller';

export const metricasRouter = Router();

metricasRouter.use(authMiddleware);

// GET /api/metricas/meu-resumo?mes=6&ano=2026
metricasRouter.get('/meu-resumo', meuResumo);

// GET /api/metricas/visao-geral?mes=6&ano=2026 — novos clientes/receita por dia e semana + previsão
metricasRouter.get('/visao-geral', visaoGeral);

// GET /api/metricas/top-clientes?mes=6&ano=2026&limite=10
metricasRouter.get('/top-clientes', topClientes);

// GET /api/metricas/equipe?mes=6&ano=2026
metricasRouter.get('/equipe', minhaEquipe);

// GET /api/metricas/geral?mes=6&ano=2026  — visão consolidada, qualquer role
metricasRouter.get('/geral', metricasGerais);
