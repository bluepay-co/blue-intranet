import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { roleMiddleware } from '../middleware/role.middleware';
import { Role } from '../models/usuario.model';
import {
  getMeuResumo,
  getEquipe,
  postReuniao,
  putLigacoes,
} from '../controllers/prevendas.controller';

export const prevendasRouter = Router();

prevendasRouter.use(authMiddleware);

// Setor Pré-Vendas: SDRs e gestão (Diretoria/Dev). Métricas vêm das tabelas
// pv_* do banco da intranet — não do banco de produção.
const ACESSO = roleMiddleware(Role.PRE_VENDAS, Role.DIRETORIA, Role.DESENVOLVEDOR);

// ── Leitura ────────────────────────────────────────────────────────────────
// GET /api/prevendas/meu-resumo?mes=7&ano=2026
prevendasRouter.get('/meu-resumo', ACESSO, getMeuResumo);
// GET /api/prevendas/equipe?mes=7&ano=2026
prevendasRouter.get('/equipe', ACESSO, getEquipe);

// ── Escrita (lançamento) ───────────────────────────────────────────────────
// POST /api/prevendas/reunioes
prevendasRouter.post('/reunioes', ACESSO, postReuniao);
// PUT /api/prevendas/ligacoes  (upsert por semana)
prevendasRouter.put('/ligacoes', ACESSO, putLigacoes);
