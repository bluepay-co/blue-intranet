/**
 * Espelho TypeScript da tabela `usuarios` do banco `intranet_dev`.
 * Única fonte de verdade para a tipagem de dados de autenticação/RBAC.
 */

/** Cargos corporativos (RBAC). Reflete o CHECK da coluna `role`. */
export enum Role {
  TI = 'TI',
  DESENVOLVEDOR = 'DESENVOLVEDOR',
  MARKETING = 'MARKETING',
  INSIGHT_SALES = 'INSIGHT_SALES',
  KAM = 'KAM',
  RH = 'RH',
  VENDAS = 'VENDAS',
  FINANCEIRO = 'FINANCEIRO',
  DIRETORIA = 'DIRETORIA',
  COLABORADOR = 'COLABORADOR',
  CX = 'CX',
  PRODUTOS = 'PRODUTOS',
  PRE_VENDAS = 'PRE_VENDAS',
}

export interface Usuario {
  id: number;
  nome: string;
  email: string;
  role: Role;
  /** Quando true, o usuário fica impedido de logar/restaurar a sessão (bloqueio pela T.I). */
  bloqueado: boolean;
  google_access_token: string | null;
  google_refresh_token: string | null;
  criado_em: Date;
  atualizado_em: Date;
}

/** Subconjunto seguro do usuário exposto ao Frontend (sem tokens do Google). */
export type UsuarioPublico = Pick<Usuario, 'id' | 'nome' | 'email' | 'role'>;

/** Visão administrativa (painel da T.I): inclui estado de bloqueio e data de cadastro. */
export type UsuarioAdmin = Pick<
  Usuario,
  'id' | 'nome' | 'email' | 'role' | 'bloqueado' | 'criado_em'
>;
