import { Hash, Lock, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useChat } from '@/chat/chat-context'

const ICONES = {
  PRIVADO: Lock,
  SETOR: Hash,
  CUSTOMIZADO: Users,
}

/** Uma linha na lista de canais do painel de chat. */
export default function ItemCanal({ canal }) {
  const { canalAtivo, setCanalAtivo } = useChat()
  const Icone = ICONES[canal.tipo] ?? Hash
  const nome = canal.tipo === 'PRIVADO' ? canal.nome_outro_usuario : canal.nome

  return (
    <Button
      variant="ghost"
      className={`w-full justify-start gap-2 px-2 py-2 text-left h-auto rounded-lg ${canalAtivo === canal.id ? 'bg-accent' : ''}`}
      onClick={() => setCanalAtivo(canal.id)}
    >
      <Icone className="size-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-1">
          <span className="truncate text-sm font-medium">{nome ?? 'Canal'}</span>
          {canal.unread_count > 0 && (
            <span className="flex h-4 min-w-4 shrink-0 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
              {canal.unread_count > 99 ? '99+' : canal.unread_count}
            </span>
          )}
        </div>
        {canal.ultima_mensagem_preview && (
          <p className="truncate text-xs text-muted-foreground">{canal.ultima_mensagem_preview}</p>
        )}
      </div>
    </Button>
  )
}
