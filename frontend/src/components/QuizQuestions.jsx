import React, { useEffect, useState } from 'react';

function QuizQuestions() {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch(`${process.env.REACT_APP_BACKEND_URL || (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:5000')}/start/quiz`)
      .then((res) => {
        if (!res.ok) throw new Error('Erreur réseau');
        return res.json();
      })
      .then((data) => {
        setQuestions(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  if (loading) return <p>Chargement des questions...</p>;
  if (error) return <p>Erreur : {error}</p>;

  return (
    <div>
      <h2>Liste des questions</h2>
      <ul>
        {questions.map((q) => (
          <li key={q._id}>
            <strong>{q.subject || 'Matière inconnue'}</strong> - {q.level || 'Niveau inconnu'}<br />
            Q: {q.question}<br />
            Réponses possibles: {q.options ? q.options.join(', ') : 'N/A'}<br />
            Réponse correcte: {q.correctAnswer || 'N/A'}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default QuizQuestions;
