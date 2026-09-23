/** Espelho da tabela `formularios` (referência local ao Google Form). */
export interface FormularioRegistro {
  id: number;
  google_form_id: string;
  titulo: string;
  responder_uri: string;
  criado_por: number;
  criado_em: Date;
  atualizado_em: Date;
}

export type TipoPergunta =
  | 'texto_curto'
  | 'paragrafo'
  | 'multipla_escolha'
  | 'caixas_selecao'
  | 'lista_suspensa'
  | 'escala'
  | 'data'
  | 'hora';

/** Coleta de e-mail de quem responde (`settings.emailCollectionType` do Google). */
export type ColetaEmail = 'nao_coletar' | 'verificado' | 'informado';

/** `nao_suportado`: item criado no Google (seção, imagem, grade, quiz) preservado sem edição. */
export interface ItemFormulario {
  /** `itemId` do Google; ausente em itens novos. */
  id?: string;
  tipo: TipoPergunta | 'nao_suportado';
  titulo: string;
  descricao: string | null;
  obrigatoria: boolean;
  /** multipla_escolha, caixas_selecao, lista_suspensa. */
  opcoes?: string[];
  /** Opção "Outro" (multipla_escolha e caixas_selecao). */
  permitirOutro?: boolean;
  escala?: { min: number; max: number; rotuloMin: string | null; rotuloMax: string | null };
  /** data: inclui horário. */
  incluirHora?: boolean;
}

export interface FormularioResumo {
  id: number;
  googleFormId: string;
  titulo: string;
  responderUri: string;
  criadoPor: { id: number; nome: string };
  criadoEm: Date;
  atualizadoEm: Date;
}

export interface Formulario extends FormularioResumo {
  descricao: string | null;
  editUri: string;
  publicado: boolean;
  aceitandoRespostas: boolean;
  coletaEmail: ColetaEmail;
  /** `revisionId` do Google; reenviado na edição para detectar conflito. */
  revisao: string;
  itens: ItemFormulario[];
}

/** Payload de criação/edição. */
export interface EntradaFormulario {
  titulo?: string;
  descricao?: string | null;
  itens?: ItemFormulario[];
  coletaEmail?: ColetaEmail;
  revisao?: string;
}

export interface ColunaResposta {
  questionId: string;
  titulo: string;
  tipo: TipoPergunta | 'nao_suportado';
  /** Todas as opções, para exibir também as sem votos. */
  opcoes?: string[];
  escala?: ItemFormulario['escala'];
}

export interface RespostaFormulario {
  id: string;
  enviadaEm: string | null;
  email: string | null;
  /** questionId -> valores respondidos. */
  valores: Record<string, string[]>;
}

export interface RespostasFormulario {
  titulo: string;
  perguntas: ColunaResposta[];
  respostas: RespostaFormulario[];
}
