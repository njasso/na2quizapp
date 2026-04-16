// src/pages/exams/ProfileExamPage.jsx - Version COMPLÈTE CORRIGÉE
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { motion } from 'framer-motion';
import { toast, Toaster } from 'react-hot-toast';
import io from 'socket.io-client';
import { 
  User, BookOpen, Hash, Layers, Home, ArrowRight, Lock,
  AlertCircle, Clock, Settings, Info, ChevronRight, Monitor
} from 'lucide-react';
import ENV_CONFIG from '../../config/env';

const NODE_BACKEND_URL = ENV_CONFIG.BACKEND_URL;
const SOCKET_URL = ENV_CONFIG.SOCKET_URL;

console.log('[ProfileExamPage] 🌍 Environnement:', ENV_CONFIG.environment);
console.log('[ProfileExamPage] 🔗 Backend URL:', NODE_BACKEND_URL);
console.log('[ProfileExamPage] 🔌 Socket URL:', SOCKET_URL);

// ══════════════════════════════════════════════════════════════
//  CONFIGURATIONS DES ÉPREUVES (A à K) AVEC INSTRUCTIONS
// ══════════════════════════════════════════════════════════════
const EXAM_CONFIGURATIONS = [
  { 
    key: 'A', 
    label: 'Configuration A - Collective Figée', 
    desc: 'Plage fermée · Séquentiel figé · Même QCM pour tous · Résultat binaire · Pas de reprise',
    color: '#ef4444',
    instructions: [
      '🔒 Navigation entièrement contrôlée par le superviseur',
      '⏱️ Chronomètre par question (vous ne pouvez pas passer à la suivante)',
      '✅ Résultat binaire affiché (Réussi/Échoué) après chaque réponse',
      '🚫 Pas de reprise possible après échec',
      '👁️ Le superviseur contrôle l\'avancement des questions'
    ],
    config: { examOption: 'A', openRange: false, sequencing: 'identical', showBinaryResult: true, showCorrectAnswer: false, allowRetry: false, requiredQuestions: 0, timerPerQuestion: true }
  },
  { 
    key: 'B', 
    label: 'Configuration B - Collective Souple', 
    desc: 'Plage fermée · Séquentiel figé · Même QCM pour tous · Résultat binaire+ · Pas de reprise',
    color: '#ef4444',
    instructions: [
      '✅ Navigation libre entre les questions',
      '⏱️ Chronomètre global pour toute l\'épreuve',
      '✅ Résultat binaire + bonne réponse affichée',
      '🚫 Pas de reprise possible après échec',
      '📋 Tous les candidats ont les mêmes questions dans le même ordre'
    ],
    config: { examOption: 'B', openRange: false, sequencing: 'identical', showBinaryResult: true, showCorrectAnswer: true, allowRetry: false, requiredQuestions: 0, timerPerQuestion: false }
  },
  { 
    key: 'C', 
    label: 'Configuration C - Personnalisée', 
    desc: 'Plage fermée · Séquentiel figé · Même QCM pour tous · Pas de résultat · Pas de reprise',
    color: '#ef4444',
    instructions: [
      '✅ Navigation libre entre les questions',
      '⏱️ Chronomètre global pour toute l\'épreuve',
      '🔇 Aucun résultat affiché (ni pendant, ni après l\'épreuve)',
      '🚫 Pas de reprise possible',
      '🏠 Redirection vers l\'accueil après soumission'
    ],
    config: { examOption: 'C', openRange: false, sequencing: 'identical', showBinaryResult: false, showCorrectAnswer: false, allowRetry: false, requiredQuestions: 0, timerPerQuestion: false }
  },
  { 
    key: 'D', 
    label: 'Configuration D - Aléatoire', 
    desc: 'Plage fermée · Séquentiel figé · QCM aléatoire par étudiant · Résultat binaire · Pas de reprise',
    color: '#f59e0b',
    instructions: [
      '🎲 Questions aléatoires (chaque candidat a un jeu différent)',
      '⏱️ Chronomètre par question · Avancement automatique après réponse',
      '✅ Résultat binaire affiché (Réussi/Échoué)',
      '🚫 Pas de reprise possible',
      '⚡ L\'épreuve avance automatiquement après chaque réponse'
    ],
    config: { examOption: 'D', openRange: false, sequencing: 'randomPerStudent', showBinaryResult: true, showCorrectAnswer: false, allowRetry: false, requiredQuestions: 0, timerPerQuestion: true }
  },
  { 
    key: 'E', 
    label: 'Configuration E - Aléatoire+', 
    desc: 'Plage fermée · QCM aléatoire · Résultat binaire+ · Pas de reprise',
    color: '#f59e0b',
    instructions: [
      '🎲 Questions aléatoires (chaque candidat a un jeu différent)',
      '✅ Navigation libre entre les questions',
      '⏱️ Chronomètre global pour toute l\'épreuve',
      '✅ Résultat binaire + bonne réponse affichée',
      '🚫 Pas de reprise possible'
    ],
    config: { examOption: 'E', openRange: false, sequencing: 'randomPerStudent', showBinaryResult: true, showCorrectAnswer: true, allowRetry: false, requiredQuestions: 0, timerPerQuestion: false }
  },
  { 
    key: 'F', 
    label: 'Configuration F - Aléatoire Libre', 
    desc: 'Plage fermée · QCM aléatoire · Pas de résultat · Pas de reprise',
    color: '#f59e0b',
    instructions: [
      '🎲 Questions aléatoires (chaque candidat a un jeu différent)',
      '✅ Navigation libre entre les questions',
      '⏱️ Chronomètre global pour toute l\'épreuve',
      '🔇 Aucun résultat affiché (ni pendant, ni après)',
      '🚫 Pas de reprise possible',
      '🏠 Redirection vers l\'accueil après soumission'
    ],
    config: { examOption: 'F', openRange: false, sequencing: 'randomPerStudent', showBinaryResult: false, showCorrectAnswer: false, allowRetry: false, requiredQuestions: 0, timerPerQuestion: false }
  },
  { 
    key: 'G', 
    label: 'Configuration G - Plage Ouverte + Reprise', 
    desc: 'Plage ouverte · Navigation libre · Résultat binaire · Reprise autorisée',
    color: '#10b981',
    instructions: [
      '📖 Navigation totalement libre (toutes les questions accessibles)',
      '⏱️ Chronomètre global pour toute l\'épreuve',
      '✅ Résultat binaire affiché (Réussi/Échoué)',
      '🔄 Reprise autorisée une fois en cas d\'échec',
      '🖥️ Retour automatique au terminal après l\'épreuve'
    ],
    config: { examOption: 'G', openRange: true, requiredQuestions: 0, showBinaryResult: true, showCorrectAnswer: false, allowRetry: true, timerPerQuestion: false }
  },
  { 
    key: 'H', 
    label: 'Configuration H - Plage Ouverte', 
    desc: 'Plage ouverte · Navigation libre · Résultat binaire · Pas de reprise',
    color: '#10b981',
    instructions: [
      '📖 Navigation totalement libre (toutes les questions accessibles)',
      '⏱️ Chronomètre global pour toute l\'épreuve',
      '✅ Résultat binaire affiché (Réussi/Échoué)',
      '🚫 Pas de reprise possible après échec',
      '🖥️ Retour automatique au terminal après l\'épreuve'
    ],
    config: { examOption: 'H', openRange: true, requiredQuestions: 0, showBinaryResult: true, showCorrectAnswer: false, allowRetry: false, timerPerQuestion: false }
  },
  { 
    key: 'I', 
    label: 'Configuration I - Plage Ouverte+', 
    desc: 'Plage ouverte · Navigation libre · Résultat binaire+ · Reprise autorisée',
    color: '#10b981',
    instructions: [
      '📖 Navigation totalement libre (toutes les questions accessibles)',
      '⏱️ Chronomètre global pour toute l\'épreuve',
      '✅ Résultat binaire + bonne réponse affichée',
      '🔄 Reprise autorisée une fois en cas d\'échec',
      '🖥️ Retour automatique au terminal après l\'épreuve'
    ],
    config: { examOption: 'I', openRange: true, requiredQuestions: 0, showBinaryResult: true, showCorrectAnswer: true, allowRetry: true, timerPerQuestion: false }
  },
  { 
    key: 'J', 
    label: 'Configuration J - Plage Ouverte++', 
    desc: 'Plage ouverte · Navigation libre · Résultat binaire+ · Pas de reprise',
    color: '#10b981',
    instructions: [
      '📖 Navigation totalement libre (toutes les questions accessibles)',
      '⏱️ Chronomètre global pour toute l\'épreuve',
      '✅ Résultat binaire + bonne réponse affichée',
      '🚫 Pas de reprise possible après échec',
      '🖥️ Retour automatique au terminal après l\'épreuve'
    ],
    config: { examOption: 'J', openRange: true, requiredQuestions: 0, showBinaryResult: true, showCorrectAnswer: true, allowRetry: false, timerPerQuestion: false }
  },
  { 
    key: 'K', 
    label: 'Configuration K - Plage Ouverte Libre', 
    desc: 'Plage ouverte · Navigation libre · Pas de résultat · Pas de reprise',
    color: '#10b981',
    instructions: [
      '📖 Navigation totalement libre (toutes les questions accessibles)',
      '⏱️ Chronomètre global pour toute l\'épreuve',
      '🔇 Aucun résultat affiché (ni pendant, ni après)',
      '🚫 Pas de reprise possible',
      '🏠 Redirection vers l\'accueil après soumission'
    ],
    config: { examOption: 'K', openRange: true, requiredQuestions: 0, showBinaryResult: false, showCorrectAnswer: false, allowRetry: false, timerPerQuestion: false }
  }
];

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
};

const ProfileExamPage = () => {
  const { examId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // ✅ Récupération des paramètres URL
  const urlOption = searchParams.get('option');
  const urlSessionId = searchParams.get('sessionId');
  const urlToken = searchParams.get('token');

  const [exam, setExam] = useState(null);
  const [config, setConfig] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [matricule, setMatricule] = useState('');
  const [level, setLevel] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [selectedExamOption, setSelectedExamOption] = useState('A');
  const [isOptionLocked, setIsOptionLocked] = useState(false);
  const [showConfigSelector, setShowConfigSelector] = useState(false);
  const [selectedConfigDetails, setSelectedConfigDetails] = useState(null);
  const [error, setError] = useState(null);

  const socketRef = useRef(null);
  const isMounted = useRef(true);

  // ✅ Stockage du token dans localStorage
  useEffect(() => {
    if (urlToken) {
      console.log('[ProfileExamPage] 🔑 Token reçu dans l\'URL, stockage...');
      localStorage.setItem('userToken', urlToken);
      localStorage.setItem('token', urlToken);
    }
  }, [urlToken]);

  const getAuthToken = () => {
    return localStorage.getItem('userToken') || localStorage.getItem('token');
  };

  // Mise à jour des détails de configuration sélectionnée
  useEffect(() => {
    const details = EXAM_CONFIGURATIONS.find(c => c.key === selectedExamOption);
    setSelectedConfigDetails(details);
  }, [selectedExamOption]);

  useEffect(() => {
    isMounted.current = true;

    const fetchExam = async () => {
      try {
        console.log('[ProfileExamPage] 🔍 Chargement examen:', examId);
        console.log('[ProfileExamPage] 📌 Option depuis URL:', urlOption);
        console.log('[ProfileExamPage] 🔗 Backend URL utilisé:', NODE_BACKEND_URL);
        
        const token = getAuthToken();
        const apiUrl = `${NODE_BACKEND_URL}/api/exams/${examId}`;
        console.log('[ProfileExamPage] 📡 Appel API:', apiUrl);
        
        const configHeaders = token ? {
          headers: { Authorization: `Bearer ${token}` }
        } : {};
        
        const response = await axios.get(apiUrl, configHeaders);
        
        if (!isMounted.current) return;
        
        const raw = response.data;
        const examData = (raw && raw._id) ? raw
                       : (raw?.data?._id) ? raw.data
                       : (raw?.exam?._id) ? raw.exam
                       : raw;
                       
        const normalizedQuestions = (examData.questions || []).map((q, idx) => {
          let options = q.options && q.options.length > 0 ? q.options : [];
          if (options.length === 0) {
            ['opRep1','opRep2','opRep3','opRep4','opRep5'].forEach(k => {
              if (q[k] !== undefined && q[k] !== '') options.push(String(q[k]));
            });
          }
          
          let correctAnswer = q.correctAnswer !== undefined ? q.correctAnswer : null;
          if (correctAnswer === null && q.bonOpRep !== undefined && options.length > 0) {
            correctAnswer = options[q.bonOpRep] ?? q.bonOpRep;
          }
          
          return {
            ...q,
            options,
            correctAnswer,
            id: q._id || String(idx),
            points: q.points || 1,
            tempsMinParQuestion: q.tempsMinParQuestion || q.tempsMin || 60,
          };
        });
        
        const normalizedExam = {
          ...examData,
          questions: normalizedQuestions
        };
        
        setExam(normalizedExam);
        setConfig(normalizedExam.config || null);
        
        console.log('[ProfileExamPage] ✅ Examen chargé:', normalizedExam.title);
        
        if (urlOption && ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K'].includes(urlOption)) {
          setSelectedExamOption(urlOption);
          setIsOptionLocked(true);
          toast.success(`Configuration ${urlOption} définie par le superviseur`, { 
            icon: '🎯', 
            duration: 4000,
            style: { background: '#1e293b', color: '#f8fafc', border: '1px solid #f59e0b' }
          });
        } else if (normalizedExam.examOption) {
          setSelectedExamOption(normalizedExam.examOption);
          setIsOptionLocked(true);
          toast.success(`Configuration ${normalizedExam.examOption} pré-définie`, { 
            icon: 'ℹ️', 
            duration: 4000,
            style: { background: '#1e293b', color: '#f8fafc', border: '1px solid #3b82f6' }
          });
        } else {
          setSelectedExamOption('A');
          setIsOptionLocked(false);
        }
      } catch (error) {
        console.error('[ProfileExamPage] ❌ Erreur chargement:', error);
        
        let errorMsg = "Épreuve non trouvée ou erreur serveur.";
        
        if (error.code === 'ERR_NETWORK') {
          errorMsg = `Impossible de joindre le serveur à ${NODE_BACKEND_URL}. Vérifiez que le backend est démarré.`;
          console.error('[ProfileExamPage] 🔴 Erreur réseau - Backend inaccessible:', NODE_BACKEND_URL);
        } else if (error.response?.status === 401) {
          errorMsg = "Session expirée. Veuillez vous reconnecter.";
          localStorage.removeItem('userToken');
          localStorage.removeItem('token');
          setTimeout(() => navigate('/login'), 2000);
        } else if (error.response?.status === 404) {
          errorMsg = "Épreuve non trouvée.";
        }
        
        setError(errorMsg);
        
        if (isMounted.current) {
          toast.error(errorMsg);
        }
      } finally {
        if (isMounted.current) setIsLoading(false);
      }
    };
    
    fetchExam();
    
    return () => {
      isMounted.current = false;
    };
  }, [examId, navigate, urlOption, NODE_BACKEND_URL]);

  // Connexion WebSocket avec URL dynamique
  useEffect(() => {
    console.log('[ProfileExamPage] 🔌 Connexion Socket à:', SOCKET_URL);
    
    const socket = io(SOCKET_URL, { 
      path: '/socket.io',
      transports: ['polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      upgrade: false
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('[ProfileExamPage] ✅ Socket connecté');
      socket.emit('registerSession', { type: 'student', examId });
    });

    socket.on('connect_error', (error) => {
      console.error('[ProfileExamPage] ❌ Erreur Socket:', error);
    });

    return () => {
      if (socket) socket.disconnect();
    };
  }, [examId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitted) return;

    if (!firstName || !lastName || !matricule || !level) {
      toast.error("Tous les champs sont requis.");
      return;
    }

    setIsSubmitted(true);
    toast.loading("Traitement...", { id: 'submit-profile' });

    try {
      let examDuration = exam?.duration;
      if (!examDuration || examDuration <= 0) {
        if (exam?.questions?.length > 0) {
          const totalSec = exam.questions.reduce(
            (s, q) => s + (q.tempsMinParQuestion || q.tempsMin || 60), 0
          );
          examDuration = Math.ceil(totalSec / 60);
        } else {
          examDuration = 60;
        }
      }

      const studentInfoData = {
        name: `${lastName.trim()} ${firstName.trim()}`,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        matricule: matricule.trim().toUpperCase(),
        level: level.trim()
      };

      const selectedConfig = EXAM_CONFIGURATIONS.find(c => c.key === selectedExamOption);
      
      localStorage.setItem('studentInfoForExam', JSON.stringify({
        examId: examId,
        info: studentInfoData,
        examDuration: examDuration,
        examOption: selectedExamOption,
        examTitle: exam.title,
        terminalSessionId: urlSessionId || null,
        config: selectedConfig?.config || exam?.config || null
      }));

      if (socketRef.current?.connected) {
        let status = 'composing';
        if (selectedExamOption === 'A' || selectedExamOption === 'B') {
          status = 'waiting';
        }
        
        socketRef.current.emit('studentReadyForExam', {
          examId: examId,
          studentInfo: studentInfoData,
          status: status,
          examOption: selectedExamOption,
          config: selectedConfig?.config || null
        });
        
        toast.success("Profil enregistré. Redirection...", { 
          id: 'submit-profile',
          icon: '✅',
          duration: 3000
        });
        
        setTimeout(() => {
          if (selectedExamOption === 'A' || selectedExamOption === 'B') {
            navigate(`/exam/waiting/${examId}`);
          } else {
            navigate(`/exam/compose/${examId}`);
          }
        }, 1500);
      } else {
        toast.error("Connexion au serveur perdue. Rechargement...");
        setIsSubmitted(false);
        setTimeout(() => window.location.reload(), 2000);
      }
    } catch (error) {
      console.error("[ProfileExamPage] ❌ Erreur soumission:", error);
      toast.error("Erreur lors de l'enregistrement.");
      setIsSubmitted(false);
    }
  };

  const getButtonText = () => {
    if (selectedExamOption === 'A' || selectedExamOption === 'B') {
      return 'Rejoindre la salle d\'attente';
    }
    return 'Commencer l\'examen';
  };

  if (isLoading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #05071a 0%, #0a0f2e 60%, #05071a 100%)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
      }}>
        <div style={{ width: 48, height: 48, border: '3px solid rgba(59,130,246,0.1)', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <p style={{ color: '#94a3b8', marginTop: 16 }}>Chargement de l'épreuve...</p>
        <p style={{ color: '#64748b', fontSize: '0.7rem', marginTop: 8 }}>Backend: {NODE_BACKEND_URL}</p>
        <Toaster />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error || !exam) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #05071a 0%, #0a0f2e 60%, #05071a 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center'
      }}>
        <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid #ef4444', borderRadius: 12, padding: 20, maxWidth: 500, textAlign: 'center' }}>
          <AlertCircle size={48} color="#ef4444" style={{ marginBottom: 16 }} />
          <p style={{ color: '#ef4444', marginBottom: 16 }}>{error || 'Épreuve non trouvée.'}</p>
          <p style={{ color: '#64748b', fontSize: '0.75rem', marginBottom: 16 }}>
            Backend ciblé: {NODE_BACKEND_URL}
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <button 
              onClick={() => window.location.reload()} 
              style={{ padding: '8px 20px', background: '#3b82f6', border: 'none', borderRadius: 8, color: '#fff', cursor: 'pointer' }}
            >
              Réessayer
            </button>
            <button 
              onClick={() => navigate('/')} 
              style={{ padding: '8px 20px', background: '#475569', border: 'none', borderRadius: 8, color: '#fff', cursor: 'pointer' }}
            >
              Accueil
            </button>
          </div>
        </div>
        <Toaster />
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      fontFamily: "'DM Sans', sans-serif",
      background: 'linear-gradient(135deg, #05071a 0%, #0a0f2e 60%, #05071a 100%)',
      position: 'relative',
      overflow: 'hidden',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
    }}>
      <div style={{
        position: 'fixed', inset: 0,
        backgroundImage: 'linear-gradient(rgba(59,130,246,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,0.03) 1px, transparent 1px)',
        backgroundSize: '40px 40px', pointerEvents: 'none', zIndex: 0,
      }} />

      <div style={{
        position: 'fixed', top: '-15%', left: '50%', transform: 'translateX(-50%)',
        width: '70vw', height: '50vh',
        background: 'radial-gradient(ellipse, rgba(37,99,235,0.12) 0%, transparent 70%)',
        pointerEvents: 'none', zIndex: 0,
      }} />

      <header style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
        background: 'rgba(5,7,26,0.88)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(59,130,246,0.12)',
        padding: '0 32px',
        height: '60px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{
          fontFamily: "'Sora', sans-serif",
          fontWeight: 800, fontSize: '1.125rem',
          letterSpacing: '-0.02em',
          background: 'linear-gradient(135deg, #60a5fa, #a78bfa)',
          WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent',
        }}>
          NA²QUIZ
        </div>
        <motion.button
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => navigate('/')}
          style={{
            display: 'flex', alignItems: 'center', gap: '7px',
            padding: '8px 16px', borderRadius: '8px',
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.1)',
            color: '#cbd5e1', fontSize: '0.875rem', fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          <Home size={15} />
          Accueil
        </motion.button>
      </header>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        style={{
          position: 'relative',
          zIndex: 1,
          width: '100%',
          maxWidth: '650px',
          background: 'rgba(15,23,42,0.7)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(59,130,246,0.15)',
          borderRadius: '24px',
          padding: '40px 32px',
          boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
          marginTop: '60px',
        }}
      >
        <motion.div variants={itemVariants} style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px',
            padding: '5px 14px', marginBottom: '16px',
            background: 'rgba(37,99,235,0.12)',
            border: '1px solid rgba(59,130,246,0.25)',
            borderRadius: '999px',
          }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#3b82f6', boxShadow: '0 0 8px #3b82f6' }} />
            <span style={{ fontSize: '0.75rem', color: '#93c5fd', fontWeight: 600, letterSpacing: '0.08em' }}>
              PROFIL CANDIDAT
            </span>
          </div>
          
          <h1 style={{
            fontFamily: "'Sora', sans-serif",
            fontSize: '1.5rem',
            fontWeight: 700,
            color: '#f8fafc',
            marginBottom: '8px',
            lineHeight: 1.3,
          }}>
            {exam.title || 'Épreuve'}
          </h1>
          
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            background: 'rgba(59,130,246,0.1)',
            padding: '6px 12px',
            borderRadius: '999px',
            marginTop: '8px',
          }}>
            <Clock size={14} color="#3b82f6" />
            <span style={{ fontSize: '0.8125rem', color: '#94a3b8' }}>
              Durée: {exam.duration || config?.totalTime || 60} minutes
            </span>
          </div>
        </motion.div>

        {selectedConfigDetails && (
          <motion.div variants={itemVariants} style={{
            marginBottom: '24px',
            padding: '18px',
            background: `${selectedConfigDetails.color}10`,
            border: `1px solid ${selectedConfigDetails.color}40`,
            borderRadius: '14px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
              <span style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                width: '32px', height: '32px', borderRadius: '8px',
                background: `${selectedConfigDetails.color}22`, color: selectedConfigDetails.color,
                fontSize: '0.9rem', fontWeight: 800
              }}>
                {selectedConfigDetails.key}
              </span>
              <div>
                <div style={{ color: '#f8fafc', fontSize: '0.9rem', fontWeight: 700 }}>
                  {selectedConfigDetails.label}
                </div>
                <div style={{ color: selectedConfigDetails.color, fontSize: '0.7rem', marginTop: '2px' }}>
                  {selectedConfigDetails.desc}
                </div>
              </div>
            </div>
            
            <div style={{
              background: 'rgba(0,0,0,0.2)',
              borderRadius: '10px',
              padding: '14px 16px',
              marginTop: '8px'
            }}>
              <div style={{ 
                display: 'flex', alignItems: 'center', gap: '6px', 
                marginBottom: '10px',
                color: selectedConfigDetails.color,
                fontSize: '0.75rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}>
                <Info size={14} />
                Instructions pour cette configuration
              </div>
              <ul style={{ margin: 0, paddingLeft: '20px' }}>
                {selectedConfigDetails.instructions.map((instruction, idx) => (
                  <li key={idx} style={{
                    color: '#cbd5e1',
                    fontSize: '0.8rem',
                    marginBottom: '6px',
                    lineHeight: 1.5
                  }}>
                    {instruction}
                  </li>
                ))}
              </ul>
            </div>
            
            {urlSessionId && (selectedConfigDetails.key === 'G' || selectedConfigDetails.key === 'H' || 
                              selectedConfigDetails.key === 'I' || selectedConfigDetails.key === 'J') && (
              <div style={{
                marginTop: '12px',
                padding: '8px 12px',
                background: 'rgba(16,185,129,0.1)',
                border: '1px solid rgba(16,185,129,0.3)',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <Monitor size={14} color="#10b981" />
                <span style={{ color: '#10b981', fontSize: '0.75rem' }}>
                  Connecté au terminal · Retour automatique après l'épreuve
                </span>
              </div>
            )}
          </motion.div>
        )}

        {!isOptionLocked && (
          <motion.div variants={itemVariants} style={{ marginBottom: '24px' }}>
            <button
              type="button"
              onClick={() => setShowConfigSelector(!showConfigSelector)}
              style={{
                width: '100%',
                padding: '12px',
                background: 'rgba(59,130,246,0.15)',
                border: '1px solid rgba(59,130,246,0.3)',
                borderRadius: '12px',
                color: '#60a5fa',
                fontSize: '0.875rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
            >
              <Settings size={16} />
              {showConfigSelector ? 'Masquer les configurations' : 'Changer de configuration (A à K)'}
            </button>
            
            {showConfigSelector && (
              <div style={{
                marginTop: '16px',
                display: 'grid',
                gridTemplateColumns: '1fr',
                gap: '8px',
                maxHeight: '350px',
                overflowY: 'auto',
                padding: '4px'
              }}>
                {EXAM_CONFIGURATIONS.map((cfg) => (
                  <label
                    key={cfg.key}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      padding: '12px',
                      background: selectedExamOption === cfg.key ? `${cfg.color}15` : 'rgba(255,255,255,0.03)',
                      border: `1px solid ${selectedExamOption === cfg.key ? cfg.color : 'rgba(59,130,246,0.15)'}`,
                      borderRadius: '10px',
                      cursor: 'pointer',
                      gap: '10px'
                    }}
                  >
                    <input
                      type="radio"
                      name="examOption"
                      value={cfg.key}
                      checked={selectedExamOption === cfg.key}
                      onChange={(e) => setSelectedExamOption(e.target.value)}
                      style={{ marginTop: '2px', accentColor: cfg.color }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                          width: '28px', height: '28px', borderRadius: '6px',
                          background: `${cfg.color}22`, color: cfg.color,
                          fontSize: '0.75rem', fontWeight: 800
                        }}>
                          {cfg.key}
                        </span>
                        <span style={{ color: '#f8fafc', fontSize: '0.85rem', fontWeight: 600 }}>
                          {cfg.label}
                        </span>
                      </div>
                      <p style={{ fontSize: '0.65rem', color: '#64748b', marginTop: '6px', lineHeight: 1.4 }}>
                        {cfg.desc}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </motion.div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <motion.div variants={itemVariants}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#94a3b8', marginBottom: '6px' }}>
              <User size={14} color="#3b82f6" style={{ marginRight: '4px', verticalAlign: 'middle' }} />
              Nom
            </label>
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '12px 16px',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(59,130,246,0.2)',
                borderRadius: '12px',
                color: '#f8fafc',
                fontSize: '0.9375rem',
                outline: 'none',
                boxSizing: 'border-box',
              }}
              placeholder="Nom de famille"
            />
          </motion.div>

          <motion.div variants={itemVariants}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#94a3b8', marginBottom: '6px' }}>
              <User size={14} color="#3b82f6" style={{ marginRight: '4px', verticalAlign: 'middle' }} />
              Prénom(s)
            </label>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '12px 16px',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(59,130,246,0.2)',
                borderRadius: '12px',
                color: '#f8fafc',
                fontSize: '0.9375rem',
                outline: 'none',
                boxSizing: 'border-box',
              }}
              placeholder="Prénom"
            />
          </motion.div>

          <motion.div variants={itemVariants}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#94a3b8', marginBottom: '6px' }}>
              <Hash size={14} color="#3b82f6" style={{ marginRight: '4px', verticalAlign: 'middle' }} />
              Matricule
            </label>
            <input
              type="text"
              value={matricule}
              onChange={(e) => setMatricule(e.target.value.toUpperCase())}
              required
              style={{
                width: '100%',
                padding: '12px 16px',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(59,130,246,0.2)',
                borderRadius: '12px',
                color: '#f8fafc',
                fontSize: '0.9375rem',
                outline: 'none',
                boxSizing: 'border-box',
                fontFamily: 'monospace',
              }}
              placeholder="2024-INFO-001"
            />
          </motion.div>

          <motion.div variants={itemVariants}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#94a3b8', marginBottom: '6px' }}>
              <Layers size={14} color="#3b82f6" style={{ marginRight: '4px', verticalAlign: 'middle' }} />
              Niveau
            </label>
            <input
              type="text"
              value={level}
              onChange={(e) => setLevel(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '12px 16px',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(59,130,246,0.2)',
                borderRadius: '12px',
                color: '#f8fafc',
                fontSize: '0.9375rem',
                outline: 'none',
                boxSizing: 'border-box',
              }}
              placeholder="Licence 1, Terminale..."
            />
          </motion.div>

          {isOptionLocked && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 12px',
                background: 'rgba(59,130,246,0.1)',
                border: '1px solid rgba(59,130,246,0.2)',
                borderRadius: '8px',
              }}
            >
              <Lock size={14} color="#3b82f6" />
              <p style={{ fontSize: '0.8125rem', color: '#94a3b8' }}>
                {urlOption ? 'Configuration définie par le superviseur' : 'Configuration définie par l\'épreuve'}
              </p>
            </motion.div>
          )}

          <motion.button
            variants={itemVariants}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={isSubmitted}
            style={{
              marginTop: '16px',
              width: '100%',
              padding: '16px',
              background: isSubmitted
                ? 'rgba(59,130,246,0.3)'
                : `linear-gradient(135deg, ${selectedConfigDetails?.color || '#3b82f6'}, ${selectedConfigDetails?.color || '#2563eb'}dd)`,
              border: 'none',
              borderRadius: '12px',
              color: '#fff',
              fontSize: '1rem',
              fontWeight: 600,
              cursor: isSubmitted ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: isSubmitted ? 'none' : `0 4px 20px ${selectedConfigDetails?.color || '#3b82f6'}40`,
            }}
          >
            {isSubmitted ? (
              <>
                <div style={{ width: '18px', height: '18px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                Chargement...
              </>
            ) : (
              <>
                {getButtonText()}
                <ChevronRight size={18} />
              </>
            )}
          </motion.button>
        </form>
      </motion.div>

      <Toaster 
        position="top-right"
        toastOptions={{
          style: {
            background: '#1e293b',
            color: '#f8fafc',
            border: '1px solid #3b82f6',
            borderRadius: '10px',
            padding: '12px 16px',
            fontSize: '0.875rem',
          },
        }}
      />

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default ProfileExamPage;