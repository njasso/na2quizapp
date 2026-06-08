import React, { useState } from 'react';
import Button from '@/components/ui/button';
import Input from '@/components/ui/input';
import Textarea from '@/components/ui/textarea';
import Select from '@/components/ui/select';

const QuizGenerator = () => {
  // États pour gérer les entrées de l'utilisateur et l'état du quiz
  const [domain, setDomain] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [questionCount, setQuestionCount] = useState(5);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [generatedQuiz, setGeneratedQuiz] = useState('');

  const handleGenerateQuiz = async () => {
    // Réinitialisation des erreurs précédentes
    setError('');
    setLoading(true);  // Début du chargement

    try {
      const response = await fetch("/api/generate-quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain, difficulty, number: questionCount }),
      });

      const data = await response.json();
      if (data.quiz) {
        setGeneratedQuiz(data.quiz);  // Affichage du quiz généré
      } else {
        setError("Erreur lors de la génération du quiz.");
      }
    } catch (err) {
      console.error(err);
      setError("Une erreur est survenue. Veuillez réessayer.");
    } finally {
      setLoading(false);  // Fin du chargement
    }
  };

  return (
    <div className="p-6 max-w-xl mx-auto bg-white rounded-xl shadow-md space-y-4">
      <h2 className="text-2xl font-bold">Générateur de Quiz avec ChatGPT</h2>

      {/* Domaine */}
      <Input
        placeholder="Domaine (ex: Mathématiques, Biologie...)"
        value={domain}
        onChange={(e) => setDomain(e.target.value)}
        className="mb-4"
      />

      {/* Sélection de la difficulté */}
      <Select 
        value={difficulty} 
        onChange={(e) => setDifficulty(e.target.value)} 
        className="mb-4"
      >
        <option value="easy">Facile</option>
        <option value="medium">Moyenne</option>
        <option value="hard">Difficile</option>
      </Select>

      {/* Nombre de questions */}
      <Input
        type="number"
        value={questionCount}
        onChange={(e) => setQuestionCount(e.target.value)}
        placeholder="Nombre de questions"
        className="mb-4"
      />

      {/* Message d'erreur */}
      {error && <div className="text-red-500 text-sm mb-4">{error}</div>}

      {/* Bouton pour générer */}
      <Button onClick={handleGenerateQuiz} className="w-full" disabled={loading}>
        {loading ? "Chargement..." : "Générer le quiz"}
      </Button>

      {/* Affichage du quiz généré */}
      {generatedQuiz && (
        <Textarea
          className="mt-4"
          value={generatedQuiz}
          rows={10}
          readOnly
        />
      )}
    </div>
  );
};

export default QuizGenerator;
