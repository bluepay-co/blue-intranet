import { useEffect, useState, useCallback } from 'react'
import { Plus, Pencil, Trash2, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import PageHeader from '@/components/layout/PageHeader'
import AtualizacaoFormDialog from '@/components/ti/AtualizacaoFormDialog'
import { cn } from '@/lib/utils'
import { categoriaInfo } from '@/lib/categoriasAtualizacao'
import { listarAtualizacoes, removerAtualizacao } from '@/api/modules/atualizacoes'

export default function Atualizacoes() {
  const [itens, setItens]             = useState([])
  const [carregando, setCarregando]   = useState(true)
  const [erro, setErro]               = useState('')
  const [dialogAberto, setDialogAberto] = useState(false)
  const [editando, setEditando]         = useState(null)

  const buscar = useCallback(async () => {
    setErro('')
    try {
      setItens(await listarAtualizacoes())
    } catch {
      setErro('Não foi possível carregar as atualizações.')
    } finally {
      setCarregando(false)
    }
  }, [])

  useEffect(() => { buscar() }, [buscar])

  function abrirCriar() {
    setEditando(null)
    setDialogAberto(true)
  }

  function abrirEditar(item) {
    setEditando(item)
    setDialogAberto(true)
  }

  function fecharDialog() {
    setDialogAberto(false)
    setEditando(null)
  }

  async function handleDeletar(item) {
    if (!confirm(`Remover "${item.titulo}"? Esta ação não pode ser desfeita.`)) return
    try {
      await removerAtualizacao(item.id)
      buscar()
    } catch {
      alert('Erro ao remover a atualização.')
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Atualizações"
        subtitle="Publique avisos de novidades da intranet — todos veem um card ao entrar."
      >
        <Button onClick={abrirCriar} className="gap-2">
          <Plus className="size-4" />
          Nova atualização
        </Button>
      </PageHeader>

      {carregando && (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="flex items-center gap-4 py-4">
                <div className="h-10 w-10 shrink-0 rounded-lg bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-1/2 rounded bg-muted" />
                  <div className="h-3 w-1/4 rounded bg-muted" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!carregando && erro && (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <p className="text-sm text-destructive">{erro}</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={buscar}>
              Tentar novamente
            </Button>
          </CardContent>
        </Card>
      )}

      {!carregando && !erro && itens.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center">
            <p className="font-medium">Nenhuma atualização ainda</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Crie o primeiro aviso clicando em "Nova atualização".
            </p>
          </CardContent>
        </Card>
      )}

      {!carregando && !erro && itens.length > 0 && (
        <div className="space-y-3">
          {itens.map((item) => {
            const cat = categoriaInfo(item.categoria)
            const Icone = cat.icon
            const agendadoFuturo = item.publicar_em && new Date(item.publicar_em) > new Date()
            return (
            <Card key={item.id}>
              <CardContent className="flex items-center gap-4 py-3">
                <div className={cn('grid size-10 shrink-0 place-items-center rounded-lg', cat.corIcone)}>
                  <Icone className="size-5" />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-medium">{item.titulo}</p>
                    <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide', cat.corBadge)}>
                      {cat.label}
                    </span>
                  </div>
                  {item.subtitulo && (
                    <p className="line-clamp-2 whitespace-pre-line text-sm text-muted-foreground">{item.subtitulo}</p>
                  )}
                  {agendadoFuturo ? (
                    <p className="mt-0.5 inline-flex items-center gap-1 text-xs font-medium text-amber-600 dark:text-amber-400">
                      <Clock className="size-3" />
                      Agendado para {new Date(item.publicar_em).toLocaleString('pt-BR', {
                        day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
                      })}
                    </p>
                  ) : (
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {new Date(item.criado_em).toLocaleDateString('pt-BR', {
                        day: '2-digit', month: 'short', year: 'numeric',
                      })}
                    </p>
                  )}
                </div>

                <div className="flex shrink-0 items-center gap-1">
                  <Button variant="ghost" size="icon" title="Editar" onClick={() => abrirEditar(item)}>
                    <Pencil className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    title="Remover"
                    className="text-destructive hover:text-destructive"
                    onClick={() => handleDeletar(item)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
            )
          })}
        </div>
      )}

      {/* key garante re-mount do form ao trocar o item editando */}
      <AtualizacaoFormDialog
        key={editando?.id ?? 'novo'}
        aberto={dialogAberto}
        onFechar={fecharDialog}
        editando={editando}
        onSalvo={buscar}
      />
    </div>
  )
}
