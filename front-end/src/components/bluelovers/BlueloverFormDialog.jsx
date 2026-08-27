import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import CampoImagem from '@/components/bluelovers/CampoImagem'
import { IMAGEM_VAZIA, imagemDoBanco } from '@/components/bluelovers/imagem-utils'
import { criarPerfil, editarPerfil, urlFoto } from '@/api/modules/bluelovers'

/**
 * Formulário de dados do perfil (identidade + as duas imagens fixas).
 * As seções do "mini jornal" são gerenciadas à parte, no editor.
 *
 * O pai passa `key` para forçar remount, por isso o estado inicial pode ser
 * derivado direto das props.
 *
 * @param {{ aberto: boolean, onFechar: () => void, perfilEditando: object|null,
 *           onSalvo: (id: number) => void }} props
 */
export default function BlueloverFormDialog({ aberto, onFechar, perfilEditando, onSalvo }) {
  const [nome, setNome]   = useState(perfilEditando?.nome ?? '')
  const [cargo, setCargo] = useState(perfilEditando?.cargo ?? '')
  const [setor, setSetor] = useState(perfilEditando?.setor ?? '')
  const [frase, setFrase] = useState(perfilEditando?.frase ?? '')
  const [ordem, setOrdem] = useState(String(perfilEditando?.ordem ?? 0))

  const [capa, setCapa] = useState(
    perfilEditando ? imagemDoBanco(perfilEditando.foto_capa_url, urlFoto) : IMAGEM_VAZIA,
  )
  const [destaque, setDestaque] = useState(
    perfilEditando ? imagemDoBanco(perfilEditando.foto_destaque_url, urlFoto) : IMAGEM_VAZIA,
  )

  const [salvando, setSalvando] = useState(false)
  const [erro, setErro]         = useState('')

  async function handleSubmit(e) {
    e.preventDefault()

    if (!nome.trim()) {
      setErro('O nome é obrigatório.')
      return
    }
    if (!capa.file && !capa.urlRaw) {
      setErro('A foto de capa (1080x1350) é obrigatória.')
      return
    }

    setSalvando(true)
    setErro('')

    const payload = {
      nome,
      cargo,
      setor,
      frase,
      ordem: Number(ordem) || 0,
      foto_capa: capa.file || undefined,
      foto_capa_url: capa.file ? undefined : capa.urlRaw,
      foto_destaque: destaque.file || undefined,
      foto_destaque_url: destaque.file ? undefined : destaque.urlRaw,
    }

    try {
      const salvo = perfilEditando
        ? await editarPerfil(perfilEditando.id, payload)
        : await criarPerfil(payload)

      onSalvo?.(salvo.id)
      onFechar()
    } catch (err) {
      setErro(err?.response?.data?.message ?? 'Erro ao salvar o perfil.')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Dialog open={aberto} onOpenChange={onFechar}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{perfilEditando ? 'Editar Bluelover' : 'Novo Bluelover'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="bl-nome" className="text-sm font-medium">Nome</label>
              <Input
                id="bl-nome"
                placeholder="Nome da pessoa"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                maxLength={150}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="bl-cargo" className="text-sm font-medium">Cargo</label>
              <Input
                id="bl-cargo"
                placeholder="Ex.: Analista de Marketing"
                value={cargo}
                onChange={(e) => setCargo(e.target.value)}
                maxLength={120}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="bl-setor" className="text-sm font-medium">Setor</label>
              <Input
                id="bl-setor"
                placeholder="Ex.: Marketing"
                value={setor}
                onChange={(e) => setSetor(e.target.value)}
                maxLength={120}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="bl-ordem" className="text-sm font-medium">Ordem na vitrine</label>
              <Input
                id="bl-ordem"
                type="number"
                min={0}
                value={ordem}
                onChange={(e) => setOrdem(e.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-baseline justify-between">
              <label htmlFor="bl-frase" className="text-sm font-medium">Frase de efeito</label>
              <span className="text-xs text-muted-foreground">{frase.length}/300</span>
            </div>
            <textarea
              id="bl-frase"
              placeholder="Ex.: Eu amo, eu adoro café e planilhas…"
              value={frase}
              onChange={(e) => setFrase(e.target.value)}
              rows={2}
              maxLength={300}
              className="flex w-full resize-y rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <CampoImagem
              rotulo="Capa do card"
              dica="4:5 — 1080 x 1350"
              aspecto="aspect-[4/5]"
              valor={capa}
              onChange={setCapa}
              onErro={setErro}
            />
            <CampoImagem
              rotulo="Imagem de destaque"
              dica="Topo do perfil (opcional)"
              aspecto="aspect-[4/3]"
              valor={destaque}
              onChange={setDestaque}
              onErro={setErro}
            />
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
