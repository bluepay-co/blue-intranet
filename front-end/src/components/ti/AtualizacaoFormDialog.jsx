import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { CATEGORIAS_ATUALIZACAO, CATEGORIA_PADRAO } from '@/lib/categoriasAtualizacao'
import { criarAtualizacao, editarAtualizacao } from '@/api/modules/atualizacoes'

/** Converte um ISO (UTC) para o valor de um <input type="datetime-local"> no fuso local. */
function isoParaLocalInput(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
  return local.toISOString().slice(0, 16)
}

/**
 * Dialog de criação/edição de um aviso de atualização (T.I.).
 *
 * @param {{
 *   aberto: boolean,
 *   onFechar: () => void,
 *   editando: object|null,
 *   onSalvo: () => void
 * }} props
 *   `editando` null → modo criação; objeto → modo edição.
 */
export default function AtualizacaoFormDialog({ aberto, onFechar, editando, onSalvo }) {
  const [titulo, setTitulo]       = useState(editando?.titulo ?? '')
  const [subtitulo, setSubtitulo] = useState(editando?.subtitulo ?? '')
  const [categoria, setCategoria] = useState(editando?.categoria ?? CATEGORIA_PADRAO)
  const [publicarEm, setPublicarEm] = useState(isoParaLocalInput(editando?.publicar_em))
  const [salvando, setSalvando]   = useState(false)
  const [erro, setErro]           = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    if (!titulo.trim()) {
      setErro('O título é obrigatório.')
      return
    }
    if (!subtitulo.trim()) {
      setErro('A descrição é obrigatória.')
      return
    }
    setSalvando(true)
    setErro('')
    try {
      const payload = {
        titulo: titulo.trim(),
        subtitulo: subtitulo.trim(),
        categoria,
        // datetime-local é hora local → converte para ISO (UTC); vazio = dispara na hora.
        publicar_em: publicarEm ? new Date(publicarEm).toISOString() : null,
      }
      if (editando) {
        await editarAtualizacao(editando.id, payload)
      } else {
        await criarAtualizacao(payload)
      }
      onSalvo?.()
      onFechar()
    } catch (err) {
      setErro(err?.response?.data?.message ?? 'Erro ao salvar a atualização.')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Dialog open={aberto} onOpenChange={onFechar}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{editando ? 'Editar atualização' : 'Nova atualização'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Categoria</label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {CATEGORIAS_ATUALIZACAO.map(({ valor, label, icon: Icon, corIcone }) => {
                const ativa = categoria === valor
                return (
                  <button
                    key={valor}
                    type="button"
                    onClick={() => setCategoria(valor)}
                    className={cn(
                      'flex flex-col items-center gap-1.5 rounded-lg border p-2.5 text-xs font-medium transition-colors',
                      ativa ? 'border-primary bg-primary/5 text-foreground' : 'border-border text-muted-foreground hover:bg-muted/50',
                    )}
                  >
                    <span className={cn('grid size-8 place-items-center rounded-full', corIcone)}>
                      <Icon className="size-4" />
                    </span>
                    {label}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-baseline justify-between">
              <label htmlFor="atualizacao-titulo" className="text-sm font-medium">Título</label>
              <span className="text-xs text-muted-foreground">{titulo.length}/120</span>
            </div>
            <Input
              id="atualizacao-titulo"
              placeholder="Ex.: Nova aba de Forecast disponível"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              maxLength={120}
              autoFocus
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-baseline justify-between">
              <label htmlFor="atualizacao-subtitulo" className="text-sm font-medium">Descrição</label>
              <span className="text-xs text-muted-foreground">{subtitulo.length}/2000</span>
            </div>
            <textarea
              id="atualizacao-subtitulo"
              placeholder={'Descreva o que mudou. Ex.:\n* Adicionamos a página de Forecast para Inside Sales e KAM\n* Adicionamos a visão do Gerente para o CX'}
              value={subtitulo}
              onChange={(e) => setSubtitulo(e.target.value)}
              maxLength={2000}
              rows={6}
              className="flex w-full resize-y rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            />
            <p className="text-xs text-muted-foreground">
              Use uma linha por item (comece com <code>*</code> ou <code>-</code> para virar tópicos). Enter quebra a linha; o aviso só é criado ao clicar em Salvar.
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="atualizacao-publicar" className="text-sm font-medium">
              Agendar para <span className="font-normal text-muted-foreground">(opcional)</span>
            </label>
            <div className="flex items-center gap-2">
              <Input
                id="atualizacao-publicar"
                type="datetime-local"
                value={publicarEm}
                onChange={(e) => setPublicarEm(e.target.value)}
                className="w-auto"
              />
              {publicarEm && (
                <Button type="button" variant="ghost" size="sm" onClick={() => setPublicarEm('')}>
                  Limpar
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Deixe em branco para disparar imediatamente. Se agendar, o card só aparece para os usuários a partir da data/hora escolhida.
            </p>
          </div>

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
