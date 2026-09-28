import axios from 'axios';

/** Chave única do JWT de sessão no localStorage. */
export const TOKEN_KEY = 'intranet_token';

/** Evento disparado quando a API recusa o JWT (o AuthProvider encerra a sessão). */
export const SESSAO_EXPIRADA_EVENT = 'intranet:sessao-expirada';

const api = axios.create({
    baseURL: '',
    headers: {
        'Content-Type': 'application/json',
    },
});

// Injeta o Bearer token em toda requisição autenticada (rotas protegidas).
api.interceptors.request.use((config) => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// JWT recusado (expirado/inválido): avisa o AuthProvider para deslogar, senão
// uma aba esquecida aberta segue fazendo polling com 401 para sempre. Só reage
// ao código de sessão da intranet — 401 da sessão do Google (Agenda) não conta.
api.interceptors.response.use(undefined, (erro) => {
    if (erro?.response?.status === 401 && erro.response.data?.codigo === 'SESSAO_INVALIDA') {
        window.dispatchEvent(new Event(SESSAO_EXPIRADA_EVENT));
    }
    return Promise.reject(erro);
});

export default api;