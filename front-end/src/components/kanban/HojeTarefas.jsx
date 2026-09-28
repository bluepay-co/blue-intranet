import { useMemo, useState } from 'react'
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react'
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { addMeses, capitalizar, chaveDia, diasDaSemana, fmt, gradeDoMes, mesmoMes } from '@/lib/datas'
import { PRIORIDADES, alerta, relativo } from './regras'

const MAX_CHIPS = 4

/**
 * Linha compacta "Hoje": seletor de dia (mini calendário em dropdown) + resumo
 * e tarefas do dia. Considera só as tarefas em que o usuário é o responsável.
 */
export default function HojeTarefas({ tarefas, onAbrir }) {
  const hoje = chaveDia(new Date())
  const [referencia, setReferencia] = useState(() => new Date())
  const [selecionado, setSelecionado] = useState(hoje)
  const [aberto, setAberto] = useState(false)

  const porDia = useMemo(() => {
    const mapa = new Map()
    for (const t of tarefas) {
      const k = chaveDia(new Date(t.prazo))
      if (!mapa.has(k)) mapa.set(k, [])
      mapa.get(k).push(t)
    }
    for (const lista of mapa.values()) lista.sort((a, b) => new Date(a.prazo) - new Date(b.prazo))
    return mapa
  }, [tarefas])

  const doDia = porDia.get(selecionado) ?? []
  const abertasDoDia = doDia.filter((t) => t.status !== 'done')
  const atrasadas = tarefas.filter((t) => alerta(t) === 'late').length
  const proxima = tarefas
    .filter((t) => t.status !== 'done' && new Date(t.prazo) >= new Date())
    .sort((a, b) => new Date(a.prazo) - new Date(b.prazo))[0]

  const [a, m, d] = selecionado.split('-').map(Number)
  const dataSel = new Date(a, m - 1, d)
  const rotulo = `${selecionado === hoje ? 'Hoje · ' : ''}${fmt.diaMes.format(dataSel).replace('.', '')}`

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
      <DropdownMenu open={aberto} onOpenChange={setAberto}>
        <DropdownMenuTrigger asChild>
          <Button variant="outline">
            <CalendarDays /> <span className="font-semibold text-foreground">{rotulo}</span> <ChevronDown />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64 p-2.5">
          <div className="mb-1 flex items-center justify-between">
            <Button variant="ghost" size="icon-xs" onClick={() => setReferencia((r) => addMeses(r, -1))} aria-label="Mês anterior">
              <ChevronLeft />
            </Button>
            <span className="text-xs font-semibold">{capitalizar(fmt.mesAno.format(referencia))}</span>
            <Button variant="ghost" size="icon-xs" onClick={() => setReferencia((r) => addMeses(r, 1))} aria-label="Próximo mês">
              <ChevronRight />
            </Button>
          </div>
          <div className="grid grid-cols-7 text-center text-[10px] text-muted-foreground">
            {diasDaSemana(referencia).map((dia) => (
              <span key={dia.toISOString()}>{capitalizar(fmt.diaSemanaCurto.format(dia)).charAt(0)}</span>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {gradeDoMes(referencia).map((data) => {
              const chave = chaveDia(data)
              const lista = porDia.get(chave)
              const cor = lista?.some((t) => alerta(t) === 'late')
                ? 'bg-destructive'
                : lista?.some((t) => t.status !== 'done')
                  ? 'bg-blue-500'
                  : 'bg-emerald-500'
              return (
                <button
                  key={chave}
                  type="button"
                  onClick={() => {
                    setSelecionado(chave)
                    setAberto(false)
                  }}
                  className={cn(
                    'relative flex h-7 items-center justify-center rounded text-xs hover:bg-muted',
                    !mesmoMes(data, referencia) && 'text-muted-foreground/40',
                    chave === hoje && 'font-bold text-primary',
                    chave === selecionado && 'bg-primary text-primary-foreground hover:bg-primary',
                  )}
                >
                  {data.getDate()}
                  {lista && <i className={cn('absolute bottom-0.5 size-1 rounded-full', chave === selecionado ? 'bg-primary-foreground' : cor)} />}
                </button>
              )
            })}
          </div>
        </DropdownMenuContent>
      </DropdownMenu>

      <span>
        <b className="text-foreground">{abertasDoDia.length}</b> com prazo no dia
      </span>
      {atrasadas > 0 && (
        <span className="text-destructive">
          <b>{atrasadas}</b> {atrasadas > 1 ? 'atrasadas' : 'atrasada'}
        </span>
      )}
      {proxima && (
        <span className="max-w-80 truncate">
          Próximo: <b className="text-foreground">{proxima.titulo}</b> · {relativo(proxima.prazo)}
        </span>
      )}

      {doDia.slice(0, MAX_CHIPS).map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => onAbrir(t.id)}
          title={t.titulo}
          className={cn(
            'flex max-w-60 items-center gap-2 rounded-full border px-3 py-1 hover:bg-muted',
            t.status === 'done' && 'line-through opacity-60',
          )}
        >
          <i className={cn('size-2 shrink-0 rounded-full', PRIORIDADES[t.prioridade].ponto)} />
          <span className="tabular-nums">{fmt.hora.format(new Date(t.prazo))}</span>
          <span className="truncate text-foreground">{t.titulo}</span>
        </button>
      ))}
      {doDia.length > MAX_CHIPS && <span>+{doDia.length - MAX_CHIPS}</span>}
    </div>
  )
}
