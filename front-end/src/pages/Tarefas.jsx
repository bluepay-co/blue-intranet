import { useEffect, useState } from 'react'
import {
  Circle,
  CheckCircle2,
  Trash2,
  Plus,
  Loader2,
  RotateCw,
  RefreshCw,
  CalendarDays,
  ListTodo,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import PageHeader from '@/components/layout/PageHeader'
import { cn } from '@/lib/utils'
import {
  listarTarefas,
  criarTarefa,
  atualizarTarefa,
  removerTarefa,
} from '@/api/modules/tarefas'

const fmtVenc = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' })

function dataVenc(v) {
  return new Date(`${v.slice(0, 10)}T00:00:00`)
}
function estaAtrasada(tarefa) {
  if (!tarefa.vencimento || tarefa.concluida) return false
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  return dataVenc(tarefa.vencimento) < hoje
}

function TarefaItem({ tarefa, onAlternar, onRemover }) {
  const atrasada = estaAtrasada(tarefa)
  return (
    <li className="group flex items-center gap-3 rounded-xl border bg-card p-3 transition-colors hover:border-brand-accent/40">
      <button
        onClick={() => onAlternar(tarefa)}
        aria-label={tarefa.concluida ? 'Reabrir tarefa' : 'Concluir tarefa'}
        className="shrink-0 text-muted-foreground transition-colors hover:text-brand-accent"
      >
        {tarefa.concluida ? (
          <CheckCircle2 className="size-5 text-brand-accent" />
        ) : (
          <Circle className="size-5" />
        )}
      </button>

      <div className="min-w-0 flex-1">
        <p className={cn('truncate text-sm', tarefa.concluida && 'text-muted-foreground line-through')}>
          {tarefa.titulo}
        </p>
        {tarefa.notas && (
          <p className="truncate text-xs text-muted-foreground">{tarefa.notas}</p>
        )}
      </div>

      {tarefa.vencimento && (
        <span
          className={cn(
            'flex shrink-0 items-center gap-1 rounded-md px-2 py-0.5 text-xs',
            atrasada ? 'bg-destructive/10 text-destructive' : 'bg-muted text-muted-foreground',
          )}
        >
          <CalendarDays className="size-3" />
          {fmtVenc.format(dataVenc(tarefa.vencimento))}
        </span>
      )}

      <button
        onClick={() => onRemover(tarefa)}
        aria-label="Excluir tarefa"
        className="shrink-0 text-muted-foreground opacity-0 transition hover:text-destructive group-hover:opacity-100"
      >
        <Trash2 className="size-4" />
      </button>
    </li>
  )
}

export default function Tarefas() {
  const [tarefas, setTarefas] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [aviso, setAviso] = useState('')
  const [tentativa, setTentativa] = useState(0)
  const [novoTitulo, setNovoTitulo] = useState('')
  const [novaData, setNovaData] = useState('')
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    let ativo = true
    /* eslint-disable react-hooks/set-state-in-effect */
    setCarregando(true)
    setErro('')
    /* eslint-enable react-hooks/set-state-in-effect */

    listarTarefas()
      .then((ts) => ativo && setTarefas(ts))
      .catch((e) => {
        if (!ativo) return
        setTarefas([])
        setErro(e?.response?.data?.message ?? 'Não foi possível carregar as tarefas.')
      })
      .finally(() => ativo && setCarregando(false))

    return () => {
      ativo = false
    }
  }, [tentativa])

  async function adicionar(e) {
    e.preventDefault()
    const titulo = novoTitulo.trim()
    if (!titulo || salvando) return
    setSalvando(true)
    setAviso('')
    try {
      const nova = await criarTarefa({ titulo, vencimento: novaData || null })
      setTarefas((prev) => [nova, ...prev])
      setNovoTitulo('')
      setNovaData('')
    } catch (err) {
      setAviso(err?.response?.data?.message ?? 'Não foi possível criar a tarefa.')
    } finally {
      setSalvando(false)
    }
  }

  async function alternar(tarefa) {
    const novoEstado = !tarefa.concluida
    setAviso('')
    setTarefas((prev) =>
      prev.map((t) => (t.id === tarefa.id ? { ...t, concluida: novoEstado } : t)),
    )
    try {
      await atualizarTarefa(tarefa.id, { concluida: novoEstado })
    } catch {
      setTarefas((prev) =>
        prev.map((t) => (t.id === tarefa.id ? { ...t, concluida: !novoEstado } : t)),
      )
      setAviso('Não foi possível atualizar a tarefa.')
    }
  }

  async function remover(tarefa) {
    setAviso('')
    const backup = tarefas
    setTarefas((prev) => prev.filter((t) => t.id !== tarefa.id))
    try {
      await removerTarefa(tarefa.id)
    } catch {
      setTarefas(backup)
      setAviso('Não foi possível excluir a tarefa.')
    }
  }

  const pendentes = tarefas.filter((t) => !t.concluida)
  const concluidas = tarefas.filter((t) => t.concluida)

  return (
    <div className="space-y-6">
      <PageHeader title="Tarefas" subtitle="Suas tarefas do Google Tasks.">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setTentativa((t) => t + 1)}
          disabled={carregando}
          aria-label="Atualizar tarefas"
          title="Atualizar"
        >
          <RefreshCw className={cn('size-4', carregando && 'animate-spin')} />
        </Button>
      </PageHeader>

      {/* Nova tarefa */}
      <Card>
        <CardContent className="p-3">
          <form onSubmit={adicionar} className="flex flex-wrap items-center gap-2">
            <Input
              value={novoTitulo}
              onChange={(e) => setNovoTitulo(e.target.value)}
              placeholder="Adicionar uma tarefa..."
              className="h-9 min-w-[12rem] flex-1"
            />
            <Input
              type="date"
              value={novaData}
              onChange={(e) => setNovaData(e.target.value)}
              className="h-9 w-auto"
              title="Vencimento (opcional)"
            />
            <Button
              type="submit"
              disabled={salvando || !novoTitulo.trim()}
              className="bg-brand-accent text-brand-accent-foreground hover:bg-brand-accent/90"
            >
              {salvando ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
              Adicionar
            </Button>
          </form>
        </CardContent>
      </Card>

      {aviso && <p className="text-sm text-destructive">{aviso}</p>}

      {/* Conteúdo */}
      {carregando ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : erro ? (
        <Card>
          <CardContent className="flex flex-col items-start gap-3 py-6">
            <p className="text-sm text-destructive">{erro}</p>
            <Button variant="outline" size="sm" onClick={() => setTentativa((t) => t + 1)}>
              <RotateCw className="size-4" />
              Tentar novamente
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {pendentes.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
                <div className="grid size-12 place-items-center rounded-full bg-muted">
                  <ListTodo className="size-6 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">Nenhuma tarefa pendente.</p>
              </CardContent>
            </Card>
          ) : (
            <ul className="space-y-2">
              {pendentes.map((tarefa) => (
                <TarefaItem
                  key={tarefa.id}
                  tarefa={tarefa}
                  onAlternar={alternar}
                  onRemover={remover}
                />
              ))}
            </ul>
          )}

          {concluidas.length > 0 && (
            <section className="space-y-2">
              <h3 className="text-sm font-medium text-muted-foreground">
                Concluídas ({concluidas.length})
              </h3>
              <ul className="space-y-2">
                {concluidas.map((tarefa) => (
                  <TarefaItem
                    key={tarefa.id}
                    tarefa={tarefa}
                    onAlternar={alternar}
                    onRemover={remover}
                  />
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </div>
  )
}
