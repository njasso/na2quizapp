// src/config.js  ← REMPLACE l'ancien fichier
// ─────────────────────────────────────────────────────────────
//  NA²QUIZ — Configuration centralisée production/local
//
//  LOCAL  : API + Socket sur http://localhost:5000
//  NETLIFY: API  → Netlify Functions (même domaine, /api/...)
//           Socket → Railway/Render (URL séparée)
// ─────────────────────────────────────────────────────────────

// ── API REST ──────────────────────────────────────────────────
// En production Netlify, les fonctions sont sur /.netlify/functions/api
// Le redirect netlify.toml redirige /api/* → /.netlify/functions/api/*
// Donc le frontend utilise toujours /api/* — pas de changement d'URL.
export const API_URL =
  process.env.REACT_APP_BACKEND_URL ||
  (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:5000');

// Alias compatibilité (beaucoup de fichiers utilisent NODE_BACKEND_URL)
export const NODE_BACKEND_URL = API_URL;
export const BACKEND_URL      = API_URL;

// ── Socket.IO ─────────────────────────────────────────────────
// En production : serveur Socket.IO séparé (Railway/Render)
// En local : même serveur que l'API
export const SOCKET_URL =
  process.env.REACT_APP_SOCKET_URL ||
  (process.env.NODE_ENV === 'production'
    ? 'https://na2quiz-socket.railway.app'   // ← remplacer par ton URL Railway
    : 'http://localhost:5000');

// ── Connexion Socket.IO — options communes ────────────────────
export const SOCKET_CONFIG = {
  path: '/socket.io',
  transports: ['polling', 'websocket'],
  reconnection: true,
  reconnectionAttempts: 20,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 8000,
  timeout: 20000,
  forceNew: false,
};

// ── Bulletin / PDF (toujours via l'API REST) ──────────────────
export const bulletinUrl = (resultId) => `${API_URL}/api/bulletin/${resultId}`;

// ── Logs config (dev seulement) ───────────────────────────────
if (process.env.NODE_ENV !== 'production') {
  console.log('[Config] API_URL   :', API_URL || '(même domaine)');
  console.log('[Config] SOCKET_URL:', SOCKET_URL);
}

// Export par défaut (compatibilité import default)
const config = { API_URL, NODE_BACKEND_URL, BACKEND_URL, SOCKET_URL, SOCKET_CONFIG, bulletinUrl };
export default config;
