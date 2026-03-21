// public/loader.js
(function () {
  'use strict';

  // ✅ Utiliser la même IP que le backend (cohérent avec ProfileExamPage)
  const BACKEND_IP = '192.168.0.1';
  const BACKEND_PORT = '5000';
  const BACKEND_URL = `http://${BACKEND_IP}:${BACKEND_PORT}`;

  console.log('[Loader] Backend URL:', BACKEND_URL);

  var root    = document.getElementById('root');
  var loader  = document.getElementById('app-loader');

  if (!root || !loader) return;

  // Observer l'injection du premier composant React
  var observer = new MutationObserver(function () {
    if (root.children.length > 0) {
      loader.classList.add('hidden');
      setTimeout(function () {
        if (loader.parentNode) loader.parentNode.removeChild(loader);
      }, 450);
      observer.disconnect();
    }
  });

  observer.observe(root, { childList: true });

  // Fallback de sécurité après 8 secondes
  setTimeout(function () {
    if (loader.parentNode) {
      loader.parentNode.removeChild(loader);
    }
    observer.disconnect();
  }, 8000);

  // Vérification de la connexion au backend (optionnel)
  fetch(`${BACKEND_URL}/api/exams`)
    .then(response => {
      if (response.ok) {
        console.log('[Loader] ✅ Backend accessible sur', BACKEND_URL);
      } else {
        console.warn('[Loader] ⚠️ Backend répond avec statut:', response.status);
      }
    })
    .catch(err => {
      console.warn('[Loader] ⚠️ Backend non accessible:', err.message);
      console.warn('[Loader] Vérifiez que le backend est démarré sur', BACKEND_URL);
    });
})();