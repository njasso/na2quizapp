# NA²QUIZ — Guide de Déploiement Netlify + MongoDB Atlas
## Architecture Cloud

```
┌─────────────────────────────────────────────────────────────────┐
│                        NA²QUIZ PRODUCTION                       │
├──────────────────┬──────────────────────┬───────────────────────┤
│    FRONTEND      │    API REST           │   TEMPS RÉEL          │
│  Netlify (CDN)   │  Netlify Functions   │   Railway/Render      │
│                  │  (serverless)         │   (Socket.IO)         │
│  React CRA       │  Express + Mongoose   │   socket-server/      │
│  Gratuit         │  Gratuit (100k/mois)  │   Gratuit (hobby)     │
└──────────────────┴──────────────────────┴───────────────────────┘
                                │
                    ┌───────────▼──────────┐
                    │   MongoDB Atlas       │
                    │   (Cloud DB)          │
                    │   Free tier (512MB)   │
                    │   + Compass GUI       │
                    └──────────────────────┘
```

---

## ÉTAPE 1 — MongoDB Atlas (base de données cloud)

### 1.1 Créer le cluster
1. Aller sur **https://cloud.mongodb.com**
2. Créer un compte (gratuit)
3. **Create a Project** → "NA2Quiz"
4. **Build a Database** → choisir **Free (M0 Shared)**
5. Provider: **AWS**, Région: **eu-west-1 (Paris)** ou la plus proche
6. Cluster Name: `na2quiz`

### 1.2 Configurer l'accès
1. **Database Access** → Add New Database User
   - Username: `na2quiz_user`
   - Password: générer un mot de passe fort (noter le)
   - Role: **Read and write to any database**

2. **Network Access** → Add IP Address
   - Pour Netlify Functions: **Allow Access from Anywhere** (0.0.0.0/0)
   - ⚠️ En production, restreindre aux IPs Netlify si possible

### 1.3 Obtenir la chaîne de connexion
1. **Connect** → **Connect your application**
2. Driver: Node.js, Version: 5.5 or later
3. Copier la connection string :
   ```
   mongodb+srv://na2quiz_user:<password>@na2quiz.xxxxx.mongodb.net/na2quiz?retryWrites=true&w=majority
   ```
4. Remplacer `<password>` par le mot de passe créé

### 1.4 Connecter MongoDB Compass
1. Télécharger **MongoDB Compass** : https://www.mongodb.com/products/compass
2. Coller la connection string dans Compass
3. Tu peux maintenant voir, modifier et gérer tes données en local !

---

## ÉTAPE 2 — Socket Server sur Railway

### 2.1 Déployer le socket-server
1. Aller sur **https://railway.app** → Se connecter avec GitHub
2. **New Project** → **Deploy from GitHub repo**
   - (ou **New Project** → **Deploy from local** si pas sur GitHub)
3. Sélectionner le repo, **Root Directory** : `socket-server`

### 2.2 Variables d'environnement Railway
Dans Railway → Variables :
```
PORT=4000
FRONTEND_URL=https://VOTRE-SITE.netlify.app   ← remplir après étape 3
NODE_ENV=production
```

### 2.3 Obtenir l'URL Railway
Après déploiement : copier l'URL publique (ex: `https://na2quiz-socket.railway.app`)

---

## ÉTAPE 3 — Frontend + API sur Netlify

### 3.1 Préparer le repo
Structure finale du projet :
```
ton-repo/
├── netlify.toml                ← COPIER depuis ce guide
├── netlify/
│   └── functions/
│       ├── api.js              ← COPIER depuis ce guide
│       └── package.json        ← COPIER depuis ce guide
├── frontend/                   ← ton frontend React
│   ├── public/
│   │   └── _redirects          ← COPIER depuis ce guide
│   └── .env.production         ← COPIER et remplir
└── socket-server/              ← ton serveur Socket.IO
```

### 3.2 Connecter à Netlify
1. **https://app.netlify.com** → Add new site → Import from Git
2. Autoriser l'accès à ton repo GitHub
3. **Build settings** :
   - Base directory: `frontend`
   - Build command: `npm run build`
   - Publish directory: `frontend/build`
4. Ne pas builder encore — configurer les variables d'abord

### 3.3 Variables d'environnement Netlify
**Site Settings** → **Environment Variables** → Add variable :

| Variable | Valeur |
|----------|--------|
| `MONGODB_URI` | `mongodb+srv://na2quiz_user:MOT_DE_PASSE@na2quiz.xxx.mongodb.net/na2quiz` |
| `JWT_SECRET` | `na2quiz_production_secret_CHANGER_CECI_2024` |
| `DEEPSEEK_API_KEY` | `sk-ec935c2782e74bbfbfae4be91863672c` |
| `FRONTEND_URL` | `https://VOTRE-SITE.netlify.app` |
| `NODE_ENV` | `production` |
| `CI` | `false` |
| `GENERATE_SOURCEMAP` | `false` |

### 3.4 Déployer
1. **Trigger Deploy** → Deploy site
2. Attendre ~3 minutes
3. L'URL sera : `https://[nom-généré].netlify.app`

### 3.5 Configurer un domaine personnalisé (optionnel)
**Domain Management** → Add custom domain → `na2quiz.ton-domaine.com`

---

## ÉTAPE 4 — Finaliser les URLs croisées

### 4.1 Mettre à jour Railway avec l'URL Netlify
Dans Railway Variables :
```
FRONTEND_URL=https://[TON-SITE].netlify.app
```

### 4.2 Mettre à jour .env.production du frontend
```
REACT_APP_SOCKET_URL=https://[TON-SOCKET].railway.app
```
Puis redéployer Netlify.

### 4.3 Mettre à jour les composants React
Dans tes composants qui utilisent Socket.IO, remplacer :
```javascript
// AVANT (local)
const NODE_BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';
const io = require('socket.io-client')(NODE_BACKEND_URL);

// APRÈS (production)
const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:4000';
const API_URL    = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';
const io = require('socket.io-client')(SOCKET_URL);
// Les appels axios → API_URL reste pareil
```

---

## ÉTAPE 5 — Vérifications

### Tests à effectuer
```bash
# 1. Health check API
curl https://[TON-SITE].netlify.app/api/health

# 2. Health check socket
curl https://[TON-SOCKET].railway.app/health

# 3. Test connexion DB
curl https://[TON-SITE].netlify.app/api/check-config
```

### Réponses attendues
```json
// /api/health
{"status":"UP","db":"connected","ts":"2024-..."}

// /health (socket)
{"status":"UP","connections":0}

// /api/check-config
{"deepseek":true,"mongodb":true,"jwt":true}
```

---

## ÉTAPE 6 — Migrer les données locales vers Atlas

Si tu as des données en local à migrer :

```bash
# Exporter depuis MongoDB local
mongodump --db na2quiz --out ./backup

# Importer vers Atlas
mongorestore --uri "mongodb+srv://na2quiz_user:MOT_DE_PASSE@na2quiz.xxx.mongodb.net" \
  --db na2quiz ./backup/na2quiz
```

Ou utiliser **MongoDB Compass** → Import Data depuis des fichiers JSON/CSV.

---

## Limites du plan gratuit

| Service | Limite gratuite |
|---------|----------------|
| Netlify | 300 min build/mois, 100GB bandwidth, 125k function calls/mois |
| Railway | $5 crédit/mois (~500h de runtime) |
| MongoDB Atlas | 512MB stockage, connexions partagées |

Pour une utilisation scolaire légère, ces limites sont largement suffisantes.

---

## Structure des fichiers à copier

```
📁 Copier dans la racine du projet :
   netlify.toml

📁 Créer netlify/functions/ :
   api.js
   package.json

📁 Dans frontend/public/ :
   _redirects

📁 Dans frontend/ :
   .env.production  (renommer depuis .env.production)

📁 Dans socket-server/ :
   server.js  (remplacer l'existant)
   package.json
   .env.example → copier en .env et remplir
```
