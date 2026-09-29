import { Fragment } from 'react'

/**
 * Formatação simples do conteúdo dos posts: **negrito**, *itálico* e
 * [texto](https://link) — além de URLs soltas virarem link. É um parser
 * pequeno que monta elementos React (nada de HTML do usuário é interpretado)
 * e só aceita links http(s). Quebras de linha ficam por conta do
 * `whitespace-pre-wrap` de quem usa.
 */

const CLASSE_LINK = 'font-medium text-blue-600 underline underline-offset-2 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300'

// Ordem importa: link com texto antes de negrito/itálico; negrito (**) antes de itálico (*).
const REGRAS = [
  { tipo: 'link', re: /\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)/ },
  // Aceita *itálico* dentro do negrito; não-guloso para parar no primeiro "**".
  { tipo: 'negrito', re: /\*\*([^\n]+?)\*\*/ },
  { tipo: 'italico', re: /\*([^*\n]+?)\*/ },
  { tipo: 'url', re: /(https?:\/\/[^\s<>"']+[^\s<>"'.,;:!?)\]])/ },
]

function formatar(texto, prefixo = '') {
  const partes = []
  let resto = texto
  let n = 0
  while (resto) {
    // Primeira ocorrência de qualquer regra no que falta processar.
    let achado = null
    for (const regra of REGRAS) {
      const m = regra.re.exec(resto)
      if (m && (!achado || m.index < achado.m.index)) achado = { regra, m }
    }
    if (!achado) {
      partes.push(resto)
      break
    }
    const { regra, m } = achado
    if (m.index > 0) partes.push(resto.slice(0, m.index))
    const chave = `${prefixo}${n++}`
    if (regra.tipo === 'link' || regra.tipo === 'url') {
      const href = regra.tipo === 'link' ? m[2] : m[1]
      partes.push(
        <a key={chave} href={href} target="_blank" rel="noopener noreferrer" className={CLASSE_LINK}>
          {m[1]}
        </a>,
      )
    } else if (regra.tipo === 'negrito') {
      partes.push(<strong key={chave} className="font-semibold text-foreground">{formatar(m[1], `${chave}-`)}</strong>)
    } else {
      partes.push(<em key={chave}>{formatar(m[1], `${chave}-`)}</em>)
    }
    resto = resto.slice(m.index + m[0].length)
  }
  return partes.map((p, i) => (typeof p === 'string' ? <Fragment key={`${prefixo}t${i}`}>{p}</Fragment> : p))
}

/** @param {{ texto: string }} props */
export default function TextoFormatado({ texto }) {
  return <>{formatar(texto ?? '')}</>
}
