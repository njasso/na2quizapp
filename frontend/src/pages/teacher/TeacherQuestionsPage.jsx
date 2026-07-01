// src/pages/teacher/TeacherQuestionsPage.jsx - Version AVEC FILTRES DOMAINE, MATIÈRE & CHAPITRE
// ✅ CORRECTIONS :
//   - Normalisation des chapitres pour les filtres
//   - Dédoublonnage des chapitres dans la liste déroulante
//   - Filtrage par chapitre insensible aux variations (ponctuation, casse)

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileText, ArrowLeft, RefreshCw, Search, Eye, Edit, Trash2,
  CheckCircle, XCircle, Clock, PlusCircle,
  AlertCircle, Filter, Bell, BellOff, Image as ImageIcon, XCircle as XCircleIcon,
  BookOpen
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import io from 'socket.io-client';
import ENV_CONFIG from '../../config/env';
import toast from 'react-hot-toast';
import { getAllDomaines } from '../../data/domainConfig';

const BACKEND_URL = ENV_CONFIG.BACKEND_URL;

// ── Normalisation des chapitres ──────────────────────────────
const normalizeChapterStr = (s) =>
  (s || '')
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[.;:,!?]+$/, '')
    .trim()
    .toUpperCase();

const TeacherQuestionsPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  
  // États
  const [questions, setQuestions] = useState([]);
  const [filteredQuestions, setFilteredQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterDomaine, setFilterDomaine] = useState('');
  const [filterMatiere, setFilterMatiere] = useState('');
  const [filterChapitre, setFilterChapitre] = useState('');
  const [selectedQuestion, setSelectedQuestion] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [socket, setSocket] = useState(null);
  const [isSocketConnected, setIsSocketConnected] = useState(false);
  
  // Déterminer le rôle
  const isSaisisseur = user?.role === 'SAISISEUR';
  const isEnseignant = user?.role === 'ENSEIGNANT';
  
  // Liste des domaines
  const domaines = getAllDomaines();
  
  // Calculer les matières disponibles en fonction du domaine sélectionné
  const availableMatieres = useMemo(() => {
    let filteredQuestionsForMatieres = [...questions];
    
    if (filterDomaine) {
      filteredQuestionsForMatieres = filteredQuestionsForMatieres.filter(q => 
        q.domaine === filterDomaine || q.domaineId === filterDomaine
      );
    }
    
    const uniqueMatieres = [...new Set(filteredQuestionsForMatieres.map(q => q.matiere).filter(Boolean))];
    return uniqueMatieres.map(m => ({ id: m, nom: m }));
  }, [questions, filterDomaine]);
  
  // ✅ Calculer les chapitres disponibles avec normalisation et dédoublonnage
  const availableChapitres = useMemo(() => {
    let filteredQuestionsForChapitres = [...questions];
    
    if (filterDomaine) {
      filteredQuestionsForChapitres = filteredQuestionsForChapitres.filter(q => 
        q.domaine === filterDomaine || q.domaineId === filterDomaine
      );
    }
    
    if (filterMatiere) {
      filteredQuestionsForChapitres = filteredQuestionsForChapitres.filter(q => 
        q.matiere === filterMatiere || q.matiereId === filterMatiere
      );
    }
    
    // ✅ Normaliser et dédoublonner les chapitres
    const chapitreMap = new Map();
    filteredQuestionsForChapitres.forEach(q => {
      if (!q.libChapitre) return;
      const normalized = normalizeChapterStr(q.libChapitre);
      if (!chapitreMap.has(normalized)) {
        chapitreMap.set(normalized, q.libChapitre);
      } else {
        // Garder la version la plus propre (la plus courte)
        const existing = chapitreMap.get(normalized);
        if (q.libChapitre.length < existing.length) {
          chapitreMap.set(normalized, q.libChapitre);
        }
      }
    });
    
    return Array.from(chapitreMap.values()).sort((a, b) => 
      normalizeChapterStr(a).localeCompare(normalizeChapterStr(b))
    );
  }, [questions, filterDomaine, filterMatiere]);
  
  // Réinitialiser les filtres dépendants quand le domaine ou la matière change
  useEffect(() => {
    setFilterMatiere('');
    setFilterChapitre('');
  }, [filterDomaine]);
  
  useEffect(() => {
    setFilterChapitre('');
  }, [filterMatiere]);
  
  // Forcer le rechargement après édition
  useEffect(() => {
    const shouldRefresh = sessionStorage.getItem('refreshQuestions');
    if (shouldRefresh) {
      sessionStorage.removeItem('refreshQuestions');
      console.log('[TeacherQuestionsPage] 🔄 Rechargement forcé après édition');
      fetchMyQuestions();
      return;
    }
    
    if (location.state?.refreshed) {
      console.log('[TeacherQuestionsPage] 🔄 Rechargement depuis state');
      fetchMyQuestions();
      navigate(location.pathname, { replace: true, state: {} });
      return;
    }
    
    const forceRefresh = localStorage.getItem('forceRefreshQuestions');
    if (forceRefresh) {
      localStorage.removeItem('forceRefreshQuestions');
      console.log('[TeacherQuestionsPage] 🔄 Rechargement depuis localStorage');
      fetchMyQuestions();
      return;
    }
  }, [location]);
  
  // Connexion Socket.IO
  useEffect(() => {
    if (!user?._id) return;
    
    const newSocket = io(ENV_CONFIG.SOCKET_URL, {
      transports: ['polling', 'websocket'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });
    
    newSocket.on('connect', () => {
      console.log('[TeacherQuestions] Socket connecté');
      setIsSocketConnected(true);
      newSocket.emit('registerSession', { 
        type: isSaisisseur ? 'saisisseur' : 'teacher', 
        userId: user._id,
        userName: user.name,
        role: user.role
      });
    });
    
    newSocket.on('disconnect', () => {
      console.log('[TeacherQuestions] Socket déconnecté');
      setIsSocketConnected(false);
    });
    
    newSocket.on('connect_error', (error) => {
      console.error('[TeacherQuestions] Socket error:', error);
      setIsSocketConnected(false);
    });
    
    newSocket.on('questionStatusChanged', (data) => {
      console.log('[TeacherQuestions] Notification reçue:', data);
      
      const newNotification = {
        id: Date.now(),
        ...data,
        read: false,
        timestamp: new Date()
      };
      setNotifications(prev => [newNotification, ...prev].slice(0, 50));
      
      if (data.status === 'rejected') {
        toast.error(`❌ Question rejetée : ${data.questionText?.substring(0, 50)}...`);
        if (data.comment) toast.error(`Motif : ${data.comment}`);
      } else if (data.status === 'approved') {
        toast.success(`✅ Question approuvée : ${data.questionText?.substring(0, 50)}...`);
      }
      
      fetchMyQuestions();
    });
    
    newSocket.on('questionCommented', (data) => {
      console.log('[TeacherQuestions] Commentaire reçu:', data);
      const newNotification = {
        id: Date.now(),
        ...data,
        read: false,
        timestamp: new Date()
      };
      setNotifications(prev => [newNotification, ...prev].slice(0, 50));
      toast.info(`💬 Nouveau commentaire: ${data.comment?.substring(0, 80)}`);
      fetchMyQuestions();
    });
    
    setSocket(newSocket);
    
    return () => {
      if (newSocket) newSocket.disconnect();
    };
  }, [user?._id, isSaisisseur]);
  
  // Chargement initial des questions
  useEffect(() => {
    fetchMyQuestions();
  }, [user]);
  
  // FILTRAGE AVEC DOMAINE, MATIÈRE ET CHAPITRE
  useEffect(() => {
    let filtered = [...questions];
    
    // Filtre par recherche textuelle
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(q => 
        q.libQuestion?.toLowerCase().includes(term) ||
        q.matiere?.toLowerCase().includes(term) ||
        q.domaine?.toLowerCase().includes(term) ||
        q.libChapitre?.toLowerCase().includes(term)
      );
    }
    
    // Filtre par statut
    if (filterStatus) {
      filtered = filtered.filter(q => q.status === filterStatus);
    }
    
    // Filtre par domaine
    if (filterDomaine) {
      filtered = filtered.filter(q => q.domaine === filterDomaine || q.domaineId === filterDomaine);
    }
    
    // Filtre par matière
    if (filterMatiere) {
      filtered = filtered.filter(q => q.matiere === filterMatiere || q.matiereId === filterMatiere);
    }
    
    // ✅ FILTRE PAR CHAPITRE AVEC NORMALISATION
    if (filterChapitre) {
      const normalizedFilter = normalizeChapterStr(filterChapitre);
      filtered = filtered.filter(q => {
        const normalizedQ = normalizeChapterStr(q.libChapitre || '');
        return normalizedQ === normalizedFilter;
      });
    }
    
    setFilteredQuestions(filtered);
  }, [questions, searchTerm, filterStatus, filterDomaine, filterMatiere, filterChapitre]);
  
  // Fonction pour réinitialiser tous les filtres
  const resetFilters = () => {
    setSearchTerm('');
    setFilterStatus('');
    setFilterDomaine('');
    setFilterMatiere('');
    setFilterChapitre('');
  };
  
  // Statistiques avec breakdown par domaine
  const getStatsByDomaine = () => {
    const stats = {};
    questions.forEach(q => {
      const domaine = q.domaine || 'Non classé';
      if (!stats[domaine]) {
        stats[domaine] = { total: 0, pending: 0, approved: 0, rejected: 0 };
      }
      stats[domaine].total++;
      if (q.status === 'pending') stats[domaine].pending++;
      else if (q.status === 'approved') stats[domaine].approved++;
      else if (q.status === 'rejected') stats[domaine].rejected++;
    });
    return stats;
  };
  
  const fetchMyQuestions = async () => {
    setLoading(true);
    try {
      let userId = user?._id || user?.id;
      
      if (!userId) {
        try {
          const userInfo = localStorage.getItem('userInfo');
          if (userInfo) {
            const parsedUser = JSON.parse(userInfo);
            userId = parsedUser._id || parsedUser.id;
          }
        } catch (e) {
          console.error('Erreur parsing userInfo:', e);
        }
      }
      
      if (!userId) {
        console.warn('[fetchMyQuestions] Pas de userId');
        setQuestions([]);
        setLoading(false);
        return;
      }
      
      const timestamp = Date.now();
      const url = `/api/questions?limit=5000&createdBy=${userId}&_t=${timestamp}`;
      console.log('[fetchMyQuestions] URL:', url);
      
      const response = await api.get(url);
      
      let data = [];
      if (response && response.data) {
        if (Array.isArray(response.data)) data = response.data;
        else if (response.data && Array.isArray(response.data.data)) data = response.data.data;
        else if (response.data && Array.isArray(response.data.questions)) data = response.data.questions;
        else if (Array.isArray(response)) data = response;
        else if (response && Array.isArray(response.questions)) data = response.questions;
        else if (response && response.success && Array.isArray(response.data)) data = response.data;
      } else if (Array.isArray(response)) data = response;
      
      console.log(`[fetchMyQuestions] ${data.length} questions extraites`);
      setQuestions(data);
    } catch (error) {
      console.error('Erreur chargement questions:', error);
      toast.error('Impossible de charger vos questions');
    } finally {
      setLoading(false);
    }
  };
  
  const getStatusBadge = (status) => {
    switch(status) {
      case 'pending': return { label: 'En attente', color: '#f59e0b', icon: <Clock size={12} /> };
      case 'approved': return { label: 'Approuvée', color: '#10b981', icon: <CheckCircle size={12} /> };
      case 'rejected': return { label: 'Rejetée', color: '#ef4444', icon: <XCircle size={12} /> };
      default: return { label: 'Inconnu', color: '#64748b', icon: <AlertCircle size={12} /> };
    }
  };
  
  const getStatusStyle = (status) => ({
    padding: '4px 10px',
    borderRadius: '20px',
    fontSize: '0.7rem',
    fontWeight: 600,
    background: `${getStatusBadge(status).color}15`,
    color: getStatusBadge(status).color,
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px'
  });
  
  const getStatusWatermark = (question) => {
    if (question.status === 'pending') {
      return { text: "⏳ En attente de validation - Non éligible à l'insertion dans une épreuve", color: '#f59e0b' };
    }
    if (question.status === 'approved') {
      return { text: "✅ Validée - Éligible à l'insertion dans une épreuve", color: '#10b981' };
    }
    if (question.status === 'rejected') {
      return { text: "❌ Rejetée - Veuillez modifier et renvoyer", color: '#ef4444' };
    }
    return null;
  };
  
  const deleteQuestion = async (id) => {
    if (!window.confirm('⚠️ Supprimer cette question définitivement ?')) return;
    try {
      await api.delete(`/api/questions/${id}`);
      setQuestions(questions.filter(q => q._id !== id));
      toast.success('Question supprimée');
    } catch (error) {
      console.error('Erreur suppression:', error);
      toast.error('Erreur lors de la suppression');
    }
  };
  
  const viewQuestionDetail = (question) => {
    setSelectedQuestion(question);
  };
  
  const handleEditQuestion = (question) => {
    sessionStorage.setItem('editQuestion', JSON.stringify({
      _id: question._id,
      libQuestion: question.libQuestion,
      options: question.options || [],
      correctAnswer: question.correctAnswer || (question.options && question.options[question.bonOpRep]),
      bonOpRep: question.bonOpRep,
      typeQuestion: question.typeQuestion || 1,
      points: question.points || 1,
      tempsMin: question.tempsMin || 1,
      explanation: question.explanation || '',
      domaine: question.domaine,
      niveau: question.niveau,
      matiere: question.matiere,
      sousDomaine: question.sousDomaine || '',
      libChapitre: question.libChapitre || '',
      imageQuestion: question.imageQuestion || '',
      imageBase64: question.imageBase64 || '',
      imageMetadata: question.imageMetadata || {},
      status: question.status,
      domaineId: question.domaineId,
      sousDomaineId: question.sousDomaineId,
      niveauId: question.niveauId,
      matiereId: question.matiereId
    }));
    
    navigate('/create/question', { 
      state: { editQuestion: question, isEditing: true }
    });
  };
  
  const markNotificationAsRead = (id) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };
  
  const markAllNotificationsAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };
  
  const clearNotifications = () => {
    setNotifications([]);
  };
  
  const unreadCount = notifications.filter(n => !n.read).length;
  
  const getImageUrl = (question) => {
    if (!question) return null;
    let imagePath = question.imageQuestion || question.imageBase64 || null;
    if (!imagePath) return null;
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) return imagePath;
    if (imagePath.startsWith('data:')) return imagePath;
    if (imagePath.startsWith('/uploads/')) return `${BACKEND_URL}${imagePath}`;
    if (imagePath.includes('qcm-')) return `${BACKEND_URL}/uploads/questions/${imagePath}`;
    return imagePath;
  };
  
  const stats = {
    total: questions.length,
    pending: questions.filter(q => q.status === 'pending').length,
    approved: questions.filter(q => q.status === 'approved').length,
    rejected: questions.filter(q => q.status === 'rejected').length
  };
  
  const statsByDomaine = getStatsByDomaine();
  const hasActiveFilters = searchTerm || filterStatus || filterDomaine || filterMatiere || filterChapitre;
  
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #05071a 0%, #0a0f2e 60%, #05071a 100%)',
      padding: '24px'
    }}>
      <div style={{
        position: 'fixed', inset: 0,
        backgroundImage: 'linear-gradient(rgba(16,185,129,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(16,185,129,0.03) 1px, transparent 1px)',
        backgroundSize: '40px 40px', pointerEvents: 'none', zIndex: 0,
      }} />
      
      <div style={{ maxWidth: 1200, margin: '0 auto', position: 'relative', zIndex: 1 }}>
        {/* Header - inchangé */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 32, flexWrap: 'wrap' }}>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate('/evaluate')}
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(99,102,241,0.2)',
              borderRadius: 12, padding: 12,
              color: '#94a3b8', cursor: 'pointer'
            }}
          >
            <ArrowLeft size={20} />
          </motion.button>
          <div>
            <h1 style={{ fontSize: '2rem', fontWeight: 700, color: '#f8fafc', marginBottom: 4 }}>
              {isSaisisseur ? 'Mes Saisies' : 'Mes Questions'}
            </h1>
            <p style={{ color: '#64748b' }}>
              {isSaisisseur ? '✏️ Saisissez des questions qui seront soumises au circuit de validation pédagogique' : '📝 Créez des questions et suivez leur état de validation'}
            </p>
          </div>
          
          {/* Notifications */}
          <div style={{ position: 'relative', marginLeft: 'auto' }}>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowNotifications(!showNotifications)}
              style={{
                position: 'relative',
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '10px 16px',
                background: 'rgba(99,102,241,0.15)',
                border: '1px solid rgba(99,102,241,0.3)',
                borderRadius: 12,
                color: '#a5b4fc',
                cursor: 'pointer'
              }}
            >
              {isSocketConnected ? <Bell size={18} /> : <BellOff size={18} />}
              Notifications
              {unreadCount > 0 && (
                <span style={{
                  position: 'absolute', top: -5, right: -5,
                  background: '#ef4444', borderRadius: '50%',
                  width: 18, height: 18, fontSize: '10px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff'
                }}>
                  {unreadCount}
                </span>
              )}
            </motion.button>
            
            <AnimatePresence>
              {showNotifications && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  style={{
                    position: 'absolute', top: '100%', right: 0, marginTop: 8,
                    width: 340, maxHeight: 450,
                    background: '#1e293b', borderRadius: 12,
                    border: '1px solid rgba(99,102,241,0.2)',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
                    overflow: 'hidden', zIndex: 50
                  }}
                >
                  <div style={{
                    padding: '12px 16px',
                    borderBottom: '1px solid rgba(255,255,255,0.1)',
                    display: 'flex', justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <span style={{ color: '#f8fafc', fontWeight: 600 }}>Notifications</span>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={markAllNotificationsAsRead} style={{ fontSize: '0.65rem', color: '#60a5fa', background: 'none', border: 'none', cursor: 'pointer' }}>Tout marquer lu</button>
                      <button onClick={clearNotifications} style={{ fontSize: '0.65rem', color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}>Effacer</button>
                    </div>
                  </div>
                  <div style={{ maxHeight: 380, overflowY: 'auto' }}>
                    {notifications.length === 0 ? (
                      <div style={{ padding: '40px 20px', textAlign: 'center', color: '#64748b' }}>
                        <Bell size={24} style={{ marginBottom: 8 }} />
                        <p style={{ fontSize: '0.8rem' }}>Aucune notification</p>
                      </div>
                    ) : (
                      notifications.map(notif => (
                        <div key={notif.id} onClick={() => markNotificationAsRead(notif.id)} style={{
                          padding: '12px 16px',
                          borderBottom: '1px solid rgba(255,255,255,0.05)',
                          background: notif.read ? 'transparent' : 'rgba(99,102,241,0.1)',
                          cursor: 'pointer'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                            {notif.status === 'approved' && <CheckCircle size={14} color="#10b981" />}
                            {notif.status === 'rejected' && <XCircle size={14} color="#ef4444" />}
                            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#f8fafc' }}>
                              {notif.status === 'approved' ? 'Question approuvée' : notif.status === 'rejected' ? 'Question rejetée' : 'Nouveau commentaire'}
                            </span>
                          </div>
                          <p style={{ fontSize: '0.7rem', color: '#94a3b8', marginBottom: 4 }}>
                            {notif.questionText?.substring(0, 80)}
                          </p>
                          {notif.comment && <p style={{ fontSize: '0.65rem', color: '#f59e0b' }}>💬 {notif.comment}</p>}
                          <p style={{ fontSize: '0.6rem', color: '#475569', marginTop: 4 }}>
                            {new Date(notif.timestamp).toLocaleString('fr-FR')}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate('/create/question')}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '10px 20px',
              background: 'linear-gradient(135deg, #10b981, #059669)',
              border: 'none',
              borderRadius: 12,
              color: 'white',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            <PlusCircle size={18} /> {isSaisisseur ? 'Nouvelle saisie' : 'Nouvelle question'}
          </motion.button>
        </div>
        
        {/* Statistiques générales */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
          <div style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 12, padding: 16 }}>
            <div style={{ color: '#3b82f6', fontSize: '1.8rem', fontWeight: 700 }}>{stats.total}</div>
            <div style={{ color: '#94a3b8', fontSize: '0.75rem' }}>Total</div>
          </div>
          <div style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 12, padding: 16 }}>
            <div style={{ color: '#f59e0b', fontSize: '1.8rem', fontWeight: 700 }}>{stats.pending}</div>
            <div style={{ color: '#94a3b8', fontSize: '0.75rem' }}>En attente</div>
          </div>
          <div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 12, padding: 16 }}>
            <div style={{ color: '#10b981', fontSize: '1.8rem', fontWeight: 700 }}>{stats.approved}</div>
            <div style={{ color: '#94a3b8', fontSize: '0.75rem' }}>Approuvées</div>
          </div>
          <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 12, padding: 16 }}>
            <div style={{ color: '#ef4444', fontSize: '1.8rem', fontWeight: 700 }}>{stats.rejected}</div>
            <div style={{ color: '#94a3b8', fontSize: '0.75rem' }}>Rejetées</div>
          </div>
        </div>
        
        {/* Indicateur de connexion Socket */}
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '4px 10px', borderRadius: 20,
            background: isSocketConnected ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
            border: `1px solid ${isSocketConnected ? '#10b981' : '#ef4444'}30`
          }}>
            <span style={{
              width: 6, height: 6, borderRadius: '50%',
              background: isSocketConnected ? '#10b981' : '#ef4444',
              animation: isSocketConnected ? 'pulse 1.5s infinite' : 'none'
            }} />
            <span style={{ fontSize: '0.65rem', color: isSocketConnected ? '#10b981' : '#ef4444' }}>
              {isSocketConnected ? 'Notifications en temps réel actives' : 'Notifications déconnectées'}
            </span>
          </div>
          
          <button onClick={fetchMyQuestions} style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '8px 16px',
            background: 'rgba(59,130,246,0.1)',
            border: '1px solid rgba(59,130,246,0.3)',
            borderRadius: 8,
            color: '#60a5fa',
            cursor: 'pointer',
            fontSize: '0.8rem'
          }}>
            <RefreshCw size={14} /> Actualiser
          </button>
        </div>
        
        {/* Filtres avancés */}
        <div style={{ 
          background: 'rgba(15,23,42,0.5)', 
          borderRadius: 16, 
          padding: 16, 
          marginBottom: 24,
          border: '1px solid rgba(99,102,241,0.2)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <Filter size={16} color="#60a5fa" />
            <span style={{ color: '#f8fafc', fontWeight: 600, fontSize: '0.9rem' }}>Filtres avancés</span>
            {hasActiveFilters && (
              <button onClick={resetFilters} style={{
                marginLeft: 'auto',
                padding: '4px 12px',
                background: 'rgba(239,68,68,0.1)',
                border: '1px solid rgba(239,68,68,0.3)',
                borderRadius: 6,
                color: '#ef4444',
                fontSize: '0.7rem',
                cursor: 'pointer'
              }}>
                Réinitialiser tous les filtres
              </button>
            )}
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
            {/* Recherche textuelle */}
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Rechercher..."
                style={{
                  width: '100%', padding: '8px 12px 8px 32px',
                  background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(99,102,241,0.2)',
                  borderRadius: 8, color: '#f8fafc', fontSize: '0.8rem',
                  outline: 'none'
                }}
              />
            </div>
            
            {/* Filtre par statut */}
            <select 
              value={filterStatus} 
              onChange={e => setFilterStatus(e.target.value)}
              style={{ padding: '8px 12px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 8, color: '#f8fafc', fontSize: '0.8rem', outline: 'none' }}
            >
              <option value="">Tous les statuts</option>
              <option value="pending">⏳ En attente</option>
              <option value="approved">✅ Approuvées</option>
              <option value="rejected">❌ Rejetées</option>
            </select>
            
            {/* Filtre par domaine */}
            <select 
              value={filterDomaine} 
              onChange={e => setFilterDomaine(e.target.value)}
              style={{ padding: '8px 12px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 8, color: '#f8fafc', fontSize: '0.8rem', outline: 'none' }}
            >
              <option value="">Tous les domaines</option>
              {domaines.map(dom => (
                <option key={dom.id} value={dom.id}>{dom.id} - {dom.nom}</option>
              ))}
            </select>
            
            {/* Filtre par matière */}
            <select 
              value={filterMatiere} 
              onChange={e => setFilterMatiere(e.target.value)}
              disabled={!filterDomaine && availableMatieres.length === 0}
              style={{ 
                padding: '8px 12px', 
                background: 'rgba(0,0,0,0.3)', 
                border: '1px solid rgba(99,102,241,0.2)', 
                borderRadius: 8, 
                color: '#f8fafc', 
                fontSize: '0.8rem', 
                outline: 'none',
                opacity: (!filterDomaine && availableMatieres.length === 0) ? 0.5 : 1
              }}
            >
              <option value="">Toutes les matières</option>
              {availableMatieres.map(mat => (
                <option key={mat.id} value={mat.id}>{mat.nom}</option>
              ))}
            </select>
            
            {/* ✅ FILTRE PAR CHAPITRE (dépend du domaine et de la matière sélectionnés) */}
            <select 
              value={filterChapitre} 
              onChange={e => setFilterChapitre(e.target.value)}
              disabled={availableChapitres.length === 0}
              style={{ 
                padding: '8px 12px', 
                background: 'rgba(0,0,0,0.3)', 
                border: '1px solid rgba(99,102,241,0.2)', 
                borderRadius: 8, 
                color: '#f8fafc', 
                fontSize: '0.8rem', 
                outline: 'none',
                opacity: availableChapitres.length === 0 ? 0.5 : 1
              }}
            >
              <option value="">Tous les chapitres</option>
              {availableChapitres.map(chapitre => (
                <option key={chapitre} value={chapitre}>{chapitre}</option>
              ))}
            </select>
          </div>
          
          {/* Résumé des filtres actifs */}
          {hasActiveFilters && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
              {searchTerm && (
                <span style={{ padding: '2px 8px', background: 'rgba(59,130,246,0.2)', borderRadius: 4, fontSize: '0.65rem', color: '#60a5fa' }}>
                  🔍 {searchTerm}
                </span>
              )}
              {filterStatus && (
                <span style={{ padding: '2px 8px', background: 'rgba(245,158,11,0.2)', borderRadius: 4, fontSize: '0.65rem', color: '#f59e0b' }}>
                  📌 {filterStatus === 'pending' ? 'En attente' : filterStatus === 'approved' ? 'Approuvées' : 'Rejetées'}
                </span>
              )}
              {filterDomaine && (
                <span style={{ padding: '2px 8px', background: 'rgba(139,92,246,0.2)', borderRadius: 4, fontSize: '0.65rem', color: '#a78bfa' }}>
                  🏛️ {domaines.find(d => d.id === filterDomaine)?.nom || filterDomaine}
                </span>
              )}
              {filterMatiere && (
                <span style={{ padding: '2px 8px', background: 'rgba(16,185,129,0.2)', borderRadius: 4, fontSize: '0.65rem', color: '#10b981' }}>
                  📚 {availableMatieres.find(m => m.id === filterMatiere)?.nom || filterMatiere}
                </span>
              )}
              {filterChapitre && (
                <span style={{ padding: '2px 8px', background: 'rgba(245,158,11,0.2)', borderRadius: 4, fontSize: '0.65rem', color: '#f59e0b' }}>
                  📖 {filterChapitre}
                </span>
              )}
            </div>
          )}
        </div>
        
        {/* Statistiques par domaine (accordéon optionnel) */}
        {Object.keys(statsByDomaine).length > 1 && (
          <details style={{ marginBottom: 20, cursor: 'pointer' }}>
            <summary style={{ color: '#94a3b8', fontSize: '0.75rem', padding: '8px 0' }}>
              📊 Répartition par domaine
            </summary>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 8 }}>
              {Object.entries(statsByDomaine).map(([domaine, domStats]) => (
                <div key={domaine} style={{ 
                  background: 'rgba(0,0,0,0.2)', 
                  borderRadius: 8, 
                  padding: '6px 12px',
                  flex: '1 1 auto',
                  minWidth: 150
                }}>
                  <span style={{ color: '#a78bfa', fontSize: '0.7rem', fontWeight: 600 }}>{domaine}</span>
                  <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                    <span style={{ fontSize: '0.65rem', color: '#3b82f6' }}>📋 {domStats.total}</span>
                    <span style={{ fontSize: '0.65rem', color: '#f59e0b' }}>⏳ {domStats.pending}</span>
                    <span style={{ fontSize: '0.65rem', color: '#10b981' }}>✅ {domStats.approved}</span>
                    <span style={{ fontSize: '0.65rem', color: '#ef4444' }}>❌ {domStats.rejected}</span>
                  </div>
                </div>
              ))}
            </div>
          </details>
        )}
        
        {/* Liste des questions */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: 60 }}>
            <RefreshCw size={32} style={{ animation: 'spin 1s linear infinite', color: '#3b82f6' }} />
          </div>
        ) : filteredQuestions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 80, color: '#64748b', background: 'rgba(15,23,42,0.5)', borderRadius: 24 }}>
            <FileText size={48} color="#1e293b" style={{ marginBottom: 16 }} />
            <p>{searchTerm || filterDomaine || filterMatiere || filterChapitre || filterStatus ? 'Aucune question ne correspond à vos filtres' : (isSaisisseur ? 'Vous n\'avez pas encore saisi de questions' : 'Vous n\'avez pas encore créé de questions')}</p>
            {hasActiveFilters ? (
              <button onClick={resetFilters} style={{ marginTop: 20, padding: '8px 20px', background: 'rgba(59,130,246,0.2)', border: '1px solid rgba(59,130,246,0.3)', borderRadius: 8, color: '#60a5fa', cursor: 'pointer' }}>
                Réinitialiser les filtres
              </button>
            ) : (
              <button onClick={() => navigate('/create/question')} style={{ marginTop: 20, padding: '8px 20px', background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none', borderRadius: 8, color: 'white', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <PlusCircle size={14} /> {isSaisisseur ? 'Saisir ma première question' : 'Créer ma première question'}
              </button>
            )}
          </div>
        ) : (
          <>
            <div style={{ marginBottom: 12, textAlign: 'right' }}>
              <span style={{ fontSize: '0.7rem', color: '#64748b' }}>
                {filteredQuestions.length} question(s) affichée(s) sur {questions.length} totale(s)
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {filteredQuestions.map((q, idx) => {
                const status = getStatusBadge(q.status);
                const imageUrl = getImageUrl(q);
                const watermark = getStatusWatermark(q);
                
                return (
                  <motion.div
                    key={q._id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{
                      background: 'rgba(15,23,42,0.7)',
                      border: `1px solid ${status.color}30`,
                      borderRadius: 16,
                      padding: 16
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                          <span style={getStatusStyle(q.status)}>
                            {status.icon} {status.label}
                          </span>
                          <span style={{ fontSize: '0.6rem', padding: '2px 6px', background: 'rgba(16,185,129,0.1)', borderRadius: 4, color: '#10b981' }}>
                            {q.matiere}
                          </span>
                          <span style={{ fontSize: '0.6rem', padding: '2px 6px', background: 'rgba(139,92,246,0.1)', borderRadius: 4, color: '#a78bfa' }}>
                            {q.niveau}
                          </span>
                          <span style={{ fontSize: '0.6rem', padding: '2px 6px', background: 'rgba(59,130,246,0.1)', borderRadius: 4, color: '#60a5fa' }}>
                            {q.domaine}
                          </span>
                          {q.libChapitre && (
                            <span style={{ fontSize: '0.6rem', padding: '2px 6px', background: 'rgba(245,158,11,0.1)', borderRadius: 4, color: '#f59e0b', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                              <BookOpen size={10} /> {q.libChapitre}
                            </span>
                          )}
                          {imageUrl && (
                            <span style={{ fontSize: '0.6rem', padding: '2px 6px', background: 'rgba(59,130,246,0.15)', borderRadius: 4, color: '#60a5fa', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                              <ImageIcon size={10} /> Image
                            </span>
                          )}
                        </div>
                        <p style={{ color: '#f8fafc', fontSize: '0.9rem', marginBottom: 8 }}>
                          {idx + 1}. {q.libQuestion?.length > 100 ? q.libQuestion.substring(0, 100) + '...' : q.libQuestion}
                        </p>
                        <div style={{ display: 'flex', gap: 12, fontSize: '0.7rem', color: '#64748b' }}>
                          <span>⭐ {q.points} pts</span>
                          <span>⏱️ {q.tempsMin} min</span>
                          <span>📅 {new Date(q.createdAt).toLocaleDateString('fr-FR')}</span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={() => viewQuestionDetail(q)} style={{ padding: 6, background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.3)', borderRadius: 6, color: '#3b82f6', cursor: 'pointer' }}>
                          <Eye size={14} />
                        </button>
                        <button onClick={() => handleEditQuestion(q)} style={{ padding: 6, background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 6, color: '#f59e0b', cursor: 'pointer' }}>
                          <Edit size={14} />
                        </button>
                        {(q.status === 'pending' || q.status === 'rejected') && (
                          <button onClick={() => deleteQuestion(q._id)} style={{ padding: 6, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 6, color: '#ef4444', cursor: 'pointer' }}>
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                    
                    {/* Filigrane de statut */}
                    <div style={{
                      marginTop: 12,
                      paddingTop: 8,
                      borderTop: '1px solid rgba(255,255,255,0.05)',
                      textAlign: 'center'
                    }}>
                      <span style={{ fontSize: '0.65rem', color: watermark?.color || '#64748b', opacity: 0.7, fontStyle: 'italic' }}>
                        {watermark?.text}
                      </span>
                    </div>
                    
                    {q.rejectionComment && q.status === 'rejected' && (
                      <div style={{ marginTop: 8, padding: 8, background: 'rgba(239,68,68,0.05)', borderRadius: 8 }}>
                        <p style={{ color: '#ef4444', fontSize: '0.7rem' }}>
                          <strong>Motif du rejet :</strong> {q.rejectionComment}
                        </p>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </>
        )}
      </div>
      
      <AnimatePresence>
        {selectedQuestion && (
          <QuestionDetailModal question={selectedQuestion} onClose={() => setSelectedQuestion(null)} />
        )}
      </AnimatePresence>
      
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
      `}</style>
    </div>
  );
};

// Composant Modal de détail
const QuestionDetailModal = ({ question, onClose }) => {
  if (!question) return null;
  
  const getStatusBadge = (status) => {
    switch(status) {
      case 'pending': return { label: 'En attente', color: '#f59e0b', icon: <Clock size={12} /> };
      case 'approved': return { label: 'Approuvée', color: '#10b981', icon: <CheckCircle size={12} /> };
      case 'rejected': return { label: 'Rejetée', color: '#ef4444', icon: <XCircle size={12} /> };
      default: return { label: 'Inconnu', color: '#64748b', icon: <AlertCircle size={12} /> };
    }
  };
  
  const getStatusStyle = (status) => ({
    padding: '4px 10px',
    borderRadius: '20px',
    fontSize: '0.7rem',
    fontWeight: 600,
    background: `${getStatusBadge(status).color}15`,
    color: getStatusBadge(status).color,
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px'
  });
  
  const status = getStatusBadge(question.status);
  const imageUrl = (() => {
    let src = question.imageQuestion || question.imageBase64 || null;
    if (!src) return null;
    if (src.startsWith('http') || src.startsWith('data:')) return src;
    if (src.startsWith('/uploads/')) return `${BACKEND_URL}${src}`;
    if (src.includes('qcm-')) return `${BACKEND_URL}/uploads/questions/${src}`;
    return src;
  })();
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.85)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20
      }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.95 }}
        style={{
          background: '#0f172a',
          border: '1px solid rgba(99,102,241,0.3)',
          borderRadius: 24,
          padding: 24,
          width: '100%',
          maxWidth: 600,
          maxHeight: '85vh',
          overflowY: 'auto'
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ color: '#f8fafc', fontSize: '1.1rem', fontWeight: 600 }}>
            Détails de la question
            {question.typeQuestion === 2 && <span style={{ color: '#f59e0b', marginLeft: 8, fontSize: '0.7rem' }}>(Multiples réponses)</span>}
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}>
            <XCircleIcon size={24} />
          </button>
        </div>
        
        {imageUrl ? (
          <div style={{ marginBottom: 16, textAlign: 'center' }}>
            <img src={imageUrl} alt="Illustration" style={{ maxWidth: '100%', maxHeight: 200, borderRadius: 12, objectFit: 'contain', background: 'rgba(0,0,0,0.3)' }} onError={(e) => { e.target.style.display = 'none'; }} />
          </div>
        ) : (
          <div style={{ marginBottom: 16, padding: 20, textAlign: 'center', background: 'rgba(0,0,0,0.2)', borderRadius: 8, color: '#64748b' }}>
            <ImageIcon size={24} style={{ marginBottom: 8 }} />
            <p style={{ fontSize: '0.7rem' }}>Aucune image</p>
          </div>
        )}
        
        <div style={{ marginBottom: 16 }}>
          <div style={{ marginBottom: 12 }}>
            <span style={getStatusStyle(question.status)}>
              {status.icon} {status.label}
            </span>
            {question.rejectionComment && question.status === 'rejected' && (
              <div style={{ marginTop: 8, padding: 8, background: 'rgba(239,68,68,0.1)', borderRadius: 8 }}>
                <p style={{ color: '#ef4444', fontSize: '0.75rem' }}>
                  <strong>Motif du rejet :</strong> {question.rejectionComment}
                </p>
              </div>
            )}
          </div>
          
          <p style={{ color: '#f8fafc', fontSize: '1rem', marginBottom: 16, lineHeight: 1.5 }}>
            {question.libQuestion}
          </p>
          
          <div style={{ marginBottom: 16 }}>
            <p style={{ color: '#94a3b8', fontSize: '0.8rem', marginBottom: 8 }}>Options :</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {question.options?.map((opt, i) => {
                const isCorrect = typeof question.bonOpRep === 'number' ? i === question.bonOpRep : (Array.isArray(question.correctAnswer) && question.correctAnswer.includes(opt));
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
                    <span style={{ color: isCorrect ? '#10b981' : '#64748b', fontWeight: 600 }}>{String.fromCharCode(65 + i)}.</span>
                    <span style={{ color: '#94a3b8', flex: 1 }}>{opt}</span>
                    {isCorrect && <CheckCircle size={14} color="#10b981" style={{ marginLeft: 'auto' }} />}
                  </div>
                );
              })}
            </div>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
            <div style={{ padding: 8, background: 'rgba(59,130,246,0.05)', borderRadius: 8 }}>
              <span style={{ color: '#64748b', fontSize: '0.7rem' }}>Domaine</span>
              <p style={{ color: '#e2e8f0', fontSize: '0.8rem' }}>{question.domaine || '—'}</p>
            </div>
            <div style={{ padding: 8, background: 'rgba(59,130,246,0.05)', borderRadius: 8 }}>
              <span style={{ color: '#64748b', fontSize: '0.7rem' }}>Sous-domaine</span>
              <p style={{ color: '#e2e8f0', fontSize: '0.8rem' }}>{question.sousDomaine || '—'}</p>
            </div>
            <div style={{ padding: 8, background: 'rgba(59,130,246,0.05)', borderRadius: 8 }}>
              <span style={{ color: '#64748b', fontSize: '0.7rem' }}>Niveau</span>
              <p style={{ color: '#e2e8f0', fontSize: '0.8rem' }}>{question.niveau || '—'}</p>
            </div>
            <div style={{ padding: 8, background: 'rgba(59,130,246,0.05)', borderRadius: 8 }}>
              <span style={{ color: '#64748b', fontSize: '0.7rem' }}>Matière</span>
              <p style={{ color: '#e2e8f0', fontSize: '0.8rem' }}>{question.matiere || '—'}</p>
            </div>
            <div style={{ padding: 8, background: 'rgba(59,130,246,0.05)', borderRadius: 8 }}>
              <span style={{ color: '#64748b', fontSize: '0.7rem' }}>Chapitre</span>
              <p style={{ color: '#e2e8f0', fontSize: '0.8rem' }}>{question.libChapitre || '—'}</p>
            </div>
            <div style={{ padding: 8, background: 'rgba(59,130,246,0.05)', borderRadius: 8 }}>
              <span style={{ color: '#64748b', fontSize: '0.7rem' }}>Points / Temps</span>
              <p style={{ color: '#f59e0b', fontSize: '0.8rem' }}>{question.points || 1} pts / {question.tempsMin || 1} min</p>
            </div>
          </div>
          
          {question.explanation && (
            <div style={{ padding: 8, background: 'rgba(59,130,246,0.05)', borderRadius: 8, marginBottom: 16 }}>
              <p style={{ color: '#64748b', fontSize: '0.75rem' }}>💡 {question.explanation}</p>
            </div>
          )}
          
          <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid rgba(99,102,241,0.2)' }}>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button onClick={onClose} style={{ padding: '8px 16px', background: '#475569', border: 'none', borderRadius: 8, color: '#fff', cursor: 'pointer' }}>Fermer</button>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default TeacherQuestionsPage;