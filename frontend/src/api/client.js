// src/api/client.js  ← REMPLACE tous les axios clients fragmentés
// ─────────────────────────────────────────────────────────────
//  Client HTTP centralisé — gère JWT, erreurs, production/local
// ─────────────────────────────────────────────────────────────
import axios from 'axios';
import { API_URL } from '../config';

const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

// ── Intercepteur requête : injecter le JWT ────────────────────
apiClient.interceptors.request.use(
  config => {
    const token = localStorage.getItem('token') || localStorage.getItem('userToken');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  error => Promise.reject(error)
);

// ── Intercepteur réponse : normalisation erreurs ──────────────
apiClient.interceptors.response.use(
  response => response,
  error => {
    const status  = error.response?.status;
    const message = error.response?.data?.message
      || error.response?.data?.error
      || error.message
      || 'Erreur réseau';

    if (status === 401) {
      // Token expiré → nettoyer et rediriger
      localStorage.removeItem('token');
      localStorage.removeItem('userToken');
      localStorage.removeItem('userData');
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }

    console.error(`[API] ${error.config?.method?.toUpperCase()} ${error.config?.url} → ${status} ${message}`);
    return Promise.reject(new Error(message));
  }
);

export default apiClient;

// ── Helpers REST ──────────────────────────────────────────────
export const get    = (url, params) => apiClient.get(url,    { params });
export const post   = (url, data)   => apiClient.post(url,   data);
export const put    = (url, data)   => apiClient.put(url,    data);
export const del    = (url)         => apiClient.delete(url);
export const patch  = (url, data)   => apiClient.patch(url,  data);
