import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import CampoImagem from '@/components/bluelovers/CampoImagem'
import { IMAGEM_VAZIA, IMAGENS_PERFIL, imagemDoBanco } from '@/components/bluelovers/imagem-utils'
import { criarBloco, editarBloco, urlFoto } from '@/api/modules/bluelovers'

/**
 * Formulário de um card de conquista (seção 02) ou momento da timeline (seção 06).
 *
 * @param {{ aberto: boolean, onFechar: () => void, blueloverId: number,
 *           blocoEditando: object|null, tipo?: string, chave?: string|null,
 *           tituloPadrao?: string, onSalvo: () => void }} props
 */
export default function BlocoFormDialog({
  aberto,
  onFechar,
  blueloverId,
  blocoEditando,
  tipo = 'livre',
  chave = null,
  tituloPadrao = '',
  onSalvo,
}) {
  const tipoAtual = blocoEditando?.tipo ?? tipo
  const ehMomento = tipoAtual === 'momento'

  const [titulo, setTitulo] = useState(blocoEditando?.titulo ?? tituloPadrao)
  const [rotuloData, setRotuloData] = useState(blocoEditando?.rotulo_data ?? '')

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
      const comum = {
        titulo,
        texto,
        tipo: tipoAtual,
        chave: blocoEditando?.chave ?? chave,
        rotulo_data: ehMomento ? rotuloData : null,
      }

      if (blocoEditando) {
        await editarBloco(blocoEditando.id, {
          ...comum,
          foto: foto.file || undefined,
          foto_url: foto.file ? undefined : foto.urlRaw,
        })
      } else {
        await criarBloco(blueloverId, { ...comum, foto: foto.file || undefined })
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
          <DialogTitle>
            {blocoEditando ? 'Editar' : 'Novo'}
            {ehMomento ? ' momento' : ' card'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-baseline justify-between">
              <label htmlFor="bloco-titulo" className="text-sm font-medium">Título</label>
              <span className="text-xs text-muted-foreground">{titulo.length}/150</span>
            </div>
            <Input
              id="bloco-titulo"
              placeholder={ehMomento ? 'Ex.: Entrada na Bluepay' : 'Ex.: Meu maior sonho'}
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              maxLength={150}
            />
          </div>

          {ehMomento && (
            <div className="flex flex-col gap-1.5">
              <label htmlFor="bloco-data" className="text-sm font-medium">Data do momento</label>
              <Input
                id="bloco-data"
                placeholder="Ex.: 2024 ou Jan/2025"
                value={rotuloData}
                onChange={(e) => setRotuloData(e.target.value)}
                maxLength={30}
              />
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label htmlFor="bloco-texto" className="text-sm font-medium">Texto</label>
            <textarea
                id="bloco-texto"
                placeholder="Descrição bem curta — o perfil prioriza texto enxuto."
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                rows={4}
                maxLength={4000}
              className="flex w-full resize-y rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>

          <CampoImagem
            rotulo={ehMomento ? 'Foto do momento' : 'Foto do card'}
            dica={IMAGENS_PERFIL[ehMomento ? 'momento' : 'conquista'].dica}
            aspecto={IMAGENS_PERFIL[ehMomento ? 'momento' : 'conquista'].aspecto}
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
