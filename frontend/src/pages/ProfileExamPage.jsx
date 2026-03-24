// src/pages/ProfileExamPage.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { motion } from 'framer-motion';
import { toast, Toaster } from 'react-hot-toast';
import io from 'socket.io-client';
import { 
  User, 
  BookOpen, 
  Hash, 
  Layers, 
  Home, 
  ArrowRight, 
  Lock,
  AlertCircle,
  Clock
} from 'lucide-react';

const NODE_BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'https://na2quizapp.onrender.com';

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
};

const ProfileExamPage = () => {
  const { examId } = useParams();
  const navigate = useNavigate();

  const [exam, setExam] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [matricule, setMatricule] = useState('');
  const [level, setLevel] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [selectedExamOption, setSelectedExamOption] = useState('A');
  const [isOptionLocked, setIsOptionLocked] = useState(false);

  const socketRef = useRef(null);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;

    const fetchExam = async () => {
      try {
        console.log('[ProfileExamPage] 🔍 Chargement examen:', examId);
        console.log('[ProfileExamPage] 📡 API URL:', `${NODE_BACKEND_URL}/api/exams/${examId}`);
        
        const response = await axios.get(`${NODE_BACKEND_URL}/api/exams/${examId}`);
        
        if (!isMounted.current) return;
        
        const examData = response.data;
        const normalizedQuestions = (examData.questions || []).map((q, idx) => ({
          ...q,
          text: q.text || q.question,
          id: q._id || idx,
          points: q.points || 1
        }));
        
        const normalizedExam = {
          ...examData,
          questions: normalizedQuestions
        };
        
        setExam(normalizedExam);
        console.log('[ProfileExamPage] ✅ Examen chargé:', normalizedExam.title);

        if (normalizedExam.examOption) {
          setSelectedExamOption(normalizedExam.examOption);
          setIsOptionLocked(true);
          toast(`Cette épreuve est pré-configurée en Option ${normalizedExam.examOption}.`, { 
            icon: 'ℹ️', 
            duration: 5000,
            style: {
              background: '#1e293b',
              color: '#f8fafc',
              border: '1px solid #3b82f6',
            }
          });
        }
      } catch (error) {
        console.error('[ProfileExamPage] ❌ Erreur chargement:', error);
        if (isMounted.current) {
          toast.error("Épreuve non trouvée ou erreur serveur.");
          navigate('/');
        }
      } finally {
        if (isMounted.current) {
          setIsLoading(false);
        }
      }
    };
    
    fetchExam();
    
    return () => {
      isMounted.current = false;
    };
  }, [examId, navigate]);

  // Connexion WebSocket
  useEffect(() => {
    console.log('[ProfileExamPage] 🔌 Connexion Socket.IO à:', NODE_BACKEND_URL);
    
    socketRef.current = io(NODE_BACKEND_URL, { 
      path: '/socket.io',
      transports: ['polling', 'websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketRef.current.on('connect', () => {
      console.log('[ProfileExamPage] ✅ Socket connecté, ID:', socketRef.current.id);
      socketRef.current.emit('registerSession', { type: 'student' });
    });

    socketRef.current.on('connect_error', (error) => {
      console.error('[ProfileExamPage] ❌ Erreur Socket:', error);
      toast.error("Impossible de se connecter au serveur.");
    });

    return () => {
      if (socketRef.current) {
        console.log('[ProfileExamPage] 🧹 Nettoyage socket');
        socketRef.current.disconnect();
      }
    };
  }, []);

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
        matricule: matricule.trim(),
        level: level.trim()
      };

      // Stocker dans localStorage
      localStorage.setItem('studentInfoForExam', JSON.stringify({
        examId: examId,
        info: studentInfoData,
        examDuration: exam.duration,
        examOption: selectedExamOption,
        examTitle: exam.title,
        terminalSessionId: null
      }));

      if (socketRef.current?.connected) {
        const status = selectedExamOption === 'B' ? 'waiting' : 'composing';
        
        // ✅ CORRECTION: Ne pas envoyer studentSocketId, utiliser sessionId
        socketRef.current.emit('studentReadyForExam', {
          examId: examId,
          studentInfo: studentInfoData,
          sessionId: socketRef.current.id,
          status: status,
          examOption: selectedExamOption
        });
        
        toast.success("Profil enregistré. En attente du démarrage...", { 
          id: 'submit-profile',
          icon: '⏳',
          duration: 5000
        });
        
        setTimeout(() => {
          navigate(`/exam/waiting/${examId}`);
        }, 1500);
      } else {
        toast.error("Connexion au serveur perdue. Rechargement...");
        setIsSubmitted(false);
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      }
    } catch (error) {
      console.error("[ProfileExamPage] ❌ Erreur soumission:", error);
      toast.error("Erreur lors de l'enregistrement.");
      setIsSubmitted(false);
    }
  };

  if (isLoading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #05071a 0%, #0a0f2e 60%, #05071a 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: "'DM Sans', sans-serif",
      }}>
        <div style={{
          width: '48px',
          height: '48px',
          border: '3px solid rgba(59,130,246,0.1)',
          borderTopColor: '#3b82f6',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
        }} />
        <p style={{ color: '#94a3b8', marginTop: '16px' }}>Chargement de l'épreuve...</p>
        <Toaster />
        <style>{`
          @keyframes spin { to { transform: rotate(360deg); } }
        `}</style>
      </div>
    );
  }

  if (!exam) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #05071a 0%, #0a0f2e 60%, #05071a 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: "'DM Sans', sans-serif",
      }}>
        <div style={{
          background: 'rgba(239,68,68,0.1)',
          border: '1px solid #ef4444',
          borderRadius: '12px',
          padding: '20px',
          color: '#ef4444',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}>
          <AlertCircle size={24} />
          <p>Épreuve non trouvée.</p>
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
            fontFamily: "'DM Sans', sans-serif",
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
          maxWidth: '500px',
          background: 'rgba(15,23,42,0.7)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(59,130,246,0.15)',
          borderRadius: '24px',
          padding: '40px 32px',
          boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
          marginTop: '60px',
        }}
      >
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
              Durée: {exam.duration} minutes
            </span>
          </div>
          
          <p style={{ 
            fontSize: '0.9375rem', 
            color: 'rgba(203,213,225,0.7)',
            marginTop: '16px',
          }}>
            Renseignez vos informations pour rejoindre la salle d'attente
          </p>
        </motion.div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <motion.div variants={itemVariants}>
            <label style={{ 
              display: 'block', 
              fontSize: '0.875rem', 
              fontWeight: 500, 
              color: '#94a3b8', 
              marginBottom: '6px'
            }}>
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
            <label style={{ 
              display: 'block', 
              fontSize: '0.875rem', 
              fontWeight: 500, 
              color: '#94a3b8', 
              marginBottom: '6px'
            }}>
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
            <label style={{ 
              display: 'block', 
              fontSize: '0.875rem', 
              fontWeight: 500, 
              color: '#94a3b8', 
              marginBottom: '6px'
            }}>
              <Hash size={14} color="#3b82f6" style={{ marginRight: '4px', verticalAlign: 'middle' }} />
              Matricule
            </label>
            <input
              type="text"
              value={matricule}
              onChange={(e) => setMatricule(e.target.value)}
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
              placeholder="2024-INFO-001"
            />
          </motion.div>

          <motion.div variants={itemVariants}>
            <label style={{ 
              display: 'block', 
              fontSize: '0.875rem', 
              fontWeight: 500, 
              color: '#94a3b8', 
              marginBottom: '6px'
            }}>
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

          <motion.div variants={itemVariants} style={{ marginTop: '8px' }}>
            <p style={{ 
              fontSize: '0.875rem', 
              fontWeight: 500, 
              color: '#94a3b8', 
              marginBottom: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}>
              <BookOpen size={14} color="#3b82f6" />
              Option d'examen
            </p>
            
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '12px',
              opacity: isOptionLocked ? 0.6 : 1,
            }}>
              {['A', 'B', 'C', 'D'].map((option) => (
                <label
                  key={option}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '12px',
                    background: selectedExamOption === option
                      ? 'rgba(59,130,246,0.15)'
                      : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${selectedExamOption === option
                      ? '#3b82f6'
                      : 'rgba(59,130,246,0.15)'}`,
                    borderRadius: '10px',
                    cursor: isOptionLocked ? 'not-allowed' : 'pointer',
                  }}
                >
                  <input
                    type="radio"
                    name="examOption"
                    value={option}
                    checked={selectedExamOption === option}
                    onChange={(e) => setSelectedExamOption(e.target.value)}
                    disabled={isOptionLocked}
                    style={{ 
                      marginRight: '8px', 
                      accentColor: '#3b82f6',
                      width: '16px',
                      height: '16px',
                    }}
                  />
                  <span style={{ 
                    color: selectedExamOption === option ? '#f8fafc' : '#94a3b8',
                    fontSize: '0.9375rem',
                    fontWeight: selectedExamOption === option ? 500 : 400,
                  }}>
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
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  marginTop: '12px',
                  padding: '8px 12px',
                  background: 'rgba(59,130,246,0.1)',
                  border: '1px solid rgba(59,130,246,0.2)',
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
                : 'linear-gradient(135deg, #3b82f6, #2563eb)',
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
              boxShadow: isSubmitted ? 'none' : '0 4px 20px rgba(59,130,246,0.3)',
            }}
          >
            {isSubmitted ? (
              <>
                <div style={{
                  width: '18px',
                  height: '18px',
                  border: '2px solid rgba(255,255,255,0.3)',
                  borderTopColor: '#fff',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                }} />
                Chargement...
              </>
            ) : (
              <>
                Rejoindre la salle d'attente
                <ArrowRight size={18} />
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
