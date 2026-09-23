import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { TIPOS_PERGUNTA } from './tipos'
import { dataHora, distribuir, temDistribuicao, valoresDe } from './respostas'

const LIMITE_TEXTOS = 5

function Barras({ pergunta, respostas }) {
  const { linhas, respondentes, media } = distribuir(pergunta, respostas)
  const { escala } = pergunta

  return (
    <div className="flex flex-col gap-3">
      {media !== null && (
        <p className="text-sm text-muted-foreground">
          Média <span className="text-2xl font-semibold tabular-nums text-foreground">{media.toFixed(1).replace('.', ',')}</span>
          {' '}de {escala.max}
        </p>
      )}
      <ul className="flex flex-col gap-2.5">
        {linhas.map(({ rotulo, total, pct }, i) => {
          const extremo = escala && (i === 0 ? escala.rotuloMin : i === linhas.length - 1 ? escala.rotuloMax : null)
          return (
            <li key={rotulo} title={`${rotulo}: ${total} resposta${total === 1 ? '' : 's'} (${pct}%)`}>
              <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
                <span className="min-w-0 truncate">
                  {rotulo}
                  {extremo && <span className="text-muted-foreground"> · {extremo}</span>}
                </span>
                <span className="shrink-0 tabular-nums text-muted-foreground">
                  {total} · {pct}%
                </span>
              </div>
              <div className="h-2 w-full rounded-[4px] bg-muted">
                <div
                  className="h-full rounded-[4px] bg-brand-accent transition-[width] dark:bg-[#2a9fcc]"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </li>
          )
        })}
      </ul>
      {pergunta.tipo === 'caixas_selecao' && respondentes > 0 && (
        <p className="text-xs text-muted-foreground">
          Mais de uma opção por resposta: as porcentagens podem somar mais de 100%.
        </p>
      )}
    </div>
  )
}

function Textos({ pergunta, respostas }) {
  const [todos, setTodos] = useState(false)
  const itens = respostas
    .map((r) => ({ id: r.id, enviadaEm: r.enviadaEm, email: r.email, texto: valoresDe(pergunta, r).join(', ') }))
    .filter((i) => i.texto)
  const visiveis = todos ? itens : itens.slice(0, LIMITE_TEXTOS)

  if (itens.length === 0) return <p className="text-sm text-muted-foreground">Sem respostas.</p>

  return (
    <div className="flex flex-col gap-2">
      <ul className="divide-y rounded-lg border">
        {visiveis.map((i) => (
          <li key={i.id} className="flex flex-col gap-0.5 px-3 py-2 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
            <span className="text-sm break-words whitespace-pre-line">{i.texto}</span>
            <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
              {i.email && `${i.email} · `}{dataHora(i.enviadaEm)}
            </span>
          </li>
        ))}
      </ul>
      {itens.length > LIMITE_TEXTOS && (
        <Button variant="ghost" size="sm" className="self-start" onClick={() => setTodos((t) => !t)}>
          {todos ? 'Mostrar menos' : `Ver todas (${itens.length})`}
        </Button>
      )}
    </div>
  )
}

/** @param {{ pergunta: object, respostas: object[] }} props */
export default function ResumoPergunta({ pergunta, respostas }) {
  const responderam = respostas.filter((r) => (r.valores[pergunta.questionId] ?? []).length > 0).length
  const tipo = TIPOS_PERGUNTA.find((t) => t.valor === pergunta.tipo)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{pergunta.titulo || 'Pergunta sem título'}</CardTitle>
        <CardDescription>
          {tipo ? `${tipo.rotulo} · ` : ''}
          {responderam} de {respostas.length} responderam
        </CardDescription>
      </CardHeader>
      <CardContent>
        {temDistribuicao(pergunta) ? (
          <Barras pergunta={pergunta} respostas={respostas} />
        ) : (
          <Textos pergunta={pergunta} respostas={respostas} />
        )}
      </CardContent>
    </Card>
  )
}
