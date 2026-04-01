// src/pages/ExamScreen.js - Version avec affichage des images
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BookOpen, Clock, Calendar, Eye, ChevronRight, Layers, Award, Tag, Image as ImageIcon } from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';

function ExamScreen() {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const controller = new AbortController();

    const loadExams = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await api.get('/api/exams', {
          signal: controller.signal,
        });

        let examsData = [];
        if (Array.isArray(response)) {
          examsData = response;
        } else if (response?.data && Array.isArray(response.data)) {
          examsData = response.data;
        } else if (response?.data?.data && Array.isArray(response.data.data)) {
          examsData = response.data.data;
        } else if (response?.success && Array.isArray(response.data)) {
          examsData = response.data;
        } else {
          examsData = [];
        }

        // Normaliser les données des épreuves avec images
        const normalizedExams = examsData.map(exam => {
          // Récupérer l'image de l'épreuve (première question avec image ou image de couverture)
          let coverImage = exam.coverImage || '';
          if (!coverImage && exam.questions && exam.questions.length > 0) {
            const firstQuestionWithImage = exam.questions.find(q => q.imageQuestion || q.imageBase64);
            if (firstQuestionWithImage) {
              coverImage = firstQuestionWithImage.imageQuestion || 
                          (firstQuestionWithImage.imageBase64?.startsWith('data:') ? firstQuestionWithImage.imageBase64 : '');
            }
          }
          
          return {
            ...exam,
            totalPoints: exam.questions?.reduce((sum, q) => sum + (q.points || 1), 0) || 0,
            totalQuestions: exam.questions?.length || 0,
            domain: exam.domain || 'Non spécifié',
            level: exam.level || 'Non spécifié',
            subject: exam.subject || 'Non spécifié',
            coverImage: coverImage,
          };
        });

        setExams(normalizedExams);
      } catch (err) {
        if (err.name === 'CanceledError' || err.code === 'ERR_CANCELED') {
          console.log('[ExamScreen] Requête annulée (comportement normal)');
          return;
        }

        console.error('Erreur chargement examens:', err);

        if (err.response?.status === 401) {
          toast.error('Session expirée, veuillez vous reconnecter');
          localStorage.removeItem('userToken');
          localStorage.removeItem('userInfo');
          navigate('/login');
        } else {
          const errorMsg = err.response?.data?.message || err.message || "Échec du chargement des épreuves";
          setError(errorMsg);
          toast.error(errorMsg);
        }
      } finally {
        setLoading(false);
      }
    };

    loadExams();

    return () => controller.abort();
  }, [navigate]);

  if (loading) {
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
        <p style={{ color: '#94a3b8', marginTop: '16px' }}>Chargement des épreuves...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #05071a 0%, #0a0f2e 60%, #05071a 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: "'DM Sans', sans-serif",
        gap: '16px',
      }}>
        <div style={{ color: '#ef4444', fontSize: '1.1rem', textAlign: 'center', padding: '24px' }}>
          ⚠️ {error}
        </div>
        <button
          onClick={() => window.location.reload()}
          style={{
            padding: '10px 24px',
            background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
            border: 'none',
            borderRadius: '8px',
            color: '#fff',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Réessayer
        </button>
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
      padding: '24px',
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

      <main style={{ position: 'relative', zIndex: 1, maxWidth: '1200px', margin: '0 auto' }}>
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ textAlign: 'center', marginBottom: '48px' }}
        >
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px',
            padding: '5px 14px', marginBottom: '16px',
            background: 'rgba(37,99,235,0.12)',
            border: '1px solid rgba(59,130,246,0.25)',
            borderRadius: '999px',
          }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#3b82f6', boxShadow: '0 0 8px #3b82f6' }} />
            <span style={{ fontSize: '0.75rem', color: '#93c5fd', fontWeight: 600, letterSpacing: '0.08em' }}>
              BIBLIOTHÈQUE D'ÉPREUVES
            </span>
          </div>
          <h1 style={{
            fontFamily: "'Sora', sans-serif",
            fontSize: '2rem',
            fontWeight: 700,
            color: '#f8fafc',
            marginBottom: '8px',
          }}>
            Épreuves Disponibles
          </h1>
          <p style={{ fontSize: '0.9375rem', color: 'rgba(203,213,225,0.7)' }}>
            {exams.length} épreuve(s) trouvée(s)
          </p>
        </motion.div>

        {exams.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '60px 20px',
            background: 'rgba(15,23,42,0.5)',
            borderRadius: '16px',
            color: '#94a3b8',
          }}>
            Aucune épreuve disponible pour le moment.
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: '20px',
          }}>
            {exams.map((exam, index) => (
              <motion.div
                key={exam._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                whileHover={{ y: -4 }}
                style={{
                  background: 'rgba(15,23,42,0.7)',
                  backdropFilter: 'blur(12px)',
                  border: '1px solid rgba(59,130,246,0.15)',
                  borderRadius: '16px',
                  padding: '24px',
                  cursor: 'pointer',
                  overflow: 'hidden',
                }}
                onClick={() => navigate(`/exam/profile/${exam._id}`)}
              >
                {/* Image de couverture */}
                {exam.coverImage && (
                  <div style={{
                    margin: '-24px -24px 16px -24px',
                    height: '140px',
                    overflow: 'hidden',
                    background: 'linear-gradient(135deg, #1e293b, #0f172a)',
                  }}>
                    <img 
                      src={exam.coverImage} 
                      alt={exam.title}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        transition: 'transform 0.3s ease',
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                      onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                    />
                  </div>
                )}

                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '16px',
                }}>
                  <BookOpen size={22} color="#fff" />
                </div>

                <h3 style={{
                  fontFamily: "'Sora', sans-serif",
                  fontSize: '1.125rem',
                  fontWeight: 600,
                  color: '#f8fafc',
                  marginBottom: '12px',
                  lineHeight: 1.3,
                }}>
                  {exam.title}
                </h3>

                {/* Tags du référentiel */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
                  {exam.domain && exam.domain !== 'Non spécifié' && (
                    <span style={{
                      fontSize: '0.7rem',
                      padding: '2px 8px',
                      background: 'rgba(59,130,246,0.15)',
                      color: '#60a5fa',
                      borderRadius: '20px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      <Tag size={10} />
                      {exam.domain}
                    </span>
                  )}
                  {exam.level && exam.level !== 'Non spécifié' && (
                    <span style={{
                      fontSize: '0.7rem',
                      padding: '2px 8px',
                      background: 'rgba(139,92,246,0.15)',
                      color: '#a78bfa',
                      borderRadius: '20px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      <Layers size={10} />
                      {exam.level}
                    </span>
                  )}
                  {exam.subject && exam.subject !== 'Non spécifié' && (
                    <span style={{
                      fontSize: '0.7rem',
                      padding: '2px 8px',
                      background: 'rgba(16,185,129,0.15)',
                      color: '#34d399',
                      borderRadius: '20px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      <BookOpen size={10} />
                      {exam.subject}
                    </span>
                  )}
                  {exam.examOption && (
                    <span style={{
                      fontSize: '0.7rem',
                      padding: '2px 8px',
                      background: exam.examOption === 'A' ? 'rgba(239,68,68,0.15)' :
                                 exam.examOption === 'B' ? 'rgba(59,130,246,0.15)' :
                                 exam.examOption === 'C' ? 'rgba(139,92,246,0.15)' :
                                 'rgba(245,158,11,0.15)',
                      color: exam.examOption === 'A' ? '#f87171' :
                             exam.examOption === 'B' ? '#60a5fa' :
                             exam.examOption === 'C' ? '#c084fc' :
                             '#fbbf24',
                      borderRadius: '20px',
                      fontWeight: 600
                    }}>
                      Option {exam.examOption}
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '16px', marginBottom: '16px', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#94a3b8' }}>
                    <Clock size={14} />
                    <span style={{ fontSize: '0.875rem' }}>{exam.duration} min</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#94a3b8' }}>
                    <BookOpen size={14} />
                    <span style={{ fontSize: '0.875rem' }}>{exam.totalQuestions || 0} questions</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#94a3b8' }}>
                    <Award size={14} />
                    <span style={{ fontSize: '0.875rem' }}>{exam.totalPoints || 0} pts</span>
                  </div>
                </div>

                {exam.description && (
                  <p style={{
                    color: '#64748b',
                    fontSize: '0.8rem',
                    marginBottom: '16px',
                    lineHeight: 1.4,
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden'
                  }}>
                    {exam.description}
                  </p>
                )}

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginTop: '16px',
                  paddingTop: '16px',
                  borderTop: '1px solid rgba(59,130,246,0.1)',
                }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#94a3b8', fontSize: '0.875rem' }}>
                    <Eye size={14} />
                    {exam.totalQuestions || 0} questions
                  </span>
                  <ChevronRight size={18} color="#3b82f6" />
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </main>

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
}

export default ExamScreen;