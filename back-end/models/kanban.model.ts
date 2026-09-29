/**
 * Espelhos TypeScript das tabelas `kanban_tarefas`, `kanban_historico` e
 * `kanban_notificacoes`. Única fonte de verdade para a tipagem do Kanban de Tarefas.
 */
import type { Role } from './usuario.model';

export type PrioridadeTarefa = 'urgent' | 'high' | 'normal' | 'low';
export type StatusTarefa = 'todo' | 'doing' | 'done';
/** private = só o responsável; requester = responsável + solicitante; team = + equipe e coordenação. */
export type VisibilidadeTarefa = 'private' | 'requester' | 'team';
export type TipoHistorico = 'evento' | 'comentario';
export type TipoNotificacao = 'solicitacao' | 'comentario' | 'cobranca' | 'status' | 'lembrete' | 'vencido' | 'esquecida';

export interface KanbanTarefa {
  id: number;
  titulo: string;
  descricao: string;
  responsavel_id: number;
  solicitante_id: number;
  criador_id: number;
  area_solicitante: string;
  prioridade: PrioridadeTarefa;
  status: StatusTarefa;
  visibilidade: VisibilidadeTarefa;
  prazo: Date;
  lembrete_min: number;
  lembrete_em: Date | null;
  lembrete_enviado: boolean;
  vencimento_notificado: boolean;
  ordem: number;
  criado_em: Date;
  atualizado_em: Date;
  concluido_em: Date | null;
}

/** Pessoa extra que acompanha a tarefa (tabela `kanban_participantes`). */
export interface KanbanParticipante {
  id: number;
  nome: string;
}

/** Subitem marcável da tarefa (tabela `kanban_checklist`). */
export interface KanbanChecklistItem {
  id: number;
  tarefa_id: number;
  texto: string;
  concluido: boolean;
  ordem: number;
  criado_por: number;
  concluido_por: number | null;
  concluido_por_nome: string | null;
  criado_em: Date;
  concluido_em: Date | null;
}

/** Tarefa com nomes/roles das pessoas envolvidas, pronta para o quadro. */
export interface KanbanTarefaDetalhada extends KanbanTarefa {
  participantes: KanbanParticipante[];
  /** Progresso do checklist, exibido no card (ex.: 3/5). */
  checklist_total: number;
  checklist_feitos: number;
  responsavel_nome: string;
  responsavel_role: Role;
  solicitante_nome: string;
  solicitante_role: Role;
}

/** Permissões do usuário logado sobre a tarefa (calculadas no service). */
export interface PermissoesTarefa {
  pode_mover: boolean;
  pode_editar: boolean;
  pode_excluir: boolean;
  /** Adicionar, marcar e remover itens do checklist. */
  pode_checklist: boolean;
}

export type KanbanTarefaVisao = KanbanTarefaDetalhada & PermissoesTarefa;

export interface KanbanHistorico {
  id: number;
  tarefa_id: number;
  usuario_id: number;
  usuario_nome: string;
  tipo: TipoHistorico;
  texto: string;
  criado_em: Date;
}

export interface KanbanNotificacao {
  id: number;
  destinatario_id: number;
  tarefa_id: number;
  tarefa_titulo: string;
  tipo: TipoNotificacao;
  texto: string;
  lida: boolean;
  criado_em: Date;
}

/** Usuário disponível nos selects de responsável/solicitante. */
export interface KanbanUsuario {
  id: number;
  nome: string;
  role: Role;
  equipe: string;
}
