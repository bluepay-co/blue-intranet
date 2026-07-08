import { useState } from 'react'
import { Pencil, Trash2, MoreHorizontal, Check, X, Paperclip } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAuth } from '@/auth/auth-context'
import { useChat } from '@/chat/chat-context'

function formatarHora(dataISO) {
  try {
    return new Date(dataISO).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  } catch { return '' }
}

const MIME_IMAGEM = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']

/** Bolha de mensagem individual no chat. */
export default function BolhaMensagem({ mensagem }) {
  const { usuario } = useAuth()
  const { editar, deletar } = useChat()
  const [editando, setEditando] = useState(false)
  const [textoEdit, setTextoEdit] = useState('')

  const isAutor = usuario?.id === mensagem.autor_id
  const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'

  function iniciarEdicao() {
    setTextoEdit(mensagem.conteudo ?? '')
    setEditando(true)
  }

  async function salvarEdicao() {
    if (!textoEdit.trim()) return
    await editar(mensagem.id, textoEdit.trim())
    setEditando(false)
  }

  return (
    <div className={`group flex gap-2 px-4 py-1 hover:bg-muted/30 ${isAutor ? 'flex-row-reverse' : ''}`}>
      {/* Avatar inicial */}
      <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-semibold text-white">
        {mensagem.autor_nome?.[0]?.toUpperCase() ?? '?'}
      </div>

      <div className={`max-w-[75%] space-y-0.5 ${isAutor ? 'items-end' : 'items-start'} flex flex-col`}>
        {/* Cabeçalho */}
        <div className={`flex items-baseline gap-2 ${isAutor ? 'flex-row-reverse' : ''}`}>
          <span className="text-xs font-semibold">{mensagem.autor_nome}</span>
          <span className="text-[10px] text-muted-foreground">{formatarHora(mensagem.criado_em)}</span>
          {mensagem.editada && <span className="text-[10px] italic text-muted-foreground">(editada)</span>}
        </div>

        {/* Corpo */}
        {editando ? (
          <div className="flex items-center gap-1">
            <Input
              value={textoEdit}
              onChange={(e) => setTextoEdit(e.target.value)}
              className="h-7 text-sm"
              onKeyDown={(e) => { if (e.key === 'Enter') salvarEdicao(); if (e.key === 'Escape') setEditando(false) }}
              autoFocus
            />
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={salvarEdicao}><Check className="size-3.5" /></Button>
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditando(false)}><X className="size-3.5" /></Button>
          </div>
        ) : (
          <div className={`rounded-2xl px-3 py-2 text-sm ${isAutor ? 'bg-blue-600 text-white' : 'bg-muted text-foreground'}`}>
            {mensagem.conteudo && <p className="whitespace-pre-wrap break-words">{mensagem.conteudo}</p>}
            {mensagem.anexo_url && (
              <div className="mt-1">
                {MIME_IMAGEM.includes(mensagem.anexo_mime ?? '') ? (
                  <img
                    src={`${API_BASE}${mensagem.anexo_url}`}
                    alt={mensagem.anexo_nome ?? 'imagem'}
                    className="max-h-40 rounded object-cover"
                  />
                ) : (
                  <a
                    href={`${API_BASE}${mensagem.anexo_url}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 underline text-xs"
                  >
                    <Paperclip className="size-3" />
                    {mensagem.anexo_nome ?? 'Arquivo'}
                  </a>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Menu de ações (só para o autor) */}
      {isAutor && !editando && (
        <div className="mt-1 hidden group-hover:flex">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6">
                <MoreHorizontal className="size-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="text-sm">
              {mensagem.conteudo && (
                <DropdownMenuItem onClick={iniciarEdicao} className="gap-2 cursor-pointer">
                  <Pencil className="size-3.5" /> Editar
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                onClick={() => deletar(mensagem.id)}
                className="gap-2 text-destructive focus:text-destructive cursor-pointer"
              >
                <Trash2 className="size-3.5" /> Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </div>
  )
}
