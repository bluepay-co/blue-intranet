import { AppError } from '../utils/app-error';

/**
 * Cliente HTTP para a API do BluePay Backoffice (tickets de infra).
 * O token (JWT privilegiado) fica só no servidor — nunca vai para o navegador.
 * Usa fetch global (Node 18+); nada de expor credenciais no front.
 */

const BASE = process.env.BACKOFFICE_API_URL;
const TOKEN = process.env.BACKOFFICE_API_TOKEN ?? '';

if (!BASE) {
  throw new Error('BACKOFFICE_API_URL não configurada. Defina no .env antes de subir o servidor.');
}

interface Opts {
  method?: string;
  json?: unknown;
  form?: FormData;
}

async function boFetch<T = unknown>(path: string, opts: Opts = {}): Promise<T> {
  if (!TOKEN) throw new AppError('Integração do backoffice não configurada (token ausente).', 500);

  const headers: Record<string, string> = { Authorization: `Bearer ${TOKEN}` };
  const init: RequestInit = { method: opts.method ?? 'GET', headers };
  if (opts.json !== undefined) {
    headers['Content-Type'] = 'application/json';
    init.body = JSON.stringify(opts.json);
  } else if (opts.form) {
    init.body = opts.form; // multipart; o fetch define o boundary
  }

  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, init);
  } catch {
    throw new AppError('Falha de conexão com o backoffice.', 502);
  }

  const texto = await res.text();
  let data: unknown = null;
  try { data = texto ? JSON.parse(texto) : null; } catch { data = texto; }

  if (!res.ok) {
    if (res.status === 401) throw new AppError('Token do backoffice expirado ou inválido. Contate o T.I.', 502);
    throw new AppError(`Backoffice retornou ${res.status}.`, 502);
  }
  return data as T;
}

export const boGet   = <T = unknown>(path: string) => boFetch<T>(path);
export const boPost  = <T = unknown>(path: string, json: unknown) => boFetch<T>(path, { method: 'POST', json });
export const boPatch = <T = unknown>(path: string, json: unknown) => boFetch<T>(path, { method: 'PATCH', json });

/** Upload de arquivo (multipart) → retorna o signed_id. */
export async function boUpload(buffer: Buffer, filename: string, mime: string): Promise<{ signed_id: string }> {
  const form = new FormData();
  form.append('file', new Blob([new Uint8Array(buffer)], { type: mime }), filename);
  return boFetch<{ signed_id: string }>('/uploads', { method: 'POST', form });
}
