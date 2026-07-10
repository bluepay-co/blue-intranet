import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { roleMiddleware } from '../middleware/role.middleware';
import { Role } from '../models/usuario.model';
import { getMeusClientes, getClienteDetalhe, getProspeccaoCnpj } from '../controllers/cliente.controller';

export const clienteRouter = Router();

clienteRouter.use(authMiddleware);

// Exclusivo dos vendedores (cada um vê apenas os próprios clientes).
const ACESSO = roleMiddleware(Role.KAM, Role.INSIGHT_SALES, Role.DESENVOLVEDOR);

// GET /api/clientes?busca=texto  — lista os clientes do vendedor logado
clienteRouter.get('/', ACESSO, getMeusClientes);

// GET /api/clientes/prospeccao?cnpj=00000000000000  — prospecção por CNPJ
// Registrar ANTES de '/:id' para o Express não casar "prospeccao" como id.
clienteRouter.get('/prospeccao', ACESSO, getProspeccaoCnpj);

// GET /api/clientes/:id  — ficha + métricas de um cliente (escopo do vendedor)
clienteRouter.get('/:id', ACESSO, getClienteDetalhe);
