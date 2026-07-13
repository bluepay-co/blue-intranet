/**
 * Detecta falhas de conectividade com o banco (ex.: banco de produção fora da
 * VPN / inacessível). Usado para responder um 503 claro em vez de um 500
 * genérico quando a conexão não pôde sequer ser aberta.
 */
export function ehFalhaDeConexao(err: unknown): boolean {
  const e = err as { code?: string; message?: string };
  const code = e?.code ?? '';
  if (['ECONNREFUSED', 'ETIMEDOUT', 'EHOSTUNREACH', 'ENETUNREACH', 'ENOTFOUND'].includes(code)) {
    return true;
  }
  const msg = (e?.message ?? '').toLowerCase();
  return (
    msg.includes('timeout exceeded when trying to connect') ||
    msg.includes('connection terminated') ||
    msg.includes('connect etimedout')
  );
}
