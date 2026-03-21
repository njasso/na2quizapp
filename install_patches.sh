#!/bin/bash
# ─────────────────────────────────────────────────────────────
#  NA²QUIZ — Installation des patches Netlify
#  Lance depuis la RACINE du projet
#  Usage : bash deploy/install_patches.sh
# ─────────────────────────────────────────────────────────────

set -e

PATCH_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(pwd)"

echo "🚀 NA²QUIZ — Installation des patches Netlify"
echo "📂 Racine : $ROOT"
echo "─────────────────────────────────────────────"

# ══════════════════════════════════════════════════════════════
#  ÉTAPE 0 : vérifier / extraire frontend.zip
# ══════════════════════════════════════════════════════════════

if [ ! -d "$ROOT/frontend" ]; then
  echo ""
  echo "⚠️  Dossier frontend/ introuvable."
  echo "   Recherche d'un ZIP frontend..."

  FZIP=$(find "$ROOT" -maxdepth 1 -iname "*frontend*.zip" 2>/dev/null | head -1)

  if [ -n "$FZIP" ]; then
    echo "   📦 ZIP trouvé : $(basename $FZIP)"
    echo "   Extraction en cours..."
    unzip -q "$FZIP" -d "$ROOT/_ftmp"

    # Détecter si le zip a un sous-dossier unique contenant src/
    INNER=$(find "$ROOT/_ftmp" -maxdepth 1 -mindepth 1 -type d | head -1)
    if [ -n "$INNER" ] && [ -d "$INNER/src" ]; then
      mv "$INNER" "$ROOT/frontend"
      rm -rf "$ROOT/_ftmp"
    elif [ -d "$ROOT/_ftmp/src" ]; then
      mv "$ROOT/_ftmp" "$ROOT/frontend"
    else
      # sous-dossier sans src — monter d'un niveau
      INNER2=$(find "$ROOT/_ftmp" -name "src" -maxdepth 3 | head -1 | xargs dirname 2>/dev/null)
      if [ -n "$INNER2" ]; then
        mv "$INNER2" "$ROOT/frontend"
        rm -rf "$ROOT/_ftmp"
      else
        mv "$ROOT/_ftmp" "$ROOT/frontend"
      fi
    fi
    echo "   ✅ frontend/ extrait"
  else
    echo ""
    echo "❌  Impossible de trouver un frontend.zip dans $ROOT"
    echo ""
    echo "   Copier frontend.zip ici puis relancer :"
    echo "     cp /chemin/vers/frontend.zip $ROOT/"
    echo "     bash deploy/install_patches.sh"
    exit 1
  fi
fi

# Vérifier que src/ existe dans frontend/
if [ ! -d "$ROOT/frontend/src" ]; then
  echo "❌  frontend/src/ introuvable — structure incorrecte."
  echo "   Contenu de frontend/ :"
  ls "$ROOT/frontend/" | head -15
  exit 1
fi

echo "   ✅ frontend/src/ confirmé"

# ══════════════════════════════════════════════════════════════
#  ÉTAPE 1 : netlify.toml
# ══════════════════════════════════════════════════════════════
echo ""
echo "📋 netlify.toml..."
cp "$PATCH_DIR/netlify.toml" "$ROOT/netlify.toml"
echo "   ✅ netlify.toml"

# ══════════════════════════════════════════════════════════════
#  ÉTAPE 2 : Netlify Functions
# ══════════════════════════════════════════════════════════════
echo "⚡ Netlify Functions..."
mkdir -p "$ROOT/netlify/functions"
cp "$PATCH_DIR/netlify/functions/api.js"       "$ROOT/netlify/functions/api.js"
cp "$PATCH_DIR/netlify/functions/package.json" "$ROOT/netlify/functions/package.json"
echo "   ✅ netlify/functions/api.js"
echo "   ✅ netlify/functions/package.json"

# ══════════════════════════════════════════════════════════════
#  ÉTAPE 3 : Créer tous les sous-dossiers src/ manquants
# ══════════════════════════════════════════════════════════════
FSRC="$ROOT/frontend/src"
FPUB="$ROOT/frontend/public"
mkdir -p "$FSRC/api" "$FSRC/config" "$FSRC/utils"
mkdir -p "$FSRC/hooks" "$FSRC/pages" "$FSRC/components" "$FSRC/services"
mkdir -p "$FPUB"
echo "   ✅ Dossiers src/ vérifiés"

# ══════════════════════════════════════════════════════════════
#  Fonction helper : copier si le fichier source existe
# ══════════════════════════════════════════════════════════════
copy_patch() {
  local from="$1" to="$2"
  if [ -f "$from" ]; then
    cp "$from" "$to"
    echo "   ✅ $(basename $to)"
  else
    echo "   ⚠️  patch manquant : $(basename $from)"
  fi
}

FP="$PATCH_DIR/frontend-patch"

# ══════════════════════════════════════════════════════════════
#  ÉTAPE 4 : Config centrale
# ══════════════════════════════════════════════════════════════
echo "🔧 Config centrale..."
copy_patch "$FP/src/config.js"             "$FSRC/config.js"
copy_patch "$FP/src/api/client.js"         "$FSRC/api/client.js"
copy_patch "$FP/src/services/api.js"       "$FSRC/services/api.js"
copy_patch "$FP/src/config/api.js"         "$FSRC/config/api.js"
copy_patch "$FP/src/utils/axiosConfig.js"  "$FSRC/utils/axiosConfig.js"

# ══════════════════════════════════════════════════════════════
#  ÉTAPE 5 : Pages
# ══════════════════════════════════════════════════════════════
echo "📄 Pages..."
for f in AIQuizCreation.jsx ResultsPage.jsx ProfileExamPage.jsx \
         WaitingPage.jsx QuizCompositionPage.jsx SurveillancePage.jsx \
         ReportsPage.jsx ExamsPage.jsx ExamScreen.js PreviewExamPage.jsx; do
  copy_patch "$FP/src/pages/$f" "$FSRC/pages/$f"
done

# ══════════════════════════════════════════════════════════════
#  ÉTAPE 6 : Hooks
# ══════════════════════════════════════════════════════════════
echo "🪝 Hooks..."
copy_patch "$FP/src/hooks/useTerminalWebSocket.js" "$FSRC/hooks/useTerminalWebSocket.js"
copy_patch "$FP/src/hooks/useTerminalPolling.js"   "$FSRC/hooks/useTerminalPolling.js"

# ══════════════════════════════════════════════════════════════
#  ÉTAPE 7 : Composants
# ══════════════════════════════════════════════════════════════
copy_patch "$FP/src/components/SeedCatfishQuiz.jsx" "$FSRC/components/SeedCatfishQuiz.jsx"
copy_patch "$FP/src/components/QuizQuestions.jsx"   "$FSRC/components/QuizQuestions.jsx"

# ══════════════════════════════════════════════════════════════
#  ÉTAPE 8 : package.json (suppression deps backend + proxy)
# ══════════════════════════════════════════════════════════════
echo "📦 package.json..."
copy_patch "$FP/package.json" "$ROOT/frontend/package.json"

# ══════════════════════════════════════════════════════════════
#  ÉTAPE 9 : _redirects + .env.production
# ══════════════════════════════════════════════════════════════
echo "🔀 Public + env..."
copy_patch "$FP/_redirects" "$FPUB/_redirects"
if [ ! -f "$ROOT/frontend/.env.production" ]; then
  copy_patch "$FP/.env.production" "$ROOT/frontend/.env.production"
  echo "   ⚠️  Remplir frontend/.env.production avec MONGODB_URI et REACT_APP_SOCKET_URL"
else
  echo "   ℹ️  .env.production déjà présent — non écrasé"
fi

# ══════════════════════════════════════════════════════════════
#  ÉTAPE 10 : Socket server
# ══════════════════════════════════════════════════════════════
echo "🔌 Socket server..."
mkdir -p "$ROOT/socket-server"
copy_patch "$PATCH_DIR/socket-server/server.js"    "$ROOT/socket-server/server.js"
copy_patch "$PATCH_DIR/socket-server/package.json" "$ROOT/socket-server/package.json"
if [ ! -f "$ROOT/socket-server/.env" ]; then
  copy_patch "$PATCH_DIR/socket-server/.env.example" "$ROOT/socket-server/.env"
fi

echo ""
echo "─────────────────────────────────────────────"
echo "✅ Tous les patches appliqués !"
echo ""
echo "📋 PROCHAINES ÉTAPES :"
echo "  1. Remplir frontend/.env.production"
echo "     → MONGODB_URI=mongodb+srv://..."
echo "     → REACT_APP_SOCKET_URL=https://xxx.railway.app"
echo "  2. Déployer socket-server/ sur Railway"
echo "  3. Connecter ce repo à Netlify (build: frontend/)"
echo "  4. Ajouter les variables dans Netlify UI"
echo "  5. git add . && git commit && git push"
echo ""
echo "📖 Voir deploy/DEPLOY.md pour le guide complet"
