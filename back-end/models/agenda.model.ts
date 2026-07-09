/**
 * DTO de um evento do Google Calendar exposto ao Frontend.
 * Normaliza o `Schema$Event` do Google para um formato enxuto e estável.
 */
export interface EventoAgenda {
  id: string;
  titulo: string;
  /** ISO 8601. Em eventos de dia inteiro vem só a data (YYYY-MM-DD). */
  inicio: string | null;
  fim: string | null;
  diaInteiro: boolean;
  local: string | null;
  descricao: string | null;
  /** Link para abrir o evento no Google Calendar. */
  link: string | null;
  /** Link da reunião (Google Meet), quando houver. */
  linkReuniao: string | null;
  organizador: string | null;
  /** Nomes (ou e-mails) dos convidados do evento. */
  participantes: string[];
  status: string | null;
  /** Tipo do evento (espelha o eventType do Google). */
  tipo: TipoEvento;
  /** Id da agenda de origem no Google (ex.: sala@resource.calendar.google.com). */
  calendarioId: string;
  /** Nome exibível da agenda de origem (summaryOverride ?? summary). */
  calendario: string;
  /** Cor (hex) da agenda de origem, vinda do calendarList. */
  cor: string | null;
  /** true apenas para a agenda principal — só ela é editável pela Intranet. */
  agendaPrincipal: boolean;
}

/** Tipos de evento suportados (menu "Criar" do Google Agenda). */
export type TipoEvento = 'evento' | 'ausente' | 'foco' | 'local' | 'aniversario';

/** Payload de criação/edição de um evento. `tarefa` é tratada via Google Tasks. */
export interface EntradaEvento {
  tipo: 'evento' | 'ausente' | 'foco' | 'local';
  titulo: string;
  /** ISO (timed) ou YYYY-MM-DD (dia inteiro / local de trabalho). */
  inicio?: string;
  fim?: string;
  diaInteiro?: boolean;
  local?: string | null;
  descricao?: string | null;
  participantes?: string[];
  comMeet?: boolean;
  /** Ausente/Foco: recusar automaticamente reuniões conflitantes. */
  recusarConflitos?: boolean;
  mensagemRecusa?: string | null;
  /** Local de trabalho. */
  tipoLocal?: 'casa' | 'escritorio' | 'personalizado';
  rotuloLocal?: string | null;
  timeZone?: string;
}
