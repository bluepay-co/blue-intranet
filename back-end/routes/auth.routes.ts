import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { loginGoogle, me, logout } from '../controllers/auth.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const authRouter = Router();

// skipSuccessfulRequests: empresa sai pelo mesmo IP (VPN/NAT).
const loginRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 50,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Muitas tentativas de login. Aguarde alguns minutos.' },
});

authRouter.post('/google', loginRateLimit, loginGoogle);
authRouter.get('/me', authMiddleware, me);
authRouter.post('/logout', authMiddleware, logout);

export { authRouter };
