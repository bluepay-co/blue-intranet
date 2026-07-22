import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { roleMiddleware } from '../middleware/role.middleware';
import { Role } from '../models/usuario.model';
import {
  getMembrosEquipe,
  getClientesEquipe,
  getClienteEquipeDetalhe,
  getReceitasEquipe,
  getRankingPeriodo,
} from '../controllers/gerente.controller';

export const gerenteRouter = Router();

gerenteRouter.use(authMiddleware);

const ACESSO = roleMiddleware(Role.GERENTE_INSIDE_CX, Role.DESENVOLVEDOR);

// GET /api/gerente/membros — lista {id, nome} do time gerenciado (dropdown de filtro)
gerenteRouter.get('/membros', ACESSO, getMembrosEquipe);

// GET /api/gerente/clientes?vendedorId=  — clientes de toda a equipe ou de um vendedor específico
gerenteRouter.get('/clientes', ACESSO, getClientesEquipe);

// GET /api/gerente/clientes/:id  — ficha do cliente (escopo: qualquer vendedor da equipe)
gerenteRouter.get('/clientes/:id', ACESSO, getClienteEquipeDetalhe);

// GET /api/gerente/receitas?vendedorId=&mes=&ano=  — receita por dia/semana do mês, equipe ou vendedor específico
gerenteRouter.get('/receitas', ACESSO, getReceitasEquipe);

// GET /api/gerente/ranking-periodo?periodo=dia|semana  — ranking da equipe hoje ou na semana atual
gerenteRouter.get('/ranking-periodo', ACESSO, getRankingPeriodo);
