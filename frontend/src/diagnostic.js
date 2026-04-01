// src/tools/diagnostic.js
export function runDiagnostics() {
  console.log("=== Diagnostic QuizApp ===");

  try {
    // Vérifier le token
    const token = localStorage.getItem('token');
    if (!token) {
      console.warn("⚠️ Aucun token trouvé. L'utilisateur n'est peut-être pas connecté.");
    }

    // Vérifier les modules critiques
    const requiredModules = [
      'HomePage',
      'DashboardPage',
      'ComposeQuizPage',
      'AIGeneratorPage',
      'StatisticsPage',
      'PrintResultsPage'
    ];

    requiredModules.forEach(module => {
      try {
        require(`../pages/${module}`);
        console.log(`✅ ${module} chargé correctement.`);
      } catch (err) {
        console.error(`❌ Erreur de chargement du module : ${module}`, err.message);
      }
    });

    // Vérification du CSS
    const style = document.createElement('style');
    document.head.appendChild(style);
    console.log("✅ CSS injecté et modifiable.");

    console.log("✅ Diagnostic terminé.");
  } catch (err) {
    console.error("❌ Problème détecté dans le diagnostic global :", err);
  }
}
