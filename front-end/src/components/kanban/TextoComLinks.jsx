import { cn } from '@/lib/utils'

// Só http(s): nada de javascript:, data: ou arquivos. Pontuação final não entra no link.
const URL_RE = /(https?:\/\/[^\s<>"']+[^\s<>"'.,;:!?)\]])/g

/**
 * Texto puro com URLs viradas em links clicáveis (nova aba). O conteúdo segue
 * escapado pelo React — nenhum HTML do usuário é interpretado.
 */
export default function TextoComLinks({ texto, className, classeLink }) {
  const partes = texto.split(URL_RE)
  return (
    <span className={className}>
      {partes.map((parte, i) =>
        i % 2 === 1 ? (
          <a
            key={i}
            href={parte}
            target="_blank"
            rel="noopener noreferrer"
            className={cn('underline underline-offset-2 hover:opacity-80', classeLink)}
          >
            {parte}
          </a>
        ) : (
          parte
        ),
      )}
    </span>
  )
}
