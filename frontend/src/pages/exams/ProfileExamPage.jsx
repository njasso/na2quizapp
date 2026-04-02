// src/pages/exams/ProfileExamPage.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { toast, Toaster } from 'react-hot-toast';
import io from 'socket.io-client';
import { 
  User, BookOpen, Hash, Layers, Home, ArrowRight, Lock,
  AlertCircle, Clock, Settings, RefreshCw, CheckCircle, XCircle, Info, Award
} from 'lucide-react';

const NODE_BACKEND_URL = process.env.NODE_ENV === 'production' 
  ? (process.env.REACT_APP_BACKEND_URL || 'https://na2quizapp.onrender.com')
  : 'http://localhost:5000';

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
};

const ConfigIndicator = ({ config }) => {
  const features = [];
  if (config?.openRange) features.push(`📖 ${config.requiredQuestions} questions`);
  if (config?.allowRetry) features.push('🔄 Reprise');
  if (config?.showBinaryResult) features.push('✓/✗ Résultat');
  if (config?.showCorrectAnswer) features.push('💡 Bonne réponse');
  
  if (features.length === 0) return null;
  
  return (
    <div style={{
      display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px',
      paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.05)'
    }}>
      {features.map((feature, i) => (
        <span key={i} style={{
          fontSize: '0.65rem', padding: '2px 6px',
          background: 'rgba(99,102,241,0.15)', borderRadius: '4px', color: '#a5b4fc'
        }}>
          {feature}
        </span>
      ))}
    </div>
  );
};

const ValidationAlert = ({ message, type, onClose }) => (
  <motion.div
    initial={{ opacity: 0, y: -10 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -10 }}
    style={{
      marginBottom: '16px', padding: '10px 14px',
      background: type === 'error' ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.1)',
      border: `1px solid ${type === 'error' ? '#ef4444' : '#f59e0b'}`,
      borderRadius: '8px', display: 'flex', alignItems: 'center',
      gap: '8px', justifyContent: 'space-between'
    }}
  >
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      {type === 'error' ? <XCircle size={16} color="#ef4444" /> : <AlertCircle size={16} color="#f59e0b" />}
      <span style={{ color: type === 'error' ? '#fca5a5' : '#fcd34d', fontSize: '0.8rem' }}>{message}</span>
    </div>
    <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}>
      ✕
    </button>
  </motion.div>
);

const ProfileExamPage = () => {
  const { examId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // États
  const [exam, setExam] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [matricule, setMatricule] = useState('');
  const [level, setLevel] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [selectedExamOption, setSelectedExamOption] = useState('A');
  const [isOptionLocked, setIsOptionLocked] = useState(false);
  const [config, setConfig] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const [validationErrors, setValidationErrors] = useState({});
  const [showValidationAlert, setShowValidationAlert] = useState(false);
  const [validationMessage, setValidationMessage] = useState('');
  const [validationType, setValidationType] = useState('error');
  const [cachedInfo, setCachedInfo] = useState(null);

  // Refs
  const socketRef = useRef(null);
  const isMounted = useRef(true);
  const reconnectAttempts = useRef(0);

  // ✅ Récupérer et stocker le token depuis l'URL
  useEffect(() => {
    const urlToken = searchParams.get('token');
    if (urlToken) {
      console.log('[ProfileExamPage] ✅ Token reçu via URL, stockage dans localStorage');
      localStorage.setItem('userToken', urlToken);
    }
  }, [searchParams]);

  const getOptionLabel = (option) => {
    const labels = {
      A: 'Collective Figée',
      B: 'Collective Souple',
      C: 'Personnalisée',
      D: 'Aléatoire'
    };
    return labels[option] || `Option ${option}`;
  };

  const validateFields = useCallback(() => {
    const errors = {};
    if (!lastName.trim()) errors.lastName = 'Le nom est requis';
    if (!firstName.trim()) errors.firstName = 'Le prénom est requis';
    if (!matricule.trim()) errors.matricule = 'Le matricule est requis';
    if (!level.trim()) errors.level = 'Le niveau est requis';
    
    if (matricule.trim() && !/^[A-Za-z0-9\-_]+$/.test(matricule.trim())) {
      errors.matricule = 'Le matricule ne doit contenir que des lettres, chiffres, tirets et underscores';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  }, [lastName, firstName, matricule, level]);

  // Récupération des informations en cache
  useEffect(() => {
    const savedInfo = localStorage.getItem(`studentInfo_${examId}`);
    if (savedInfo) {
      try {
        const parsed = JSON.parse(savedInfo);
        setCachedInfo(parsed);
        if (parsed.lastName) setLastName(parsed.lastName);
        if (parsed.firstName) setFirstName(parsed.firstName);
        if (parsed.matricule) setMatricule(parsed.matricule);
        if (parsed.level) setLevel(parsed.level);
      } catch (e) {}
    }
  }, [examId]);

  // Sauvegarde des informations en cache
  useEffect(() => {
    if (lastName || firstName || matricule || level) {
      localStorage.setItem(`studentInfo_${examId}`, JSON.stringify({
        lastName, firstName, matricule, level, updatedAt: new Date().toISOString()
      }));
    }
  }, [lastName, firstName, matricule, level, examId]);

  // Chargement de l'examen
  useEffect(() => {
    isMounted.current = true;

    const urlOption = searchParams.get('option');
    if (urlOption && ['A', 'B', 'C', 'D'].includes(urlOption)) {
      setSelectedExamOption(urlOption);
      setIsOptionLocked(true);
    }

    const fetchExam = async () => {
      setIsLoading(true);
      try {
        const token = localStorage.getItem('userToken');
        const response = await axios.get(`${NODE_BACKEND_URL}/api/exams/${examId}`, {
          timeout: 15000,
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        
        if (!isMounted.current) return;
        
        const examData = response.data;
        
        const normalizedQuestions = (examData.questions || []).map((q, idx) => ({
          ...q,
          libQuestion: q.libQuestion || q.question || q.text,
          text: q.libQuestion || q.question || q.text,
          question: q.libQuestion || q.question || q.text,
          id: q._id || idx,
          points: q.points || 1
        }));
        
        const normalizedExam = {
          ...examData,
          questions: normalizedQuestions
        };
        
        setExam(normalizedExam);
        
        if (examData.config) {
          setConfig(examData.config);
        }

        if (urlOption) {
          // Option déjà définie
        } else if (normalizedExam.examOption) {
          setSelectedExamOption(normalizedExam.examOption);
          setIsOptionLocked(true);
          toast(`Cette épreuve est pré-configurée en Option ${normalizedExam.examOption}.`, { 
            icon: 'ℹ️', duration: 5000,
            style: { background: '#1e293b', color: '#f8fafc', border: '1px solid #3b82f6' }
          });
        }
      } catch (error) {
        console.error('Erreur chargement:', error);
        if (isMounted.current) {
          if (error.code === 'ECONNABORTED') {
            toast.error('Le serveur ne répond pas. Vérifiez votre connexion.');
          } else if (error.response?.status === 404) {
            toast.error('Épreuve non trouvée.');
            navigate('/available-exams');
          } else if (error.response?.status === 401) {
            toast.error('Session expirée. Veuillez vous reconnecter.');
            navigate('/login');
          } else {
            toast.error('Erreur de chargement. Veuillez réessayer.');
          }
        }
      } finally {
        if (isMounted.current) setIsLoading(false);
      }
    };
    
    fetchExam();
    
    return () => { isMounted.current = false; };
  }, [examId, navigate, searchParams]);

  // Connexion WebSocket
  useEffect(() => {
    const connectSocket = () => {
      setConnectionStatus('connecting');
      
      socketRef.current = io(NODE_BACKEND_URL, { 
        path: '/socket.io',
        transports: ['polling', 'websocket'],
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 10000,
      });

      socketRef.current.on('connect', () => {
        setConnectionStatus('connected');
        reconnectAttempts.current = 0;
        socketRef.current.emit('registerSession', { type: 'student', examId });
      });

      socketRef.current.on('connect_error', (error) => {
        setConnectionStatus('error');
        reconnectAttempts.current++;
        if (reconnectAttempts.current >= 5) {
          toast.error('Problème de connexion persistante. Vérifiez votre réseau.');
        }
      });

      socketRef.current.on('reconnect', (attemptNumber) => {
        setConnectionStatus('connected');
        toast.success('Reconnecté au serveur');
      });
    };
    
    connectSocket();
    
    return () => {
      if (socketRef.current) {
        socketRef.current.removeAllListeners();
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [examId]);

  // Validation en temps réel
  useEffect(() => {
    if (lastName || firstName || matricule || level) {
      validateFields();
    }
  }, [lastName, firstName, matricule, level, validateFields]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitted) return;

    if (!validateFields()) {
      setValidationMessage('Veuillez corriger les erreurs dans le formulaire');
      setValidationType('error');
      setShowValidationAlert(true);
      setTimeout(() => setShowValidationAlert(false), 5000);
      return;
    }

    if (!firstName || !lastName || !matricule || !level) {
      toast.error("Tous les champs sont requis.");
      return;
    }

    setIsSubmitted(true);
    toast.loading("Enregistrement du profil...", { id: 'submit-profile' });

    try {
      if (!exam || !exam.duration) {
        toast.error("Durée d'épreuve manquante.");
        toast.dismiss('submit-profile');
        setIsSubmitted(false);
        return;
      }

      const studentInfoData = {
        name: `${lastName.trim()} ${firstName.trim()}`,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        matricule: matricule.trim().toUpperCase(),
        level: level.trim()
      };

      const storageData = {
        examId: examId,
        info: studentInfoData,
        examDuration: exam.duration,
        examOption: selectedExamOption,
        examTitle: exam.title,
        config: config,
        terminalSessionId: null,
        timestamp: Date.now()
      };
      
      localStorage.setItem('studentInfoForExam', JSON.stringify(storageData));
      localStorage.setItem(`studentInfo_${examId}_submitted`, JSON.stringify({
        ...studentInfoData, examTitle: exam.title, examOption: selectedExamOption, submittedAt: new Date().toISOString()
      }));

      if (socketRef.current?.connected) {
        const status = selectedExamOption === 'B' ? 'waiting' : 'composing';
        
        socketRef.current.emit('studentReadyForExam', {
          examId: examId,
          studentInfo: studentInfoData,
          sessionId: socketRef.current.id,
          status: status,
          examOption: selectedExamOption,
          config: config
        });
        
        toast.success("Profil enregistré avec succès !", { id: 'submit-profile', icon: '✅', duration: 3000 });
        
        if (selectedExamOption === 'B') {
          setTimeout(() => navigate(`/exam/waiting/${examId}`), 800);
        } else {
          setTimeout(() => navigate(`/exam/compose/${examId}`), 800);
        }
      } else {
        toast.error("Connexion au serveur perdue. Tentative de reconnexion...", { id: 'submit-profile' });
        setIsSubmitted(false);
        if (socketRef.current) {
          socketRef.current.connect();
          setTimeout(() => {
            if (socketRef.current?.connected) handleSubmit(e);
            else toast.error("Impossible de se connecter. Veuillez rafraîchir la page.");
          }, 2000);
        }
      }
    } catch (error) {
      console.error("Erreur soumission:", error);
      toast.error("Erreur lors de l'enregistrement. Veuillez réessayer.", { id: 'submit-profile' });
      setIsSubmitted(false);
    }
  };

  const renderFieldError = (fieldName) => {
    if (validationErrors[fieldName]) {
      return (
        <p style={{ color: '#ef4444', fontSize: '0.7rem', marginTop: '4px' }}>
          <AlertCircle size={10} style={{ display: 'inline', marginRight: '4px' }} />
          {validationErrors[fieldName]}
        </p>
      );
    }
    return null;
  };

  if (isLoading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #05071a 0%, #0a0f2e 60%, #05071a 100%)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        fontFamily: "'DM Sans', sans-serif",
      }}>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          style={{
            width: '48px', height: '48px',
            border: '3px solid rgba(59,130,246,0.1)',
            borderTopColor: '#3b82f6',
            borderRadius: '50%',
          }}
        />
        <p style={{ color: '#94a3b8', marginTop: '16px' }}>Chargement de l'épreuve...</p>
        <Toaster />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!exam) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #05071a 0%, #0a0f2e 60%, #05071a 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: "'DM Sans', sans-serif",
      }}>
        <div style={{
          background: 'rgba(239,68,68,0.1)', border: '1px solid #ef4444',
          borderRadius: '12px', padding: '20px', color: '#ef4444',
          display: 'flex', alignItems: 'center', gap: '12px',
        }}>
          <AlertCircle size={24} />
          <p>Épreuve non trouvée.</p>
        </div>
        <Toaster />
      </div>
    );
  }

  const isOptionB = selectedExamOption === 'B';
  const connectionColor = connectionStatus === 'connected' ? '#10b981' : connectionStatus === 'connecting' ? '#f59e0b' : '#ef4444';
  const connectionText = connectionStatus === 'connected' ? 'Connecté' : connectionStatus === 'connecting' ? 'Connexion...' : 'Déconnecté';

  const totalQuestions = exam.questions?.length || 0;
  const totalPoints = exam.questions?.reduce((sum, q) => sum + (q.points || 1), 0) || 0;

  return (
    <div style={{
      minHeight: '100vh', fontFamily: "'DM Sans', sans-serif",
      background: 'linear-gradient(135deg, #05071a 0%, #0a0f2e 60%, #05071a 100%)',
      position: 'relative', overflow: 'hidden', display: 'flex',
      alignItems: 'center', justifyContent: 'center', padding: '20px',
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
        background: 'rgba(5,7,26,0.88)', backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(59,130,246,0.12)',
        padding: '0 32px', height: '60px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{
          fontFamily: "'Sora', sans-serif", fontWeight: 800, fontSize: '1.125rem',
          letterSpacing: '-0.02em',
          background: 'linear-gradient(135deg, #60a5fa, #a78bfa)',
          WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent',
        }}>
          NA²QUIZ
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '4px 12px', background: `${connectionColor}15`,
            borderRadius: '20px', border: `1px solid ${connectionColor}30`
          }}>
            <div style={{
              width: '8px', height: '8px', borderRadius: '50%',
              background: connectionColor,
              animation: connectionStatus === 'connected' ? 'pulse 1.5s infinite' : 'none'
            }} />
            <span style={{ fontSize: '0.75rem', color: connectionColor }}>{connectionText}</span>
          </div>
          <motion.button
            whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
            onClick={() => navigate('/')}
            style={{
              display: 'flex', alignItems: 'center', gap: '7px',
              padding: '8px 16px', borderRadius: '8px',
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: '#cbd5e1', fontSize: '0.875rem', fontWeight: 500,
              cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
            }}
          >
            <Home size={15} /> Accueil
          </motion.button>
        </div>
      </header>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        style={{
          position: 'relative', zIndex: 1, width: '100%', maxWidth: '550px',
          background: 'rgba(15,23,42,0.7)', backdropFilter: 'blur(12px)',
          border: '1px solid rgba(59,130,246,0.15)', borderRadius: '24px',
          padding: '40px 32px', boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
          marginTop: '60px',
        }}
      >
        <AnimatePresence>
          {showValidationAlert && (
            <ValidationAlert
              message={validationMessage}
              type={validationType}
              onClose={() => setShowValidationAlert(false)}
            />
          )}
        </AnimatePresence>

        <motion.div variants={itemVariants} style={{ textAlign: 'center', marginBottom: '32px' }}>
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
            fontFamily: "'Sora', sans-serif", fontSize: '1.5rem', fontWeight: 700,
            color: '#f8fafc', marginBottom: '8px', lineHeight: 1.3,
          }}>
            {exam.title || 'Épreuve'}
          </h1>
          
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px',
            marginTop: '8px', flexWrap: 'wrap',
          }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              background: 'rgba(59,130,246,0.1)', padding: '4px 10px',
              borderRadius: '999px',
            }}>
              <Clock size={14} color="#3b82f6" />
              <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                {exam.duration} min
              </span>
            </div>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              background: 'rgba(139,92,246,0.1)', padding: '4px 10px',
              borderRadius: '999px',
            }}>
              <BookOpen size={14} color="#8b5cf6" />
              <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                {totalQuestions} questions
              </span>
            </div>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              background: 'rgba(245,158,11,0.1)', padding: '4px 10px',
              borderRadius: '999px',
            }}>
              <Award size={14} color="#f59e0b" />
              <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                {totalPoints} points
              </span>
            </div>
          </div>
          
          <p style={{ 
            fontSize: '0.875rem', color: 'rgba(203,213,225,0.7)',
            marginTop: '16px',
          }}>
            Renseignez vos informations pour {isOptionB ? 'rejoindre la salle d\'attente' : 'commencer l\'examen'}
          </p>
        </motion.div>

        {config && (
          <motion.div
            variants={itemVariants}
            style={{
              marginBottom: '24px', padding: '16px',
              background: 'rgba(99,102,241,0.08)',
              border: '1px solid rgba(99,102,241,0.2)',
              borderRadius: '12px', transition: 'all 0.2s'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <Settings size={16} color="#8b5cf6" />
              <h3 style={{ color: '#f8fafc', fontSize: '0.9rem', fontWeight: 600 }}>Configuration de l'épreuve</h3>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.8rem' }}>
              <span style={{ color: '#94a3b8' }}>Option:</span>
              <span style={{ color: '#f8fafc' }}>{getOptionLabel(config.examOption)} ({config.examOption})</span>
              
              {exam.domain && (
                <>
                  <span style={{ color: '#94a3b8' }}>Domaine:</span>
                  <span style={{ color: '#f8fafc' }}>{exam.domain}</span>
                </>
              )}
              
              {exam.level && (
                <>
                  <span style={{ color: '#94a3b8' }}>Niveau:</span>
                  <span style={{ color: '#f8fafc' }}>{exam.level}</span>
                </>
              )}
              
              {exam.subject && (
                <>
                  <span style={{ color: '#94a3b8' }}>Matière:</span>
                  <span style={{ color: '#f8fafc' }}>{exam.subject}</span>
                </>
              )}
              
              {config.openRange && (
                <>
                  <span style={{ color: '#94a3b8' }}>Plage ouverte:</span>
                  <span style={{ color: '#f8fafc' }}>{config.requiredQuestions} questions à traiter</span>
                </>
              )}
              
              <span style={{ color: '#94a3b8' }}>Séquencement:</span>
              <span style={{ color: '#f8fafc' }}>{config.sequencing === 'identical' ? 'Identique pour tous' : 'Aléatoire par étudiant'}</span>
              
              {config.allowRetry && (
                <>
                  <span style={{ color: '#94a3b8' }}>Reprise:</span>
                  <span style={{ color: '#f8fafc' }}>Autorisée (une fois)</span>
                </>
              )}
              
              <span style={{ color: '#94a3b8' }}>Chronomètre:</span>
              <span style={{ color: '#f8fafc' }}>
                {config.timerPerQuestion 
                  ? `${config.timePerQuestion} sec/question` 
                  : `${config.totalTime} min totales`}
              </span>
            </div>
            <ConfigIndicator config={config} />
          </motion.div>
        )}

        {cachedInfo && (
          <motion.div
            variants={itemVariants}
            style={{
              marginBottom: '16px', padding: '8px 12px',
              background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.2)',
              borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px'
            }}
          >
            <Info size={14} color="#10b981" />
            <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>
              Session précédente chargée
            </span>
          </motion.div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <motion.div variants={itemVariants}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#94a3b8', marginBottom: '6px' }}>
              <User size={14} color="#3b82f6" style={{ marginRight: '4px', verticalAlign: 'middle' }} />
              Nom *
            </label>
            <input
              type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} required
              style={{
                width: '100%', padding: '12px 16px', background: 'rgba(255,255,255,0.05)',
                border: `1px solid ${validationErrors.lastName ? '#ef4444' : 'rgba(59,130,246,0.2)'}`,
                borderRadius: '12px', color: '#f8fafc', fontSize: '0.9375rem',
                outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s'
              }}
              placeholder="Nom de famille"
            />
            {renderFieldError('lastName')}
          </motion.div>

          <motion.div variants={itemVariants}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#94a3b8', marginBottom: '6px' }}>
              <User size={14} color="#3b82f6" style={{ marginRight: '4px', verticalAlign: 'middle' }} />
              Prénom(s) *
            </label>
            <input
              type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} required
              style={{
                width: '100%', padding: '12px 16px', background: 'rgba(255,255,255,0.05)',
                border: `1px solid ${validationErrors.firstName ? '#ef4444' : 'rgba(59,130,246,0.2)'}`,
                borderRadius: '12px', color: '#f8fafc', fontSize: '0.9375rem', outline: 'none'
              }}
              placeholder="Prénom"
            />
            {renderFieldError('firstName')}
          </motion.div>

          <motion.div variants={itemVariants}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#94a3b8', marginBottom: '6px' }}>
              <Hash size={14} color="#3b82f6" style={{ marginRight: '4px', verticalAlign: 'middle' }} />
              Matricule *
            </label>
            <input
              type="text" value={matricule} onChange={(e) => setMatricule(e.target.value.toUpperCase())} required
              style={{
                width: '100%', padding: '12px 16px', background: 'rgba(255,255,255,0.05)',
                border: `1px solid ${validationErrors.matricule ? '#ef4444' : 'rgba(59,130,246,0.2)'}`,
                borderRadius: '12px', color: '#f8fafc', fontSize: '0.9375rem',
                outline: 'none', fontFamily: 'monospace'
              }}
              placeholder="2024-INFO-001"
            />
            {renderFieldError('matricule')}
          </motion.div>

          <motion.div variants={itemVariants}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#94a3b8', marginBottom: '6px' }}>
              <Layers size={14} color="#3b82f6" style={{ marginRight: '4px', verticalAlign: 'middle' }} />
              Niveau *
            </label>
            <input
              type="text" value={level} onChange={(e) => setLevel(e.target.value)} required
              style={{
                width: '100%', padding: '12px 16px', background: 'rgba(255,255,255,0.05)',
                border: `1px solid ${validationErrors.level ? '#ef4444' : 'rgba(59,130,246,0.2)'}`,
                borderRadius: '12px', color: '#f8fafc', fontSize: '0.9375rem', outline: 'none'
              }}
              placeholder="Licence 1, Terminale C, BTS..."
            />
            {renderFieldError('level')}
          </motion.div>

          <motion.div variants={itemVariants} style={{ marginTop: '8px' }}>
            <p style={{ fontSize: '0.875rem', fontWeight: 500, color: '#94a3b8', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <BookOpen size={14} color="#3b82f6" /> Option d'examen
            </p>
            
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px',
              opacity: isOptionLocked ? 0.6 : 1,
            }}>
              {['A', 'B', 'C', 'D'].map((option) => (
                <label
                  key={option}
                  style={{
                    display: 'flex', alignItems: 'center', padding: '12px',
                    background: selectedExamOption === option ? 'rgba(59,130,246,0.15)' : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${selectedExamOption === option ? '#3b82f6' : 'rgba(59,130,246,0.15)'}`,
                    borderRadius: '10px',
                    cursor: isOptionLocked ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  <input
                    type="radio" name="examOption" value={option}
                    checked={selectedExamOption === option}
                    onChange={(e) => setSelectedExamOption(e.target.value)}
                    disabled={isOptionLocked}
                    style={{ marginRight: '8px', accentColor: '#3b82f6', width: '16px', height: '16px' }}
                  />
                  <span style={{ color: selectedExamOption === option ? '#f8fafc' : '#94a3b8', fontSize: '0.9375rem' }}>
                    Option {option}
                  </span>
                </label>
              ))}
            </div>
            
            {isOptionLocked && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  marginTop: '12px', padding: '8px 12px',
                  background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)',
                  borderRadius: '8px',
                }}
              >
                <Lock size={14} color="#3b82f6" />
                <p style={{ fontSize: '0.8125rem', color: '#94a3b8' }}>
                  Option définie par le superviseur
                </p>
              </motion.div>
            )}
          </motion.div>

          <motion.button
            variants={itemVariants}
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={isSubmitted || connectionStatus === 'connecting'}
            style={{
              marginTop: '16px', width: '100%', padding: '16px',
              background: isSubmitted || connectionStatus === 'connecting'
                ? 'rgba(59,130,246,0.3)'
                : 'linear-gradient(135deg, #3b82f6, #2563eb)',
              border: 'none', borderRadius: '12px', color: '#fff',
              fontSize: '1rem', fontWeight: 600,
              cursor: (isSubmitted || connectionStatus === 'connecting') ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              boxShadow: isSubmitted ? 'none' : '0 4px 20px rgba(59,130,246,0.3)',
              transition: 'all 0.2s'
            }}
          >
            {isSubmitted ? (
              <><RefreshCw size={18} style={{ animation: 'spin 1s linear infinite' }} /> Enregistrement...</>
            ) : connectionStatus === 'connecting' ? (
              <><RefreshCw size={18} style={{ animation: 'spin 1s linear infinite' }} /> Connexion au serveur...</>
            ) : (
              <>{isOptionB ? 'Rejoindre la salle d\'attente' : 'Commencer l\'examen'} <ArrowRight size={18} /></>
            )}
          </motion.button>
          
          {isOptionB && (
            <motion.p
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              style={{ textAlign: 'center', fontSize: '0.75rem', color: '#64748b', marginTop: '8px' }}
            >
              ⏳ Vous serez mis en attente jusqu'au démarrage par le superviseur
            </motion.p>
          )}
        </form>
      </motion.div>

      <Toaster position="top-right" toastOptions={{
        style: { background: '#1e293b', color: '#f8fafc', border: '1px solid #3b82f6', borderRadius: '10px', padding: '12px 16px', fontSize: '0.875rem' }
      }} />

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.5; transform: scale(1.2); } }
      `}</style>
    </div>
  );
};

export default ProfileExamPage;