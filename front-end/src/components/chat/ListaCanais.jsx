import { useState, useCallback } from 'react'
import { Plus } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useChat } from '@/chat/chat-context'
import { buscarUsuarios, abrirConversa } from '@/api/modules/chat'
import ItemCanal from './ItemCanal'
import DialogCriarCanal from './DialogCriarCanal'

/** Lista de canais exibida no painel de chat quando nenhuma conversa está aberta. */
export default function ListaCanais() {
  const { canais, abrirDM } = useChat()
  const [busca, setBusca] = useState('')
  const [resultadosBusca, setResultadosBusca] = useState([])
  const [dialogAberto, setDialogAberto] = useState(false)

  const pesquisar = useCallback(async (q) => {
    setBusca(q)
    if (q.length < 2) { setResultadosBusca([]); return }
    try {
      const users = await buscarUsuarios(q)
      setResultadosBusca(users)
    } catch { setResultadosBusca([]) }
  }, [])

  const setores = canais.filter((c) => c.tipo === 'SETOR')
  const privados = canais.filter((c) => c.tipo === 'PRIVADO')
  const customizados = canais.filter((c) => c.tipo === 'CUSTOMIZADO')

  return (
    <div className="flex flex-col gap-3 overflow-y-auto flex-1 p-3">
      {/* Busca de DM */}
      <div className="relative">
        <Input
          placeholder="Iniciar conversa…"
          value={busca}
          onChange={(e) => pesquisar(e.target.value)}
          className="pr-3"
        />
        {resultadosBusca.length > 0 && (
          <div className="absolute left-0 right-0 top-full z-10 mt-1 max-h-48 overflow-y-auto rounded-md border bg-popover shadow-md">
            {resultadosBusca.map((u) => (
              <button
                key={u.id}
                type="button"
                className="w-full px-3 py-2 text-left text-sm hover:bg-accent transition-colors"
                onClick={() => {
                  abrirDM(u.id)
                  setBusca('')
                  setResultadosBusca([])
                }}
              >
                {u.nome}
                <span className="ml-1 text-xs text-muted-foreground">{u.email}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Canais de setor */}
      {setores.length > 0 && (
        <section>
          <p className="mb-1 px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Setores</p>
          {setores.map((c) => <ItemCanal key={c.id} canal={c} />)}
        </section>
      )}

      {/* Mensagens diretas */}
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
        {customizados.length === 0 && (
          <p className="px-2 text-xs text-muted-foreground">Nenhum canal ainda.</p>
        )}
      </section>

      <DialogCriarCanal aberto={dialogAberto} onFechar={() => setDialogAberto(false)} />
    </div>
  )
}
