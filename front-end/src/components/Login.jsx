import { Navigate } from 'react-router-dom'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import ThemeToggle from '@/components/ThemeToggle'
import { CalendarDays, ShieldCheck, Sparkles } from 'lucide-react'
import { useAuth } from '@/auth/auth-context'

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'

/** Monta a URL de consentimento OAuth2 do Google (Authorization Code Flow). */
function montarUrlGoogle() {
  const params = new URLSearchParams({
    client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
    redirect_uri: import.meta.env.VITE_GOOGLE_REDIRECT_URI,
    response_type: 'code',
    scope: import.meta.env.VITE_GOOGLE_SCOPE ?? 'openid email profile',
    access_type: 'offline',
    prompt: 'consent',
  })
  const dominio = import.meta.env.VITE_CORPORATE_DOMAIN
  if (dominio) params.set('hd', dominio) // restringe ao Workspace corporativo
  return `${GOOGLE_AUTH_URL}?${params.toString()}`
}

/** Ícone "G" do Google (lucide não possui marca; SVG inline mínimo). */
function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.56c2.08-1.92 3.28-4.74 3.28-8.09Z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.56-2.76c-.98.66-2.23 1.06-3.72 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z" />
      <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84Z" />
      <path fill="#EA4335" d="M12 4.75c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 1.4 14.97.34 12 .34A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.3 9.14 4.75 12 4.75Z" />
    </svg>
  )
}

export default function Login() {
  const { autenticado, carregando, erro } = useAuth()

  // Sessão já ativa (token válido): vai direto para a home.
  if (autenticado) return <Navigate to="/" replace />

  const handleGoogle = () => {
    window.location.href = montarUrlGoogle()
  }

  return (
    <div className="grid min-h-svh bg-background text-foreground lg:grid-cols-2">
      {/* Painel da marca (esquerda) — oculto no mobile */}
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-brand via-brand to-[#0d1216] p-10 text-brand-foreground lg:flex">
        {/* Brilho decorativo na cor secundária */}
        <div className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-brand-accent/25 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-20 h-80 w-80 rounded-full bg-brand-accent/10 blur-3xl" />
        {/* Grade sutil de fundo */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              'linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />

        <img src="/logo.png" alt="Blue Pay Solutions" className="relative h-10 w-auto" />

        <div className="relative space-y-6">
          <div className="space-y-3">
            <h2 className="text-3xl font-semibold leading-tight">Intranet corporativa</h2>
            <p className="max-w-sm text-brand-foreground/70">
              Acesse ferramentas, agenda e recursos internos da Blue Pay Solutions
              em um só lugar.
            </p>
          </div>

          <ul className="space-y-3 text-sm text-brand-foreground/80">
            {[
              { Icon: Sparkles, texto: 'Métricas e dashboards em tempo real' },
              { Icon: CalendarDays, texto: 'Agenda, tarefas e chamados integrados' },
              { Icon: ShieldCheck, texto: 'Acesso seguro via Google Workspace' },
            ].map(({ Icon, texto }) => (
              <li key={texto} className="flex items-center gap-3">
                <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-brand-accent/15 text-brand-accent">
                  <Icon className="size-4" />
                </span>
                {texto}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-brand-foreground/50">
          © {new Date().getFullYear()} Blue Pay Solutions
        </p>
      </aside>

      {/* Painel do formulário (direita) */}
      <main className="relative flex items-center justify-center p-6">
        {/* Alternância de tema */}
        <ThemeToggle className="absolute top-4 right-4" />

        <Card className="w-full max-w-sm border-border/60 shadow-lg">
          <CardHeader className="text-center">
            {/* No mobile o painel da marca some, então mostramos o logo aqui */}
            <img
              src="/logo.png"
              alt="Blue Pay Solutions"
              className="mx-auto mb-2 h-9 w-auto lg:hidden"
            />
            <CardTitle className="text-2xl">Bem-vindo</CardTitle>
            <CardDescription>
              Acesse com sua conta corporativa do Google Workspace.
            </CardDescription>
          </CardHeader>

          {erro && (
            <CardContent>
              <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {erro}
              </p>
            </CardContent>
          )}

          <CardFooter className="flex-col gap-4">
            <Button
              className="w-full"
              size="lg"
              onClick={handleGoogle}
              disabled={carregando}
            >
              <GoogleIcon />
              {carregando ? 'Entrando…' : 'Entrar com o Google Workspace'}
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              Ao continuar, você concorda com as políticas internas da Blue Pay Solutions.
            </p>
          </CardFooter>
        </Card>
      </main>
    </div>
  )
}
