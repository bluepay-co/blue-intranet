/**
 * Espelho TypeScript da tabela `usuarios` do banco `intranet_dev`.
 * Única fonte de verdade para a tipagem de dados de autenticação/RBAC.
 */

/** Cargos corporativos (RBAC). Reflete o CHECK da coluna `role`. */
export enum Role {
  TI = 'TI',
  RH = 'RH',
  FINANCEIRO = 'FINANCEIRO',
  DIRETORIA = 'DIRETORIA',
  COLABORADOR = 'COLABORADOR',
}

export interface Usuario {
  id: number;
  nome: string;
  email: string;
  role: Role;
  google_access_token: string | null;
  google_refresh_token: string | null;
  criado_em: Date;
  atualizado_em: Date;
}

/** Subconjunto seguro do usuário exposto ao Frontend (sem tokens do Google). */
export type UsuarioPublico = Pick<Usuario, 'id' | 'nome' | 'email' | 'role'>;
