/**
 * Espelhos TypeScript das tabelas `blog_posts` e `blog_reacoes`.
 * Única fonte de verdade para a tipagem do módulo de marketing.
 */

export type TipoReacao = 'like' | 'heart' | 'aplauso' | 'foguete';

export interface BlogPost {
  id: number;
  titulo: string;
  conteudo: string;
  imagem_url: string | null;
  autor_id: number;
  publicado: boolean;
  criado_em: Date;
  atualizado_em: Date;
}

export interface BlogReacao {
  id: number;
  post_id: number;
  usuario_id: number;
  tipo: TipoReacao;
  criado_em: Date;
}

/** Shape retornado pelo feed público e pelo painel admin (com dados do autor e contagens). */
export interface BlogPostFeed {
  id: number;
  titulo: string;
  conteudo: string;
  imagem_url: string | null;
  publicado: boolean;
  criado_em: Date;
  autor_id: number;
  autor_nome: string;
  like_count: number;
  heart_count: number;
  aplauso_count: number;
  foguete_count: number;
  minha_reacao: TipoReacao | null;
}

/** Shape estendido para o painel admin (inclui email do autor e data de atualização). */
export interface BlogPostAdmin extends BlogPostFeed {
  autor_email: string;
  atualizado_em: Date;
}

export interface ReacaoResult {
  acao: 'inserida' | 'atualizada' | 'removida';
  tipo: TipoReacao | null;
}
