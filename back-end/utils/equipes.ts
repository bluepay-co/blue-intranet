import { Role } from '../models/usuario.model';

/**
 * Equipes do Kanban de Tarefas. Roles fora do mapa formam uma equipe própria
 * (a chave é a própria role) e não têm coordenador.
 */
interface Equipe {
  nome: string;
  membros: Role[];
  coordenadores: Role[];
}

export const EQUIPES: Record<string, Equipe> = {
  inside_cx: {
    nome: 'Inside Sales & CX',
    membros: [Role.INSIGHT_SALES, Role.CX, Role.GERENTE_INSIDE_CX],
    coordenadores: [Role.GERENTE_INSIDE_CX],
  },
  pre_vendas: {
    nome: 'Pré-vendas',
    membros: [Role.PRE_VENDAS, Role.VENDAS, Role.GERENTE_PRE_VENDAS],
    coordenadores: [Role.GERENTE_PRE_VENDAS],
  },
  comercial: {
    nome: 'Comercial',
    membros: [Role.KAM, Role.GERENTE_COMERCIAL],
    coordenadores: [Role.GERENTE_COMERCIAL],
  },
};

/** Chave da equipe à qual a role pertence. */
export function equipeDaRole(role: Role): string {
  const entrada = Object.entries(EQUIPES).find(([, e]) => e.membros.includes(role));
  return entrada?.[0] ?? role;
}

/** Equipes que a role coordena (vazio se não for coordenador). */
export function equipesCoordenadas(role: Role): string[] {
  return Object.entries(EQUIPES)
    .filter(([, e]) => e.coordenadores.includes(role))
    .map(([chave]) => chave);
}

export function nomeEquipe(chave: string): string {
  return EQUIPES[chave]?.nome ?? chave;
}

/** Roles que compõem a equipe (equipe avulsa = a própria role). */
export function rolesDaEquipe(chave: string): Role[] {
  return EQUIPES[chave]?.membros ?? [chave as Role];
}

/** Cargos com acesso ao Kanban da Equipe (Colaborador fica de fora por enquanto). */
export const KANBAN_ROLES: Role[] = [
  Role.TI,
  Role.DESENVOLVEDOR,
  Role.MARKETING,
  Role.PRODUTOS,
  Role.KAM,
  Role.INSIGHT_SALES,
  Role.CX,
  Role.GERENTE_INSIDE_CX,
  Role.GERENTE_COMERCIAL,
  Role.VENDAS,
  Role.PRE_VENDAS,
  Role.GERENTE_PRE_VENDAS,
  Role.RH,
  Role.FINANCEIRO,
  Role.DIRETORIA,
];
