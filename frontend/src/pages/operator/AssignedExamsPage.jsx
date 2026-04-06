// src/pages/operator/AssignedExamsPage.jsx - Version finale
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Radio, Eye, ArrowLeft, RefreshCw, Calendar, Clock, 
  Tag, Layers, BookOpen, AlertCircle, CheckCircle, 
  Info, Shield, FileWarning, Bell, BellRing, UserCheck
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import toast from 'react-hot-toast';
import ENV_CONFIG from '../../config/env';

const AssignedExamsPage = () => {
  const navigate = useNavigate();
  const { user, hasRole } = useAuth();
  const [exams, setExams] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showHelp, setShowHelp] = useState(false);
  
  const isOperator = hasRole('OPERATEUR_EVALUATION');
  
  useEffect(() => {
    if (!isOperator) {
      toast.error('Accès non autorisé');
      navigate('/evaluate');
      return;
    }
    fetchAssignedExams();
  }, []);
  
  const fetchAssignedExams = async () => {
    setIsLoading(true);
    try {
      // ✅ Route spécifique pour les épreuves assignées à l'opérateur
      const response = await api.get('/api/exams/assigned-to-me');
      
      console.log('[AssignedExams] Réponse:', response);
      
      let examsData = [];
      if (response?.data && Array.isArray(response.data)) {
        examsData = response.data;
      } else if (Array.isArray(response)) {
        examsData = response;
      }
      
      console.log(`[AssignedExams] ${examsData.length} épreuve(s) assignée(s)`);
      
      const enriched = examsData.map(exam => ({
        ...exam,
        coverImage: getImageUrl(exam),
        scheduledDate: exam.scheduledDate || null,
        sessionRoom: exam.sessionRoom || 'Salle principale',
        isAvailable: exam.status === 'published',
        isPending: exam.status === 'draft',
        isArchived: exam.status === 'archived',
        statusLabel: getStatusLabel(exam.status),
        statusColor: getStatusColor(exam.status),
        statusIcon: getStatusIcon(exam.status),
        helpMessage: getHelpMessage(exam.status)
      }));
      
      setExams(enriched);
      
      const availableCount = enriched.filter(e => e.status === 'published').length;
      const pendingCount = enriched.filter(e => e.status === 'draft').length;
      
      if (availableCount > 0) {
        toast.success(`${availableCount} épreuve(s) disponible(s) à distribuer`);
      } else if (pendingCount > 0) {
        toast(`${pendingCount} épreuve(s) en attente de publication`, {
          duration: 5000,
          icon: '⏳',
          style: { background: '#f59e0b', color: '#fff' }
        });
      } else if (examsData.length === 0) {
        toast.info('Aucune épreuve assignée pour le moment');
      }
      
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Impossible de charger les épreuves assignées');
    } finally {
      setIsLoading(false);
    }
  };
  
  const getImageUrl = (exam) => {
    if (exam.coverImage) {
      let url = exam.coverImage;
      if (url.startsWith('/uploads/')) {
        url = `${ENV_CONFIG.BACKEND_URL}${url}`;
      }
      return url;
    }
    if (exam.questions && exam.questions.length > 0) {
      const q = exam.questions.find(q => q.imageQuestion || q.imageBase64);
      if (q?.imageQuestion) {
        let url = q.imageQuestion;
        if (url.startsWith('/uploads/')) {
          url = `${ENV_CONFIG.BACKEND_URL}${url}`;
        }
        return url;
      }
      if (q?.imageBase64?.startsWith('data:')) {
        return q.imageBase64;
      }
    }
    return null;
  };
  
  const getStatusLabel = (status) => {
    switch(status) {
      case 'published': return '✅ Disponible';
      case 'draft': return '⏳ En attente de publication';
      case 'archived': return '📦 Archivée';
      default: return '❓ Statut inconnu';
    }
  };
  
  const getStatusColor = (status) => {
    switch(status) {
      case 'published': return '#10b981';
      case 'draft': return '#f59e0b';
      case 'archived': return '#64748b';
      default: return '#64748b';
    }
  };
  
  const getStatusIcon = (status) => {
    switch(status) {
      case 'published': return <CheckCircle size={14} />;
      case 'draft': return <Clock size={14} />;
      case 'archived': return <FileWarning size={14} />;
      default: return <Info size={14} />;
    }
  };
  
  const getHelpMessage = (status) => {
    switch(status) {
      case 'published': return null;
      case 'draft':
        return "Cette épreuve vous est assignée mais n'est pas encore publiée. Contactez l'administrateur pour activer la distribution.";
      case 'archived':
        return "Cette épreuve est archivée et n'est plus disponible.";
      default:
        return "Statut inconnu. Contactez l'administrateur.";
    }
  };
  
  const handleDistribute = (exam) => {
    if (exam.status !== 'published') {
      toast(exam.helpMessage || 'Cette épreuve n\'est pas encore disponible', {
        duration: 4000,
        icon: '🔒',
        style: { background: '#f59e0b', color: '#fff' }
      });
      return;
    }
    
    navigate(`/surveillance?examId=${exam._id}&examOption=${exam.examOption || 'C'}`);
  };
  
  const handleNotifyAdmin = (exam) => {
    const message = `Bonjour, je souhaite publier l'épreuve "${exam.title}" (ID: ${exam._id}) pour pouvoir la distribuer. Merci.`;
    navigator.clipboard.writeText(message);
    toast.success('Message copié ! Vous pouvez le coller pour contacter l\'administrateur.', {
      duration: 3000,
      icon: '📋'
    });
  };
  
  const filtered = exams.filter(exam => {
    const matchesSearch = !search ||
      exam.title?.toLowerCase().includes(search.toLowerCase()) ||
      exam.domain?.toLowerCase().includes(search.toLowerCase()) ||
      exam.level?.toLowerCase().includes(search.toLowerCase());
    
    const matchesFilter = filterStatus === 'all' ||
      (filterStatus === 'available' && exam.status === 'published') ||
      (filterStatus === 'pending' && exam.status === 'draft');
    
    return matchesSearch && matchesFilter;
  });
  
  const stats = {
    total: exams.length,
    available: exams.filter(e => e.status === 'published').length,
    pending: exams.filter(e => e.status === 'draft').length,
    archived: exams.filter(e => e.status === 'archived').length
  };
  
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #05071a 0%, #0a0f2e 60%, #05071a 100%)',
      padding: '24px'
    }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.6} }
      `}</style>
      
      <header style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'rgba(5,7,26,0.95)', backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(59,130,246,0.15)',
        padding: '0 32px', height: '60px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: '28px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate('/evaluate')}
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(99,102,241,0.2)',
              borderRadius: 10, padding: 8,
              color: '#94a3b8', cursor: 'pointer'
            }}
          >
            <ArrowLeft size={18} />
          </motion.button>
          <span style={{
            fontFamily: "'Sora', sans-serif", fontWeight: 800, fontSize: '1.125rem',
            background: 'linear-gradient(135deg, #60a5fa, #a78bfa)',
            WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent',
          }}>NA²QUIZ</span>
          <span style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Mes épreuves assignées</span>
        </div>
        
        <div style={{ display: 'flex', gap: '12px' }}>
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setShowHelp(!showHelp)}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '7px 16px', borderRadius: '8px',
              background: 'rgba(59,130,246,0.15)',
              border: '1px solid rgba(59,130,246,0.3)',
              color: '#60a5fa', fontSize: '0.875rem',
              fontWeight: 500, cursor: 'pointer'
            }}
          >
            <Shield size={14} /> Aide
          </motion.button>
          
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => navigate('/surveillance')}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '7px 16px', borderRadius: '8px',
              background: 'linear-gradient(135deg, #10b981, #059669)',
              border: 'none', color: '#fff', fontSize: '0.875rem',
              fontWeight: 600, cursor: 'pointer'
            }}
          >
            <Radio size={14} /> Mode Surveillance
          </motion.button>
        </div>
      </header>
      
      <AnimatePresence>
        {showHelp && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            style={{
              maxWidth: '1200px', margin: '0 auto 20px auto',
              background: 'rgba(15,23,42,0.95)',
              border: '1px solid rgba(59,130,246,0.3)',
              borderRadius: '12px',
              padding: '16px 20px'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ color: '#f8fafc', fontSize: '0.9rem', fontWeight: 600 }}>📖 Comprendre le statut de vos épreuves</h3>
              <button onClick={() => setShowHelp(false)} style={{ color: '#64748b', background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle size={16} color="#10b981" />
                <span style={{ color: '#10b981', fontSize: '0.75rem' }}><strong>✅ Disponible</strong> : Épreuve prête à être distribuée</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Clock size={16} color="#f59e0b" />
                <span style={{ color: '#f59e0b', fontSize: '0.75rem' }}><strong>⏳ En attente</strong> : Épreuve assignée mais non publiée</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <BellRing size={16} color="#60a5fa" />
                <span style={{ color: '#60a5fa', fontSize: '0.75rem' }}><strong>📢 Action</strong> : Contactez l'administrateur pour publier</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      <main style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <h1 style={{ fontSize: '1.8rem', fontWeight: 700, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <UserCheck size={28} color="#f59e0b" />
                Mes épreuves assignées
              </h1>
              <div style={{ display: 'flex', gap: '16px', marginTop: '8px' }}>
                <span style={{ color: '#10b981', fontSize: '0.8rem' }}>✅ {stats.available} disponible(s)</span>
                <span style={{ color: '#f59e0b', fontSize: '0.8rem' }}>⏳ {stats.pending} en attente</span>
                <span style={{ color: '#64748b', fontSize: '0.8rem' }}>📦 {stats.archived} archivée(s)</span>
              </div>
            </div>
            
            <button
              onClick={fetchAssignedExams}
              style={{
                padding: '8px 16px',
                background: 'rgba(59,130,246,0.1)',
                border: '1px solid rgba(59,130,246,0.3)',
                borderRadius: '8px',
                color: '#60a5fa',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <RefreshCw size={16} /> Actualiser
            </button>
          </div>
          
          <div style={{ display: 'flex', gap: '12px', marginTop: '20px', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Rechercher..."
                style={{
                  width: '100%', padding: '9px 12px 9px 38px',
                  background: 'rgba(15,23,42,0.7)', border: '1px solid rgba(59,130,246,0.18)',
                  borderRadius: '10px', color: '#e2e8f0', outline: 'none'
                }}
              />
            </div>
            
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => setFilterStatus('all')}
                style={{
                  padding: '8px 16px',
                  background: filterStatus === 'all' ? 'rgba(59,130,246,0.3)' : 'rgba(15,23,42,0.7)',
                  border: `1px solid ${filterStatus === 'all' ? '#3b82f6' : 'rgba(59,130,246,0.2)'}`,
                  borderRadius: '8px',
                  color: filterStatus === 'all' ? '#60a5fa' : '#94a3b8',
                  cursor: 'pointer'
                }}
              >
                Toutes
              </button>
              <button
                onClick={() => setFilterStatus('available')}
                style={{
                  padding: '8px 16px',
                  background: filterStatus === 'available' ? 'rgba(16,185,129,0.2)' : 'rgba(15,23,42,0.7)',
                  border: `1px solid ${filterStatus === 'available' ? '#10b981' : 'rgba(59,130,246,0.2)'}`,
                  borderRadius: '8px',
                  color: filterStatus === 'available' ? '#10b981' : '#94a3b8',
                  cursor: 'pointer'
                }}
              >
                Disponibles
              </button>
              <button
                onClick={() => setFilterStatus('pending')}
                style={{
                  padding: '8px 16px',
                  background: filterStatus === 'pending' ? 'rgba(245,158,11,0.2)' : 'rgba(15,23,42,0.7)',
                  border: `1px solid ${filterStatus === 'pending' ? '#f59e0b' : 'rgba(59,130,246,0.2)'}`,
                  borderRadius: '8px',
                  color: filterStatus === 'pending' ? '#f59e0b' : '#94a3b8',
                  cursor: 'pointer'
                }}
              >
                En attente
              </button>
            </div>
          </div>
        </div>
        
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '60px' }}>
            <RefreshCw size={32} style={{ animation: 'spin 1s linear infinite', color: '#3b82f6' }} />
          </div>
        ) : filtered.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: '80px',
            background: 'rgba(15,23,42,0.5)', borderRadius: '24px'
          }}>
            {stats.total === 0 ? (
              <>
                <Bell size={48} color="#1e293b" />
                <p style={{ color: '#64748b', marginTop: 16 }}>Aucune épreuve assignée</p>
                <p style={{ color: '#475569', fontSize: '0.8rem' }}>Contactez votre administrateur</p>
              </>
            ) : (
              <>
                <AlertCircle size={48} color="#f59e0b" />
                <p style={{ color: '#64748b', marginTop: 16 }}>Aucune épreuve ne correspond aux filtres</p>
                <button
                  onClick={() => { setSearch(''); setFilterStatus('all'); }}
                  style={{ marginTop: '20px', padding: '8px 20px', background: 'rgba(59,130,246,0.2)', border: 'none', borderRadius: '8px', color: '#60a5fa', cursor: 'pointer' }}
                >
                  Réinitialiser
                </button>
              </>
            )}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: '20px' }}>
            {filtered.map(exam => (
              <motion.div
                key={exam._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ y: -4 }}
                style={{
                  background: 'rgba(15,23,42,0.85)',
                  border: `2px solid ${exam.status === 'published' ? '#10b981' : exam.status === 'draft' ? '#f59e0b' : '#64748b'}30`,
                  borderRadius: '16px',
                  overflow: 'hidden'
                }}
              >
                <div style={{
                  padding: '10px 16px',
                  background: `${exam.statusColor}15`,
                  borderBottom: `1px solid ${exam.statusColor}30`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {exam.statusIcon}
                    <span style={{ color: exam.statusColor, fontSize: '0.7rem', fontWeight: 600 }}>
                      {exam.statusLabel}
                    </span>
                  </div>
                  {exam.status === 'draft' && (
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleNotifyAdmin(exam)}
                      style={{
                        padding: '2px 8px',
                        background: 'rgba(59,130,246,0.2)',
                        border: '1px solid rgba(59,130,246,0.3)',
                        borderRadius: '6px',
                        color: '#60a5fa',
                        fontSize: '0.6rem',
                        cursor: 'pointer'
                      }}
                    >
                      📢 Notifier l'admin
                    </motion.button>
                  )}
                </div>
                
                {exam.coverImage && (
                  <div style={{ height: '140px', overflow: 'hidden' }}>
                    <img src={exam.coverImage} alt={exam.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                )}
                
                <div style={{ padding: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <h3 style={{ color: '#f8fafc', fontSize: '1rem', fontWeight: 600 }}>{exam.title}</h3>
                    <span style={{
                      padding: '2px 8px', borderRadius: '20px',
                      background: 'rgba(245,158,11,0.2)',
                      color: '#f59e0b', fontSize: '0.65rem', fontWeight: 700
                    }}>
                      Option {exam.examOption || 'C'}
                    </span>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '8px', margin: '12px 0', flexWrap: 'wrap' }}>
                    {exam.domain && (
                      <span style={{ fontSize: '0.65rem', padding: '2px 6px', background: 'rgba(59,130,246,0.15)', borderRadius: 4, color: '#60a5fa' }}>
                        <Tag size={10} style={{ display: 'inline', marginRight: 2 }} />
                        {exam.domain}
                      </span>
                    )}
                    {exam.level && (
                      <span style={{ fontSize: '0.65rem', padding: '2px 6px', background: 'rgba(139,92,246,0.15)', borderRadius: 4, color: '#a78bfa' }}>
                        <Layers size={10} style={{ display: 'inline', marginRight: 2 }} />
                        {exam.level}
                      </span>
                    )}
                  </div>
                  
                  <div style={{ display: 'flex', gap: '16px', marginBottom: '16px', fontSize: '0.7rem', color: '#64748b' }}>
                    <span><Clock size={12} style={{ display: 'inline', marginRight: 4 }} />{exam.duration || 60} min</span>
                    <span><BookOpen size={12} style={{ display: 'inline', marginRight: 4 }} />{exam.questions?.length || 0} Q</span>
                  </div>
                  
                  {exam.scheduledDate && (
                    <div style={{ marginBottom: '16px', padding: '8px', background: 'rgba(59,130,246,0.1)', borderRadius: '8px', fontSize: '0.7rem', color: '#60a5fa' }}>
                      <Calendar size={12} style={{ display: 'inline', marginRight: 4 }} />
                      Programmé: {new Date(exam.scheduledDate).toLocaleString()}
                    </div>
                  )}
                  
                  {exam.sessionRoom && (
                    <div style={{ marginBottom: '16px', padding: '8px', background: 'rgba(139,92,246,0.1)', borderRadius: '8px', fontSize: '0.7rem', color: '#a78bfa' }}>
                      📍 Salle: {exam.sessionRoom}
                    </div>
                  )}
                  
                  <button
                    onClick={() => handleDistribute(exam)}
                    disabled={exam.status !== 'published'}
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: '10px',
                      background: exam.status === 'published'
                        ? 'linear-gradient(135deg, #f59e0b, #d97706)'
                        : 'rgba(100,116,139,0.3)',
                      border: 'none',
                      color: exam.status === 'published' ? '#fff' : '#94a3b8',
                      fontWeight: 600,
                      cursor: exam.status === 'published' ? 'pointer' : 'not-allowed',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px'
                    }}
                  >
                    <Radio size={16} />
                    {exam.status === 'published' ? 'DISTRIBUER L\'ÉPREUVE' : 'NON DISPONIBLE'}
                  </button>
                  
                  {exam.helpMessage && (
                    <div style={{ marginTop: '12px', padding: '8px', background: 'rgba(245,158,11,0.1)', borderRadius: '8px', fontSize: '0.65rem', color: '#f59e0b', textAlign: 'center' }}>
                      💡 {exam.helpMessage}
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default AssignedExamsPage;