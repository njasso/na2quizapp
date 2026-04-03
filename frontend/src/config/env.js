// src/config/env.js - Configuration centralisée pour tout le projet

// Détection de l'environnement
const isLocalhost = () => {
  const hostname = window.location.hostname;
  return hostname === 'localhost' 
    || hostname === '127.0.0.1'
    || hostname === '192.168.0.1'
    || hostname === '192.168.106.51'
    || hostname.includes('.local');
};

const isDevelopment = process.env.NODE_ENV === 'development';
const isProduction = process.env.NODE_ENV === 'production';

// URLs dynamiques
const getBackendUrl = () => {
  // Priorité à la variable d'environnement
  if (process.env.REACT_APP_BACKEND_URL) {
    console.log('[ENV] Using env variable:', process.env.REACT_APP_BACKEND_URL);
    return process.env.REACT_APP_BACKEND_URL;
  }
  
  // Détection automatique
  if (isLocalhost() && isDevelopment) {
    return 'http://localhost:5000';
  }
  
  // Production
  return 'https://na2quizapp.onrender.com';
};

const getSocketUrl = () => {
  if (process.env.REACT_APP_SOCKET_URL) {
    return process.env.REACT_APP_SOCKET_URL;
  }
  return getBackendUrl();
};

const getTerminalUrl = () => {
  if (isLocalhost() && isDevelopment) {
    return 'http://localhost:5000/terminal.html';
  }
  return 'https://na2quizapp.onrender.com/terminal.html';
};

const ENV_CONFIG = {
  isLocalhost: isLocalhost(),
  isDevelopment,
  isProduction,
  BACKEND_URL: getBackendUrl(),
  SOCKET_URL: getSocketUrl(),
  TERMINAL_URL: getTerminalUrl(),
  FRONTEND_URL: isLocalhost() && isDevelopment ? 'http://localhost:3000' : 'https://na2quizapp.netlify.app',
};

console.log('[ENV] Configuration:', {
  isLocalhost: ENV_CONFIG.isLocalhost,
  isDevelopment: ENV_CONFIG.isDevelopment,
  BACKEND_URL: ENV_CONFIG.BACKEND_URL,
  SOCKET_URL: ENV_CONFIG.SOCKET_URL,
  TERMINAL_URL: ENV_CONFIG.TERMINAL_URL,
});

export default ENV_CONFIG;