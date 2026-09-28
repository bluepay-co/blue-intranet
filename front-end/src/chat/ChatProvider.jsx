import { useEffect, useRef, useCallback, useState } from 'react'
import { ChatContext } from './chat-context'
import { useChatNotificacoes } from './useChatNotificacoes'
import { useSocket } from '@/realtime/socket-context'
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
  const { socket } = useSocket()
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
  // Carrega canais e unread uma vez (depois, o socket mantém atualizado).
  useEffect(() => {
    Promise.all([listarCanais(), contarNaoLidos()]).then(([cs, total]) => {
      setCanais(cs)
      setTotalNaoLidos(total)
    }).catch(console.error)
  }, [])

  // A conexão é do SocketProvider (compartilhada com os avisos de sync).
  useEffect(() => {
    if (!socket) return undefined
    socketRef.current = socket

    // Reconexão (ex.: deploy reiniciou o back) abre uma sessão nova no
    // servidor, sem as rooms: reentra nos canais já abertos, senão as
    // mensagens deixam de chegar até recarregar a página.
    const aoReconectar = () => {
      for (const canalId of joinedRoomsRef.current) socket.emit('join_canal', { canal_id: canalId })
    }
    socket.io.on('reconnect', aoReconectar)

    const aoReceber = (msg) => {
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
    }

    const aoEditar = (msg) => {
      setMensagens((prev) => ({
        ...prev,
        [msg.canal_id]: (prev[msg.canal_id] ?? []).map((m) => (m.id === msg.id ? msg : m)),
      }))
    }

    const aoDeletar = ({ mensagem_id, canal_id }) => {
      setMensagens((prev) => ({
        ...prev,
        [canal_id]: (prev[canal_id] ?? []).filter((m) => m.id !== mensagem_id),
      }))
    }

    socket.on('nova_mensagem', aoReceber)
    socket.on('mensagem_editada', aoEditar)
    socket.on('mensagem_deletada', aoDeletar)
    return () => {
      socket.io.off('reconnect', aoReconectar)
      socket.off('nova_mensagem', aoReceber)
      socket.off('mensagem_editada', aoEditar)
      socket.off('mensagem_deletada', aoDeletar)
      socketRef.current = null
    }
  }, [socket]) // eslint-disable-line react-hooks/exhaustive-deps

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
