// frontend/src/services/examService.js
const API_URL = 'http://localhost:3001/api/exams';

export const saveExam = async (examData) => {
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(examData)
    });
    return await response.json();
  } catch (error) {
    // Fallback localStorage
    const exams = JSON.parse(localStorage.getItem('exams')) || [];
    exams.push(examData);
    localStorage.setItem('exams', JSON.stringify(exams));
    return { ...examData, fromLocal: true };
  }
};

export const loadExams = async () => {
  try {
    const response = await fetch(API_URL);
    const serverExams = await response.json();
    
    // Fusion avec le local si nécessaire
    const localExams = JSON.parse(localStorage.getItem('exams')) || [];
    return [...serverExams, ...localExams.filter(l => 
      !serverExams.some(s => s._id === l._id)
    )];
  } catch (error) {
    return JSON.parse(localStorage.getItem('exams')) || [];
  }
};