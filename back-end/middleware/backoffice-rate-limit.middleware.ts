import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import type { Request, Response } from 'express';

/**
 * Rate limit das rotas de chamado de infra. Diferente dos outros domínios, as
 * LEITURAS também entram no limite: cada GET pode virar tráfego na API externa
 * do backoffice, e um effect em loop no front não pode inundar terceiros.
 */

/** Chave por usuário: a empresa sai pelo mesmo NAT/VPN, IP só como fallback. */
const chavePorUsuario = (req: Request): string =>
  req.usuario?.email ?? (req.ip ? ipKeyGenerator(req.ip) : 'anonimo');

const comum = { windowMs: 60 * 1000, standardHeaders: true, legacyHeaders: false, keyGenerator: chavePorUsuario };

/** Mais rígido que o limite global (~66/min sustentado); uso normal é ~2/min por aba. */
export const backofficeRateLimit = rateLimit({
  ...comum,
  limit: 40,
  handler: (_req: Request, res: Response) => {
    res.status(429).json({ message: 'Muitas consultas aos chamados em pouco tempo. Aguarde um minuto.' });
  },
});

/** Escritas (abrir chamado, comentar, mudar status) geram notificação para outros. */
export const backofficeEscritaRateLimit = rateLimit({
  ...comum,
  limit: 20,
  skip: (req: Request) => req.method === 'GET',
  handler: (_req: Request, res: Response) => {
    res.status(429).json({ message: 'Muitas ações em pouco tempo. Aguarde um minuto e tente novamente.' });
  },
});
