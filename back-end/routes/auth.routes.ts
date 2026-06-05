import { Router } from 'express';
import { loginGoogle } from '../controllers/auth.controller';

const authRouter = Router();

// POST /api/auth/google -> troca o code do Google por um JWT de sessão.
authRouter.post('/google', loginGoogle);

export { authRouter };
