/**
 * DTO de uma tarefa do Google Tasks exposto ao Frontend.
 * Normaliza o `tasks_v1.Schema$Task` para um formato enxuto.
 */
export interface Tarefa {
  id: string;
  titulo: string;
  notas: string | null;
  concluida: boolean;
  /** Data de vencimento (RFC3339, normalmente só a data importa). */
  vencimento: string | null;
  /** Momento da conclusão (RFC3339), quando concluída. */
  concluidaEm: string | null;
}

/** Campos aceitos ao criar/atualizar uma tarefa. */
export interface EntradaTarefa {
  titulo?: string;
  notas?: string | null;
  vencimento?: string | null;
  concluida?: boolean;
}
