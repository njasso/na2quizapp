// src/pages/admin/QCMValidationPage.jsx - Version avec support de la nouvelle structure QCM
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast, Toaster } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckCircle, XCircle, RefreshCw, AlertCircle, Filter, Search, 
  Eye, ChevronDown, ChevronUp, ArrowLeft, Home, User, Shield, Loader2, LogOut,
  Tag, Layers, BookOpen, Clock, Settings
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ENV_CONFIG from '../../config/env';


const NODE_BACKEND_URL = 
  process.env.REACT_APP_BACKEND_URL ||
  'https://na2quizapp.onrender.com';

// Fonction pour obtenir les en-têtes d'authentification
const getAuthHeaders = () => {
  const token = localStorage.getItem('userToken');
  console.log('🔐 [getAuthHeaders] Token présent:', !!token);
  if (!token) {
    return null;
  }
  return { headers: { Authorization: `Bearer ${token}` } };
};

// Composant de détail de question (avec support nouveau format)
const QuestionDetail = ({ question, onClose }) => {
  if (!question) return null;
  
  // Normaliser les champs pour l'affichage
  const libQuestion = question.libQuestion || question.question || question.text || '';
  const options = question.options || [];
  const correctAnswer = question.correctAnswer || 
    (typeof question.bonOpRep === 'number' && options[question.bonOpRep]) || '';
  const typeQuestion = question.typeQuestion || 1;
  
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
        zIndex: 1000, background: '#0f172a', border: '1px solid rgba(99,102,241,0.3)',
        borderRadius: 20, padding: 24, width: '90%', maxWidth: 600,
        boxShadow: '0 20px 40px rgba(0,0,0,0.5)', maxHeight: '80vh', overflowY: 'auto'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3 style={{ color: '#f8fafc', fontSize: '1.1rem', fontWeight: 600 }}>
          Détails de la question
          {typeQuestion === 2 && <span style={{ color: '#f59e0b', marginLeft: 8, fontSize: '0.7rem' }}>(Multiples réponses)</span>}
        </h3>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}>
          ✕
        </button>
      </div>
      
      {/* Question */}
      <p style={{ color: '#f8fafc', fontSize: '1rem', marginBottom: 16 }}>{libQuestion}</p>
      
      {/* Options */}
      <div style={{ marginBottom: 16 }}>
        <p style={{ color: '#94a3b8', fontSize: '0.8rem', marginBottom: 8 }}>Options :</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
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
                padding: '8px 12px',
                background: isCorrect ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.02)',
                border: `1px solid ${isCorrect ? '#10b981' : 'rgba(99,102,241,0.2)'}`,
                borderRadius: 8,
                display: 'flex',
                alignItems: 'center',
                gap: 8
              }}>
                <span style={{ color: isCorrect ? '#10b981' : '#64748b', fontWeight: 600 }}>
                  {String.fromCharCode(65 + i)}.
                </span>
                <span style={{ color: '#94a3b8' }}>{opt}</span>
                {isCorrect && <CheckCircle size={14} color="#10b981" style={{ marginLeft: 'auto' }} />}
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Métadonnées */}
      <div style={{ marginBottom: 16 }}>
        <p style={{ color: '#94a3b8', fontSize: '0.8rem', marginBottom: 8 }}>Métadonnées :</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, fontSize: '0.75rem' }}>
          <span style={{ color: '#64748b' }}><Tag size={12} style={{ display: 'inline', marginRight: 4 }} /> Domaine :</span>
          <span style={{ color: '#e2e8f0' }}>{question.domaine || '—'}</span>
          
          <span style={{ color: '#64748b' }}><Layers size={12} style={{ display: 'inline', marginRight: 4 }} /> Sous-domaine :</span>
          <span style={{ color: '#e2e8f0' }}>{question.sousDomaine || question.subDomain || '—'}</span>
          
          <span style={{ color: '#64748b' }}><BookOpen size={12} style={{ display: 'inline', marginRight: 4 }} /> Niveau :</span>
          <span style={{ color: '#e2e8f0' }}>{question.niveau || '—'}</span>
          
          <span style={{ color: '#64748b' }}><BookOpen size={12} style={{ display: 'inline', marginRight: 4 }} /> Matière :</span>
          <span style={{ color: '#e2e8f0' }}>{question.matiere || '—'}</span>
          
          <span style={{ color: '#64748b' }}><Clock size={12} style={{ display: 'inline', marginRight: 4 }} /> Temps :</span>
          <span style={{ color: '#f59e0b' }}>{question.tempsMin || 1} min ({question.tempsMinParQuestion || 60}s)</span>
          
          <span style={{ color: '#64748b' }}>Points :</span>
          <span style={{ color: '#f59e0b' }}>{question.points || 1}</span>
        </div>
      </div>
      
      {/* Explication */}
      {question.explanation && (
        <div style={{ padding: 8, background: 'rgba(59,130,246,0.05)', borderRadius: 8 }}>
          <p style={{ color: '#64748b', fontSize: '0.8rem' }}>💡 {question.explanation}</p>
        </div>
      )}
      
      {/* Auteur */}
      <div style={{ marginTop: 12, padding: 8, background: 'rgba(255,255,255,0.02)', borderRadius: 8 }}>
        <p style={{ color: '#64748b', fontSize: '0.7rem' }}>
          Auteur : {question.matriculeAuteur || question.createdBy?.name || 'Inconnu'}
          {question.createdBy?.role && ` (${question.createdBy.role})`}
        </p>
        <p style={{ color: '#475569', fontSize: '0.65rem' }}>
          Créée le : {new Date(question.createdAt).toLocaleString('fr-FR')}
        </p>
      </div>
      
      <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
        <button onClick={onClose} style={{ padding: '6px 12px', background: '#475569', border: 'none', borderRadius: 6, color: '#fff', cursor: 'pointer' }}>
          Fermer
        </button>
      </div>
    </motion.div>
  );
};

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

  // Vérifier l'authentification au chargement
  useEffect(() => {
    const token = localStorage.getItem('userToken');
    const userInfo = localStorage.getItem('userInfo');
    
    console.log('🔐 [QCMValidation] Token présent:', !!token);
    console.log('🔐 [QCMValidation] UserInfo présent:', !!userInfo);
    
    if (!token) {
      console.log('❌ Pas de token, redirection vers login');
      toast.error('Veuillez vous connecter');
      setTimeout(() => navigate('/login'), 1500);
      return;
    }
    
    if (userInfo) {
      try {
        const user = JSON.parse(userInfo);
        setUserRole(user.role);
        setUserName(user.name);
        console.log('🔐 Utilisateur:', user.name, 'Rôle:', user.role);
        
        // Vérifier le rôle
        if (user.role !== 'ADMIN_DELEGUE' && user.role !== 'ADMIN_SYSTEME') {
          toast.error('Accès non autorisé. Rôle ADMIN_DELEGUE requis.');
          setTimeout(() => navigate('/evaluate'), 1500);
          return;
        }
      } catch (e) {
        console.error('Erreur parsing userInfo:', e);
      }
    }
    
    loadPending();
  }, []);

  // Filtrage (avec support des nouveaux champs)
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
    if (filterDomain) {
      filtered = filtered.filter(q => q.domaine === filterDomain);
    }
    if (filterLevel) {
      filtered = filtered.filter(q => q.niveau === filterLevel);
    }
    if (filterMatiere) {
      filtered = filtered.filter(q => q.matiere === filterMatiere);
    }
    setFilteredQuestions(filtered);
  }, [pendingQuestions, search, filterDomain, filterLevel, filterMatiere]);

  const loadPending = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const headers = getAuthHeaders();
      if (!headers) {
        throw new Error('Token non trouvé');
      }
      
      console.log('🔍 Chargement des questions en attente...');
      const response = await axios.get(
        `${NODE_BACKEND_URL}/api/questions/pending`,
        headers
      );
      
      console.log('📦 Réponse reçue:', response.data);
      
      let questions = [];
      if (Array.isArray(response.data)) {
        questions = response.data;
      } else if (response.data?.data && Array.isArray(response.data.data)) {
        questions = response.data.data;
      } else if (response.data?.questions && Array.isArray(response.data.questions)) {
        questions = response.data.questions;
      }
      
      // Normaliser les questions pour l'affichage
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
      console.error('❌ Erreur chargement:', err);
      
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
      const headers = getAuthHeaders();
      if (!headers) {
        throw new Error('Token non trouvé');
      }
      
      await axios.put(
        `${NODE_BACKEND_URL}/api/questions/${qId}/validate`,
        {
          approved,
          comment: comment[qId] || ''
        },
        headers
      );
      toast.success(approved ? "✅ Question approuvée avec succès" : "❌ Question rejetée");
      loadPending();
      setComment(prev => ({ ...prev, [qId]: '' }));
    } catch (err) {
      console.error('Erreur validation:', err);
      if (err.response?.status === 401) {
        toast.error("Session expirée. Veuillez vous reconnecter.");
        localStorage.removeItem('userToken');
        localStorage.removeItem('userInfo');
        setTimeout(() => navigate('/login'), 2000);
      } else {
        toast.error("Erreur lors de la validation");
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

  // Extraire les domaines, niveaux et matières uniques
  const domains = [...new Set(pendingQuestions.map(q => q.domaine).filter(Boolean))];
  const levels = [...new Set(pendingQuestions.map(q => q.niveau).filter(Boolean))];
  const matieres = [...new Set(pendingQuestions.map(q => q.matiere).filter(Boolean))];

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #05071a, #0a0f2e)', padding: 24 }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        {/* En-tête avec bouton retour et info utilisateur */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
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
              <span>Retour</span>
            </motion.button>
            
            <div>
              <h1 style={{ fontSize: '2rem', fontWeight: 700, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: 8 }}>
                <CheckCircle size={28} color="#10b981" />
                Validation des QCM
              </h1>
              <p style={{ color: '#64748b', fontSize: '0.85rem' }}>
                {pendingQuestions.length} question{pendingQuestions.length !== 1 ? 's' : ''} en attente de validation
              </p>
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            {userName && (
              <div style={{
                background: 'rgba(16,185,129,0.1)',
                border: '1px solid rgba(16,185,129,0.3)',
                borderRadius: 20,
                padding: '6px 12px',
                display: 'flex',
                alignItems: 'center',
                gap: 8
              }}>
                <User size={14} color="#10b981" />
                <span style={{ fontSize: '0.7rem', color: '#10b981' }}>
                  {userName} ({userRole})
                </span>
              </div>
            )}
            <button
              onClick={handleLogout}
              style={{
                background: 'rgba(239,68,68,0.1)',
                border: '1px solid rgba(239,68,68,0.3)',
                borderRadius: 10,
                padding: '6px 12px',
                color: '#ef4444',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontSize: '0.7rem'
              }}
            >
              <LogOut size={14} /> Déconnexion
            </button>
          </div>
        </div>

        {/* Barre d'actions */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 16 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, flex: 1 }}>
            <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
              <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
              <input
                type="text"
                placeholder="Rechercher par question, matière, auteur, domaine..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{
                  width: '100%', padding: '10px 12px 10px 38px',
                  background: 'rgba(15,23,42,0.7)', border: '1px solid rgba(59,130,246,0.2)',
                  borderRadius: 10, color: '#f8fafc', outline: 'none'
                }}
              />
            </div>
            
            {domains.length > 0 && (
              <select
                value={filterDomain}
                onChange={e => setFilterDomain(e.target.value)}
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
            
            {levels.length > 0 && (
              <select
                value={filterLevel}
                onChange={e => setFilterLevel(e.target.value)}
                style={{
                  padding: '10px 12px', background: '#0f172a',
                  border: '1px solid rgba(59,130,246,0.2)', borderRadius: 10,
                  color: filterLevel ? '#f8fafc' : '#94a3b8', outline: 'none'
                }}
              >
                <option value="">Tous les niveaux</option>
                {levels.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            )}
            
            {matieres.length > 0 && (
              <select
                value={filterMatiere}
                onChange={e => setFilterMatiere(e.target.value)}
                style={{
                  padding: '10px 12px', background: '#0f172a',
                  border: '1px solid rgba(59,130,246,0.2)', borderRadius: 10,
                  color: filterMatiere ? '#f8fafc' : '#94a3b8', outline: 'none'
                }}
              >
                <option value="">Toutes les matières</option>
                {matieres.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            )}
            
            {(search || filterDomain || filterLevel || filterMatiere) && (
              <button
                onClick={() => { setSearch(''); setFilterDomain(''); setFilterLevel(''); setFilterMatiere(''); }}
                style={{
                  padding: '10px 16px', background: 'rgba(239,68,68,0.1)',
                  border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10,
                  color: '#ef4444', cursor: 'pointer'
                }}
              >
                Effacer filtres
              </button>
            )}
          </div>
          
          <button
            onClick={loadPending}
            disabled={loading}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '10px 20px', background: 'rgba(59,130,246,0.1)',
              border: '1px solid rgba(59,130,246,0.3)', borderRadius: 10,
              color: '#60a5fa', cursor: 'pointer',
              opacity: loading ? 0.5 : 1
            }}
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Actualiser
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
            gap: 12,
            color: '#ef4444'
          }}>
            <AlertCircle size={20} />
            <span style={{ flex: 1 }}>{error}</span>
            <button
              onClick={loadPending}
              style={{
                padding: '6px 16px',
                background: 'rgba(239,68,68,0.2)',
                border: 'none',
                borderRadius: 6,
                color: '#ef4444',
                cursor: 'pointer'
              }}
            >
              Réessayer
            </button>
          </div>
        )}

        {/* Liste des questions */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px' }}>
            <RefreshCw size={48} style={{ animation: 'spin 1s linear infinite', color: '#3b82f6' }} />
            <p style={{ color: '#94a3b8', marginTop: 16 }}>Chargement des questions...</p>
          </div>
        ) : filteredQuestions.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: '60px',
            background: 'rgba(15,23,42,0.5)', borderRadius: 16,
            border: '1px dashed rgba(59,130,246,0.2)'
          }}>
            <CheckCircle size={48} color="#1e293b" style={{ marginBottom: 12 }} />
            <p style={{ color: '#64748b' }}>Aucune question en attente de validation.</p>
            {pendingQuestions.length > 0 && (
              <p style={{ color: '#475569', fontSize: '0.8rem', marginTop: 8 }}>
                {pendingQuestions.length} question(s) disponibles mais filtrée(s)
              </p>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <AnimatePresence>
              {filteredQuestions.map((q, index) => {
                const libQuestion = q.libQuestion || q.question || q.text;
                const typeQuestion = q.typeQuestion || 1;
                const hasMultiple = typeQuestion === 2;
                
                return (
                  <motion.div
                    key={q._id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    style={{
                      background: 'rgba(15,23,42,0.7)',
                      border: `1px solid ${expanded[q._id] ? 'rgba(99,102,241,0.4)' : 'rgba(99,102,241,0.2)'}`,
                      borderRadius: 16,
                      overflow: 'hidden'
                    }}
                  >
                    {/* En-tête de la question */}
                    <div
                      onClick={() => toggleExpand(q._id)}
                      style={{
                        padding: '16px 20px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: 12
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
                          <span style={{
                            background: '#6366f1',
                            color: '#fff',
                            width: 28,
                            height: 28,
                            borderRadius: 8,
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.75rem',
                            fontWeight: 600
                          }}>
                            {index + 1}
                          </span>
                          {q.matiere && (
                            <span style={{
                              background: 'rgba(16,185,129,0.15)',
                              color: '#10b981',
                              padding: '2px 8px',
                              borderRadius: 4,
                              fontSize: '0.7rem',
                              fontWeight: 600,
                              display: 'flex',
                              alignItems: 'center',
                              gap: 4
                            }}>
                              <BookOpen size={10} />
                              {q.matiere}
                            </span>
                          )}
                          {q.niveau && (
                            <span style={{
                              background: 'rgba(59,130,246,0.15)',
                              color: '#60a5fa',
                              padding: '2px 8px',
                              borderRadius: 4,
                              fontSize: '0.7rem',
                              fontWeight: 600,
                              display: 'flex',
                              alignItems: 'center',
                              gap: 4
                            }}>
                              <Layers size={10} />
                              {q.niveau}
                            </span>
                          )}
                          {q.domaine && (
                            <span style={{
                              background: 'rgba(139,92,246,0.15)',
                              color: '#a78bfa',
                              padding: '2px 8px',
                              borderRadius: 4,
                              fontSize: '0.7rem',
                              fontWeight: 600,
                              display: 'flex',
                              alignItems: 'center',
                              gap: 4
                            }}>
                              <Tag size={10} />
                              {q.domaine}
                            </span>
                          )}
                          {hasMultiple && (
                            <span style={{
                              background: 'rgba(245,158,11,0.15)',
                              color: '#f59e0b',
                              padding: '2px 6px',
                              borderRadius: 4,
                              fontSize: '0.65rem',
                              fontWeight: 600
                            }}>
                              Multiple
                            </span>
                          )}
                        </div>
                        <p style={{ color: '#f8fafc', fontSize: '0.95rem', fontWeight: 500 }}>
                          {libQuestion?.length > 100 ? libQuestion.substring(0, 100) + '...' : libQuestion}
                        </p>
                        <div style={{ display: 'flex', gap: 16, marginTop: 8, fontSize: '0.7rem', color: '#64748b' }}>
                          <span>👤 {q.createdBy?.name || q.matriculeAuteur || 'Inconnu'}</span>
                          <span>📅 {new Date(q.createdAt).toLocaleDateString('fr-FR')}</span>
                          <span>⭐ {q.points || 1} pt{(q.points || 1) > 1 ? 's' : ''}</span>
                          <span>⏱️ {q.tempsMin || 1} min</span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <button
                          onClick={(e) => { e.stopPropagation(); setSelectedQuestion(q); }}
                          style={{
                            padding: '6px 10px', background: 'rgba(59,130,246,0.1)',
                            border: '1px solid rgba(59,130,246,0.3)', borderRadius: 6,
                            color: '#3b82f6', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4
                          }}
                        >
                          <Eye size={14} /> Voir
                        </button>
                        {expanded[q._id] ? <ChevronUp size={18} color="#64748b" /> : <ChevronDown size={18} color="#64748b" />}
                      </div>
                    </div>

                    {/* Contenu étendu */}
                    <AnimatePresence>
                      {expanded[q._id] && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          style={{ borderTop: '1px solid rgba(255,255,255,0.05)', overflow: 'hidden' }}
                        >
                          <div style={{ padding: '16px 20px' }}>
                            {/* Options */}
                            <div style={{ marginBottom: 16 }}>
                              <p style={{ color: '#94a3b8', fontSize: '0.75rem', marginBottom: 8, fontWeight: 600 }}>Options :</p>
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 8 }}>
                                {q.options?.map((opt, i) => {
                                  let isCorrect = false;
                                  if (typeof q.bonOpRep === 'number') {
                                    isCorrect = i === q.bonOpRep;
                                  } else if (Array.isArray(q.correctAnswer)) {
                                    isCorrect = q.correctAnswer.includes(opt);
                                  } else {
                                    isCorrect = opt === q.correctAnswer;
                                  }
                                  return (
                                    <div
                                      key={i}
                                      style={{
                                        padding: '6px 10px',
                                        background: isCorrect ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.02)',
                                        border: `1px solid ${isCorrect ? '#10b981' : 'rgba(99,102,241,0.2)'}`,
                                        borderRadius: 6,
                                        fontSize: '0.8rem',
                                        color: isCorrect ? '#10b981' : '#94a3b8'
                                      }}
                                    >
                                      {String.fromCharCode(65 + i)}. {opt}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>

                            {/* Commentaire et validation */}
                            <div>
                              <label style={{ color: '#94a3b8', fontSize: '0.75rem', marginBottom: 4, display: 'block' }}>
                                Commentaire (optionnel) :
                              </label>
                              <textarea
                                placeholder="Ajouter un commentaire pour l'enseignant..."
                                value={comment[q._id] || ''}
                                onChange={e => setComment({ ...comment, [q._id]: e.target.value })}
                                rows={2}
                                style={{
                                  width: '100%', padding: '8px 12px', marginBottom: 12,
                                  background: 'rgba(255,255,255,0.05)',
                                  border: '1px solid rgba(99,102,241,0.2)', borderRadius: 8,
                                  color: '#f8fafc', resize: 'vertical'
                                }}
                              />
                              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                                <button
                                  onClick={() => handleValidate(q._id, true)}
                                  disabled={validating[q._id]}
                                  style={{
                                    display: 'flex', alignItems: 'center', gap: 6,
                                    padding: '8px 20px', background: 'rgba(16,185,129,0.1)',
                                    border: '1px solid #10b981', borderRadius: 8,
                                    color: '#10b981', cursor: 'pointer',
                                    opacity: validating[q._id] ? 0.6 : 1
                                  }}
                                >
                                  {validating[q._id] ? <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <CheckCircle size={14} />}
                                  Approuver
                                </button>
                                <button
                                  onClick={() => handleValidate(q._id, false)}
                                  disabled={validating[q._id]}
                                  style={{
                                    display: 'flex', alignItems: 'center', gap: 6,
                                    padding: '8px 20px', background: 'rgba(239,68,68,0.1)',
                                    border: '1px solid #ef4444', borderRadius: 8,
                                    color: '#ef4444', cursor: 'pointer',
                                    opacity: validating[q._id] ? 0.6 : 1
                                  }}
                                >
                                  {validating[q._id] ? <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <XCircle size={14} />}
                                  Rejeter
                                </button>
                              </div>
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

      {/* Modal de détail */}
      <AnimatePresence>
        {selectedQuestion && (
          <QuestionDetail question={selectedQuestion} onClose={() => setSelectedQuestion(null)} />
        )}
      </AnimatePresence>

      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#1e293b',
            color: '#f8fafc',
            border: '1px solid #3b82f6',
            borderRadius: '10px'
          }
        }}
      />
      
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .animate-spin { animation: spin 1s linear infinite; }
      `}</style>
    </div>
  );
};

export default QCMValidationPage;