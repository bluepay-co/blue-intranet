/**
 * Espelho TypeScript das tabelas `chamados` e `chamado_comentarios`
 * (schema `blue_intranet`). Única fonte de verdade para a tipagem do domínio.
 */

/** Status do chamado (reflete o CHECK da coluna `status`). */
export enum StatusChamado {
  ABERTO = 'ABERTO',
  EM_ANDAMENTO = 'EM_ANDAMENTO',
  FECHADO = 'FECHADO',
}

/** Categorias de alto nível (reflete o CHECK da coluna `categoria`). */
export enum CategoriaChamado {
  IMPRESSORA = 'IMPRESSORA',
  COMPUTADOR = 'COMPUTADOR',
  REDE = 'REDE',
  ACESSOS = 'ACESSOS',
  OUTROS = 'OUTROS',
  BUG = 'BUG',
  MELHORIA = 'MELHORIA',
  DUVIDA = 'DUVIDA',
  INTEGRACAO = 'INTEGRACAO',
}

/** Nível de criticidade / SLA (reflete o CHECK da coluna `criticidade`). */
export enum CriticidadeChamado {
  BAIXO = 'BAIXO',
  MEDIO = 'MEDIO',
  ALTO = 'ALTO',
  CRITICO = 'CRITICO',
}

/** Linha completa da tabela `chamados`. */
export interface Chamado {
  id: number;
  titulo: string;
  descricao: string;
  categoria: CategoriaChamado;
  criticidade: CriticidadeChamado;
  status: StatusChamado;
  anexo_url: string | null;
  anexo_nome: string | null;
  anexo_mime: string | null;
  identificador_url: string | null;
  usuario_id: number;
  atendente_id: number | null;
  fechado_em: Date | null;
  criado_em: Date;
  atualizado_em: Date;
}

/** Linha completa da tabela `chamado_comentarios` (conteúdo cifrado). */
export interface ChamadoComentario {
  id: number;
  chamado_id: number;
  usuario_id: number;
  conteudo_cifrado: string;
  iv: string;
  auth_tag: string;
  criado_em: Date;
}

/** Item de lista (painel do colaborador ou da T.I.), com o nome do autor. */
export interface ChamadoLista {
  id: number;
  titulo: string;
  categoria: CategoriaChamado;
  criticidade: CriticidadeChamado;
  status: StatusChamado;
  tem_anexo: boolean;
  identificador_url: string | null;
  autor_id: number;
  autor_nome: string;
  atendente_nome: string | null;
  criado_em: Date;
  atualizado_em: Date;
}

/** Comentário já descriptografado, seguro para enviar ao Frontend. */
export interface ComentarioPublico {
  id: number;
  chamado_id: number;
  autor_id: number;
  autor_nome: string;
  conteudo: string;
  criado_em: Date;
}

/** Ficha completa do chamado + chat (comentários em texto claro). */
export interface ChamadoDetalhe {
  id: number;
  titulo: string;
  descricao: string;
  categoria: CategoriaChamado;
  criticidade: CriticidadeChamado;
  status: StatusChamado;
  anexo_url: string | null;
  anexo_nome: string | null;
  anexo_mime: string | null;
  identificador_url: string | null;
  autor_id: number;
  autor_nome: string;
  autor_email: string;
  atendente_id: number | null;
  criado_em: Date;
  atualizado_em: Date;
  comentarios: ComentarioPublico[];
}

/** Contagem genérica (rótulo + total) para os gráficos do painel. */
export interface ContagemRotulo {
  rotulo: string;
  total: number;
}

/** Ponto da linha de tendência (abertos × finalizados por dia). */
export interface TendenciaDia {
  dia: string;
  abertos: number;
  finalizados: number;
}

/** Métricas globais do painel da T.I. */
export interface DashboardTI {
  kpis: {
    ativos: number;
    criticos: number;
    tempoMedioHoras: number | null;
    totalMes: number;
  };
  porStatus: ContagemRotulo[];
  porSetor: ContagemRotulo[];
  porCategoria: ContagemRotulo[];
  tendencia: TendenciaDia[];
}

/** Resumo leve para o polling de notificações. */
export interface ChamadoResumo {
  id: number;
  titulo: string;
  status: StatusChamado;
  autor_id: number;
  atualizado_em: Date;
  ultimo_comentario_em: Date | null;
  ultimo_comentario_autor_id: number | null;
}
