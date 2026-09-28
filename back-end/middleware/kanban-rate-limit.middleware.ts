import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import type { Request, Response } from 'express';

/**
 * Rate limit das escritas do Kanban (criar, editar, mover, comentar, cobrar…).
 * Leituras (quadro e polling de notificações) ficam só no limite global de /api.
 * Chave por usuário logado (authMiddleware roda antes), fallback por IP.
 * 60/min cobre com folga o uso real (arrastar vários cards, conversar) e barra
 * scripts inundando comentários/cobranças — que viram notificação para outros.
 */
export const kanbanEscritaRateLimit = rateLimit({
  windowMs: 60 * 1000,
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req: Request) => req.method === 'GET',
  keyGenerator: (req: Request): string =>
    req.usuario?.email ?? (req.ip ? ipKeyGenerator(req.ip) : 'anonimo'),
  handler: (_req: Request, res: Response) => {
    res.status(429).json({ message: 'Muitas ações em pouco tempo. Aguarde um minuto e tente novamente.' });
  },
});
