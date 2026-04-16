// src/services/api.js - VERSION ULTIME
// Support complet: localhost, IP réseau (192.168.x.x), production (Render)
// ─────────────────────────────────────────────────────────────

import axios from 'axios';
import ENV_CONFIG from '../config/env';

console.log('[API] 🚀 Configuration initiale:');
console.log('[API]   Backend URL:', ENV_CONFIG.BACKEND_URL);
console.log('[API]   Environnement:', ENV_CONFIG.environment);
console.log('[API]   Hostname:', ENV_CONFIG.currentHostname);

// ==================== FONCTION DE MISE À JOUR DYNAMIQUE ====================

/**
 * Met à jour dynamiquement l'URL du backend en fonction de l'environnement
 * Cette fonction est cruciale pour le passage localhost ↔ IP réseau
 */
export const updateApiBaseUrl = () => {
  const currentHostname = window.location.hostname;
  const isLocalNetwork = /^(192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)/.test(currentHostname);
  const isLocalhost = currentHostname === 'localhost' || currentHostname === '127.0.0.1';
  
  let newBaseUrl = ENV_CONFIG.BACKEND_URL;
  
  // ✅ Si on est en IP réseau mais que l'API utilise localhost, forcer la mise à jour
  if (isLocalNetwork && newBaseUrl.includes('localhost')) {
    newBaseUrl = `http://${currentHostname}:5000`;
    console.log('[API] 🔄 Mise à jour baseURL (IP réseau):', newBaseUrl);
  }
  // ✅ Si on est en localhost mais que l'API utilise une IP, forcer la mise à jour
  else if (isLocalhost && !newBaseUrl.includes('localhost')) {
    newBaseUrl = 'http://localhost:5000';
    console.log('[API] 🔄 Mise à jour baseURL (localhost):', newBaseUrl);
  }
  
  if (api.defaults.baseURL !== newBaseUrl) {
    api.defaults.baseURL = newBaseUrl;
    console.log('[API] ✅ BaseURL mise à jour:', newBaseUrl);
  }
  
  return api.defaults.baseURL;
};

// ==================== CLIENT AXIOS ====================

const api = axios.create({
  baseURL: ENV_CONFIG.BACKEND_URL,
  timeout: 60000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  },
});

// ✅ Appliquer la mise à jour immédiatement
updateApiBaseUrl();

// ==================== INTERCEPTEURS ====================

// Request interceptor - injection du token
api.interceptors.request.use(
  (config) => {
    // ✅ Mettre à jour l'URL avant chaque requête (pour les reconnexions)
    const currentBaseUrl = updateApiBaseUrl();
    if (config.baseURL !== currentBaseUrl) {
      config.baseURL = currentBaseUrl;
    }
    
    // Chercher le token dans toutes les clés possibles
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
    }

    // Cache busting pour les GET
    if (config.method?.toLowerCase() === 'get' && !config.params?.noCache) {
      config.params = {
        ...config.params,
        _t: Date.now(),
      };
    }

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
    // ✅ Amélioration des messages d'erreur
    if (error.code === 'ERR_NETWORK') {
      console.error('[API] ❌ Erreur réseau - Backend inaccessible:', api.defaults.baseURL);
      console.error('[API] 💡 Vérifiez que le serveur backend est démarré sur le port 5000');
    }
    
    if (error.response?.status === 401) {
      console.warn('[API] 🔒 Session expirée, redirection vers login...');
      if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
        localStorage.removeItem('token');
        localStorage.removeItem('userToken');
        localStorage.removeItem('userData');
        localStorage.removeItem('userInfo');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// ==================== AUTH ====================
export const login = async (data) => {
  // ✅ Mettre à jour l'URL avant login
  updateApiBaseUrl();
  console.log('[API] 🔐 Tentative de login vers:', api.defaults.baseURL);
  return api.post('/api/auth/login', data);
};

export const register = (data) => api.post('/api/auth/register', data);

export const getMe = async () => {
  updateApiBaseUrl();
  return api.get('/api/auth/me');
};

export const logout = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('userToken');
  localStorage.removeItem('authToken');
  localStorage.removeItem('userData');
  localStorage.removeItem('userInfo');
  localStorage.removeItem('forceShowAllQuestions');
  
  if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
    window.location.href = '/login';
  }
};

// ==================== QUESTIONS ====================

export const getQuestions = async (params = {}) => {
  try {
    updateApiBaseUrl();
    
    const token = localStorage.getItem('userToken') || localStorage.getItem('token');
    const userData = localStorage.getItem('userData');
    let userRole = null;
    
    if (userData) {
      try {
        const parsed = JSON.parse(userData);
        userRole = parsed.role;
      } catch (e) {}
    }
    
    let endpoint = '/api/questions';
    
    if (!token) {
      endpoint = '/api/questions/public';
    }
    
    const queryParams = { ...params };
    
    if (queryParams.showAll === true || queryParams.showAll === 'true') {
      delete queryParams.status;
      delete queryParams.showAll;
    } 
    else if (queryParams.status === 'all') {
      delete queryParams.status;
    }
    else if (!queryParams.status && userRole !== 'admin' && !token) {
      queryParams.status = 'approved';
    }
    
    Object.keys(queryParams).forEach(key => {
      if (queryParams[key] === undefined || queryParams[key] === null || queryParams[key] === '') {
        delete queryParams[key];
      }
    });
    
    const response = await api.get(endpoint, { params: queryParams });
    
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

export const getAllQuestions = async (params = {}) => {
  return getQuestions({
    ...params,
    showAll: true,
    limit: params.limit || 1000
  });
};

export const getQuestionsByStatus = async (status, params = {}) => {
  if (!['approved', 'pending', 'rejected'].includes(status)) {
    status = 'approved';
  }
  return getQuestions({
    ...params,
    status,
    showAll: false
  });
};

export const getApprovedQuestions = async (params = {}) => {
  return getQuestionsByStatus('approved', params);
};

export const getPendingQuestionsOnly = async (params = {}) => {
  return getQuestionsByStatus('pending', params);
};

export const getRejectedQuestions = async (params = {}) => {
  return getQuestionsByStatus('rejected', params);
};

export const getQuestionsStats = async () => {
  try {
    const allQuestions = await getAllQuestions({ limit: 10000 });
    const questions = allQuestions.questions || [];
    
    return {
      total: questions.length,
      approved: questions.filter(q => q.status === 'approved' || q.status === 'Validée').length,
      pending: questions.filter(q => q.status === 'pending' || q.status === 'En attente').length,
      rejected: questions.filter(q => q.status === 'rejected' || q.status === 'Rejetée').length
    };
  } catch (error) {
    console.error('[API] Erreur comptage questions:', error);
    return { total: 0, approved: 0, pending: 0, rejected: 0 };
  }
};

export const getQuestionById = (id) => api.get(`/api/questions/${id}`);
export const saveQuestions = (data) => api.post('/api/questions/save', data);
export const updateQuestion = (id, data) => api.put(`/api/questions/${id}`, data);
export const deleteQuestion = (id) => api.delete(`/api/questions/${id}`);

// ==================== VALIDATION DES QUESTIONS ====================
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

// ==================== IA — DeepSeek ====================
export const generateQuestionsAI = async (data) => {
  try {
    console.log('🚀 [IA] Envoi à /api/ai/generate-questions:', data);
    const response = await api.post('/api/ai/generate-questions', data, {
      timeout: 120000,
    });
    
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

// ==================== COMPOSE ====================
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
    updateApiBaseUrl();
    const result = await api.get('/health');
    console.log('[API] ✅ Connexion réussie:', result.data);
    return { success: true, data: result.data };
  } catch (error) {
    console.error('[API] ❌ Échec connexion:', error.message);
    return { success: false, error: error.message, url: api.defaults.baseURL };
  }
};

// ==================== CONFIGURATIONS ====================
export const getExamConfigs = () => api.get('/api/configs');

// ==================== UTILITAIRES ====================
export const getAnalyticsDashboardData = async () => {
  try {
    const [questionsStats, allQuestions, domains, subjects] = await Promise.all([
      getQuestionsStats(),
      getAllQuestions({ limit: 10000 }),
      getDomains(),
      getSubjects()
    ]);
    
    const questions = allQuestions.questions || [];
    
    // Calcul des top matières
    const matiereCount = {};
    questions.forEach(q => {
      const matiere = q.matiere || 'Non classé';
      matiereCount[matiere] = (matiereCount[matiere] || 0) + 1;
    });
    const topMatieres = Object.entries(matiereCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));
    
    return {
      ...questionsStats,
      avgPoints: questions.reduce((acc, q) => acc + (q.points || 1), 0) / (questions.length || 1),
      avgTime: 1,
      topMatieres,
      repartitionParType: {
        'Savoir': questions.filter(q => q.type === 'Savoir' || q.typeQuestion === 1).length,
        'Savoir-Faire': questions.filter(q => q.type === 'Savoir-Faire' || q.typeQuestion === 2).length,
        'Savoir-être': questions.filter(q => q.type === 'Savoir-être' || q.typeQuestion === 3).length
      },
      croissanceMensuelle: questions.length > 0 ? '+10%' : '0%',
      tempsValidationMoyen: '0.2 jours'
    };
  } catch (error) {
    console.error('[API] Erreur chargement dashboard analytics:', error);
    throw error;
  }
};

// ==================== EXPORT PAR DÉFAUT ====================
export default api;