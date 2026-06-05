import axios from 'axios';

/** Chave única do JWT de sessão no localStorage. */
export const TOKEN_KEY = 'intranet_token';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000',
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

export default api;