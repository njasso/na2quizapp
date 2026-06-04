// src/config/env.js - VERSION FINALE (IP réseau prioritaire sur .env)
const currentHostname = window.location.hostname;
const currentPort = window.location.port;
const currentOrigin = window.location.origin;

const isLocalhost = currentHostname === 'localhost' || currentHostname === '127.0.0.1';

// ✅ Détection IP réseau (RFC 1918 + toute IP)
const isLocalNetwork = 
  currentHostname !== 'localhost' &&
  currentHostname !== '127.0.0.1' &&
  /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(currentHostname);

const isProduction = !isLocalhost && !isLocalNetwork;

const SERVER_PORT = 5000;

// ═══════════════════════════════════════════════════════════════
// ✅ CONSTRUCTION DYNAMIQUE - IP RÉSEAU PRIORITAIRE
// ═══════════════════════════════════════════════════════════════

const resolveBackendUrl = () => {
  // ── PRIORITÉ 1 : IP réseau (fonctionne partout) ──────────────
  if (isLocalNetwork) {
    const url = `http://${currentHostname}:${SERVER_PORT}`;
    console.log('[ENV] 📡 Backend (IP réseau - prioritaire):', url);
    return url;
  }
  
  // ── PRIORITÉ 2 : .env (uniquement pour localhost/dev) ────────
  if (isLocalhost && process.env.REACT_APP_BACKEND_URL) {
    console.log('[ENV] 📡 Backend (.env - localhost):', process.env.REACT_APP_BACKEND_URL);
    return process.env.REACT_APP_BACKEND_URL;
  }
  
  // ── PRIORITÉ 3 : localhost par défaut ────────────────────────
  if (isLocalhost) {
    const url = `http://localhost:${SERVER_PORT}`;
    console.log('[ENV] 📡 Backend (localhost):', url);
    return url;
  }
  
  // ── PRIORITÉ 4 : Production ──────────────────────────────────
  console.log('[ENV] 📡 Backend (production)');
  return 'https://na2quizapp.onrender.com';
};

// ✅ Même logique pour le Socket (même serveur)
const resolveSocketUrl = () => {
  if (isLocalNetwork) {
    const url = `http://${currentHostname}:${SERVER_PORT}`;
    console.log('[ENV] 🔌 Socket (IP réseau - prioritaire):', url);
    return url;
  }
  
  if (isLocalhost && process.env.REACT_APP_SOCKET_URL) {
    console.log('[ENV] 🔌 Socket (.env - localhost):', process.env.REACT_APP_SOCKET_URL);
    return process.env.REACT_APP_SOCKET_URL;
  }
  
  if (isLocalhost) {
    const url = `http://localhost:${SERVER_PORT}`;
    console.log('[ENV] 🔌 Socket (localhost):', url);
    return url;
  }
  
  console.log('[ENV] 🔌 Socket (production)');
  return 'https://na2quizapp.onrender.com';
};

const BACKEND_URL = resolveBackendUrl();
const SOCKET_URL = resolveSocketUrl();

const ENV_CONFIG = {
  BACKEND_URL,
  SOCKET_URL,
  TERMINAL_URL: process.env.REACT_APP_TERMINAL_URL || `${BACKEND_URL}/terminal.html`,
  FRONTEND_URL: process.env.REACT_APP_FRONTEND_URL || currentOrigin,

  currentHostname,
  currentPort,
  isLocalhost,
  isLocalNetwork,
  isProduction,
  environment: isProduction ? 'production' : (isLocalNetwork ? 'local-network' : 'localhost'),
  
  fetchNetworkInfo: async () => {
    try {
      console.log('[ENV] 🌐 fetchNetworkInfo depuis:', BACKEND_URL);
      const res = await fetch(`${BACKEND_URL}/api/network-info`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      console.log('[ENV] ✅ Network info récupérée:', data);
      return data;
    } catch (err) {
      console.warn('[ENV] ⚠️ Impossible de récupérer network-info:', err.message);
      return null;
    }
  },

  testBackendConnection: async () => {
    try {
      console.log('[ENV] 🔌 Test connexion backend:', BACKEND_URL);
      const res = await fetch(`${BACKEND_URL}/health`, { 
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      if (res.ok) {
        console.log('[ENV] ✅ Backend accessible');
        return true;
      }
    } catch (err) {
      console.warn('[ENV] ❌ Backend inaccessible:', err.message);
    }
    return false;
  },

  getInfo: () => ({
    environment: ENV_CONFIG.environment,
    hostname: currentHostname,
    backend: BACKEND_URL,
    socket: SOCKET_URL,
    frontend: ENV_CONFIG.FRONTEND_URL,
  }),
};

// ═══════════════════════════════════════════════════════════════
// LOG DE DÉMARRAGE
// ═══════════════════════════════════════════════════════════════
console.log('');
console.log('╔══════════════════════════════════════════════════════════════╗');
console.log('║                     NA²QUIZ ENVIRONMENT                      ║');
console.log('╠══════════════════════════════════════════════════════════════╣');
console.log(`║  🌍 Environnement : ${ENV_CONFIG.environment.padEnd(42)}║`);
console.log(`║  🖥️  Hostname      : ${currentHostname.padEnd(42)}║`);
console.log(`║  🔗 Backend       : ${BACKEND_URL.padEnd(42)}║`);
console.log(`║  🔌 Socket        : ${SOCKET_URL.padEnd(42)}║`);
console.log(`║  🖥️  Frontend      : ${ENV_CONFIG.FRONTEND_URL.padEnd(42)}║`);
if (isLocalNetwork) {
  console.log('╠══════════════════════════════════════════════════════════════╣');
  console.log(`║  📡 IP prioritaire → Backend : ${BACKEND_URL}`.padEnd(64) + '║');
}
console.log('╚══════════════════════════════════════════════════════════════╝');
console.log('');

export default ENV_CONFIG;