import { useState, useRef } from 'react'
import { Paperclip, Send, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useChat } from '@/chat/chat-context'

const MIME_ACEITOS = 'image/*,application/pdf,.xlsx,.xls'

/** Campo de composição de mensagens com suporte a texto e anexo. */
export default function InputMensagem() {
  const { enviar } = useChat()
  const [texto, setTexto] = useState('')
  const [arquivo, setArquivo] = useState(null)
  const [enviando, setEnviando] = useState(false)
  const fileInputRef = useRef(null)
  const textareaRef = useRef(null)

  function autoResize(el) {
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 100) + 'px'
  }

  async function handleEnviar() {
    if (enviando || (!texto.trim() && !arquivo)) return
    setEnviando(true)
    try {
      await enviar(texto.trim() || null, arquivo)
      setTexto('')
      setArquivo(null)
      if (textareaRef.current) textareaRef.current.style.height = 'auto'
    } finally {
      setEnviando(false)
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleEnviar()
    }
  }

  function handleArquivo(e) {
    const f = e.target.files?.[0]
    if (f) setArquivo(f)
    e.target.value = ''
  }

  return (
    <div className="border-t p-3">
      {arquivo && (
        <div className="mb-2 flex items-center gap-2 rounded-md bg-muted px-3 py-1.5 text-xs">
          <Paperclip className="size-3 shrink-0" />
          <span className="min-w-0 truncate">{arquivo.name}</span>
          <button type="button" onClick={() => setArquivo(null)} className="ml-auto shrink-0">
            <X className="size-3.5" />
          </button>
        </div>
      )}

      <div className="flex items-end gap-2">
        <button
          type="button"
          className="shrink-0 text-muted-foreground hover:text-foreground"
          onClick={() => fileInputRef.current?.click()}
          title="Anexar arquivo"
        >
          <Paperclip className="size-4" />
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept={MIME_ACEITOS}
          className="hidden"
          onChange={handleArquivo}
        />

        <textarea
          ref={textareaRef}
          value={texto}
          onChange={(e) => { setTexto(e.target.value); autoResize(e.target) }}
          onKeyDown={handleKeyDown}
          placeholder="Escreva uma mensagem… (Enter para enviar)"
          rows={1}
          className="flex-1 resize-none rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-blue-500 placeholder:text-muted-foreground"
        />

        <Button
          size="icon"
          className="h-9 w-9 shrink-0 bg-blue-600 hover:bg-blue-700"
          onClick={handleEnviar}
          disabled={enviando || (!texto.trim() && !arquivo)}
        >
          <Send className="size-4" />
        </Button>
      </div>
    </div>
  )
}
