import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { toast, Toaster } from 'react-hot-toast';
import io from 'socket.io-client';
import { Clock, Users, Home, RefreshCw, Wifi, WifiOff, Loader } from 'lucide-react';

const NODE_BACKEND_URL = process.env.REACT_APP_BACKEND_URL || (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:5000');
const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || NODE_BACKEND_URL;

const WaitingPage = () => {
  const { examId } = useParams();
  const navigate = useNavigate();
  const [studentInfo, setStudentInfo] = useState(null);
  const [waitingCount, setWaitingCount] = useState(0);
  const [examTitle, setExamTitle] = useState('');
  const [examOption, setExamOption] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [reconnectAttempt, setReconnectAttempt] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  
  const socketRef = useRef(null);
  const redirectTimeoutRef = useRef(null);
  const stableSessionIdRef = useRef(null);
  const pingIntervalRef = useRef(null);
  const timerIntervalRef = useRef(null);

  // Nettoyage propre des ressources
  const cleanupBeforeRedirect = useCallback(() => {
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = null;
    }
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (socketRef.current) {
      socketRef.current.removeAllListeners();
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    if (redirectTimeoutRef.current) {
      clearTimeout(redirectTimeoutRef.current);
      redirectTimeoutRef.current = null;
    }
  }, []);

  // Timer pour afficher le temps d'attente
  useEffect(() => {
    timerIntervalRef.current = setInterval(() => {
      setElapsedTime(prev => prev + 1);
    }, 1000);
    
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, []);

  // Formater le temps d'attente
  const formatWaitingTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins === 0) return `${secs} secondes`;
    return `${mins} minute${mins > 1 ? 's' : ''} ${secs > 0 ? `et ${secs} seconde${secs > 1 ? 's' : ''}` : ''}`;
  };

  useEffect(() => {
    const storedInfo = localStorage.getItem('studentInfoForExam');
    if (!storedInfo) {
      toast.error('Informations étudiant manquantes');
      navigate(`/exam/profile/${examId}`, { replace: true });
      return;
    }

    try {
      const parsed = JSON.parse(storedInfo);
      if (parsed.examId !== examId) {
        toast.error('Cette épreuve ne correspond pas à votre session');
        navigate(`/exam/profile/${examId}`, { replace: true });
        return;
      }
      
      setStudentInfo(parsed.info);
      setExamTitle(parsed.examTitle || 'Épreuve');
      setExamOption(parsed.examOption || 'A');

      // Session ID stable par onglet (pour éviter les doublons)
      const stableKey = `studentSessionId_${examId}`;
      let stableId = sessionStorage.getItem(stableKey);
      if (!stableId) {
        stableId = `STU_${examId.slice(-8)}_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
        sessionStorage.setItem(stableKey, stableId);
      }
      stableSessionIdRef.current = stableId;

      // Configuration Socket.IO
      socketRef.current = io(SOCKET_URL, {
        transports: ['polling'],  // ✅ Polling uniquement
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 10000,
        timeout: 20000,
        forceNew: false,
        autoConnect: true,
        upgrade: false  // ✅ Désactiver WebSocket
      });

      // Événements Socket.IO
      socketRef.current.on('connect', () => {
        console.log('✅ Connecté en attente, ID:', socketRef.current.id);
        setIsConnected(true);
        setReconnectAttempt(0);
        
        // Enregistrer la session
        socketRef.current.emit('registerSession', { 
          type: 'student',
          sessionId: stableSessionIdRef.current,
          examId: examId,
          status: parsed.examOption === 'B' ? 'waiting' : 'composing',
          studentInfo: parsed.info,
          examOption: parsed.examOption,
          config: parsed.config || null
        });
        
        // Envoyer ready pour l'examen
        const status = parsed.examOption === 'B' ? 'waiting' : 'composing';
        console.log(`📋 Envoi studentReadyForExam: status=${status}, option=${parsed.examOption}`);
        
        socketRef.current.emit('studentReadyForExam', {
          examId: examId,
          studentInfo: parsed.info,
          sessionId: stableSessionIdRef.current,
          status: status,
          examOption: parsed.examOption,
          config: parsed.config || null
        });
      });

      socketRef.current.on('disconnect', (reason) => {
        console.log('❌ Déconnecté:', reason);
        setIsConnected(false);
        if (reason !== 'io client disconnect') {
          toast.loading('Reconnexion au serveur...', { id: 'reconnect' });
        }
      });

      socketRef.current.on('connect_error', (error) => {
        console.error('❌ Erreur de connexion:', error.message);
        setIsConnected(false);
        toast.error('Erreur de connexion, tentative de reconnexion...', { id: 'connect-error', duration: 2000 });
      });

      socketRef.current.on('reconnect_attempt', (attempt) => {
        setReconnectAttempt(attempt);
        console.log(`🔄 Tentative de reconnexion ${attempt}`);
      });

      socketRef.current.on('reconnect', () => {
        console.log('✅ Reconnecté');
        toast.success('Reconnecté au serveur', { id: 'reconnect', duration: 2000 });
      });

      socketRef.current.on('examStartedForOptionB', (data) => {
        console.log('🚀 Option B démarré:', data);
        if (data.examId === examId) {
          toast.success("L'examen démarre maintenant !", { duration: 2000, icon: '🚀' });
          cleanupBeforeRedirect();
          redirectTimeoutRef.current = setTimeout(() => {
            navigate(`/exam/compose/${examId}`, { replace: true });
          }, 1500);
        }
      });

      socketRef.current.on('waitingCountUpdate', (data) => {
        console.log('📊 Mise à jour compteur:', data);
        if (data.examId === examId) {
          setWaitingCount(data.count);
        }
      });

      socketRef.current.on('examCanceled', (data) => {
        if (data.examId === examId) {
          toast.error('L\'épreuve a été annulée par le superviseur', { duration: 5000 });
          cleanupBeforeRedirect();
          redirectTimeoutRef.current = setTimeout(() => {
            navigate(`/exam/profile/${examId}`, { replace: true });
          }, 3000);
        }
      });

      // Ping pour maintenir la connexion
      pingIntervalRef.current = setInterval(() => {
        if (socketRef.current?.connected) {
          socketRef.current.emit('ping');
        }
      }, 25000);

      return () => {
        cleanupBeforeRedirect();
      };
    } catch (error) {
      console.error("Erreur d'initialisation:", error);
      toast.error('Erreur de chargement');
      navigate(`/exam/profile/${examId}`, { replace: true });
    }
  }, [examId, navigate, cleanupBeforeRedirect]);

  const getOptionLabel = (option) => {
    const labels = {
      'A': 'Collective Figée',
      'B': 'Collective Souple',
      'C': 'Personnalisée',
      'D': 'Aléatoire'
    };
    return labels[option] || `Option ${option}`;
  };

  const getOptionColor = (option) => {
    const colors = {
      'A': '#ef4444',
      'B': '#3b82f6',
      'C': '#8b5cf6',
      'D': '#f59e0b'
    };
    return colors[option] || '#3b82f6';
  };

  const handleRefresh = () => {
    if (socketRef.current?.connected && examId) {
      socketRef.current.emit('getWaitingStudents', { examId }, (response) => {
        if (response && response.count !== undefined) {
          setWaitingCount(response.count);
          toast.success(`${response.count} participant(s) en attente`);
        }
      });
    } else {
      toast.error('Non connecté au serveur');
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #05071a 0%, #0a0f2e 60%, #05071a 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "'DM Sans', sans-serif",
      position: 'relative',
    }}>
      {/* Grille de fond */}
      <div style={{
        position: 'fixed', inset: 0,
        backgroundImage: 'linear-gradient(rgba(59,130,246,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,0.03) 1px, transparent 1px)',
        backgroundSize: '40px 40px', pointerEvents: 'none', zIndex: 0,
      }} />

      {/* Header */}
      <header style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
        background: 'rgba(5,7,26,0.92)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(59,130,246,0.12)',
        padding: '0 28px',
        height: '64px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{
          fontFamily: "'Sora', sans-serif",
          fontWeight: 800, fontSize: '1.2rem',
          letterSpacing: '-0.02em',
          background: 'linear-gradient(135deg, #60a5fa, #a78bfa)',
          WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent',
        }}>
          NA²QUIZ · Salle d'attente
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleRefresh}
            style={{
              display: 'flex', alignItems: 'center', gap: '7px',
              padding: '8px 16px', borderRadius: '8px',
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: '#cbd5e1', fontSize: '0.875rem', fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            <RefreshCw size={15} />
            Rafraîchir
          </motion.button>
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
        </div>
      </header>

      {/* Contenu principal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        style={{
          position: 'relative',
          zIndex: 1,
          background: 'rgba(15,23,42,0.85)',
          backdropFilter: 'blur(16px)',
          border: `1px solid ${getOptionColor(examOption)}40`,
          borderRadius: '28px',
          padding: '48px',
          textAlign: 'center',
          maxWidth: '560px',
          width: '90%',
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
        }}
      >
        {/* Animation de pulsation */}
        <motion.div
          animate={{
            scale: [1, 1.08, 1],
            opacity: [1, 0.8, 1],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          style={{
            width: '100px',
            height: '100px',
            margin: '0 auto 28px',
            background: `rgba(${getOptionColor(examOption) === '#3b82f6' ? '59,130,246' : '245,158,11'}, 0.12)`,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: `2px solid ${getOptionColor(examOption)}60`,
          }}
        >
          <Clock size={52} color={getOptionColor(examOption)} />
        </motion.div>

        <h2 style={{
          fontFamily: "'Sora', sans-serif",
          fontSize: '1.8rem',
          fontWeight: 700,
          color: '#f8fafc',
          marginBottom: '12px',
        }}>
          Salle d'attente
        </h2>

        <p style={{ 
          color: '#94a3b8', 
          marginBottom: '20px',
          fontSize: '1rem',
          lineHeight: 1.6
        }}>
          <strong style={{ color: '#f8fafc', fontSize: '1.1rem' }}>
            {studentInfo?.firstName} {studentInfo?.lastName}
          </strong>
          <br />
          <span style={{ 
            color: getOptionColor(examOption), 
            fontSize: '0.85rem',
            display: 'inline-block',
            marginTop: '4px',
            padding: '2px 8px',
            background: `${getOptionColor(examOption)}20`,
            borderRadius: '20px'
          }}>
            {getOptionLabel(examOption)}
          </span>
        </p>

        <p style={{ 
          color: '#94a3b8', 
          marginBottom: '24px',
          fontSize: '0.95rem'
        }}>
          {examOption === 'B' 
            ? 'Le superviseur démarrera l\'épreuve pour tous les participants en attente.'
            : 'Vous allez commencer l\'épreuve immédiatement après validation.'}
        </p>

        {/* État de connexion */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          marginBottom: '20px',
        }}>
          {isConnected ? (
            <Wifi size={14} color="#10b981" />
          ) : (
            <WifiOff size={14} color="#ef4444" />
          )}
          <span style={{ 
            color: isConnected ? '#10b981' : '#ef4444', 
            fontSize: '0.85rem', 
            fontWeight: 500 
          }}>
            {isConnected ? 'Connecté et prêt' : reconnectAttempt > 0 ? `Reconnexion (tentative ${reconnectAttempt})...` : 'Déconnecté'}
          </span>
          {!isConnected && reconnectAttempt > 0 && (
            <Loader size={12} color="#f59e0b" style={{ animation: 'spin 1s linear infinite' }} />
          )}
        </div>

        {/* Compteur de participants */}
        <motion.div
          animate={{
            backgroundColor: waitingCount > 0 
              ? ['rgba(59,130,246,0.1)', 'rgba(59,130,246,0.2)', 'rgba(59,130,246,0.1)']
              : 'rgba(59,130,246,0.05)',
          }}
          transition={{
            duration: 2,
            repeat: waitingCount > 0 ? Infinity : 0,
            ease: "easeInOut"
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            padding: '16px 24px',
            background: waitingCount > 0 ? 'rgba(59,130,246,0.1)' : 'rgba(59,130,246,0.05)',
            borderRadius: '20px',
            border: `1px solid ${waitingCount > 0 ? 'rgba(59,130,246,0.3)' : 'rgba(59,130,246,0.15)'}`,
            marginBottom: '16px',
          }}
        >
          <Users size={24} color={waitingCount > 0 ? '#3b82f6' : '#64748b'} />
          <span style={{ color: '#f8fafc', fontSize: '1.2rem', fontWeight: 600 }}>
            {waitingCount} participant{waitingCount > 1 ? 's' : ''} en attente
          </span>
        </motion.div>

        {/* Temps d'attente */}
        {elapsedTime > 30 && waitingCount === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              background: 'rgba(245,158,11,0.1)',
              border: '1px solid #f59e0b30',
              borderRadius: '12px',
              padding: '8px 12px',
              marginBottom: '16px',
            }}
          >
            <p style={{ color: '#f59e0b', fontSize: '0.8rem' }}>
              ⏱️ En attente depuis {formatWaitingTime(elapsedTime)}
            </p>
          </motion.div>
        )}

        <p style={{ 
          color: '#475569', 
          fontSize: '0.75rem', 
          marginTop: '24px',
          padding: '12px',
          borderTop: '1px solid rgba(255,255,255,0.05)',
        }}>
          Ne quittez pas cette page • Le démarrage est automatique
        </p>
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
          },
          success: { icon: '✅' },
          error: { icon: '❌' },
        }}
      />
      
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@600;700;800&family=DM+Sans:wght@400;500;600&display=swap');
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.2); opacity: 0.7; }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default WaitingPage;