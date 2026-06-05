import { pool } from '../database/pool';
import { criarOAuthClient } from './google-oauth';
import { AppError } from './app-error';

interface CredenciaisGoogle {
  google_access_token: string | null;
  google_refresh_token: string | null;
}

/**
 * Monta um cliente OAuth2 já autenticado com os tokens do usuário.
 * A lib renova o access_token via refresh_token; o evento `tokens` persiste
 * os tokens novos no banco para o próximo uso.
 *
 * @throws {AppError} 404 usuário inexistente, 403 conta sem tokens do Google.
 */
export async function criarClienteAutenticado(usuarioId: number) {
  const { rows } = await pool.query<CredenciaisGoogle>(
    `SELECT google_access_token, google_refresh_token FROM usuarios WHERE id = $1`,
    [usuarioId],
  );

  const cred = rows[0];
  if (!cred) {
    throw new AppError('Usuário não encontrado.', 404);
  }
  if (!cred.google_access_token && !cred.google_refresh_token) {
    throw new AppError('Conta Google não conectada. Faça login novamente.', 403);
  }

  const oauth = criarOAuthClient();
  oauth.setCredentials({
    access_token: cred.google_access_token,
    refresh_token: cred.google_refresh_token,
  });

  oauth.on('tokens', (tokens) => {
    pool
      .query(
        `UPDATE usuarios
            SET google_access_token  = COALESCE($1, google_access_token),
                google_refresh_token = COALESCE($2, google_refresh_token),
                atualizado_em = now()
          WHERE id = $3`,
        [tokens.access_token ?? null, tokens.refresh_token ?? null, usuarioId],
      )
      .catch((e) => console.error('[google] falha ao persistir tokens renovados:', e));
  });

  return oauth;
}

/**
 * Traduz um erro das APIs do Google em AppError com status coerente.
 * Sempre lança (retorno `never`).
 *
 * @param contexto Rótulo para o log (ex.: 'tarefas', 'agenda').
 */
export function lancarErroGoogle(err: unknown, contexto: string): never {
  const e = err as {
    code?: number;
    message?: string;
    response?: { status?: number };
    errors?: Array<{ reason?: string }>;
  };
  const status = e.code ?? e.response?.status;
  const reason = e.errors?.[0]?.reason;

  if (status === 401 || e.message?.includes('invalid_grant')) {
    throw new AppError('Sessão do Google expirada. Faça login novamente.', 401);
  }
  if (status === 403) {
    console.error(`[${contexto}] 403 do Google. reason:`, reason ?? '(desconhecido)', '-', e.message);
    const dica =
      reason === 'accessNotConfigured'
        ? 'A API parece desabilitada no projeto do Google Cloud.'
        : 'Faça login novamente para autorizar o acesso.';
    throw new AppError(`Permissão não concedida. ${dica}`, 403);
  }

  console.error(`[${contexto}] erro inesperado do Google:`, err);
  throw new AppError('Não foi possível concluir a operação no Google.', 502);
}
