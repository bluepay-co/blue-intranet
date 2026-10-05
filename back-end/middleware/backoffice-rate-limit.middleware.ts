import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import type { Request, Response } from 'express';

/**
 * Rate limit das rotas de chamado de infra. Diferente dos outros domínios,
 * aqui CADA requisição pode virar tráfego numa API externa compartilhada
 * (o BluePay Backoffice) — então as LEITURAS também entram no limite, não só
 * as escritas: um effect em loop no front não pode inundar terceiros.
 *
 * Chave por usuário logado (authMiddleware roda antes), fallback por IP — a
 * empresa inteira sai pelo mesmo IP via VPN/NAT, então chavear só por IP
 * derrubaria todo mundo junto.
 */

/**
 * Teto geral, mais rígido que o limite global de /api (~66/min sustentado) de
 * propósito: aqui cada requisição pode virar tráfego numa API de terceiro que
 * cai com frequência. Uso normal fica em ~2/min por aba, então 40/min sobra
 * para quem navega rápido e ainda pega effect em loop no front.
 */
export const backofficeRateLimit = rateLimit({
  windowMs: 60 * 1000,
  limit: 40,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request): string =>
    req.usuario?.email ?? (req.ip ? ipKeyGenerator(req.ip) : 'anonimo'),
  handler: (_req: Request, res: Response) => {
    res.status(429).json({ message: 'Muitas consultas aos chamados em pouco tempo. Aguarde um minuto.' });
  },
});

/** Escritas (abrir chamado, comentar, mudar status): barra spam que gera notificação. */
export const backofficeEscritaRateLimit = rateLimit({
  windowMs: 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req: Request) => req.method === 'GET',
  keyGenerator: (req: Request): string =>
    req.usuario?.email ?? (req.ip ? ipKeyGenerator(req.ip) : 'anonimo'),
  handler: (_req: Request, res: Response) => {
    res.status(429).json({ message: 'Muitas ações em pouco tempo. Aguarde um minuto e tente novamente.' });
  },
});
