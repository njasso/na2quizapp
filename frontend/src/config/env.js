// src/config/env.js - VERSION CORRIGÉE
const currentHostname = window.location.hostname;
const currentPort = window.location.port;
const currentOrigin = window.location.origin;

const isLocalhost = currentHostname === 'localhost' || currentHostname === '127.0.0.1';

// ✅ Détection IP locale améliorée
const isLocalNetwork = 
  currentHostname.startsWith('192.168.') ||
  currentHostname.startsWith('10.') ||
  /^172\.(1[6-9]|2\d|3[01])\./.test(currentHostname) ||
  /^\d+\.\d+\.\d+\.\d+$/.test(currentHostname); // Toute IP numérique

const isProduction = !isLocalhost && !isLocalNetwork;

// ✅ SERVEUR - port backend (5000 par défaut)
const SERVER_PORT = 5000;

// ✅ Construction dynamique du backend URL
const resolveBackendUrl = () => {
  // 1. Priorité .env
  if (process.env.REACT_APP_BACKEND_URL) {
    console.log('[ENV] 📡 Backend depuis .env:', process.env.REACT_APP_BACKEND_URL);
    return process.env.REACT_APP_BACKEND_URL;
  }
  
  // 2. Réseau local (IP)
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

const ENV_CONFIG = {
  BACKEND_URL: resolveBackendUrl(),
  SOCKET_URL: process.env.REACT_APP_SOCKET_URL || resolveBackendUrl(),
  TERMINAL_URL: process.env.REACT_APP_TERMINAL_URL || `${resolveBackendUrl()}/terminal.html`,
  FRONTEND_URL: process.env.REACT_APP_FRONTEND_URL || currentOrigin,

  currentHostname,
  currentPort,
  isLocalhost,
  isLocalNetwork,
  isProduction,
  environment: isProduction ? 'production' : (isLocalNetwork ? 'local-network' : 'localhost'),
  
  // ✅ NOUVEAU: Récupérer l'IP locale depuis le serveur
  fetchNetworkInfo: async () => {
    try {
      const backendUrl = resolveBackendUrl();
      console.log('[ENV] 🌐 fetchNetworkInfo depuis:', backendUrl);
      const res = await fetch(`${backendUrl}/api/network-info`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      console.log('[ENV] ✅ Network info récupérée:', data);
      return data;
    } catch (err) {
      console.warn('[ENV] ⚠️ Impossible de récupérer network-info:', err.message);
      return null;
    }
  },

  // ✅ NOUVEAU: Tester la connexion au backend
  testBackendConnection: async () => {
    try {
      const backendUrl = resolveBackendUrl();
      console.log('[ENV] 🔌 Test connexion backend:', backendUrl);
      const res = await fetch(`${backendUrl}/health`, { 
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
    backend: ENV_CONFIG.BACKEND_URL,
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
console.log(`║  🔗 Backend       : ${ENV_CONFIG.BACKEND_URL.padEnd(42)}║`);
console.log(`║  🖥️  Frontend      : ${ENV_CONFIG.FRONTEND_URL.padEnd(42)}║`);
if (isLocalNetwork) {
  console.log('╠══════════════════════════════════════════════════════════════╣');
  console.log(`║  📡 Accès réseau  : http://${currentHostname}:3000`.padEnd(64) + '║');
  console.log(`║  🔌 API backend   : ${ENV_CONFIG.BACKEND_URL}`.padEnd(64) + '║');
}
console.log('╚══════════════════════════════════════════════════════════════╝');
console.log('');

export default ENV_CONFIG;