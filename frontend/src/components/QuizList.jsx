import React, { useState, useEffect } from 'react';
import { quizApi } from '../services/quizApi';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const QuizList = ({ subjectId }) => {
  const { user } = useAuth();
  
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadQuizzes = async () => {
      try {
        const data = await quizApi.getQuizzesBySubject(subjectId);
        setQuizzes(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadQuizzes();
  }, [subjectId]);

  if (loading) return <div>Chargement en cours...</div>;
  if (error) return <div className="text-red-500">{error}</div>;

  return (
    <div className="quiz-grid">
      {quizzes.map(quiz => (
        <div key={quiz._id} className="quiz-card">
          <h3>{quiz.title}</h3>
          <p>Matière: {quiz.subject.name}</p>
          <button 
            className="start-quiz-btn"
            onClick={() => startQuiz(quiz._id)}
          >
            Commencer le quiz
          </button>
        </div>
      ))}
    </div>
  );
};

const { data, isLoading, isError, error } = useQuery({
    queryKey: ['quizzes', subjectId],
    queryFn: () => quizApi.getQuizzesBySubject(subjectId),
    enabled: !!user, // Ne s'exécute que si l'utilisateur est connecté
    staleTime: 5 * 60 * 1000, // 5 minutes de cache
  });

  if (isLoading) return <div>Chargement...</div>;
  
  if (isError) {
    toast.error(error.message);
    return <div>Erreur de chargement</div>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {data.map(quiz => (
        <div key={quiz.id} className="p-4 border rounded-lg">
          <h3 className="text-xl font-bold">{quiz.title}</h3>
          <p>Score moyen: {quiz.averageScore}/20</p>
        </div>
      ))}
    </div>
  );

export default QuizList;