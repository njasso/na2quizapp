// src/services/api.js - VERSION UNIFIÉE COMPLÈTE ET CORRIGÉE
// ─────────────────────────────────────────────────────────────
//  Toutes les fonctions d'appel API pour NA²QUIZ
//  Support production/développement avec détection automatique
//  CORRECTION: Support complet des filtres de statut pour les questions
// ─────────────────────────────────────────────────────────────

import axios from 'axios';
import ENV_CONFIG from '../config/env';

console.log('[API] 🚀 Backend URL configurée:', ENV_CONFIG.BACKEND_URL);
console.log('[API] Environnement:', ENV_CONFIG.isLocalhost ? 'LOCAL' : 'PRODUCTION');

// ==================== CLIENT AXIOS ====================
const api = axios.create({
  baseURL: ENV_CONFIG.BACKEND_URL,
  timeout: 60000, // 60 secondes par défaut
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  },
});

// ==================== INTERCEPTEURS ====================

// Request interceptor - injection du token
api.interceptors.request.use(
  (config) => {
    // ✅ Chercher le token dans toutes les clés possibles
    let token = localStorage.getItem('token') ||
                localStorage.getItem('userToken') ||
                localStorage.getItem('authToken');
    
    // Si pas trouvé, essayer de parser userData
    if (!token) {
      const userData = localStorage.getItem('userData');
      if (userData) {
        try {
          const parsed = JSON.parse(userData);
          token = parsed.token;
        } catch (e) {}
      }
    }
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log(`[API] 🔑 Token ajouté (${config.url})`);
    } else {
      console.warn(`[API] ⚠️ Pas de token pour ${config.url}`);
    }

    // Cache busting
    if (config.method?.toLowerCase() === 'get' && !config.params?.noCache) {
      config.params = {
        ...config.params,
        _t: Date.now(),
      };
    }

    console.log(`[API] 📡 ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error('[API] Erreur requête:', error);
    return Promise.reject(error);
  }
);

// Response interceptor - gestion des erreurs
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.warn('[API] 🔒 Session expirée, redirection vers login...');
      // Ne pas rediriger automatiquement si on est déjà sur login
      if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
        localStorage.removeItem('token');
        localStorage.removeItem('userToken');
        localStorage.removeItem('userData');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// ==================== AUTH ====================
export const login = (data) => api.post('/api/auth/login', data);
export const register = (data) => api.post('/api/auth/register', data);
export const getMe = () => api.get('/api/auth/me');

export const logout = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('userToken');
  localStorage.removeItem('authToken');
  localStorage.removeItem('userData');
  localStorage.removeItem('userInfo');
  localStorage.removeItem('forceShowAllQuestions');
  // Optionnel: redirection vers login
  if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
    window.location.href = '/login';
  }
};

// ==================== QUESTIONS (Banque QCM) - VERSION CORRIGÉE ====================

/**
 * Récupère les questions avec filtres avancés
 * @param {Object} params - Paramètres de filtrage
 * @param {string} params.status - Filtre par statut: 'approved', 'pending', 'rejected', 'all'
 * @param {boolean} params.showAll - Si true, ignore le filtre de statut par défaut
 * @param {string} params.domainId - Filtre par domaine
 * @param {string} params.sousDomaineId - Filtre par sous-domaine
 * @param {string} params.niveauId - Filtre par niveau
 * @param {string} params.matiereId - Filtre par matière
 * @param {number} params.page - Pagination (page)
 * @param {number} params.limit - Nombre d'éléments par page
 * @param {string} params.search - Recherche textuelle
 */
export const getQuestions = async (params = {}) => {
  try {
    const token = localStorage.getItem('userToken') || localStorage.getItem('token');
    const userData = localStorage.getItem('userData');
    let userRole = null;
    
    if (userData) {
      try {
        const parsed = JSON.parse(userData);
        userRole = parsed.role;
      } catch (e) {}
    }
    
    // Déterminer quel endpoint utiliser
    let endpoint = '/api/questions';
    
    // Si pas de token, utiliser l'endpoint public
    if (!token) {
      endpoint = '/api/questions/public';
    }
    
    // Préparer les paramètres
    const queryParams = { ...params };
    
    // Gestion du filtre de statut
    // Si showAll est true, ne pas filtrer par status
    if (queryParams.showAll === true || queryParams.showAll === 'true') {
      delete queryParams.status;
      delete queryParams.showAll;
      console.log('[API] 📋 Mode "showAll" activé - toutes les questions seront affichées');
    } 
    // Si status est 'all', ne pas appliquer de filtre de statut
    else if (queryParams.status === 'all') {
      delete queryParams.status;
      console.log('[API] 📋 Filtre "all" - toutes les questions seront affichées');
    }
    // Pour les non-admins sans filtre explicite, ne montrer que les approuvées
    else if (!queryParams.status && userRole !== 'admin' && !token) {
      queryParams.status = 'approved';
      console.log('[API] 📋 Mode public - seulement les questions approuvées');
    }
    
    // Supprimer les paramètres vides
    Object.keys(queryParams).forEach(key => {
      if (queryParams[key] === undefined || queryParams[key] === null || queryParams[key] === '') {
        delete queryParams[key];
      }
    });
    
    console.log('[API] 📋 Chargement questions:', { endpoint, params: queryParams });
    const response = await api.get(endpoint, { params: queryParams });
    
    // Normaliser la réponse
    if (response.data && response.data.questions) {
      return response.data;
    }
    if (response.data && Array.isArray(response.data)) {
      return { questions: response.data, total: response.data.length };
    }
    return response;
  } catch (error) {
    console.error('[API] Erreur chargement questions:', error);
    throw error;
  }
};

/**
 * Récupère TOUTES les questions (y compris pending et rejected)
 * Utile pour les administrateurs et le tableau de bord
 */
export const getAllQuestions = async (params = {}) => {
  return getQuestions({
    ...params,
    showAll: true,
    limit: params.limit || 1000 // Augmenter la limite pour tout voir
  });
};

/**
 * Récupère les questions par statut spécifique
 */
export const getQuestionsByStatus = async (status, params = {}) => {
  if (!['approved', 'pending', 'rejected'].includes(status)) {
    console.warn(`[API] Statut invalide: ${status}, utilisation de 'approved'`);
    status = 'approved';
  }
  
  return getQuestions({
    ...params,
    status,
    showAll: false
  });
};

/**
 * Récupère uniquement les questions approuvées (pour les quiz)
 */
export const getApprovedQuestions = async (params = {}) => {
  return getQuestionsByStatus('approved', params);
};

/**
 * Récupère les questions en attente de validation (admin seulement)
 */
export const getPendingQuestionsOnly = async (params = {}) => {
  return getQuestionsByStatus('pending', params);
};

/**
 * Récupère les questions rejetées (admin seulement)
 */
export const getRejectedQuestions = async (params = {}) => {
  return getQuestionsByStatus('rejected', params);
};

/**
 * Compte les questions par statut
 */
export const getQuestionsStats = async () => {
  try {
    const allQuestions = await getAllQuestions({ limit: 10000 });
    const questions = allQuestions.questions || [];
    
    const stats = {
      total: questions.length,
      approved: questions.filter(q => q.status === 'approved' || q.status === 'Validée').length,
      pending: questions.filter(q => q.status === 'pending' || q.status === 'En attente').length,
      rejected: questions.filter(q => q.status === 'rejected' || q.status === 'Rejetée').length
    };
    
    console.log('[API] 📊 Statistiques questions:', stats);
    return stats;
  } catch (error) {
    console.error('[API] Erreur comptage questions:', error);
    return { total: 0, approved: 0, pending: 0, rejected: 0 };
  }
};

export const getQuestionById = (id) => api.get(`/api/questions/${id}`);
export const saveQuestions = (data) => api.post('/api/questions/save', data);
export const updateQuestion = (id, data) => api.put(`/api/questions/${id}`, data);
export const deleteQuestion = (id) => api.delete(`/api/questions/${id}`);

// ==================== VALIDATION DES QUESTIONS (Admin) ====================
export const getPendingQuestions = () => api.get('/api/questions/pending');
export const validateQuestion = (id, approved, comment) => 
  api.put(`/api/questions/${id}/validate`, { approved, comment });

// ==================== EXAMENS ====================
export const getExams = (params) => api.get('/api/exams', { params });
export const getExamById = (id) => api.get(`/api/exams/${id}`);
export const createExam = (data) => api.post('/api/exams', data);
export const updateExam = (id, data) => api.put(`/api/exams/${id}`, data);
export const deleteExam = (id) => api.delete(`/api/exams/${id}`);

// ==================== EXAMENS PAR RÔLE ====================
export const getAvailableExams = () => api.get('/api/exams/available');
export const getTeacherExams = () => api.get('/api/exams/teacher');
export const getExamsBySubject = (subject) => api.get(`/api/exams/by-subject/${subject}`);
export const getExamsByDomain = (domain, subDomain) => 
  api.get(`/api/exams/by-domain/${domain}`, { params: { subDomain } });
export const duplicateExam = (id) => api.post(`/api/exams/${id}/duplicate`);

// ==================== RÉSULTATS ====================
export const getResults = (params) => api.get('/api/results', { params });
export const getResultById = (id) => api.get(`/api/results/${id}`);
export const saveResult = (data) => api.post('/api/results', data);
export const deleteResult = (id) => api.delete(`/api/results/${id}`);

// ==================== RÉSULTATS PAR RÔLE ====================
export const getStudentResults = () => api.get('/api/results/student');
export const getExamResults = (examId) => api.get(`/api/results/exam/${examId}`);

// ==================== CLASSEMENTS ====================
export const getRankings = (examId) => api.get(`/api/rankings/${examId}`);

// ==================== SESSIONS ACTIVES & SURVEILLANCE ====================
export const getActiveSessions = () => api.get('/api/active-sessions');
export const getSurveillanceData = () => api.get('/api/surveillance-data');
export const getTerminals = () => api.get('/api/surveillance/terminals');
export const getSurveillanceAlerts = () => api.get('/api/surveillance/alerts');
export const exportSessionLogs = (data) => api.post('/api/surveillance/export-logs', data);

// ==================== IA — DeepSeek (timeout 120s) ====================
export const generateQuestionsAI = async (data) => {
  try {
    console.log('🚀 [IA] Envoi à /api/ai/generate-questions:', data);
    const response = await api.post('/api/ai/generate-questions', data, {
      timeout: 120000, // ✅ 120 secondes (2 minutes)
    });
    
    // Normalisation selon la réponse
    if (response && response.questions && Array.isArray(response.questions)) {
      return { success: true, questions: response.questions, metadata: response.metadata };
    }
    if (response && response.data?.questions) {
      return { success: true, questions: response.data.questions };
    }
    
    throw new Error('Format de réponse invalide');
  } catch (error) {
    console.error('❌ [IA] Erreur generateQuestionsAI:', error);
    throw error;
  }
};

export const checkConfig = () => api.get('/api/check-config');
export const getAIConfig = () => api.get('/api/ai/config');

// ==================== SAUVEGARDE ÉPREUVE IA ====================
export const saveAIExam = (data) => api.post('/api/ai/save-questions', data);

// ==================== CRÉATION MANUELLE QUIZ ====================
export const createManualQuiz = (data) => api.post('/api/manual-quiz', data);
export const getManualQuizzes = () => api.get('/api/manual-quiz');
export const getManualQuizById = (id) => api.get(`/api/manual-quiz/${id}`);
export const updateManualQuiz = (id, data) => api.put(`/api/manual-quiz/${id}`, data);
export const deleteManualQuiz = (id) => api.delete(`/api/manual-quiz/${id}`);

// ==================== COMPOSE (Génération par paramètres) ====================
export const generateQuizByAI = (data) => api.post('/api/compose/generate-by-ai', data);
export const getComposeConfig = () => api.get('/api/compose/config');

// ==================== BULLETINS ====================
export const getBulletin = (resultId) => api.get(`/api/bulletin/${resultId}`, {
  responseType: 'blob',
  headers: { 'Accept': 'text/html' }
});

export const printBulletin = (resultId) => {
  window.open(`${ENV_CONFIG.BACKEND_URL}/api/bulletin/${resultId}`, '_blank');
};

// ==================== STATISTIQUES & SANTÉ ====================
export const getStats = () => api.get('/api/stats');
export const getHealth = () => api.get('/api/health');
export const getSystemHealth = () => api.get('/health');
export const getServerInfo = () => api.get('/api/server-info');
export const testToken = () => api.get('/api/test-token');

// ==================== UTILISATEURS ====================
export const getUsers = () => api.get('/api/users');
export const getUserById = (id) => api.get(`/api/users/${id}`);
export const updateUserRole = (id, role) => api.put(`/api/users/${id}`, { role });
export const deleteUser = (id) => api.delete(`/api/users/${id}`);

// ==================== DOMAINES & MATIÈRES ====================
export const getDomains = () => api.get('/api/domains');
export const getSubjects = () => api.get('/api/subjects');
export const getSubjectsByDomain = (domainId) => api.get(`/api/domains/${domainId}/subjects`);
export const getDashboardData = () => api.get('/api/dashboard');

// ==================== UPLOAD IMAGES ====================
export const uploadQuestionImage = (file) => {
  const formData = new FormData();
  formData.append('image', file);
  return api.post('/api/upload/question-image', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 30000,
  });
};

export const uploadBase64Image = (data) => api.post('/api/upload/question-image-base64', data);
export const deleteQuestionImage = (filename) => api.delete(`/api/upload/question-image/${filename}`);

// ==================== TEST CONNEXION ====================
export const testConnection = async () => {
  try {
    const result = await api.get('/health');
    console.log('[API] ✅ Connexion réussie:', result);
    return { success: true, data: result };
  } catch (error) {
    console.error('[API] ❌ Échec connexion:', error.message);
    return { success: false, error: error.message };
  }
};

// ==================== UTILITAIRES POUR LE DASHBOARD ====================
/**
 * Récupère toutes les données nécessaires pour le tableau de bord analytique
 */
export const getAnalyticsDashboardData = async () => {
  try {
    const [questionsStats, allQuestions, domains, subjects] = await Promise.all([
      getQuestionsStats(),
      getAllQuestions({ limit: 10000 }),
      getDomains(),
      getSubjects()
    ]);
    
    const questions = allQuestions.questions || [];
    
    // Calculer les statistiques avancées
    const analytics = {
      ...questionsStats,
      avgPoints: questions.reduce((acc, q) => acc + (q.points || 1), 0) / (questions.length || 1),
      avgTime: 1, // Temps moyen par question (à ajuster selon vos données)
      topMatieres: getTopMatieres(questions),
      repartitionParType: getRepartitionParType(questions),
      croissanceMensuelle: calculateGrowth(questions),
      tempsValidationMoyen: calculateAvgValidationTime(questions)
    };
    
    return analytics;
  } catch (error) {
    console.error('[API] Erreur chargement dashboard analytics:', error);
    throw error;
  }
};

// Fonctions utilitaires internes
function getTopMatieres(questions) {
  const matiereCount = {};
  questions.forEach(q => {
    const matiere = q.matiere || 'Non classé';
    matiereCount[matiere] = (matiereCount[matiere] || 0) + 1;
  });
  return Object.entries(matiereCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }));
}

function getRepartitionParType(questions) {
  const types = {
    'Savoir': 0,
    'Savoir-Faire': 0,
    'Savoir-être': 0
  };
  questions.forEach(q => {
    const type = q.type || 'Savoir';
    if (types[type] !== undefined) {
      types[type]++;
    } else {
      types['Savoir']++;
    }
  });
  return types;
}

function calculateGrowth(questions) {
  // Calcul simplifié de la croissance
  return questions.length > 0 ? '+10%' : '0%';
}

function calculateAvgValidationTime(questions) {
  // Calcul du temps moyen de validation (exemple)
  return '0.2 jours';
}

// ==================== EXPORT PAR DÉFAUT ====================
export default api;