import {
  AlignLeft,
  Calendar,
  CheckSquare,
  CircleDot,
  Clock,
  Gauge,
  ListChecks,
  TextCursorInput,
} from 'lucide-react'

export const TIPOS_PERGUNTA = [
  { valor: 'texto_curto', rotulo: 'Resposta curta', icon: TextCursorInput },
  { valor: 'paragrafo', rotulo: 'Parágrafo', icon: AlignLeft },
  { valor: 'multipla_escolha', rotulo: 'Múltipla escolha', icon: CircleDot },
  { valor: 'caixas_selecao', rotulo: 'Caixas de seleção', icon: CheckSquare },
  { valor: 'lista_suspensa', rotulo: 'Lista suspensa', icon: ListChecks },
  { valor: 'escala', rotulo: 'Escala linear', icon: Gauge },
  { valor: 'data', rotulo: 'Data', icon: Calendar },
  { valor: 'hora', rotulo: 'Horário', icon: Clock },
]

export const OPCOES_COLETA_EMAIL = [
  { valor: 'verificado', rotulo: 'Verificado', ajuda: 'Exige login no Google e registra o e-mail da conta automaticamente.' },
  { valor: 'informado', rotulo: 'Informado pelo respondente', ajuda: 'Pede o e-mail num campo, sem verificar se é da pessoa.' },
  { valor: 'nao_coletar', rotulo: 'Não coletar', ajuda: 'Respostas anônimas.' },
]

export const TIPOS_COM_OPCOES = ['multipla_escolha', 'caixas_selecao', 'lista_suspensa']

export const CLASSE_CAMPO =
  'w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30 [&>option]:bg-background'

let seq = 0
/** Chave local estável para o React (itens novos ainda não têm id do Google). */
export const novaChave = () => `k${++seq}`

export function novaPergunta(tipo = 'multipla_escolha') {
  return ajustarAoTipo(
    { chave: novaChave(), tipo, titulo: '', descricao: null, obrigatoria: false },
    tipo,
  )
}

/** Troca o tipo preenchendo os campos que o novo tipo exige. */
export function ajustarAoTipo(item, tipo) {
  const novo = { ...item, tipo }
  if (TIPOS_COM_OPCOES.includes(tipo)) {
    novo.opcoes = item.opcoes?.length ? item.opcoes : ['Opção 1']
    novo.permitirOutro = tipo !== 'lista_suspensa' && Boolean(item.permitirOutro)
  }
  if (tipo === 'escala' && !item.escala) {
    novo.escala = { min: 1, max: 5, rotuloMin: null, rotuloMax: null }
  }
  if (tipo === 'data') novo.incluirHora = Boolean(item.incluirHora)
  return novo
}

/** Converte o item do editor no payload aceito pelo back-end. */
export function paraPayload(item) {
  const base = { tipo: item.tipo, titulo: item.titulo, descricao: item.descricao, obrigatoria: item.obrigatoria }
  if (item.id) base.id = item.id
  if (TIPOS_COM_OPCOES.includes(item.tipo)) {
    base.opcoes = item.opcoes
    base.permitirOutro = item.permitirOutro
  }
  if (item.tipo === 'escala') base.escala = item.escala
  if (item.tipo === 'data') base.incluirHora = item.incluirHora
  return base
}
