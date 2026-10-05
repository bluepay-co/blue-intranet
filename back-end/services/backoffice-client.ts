import { AppError } from '../utils/app-error';

/**
 * Cliente HTTP para a API do BluePay Backoffice (tickets de infra).
 * O token (JWT privilegiado) fica só no servidor — nunca vai para o navegador.
 *
 * O backoffice é API de terceiro, compartilhada, que cai com frequência e fica
 * pesada. Tudo aqui parte de que ela VAI falhar e a intranet tem que continuar
 * de pé: timeout, teto de concorrência, cache com valor velho e circuit
 * breaker. Em 2026-10 a falta dessas proteções derrubou o back-end inteiro —
 * requisições penduradas num fetch sem prazo saturaram o agent HTTP e travaram
 * rotas que nada tinham a ver com chamado.
 */

const BASE = process.env.BACKOFFICE_API_URL;
const TOKEN = process.env.BACKOFFICE_API_TOKEN ?? '';

if (!BASE) {
  throw new Error('BACKOFFICE_API_URL não configurada. Defina no .env antes de subir o servidor.');
}

/** Curto: há cache e valor velho atrás, então desistir rápido é barato. */
const TIMEOUT_LEITURA_MS = 8_000;
/** Generoso: abortar um POST no meio cria o ticket sem o nosso mapeamento. */
const TIMEOUT_ESCRITA_MS = 20_000;

const MAX_CONCORRENTES = 4;
/** Acima da fila, 503 na hora: fila sem teto só muda o engarrafamento de lugar. */
const MAX_FILA = 64;

const FALHAS_PARA_ABRIR = 5;
const CIRCUITO_ABERTO_MS = 20_000;

/** Teto para servir valor velho: além disso, erro é melhor que dado fóssil. */
const MAX_VELHO_MS = 10 * 60_000;
const MAX_ENTRADAS_CACHE = 200;

// ── Semáforo ──────────────────────────────────────────────────────────────────
let emUso = 0;
const fila: Array<() => void> = [];

function adquirir(): Promise<void> {
  if (emUso < MAX_CONCORRENTES) {
    emUso++;
    return Promise.resolve();
  }
  if (fila.length >= MAX_FILA) {
    return Promise.reject(
      new AppError('O backoffice está sobrecarregado. Tente novamente em instantes.', 503),
    );
  }
  return new Promise<void>((liberado) => fila.push(liberado));
}

function liberar(): void {
  const proximo = fila.shift();
  // A vaga passa direto para quem esperava; só devolve ao pool se a fila esvaziou.
  if (proximo) proximo();
  else emUso--;
}

// ── Circuit breaker ───────────────────────────────────────────────────────────
let falhasSeguidas = 0;
let circuitoAbertoAte = 0;

function circuitoAberto(): boolean {
  return Date.now() < circuitoAbertoAte;
}

/** Só falha de infra conta (timeout, rede, 5xx, 429); 404 não é API caindo. */
function registrarFalha(): void {
  falhasSeguidas++;
  if (falhasSeguidas >= FALHAS_PARA_ABRIR) {
    circuitoAbertoAte = Date.now() + CIRCUITO_ABERTO_MS;
    falhasSeguidas = 0;
    console.error(`[backoffice] circuito aberto por ${CIRCUITO_ABERTO_MS / 1000}s após falhas seguidas.`);
  }
}

function registrarSucesso(): void {
  falhasSeguidas = 0;
  circuitoAbertoAte = 0;
}

interface Opts {
  method?: string;
  json?: unknown;
  form?: FormData;
}

async function boFetch<T = unknown>(path: string, opts: Opts = {}): Promise<T> {
  if (!TOKEN) throw new AppError('Integração do backoffice não configurada (token ausente).', 500);

  const metodo = opts.method ?? 'GET';
  const ehLeitura = metodo === 'GET';

  // Quem tinha valor velho já foi atendido em boGetCache; aqui só sobra quem
  // não tem nada a mostrar, e insistir num backoffice caído não ajuda.
  if (ehLeitura && circuitoAberto()) {
    throw new AppError('O backoffice está indisponível no momento. Tente novamente em instantes.', 503);
  }

  const headers: Record<string, string> = { Authorization: `Bearer ${TOKEN}` };

  await adquirir();
  let res: Response;
  let texto: string;
  try {
    // O signal nasce DEPOIS da vaga: criado antes, o prazo seria consumido na
    // fila e a chamada entraria no fetch já abortada.
    const init: RequestInit = {
      method: metodo,
      headers,
      signal: AbortSignal.timeout(ehLeitura ? TIMEOUT_LEITURA_MS : TIMEOUT_ESCRITA_MS),
    };
    if (opts.json !== undefined) {
      headers['Content-Type'] = 'application/json';
      init.body = JSON.stringify(opts.json);
    } else if (opts.form) {
      init.body = opts.form; // multipart; o fetch define o boundary
    }

    try {
      res = await fetch(`${BASE}${path}`, init);
      texto = await res.text(); // dentro da vaga: ler o corpo ainda ocupa a conexão
    } catch (err) {
      registrarFalha();
      if ((err as Error)?.name === 'TimeoutError') {
        throw new AppError('O backoffice não respondeu no tempo esperado. Tente novamente.', 504);
      }
      throw new AppError('Falha de conexão com o backoffice.', 502);
    }
  } finally {
    liberar();
  }

  let data: unknown = null;
  try { data = texto ? JSON.parse(texto) : null; } catch { data = texto; }

  if (!res.ok) {
    if (res.status >= 500 || res.status === 429) registrarFalha();
    else registrarSucesso(); // 4xx é problema do pedido, não da API

    if (res.status === 401) throw new AppError('Token do backoffice expirado ou inválido. Contate o T.I.', 502);
    if (res.status === 429) throw new AppError('O backoffice está limitando as requisições. Tente em instantes.', 429);
    if (res.status === 404) throw new AppError('Chamado não encontrado no backoffice.', 404);
    throw new AppError(`Backoffice retornou ${res.status}.`, 502);
  }

  registrarSucesso();
  return data as T;
}

// ── Cache de leitura ──────────────────────────────────────────────────────────
interface Entrada { valor: unknown; expiraEm: number; gravadoEm: number }

const cache = new Map<string, Entrada>();
const emVoo = new Map<string, Promise<unknown>>();
/** Conta invalidações por caminho, para descartar resposta anterior à escrita. */
const geracao = new Map<string, number>();

const geracaoAtual = (path: string): number => geracao.get(path) ?? 0;

/** Sem isto o Map cresce sem fim: as entradas expiram, mas nunca saem. */
function podarCache(): void {
  if (cache.size <= MAX_ENTRADAS_CACHE) return;
  const limite = Date.now() - MAX_VELHO_MS;
  for (const [chave, entrada] of cache) {
    if (entrada.gravadoEm < limite) cache.delete(chave);
  }
}

function servivel(entrada: Entrada | undefined): entrada is Entrada {
  return entrada !== undefined && Date.now() - entrada.gravadoEm < MAX_VELHO_MS;
}

/**
 * GET com cache, single-flight e degradação graciosa:
 * fresco → cache; expirado → devolve o velho e renova em segundo plano;
 * renovação falha → segue no velho até `MAX_VELHO_MS`; sem nada e circuito
 * aberto → 503 rápido.
 *
 * É o que impede a notificação (montada em toda aba) de multiplicar tráfego e
 * o que mantém a tela de chamados de pé quando o backoffice cai.
 */
export async function boGetCache<T = unknown>(path: string, ttlMs: number): Promise<T> {
  const entrada = cache.get(path);
  if (entrada && entrada.expiraEm > Date.now()) return entrada.valor as T;

  const voando = emVoo.get(path);
  if (voando) {
    if (servivel(entrada)) return entrada.valor as T;
    return voando as Promise<T>;
  }

  if (circuitoAberto() && servivel(entrada)) return entrada.valor as T;

  const geracaoNaPartida = geracaoAtual(path);
  const promessa = boFetch<T>(path)
    .then((valor) => {
      // Uma escrita invalidou o caminho enquanto esta chamada estava em voo:
      // a resposta é anterior à escrita, então não pode virar cache — senão o
      // autor ficaria o TTL inteiro sem ver o chamado que acabou de abrir.
      if (geracaoAtual(path) === geracaoNaPartida) {
        cache.set(path, { valor, expiraEm: Date.now() + ttlMs, gravadoEm: Date.now() });
        podarCache();
      }
      return valor;
    })
    .finally(() => {
      if (emVoo.get(path) === promessa) emVoo.delete(path);
    });

  emVoo.set(path, promessa);

  // Responde já com o velho e deixa a renovação correr em segundo plano.
  if (servivel(entrada)) {
    promessa.catch(() => {}); // já respondemos; a falha não vai para ninguém
    return entrada.valor as T;
  }

  return promessa;
}

/**
 * Invalida caminhos após uma escrita, para o autor ver o próprio dado.
 * Também desregistra o voo em andamento: a próxima leitura precisa de uma
 * chamada nova, não do resultado de uma que partiu antes da escrita.
 */
export function invalidarCache(...paths: string[]): void {
  for (const p of paths) {
    cache.delete(p);
    emVoo.delete(p);
    geracao.set(p, geracaoAtual(p) + 1);
  }
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
