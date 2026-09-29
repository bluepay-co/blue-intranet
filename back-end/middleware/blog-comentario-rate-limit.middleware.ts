import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import type { Request, Response } from 'express';

/**
 * Limite dos comentários do Blog (publicar e apagar). Cada comentário avisa em
 * tempo real todos que estão com a conversa aberta, e cada um busca de novo —
 * sem limite, um script comentando em loop multiplicaria requisições na empresa.
 * 10/min por usuário cobre com folga uma conversa real.
 * Chave por usuário (authMiddleware roda antes), IP só como fallback.
 */
export const blogComentarioRateLimit = rateLimit({
  windowMs: 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request): string =>
    req.usuario?.email ?? (req.ip ? ipKeyGenerator(req.ip) : 'anonimo'),
  handler: (_req: Request, res: Response) => {
    res.status(429).json({ message: 'Muitos comentários em pouco tempo. Aguarde um minuto e tente novamente.' });
  },
});
