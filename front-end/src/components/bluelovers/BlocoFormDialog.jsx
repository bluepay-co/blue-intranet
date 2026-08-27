import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import CampoImagem from '@/components/bluelovers/CampoImagem'
import { IMAGEM_VAZIA, imagemDoBanco } from '@/components/bluelovers/imagem-utils'
import { criarBloco, editarBloco, urlFoto } from '@/api/modules/bluelovers'

/**
 * Formulário de uma seção do perfil ("Eu amo, eu adoro", "Meus sonhos"…).
 * A foto é opcional: sem ela, a seção ocupa a largura toda na página do perfil.
 *
 * @param {{ aberto: boolean, onFechar: () => void, blueloverId: number,
 *           blocoEditando: object|null, onSalvo: () => void }} props
 */
export default function BlocoFormDialog({
  aberto,
  onFechar,
  blueloverId,
  blocoEditando,
  onSalvo,
}) {
  const [titulo, setTitulo] = useState(blocoEditando?.titulo ?? '')
  const [texto, setTexto]   = useState(blocoEditando?.texto ?? '')
  const [foto, setFoto]     = useState(
    blocoEditando ? imagemDoBanco(blocoEditando.foto_url, urlFoto) : IMAGEM_VAZIA,
  )

  const [salvando, setSalvando] = useState(false)
  const [erro, setErro]         = useState('')

  async function handleSubmit(e) {
    e.preventDefault()

    if (!titulo.trim() || !texto.trim()) {
      setErro('Título e texto são obrigatórios.')
      return
    }

    setSalvando(true)
    setErro('')

    try {
      if (blocoEditando) {
        await editarBloco(blocoEditando.id, {
          titulo,
          texto,
          foto: foto.file || undefined,
          foto_url: foto.file ? undefined : foto.urlRaw,
        })
      } else {
        await criarBloco(blueloverId, { titulo, texto, foto: foto.file || undefined })
      }

      onSalvo?.()
      onFechar()
    } catch (err) {
      setErro(err?.response?.data?.message ?? 'Erro ao salvar a seção.')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Dialog open={aberto} onOpenChange={onFechar}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{blocoEditando ? 'Editar seção' : 'Nova seção'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-baseline justify-between">
              <label htmlFor="bloco-titulo" className="text-sm font-medium">Título</label>
              <span className="text-xs text-muted-foreground">{titulo.length}/150</span>
            </div>
            <Input
              id="bloco-titulo"
              placeholder="Ex.: Eu amo, eu adoro"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              maxLength={150}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="bloco-texto" className="text-sm font-medium">Texto</label>
            <textarea
              id="bloco-texto"
              placeholder="Escreva o texto desta seção…"
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              rows={8}
              maxLength={4000}
              className="flex w-full resize-y rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>

          <CampoImagem
            rotulo="Foto da seção"
            dica="Opcional — exibida ao lado do texto"
            aspecto="aspect-[4/3]"
            valor={foto}
            onChange={setFoto}
            onErro={setErro}
          />

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
