// src/services/api.js - VERSION UNIFIÉE COMPLÈTE
// ─────────────────────────────────────────────────────────────
//  Toutes les fonctions d'appel API pour NA²QUIZ
//  Support production/développement avec IP dynamique
// ─────────────────────────────────────────────────────────────
import axios from 'axios';

// ==================== CONFIGURATION DYNAMIQUE ====================
const BACKEND_IP = process.env.REACT_APP_BACKEND_IP || '192.168.0.1';
const BACKEND_PORT = process.env.REACT_APP_BACKEND_PORT || '5000';
const PROD_BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const getBackendUrl = () => {
  // Production: URL personnalisée ou IP:PORT
  if (process.env.NODE_ENV === 'production') {
    if (PROD_BACKEND_URL) {
      console.log('[API] 🌐 Production URL configurée:', PROD_BACKEND_URL);
      return PROD_BACKEND_URL;
    }
    // Fallback pour réseau local en production
    return `http://${BACKEND_IP}:${BACKEND_PORT}`;
  }
  
  // Développement: localhost par défaut
  if (process.env.NODE_ENV === 'development') {
    return process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';
  }
  
  // Test / autre
  return `http://${BACKEND_IP}:${BACKEND_PORT}`;
};

const API_BASE = getBackendUrl();
console.log('[API] 🚀 Backend URL configurée:', API_BASE);

// ==================== CLIENT AXIOS ====================
const api = axios.create({
  baseURL: API_BASE,
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
    // Token utilisateur (priorité au token long)
    const token = localStorage.getItem('userToken') || localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Éviter le cache pour les GET (sauf exceptions)
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

// Response interceptor - normalisation des réponses
api.interceptors.response.use(
  (response) => {
    console.log(`[API] ✅ ${response.config.url} → ${response.status}`);
    // Normalisation: retourner response.data directement
    return response.data;
  },
  (error) => {
    // Requête annulée (Strict Mode)
    if (error.code === 'ERR_CANCELED' || error.name === 'CanceledError') {
      console.log(`[API] → Requête annulée: ${error.config?.url || 'unknown'}`);
      return Promise.reject(error);
    }

    console.error('❌ Erreur API détaillée:', {
      status: error.response?.status,
      url: error.config?.url,
      message: error.message,
      baseURL: error.config?.baseURL,
      code: error.code,
    });

    // Timeout
    if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      return Promise.reject(new Error(`Timeout : Le serveur ${API_BASE} ne répond pas.`));
    }

    // Serveur inaccessible
    if (!error.response) {
      return Promise.reject(new Error(`Impossible de contacter le serveur ${API_BASE}. Vérifiez que le serveur est démarré.`));
    }

    // 401 - Token expiré
    if (error.response?.status === 401) {
      console.warn('[API] ⚠️ Session expirée');
      localStorage.removeItem('userToken');
      localStorage.removeItem('token');
      localStorage.removeItem('userData');
      localStorage.removeItem('userInfo');
    }

    // Extraction du message d'erreur
    const serverMessage = error.response?.data?.message ||
                          error.response?.data?.error ||
                          error.response?.data?.msg ||
                          error.message ||
                          'Erreur serveur inconnue';

    return Promise.reject(new Error(serverMessage));
  }
);

// ==================== AUTH ====================
export const login = (data) => api.post('/api/auth/login', data);
export const register = (data) => api.post('/api/auth/register', data);
export const getMe = () => api.get('/api/auth/me');

export const logout = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('userToken');
  localStorage.removeItem('userData');
  localStorage.removeItem('userInfo');
  // Optionnel: redirection vers login
  if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
    window.location.href = '/login';
  }
};

// ==================== QUESTIONS (Banque QCM) ====================
export const getQuestions = async (params) => {
  try {
    const token = localStorage.getItem('userToken') || localStorage.getItem('token');
    // Route publique si pas de token, protégée sinon
    const endpoint = token ? '/api/questions' : '/api/questions/public';
    return await api.get(endpoint, { params });
  } catch (error) {
    console.error('[API] Erreur chargement questions:', error);
    throw error;
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
      timeout: 120000, // ✅ 120 secondes (2 minutes) au lieu de 90000
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
  window.open(`${API_BASE}/api/bulletin/${resultId}`, '_blank');
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

// ==================== EXPORT PAR DÉFAUT ====================
export default api;