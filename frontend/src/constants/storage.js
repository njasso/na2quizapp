// constants/storage.js
export const LOCAL_STORAGE_KEYS = {
  QUIZZES: 'localQuizzes',
  EXAMS: 'localExams'
};

export const StorageService = {
  getLocalContent: (key) => {
    try {
      return JSON.parse(localStorage.getItem(key)) || [];
    } catch (error) {
      console.error(`Error reading ${key}:`, error);
      return [];
    }
  },

  // Ajouter d'autres méthodes...
};