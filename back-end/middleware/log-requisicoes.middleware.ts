import type { Request, Response, NextFunction } from 'express';
import { log } from '../utils/log';

/**
 * Segmentos que são identificador e não fazem parte do nome da rota:
 * números (`/chamados/42`) e hashes/uuids dos uploads.
 */
const SEGMENTO_ID = /^(\d+|[0-9a-f-]{16,})$/i;

/**
 * Normaliza a URL para agrupar no Grafana: tira a query string e troca ids por
 * `:id`. Sem isso, `/api/clientes?busca=joao` e `/api/clientes?busca=maria`
 * contam como rotas diferentes e o "top rotas" vira uma lista inútil.
 */
export function normalizarRota(url: string): string {
  const semQuery = url.split('?')[0] ?? '';
  // Anexos têm nome gerado (timestamp + random): agrupa como um arquivo só.
  const anexo = semQuery.match(/^(\/uploads\/[^/]+)\/.+$/);
  if (anexo) return `${anexo[1]}/:arquivo`;

  const partes = semQuery.split('/').map((p) => (SEGMENTO_ID.test(p) ? ':id' : p));
  const rota = partes.join('/');
  // Evita cardinalidade infinita se alguém bater numa URL muito longa.
  return rota.length > 200 ? `${rota.slice(0, 200)}…` : rota;
}

/**
 * Registra uma linha JSON por requisição concluída (ver utils/log.ts).
 *
 * Existe porque o log do nginx sabe a URL mas não sabe **quem** chamou nem
 * **por que** falhou: um 403 do RBAC ou um 409 de duplicidade chegavam no
 * Grafana como um número solto. Aqui sai usuário, rota normalizada, duração e
 * o motivo da falha (preenchido pelo errorHandler em `res.locals.erroLog`).
 *
 * Vai antes de tudo no `app.ts` para medir a requisição inteira; como o log sai
 * no `finish`, o `req.usuario` do authMiddleware já está preenchido.
 */
export function logRequisicoes(req: Request, res: Response, next: NextFunction): void {
  const inicio = Date.now();

  // Nem toda falha passa pelo errorHandler: authMiddleware e roleMiddleware
  // respondem direto com res.status(401/403).json(...). Guardar a `message` da
  // resposta garante que TODO 4xx/5xx tenha motivo no log, não só um número.
  const jsonOriginal = res.json.bind(res);
  res.json = (corpo: unknown) => {
    if (res.statusCode >= 400 && typeof corpo === 'object' && corpo !== null) {
      const { message } = corpo as { message?: unknown };
      if (typeof message === 'string') res.locals.mensagemResposta = message;
    }
    return jsonOriginal(corpo);
  };

  res.on('finish', () => {
    const erro = res.locals.erroLog as { mensagem: string; tipo: string } | undefined;
    const motivo = erro?.mensagem ?? (res.locals.mensagemResposta as string | undefined);
    const nivel = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';

    log(nivel, 'requisicao', {
      metodo: req.method,
      rota: normalizarRota(req.originalUrl),
      status: res.statusCode,
      duracao_ms: Date.now() - inicio,
      usuario: req.usuario?.email,
      usuario_id: req.usuario?.id,
      cargo: req.usuario?.role,
      ip: req.ip,
      erro: motivo,
      erro_tipo: erro?.tipo ?? (motivo ? 'resposta' : undefined),
    });
  });

  next();
}
