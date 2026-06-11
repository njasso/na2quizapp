// src/pages/ExamScreen.js - Version CORRIGÉE avec affichage des images et configurations

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BookOpen, Clock, Eye, ChevronRight, Layers, Award, Tag } from 'lucide-react';
import api from '../../services/api';
import { getExamConfig } from '../../utils/examConfig';
import toast from 'react-hot-toast';

function ExamScreen() {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  // Fonction pour obtenir l'URL complète de l'image
  // Dans ExamScreen.js, améliorez getFullImageUrl
const getFullImageUrl = (imagePath) => {
  if (!imagePath) return null;
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) return imagePath;
  if (imagePath.startsWith('data:')) return imagePath;
  if (imagePath.startsWith('/uploads/')) {
    // ✅ Utiliser ENV_CONFIG pour l'URL backend
    const backendUrl = process.env.REACT_APP_BACKEND_URL || 
                       (window.location.hostname === 'localhost' ? 'http://localhost:5000' : 
                        `http://${window.location.hostname}:5000`);
    return `${backendUrl}${imagePath}`;
  }
  return imagePath;
};

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

        console.log('[ExamScreen] Épreuves chargées:', examsData.length);

        // Normaliser les données des épreuves avec images
        const normalizedExams = examsData.map(exam => {
          // Récupérer l'image de couverture
          let coverImage = exam.coverImage || '';
          
          // Si pas d'image de couverture, chercher la première image de question
          if (!coverImage && exam.questions && exam.questions.length > 0) {
            const firstQuestionWithImage = exam.questions.find(q => q.imageQuestion || q.imageBase64);
            if (firstQuestionWithImage) {
              coverImage = firstQuestionWithImage.imageQuestion || 
                          (firstQuestionWithImage.imageBase64?.startsWith('data:') ? firstQuestionWithImage.imageBase64 : '');
            }
          }
          
          // Récupérer la configuration de l'épreuve
          const examConfig = getExamConfig(exam.examOption);
          
          return {
            ...exam,
            totalPoints: exam.questions?.reduce((sum, q) => sum + (q.points || 1), 0) || 0,
            totalQuestions: exam.questions?.length || 0,
            domain: exam.domain || exam.domaineNom || 'Non spécifié',
            level: exam.level || exam.niveauNom || 'Non spécifié',
            subject: exam.subject || exam.matiereNom || 'Non spécifié',
            coverImage: getFullImageUrl(coverImage),
            configLabel: examConfig.label,
            configColor: examConfig.color
          };
        });

        setExams(normalizedExams);
      } catch (err) {
        if (err.name === 'CanceledError' || err.code === 'ERR_CANCELED') {
          console.log('[ExamScreen] Requête annulée');
          return;
        }

        console.error('[ExamScreen] Erreur chargement:', err);

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
      <div style={styles.loadingContainer}>
        <div style={styles.spinner} />
        <p style={styles.loadingText}>Chargement des épreuves...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.errorContainer}>
        <div style={styles.errorBox}>
          <p style={styles.errorText}>⚠️ {error}</p>
          <button onClick={() => window.location.reload()} style={styles.retryButton}>
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.bgGrid} />
      <div style={styles.bgGlow} />

      <main style={styles.main}>
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          style={styles.header}
        >
          <div style={styles.badge}>
            <span style={styles.badgeDot} />
            <span style={styles.badgeText}>BIBLIOTHÈQUE D'ÉPREUVES</span>
          </div>
          <h1 style={styles.title}>Épreuves Disponibles</h1>
          <p style={styles.subtitle}>{exams.length} épreuve(s) trouvée(s)</p>
        </motion.div>

        {/* Liste des épreuves */}
        {exams.length === 0 ? (
          <div style={styles.emptyContainer}>
            <BookOpen size={48} color="#1e293b" />
            <p style={styles.emptyText}>Aucune épreuve disponible pour le moment.</p>
          </div>
        ) : (
          <div style={styles.grid}>
            {exams.map((exam, index) => (
              <motion.div
                key={exam._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                whileHover={{ y: -4 }}
                style={styles.card}
                onClick={() => navigate(`/exam/profile/${exam._id}`)}
              >
                {/* Bandeau de configuration */}
                <div style={styles.configBadge(exam.configColor)}>
                  {exam.examOption} - {exam.configLabel}
                </div>

                {/* Image de couverture */}
                {exam.coverImage && (
                  <div style={styles.coverContainer}>
                    <img 
                      src={exam.coverImage} 
                      alt={exam.title}
                      style={styles.coverImage}
                      onError={(e) => { 
                        e.target.style.display = 'none'; 
                        e.target.parentElement.style.display = 'none';
                      }}
                    />
                  </div>
                )}

                <div style={styles.cardContent}>
                  {/* Icône par défaut si pas d'image */}
                  {!exam.coverImage && (
                    <div style={styles.iconContainer}>
                      <BookOpen size={22} color="#fff" />
                    </div>
                  )}

                  <h3 style={styles.cardTitle}>{exam.title}</h3>

                  {/* Tags */}
                  <div style={styles.tagsContainer}>
                    {exam.domain && exam.domain !== 'Non spécifié' && (
                      <span style={styles.tag('#3b82f6', '#60a5fa')}>
                        <Tag size={10} /> {exam.domain}
                      </span>
                    )}
                    {exam.level && exam.level !== 'Non spécifié' && (
                      <span style={styles.tag('#8b5cf6', '#a78bfa')}>
                        <Layers size={10} /> {exam.level}
                      </span>
                    )}
                    {exam.subject && exam.subject !== 'Non spécifié' && (
                      <span style={styles.tag('#10b981', '#34d399')}>
                        <BookOpen size={10} /> {exam.subject}
                      </span>
                    )}
                  </div>

                  {/* Métriques */}
                  <div style={styles.metricsContainer}>
                    <span style={styles.metric}>
                      <Clock size={14} /> {exam.duration || 60} min
                    </span>
                    <span style={styles.metric}>
                      <BookOpen size={14} /> {exam.totalQuestions || 0} q
                    </span>
                    <span style={styles.metric}>
                      <Award size={14} /> {exam.totalPoints || 0} pts
                    </span>
                  </div>

                  {/* Description */}
                  {exam.description && (
                    <p style={styles.description}>{exam.description}</p>
                  )}

                  {/* Footer avec bouton */}
                  <div style={styles.footer}>
                    <span style={styles.viewInfo}>
                      <Eye size={14} /> Voir détails
                    </span>
                    <ChevronRight size={18} color="#3b82f6" />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════
const styles = {
  container: {
    minHeight: '100vh',
    fontFamily: "'DM Sans', sans-serif",
    background: 'linear-gradient(135deg, #05071a 0%, #0a0f2e 60%, #05071a 100%)',
    position: 'relative',
    overflow: 'hidden',
    padding: '24px',
  },
  bgGrid: {
    position: 'fixed', inset: 0,
    backgroundImage: 'linear-gradient(rgba(59,130,246,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,0.03) 1px, transparent 1px)',
    backgroundSize: '40px 40px', pointerEvents: 'none', zIndex: 0,
  },
  bgGlow: {
    position: 'fixed', top: '-15%', left: '50%', transform: 'translateX(-50%)',
    width: '70vw', height: '50vh',
    background: 'radial-gradient(ellipse, rgba(37,99,235,0.12) 0%, transparent 70%)',
    pointerEvents: 'none', zIndex: 0,
  },
  main: { position: 'relative', zIndex: 1, maxWidth: '1200px', margin: '0 auto' },
  
  header: { textAlign: 'center', marginBottom: '48px' },
  badge: {
    display: 'inline-flex', alignItems: 'center', gap: '8px',
    padding: '5px 14px', marginBottom: '16px',
    background: 'rgba(37,99,235,0.12)',
    border: '1px solid rgba(59,130,246,0.25)',
    borderRadius: '999px',
  },
  badgeDot: { width: '6px', height: '6px', borderRadius: '50%', background: '#3b82f6', boxShadow: '0 0 8px #3b82f6' },
  badgeText: { fontSize: '0.75rem', color: '#93c5fd', fontWeight: 600, letterSpacing: '0.08em' },
  title: { fontFamily: "'Sora', sans-serif", fontSize: '2rem', fontWeight: 700, color: '#f8fafc', marginBottom: '8px' },
  subtitle: { fontSize: '0.9375rem', color: 'rgba(203,213,225,0.7)' },
  
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' },
  
  card: {
    background: 'rgba(15,23,42,0.7)',
    backdropFilter: 'blur(12px)',
    border: '1px solid rgba(59,130,246,0.15)',
    borderRadius: '16px',
    cursor: 'pointer',
    overflow: 'hidden',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
  },
  configBadge: (color) => ({
    position: 'absolute', top: 12, left: 12, zIndex: 10,
    background: `${color}20`, border: `1px solid ${color}40`,
    padding: '3px 10px', borderRadius: '20px',
    fontSize: '0.65rem', fontWeight: 600, color: color
  }),
  coverContainer: { height: '140px', overflow: 'hidden', background: 'linear-gradient(135deg, #1e293b, #0f172a)' },
  coverImage: { width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.3s ease' },
  cardContent: { padding: '20px' },
  iconContainer: {
    width: '48px', height: '48px', borderRadius: '12px',
    background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    marginBottom: '16px'
  },
  cardTitle: { fontFamily: "'Sora', sans-serif", fontSize: '1.125rem', fontWeight: 600, color: '#f8fafc', marginBottom: '12px', lineHeight: 1.3 },
  tagsContainer: { display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' },
  tag: (bgColor, textColor) => ({
    fontSize: '0.7rem', padding: '2px 8px', background: `${bgColor}15`,
    color: textColor, borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '4px'
  }),
  metricsContainer: { display: 'flex', gap: '16px', marginBottom: '12px', flexWrap: 'wrap' },
  metric: { display: 'flex', alignItems: 'center', gap: '6px', color: '#94a3b8', fontSize: '0.875rem' },
  description: { color: '#64748b', fontSize: '0.8rem', marginBottom: '16px', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' },
  footer: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '8px', paddingTop: '12px', borderTop: '1px solid rgba(59,130,246,0.1)' },
  viewInfo: { display: 'flex', alignItems: 'center', gap: '4px', color: '#94a3b8', fontSize: '0.875rem' },
  
  loadingContainer: {
    minHeight: '100vh', background: 'linear-gradient(135deg, #05071a 0%, #0a0f2e 60%, #05071a 100%)',
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
  },
  spinner: { width: '48px', height: '48px', border: '3px solid rgba(59,130,246,0.1)', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin 1s linear infinite' },
  loadingText: { color: '#94a3b8', marginTop: '16px' },
  
  errorContainer: {
    minHeight: '100vh', background: 'linear-gradient(135deg, #05071a 0%, #0a0f2e 60%, #05071a 100%)',
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
  },
  errorBox: { color: '#ef4444', fontSize: '1.1rem', textAlign: 'center', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center' },
  errorText: { marginBottom: '0' },
  retryButton: { padding: '10px 24px', background: 'linear-gradient(135deg, #3b82f6, #2563eb)', border: 'none', borderRadius: '8px', color: '#fff', fontWeight: 600, cursor: 'pointer' },
  
  emptyContainer: { textAlign: 'center', padding: '60px 20px', background: 'rgba(15,23,42,0.5)', borderRadius: '16px', color: '#94a3b8' },
  emptyText: { marginTop: '12px' }
};

export default ExamScreen;