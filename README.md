# NA²QUIZ — Déploiement Netlify · Checklist rapide

## Ordre d'installation

```bash
# 1. Extraire le ZIP dans la racine de ton projet
unzip na2quiz-netlify-deploy.zip

# 2. Lancer le script d'installation automatique
bash deploy/install_patches.sh

# 3. Vérifier que tout est copié
# (le script affiche ✅ pour chaque fichier)
```

---

## Checklist complète

### MongoDB Atlas
- [ ] Cluster M0 créé sur https://cloud.mongodb.com
- [ ] Utilisateur `na2quiz_user` créé avec mot de passe fort
- [ ] IP `0.0.0.0/0` autorisée (Network Access)
- [ ] Connection string copiée
- [ ] Testé avec MongoDB Compass ✅

### Socket Server (Railway)
- [ ] Repo GitHub créé avec le dossier `socket-server/`
- [ ] Déployé sur https://railway.app
- [ ] Variable `FRONTEND_URL` configurée dans Railway
- [ ] URL publique notée : `https://_______.railway.app`

### Netlify
- [ ] Repo GitHub connecté
- [ ] Build settings : base=`frontend`, publish=`frontend/build`
- [ ] Toutes les variables de `NETLIFY_ENV_VARS.env.example` configurées
- [ ] `REACT_APP_SOCKET_URL` = URL Railway
- [ ] `MONGODB_URI` = connection string Atlas
- [ ] Premier build réussi ✅

### Post-déploiement
- [ ] `https://[site].netlify.app/api/health` → `{"status":"UP","db":"connected"}`
- [ ] `https://[socket].railway.app/health` → `{"status":"UP"}`
- [ ] Login / register fonctionnel
- [ ] Création d'épreuve fonctionnelle
- [ ] Socket temps réel fonctionnel (SurveillancePage)

---

## Fichiers modifiés par `install_patches.sh`

| Fichier | Modification |
|---------|-------------|
| `netlify.toml` | Configuration build + redirects API |
| `netlify/functions/api.js` | API REST serverless complète |
| `netlify/functions/package.json` | Dépendances serverless |
| `frontend/package.json` | Backend deps supprimées, `proxy` retiré |
| `frontend/public/_redirects` | SPA fallback |
| `frontend/.env.production` | Variables de build |
| `frontend/src/config.js` | Config centralisée (API_URL + SOCKET_URL) |
| `frontend/src/api/client.js` | Client Axios unifié |
| `frontend/src/services/api.js` | Toutes les fonctions API |
| `frontend/src/config/api.js` | Config axios |
| `frontend/src/utils/axiosConfig.js` | Axios config |
| `frontend/src/pages/AIQuizCreation.jsx` | URLs hardcodées → env |
| `frontend/src/pages/ResultsPage.jsx` | IP fixe → env |
| `frontend/src/pages/ProfileExamPage.jsx` | API_URL / SOCKET_URL séparés |
| `frontend/src/pages/WaitingPage.jsx` | SOCKET_URL séparé |
| `frontend/src/pages/QuizCompositionPage.jsx` | SOCKET_URL séparé |
| `frontend/src/pages/SurveillancePage.jsx` | SOCKET_URL séparé |
| `frontend/src/pages/ReportsPage.jsx` | Fallback env |
| `frontend/src/pages/ExamsPage.jsx` | Fallback env |
| `frontend/src/pages/ExamScreen.js` | Fallback env |
| `frontend/src/pages/PreviewExamPage.jsx` | SOCKET_URL séparé |
| `frontend/src/hooks/useTerminalWebSocket.js` | SOCKET_URL séparé |
| `frontend/src/hooks/useTerminalPolling.js` | Fallback env |
| `frontend/src/components/SeedCatfishQuiz.jsx` | URL → env |
| `frontend/src/components/QuizQuestions.jsx` | URL → env |
| `socket-server/server.js` | Socket.IO standalone Railway |
| `socket-server/package.json` | Dépendances socket |

**Total : 27 fichiers**

---

## Architecture en production

```
Étudiant / Superviseur
        │
        ▼
https://na2quiz.netlify.app    ← React CRA (CDN Netlify)
        │
        ├── /api/*  ──────────► /.netlify/functions/api.js
        │                       (MongoDB Atlas ← serverless)
        │
        └── Socket.IO ────────► https://na2quiz-socket.railway.app
                                (temps réel: distribution, surveillance)
                                       │
                               MongoDB Atlas (sessions en mémoire,
                               pas de persistance Socket.IO)
```

## En cas de problème de build Netlify

```bash
# Erreur "Module not found: mongoose"
# → Vérifier que netlify/functions/package.json est présent et installé
# → Dans Netlify UI: Functions > Show compile errors

# Erreur "react-scripts: command not found"
# → Base directory doit être "frontend", pas la racine

# Erreur CORS
# → Vérifier FRONTEND_URL dans les variables Netlify
# → Vérifier REACT_APP_SOCKET_URL pointe vers Railway

# Build qui prend trop de temps
# → Vérifier que GENERATE_SOURCEMAP=false dans les variables
```
