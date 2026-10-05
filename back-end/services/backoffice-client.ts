import { AppError } from '../utils/app-error';

/**
 * Cliente HTTP para a API do BluePay Backoffice (tickets de infra).
 * O token (JWT privilegiado) fica só no servidor — nunca vai para o navegador.
 * Usa fetch global (Node 18+); nada de expor credenciais no front.
 *
 * O backoffice é uma API de terceiro, compartilhada, que cai com frequência e
 * fica pesada. A premissa deste arquivo é que ela VAI falhar: a intranet precisa
 * continuar de pé quando isso acontecer. Daí as seis proteções abaixo — todas
 * nasceram de um incidente em 2026-10 que derrubou o back-end inteiro.
 *
 * 1. TIMEOUT — o fetch do Node não tem prazo padrão; sem ele, backoffice lento
 *    deixa requisições penduradas até saturar o agent HTTP e travar TODAS as
 *    rotas da intranet. Leitura e escrita têm prazos diferentes (ver constantes).
 * 2. CONCORRÊNCIA com FILA LIMITADA — teto de chamadas simultâneas; acima da
 *    fila, 503 imediato. Fila sem teto só troca o engarrafamento de lugar.
 * 3. SINGLE-FLIGHT — N pedidos do mesmo caminho viram UMA requisição externa.
 * 4. CACHE COM VALOR VELHO (stale-while-revalidate) — expirado, o valor antigo
 *    é servido na hora e a renovação corre em segundo plano. Se a renovação
 *    falhar, continua servindo o velho até `MAX_VELHO_MS`. É o que mantém a
 *    página funcionando durante uma queda do backoffice.
 * 5. CIRCUIT BREAKER — depois de várias falhas seguidas, as LEITURAS param de
 *    tentar por um tempo (nada de gastar o timeout a cada poll). Escritas são
 *    raras e iniciadas pelo usuário: sempre tentam.
 * 6. PODA DO CACHE — entradas velhas saem do Map; sem isso é vazamento lento.
 */

const BASE = process.env.BACKOFFICE_API_URL;
const TOKEN = process.env.BACKOFFICE_API_TOKEN ?? '';

if (!BASE) {
  throw new Error('BACKOFFICE_API_URL não configurada. Defina no .env antes de subir o servidor.');
}

/** Leitura: curto. Há cache e valor velho atrás, então desistir rápido é barato. */
const TIMEOUT_LEITURA_MS = 8_000;
/**
 * Escrita: generoso de propósito. Abortar um POST no meio pode deixar o ticket
 * criado no backoffice sem o nosso mapeamento — pior que esperar.
 */
const TIMEOUT_ESCRITA_MS = 20_000;

/** Chamadas simultâneas. Baixo de propósito: a API é compartilhada e pesada. */
const MAX_CONCORRENTES = 4;
/** Fila de espera. Acima disso, 503 na hora em vez de acumular. */
const MAX_FILA = 64;

/** Falhas de infraestrutura seguidas para abrir o circuito. */
const FALHAS_PARA_ABRIR = 5;
/** Quanto tempo o circuito fica aberto antes de deixar uma leitura sondar. */
const CIRCUITO_ABERTO_MS = 20_000;

/** Teto para servir valor velho: além disso, erro é melhor que dado fóssil. */
const MAX_VELHO_MS = 10 * 60_000;
/** Entradas no cache antes de podar. */
const MAX_ENTRADAS_CACHE = 200;

// ── Semáforo: limita quantas chamadas saem ao mesmo tempo ─────────────────────
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

/** Só falha de INFRA conta (timeout, rede, 5xx, 429). 404 não é API caindo. */
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

  // Leitura com circuito aberto desiste na hora: quem tem valor velho já o
  // devolveu em boGetCache; aqui só sobra quem não tem nada a mostrar.
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

// ── Cache de leitura: single-flight + valor velho ─────────────────────────────
interface Entrada { valor: unknown; expiraEm: number; gravadoEm: number }

const cache = new Map<string, Entrada>();
const emVoo = new Map<string, Promise<unknown>>();

/** Remove entradas velhas demais para servir; evita o Map crescer sem fim. */
function podarCache(): void {
  if (cache.size <= MAX_ENTRADAS_CACHE) return;
  const limite = Date.now() - MAX_VELHO_MS;
  for (const [chave, entrada] of cache) {
    if (entrada.gravadoEm < limite) cache.delete(chave);
  }
}

/** Valor velho ainda é melhor que erro — mas não velho demais. */
function servivel(entrada: Entrada | undefined): entrada is Entrada {
  return Boolean(entrada) && Date.now() - entrada!.gravadoEm < MAX_VELHO_MS;
}

/**
 * GET com cache de `ttlMs`, single-flight e degradação graciosa.
 *
 * Fresco          → devolve do cache.
 * Expirado        → devolve o velho AGORA e renova em segundo plano.
 * Renovação falha → segue devolvendo o velho até `MAX_VELHO_MS`.
 * Sem nada no cache e circuito aberto → 503 rápido.
 *
 * É isto que impede a notificação (montada em toda aba) de multiplicar tráfego
 * e que mantém a tela de chamados funcionando quando o backoffice cai.
 */
export async function boGetCache<T = unknown>(path: string, ttlMs: number): Promise<T> {
  const entrada = cache.get(path);
  if (entrada && entrada.expiraEm > Date.now()) return entrada.valor as T;

  // Renovação já em andamento: com valor velho em mãos, não espera o terceiro.
  const voando = emVoo.get(path);
  if (voando) {
    if (servivel(entrada)) return entrada.valor as T;
    return voando as Promise<T>;
  }

  // Circuito aberto: não castiga o backoffice; serve o que tem.
  if (circuitoAberto() && servivel(entrada)) return entrada.valor as T;

  const promessa = boFetch<T>(path)
    .then((valor) => {
      cache.set(path, { valor, expiraEm: Date.now() + ttlMs, gravadoEm: Date.now() });
      podarCache();
      return valor;
    })
    .finally(() => { emVoo.delete(path); });

  emVoo.set(path, promessa);

  // Stale-while-revalidate: responde já com o velho e deixa a renovação correr.
  if (servivel(entrada)) {
    promessa.catch(() => {}); // a renovação pode falhar; o velho já foi servido
    return entrada.valor as T;
  }

  return promessa;
}

/** Invalida caminhos do cache após uma escrita, para o autor ver o próprio dado. */
export function invalidarCache(...paths: string[]): void {
  for (const p of paths) cache.delete(p);
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
