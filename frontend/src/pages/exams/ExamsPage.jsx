// src/pages/ExamsPage.jsx - Version CORRIGÉE
// ✅ Le bouton "Composer" utilise la configuration de l'épreuve UNIQUEMENT comme suggestion
// ✅ La configuration réelle est choisie par le surveillant

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Edit, Trash2, Play, Eye, Plus, Home, RefreshCw, Search, 
  Clock, Layers, BookOpen, ArrowLeft, Award, Tag,
  Shield, UserCheck, ChevronLeft, ChevronRight, Filter, FilterX,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api, { getExamsPaginated } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import { 
  getAllDomaines, 
  getAllSousDomaines, 
  getAllLevels, 
  getAllMatieres
} from '../../data/domainConfig';

// ═══════════════════════════════════════════════════════════════
// CONFIGURATIONS DES COULEURS
// ═══════════════════════════════════════════════════════════════
const domainColor = (domain) => {
  const map = { 
    'Informatique': '#3b82f6', 'Mathématiques': '#10b981', 'Sciences': '#f59e0b',
    'Histoire': '#ef4444', 'Langue': '#8b5cf6', 'Professionnel': '#10b981',
    'Éducatif': '#6366f1', 'Management': '#8b5cf6', 'Droit': '#ec4899',
    'Médecine': '#06b6d4', 'Santé': '#14b8a6'
  };
  return map[domain] || '#64748b';
};

const getExamOptionColor = (option) => {
  const colors = {
    A: '#ef4444', B: '#ef4444', C: '#ef4444',
    D: '#f59e0b', E: '#f59e0b', F: '#f59e0b',
    G: '#10b981', H: '#10b981', I: '#10b981', J: '#10b981', K: '#10b981'
  };
  return colors[option] || '#3b82f6';
};

// ✅ Texte explicatif pour chaque configuration
const getOptionDescription = (option) => {
  const descriptions = {
    A: 'Plage fermée · Auto-avance · Résultat binaire',
    B: 'Plage fermée · Auto-avance · Résultat binaire+',
    C: 'Plage fermée · Auto-avance · Sans résultat',
    D: 'Plage fermée · Auto-avance · QCM aléatoire · Binaire',
    E: 'Plage fermée · Auto-avance · QCM aléatoire · Binaire+',
    F: 'Plage fermée · Auto-avance · QCM aléatoire · Sans résultat',
    G: 'Plage ouverte · Navigation libre · Reprise OK',
    H: 'Plage ouverte · Navigation libre · No Reply',
    I: 'Plage ouverte · Navigation libre · Reprise OK · Binaire+',
    J: 'Plage ouverte · Navigation libre · No Reply · Binaire+',
    K: 'Plage ouverte · Navigation libre · Sans résultat'
  };
  return descriptions[option] || 'Configuration ' + option;
};

// ═══════════════════════════════════════════════════════════════
// COMPOSANT BOUTON D'ACTION
// ═══════════════════════════════════════════════════════════════
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

const ExamsPage = () => {
  const navigate = useNavigate();
  const { user, hasRole } = useAuth();
  
  // ========== ÉTATS ==========
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
  const [filterStatus, setFilterStatus] = useState('all');
  
  // Options pour les filtres
  const [filterDomains, setFilterDomains] = useState([]);
  const [filterLevels, setFilterLevels] = useState([]);
  const [filterSubjects, setFilterSubjects] = useState([]);
  const [isLoadingFilters, setIsLoadingFilters] = useState(true);

  // Refs pour éviter les appels multiples
  const abortControllerRef = useRef(null);

  // Droits d'accès
  const isAdmin = hasRole('ADMIN_SYSTEME') || hasRole('ADMIN_DELEGUE');
  const isTeacher = hasRole('ENSEIGNANT');
  const isOperator = hasRole('OPERATEUR_EVALUATION');

  // ========== CHARGEMENT DES FILTRES DEPUIS LE RÉFÉRENTIEL ==========
  useEffect(() => {
    const loadFilters = async () => {
      setIsLoadingFilters(true);
      try {
        const domains = getAllDomaines();
        setFilterDomains(domains.map(d => ({ id: d.id, nom: d.nom })));
        
        const allLevelsSet = new Set();
        const allMatieresSet = new Set();
        
        for (const domain of domains) {
          const sousDomaines = getAllSousDomaines(domain.id);
          for (const sousDomaine of sousDomaines) {
            const levels = getAllLevels(domain.id, sousDomaine.id);
            levels.forEach(l => allLevelsSet.add(l.nom));
            const matieres = getAllMatieres(domain.id, sousDomaine.id);
            matieres.forEach(m => allMatieresSet.add(m.nom));
          }
        }
        
        setFilterLevels(Array.from(allLevelsSet).sort());
        setFilterSubjects(Array.from(allMatieresSet).sort());
      } catch (error) {
        console.error('[ExamsPage] Erreur chargement filtres:', error);
      } finally {
        setIsLoadingFilters(false);
      }
    };
    loadFilters();
  }, []);

  // ========== RÉINITIALISATION PAGE QUAND FILTRES CHANGENT ==========
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterDomain, filterLevel, filterSubject, filterStatus]);

  // ========== CHARGEMENT DES ÉPREUVES AVEC ABORTCONTROLLER ==========
  useEffect(() => {
    if (!isAdmin && !isTeacher && !isOperator) {
      setAccessDenied(true);
      toast.error('Accès non autorisé.');
      setTimeout(() => navigate('/evaluate'), 2000);
      return;
    }

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    const fetchExams = async () => {
      setIsLoading(true);
      try {
        const filters = {};
        if (searchTerm) filters.search = searchTerm;
        if (filterDomain) filters.domain = filterDomain;
        if (filterLevel) filters.level = filterLevel;
        if (filterSubject) filters.subject = filterSubject;
        if (filterStatus !== 'all') filters.status = filterStatus;
        
        let response;
        
        if (isAdmin) {
          response = await getExamsPaginated(currentPage, itemsPerPage, filters);
        } else if (isTeacher) {
          const apiResponse = await api.get('/api/exams/my-created', {
            params: { page: currentPage, limit: itemsPerPage, ...filters },
            signal: abortController.signal
          });
          response = apiResponse.data;
        } else if (isOperator) {
          const apiResponse = await api.get('/api/exams/assigned-to-me', {
            params: { page: currentPage, limit: itemsPerPage, ...filters },
            signal: abortController.signal
          });
          response = apiResponse.data;
        } else {
          setExams([]);
          setIsLoading(false);
          return;
        }

        let examsData = [];
        let total = 0;
        
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
        } else if (response?.data && response.data.success && Array.isArray(response.data.data)) {
          examsData = response.data.data;
          total = response.data.total || examsData.length;
          setTotalPages(Math.ceil(total / itemsPerPage));
        } else {
          examsData = [];
          total = 0;
          setTotalPages(1);
        }
        
        setTotalExams(total);
        
        const normalizedExams = examsData.map(exam => ({
          ...exam,
          totalPoints: exam.questions?.reduce((sum, q) => sum + (q.points || 1), 0) || 0,
          totalQuestions: exam.questions?.length || 0,
          domain: exam.domain || exam.domaineNom || 'Non spécifié',
          level: exam.level || exam.niveauNom || 'Non spécifié',
          subject: exam.subject || exam.matiereNom || 'Non spécifié',
          coverImage: exam.coverImage || null,
          isOwner: exam.createdBy?._id === user?._id || exam.createdBy === user?._id,
          isAssignedToMe: exam.assignedTo === user?._id || exam.assignedTo?._id === user?._id,
          statusLabel: exam.status === 'published' ? 'Publiée' : exam.status === 'draft' ? 'Brouillon' : 'Archivée',
          statusColor: exam.status === 'published' ? '#10b981' : exam.status === 'draft' ? '#f59e0b' : '#64748b',
          // ✅ La configuration de l'épreuve est stockée, mais c'est UNIQUEMENT une suggestion
          examOption: exam.examOption,
          examOptionColor: getExamOptionColor(exam.examOption),
          // ✅ Message explicatif pour l'utilisateur
          optionDescription: getOptionDescription(exam.examOption)
        }));

        setExams(normalizedExams);
      } catch (error) {
        if (error.name === 'CanceledError' || error.code === 'ERR_CANCELED') {
          console.log('[ExamsPage] Requête annulée');
          return;
        }
        console.error('[ExamsPage] Erreur chargement épreuves:', error);
        toast.error("Impossible de charger les épreuves.");
        setExams([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchExams();
    
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [navigate, user, isAdmin, isTeacher, isOperator, currentPage, itemsPerPage, searchTerm, filterDomain, filterLevel, filterSubject, filterStatus]);

  // ========== SUPPRESSION ÉPREUVE ==========
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
      console.error('[ExamsPage] Erreur suppression:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  // ========== NAVIGATION PAGINATION ==========
  const goToPage = useCallback((page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [totalPages]);

  // ========== RÉINITIALISATION DES FILTRES ==========
  const resetFilters = useCallback(() => {
    setSearchTerm('');
    setFilterDomain('');
    setFilterLevel('');
    setFilterSubject('');
    setFilterStatus('all');
    setCurrentPage(1);
    toast.success('Filtres réinitialisés');
  }, []);

  const hasActiveFilters = searchTerm || filterDomain || filterLevel || filterSubject || filterStatus !== 'all';

  // ========== RENDU ACCÈS NON AUTORISÉ ==========
  if (accessDenied) {
    return (
      <div style={styles.deniedContainer}>
        <div style={styles.deniedCard}>
          <Shield size={64} color="#ef4444" style={{ marginBottom: 16 }} />
          <h2 style={styles.deniedTitle}>Accès non autorisé</h2>
          <p style={styles.deniedText}>Cette page est réservée aux enseignants, opérateurs et administrateurs.</p>
          <button onClick={() => navigate('/evaluate')} style={styles.deniedButton}>Retour au tableau de bord</button>
        </div>
      </div>
    );
  }

  // ========== RENDU PRINCIPAL ==========
  return (
    <div style={styles.container}>
      <div style={styles.bgGrid} />
      <div style={styles.bgGlow} />

      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            onClick={() => navigate('/evaluate')} style={styles.backButton}>
            <ArrowLeft size={18} />
            <span style={{ fontSize: '0.8rem' }}>Tableau de bord</span>
          </motion.button>
          <div style={styles.divider} />
          <span style={styles.logo}>NA²QUIZ</span>
        </div>

        <div style={styles.headerRight}>
          <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
            onClick={() => navigate('/evaluate')} style={styles.homeButton}>
            <Home size={14} /> Accueil
          </motion.button>
          
          {(isAdmin || isTeacher) && (
            <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
              onClick={() => navigate('/create/database')} style={styles.newExamButton}>
              <Plus size={14} /> Nouvelle épreuve
            </motion.button>
          )}
        </div>
      </header>

      <main style={styles.main}>
        <div style={styles.statsHeader}>
          <div>
            <h1 style={styles.title}>Gestion des épreuves</h1>
            <p style={styles.subtitle}>
              {totalExams} épreuve{totalExams !== 1 ? 's' : ''} · Page {currentPage} / {totalPages}
              {hasActiveFilters && <span style={styles.filterBadge}>· Filtres actifs</span>}
            </p>
          </div>
          {hasActiveFilters && (
            <button onClick={resetFilters} style={styles.resetFiltersButton}>
              <RefreshCw size={14} /> Réinitialiser les filtres
            </button>
          )}
        </div>

        <div style={styles.filtersBar}>
          <div style={styles.searchContainer}>
            <Search size={16} style={styles.searchIcon} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Rechercher par titre..."
              style={styles.searchInput}
            />
          </div>

          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} style={styles.filterSelect}>
            <option value="all">📋 Tous statuts</option>
            <option value="published">✅ Publiées</option>
            <option value="draft">✏️ Brouillons</option>
            <option value="archived">📦 Archivées</option>
          </select>

          {!isLoadingFilters && filterDomains.length > 0 && (
            <select value={filterDomain} onChange={(e) => setFilterDomain(e.target.value)} style={styles.filterSelect}>
              <option value="">🌍 Tous domaines</option>
              {filterDomains.map(d => <option key={d.id} value={d.nom}>{d.nom}</option>)}
            </select>
          )}

          {!isLoadingFilters && filterLevels.length > 0 && (
            <select value={filterLevel} onChange={(e) => setFilterLevel(e.target.value)} style={styles.filterSelect}>
              <option value="">🎓 Tous niveaux</option>
              {filterLevels.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          )}

          {!isLoadingFilters && filterSubjects.length > 0 && (
            <select value={filterSubject} onChange={(e) => setFilterSubject(e.target.value)} style={styles.filterSelect}>
              <option value="">📚 Toutes matières</option>
              {filterSubjects.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          )}
        </div>

        {isLoading ? (
          <div style={styles.loadingContainer}>
            <RefreshCw size={32} color="#3b82f6" style={{ animation: 'spin 1s linear infinite' }} />
            <p style={styles.loadingText}>Chargement des épreuves...</p>
          </div>
        ) : exams.length === 0 ? (
          <div style={styles.emptyContainer}>
            <BookOpen size={48} color="#1e293b" style={{ marginBottom: 16 }} />
            <p style={styles.emptyText}>
              {hasActiveFilters ? 'Aucune épreuve ne correspond aux filtres sélectionnés.' : 'Aucune épreuve disponible.'}
            </p>
            {hasActiveFilters && (
              <button onClick={resetFilters} style={styles.emptyButton}>
                <FilterX size={14} /> Réinitialiser les filtres
              </button>
            )}
          </div>
        ) : (
          <>
            <div style={styles.grid}>
              <AnimatePresence>
                {exams.map((exam, i) => {
                  const color = domainColor(exam.domain);
                  const isClosedRange = ['A', 'B', 'C', 'D', 'E', 'F'].includes(exam.examOption);
                  const isOpenRange = ['G', 'H', 'I', 'J', 'K'].includes(exam.examOption);
                  
                  return (
                    <motion.div
                      key={exam._id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ delay: Math.min(i * 0.04, 0.5) }}
                      whileHover={{ y: -4 }}
                      style={styles.card(color)}
                    >
                      {isOperator && exam.isAssignedToMe && (
                        <div style={styles.assignedBadge}>
                          <UserCheck size={10} /> Assignée
                        </div>
                      )}

                      <div style={styles.statusBadge(exam.statusColor)}>
                        {exam.statusLabel}
                      </div>

                      {exam.examOption && (
                        <div style={styles.optionBadge(exam.examOptionColor)}>
                          Config {exam.examOption}
                        </div>
                      )}

                      {exam.coverImage && (
                        <div style={styles.coverImageContainer}>
                          <img src={exam.coverImage} alt={exam.title} style={styles.coverImage} 
                            onError={(e) => { e.target.style.display = 'none'; }} />
                        </div>
                      )}

                      <div style={styles.cardContent}>
                        <h3 style={styles.cardTitle}>{exam.title}</h3>
                        
                        <div style={styles.tagsContainer}>
                          {exam.domain && exam.domain !== 'Non spécifié' && (
                            <span style={styles.tag(domainColor(exam.domain), '#60a5fa')}>
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

                        {/* ✅ Affichage de la configuration avec description */}
                        {exam.examOption && (
                          <div style={{
                            marginBottom: 8,
                            padding: '4px 10px',
                            background: `${exam.examOptionColor}12`,
                            border: `1px solid ${exam.examOptionColor}30`,
                            borderRadius: 6,
                            fontSize: '0.65rem',
                            color: exam.examOptionColor
                          }}>
                            <Info size={10} style={{ display: 'inline', marginRight: 4 }} />
                            Config {exam.examOption} : {exam.optionDescription}
                            {isClosedRange && (
                              <span style={{ marginLeft: 6, color: '#f59e0b' }}>🔒 Auto-avance</span>
                            )}
                            {isOpenRange && (
                              <span style={{ marginLeft: 6, color: '#10b981' }}>✅ Navigation libre</span>
                            )}
                          </div>
                        )}

                        <div style={styles.metricsContainer}>
                          <span style={styles.metric}><Clock size={13} /> {exam.duration || 60} min</span>
                          <span style={styles.metric}><BookOpen size={13} /> {exam.totalQuestions || 0} questions</span>
                          <span style={styles.metric}><Award size={13} /> {exam.totalPoints || 0} pts</span>
                        </div>

                        <div style={styles.actionsContainer}>
                          <div style={styles.actionButtons}>
                            {/* ✅ Le bouton "Composer" utilise la config de l'épreuve comme SUGGESTION
                                La configuration réelle sera choisie par le surveillant */}
                            <ActionBtn color="#10b981" title="Composer (config suggérée)" onClick={() => {
                              const examData = {
                                examId: exam._id,
                                info: { 
                                  firstName: user?.name?.split(' ')[0] || 'Test', 
                                  lastName: user?.name?.split(' ')[1] || 'Enseignant', 
                                  matricule: user?.matricule || 'PROF-001', 
                                  level: exam.level || '' 
                                },
                                // ✅ Configuration SUGGÉRÉE (pas figée)
                                examOption: exam.examOption || 'C',
                                // ✅ La configuration complète est stockée mais sera écrasée par le surveillant
                                config: exam.config || null,
                                terminalSessionId: null
                              };
                              localStorage.setItem('studentInfoForExam', JSON.stringify(examData));
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
                              <div style={styles.confirmButtons}>
                                <button onClick={() => deleteExam(exam._id)} style={styles.confirmDelete}>Confirmer</button>
                                <button onClick={() => setDeleteConfirm(null)} style={styles.confirmCancel}>Annuler</button>
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

            {totalPages > 1 && (
              <div style={styles.paginationContainer}>
                <button onClick={() => goToPage(currentPage - 1)} disabled={currentPage === 1} style={styles.paginationPrev(currentPage === 1)}>
                  <ChevronLeft size={16} /> Précédent
                </button>
                <div style={styles.paginationNumbers}>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) pageNum = i + 1;
                    else if (currentPage <= 3) pageNum = i + 1;
                    else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
                    else pageNum = currentPage - 2 + i;
                    
                    return (
                      <button key={pageNum} onClick={() => goToPage(pageNum)} style={styles.paginationNumber(currentPage === pageNum)}>
                        {pageNum}
                      </button>
                    );
                  })}
                </div>
                <button onClick={() => goToPage(currentPage + 1)} disabled={currentPage === totalPages} style={styles.paginationNext(currentPage === totalPages)}>
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

// ═══════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════
const styles = {
  container: { minHeight: '100vh', fontFamily: "'DM Sans', sans-serif", background: 'linear-gradient(135deg, #05071a 0%, #0a0f2e 60%, #05071a 100%)', position: 'relative' },
  bgGrid: { position: 'fixed', inset: 0, backgroundImage: 'linear-gradient(rgba(59,130,246,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,0.03) 1px, transparent 1px)', backgroundSize: '40px 40px', pointerEvents: 'none', zIndex: 0 },
  bgGlow: { position: 'fixed', top: '-15%', left: '50%', transform: 'translateX(-50%)', width: '70vw', height: '50vh', background: 'radial-gradient(ellipse, rgba(37,99,235,0.12) 0%, transparent 70%)', pointerEvents: 'none', zIndex: 0 },
  header: { position: 'sticky', top: 0, zIndex: 50, background: 'rgba(5,7,26,0.9)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(59,130,246,0.1)', padding: '0 32px', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  headerLeft: { display: 'flex', alignItems: 'center', gap: 16 },
  backButton: { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 10, padding: '8px 12px', color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 },
  divider: { width: '1px', height: '20px', background: 'rgba(255,255,255,0.1)' },
  logo: { fontFamily: "'Sora', sans-serif", fontWeight: 800, fontSize: '1.125rem', background: 'linear-gradient(135deg, #60a5fa, #a78bfa)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' },
  headerRight: { display: 'flex', gap: 10 },
  homeButton: { display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: '#94a3b8', fontSize: '0.875rem', cursor: 'pointer' },
  newExamButton: { display: 'flex', alignItems: 'center', gap: 6, padding: '7px 16px', borderRadius: 8, background: 'linear-gradient(135deg, #1d4ed8, #2563eb)', border: 'none', color: '#fff', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer' },
  main: { position: 'relative', zIndex: 1, maxWidth: '1280px', margin: '0 auto', padding: '40px 24px' },
  statsHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' },
  title: { fontFamily: "'Sora', sans-serif", fontSize: '1.875rem', fontWeight: 800, letterSpacing: '-0.03em', color: '#f8fafc', marginBottom: '4px' },
  subtitle: { color: '#64748b', fontSize: '0.9rem' },
  filterBadge: { color: '#60a5fa', marginLeft: 8 },
  resetFiltersButton: { padding: '8px 16px', background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, color: '#ef4444', fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 },
  filtersBar: { display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '28px', padding: '16px', background: 'rgba(15,23,42,0.5)', borderRadius: '16px', border: '1px solid rgba(59,130,246,0.15)' },
  searchContainer: { position: 'relative', flex: '1', minWidth: '200px' },
  searchIcon: { position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#475569' },
  searchInput: { width: '100%', padding: '10px 12px 10px 38px', background: 'rgba(15,23,42,0.7)', border: '1px solid rgba(59,130,246,0.18)', borderRadius: 10, color: '#e2e8f0', fontSize: '0.875rem', outline: 'none' },
  filterSelect: { padding: '10px 12px', background: 'rgba(15,23,42,0.7)', border: '1px solid rgba(59,130,246,0.18)', borderRadius: 10, color: '#e2e8f0', fontSize: '0.875rem', outline: 'none', minWidth: '140px' },
  loadingContainer: { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px', flexDirection: 'column', gap: 16 },
  loadingText: { color: '#64748b', marginTop: 16 },
  emptyContainer: { textAlign: 'center', padding: '80px 24px', background: 'rgba(15,23,42,0.5)', border: '1px dashed rgba(59,130,246,0.2)', borderRadius: 16 },
  emptyText: { color: '#475569', fontSize: '1rem', marginBottom: 16 },
  emptyButton: { marginTop: 16, padding: '8px 20px', background: '#3b82f6', border: 'none', borderRadius: 8, color: '#fff', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '18px' },
  card: (color) => ({ background: 'rgba(15,23,42,0.75)', border: `1px solid ${color}22`, borderRadius: '14px', backdropFilter: 'blur(12px)', boxShadow: '0 4px 20px rgba(0,0,0,0.35)', position: 'relative', overflow: 'hidden' }),
  assignedBadge: { position: 'absolute', top: 8, right: 8, zIndex: 10, background: 'rgba(16,185,129,0.9)', padding: '2px 8px', borderRadius: 20, fontSize: '0.6rem', fontWeight: 600, color: '#fff', display: 'flex', alignItems: 'center', gap: 4 },
  statusBadge: (color) => ({ position: 'absolute', top: 8, left: 8, zIndex: 10, background: `${color}20`, border: `1px solid ${color}40`, padding: '2px 8px', borderRadius: 20, fontSize: '0.6rem', fontWeight: 600, color: color }),
  optionBadge: (color) => ({ position: 'absolute', top: 8, right: 8, zIndex: 10, background: `${color}20`, border: `1px solid ${color}40`, padding: '2px 8px', borderRadius: 20, fontSize: '0.55rem', fontWeight: 600, color: color }),
  coverImageContainer: { height: '120px', overflow: 'hidden', margin: '-22px -22px 12px -22px' },
  coverImage: { width: '100%', height: '100%', objectFit: 'cover' },
  cardContent: { padding: '0 22px 22px 22px' },
  cardTitle: { fontFamily: "'Sora', sans-serif", fontSize: '1rem', fontWeight: 700, color: '#f1f5f9', marginBottom: 8 },
  tagsContainer: { display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  tag: (color, textColor) => ({ padding: '2px 8px', borderRadius: 6, background: `${color}20`, color: textColor, fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: 4 }),
  metricsContainer: { display: 'flex', gap: 16, marginBottom: 16, paddingBottom: 16, borderBottom: '1px solid rgba(255,255,255,0.05)' },
  metric: { display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.8125rem', color: '#64748b' },
  actionsContainer: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  actionButtons: { display: 'flex', gap: 8 },
  confirmButtons: { display: 'flex', gap: 6 },
  confirmDelete: { padding: '5px 10px', background: '#dc2626', border: 'none', borderRadius: 6, color: '#fff', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' },
  confirmCancel: { padding: '5px 10px', background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: 6, color: '#94a3b8', fontSize: '0.75rem', cursor: 'pointer' },
  paginationContainer: { display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 32 },
  paginationPrev: (disabled) => ({ padding: '8px 12px', background: disabled ? 'rgba(255,255,255,0.05)' : 'rgba(59,130,246,0.2)', border: `1px solid ${disabled ? 'rgba(255,255,255,0.1)' : 'rgba(59,130,246,0.3)'}`, borderRadius: 8, color: disabled ? '#475569' : '#60a5fa', cursor: disabled ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 4 }),
  paginationNext: (disabled) => ({ padding: '8px 12px', background: disabled ? 'rgba(255,255,255,0.05)' : 'rgba(59,130,246,0.2)', border: `1px solid ${disabled ? 'rgba(255,255,255,0.1)' : 'rgba(59,130,246,0.3)'}`, borderRadius: 8, color: disabled ? '#475569' : '#60a5fa', cursor: disabled ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 4 }),
  paginationNumbers: { display: 'flex', gap: 6 },
  paginationNumber: (isActive) => ({ width: '36px', height: '36px', borderRadius: 8, background: isActive ? 'linear-gradient(135deg, #3b82f6, #2563eb)' : 'rgba(255,255,255,0.05)', border: isActive ? 'none' : '1px solid rgba(255,255,255,0.1)', color: isActive ? '#fff' : '#94a3b8', cursor: 'pointer', fontWeight: isActive ? 600 : 400 }),
  deniedContainer: { minHeight: '100vh', background: 'linear-gradient(135deg, #05071a, #0a0f2e)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 },
  deniedCard: { background: 'rgba(239,68,68,0.1)', border: '1px solid #ef4444', borderRadius: 24, padding: 48, textAlign: 'center', maxWidth: 500 },
  deniedTitle: { color: '#f8fafc', marginBottom: 12 },
  deniedText: { color: '#ef4444', marginBottom: 24 },
  deniedButton: { padding: '10px 24px', background: 'linear-gradient(135deg, #3b82f6, #2563eb)', border: 'none', borderRadius: 8, color: 'white', cursor: 'pointer' }
};

export default ExamsPage;