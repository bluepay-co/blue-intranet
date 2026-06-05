import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { chaveDia } from '@/lib/datas'
import { criarEvento, atualizarEvento } from '@/api/modules/agenda'
import { criarTarefa } from '@/api/modules/tarefas'

const ROTULO = {
  evento: 'evento',
  ausente: 'ausência',
  foco: 'hora de concentração',
  local: 'local de trabalho',
  tarefa: 'tarefa',
}

const inputCls =
  'h-9 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50'

// ---- helpers de data ----
function isoParaLocal(iso) {
  const d = new Date(iso)
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
}
function localPadrao(referencia, hora) {
  const d = new Date(referencia)
  d.setHours(hora, 0, 0, 0)
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
}
function subtrairDia(data) {
  const d = new Date(`${data}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() - 1)
  return d.toISOString().slice(0, 10)
}

function valoresIniciais(evento, referencia) {
  const ref = referencia ?? new Date()
  const base = {
    titulo: '',
    diaInteiro: false,
    data: chaveDia(ref),
    dataFim: chaveDia(ref),
    inicioLocal: localPadrao(ref, 9),
    fimLocal: localPadrao(ref, 10),
    local: '',
    descricao: '',
    participantes: '',
    comMeet: false,
    recusarConflitos: false,
    mensagemRecusa: '',
    tipoLocal: 'casa',
    rotuloLocal: '',
  }
  if (!evento) return base

  const editado = {
    ...base,
    titulo: evento.titulo === '(Sem título)' ? '' : evento.titulo,
    diaInteiro: evento.diaInteiro,
    local: evento.local ?? '',
    descricao: evento.descricao ?? '',
    participantes: (evento.participantes ?? []).join(', '),
    comMeet: Boolean(evento.linkReuniao),
  }
  if (evento.inicio) {
    if (evento.diaInteiro) {
      editado.data = evento.inicio.slice(0, 10)
      editado.dataFim = evento.fim ? subtrairDia(evento.fim.slice(0, 10)) : editado.data
    } else {
      editado.inicioLocal = isoParaLocal(evento.inicio)
      editado.fimLocal = evento.fim ? isoParaLocal(evento.fim) : editado.inicioLocal
    }
  }
  return editado
}

/** Campo rotulado. */
function Campo({ label, children }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium">{label}</span>
      {children}
    </label>
  )
}

function FormularioEvento({ tipo, evento, referencia, onCancelar, onSalvo }) {
  const [form, setForm] = useState(() => valoresIniciais(evento, referencia))
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  const editar = Boolean(evento)
  const set = (campo) => (e) =>
    setForm((f) => ({
      ...f,
      [campo]: e.target.type === 'checkbox' ? e.target.checked : e.target.value,
    }))

  const ehDiaInteiro = tipo === 'local' || (tipo === 'evento' && form.diaInteiro)

  function montarPayload() {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
    const payload = { tipo, titulo: form.titulo.trim(), timeZone: tz }

    if (ehDiaInteiro) {
      payload.diaInteiro = true
      payload.inicio = form.data
      payload.fim = form.dataFim || form.data
    } else {
      payload.diaInteiro = false
      payload.inicio = new Date(form.inicioLocal).toISOString()
      payload.fim = new Date(form.fimLocal).toISOString()
    }

    if (tipo === 'evento') {
      payload.local = form.local || null
      payload.descricao = form.descricao || null
      payload.participantes = form.participantes
        .split(/[,\n;]/)
        .map((s) => s.trim())
        .filter(Boolean)
      payload.comMeet = form.comMeet
    }
    if (tipo === 'ausente' || tipo === 'foco') {
      payload.recusarConflitos = form.recusarConflitos
      payload.mensagemRecusa = form.mensagemRecusa || null
    }
    if (tipo === 'local') {
      payload.tipoLocal = form.tipoLocal
      payload.rotuloLocal = form.rotuloLocal || null
    }
    return payload
  }

  async function salvar(e) {
    e.preventDefault()
    if (!form.titulo.trim()) {
      setErro('Informe um título.')
      return
    }
    setSalvando(true)
    setErro('')
    try {
      if (tipo === 'tarefa') {
        await criarTarefa({
          titulo: form.titulo.trim(),
          vencimento: form.data || null,
          notas: form.descricao || null,
        })
      } else {
        const payload = montarPayload()
        if (editar) await atualizarEvento(evento.id, payload)
        else await criarEvento(payload)
      }
      onSalvo()
    } catch (err) {
      setErro(err?.response?.data?.message ?? 'Não foi possível salvar.')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <form onSubmit={salvar} className="space-y-4">
      <DialogHeader>
        <DialogTitle>
          {editar ? 'Editar' : 'Criar'} {ROTULO[tipo] ?? 'evento'}
        </DialogTitle>
      </DialogHeader>

      <Campo label={tipo === 'tarefa' ? 'Título da tarefa' : 'Título'}>
        <Input
          value={form.titulo}
          onChange={set('titulo')}
          placeholder="Adicione um título"
          autoFocus
        />
      </Campo>

      {/* Datas / horários */}
      {tipo === 'tarefa' ? (
        <Campo label="Vencimento (opcional)">
          <Input type="date" value={form.data} onChange={set('data')} className="w-auto" />
        </Campo>
      ) : tipo === 'evento' ? (
        <>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.diaInteiro} onChange={set('diaInteiro')} />
            Dia inteiro
          </label>
          {form.diaInteiro ? (
            <div className="grid grid-cols-2 gap-3">
              <Campo label="Início">
                <Input type="date" value={form.data} onChange={set('data')} />
              </Campo>
              <Campo label="Fim">
                <Input type="date" value={form.dataFim} onChange={set('dataFim')} />
              </Campo>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <Campo label="Início">
                <Input type="datetime-local" value={form.inicioLocal} onChange={set('inicioLocal')} />
              </Campo>
              <Campo label="Fim">
                <Input type="datetime-local" value={form.fimLocal} onChange={set('fimLocal')} />
              </Campo>
            </div>
          )}
        </>
      ) : tipo === 'local' ? (
        <Campo label="Data">
          <Input type="date" value={form.data} onChange={set('data')} className="w-auto" />
        </Campo>
      ) : (
        // ausente / foco (sempre com horário)
        <div className="grid grid-cols-2 gap-3">
          <Campo label="Início">
            <Input type="datetime-local" value={form.inicioLocal} onChange={set('inicioLocal')} />
          </Campo>
          <Campo label="Fim">
            <Input type="datetime-local" value={form.fimLocal} onChange={set('fimLocal')} />
          </Campo>
        </div>
      )}

      {/* Específicos: Evento */}
      {tipo === 'evento' && (
        <>
          <Campo label="Local">
            <Input value={form.local} onChange={set('local')} placeholder="Adicionar local" />
          </Campo>
          <Campo label="Convidados (e-mails separados por vírgula)">
            <Input
              value={form.participantes}
              onChange={set('participantes')}
              placeholder="fulano@empresa.com, ciclano@empresa.com"
            />
          </Campo>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.comMeet} onChange={set('comMeet')} />
            Adicionar videochamada do Google Meet
          </label>
        </>
      )}

      {/* Específicos: Ausente / Foco */}
      {(tipo === 'ausente' || tipo === 'foco') && (
        <>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.recusarConflitos}
              onChange={set('recusarConflitos')}
            />
            Recusar automaticamente reuniões conflitantes
          </label>
          {form.recusarConflitos && (
            <Campo label="Mensagem de recusa (opcional)">
              <Input
                value={form.mensagemRecusa}
                onChange={set('mensagemRecusa')}
                placeholder="Estou indisponível neste período."
              />
            </Campo>
          )}
        </>
      )}

      {/* Específicos: Local de trabalho */}
      {tipo === 'local' && (
        <>
          <Campo label="Onde">
            <select value={form.tipoLocal} onChange={set('tipoLocal')} className={inputCls}>
              <option value="casa">Casa</option>
              <option value="escritorio">Escritório</option>
              <option value="personalizado">Personalizado</option>
            </select>
          </Campo>
          {form.tipoLocal !== 'casa' && (
            <Campo label="Rótulo do local">
              <Input
                value={form.rotuloLocal}
                onChange={set('rotuloLocal')}
                placeholder={form.tipoLocal === 'escritorio' ? 'Ex.: Sede - 3º andar' : 'Ex.: Coworking'}
              />
            </Campo>
          )}
        </>
      )}

      {/* Notas (evento e tarefa) */}
      {(tipo === 'evento' || tipo === 'tarefa') && (
        <Campo label={tipo === 'tarefa' ? 'Detalhes' : 'Descrição'}>
          <textarea
            value={form.descricao}
            onChange={set('descricao')}
            rows={3}
            className={cn(inputCls, 'h-auto resize-y py-2')}
            placeholder="Adicione detalhes"
          />
        </Campo>
      )}

      {erro && <p className="text-sm text-destructive">{erro}</p>}

      <div className="flex justify-end gap-2 border-t pt-4">
        <Button type="button" variant="ghost" onClick={onCancelar} disabled={salvando}>
          Cancelar
        </Button>
        <Button type="submit" disabled={salvando}>
          {salvando && <Loader2 className="size-4 animate-spin" />}
          {editar ? 'Salvar' : 'Criar'}
        </Button>
      </div>
    </form>
  )
}

/**
 * Dialog de criação/edição de evento (ou tarefa). Remonta o formulário a cada
 * abertura (key) para começar com os valores corretos do tipo/evento.
 *
 * @param {{
 *   aberto: boolean, tipo: string, evento?: object|null, referencia?: Date,
 *   onOpenChange: (v:boolean)=>void, onSalvo: () => void,
 * }} props
 */
export default function EventoFormDialog({
  aberto,
  tipo,
  evento,
  referencia,
  onOpenChange,
  onSalvo,
}) {
  return (
    <Dialog open={aberto} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        {aberto && (
          <FormularioEvento
            key={`${tipo}-${evento?.id ?? 'novo'}`}
            tipo={tipo}
            evento={evento}
            referencia={referencia}
            onCancelar={() => onOpenChange(false)}
            onSalvo={onSalvo}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}
