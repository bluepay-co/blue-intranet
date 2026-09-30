import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import type { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { JWT_ALGORITHM } from './auth-constants';
import type { AuthPayload } from './auth.middleware';

const cache = new WeakMap<Request, AuthPayload | null>();
const VERIFY_OPTS = { algorithms: [JWT_ALGORITHM] as [typeof JWT_ALGORITHM] };

function usuarioDoToken(req: Request): AuthPayload | null {
  if (cache.has(req)) return cache.get(req) ?? null;
  const header = req.headers.authorization;
  const secret = process.env.JWT_SECRET;
  let usuario: AuthPayload | null = null;
  if (header?.startsWith('Bearer ') && secret) {
    try {
      usuario = jwt.verify(header.slice(7).trim(), secret, VERIFY_OPTS) as AuthPayload;
    } catch {
      usuario = null;
    }
  }
  cache.set(req, usuario);
  return usuario;
}

// Chave por usuário logado (não IP) — a empresa sai pelo mesmo NAT/VPN.
// Login (/api/auth/google) fica de fora: tem limitador próprio.
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
