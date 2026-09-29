/** Tipos de reação do Blog, compartilhados pelo feed e pelo painel do Marketing. */
export const REACOES = [
  { tipo: 'like', emoji: '👍', label: 'Curtir' },
  { tipo: 'heart', emoji: '❤️', label: 'Amei' },
  { tipo: 'aplauso', emoji: '👏', label: 'Aplaudir' },
  { tipo: 'foguete', emoji: '🚀', label: 'Foguete' },
]

/** Soma as reações de um post (like/heart/aplauso/foguete). */
export const totalReacoes = (post) => REACOES.reduce((soma, { tipo }) => soma + (post[`${tipo}_count`] ?? 0), 0)

export const dataCurta = (iso) =>
  new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })

export const dataHora = (iso) =>
  new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).replace('.', '')

/** "agora", "há 5 min", "há 3 h", "há 2 dias"; passou de uma semana, mostra a data. */
export function tempoRelativo(iso) {
  const seg = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000)
  if (seg < 60) return 'agora'
  if (seg < 3600) return `há ${Math.floor(seg / 60)} min`
  if (seg < 86400) return `há ${Math.floor(seg / 3600)} h`
  const dias = Math.floor(seg / 86400)
  if (dias < 7) return `há ${dias} ${dias === 1 ? 'dia' : 'dias'}`
  return dataCurta(iso)
}
