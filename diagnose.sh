#!/bin/bash
# ─────────────────────────────────────────────────────────────
#  NA²QUIZ — Diagnostic de structure
#  Lance depuis la racine du projet
# ─────────────────────────────────────────────────────────────

echo "📂 Dossier courant : $(pwd)"
echo ""
echo "=== CONTENU DE LA RACINE ==="
ls -la | head -30
echo ""
echo "=== RECHERCHE src/App.js ou App.jsx ==="
find . -name "App.js" -o -name "App.jsx" 2>/dev/null | grep -v node_modules | head -10
echo ""
echo "=== RECHERCHE src/config.js existant ==="
find . -name "config.js" 2>/dev/null | grep -v node_modules | head -10
echo ""
echo "=== RECHERCHE package.json (hors node_modules) ==="
find . -name "package.json" -not -path "*/node_modules/*" | head -10
echo ""
echo "=== RECHERCHE vite.config ou react-scripts ==="
find . \( -name "vite.config.js" -o -name "vite.config.ts" \) -not -path "*/node_modules/*" | head -5
grep -r "react-scripts" --include="package.json" -l 2>/dev/null | grep -v node_modules | head -5
echo ""
echo "=== STRUCTURE (2 niveaux) ==="
find . -maxdepth 3 -not -path "*/node_modules/*" -not -path "*/.git/*" -not -name "*.log" | sort | head -60
