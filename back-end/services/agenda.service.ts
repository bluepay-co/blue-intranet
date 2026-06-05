import { google } from 'googleapis';
import type { calendar_v3 } from 'googleapis';
import { pool } from '../database/pool';
import { criarOAuthClient } from '../utils/google-oauth';
import { AppError } from '../utils/app-error';
import type { EventoAgenda } from '../models/agenda.model';

interface IntervaloConsulta {
  inicio: Date;
  fim: Date;
}

interface CredenciaisGoogle {
  google_access_token: string | null;
  google_refresh_token: string | null;
}

/** Normaliza um evento bruto do Google para o DTO da aplicação. */
function mapearEvento(ev: calendar_v3.Schema$Event): EventoAgenda {
  const linkMeet =
    ev.hangoutLink ??
    ev.conferenceData?.entryPoints?.find((p) => p.entryPointType === 'video')?.uri ??
    null;

  const participantes = (ev.attendees ?? [])
    .filter((a) => !a.resource) // ignora salas/recursos
    .map((a) => a.displayName ?? a.email ?? '')
    .filter((nome): nome is string => nome.length > 0);

  return {
    id: ev.id ?? '',
    titulo: ev.summary?.trim() || '(Sem título)',
    inicio: ev.start?.dateTime ?? ev.start?.date ?? null,
    fim: ev.end?.dateTime ?? ev.end?.date ?? null,
    diaInteiro: !ev.start?.dateTime,
    local: ev.location ?? null,
    descricao: ev.description ?? null,
    link: ev.htmlLink ?? null,
    linkReuniao: linkMeet,
    organizador: ev.organizer?.displayName ?? ev.organizer?.email ?? null,
    participantes,
    status: ev.status ?? null,
  };
}

/**
 * Lista os eventos do calendário principal do usuário num intervalo de tempo.
 *
 * Usa os tokens do Google salvos no login. A própria lib renova o access_token
 * expirado a partir do refresh_token; quando isso acontece, persistimos os
 * tokens novos no banco (evento `tokens`).
 *
 * @param usuarioId Id do usuário autenticado (vem do JWT).
 * @param intervalo `{ inicio, fim }` da janela de consulta.
 * @returns Lista de eventos já normalizados, ordenados por início.
 * @throws {AppError} 403 conta sem tokens/permissão, 401 sessão Google expirada.
 */
export async function listarEventos(
  usuarioId: number,
  { inicio, fim }: IntervaloConsulta,
): Promise<EventoAgenda[]> {
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

  // A lib emite 'tokens' ao renovar o access_token: persistimos para o próximo uso.
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
      .catch((e) => console.error('[agenda] falha ao persistir tokens renovados:', e));
  });

  const calendar = google.calendar({ version: 'v3', auth: oauth });

  try {
    const resp = await calendar.events.list({
      calendarId: 'primary',
      timeMin: inicio.toISOString(),
      timeMax: fim.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
      maxResults: 250,
    });
    return (resp.data.items ?? []).map(mapearEvento);
  } catch (err) {
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
      // reason ajuda a diferenciar: 'accessNotConfigured' (Calendar API desabilitada)
      // vs 'insufficientPermissions'/escopo (necessário relogar para reautorizar).
      console.error('[agenda] 403 do Google. reason:', reason ?? '(desconhecido)', '-', e.message);
      const dica =
        reason === 'accessNotConfigured'
          ? 'A Google Calendar API parece desabilitada no projeto do Google Cloud.'
          : 'Faça login novamente para autorizar o Google Agenda.';
      throw new AppError(`Permissão da agenda não concedida. ${dica}`, 403);
    }
    console.error('[agenda] erro ao listar eventos do Google:', err);
    throw new AppError('Não foi possível carregar a agenda do Google.', 502);
  }
}
