import { useEffect, useState } from 'react'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { loginComGoogle } from '@/api/modules/auth'

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'

/** Monta a URL de consentimento OAuth2 do Google (Authorization Code Flow). */
function montarUrlGoogle(loginHint) {
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
  if (loginHint) params.set('login_hint', loginHint)
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
  const [email, setEmail] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState('')

  // Retorno do Google: se houver ?code= na URL, troca pelo JWT de sessão.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')
    if (!code) return

    setCarregando(true)
    loginComGoogle(code)
      .then(({ token }) => {
        localStorage.setItem('intranet_token', token)
        // Limpa o ?code= da URL para evitar reuso do código.
        window.history.replaceState({}, document.title, window.location.pathname)
        // TODO: redirecionar para o dashboard quando a rota existir.
      })
      .catch((e) => {
        setErro(e?.response?.data?.message ?? 'Falha ao autenticar. Tente novamente.')
      })
      .finally(() => setCarregando(false))
  }, [])

  const handleGoogle = () => {
    setErro('')
    window.location.href = montarUrlGoogle(email.trim())
  }

  return (
    <div className="min-h-svh bg-background text-foreground flex items-center justify-center p-6">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Blue Intranet</CardTitle>
          <CardDescription>
            Acesse com sua conta corporativa do Google Workspace.
          </CardDescription>
        </CardHeader>

        <CardContent className="flex flex-col gap-3">
          <Input
            type="email"
            placeholder="seu.nome@empresa.com"
            autoComplete="email"
            value={email}
            disabled={carregando}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleGoogle()}
          />
          {erro && <p className="text-sm text-destructive">{erro}</p>}
        </CardContent>

        <CardFooter>
          <Button className="w-full" onClick={handleGoogle} disabled={carregando}>
            <GoogleIcon />
            {carregando ? 'Entrando...' : 'Entrar com o Google Workspace'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
