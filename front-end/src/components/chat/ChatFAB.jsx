import { MessageSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useChat } from '@/chat/chat-context'

/**
 * Botão flutuante de acesso ao chat.
 * Posicionado fora da sidebar (md:left-[17rem]) no desktop e na borda esquerda no mobile.
 */
export default function ChatFAB() {
  const { totalNaoLidos, abrirPainel } = useChat()

  return (
    <div className="fixed bottom-6 left-4 z-30 md:left-[17rem]">
      <Button
        size="icon"
        className="relative h-12 w-12 rounded-full bg-blue-600 text-white shadow-lg hover:bg-blue-700"
        onClick={abrirPainel}
        aria-label="Abrir chat"
      >
        <MessageSquare className="size-5" />
        {totalNaoLidos > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white">
            {totalNaoLidos > 99 ? '99+' : totalNaoLidos}
          </span>
        )}
      </Button>
    </div>
  )
}
