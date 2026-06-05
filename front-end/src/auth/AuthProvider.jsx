import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AuthContext } from './auth-context'
import { TOKEN_KEY } from '@/api/api'
import {
  loginComGoogle,
  buscarUsuarioLogado,
  logout as limparSessao,
} from '@/api/modules/auth'

/**
 * Provedor de autenticação. Faz o "bootstrap" da sessão ao carregar o app:
 *
 * 1. Se a URL trouxer `?code=` (retorno do Google), troca pelo JWT + usuário.
 * 2. Senão, se houver um JWT salvo, valida-o no backend (`/api/auth/me`).
 * 3. Caso contrário, segue deslogado.
 *
 * Expõe `{ usuario, carregando, erro, autenticado, logout }`.
 */
export default function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const navigate = useNavigate()
  const iniciado = useRef(false)

  useEffect(() => {
    // O StrictMode roda o effect 2x em dev; o code do Google é de uso único.
    if (iniciado.current) return
    iniciado.current = true

    const code = new URLSearchParams(window.location.search).get('code')

    async function iniciar() {
      try {
        if (code) {
          const { token, usuario: logado } = await loginComGoogle(code)
          localStorage.setItem(TOKEN_KEY, token)
          setUsuario(logado)
          // Remove o ?code= da URL e leva para a home.
          navigate('/', { replace: true })
          return
        }

        if (localStorage.getItem(TOKEN_KEY)) {
          setUsuario(await buscarUsuarioLogado())
        }
      } catch (e) {
        console.error('[auth] falha ao iniciar a sessão:', e)
        limparSessao()
        setUsuario(null)
        if (code) {
          setErro(e?.response?.data?.message ?? 'Falha ao autenticar. Tente novamente.')
          navigate('/login', { replace: true })
        }
      } finally {
        setCarregando(false)
      }
    }

    iniciar()
  }, [navigate])

  const logout = useCallback(() => {
    limparSessao()
    setUsuario(null)
    navigate('/login', { replace: true })
  }, [navigate])

  const valor = {
    usuario,
    carregando,
    erro,
    autenticado: Boolean(usuario),
    logout,
  }

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>
}
