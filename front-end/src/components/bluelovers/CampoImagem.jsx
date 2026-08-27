import { useRef } from 'react'
import { ImagePlus, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { IMAGEM_VAZIA, MAX_IMAGEM_BYTES, MAX_IMAGEM_MB } from '@/components/bluelovers/imagem-utils'

/**
 * Campo de upload de imagem controlado pelo pai.
 *
 * `valor` carrega os dois lados da convenção do projeto: `previewUrl` é o que
 * se exibe (blob local ou URL do servidor) e `urlRaw` é o path que volta pro
 * backend quando o usuário NÃO troca o arquivo.
 *
 * @param {{ rotulo: string, dica?: string, aspecto?: string, valor: object,
 *           onChange: (valor: object) => void, onErro?: (msg: string) => void }} props
 */
export default function CampoImagem({
  rotulo,
  dica,
  aspecto = 'aspect-[4/5]',
  valor,
  onChange,
  onErro,
}) {
  const inputRef = useRef(null)

  function selecionar(e) {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > MAX_IMAGEM_BYTES) {
      onErro?.(`A imagem excede o limite de ${MAX_IMAGEM_MB} MB.`)
      if (inputRef.current) inputRef.current.value = ''
      return
    }

    onErro?.('')
    onChange({ file, previewUrl: URL.createObjectURL(file), urlRaw: null })
  }

  function remover() {
    onChange(IMAGEM_VAZIA)
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between">
        <span className="text-sm font-medium">{rotulo}</span>
        {dica && <span className="text-xs text-muted-foreground">{dica}</span>}
      </div>

      {valor.previewUrl ? (
        <div className="relative w-full overflow-hidden rounded-lg">
          <img
            src={valor.previewUrl}
            alt={rotulo}
            className={cn('w-full object-cover', aspecto)}
          />
          <button
            type="button"
            onClick={remover}
            className="absolute top-2 right-2 rounded-full bg-black/60 p-1 text-white transition-colors hover:bg-black"
          >
            <X className="size-4" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-input py-8 text-sm text-muted-foreground transition-colors hover:border-foreground/40 hover:text-foreground"
        >
          <ImagePlus className="size-5" />
          Escolher imagem (máx. {MAX_IMAGEM_MB} MB)
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={selecionar}
        className="hidden"
      />
    </div>
  )
}
