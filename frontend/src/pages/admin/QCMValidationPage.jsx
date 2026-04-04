// src/pages/admin/QCMValidationPage.jsx - Version avec aperçu amélioré
import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { toast, Toaster } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckCircle, XCircle, RefreshCw, AlertCircle, Search, 
  Eye, ChevronDown, ChevronUp, ArrowLeft, User, LogOut,
  Tag, Layers, BookOpen, Clock, Loader, Filter, Zap,
  TrendingUp, Users, FileText, Award, Shield, Database,
  Image as ImageIcon, X
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ENV_CONFIG from '../../config/env';

const NODE_BACKEND_URL = ENV_CONFIG.BACKEND_URL;

console.log('[QCMValidationPage] 🚀 Backend URL:', NODE_BACKEND_URL);
console.log('[QCMValidationPage] Environnement:', ENV_CONFIG.isLocalhost ? 'LOCAL' : 'PRODUCTION');

// Fonction pour obtenir l'URL complète de l'image
const getImageUrl = (question) => {
  if (!question) return null;
  
  let imagePath = question.imageQuestion || question.imageBase64 || null;
  if (!imagePath) return null;
  
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath;
  }
  
  if (imagePath.startsWith('data:')) {
    return imagePath;
  }
  
  if (imagePath.startsWith('/uploads/')) {
    return `${NODE_BACKEND_URL}${imagePath}`;
  }
  
  return imagePath;
};

// Composant de détail de question avec aperçu amélioré
const QuestionDetail = ({ question, onClose }) => {
  if (!question) return null;
  
  const libQuestion = question.libQuestion || question.question || question.text || '';
  const options = question.options || [];
  const correctAnswer = question.correctAnswer || 
    (typeof question.bonOpRep === 'number' && options[question.bonOpRep]) || '';
  const typeQuestion = question.typeQuestion || 1;
  const imageUrl = getImageUrl(question);
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '20px'
      }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        style={{
          background: '#0f172a',
          border: '1px solid rgba(99,102,241,0.3)',
          borderRadius: 24,
          width: '100%',
          maxWidth: 750,
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* En-tête fixe */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '20px 24px',
          borderBottom: '1px solid rgba(99,102,241,0.2)',
          background: '#0f172a',
          flexShrink: 0
        }}>
          <div>
            <h3 style={{ color: '#f8fafc', fontSize: '1.2rem', fontWeight: 600, margin: 0 }}>
              Détails de la question
              {typeQuestion === 2 && (
                <span style={{ color: '#f59e0b', marginLeft: 8, fontSize: '0.75rem', fontWeight: 400 }}>
                  (Multiples réponses)
                </span>
              )}
            </h3>
          </div>
          <button 
            onClick={onClose} 
            style={{
              background: 'rgba(255,255,255,0.1)',
              border: 'none',
              borderRadius: 8,
              padding: 8,
              color: '#64748b',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s'
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.2)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
          >
            <X size={20} />
          </button>
        </div>

        {/* Corps défilant */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '24px',
          scrollbarWidth: 'thin',
          scrollbarColor: '#3b82f6 #1e293b'
        }}>
          {/* Image */}
          {imageUrl && (
            <div style={{
              marginBottom: 24,
              textAlign: 'center',
              background: 'rgba(0,0,0,0.2)',
              borderRadius: 12,
              padding: '16px'
            }}>
              <img 
                src={imageUrl} 
                alt="Illustration de la question"
                style={{
                  maxWidth: '100%',
                  maxHeight: 250,
                  width: 'auto',
                  height: 'auto',
                  borderRadius: 8,
                  objectFit: 'contain'
                }}
                onError={(e) => {
                  console.error('[QuestionDetail] Erreur chargement image:', imageUrl);
                  e.target.style.display = 'none';
                }}
              />
            </div>
          )}
          
          {/* Question */}
          <div style={{
            background: 'rgba(99,102,241,0.08)',
            borderRadius: 12,
            padding: '16px',
            marginBottom: 20
          }}>
            <p style={{ color: '#f8fafc', fontSize: '1rem', lineHeight: 1.6, margin: 0 }}>
              {libQuestion}
            </p>
          </div>
          
          {/* Options */}
          <div style={{ marginBottom: 20 }}>
            <p style={{ color: '#94a3b8', fontSize: '0.8rem', marginBottom: 12, fontWeight: 600 }}>
              Options :
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {options.map((opt, i) => {
                let isCorrect = false;
                if (typeof question.bonOpRep === 'number') {
                  isCorrect = i === question.bonOpRep;
                } else if (Array.isArray(question.correctAnswer)) {
                  isCorrect = question.correctAnswer.includes(opt);
                } else {
                  isCorrect = opt === correctAnswer;
                }
                return (
                  <div key={i} style={{
                    padding: '10px 14px',
                    background: isCorrect ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.02)',
                    border: `1px solid ${isCorrect ? '#10b981' : 'rgba(99,102,241,0.2)'}`,
                    borderRadius: 10,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12
                  }}>
                    <span style={{ color: isCorrect ? '#10b981' : '#64748b', fontWeight: 600, minWidth: 30 }}>
                      {String.fromCharCode(65 + i)}.
                    </span>
                    <span style={{ color: '#e2e8f0', flex: 1 }}>{opt}</span>
                    {isCorrect && <CheckCircle size={16} color="#10b981" />}
                  </div>
                );
              })}
            </div>
          </div>
          
          {/* Métadonnées */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: 12,
            marginBottom: 20,
            background: 'rgba(255,255,255,0.02)',
            borderRadius: 12,
            padding: 16
          }}>
            <div>
              <p style={{ color: '#64748b', fontSize: '0.65rem', marginBottom: 4 }}>📚 Domaine</p>
              <p style={{ color: '#e2e8f0', fontSize: '0.8rem' }}>{question.domaine || '—'}</p>
            </div>
            <div>
              <p style={{ color: '#64748b', fontSize: '0.65rem', marginBottom: 4 }}>📖 Sous-domaine</p>
              <p style={{ color: '#e2e8f0', fontSize: '0.8rem' }}>{question.sousDomaine || '—'}</p>
            </div>
            <div>
              <p style={{ color: '#64748b', fontSize: '0.65rem', marginBottom: 4 }}>🎯 Niveau</p>
              <p style={{ color: '#e2e8f0', fontSize: '0.8rem' }}>{question.niveau || '—'}</p>
            </div>
            <div>
              <p style={{ color: '#64748b', fontSize: '0.65rem', marginBottom: 4 }}>📘 Matière</p>
              <p style={{ color: '#e2e8f0', fontSize: '0.8rem' }}>{question.matiere || '—'}</p>
            </div>
            <div>
              <p style={{ color: '#64748b', fontSize: '0.65rem', marginBottom: 4 }}>⭐ Points</p>
              <p style={{ color: '#f59e0b', fontWeight: 600, fontSize: '0.8rem' }}>{question.points || 1} pt{(question.points || 1) > 1 ? 's' : ''}</p>
            </div>
            <div>
              <p style={{ color: '#64748b', fontSize: '0.65rem', marginBottom: 4 }}>⏱️ Temps</p>
              <p style={{ color: '#60a5fa', fontWeight: 600, fontSize: '0.8rem' }}>{question.tempsMin || 1} min</p>
            </div>
          </div>
          
          {/* Explication */}
          {question.explanation && (
            <div style={{
              padding: 12,
              background: 'rgba(59,130,246,0.05)',
              borderRadius: 10,
              marginBottom: 16
            }}>
              <p style={{ color: '#64748b', fontSize: '0.8rem', margin: 0 }}>
                💡 <strong>Explication :</strong> {question.explanation}
              </p>
            </div>
          )}
          
          {/* Auteur */}
          <div style={{
            padding: 12,
            background: 'rgba(255,255,255,0.02)',
            borderRadius: 10,
            marginBottom: 16
          }}>
            <p style={{ color: '#64748b', fontSize: '0.7rem', margin: 0 }}>
              👤 Auteur : {question.matriculeAuteur || question.createdBy?.name || 'Inconnu'}
              {question.createdBy?.role && ` (${question.createdBy.role})`}
            </p>
            <p style={{ color: '#475569', fontSize: '0.65rem', marginTop: 4 }}>
              📅 Créée le : {new Date(question.createdAt).toLocaleString('fr-FR')}
            </p>
          </div>
        </div>

        {/* Pied fixe */}
        <div style={{
          padding: '16px 24px',
          borderTop: '1px solid rgba(99,102,241,0.2)',
          display: 'flex',
          justifyContent: 'flex-end',
          background: '#0f172a',
          flexShrink: 0
        }}>
          <button 
            onClick={onClose} 
            style={{
              padding: '8px 20px',
              background: '#3b82f6',
              border: 'none',
              borderRadius: 8,
              color: '#fff',
              cursor: 'pointer',
              fontWeight: 500,
              transition: 'all 0.2s'
            }}
            onMouseEnter={e => e.currentTarget.style.background = '#2563eb'}
            onMouseLeave={e => e.currentTarget.style.background = '#3b82f6'}
          >
            Fermer
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

// Composant de statistiques
const StatsCard = ({ title, value, icon: Icon, color }) => (
  <div style={{
    background: 'rgba(15,23,42,0.6)',
    border: '1px solid rgba(59,130,246,0.2)',
    borderRadius: 12,
    padding: '16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between'
  }}>
    <div>
      <p style={{ color: '#64748b', fontSize: '0.75rem', marginBottom: 4 }}>{title}</p>
      <p style={{ color: '#f8fafc', fontSize: '1.5rem', fontWeight: 700 }}>{value}</p>
    </div>
    <div style={{ background: `${color}20`, padding: 8, borderRadius: 10 }}>
      <Icon size={24} color={color} />
    </div>
  </div>
);

const QCMValidationPage = () => {
  const navigate = useNavigate();
  const [pendingQuestions, setPendingQuestions] = useState([]);
  const [filteredQuestions, setFilteredQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState({});
  const [search, setSearch] = useState('');
  const [filterDomain, setFilterDomain] = useState('');
  const [filterLevel, setFilterLevel] = useState('');
  const [filterMatiere, setFilterMatiere] = useState('');
  const [expanded, setExpanded] = useState({});
  const [selectedQuestion, setSelectedQuestion] = useState(null);
  const [validating, setValidating] = useState({});
  const [error, setError] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [userName, setUserName] = useState(null);
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('checking');
  const [dbStatus, setDbStatus] = useState(null);

  // Vérifier la connexion au backend
  const checkConnection = useCallback(async () => {
    try {
      console.log('[QCMValidationPage] 🔍 Vérification connexion à', NODE_BACKEND_URL);
      const response = await axios.get(`${NODE_BACKEND_URL}/health`, { timeout: 5000 });
      setConnectionStatus('connected');
      setDbStatus(response.data?.db || 'unknown');
      console.log('[QCMValidationPage] ✅ Connexion OK, DB:', response.data?.db);
      return true;
    } catch (err) {
      console.error('[QCMValidationPage] ❌ Échec connexion:', err.message);
      setConnectionStatus('disconnected');
      toast.error(`Impossible de joindre le serveur ${NODE_BACKEND_URL}`);
      return false;
    }
  }, []);

  // Récupérer les statistiques
  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const token = localStorage.getItem('userToken');
      if (!token) return;
      
      const response = await axios.get(`${NODE_BACKEND_URL}/api/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      let statsData = response.data?.data || response.data;
      setStats(statsData);
    } catch (err) {
      console.error('[Stats] Erreur:', err);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  // Vérifier l'authentification
  useEffect(() => {
    const init = async () => {
      const token = localStorage.getItem('userToken');
      const userInfo = localStorage.getItem('userInfo');
      
      console.log('[QCMValidation] 🔐 Token présent:', !!token);
      console.log('[QCMValidation] Backend URL:', NODE_BACKEND_URL);
      
      if (!token) {
        console.log('[QCMValidation] ❌ Pas de token, redirection vers login');
        toast.error('Veuillez vous connecter');
        setTimeout(() => navigate('/login'), 1500);
        return;
      }
      
      await checkConnection();
      
      if (userInfo) {
        try {
          const user = JSON.parse(userInfo);
          setUserRole(user.role);
          setUserName(user.name);
          console.log('[QCMValidation] 👤 Utilisateur:', user.name, 'Rôle:', user.role);
          
          if (user.role !== 'ADMIN_DELEGUE' && user.role !== 'ADMIN_SYSTEME') {
            toast.error('Accès non autorisé. Rôle ADMIN_DELEGUE requis.');
            setTimeout(() => navigate('/evaluate'), 1500);
            return;
          }
        } catch (e) {
          console.error('[QCMValidation] Erreur parsing userInfo:', e);
        }
      }
      
      await Promise.all([loadPending(), loadStats()]);
    };
    
    init();
  }, [navigate, checkConnection, loadStats]);

  // Filtrage
  useEffect(() => {
    let filtered = [...pendingQuestions];
    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(q => 
        (q.libQuestion || q.question || q.text)?.toLowerCase().includes(searchLower) ||
        q.matiere?.toLowerCase().includes(searchLower) ||
        q.createdBy?.name?.toLowerCase().includes(searchLower) ||
        q.domaine?.toLowerCase().includes(searchLower)
      );
    }
    if (filterDomain) filtered = filtered.filter(q => q.domaine === filterDomain);
    if (filterLevel) filtered = filtered.filter(q => q.niveau === filterLevel);
    if (filterMatiere) filtered = filtered.filter(q => q.matiere === filterMatiere);
    setFilteredQuestions(filtered);
  }, [pendingQuestions, search, filterDomain, filterLevel, filterMatiere]);

  const loadPending = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('userToken');
      if (!token) throw new Error('Token non trouvé');
      
      console.log('[QCMValidation] 🔍 Chargement questions en attente...');
      const response = await axios.get(`${NODE_BACKEND_URL}/api/questions/pending`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      console.log('[QCMValidation] 📦 Réponse reçue:', response.data);
      
      let questions = [];
      if (Array.isArray(response.data)) questions = response.data;
      else if (response.data?.data && Array.isArray(response.data.data)) questions = response.data.data;
      else if (response.data?.questions && Array.isArray(response.data.questions)) questions = response.data.questions;
      
      const normalizedQuestions = questions.map(q => ({
        ...q,
        libQuestion: q.libQuestion || q.question || q.text,
        question: q.libQuestion || q.question || q.text,
        text: q.libQuestion || q.question || q.text,
        domaine: q.domaine || q.domain || '',
        sousDomaine: q.sousDomaine || q.subDomain || '',
        niveau: q.niveau || q.level || '',
        matiere: q.matiere || q.subject || '',
      }));
      
      setPendingQuestions(normalizedQuestions);
      setFilteredQuestions(normalizedQuestions);
      
      if (normalizedQuestions.length === 0) {
        toast.success('Aucune question en attente de validation');
      } else {
        toast.success(`${normalizedQuestions.length} question(s) en attente de validation`);
      }
    } catch (err) {
      console.error('[QCMValidation] ❌ Erreur chargement:', err);
      
      let errorMsg = "Erreur chargement des questions";
      
      if (err.response?.status === 401) {
        errorMsg = "Session expirée. Veuillez vous reconnecter.";
        localStorage.removeItem('userToken');
        localStorage.removeItem('userInfo');
        setTimeout(() => navigate('/login'), 2000);
      } else if (err.response?.status === 403) {
        errorMsg = "Accès non autorisé. Rôle ADMIN_DELEGUE requis.";
      } else if (err.response?.status === 404) {
        errorMsg = "Route introuvable. Vérifiez que le backend est démarré.";
      } else if (err.message?.includes('Network Error')) {
        errorMsg = `Impossible de joindre le serveur à ${NODE_BACKEND_URL}. Vérifiez que le backend est démarré.`;
      }
      
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleValidate = async (qId, approved) => {
    setValidating(prev => ({ ...prev, [qId]: true }));
    try {
      const token = localStorage.getItem('userToken');
      if (!token) throw new Error('Token non trouvé');
      
      let response = null;
      let lastError = null;
      
      const endpoints = [
        `${NODE_BACKEND_URL}/api/questions/${qId}/validate`,
        `${NODE_BACKEND_URL}/api/questions/${qId}/status`,
        `${NODE_BACKEND_URL}/api/admin/questions/${qId}/validate`
      ];
      
      for (const endpoint of endpoints) {
        try {
          console.log(`[Validation] Tentative: ${endpoint}`);
          response = await axios.put(endpoint, {
            approved,
            comment: comment[qId] || '',
            status: approved ? 'approved' : 'rejected'
          }, {
            headers: { Authorization: `Bearer ${token}` }
          });
          console.log(`[Validation] ✅ Succès avec: ${endpoint}`);
          break;
        } catch (err) {
          lastError = err;
          if (err.response?.status !== 404) break;
        }
      }
      
      if (!response && lastError) throw lastError;
      
      toast.success(approved ? "✅ Question approuvée avec succès" : "❌ Question rejetée");
      await Promise.all([loadPending(), loadStats()]);
      setComment(prev => ({ ...prev, [qId]: '' }));
      
    } catch (err) {
      console.error('[Validation] Erreur:', err);
      if (err.response?.status === 401) {
        toast.error("Session expirée. Veuillez vous reconnecter.");
        localStorage.removeItem('userToken');
        localStorage.removeItem('userInfo');
        setTimeout(() => navigate('/login'), 2000);
      } else if (err.response?.status === 404) {
        toast.error("Route de validation non trouvée. Contactez l'administrateur.");
      } else {
        toast.error(`Erreur: ${err.response?.data?.message || err.message}`);
      }
    } finally {
      setValidating(prev => ({ ...prev, [qId]: false }));
    }
  };

  const toggleExpand = (qId) => {
    setExpanded(prev => ({ ...prev, [qId]: !prev[qId] }));
  };

  const handleLogout = () => {
    localStorage.removeItem('userToken');
    localStorage.removeItem('userInfo');
    navigate('/login');
  };

  const domains = [...new Set(pendingQuestions.map(q => q.domaine).filter(Boolean))];
  const levels = [...new Set(pendingQuestions.map(q => q.niveau).filter(Boolean))];
  const matieres = [...new Set(pendingQuestions.map(q => q.matiere).filter(Boolean))];

  // Affichage du statut de connexion
  if (connectionStatus === 'checking') {
    return (
      <div style={styles.loadingContainer}>
        <Loader size={48} style={{ color: '#3b82f6', animation: 'spin 1s linear infinite' }} />
        <p style={{ color: '#94a3b8', marginTop: 16 }}>Vérification de la connexion au serveur...</p>
        <p style={{ color: '#64748b', fontSize: '0.75rem', marginTop: 8 }}>{NODE_BACKEND_URL}</p>
        <Toaster />
      </div>
    );
  }

  if (connectionStatus === 'disconnected') {
    return (
      <div style={styles.errorContainer}>
        <AlertCircle size={48} color="#ef4444" />
        <h2 style={{ color: '#f8fafc', marginTop: 16 }}>Erreur de connexion</h2>
        <p style={{ color: '#94a3b8' }}>Impossible de joindre le serveur à l'adresse :</p>
        <code style={{ background: '#1e293b', padding: '8px 16px', borderRadius: 8, marginTop: 8 }}>{NODE_BACKEND_URL}</code>
        <button onClick={checkConnection} style={styles.retryButton}>
          <RefreshCw size={16} /> Réessayer
        </button>
        <Toaster />
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.bgGrid} />
      <div style={styles.bgGlow} />
      
      <div style={styles.main}>
        {/* En-tête */}
        <div style={styles.header}>
          <div style={styles.headerLeft}>
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => navigate('/evaluate')} style={styles.backButton}>
              <ArrowLeft size={20} />
              <span>Retour</span>
            </motion.button>
            
            <div>
              <h1 style={styles.title}>
                <CheckCircle size={28} color="#10b981" />
                Validation des QCM
              </h1>
              <p style={styles.subtitle}>
                {pendingQuestions.length} question{pendingQuestions.length !== 1 ? 's' : ''} en attente de validation
              </p>
            </div>
          </div>
          
          <div style={styles.headerRight}>
            <div style={styles.dbStatus}>
              <Database size={12} color={dbStatus === 'connected' ? '#10b981' : '#ef4444'} />
              <span style={{ color: dbStatus === 'connected' ? '#10b981' : '#ef4444', fontSize: '0.65rem' }}>
                {dbStatus === 'connected' ? 'MongoDB OK' : 'DB?'}
              </span>
            </div>
            
            {userName && (
              <div style={styles.userBadge}>
                <User size={14} color="#10b981" />
                <span>{userName} ({userRole})</span>
              </div>
            )}
            <button onClick={handleLogout} style={styles.logoutButton}>
              <LogOut size={14} /> Déconnexion
            </button>
          </div>
        </div>

        {/* Statistiques */}
        {stats && (
          <div style={styles.statsGrid}>
            <StatsCard title="Questions totales" value={stats.questions?.total || 0} icon={FileText} color="#3b82f6" />
            <StatsCard title="En attente" value={stats.questions?.pending || 0} icon={Clock} color="#f59e0b" />
            <StatsCard title="Approuvées" value={stats.questions?.approved || 0} icon={CheckCircle} color="#10b981" />
            <StatsCard title="Examens" value={stats.exams || 0} icon={Award} color="#8b5cf6" />
          </div>
        )}

        {/* Barre d'actions */}
        <div style={styles.actionBar}>
          <div style={styles.filters}>
            <div style={styles.searchBox}>
              <Search size={16} style={styles.searchIcon} />
              <input type="text" placeholder="Rechercher..." value={search} onChange={e => setSearch(e.target.value)} style={styles.searchInput} />
            </div>
            
            {domains.length > 0 && (
              <select value={filterDomain} onChange={e => setFilterDomain(e.target.value)} style={styles.select}>
                <option value="">Tous domaines</option>
                {domains.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            )}
            
            {levels.length > 0 && (
              <select value={filterLevel} onChange={e => setFilterLevel(e.target.value)} style={styles.select}>
                <option value="">Tous niveaux</option>
                {levels.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            )}
            
            {matieres.length > 0 && (
              <select value={filterMatiere} onChange={e => setFilterMatiere(e.target.value)} style={styles.select}>
                <option value="">Toutes matières</option>
                {matieres.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            )}
            
            {(search || filterDomain || filterLevel || filterMatiere) && (
              <button onClick={() => { setSearch(''); setFilterDomain(''); setFilterLevel(''); setFilterMatiere(''); }} style={styles.clearButton}>
                Effacer
              </button>
            )}
          </div>
          
          <button onClick={loadPending} disabled={loading} style={styles.refreshButton(loading)}>
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Actualiser
          </button>
        </div>

        {/* Message d'erreur */}
        {error && (
          <div style={styles.errorBox}>
            <AlertCircle size={20} />
            <span style={{ flex: 1 }}>{error}</span>
            <button onClick={loadPending} style={styles.errorRetryButton}>Réessayer</button>
          </div>
        )}

        {/* Liste des questions */}
        {loading ? (
          <div style={styles.loadingBox}>
            <RefreshCw size={48} style={{ animation: 'spin 1s linear infinite', color: '#3b82f6' }} />
            <p style={{ color: '#94a3b8', marginTop: 16 }}>Chargement des questions...</p>
          </div>
        ) : filteredQuestions.length === 0 ? (
          <div style={styles.emptyBox}>
            <CheckCircle size={48} color="#1e293b" />
            <p style={{ color: '#64748b' }}>Aucune question en attente de validation.</p>
            {pendingQuestions.length > 0 && (
              <p style={{ color: '#475569', fontSize: '0.8rem', marginTop: 8 }}>
                {pendingQuestions.length} question(s) disponibles mais filtrée(s)
              </p>
            )}
          </div>
        ) : (
          <div style={styles.questionsList}>
            <AnimatePresence>
              {filteredQuestions.map((q, index) => {
                const libQuestion = q.libQuestion || q.question || q.text;
                const typeQuestion = q.typeQuestion || 1;
                const hasMultiple = typeQuestion === 2;
                const hasImage = !!(q.imageQuestion || q.imageBase64);
                
                return (
                  <motion.div
                    key={q._id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    style={{ ...styles.questionCard, borderColor: expanded[q._id] ? 'rgba(99,102,241,0.4)' : 'rgba(99,102,241,0.2)' }}
                  >
                    <div onClick={() => toggleExpand(q._id)} style={styles.questionHeader}>
                      <div style={styles.questionInfo}>
                        <div style={styles.questionBadges}>
                          <span style={styles.questionNumber}>{index + 1}</span>
                          {q.matiere && <span style={styles.matiereBadge}><BookOpen size={10} /> {q.matiere}</span>}
                          {q.niveau && <span style={styles.niveauBadge}><Layers size={10} /> {q.niveau}</span>}
                          {q.domaine && <span style={styles.domaineBadge}><Tag size={10} /> {q.domaine}</span>}
                          {hasMultiple && <span style={styles.multipleBadge}>Multiple</span>}
                          {hasImage && (
                            <span style={styles.imageBadge}>
                              <ImageIcon size={10} /> Image
                            </span>
                          )}
                        </div>
                        <p style={styles.questionText}>{libQuestion?.length > 100 ? libQuestion.substring(0, 100) + '...' : libQuestion}</p>
                        <div style={styles.questionMeta}>
                          <span>👤 {q.createdBy?.name || q.matriculeAuteur || 'Inconnu'}</span>
                          <span>📅 {new Date(q.createdAt).toLocaleDateString('fr-FR')}</span>
                          <span>⭐ {q.points || 1} pt</span>
                          <span>⏱️ {q.tempsMin || 1} min</span>
                        </div>
                      </div>
                      <div style={styles.questionActions}>
                        <button onClick={(e) => { e.stopPropagation(); setSelectedQuestion(q); }} style={styles.viewButton}>
                          <Eye size={14} /> Voir
                        </button>
                        {expanded[q._id] ? <ChevronUp size={18} color="#64748b" /> : <ChevronDown size={18} color="#64748b" />}
                      </div>
                    </div>

                    <AnimatePresence>
                      {expanded[q._id] && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={styles.expandedContent}>
                          <div style={styles.optionsSection}>
                            <p style={styles.optionsTitle}>Options :</p>
                            <div style={styles.optionsGrid}>
                              {q.options?.map((opt, i) => {
                                let isCorrect = false;
                                if (typeof q.bonOpRep === 'number') isCorrect = i === q.bonOpRep;
                                else if (Array.isArray(q.correctAnswer)) isCorrect = q.correctAnswer.includes(opt);
                                else isCorrect = opt === q.correctAnswer;
                                return (
                                  <div key={i} style={{ ...styles.optionItem, background: isCorrect ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.02)', borderColor: isCorrect ? '#10b981' : 'rgba(99,102,241,0.2)' }}>
                                    {String.fromCharCode(65 + i)}. {opt}
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          <div>
                            <label style={styles.commentLabel}>Commentaire (optionnel) :</label>
                            <textarea placeholder="Ajouter un commentaire pour l'enseignant..." value={comment[q._id] || ''} onChange={e => setComment({ ...comment, [q._id]: e.target.value })} rows={2} style={styles.commentTextarea} />
                            <div style={styles.validationButtons}>
                              <button onClick={() => handleValidate(q._id, true)} disabled={validating[q._id]} style={styles.approveButton(validating[q._id])}>
                                {validating[q._id] ? <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <CheckCircle size={14} />}
                                Approuver
                              </button>
                              <button onClick={() => handleValidate(q._id, false)} disabled={validating[q._id]} style={styles.rejectButton(validating[q._id])}>
                                {validating[q._id] ? <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <XCircle size={14} />}
                                Rejeter
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
      </div>

      <AnimatePresence>
        {selectedQuestion && <QuestionDetail question={selectedQuestion} onClose={() => setSelectedQuestion(null)} />}
      </AnimatePresence>

      <Toaster position="top-right" toastOptions={styles.toastOptions} />
      
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
        .animate-spin { animation: spin 1s linear infinite; }
      `}</style>
    </div>
  );
};

const styles = {
  container: { minHeight: '100vh', background: 'linear-gradient(135deg, #05071a 0%, #0a0f2e 60%, #05071a 100%)', position: 'relative', overflow: 'hidden', padding: 24 },
  bgGrid: { position: 'fixed', inset: 0, backgroundImage: 'linear-gradient(rgba(59,130,246,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,0.03) 1px, transparent 1px)', backgroundSize: '40px 40px', pointerEvents: 'none', zIndex: 0 },
  bgGlow: { position: 'fixed', top: '-15%', left: '50%', transform: 'translateX(-50%)', width: '70vw', height: '50vh', background: 'radial-gradient(ellipse, rgba(37,99,235,0.12) 0%, transparent 70%)', pointerEvents: 'none', zIndex: 0 },
  main: { position: 'relative', zIndex: 1, maxWidth: 1200, margin: '0 auto' },
  loadingContainer: { minHeight: '100vh', background: '#05071a', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' },
  errorContainer: { minHeight: '100vh', background: '#05071a', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 24 },
  retryButton: { marginTop: 24, display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', background: '#3b82f6', border: 'none', borderRadius: 10, color: '#fff', cursor: 'pointer' },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 16 },
  headerLeft: { display: 'flex', alignItems: 'center', gap: 16 },
  headerRight: { display: 'flex', gap: 12, alignItems: 'center' },
  backButton: { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 12, padding: 12, color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 },
  title: { fontSize: '2rem', fontWeight: 700, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: 8 },
  subtitle: { color: '#64748b', fontSize: '0.85rem' },
  dbStatus: { display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(0,0,0,0.3)', padding: '6px 10px', borderRadius: 20 },
  userBadge: { background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 20, padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 8 },
  logoutButton: { background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, padding: '6px 12px', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.7rem' },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 },
  actionBar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 16 },
  filters: { display: 'flex', flexWrap: 'wrap', gap: 12, flex: 1 },
  searchBox: { position: 'relative', flex: 1, minWidth: 200 },
  searchIcon: { position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#64748b' },
  searchInput: { width: '100%', padding: '10px 12px 10px 38px', background: 'rgba(15,23,42,0.7)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 10, color: '#f8fafc', outline: 'none' },
  select: { padding: '10px 12px', background: '#0f172a', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 10, color: '#f8fafc', outline: 'none' },
  clearButton: { padding: '10px 16px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, color: '#ef4444', cursor: 'pointer' },
  refreshButton: (loading) => ({ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 20px', background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.3)', borderRadius: 10, color: '#60a5fa', cursor: 'pointer', opacity: loading ? 0.5 : 1 }),
  errorBox: { background: 'rgba(239,68,68,0.1)', border: '1px solid #ef4444', borderRadius: 12, padding: 16, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12, color: '#ef4444' },
  errorRetryButton: { padding: '6px 16px', background: 'rgba(239,68,68,0.2)', border: 'none', borderRadius: 6, color: '#ef4444', cursor: 'pointer' },
  loadingBox: { textAlign: 'center', padding: 60, background: 'rgba(15,23,42,0.5)', borderRadius: 16 },
  emptyBox: { textAlign: 'center', padding: 60, background: 'rgba(15,23,42,0.5)', borderRadius: 16, border: '1px dashed rgba(59,130,246,0.2)' },
  questionsList: { display: 'flex', flexDirection: 'column', gap: 16 },
  questionCard: { background: 'rgba(15,23,42,0.7)', border: '1px solid', borderRadius: 16, overflow: 'hidden' },
  questionHeader: { padding: '16px 20px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 },
  questionInfo: { flex: 1 },
  questionBadges: { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 },
  questionNumber: { background: '#6366f1', color: '#fff', width: 28, height: 28, borderRadius: 8, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 600 },
  matiereBadge: { background: 'rgba(16,185,129,0.15)', color: '#10b981', padding: '2px 8px', borderRadius: 4, fontSize: '0.7rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 },
  niveauBadge: { background: 'rgba(59,130,246,0.15)', color: '#60a5fa', padding: '2px 8px', borderRadius: 4, fontSize: '0.7rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 },
  domaineBadge: { background: 'rgba(139,92,246,0.15)', color: '#a78bfa', padding: '2px 8px', borderRadius: 4, fontSize: '0.7rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 },
  multipleBadge: { background: 'rgba(245,158,11,0.15)', color: '#f59e0b', padding: '2px 6px', borderRadius: 4, fontSize: '0.65rem', fontWeight: 600 },
  imageBadge: { background: 'rgba(59,130,246,0.15)', color: '#60a5fa', padding: '2px 6px', borderRadius: 4, fontSize: '0.65rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 3 },
  questionText: { color: '#f8fafc', fontSize: '0.95rem', fontWeight: 500 },
  questionMeta: { display: 'flex', gap: 16, marginTop: 8, fontSize: '0.7rem', color: '#64748b' },
  questionActions: { display: 'flex', alignItems: 'center', gap: 8 },
  viewButton: { padding: '6px 10px', background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.3)', borderRadius: 6, color: '#3b82f6', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 },
  expandedContent: { borderTop: '1px solid rgba(255,255,255,0.05)', overflow: 'hidden' },
  optionsSection: { padding: '16px 20px' },
  optionsTitle: { color: '#94a3b8', fontSize: '0.75rem', marginBottom: 8, fontWeight: 600 },
  optionsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 8 },
  optionItem: { padding: '6px 10px', border: '1px solid', borderRadius: 6, fontSize: '0.8rem', color: '#94a3b8' },
  commentLabel: { color: '#94a3b8', fontSize: '0.75rem', marginBottom: 4, display: 'block', padding: '0 20px' },
  commentTextarea: { width: 'calc(100% - 40px)', margin: '0 20px 12px 20px', padding: '8px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 8, color: '#f8fafc', resize: 'vertical' },
  validationButtons: { display: 'flex', gap: 12, justifyContent: 'flex-end', padding: '0 20px 20px 20px' },
  approveButton: (disabled) => ({ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 20px', background: 'rgba(16,185,129,0.1)', border: '1px solid #10b981', borderRadius: 8, color: '#10b981', cursor: 'pointer', opacity: disabled ? 0.6 : 1 }),
  rejectButton: (disabled) => ({ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 20px', background: 'rgba(239,68,68,0.1)', border: '1px solid #ef4444', borderRadius: 8, color: '#ef4444', cursor: 'pointer', opacity: disabled ? 0.6 : 1 }),
  toastOptions: { style: { background: '#1e293b', color: '#f8fafc', border: '1px solid #3b82f6', borderRadius: '10px' } }
};

export default QCMValidationPage;