import { cn } from '@/lib/utils'
import { chaveDia, ehHoje, mesmoMes } from '@/lib/datas'
import ChipEvento from './ChipEvento'

const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const MAX_CHIPS = 3

/**
 * Visão de mês: grade de 6 semanas (42 dias) começando no domingo.
 *
 * @param {{
 *   grade: Date[],
 *   referencia: Date,
 *   mapa: Map<string, object[]>,
 *   onSelecionar: (ev:object)=>void,
 *   onAbrirDia: (d:Date)=>void,
 * }} props
 */
export default function VisaoMes({ grade, referencia, mapa, onSelecionar, onAbrirDia }) {
  return (
    <div className="overflow-x-auto pb-1">
      <div className="min-w-[44rem] overflow-hidden rounded-xl border bg-card">
        {/* Cabeçalho dos dias da semana */}
        <div className="grid grid-cols-7 border-b bg-muted/30">
        {DIAS_SEMANA.map((dia) => (
          <div
            key={dia}
            className="px-2 py-2 text-center text-xs font-medium uppercase text-muted-foreground"
          >
            {dia}
          </div>
        ))}
      </div>

      {/* Células */}
      <div className="grid grid-cols-7">
        {grade.map((dia, i) => {
          const eventos = mapa.get(chaveDia(dia)) ?? []
          const foraDoMes = !mesmoMes(dia, referencia)
          const hoje = ehHoje(dia)
          const ultimaColuna = i % 7 === 6
          const ultimaLinha = i >= 35

          return (
            <div
              key={chaveDia(dia)}
              className={cn(
                'flex min-h-[7rem] min-w-0 flex-col gap-1 p-1.5',
                !ultimaColuna && 'border-r',
                !ultimaLinha && 'border-b',
                foraDoMes && 'bg-muted/20',
              )}
            >
              <button
                onClick={() => onAbrirDia(dia)}
                className={cn(
                  'grid size-6 shrink-0 place-items-center rounded-full text-xs font-medium transition-colors',
                  hoje
                    ? 'bg-brand text-brand-foreground'
                    : cn('hover:bg-muted', foraDoMes && 'text-muted-foreground'),
                )}
              >
                {dia.getDate()}
              </button>

              <div className="min-w-0 space-y-0.5">
                {eventos.slice(0, MAX_CHIPS).map((evento) => (
                  <ChipEvento
                    key={evento.id}
                    evento={evento}
                    compacto
                    onClick={() => onSelecionar(evento)}
                  />
                ))}
                {eventos.length > MAX_CHIPS && (
                  <button
                    onClick={() => onAbrirDia(dia)}
                    className="px-2 text-[0.7rem] font-medium text-muted-foreground hover:text-foreground hover:underline"
                  >
                    +{eventos.length - MAX_CHIPS} mais
                  </button>
                )}
              </div>
            </div>
          )
        })}
        </div>
      </div>
    </div>
  )
}
