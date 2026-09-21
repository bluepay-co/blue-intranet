import { TIPOS_COM_OPCOES } from './tipos'

const ROTULO_OUTRO = 'Outro'

export const dataHora = (iso) =>
  iso
    ? new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : '—'

/** Formata valores de data ("2026-09-21" ou "2026-09-21 14:30") no padrão brasileiro. */
export function formatarValor(pergunta, valor) {
  if (pergunta.tipo !== 'data') return valor
  const m = /^(\d{4})-(\d{2})-(\d{2})(.*)$/.exec(valor)
  return m ? `${m[3]}/${m[2]}/${m[1]}${m[4]}` : valor
}

export function valoresDe(pergunta, resposta) {
  return (resposta.valores[pergunta.questionId] ?? []).map((v) => formatarValor(pergunta, v))
}

/** Distribuição de escolha/escala; valores fora das opções ("Outro") viram uma linha só. */
export function distribuir(pergunta, respostas) {
  const ehEscala = pergunta.tipo === 'escala'
  const rotulos = ehEscala
    ? Array.from(
        { length: pergunta.escala.max - pergunta.escala.min + 1 },
        (_, i) => String(pergunta.escala.min + i),
      )
    : [...(pergunta.opcoes ?? [])]
  const contagem = new Map(rotulos.map((r) => [r, 0]))

  let respondentes = 0
  let soma = 0
  for (const resposta of respostas) {
    const valores = resposta.valores[pergunta.questionId] ?? []
    if (valores.length === 0) continue
    respondentes++
    for (const v of valores) {
      const chave = contagem.has(v) ? v : ROTULO_OUTRO
      contagem.set(chave, (contagem.get(chave) ?? 0) + 1)
      if (ehEscala) soma += Number(v)
    }
  }

  // Caixas de seleção: % sobre quem respondeu (a soma pode passar de 100%).
  const linhas = [...contagem].map(([rotulo, total]) => ({
    rotulo,
    total,
    pct: respondentes ? Math.round((total / respondentes) * 100) : 0,
  }))
  return { linhas, respondentes, media: ehEscala && respondentes ? soma / respondentes : null }
}

export const temDistribuicao = (pergunta) =>
  TIPOS_COM_OPCOES.includes(pergunta.tipo) || (pergunta.tipo === 'escala' && pergunta.escala)

/** CSV com ";" e BOM, que o Excel em pt-BR abre com acentos e colunas corretas. */
export function gerarCsv({ perguntas, respostas }) {
  const comEmail = respostas.some((r) => r.email)
  // Prefixo ' neutraliza fórmulas (=, +, -, @) digitadas por quem respondeu.
  const escapar = (v) => {
    const texto = String(v ?? '')
    return `"${(/^[=+\-@\t\r]/.test(texto) ? `'${texto}` : texto).replace(/"/g, '""')}"`
  }
  const cabecalho = ['Enviada em', ...(comEmail ? ['E-mail'] : []), ...perguntas.map((p) => p.titulo)]
  const linhas = respostas.map((r) => [
    dataHora(r.enviadaEm),
    ...(comEmail ? [r.email ?? ''] : []),
    ...perguntas.map((p) => valoresDe(p, r).join(', ')),
  ])
  return '\uFEFF' + [cabecalho, ...linhas].map((l) => l.map(escapar).join(';')).join('\r\n')
}

export function baixarCsv(titulo, dados) {
  const nome = titulo
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^\w]+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()
  const url = URL.createObjectURL(new Blob([gerarCsv(dados)], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = `${nome || 'formulario'}-respostas.csv`
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
