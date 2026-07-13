import { useEffect } from 'react'
import { MessageSquare } from 'lucide-react'
import { useChat } from '@/chat/chat-context'
import { cn } from '@/lib/utils'
import ListaCanais from '@/components/chat/ListaCanais'
import JanelaMensagens from '@/components/chat/JanelaMensagens'

/**
 * Página de mensagens em tela cheia (rota /chat), layout de duas colunas:
 * lista de canais à esquerda + conversa aberta à direita.
 *
 * Reaproveita a lógica do painel: chama abrirPainel()/fecharPainel() para que
 * o ChatProvider trate corretamente mensagens do canal ativo como lidas.
 */
export default function Chat() {
  const { canalAtivo, abrirPainel, fecharPainel } = useChat()

  useEffect(() => {
    abrirPainel()
    return () => fecharPainel()
  }, [abrirPainel, fecharPainel])

  const temCanalAtivo = canalAtivo != null

  return (
    <div className="-m-6 flex h-[calc(100%+3rem)] overflow-hidden bg-card lg:-m-8 lg:h-[calc(100%+4rem)]">
      {/* Coluna esquerda: lista de canais (some no mobile quando há conversa aberta) */}
      <div
        className={cn(
          'w-full shrink-0 flex-col border-r md:flex md:w-72',
          temCanalAtivo ? 'hidden' : 'flex',
        )}
      >
        <div className="flex items-center gap-2 border-b px-4 py-3">
          <MessageSquare className="size-4 text-muted-foreground" />
          <h1 className="text-sm font-semibold">Mensagens</h1>
        </div>
        <ListaCanais />
      </div>

      {/* Coluna direita: conversa ativa ou estado vazio */}
      <div className={cn('min-w-0 flex-1 flex-col', temCanalAtivo ? 'flex' : 'hidden md:flex')}>
        {temCanalAtivo ? (
          <JanelaMensagens />
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center text-muted-foreground">
            <MessageSquare className="size-10 opacity-40" />
            <p className="text-sm">Selecione uma conversa para começar</p>
          </div>
        )}
      </div>
    </div>
  )
}
