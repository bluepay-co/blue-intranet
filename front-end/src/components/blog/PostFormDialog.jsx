import { useState, useRef } from 'react'
import { ImagePlus, X } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { urlImagem, criarPost, editarPost } from '@/api/modules/blog'

/**
 * Dialog de criação e edição de post do blog de Marketing.
 * Somente renderizado no painel admin (role MARKETING).
 *
 * @param {{
 *   aberto: boolean,
 *   onFechar: () => void,
 *   postEditando: object|null,
 *   onSalvo: () => void
 * }} props
 *   `postEditando` null → modo criação; objeto → modo edição.
 */
export default function PostFormDialog({ aberto, onFechar, postEditando, onSalvo }) {
  const [titulo, setTitulo]       = useState(postEditando?.titulo ?? '')
  const [conteudo, setConteudo]   = useState(postEditando?.conteudo ?? '')
  const [publicado, setPublicado] = useState(postEditando?.publicado ?? false)
  const [imagemFile, setImagemFile] = useState(null)
  // previewUrl é sempre a URL de exibição; imagemUrlRaw é o path do banco (edição sem troca)
  const [previewUrl, setPreviewUrl]   = useState(urlImagem(postEditando?.imagem_url) ?? null)
  const [imagemUrlRaw, setImagemUrlRaw] = useState(postEditando?.imagem_url ?? null)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro]         = useState('')
  const inputRef = useRef(null)

  function selecionarImagem(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setImagemFile(file)
    setPreviewUrl(URL.createObjectURL(file))
    setImagemUrlRaw(null)
  }

  function removerImagem() {
    setImagemFile(null)
    setPreviewUrl(null)
    setImagemUrlRaw(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!titulo.trim() || !conteudo.trim()) {
      setErro('Título e conteúdo são obrigatórios.')
      return
    }
    setSalvando(true)
    setErro('')
    try {
      if (postEditando) {
        await editarPost(postEditando.id, {
          titulo,
          conteudo,
          publicado,
          imagem: imagemFile || undefined,
          // Se não há novo arquivo, repassa o path bruto original (ou null se foi removido)
          imagem_url: imagemFile ? undefined : imagemUrlRaw,
        })
      } else {
        await criarPost({ titulo, conteudo, publicado, imagem: imagemFile || undefined })
      }
      onSalvo?.()
      onFechar()
    } catch (err) {
      setErro(err?.response?.data?.message ?? 'Erro ao salvar o post.')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Dialog open={aberto} onOpenChange={onFechar}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{postEditando ? 'Editar post' : 'Novo post'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            placeholder="Título"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            maxLength={200}
          />

          <textarea
            placeholder="Conteúdo do post…"
            value={conteudo}
            onChange={(e) => setConteudo(e.target.value)}
            rows={7}
            className="flex w-full resize-none rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          />

          {/* Upload de imagem */}
          {previewUrl ? (
            <div className="relative w-full overflow-hidden rounded-lg">
              <img src={previewUrl} alt="preview" className="h-44 w-full object-cover" />
              <button
                type="button"
                onClick={removerImagem}
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
              Adicionar imagem (opcional, máx. 5 MB)
            </button>
          )}
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            onChange={selecionarImagem}
            className="hidden"
          />

          <label className="flex cursor-pointer select-none items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={publicado}
              onChange={(e) => setPublicado(e.target.checked)}
              className="rounded"
            />
            Publicar imediatamente
          </label>

          {erro && <p className="text-sm text-destructive">{erro}</p>}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onFechar} disabled={salvando}>
              Cancelar
            </Button>
            <Button type="submit" disabled={salvando}>
              {salvando ? 'Salvando…' : 'Salvar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
