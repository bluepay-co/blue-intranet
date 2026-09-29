import { useRef, useState } from 'react'
import { Bold, Eye, Info, Italic, Link2, Loader2, Send } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/auth/auth-context'
import { urlImagem, criarPost, editarPost } from '@/api/modules/blog'
import CampoImagem from '@/components/bluelovers/CampoImagem'
import { imagemDoBanco } from '@/components/bluelovers/imagem-utils'
import { AvatarPessoa } from './ComentariosPost'
import TextoFormatado from './TextoFormatado'

const MAX_TITULO = 200

const CLASSE_TEXTAREA =
  'min-h-56 w-full flex-1 resize-y rounded-lg border border-input bg-transparent px-3 py-2 text-sm leading-relaxed outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30'

/** Botões da barra de formatação (marcações entendidas pelo TextoFormatado). */
const FORMATOS = [
  { chave: 'negrito', Icone: Bold, titulo: 'Negrito (Ctrl+B)', antes: '**', depois: '**', exemplo: 'texto em negrito' },
  { chave: 'italico', Icone: Italic, titulo: 'Itálico (Ctrl+I)', antes: '*', depois: '*', exemplo: 'texto em itálico' },
  { chave: 'link', Icone: Link2, titulo: 'Inserir link', antes: '[', depois: '](https://)', exemplo: 'texto do link' },
]

/** Pré-visualização fiel ao card do feed (PostCard), atualizada enquanto se digita. */
function Previa({ titulo, conteudo, imagem, autor }) {
  return (
    <div className="overflow-hidden rounded-xl border bg-card shadow-xs">
      {imagem && <img src={imagem} alt="" className="aspect-[16/9] w-full object-cover" />}
      <div className="flex flex-col gap-3 p-4">
        <div className="flex items-center gap-2">
          <AvatarPessoa nome={autor} className="size-7" />
          <div className="min-w-0 text-xs">
            <p className="truncate font-semibold">{autor}</p>
            <p className="text-muted-foreground">agora</p>
          </div>
        </div>
        <p className={titulo ? 'leading-snug font-semibold [overflow-wrap:anywhere]' : 'font-semibold text-muted-foreground/60'}>
          {titulo || 'Título do post'}
        </p>
        <p
          className={
            conteudo
              ? 'text-sm whitespace-pre-wrap text-muted-foreground [overflow-wrap:anywhere]'
              : 'text-sm text-muted-foreground/60'
          }
        >
          {conteudo ? <TextoFormatado texto={conteudo} /> : 'O conteúdo aparece aqui enquanto você escreve…'}
        </p>
        <div className="flex gap-3 border-t pt-2 text-base opacity-50" aria-hidden="true">
          👍 ❤️ 👏 🚀
        </div>
      </div>
    </div>
  )
}

/**
 * Editor de post do blog de Marketing com pré-visualização ao vivo.
 * Somente renderizado no painel admin (role MARKETING).
 *
 * @param {{ aberto: boolean, onFechar: () => void, postEditando: object|null, onSalvo: () => void }} props
 *   `postEditando` null → criação; objeto → edição.
 */
export default function PostFormDialog({ aberto, onFechar, postEditando, onSalvo }) {
  const { usuario } = useAuth()
  const [titulo, setTitulo] = useState(postEditando?.titulo ?? '')
  const [conteudo, setConteudo] = useState(postEditando?.conteudo ?? '')
  const [imagem, setImagem] = useState(() => imagemDoBanco(postEditando?.imagem_url ?? null, urlImagem))
  const [salvando, setSalvando] = useState(null) // 'rascunho' | 'publicar' | null
  const [erro, setErro] = useState('')
  // Post já publicado não pode voltar a rascunho: só "Salvar alterações".
  const jaPublicado = Boolean(postEditando?.publicado)
  const campoConteudo = useRef(null)
  const autor = postEditando?.autor_nome ?? usuario?.nome ?? usuario?.email ?? 'Você'

  /**
   * Envolve a seleção com a marcação do formato (sem seleção, insere um texto de
   * exemplo já selecionado). No link, deixa selecionado o "https://" para colar a URL.
   */
  function aplicarFormato({ antes, depois, exemplo, chave }) {
    const el = campoConteudo.current
    if (!el) return
    const { selectionStart: ini, selectionEnd: fim } = el
    const selecionado = conteudo.slice(ini, fim) || exemplo
    const novo = conteudo.slice(0, ini) + antes + selecionado + depois + conteudo.slice(fim)
    if (novo.length > 3000) {
      setErro('A formatação passaria do limite de 3000 caracteres.')
      return
    }
    setConteudo(novo)
    // Reposiciona a seleção depois que o React aplicar o novo valor.
    requestAnimationFrame(() => {
      el.focus()
      if (chave === 'link') {
        const url = ini + antes.length + selecionado.length + 2
        el.setSelectionRange(url, url + 'https://'.length)
      } else {
        el.setSelectionRange(ini + antes.length, ini + antes.length + selecionado.length)
      }
    })
  }

  function atalhos(e) {
    if (!(e.ctrlKey || e.metaKey)) return
    const formato = { b: FORMATOS[0], i: FORMATOS[1] }[e.key.toLowerCase()]
    if (!formato) return
    e.preventDefault()
    aplicarFormato(formato)
  }

  async function salvar(publicar) {
    if (!titulo.trim() || !conteudo.trim()) {
      setErro('Título e conteúdo são obrigatórios.')
      return
    }
    setSalvando(publicar ? 'publicar' : 'rascunho')
    setErro('')
    try {
      const payload = { titulo, conteudo, publicado: publicar, imagem: imagem.file || undefined }
      if (postEditando) {
        // Sem arquivo novo, repassa o path original (ou null se a imagem foi removida).
        await editarPost(postEditando.id, { ...payload, imagem_url: imagem.file ? undefined : imagem.urlRaw })
      } else {
        await criarPost(payload)
      }
      onSalvo?.()
      onFechar()
    } catch (err) {
      setErro(err?.response?.data?.message ?? 'Erro ao salvar o post.')
    } finally {
      setSalvando(null)
    }
  }

  return (
    <Dialog open={aberto} onOpenChange={onFechar}>
      <DialogContent className="max-h-[92vh] max-w-5xl">
        <DialogHeader>
          <DialogTitle>{postEditando ? 'Editar post' : 'Novo post'}</DialogTitle>
          <DialogDescription>
            {jaPublicado
              ? 'Este post já está no feed. As alterações aparecem para todos ao salvar.'
              : 'Escreva, confira a prévia ao lado e publique quando estiver pronto.'}
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            salvar(jaPublicado)
          }}
          className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]"
        >
          {/* Editor */}
          <div className="flex min-w-0 flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <div className="flex items-baseline justify-between">
                <label htmlFor="post-titulo" className="text-sm font-medium">Título</label>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {titulo.length}/{MAX_TITULO}
                </span>
              </div>
              <Input
                id="post-titulo"
                placeholder="Um título curto e chamativo"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                maxLength={MAX_TITULO}
                className="h-10 text-base font-medium"
                autoFocus
              />
            </div>

            <div className="flex flex-1 flex-col gap-1.5">
              <div className="flex items-end justify-between gap-2">
                <label htmlFor="post-conteudo" className="text-sm font-medium">Conteúdo</label>
                <span
                  className={`text-xs tabular-nums ${conteudo.length >= 2850 ? 'font-medium text-destructive' : 'text-muted-foreground'}`}
                >
                  {conteudo.length}/3000
                </span>
              </div>
              <div className="flex items-center gap-0.5 rounded-t-lg border border-b-0 bg-muted/40 px-1 py-1">
                {FORMATOS.map((f) => (
                  <Button
                    key={f.chave}
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    title={f.titulo}
                    aria-label={f.titulo}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => aplicarFormato(f)}
                  >
                    <f.Icone />
                  </Button>
                ))}
                <span className="ml-auto pr-1 text-[11px] text-muted-foreground max-sm:hidden">
                  Selecione o texto e escolha o formato
                </span>
              </div>
              <textarea
                id="post-conteudo"
                ref={campoConteudo}
                placeholder={'Escreva o conteúdo do post…\n\nDica: parágrafos curtos e links diretos facilitam a leitura.'}
                value={conteudo}
                onChange={(e) => setConteudo(e.target.value)}
                onKeyDown={atalhos}
                maxLength={3000}
                className={`${CLASSE_TEXTAREA} rounded-t-none`}
              />
            </div>

            <CampoImagem
              rotulo="Imagem de capa (opcional)"
              dica="16:9 — 1600 × 900 px"
              aspecto="aspect-[16/9]"
              valor={imagem}
              onChange={setImagem}
              onErro={setErro}
            />
          </div>

          {/* Pré-visualização */}
          <aside className="flex min-w-0 flex-col gap-2 lg:sticky lg:top-0 lg:self-start">
            <p className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              <Eye className="size-3.5" /> Como vai aparecer no feed
            </p>
            <Previa titulo={titulo.trim()} conteudo={conteudo.trim()} imagem={imagem.previewUrl} autor={autor} />
          </aside>

          {/* Ações */}
          <div className="flex flex-col-reverse gap-3 border-t pt-4 sm:flex-row sm:items-center lg:col-span-2">
            {erro ? (
              <p className="text-sm text-destructive sm:mr-auto">{erro}</p>
            ) : (
              !jaPublicado && (
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground sm:mr-auto">
                  <Info className="size-3.5 shrink-0" />
                  Publicar é definitivo: o post vai para o feed e não volta a ser rascunho.
                </p>
              )
            )}
            <div className="flex flex-wrap justify-end gap-2 max-sm:mt-2">
              <Button type="button" variant="ghost" onClick={onFechar} disabled={salvando !== null}>
                Cancelar
              </Button>
              {jaPublicado ? (
                <Button type="submit" disabled={salvando !== null}>
                  {salvando && <Loader2 className="animate-spin" />}
                  Salvar alterações
                </Button>
              ) : (
                <>
                  <Button type="button" variant="outline" onClick={() => salvar(false)} disabled={salvando !== null}>
                    {salvando === 'rascunho' && <Loader2 className="animate-spin" />}
                    Salvar rascunho
                  </Button>
                  <Button type="button" onClick={() => salvar(true)} disabled={salvando !== null}>
                    {salvando === 'publicar' ? <Loader2 className="animate-spin" /> : <Send />}
                    Publicar
                  </Button>
                </>
              )}
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
