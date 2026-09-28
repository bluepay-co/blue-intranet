import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import type { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import type { AuthPayload } from './auth.middleware';

/**
 * Identifica o usuário pelo JWT do header, sem exigir autenticação (o limiter
 * roda antes das rotas). Token ausente/inválido -> null (cai na chave por IP).
 * Usa verify (não decode) para ninguém forjar ids e fugir do próprio limite.
 */
const cache = new WeakMap<Request, AuthPayload | null>();

function usuarioDoToken(req: Request): AuthPayload | null {
  if (cache.has(req)) return cache.get(req) ?? null;
  const header = req.headers.authorization;
  const secret = process.env.JWT_SECRET;
  let usuario: AuthPayload | null = null;
  if (header?.startsWith('Bearer ') && secret) {
    try {
      usuario = jwt.verify(header.slice(7).trim(), secret) as AuthPayload;
    } catch {
      usuario = null;
    }
  }
  cache.set(req, usuario);
  return usuario;
}

/**
 * Rede de segurança contra flood/DoS em /api.
 *
 * A chave é o usuário logado, não o IP: a empresa sai pela mesma VPN/NAT, e
 * com chave por IP o polling de todas as abas abertas somava num balde só —
 * quando enchia, ninguém mais conseguia nem logar. Sem token válido, conta por
 * IP com um teto menor (só login e rotas públicas passam por aí).
 *
 * O login (/api/auth/google) fica de fora: tem limitador próprio em auth.routes.
 */
export const apiRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: (req: Request) => (usuarioDoToken(req) ? 1000 : 300),
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req: Request) => req.path === '/auth/google',
  keyGenerator: (req: Request): string => {
    const usuario = usuarioDoToken(req);
    if (usuario) return `usuario:${usuario.id}`;
    return `ip:${req.ip ? ipKeyGenerator(req.ip) : 'anonimo'}`;
  },
  handler: (_req: Request, res: Response) => {
    res.status(429).json({ message: 'Muitas requisições. Tente novamente em alguns minutos.' });
  },
});
