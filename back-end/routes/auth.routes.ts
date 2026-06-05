import { Router } from 'express';
import { loginGoogle, me } from '../controllers/auth.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const authRouter = Router();

// POST /api/auth/google -> troca o code do Google por um JWT de sessão.
authRouter.post('/google', loginGoogle);

// GET /api/auth/me -> dados do usuário logado (valida o JWT da sessão).
authRouter.get('/me', authMiddleware, me);

export { authRouter };
