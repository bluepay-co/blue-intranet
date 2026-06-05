import { Navigate, useLocation } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useAuth } from '@/auth/auth-context'

/** Tela de carregamento enquanto a sessão é validada. */
function Carregando() {
  return (
    <div className="grid min-h-svh place-items-center bg-background">
      <Loader2 className="size-6 animate-spin text-muted-foreground" />
    </div>
  )
}

/**
 * Protege rotas. Exige sessão válida e, opcionalmente, um conjunto de cargos.
 *
 * - Sem usuário  -> redireciona para /login (guardando a origem).
 * - Cargo negado -> redireciona para a home (Dashboard, público).
 *
 * A proteção real dos DADOS continua no backend (authMiddleware + roleMiddleware);
 * aqui controlamos apenas a navegação/exibição.
 *
 * @param {{ children: React.ReactNode, roles?: string[] }} props
 */
export default function ProtectedRoute({ children, roles }) {
  const { usuario, carregando } = useAuth()
  const location = useLocation()

  if (carregando) return <Carregando />

  if (!usuario) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  if (roles && !roles.includes(usuario.role)) {
    return <Navigate to="/" replace />
  }

  return children
}
