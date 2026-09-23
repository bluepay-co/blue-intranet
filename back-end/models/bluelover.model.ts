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
  /** Seção 01 — "Como prefere ser chamado(a)": exibido como Nome (Apelido). */
  apelido: string | null;
  data_nascimento: Date | null;
  bio: string | null;
  /** Três palavras que definem a pessoa, exibidas como chips. */
  habilidades: string[];
  /** Maior talento ou habilidade. */
  talento: string | null;
  /** Seção 03 — Gostos & Personalidade (emojis são fixos no front). */
  gosto_comida: string | null;
  gosto_assiste: string | null;
  gosto_musica: string | null;
  gosto_cor: string | null;
  gosto_rede_social: string | null;
  gosto_emoji: string | null;
  hobby: string | null;
  presente_perfeito: string | null;
  /** Títulos personalizados dos cards de gosto: { gosto_comida: "..." }. */
  rotulos_gostos: Record<string, string>;
  /** Seção 04 — Viagens. */
  viagem_favorita_texto: string | null;
  viagem_favorita_foto_url: string | null;
  viagem_sonho: string | null;
  viagem_sonho_foto_url: string | null;
  /** Seção 05 — Inspirações. */
  inspiracao_texto: string | null;
  inspiracao_foto_url: string | null;
  /** Seção 07 — Bluepay como pessoa. */
  bluepay_pessoa_texto: string | null;
  bluepay_pessoa_foto_url: string | null;
  /** Seção 09. */
  mais_sobre_mim: string | null;
  ordem: number;
  publicado: boolean;
  criado_por: number;
  criado_em: Date;
  atualizado_em: Date;
}

/** Seção 02: um dos 4 cards de conquistas, identificado pela chave. */
export type ChaveConquista =
  | 'realizacao_pessoal'
  | 'realizacao_profissional'
  | 'sonho'
  | 'desenvolver';

/** `livre`: blocos criados antes do novo formato, preservados. */
export type TipoBloco = 'conquista' | 'momento' | 'livre';

/** Linha de `bluelover_blocos`: card da seção 02 ou momento da timeline (seção 06). */
export interface BlueloverBloco {
  id: number;
  bluelover_id: number;
  tipo: TipoBloco;
  /** Preenchida apenas quando `tipo = 'conquista'`. */
  chave: ChaveConquista | null;
  titulo: string;
  texto: string;
  /** Rótulo da timeline (ex.: "2024", "Jan/2025"). */
  rotulo_data: string | null;
  foto_url: string | null;
  ordem: number;
  criado_em: Date;
}

/** Shape enxuto da listagem pública — só o que o card precisa. */
export type BlueloverCard = Pick<
  Bluelover,
  'id' | 'nome' | 'cargo' | 'setor' | 'frase' | 'foto_capa_url' | 'ordem' | 'apelido'
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
