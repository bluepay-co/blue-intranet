import axios from 'axios';

/** Evento disparado quando a API recusa o JWT (o AuthProvider encerra a sessão). */
export const SESSAO_EXPIRADA_EVENT = 'intranet:sessao-expirada';

const api = axios.create({
    baseURL: '',
    headers: {
        'Content-Type': 'application/json',
    },
    withCredentials: true,
});

// JWT recusado (expirado/inválido): avisa o AuthProvider para deslogar.
// Só reage ao código de sessão da intranet — 401 da sessão do Google não conta.
api.interceptors.response.use(undefined, (erro) => {
    if (erro?.response?.status === 401 && erro.response.data?.codigo === 'SESSAO_INVALIDA') {
        window.dispatchEvent(new Event(SESSAO_EXPIRADA_EVENT));
    }
    return Promise.reject(erro);
});

export default api;
