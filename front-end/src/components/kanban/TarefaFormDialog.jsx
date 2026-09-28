import { useEffect, useMemo, useState } from 'react'
import { ArrowRightLeft, HelpCircle, Loader2, Lock, Users } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { ROTULOS_ROLE } from '@/api/modules/usuarios'
import { LEMBRETES, PRIORIDADES, selectCls } from './regras'
import SeletorParticipantes from './SeletorParticipantes'

/**
 * Tipos de tarefa oferecidos no formulário. Cada um fixa a combinação de
 * responsável/solicitante/visibilidade que o back espera:
 *  - pessoal:   eu → eu, private
 *  - solicitar: eu → outra pessoa, requester (ou team, se compartilhar)
 *  - equipe:    eu → alguém da minha equipe (ou eu), team
 */
const TIPOS = [
  { chave: 'pessoal', titulo: 'Só para mim', descricao: 'Anotação pessoal. Ninguém mais vê.', Icone: Lock },
  { chave: 'solicitar', titulo: 'Solicitar a alguém', descricao: 'Peça para alguém (de qualquer equipe). Só vocês dois veem.', Icone: ArrowRightLeft },
  { chave: 'equipe', titulo: 'Da equipe', descricao: 'Toda a equipe do responsável e a coordenação veem.', Icone: Users },
]

/** Converte data para o valor aceito por <input type="datetime-local">. */
function paraInputLocal(data) {
  const d = new Date(data)
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16)
}

/** Tipo de uma tarefa existente, deduzido da visibilidade. */
const tipoDaTarefa = (t) => ({ private: 'pessoal', requester: 'solicitar', team: 'equipe' })[t.visibilidade]

function estadoInicial(tarefa, usuarioId) {
  if (tarefa) {
    return {
      tipo: tipoDaTarefa(tarefa),
      titulo: tarefa.titulo,
      descricao: tarefa.descricao,
      responsavelId: tarefa.responsavel_id,
      prioridade: tarefa.prioridade,
      prazo: paraInputLocal(tarefa.prazo),
      lembreteMin: tarefa.lembrete_min,
      compartilharEquipe: tarefa.visibilidade === 'team',
      participantesIds: tarefa.participantes.map((p) => p.id),
    }
  }
  const prazo = new Date(Date.now() + 4 * 3_600_000)
  prazo.setMinutes(0, 0, 0)
  return {
    tipo: null,
    titulo: '',
    descricao: '',
    responsavelId: usuarioId,
    prioridade: 'normal',
    prazo: paraInputLocal(prazo),
    lembreteMin: 30,
    compartilharEquipe: false,
    participantesIds: [],
  }
}

function Campo({ rotulo, children, className }) {
  return (
    <label className={cn('grid gap-1 text-xs text-muted-foreground', className)}>
      {rotulo}
      {children}
    </label>
  )
}

/** Criação e edição de tarefa. `tarefa` ausente = nova tarefa (começa pela escolha do tipo). */
export default function TarefaFormDialog({ aberto, onFechar, tarefa, usuario, usuarios, onSalvar }) {
  const [form, setForm] = useState(() => estadoInicial(tarefa, usuario.id))
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  useEffect(() => {
    if (aberto) {
      /* eslint-disable react-hooks/set-state-in-effect -- reinicia o formulário a cada abertura */
      setForm(estadoInicial(tarefa, usuario.id))
      setErro('')
      /* eslint-enable react-hooks/set-state-in-effect */
    }
  }, [aberto, tarefa, usuario.id])

  const eu = usuarios.find((u) => u.id === usuario.id)
  const outros = useMemo(() => usuarios.filter((u) => u.id !== usuario.id), [usuarios, usuario.id])
  // Na edição, o responsável atual entra na lista mesmo que seja de outra equipe.
  const minhaEquipe = useMemo(
    () => usuarios.filter((u) => u.equipe === eu?.equipe || u.id === tarefa?.responsavel_id),
    [usuarios, eu, tarefa],
  )

  const set = (campo) => (e) => setForm((f) => ({ ...f, [campo]: e.target.value }))

  function escolherTipo(tipo) {
    setErro('')
    setForm((f) => ({
      ...f,
      tipo,
      // "Solicitar" exige outra pessoa; os demais começam com você como responsável.
      responsavelId: tipo === 'solicitar' ? (outros[0]?.id ?? '') : usuario.id,
      compartilharEquipe: false,
    }))
  }

  async function salvar(e) {
    e.preventDefault()
    if (!form.titulo.trim()) return setErro('Informe um título para a tarefa.')
    if (form.tipo === 'solicitar' && !form.responsavelId) return setErro('Escolha quem vai fazer a tarefa.')

    // Na edição o solicitante original é preservado; na criação é sempre você.
    const solicitanteId = tarefa ? tarefa.solicitante_id : usuario.id
    const solicitante = usuarios.find((u) => u.id === solicitanteId)
    const visibilidade =
      form.tipo === 'pessoal' ? 'private' : form.tipo === 'equipe' || form.compartilharEquipe ? 'team' : 'requester'

    setSalvando(true)
    setErro('')
    try {
      await onSalvar({
        titulo: form.titulo,
        descricao: form.descricao,
        responsavelId: form.tipo === 'pessoal' ? (tarefa?.responsavel_id ?? usuario.id) : Number(form.responsavelId),
        solicitanteId,
        areaSolicitante: tarefa?.area_solicitante ?? ROTULOS_ROLE[solicitante?.role] ?? 'Outros',
        prioridade: form.prioridade,
        prazo: new Date(form.prazo).toISOString(),
        lembreteMin: Number(form.lembreteMin),
        visibilidade,
        participantesIds: form.tipo === 'pessoal' ? [] : form.participantesIds,
      })
      onFechar()
    } catch (err) {
      setErro(err.response?.data?.message ?? 'Não foi possível salvar a tarefa.')
    } finally {
      setSalvando(false)
    }
  }

  const tipoAtual = TIPOS.find((t) => t.chave === form.tipo)
  const responsavel = usuarios.find((u) => u.id === Number(form.responsavelId))
  const primeiroNome = responsavel?.id === usuario.id ? 'você' : (responsavel?.nome.split(' ')[0] ?? 'o responsável')
  const nomesParticipantes = form.participantesIds
    .map((id) => usuarios.find((u) => u.id === id)?.nome.split(' ')[0])
    .filter(Boolean)
  const extras = nomesParticipantes.length ? ` Também acompanham: ${nomesParticipantes.join(', ')}.` : ''
  const quemVe = {
    pessoal: 'só você.',
    solicitar: form.compartilharEquipe
      ? `você, ${primeiroNome}, a equipe de ${primeiroNome} e a coordenação dela. A pessoa recebe a tarefa direto em "Minhas tarefas", sem precisar aceitar.`
      : `só você e ${primeiroNome}. A pessoa recebe a tarefa direto em "Minhas tarefas", sem precisar aceitar.`,
    equipe: `você, ${primeiroNome === 'você' ? 'toda a sua equipe' : `${primeiroNome}, toda a equipe`} e a coordenação da equipe.`,
  }[form.tipo] + (form.tipo === 'pessoal' ? '' : extras)

  return (
    <Dialog open={aberto} onOpenChange={(v) => !v && onFechar()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{tarefa ? 'Editar tarefa' : 'Nova tarefa'}</DialogTitle>
          <DialogDescription>
            {form.tipo ? tipoAtual.descricao : 'Que tipo de tarefa você quer criar?'}
          </DialogDescription>
        </DialogHeader>

        <details className="group rounded-lg border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
          <summary className="flex cursor-pointer list-none items-center gap-1.5 font-medium text-foreground">
            <HelpCircle className="size-3.5" /> Como funciona?
          </summary>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>
              <b className="text-foreground">Só para mim</b>: lembrete pessoal. Ninguém mais vê, nem a coordenação.
            </li>
            <li>
              <b className="text-foreground">Solicitar a alguém</b>: você pede e acompanha; a pessoa (de qualquer equipe) recebe direto em
              “Minhas tarefas”, sem precisar aceitar.
            </li>
            <li>
              <b className="text-foreground">Da equipe</b>: fica visível para toda a equipe do responsável e para a coordenação.
            </li>
            <li>
              <b className="text-foreground">Participantes</b>: pessoas extras, de qualquer equipe, que veem, comentam e recebem avisos.
              Ex.: você + Rafael + alguém de CX → “Solicitar a alguém” com Rafael responsável e a pessoa de CX como participante.
            </li>
            <li>Só o responsável e a coordenação mudam o status. Editar e excluir: quem criou e a coordenação.</li>
          </ul>
        </details>

        {/* Passo 1: tipo (na edição fica visível para permitir a troca) */}
        <div className="grid gap-2 sm:grid-cols-3">
          {TIPOS.map(({ chave, titulo, descricao, Icone }) => (
            <button
              key={chave}
              type="button"
              onClick={() => escolherTipo(chave)}
              aria-pressed={form.tipo === chave}
              className={cn(
                'flex flex-col items-start gap-1 rounded-xl border p-3 text-left transition-colors hover:border-primary/50',
                form.tipo === chave && 'border-primary bg-primary/5 ring-1 ring-primary',
                form.tipo && form.tipo !== chave && 'opacity-60',
              )}
            >
              <Icone className="size-4 text-primary" />
              <span className="text-sm font-semibold">{titulo}</span>
              <span className="text-[11px] text-muted-foreground">{descricao}</span>
            </button>
          ))}
        </div>

        {/* Passo 2: detalhes */}
        {form.tipo && (
          <form onSubmit={salvar} className="grid gap-3 sm:grid-cols-2">
            <Campo rotulo="Título" className="sm:col-span-2">
              <Input value={form.titulo} onChange={set('titulo')} placeholder="O que precisa ser feito?" autoFocus />
            </Campo>
            <Campo rotulo="Detalhes (opcional)" className="sm:col-span-2">
              <textarea
                value={form.descricao}
                onChange={set('descricao')}
                placeholder="Contexto, links, o que é esperado"
                className={cn(selectCls, 'h-20 resize-none py-2')}
              />
            </Campo>

            {form.tipo === 'solicitar' && (
              <>
                <Campo rotulo="Quem vai fazer?" className="sm:col-span-2">
                  <select className={selectCls} value={form.responsavelId} onChange={set('responsavelId')}>
                    {outros.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.nome} · {ROTULOS_ROLE[u.role] ?? u.role}
                      </option>
                    ))}
                  </select>
                </Campo>
                <label className="flex items-center gap-2 text-xs text-muted-foreground sm:col-span-2">
                  <input
                    type="checkbox"
                    checked={form.compartilharEquipe}
                    onChange={(e) => setForm((f) => ({ ...f, compartilharEquipe: e.target.checked }))}
                    className="size-4 accent-primary"
                  />
                  Mostrar também para a equipe de quem vai fazer (e a coordenação)
                </label>
              </>
            )}

            {form.tipo === 'equipe' && (
              <Campo rotulo="Responsável" className="sm:col-span-2">
                <select className={selectCls} value={form.responsavelId} onChange={set('responsavelId')}>
                  {minhaEquipe.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.id === usuario.id ? `Eu (${u.nome})` : u.nome}
                    </option>
                  ))}
                </select>
              </Campo>
            )}

            {form.tipo !== 'pessoal' && (
              <div className="grid gap-1 text-xs text-muted-foreground sm:col-span-2">
                Participantes (opcional) — veem, comentam e recebem avisos; podem ser de qualquer equipe
                <SeletorParticipantes
                  usuarios={usuarios}
                  selecionados={form.participantesIds}
                  onChange={(ids) => setForm((f) => ({ ...f, participantesIds: ids }))}
                  excluir={[usuario.id, Number(form.responsavelId), tarefa?.solicitante_id].filter(Boolean)}
                />
              </div>
            )}

            <Campo rotulo="Prazo">
              <Input type="datetime-local" value={form.prazo} onChange={set('prazo')} className="h-9" />
            </Campo>
            <Campo rotulo="Prioridade">
              <select className={selectCls} value={form.prioridade} onChange={set('prioridade')}>
                {Object.entries(PRIORIDADES).map(([k, p]) => (
                  <option key={k} value={k}>
                    {p.label}
                  </option>
                ))}
              </select>
            </Campo>
            <Campo rotulo="Lembrete" className="sm:col-span-2">
              <select className={selectCls} value={form.lembreteMin} onChange={set('lembreteMin')}>
                {LEMBRETES.map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            </Campo>

            <p className="flex items-start gap-2 rounded-lg border bg-muted/40 px-3 py-2 text-xs text-muted-foreground sm:col-span-2">
              <Users className="mt-px size-3.5 shrink-0" />
              <span>
                <b className="text-foreground">Quem vai ver: </b>
                {quemVe}
              </span>
            </p>

            {erro && <p className="text-sm text-destructive sm:col-span-2">{erro}</p>}

            <div className="flex justify-end gap-2 sm:col-span-2">
              <Button type="button" variant="outline" onClick={onFechar}>
                Cancelar
              </Button>
              <Button type="submit" disabled={salvando}>
                {salvando && <Loader2 className="size-4 animate-spin" />}
                {tarefa ? 'Salvar' : form.tipo === 'solicitar' ? 'Enviar solicitação' : 'Criar tarefa'}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
