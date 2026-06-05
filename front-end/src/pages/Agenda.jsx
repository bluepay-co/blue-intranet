import { useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Loader2, RotateCw, RefreshCw, Search, X } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import PageHeader from '@/components/layout/PageHeader'
import VisaoDia from '@/components/agenda/VisaoDia'
import VisaoSemana from '@/components/agenda/VisaoSemana'
import VisaoMes from '@/components/agenda/VisaoMes'
import EventoDialog from '@/components/agenda/EventoDialog'
import { useAuth } from '@/auth/auth-context'
import { listarEventos } from '@/api/modules/agenda'
import {
  inicioDoDia,
  fimDoDia,
  inicioDaSemana,
  fimDaSemana,
  diasDaSemana,
  gradeDoMes,
  addDias,
  addMeses,
  agruparPorDia,
  chaveDia,
  mesmoMes,
  fmt,
  capitalizar,
} from '@/lib/datas'

const VISOES = [
  { id: 'dia', label: 'Dia' },
  { id: 'semana', label: 'Semana' },
  { id: 'mes', label: 'Mês' },
]

export default function Agenda() {
  const { usuario } = useAuth()
  const [visao, setVisao] = useState('dia')
  const [referencia, setReferencia] = useState(() => new Date())
  const [eventos, setEventos] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [tentativa, setTentativa] = useState(0)
  const [selecionado, setSelecionado] = useState(null)
  const [busca, setBusca] = useState('')

  // Janela de consulta conforme a visão atual.
  const { inicio, fim } = useMemo(() => {
    if (visao === 'dia') return { inicio: inicioDoDia(referencia), fim: fimDoDia(referencia) }
    if (visao === 'semana') {
      return { inicio: inicioDaSemana(referencia), fim: fimDaSemana(referencia) }
    }
    const grade = gradeDoMes(referencia)
    return { inicio: inicioDoDia(grade[0]), fim: fimDoDia(grade[grade.length - 1]) }
  }, [visao, referencia])

  useEffect(() => {
    let ativo = true
    /* eslint-disable react-hooks/set-state-in-effect */
    setCarregando(true)
    setErro('')
    /* eslint-enable react-hooks/set-state-in-effect */

    listarEventos({ inicio: inicio.toISOString(), fim: fim.toISOString() })
      .then((evs) => ativo && setEventos(evs))
      .catch((e) => {
        if (!ativo) return
        setEventos([])
        setErro(e?.response?.data?.message ?? 'Não foi possível carregar a agenda.')
      })
      .finally(() => ativo && setCarregando(false))

    return () => {
      ativo = false
    }
  }, [inicio, fim, tentativa])

  const termo = busca.trim().toLowerCase()
  const eventosFiltrados = useMemo(() => {
    if (!termo) return eventos
    return eventos.filter((ev) =>
      [ev.titulo, ev.local, ev.organizador, ...(ev.participantes ?? [])]
        .filter(Boolean)
        .some((t) => t.toLowerCase().includes(termo)),
    )
  }, [eventos, termo])

  const mapa = useMemo(() => agruparPorDia(eventosFiltrados), [eventosFiltrados])

  const labelData = useMemo(() => {
    if (visao === 'dia') {
      return `${capitalizar(fmt.diaSemanaLongo.format(referencia))}, ${fmt.diaMesAno.format(referencia)}`
    }
    if (visao === 'mes') return capitalizar(fmt.mesAno.format(referencia))
    const dias = diasDaSemana(referencia)
    const [ini, fimSemana] = [dias[0], dias[6]]
    if (mesmoMes(ini, fimSemana)) {
      return `${ini.getDate()} – ${fimSemana.getDate()} de ${fmt.mesAno.format(ini)}`
    }
    return `${fmt.diaMes.format(ini)} – ${fmt.diaMes.format(fimSemana)} de ${fimSemana.getFullYear()}`
  }, [visao, referencia])

  const navegar = (delta) =>
    setReferencia((d) => {
      if (visao === 'dia') return addDias(d, delta)
      if (visao === 'semana') return addDias(d, delta * 7)
      return addMeses(d, delta)
    })

  const abrirDia = (dia) => {
    setReferencia(dia)
    setVisao('dia')
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Agenda"
        subtitle={
          <>
            Eventos de{' '}
            <strong className="font-medium text-foreground">{usuario?.email}</strong>, direto do
            Google Agenda.
          </>
        }
      />

      {/* Barra de controle */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={() => navegar(-1)} aria-label="Anterior">
              <ChevronLeft className="size-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => navegar(1)} aria-label="Próximo">
              <ChevronRight className="size-4" />
            </Button>
          </div>
          <Button variant="outline" size="sm" onClick={() => setReferencia(new Date())}>
            Hoje
          </Button>
          <h2 className="ml-1 text-lg font-semibold">{labelData}</h2>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Busca / filtro */}
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar eventos..."
              className="h-8 w-44 pr-8 pl-8 sm:w-56"
            />
            {busca && (
              <button
                type="button"
                onClick={() => setBusca('')}
                aria-label="Limpar busca"
                className="absolute top-1/2 right-2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>

          {/* Atualizar */}
          <Button
            variant="outline"
            size="icon"
            onClick={() => setTentativa((t) => t + 1)}
            disabled={carregando}
            aria-label="Atualizar eventos"
            title="Atualizar eventos"
          >
            <RefreshCw className={cn('size-4', carregando && 'animate-spin')} />
          </Button>

          {/* Seletor de visão */}
          <div className="inline-flex rounded-lg border bg-card p-0.5">
            {VISOES.map((v) => (
              <button
                key={v.id}
                onClick={() => setVisao(v.id)}
                className={cn(
                  'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                  visao === v.id
                    ? 'bg-brand-accent text-brand-accent-foreground'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {v.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Conteúdo */}
      {carregando ? (
        <div className="flex items-center justify-center py-24">
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
      ) : visao === 'dia' ? (
        <VisaoDia eventos={mapa.get(chaveDia(referencia)) ?? []} onSelecionar={setSelecionado} />
      ) : visao === 'semana' ? (
        <VisaoSemana
          dias={diasDaSemana(referencia)}
          mapa={mapa}
          onSelecionar={setSelecionado}
          onAbrirDia={abrirDia}
        />
      ) : (
        <VisaoMes
          grade={gradeDoMes(referencia)}
          referencia={referencia}
          mapa={mapa}
          onSelecionar={setSelecionado}
          onAbrirDia={abrirDia}
        />
      )}

      <EventoDialog
        evento={selecionado}
        aberto={Boolean(selecionado)}
        onOpenChange={(aberto) => !aberto && setSelecionado(null)}
      />
    </div>
  )
}
