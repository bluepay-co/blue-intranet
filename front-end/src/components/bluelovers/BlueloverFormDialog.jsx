import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import CampoImagem from '@/components/bluelovers/CampoImagem'
import { IMAGEM_VAZIA, IMAGENS_PERFIL, imagemDoBanco } from '@/components/bluelovers/imagem-utils'
import { criarPerfil, editarPerfil, payloadDoPerfil, urlFoto } from '@/api/modules/bluelovers'

const CLASSE_TEXTAREA =
  'flex w-full resize-y rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'

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
  const [apelido, setApelido] = useState(perfilEditando?.apelido ?? '')
  const [talento, setTalento] = useState(perfilEditando?.talento ?? '')
  const [nascimento, setNascimento] = useState(
    (perfilEditando?.data_nascimento ?? '').slice(0, 10),
  )
  const [bio, setBio] = useState(perfilEditando?.bio ?? '')
  const [habilidades, setHabilidades] = useState(() => {
    const atuais = perfilEditando?.habilidades ?? []
    return [atuais[0] ?? '', atuais[1] ?? '', atuais[2] ?? '']
  })

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
      ...(perfilEditando ? payloadDoPerfil(perfilEditando) : {}),
      nome,
      cargo,
      setor,
      frase,
      apelido,
      data_nascimento: nascimento,
      bio,
      talento,
      habilidades: habilidades.map((h) => h.trim()).filter(Boolean),
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
              <label htmlFor="bl-apelido" className="text-sm font-medium">
                Como prefere ser chamado(a)
              </label>
              <Input
                id="bl-apelido"
                placeholder="Ex.: Lukinhas"
                value={apelido}
                onChange={(e) => setApelido(e.target.value)}
                maxLength={80}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="bl-nascimento" className="text-sm font-medium">Data de nascimento</label>
              <Input
                id="bl-nascimento"
                type="date"
                value={nascimento}
                onChange={(e) => setNascimento(e.target.value)}
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
              <label htmlFor="bl-bio" className="text-sm font-medium">Descrição curta</label>
              <span className="text-xs text-muted-foreground">{bio.length}/400</span>
            </div>
            <textarea
              id="bl-bio"
              placeholder="Uma breve descrição sobre a pessoa…"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={2}
              maxLength={400}
              className={CLASSE_TEXTAREA}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Três palavras que te definem</label>
            <div className="grid gap-2 sm:grid-cols-3">
              {habilidades.map((valor, i) => (
                <Input
                  key={i}
                  placeholder={`Palavra ${i + 1}`}
                  value={valor}
                  maxLength={60}
                  onChange={(e) =>
                    setHabilidades(habilidades.map((h, k) => (k === i ? e.target.value : h)))
                  }
                />
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="bl-talento" className="text-sm font-medium">
              Maior talento ou habilidade
            </label>
            <Input
              id="bl-talento"
              placeholder="Ex.: Escutar as pessoas de verdade"
              value={talento}
              onChange={(e) => setTalento(e.target.value)}
              maxLength={200}
            />
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
              className={CLASSE_TEXTAREA}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <CampoImagem
              rotulo="Capa do card"
              dica={IMAGENS_PERFIL.capa.dica}
              aspecto={IMAGENS_PERFIL.capa.aspecto}
              valor={capa}
              onChange={setCapa}
              onErro={setErro}
            />
            <CampoImagem
              rotulo="Foto principal do perfil"
              dica={IMAGENS_PERFIL.perfil.dica}
              aspecto={IMAGENS_PERFIL.perfil.aspecto}
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
