import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AuthContext } from './auth-context'
import { SESSAO_EXPIRADA_EVENT } from '@/api/api'
import {
  loginComGoogle,
  buscarUsuarioLogado,
  logout as limparSessao,
} from '@/api/modules/auth'
import { ehRetornoGoogleForms } from './google-forms'

export default function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const navigate = useNavigate()
  const iniciado = useRef(false)

  useEffect(() => {
    if (iniciado.current) return
    iniciado.current = true

    const params = new URLSearchParams(window.location.search)
    const retornoForms = ehRetornoGoogleForms(params)
    const code = retornoForms ? null : params.get('code')

    if (retornoForms) {
      navigate(`/marketing/formularios${window.location.search}`, { replace: true })
    }

    async function iniciar() {
      try {
        if (retornoForms) {
          setUsuario(await buscarUsuarioLogado())
          return
        }

        if (code) {
          const { usuario: logado } = await loginComGoogle(code)
          setUsuario(logado)
          navigate('/', { replace: true })
          return
        }

        // Tenta restaurar sessão pelo cookie httpOnly (enviado automaticamente).
        setUsuario(await buscarUsuarioLogado())
      } catch (e) {
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

  useEffect(() => {
    function aoExpirar() {
      if (!usuario) return
      setErro('Sua sessão expirou. Entre novamente.')
      logout()
    }
    window.addEventListener(SESSAO_EXPIRADA_EVENT, aoExpirar)
    return () => window.removeEventListener(SESSAO_EXPIRADA_EVENT, aoExpirar)
  }, [logout, usuario])

  const valor = {
    usuario,
    carregando,
    erro,
    autenticado: Boolean(usuario),
    logout,
  }

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>
}
