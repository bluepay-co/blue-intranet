/**
 * Log estruturado em JSON (uma linha por evento, em stdout).
 *
 * O Promtail parseia cada linha e vira campo pesquisável no Grafana. Texto
 * solto (`console.log('deu ruim', obj)`) não vira campo e some na busca — por
 * isso todo log novo do back-end deve passar por aqui.
 */
export type NivelLog = 'info' | 'warn' | 'error';

export type CamposLog = Record<string, unknown>;

/** Mensagem de erro legível a partir de qualquer coisa que tenha sido lançada. */
export function mensagemDoErro(erro: unknown): string {
  if (erro instanceof Error) return erro.message;
  if (typeof erro === 'string') return erro;
  return 'erro desconhecido';
}

/** Emite uma linha JSON, descartando campos `undefined`. */
export function log(nivel: NivelLog, evento: string, campos: CamposLog = {}): void {
  const linha: CamposLog = { nivel, ts: new Date().toISOString(), evento };
  for (const [chave, valor] of Object.entries(campos)) {
    if (valor !== undefined) linha[chave] = valor;
  }
  const texto = JSON.stringify(linha);
  if (nivel === 'error') console.error(texto);
  else console.log(texto);
}
