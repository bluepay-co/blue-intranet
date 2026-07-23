import { useEffect, useState, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { categoriaInfo } from '@/lib/categoriasAtualizacao'
import { useAuth } from '@/auth/auth-context'
import { listarRecentes } from '@/api/modules/atualizacoes'

/**
 * Card modal de avisos de atualização da intranet (publicados pelo T.I.).
 *
 * Espelha o padrão do `NotificacoesChamadosProvider`: faz polling dos avisos
 * recentes e usa o `localStorage` (por usuário) para lembrar os que já foram
 * fechados. Mostra um aviso por vez num modal central; ao fechar, marca como
 * visto e passa para o próximo. Diferente do provider de chamados, NÃO marca
 * tudo como visto no primeiro acesso — quem logar depois de um aviso publicado
 * também deve vê-lo (a janela de dias do backend limita o volume).
 */

const INTERVALO_MS = 60_000

const chaveSeen = (userId) => `atualizacoes_seen_${userId ?? 'anon'}`

function carregarVistos(userId) {
  try {
    const arr = JSON.parse(localStorage.getItem(chaveSeen(userId)) ?? '[]')
    return Array.isArray(arr) ? arr : []
  } catch {
    return []
  }
}

/**
 * Renderiza a descrição preservando as quebras de linha. Se todas as linhas
 * começam com `*` ou `-`, vira uma lista de tópicos estilizada; senão, mantém
 * o texto como digitado.
 */
function Descricao({ texto }) {
  const linhas = texto.split('\n').map((l) => l.trim()).filter(Boolean)
  const todosTopicos = linhas.length > 0 && linhas.every((l) => /^[*-]\s+/.test(l))

  if (todosTopicos) {
    return (
      <ul className="space-y-1.5 text-left">
        {linhas.map((l, i) => (
          <li key={i} className="flex gap-2 text-sm leading-relaxed text-muted-foreground">
            <span className="mt-[7px] size-1.5 shrink-0 rounded-full bg-current opacity-50" />
            <span>{l.replace(/^[*-]\s+/, '')}</span>
          </li>
        ))}
      </ul>
    )
  }

  return <p className="whitespace-pre-line text-center text-sm leading-relaxed text-muted-foreground">{texto}</p>
}

export default function AtualizacoesModal() {
  const { usuario } = useAuth()
  const userId = usuario?.id
  const [recentes, setRecentes] = useState([])
  const [vistos, setVistos] = useState(() => carregarVistos(userId))

  // Recarrega os "vistos" ao trocar de usuário (login/logout).
  useEffect(() => { setVistos(carregarVistos(userId)) }, [userId])

  // Polling dos avisos recentes (imediato no mount + a cada minuto).
  useEffect(() => {
    if (!userId) return
    let ativo = true

    async function buscar() {
      try {
        const data = await listarRecentes()
        if (ativo) setRecentes(data)
      } catch {
        // silencioso — tenta de novo no próximo ciclo
      }
    }

    buscar()
    const intervalo = setInterval(buscar, INTERVALO_MS)
    return () => { ativo = false; clearInterval(intervalo) }
  }, [userId])

  // Primeiro aviso recente ainda não visto (fila: um por vez).
  const atual = recentes.find((a) => !vistos.includes(a.id)) ?? null

  const fechar = useCallback(() => {
    if (!atual) return
    setVistos((anteriores) => {
      const atualizado = anteriores.includes(atual.id) ? anteriores : [...anteriores, atual.id]
      localStorage.setItem(chaveSeen(userId), JSON.stringify(atualizado))
      return atualizado
    })
  }, [atual, userId])

  if (!atual) return null

  const cat = categoriaInfo(atual.categoria)
  const Icone = cat.icon

  return (
    <Dialog open onOpenChange={(aberto) => { if (!aberto) fechar() }}>
      <DialogContent className="max-w-sm gap-0 overflow-hidden p-0">
        {/* Cabeçalho com ícone + selo da categoria */}
        <div className="flex flex-col items-center gap-3 px-6 pb-6 pt-9 text-center">
          <span className={cn('grid size-16 place-items-center rounded-2xl', cat.corIcone)}>
            <Icone className="size-8" />
          </span>

          <span className={cn('rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide', cat.corBadge)}>
            {cat.label}
          </span>

          <DialogTitle className="text-center text-xl leading-snug">{atual.titulo}</DialogTitle>

          {atual.subtitulo && (
            <div className="mt-1 w-full">
              <Descricao texto={atual.subtitulo} />
            </div>
          )}
        </div>

        {/* Rodapé */}
        <div className="border-t bg-muted/30 px-6 py-4">
          <Button className="w-full" onClick={fechar}>Entendi</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
