import { useState, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useChat } from '@/chat/chat-context'
import { buscarUsuarios } from '@/api/modules/chat'

export default function DialogCriarCanal({ aberto, onFechar }) {
  const { criarCanal } = useChat()
  const [nome, setNome] = useState('')
  const [busca, setBusca] = useState('')
  const [resultados, setResultados] = useState([])
  const [selecionados, setSelecionados] = useState([])
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState('')

  const pesquisar = useCallback(async (q) => {
    setBusca(q)
    if (q.length < 2) { setResultados([]); return }
    try {
      const users = await buscarUsuarios(q)
      setResultados(users)
    } catch { setResultados([]) }
  }, [])

  function toggleSelecionado(usuario) {
    setSelecionados((prev) =>
      prev.find((u) => u.id === usuario.id)
        ? prev.filter((u) => u.id !== usuario.id)
        : [...prev, usuario],
    )
  }

  async function handleCriar() {
    setErro('')
    if (!nome.trim()) { setErro('Informe um nome para o canal.'); return }
    setCarregando(true)
    try {
      await criarCanal(nome.trim(), selecionados.map((u) => u.id))
      setNome('')
      setBusca('')
      setResultados([])
      setSelecionados([])
      onFechar()
    } catch {
      setErro('Não foi possível criar o canal. Tente novamente.')
    } finally {
      setCarregando(false)
    }
  }

  return (
    <Dialog open={aberto} onOpenChange={(v) => !v && onFechar()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Criar canal</DialogTitle>
          <DialogDescription>Dê um nome e convide colaboradores.</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <Input
            placeholder="Nome do canal"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            maxLength={100}
          />

          <Input
            placeholder="Buscar colaboradores…"
            value={busca}
            onChange={(e) => pesquisar(e.target.value)}
          />

          {resultados.length > 0 && (
            <div className="max-h-36 overflow-y-auto rounded-md border p-1 space-y-1">
              {resultados.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  className={`w-full rounded px-2 py-1 text-left text-sm transition-colors ${selecionados.find((s) => s.id === u.id) ? 'bg-accent' : 'hover:bg-muted'}`}
                  onClick={() => toggleSelecionado(u)}
                >
                  {u.nome} <span className="text-muted-foreground text-xs">({u.role})</span>
                </button>
              ))}
            </div>
          )}

          {selecionados.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {selecionados.map((u) => (
                <span
                  key={u.id}
                  className="flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-800"
                >
                  {u.nome}
                  <button type="button" onClick={() => toggleSelecionado(u)} className="leading-none">×</button>
                </span>
              ))}
            </div>
          )}

          {erro && <p className="text-xs text-destructive">{erro}</p>}

          <Button onClick={handleCriar} disabled={carregando} className="w-full">
            {carregando ? 'Criando…' : 'Criar canal'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
