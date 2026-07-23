/**
 * Aviso de atualização da intranet, criado pelo T.I. e exibido como card modal
 * para todos os usuários. Espelha a tabela `blue_intranet.update_notify`.
 */
export interface Atualizacao {
  id: number;
  titulo: string;
  subtitulo: string | null;
  /** Categoria do aviso (ex.: ATUALIZACAO, AVISO, NOVIDADE, MANUTENCAO) — define o ícone/cor no card. */
  categoria: string;
  /** Momento agendado para o aviso começar a aparecer. NULL = dispara na criação. */
  publicar_em: string | null;
  criado_por: number | null;
  criado_em: string;
  atualizado_em: string;
}
