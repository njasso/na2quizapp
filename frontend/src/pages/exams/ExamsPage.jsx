// src/pages/ExamsPage.jsx - Version CORRIGÉE avec filtres fonctionnels

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Edit, Trash2, Play, Eye, Plus, Home, RefreshCw, Search, 
  Clock, Layers, BookOpen, ArrowLeft, Award, Tag,
  Shield, UserCheck, ChevronLeft, ChevronRight, Filter
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api, { getExamsPaginated } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import ENV_CONFIG from '../../config/env';

const ExamsPage = () => {
  const navigate = useNavigate();
  const { user, hasRole } = useAuth();
  
  // États pour les épreuves
  const [exams, setExams] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [accessDenied, setAccessDenied] = useState(false);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalExams, setTotalExams] = useState(0);
  const [itemsPerPage] = useState(12);

  // Filtres
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDomain, setFilterDomain] = useState('');
  const [filterLevel, setFilterLevel] = useState('');
  const [filterSubject, setFilterSubject] = useState('');
  
  // Options pour les filtres (extraites des données)
  const [domains, setDomains] = useState([]);
  const [levels, setLevels] = useState([]);
  const [subjects, setSubjects] = useState([]);

  // Droits d'accès
  const isAdmin = hasRole('ADMIN_SYSTEME') || hasRole('ADMIN_DELEGUE');
  const isTeacher = hasRole('ENSEIGNANT');
  const isOperator = hasRole('OPERATEUR_EVALUATION');

  // Extraire les options de filtres à partir des épreuves chargées
  useEffect(() => {
    if (exams.length > 0) {
      const uniqueDomains = [...new Set(exams.map(e => e.domain).filter(Boolean))];
      const uniqueLevels = [...new Set(exams.map(e => e.level).filter(Boolean))];
      const uniqueSubjects = [...new Set(exams.map(e => e.subject).filter(Boolean))];
      setDomains(uniqueDomains);
      setLevels(uniqueLevels);
      setSubjects(uniqueSubjects);
    }
  }, [exams]);

  // Réinitialiser la page quand les filtres changent
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterDomain, filterLevel, filterSubject]);

  // Chargement des épreuves avec pagination et filtres
  useEffect(() => {
    if (!isAdmin && !isTeacher && !isOperator) {
      setAccessDenied(true);
      toast.error('Accès non autorisé.');
      setTimeout(() => navigate('/evaluate'), 2000);
      return;
    }

    const fetchExams = async () => {
      setIsLoading(true);
      try {
        const filters = {};
        if (searchTerm) filters.search = searchTerm;
        if (filterDomain) filters.domain = filterDomain;
        if (filterLevel) filters.level = filterLevel;
        if (filterSubject) filters.subject = filterSubject;
        
        let response;
        
        if (isAdmin) {
          // Utiliser la route paginée avec filtres
          response = await getExamsPaginated(currentPage, itemsPerPage, filters);
        } else if (isTeacher) {
          response = await api.get('/api/exams/my-created', {
            params: { page: currentPage, limit: itemsPerPage, ...filters }
          });
        } else if (isOperator) {
          response = await api.get('/api/exams/assigned-to-me', {
            params: { page: currentPage, limit: itemsPerPage, ...filters }
          });
        } else {
          setExams([]);
          setIsLoading(false);
          return;
        }

        // Normalisation des données paginées
        let examsData = [];
        let total = 0;
        
        // Gérer différents formats de réponse
        if (response?.data?.data && Array.isArray(response.data.data)) {
          examsData = response.data.data;
          total = response.data.total || response.data.count || examsData.length;
          setTotalPages(Math.ceil(total / itemsPerPage));
        } else if (Array.isArray(response?.data)) {
          examsData = response.data;
          total = examsData.length;
          setTotalPages(Math.ceil(total / itemsPerPage));
        } else if (Array.isArray(response)) {
          examsData = response;
          total = examsData.length;
          setTotalPages(Math.ceil(total / itemsPerPage));
        } else {
          examsData = [];
          total = 0;
          setTotalPages(1);
        }
        
        setTotalExams(total);
        
        // Normalisation avec images
        const normalizedExams = examsData.map(exam => ({
          ...exam,
          totalPoints: exam.questions?.reduce((sum, q) => sum + (q.points || 1), 0) || 0,
          totalQuestions: exam.questions?.length || 0,
          domain: exam.domain || 'Non spécifié',
          level: exam.level || 'Non spécifié',
          subject: exam.subject || 'Non spécifié',
          coverImage: exam.coverImage || null,
          isOwner: exam.createdBy?._id === user?._id || exam.createdBy === user?._id,
          isAssignedToMe: exam.assignedTo === user?._id || exam.assignedTo?._id === user?._id
        }));

        setExams(normalizedExams);
      } catch (error) {
        console.error('Erreur chargement épreuves:', error);
        toast.error("Impossible de charger les épreuves.");
        setExams([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchExams();
  }, [navigate, user, isAdmin, isTeacher, isOperator, currentPage, itemsPerPage, searchTerm, filterDomain, filterLevel, filterSubject]);

  const deleteExam = async (examId) => {
    const exam = exams.find(e => e._id === examId);
    if (!isAdmin && !(isTeacher && exam?.isOwner)) {
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
      toast.error('Erreur lors de la suppression');
    }
  };

  // Navigation pagination
  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Réinitialiser tous les filtres
  const resetFilters = () => {
    setSearchTerm('');
    setFilterDomain('');
    setFilterLevel('');
    setFilterSubject('');
    setCurrentPage(1);
  };

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

  if (accessDenied) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #05071a, #0a0f2e)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24
      }}>
        <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid #ef4444', borderRadius: 24, padding: 48, textAlign: 'center', maxWidth: 500 }}>
          <Shield size={64} color="#ef4444" style={{ marginBottom: 16 }} />
          <h2 style={{ color: '#f8fafc', marginBottom: 12 }}>Accès non autorisé</h2>
          <p style={{ color: '#ef4444', marginBottom: 24 }}>Cette page est réservée aux enseignants, opérateurs et administrateurs.</p>
          <button onClick={() => navigate('/evaluate')} style={{ padding: '10px 24px', background: 'linear-gradient(135deg, #3b82f6, #2563eb)', border: 'none', borderRadius: 8, color: 'white', cursor: 'pointer' }}>Retour</button>
        </div>
      </div>
    );
  }

  const hasActiveFilters = searchTerm || filterDomain || filterLevel || filterSubject;

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

      <header style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'rgba(5,7,26,0.9)', backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(59,130,246,0.1)',
        padding: '0 32px', height: '60px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            onClick={() => navigate('/evaluate')}
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 10, padding: 8, color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
            <ArrowLeft size={18} />
            <span style={{ fontSize: '0.8rem' }}>Tableau de bord</span>
          </motion.button>
          <div style={{ width: '1px', height: '20px', background: 'rgba(255,255,255,0.1)' }} />
          <span style={{ fontFamily: "'Sora', sans-serif", fontWeight: 800, fontSize: '1.125rem', background: 'linear-gradient(135deg, #60a5fa, #a78bfa)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>NA²QUIZ</span>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
            onClick={() => navigate('/evaluate')}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: '#94a3b8', fontSize: '0.875rem', cursor: 'pointer' }}>
            <Home size={14} /> Accueil
          </motion.button>
          
          {(isAdmin || isTeacher) && (
            <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
              onClick={() => navigate('/create/database')}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 16px', borderRadius: 8, background: 'linear-gradient(135deg, #1d4ed8, #2563eb)', border: 'none', color: '#fff', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer' }}>
              <Plus size={14} /> Nouvelle épreuve
            </motion.button>
          )}
        </div>
      </header>

      <main style={{ position: 'relative', zIndex: 1, maxWidth: '1280px', margin: '0 auto', padding: '40px 24px' }}>
        {/* En-tête avec stats */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 style={{ fontFamily: "'Sora', sans-serif", fontSize: '1.875rem', fontWeight: 800, letterSpacing: '-0.03em', color: '#f8fafc', marginBottom: '4px' }}>
              Gestion des épreuves
            </h1>
            <p style={{ color: '#64748b', fontSize: '0.9rem' }}>
              {totalExams} épreuve{totalExams !== 1 ? 's' : ''} · Page {currentPage} / {totalPages}
              {hasActiveFilters && <span style={{ color: '#60a5fa', marginLeft: 8 }}>· Filtres actifs</span>}
            </p>
          </div>
          
          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              style={{
                padding: '8px 16px',
                background: 'rgba(239,68,68,0.15)',
                border: '1px solid rgba(239,68,68,0.3)',
                borderRadius: 8,
                color: '#ef4444',
                fontSize: '0.8rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6
              }}
            >
              <RefreshCw size={14} /> Réinitialiser les filtres
            </button>
          )}
        </div>

        {/* Barre de filtres */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '12px',
          marginBottom: '28px',
          padding: '16px',
          background: 'rgba(15,23,42,0.5)',
          borderRadius: '16px',
          border: '1px solid rgba(59,130,246,0.15)'
        }}>
          {/* Recherche par texte */}
          <div style={{ position: 'relative', flex: '1', minWidth: '200px' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#475569' }} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Rechercher par titre..."
              style={{
                width: '100%', padding: '10px 12px 10px 38px',
                background: 'rgba(15,23,42,0.7)', border: '1px solid rgba(59,130,246,0.18)',
                borderRadius: 10, color: '#e2e8f0', fontSize: '0.875rem', outline: 'none',
              }}
            />
          </div>

          {/* Filtre par domaine */}
          {domains.length > 0 && (
            <select
              value={filterDomain}
              onChange={(e) => setFilterDomain(e.target.value)}
              style={{
                padding: '10px 12px',
                background: 'rgba(15,23,42,0.7)',
                border: '1px solid rgba(59,130,246,0.18)',
                borderRadius: 10,
                color: '#e2e8f0',
                fontSize: '0.875rem',
                outline: 'none',
                minWidth: '140px'
              }}
            >
              <option value="">Tous domaines</option>
              {domains.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          )}

          {/* Filtre par niveau */}
          {levels.length > 0 && (
            <select
              value={filterLevel}
              onChange={(e) => setFilterLevel(e.target.value)}
              style={{
                padding: '10px 12px',
                background: 'rgba(15,23,42,0.7)',
                border: '1px solid rgba(59,130,246,0.18)',
                borderRadius: 10,
                color: '#e2e8f0',
                fontSize: '0.875rem',
                outline: 'none',
                minWidth: '140px'
              }}
            >
              <option value="">Tous niveaux</option>
              {levels.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          )}

          {/* ✅ Filtre par matière (nouveau) */}
          {subjects.length > 0 && (
            <select
              value={filterSubject}
              onChange={(e) => setFilterSubject(e.target.value)}
              style={{
                padding: '10px 12px',
                background: 'rgba(15,23,42,0.7)',
                border: '1px solid rgba(59,130,246,0.18)',
                borderRadius: 10,
                color: '#e2e8f0',
                fontSize: '0.875rem',
                outline: 'none',
                minWidth: '140px'
              }}
            >
              <option value="">Toutes matières</option>
              {subjects.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          )}
        </div>

        {/* Contenu principal */}
        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px' }}>
            <RefreshCw size={32} color="#3b82f6" style={{ animation: 'spin 1s linear infinite' }} />
          </div>
        ) : exams.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 24px', background: 'rgba(15,23,42,0.5)', border: '1px dashed rgba(59,130,246,0.2)', borderRadius: 16 }}>
            <BookOpen size={48} color="#1e293b" style={{ marginBottom: 16 }} />
            <p style={{ color: '#475569', fontSize: '1rem' }}>
              {hasActiveFilters ? 'Aucune épreuve ne correspond aux filtres sélectionnés.' : 'Aucune épreuve disponible.'}
            </p>
            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                style={{
                  marginTop: 16,
                  padding: '8px 20px',
                  background: '#3b82f6',
                  border: 'none',
                  borderRadius: 8,
                  color: '#fff',
                  cursor: 'pointer'
                }}
              >
                Réinitialiser les filtres
              </button>
            )}
          </div>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '18px' }}>
              <AnimatePresence>
                {exams.map((exam, i) => {
                  const color = domainColor(exam.domain);
                  return (
                    <motion.div
                      key={exam._id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ delay: Math.min(i * 0.04, 0.5) }}
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
                    >
                      {isOperator && exam.isAssignedToMe && (
                        <div style={{ position: 'absolute', top: 8, right: 8, zIndex: 10, background: 'rgba(16,185,129,0.9)', padding: '2px 8px', borderRadius: 20, fontSize: '0.6rem', fontWeight: 600, color: '#fff', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <UserCheck size={10} /> Assignée
                        </div>
                      )}

                      {exam.coverImage && (
                        <div style={{ height: '120px', overflow: 'hidden', margin: '-22px -22px 12px -22px' }}>
                          <img 
                            src={exam.coverImage} 
                            alt={exam.title} 
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                            onError={(e) => { e.target.style.display = 'none'; }} 
                          />
                        </div>
                      )}

                      <div style={{ padding: '0 22px 22px 22px' }}>
                        <h3 style={{ fontFamily: "'Sora', sans-serif", fontSize: '1rem', fontWeight: 700, color: '#f1f5f9', marginBottom: 8 }}>{exam.title}</h3>
                        
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                          {exam.domain && exam.domain !== 'Non spécifié' && (
                            <span style={{ padding: '2px 8px', borderRadius: 6, background: 'rgba(59,130,246,0.1)', color: '#60a5fa', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: 4 }}>
                              <Tag size={10} /> {exam.domain}
                            </span>
                          )}
                          {exam.level && exam.level !== 'Non spécifié' && (
                            <span style={{ padding: '2px 8px', borderRadius: 6, background: 'rgba(139,92,246,0.1)', color: '#a78bfa', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: 4 }}>
                              <Layers size={10} /> {exam.level}
                            </span>
                          )}
                          {exam.subject && exam.subject !== 'Non spécifié' && (
                            <span style={{ padding: '2px 8px', borderRadius: 6, background: 'rgba(16,185,129,0.1)', color: '#34d399', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: 4 }}>
                              <BookOpen size={10} /> {exam.subject}
                            </span>
                          )}
                        </div>

                        <div style={{ display: 'flex', gap: 16, marginBottom: 16, paddingBottom: 16, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.8125rem', color: '#64748b' }}>
                            <Clock size={13} /> {exam.duration || 60} min
                          </span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.8125rem', color: '#64748b' }}>
                            <BookOpen size={13} /> {exam.totalQuestions || 0} questions
                          </span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.8125rem', color: '#64748b' }}>
                            <Award size={13} /> {exam.totalPoints || 0} pts
                          </span>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ display: 'flex', gap: 8 }}>
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
                            <ActionBtn color="#3b82f6" title="Prévisualiser" onClick={() => navigate(`/preview/${exam._id}`)}>
                              <Eye size={15} />
                            </ActionBtn>
                            {(isAdmin || (isTeacher && exam.isOwner)) && (
                              <ActionBtn color="#f59e0b" title="Modifier" onClick={() => navigate(`/create/manual`, { state: { editExamId: exam._id, exam } })}>
                                <Edit size={15} />
                              </ActionBtn>
                            )}
                          </div>
                          {(isAdmin || (isTeacher && exam.isOwner)) && (
                            deleteConfirm === exam._id ? (
                              <div style={{ display: 'flex', gap: 6 }}>
                                <button onClick={() => deleteExam(exam._id)} style={{ padding: '5px 10px', background: '#dc2626', border: 'none', borderRadius: 6, color: '#fff', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}>Confirmer</button>
                                <button onClick={() => setDeleteConfirm(null)} style={{ padding: '5px 10px', background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: 6, color: '#94a3b8', fontSize: '0.75rem', cursor: 'pointer' }}>Annuler</button>
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

            {/* Pagination */}
            {totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 32 }}>
                <button
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  style={{
                    padding: '8px 12px',
                    background: currentPage === 1 ? 'rgba(255,255,255,0.05)' : 'rgba(59,130,246,0.2)',
                    border: `1px solid ${currentPage === 1 ? 'rgba(255,255,255,0.1)' : 'rgba(59,130,246,0.3)'}`,
                    borderRadius: 8,
                    color: currentPage === 1 ? '#475569' : '#60a5fa',
                    cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4
                  }}
                >
                  <ChevronLeft size={16} /> Précédent
                </button>
                
                <div style={{ display: 'flex', gap: 6 }}>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    
                    return (
                      <button
                        key={pageNum}
                        onClick={() => goToPage(pageNum)}
                        style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: 8,
                          background: currentPage === pageNum ? 'linear-gradient(135deg, #3b82f6, #2563eb)' : 'rgba(255,255,255,0.05)',
                          border: currentPage === pageNum ? 'none' : '1px solid rgba(255,255,255,0.1)',
                          color: currentPage === pageNum ? '#fff' : '#94a3b8',
                          cursor: 'pointer',
                          fontWeight: currentPage === pageNum ? 600 : 400
                        }}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>
                
                <button
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  style={{
                    padding: '8px 12px',
                    background: currentPage === totalPages ? 'rgba(255,255,255,0.05)' : 'rgba(59,130,246,0.2)',
                    border: `1px solid ${currentPage === totalPages ? 'rgba(255,255,255,0.1)' : 'rgba(59,130,246,0.3)'}`,
                    borderRadius: 8,
                    color: currentPage === totalPages ? '#475569' : '#60a5fa',
                    cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4
                  }}
                >
                  Suivant <ChevronRight size={16} />
                </button>
              </div>
            )}
          </>
        )}
      </main>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@700;800&family=DM+Sans:wght@400;500;600;700&display=swap');
        @keyframes spin { to { transform: rotate(360deg); } }
        select option { background: #1e293b; color: #f8fafc; }
      `}</style>
    </div>
  );
};

export default ExamsPage;