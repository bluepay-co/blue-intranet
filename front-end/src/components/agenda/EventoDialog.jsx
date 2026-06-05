import { Clock, MapPin, User, Users, Video, ExternalLink, AlignLeft } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { fmt, horario, capitalizar, mesmoDia } from '@/lib/datas'

const STATUS_LABEL = {
  tentative: { texto: 'Provisório', cor: 'bg-amber-100 text-amber-700' },
  cancelled: { texto: 'Cancelado', cor: 'bg-destructive/10 text-destructive' },
}

/** Texto completo do intervalo do evento (data + horários). */
function intervaloTexto(evento) {
  if (!evento.inicio) return ''

  if (evento.diaInteiro) {
    const d = new Date(`${evento.inicio.slice(0, 10)}T00:00:00`)
    return `${capitalizar(fmt.diaSemanaLongo.format(d))}, ${fmt.diaMesAno.format(d)} · Dia inteiro`
  }

  const ini = new Date(evento.inicio)
  const dataIni = `${capitalizar(fmt.diaSemanaLongo.format(ini))}, ${fmt.diaMesAno.format(ini)}`
  if (!evento.fim) return `${dataIni} · ${horario(evento.inicio)}`

  const fim = new Date(evento.fim)
  if (mesmoDia(ini, fim)) {
    return `${dataIni} · ${horario(evento.inicio)} – ${horario(evento.fim)}`
  }
  return `${dataIni} ${horario(evento.inicio)} → ${capitalizar(
    fmt.diaSemanaLongo.format(fim),
  )}, ${fmt.diaMesAno.format(fim)} ${horario(evento.fim)}`
}

/** Remove tags/entidades básicas da descrição (vem em HTML do Google). */
function limparHtml(html) {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function Linha({ icon: Icon, children }) {
  return (
    <div className="flex gap-3 text-sm">
      <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  )
}

/**
 * Modal de detalhes de um evento.
 *
 * @param {{ evento: object|null, aberto: boolean, onOpenChange: (v:boolean)=>void }} props
 */
export default function EventoDialog({ evento, aberto, onOpenChange }) {
  const status = evento ? STATUS_LABEL[evento.status] : null
  const descricao = evento?.descricao ? limparHtml(evento.descricao) : ''

  return (
    <Dialog open={aberto} onOpenChange={onOpenChange}>
      <DialogContent>
        {evento && (
          <>
            <DialogHeader>
              <div className="flex items-center gap-2">
                <span className="size-2.5 shrink-0 rounded-full bg-brand-accent" />
                {status && (
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${status.cor}`}>
                    {status.texto}
                  </span>
                )}
              </div>
              <DialogTitle>{evento.titulo}</DialogTitle>
            </DialogHeader>

            <div className="space-y-3.5">
              <Linha icon={Clock}>
                <p className="font-medium text-foreground">{intervaloTexto(evento)}</p>
              </Linha>

              {evento.local && (
                <Linha icon={MapPin}>
                  <p>{evento.local}</p>
                </Linha>
              )}

              {evento.organizador && (
                <Linha icon={User}>
                  <p>
                    <span className="text-muted-foreground">Organizado por </span>
                    {evento.organizador}
                  </p>
                </Linha>
              )}

              {evento.participantes?.length > 0 && (
                <Linha icon={Users}>
                  <p className="mb-1.5 font-medium">
                    {evento.participantes.length}{' '}
                    {evento.participantes.length === 1 ? 'convidado' : 'convidados'}
                  </p>
                  <div className="flex max-h-32 flex-wrap gap-1.5 overflow-auto">
                    {evento.participantes.map((p) => (
                      <span
                        key={p}
                        className="max-w-full truncate rounded-md bg-muted px-2 py-0.5 text-xs"
                      >
                        {p}
                      </span>
                    ))}
                  </div>
                </Linha>
              )}

              {descricao && (
                <Linha icon={AlignLeft}>
                  <p className="max-h-40 overflow-auto whitespace-pre-wrap text-muted-foreground">
                    {descricao}
                  </p>
                </Linha>
              )}
            </div>

            {(evento.linkReuniao || evento.link) && (
              <div className="flex flex-wrap gap-2 border-t pt-4">
                {evento.linkReuniao && (
                  <Button asChild size="sm">
                    <a href={evento.linkReuniao} target="_blank" rel="noreferrer">
                      <Video className="size-4" />
                      Entrar na reunião
                    </a>
                  </Button>
                )}
                {evento.link && (
                  <Button asChild size="sm" variant="outline">
                    <a href={evento.link} target="_blank" rel="noreferrer">
                      <ExternalLink className="size-4" />
                      Abrir no Google
                    </a>
                  </Button>
                )}
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
