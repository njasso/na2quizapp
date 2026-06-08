// src/App.jsx - Version COMPLÈTE avec assignation des épreuves et ExamCompletedPage
import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

// Pages publiques
import HomePage from './pages/HomePage';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';

// Pages de création (ENSEIGNANT et SAISISEUR)
import ManualQuizCreation from './pages/creation/ManualQuizCreation';
import DatabaseQuizCreation from './pages/creation/DatabaseQuizCreation';
import AIQuizCreation from './pages/creation/AIQuizCreation';
import EvaluationSummative from './pages/creation/EvaluationSummative';
import CreateQuestion from './pages/creation/CreateQuestion';

// Pages d'examens
import ExamsPage from './pages/exams/ExamsPage';
import ProfileExamPage from './pages/exams/ProfileExamPage';
import PreviewExamPage from './pages/exams/PreviewExamPage';
import ExamScreen from './pages/exams/ExamScreen';

// Pages opérateur (épreuves assignées)
import AssignedExamsPage from './pages/operator/AssignedExamsPage';

// Pages d'administration - Assignation
import AssignExamToOperator from './pages/admin/AssignExamToOperator';

// Pages de composition (APPRENANT)
import QuizCompositionPage from './pages/composition/QuizCompositionPage';
import WaitingPage from './pages/composition/WaitingPage';
import ResultsPage from './pages/composition/ResultsPage';
import ExamCompletedPage from './pages/composition/ExamCompletedPage'; // ✅ IMPORT AJOUTÉ

// Pages étudiant (APPRENANT)
import MyAvailableExams from './pages/student/MyAvailableExams';
import MyResultsPage from './pages/student/MyResultsPage';

// Pages de surveillance
import SurveillancePage from './pages/surveillance/SurveillancePage';
import ReportsPage from './pages/surveillance/ReportsPage';

// Pages enseignant - Rapports et suivi
import TeacherReportsPage from './pages/teacher/TeacherReportsPage';
import TeacherQuestionsPage from './pages/teacher/TeacherQuestionsPage';

// Pages d'administration
import QCMValidationPage from './pages/admin/QCMValidationPage';
import ImportQuestions from './pages/admin/ImportQuestions';
import UserManagementPage from './pages/admin/UserManagementPage';

// Consultation analytique de la Banque de QCM
import QCMBankPage from './pages/qcm/QCMBankPage';

// Terminal d'examen (page HTML servie par le backend)
const TerminalPage = () => {
  useEffect(() => {
    // Rediriger vers le terminal.html du backend
    const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';
    window.location.href = `${backendUrl}/terminal.html`;
  }, []);
  return null;
};

const LoadingSpinner = () => (
  <div style={{
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
    background: 'linear-gradient(135deg, #05071a 0%, #0a0f2e 60%, #05071a 100%)',
    fontFamily: "'DM Sans', sans-serif"
  }}>
    <div style={{
      width: '48px',
      height: '48px',
      border: '3px solid rgba(59,130,246,0.1)',
      borderTopColor: '#3b82f6',
      borderRadius: '50%',
      animation: 'spin 1s linear infinite'
    }} />
    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
  </div>
);

function App() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setTimeout(() => setLoading(false), 500);
  }, []);

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <AuthProvider>
      <Router>
        <div style={{ minHeight: '100vh' }}>
          <Routes>
            {/* ═══════════════════════════════════════════════════════════════ */}
            {/* ROUTES PUBLIQUES */}
            {/* ═══════════════════════════════════════════════════════════════ */}
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/demo" element={<HomePage />} />

            {/* ═══════════════════════════════════════════════════════════════ */}
            {/* TERMINAL D'EXAMEN (PUBLIC - PAS DE AUTH REQUISE) */}
            {/* ═══════════════════════════════════════════════════════════════ */}
            <Route path="/terminal" element={<TerminalPage />} />

            {/* ═══════════════════════════════════════════════════════════════ */}
            {/* TABLEAU DE BORD UNIFIÉ - TOUS LES RÔLES */}
            {/* ═══════════════════════════════════════════════════════════════ */}
            <Route path="/evaluate" element={
              <ProtectedRoute allowedRoles={['APPRENANT', 'ENSEIGNANT', 'SAISISEUR', 'ADMIN_DELEGUE', 'ADMIN_SYSTEME', 'OPERATEUR_EVALUATION']}>
                <EvaluationSummative />
              </ProtectedRoute>
            } />
            
            {/* ═══════════════════════════════════════════════════════════════ */}
            {/* PÔLE QUESTIONS */}
            {/* ═══════════════════════════════════════════════════════════════ */}
            <Route path="/create/question" element={
              <ProtectedRoute allowedRoles={['ENSEIGNANT', 'SAISISEUR', 'ADMIN_DELEGUE', 'ADMIN_SYSTEME']}>
                <CreateQuestion />
              </ProtectedRoute>
            } />
            <Route path="/create/manual" element={
              <ProtectedRoute allowedRoles={['ENSEIGNANT', 'ADMIN_DELEGUE', 'ADMIN_SYSTEME']}>
                <ManualQuizCreation />
              </ProtectedRoute>
            } />
            <Route path="/create/database" element={
              <ProtectedRoute allowedRoles={['ENSEIGNANT', 'ADMIN_DELEGUE', 'ADMIN_SYSTEME']}>
                <DatabaseQuizCreation />
              </ProtectedRoute>
            } />
            <Route path="/create/ai" element={
              <ProtectedRoute allowedRoles={['ENSEIGNANT', 'ADMIN_DELEGUE', 'ADMIN_SYSTEME']}>
                <AIQuizCreation />
              </ProtectedRoute>
            } />
            <Route path="/qcm-bank" element={
              <ProtectedRoute allowedRoles={['ENSEIGNANT', 'SAISISEUR', 'ADMIN_DELEGUE', 'ADMIN_SYSTEME']}>
                <QCMBankPage />
              </ProtectedRoute>
            } />
            <Route path="/teacher/questions" element={
              <ProtectedRoute allowedRoles={['ENSEIGNANT', 'SAISISEUR', 'ADMIN_DELEGUE', 'ADMIN_SYSTEME']}>
                <TeacherQuestionsPage />
              </ProtectedRoute>
            } />

            {/* ═══════════════════════════════════════════════════════════════ */}
            {/* PÔLE ÉPREUVES */}
            {/* ═══════════════════════════════════════════════════════════════ */}
            <Route path="/exams" element={
              <ProtectedRoute allowedRoles={['ENSEIGNANT', 'ADMIN_DELEGUE', 'ADMIN_SYSTEME']}>
                <ExamsPage />
              </ProtectedRoute>
            } />
            
            {/* Opérateur: Épreuves assignées */}
            <Route path="/assigned-exams" element={
              <ProtectedRoute allowedRoles={['OPERATEUR_EVALUATION']}>
                <AssignedExamsPage />
              </ProtectedRoute>
            } />
            
            {/* Prévisualisation épreuve */}
            <Route path="/preview/:examId" element={
              <ProtectedRoute allowedRoles={['ENSEIGNANT', 'ADMIN_DELEGUE', 'ADMIN_SYSTEME']}>
                <PreviewExamPage />
              </ProtectedRoute>
            } />
            
            {/* ═══════════════════════════════════════════════════════════════ */}
            {/* PÔLE APPRENANT - Composition */}
            {/* ═══════════════════════════════════════════════════════════════ */}
            <Route path="/exam/profile/:examId" element={
              <ProtectedRoute allowedRoles={['APPRENANT']}>
                <ProfileExamPage />
              </ProtectedRoute>
            } />
            <Route path="/exam/waiting/:examId" element={
              <ProtectedRoute allowedRoles={['APPRENANT']}>
                <WaitingPage />
              </ProtectedRoute>
            } />
            <Route path="/exam/compose/:examId" element={
              <ProtectedRoute allowedRoles={['APPRENANT']}>
                <QuizCompositionPage />
              </ProtectedRoute>
            } />
            <Route path="/results/:examId" element={
              <ProtectedRoute allowedRoles={['APPRENANT']}>
                <ResultsPage />
              </ProtectedRoute>
            } />
            
            {/* ✅ NOUVEAU - Page de fin d'épreuve (sans affichage de résultat) */}
            {/* Cette page est accessible APRÈS avoir soumis l'épreuve */}
            <Route path="/exam/completed/:examId" element={
              <ProtectedRoute allowedRoles={['APPRENANT']}>
                <ExamCompletedPage />
              </ProtectedRoute>
            } />
            
            {/* ═══════════════════════════════════════════════════════════════ */}
            {/* PÔLE APPRENANT - Dashboard */}
            {/* ═══════════════════════════════════════════════════════════════ */}
            <Route path="/available-exams" element={
              <ProtectedRoute allowedRoles={['APPRENANT']}>
                <MyAvailableExams />
              </ProtectedRoute>
            } />
            <Route path="/my-results" element={
              <ProtectedRoute allowedRoles={['APPRENANT']}>
                <MyResultsPage />
              </ProtectedRoute>
            } />
            
            {/* ═══════════════════════════════════════════════════════════════ */}
            {/* PÔLE ÉVALUATION - Rapports et Surveillance */}
            {/* ═══════════════════════════════════════════════════════════════ */}
            
            {/* Rapports de classe - Enseignant + Admin */}
            <Route path="/teacher/reports" element={
              <ProtectedRoute allowedRoles={['ENSEIGNANT', 'ADMIN_DELEGUE', 'ADMIN_SYSTEME']}>
                <TeacherReportsPage />
              </ProtectedRoute>
            } />
            
            {/* Rapports institutionnels - UNIQUEMENT Admin */}
            <Route path="/reports" element={
              <ProtectedRoute allowedRoles={['ADMIN_DELEGUE', 'ADMIN_SYSTEME']}>
                <ReportsPage />
              </ProtectedRoute>
            } />
            
            {/* Surveillance - Opérateur, Enseignant et Admin */}
            <Route path="/surveillance" element={
              <ProtectedRoute allowedRoles={['ADMIN_SYSTEME', 'ADMIN_DELEGUE', 'ENSEIGNANT', 'OPERATEUR_EVALUATION']}>
                <SurveillancePage />
              </ProtectedRoute>
            } />
            
            {/* ═══════════════════════════════════════════════════════════════ */}
            {/* PÔLE ADMINISTRATION */}
            {/* ═══════════════════════════════════════════════════════════════ */}
            <Route path="/admin/qcm-validation" element={
              <ProtectedRoute allowedRoles={['ADMIN_DELEGUE', 'ADMIN_SYSTEME']}>
                <QCMValidationPage />
              </ProtectedRoute>
            } />
            <Route path="/admin/qcm-import" element={
              <ProtectedRoute allowedRoles={['ADMIN_DELEGUE', 'ADMIN_SYSTEME']}>
                <ImportQuestions />
              </ProtectedRoute>
            } />
            <Route path="/admin/users" element={
              <ProtectedRoute allowedRoles={['ADMIN_DELEGUE', 'ADMIN_SYSTEME']}>
                <UserManagementPage />
              </ProtectedRoute>
            } />
            
            {/* Assignation des épreuves aux opérateurs */}
            <Route path="/admin/assign-exams" element={
              <ProtectedRoute allowedRoles={['ADMIN_DELEGUE', 'ADMIN_SYSTEME']}>
                <AssignExamToOperator />
              </ProtectedRoute>
            } />
            
            {/* ═══════════════════════════════════════════════════════════════ */}
            {/* REDIRECTION */}
            {/* ═══════════════════════════════════════════════════════════════ */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>

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
                fontFamily: "'DM Sans', 'Segoe UI', 'Ubuntu', sans-serif",
              },
              success: {
                style: { border: '1px solid #10b981', background: 'rgba(16,185,129,0.1)' },
              },
              error: {
                style: { border: '1px solid #ef4444', background: 'rgba(239,68,68,0.1)' },
              },
            }}
          />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;