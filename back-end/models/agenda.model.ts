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
}
