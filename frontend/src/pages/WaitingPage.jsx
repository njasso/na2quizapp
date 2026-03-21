import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast, Toaster } from 'react-hot-toast';
import io from 'socket.io-client';
import { Clock, Users, Home } from 'lucide-react';

const NODE_BACKEND_URL = process.env.REACT_APP_BACKEND_URL || (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:5000');
const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || NODE_BACKEND_URL;

const WaitingPage = () => {
    const { examId } = useParams();
    const navigate = useNavigate();
    const [studentInfo, setStudentInfo] = useState(null);
    const [waitingCount, setWaitingCount] = useState(1);
    const [examTitle, setExamTitle] = useState('');
    const [examOption, setExamOption] = useState('');
    const [terminalSessionId, setTerminalSessionId] = useState(null);
    const [isConnected, setIsConnected] = useState(false);
    
    const socketRef = useRef(null);
    const reconnectAttempts = useRef(0);
    const redirectTimeoutRef = useRef(null);
    const stableSessionIdRef = useRef(null);

    const cleanupBeforeRedirect = useCallback(() => {
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

    useEffect(() => {
        const storedInfo = localStorage.getItem('studentInfoForExam');
        if (!storedInfo) {
            navigate(`/exam/profile/${examId}`, { replace: true });
            return;
        }

        try {
            const parsed = JSON.parse(storedInfo);
            if (parsed.examId !== examId) {
                navigate(`/exam/profile/${examId}`, { replace: true });
                return;
            }
            
            setStudentInfo(parsed.info);
            setExamTitle(parsed.examTitle || 'Épreuve');
            setExamOption(parsed.examOption || 'A');
            setTerminalSessionId(parsed.terminalSessionId || null);

            const stableKey = `studentSessionId_${examId}`;
            let stableId = localStorage.getItem(stableKey);
            if (!stableId) {
                stableId = `STU_${examId}_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
                localStorage.setItem(stableKey, stableId);
            }
            stableSessionIdRef.current = stableId;

            socketRef.current = io(SOCKET_URL, {
                transports: ['polling', 'websocket'],
                reconnection: true,
                reconnectionAttempts: 5,
                reconnectionDelay: 1000,
                reconnectionDelayMax: 3000,
                timeout: 10000,
                forceNew: false
            });

            socketRef.current.on('connect', () => {
                console.log('✅ Connecté en attente, ID:', socketRef.current.id);
                setIsConnected(true);
                reconnectAttempts.current = 0;
                
                socketRef.current.emit('registerSession', { 
                    type: 'student',
                    sessionId: stableSessionIdRef.current
                });
                
                const status = parsed.examOption === 'B' ? 'waiting' : 'composing';
                socketRef.current.emit('studentReadyForExam', {
                    examId: examId,
                    studentInfo: parsed.info,
                    studentSocketId: socketRef.current.id,
                    sessionId: stableSessionIdRef.current,
                    status: status,
                    terminalSessionId: parsed.terminalSessionId
                });
            });

            socketRef.current.on('connect_error', (error) => {
                console.error('❌ Erreur de connexion:', error.message);
                setIsConnected(false);
                reconnectAttempts.current++;
                
                if (reconnectAttempts.current > 5) {
                    toast.error("Impossible de se connecter au serveur. Rechargement...");
                    setTimeout(() => window.location.reload(), 3000);
                }
            });

            socketRef.current.on('disconnect', (reason) => {
                console.log('👋 Déconnecté:', reason);
                setIsConnected(false);
                
                if (reason === 'io server disconnect') {
                    setTimeout(() => window.location.reload(), 2000);
                }
            });

            socketRef.current.on('examStarted', (data) => {
                console.log('🚀 Démarrage reçu:', data);
                if (data.examId === examId) {
                    toast.success("L'examen démarre maintenant !", { 
                        duration: 2000,
                        icon: '🚀'
                    });
                    
                    cleanupBeforeRedirect();
                    
                    redirectTimeoutRef.current = setTimeout(() => {
                        navigate(`/exam/compose/${examId}`, { replace: true });
                    }, 1500);
                }
            });

            socketRef.current.on('examStartedForOptionB', (data) => {
                if (data.examId === examId) {
                    toast.success("L'examen démarre maintenant !", { 
                        duration: 2000,
                        icon: '🚀'
                    });
                    
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

            return () => {
                cleanupBeforeRedirect();
            };
        } catch (error) {
            console.error("Erreur:", error);
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
            <div style={{
                position: 'fixed', inset: 0,
                backgroundImage: 'linear-gradient(rgba(59,130,246,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,0.03) 1px, transparent 1px)',
                backgroundSize: '40px 40px', pointerEvents: 'none', zIndex: 0,
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
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
                style={{
                    position: 'relative',
                    zIndex: 1,
                    background: 'rgba(15,23,42,0.8)',
                    backdropFilter: 'blur(12px)',
                    border: '1px solid rgba(59,130,246,0.2)',
                    borderRadius: '24px',
                    padding: '48px',
                    textAlign: 'center',
                    maxWidth: '520px',
                    width: '100%',
                    boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
                }}
            >
                <motion.div
                    animate={{
                        scale: [1, 1.1, 1],
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
                        margin: '0 auto 32px',
                        background: 'rgba(59,130,246,0.15)',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: '2px solid rgba(59,130,246,0.3)',
                    }}
                >
                    <Clock size={50} color="#3b82f6" />
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
                    marginBottom: '16px',
                    fontSize: '1rem',
                    lineHeight: 1.6
                }}>
                    <strong style={{ color: '#f8fafc' }}>
                        {studentInfo?.firstName} {studentInfo?.lastName}
                    </strong>
                    <br />
                    <span style={{ color: '#60a5fa', fontSize: '0.9rem' }}>
                        {getOptionLabel(examOption)}
                    </span>
                </p>

                <p style={{ 
                    color: '#94a3b8', 
                    marginBottom: '24px',
                    fontSize: '0.95rem'
                }}>
                    Votre profil est enregistré. Le superviseur démarrera l'épreuve pour tous les participants.
                </p>

                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    marginBottom: '16px',
                }}>
                    <div style={{
                        width: '10px',
                        height: '10px',
                        borderRadius: '50%',
                        background: isConnected ? '#10b981' : '#ef4444',
                        animation: isConnected ? 'pulse 1.5s infinite' : 'none',
                    }} />
                    <span style={{ 
                        color: isConnected ? '#10b981' : '#ef4444', 
                        fontSize: '0.9rem', 
                        fontWeight: 500 
                    }}>
                        {isConnected ? 'Connecté et prêt' : 'Déconnecté - Reconnexion...'}
                    </span>
                </div>

                <motion.div
                    animate={{
                        backgroundColor: ['rgba(59,130,246,0.1)', 'rgba(59,130,246,0.2)', 'rgba(59,130,246,0.1)'],
                    }}
                    transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut"
                    }}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '12px',
                        padding: '16px 24px',
                        background: 'rgba(59,130,246,0.1)',
                        borderRadius: '16px',
                        border: '1px solid rgba(59,130,246,0.2)',
                        marginBottom: '16px',
                    }}
                >
                    <Users size={24} color="#3b82f6" />
                    <span style={{ color: '#f8fafc', fontSize: '1.1rem', fontWeight: 600 }}>
                        {waitingCount} participant{waitingCount > 1 ? 's' : ''} en attente
                    </span>
                </motion.div>

                <p style={{ 
                    color: '#475569', 
                    fontSize: '0.8rem', 
                    marginTop: '24px',
                    padding: '12px',
                    borderTop: '1px solid rgba(255,255,255,0.1)',
                }}>
                    Ne quittez pas cette page · Démarrage imminent
                </p>
            </motion.div>

            <Toaster />
            
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Sora:wght@600;700;800&family=DM+Sans:wght@400;500;600&display=swap');
                @keyframes pulse {
                    0%, 100% { transform: scale(1); opacity: 1; }
                    50% { transform: scale(1.2); opacity: 0.7; }
                }
            `}</style>
        </div>
    );
};

export default WaitingPage;