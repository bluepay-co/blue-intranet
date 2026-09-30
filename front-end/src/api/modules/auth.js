import api from '@/api/api'

export async function loginComGoogle(code) {
  const { data } = await api.post('/api/auth/google', { code })
  return data
}

export async function buscarUsuarioLogado() {
  const { data } = await api.get('/api/auth/me')
  return data.usuario
}

export function logout() {
  api.post('/api/auth/logout').catch(() => {})
}
