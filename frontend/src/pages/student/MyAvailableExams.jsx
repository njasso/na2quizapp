// src/pages/student/MyAvailableExams.jsx - Version COMPLÈTE À JOUR
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Play, Clock, BookOpen, ArrowLeft, Info, Tag, Layers, 
  Filter, Search, X, Calendar, Award, Star, TrendingUp,
  Image as ImageIcon, AlertCircle, CheckCircle
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import toast from 'react-hot-toast';

const MyAvailableExams = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDomain, setFilterDomain] = useState('');
  const [filterLevel, setFilterLevel] = useState('');
  const [filterSubject, setFilterSubject] = useState('');
  const [filterOption, setFilterOption] = useState('');
  const [sortBy, setSortBy] = useState('date');

  // Extraire les valeurs uniques pour les filtres
  const domains = useMemo(() => [...new Set(exams.map(e => e.domain).filter(Boolean))], [exams]);
  const levels = useMemo(() => [...new Set(exams.map(e => e.level).filter(Boolean))], [exams]);
  const subjects = useMemo(() => [...new Set(exams.map(e => e.subject).filter(Boolean))], [exams]);
  const options = useMemo(() => [...new Set(exams.map(e => e.examOption).filter(Boolean))], [exams]);

  // Filtrer et trier les épreuves
  const filteredExams = useMemo(() => {
    let filtered = [...exams];
    
    // Recherche textuelle
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(e => 
        e.title?.toLowerCase().includes(term) ||
        e.description?.toLowerCase().includes(term) ||
        e.subject?.toLowerCase().includes(term) ||
        e.domain?.toLowerCase().includes(term)
      );
    }
    
    // Filtres
    if (filterDomain) filtered = filtered.filter(e => e.domain === filterDomain);
    if (filterLevel) filtered = filtered.filter(e => e.level === filterLevel);
    if (filterSubject) filtered = filtered.filter(e => e.subject === filterSubject);
    if (filterOption) filtered = filtered.filter(e => e.examOption === filterOption);
    
    // Tri
    switch (sortBy) {
      case 'title':
        filtered.sort((a, b) => a.title?.localeCompare(b.title || ''));
        break;
      case 'duration':
        filtered.sort((a, b) => (a.duration || 0) - (b.duration || 0));
        break;
      case 'questions':
        filtered.sort((a, b) => (a.questions?.length || 0) - (b.questions?.length || 0));
        break;
      case 'date':
      default:
        filtered.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
        break;
    }
    
    return filtered;
  }, [exams, searchTerm, filterDomain, filterLevel, filterSubject, filterOption, sortBy]);

  useEffect(() => {
    const fetchExams = async () => {
      if (authLoading) return;

      if (!isAuthenticated || !user) {
        console.log('🔐 Non authentifié, redirection vers login');
        toast.error('Veuillez vous connecter');
        navigate('/login');
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const token = localStorage.getItem('userToken');
        console.log('🔍 Token présent:', !!token);
        console.log('🔍 Utilisateur:', user?.email, 'Rôle:', user?.role);

        if (!token) {
          throw new Error('Token non trouvé');
        }

        // ✅ Récupérer les épreuves disponibles
        const response = await api.get('/api/exams/available');

        console.log('📦 Réponse brute:', response);

        let examsData = [];
        if (response?.data?.data && Array.isArray(response.data.data)) {
          examsData = response.data.data;
        } else if (response?.data && Array.isArray(response.data)) {
          examsData = response.data;
        } else if (Array.isArray(response)) {
          examsData = response;
        } else if (response?.success && Array.isArray(response.data)) {
          examsData = response.data;
        }

        // Normaliser les données
        const normalizedExams = examsData.map(exam => ({
          ...exam,
          totalPoints: exam.totalPoints || exam.questions?.reduce((sum, q) => sum + (q.points || 1), 0) || 0,
          questionCount: exam.questions?.length || 0,
          imageUrl: exam.imageQuestion || exam.imageUrl || exam.coverImage || null,
          scheduledDate: exam.scheduledDate || null,
          sessionRoom: exam.sessionRoom || null,
          isCompleted: user.completedExams?.includes(exam._id) || false
        }));

        setExams(normalizedExams);

        if (normalizedExams.length === 0) {
          toast('Aucune épreuve disponible pour le moment', {
            icon: '📭',
            duration: 4000,
          });
        } else {
          toast.success(`${normalizedExams.length} épreuve(s) disponible(s)`);
        }
      } catch (err) {
        console.error('❌ Erreur chargement épreuves:', err);

        let errorMsg = "Erreur lors du chargement des épreuves";

        if (err.response?.status === 401) {
          errorMsg = "Session expirée. Veuillez vous reconnecter.";
          localStorage.removeItem('userToken');
          localStorage.removeItem('userInfo');
          setTimeout(() => navigate('/login'), 1500);
        } else if (err.response?.status === 403) {
          errorMsg = "Accès non autorisé. Vous devez être connecté en tant qu'apprenant.";
          setTimeout(() => navigate('/evaluate'), 2000);
        } else if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
          errorMsg = `Le serveur ne répond pas. Vérifiez votre connexion.`;
        } else if (err.message?.includes('Network Error') || !err.response) {
          errorMsg = `Impossible de joindre le serveur. Vérifiez que le backend est démarré.`;
        } else if (err.message) {
          errorMsg = err.message;
        }

        setError(errorMsg);
        toast.error(errorMsg);
      } finally {
        setLoading(false);
      }
    };

    fetchExams();
  }, [user, isAuthenticated, authLoading, navigate]);

  const startExam = (exam) => {
    // Vérifier si l'épreuve a une date programmée dans le futur
    if (exam.scheduledDate && new Date(exam.scheduledDate) > new Date()) {
      toast.error(`Cette épreuve sera disponible le ${new Date(exam.scheduledDate).toLocaleString()}`);
      return;
    }

    localStorage.setItem('studentInfoForExam', JSON.stringify({
      examId: exam._id,
      info: {
        firstName: user?.name?.split(' ')[0] || user?.firstName || '',
        lastName: user?.name?.split(' ').slice(1).join(' ') || user?.lastName || '',
        matricule: user?.matricule || '',
        level: exam.level || user?.level || '',
        email: user?.email || ''
      },
      examOption: exam.examOption || 'C',
      config: exam.config || {},
      examTitle: exam.title,
      examImage: exam.imageUrl || null,
      scheduledDate: exam.scheduledDate,
      sessionRoom: exam.sessionRoom,
      createdAt: new Date().toISOString()
    }));

    if (exam.examOption === 'B') {
      navigate(`/exam/waiting/${exam._id}`);
    } else {
      navigate(`/exam/compose/${exam._id}`);
    }
  };

  const resetFilters = () => {
    setSearchTerm('');
    setFilterDomain('');
    setFilterLevel('');
    setFilterSubject('');
    setFilterOption('');
    setSortBy('date');
  };

  const hasActiveFilters = searchTerm || filterDomain || filterLevel || filterSubject || filterOption || sortBy !== 'date';

  // Chargement de l'authentification
  if (authLoading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #05071a, #0a0f2e)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          border: '3px solid rgba(59,130,246,0.1)',
          borderTopColor: '#3b82f6',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #05071a 0%, #0a0f2e 60%, #05071a 100%)',
      padding: '24px'
    }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 32, flexWrap: 'wrap' }}>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate('/evaluate')}
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(99,102,241,0.2)',
              borderRadius: 12,
              padding: 12,
              color: '#94a3b8',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}
          >
            <ArrowLeft size={20} />
            <span>Tableau de bord</span>
          </motion.button>
          <div>
            <h1 style={{ fontSize: '2rem', fontWeight: 700, color: '#f8fafc', marginBottom: 8 }}>
              Mes Épreuves disponibles
            </h1>
            <p style={{ color: '#64748b' }}>
              {user?.name || user?.email || 'Étudiant'} — {filteredExams.length} épreuve{filteredExams.length !== 1 ? 's' : ''} disponible{filteredExams.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        {/* Barre de recherche et filtres */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 12 }}>
            <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
              <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Rechercher par titre, matière, domaine..."
                style={{
                  width: '100%', padding: '10px 12px 10px 38px',
                  background: 'rgba(15,23,42,0.7)', border: '1px solid rgba(59,130,246,0.2)',
                  borderRadius: 10, color: '#f8fafc', outline: 'none'
                }}
              />
            </div>
            
            <select
              value={filterDomain}
              onChange={(e) => setFilterDomain(e.target.value)}
              style={{
                padding: '10px 12px', background: '#0f172a',
                border: '1px solid rgba(59,130,246,0.2)', borderRadius: 10,
                color: filterDomain ? '#f8fafc' : '#94a3b8', outline: 'none'
              }}
            >
              <option value="">Tous les domaines</option>
              {domains.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            
            <select
              value={filterLevel}
              onChange={(e) => setFilterLevel(e.target.value)}
              style={{
                padding: '10px 12px', background: '#0f172a',
                border: '1px solid rgba(59,130,246,0.2)', borderRadius: 10,
                color: filterLevel ? '#f8fafc' : '#94a3b8', outline: 'none'
              }}
            >
              <option value="">Tous les niveaux</option>
              {levels.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
            
            <select
              value={filterSubject}
              onChange={(e) => setFilterSubject(e.target.value)}
              style={{
                padding: '10px 12px', background: '#0f172a',
                border: '1px solid rgba(59,130,246,0.2)', borderRadius: 10,
                color: filterSubject ? '#f8fafc' : '#94a3b8', outline: 'none'
              }}
            >
              <option value="">Toutes les matières</option>
              {subjects.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            
            <select
              value={filterOption}
              onChange={(e) => setFilterOption(e.target.value)}
              style={{
                padding: '10px 12px', background: '#0f172a',
                border: '1px solid rgba(59,130,246,0.2)', borderRadius: 10,
                color: filterOption ? '#f8fafc' : '#94a3b8', outline: 'none'
              }}
            >
              <option value="">Toutes les options</option>
              {options.map(o => <option key={o} value={o}>Option {o}</option>)}
            </select>
            
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              style={{
                padding: '10px 12px', background: '#0f172a',
                border: '1px solid rgba(59,130,246,0.2)', borderRadius: 10,
                color: '#f8fafc', outline: 'none'
              }}
            >
              <option value="date">Plus récentes</option>
              <option value="title">Titre (A-Z)</option>
              <option value="duration">Durée (croissant)</option>
              <option value="questions">Nombre de questions</option>
            </select>
            
            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '10px 16px', background: 'rgba(239,68,68,0.1)',
                  border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10,
                  color: '#ef4444', cursor: 'pointer'
                }}
              >
                <X size={14} /> Effacer
              </button>
            )}
          </div>
          
          {/* Résumé des filtres actifs */}
          {hasActiveFilters && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
              {searchTerm && (
                <span style={{
                  padding: '4px 10px', background: 'rgba(59,130,246,0.2)', borderRadius: 20,
                  fontSize: '0.7rem', color: '#60a5fa', display: 'flex', alignItems: 'center', gap: 4
                }}>
                  🔍 {searchTerm}
                </span>
              )}
              {filterDomain && (
                <span style={{
                  padding: '4px 10px', background: 'rgba(59,130,246,0.2)', borderRadius: 20,
                  fontSize: '0.7rem', color: '#60a5fa'
                }}>
                  📚 {filterDomain}
                </span>
              )}
              {filterLevel && (
                <span style={{
                  padding: '4px 10px', background: 'rgba(139,92,246,0.2)', borderRadius: 20,
                  fontSize: '0.7rem', color: '#a78bfa'
                }}>
                  🎓 {filterLevel}
                </span>
              )}
              {filterSubject && (
                <span style={{
                  padding: '4px 10px', background: 'rgba(16,185,129,0.2)', borderRadius: 20,
                  fontSize: '0.7rem', color: '#34d399'
                }}>
                  📖 {filterSubject}
                </span>
              )}
              {filterOption && (
                <span style={{
                  padding: '4px 10px', background: 'rgba(245,158,11,0.2)', borderRadius: 20,
                  fontSize: '0.7rem', color: '#f59e0b'
                }}>
                  Option {filterOption}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Message d'erreur */}
        {error && (
          <div style={{
            background: 'rgba(239,68,68,0.1)',
            border: '1px solid #ef4444',
            borderRadius: 12,
            padding: 16,
            marginBottom: 20,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            color: '#ef4444'
          }}>
            <span>{error}</span>
            <button
              onClick={() => window.location.reload()}
              style={{
                padding: '6px 16px',
                background: 'rgba(239,68,68,0.2)',
                border: 'none',
                borderRadius: 8,
                color: '#ef4444',
                cursor: 'pointer'
              }}
            >
              Réessayer
            </button>
          </div>
        )}

        {/* États */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: 60 }}>
            <div style={{
              width: '40px',
              height: '40px',
              border: '3px solid rgba(59,130,246,0.1)',
              borderTopColor: '#3b82f6',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto'
            }} />
            <p style={{ color: '#64748b', marginTop: 16 }}>Chargement des épreuves...</p>
          </div>
        ) : filteredExams.length === 0 ? (
          <div style={{ 
            textAlign: 'center', 
            padding: 80, 
            color: '#64748b', 
            background: 'rgba(15,23,42,0.5)', 
            borderRadius: 24 
          }}>
            <BookOpen size={64} color="#1e293b" style={{ marginBottom: 16 }} />
            <p style={{ fontSize: '1.1rem', marginBottom: 8 }}>
              {exams.length === 0 ? 'Aucune épreuve disponible' : 'Aucune épreuve ne correspond aux filtres'}
            </p>
            <p style={{ fontSize: '0.85rem' }}>
              {exams.length === 0 
                ? 'Veuillez contacter votre enseignant pour être inscrit à une épreuve.'
                : 'Modifiez vos critères de recherche pour voir plus de résultats.'}
            </p>
            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                style={{
                  marginTop: 20,
                  padding: '8px 20px',
                  background: 'rgba(59,130,246,0.2)',
                  border: '1px solid rgba(59,130,246,0.3)',
                  borderRadius: 8,
                  color: '#60a5fa',
                  cursor: 'pointer'
                }}
              >
                Effacer les filtres
              </button>
            )}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 20 }}>
            <AnimatePresence>
              {filteredExams.map(exam => {
                const optionColor = {
                  A: '#ef4444',
                  B: '#f59e0b',
                  C: '#8b5cf6',
                  D: '#3b82f6'
                }[exam.examOption] || '#10b981';
                
                const isScheduledFuture = exam.scheduledDate && new Date(exam.scheduledDate) > new Date();
                const isCompleted = exam.isCompleted;
                
                return (
                  <motion.div
                    key={exam._id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    whileHover={{ y: -4 }}
                    transition={{ duration: 0.3 }}
                    style={{
                      background: 'rgba(15,23,42,0.7)',
                      border: `1px solid ${optionColor}30`,
                      borderRadius: 20,
                      padding: 24,
                      backdropFilter: 'blur(12px)',
                      transition: 'all 0.3s ease',
                      opacity: isScheduledFuture ? 0.7 : 1
                    }}
                  >
                    {/* Badge option */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                      <h3 style={{ color: '#f8fafc', fontSize: '1.2rem', fontWeight: 600 }}>
                        {exam.title}
                      </h3>
                      <span style={{
                        padding: '4px 12px',
                        borderRadius: 20,
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        background: `${optionColor}20`,
                        color: optionColor,
                        border: `1px solid ${optionColor}40`
                      }}>
                        Option {exam.examOption}
                      </span>
                    </div>

                    {/* Image de l'épreuve si présente */}
                    {exam.imageUrl && (
                      <div style={{ marginBottom: 12 }}>
                        <img 
                          src={exam.imageUrl} 
                          alt={exam.title}
                          style={{ 
                            width: '100%', 
                            maxHeight: 140, 
                            borderRadius: 12, 
                            objectFit: 'cover',
                            background: 'rgba(0,0,0,0.2)'
                          }} 
                        />
                      </div>
                    )}

                    {/* Tags domaine/niveau/matière */}
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                      {exam.domain && (
                        <span style={{
                          fontSize: '0.65rem', padding: '2px 8px',
                          background: 'rgba(59,130,246,0.15)', borderRadius: 4,
                          color: '#60a5fa', display: 'flex', alignItems: 'center', gap: 4
                        }}>
                          <Tag size={10} /> {exam.domain}
                        </span>
                      )}
                      {exam.level && (
                        <span style={{
                          fontSize: '0.65rem', padding: '2px 8px',
                          background: 'rgba(139,92,246,0.15)', borderRadius: 4,
                          color: '#a78bfa', display: 'flex', alignItems: 'center', gap: 4
                        }}>
                          <Layers size={10} /> {exam.level}
                        </span>
                      )}
                      {exam.subject && (
                        <span style={{
                          fontSize: '0.65rem', padding: '2px 8px',
                          background: 'rgba(16,185,129,0.15)', borderRadius: 4,
                          color: '#34d399', display: 'flex', alignItems: 'center', gap: 4
                        }}>
                          <BookOpen size={10} /> {exam.subject}
                        </span>
                      )}
                    </div>

                    {/* Date programmée */}
                    {exam.scheduledDate && (
                      <div style={{
                        marginBottom: 12,
                        padding: '8px 12px',
                        background: isScheduledFuture ? 'rgba(245,158,11,0.15)' : 'rgba(59,130,246,0.1)',
                        borderRadius: 8,
                        fontSize: '0.7rem',
                        color: isScheduledFuture ? '#f59e0b' : '#60a5fa'
                      }}>
                        <Calendar size={12} style={{ display: 'inline', marginRight: 6 }} />
                        {isScheduledFuture ? 'Programmé le: ' : 'Disponible depuis le: '}
                        {new Date(exam.scheduledDate).toLocaleString()}
                        {exam.sessionRoom && ` · Salle: ${exam.sessionRoom}`}
                      </div>
                    )}

                    {/* Description */}
                    <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: 16, lineHeight: 1.5 }}>
                      {exam.description || 'Aucune description disponible'}
                    </p>

                    {/* Métadonnées */}
                    <div style={{ display: 'flex', gap: 16, marginBottom: 20, paddingBottom: 16, borderBottom: '1px solid rgba(255,255,255,0.05)', flexWrap: 'wrap' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#64748b', fontSize: '0.75rem' }}>
                        <Clock size={14} /> {exam.duration || 60} min
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#64748b', fontSize: '0.75rem' }}>
                        <BookOpen size={14} /> {exam.questionCount} questions
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#f59e0b', fontSize: '0.75rem' }}>
                        <Award size={14} /> {exam.totalPoints} pts
                      </span>
                      {exam.config?.requiredQuestions > 0 && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#f59e0b', fontSize: '0.7rem' }}>
                          <Info size={12} /> {exam.config.requiredQuestions} à traiter
                        </span>
                      )}
                    </div>

                    {/* État complété */}
                    {isCompleted && (
                      <div style={{ marginBottom: 12, padding: '6px 10px', background: 'rgba(16,185,129,0.1)', borderRadius: 8, textAlign: 'center' }}>
                        <CheckCircle size={14} style={{ display: 'inline', marginRight: 6, color: '#10b981' }} />
                        <span style={{ fontSize: '0.7rem', color: '#10b981' }}>Déjà complété</span>
                      </div>
                    )}

                    {/* Bouton de démarrage */}
                    <button
                      onClick={() => startExam(exam)}
                      disabled={isScheduledFuture || isCompleted}
                      style={{
                        width: '100%',
                        padding: '12px',
                        background: (isScheduledFuture || isCompleted) 
                          ? 'rgba(100,100,100,0.3)' 
                          : `linear-gradient(135deg, ${optionColor}, ${optionColor}dd)`,
                        border: 'none',
                        borderRadius: 12,
                        color: (isScheduledFuture || isCompleted) ? '#64748b' : 'white',
                        fontWeight: 600,
                        cursor: (isScheduledFuture || isCompleted) ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                        transition: 'transform 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        if (!isScheduledFuture && !isCompleted) {
                          e.currentTarget.style.transform = 'scale(1.02)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'scale(1)';
                      }}
                    >
                      <Play size={16} />
                      {isScheduledFuture ? 'Épreuve à venir' : 
                       isCompleted ? 'Déjà complété' :
                       exam.examOption === 'B' ? 'Rejoindre la salle d\'attente' : 'Commencer l\'épreuve'}
                    </button>

                    {exam.examOption === 'B' && !isScheduledFuture && !isCompleted && (
                      <p style={{ fontSize: '0.65rem', color: '#f59e0b', textAlign: 'center', marginTop: 12 }}>
                        ⏳ Attendez que le superviseur démarre l'épreuve
                      </p>
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
        
        {/* Statistiques */}
        {!loading && exams.length > 0 && filteredExams.length !== exams.length && (
          <div style={{ marginTop: 24, textAlign: 'center', padding: 12, background: 'rgba(59,130,246,0.05)', borderRadius: 12 }}>
            <p style={{ color: '#64748b', fontSize: '0.8rem' }}>
              Affichage de {filteredExams.length} sur {exams.length} épreuve{exams.length !== 1 ? 's' : ''}
            </p>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default MyAvailableExams;