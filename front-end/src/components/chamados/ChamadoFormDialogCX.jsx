import { useRef, useState } from 'react'
import { Paperclip, Link, X } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  CATEGORIAS_CX,
  CRITICIDADES,
  criarChamado,
  editarChamado,
} from '@/api/modules/chamados'

const classeCampo =
  'flex h-9 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50'

export default function ChamadoFormDialogCX({ aberto, onFechar, chamadoEditando, onSalvo }) {
  const ehEdicao = Boolean(chamadoEditando)
  const [titulo, setTitulo] = useState(chamadoEditando?.titulo ?? '')
  const [descricao, setDescricao] = useState(chamadoEditando?.descricao ?? '')
  const [categoria, setCategoria] = useState(chamadoEditando?.categoria ?? CATEGORIAS_CX[0].value)
  const [criticidade, setCriticidade] = useState(chamadoEditando?.criticidade ?? '')
  const [identificadorUrl, setIdentificadorUrl] = useState(chamadoEditando?.identificador_url ?? '')
  const [anexo, setAnexo] = useState(null)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const inputRef = useRef(null)

  function selecionarAnexo(e) {
    const file = e.target.files?.[0]
    if (file) setAnexo(file)
  }

  function removerAnexo() {
    setAnexo(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!titulo.trim() || !descricao.trim()) {
      setErro('Título e descrição são obrigatórios.')
      return
    }
    if (!ehEdicao && !criticidade) {
      setErro('Selecione o nível de criticidade.')
      return
    }
    setSalvando(true)
    setErro('')
    try {
      if (ehEdicao) {
        await editarChamado(chamadoEditando.id, { titulo, descricao })
      } else {
        await criarChamado({
          titulo,
          descricao,
          categoria,
          criticidade,
          anexo: anexo || undefined,
          identificadorUrl: identificadorUrl.trim() || undefined,
        })
      }
      onSalvo?.()
      onFechar()
    } catch (err) {
      setErro(err?.response?.data?.message ?? 'Erro ao salvar o chamado.')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Dialog open={aberto} onOpenChange={onFechar}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{ehEdicao ? 'Editar chamado' : 'Abrir chamado para Produtos'}</DialogTitle>
          <DialogDescription>
            {ehEdicao
              ? 'Você pode ajustar o título e a descrição enquanto o chamado ainda está em aberto.'
              : 'Descreva o problema do cliente com o máximo de detalhes para agilizar a resolução.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Título</label>
            <Input
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ex.: Cliente João — erro ao finalizar pedido #4521"
              maxLength={200}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">Categoria</label>
              <select
                value={categoria}
                onChange={(e) => setCategoria(e.target.value)}
                disabled={ehEdicao}
                className={classeCampo}
              >
                {CATEGORIAS_CX.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">Criticidade (SLA)</label>
              <select
                value={criticidade}
                onChange={(e) => setCriticidade(e.target.value)}
                disabled={ehEdicao}
                className={classeCampo}
              >
                <option value="" disabled>
                  Selecione…
                </option>
                {CRITICIDADES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label} — {c.prazo}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Descrição</label>
            <textarea
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              rows={6}
              placeholder="Descreva o problema relatado pelo cliente, contexto relevante e o que já foi tentado."
              className="w-full resize-none rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            />
          </div>

          {/* Identificador / Link externo */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">
              Identificador / Link{' '}
              <span className="font-normal text-muted-foreground">(opcional)</span>
            </label>
            <div className="relative">
              <Link className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={identificadorUrl}
                onChange={(e) => setIdentificadorUrl(e.target.value)}
                placeholder="https://… (pedido, CRM, ticket externo…)"
                className="pl-8"
                type="url"
              />
            </div>
          </div>

          {!ehEdicao && (
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">Anexo de evidência (opcional)</label>
              {anexo ? (
                <div className="flex items-center gap-2 rounded-lg border border-input px-3 py-2 text-sm">
                  <Paperclip className="size-4 shrink-0 text-muted-foreground" />
                  <span className="min-w-0 flex-1 truncate">{anexo.name}</span>
                  <button
                    type="button"
                    onClick={removerAnexo}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <X className="size-4" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  className="flex items-center justify-center gap-2 rounded-lg border border-dashed border-input py-4 text-sm text-muted-foreground transition-colors hover:border-foreground/40 hover:text-foreground"
                >
                  <Paperclip className="size-4" />
                  Adicionar imagem ou PDF (máx. 10 MB)
                </button>
              )}
              <input
                ref={inputRef}
                type="file"
                accept="image/*,application/pdf"
                onChange={selecionarAnexo}
                className="hidden"
              />
            </div>
          )}

          {erro && <p className="text-sm text-destructive">{erro}</p>}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onFechar} disabled={salvando}>
              Cancelar
            </Button>
            <Button type="submit" disabled={salvando}>
              {salvando ? 'Salvando…' : ehEdicao ? 'Salvar alterações' : 'Abrir chamado'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
