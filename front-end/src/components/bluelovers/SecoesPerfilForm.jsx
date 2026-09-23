import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import CampoImagem from '@/components/bluelovers/CampoImagem'
import { IMAGENS_PERFIL, imagemDoBanco } from '@/components/bluelovers/imagem-utils'
import { GOSTOS, LIMITES_GOSTO } from '@/components/bluelovers/gostos'
import { editarPerfil, payloadDoPerfil, urlFoto } from '@/api/modules/bluelovers'

const CLASSE_TEXTAREA =
  'flex w-full resize-y rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'

function Campo({ id, rotulo, contador, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between">
        <label htmlFor={id} className="text-sm font-medium">{rotulo}</label>
        {contador && <span className="text-xs text-muted-foreground">{contador}</span>}
      </div>
      {children}
    </div>
  )
}

/**
 * Seções 03 a 09: todas são campos da própria linha do perfil, por isso saem
 * num único PUT junto com os dados que não mudaram.
 *
 * @param {{ perfil: object, onSalvo: () => void }} props
 */
export default function SecoesPerfilForm({ perfil, onSalvo }) {
  const [campos, setCampos] = useState(() => payloadDoPerfil(perfil))
  const [viagem, setViagem] = useState(imagemDoBanco(perfil.viagem_favorita_foto_url, urlFoto))
  const [viagemSonho, setViagemSonho] = useState(
    imagemDoBanco(perfil.viagem_sonho_foto_url, urlFoto),
  )
  const [inspiracao, setInspiracao] = useState(
    imagemDoBanco(perfil.inspiracao_foto_url, urlFoto),
  )
  const [bluepay, setBluepay] = useState(imagemDoBanco(perfil.bluepay_pessoa_foto_url, urlFoto))

  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const [aviso, setAviso] = useState('')

  const editar = (campo) => (e) => {
    setCampos({ ...campos, [campo]: e.target.value })
    setAviso('')
  }

  /** Título vazio volta ao padrão, então some do mapa salvo. */
  function editarRotulo(campo, valor) {
    const rotulos = { ...(campos.rotulos_gostos ?? {}) }
    if (valor.trim()) rotulos[campo] = valor
    else delete rotulos[campo]
    setCampos({ ...campos, rotulos_gostos: rotulos })
    setAviso('')
  }

  async function salvar() {
    setSalvando(true)
    setErro('')
    setAviso('')
    try {
      await editarPerfil(perfil.id, {
        ...campos,
        foto_viagem: viagem.file || undefined,
        viagem_favorita_foto_url: viagem.file ? undefined : viagem.urlRaw,
        foto_viagem_sonho: viagemSonho.file || undefined,
        viagem_sonho_foto_url: viagemSonho.file ? undefined : viagemSonho.urlRaw,
        foto_inspiracao: inspiracao.file || undefined,
        inspiracao_foto_url: inspiracao.file ? undefined : inspiracao.urlRaw,
        foto_bluepay: bluepay.file || undefined,
        bluepay_pessoa_foto_url: bluepay.file ? undefined : bluepay.urlRaw,
      })
      setAviso('Seções salvas.')
      onSalvo?.()
    } catch (err) {
      setErro(err?.response?.data?.message ?? 'Erro ao salvar as seções.')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gostos, viagens e fechamento</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {GOSTOS.map(([campo, emoji, padrao, exemplo]) => (
            <div key={campo} className="flex flex-col gap-1.5 rounded-lg border p-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">{emoji}</span>
                <Input
                  className="h-7 border-none px-1 text-xs font-medium shadow-none"
                  aria-label={`Título do card ${padrao}`}
                  placeholder={padrao}
                  value={campos.rotulos_gostos?.[campo] ?? ''}
                  maxLength={120}
                  onChange={(e) => editarRotulo(campo, e.target.value)}
                />
              </div>
              <Input
                id={`bl-${campo}`}
                placeholder={exemplo}
                value={campos[campo] ?? ''}
                maxLength={LIMITES_GOSTO[campo] ?? 120}
                onChange={editar(campo)}
              />
            </div>
          ))}
        </div>
        <p className="-mt-3 text-xs text-muted-foreground">
          O título de cada card é editável; deixe em branco para usar o padrão.
        </p>

        <div className="grid gap-6 border-t pt-5 lg:grid-cols-2">
          <div className="flex flex-col gap-3">
            <Campo
              id="bl-viagem"
              rotulo="✈️ Minha viagem favorita"
              contador={`${(campos.viagem_favorita_texto ?? '').length}/400`}
            >
              <textarea
                id="bl-viagem"
                placeholder="Uma descrição curta sobre a viagem…"
                value={campos.viagem_favorita_texto ?? ''}
                onChange={editar('viagem_favorita_texto')}
                rows={3}
                maxLength={400}
                className={CLASSE_TEXTAREA}
              />
            </Campo>
            <CampoImagem
              rotulo="Foto da viagem favorita"
              dica={IMAGENS_PERFIL.viagem.dica}
              aspecto={IMAGENS_PERFIL.viagem.aspecto}
              valor={viagem}
              onChange={setViagem}
              onErro={setErro}
            />
          </div>

          <div className="flex flex-col gap-3">
            <Campo id="bl-viagem-sonho" rotulo="🛫 Viagem dos sonhos">
              <Input
                id="bl-viagem-sonho"
                placeholder="Ex.: Japão"
                value={campos.viagem_sonho ?? ''}
                maxLength={120}
                onChange={editar('viagem_sonho')}
              />
            </Campo>
            <CampoImagem
              rotulo="Foto da viagem dos sonhos"
              dica={IMAGENS_PERFIL.viagemSonho.dica}
              aspecto={IMAGENS_PERFIL.viagemSonho.aspecto}
              valor={viagemSonho}
              onChange={setViagemSonho}
              onErro={setErro}
            />
          </div>
        </div>

        <div className="grid gap-4 border-t pt-5 lg:grid-cols-[2fr_1fr]">
          <Campo
            id="bl-inspiracao"
            rotulo="✦ O que me inspira"
            contador={`${(campos.inspiracao_texto ?? '').length}/400`}
          >
            <textarea
              id="bl-inspiracao"
              placeholder="Uma frase ou pequena descrição da inspiração…"
              value={campos.inspiracao_texto ?? ''}
              onChange={editar('inspiracao_texto')}
              rows={3}
              maxLength={400}
              className={CLASSE_TEXTAREA}
            />
          </Campo>
          <CampoImagem
            rotulo="Foto ou arte"
            dica={IMAGENS_PERFIL.inspiracao.dica}
            aspecto={IMAGENS_PERFIL.inspiracao.aspecto}
            valor={inspiracao}
            onChange={setInspiracao}
            onErro={setErro}
          />
        </div>

        <div className="grid gap-4 border-t pt-5 lg:grid-cols-[2fr_1fr]">
          <Campo
            id="bl-bluepay"
            rotulo="Se a Bluepay fosse uma pessoa…"
            contador={`${(campos.bluepay_pessoa_texto ?? '').length}/400`}
          >
            <textarea
              id="bl-bluepay"
              placeholder="Eu descreveria a Bluepay como…"
              value={campos.bluepay_pessoa_texto ?? ''}
              onChange={editar('bluepay_pessoa_texto')}
              rows={3}
              maxLength={400}
              className={CLASSE_TEXTAREA}
            />
          </Campo>
          <CampoImagem
            rotulo="Ilustração"
            dica={IMAGENS_PERFIL.bluepay.dica}
            aspecto={IMAGENS_PERFIL.bluepay.aspecto}
            valor={bluepay}
            onChange={setBluepay}
            onErro={setErro}
          />
        </div>

        <div className="border-t pt-5">
          <Campo
            id="bl-mais"
            rotulo="✦ Mais sobre mim"
            contador={`${(campos.mais_sobre_mim ?? '').length}/600`}
          >
            <textarea
              id="bl-mais"
              placeholder="Alguma curiosidade que o time deveria saber…"
              value={campos.mais_sobre_mim ?? ''}
              onChange={editar('mais_sobre_mim')}
              rows={3}
              maxLength={600}
              className={CLASSE_TEXTAREA}
            />
          </Campo>
        </div>

        <div className="flex items-center justify-end gap-3 border-t pt-4">
          {erro && <p className="mr-auto text-sm text-destructive">{erro}</p>}
          {!erro && aviso && <p className="mr-auto text-sm text-muted-foreground">{aviso}</p>}
          <Button disabled={salvando} onClick={salvar}>
            {salvando ? 'Salvando…' : 'Salvar seções'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
