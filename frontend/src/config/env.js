// src/config/env.js - VERSION ULTIME CORRIGÉE
const currentHostname = window.location.hostname;
const currentPort = window.location.port;
const currentOrigin = window.location.origin;

const isLocalhost = currentHostname === 'localhost' || currentHostname === '127.0.0.1';

// ✅ Détection IP locale améliorée
const isLocalNetwork = 
  currentHostname.startsWith('192.168.') ||
  currentHostname.startsWith('10.') ||
  /^172\.(1[6-9]|2\d|3[01])\./.test(currentHostname) ||
  /^\d+\.\d+\.\d+\.\d+$/.test(currentHostname);

const isProduction = !isLocalhost && !isLocalNetwork;

const SERVER_PORT = 5000;

// ✅ Construction dynamique du backend URL
const resolveBackendUrl = () => {
  // 1. Priorité .env
  if (process.env.REACT_APP_BACKEND_URL) {
    console.log('[ENV] 📡 Backend depuis .env:', process.env.REACT_APP_BACKEND_URL);
    return process.env.REACT_APP_BACKEND_URL;
  }
  
  // 2. Réseau local (IP) - FORCER l'IP actuelle
  if (isLocalNetwork) {
    const url = `http://${currentHostname}:${SERVER_PORT}`;
    console.log('[ENV] 📡 Backend auto-détecté (réseau local):', url);
    return url;
  }
  
  // 3. Localhost
  if (isLocalhost) {
    const url = `http://localhost:${SERVER_PORT}`;
    console.log('[ENV] 📡 Backend auto-détecté (localhost):', url);
    return url;
  }
  
  // 4. Production
  console.log('[ENV] 📡 Backend production (par défaut)');
  return 'https://na2quizapp.onrender.com';
};

// ✅ Construction dynamique du Socket URL (IDENTIQUE au backend)
const resolveSocketUrl = () => {
  if (process.env.REACT_APP_SOCKET_URL) {
    return process.env.REACT_APP_SOCKET_URL;
  }
  // ✅ IMPORTANT: Socket doit utiliser la MÊME URL que le backend
  return resolveBackendUrl();
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
  console.log(`║  📡 Accès réseau  : http://${currentHostname}:3000`.padEnd(64) + '║');
  console.log(`║  🔌 API backend   : ${BACKEND_URL}`.padEnd(64) + '║');
}
console.log('╚══════════════════════════════════════════════════════════════╝');
console.log('');

export default ENV_CONFIG;