import { randomUUID } from 'node:crypto';
import { google } from 'googleapis';
import type { calendar_v3 } from 'googleapis';
import { pool } from '../database/pool';
import { criarOAuthClient } from '../utils/google-oauth';
import { criarClienteAutenticado, lancarErroGoogle } from '../utils/google-cliente';
import { AppError } from '../utils/app-error';
import type { EventoAgenda, EntradaEvento, TipoEvento } from '../models/agenda.model';

interface IntervaloConsulta {
  inicio: Date;
  fim: Date;
}

interface CredenciaisGoogle {
  google_access_token: string | null;
  google_refresh_token: string | null;
}

/** Mapeia o eventType do Google para o tipo da aplicação. */
function tipoDoEvento(eventType: string | null | undefined): TipoEvento {
  switch (eventType) {
    case 'outOfOffice':
      return 'ausente';
    case 'focusTime':
      return 'foco';
    case 'workingLocation':
      return 'local';
    case 'birthday':
      return 'aniversario';
    default:
      return 'evento';
  }
}

/** Metadados de uma agenda do usuário (vindos do calendarList). */
interface CalMeta {
  id: string;
  nome: string;
  cor: string | null;
  principal: boolean;
}

/** Agenda principal usada como padrão no CRUD (calendarId 'primary'). */
const CAL_PRIMARIA: CalMeta = { id: 'primary', nome: 'Minha agenda', cor: null, principal: true };

/** Normaliza um evento bruto do Google para o DTO da aplicação. */
function mapearEvento(ev: calendar_v3.Schema$Event, cal: CalMeta = CAL_PRIMARIA): EventoAgenda {
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
    tipo: tipoDoEvento(ev.eventType),
    calendarioId: cal.id,
    calendario: cal.nome,
    cor: cal.cor,
    agendaPrincipal: cal.principal,
  };
}

/**
 * Enumera as agendas que o usuário enxerga no Google (principal + "Outras agendas":
 * salas de reunião, compartilhadas, aniversários, feriados, etc.).
 */
async function listarCalendarios(
  calendar: calendar_v3.Calendar,
): Promise<CalMeta[]> {
  const resp = await calendar.calendarList.list({ maxResults: 250, showHidden: false });
  return (resp.data.items ?? [])
    .filter((c) => !c.deleted && c.id)
    .map((c) => ({
      id: c.id as string,
      nome: c.summaryOverride ?? c.summary ?? c.id ?? '(Sem nome)',
      cor: c.backgroundColor ?? null,
      principal: c.primary === true,
    }));
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
    // 1. Enumera todas as agendas que o usuário enxerga (principal + "Outras agendas":
    //    salas de reunião, compartilhadas, aniversários, feriados, etc.).
    const cals = await listarCalendarios(calendar);

    // 2. Busca os eventos de cada agenda em paralelo. Uma agenda que falhe (ex.: sala
    //    sem permissão de leitura) é ignorada, sem derrubar as demais.
    const resultados = await Promise.allSettled(
      cals.map((cal) =>
        calendar.events.list({
          calendarId: cal.id,
          timeMin: inicio.toISOString(),
          timeMax: fim.toISOString(),
          singleEvents: true,
          orderBy: 'startTime',
          maxResults: 250,
        }),
      ),
    );

    // 3. Mescla os eventos com dedupe por iCalUID, preferindo a cópia da agenda principal:
    //    evita ver a mesma reunião duplicada quando ela está na sua agenda E na sala.
    const eventosBrutos = new Map<string, calendar_v3.Schema$Event & { _cal: CalMeta }>();
    resultados.forEach((r, i) => {
      const cal = cals[i]!;
      if (r.status !== 'fulfilled') {
        console.warn(`[agenda] falha ao ler a agenda "${cal.nome}" (${cal.id}):`, r.reason?.message ?? r.reason);
        return;
      }
      for (const ev of r.value.data.items ?? []) {
        const chave = ev.iCalUID ?? `${cal.id}:${ev.id}`;
        const existente = eventosBrutos.get(chave);
        if (!existente || (cal.principal && !existente._cal.principal)) {
          eventosBrutos.set(chave, Object.assign(ev, { _cal: cal }));
        }
      }
    });

    // 4. Ordena o resultado final por início (orderBy do Google só ordena dentro de cada agenda).
    return [...eventosBrutos.values()]
      .map((ev) => mapearEvento(ev, ev._cal))
      .sort((a, b) => (a.inicio ?? '').localeCompare(b.inicio ?? ''));
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

// ============================================================================
// CRUD de eventos
// ============================================================================

/** Soma 1 dia a uma data 'YYYY-MM-DD' (end.date do Google é exclusivo). */
function proximoDia(data: string): string {
  const d = new Date(`${data}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

/** Propriedades de "Local de trabalho" conforme o tipo escolhido. */
function montarLocalTrabalho(
  entrada: EntradaEvento,
): calendar_v3.Schema$EventWorkingLocationProperties {
  if (entrada.tipoLocal === 'escritorio') {
    return { type: 'officeLocation', officeLocation: { label: entrada.rotuloLocal ?? 'Escritório' } };
  }
  if (entrada.tipoLocal === 'personalizado') {
    return { type: 'customLocation', customLocation: { label: entrada.rotuloLocal ?? 'Personalizado' } };
  }
  return { type: 'homeOffice', homeOffice: {} };
}

/** Valida regras mínimas antes de chamar o Google. */
function validarEntrada(entrada: EntradaEvento): void {
  if (!entrada.titulo || entrada.titulo.trim().length === 0) {
    throw new AppError('O título é obrigatório.', 400);
  }
  const ehDiaInteiro = entrada.tipo === 'local' || entrada.diaInteiro === true;
  if (ehDiaInteiro) {
    if (!entrada.inicio) throw new AppError('A data é obrigatória.', 400);
  } else {
    if (!entrada.inicio || !entrada.fim) {
      throw new AppError('Início e fim são obrigatórios.', 400);
    }
    if (new Date(entrada.fim) <= new Date(entrada.inicio)) {
      throw new AppError('O horário de término deve ser depois do início.', 400);
    }
  }
}

/** Monta o recurso Schema$Event a partir da entrada da aplicação. */
function montarRecurso(entrada: EntradaEvento): calendar_v3.Schema$Event {
  const recurso: calendar_v3.Schema$Event = { summary: entrada.titulo.trim() };
  const ehDiaInteiro = entrada.tipo === 'local' || entrada.diaInteiro === true;

  if (ehDiaInteiro) {
    const inicioData = (entrada.inicio ?? '').slice(0, 10);
    const fimData = (entrada.fim ?? entrada.inicio ?? '').slice(0, 10);
    recurso.start = { date: inicioData };
    recurso.end = { date: proximoDia(fimData) };
  } else {
    // validarEntrada garante inicio/fim presentes em eventos com horário.
    const start: calendar_v3.Schema$EventDateTime = { dateTime: entrada.inicio as string };
    const end: calendar_v3.Schema$EventDateTime = { dateTime: entrada.fim as string };
    if (entrada.timeZone) {
      start.timeZone = entrada.timeZone;
      end.timeZone = entrada.timeZone;
    }
    recurso.start = start;
    recurso.end = end;
  }

  switch (entrada.tipo) {
    case 'evento': {
      if (entrada.local != null) recurso.location = entrada.local;
      if (entrada.descricao != null) recurso.description = entrada.descricao;
      if (entrada.participantes?.length) {
        recurso.attendees = entrada.participantes.map((email) => ({ email }));
      }
      if (entrada.comMeet) {
        recurso.conferenceData = {
          createRequest: {
            requestId: randomUUID(),
            conferenceSolutionKey: { type: 'hangoutsMeet' },
          },
        };
      }
      break;
    }
    case 'ausente': {
      recurso.eventType = 'outOfOffice';
      const props: calendar_v3.Schema$EventOutOfOfficeProperties = {
        autoDeclineMode: entrada.recusarConflitos
          ? 'declineAllConflictingInvitations'
          : 'declineNone',
      };
      if (entrada.mensagemRecusa) props.declineMessage = entrada.mensagemRecusa;
      recurso.outOfOfficeProperties = props;
      break;
    }
    case 'foco': {
      recurso.eventType = 'focusTime';
      const props: calendar_v3.Schema$EventFocusTimeProperties = {
        autoDeclineMode: entrada.recusarConflitos
          ? 'declineAllConflictingInvitations'
          : 'declineNone',
      };
      if (entrada.mensagemRecusa) props.declineMessage = entrada.mensagemRecusa;
      recurso.focusTimeProperties = props;
      break;
    }
    case 'local': {
      recurso.eventType = 'workingLocation';
      recurso.transparency = 'transparent';
      recurso.workingLocationProperties = montarLocalTrabalho(entrada);
      break;
    }
  }

  return recurso;
}

/** Cria um evento no calendário principal do usuário. */
export async function criarEvento(
  usuarioId: number,
  entrada: EntradaEvento,
): Promise<EventoAgenda> {
  validarEntrada(entrada);
  const auth = await criarClienteAutenticado(usuarioId);
  const calendar = google.calendar({ version: 'v3', auth });
  try {
    const resp = await calendar.events.insert({
      calendarId: 'primary',
      conferenceDataVersion: entrada.comMeet ? 1 : 0,
      requestBody: montarRecurso(entrada),
    });
    return mapearEvento(resp.data);
  } catch (err) {
    lancarErroGoogle(err, 'agenda');
  }
}

/** Atualiza um evento existente (patch). */
export async function atualizarEvento(
  usuarioId: number,
  eventoId: string,
  entrada: EntradaEvento,
): Promise<EventoAgenda> {
  if (!eventoId) throw new AppError('Evento inválido.', 400);
  validarEntrada(entrada);
  const auth = await criarClienteAutenticado(usuarioId);
  const calendar = google.calendar({ version: 'v3', auth });
  try {
    const resp = await calendar.events.patch({
      calendarId: 'primary',
      eventId: eventoId,
      conferenceDataVersion: entrada.comMeet ? 1 : 0,
      requestBody: montarRecurso(entrada),
    });
    return mapearEvento(resp.data);
  } catch (err) {
    lancarErroGoogle(err, 'agenda');
  }
}

/** Exclui um evento do calendário principal. */
export async function removerEvento(usuarioId: number, eventoId: string): Promise<void> {
  if (!eventoId) throw new AppError('Evento inválido.', 400);
  const auth = await criarClienteAutenticado(usuarioId);
  const calendar = google.calendar({ version: 'v3', auth });
  try {
    await calendar.events.delete({ calendarId: 'primary', eventId: eventoId });
  } catch (err) {
    lancarErroGoogle(err, 'agenda');
  }
}
