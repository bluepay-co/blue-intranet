import { google } from 'googleapis';

/**
 * Cria um cliente OAuth2 do Google a partir das credenciais do ambiente.
 * Compartilhado pelos domínios que falam com APIs do Google (auth, agenda...).
 */
export function criarOAuthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI,
  );
}
