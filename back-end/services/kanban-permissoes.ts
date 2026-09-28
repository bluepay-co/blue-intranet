import type { AuthPayload } from '../middleware/auth.middleware';
import type { KanbanTarefaDetalhada, PermissoesTarefa } from '../models/kanban.model';
import { equipeDaRole, equipesCoordenadas, rolesDaEquipe } from '../utils/equipes';
import type { Role } from '../models/usuario.model';

/**
 * Roles cujas tarefas "Minha equipe" o usuário enxerga: a própria equipe e as
 * que ele coordena. Diretoria não tem visão global — privacidade por equipe.
 */
export function rolesVisiveis(usuario: AuthPayload): Role[] {
  const equipes = new Set([equipeDaRole(usuario.role), ...equipesCoordenadas(usuario.role)]);
  return [...equipes].flatMap(rolesDaEquipe);
}

/** Coordenador só age sobre tarefas compartilhadas com a equipe (privada é privada). */
function coordena(usuario: AuthPayload, tarefa: KanbanTarefaDetalhada): boolean {
  return (
    tarefa.visibilidade === 'team' &&
    equipesCoordenadas(usuario.role).includes(equipeDaRole(tarefa.responsavel_role))
  );
}

/** Participantes veem, comentam e cobram — não movem nem editam. */
export const ehParticipante = (usuario: AuthPayload, tarefa: KanbanTarefaDetalhada) =>
  tarefa.participantes.some((p) => p.id === usuario.id);

export function podeVer(usuario: AuthPayload, tarefa: KanbanTarefaDetalhada): boolean {
  if (tarefa.responsavel_id === usuario.id) return true;
  if (tarefa.visibilidade === 'private') return false;
  if (tarefa.solicitante_id === usuario.id) return true;
  if (ehParticipante(usuario, tarefa)) return true;
  return tarefa.visibilidade === 'team' && rolesVisiveis(usuario).includes(tarefa.responsavel_role);
}

export function permissoes(usuario: AuthPayload, tarefa: KanbanTarefaDetalhada): PermissoesTarefa {
  const ehCoordenador = coordena(usuario, tarefa);
  const ehCriador = tarefa.criador_id === usuario.id;
  return {
    pode_mover: tarefa.responsavel_id === usuario.id || ehCoordenador,
    pode_editar: ehCoordenador || ehCriador,
    pode_excluir: ehCoordenador || ehCriador,
  };
}
