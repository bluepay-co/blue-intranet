import { createContext, useContext } from 'react'

/**
 * Contexto do chat interno.
 *
 * @typedef {{ id: number; tipo: string; nome: string | null; nome_outro_usuario: string | null; unread_count: number; ultima_mensagem_preview: string | null; ultima_mensagem_em: string | null }} CanalListaItem
 * @typedef {{ id: number; canal_id: number; autor_id: number; autor_nome: string; conteudo: string | null; anexo_url: string | null; anexo_nome: string | null; anexo_mime: string | null; editada: boolean; deletada: boolean; criado_em: string }} MensagemPublica
 */
export const ChatContext = createContext(null)

/** Hook de acesso ao contexto do chat. */
export function useChat() {
  const ctx = useContext(ChatContext)
  if (!ctx) throw new Error('useChat deve ser usado dentro de <ChatProvider>.')
  return ctx
}
