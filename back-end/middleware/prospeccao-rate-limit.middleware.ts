import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import type { Request, Response } from 'express';

/**
 * Rate limit da prospecção por CNPJ: essa rota bate em APIs públicas de
 * terceiros (BrasilAPI/CNPJá) sem autenticação própria — um usuário
 * martelando CNPJs sequenciais pode estourar o limite gratuito dessas APIs
 * para toda a empresa. Chave por vendedor logado (authMiddleware roda antes),
 * com fallback por IP caso o token não esteja presente por algum motivo.
 */
export const prospeccaoRateLimit = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutos
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request): string =>
    req.usuario?.email ?? (req.ip ? ipKeyGenerator(req.ip) : 'anonimo'),
  handler: (_req: Request, res: Response) => {
    res.status(429).json({
      message: 'Muitas consultas de CNPJ em pouco tempo. Aguarde alguns minutos e tente novamente.',
    });
  },
});
