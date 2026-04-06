// src/pages/ExamsPage.jsx - Version COMPLÈTE avec accès par rôle (Admin, Enseignant, Opérateur)
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Edit, Trash2, Play, Eye, Plus, Home, RefreshCw, Search, 
  Clock, Layers, BookOpen, ArrowLeft, Award, Tag, Image as ImageIcon,
  Shield, UserCheck, Calendar, Monitor
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import ENV_CONFIG from '../../config/env';

const ExamsPage = () => {
  const navigate = useNavigate();
  const { user, hasRole } = useAuth();
  const [exams, setExams] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [search, setSearch] = useState('');
  const [accessDenied, setAccessDenied] = useState(false);
  const [assignedToMe, setAssignedToMe] = useState(false); // Filtre pour opérateur

  // ✅ Déterminer les droits d'accès
  const isAdmin = hasRole('ADMIN_SYSTEME') || hasRole('ADMIN_DELEGUE');
  const isTeacher = hasRole('ENSEIGNANT');
  const isOperator = hasRole('OPERATEUR_EVALUATION');
  const isSaisisseur = hasRole('SAISISEUR');
  const isApprenant = hasRole('APPRENANT');

  // ✅ Message d'accueil personnalisé selon le rôle
  const getHeaderTitle = () => {
    if (isAdmin) return 'Gestion des épreuves';
    if (isTeacher) return 'Mes épreuves';
    if (isOperator) return 'Épreuves assignées';
    if (isSaisisseur) return 'Accès restreint';
    if (isApprenant) return 'Accès restreint';
    return 'Épreuves';
  };

  const getHeaderDescription = () => {
    if (isAdmin) return 'Administration complète des épreuves de la plateforme';
    if (isTeacher) return 'Consultez et gérez vos épreuves pédagogiques';
    if (isOperator) return 'Épreuves qui vous ont été assignées pour supervision';
    if (isSaisisseur) return 'Cette page est réservée aux enseignants et administrateurs';
    if (isApprenant) return 'Cette page est réservée aux enseignants et administrateurs';
    return '';
  };

  // ✅ Vérifier si l'utilisateur peut modifier/supprimer une épreuve
  const canModifyExam = (exam) => {
    if (isAdmin) return true;
    if (isTeacher) {
      const isOwner = exam.createdBy?._id === user?._id || exam.createdBy === user?._id;
      return isOwner;
    }
    return false;
  };

  // ✅ Vérifier si l'utilisateur peut composer une épreuve
  const canComposeExam = (exam) => {
    if (isAdmin) return true;
    if (isTeacher) return true;
    if (isOperator) {
      // L'opérateur peut composer les épreuves qui lui sont assignées
      return exam.assignedTo === user?._id || exam.assignedTo?._id === user?._id;
    }
    return false;
  };

  useEffect(() => {
    // ✅ Vérification d'accès pour les rôles non autorisés
    if (!isAdmin && !isTeacher && !isOperator) {
      console.log('[ExamsPage] Accès non autorisé pour le rôle:', user?.role);
      setAccessDenied(true);
      setIsLoading(false);
      toast.error('Accès non autorisé. Cette page est réservée aux enseignants, opérateurs et administrateurs.');
      setTimeout(() => navigate('/evaluate'), 2000);
      return;
    }

    const controller = new AbortController();

    const fetchExams = async () => {
      setIsLoading(true);

      try {
        let response;
        
        // ✅ Sélectionner la bonne API selon le rôle
        if (isAdmin) {
          // Admin voit TOUTES les épreuves
          console.log('[ExamsPage] Admin - Récupération de toutes les épreuves');
          response = await api.get('/api/exams', { signal: controller.signal });
        } 
        else if (isTeacher) {
          // Enseignant voit SES PROPRES épreuves
          console.log('[ExamsPage] Enseignant - Récupération de ses propres épreuves');
          response = await api.get('/api/exams/my-created', { signal: controller.signal });
        }
        else if (isOperator) {
          // Opérateur voit les épreuves qui lui sont ASSIGNÉES
          console.log('[ExamsPage] Opérateur - Récupération des épreuves assignées');
          try {
            response = await api.get('/api/exams/assigned-to-me', { signal: controller.signal });
          } catch (err) {
            // Fallback: utiliser la route générique avec filtre
            console.log('[ExamsPage] Fallback - Utilisation de /api/exams/by-role');
            response = await api.get('/api/exams/by-role', { signal: controller.signal });
          }
        }
        else {
          setExams([]);
          setIsLoading(false);
          return;
        }

        let examsData = [];
        if (Array.isArray(response)) {
          examsData = response;
        } else if (response?.data && Array.isArray(response.data)) {
          examsData = response.data;
        } else if (response?.data?.data && Array.isArray(response.data.data)) {
          examsData = response.data.data;
        } else {
          examsData = [];
        }

        console.log(`[ExamsPage] ✅ ${examsData.length} épreuve(s) chargée(s)`);

        // Normaliser les données avec images
        const normalizedExams = examsData.map(exam => {
          // Récupérer l'image de couverture
          let coverImage = exam.coverImage || '';
          
          if (!coverImage && exam.questions && exam.questions.length > 0) {
            const firstQuestionWithImage = exam.questions.find(q => q.imageQuestion || q.imageBase64);
            if (firstQuestionWithImage) {
              let img = firstQuestionWithImage.imageQuestion || '';
              if (!img && firstQuestionWithImage.imageBase64?.startsWith('data:')) {
                img = firstQuestionWithImage.imageBase64;
              }
              if (img && img.startsWith('/uploads/')) {
                img = `${ENV_CONFIG.BACKEND_URL}${img}`;
              }
              coverImage = img;
            }
          }
          
          if (coverImage && coverImage.startsWith('/uploads/')) {
            coverImage = `${ENV_CONFIG.BACKEND_URL}${coverImage}`;
          }
          
          // Déterminer le statut d'assignation pour l'opérateur
          const isAssignedToMe = exam.assignedTo === user?._id || exam.assignedTo?._id === user?._id;
          
          return {
            ...exam,
            totalPoints: exam.questions?.reduce((sum, q) => sum + (q.points || 1), 0) || 0,
            totalQuestions: exam.questions?.length || 0,
            domain: exam.domain || 'Non spécifié',
            level: exam.level || 'Non spécifié',
            subject: exam.subject || 'Non spécifié',
            coverImage: coverImage,
            isOwner: exam.createdBy?._id === user?._id || exam.createdBy === user?._id,
            isAssignedToMe: isAssignedToMe,
            assignedByName: exam.assignedBy?.name || (exam.assignedTo ? 'Administrateur' : null)
          };
        });

        setExams(normalizedExams);
        
      } catch (error) {
        if (error.name === 'CanceledError' || error.code === 'ERR_CANCELED') {
          console.log('[ExamsPage] Requête annulée');
          return;
        }

        console.error('Erreur chargement épreuves:', error);

        if (error.response?.status === 401) {
          toast.error('Session expirée. Veuillez vous reconnecter.');
          localStorage.removeItem('userToken');
          localStorage.removeItem('userInfo');
          navigate('/login');
        } else if (error.response?.status === 403) {
          toast.error('Accès non autorisé à cette ressource');
          setTimeout(() => navigate('/evaluate'), 2000);
        } else {
          toast.error("Impossible de charger les épreuves.");
        }
        setExams([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchExams();

    return () => controller.abort();
  }, [navigate, user, isAdmin, isTeacher, isOperator]);

  const deleteExam = async (examId) => {
    const exam = exams.find(e => e._id === examId);
    if (!canModifyExam(exam)) {
      toast.error('Vous n\'avez pas les droits pour supprimer cette épreuve');
      return;
    }
    
    try {
      await api.delete(`/api/exams/${examId}`);
      setExams(exams.filter(e => e._id !== examId));
      setDeleteConfirm(null);
      toast.success('Épreuve supprimée avec succès');
    } catch (error) {
      console.error('Erreur suppression:', error);
      toast.error('Erreur lors de la suppression de l\'épreuve');
    }
  };

  const filtered = Array.isArray(exams) ? exams.filter(e =>
    !search ||
    e.title?.toLowerCase().includes(search.toLowerCase()) ||
    e.domain?.toLowerCase().includes(search.toLowerCase()) ||
    e.subject?.toLowerCase().includes(search.toLowerCase()) ||
    e.level?.toLowerCase().includes(search.toLowerCase())
  ) : [];

  const domainColor = (domain) => {
    const map = { 
      'Informatique': '#3b82f6', 
      'Mathématiques': '#10b981', 
      'Sciences': '#f59e0b', 
      'Histoire': '#ef4444', 
      'Langue': '#8b5cf6',
      'Professionnel': '#10b981',
      'Éducatif': '#6366f1',
      'Management': '#8b5cf6'
    };
    return map[domain] || '#64748b';
  };

  const ActionBtn = ({ color, title, onClick, children }) => (
    <motion.button
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.92 }}
      title={title}
      onClick={onClick}
      style={{
        width: '34px', height: '34px',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        borderRadius: '8px',
        background: `${color}18`,
        border: `1px solid ${color}33`,
        color: color, cursor: 'pointer',
      }}
    >
      {children}
    </motion.button>
  );

  // ✅ Affichage si accès refusé
  if (accessDenied) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #05071a, #0a0f2e)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px'
      }}>
        <div style={{
          background: 'rgba(239,68,68,0.1)',
          border: '1px solid #ef4444',
          borderRadius: 24,
          padding: 48,
          textAlign: 'center',
          maxWidth: 500
        }}>
          <Shield size={64} color="#ef4444" style={{ marginBottom: 16 }} />
          <h2 style={{ color: '#f8fafc', marginBottom: 12 }}>Accès non autorisé</h2>
          <p style={{ color: '#ef4444', marginBottom: 24 }}>
            Cette page est réservée aux enseignants, opérateurs et administrateurs.
            <br />Votre rôle actuel: <strong>{user?.role || 'inconnu'}</strong>
          </p>
          <button
            onClick={() => navigate('/evaluate')}
            style={{
              padding: '10px 24px',
              background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
              border: 'none',
              borderRadius: 8,
              color: 'white',
              cursor: 'pointer'
            }}
          >
            Retour au tableau de bord
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh', fontFamily: "'DM Sans', sans-serif",
      background: 'linear-gradient(135deg, #05071a 0%, #0a0f2e 60%, #05071a 100%)',
      position: 'relative',
    }}>
      <div style={{
        position: 'fixed', inset: 0,
        backgroundImage: 'linear-gradient(rgba(59,130,246,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,0.03) 1px, transparent 1px)',
        backgroundSize: '40px 40px', pointerEvents: 'none', zIndex: 0,
      }} />

      {/* Topbar */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'rgba(5,7,26,0.9)', backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(59,130,246,0.1)',
        padding: '0 32px', height: '60px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate('/evaluate')}
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(99,102,241,0.2)',
              borderRadius: 10,
              padding: '8px',
              color: '#94a3b8',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <ArrowLeft size={18} />
            <span style={{ fontSize: '0.8rem' }}>Tableau de bord</span>
          </motion.button>
          <div style={{ width: '1px', height: '20px', background: 'rgba(255,255,255,0.1)' }} />
          <span style={{
            fontFamily: "'Sora', sans-serif", fontWeight: 800, fontSize: '1.125rem',
            background: 'linear-gradient(135deg, #60a5fa, #a78bfa)',
            WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent',
          }}>NA²QUIZ</span>
          <div style={{ width: '1px', height: '20px', background: 'rgba(255,255,255,0.1)' }} />
          <span style={{ color: '#94a3b8', fontSize: '0.9rem' }}>{getHeaderTitle()}</span>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <motion.button 
            whileHover={{ scale: 1.04 }} 
            whileTap={{ scale: 0.97 }}
            onClick={() => navigate('/evaluate')}
            style={{ 
              display: 'flex', alignItems: 'center', gap: '6px', 
              padding: '7px 14px', borderRadius: '8px', 
              background: 'rgba(255,255,255,0.05)', 
              border: '1px solid rgba(255,255,255,0.08)', 
              color: '#94a3b8', fontSize: '0.875rem', 
              cursor: 'pointer' 
            }}
          >
            <Home size={14} /> Accueil
          </motion.button>
          
          {/* ✅ Seuls les admins et enseignants peuvent créer des épreuves */}
          {(isAdmin || isTeacher) && (
            <motion.button 
              whileHover={{ scale: 1.04 }} 
              whileTap={{ scale: 0.97 }}
              onClick={() => navigate('/create/database')}
              style={{ 
                display: 'flex', alignItems: 'center', gap: '6px', 
                padding: '7px 16px', borderRadius: '8px', 
                background: 'linear-gradient(135deg, #1d4ed8, #2563eb)', 
                border: 'none', color: '#fff', fontSize: '0.875rem', 
                fontWeight: 600, cursor: 'pointer' 
              }}
            >
              <Plus size={14} /> Nouvelle épreuve
            </motion.button>
          )}
        </div>
      </header>

      <main style={{ position: 'relative', zIndex: 1, maxWidth: '1280px', margin: '0 auto', padding: '40px 24px' }}>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 style={{ fontFamily: "'Sora', sans-serif", fontSize: '1.875rem', fontWeight: 800, letterSpacing: '-0.03em', color: '#f8fafc', marginBottom: '4px' }}>
              {getHeaderTitle()}
            </h1>
            <p style={{ color: '#64748b', fontSize: '0.9rem' }}>
              {getHeaderDescription()} · {exams.length} épreuve{exams.length !== 1 ? 's' : ''}
            </p>
          </div>
          <div style={{ position: 'relative', width: '280px' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#475569' }} />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher une épreuve..."
              style={{
                width: '100%', padding: '9px 12px 9px 38px',
                background: 'rgba(15,23,42,0.7)', border: '1px solid rgba(59,130,246,0.18)',
                borderRadius: '10px', color: '#e2e8f0', fontSize: '0.875rem', outline: 'none',
              }}
            />
          </div>
        </div>

        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px', flexDirection: 'column', gap: '16px' }}>
            <RefreshCw size={32} color="#3b82f6" style={{ animation: 'spin 1s linear infinite' }} />
            <span style={{ color: '#64748b', fontSize: '0.9rem' }}>Chargement des épreuves…</span>
          </div>
        ) : filtered.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }}
            style={{
              textAlign: 'center', padding: '80px 24px',
              background: 'rgba(15,23,42,0.5)', border: '1px dashed rgba(59,130,246,0.2)',
              borderRadius: '16px',
            }}
          >
            <BookOpen size={48} color="#1e293b" style={{ marginBottom: '16px' }} />
            <p style={{ color: '#475569', fontSize: '1rem', marginBottom: '20px' }}>
              {search ? 'Aucune épreuve ne correspond à votre recherche.' : 
                isOperator ? 'Aucune épreuve ne vous a été assignée pour le moment.' :
                'Aucune épreuve disponible.'}
            </p>
            {(isAdmin || isTeacher) && (
              <motion.button 
                whileHover={{ scale: 1.03 }} 
                whileTap={{ scale: 0.97 }}
                onClick={() => navigate('/create/database')}
                style={{ 
                  padding: '10px 24px', background: 'linear-gradient(135deg, #1d4ed8, #2563eb)', 
                  border: 'none', borderRadius: '8px', color: '#fff', 
                  fontWeight: 600, cursor: 'pointer' 
                }}
              >
                <Plus size={15} style={{ marginRight: '6px' }} /> Créer une épreuve
              </motion.button>
            )}
          </motion.div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '18px' }}>
            <AnimatePresence>
              {filtered.map((exam, i) => {
                const color = domainColor(exam.domain);
                return (
                  <motion.div
                    key={exam._id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: i * 0.04 }}
                    whileHover={{ y: -4 }}
                    style={{
                      background: 'rgba(15,23,42,0.75)',
                      border: `1px solid ${color}22`,
                      borderRadius: '14px',
                      backdropFilter: 'blur(12px)',
                      boxShadow: '0 4px 20px rgba(0,0,0,0.35)',
                      position: 'relative',
                      overflow: 'hidden',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = `${color}44`;
                      e.currentTarget.style.boxShadow = `0 8px 32px rgba(0,0,0,0.4), 0 0 24px ${color}15`;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = `${color}22`;
                      e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.35)';
                    }}
                  >
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: `linear-gradient(90deg, ${color}, transparent)` }} />

                    {/* Badge d'assignation pour opérateur */}
                    {isOperator && exam.isAssignedToMe && (
                      <div style={{
                        position: 'absolute',
                        top: 8,
                        right: 8,
                        zIndex: 10,
                        background: 'rgba(16,185,129,0.9)',
                        padding: '2px 8px',
                        borderRadius: '20px',
                        fontSize: '0.6rem',
                        fontWeight: 600,
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4
                      }}>
                        <UserCheck size={10} /> Assignée
                      </div>
                    )}

                    {/* Image de couverture */}
                    {exam.coverImage && (
                      <div style={{
                        height: '120px',
                        overflow: 'hidden',
                        margin: '-22px -22px 12px -22px',
                      }}>
                        <img 
                          src={exam.coverImage} 
                          alt={exam.title}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                          }}
                          onError={(e) => {
                            console.warn('[ExamsPage] Erreur chargement image:', exam.coverImage);
                            e.target.style.display = 'none';
                          }}
                        />
                      </div>
                    )}

                    <div style={{ padding: '0 22px 22px 22px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px', flex: 1 }}>
                          <h3 style={{ fontFamily: "'Sora', sans-serif", fontSize: '1rem', fontWeight: 700, color: '#f1f5f9', letterSpacing: '-0.01em', lineHeight: 1.35, margin: 0 }}>
                            {exam.title}
                          </h3>
                          {exam.examOption && (
                            <span style={{
                              padding: '2px 8px', borderRadius: '999px', fontSize: '0.65rem', fontWeight: 700,
                              background: exam.examOption === 'A' ? 'rgba(239,68,68,0.2)' : 
                                         exam.examOption === 'B' ? 'rgba(59,130,246,0.2)' : 
                                         exam.examOption === 'C' ? 'rgba(139,92,246,0.2)' : 
                                         exam.examOption === 'D' ? 'rgba(245,158,11,0.2)' :
                                         exam.examOption === 'E' ? 'rgba(245,158,11,0.2)' :
                                         exam.examOption === 'F' ? 'rgba(245,158,11,0.2)' : 'rgba(16,185,129,0.2)',
                              color: exam.examOption === 'A' ? '#ef4444' : 
                                     exam.examOption === 'B' ? '#3b82f6' : 
                                     exam.examOption === 'C' ? '#8b5cf6' : 
                                     exam.examOption === 'D' ? '#f59e0b' :
                                     exam.examOption === 'E' ? '#f59e0b' :
                                     exam.examOption === 'F' ? '#f59e0b' : '#10b981',
                            }}>
                              {exam.examOption}
                            </span>
                          )}
                        </div>
                        <span style={{
                          padding: '3px 10px', borderRadius: '999px',
                          background: `${color}18`, border: `1px solid ${color}33`,
                          color: color, fontSize: '0.75rem', fontWeight: 700,
                        }}>
                          {exam.totalPoints || 0} pts
                        </span>
                      </div>

                      {/* Tags du référentiel */}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '16px' }}>
                        {exam.domain && exam.domain !== 'Non spécifié' && (
                          <span style={{
                            padding: '2px 8px', borderRadius: '6px',
                            background: 'rgba(59,130,246,0.1)',
                            color: '#60a5fa', fontSize: '0.7rem',
                            display: 'flex', alignItems: 'center', gap: '4px'
                          }}>
                            <Tag size={10} />
                            {exam.domain}
                          </span>
                        )}
                        {exam.level && exam.level !== 'Non spécifié' && (
                          <span style={{
                            padding: '2px 8px', borderRadius: '6px',
                            background: 'rgba(139,92,246,0.1)',
                            color: '#a78bfa', fontSize: '0.7rem',
                            display: 'flex', alignItems: 'center', gap: '4px'
                          }}>
                            <Layers size={10} />
                            {exam.level}
                          </span>
                        )}
                        {exam.subject && exam.subject !== 'Non spécifié' && (
                          <span style={{
                            padding: '2px 8px', borderRadius: '6px',
                            background: 'rgba(16,185,129,0.1)',
                            color: '#34d399', fontSize: '0.7rem',
                            display: 'flex', alignItems: 'center', gap: '4px'
                          }}>
                            <BookOpen size={10} />
                            {exam.subject}
                          </span>
                        )}
                      </div>

                      <div style={{ display: 'flex', gap: '16px', marginBottom: '18px', paddingBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.8125rem', color: '#64748b' }}>
                          <Clock size={13} /> {exam.duration || exam.config?.totalTime || 60} min
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.8125rem', color: '#64748b' }}>
                          <Layers size={13} /> {exam.questions?.length || 0} questions
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.8125rem', color: '#64748b' }}>
                          <Award size={13} /> {exam.totalPoints || 0} pts
                        </span>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          {/* ✅ Bouton Composer - accessible selon le rôle */}
                          {canComposeExam(exam) && (
                            <ActionBtn color="#10b981" title="Composer" onClick={() => {
                              localStorage.setItem('studentInfoForExam', JSON.stringify({
                                examId: exam._id,
                                info: { 
                                  firstName: user?.name?.split(' ')[0] || 'Test', 
                                  lastName: user?.name?.split(' ')[1] || 'Enseignant', 
                                  matricule: user?.matricule || 'PROF-001', 
                                  level: exam.level || '' 
                                },
                                examOption: exam.examOption || 'C',
                                config: exam.config,
                                terminalSessionId: null
                              }));
                              navigate(`/exam/compose/${exam._id}`);
                            }}>
                              <Play size={15} />
                            </ActionBtn>
                          )}
                          
                          <ActionBtn color="#3b82f6" title="Prévisualiser" onClick={() => navigate(`/preview/${exam._id}`)}>
                            <Eye size={15} />
                          </ActionBtn>
                          
                          {/* ✅ Seuls les propriétaires et admins peuvent modifier */}
                          {canModifyExam(exam) && (
                            <ActionBtn color="#f59e0b" title="Modifier" onClick={() => navigate(`/create/manual`, { state: { editExamId: exam._id, exam } })}>
                              <Edit size={15} />
                            </ActionBtn>
                          )}
                        </div>

                        {/* ✅ Seuls les propriétaires et admins peuvent supprimer */}
                        {canModifyExam(exam) && (
                          deleteConfirm === exam._id ? (
                            <div style={{ display: 'flex', gap: '6px' }}>
                              <button onClick={() => deleteExam(exam._id)} style={{ padding: '5px 10px', background: '#dc2626', border: 'none', borderRadius: '6px', color: '#fff', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}>Confirmer</button>
                              <button onClick={() => setDeleteConfirm(null)} style={{ padding: '5px 10px', background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: '6px', color: '#94a3b8', fontSize: '0.75rem', cursor: 'pointer' }}>Annuler</button>
                            </div>
                          ) : (
                            <ActionBtn color="#ef4444" title="Supprimer" onClick={() => setDeleteConfirm(exam._id)}>
                              <Trash2 size={15} />
                            </ActionBtn>
                          )
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </main>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@700;800&family=DM+Sans:wght@400;500;600;700&display=swap');
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default ExamsPage;