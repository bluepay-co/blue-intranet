import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useChat } from '@/chat/chat-context'
import ListaCanais from './ListaCanais'
import JanelaMensagens from './JanelaMensagens'

/**
 * Painel lateral de chat — desliza da direita.
 * Implementado como div fixa (sem Radix Sheet, que não está instalado).
 */
export default function ChatPainel() {
  const { painelAberto, fecharPainel, canalAtivo } = useChat()

  return (
    <>
      {/* Overlay semi-transparente */}
      {painelAberto && (
        <div
          className="fixed inset-0 z-30 bg-black/20 md:hidden"
          onClick={fecharPainel}
        />
      )}

      <div
        className={`fixed inset-y-0 right-0 z-40 flex w-[380px] max-w-full flex-col bg-card border-l shadow-xl transition-transform duration-200 ${
          painelAberto ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header do painel */}
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h2 className="text-sm font-semibold">Mensagens</h2>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={fecharPainel}>
            <X className="size-4" />
          </Button>
        </div>

        {/* Conteúdo: lista de canais ou janela de mensagens */}
        {canalAtivo != null ? <JanelaMensagens /> : <ListaCanais />}
      </div>
    </>
  )
}
