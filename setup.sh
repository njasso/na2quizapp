#!/bin/bash
# ─────────────────────────────────────────────────────────────
#  NA²QUIZ — Setup complet
#  Lance depuis : ~/Bureau/deplo/na2quiz APP/
#  Pré-requis : frontend.zip et backend.zip dans ce dossier
# ─────────────────────────────────────────────────────────────

set -e
ROOT="$(pwd)"
PATCH_DIR="$ROOT/deploy"

echo "🚀 NA²QUIZ — Setup complet"
echo "📂 Dossier : $ROOT"
echo "─────────────────────────────────────────────"

# ── 1. Vérifier les ZIPs ─────────────────────────────────────
FRONTEND_ZIP=""
BACKEND_ZIP=""

# Chercher les ZIPs (noms variables)
for f in *.zip; do
  lower=$(echo "$f" | tr '[:upper:]' '[:lower:]')
  if [[ "$lower" == *"frontend"* ]]; then FRONTEND_ZIP="$f"; fi
  if [[ "$lower" == *"backend"* ]]; then  BACKEND_ZIP="$f";  fi
done

if [ -z "$FRONTEND_ZIP" ]; then
  echo "❌  frontend.zip introuvable dans $(pwd)"
  echo "   Copie frontend.zip ici, puis relance le script."
  exit 1
fi

echo "📦 Frontend ZIP trouvé : $FRONTEND_ZIP"
echo "📦 Backend ZIP trouvé  : ${BACKEND_ZIP:-⚠️  non trouvé (optionnel)}"
echo ""

# ── 2. Extraire frontend ──────────────────────────────────────
if [ -d "frontend" ]; then
  echo "📁 Dossier frontend/ déjà présent — extraction ignorée"
else
  echo "📦 Extraction de $FRONTEND_ZIP..."
  unzip -q "$FRONTEND_ZIP" -d frontend_tmp

  # Détecter si le zip contient un sous-dossier unique
  TOP=$(ls frontend_tmp/ | head -1)
  if [ -d "frontend_tmp/$TOP/src" ]; then
    mv "frontend_tmp/$TOP" frontend
    rm -rf frontend_tmp
    echo "   ✅ frontend/ créé depuis frontend_tmp/$TOP"
  elif [ -d "frontend_tmp/src" ]; then
    mv frontend_tmp frontend
    echo "   ✅ frontend/ créé"
  else
    # Peut-être que le zip s'appelle autrement (na2quiz-frontend, etc.)
    mv frontend_tmp frontend
    echo "   ✅ frontend/ créé (structure auto-détectée)"
  fi
fi

# Vérifier que src/ est bien là
if [ ! -d "frontend/src" ]; then
  echo "❌  frontend/src/ introuvable après extraction."
  echo "   Contenu de frontend/ :"
  ls frontend/
  echo ""
  echo "   Si le code React est dans un sous-dossier, ajuster manuellement :"
  echo "   mv frontend/NOM_DU_SOUS_DOSSIER frontend_real && mv frontend_real frontend"
  exit 1
fi
echo "   ✅ frontend/src/ confirmé"

# ── 3. Extraire backend (optionnel) ──────────────────────────
if [ -n "$BACKEND_ZIP" ]; then
  if [ -d "socket-server" ]; then
    echo "📁 socket-server/ déjà présent — extraction ignorée"
  else
    echo "📦 Extraction de $BACKEND_ZIP..."
    unzip -q "$BACKEND_ZIP" -d backend_tmp
    TOP=$(ls backend_tmp/ | head -1)
    if [ -d "backend_tmp/$TOP" ]; then
      mv "backend_tmp/$TOP" socket-server
      rm -rf backend_tmp
    else
      mv backend_tmp socket-server
    fi
    echo "   ✅ socket-server/ créé"
  fi
fi

# ── 4. Créer les dossiers manquants ──────────────────────────
mkdir -p frontend/src/api
mkdir -p frontend/src/config
mkdir -p frontend/src/utils
mkdir -p frontend/src/hooks
mkdir -p frontend/src/pages
mkdir -p frontend/src/components
mkdir -p frontend/src/services
mkdir -p frontend/public

# ── 5. Lancer install_patches.sh ─────────────────────────────
echo ""
echo "🔧 Lancement des patches..."
bash "$PATCH_DIR/install_patches.sh"

echo ""
echo "─────────────────────────────────────────────"
echo "✅ Setup terminé !"
echo ""
echo "📋 PROCHAINES ÉTAPES :"
echo "  1. MongoDB Atlas  → copier l'URI dans MONGODB_URI"
echo "  2. Railway        → déployer socket-server/"
echo "  3. Netlify        → connecter le repo GitHub"
echo "  4. Voir DEPLOY.md pour le guide complet"
