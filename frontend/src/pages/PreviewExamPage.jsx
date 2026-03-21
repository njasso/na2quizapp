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
  Clock,
  GraduationCap,
  FileText,
  AlertCircle
} from 'lucide-react';

// Use environment variable for consistency
const NODE_BACKEND_URL = process.env.REACT_APP_BACKEND_URL || (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:5000');
const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || NODE_BACKEND_URL;

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

  // Charger les détails de l'épreuve
  useEffect(() => {
    const fetchExam = async () => {
      try {
        const response = await axios.get(`${NODE_BACKEND_URL}/api/exams/${examId}`);
        setExam(response.data);
        console.log("Détails de l'examen chargés:", response.data);

        // Si l'examen a une option définie par le backend, la pré-sélectionner et la verrouiller
        if (response.data.examOption) {
          setSelectedExamOption(response.data.examOption);
          setIsOptionLocked(true);
          toast(`Cette épreuve est pré-configurée en Option ${response.data.examOption}.`, { 
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
        console.error("Erreur chargement épreuve:", error);
        toast.error("Épreuve non trouvée ou erreur serveur.", {
          style: {
            background: '#1e293b',
            color: '#f8fafc',
            border: '1px solid #ef4444',
          }
        });
        navigate('/');
      } finally {
        setIsLoading(false);
      }
    };
    fetchExam();
  }, [examId, navigate]);

  // Connexion WebSocket et enregistrement de session initial
  useEffect(() => {
    socketRef.current = io(SOCKET_URL, { path: '/socket.io' });

    socketRef.current.on('connect', () => {
      console.log('WebSocket connecté:', socketRef.current.id);
      socketRef.current.emit('registerSession', { type: 'student' });
    });

    socketRef.current.on('connect_error', (error) => {
      console.error('Erreur WebSocket:', error);
      toast.error("Impossible de se connecter au serveur de surveillance.", {
        style: {
          background: '#1e293b',
          color: '#f8fafc',
          border: '1px solid #ef4444',
        }
      });
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        console.log('WebSocket déconnecté');
      }
    };
  }, []);

  // Soumission du formulaire
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitted) return;

    if (!firstName || !lastName || !matricule || !level) {
      toast.error("Tous les champs sont requis.", {
        style: {
          background: '#1e293b',
          color: '#f8fafc',
          border: '1px solid #ef4444',
        }
      });
      return;
    }

    setIsSubmitted(true);
    toast.loading("Traitement...", { 
      id: 'submit-profile',
      style: {
        background: '#1e293b',
        color: '#f8fafc',
        border: '1px solid #3b82f6',
      }
    });

    try {
      if (!exam || !exam.duration) {
        toast.error("Durée d'épreuve manquante.", {
          style: {
            background: '#1e293b',
            color: '#f8fafc',
            border: '1px solid #ef4444',
          }
        });
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

      localStorage.setItem('studentInfoForExam', JSON.stringify({
        examId: examId,
        info: studentInfoData,
        examDuration: exam.duration,
        examOption: selectedExamOption
      }));

      if (socketRef.current?.connected) {
        socketRef.current.emit('studentReadyForExam', {
          examId: examId,
          studentInfo: studentInfoData,
          studentSocketId: socketRef.current.id
        });
      }

      toast.success("Redirection vers l'épreuve...", { 
        id: 'submit-profile',
        style: {
          background: '#1e293b',
          color: '#f8fafc',
          border: '1px solid #10b981',
        }
      });

      navigate(`/exam/compose/${examId}`);

    } catch (error) {
      console.error("Erreur soumission:", error);
      toast.error("Erreur lors de l'enregistrement.", {
        style: {
          background: '#1e293b',
          color: '#f8fafc',
          border: '1px solid #ef4444',
        }
      });
      setIsSubmitted(false);
    }
  };

  // Chargement
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
        <Toaster 
          position="top-right"
          toastOptions={{
            style: {
              background: '#1e293b',
              color: '#f8fafc',
              border: '1px solid #3b82f6',
            }
          }}
        />
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
        <Toaster 
          position="top-right"
          toastOptions={{
            style: {
              background: '#1e293b',
              color: '#f8fafc',
              border: '1px solid #3b82f6',
            }
          }}
        />
      </div>
    );
  }

  // Formulaire
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
      {/* Grid */}
      <div style={{
        position: 'fixed', inset: 0,
        backgroundImage: 'linear-gradient(rgba(59,130,246,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,0.03) 1px, transparent 1px)',
        backgroundSize: '40px 40px', pointerEvents: 'none', zIndex: 0,
      }} />

      {/* Top glow */}
      <div style={{
        position: 'fixed', top: '-15%', left: '50%', transform: 'translateX(-50%)',
        width: '70vw', height: '50vh',
        background: 'radial-gradient(ellipse, rgba(37,99,235,0.12) 0%, transparent 70%)',
        pointerEvents: 'none', zIndex: 0,
      }} />

      {/* Topbar */}
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
            <GraduationCap size={14} color="#3b82f6" />
            <span style={{ fontSize: '0.8125rem', color: '#94a3b8' }}>
              Durée: {exam.duration} minutes
            </span>
          </div>
          
          <p style={{ 
            fontSize: '0.9375rem', 
            color: 'rgba(203,213,225,0.7)',
            marginTop: '16px',
          }}>
            Renseignez vos informations pour démarrer l'épreuve
          </p>
        </motion.div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <motion.div variants={itemVariants}>
            <label style={{ 
              display: 'block', 
              fontSize: '0.875rem', 
              fontWeight: 500, 
              color: '#94a3b8', 
              marginBottom: '6px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}>
              <User size={14} color="#3b82f6" />
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
                transition: 'border-color 0.2s, box-shadow 0.2s',
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#3b82f6';
                e.target.style.boxShadow = '0 0 0 3px rgba(59,130,246,0.1)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'rgba(59,130,246,0.2)';
                e.target.style.boxShadow = 'none';
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
              marginBottom: '6px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}>
              <User size={14} color="#3b82f6" />
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
                transition: 'border-color 0.2s, box-shadow 0.2s',
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#3b82f6';
                e.target.style.boxShadow = '0 0 0 3px rgba(59,130,246,0.1)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'rgba(59,130,246,0.2)';
                e.target.style.boxShadow = 'none';
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
              marginBottom: '6px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}>
              <Hash size={14} color="#3b82f6" />
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
                transition: 'border-color 0.2s, box-shadow 0.2s',
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#3b82f6';
                e.target.style.boxShadow = '0 0 0 3px rgba(59,130,246,0.1)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'rgba(59,130,246,0.2)';
                e.target.style.boxShadow = 'none';
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
              marginBottom: '6px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}>
              <Layers size={14} color="#3b82f6" />
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
                transition: 'border-color 0.2s, box-shadow 0.2s',
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#3b82f6';
                e.target.style.boxShadow = '0 0 0 3px rgba(59,130,246,0.1)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'rgba(59,130,246,0.2)';
                e.target.style.boxShadow = 'none';
              }}
              placeholder="Licence 1, Terminale..."
            />
          </motion.div>

          {/* Sélection de l'option d'examen */}
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
              Mode de composition
            </p>
            
            {/* Option definitions */}
            {(() => {
              const OPTIONS = [
                {
                  key: 'A',
                  label: 'Collective Figée',
                  description: 'Même question affichée sur tous les terminaux, avec un temps de réponse fixe et impératif par question.',
                  timerLabel: 'Chrono impératif / question',
                  timerColor: '#ef4444',
                  accentColor: '#ef4444',
                },
                {
                  key: 'B',
                  label: 'Collective Souple',
                  description: 'Même ordre de questions pour tous, dirigé par le superviseur. Pas de dotation temporelle rigide.',
                  timerLabel: 'Chrono global indicatif',
                  timerColor: '#3b82f6',
                  accentColor: '#3b82f6',
                },
                {
                  key: 'C',
                  label: 'Personnalisée',
                  description: 'Chaque candidat choisit librement la question à traiter, dans le temps global imparti.',
                  timerLabel: 'Chrono global indicatif',
                  timerColor: '#8b5cf6',
                  accentColor: '#8b5cf6',
                },
                {
                  key: 'D',
                  label: 'Aléatoire',
                  description: 'L\'ordre des questions est aléatoire et unique par candidat. Temps de réponse fixe par question.',
                  timerLabel: 'Chrono fixe / question',
                  timerColor: '#f59e0b',
                  accentColor: '#f59e0b',
                },
              ];
              return (
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  opacity: isOptionLocked ? 0.6 : 1,
                }}>
                  {OPTIONS.map((opt) => {
                    const isSelected = selectedExamOption === opt.key;
                    return (
                      <label
                        key={opt.key}
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '12px',
                          padding: '14px 16px',
                          background: isSelected ? `${opt.accentColor}10` : 'rgba(255,255,255,0.02)',
                          border: `1px solid ${isSelected ? `${opt.accentColor}55` : 'rgba(59,130,246,0.12)'}`,
                          borderRadius: '12px',
                          cursor: isOptionLocked ? 'not-allowed' : 'pointer',
                          transition: 'all 0.2s',
                        }}
                      >
                        <input
                          type="radio"
                          name="examOption"
                          value={opt.key}
                          checked={isSelected}
                          onChange={(e) => setSelectedExamOption(e.target.value)}
                          disabled={isOptionLocked}
                          style={{ 
                            marginTop: '3px',
                            accentColor: opt.accentColor,
                            width: '16px',
                            height: '16px',
                            flexShrink: 0,
                          }}
                        />
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                            <span style={{ 
                              color: isSelected ? '#f8fafc' : '#cbd5e1',
                              fontSize: '0.9375rem',
                              fontWeight: 600,
                            }}>
                              <span style={{
                                display: 'inline-block',
                                width: '20px',
                                height: '20px',
                                lineHeight: '20px',
                                textAlign: 'center',
                                borderRadius: '4px',
                                background: `${opt.accentColor}25`,
                                color: opt.accentColor,
                                fontSize: '0.75rem',
                                fontWeight: 800,
                                marginRight: '8px',
                              }}>
                                {opt.key}
                              </span>
                              {opt.label}
                            </span>
                            {/* Timer chip */}
                            <span style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '2px 8px',
                              borderRadius: '999px',
                              background: `${opt.timerColor}15`,
                              border: `1px solid ${opt.timerColor}30`,
                              color: opt.timerColor,
                              fontSize: '0.65rem',
                              fontWeight: 700,
                              letterSpacing: '0.04em',
                              whiteSpace: 'nowrap',
                            }}>
                              <Clock size={9} />
                              {opt.timerLabel}
                            </span>
                          </div>
                          <p style={{ fontSize: '0.8rem', color: '#64748b', lineHeight: 1.5 }}>
                            {opt.description}
                          </p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              );
            })()}
            
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
              transition: 'all 0.2s',
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
                Commencer l'épreuve
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
          success: {
            style: {
              border: '1px solid #10b981',
            },
            iconTheme: {
              primary: '#10b981',
              secondary: '#fff',
            },
          },
          error: {
            style: {
              border: '1px solid #ef4444',
            },
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
        }}
      />

      <style>{`
        @font-face {
  font-family: 'Sora';
  font-style: normal;
  font-weight: 400 800;
  src: local('Segoe UI'), local('Ubuntu'), local('Cantarell'), local('Arial');
}
@font-face {
  font-family: 'DM Sans';
  font-style: normal;
  font-weight: 400 700;
  src: local('Segoe UI'), local('Ubuntu'), local('Cantarell'), local('Arial');
}
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default ProfileExamPage;