import { google } from 'googleapis';
import jwt from 'jsonwebtoken';
import type { SignOptions } from 'jsonwebtoken';
import { pool } from '../database/pool';
import { JWT_ALGORITHM } from '../middleware/auth-constants';
import { Role } from '../models/usuario.model';
import type { UsuarioPublico } from '../models/usuario.model';
import { AppError } from '../utils/app-error';

interface LoginResult {
  token: string;
  usuario: UsuarioPublico;
}

function criarOAuthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI,
  );
}

export async function autenticarComGoogle(code: string): Promise<LoginResult> {
  if (!code || typeof code !== 'string' || code.trim().length === 0) {
    throw new AppError('Código de autorização ausente ou inválido.', 400);
  }

  const oauthClient = criarOAuthClient();

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

  const oauth2 = google.oauth2({ version: 'v2', auth: oauthClient });
  const { data } = await oauth2.userinfo.get();

  const email = (data.email ?? '').trim().toLowerCase();
  const nome = (data.name ?? '').trim();

  if (!email || !nome) {
    throw new AppError('Não foi possível obter o perfil do usuário no Google.', 401);
  }

  const dominio = (process.env.CORPORATE_DOMAIN ?? '').trim().toLowerCase();
  if (!dominio) {
    throw new AppError('Domínio corporativo não configurado no servidor.', 500);
  }
  if (data.verified_email !== true || !email.endsWith(`@${dominio}`)) {
    throw new AppError('E-mail fora do domínio corporativo autorizado.', 403);
  }

  // Upsert: preserva role (definido pela TI) e refresh_token existente.
  const { rows } = await pool.query<UsuarioPublico & { bloqueado: boolean }>(
    `INSERT INTO usuarios (nome, email, role, google_access_token, google_refresh_token)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (email) DO UPDATE
       SET nome = EXCLUDED.nome,
           google_access_token = EXCLUDED.google_access_token,
           google_refresh_token = COALESCE(EXCLUDED.google_refresh_token, usuarios.google_refresh_token),
           atualizado_em = now()
     RETURNING id, nome, email, role, bloqueado`,
    [nome, email, Role.COLABORADOR, accessToken, refreshToken],
  );

  const registro = rows[0];
  if (!registro) {
    throw new AppError('Falha ao persistir o usuário.', 500);
  }

  if (registro.bloqueado) {
    throw new AppError('Seu acesso à intranet foi bloqueado. Procure a equipe de T.I.', 403);
  }

  const { bloqueado: _bloqueado, ...usuario } = registro;

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new AppError('Segredo JWT não configurado no servidor.', 500);
  }

  const options: SignOptions = {
    algorithm: JWT_ALGORITHM,
    expiresIn: (process.env.JWT_EXPIRES_IN ?? '8h') as NonNullable<SignOptions['expiresIn']>,
  };
  const token = jwt.sign(
    { id: usuario.id, email: usuario.email, role: usuario.role },
    secret,
    options,
  );

  return { token, usuario };
}

export async function buscarUsuarioPorId(id: number): Promise<UsuarioPublico> {
  const { rows } = await pool.query<UsuarioPublico & { bloqueado: boolean }>(
    `SELECT id, nome, email, role, bloqueado FROM usuarios WHERE id = $1`,
    [id],
  );

  const registro = rows[0];
  if (!registro) {
    throw new AppError('Usuário não encontrado.', 404);
  }

  if (registro.bloqueado) {
    throw new AppError('Seu acesso à intranet foi bloqueado. Procure a equipe de T.I.', 403);
  }

  const { bloqueado: _bloqueado, ...usuario } = registro;
  return usuario;
}
