import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Check, Copy, ExternalLink, Loader2, Plus, Save } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import PageHeader from '@/components/layout/PageHeader'
import PerguntaCard from '@/components/formularios/PerguntaCard'
import {
  CLASSE_CAMPO,
  OPCOES_COLETA_EMAIL,
  novaChave,
  novaPergunta,
  paraPayload,
} from '@/components/formularios/tipos'
import {
  buscarFormulario,
  criarFormulario,
  atualizarFormulario,
  alterarRecebimento,
} from '@/api/modules/formularios'

function mensagemErro(e, padrao) {
  return e?.response?.data?.message ?? padrao
}

export default function FormularioEditor() {
  const { id } = useParams()
  const novo = !id
  const navigate = useNavigate()

  const [form, setForm] = useState(() => ({
    titulo: '',
    descricao: '',
    coletaEmail: 'verificado',
    itens: [novaPergunta()],
  }))
  const [meta, setMeta] = useState(null)
  const [carregando, setCarregando] = useState(!novo)
  const [salvando, setSalvando] = useState(false)
  const [alternando, setAlternando] = useState(false)
  const [alterado, setAlterado] = useState(false)
  const [erro, setErro] = useState('')
  const [conflito, setConflito] = useState(false)
  const [aviso, setAviso] = useState('')
  const [copiado, setCopiado] = useState(false)

  const aplicar = useCallback((f) => {
    setMeta(f)
    setForm({
      titulo: f.titulo,
      descricao: f.descricao ?? '',
      coletaEmail: f.coletaEmail,
      itens: f.itens.map((i) => ({ ...i, chave: novaChave() })),
    })
    setAlterado(false)
    setConflito(false)
  }, [])

  const [tentativa, setTentativa] = useState(0)
  const recemCriado = useRef(null)

  useEffect(() => {
    if (novo) return
    // Após criar, o estado já veio da resposta; não recarrega.
    if (recemCriado.current === Number(id)) {
      recemCriado.current = null
      return
    }
    async function carregar() {
      try {
        aplicar(await buscarFormulario(id))
      } catch (e) {
        setErro(mensagemErro(e, 'Não foi possível carregar o formulário.'))
      } finally {
        setCarregando(false)
      }
    }
    carregar()
  }, [novo, id, tentativa, aplicar])

  function recarregar() {
    setCarregando(true)
    setErro('')
    setTentativa((t) => t + 1)
  }

  useEffect(() => {
    if (!alterado) return
    const avisar = (e) => e.preventDefault()
    window.addEventListener('beforeunload', avisar)
    return () => window.removeEventListener('beforeunload', avisar)
  }, [alterado])

  function editar(parcial) {
    setForm((f) => ({ ...f, ...parcial }))
    setAlterado(true)
    setAviso('')
  }

  function editarItem(indice, item) {
    editar({ itens: form.itens.map((it, i) => (i === indice ? item : it)) })
  }

  function moverItem(indice, delta) {
    const itens = [...form.itens]
    const destino = indice + delta
    ;[itens[indice], itens[destino]] = [itens[destino], itens[indice]]
    editar({ itens })
  }

  function duplicarItem(indice) {
    const copia = { ...form.itens[indice], chave: novaChave() }
    delete copia.id
    const itens = [...form.itens]
    itens.splice(indice + 1, 0, copia)
    editar({ itens })
  }

  function removerItem(indice) {
    editar({ itens: form.itens.filter((_, i) => i !== indice) })
  }

  async function salvar() {
    setSalvando(true)
    setErro('')
    setAviso('')
    const payload = {
      titulo: form.titulo,
      descricao: form.descricao || null,
      coletaEmail: form.coletaEmail,
      itens: form.itens.map(paraPayload),
    }
    try {
      if (novo) {
        const criado = await criarFormulario(payload)
        aplicar(criado)
        recemCriado.current = criado.id
        navigate(`/marketing/formularios/${criado.id}`, { replace: true })
        setAviso('Formulário criado e publicado.')
      } else {
        aplicar(await atualizarFormulario(id, { ...payload, revisao: meta.revisao }))
        setAviso('Alterações salvas.')
      }
    } catch (e) {
      if (e?.response?.status === 409) setConflito(true)
      setErro(mensagemErro(e, 'Não foi possível salvar o formulário.'))
    } finally {
      setSalvando(false)
    }
  }

  async function alternarRecebimento() {
    setAlternando(true)
    setErro('')
    try {
      const aceitando = await alterarRecebimento(meta.id, !meta.aceitandoRespostas)
      setMeta((m) => ({ ...m, aceitandoRespostas: aceitando }))
    } catch (e) {
      setErro(mensagemErro(e, 'Não foi possível alterar o recebimento de respostas.'))
    } finally {
      setAlternando(false)
    }
  }

  async function copiarLink() {
    await navigator.clipboard.writeText(meta.responderUri)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2000)
  }

  function voltar() {
    if (alterado && !confirm('Há alterações não salvas. Deseja sair mesmo assim?')) return
    navigate('/marketing/formularios')
  }

  const podeSalvar = form.titulo.trim().length > 0 && !salvando && (novo || alterado)

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={novo ? 'Novo formulário' : 'Editar formulário'}
        subtitle={meta ? `Criado por ${meta.criadoPor.nome}` : 'Monte as perguntas e publique.'}
      >
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="ghost" size="sm" onClick={voltar}>
            <ArrowLeft /> Voltar
          </Button>
          {meta && (
            <>
              <Badge variant={meta.aceitandoRespostas ? 'secondary' : 'outline'}>
                {meta.aceitandoRespostas ? 'Aceitando respostas' : 'Respostas fechadas'}
              </Badge>
              <Button variant="outline" size="sm" disabled={alternando} onClick={alternarRecebimento}>
                {alternando && <Loader2 className="animate-spin" />}
                {meta.aceitandoRespostas ? 'Fechar respostas' : 'Abrir respostas'}
              </Button>
              <Button variant="outline" size="sm" onClick={copiarLink}>
                {copiado ? <Check /> : <Copy />} {copiado ? 'Copiado' : 'Copiar link'}
              </Button>
              <Button variant="outline" size="sm" asChild>
                <a href={meta.responderUri} target="_blank" rel="noreferrer">
                  <ExternalLink /> Visualizar
                </a>
              </Button>
            </>
          )}
        </div>
      </PageHeader>

      {carregando && (
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      )}

      {!carregando && !novo && !meta && erro && (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <p className="text-sm text-destructive">{erro}</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={recarregar}>
              Tentar novamente
            </Button>
          </CardContent>
        </Card>
      )}

      {!carregando && (novo || meta) && (
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
          <Card className="border-t-4 border-t-brand-accent">
            <CardContent className="flex flex-col gap-3 py-4">
              <Input
                className="h-10 text-lg font-medium md:text-lg"
                placeholder="Título do formulário"
                maxLength={300}
                value={form.titulo}
                onChange={(e) => editar({ titulo: e.target.value })}
              />
              <textarea
                className={cn(CLASSE_CAMPO, 'min-h-16 resize-y py-2')}
                placeholder="Descrição (opcional)"
                maxLength={4000}
                value={form.descricao}
                onChange={(e) => editar({ descricao: e.target.value })}
              />
              <div className="flex flex-col gap-1.5 border-t pt-3 sm:flex-row sm:items-center sm:gap-3">
                <label htmlFor="coleta-email" className="text-sm font-medium sm:shrink-0">
                  Coletar e-mails
                </label>
                <select
                  id="coleta-email"
                  className={cn(CLASSE_CAMPO, 'h-8 sm:w-60')}
                  value={form.coletaEmail}
                  onChange={(e) => editar({ coletaEmail: e.target.value })}
                >
                  {OPCOES_COLETA_EMAIL.map((o) => <option key={o.valor} value={o.valor}>{o.rotulo}</option>)}
                </select>
                <p className="text-xs text-muted-foreground">
                  {OPCOES_COLETA_EMAIL.find((o) => o.valor === form.coletaEmail)?.ajuda}
                </p>
              </div>
            </CardContent>
          </Card>

          {form.itens.map((item, i) => (
            <PerguntaCard
              key={item.chave}
              item={item}
              indice={i}
              total={form.itens.length}
              onChange={(novoItem) => editarItem(i, novoItem)}
              onMover={(delta) => moverItem(i, delta)}
              onDuplicar={() => duplicarItem(i)}
              onRemover={() => removerItem(i)}
            />
          ))}

          <Button
            variant="outline"
            className="border-dashed"
            onClick={() => editar({ itens: [...form.itens, novaPergunta()] })}
          >
            <Plus /> Adicionar pergunta
          </Button>

          <div className="sticky bottom-0 -mx-1 flex flex-wrap items-center justify-end gap-3 border-t bg-background/95 px-1 py-3 backdrop-blur">
            {erro && <p className="mr-auto text-sm text-destructive">{erro}</p>}
            {!erro && aviso && <p className="mr-auto text-sm text-muted-foreground">{aviso}</p>}
            {conflito && (
              <Button variant="outline" onClick={recarregar}>
                Recarregar
              </Button>
            )}
            <Button disabled={!podeSalvar} onClick={salvar}>
              {salvando ? <Loader2 className="animate-spin" /> : <Save />}
              {novo ? 'Criar e publicar' : 'Salvar alterações'}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
