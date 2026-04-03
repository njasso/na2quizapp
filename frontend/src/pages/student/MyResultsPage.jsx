// src/pages/student/MyResultsPage.jsx - Version complète corrigée
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Award, BookOpen, Calendar, CheckCircle, ChevronDown, ChevronUp,
  Clock, Download, Eye, FileText, Filter, Home, Layers, LogOut,
  Printer, RefreshCw, Search, Tag, Trophy, User, Users, X, XCircle, ArrowLeft
} from 'lucide-react';

import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import toast from 'react-hot-toast';

const MyResultsPage = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterExam, setFilterExam] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterSubject, setFilterSubject] = useState('');
  const [filterDomain, setFilterDomain] = useState('');
  const [sortBy, setSortBy] = useState('date');
  const [expandedResult, setExpandedResult] = useState(null);
  const [stats, setStats] = useState({ total: 0, passed: 0, avgScore: 0, bestScore: 0, worstScore: 0 });

  // Extraire les valeurs uniques pour les filtres
  const examTitles = useMemo(() => [...new Set(results.map(r => r.examTitle).filter(Boolean))], [results]);
  const subjects = useMemo(() => [...new Set(results.map(r => r.matiere || r.subject).filter(Boolean))], [results]);
  const domains = useMemo(() => [...new Set(results.map(r => r.domain).filter(Boolean))], [results]);

  // Filtrer et trier les résultats
  const filteredResults = useMemo(() => {
    let filtered = [...results];
    
    // Recherche textuelle
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(r => 
        r.examTitle?.toLowerCase().includes(term) ||
        `${r.studentInfo?.firstName} ${r.studentInfo?.lastName}`.toLowerCase().includes(term) ||
        r.studentInfo?.matricule?.toLowerCase().includes(term)
      );
    }
    
    // Filtres
    if (filterExam) filtered = filtered.filter(r => r.examTitle === filterExam);
    if (filterStatus === 'passed') filtered = filtered.filter(r => r.passed);
    if (filterStatus === 'failed') filtered = filtered.filter(r => !r.passed);
    if (filterSubject) filtered = filtered.filter(r => (r.matiere || r.subject) === filterSubject);
    if (filterDomain) filtered = filtered.filter(r => r.domain === filterDomain);
    
    // Tri
    switch (sortBy) {
      case 'score-asc':
        filtered.sort((a, b) => (a.percentage || 0) - (b.percentage || 0));
        break;
      case 'score-desc':
        filtered.sort((a, b) => (b.percentage || 0) - (a.percentage || 0));
        break;
      case 'title':
        filtered.sort((a, b) => (a.examTitle || '').localeCompare(b.examTitle || ''));
        break;
      case 'date':
      default:
        filtered.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
        break;
    }
    
    return filtered;
  }, [results, searchTerm, filterExam, filterStatus, filterSubject, filterDomain, sortBy]);

  useEffect(() => {
    const fetchResults = async () => {
      if (authLoading) return;
      
      if (!isAuthenticated || !user) {
        toast.error('Veuillez vous connecter');
        navigate('/login');
        return;
      }
      
      setLoading(true);
      setError(null);
      
      try {
        const token = localStorage.getItem('userToken');
        console.log('🔍 Token présent:', !!token);
        console.log('👤 Utilisateur:', user);
        console.log('📌 Matricule étudiant:', user?.matricule);
        
        if (!token) {
          throw new Error('Token non trouvé');
        }
        
        // ✅ Récupération des résultats
        let response;
        try {
          response = await api.get('/api/results/student');
          console.log('📦 Réponse /api/results/student:', response);
        } catch (err) {
          console.warn('Route /student échouée, tentative route générale');
          response = await api.get('/api/results');
          console.log('📦 Réponse /api/results:', response);
        }
        
        // ✅ Extraction robuste des données
        let data = [];
        
        // Format 1: { success: true, data: [...] }
        if (response?.data && Array.isArray(response.data)) {
          data = response.data;
        }
        // Format 2: { success: true, data: { data: [...] } }
        else if (response?.data?.data && Array.isArray(response.data.data)) {
          data = response.data.data;
        }
        // Format 3: direct array
        else if (Array.isArray(response)) {
          data = response;
        }
        // Format 4: { results: [...] }
        else if (response?.results && Array.isArray(response.results)) {
          data = response.results;
        }
        // Format 5: chercher n'importe quel tableau
        else if (response && typeof response === 'object') {
          for (const key of ['data', 'results', 'items', 'studentResults', 'docs']) {
            if (response[key] && Array.isArray(response[key])) {
              data = response[key];
              break;
            }
          }
        }
        
        console.log('📊 Données brutes extraites:', data.length);
        
        // ✅ Filtrer par matricule si nécessaire (fallback)
        let filteredData = data;
        if (user?.matricule && data.length > 0) {
          const beforeFilter = filteredData.length;
          filteredData = data.filter(r => 
            r.studentInfo?.matricule === user.matricule ||
            r.studentInfo?.matricule?.toUpperCase() === user.matricule?.toUpperCase()
          );
          console.log(`📊 Filtrage par matricule: ${beforeFilter} → ${filteredData.length}`);
        }
        
        // ✅ Normaliser les résultats
        const normalizedResults = filteredData.map(r => ({
          _id: r._id,
          examId: r.examId,
          examTitle: r.examTitle || r.examId?.title || 'Épreuve sans titre',
          studentInfo: r.studentInfo || {
            firstName: user?.name?.split(' ')[1] || '',
            lastName: user?.name?.split(' ')[0] || '',
            matricule: user?.matricule || ''
          },
          score: r.score || 0,
          percentage: r.percentage || 0,
          passed: r.passed || false,
          totalQuestions: r.totalQuestions || r.examQuestions?.length || 0,
          createdAt: r.createdAt,
          domain: r.domain || r.examId?.domain || '',
          subject: r.matiere || r.subject || r.examId?.subject || '',
          level: r.level || r.examId?.level || '',
          examOption: r.examOption || '',
          examQuestions: r.examQuestions || [],
          answers: r.answers || {},
          note20: ((r.percentage || 0) / 100 * 20).toFixed(2),
          dateFormatted: r.createdAt ? new Date(r.createdAt).toLocaleDateString('fr-FR', { 
            day: '2-digit', 
            month: 'long', 
            year: 'numeric' 
          }) : 'Date inconnue'
        }));
        
        console.log('✅ Résultats normalisés:', normalizedResults.length);
        if (normalizedResults.length > 0) {
          console.log('📝 Premier résultat:', normalizedResults[0]);
        }
        
        setResults(normalizedResults);
        
        // ✅ Calculer les statistiques
        const passed = normalizedResults.filter(r => r.passed).length;
        const scores = normalizedResults.map(r => r.percentage || 0);
        const avgScore = normalizedResults.length > 0 
          ? scores.reduce((a, b) => a + b, 0) / normalizedResults.length 
          : 0;
        const bestScore = normalizedResults.length > 0 ? Math.max(...scores) : 0;
        const worstScore = normalizedResults.length > 0 ? Math.min(...scores) : 0;
        
        setStats({
          total: normalizedResults.length,
          passed,
          avgScore: avgScore.toFixed(1),
          bestScore,
          worstScore
        });
        
        if (normalizedResults.length === 0) {
          toast('Aucun résultat trouvé pour votre compte', { icon: 'ℹ️' });
        } else {
          toast.success(`${normalizedResults.length} résultat(s) trouvé(s)`);
        }
        
      } catch (error) {
        console.error('❌ Erreur chargement résultats:', error);
        
        let errorMsg = "Erreur chargement des résultats";
        if (error.response?.status === 401) {
          errorMsg = "Session expirée. Veuillez vous reconnecter.";
          localStorage.removeItem('userToken');
          localStorage.removeItem('userInfo');
          setTimeout(() => navigate('/login'), 2000);
        } else if (error.response?.status === 403) {
          errorMsg = "Accès non autorisé. Rôle APPRENANT requis.";
        } else if (error.message?.includes('Network Error')) {
          errorMsg = `Impossible de joindre le serveur à ${api.defaults.baseURL}`;
        } else if (error.message) {
          errorMsg = error.message;
        }
        
        setError(errorMsg);
        toast.error(errorMsg);
      } finally {
        setLoading(false);
      }
    };
    
    fetchResults();
  }, [user, isAuthenticated, authLoading, navigate]);

  const viewBulletin = (resultId) => {
    window.open(`${api.defaults.baseURL}/api/bulletin/${resultId}`, '_blank');
  };

  const getMention = (percentage) => {
    if (percentage >= 90) return { label: 'Très Bien', color: '#10b981', icon: '🏆', description: 'Excellent travail !' };
    if (percentage >= 75) return { label: 'Bien', color: '#3b82f6', icon: '⭐', description: 'Très bonne maîtrise' };
    if (percentage >= 60) return { label: 'Assez Bien', color: '#8b5cf6', icon: '👍', description: 'Bonnes connaissances' };
    if (percentage >= 50) return { label: 'Passable', color: '#f59e0b', icon: '👌', description: 'Acquis à renforcer' };
    return { label: 'Insuffisant', color: '#ef4444', icon: '📚', description: 'Des efforts nécessaires' };
  };

  const resetFilters = () => {
    setSearchTerm('');
    setFilterExam('');
    setFilterStatus('');
    setFilterSubject('');
    setFilterDomain('');
    setSortBy('date');
  };

  const hasActiveFilters = searchTerm || filterExam || filterStatus || filterSubject || filterDomain || sortBy !== 'date';

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
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
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
              Mes Résultats
            </h1>
            <p style={{ color: '#64748b' }}>
              {user?.name || 'Étudiant'} · {filteredResults.length} résultat{filteredResults.length !== 1 ? 's' : ''} trouvé{filteredResults.length !== 1 ? 's' : ''}
            </p>
          </div>
          <button
            onClick={() => window.location.reload()}
            style={{
              marginLeft: 'auto',
              padding: '10px 16px',
              background: 'rgba(59,130,246,0.1)',
              border: '1px solid rgba(59,130,246,0.2)',
              borderRadius: 10,
              color: '#60a5fa',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}
          >
            <RefreshCw size={16} /> Actualiser
          </button>
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

        {/* KPIs - seulement si des résultats existent */}
        {results.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 16, marginBottom: 24 }}>
            <div style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 16, padding: 16 }}>
              <div style={{ color: '#3b82f6', fontSize: '1.8rem', fontWeight: 700 }}>{stats.total}</div>
              <div style={{ color: '#94a3b8', fontSize: '0.75rem' }}>Épreuves complétées</div>
            </div>
            <div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 16, padding: 16 }}>
              <div style={{ color: '#10b981', fontSize: '1.8rem', fontWeight: 700 }}>{stats.passed}</div>
              <div style={{ color: '#94a3b8', fontSize: '0.75rem' }}>Épreuves réussies</div>
            </div>
            <div style={{ background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.2)', borderRadius: 16, padding: 16 }}>
              <div style={{ color: '#8b5cf6', fontSize: '1.8rem', fontWeight: 700 }}>{stats.avgScore}%</div>
              <div style={{ color: '#94a3b8', fontSize: '0.75rem' }}>Moyenne générale</div>
            </div>
            <div style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 16, padding: 16 }}>
              <div style={{ color: '#f59e0b', fontSize: '1.8rem', fontWeight: 700 }}>{stats.bestScore}%</div>
              <div style={{ color: '#94a3b8', fontSize: '0.75rem' }}>Meilleur score</div>
            </div>
            <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 16, padding: 16 }}>
              <div style={{ color: '#ef4444', fontSize: '1.8rem', fontWeight: 700 }}>{stats.worstScore}%</div>
              <div style={{ color: '#94a3b8', fontSize: '0.75rem' }}>Score minimum</div>
            </div>
          </div>
        )}

        {/* Barre de recherche et filtres - seulement si des résultats existent */}
        {results.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 12 }}>
              <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
                <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Rechercher par épreuve, nom, matricule..."
                  style={{
                    width: '100%', padding: '10px 12px 10px 38px',
                    background: 'rgba(15,23,42,0.7)', border: '1px solid rgba(59,130,246,0.2)',
                    borderRadius: 10, color: '#f8fafc', outline: 'none'
                  }}
                />
              </div>
              
              {examTitles.length > 0 && (
                <select
                  value={filterExam}
                  onChange={(e) => setFilterExam(e.target.value)}
                  style={{
                    padding: '10px 12px', background: '#0f172a',
                    border: '1px solid rgba(59,130,246,0.2)', borderRadius: 10,
                    color: filterExam ? '#f8fafc' : '#94a3b8', outline: 'none',
                    maxWidth: 200
                  }}
                >
                  <option value="">Toutes les épreuves</option>
                  {examTitles.map(e => <option key={e} value={e}>{e}</option>)}
                </select>
              )}
              
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                style={{
                  padding: '10px 12px', background: '#0f172a',
                  border: '1px solid rgba(59,130,246,0.2)', borderRadius: 10,
                  color: filterStatus ? '#f8fafc' : '#94a3b8', outline: 'none'
                }}
              >
                <option value="">Tous les statuts</option>
                <option value="passed">✓ Réussis</option>
                <option value="failed">✗ Échoués</option>
              </select>
              
              {subjects.length > 0 && (
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
              )}
              
              {domains.length > 0 && (
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
              )}
              
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                style={{
                  padding: '10px 12px', background: '#0f172a',
                  border: '1px solid rgba(59,130,246,0.2)', borderRadius: 10,
                  color: '#f8fafc', outline: 'none'
                }}
              >
                <option value="date">Plus récents</option>
                <option value="score-desc">Score (décroissant)</option>
                <option value="score-asc">Score (croissant)</option>
                <option value="title">Titre (A-Z)</option>
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
          </div>
        )}

        {/* Loading */}
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
            <p style={{ color: '#64748b', marginTop: 16 }}>Chargement de vos résultats...</p>
          </div>
        ) : filteredResults.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 80, color: '#64748b', background: 'rgba(15,23,42,0.5)', borderRadius: 24 }}>
            {results.length === 0 ? (
              <>
                <Award size={64} color="#1e293b" style={{ marginBottom: 16 }} />
                <p style={{ fontSize: '1.1rem', marginBottom: 8 }}>Aucun résultat enregistré</p>
                <p style={{ fontSize: '0.85rem' }}>
                  Vous n'avez pas encore participé à une épreuve.
                </p>
                <button
                  onClick={() => navigate('/evaluate')}
                  style={{
                    marginTop: 20,
                    padding: '10px 24px',
                    background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                    border: 'none',
                    borderRadius: 10,
                    color: 'white',
                    cursor: 'pointer',
                    fontWeight: 600
                  }}
                >
                  Commencer une épreuve
                </button>
              </>
            ) : (
              <>
                <Filter size={48} color="#1e293b" style={{ marginBottom: 16 }} />
                <p style={{ fontSize: '1.1rem', marginBottom: 8 }}>Aucun résultat ne correspond aux filtres</p>
                <p style={{ fontSize: '0.85rem' }}>Modifiez vos critères de recherche pour voir plus de résultats.</p>
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
              </>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <AnimatePresence>
              {filteredResults.map((result, index) => {
                const mention = getMention(result.percentage);
                const note20Value = result.note20 || ((result.percentage / 100) * 20).toFixed(2);
                const isExpanded = expandedResult === result._id;
                
                return (
                  <motion.div
                    key={result._id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ delay: index * 0.05 }}
                    style={{
                      background: 'rgba(15,23,42,0.7)',
                      border: `1px solid ${mention.color}30`,
                      borderRadius: 16,
                      overflow: 'hidden',
                      backdropFilter: 'blur(12px)'
                    }}
                  >
                    {/* En-tête avec mention et score */}
                    <div 
                      style={{ 
                        padding: 24, 
                        cursor: 'pointer',
                        transition: 'background 0.2s'
                      }}
                      onClick={() => setExpandedResult(isExpanded ? null : result._id)}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
                            <span style={{ fontSize: '2rem' }}>{mention.icon}</span>
                            <div>
                              <h3 style={{ color: '#f8fafc', fontSize: '1.2rem', fontWeight: 600 }}>
                                {result.examTitle}
                              </h3>
                              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 4 }}>
                                <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#64748b', fontSize: '0.75rem' }}>
                                  <Calendar size={12} /> {result.dateFormatted}
                                </span>
                                {result.subject && (
                                  <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#64748b', fontSize: '0.75rem' }}>
                                    <FileText size={12} /> {result.subject}
                                  </span>
                                )}
                                {result.examOption && (
                                  <span style={{
                                    padding: '2px 8px',
                                    borderRadius: 12,
                                    fontSize: '0.65rem',
                                    background: 'rgba(59,130,246,0.1)',
                                    color: '#60a5fa'
                                  }}>
                                    Option {result.examOption}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          {/* Tags domaine/niveau */}
                          {(result.domain || result.level) && (
                            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                              {result.domain && (
                                <span style={{ fontSize: '0.6rem', padding: '2px 6px', background: 'rgba(59,130,246,0.15)', borderRadius: 4, color: '#60a5fa' }}>
                                  <Tag size={8} style={{ display: 'inline', marginRight: 2 }} />
                                  {result.domain}
                                </span>
                              )}
                              {result.level && (
                                <span style={{ fontSize: '0.6rem', padding: '2px 6px', background: 'rgba(139,92,246,0.15)', borderRadius: 4, color: '#a78bfa' }}>
                                  <Layers size={8} style={{ display: 'inline', marginRight: 2 }} />
                                  {result.level}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                        
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '2rem', fontWeight: 700, color: mention.color, lineHeight: 1 }}>
                            {result.percentage}%
                          </div>
                          <div style={{ fontSize: '0.8rem', color: mention.color, marginBottom: 4 }}>
                            {mention.label}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#8b5cf6' }}>
                            {note20Value}/20
                          </div>
                          <div style={{ marginTop: 8 }}>
                            {isExpanded ? <ChevronUp size={16} color="#64748b" /> : <ChevronDown size={16} color="#64748b" />}
                          </div>
                        </div>
                      </div>

                      {/* Statistiques rapides */}
                      <div style={{ 
                        display: 'flex', 
                        gap: 16, 
                        paddingTop: 12, 
                        borderTop: '1px solid rgba(255,255,255,0.05)',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap'
                      }}>
                        <div style={{ display: 'flex', gap: 16 }}>
                          <div>
                            <div style={{ color: '#64748b', fontSize: '0.65rem' }}>Score</div>
                            <div style={{ color: '#f8fafc', fontWeight: 600 }}>{result.score} / {result.totalQuestions}</div>
                          </div>
                          <div>
                            <div style={{ color: '#64748b', fontSize: '0.65rem' }}>Questions</div>
                            <div style={{ color: '#f8fafc', fontWeight: 600 }}>{result.totalQuestions}</div>
                          </div>
                        </div>
                        <div>
                          <div style={{ color: '#64748b', fontSize: '0.65rem' }}>Mention</div>
                          <div style={{ color: mention.color, fontWeight: 600 }}>{mention.label}</div>
                        </div>
                      </div>
                    </div>

                    {/* Contenu étendu */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          style={{ borderTop: '1px solid rgba(255,255,255,0.05)', overflow: 'hidden' }}
                        >
                          <div style={{ padding: '20px 24px' }}>
                            {/* Détails des questions */}
                            {result.examQuestions && result.examQuestions.length > 0 && (
                              <div style={{ marginBottom: 20 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                                  <FileText size={14} color="#8b5cf6" />
                                  <h4 style={{ color: '#f8fafc', fontSize: '0.9rem', fontWeight: 600 }}>Détail des réponses</h4>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 300, overflowY: 'auto' }}>
                                  {result.examQuestions.slice(0, 5).map((q, idx) => {
                                    // Vérifier si la réponse est correcte
                                    const qId = q._id?.toString();
                                    const studentAnswer = qId && result.answers ? result.answers[qId] : null;
                                    let isCorrect = false;
                                    
                                    if (studentAnswer && q.bonOpRep !== undefined) {
                                      const selectedIndex = q.options?.findIndex(opt => opt === studentAnswer);
                                      isCorrect = selectedIndex === q.bonOpRep;
                                    } else if (studentAnswer && q.correctAnswer) {
                                      isCorrect = studentAnswer === q.correctAnswer;
                                    }
                                    
                                    return (
                                      <div key={idx} style={{
                                        padding: '8px 12px',
                                        background: isCorrect ? 'rgba(16,185,129,0.05)' : 'rgba(239,68,68,0.05)',
                                        border: `1px solid ${isCorrect ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`,
                                        borderRadius: 8
                                      }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                          {isCorrect ? 
                                            <CheckCircle size={12} color="#10b981" /> : 
                                            <XCircle size={12} color="#ef4444" />
                                          }
                                          <span style={{ color: '#e2e8f0', fontSize: '0.8rem' }}>
                                            Q{idx + 1}. {q.libQuestion || q.questionText || 'Question sans texte'}
                                          </span>
                                        </div>
                                        <div style={{ marginLeft: 20, marginTop: 4, fontSize: '0.7rem' }}>
                                          <span style={{ color: '#64748b' }}>Votre réponse: </span>
                                          <span style={{ color: isCorrect ? '#10b981' : '#ef4444', fontWeight: 600 }}>{studentAnswer || 'Non répondu'}</span>
                                          {!isCorrect && (
                                            <><span style={{ color: '#64748b' }}> | Bonne réponse: </span>
                                            <span style={{ color: '#10b981', fontWeight: 600 }}>
                                              {q.options?.[q.bonOpRep] || q.correctAnswer || '—'}
                                            </span></>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                                  {result.examQuestions.length > 5 && (
                                    <p style={{ color: '#64748b', fontSize: '0.7rem', textAlign: 'center', marginTop: 4 }}>
                                      +{result.examQuestions.length - 5} autres questions
                                    </p>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Actions */}
                            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                              <button
                                onClick={() => viewBulletin(result._id)}
                                style={{
                                  padding: '8px 20px',
                                  background: 'rgba(59,130,246,0.1)',
                                  border: '1px solid rgba(59,130,246,0.3)',
                                  borderRadius: 8,
                                  color: '#60a5fa',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 8,
                                  fontSize: '0.85rem'
                                }}
                              >
                                <Eye size={14} /> Voir le bulletin détaillé
                              </button>
                              <button
                                onClick={() => window.open(`${api.defaults.baseURL}/api/bulletin/${result._id}`, '_blank')}
                                style={{
                                  padding: '8px 20px',
                                  background: 'rgba(16,185,129,0.1)',
                                  border: '1px solid rgba(16,185,129,0.3)',
                                  borderRadius: 8,
                                  color: '#10b981',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 8,
                                  fontSize: '0.85rem'
                                }}
                              >
                                <Download size={14} /> Télécharger PDF
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
        
        {/* Statistiques avancées */}
        {!loading && results.length > 0 && filteredResults.length !== results.length && (
          <div style={{ marginTop: 24, textAlign: 'center', padding: 12, background: 'rgba(59,130,246,0.05)', borderRadius: 12 }}>
            <p style={{ color: '#64748b', fontSize: '0.8rem' }}>
              Affichage de {filteredResults.length} sur {results.length} résultat{results.length !== 1 ? 's' : ''}
            </p>
          </div>
        )}
      </div>
      
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        ::-webkit-scrollbar {
          width: 6px;
        }
        ::-webkit-scrollbar-track {
          background: rgba(15,23,42,0.3);
          border-radius: 10px;
        }
        ::-webkit-scrollbar-thumb {
          background: rgba(99,102,241,0.3);
          border-radius: 10px;
        }
      `}</style>
    </div>
  );
};

export default MyResultsPage;