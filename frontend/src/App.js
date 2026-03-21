import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

// Pages
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import EvaluationSummative from './pages/EvaluationSummative';
import ManualQuizCreation from './pages/ManualQuizCreation';
import DatabaseQuizCreation from './pages/DatabaseQuizCreation';
import AIQuizCreation from './pages/AIQuizCreation';
import ExamsPage from './pages/ExamsPage';
import ProfileExamPage from './pages/ProfileExamPage';
import QuizCompositionPage from './pages/QuizCompositionPage';
import ResultsPage from './pages/ResultsPage';
import SurveillancePage from './pages/SurveillancePage';
import ReportsPage from './pages/ReportsPage';

// ✅ NOUVELLE PAGE D'ATTENTE POUR OPTION B
import WaitingPage from './pages/WaitingPage';

// Composant de chargement
const LoadingSpinner = () => (
  <div className="flex justify-center items-center h-screen">
    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
  </div>
);

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUserData = localStorage.getItem('userData');
    const userToken = localStorage.getItem('userToken');

    if (storedUserData && userToken) {
      try {
        const parsedUser = JSON.parse(storedUserData);
        if (parsedUser && Object.keys(parsedUser).length > 0) {
          setUser(parsedUser);
        } else {
          console.warn('Données utilisateur invalides, suppression des données locales');
          localStorage.removeItem('userData');
          localStorage.removeItem('userToken');
          setUser(null);
        }
      } catch (err) {
        console.error('Erreur lors du parsing des données utilisateur:', err);
        localStorage.removeItem('userData');
        localStorage.removeItem('userToken');
        setUser(null);
      }
    } else {
      setUser(null);
    }
    setLoading(false);
  }, []);

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <Router
      future={{
        // ✅ Supprime warning : "React Router will begin wrapping state updates in React.startTransition"
        v7_startTransition: true,
        // ✅ Supprime warning : "Relative route resolution within Splat routes is changing in v7"
        v7_relativeSplatPath: true,
      }}
    >
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        <Routes>
          {/* Routes publiques */}
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Routes de création d'examens */}
          <Route path="/create/manual" element={<ManualQuizCreation />} />
          <Route path="/create/database" element={<DatabaseQuizCreation />} />
          <Route path="/create/ai" element={<AIQuizCreation />} />
          
          {/* Routes d'évaluation */}
          <Route path="/evaluate" element={<EvaluationSummative />} />
          
          {/* Routes d'examens */}
          <Route path="/exams" element={<ExamsPage />} />
          
          {/* ✅ PARCOURS ÉTUDIANT - Nouveau système */}
          <Route path="/exam/profile/:examId" element={<ProfileExamPage />} />
          <Route path="/exam/waiting/:examId" element={<WaitingPage />} />
          <Route path="/exam/compose/:examId" element={<QuizCompositionPage />} />
          <Route path="/results/:examId" element={<ResultsPage />} />
          
          {/* Routes de supervision */}
          <Route path="/surveillance" element={<SurveillancePage />} />
          <Route path="/reports" element={<ReportsPage />} />
          
          {/* Route par défaut */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>

        {/* Configuration du Toaster pour les notifications */}
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#1e293b',
              color: '#f8fafc',
              border: '1px solid #3b82f6',
              borderRadius: '10px',
              padding: '12px 16px',
              fontSize: '0.875rem',
              fontFamily: "'Segoe UI', 'Ubuntu', 'Cantarell', sans-serif", // ✅ Police locale — offline
            },
            success: {
              style: {
                border: '1px solid #10b981',
                background: 'rgba(16,185,129,0.1)',
              },
              iconTheme: {
                primary: '#10b981',
                secondary: '#fff',
              },
            },
            error: {
              style: {
                border: '1px solid #ef4444',
                background: 'rgba(239,68,68,0.1)',
              },
              iconTheme: {
                primary: '#ef4444',
                secondary: '#fff',
              },
            },
            loading: {
              style: {
                border: '1px solid #f59e0b',
                background: 'rgba(245,158,11,0.1)',
              },
            },
          }}
        />
      </div>
    </Router>
  );
}

export default App;