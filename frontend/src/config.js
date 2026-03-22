// src/config.js — NA²QUIZ Configuration centralisée
// ─────────────────────────────────────────────────────────────
//  LOCAL  : API + Socket sur http://localhost:5000
//  PROD   : API + Socket sur Render (même URL)
// ─────────────────────────────────────────────────────────────

// ── API REST ──────────────────────────────────────────────────
export const API_URL =
  process.env.REACT_APP_BACKEND_URL ||
  (process.env.NODE_ENV === 'production'
    ? 'https://na2quizapp.onrender.com'
    : 'http://localhost:5000');

// Alias compatibilité
export const NODE_BACKEND_URL = API_URL;
export const BACKEND_URL      = API_URL;

// ── Socket.IO ─────────────────────────────────────────────────
export const SOCKET_URL =
  process.env.REACT_APP_SOCKET_URL ||
  (process.env.NODE_ENV === 'production'
    ? 'https://na2quizapp.onrender.com'
    : 'http://localhost:5000');

// ── Options Socket.IO ─────────────────────────────────────────
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

// ── Bulletin HTML ─────────────────────────────────────────────
export const bulletinUrl = (resultId) =>
  `${API_URL}/api/bulletin/${resultId}`;

// ── Logs config (dev seulement) ───────────────────────────────
if (process.env.NODE_ENV !== 'production') {
  console.log('[Config] API_URL   :', API_URL);
  console.log('[Config] SOCKET_URL:', SOCKET_URL);
}

const config = { API_URL, NODE_BACKEND_URL, BACKEND_URL, SOCKET_URL, SOCKET_CONFIG, bulletinUrl };
export default config;
