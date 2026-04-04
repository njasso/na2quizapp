// src/config/env.js
// Configuration centralisée pour tous les environnements

const isLocalhost = window.location.hostname === 'localhost' || 
                    window.location.hostname === '127.0.0.1' ||
                    window.location.hostname.startsWith('192.168.');

// URLs par environnement
const getBackendUrl = () => {
  if (isLocalhost) {
    return process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';
  }
  return process.env.REACT_APP_BACKEND_URL || 'https://na2quizapp.onrender.com';
};

const getSocketUrl = () => {
  if (isLocalhost) {
    return process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000';
  }
  return process.env.REACT_APP_SOCKET_URL || 'https://na2quizapp.onrender.com';
};

const getTerminalUrl = () => {
  if (isLocalhost) {
    return process.env.REACT_APP_TERMINAL_URL || 'http://localhost:5000/terminal.html';
  }
  return process.env.REACT_APP_TERMINAL_URL || 'https://na2quizapp.netlify.app/terminal.html';
};

const ENV_CONFIG = {
  BACKEND_URL: getBackendUrl(),
  SOCKET_URL: getSocketUrl(),
  TERMINAL_URL: getTerminalUrl(),
  isLocalhost,
  isProduction: !isLocalhost,
  APP_NAME: 'NA²QUIZ',
  VERSION: '5.0.0'
};

console.log('[ENV] Configuration chargée:', {
  BACKEND_URL: ENV_CONFIG.BACKEND_URL,
  SOCKET_URL: ENV_CONFIG.SOCKET_URL,
  TERMINAL_URL: ENV_CONFIG.TERMINAL_URL,
  isLocalhost: ENV_CONFIG.isLocalhost
});

export default ENV_CONFIG;