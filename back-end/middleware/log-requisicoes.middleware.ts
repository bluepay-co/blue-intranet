import type { Request, Response, NextFunction } from 'express';
import { log } from '../utils/log';

const SEGMENTO_ID = /^(\d+|[0-9a-f-]{16,})$/i;

/**
 * Agrupa a URL para o "top rotas" do Grafana: sem isso
 * `/api/clientes?busca=joao` e `/api/clientes?busca=maria` contam como rotas
 * diferentes e a lista vira ruído.
 */
export function normalizarRota(url: string): string {
  const semQuery = url.split('?')[0] ?? '';
  const anexo = semQuery.match(/^(\/uploads\/[^/]+)\/.+$/);
  if (anexo) return `${anexo[1]}/:arquivo`;

  const partes = semQuery.split('/').map((p) => (SEGMENTO_ID.test(p) ? ':id' : p));
  const rota = partes.join('/');
  return rota.length > 200 ? `${rota.slice(0, 200)}…` : rota;
}

/**
 * Uma linha JSON por requisição concluída. O log do nginx sabe a URL, mas não
 * sabe quem chamou nem por que falhou — um 403 do RBAC chegava no Grafana
 * como um número solto.
 *
 * Fica antes de tudo no `app.ts` para medir a requisição inteira; o log sai no
 * `finish`, quando o `req.usuario` do authMiddleware já está preenchido.
 */
export function logRequisicoes(req: Request, res: Response, next: NextFunction): void {
  const inicio = Date.now();

  // authMiddleware e roleMiddleware respondem direto, sem passar pelo
  // errorHandler: guardar a `message` garante motivo em todo 4xx/5xx.
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
