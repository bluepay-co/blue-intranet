import { useEffect } from 'react'

/** Solicita permissão para notificações do Chrome na montagem. */
export function useChatNotificacoes() {
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }, [])

  /**
   * Dispara uma notificação nativa do Chrome.
   * @param {{ autor_nome: string; conteudo: string | null }} mensagem
   */
  function notificarDesktop(mensagem) {
    if (!('Notification' in window) || Notification.permission !== 'granted') return
    try {
      new Notification(mensagem.autor_nome, {
        body: mensagem.conteudo ?? '[Arquivo]',
        icon: '/logo-azul.svg',
      })
    } catch {
      // Service worker não registrado — ignora silenciosamente
    }
  }

  return { notificarDesktop }
}
