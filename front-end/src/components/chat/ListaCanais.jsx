import { useState, useEffect, useMemo } from 'react'
import { Plus } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useChat } from '@/chat/chat-context'
import { buscarUsuarios } from '@/api/modules/chat'
import { rotuloRole } from '@/api/modules/usuarios'
import ItemCanal from './ItemCanal'
import DialogCriarCanal from './DialogCriarCanal'

/** Lista de canais + colaboradores para iniciar uma conversa. */
export default function ListaCanais() {
  const { canais, abrirDM } = useChat()
  const [busca, setBusca] = useState('')
  const [colaboradores, setColaboradores] = useState([])
  const [dialogAberto, setDialogAberto] = useState(false)

  // Carrega todos os colaboradores de cara (GET sem filtro).
  useEffect(() => {
    buscarUsuarios('')
      .then(setColaboradores)
      .catch(() => setColaboradores([]))
  }, [])

  const termo = busca.trim().toLowerCase()

  // Nome exibido de um canal (setor/customizado usam `nome`; DM usa o outro usuário).
  const nomeCanal = (c) =>
    (c.tipo === 'PRIVADO' ? c.nome_outro_usuario : c.nome) ?? ''

  const casaTermo = (texto) => !termo || (texto ?? '').toLowerCase().includes(termo)

  const setores = canais.filter((c) => c.tipo === 'SETOR' && casaTermo(nomeCanal(c)))
  const privados = canais.filter((c) => c.tipo === 'PRIVADO' && casaTermo(nomeCanal(c)))
  const customizados = canais.filter((c) => c.tipo === 'CUSTOMIZADO' && casaTermo(nomeCanal(c)))
  const temCustomizados = canais.some((c) => c.tipo === 'CUSTOMIZADO')
  const buscando = termo.length > 0

  // Nomes com quem já existe DM — para não duplicar na seção "Colaboradores".
  const nomesComDM = useMemo(
    () => new Set(canais.filter((c) => c.tipo === 'PRIVADO').map((c) => c.nome_outro_usuario)),
    [canais],
  )

  // Filtro client-side (instantâneo, sem depender de mínimo de caracteres).
  const colaboradoresFiltrados = useMemo(() => {
    const t = busca.trim().toLowerCase()
    return colaboradores.filter((u) => {
      if (nomesComDM.has(u.nome)) return false
      if (!t) return true
      return (
        u.nome.toLowerCase().includes(t) ||
        u.email?.toLowerCase().includes(t)
      )
    })
  }, [colaboradores, busca, nomesComDM])

  return (
    <div className="flex flex-col gap-3 overflow-y-auto flex-1 p-3">
      {/* Busca de colaboradores */}
      <Input
        placeholder="Buscar colaborador ou canal…"
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
      />

      {/* Canais de setor */}
      {setores.length > 0 && (
        <section>
          <p className="mb-1 px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Setores</p>
          {setores.map((c) => <ItemCanal key={c.id} canal={c} />)}
        </section>
      )}

      {/* Mensagens diretas existentes */}
      {privados.length > 0 && (
        <section>
          <p className="mb-1 px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Direto</p>
          {privados.map((c) => <ItemCanal key={c.id} canal={c} />)}
        </section>
      )}

      {/* Canais customizados */}
      <section>
        <div className="mb-1 flex items-center justify-between px-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Canais</p>
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5"
            onClick={() => setDialogAberto(true)}
            title="Criar canal"
          >
            <Plus className="size-3.5" />
          </Button>
        </div>
        {customizados.map((c) => <ItemCanal key={c.id} canal={c} />)}
        {!temCustomizados && (
          <p className="px-2 text-xs text-muted-foreground">Nenhum canal ainda.</p>
        )}
      </section>

      {/* Colaboradores — inicia DM direta */}
      {colaboradoresFiltrados.length > 0 && (
        <section>
          <p className="mb-1 px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Colaboradores</p>
          {colaboradoresFiltrados.map((u) => (
            <Button
              key={u.id}
              variant="ghost"
              className="w-full justify-start gap-2 px-2 py-2 text-left h-auto rounded-lg"
              onClick={() => abrirDM(u.id)}
            >
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-muted text-xs font-semibold">
                {(u.nome?.[0] ?? '?').toUpperCase()}
              </span>
              <span className="min-w-0 flex-1 truncate text-sm">
                {u.nome}
                <span className="ml-1 text-xs text-muted-foreground">({rotuloRole(u.role)})</span>
              </span>
            </Button>
          ))}
        </section>
      )}

      {/* Nenhum resultado para a busca */}
      {buscando &&
        setores.length === 0 &&
        privados.length === 0 &&
        customizados.length === 0 &&
        colaboradoresFiltrados.length === 0 && (
          <p className="px-2 py-4 text-center text-xs text-muted-foreground">
            Nenhum resultado para “{busca.trim()}”.
          </p>
        )}

      <DialogCriarCanal aberto={dialogAberto} onFechar={() => setDialogAberto(false)} />
    </div>
  )
}
