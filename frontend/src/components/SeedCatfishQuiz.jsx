import React, { useState } from 'react';

const SeedCatfishQuiz = () => {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleSeedQuiz = async () => {
    setLoading(true);
    setMessage('');

    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL || (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:5000')}/api/quizzes/seed-catfish-quiz`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setMessage(data.message || 'Questions insérées avec succès.');
      } else {
        const errorData = await response.json();
        setMessage(errorData.error || 'Une erreur est survenue.');
      }
    } catch (err) {
      console.error('Erreur côté client :', err);
      setMessage('Erreur de connexion au serveur.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-md max-w-xl mx-auto mt-10 text-center">
      <h2 className="text-2xl font-bold mb-4">Insertion du Quiz - Poisson-chat africain</h2>
      <p className="mb-6 text-gray-600">
        Cliquez pour insérer 20 questions sur l'alimentation du poisson-chat dans la base de données.
      </p>
      <button
        onClick={handleSeedQuiz}
        disabled={loading}
        className="bg-blue-700 hover:bg-blue-800 text-white font-semibold py-2 px-6 rounded disabled:opacity-50"
      >
        {loading ? 'Insertion en cours...' : 'Insérer le quiz'}
      </button>
      {message && (
        <div className="mt-4 text-green-600 font-medium">{message}</div>
      )}
    </div>
  );
};

export default SeedCatfishQuiz;
