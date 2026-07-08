import { useEffect, useRef, useCallback, useState } from 'react'
import { io as socketIO } from 'socket.io-client'
import { ChatContext } from './chat-context'
import { useChatNotificacoes } from './useChatNotificacoes'
import { useAuth } from '@/auth/auth-context'
import { TOKEN_KEY } from '@/api/api'
import {
  listarCanais,
  contarNaoLidos,
  listarMensagens as apiListarMensagens,
  marcarLido as apiMarcarLido,
  abrirConversa as apiAbrirConversa,
  criarCanalCustomizado as apiCriarCanalCustomizado,
  enviarMensagem as apiEnviarMensagem,
  editarMensagem as apiEditarMensagem,
  deletarMensagem as apiDeletarMensagem,
} from '@/api/modules/chat'

export default function ChatProvider({ children }) {
  const { logout } = useAuth()
  const { notificarDesktop } = useChatNotificacoes()

  const [canais, setCanais] = useState([])
  const [canalAtivo, setCanalAtivoState] = useState(null)
  const [mensagens, setMensagens] = useState({}) // { [canalId]: MensagemPublica[] }
  const [totalNaoLidos, setTotalNaoLidos] = useState(0)
  const [painelAberto, setPainelAberto] = useState(false)

  const socketRef = useRef(null)
  const joinedRoomsRef = useRef(new Set())
  const canalAtivoRef = useRef(null)
  const painelAbertoRef = useRef(false)

  canalAtivoRef.current = canalAtivo
  painelAbertoRef.current = painelAberto

  // ── Inicialização ──────────────────────────────────────────────────────────
  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY)
    if (!token) return

    const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'
    const socket = socketIO(baseURL, { auth: { token } })
    socketRef.current = socket

    // Carrega canais e unread ao conectar
    Promise.all([listarCanais(), contarNaoLidos()]).then(([cs, total]) => {
      setCanais(cs)
      setTotalNaoLidos(total)
    }).catch(console.error)

    socket.on('connect_error', (err) => {
      if (err.message === 'Unauthorized') logout()
    })

    socket.on('nova_mensagem', (msg) => {
      setMensagens((prev) => ({
        ...prev,
        [msg.canal_id]: [...(prev[msg.canal_id] ?? []), msg],
      }))

      const isAtivo = canalAtivoRef.current === msg.canal_id && painelAbertoRef.current
      if (!isAtivo) {
        setTotalNaoLidos((n) => n + 1)
        setCanais((prev) =>
          prev.map((c) =>
            c.id === msg.canal_id
              ? { ...c, unread_count: c.unread_count + 1, ultima_mensagem_preview: msg.conteudo ?? '[Arquivo]', ultima_mensagem_em: msg.criado_em }
              : c,
          ),
        )
        notificarDesktop(msg)
      }
    })

    socket.on('mensagem_editada', (msg) => {
      setMensagens((prev) => ({
        ...prev,
        [msg.canal_id]: (prev[msg.canal_id] ?? []).map((m) => (m.id === msg.id ? msg : m)),
      }))
    })

    socket.on('mensagem_deletada', ({ mensagem_id, canal_id }) => {
      setMensagens((prev) => ({
        ...prev,
        [canal_id]: (prev[canal_id] ?? []).filter((m) => m.id !== mensagem_id),
      }))
    })

    return () => {
      socket.disconnect()
      socketRef.current = null
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Entrar numa room do canal ──────────────────────────────────────────────
  const joinCanal = useCallback((canalId) => {
    if (!socketRef.current || joinedRoomsRef.current.has(canalId)) return
    socketRef.current.emit('join_canal', { canal_id: canalId })
    joinedRoomsRef.current.add(canalId)
  }, [])

  // ── Abrir canal ───────────────────────────────────────────────────────────
  const setCanalAtivo = useCallback(async (canalId) => {
    setCanalAtivoState(canalId)

    if (canalId == null) return

    // Entra na room se necessário
    joinCanal(canalId)

    // Carrega mensagens se ainda não tiver
    if (!mensagens[canalId]) {
      try {
        const msgs = await apiListarMensagens(canalId)
        setMensagens((prev) => ({ ...prev, [canalId]: msgs }))
      } catch (err) {
        console.error('[chat] carregar mensagens:', err)
      }
    }

    // Marca como lido
    apiMarcarLido(canalId).catch(console.error)
    socketRef.current?.emit('marcar_lido', { canal_id: canalId })

    setCanais((prev) =>
      prev.map((c) => (c.id === canalId ? { ...c, unread_count: 0 } : c)),
    )
    setTotalNaoLidos((n) => Math.max(0, n - (canais.find((c) => c.id === canalId)?.unread_count ?? 0)))
  }, [mensagens, canais, joinCanal])

  // ── Carregar mais mensagens (paginação) ───────────────────────────────────
  const carregarMaisAntigos = useCallback(async (canalId) => {
    const lista = mensagens[canalId]
    if (!lista || lista.length === 0) return
    const antes = lista[0].criado_em
    try {
      const mais = await apiListarMensagens(canalId, antes)
      setMensagens((prev) => ({ ...prev, [canalId]: [...mais, ...(prev[canalId] ?? [])] }))
    } catch (err) {
      console.error('[chat] paginar mensagens:', err)
    }
  }, [mensagens])

  // ── Enviar mensagem ───────────────────────────────────────────────────────
  const enviar = useCallback(async (texto, arquivo) => {
    const canalId = canalAtivoRef.current
    if (!canalId) return

    if (arquivo) {
      // Anexo → REST (multipart), controller faz broadcast via socket
      const fd = new FormData()
      if (texto) fd.append('conteudo', texto)
      fd.append('anexo', arquivo)
      await apiEnviarMensagem(canalId, fd)
    } else {
      // Só texto → socket
      socketRef.current?.emit('nova_mensagem', { canal_id: canalId, conteudo: texto })
    }
  }, [])

  // ── Editar mensagem ───────────────────────────────────────────────────────
  const editar = useCallback(async (mensagemId, novoTexto) => {
    socketRef.current?.emit('editar_mensagem', { mensagem_id: mensagemId, novo_conteudo: novoTexto })
  }, [])

  // ── Deletar mensagem ──────────────────────────────────────────────────────
  const deletar = useCallback((mensagemId) => {
    socketRef.current?.emit('deletar_mensagem', { mensagem_id: mensagemId })
  }, [])

  // ── Abrir DM ──────────────────────────────────────────────────────────────
  const abrirDM = useCallback(async (usuarioId) => {
    try {
      const { canal_id } = await apiAbrirConversa(usuarioId)
      // Atualiza lista de canais
      const cs = await listarCanais()
      setCanais(cs)
      await setCanalAtivo(canal_id)
    } catch (err) {
      console.error('[chat] abrirDM:', err)
    }
  }, [setCanalAtivo])

  // ── Criar canal customizado ───────────────────────────────────────────────
  const criarCanal = useCallback(async (nome, membroIds) => {
    try {
      await apiCriarCanalCustomizado(nome, membroIds)
      const cs = await listarCanais()
      setCanais(cs)
    } catch (err) {
      console.error('[chat] criarCanal:', err)
      throw err
    }
  }, [])

  // ── Painel ────────────────────────────────────────────────────────────────
  const abrirPainel = useCallback(async () => {
    setPainelAberto(true)
    // Sincroniza contagem ao abrir
    try {
      const total = await contarNaoLidos()
      setTotalNaoLidos(total)
      const cs = await listarCanais()
      setCanais(cs)
    } catch { /* silencia */ }
  }, [])

  const fecharPainel = useCallback(() => {
    setPainelAberto(false)
    setCanalAtivoState(null)
  }, [])

  const mensagensDoCanal = useCallback((id) => mensagens[id] ?? [], [mensagens])

  const value = {
    canais,
    canalAtivo,
    setCanalAtivo,
    mensagensDoCanal,
    carregarMaisAntigos,
    enviar,
    editar,
    deletar,
    abrirDM,
    criarCanal,
    totalNaoLidos,
    painelAberto,
    abrirPainel,
    fecharPainel,
  }

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>
}
