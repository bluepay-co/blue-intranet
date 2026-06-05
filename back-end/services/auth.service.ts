import { google } from 'googleapis';
import jwt from 'jsonwebtoken';
import type { SignOptions } from 'jsonwebtoken';
import { pool } from '../database/pool';
import { Role } from '../models/usuario.model';
import type { UsuarioPublico } from '../models/usuario.model';
import { AppError } from '../utils/app-error';

interface LoginResult {
  token: string;
  usuario: UsuarioPublico;
}

/** Cliente OAuth2 do Google reutilizado nas trocas de código por tokens. */
function criarOAuthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI,
  );
}

/**
 * Fluxo completo de login via Google Workspace.
 *
 * 1. Troca o `code` do OAuth2 pelos tokens do Google.
 * 2. Busca o perfil (nome/e-mail) do usuário.
 * 3. Valida ESTRITAMENTE se o e-mail pertence ao domínio corporativo.
 * 4. Faz upsert do usuário no banco `intranet_dev` (preserva role e refresh_token).
 * 5. Gera o JWT da sessão.
 *
 * @param code Código de autorização OAuth2 enviado pelo Frontend.
 * @returns `{ token, usuario }` — JWT e dados públicos do usuário.
 * @throws {AppError} 400 código ausente, 401 falha na troca, 403 domínio inválido.
 */
export async function autenticarComGoogle(code: string): Promise<LoginResult> {
  if (!code || typeof code !== 'string' || code.trim().length === 0) {
    throw new AppError('Código de autorização ausente ou inválido.', 400);
  }

  const oauthClient = criarOAuthClient();

  // 1. Troca code -> tokens
  let accessToken: string | null;
  let refreshToken: string | null;
  try {
    const { tokens } = await oauthClient.getToken(code.trim());
    oauthClient.setCredentials(tokens);
    accessToken = tokens.access_token ?? null;
    refreshToken = tokens.refresh_token ?? null;
  } catch {
    throw new AppError('Falha ao validar o código junto ao Google.', 401);
  }

  // 2. Perfil do usuário
  const oauth2 = google.oauth2({ version: 'v2', auth: oauthClient });
  const { data } = await oauth2.userinfo.get();

  const email = (data.email ?? '').trim().toLowerCase();
  const nome = (data.name ?? '').trim();

  if (!email || !nome) {
    throw new AppError('Não foi possível obter o perfil do usuário no Google.', 401);
  }

  // 3. Validação estrita de domínio corporativo
  const dominio = (process.env.CORPORATE_DOMAIN ?? '').trim().toLowerCase();
  if (!dominio) {
    throw new AppError('Domínio corporativo não configurado no servidor.', 500);
  }
  if (data.verified_email !== true || !email.endsWith(`@${dominio}`)) {
    throw new AppError('E-mail fora do domínio corporativo autorizado.', 403);
  }

  // 4. Upsert: novos usuários nascem como COLABORADOR; em conflito NÃO sobrescreve
  //    o cargo (definido pela TI) e preserva o refresh_token quando o Google não
  //    devolve um novo (só vem no primeiro consentimento).
  const { rows } = await pool.query<UsuarioPublico>(
    `INSERT INTO usuarios (nome, email, role, google_access_token, google_refresh_token)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (email) DO UPDATE
       SET nome = EXCLUDED.nome,
           google_access_token = EXCLUDED.google_access_token,
           google_refresh_token = COALESCE(EXCLUDED.google_refresh_token, usuarios.google_refresh_token),
           atualizado_em = now()
     RETURNING id, nome, email, role`,
    [nome, email, Role.COLABORADOR, accessToken, refreshToken],
  );

  const usuario = rows[0];
  if (!usuario) {
    throw new AppError('Falha ao persistir o usuário.', 500);
  }

  // 5. JWT da sessão
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new AppError('Segredo JWT não configurado no servidor.', 500);
  }

  const options: SignOptions = {
    expiresIn: (process.env.JWT_EXPIRES_IN ?? '8h') as NonNullable<SignOptions['expiresIn']>,
  };
  const token = jwt.sign(
    { id: usuario.id, email: usuario.email, role: usuario.role },
    secret,
    options,
  );

  return { token, usuario };
}
