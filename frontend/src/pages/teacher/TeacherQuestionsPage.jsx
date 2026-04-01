// src/pages/teacher/TeacherQuestionsPage.jsx
// Liste des questions de l'enseignant avec suivi de validation
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileText, ArrowLeft, RefreshCw, Search, Eye, Edit, Trash2,
  CheckCircle, XCircle, Clock, Tag, Layers, BookOpen, PlusCircle,
  AlertCircle, Filter
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import toast from 'react-hot-toast';

const TeacherQuestionsPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [questions, setQuestions] = useState([]);
  const [filteredQuestions, setFilteredQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [selectedQuestion, setSelectedQuestion] = useState(null);
  
  useEffect(() => {
    fetchMyQuestions();
  }, [user]);
  
  useEffect(() => {
    let filtered = [...questions];
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(q => 
        q.libQuestion?.toLowerCase().includes(term) ||
        q.matiere?.toLowerCase().includes(term)
      );
    }
    if (filterStatus) {
      filtered = filtered.filter(q => q.status === filterStatus);
    }
    setFilteredQuestions(filtered);
  }, [questions, searchTerm, filterStatus]);
  
  const fetchMyQuestions = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/api/questions?createdBy=${user?._id}&limit=500`);
      
      let data = [];
      if (Array.isArray(response)) {
        data = response;
      } else if (response?.data && Array.isArray(response.data)) {
        data = response.data;
      }
      
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
      case 'pending':
        return { label: 'En attente', color: '#f59e0b', icon: <Clock size={12} /> };
      case 'approved':
        return { label: 'Approuvée', color: '#10b981', icon: <CheckCircle size={12} /> };
      case 'rejected':
        return { label: 'Rejetée', color: '#ef4444', icon: <XCircle size={12} /> };
      default:
        return { label: 'Inconnu', color: '#64748b', icon: <AlertCircle size={12} /> };
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
  
  const deleteQuestion = async (id) => {
    if (!window.confirm('Supprimer cette question définitivement ?')) return;
    
    try {
      await api.delete(`/api/questions/${id}`);
      setQuestions(questions.filter(q => q._id !== id));
      toast.success('Question supprimée');
    } catch (error) {
      console.error('Erreur suppression:', error);
      toast.error('Erreur lors de la suppression');
    }
  };
  
  const viewBulletin = (question) => {
    setSelectedQuestion(question);
  };
  
  const QuestionDetailModal = ({ question, onClose }) => {
    if (!question) return null;
    const status = getStatusBadge(question.status);
    
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: 'rgba(0,0,0,0.8)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 20
        }}
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
            maxHeight: '80vh',
            overflowY: 'auto'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ color: '#f8fafc', fontSize: '1.1rem', fontWeight: 600 }}>Détails de la question</h3>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}>
              <XCircle size={24} />
            </button>
          </div>
          
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
            
            <p style={{ color: '#f8fafc', fontSize: '1rem', marginBottom: 16 }}>{question.libQuestion}</p>
            
            <div style={{ marginBottom: 16 }}>
              <p style={{ color: '#94a3b8', fontSize: '0.8rem', marginBottom: 8 }}>Options :</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {question.options?.map((opt, i) => {
                  const isCorrect = typeof question.bonOpRep === 'number' 
                    ? i === question.bonOpRep 
                    : (Array.isArray(question.correctAnswer) && question.correctAnswer.includes(opt));
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
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
              <div style={{ padding: 8, background: 'rgba(59,130,246,0.05)', borderRadius: 8 }}>
                <span style={{ color: '#64748b', fontSize: '0.7rem' }}>Domaine</span>
                <p style={{ color: '#e2e8f0', fontSize: '0.8rem' }}>{question.domaine || '—'}</p>
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
                <span style={{ color: '#64748b', fontSize: '0.7rem' }}>Points</span>
                <p style={{ color: '#f59e0b', fontSize: '0.8rem' }}>{question.points || 1} pts</p>
              </div>
            </div>
            
            {question.explanation && (
              <div style={{ padding: 8, background: 'rgba(59,130,246,0.05)', borderRadius: 8, marginBottom: 16 }}>
                <p style={{ color: '#64748b', fontSize: '0.75rem' }}>💡 {question.explanation}</p>
              </div>
            )}
            
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              {question.status === 'rejected' && (
                <button
                  onClick={() => {
                    onClose();
                    navigate('/create/question', { state: { editQuestion: question } });
                  }}
                  style={{ padding: '8px 16px', background: 'rgba(245,158,11,0.2)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 8, color: '#f59e0b', cursor: 'pointer' }}
                >
                  <Edit size={14} /> Modifier et renvoyer
                </button>
              )}
              <button onClick={onClose} style={{ padding: '8px 16px', background: '#475569', border: 'none', borderRadius: 8, color: '#fff', cursor: 'pointer' }}>
                Fermer
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    );
  };
  
  const stats = {
    total: questions.length,
    pending: questions.filter(q => q.status === 'pending').length,
    approved: questions.filter(q => q.status === 'approved').length,
    rejected: questions.filter(q => q.status === 'rejected').length
  };
  
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #05071a 0%, #0a0f2e 60%, #05071a 100%)',
      padding: '24px'
    }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 32 }}>
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
              Mes Questions
            </h1>
            <p style={{ color: '#64748b' }}>
              Suivez l'état de validation de vos questions
            </p>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate('/create/question')}
            style={{
              marginLeft: 'auto',
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
            <PlusCircle size={18} /> Nouvelle question
          </motion.button>
        </div>
        
        {/* Statistiques */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
          <div style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 12, padding: 16 }}>
            <div style={{ color: '#3b82f6', fontSize: '1.8rem', fontWeight: 700 }}>{stats.total}</div>
            <div style={{ color: '#94a3b8', fontSize: '0.75rem' }}>Total questions</div>
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
        
        {/* Filtres */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
            <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Rechercher une question..."
              style={{
                width: '100%', padding: '10px 12px 10px 38px',
                background: 'rgba(15,23,42,0.7)', border: '1px solid rgba(59,130,246,0.2)',
                borderRadius: 10, color: '#f8fafc', outline: 'none'
              }}
            />
          </div>
          
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
            style={{ padding: '10px 12px', background: '#0f172a', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 10, color: '#f8fafc', outline: 'none' }}>
            <option value="">Tous les statuts</option>
            <option value="pending">⏳ En attente</option>
            <option value="approved">✅ Approuvées</option>
            <option value="rejected">❌ Rejetées</option>
          </select>
          
          <button onClick={fetchMyQuestions} style={{ padding: '10px 12px', background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.3)', borderRadius: 10, color: '#60a5fa', cursor: 'pointer' }}>
            <RefreshCw size={16} />
          </button>
        </div>
        
        {/* Liste des questions */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: 60 }}>
            <RefreshCw size={32} style={{ animation: 'spin 1s linear infinite', color: '#3b82f6' }} />
          </div>
        ) : filteredQuestions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 80, color: '#64748b', background: 'rgba(15,23,42,0.5)', borderRadius: 24 }}>
            <FileText size={48} color="#1e293b" style={{ marginBottom: 16 }} />
            <p>{searchTerm ? 'Aucune question ne correspond à votre recherche' : 'Vous n\'avez pas encore créé de questions'}</p>
            <button onClick={() => navigate('/create/question')} style={{ marginTop: 20, padding: '8px 20px', background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none', borderRadius: 8, color: 'white', cursor: 'pointer' }}>
              <PlusCircle size={14} /> Créer ma première question
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {filteredQuestions.map((q, idx) => {
              const status = getStatusBadge(q.status);
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
                      <button onClick={() => viewBulletin(q)} style={{ padding: 6, background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.3)', borderRadius: 6, color: '#3b82f6', cursor: 'pointer' }}>
                        <Eye size={14} />
                      </button>
                      {q.status === 'pending' && (
                        <button onClick={() => navigate('/create/question', { state: { editQuestion: q } })} style={{ padding: 6, background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 6, color: '#f59e0b', cursor: 'pointer' }}>
                          <Edit size={14} />
                        </button>
                      )}
                      {(q.status === 'pending' || q.status === 'rejected') && (
                        <button onClick={() => deleteQuestion(q._id)} style={{ padding: 6, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 6, color: '#ef4444', cursor: 'pointer' }}>
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
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
        )}
      </div>
      
      <AnimatePresence>
        {selectedQuestion && (
          <QuestionDetailModal question={selectedQuestion} onClose={() => setSelectedQuestion(null)} />
        )}
      </AnimatePresence>
      
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default TeacherQuestionsPage;