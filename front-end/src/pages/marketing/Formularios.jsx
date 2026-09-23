import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  BarChart3,
  Check,
  CheckCircle2,
  ClipboardList,
  Copy,
  ExternalLink,
  Loader2,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import PageHeader from '@/components/layout/PageHeader'
import { useAuth } from '@/auth/auth-context'
import {
  ehRetornoGoogleForms,
  lerRetornoGoogleForms,
  montarUrlConexaoForms,
} from '@/auth/google-forms'
import {
  buscarConexao,
  conectarGoogleForms,
  listarFormularios,
  excluirFormulario,
} from '@/api/modules/formularios'

const dataCurta = (d) =>
  new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })

export default function Formularios() {
  const { usuario } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const [conectado, setConectado] = useState(null)
  const [conectando, setConectando] = useState(false)
  const [erro, setErro] = useState('')
  const iniciado = useRef(false)
  const navigate = useNavigate()
  const [formularios, setFormularios] = useState(null)
  const [erroLista, setErroLista] = useState('')
  const [excluindo, setExcluindo] = useState(null)
  const [copiado, setCopiado] = useState(null)

  const [tentativa, setTentativa] = useState(0)

  useEffect(() => {
    async function buscarLista() {
      try {
        setFormularios(await listarFormularios())
      } catch {
        setErroLista('Não foi possível carregar os formulários.')
      }
    }
    buscarLista()
  }, [tentativa])

  useEffect(() => {
    // O code do Google é de uso único; evita o disparo duplo do StrictMode.
    if (iniciado.current) return
    iniciado.current = true

    async function iniciar() {
      if (ehRetornoGoogleForms(searchParams)) {
        const retorno = lerRetornoGoogleForms(searchParams)
        setSearchParams({}, { replace: true })
        if (retorno.erro) {
          setErro(retorno.erro)
        } else {
          setConectando(true)
          try {
            await conectarGoogleForms(retorno.code)
          } catch (e) {
            setErro(e?.response?.data?.message ?? 'Não foi possível conectar ao Google Forms.')
          } finally {
            setConectando(false)
          }
        }
      }

      try {
        setConectado(await buscarConexao())
      } catch {
        setErro('Não foi possível verificar a conexão com o Google Forms.')
        setConectado(false)
      }
    }

    iniciar()
  }, [searchParams, setSearchParams])

  const conectar = () => {
    window.location.href = montarUrlConexaoForms(usuario.email)
  }

  async function copiarLink(f) {
    await navigator.clipboard.writeText(f.responderUri)
    setCopiado(f.id)
    setTimeout(() => setCopiado(null), 2000)
  }

  async function excluir(f) {
    if (!confirm(`Excluir "${f.titulo}"? Ele vai para a lixeira do Google Drive de ${f.criadoPor.nome}.`)) return
    setExcluindo(f.id)
    setErroLista('')
    try {
      await excluirFormulario(f.id)
      setFormularios((lista) => lista.filter((x) => x.id !== f.id))
    } catch (e) {
      setErroLista(e?.response?.data?.message ?? 'Não foi possível excluir o formulário.')
    } finally {
      setExcluindo(null)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Formulários" subtitle="Crie formulários e acompanhe as respostas.">
        <div className="flex items-center gap-2">
          {conectado && (
            <Badge variant="secondary">
              <CheckCircle2 /> Google Forms conectado
            </Badge>
          )}
          <Button disabled={!conectado} onClick={() => navigate('/marketing/formularios/novo')}>
            <Plus /> Novo formulário
          </Button>
        </div>
      </PageHeader>

      {erro && <p className="text-sm text-destructive">{erro}</p>}

      {conectando && (
        <Card>
          <CardContent className="flex items-center gap-3 py-6">
            <Loader2 className="size-4 animate-spin" />
            <span className="text-sm text-muted-foreground">Conectando ao Google Forms...</span>
          </CardContent>
        </Card>
      )}

      {conectado === false && !conectando && (
        <Card>
          <CardHeader>
            <ClipboardList className="mb-2 size-8 text-muted-foreground" />
            <CardTitle>Conecte sua conta ao Google Forms</CardTitle>
            <CardDescription>
              Necessário para criar formulários, que ficam no seu Google Drive. É preciso autorizar
              uma única vez. Os formulários do time continuam acessíveis abaixo.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button onClick={conectar}>Conectar Google Forms</Button>
          </CardFooter>
        </Card>
      )}

      {formularios === null && !erroLista && (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
        </div>
      )}

      {erroLista && (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center">
            <p className="text-sm text-destructive">{erroLista}</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={() => { setErroLista(''); setTentativa((t) => t + 1) }}>
              Tentar novamente
            </Button>
          </CardContent>
        </Card>
      )}

      {formularios?.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center">
            <p className="font-medium">Nenhum formulário ainda</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Crie o primeiro clicando em "Novo formulário".
            </p>
          </CardContent>
        </Card>
      )}

      {formularios?.length > 0 && (
        <div className="space-y-3">
          {formularios.map((f) => (
            <Card key={f.id}>
              <CardContent className="flex items-center gap-4 py-3">
                <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                  <ClipboardList className="size-5" />
                </div>
                <button
                  type="button"
                  className="min-w-0 flex-1 text-left"
                  onClick={() => navigate(`/marketing/formularios/${f.id}`)}
                >
                  <p className="truncate font-medium hover:underline">{f.titulo}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {f.criadoPor.nome} · criado em {dataCurta(f.criadoEm)}
                  </p>
                </button>
                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    title="Respostas"
                    onClick={() => navigate(`/marketing/formularios/${f.id}/respostas`)}
                  >
                    <BarChart3 className="size-4" />
                  </Button>
                  <Button variant="ghost" size="icon" title="Copiar link de resposta" onClick={() => copiarLink(f)}>
                    {copiado === f.id ? <Check className="size-4" /> : <Copy className="size-4" />}
                  </Button>
                  <Button variant="ghost" size="icon" title="Visualizar" asChild>
                    <a href={f.responderUri} target="_blank" rel="noreferrer">
                      <ExternalLink className="size-4" />
                    </a>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    title="Editar"
                    onClick={() => navigate(`/marketing/formularios/${f.id}`)}
                  >
                    <Pencil className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    title="Excluir"
                    className="text-destructive hover:text-destructive"
                    disabled={excluindo === f.id}
                    onClick={() => excluir(f)}
                  >
                    {excluindo === f.id ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
