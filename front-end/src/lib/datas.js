/**
 * Utilitários de data para a Agenda (semana começando no domingo).
 * Tudo em horário local — a chave de dia evita o "pulo" de fuso dos all-day.
 */

export function inicioDoDia(d) {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}
export function fimDoDia(d) {
  const x = new Date(d)
  x.setHours(23, 59, 59, 999)
  return x
}
export function addDias(d, n) {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}
export function addMeses(d, n) {
  const x = new Date(d)
  x.setMonth(x.getMonth() + n)
  return x
}
export function inicioDaSemana(d) {
  const x = inicioDoDia(d)
  x.setDate(x.getDate() - x.getDay()) // volta para o domingo
  return x
}
export function fimDaSemana(d) {
  return fimDoDia(addDias(inicioDaSemana(d), 6))
}
export function inicioDoMes(d) {
  const x = inicioDoDia(d)
  x.setDate(1)
  return x
}
export function fimDoMes(d) {
  const x = new Date(d)
  x.setMonth(x.getMonth() + 1, 0)
  x.setHours(23, 59, 59, 999)
  return x
}
/** 7 dias da semana de `d` (domingo → sábado). */
export function diasDaSemana(d) {
  const i = inicioDaSemana(d)
  return Array.from({ length: 7 }, (_, k) => addDias(i, k))
}
/** 42 dias (6 semanas) cobrindo o mês de `d`, começando no domingo. */
export function gradeDoMes(d) {
  const inicio = inicioDaSemana(inicioDoMes(d))
  return Array.from({ length: 42 }, (_, k) => addDias(inicio, k))
}

export function mesmoDia(a, b) {
  return a.toDateString() === b.toDateString()
}
export function ehHoje(d) {
  return mesmoDia(d, new Date())
}
export function mesmoMes(a, b) {
  return a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear()
}

/** Chave 'YYYY-MM-DD' em horário local. */
export function chaveDia(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`
}

/** Chave do dia a que o evento pertence (respeita all-day). */
export function chaveDoEvento(evento) {
  if (!evento.inicio) return null
  if (evento.diaInteiro) return evento.inicio.slice(0, 10) // já é YYYY-MM-DD
  return chaveDia(new Date(evento.inicio))
}

/** Agrupa eventos por dia: Map<'YYYY-MM-DD', Evento[]>. */
export function agruparPorDia(eventos) {
  const mapa = new Map()
  for (const ev of eventos) {
    const k = chaveDoEvento(ev)
    if (!k) continue
    if (!mapa.has(k)) mapa.set(k, [])
    mapa.get(k).push(ev)
  }
  return mapa
}

// ---- Formatação (pt-BR) ----
export const fmt = {
  diaSemanaLongo: new Intl.DateTimeFormat('pt-BR', { weekday: 'long' }),
  diaSemanaCurto: new Intl.DateTimeFormat('pt-BR', { weekday: 'short' }),
  mesAno: new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }),
  diaMesAno: new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }),
  diaMes: new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }),
  mesCurto: new Intl.DateTimeFormat('pt-BR', { month: 'short' }),
  hora: new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }),
}

export const horario = (iso) => fmt.hora.format(new Date(iso))
export const capitalizar = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s)
export const semPonto = (s) => s.replace('.', '')
