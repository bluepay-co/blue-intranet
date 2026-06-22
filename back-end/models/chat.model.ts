/** Tipos dos canais de chat disponíveis. */
export type TipoCanal = 'PRIVADO' | 'SETOR' | 'CUSTOMIZADO';

/** Linha bruta da tabela `chat_canais`. */
export interface ChatCanal {
  id: number;
  tipo: TipoCanal;
  nome: string | null;
  criado_por: number | null;
  criado_em: Date;
}

/** Linha bruta da tabela `chat_canal_membros`. */
export interface ChatCanalMembro {
  canal_id: number;
  usuario_id: number;
  entrou_em: Date;
}

/** Linha bruta da tabela `chat_mensagens`. */
export interface ChatMensagem {
  id: number;
  canal_id: number;
  usuario_id: number;
  conteudo_cifrado: string | null;
  iv: string | null;
  auth_tag: string | null;
  anexo_url: string | null;
  anexo_nome: string | null;
  anexo_mime: string | null;
  editada: boolean;
  deletada: boolean;
  criado_em: Date;
  atualizado_em: Date;
}

/** Linha bruta da tabela `chat_leituras`. */
export interface ChatLeitura {
  canal_id: number;
  usuario_id: number;
  ultima_leitura_em: Date;
}

/** DTO do canal retornado na listagem do usuário. */
export interface CanalListaItem {
  id: number;
  tipo: TipoCanal;
  nome: string | null;
  /** Nome do outro participante (preenchido apenas para canais PRIVADO). */
  nome_outro_usuario: string | null;
  unread_count: number;
  ultima_mensagem_preview: string | null;
  ultima_mensagem_em: Date | null;
}

/** DTO de mensagem seguro para o frontend (já descriptografado). */
export interface MensagemPublica {
  id: number;
  canal_id: number;
  autor_id: number;
  autor_nome: string;
  conteudo: string | null;
  anexo_url: string | null;
  anexo_nome: string | null;
  anexo_mime: string | null;
  editada: boolean;
  deletada: boolean;
  criado_em: Date;
}
