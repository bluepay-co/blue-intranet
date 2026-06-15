import { useEffect, useState } from 'react'
import {
  Users,
  ShieldCheck,
  ShieldOff,
  ChevronDown,
  AlertCircle,
  Search,
  SlidersHorizontal,
  X,
  Loader2,
} from 'lucide-react'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import DataTable from '@/components/ui/data-table'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import PageHeader from '@/components/layout/PageHeader'
import { useAuth } from '@/auth/auth-context'
import {
  ROLES,
  rotuloRole,
  listarUsuarios,
  definirBloqueio,
  definirRole,
} from '@/api/modules/usuarios'

/** Formata a data de cadastro no padrão brasileiro. */
function formatarData(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('pt-BR')
}

export default function Usuarios() {
  const { usuario: logado } = useAuth()
  const [usuarios, setUsuarios] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [salvandoId, setSalvandoId] = useState(null)
  const [busca, setBusca] = useState('')
  const [filtroSetor, setFiltroSetor] = useState(null)

  useEffect(() => {
    let ativo = true
    ;(async () => {
      try {
        const lista = await listarUsuarios()
        if (ativo) setUsuarios(lista)
      } catch (e) {
        if (ativo) setErro(e?.response?.data?.message ?? 'Falha ao carregar os usuários.')
      } finally {
        if (ativo) setCarregando(false)
      }
    })()
    return () => {
      ativo = false
    }
  }, [])

  /** Aplica o usuário atualizado retornado pelo backend na lista local. */
  function aplicarAtualizacao(atualizado) {
    setUsuarios((atual) => atual.map((u) => (u.id === atualizado.id ? { ...u, ...atualizado } : u)))
  }

  async function trocarCargo(alvo, novoRole) {
    if (novoRole === alvo.role) return
    setErro('')
    setSalvandoId(alvo.id)
    try {
      aplicarAtualizacao(await definirRole(alvo.id, novoRole))
    } catch (e) {
      setErro(e?.response?.data?.message ?? 'Falha ao alterar o setor.')
    } finally {
      setSalvandoId(null)
    }
  }

  async function alternarBloqueio(alvo) {
    setErro('')
    setSalvandoId(alvo.id)
    try {
      aplicarAtualizacao(await definirBloqueio(alvo.id, !alvo.bloqueado))
    } catch (e) {
      setErro(e?.response?.data?.message ?? 'Falha ao alterar o bloqueio.')
    } finally {
      setSalvandoId(null)
    }
  }

  const termo = busca.trim().toLowerCase()
  const usuariosFiltrados = usuarios.filter((u) => {
    if (filtroSetor && u.role !== filtroSetor) return false
    if (!termo) return true
    return (
      u.nome?.toLowerCase().includes(termo) ||
      u.email?.toLowerCase().includes(termo) ||
      u.role?.toLowerCase().includes(termo) ||
      rotuloRole(u.role).toLowerCase().includes(termo)
    )
  })

  const totalBloqueados = usuarios.filter((u) => u.bloqueado).length
  const temFiltro = Boolean(termo) || Boolean(filtroSetor)

  // Definição das colunas para o DataTable reutilizável.
  const colunas = [
    {
      key: 'usuario',
      header: 'Usuário',
      cell: (u) => (
        <div className="flex items-center gap-3">
          <div className="grid size-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-brand to-brand-accent text-sm font-semibold text-brand-foreground">
            {(u.nome?.[0] ?? '?').toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="flex flex-wrap items-center gap-2 font-medium text-foreground">
              <span className="truncate">{u.nome}</span>
              {u.id === logado?.id && (
                <span className="rounded bg-muted px-1.5 py-0.5 text-[0.65rem] font-semibold tracking-wide text-muted-foreground uppercase">
                  Você
                </span>
              )}
              {u.bloqueado && (
                <span className="inline-flex items-center gap-1 rounded bg-destructive/10 px-1.5 py-0.5 text-[0.65rem] font-semibold tracking-wide text-destructive uppercase">
                  <ShieldOff className="size-3" />
                  Bloqueado
                </span>
              )}
            </p>
            <p className="truncate text-xs text-muted-foreground">{u.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'setor',
      header: 'Setor',
      cell: (u) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              disabled={u.id === logado?.id || salvandoId === u.id}
              className="h-8 gap-1.5 font-medium"
            >
              {rotuloRole(u.role)}
              {u.id !== logado?.id && <ChevronDown className="size-3.5 opacity-60" />}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="max-h-72 overflow-y-auto">
            {ROLES.map((role) => (
              <DropdownMenuItem
                key={role}
                onSelect={() => trocarCargo(u, role)}
                className={role === u.role ? 'font-semibold text-brand-accent' : ''}
              >
                {rotuloRole(role)}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
    {
      key: 'cadastro',
      header: 'Cadastro',
      className: 'whitespace-nowrap text-muted-foreground',
      cell: (u) => formatarData(u.criado_em),
    },
    {
      key: 'acesso',
      header: 'Acesso',
      headerClassName: 'text-right',
      className: 'text-right',
      cell: (u) => (
        <Button
          variant={u.bloqueado ? 'outline' : 'destructive'}
          size="sm"
          disabled={u.id === logado?.id || salvandoId === u.id}
          onClick={() => alternarBloqueio(u)}
          className="h-8 gap-1.5"
        >
          {salvandoId === u.id ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : u.bloqueado ? (
            <ShieldCheck className="size-3.5" />
          ) : (
            <ShieldOff className="size-3.5" />
          )}
          {u.bloqueado ? 'Desbloquear' : 'Bloquear'}
        </Button>
      ),
    },
  ]

  const vazio =
    usuarios.length === 0 ? (
      <>
        <Users className="size-6" />
        <p className="text-sm">Nenhum usuário cadastrado ainda.</p>
      </>
    ) : (
      <>
        <Search className="size-6" />
        <p className="text-sm">Nenhum usuário encontrado com esses critérios.</p>
      </>
    )

  return (
    <div className="space-y-6">
      <PageHeader title="Usuários" subtitle="Gestão de acessos e setores (RBAC) da intranet.">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-accent/10 px-3 py-1 text-xs font-semibold tracking-wide text-brand-accent uppercase">
          <ShieldCheck className="size-3.5" />
          Somente T.I
        </span>
      </PageHeader>

      {erro && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="size-4 shrink-0" />
          {erro}
        </div>
      )}

      <Card className="overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between gap-4 border-b bg-muted/30">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="size-5 text-brand-accent" />
              Colaboradores
            </CardTitle>
            <CardDescription>Promova setores e controle quem pode acessar o sistema.</CardDescription>
          </div>
          {!carregando && usuarios.length > 0 && (
            <div className="hidden shrink-0 gap-2 sm:flex">
              <span className="rounded-full bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground">
                {usuarios.length} {usuarios.length === 1 ? 'usuário' : 'usuários'}
              </span>
              {totalBloqueados > 0 && (
                <span className="rounded-full bg-destructive/10 px-3 py-1 text-xs font-semibold text-destructive">
                  {totalBloqueados} bloqueado{totalBloqueados > 1 ? 's' : ''}
                </span>
              )}
            </div>
          )}
        </CardHeader>

        {/* Barra de busca + filtro por setor */}
        {!carregando && usuarios.length > 0 && (
          <div className="flex flex-wrap items-center gap-3 border-b px-4 py-3">
            <div className="relative w-full max-w-xs">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar por nome, e-mail ou setor…"
                className="h-9 pl-8"
              />
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-9 gap-1.5">
                  <SlidersHorizontal className="size-3.5" />
                  Setor: {filtroSetor ? rotuloRole(filtroSetor) : 'Todos'}
                  <ChevronDown className="size-3.5 opacity-60" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="max-h-72 overflow-y-auto">
                <DropdownMenuLabel>Filtrar por setor</DropdownMenuLabel>
                <DropdownMenuItem
                  onSelect={() => setFiltroSetor(null)}
                  className={!filtroSetor ? 'font-semibold text-brand-accent' : ''}
                >
                  Todos
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {ROLES.map((role) => (
                  <DropdownMenuItem
                    key={role}
                    onSelect={() => setFiltroSetor(role)}
                    className={filtroSetor === role ? 'font-semibold text-brand-accent' : ''}
                  >
                    {rotuloRole(role)}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {temFiltro && (
              <Button
                variant="ghost"
                size="sm"
                className="h-9 gap-1.5 text-muted-foreground"
                onClick={() => {
                  setBusca('')
                  setFiltroSetor(null)
                }}
              >
                <X className="size-3.5" />
                Limpar
              </Button>
            )}

            <span className="ml-auto text-xs text-muted-foreground">
              {usuariosFiltrados.length} de {usuarios.length}
            </span>
          </div>
        )}

        <CardContent className="p-0">
          <DataTable
            columns={colunas}
            data={usuariosFiltrados}
            carregando={carregando}
            vazio={vazio}
            rowClassName={(u) => (u.bloqueado ? 'bg-destructive/[0.03]' : '')}
          />
        </CardContent>
      </Card>
    </div>
  )
}
