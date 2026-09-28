/**
 * Regras de exibição do Kanban (portadas do protótipo). As colunas "Atrasado"
 * e "Esquecido" são calculadas a partir de prazo/atualizado_em.
 */

const H = 3_600_000
export const SLA_HORAS = 4
export const ESQUECIDA_DIAS = 3

export const PRIORIDADES = {
  urgent: { label: 'Urgente', classe: 'bg-red-500/15 text-red-600 dark:text-red-400', ponto: 'bg-red-500' },
  high: { label: 'Importante', classe: 'bg-amber-500/15 text-amber-600 dark:text-amber-400', ponto: 'bg-amber-500' },
  normal: { label: 'Normal', classe: 'bg-blue-500/15 text-blue-600 dark:text-blue-400', ponto: 'bg-blue-500' },
  low: { label: 'Baixa', classe: 'bg-muted text-muted-foreground', ponto: 'bg-muted-foreground' },
}

export const VISIBILIDADES = {
  private: { label: 'Só eu', descricao: 'Somente o responsável vê esta tarefa.' },
  requester: { label: 'Eu e o solicitante', descricao: 'Responsável e solicitante acompanham o andamento.' },
  team: { label: 'Minha equipe', descricao: 'Equipe do responsável e coordenação acompanham.' },
}

/**
 * Colunas do quadro. As `manual` são o status real. "Urgente" e "Atrasado" são
 * calculadas (prioridade urgente / prazo vencido, não finalizadas) — atraso tem
 * precedência. Soltar em "Urgente" muda a prioridade; "Atrasado" não aceita drop.
 */
export const COLUNAS = [
  { chave: 'todo', label: 'A fazer', cor: 'bg-muted-foreground', manual: true },
  { chave: 'doing', label: 'Em andamento', cor: 'bg-blue-500', manual: true },
  { chave: 'urgent', label: 'Urgente', cor: 'bg-orange-500', manual: false },
  { chave: 'done', label: 'Finalizado', cor: 'bg-emerald-500', manual: true },
  { chave: 'late', label: 'Atrasado', cor: 'bg-red-500', manual: false, semDrop: true },
]

/** Coluna em que a tarefa aparece no quadro. */
export function coluna(t, agora = Date.now()) {
  if (alerta(t, agora) === 'late') return 'late'
  if (t.prioridade === 'urgent' && t.status !== 'done') return 'urgent'
  return t.status
}

/** Alertas calculados, exibidos como selo no card (não são colunas). */
export const ALERTAS = {
  late: { label: 'Atrasada', classe: 'bg-destructive/10 text-destructive' },
  stale: { label: 'Esquecida', classe: 'bg-purple-500/10 text-purple-600 dark:text-purple-400' },
}

export const GRUPOS = [
  { chave: 'urgent', label: 'Urgente', cor: 'bg-red-500', descricao: 'Precisa de ação agora' },
  { chave: 'sla', label: 'SLA apertado ou vencido', cor: 'bg-amber-500', descricao: `Vence em menos de ${SLA_HORAS} horas` },
  { chave: 'high', label: 'Importante', cor: 'bg-blue-500', descricao: 'Alto impacto, prazo mais folgado' },
  { chave: 'routine', label: 'Rotina', cor: 'bg-muted-foreground', descricao: 'Sem pressão imediata' },
  { chave: 'done', label: 'Finalizadas', cor: 'bg-green-500', descricao: '' },
]

export const LEMBRETES = [
  [0, 'Sem lembrete'],
  [15, '15 minutos antes'],
  [30, '30 minutos antes'],
  [60, '1 hora antes'],
  [180, '3 horas antes'],
  [1440, '1 dia antes'],
]

const ms = (iso) => new Date(iso).getTime()

/** 'late' | 'stale' | null — alerta da tarefa aberta (atraso tem prioridade). */
export function alerta(t, agora = Date.now()) {
  if (t.status === 'done') return null
  if (ms(t.prazo) < agora) return 'late'
  if (agora - ms(t.atualizado_em) > ESQUECIDA_DIAS * 24 * H) return 'stale'
  return null
}

export const slaApertado = (t, agora = Date.now()) =>
  t.status !== 'done' && ms(t.prazo) >= agora && ms(t.prazo) - agora < SLA_HORAS * H

export function grupo(t, agora = Date.now()) {
  if (t.status === 'done') return 'done'
  if (t.prioridade === 'urgent') return 'urgent'
  if (ms(t.prazo) - agora < SLA_HORAS * H) return 'sla'
  if (t.prioridade === 'high') return 'high'
  return 'routine'
}

export const FILTROS_RAPIDOS = {
  urgent: (t) => t.prioridade === 'urgent' && t.status !== 'done',
  sla: (t) => slaApertado(t),
  late: (t) => alerta(t) === 'late',
  stale: (t) => alerta(t) === 'stale',
  done: (t) => t.status === 'done',
}

/** Abas: minhas (sou responsável), solicitei (pedi a outro), equipe (demais visíveis). */
export const ABAS = {
  minhas: (t, uid) => t.responsavel_id === uid,
  solicitei: (t, uid) => t.solicitante_id === uid && t.responsavel_id !== uid,
  equipe: (t, uid) => t.responsavel_id !== uid && t.solicitante_id !== uid,
}

export const formatarData = (iso) =>
  new Date(iso)
    .toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
    .replace('.', '')

export function relativo(iso) {
  const d = ms(iso) - Date.now()
  const a = Math.abs(d)
  if (a < 60_000) return 'agora'
  let s
  if (a < H) s = `${Math.round(a / 60_000)} min`
  else if (a < 24 * H) {
    const h = Math.floor(a / H)
    const m = Math.round((a % H) / 60_000)
    s = `${h}h${m ? ` ${m}min` : ''}`
  } else {
    const dias = Math.round(a / (24 * H))
    s = `${dias} ${dias === 1 ? 'dia' : 'dias'}`
  }
  return d >= 0 ? `em ${s}` : `há ${s}`
}

export const iniciais = (nome = '') => nome.trim().charAt(0).toUpperCase()

export const selectCls =
  'h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30'
