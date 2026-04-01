import React, { useState, useEffect } from 'react';
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
import PreviewExamPage from './pages/PreviewExamPage';

// ✅ PAGE D'ATTENTE POUR OPTION B
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

  // Récupération de l'utilisateur depuis localStorage au chargement
  useEffect(() => {
    try {
      const data = localStorage.getItem('userData');
      const token = localStorage.getItem('userToken') || localStorage.getItem('token');
      
      if (data && token) {
        const userData = JSON.parse(data);
        setUser(userData);
        
        // Vérifier si le token est encore valide (optionnel)
        // Vous pouvez ajouter une vérification avec /api/auth/me
      }
    } catch (error) {
      console.error('Erreur lors du chargement de l\'utilisateur:', error);
      // Nettoyer localStorage en cas d'erreur
      localStorage.removeItem('userData');
      localStorage.removeItem('userToken');
      localStorage.removeItem('token');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fonction de login (peut être passée via contexte)
  const handleLogin = (userData, token) => {
    localStorage.setItem('userData', JSON.stringify(userData));
    localStorage.setItem('userToken', token);
    localStorage.setItem('token', token); // Pour compatibilité avec apiClient
    setUser(userData);
  };

  // Fonction de logout
  const handleLogout = () => {
    localStorage.removeItem('userData');
    localStorage.removeItem('userToken');
    localStorage.removeItem('token');
    setUser(null);
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <Router
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        <Routes>
          {/* Routes publiques */}
          <Route path="/" element={<HomePage user={user} onLogout={handleLogout} />} />
          <Route path="/login" element={<LoginPage onLogin={handleLogin} />} />
          <Route path="/register" element={<RegisterPage onLogin={handleLogin} />} />

          {/* Routes protégées - redirection vers login si non authentifié */}
          <Route 
            path="/create/manual" 
            element={user ? <ManualQuizCreation user={user} /> : <Navigate to="/login" replace />} 
          />
          <Route 
            path="/create/database" 
            element={user ? <DatabaseQuizCreation user={user} /> : <Navigate to="/login" replace />} 
          />
          <Route 
            path="/create/ai" 
            element={user ? <AIQuizCreation user={user} /> : <Navigate to="/login" replace />} 
          />
          
          {/* Routes d'évaluation */}
          <Route 
            path="/evaluate" 
            element={user ? <EvaluationSummative user={user} /> : <Navigate to="/login" replace />} 
          />
          
          {/* Routes d'examens */}
          <Route 
            path="/exams" 
            element={user ? <ExamsPage user={user} /> : <Navigate to="/login" replace />} 
          />
          <Route 
            path="/preview/:examId" 
            element={user ? <PreviewExamPage user={user} /> : <Navigate to="/login" replace />} 
          />
          
          {/* ✅ PARCOURS ÉTUDIANT - Nouveau système */}
          <Route 
            path="/exam/profile/:examId" 
            element={user ? <ProfileExamPage user={user} /> : <Navigate to="/login" replace />} 
          />
          <Route 
            path="/exam/waiting/:examId" 
            element={user ? <WaitingPage user={user} /> : <Navigate to="/login" replace />} 
          />
          <Route 
            path="/exam/compose/:examId" 
            element={user ? <QuizCompositionPage user={user} /> : <Navigate to="/login" replace />} 
          />
          <Route 
            path="/results/:examId" 
            element={user ? <ResultsPage user={user} /> : <Navigate to="/login" replace />} 
          />
          
          {/* Routes de supervision - réservées aux enseignants/admins */}
          <Route 
            path="/surveillance" 
            element={
              user && (user.role === 'ENSEIGNANT' || user.role === 'ADMIN_DELEGUE' || user.role === 'ADMIN_SYSTEME' || user.role === 'OPERATEUR_EVALUATION') 
                ? <SurveillancePage user={user} /> 
                : <Navigate to="/login" replace />
            } 
          />
          <Route 
            path="/reports" 
            element={
              user && (user.role === 'ENSEIGNANT' || user.role === 'ADMIN_DELEGUE' || user.role === 'ADMIN_SYSTEME' || user.role === 'OPERATEUR_EVALUATION')
                ? <ReportsPage user={user} /> 
                : <Navigate to="/login" replace />
            } 
          />
          
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
              fontFamily: "'Segoe UI', 'Ubuntu', 'Cantarell', sans-serif",
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