/**
 * Espelhos TypeScript das tabelas `bluelovers` e `bluelover_blocos`.
 * Única fonte de verdade para a tipagem do módulo de perfis do time (Marketing).
 */

export interface Bluelover {
  id: number;
  nome: string;
  cargo: string | null;
  setor: string | null;
  /** Chamada curta exibida no card da listagem. */
  frase: string | null;
  /** Foto 1080x1350 (4:5) usada no card. Obrigatória. */
  foto_capa_url: string;
  /** Imagem grande do topo da página de perfil. Cai para a capa quando ausente. */
  foto_destaque_url: string | null;
  ordem: number;
  publicado: boolean;
  criado_por: number;
  criado_em: Date;
  atualizado_em: Date;
}

/** Seção do "mini jornal" do perfil (ex.: "Eu amo, eu adoro", "Meus sonhos"). */
export interface BlueloverBloco {
  id: number;
  bluelover_id: number;
  titulo: string;
  texto: string;
  /** Foto pequena exibida ao lado do texto. Opcional. */
  foto_url: string | null;
  ordem: number;
  criado_em: Date;
}

/** Shape enxuto da listagem pública — só o que o card precisa. */
export type BlueloverCard = Pick<
  Bluelover,
  'id' | 'nome' | 'cargo' | 'setor' | 'frase' | 'foto_capa_url' | 'ordem'
>;

/** Shape do painel admin: inclui rascunhos e a contagem de blocos já montados. */
export interface BlueloverAdmin extends BlueloverCard {
  foto_destaque_url: string | null;
  publicado: boolean;
  criado_em: Date;
  atualizado_em: Date;
  total_blocos: number;
}

/** Perfil completo com suas seções, usado na página de perfil e no editor. */
export interface BlueloverDetalhe extends Bluelover {
  blocos: BlueloverBloco[];
}

/**
 * Paths de arquivos que ficaram órfãos após um delete. O service os coleta e o
 * controller — único responsável pelo filesystem — remove do disco.
 */
export interface FotosOrfas {
  paths: string[];
}
