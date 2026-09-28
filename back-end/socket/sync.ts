import type { Request, Response, NextFunction } from 'express';
import type { Server } from 'socket.io';
import { getIo } from './io-instance';
import type { Role } from '../models/usuario.model';

/**
 * Avisos de sincronização em tempo real ("algo mudou, busque de novo").
 *
 * No lugar de cada aba perguntar a cada minuto se há novidade, o servidor
 * avisa pelo Socket.IO (já conectado para o chat) só quem precisa, só quando
 * algo muda. O evento não carrega dados — o cliente busca pela API REST de
 * sempre, que continua sendo a fonte da verdade e aplica as permissões.
 */
export type TipoSync = 'blog' | 'atualizacoes' | 'chamados' | 'kanban';

export const salaUsuario = (id: number) => `usuario_${id}`;
export const salaCargo = (role: Role) => `cargo_${role}`;

/** Socket.IO se já inicializado — o aviso é melhor-esforço, nunca quebra a requisição. */
function io(): Server | null {
  try {
    return getIo();
  } catch {
    return null;
  }
}

/** Avisa todos os conectados. */
export function sincronizarTodos(tipo: TipoSync): void {
  io()?.emit('sync', { tipo });
}

/** Avisa só as salas indicadas (usuários e/ou cargos). */
export function sincronizarSalas(salas: string[], tipo: TipoSync): void {
  const alvo = io();
  if (!alvo || salas.length === 0) return;
  alvo.to([...new Set(salas)]).emit('sync', { tipo });
}

/**
 * Middleware de rota: após uma escrita bem-sucedida (status < 400), avisa as
 * salas devolvidas por `salas` (ou todos, se omitido). Leituras (GET) passam
 * direto. Falhas ao calcular o público são engolidas — o polling de
 * segurança do cliente cobre o aviso perdido.
 */
export function sincronizarAposEscrita(tipo: TipoSync, salas?: (req: Request) => Promise<string[]>) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (req.method === 'GET') return next();
    res.on('finish', () => {
      if (res.statusCode >= 400) return;
      if (!salas) {
        sincronizarTodos(tipo);
        return;
      }
      salas(req)
        .then((alvos) => sincronizarSalas(alvos, tipo))
        .catch((err) => console.error(`[sync] falha ao avisar "${tipo}":`, err));
    });
    return next();
  };
}
