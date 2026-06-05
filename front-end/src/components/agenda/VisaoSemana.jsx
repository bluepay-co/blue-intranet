import { cn } from '@/lib/utils'
import { chaveDia, ehHoje, fmt, semPonto, capitalizar } from '@/lib/datas'
import ChipEvento from './ChipEvento'

/**
 * Visão de semana: 7 colunas (domingo → sábado) com os eventos de cada dia.
 *
 * @param {{
 *   dias: Date[],
 *   mapa: Map<string, object[]>,
 *   onSelecionar: (ev:object)=>void,
 *   onAbrirDia: (d:Date)=>void,
 * }} props
 */
export default function VisaoSemana({ dias, mapa, onSelecionar, onAbrirDia }) {
  return (
    <div className="overflow-x-auto pb-1">
      <div className="min-w-[48rem] overflow-hidden rounded-xl border bg-card">
        <div className="grid grid-cols-7">
        {dias.map((dia) => {
          const eventos = mapa.get(chaveDia(dia)) ?? []
          const hoje = ehHoje(dia)
          return (
            <div key={chaveDia(dia)} className="min-w-0 min-h-[62vh] border-r last:border-r-0">
              {/* Cabeçalho do dia */}
              <button
                onClick={() => onAbrirDia(dia)}
                className={cn(
                  'w-full border-b px-2 py-2 text-center transition-colors hover:bg-muted/50',
                  hoje && 'bg-brand-accent/5',
                )}
              >
                <p className="text-[0.7rem] font-medium uppercase text-muted-foreground">
                  {capitalizar(semPonto(fmt.diaSemanaCurto.format(dia)))}
                </p>
                <p
                  className={cn(
                    'mx-auto mt-1 grid size-7 place-items-center rounded-full text-sm font-semibold',
                    hoje && 'bg-brand text-brand-foreground',
                  )}
                >
                  {dia.getDate()}
                </p>
              </button>

              {/* Eventos do dia */}
              <div className="min-w-0 space-y-1 p-1.5">
                {eventos.map((evento) => (
                  <ChipEvento
                    key={evento.id}
                    evento={evento}
                    onClick={() => onSelecionar(evento)}
                  />
                ))}
              </div>
            </div>
          )
        })}
        </div>
      </div>
    </div>
  )
}
