import { useRef, useState } from 'react'
import { ImagePlus, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  IMAGEM_VAZIA,
  MAX_IMAGEM_BYTES,
  MAX_IMAGEM_MB,
  TIPOS_IMAGEM_OK,
} from '@/components/bluelovers/imagem-utils'

/**
 * Campo de imagem controlado pelo pai. Aceita três formas de envio: escolher o
 * arquivo, arrastar e soltar, ou colar (Ctrl+V) uma imagem copiada de outro
 * site — útil para o Marketing não precisar baixar antes.
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
  const [arrastando, setArrastando] = useState(false)

  function aceitar(file) {
    if (!file) return

    if (!TIPOS_IMAGEM_OK.includes(file.type)) {
      onErro?.('Formato não aceito. Use JPEG, PNG, GIF ou WebP.')
      return
    }
    if (file.size > MAX_IMAGEM_BYTES) {
      onErro?.(`A imagem excede o limite de ${MAX_IMAGEM_MB} MB.`)
      return
    }

    onErro?.('')
    onChange({ file, previewUrl: URL.createObjectURL(file), urlRaw: null })
  }

  function selecionar(e) {
    aceitar(e.target.files?.[0])
    if (inputRef.current) inputRef.current.value = ''
  }

  /** Ctrl+V: o navegador entrega a imagem copiada como arquivo no clipboard. */
  function colar(e) {
    const item = [...(e.clipboardData?.items ?? [])].find((i) => i.type.startsWith('image/'))
    if (!item) return
    e.preventDefault()
    aceitar(item.getAsFile())
  }

  function soltar(e) {
    e.preventDefault()
    setArrastando(false)
    aceitar(e.dataTransfer?.files?.[0])
  }

  // Altura fixa + proporção no preview: imagem grande não estica o formulário.
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
        <div className={cn('relative h-44 w-fit max-w-full overflow-hidden rounded-lg', aspecto)}>
          <img src={valor.previewUrl} alt={rotulo} className="h-full w-full object-cover" />
          <button
            type="button"
            onClick={remover}
            className="absolute top-2 right-2 rounded-full bg-black/60 p-1 text-white transition-colors hover:bg-black"
          >
            <X className="size-4" />
          </button>
        </div>
      ) : (
        <div
          tabIndex={0}
          aria-label={`${rotulo}: cole com Ctrl+V, arraste a imagem ou escolha um arquivo`}
          onPaste={colar}
          onDragOver={(e) => {
            e.preventDefault()
            setArrastando(true)
          }}
          onDragLeave={() => setArrastando(false)}
          onDrop={soltar}
          className={cn(
            'flex w-full flex-col items-center justify-center gap-1 rounded-lg border border-dashed py-6 text-sm text-muted-foreground transition-colors',
            'hover:border-foreground/40 hover:text-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none',
            arrastando ? 'border-brand-accent bg-brand-accent/10 text-foreground' : 'border-input',
          )}
        >
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex items-center gap-2 rounded-md px-3 py-1.5 font-medium transition-colors hover:bg-muted hover:text-foreground"
          >
            <ImagePlus className="size-5" />
            Escolher imagem
          </button>
          <span className="text-xs">
            ou clique aqui e cole com Ctrl+V · arraste e solte também funciona
          </span>
          <span className="text-xs">máx. {MAX_IMAGEM_MB} MB</span>
        </div>
      )}

      <input ref={inputRef} type="file" accept="image/*" onChange={selecionar} className="hidden" />
    </div>
  )
}
