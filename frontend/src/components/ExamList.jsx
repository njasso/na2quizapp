import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const ExamPage = () => {
  // State initialization
  const [quizzes, setQuizzes] = useState(() => {
    const saved = localStorage.getItem('quizzes');
    return saved ? JSON.parse(saved) : [];
  });
  const [filteredQuizzes, setFilteredQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState({
    domaine: '',
    type: ''
  });
  const navigate = useNavigate();

  // Save to localStorage when quizzes change
  useEffect(() => {
    localStorage.setItem('quizzes', JSON.stringify(quizzes));
  }, [quizzes]);

  // Fetch quizzes on initial load
  useEffect(() => {
    fetchQuizzes();
  }, []);

  // Filter quizzes when search or filters change
  useEffect(() => {
    filterQuizzes();
  }, [quizzes, searchTerm, filter]);

  const fetchQuizzes = async () => {
    try {
      setLoading(true);
      // Simulation with timeout
      setTimeout(() => {
        const simulatedQuizzes = [
          {
            _id: '1',
            titre: 'Sciences de la Vie 3e',
            domaine: 'Éducatif',
            sousDomaine: 'Biologie',
            niveau: '3ème',
            matiere: 'SVT',
            questionsCount: 15,
            createdAt: new Date().toISOString(),
            type: 'Base',
            difficulty: 'Moyen',
            duration: 45
          },
          {
            _id: '2',
            titre: 'Algèbre Avancée',
            domaine: 'Mathématiques',
            sousDomaine: 'Algèbre',
            niveau: 'Terminale',
            matiere: 'Maths',
            questionsCount: 20,
            createdAt: new Date(Date.now() - 86400000).toISOString(),
            type: 'IA',
            difficulty: 'Difficile',
            duration: 60
          },
          {
            _id: '3',
            titre: 'Histoire du Cameroun',
            domaine: 'Histoire',
            sousDomaine: 'Nationale',
            niveau: '4ème',
            matiere: 'Histoire',
            questionsCount: 10,
            createdAt: new Date(Date.now() - 172800000).toISOString(),
            type: 'Manuel',
            difficulty: 'Facile',
            duration: 30
          }
        ];
        
        setQuizzes(simulatedQuizzes);
        setLoading(false);
      }, 800);
    } catch (err) {
      setError('Erreur de chargement des évaluations');
      setLoading(false);
    }
  };

  const filterQuizzes = () => {
    let results = quizzes;

    if (searchTerm) {
      results = results.filter(quiz => 
        quiz.titre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (quiz.matiere && quiz.matiere.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    if (filter.domaine) {
      results = results.filter(quiz => quiz.domaine === filter.domaine);
    }

    if (filter.type) {
      results = results.filter(quiz => quiz.type === filter.type);
    }

    setFilteredQuizzes(results);
  };

  const deleteQuiz = async (quizId) => {
    try {
      setQuizzes(prev => prev.filter(q => q._id !== quizId));
      setSuccess('Évaluation supprimée avec succès');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Erreur lors de la suppression');
    }
  };

  // Render UI
  return (
    <div className="exam-page">
      {/* Add your filter/search UI here */}
      {loading && <div>Chargement...</div>}
      {error && <div className="error">{error}</div>}
      {success && <div className="success">{success}</div>}
      
      {/* Display quizzes */}
      <div className="quizzes-list">
        {filteredQuizzes.map(quiz => (
          <div key={quiz._id} className="quiz-card">
            <h3>{quiz.titre}</h3>
            <p>Domaine: {quiz.domaine}</p>
            <p>Matière: {quiz.matiere}</p>
            <p>Niveau: {quiz.niveau}</p>
            <button onClick={() => deleteQuiz(quiz._id)}>Supprimer</button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ExamPage;