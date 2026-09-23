const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
const PREFIXO_STATE = 'forms:'
const CHAVE_NONCE = 'google_forms_nonce'

const SCOPES_FORMS = [
  'openid',
  'email',
  'https://www.googleapis.com/auth/forms.body',
  'https://www.googleapis.com/auth/forms.responses.readonly',
  'https://www.googleapis.com/auth/drive.file',
]

/** Retorno do Google que pertence ao consentimento do Forms (não é login). */
export function ehRetornoGoogleForms(params) {
  return (params.get('state') ?? '').startsWith(PREFIXO_STATE)
}

/** Consentimento incremental; `include_granted_scopes` mantém Agenda e Tarefas no novo token. */
export function montarUrlConexaoForms(email) {
  const nonce = crypto.randomUUID()
  sessionStorage.setItem(CHAVE_NONCE, nonce)

  const params = new URLSearchParams({
    client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
    redirect_uri: import.meta.env.VITE_GOOGLE_REDIRECT_URI,
    response_type: 'code',
    scope: SCOPES_FORMS.join(' '),
    access_type: 'offline',
    prompt: 'consent',
    include_granted_scopes: 'true',
    state: `${PREFIXO_STATE}${nonce}`,
    login_hint: email,
  })
  const dominio = import.meta.env.VITE_CORPORATE_DOMAIN
  if (dominio) params.set('hd', dominio)
  return `${GOOGLE_AUTH_URL}?${params.toString()}`
}

/** @returns {{ code: string|null, erro: string|null }} consome o nonce (uso único) */
export function lerRetornoGoogleForms(params) {
  const nonce = sessionStorage.getItem(CHAVE_NONCE)
  sessionStorage.removeItem(CHAVE_NONCE)

  if (!nonce || params.get('state') !== `${PREFIXO_STATE}${nonce}`) {
    return { code: null, erro: 'Não foi possível validar o retorno do Google. Tente conectar novamente.' }
  }
  if (params.get('error')) {
    return { code: null, erro: 'A autorização do Google Forms foi cancelada.' }
  }
  return { code: params.get('code'), erro: null }
}
