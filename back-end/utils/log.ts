/**
 * Log estruturado em JSON (uma linha por evento, em stdout).
 *
 * O Docker captura o stdout e o Promtail parseia cada linha como JSON,
 * transformando os campos em rótulos pesquisáveis no Grafana. Texto solto
 * (`console.log('deu ruim', obj)`) não vira campo e some na busca — por isso
 * todo log novo do back-end deve passar por aqui.
 */
export type NivelLog = 'info' | 'warn' | 'error';

/** Campos extras de um evento; `erro` e `rota` são os mais consultados. */
export type CamposLog = Record<string, unknown>;

/** Mensagem de erro legível a partir de qualquer coisa que tenha sido lançada. */
export function mensagemDoErro(erro: unknown): string {
  if (erro instanceof Error) return erro.message;
  if (typeof erro === 'string') return erro;
  return 'erro desconhecido';
}

/**
 * Emite uma linha JSON. Campos `undefined` são descartados para a linha não
 * encher de chaves vazias.
 */
export function log(nivel: NivelLog, evento: string, campos: CamposLog = {}): void {
  const linha: CamposLog = { nivel, ts: new Date().toISOString(), evento };
  for (const [chave, valor] of Object.entries(campos)) {
    if (valor !== undefined) linha[chave] = valor;
  }
  const texto = JSON.stringify(linha);
  if (nivel === 'error') console.error(texto);
  else console.log(texto);
}
