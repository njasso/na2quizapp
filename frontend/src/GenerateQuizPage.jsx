import React, { useState } from 'react';
import axios from 'axios';
import {
  DocumentArrowDownIcon,
  SparklesIcon,
  ArrowPathIcon
} from '@heroicons/react/24/solid';

const GenerateQuizPage = () => {
  const [generationType, setGenerationType] = useState('random');
  const [format, setFormat] = useState('csv');
  const [subject, setSubject] = useState('');
  const [level, setLevel] = useState('');
  const [loading, setLoading] = useState(false);
  const [fileUrl, setFileUrl] = useState(null);

  const handleGenerate = async () => {
    if (!subject.trim() || !level.trim()) {
      alert('Veuillez renseigner la matière et le niveau.');
      return;
    }

    setLoading(true);
    setFileUrl(null);

    try {
      const response = await axios.post(
        '/api/quiz/generate',
        { generationType, format, subject, level },
        { responseType: 'blob' }
      );

      const mimeType = format === 'csv' ? 'text/csv' : 'application/pdf';
      const blob = new Blob([response.data], { type: mimeType });
      const url = window.URL.createObjectURL(blob);
      setFileUrl(url);
    } catch (error) {
      console.error('Erreur de génération', error);
      alert('Erreur lors de la génération du fichier.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-3xl bg-gray-800 p-8 rounded-xl shadow-lg">
        <h1 className="text-3xl font-bold mb-6 text-center">Génération de Quiz</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block mb-1 text-sm">Matière</label>
            <input
              type="text"
              className="w-full p-2 rounded bg-gray-700 text-white"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Ex: Mathématiques"
              autoComplete="off"
            />
          </div>

          <div>
            <label className="block mb-1 text-sm">Niveau</label>
            <input
              type="text"
              className="w-full p-2 rounded bg-gray-700 text-white"
              value={level}
              onChange={(e) => setLevel(e.target.value)}
              placeholder="Ex: Terminale C"
              autoComplete="off"
            />
          </div>

          <div>
            <label className="block mb-1 text-sm">Méthode de génération</label>
            <select
              className="w-full p-2 rounded bg-gray-700 text-white"
              value={generationType}
              onChange={(e) => setGenerationType(e.target.value)}
            >
              <option value="random">Aléatoire</option>
              <option value="ai">Par Intelligence Artificielle</option>
            </select>
          </div>

          <div>
            <label className="block mb-1 text-sm">Format du fichier</label>
            <select
              className="w-full p-2 rounded bg-gray-700 text-white"
              value={format}
              onChange={(e) => setFormat(e.target.value)}
            >
              <option value="csv">CSV</option>
              <option value="pdf">PDF</option>
            </select>
          </div>
        </div>

        <div className="mt-8 flex justify-center">
          <button
            onClick={handleGenerate}
            className="bg-blue-600 hover:bg-blue-500 px-6 py-3 rounded-full font-semibold flex items-center gap-2"
            disabled={loading}
          >
            {loading ? (
              <>
                <ArrowPathIcon className="w-5 h-5 animate-spin" />
                Génération...
              </>
            ) : (
              <>
                {generationType === 'ai' ? (
                  <SparklesIcon className="w-5 h-5" />
                ) : (
                  <DocumentArrowDownIcon className="w-5 h-5" />
                )}
                Générer le quiz
              </>
            )}
          </button>
        </div>

        {fileUrl && (
          <div className="mt-6 text-center">
            <a
              href={fileUrl}
              download={`quiz.${format}`}
              className="text-green-400 hover:underline"
              onClick={() => {
                // Libérer l'URL après téléchargement pour éviter fuite mémoire
                setTimeout(() => window.URL.revokeObjectURL(fileUrl), 1000);
              }}
            >
              📥 Télécharger le fichier généré
            </a>
          </div>
        )}
      </div>
    </div>
  );
};

export default GenerateQuizPage;
