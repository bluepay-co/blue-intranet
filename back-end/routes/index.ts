import { Router } from 'express';
import { authRouter } from './auth.routes';

const router = Router();


// Domínio: Autenticação (Google Workspace + JWT)
router.use('/api/auth', authRouter);

export { router };