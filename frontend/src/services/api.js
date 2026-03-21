// src/services/api.js  ← VERSION UNIFIÉE
// ─────────────────────────────────────────────────────────────
//  Toutes les fonctions d'appel API pour NA²QUIZ
// ─────────────────────────────────────────────────────────────
import apiClient from '../api/client';

// ========== AUTH ==========
export const login    = (data) => apiClient.post('/api/auth/login',    data);
export const register = (data) => apiClient.post('/api/auth/register', data);
export const getMe    = ()     => apiClient.get('/api/auth/me');
export const logout   = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('userToken');
  localStorage.removeItem('userData');
};

// ========== QUESTIONS (banque) ==========
export const getQuestions    = (params) => apiClient.get('/api/questions',        { params });
export const getQuestionById = (id)     => apiClient.get(`/api/questions/${id}`);
export const saveQuestions   = (data)   => apiClient.post('/api/questions/save',  data);
export const updateQuestion  = (id, d)  => apiClient.put(`/api/questions/${id}`,  d);
export const deleteQuestion  = (id)     => apiClient.delete(`/api/questions/${id}`);

// ========== EXAMENS ==========
export const getExams    = (params) => apiClient.get('/api/exams',        { params });
export const getExamById = (id)     => apiClient.get(`/api/exams/${id}`);
export const createExam  = (data)   => apiClient.post('/api/exams',        data);
export const updateExam  = (id, d)  => apiClient.put(`/api/exams/${id}`,   d);
export const deleteExam  = (id)     => apiClient.delete(`/api/exams/${id}`);

// ========== RÉSULTATS ==========
export const getResults    = (params) => apiClient.get('/api/results',        { params });
export const getResultById = (id)     => apiClient.get(`/api/results/${id}`);
export const saveResult    = (data)   => apiClient.post('/api/results',        data);
export const deleteResult  = (id)     => apiClient.delete(`/api/results/${id}`);

// ========== CLASSEMENTS ==========
export const getRankings = (examId) => apiClient.get(`/api/rankings/${examId}`);

// ========== IA — timeout 90s (DeepSeek peut être lent) ==========
export const generateQuestionsAI = async (data) => {
  const response = await apiClient.post('/api/generate-questions', data, {
    timeout: 90000, // 90 secondes — override du timeout global (30s)
  });
  // Normaliser selon la réponse du serveur
  const questions = response.data?.questions || response.data || [];
  return { success: true, questions };
};

export const checkConfig = () => apiClient.get('/api/check-config');

// ========== SANTÉ ==========
export const getHealth = () => apiClient.get('/api/health');

export default apiClient;
