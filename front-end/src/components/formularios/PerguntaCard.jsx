import { ArrowDown, ArrowUp, Copy, Plus, Trash2, X, Info } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { TIPOS_PERGUNTA, TIPOS_COM_OPCOES, CLASSE_CAMPO, ajustarAoTipo } from './tipos'

function proximaOpcao(opcoes) {
  let n = opcoes.length + 1
  while (opcoes.includes(`Opção ${n}`)) n++
  return `Opção ${n}`
}

function Opcoes({ item, onChange }) {
  const marcador = item.tipo === 'caixas_selecao' ? 'rounded-sm' : 'rounded-full'
  const atualizar = (opcoes) => onChange({ ...item, opcoes })

  return (
    <div className="flex flex-col gap-2">
      {item.opcoes.map((opcao, i) => (
        <div key={i} className="flex items-center gap-2">
          {item.tipo === 'lista_suspensa' ? (
            <span className="w-4 text-right text-xs text-muted-foreground">{i + 1}.</span>
          ) : (
            <span className={`size-4 shrink-0 border border-muted-foreground/50 ${marcador}`} />
          )}
          <Input
            value={opcao}
            placeholder={`Opção ${i + 1}`}
            onChange={(e) => atualizar(item.opcoes.map((o, k) => (k === i ? e.target.value : o)))}
          />
          <Button
            variant="ghost"
            size="icon-sm"
            title="Remover opção"
            disabled={item.opcoes.length === 1}
            onClick={() => atualizar(item.opcoes.filter((_, k) => k !== i))}
          >
            <X />
          </Button>
        </div>
      ))}

      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => atualizar([...item.opcoes, proximaOpcao(item.opcoes)])}
        >
          <Plus /> Adicionar opção
        </Button>
        {item.tipo !== 'lista_suspensa' && (
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <input
              type="checkbox"
              className="rounded"
              checked={Boolean(item.permitirOutro)}
              onChange={(e) => onChange({ ...item, permitirOutro: e.target.checked })}
            />
            Incluir opção "Outro"
          </label>
        )}
      </div>
    </div>
  )
}

function Escala({ item, onChange }) {
  const { escala } = item
  const atualizar = (campo, valor) => onChange({ ...item, escala: { ...escala, [campo]: valor } })

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 text-sm">
        <select
          className={cn(CLASSE_CAMPO, 'h-8 w-auto')}
          value={escala.min}
          onChange={(e) => atualizar('min', Number(e.target.value))}
        >
          {[0, 1].map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
        <span className="text-muted-foreground">até</span>
        <select
          className={cn(CLASSE_CAMPO, 'h-8 w-auto')}
          value={escala.max}
          onChange={(e) => atualizar('max', Number(e.target.value))}
        >
          {[2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <Input
          placeholder={`Rótulo do ${escala.min} (opcional)`}
          value={escala.rotuloMin ?? ''}
          onChange={(e) => atualizar('rotuloMin', e.target.value || null)}
        />
        <Input
          placeholder={`Rótulo do ${escala.max} (opcional)`}
          value={escala.rotuloMax ?? ''}
          onChange={(e) => atualizar('rotuloMax', e.target.value || null)}
        />
      </div>
    </div>
  )
}

function Previa({ texto }) {
  return (
    <p className="border-b border-dashed pb-1 text-sm text-muted-foreground sm:w-1/2">{texto}</p>
  )
}

export default function PerguntaCard({ item, indice, total, onChange, onMover, onDuplicar, onRemover }) {
  const naoSuportado = item.tipo === 'nao_suportado'

  const acoes = (
    <div className="flex items-center gap-0.5">
      <Button variant="ghost" size="icon-sm" title="Mover para cima" disabled={indice === 0} onClick={() => onMover(-1)}>
        <ArrowUp />
      </Button>
      <Button variant="ghost" size="icon-sm" title="Mover para baixo" disabled={indice === total - 1} onClick={() => onMover(1)}>
        <ArrowDown />
      </Button>
      {!naoSuportado && (
        <Button variant="ghost" size="icon-sm" title="Duplicar" onClick={onDuplicar}>
          <Copy />
        </Button>
      )}
      <Button variant="ghost" size="icon-sm" title="Remover" className="text-destructive hover:text-destructive" onClick={onRemover}>
        <Trash2 />
      </Button>
    </div>
  )

  if (naoSuportado) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex items-center gap-3 py-3">
          <Info className="size-4 shrink-0 text-muted-foreground" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{item.titulo || 'Item sem título'}</p>
            <p className="text-xs text-muted-foreground">
              Criado no Google Forms (seção, imagem, grade...). É mantido, mas só pode ser editado por lá.
            </p>
          </div>
          {acoes}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 py-4">
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            className="flex-1"
            placeholder="Pergunta"
            value={item.titulo}
            onChange={(e) => onChange({ ...item, titulo: e.target.value })}
          />
          <select
            className={cn(CLASSE_CAMPO, 'h-8 sm:w-52')}
            value={item.tipo}
            onChange={(e) => onChange(ajustarAoTipo(item, e.target.value))}
          >
            {TIPOS_PERGUNTA.map((t) => <option key={t.valor} value={t.valor}>{t.rotulo}</option>)}
          </select>
        </div>

        <Input
          placeholder="Descrição (opcional)"
          value={item.descricao ?? ''}
          onChange={(e) => onChange({ ...item, descricao: e.target.value || null })}
        />

        {TIPOS_COM_OPCOES.includes(item.tipo) && <Opcoes item={item} onChange={onChange} />}
        {item.tipo === 'escala' && <Escala item={item} onChange={onChange} />}
        {item.tipo === 'texto_curto' && <Previa texto="Texto de resposta curta" />}
        {item.tipo === 'paragrafo' && <Previa texto="Texto de resposta longa" />}
        {item.tipo === 'hora' && <Previa texto="Horário (hh:mm)" />}
        {item.tipo === 'data' && (
          <div className="flex flex-col gap-2">
            <Previa texto={item.incluirHora ? 'Dia, mês, ano e horário' : 'Dia, mês e ano'} />
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <input
                type="checkbox"
                className="rounded"
                checked={Boolean(item.incluirHora)}
                onChange={(e) => onChange({ ...item, incluirHora: e.target.checked })}
              />
              Incluir horário
            </label>
          </div>
        )}

        <div className="flex items-center justify-between border-t pt-3">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="rounded"
              checked={item.obrigatoria}
              onChange={(e) => onChange({ ...item, obrigatoria: e.target.checked })}
            />
            Obrigatória
          </label>
          {acoes}
        </div>
      </CardContent>
    </Card>
  )
}
