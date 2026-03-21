// public/loader.js
(function () {
  'use strict';

  var root   = document.getElementById('root');
  var loader = document.getElementById('app-loader');
  if (!root || !loader) return;

  // Masquer le loader dès que React injecte le premier composant
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

  // Fallback 8s
  setTimeout(function () {
    if (loader.parentNode) loader.parentNode.removeChild(loader);
    observer.disconnect();
  }, 8000);

  // Vérification backend — URL relative (Netlify Functions)
  fetch('/api/health')
    .then(function (r) {
      console.log('[Loader] ✅ Backend accessible — statut:', r.status);
    })
    .catch(function () {
      console.warn('[Loader] ⚠️ Backend non accessible');
    });
})();
