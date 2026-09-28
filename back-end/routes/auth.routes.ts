import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { loginGoogle, me } from '../controllers/auth.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const authRouter = Router();

// Conta só as tentativas que falham (skipSuccessfulRequests): a VPN da empresa
// faz NAT e todo mundo loga pelo mesmo IP de manhã — logins válidos não podem
// gastar o limite. Ainda barra tentativas automatizadas de troca de `code`
// (que consomem cota da API do Google e podem ser usadas para abuso).
const loginRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 50,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Muitas tentativas de login. Aguarde alguns minutos.' },
});

// POST /api/auth/google -> troca o code do Google por um JWT de sessão.
authRouter.post('/google', loginRateLimit, loginGoogle);

// GET /api/auth/me -> dados do usuário logado (valida o JWT da sessão).
authRouter.get('/me', authMiddleware, me);

export { authRouter };
