import { ArrowLeft, Hash, Lock, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useChat } from '@/chat/chat-context'
import ListaMensagens from './ListaMensagens'
import InputMensagem from './InputMensagem'

const ICONES = { PRIVADO: Lock, SETOR: Hash, CUSTOMIZADO: Users }

/** Janela de conversa ativa: header + mensagens + input. */
export default function JanelaMensagens() {
  const { canalAtivo, canais, setCanalAtivo, fecharPainel } = useChat()
  const canal = canais.find((c) => c.id === canalAtivo)
  const Icone = ICONES[canal?.tipo ?? 'SETOR'] ?? Hash

  const nomeCanalExibido =
    canal?.tipo === 'PRIVADO' ? canal.nome_outro_usuario : canal?.nome ?? 'Canal'

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 border-b px-3 py-2">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0"
          onClick={() => setCanalAtivo(null)}
          title="Voltar"
        >
          <ArrowLeft className="size-4" />
        </Button>
        <Icone className="size-4 shrink-0 text-muted-foreground" />
        <span className="min-w-0 flex-1 truncate text-sm font-semibold">{nomeCanalExibido}</span>
      </div>

      {/* Mensagens */}
      {canalAtivo != null && <ListaMensagens canalId={canalAtivo} />}

      {/* Input */}
      <InputMensagem />
    </div>
  )
}
