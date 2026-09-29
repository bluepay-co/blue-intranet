import { useCallback, useEffect, useRef, useState } from 'react'
import { Loader2, SendHorizontal, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { useAuth } from '@/auth/auth-context'
import { listarComentarios, comentar, apagarComentario } from '@/api/modules/blog'
import TextoComLinks from '@/components/kanban/TextoComLinks'
import { dataHora, tempoRelativo } from './reacoes'
import { useComentariosAoVivo } from './useComentariosAoVivo'

const MAX_COMENTARIO = 1000
/** Comentários visíveis ao abrir; os anteriores ficam atrás de "Ver comentários anteriores". */
const VISIVEIS = 3

/** Cor fixa por pessoa (mesmo nome → mesma cor), para diferenciar quem fala na conversa. */
const CORES = ['bg-blue-500', 'bg-emerald-500', 'bg-violet-500', 'bg-amber-500', 'bg-rose-500', 'bg-cyan-500', 'bg-orange-500']
function corDoNome(nome = '') {
  let h = 0
  for (const c of nome) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return CORES[h % CORES.length]
}

export function AvatarPessoa({ nome, className }) {
  return (
    <span
      title={nome}
      className={cn(
        'grid size-8 shrink-0 place-items-center rounded-full text-xs font-semibold text-white',
        corDoNome(nome),
        className,
      )}
    >
      {nome.trim().charAt(0).toUpperCase()}
    </span>
  )
}

/**
 * Conversa de um post no feed (só o painel; o botão que abre fica no PostCard).
 * Busca ao montar — o feed não carrega comentários de todos os posts.
 *
 * @param {{ postId: number, onTotal?: (total: number) => void }} props
 *   `onTotal` informa o card do novo total a cada recarga (inclusive em tempo real),
 *   sem precisar recarregar o feed inteiro.
 */
export default function ComentariosPost({ postId, onTotal }) {
  const { usuario } = useAuth()
  const [comentarios, setComentarios] = useState(null)
  const [todos, setTodos] = useState(false)
  const [texto, setTexto] = useState('')
  const [enviando, setEnviando] = useState(false)
  const campo = useRef(null)

  const carregar = useCallback(async () => {
    try {
      const lista = await listarComentarios(postId)
      setComentarios(lista)
      onTotal?.(lista.length)
    } catch {
      toast.error('Não foi possível carregar os comentários.')
      setComentarios((atual) => atual ?? [])
    }
  }, [postId, onTotal])

  // Outros usuários comentando/apagando enquanto a conversa está aberta.
  useComentariosAoVivo(postId, carregar)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- busca ao abrir a conversa
    carregar()
  }, [carregar])

  useEffect(() => {
    campo.current?.focus()
  }, [])

  async function enviar(e) {
    e.preventDefault()
    if (!texto.trim() || enviando) return
    setEnviando(true)
    try {
      await comentar(postId, texto.trim())
      setTexto('')
      await carregar()
    } catch (err) {
      toast.error(err.response?.data?.message ?? 'Não foi possível comentar.')
    } finally {
      setEnviando(false)
    }
  }

  async function apagar(id) {
    try {
      await apagarComentario(id)
      await carregar()
    } catch (err) {
      toast.error(err.response?.data?.message ?? 'Não foi possível apagar o comentário.')
    }
  }

  const ocultos = comentarios && !todos ? Math.max(comentarios.length - VISIVEIS, 0) : 0
  const exibidos = comentarios ? comentarios.slice(ocultos) : []

  return (
    <div className="flex w-full min-w-0 flex-col gap-3">
      {comentarios === null ? (
        <Loader2 className="mx-auto size-4 animate-spin text-muted-foreground" />
      ) : (
        <>
          {ocultos > 0 && (
            <button
              type="button"
              onClick={() => setTodos(true)}
              className="self-start text-xs font-medium text-muted-foreground hover:text-foreground hover:underline"
            >
              Ver comentários anteriores ({ocultos})
            </button>
          )}

          {comentarios.length === 0 && (
            <p className="text-center text-xs text-muted-foreground">Nenhum comentário ainda. Seja o primeiro!</p>
          )}

          <ul className="flex flex-col gap-3">
            {exibidos.map((c) => (
              <li key={c.id} className="group flex min-w-0 gap-2">
                <AvatarPessoa nome={c.usuario_nome} />
                <div className="min-w-0 flex-1">
                  <div className="inline-block max-w-full rounded-2xl rounded-tl-md bg-background px-3.5 py-2 shadow-xs ring-1 ring-border">
                    <p className="truncate text-xs font-semibold">{c.usuario_nome}</p>
                    <p className="text-sm whitespace-pre-wrap [overflow-wrap:anywhere]">
                      <TextoComLinks texto={c.texto} classeLink="text-primary" />
                    </p>
                  </div>
                  <div className="mt-0.5 flex items-center gap-3 px-2 text-[11px] text-muted-foreground">
                    <time dateTime={c.criado_em} title={dataHora(c.criado_em)}>
                      {tempoRelativo(c.criado_em)}
                    </time>
                    {c.pode_apagar && (
                      <button
                        type="button"
                        onClick={() => apagar(c.id)}
                        className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 hover:text-destructive focus-visible:opacity-100 max-md:opacity-100"
                      >
                        <Trash2 className="size-3" /> Apagar
                      </button>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}

      <form onSubmit={enviar} className="flex items-center gap-2">
        <AvatarPessoa nome={usuario?.nome ?? usuario?.email ?? '?'} />
        <div className="relative min-w-0 flex-1">
          <input
            ref={campo}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Escreva um comentário…"
            maxLength={MAX_COMENTARIO}
            aria-label="Escreva um comentário"
            className="h-10 w-full rounded-full border border-input bg-background pr-11 pl-4 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          />
          <button
            type="submit"
            disabled={enviando || !texto.trim()}
            aria-label="Enviar comentário"
            className="absolute top-1/2 right-1.5 grid size-7 -translate-y-1/2 place-items-center rounded-full bg-primary text-primary-foreground transition-opacity disabled:opacity-30"
          >
            {enviando ? <Loader2 className="size-3.5 animate-spin" /> : <SendHorizontal className="size-3.5" />}
          </button>
        </div>
      </form>
    </div>
  )
}
