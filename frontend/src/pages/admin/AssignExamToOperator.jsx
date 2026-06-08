// src/pages/admin/AssignExamToOperator.jsx - VERSION ULTIME COMPLÈTE
// ✅ Assignation des épreuves aux opérateurs
// ✅ Validation des dates (interdit les dates passées)
// ✅ Support complet des 11 configurations A à K
// ✅ Publication des épreuves depuis l'interface admin
// ✅ Gestion des statuts (draft → published → assigned)

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, RefreshCw, Calendar, User, Monitor, Tag, Layers, 
  CheckCircle, Shield, Users, PlusCircle, X, Clock, BookOpen,
  AlertCircle, Settings, Award, Timer, Send, Eye
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import toast from 'react-hot-toast';

const AssignExamToOperator = () => {
  const navigate = useNavigate();
  const { user, hasRole } = useAuth();
  const [exams, setExams] = useState([]);
  const [operators, setOperators] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedExam, setSelectedExam] = useState('');
  const [selectedOperator, setSelectedOperator] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [sessionRoom, setSessionRoom] = useState('Salle principale');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateError, setDateError] = useState('');
  const [selectedExamDetails, setSelectedExamDetails] = useState(null);

  const isAdmin = hasRole('ADMIN_SYSTEME') || hasRole('ADMIN_DELEGUE');

  // Configuration des libellés pour les options A à K
  const getExamOptionLabel = (option) => {
    const labels = {
      A: 'Collective Figée', B: 'Collective Souple', C: 'Personnalisée',
      D: 'Aléatoire', E: 'Aléatoire+', F: 'Aléatoire Libre',
      G: 'Plage Ouverte + Reprise', H: 'Plage Ouverte',
      I: 'Plage Ouverte+', J: 'Plage Ouverte++', K: 'Plage Ouverte Libre'
    };
    return labels[option] || `Option ${option}`;
  };

  const getExamOptionColor = (option) => {
    const colors = {
      A: '#ef4444', B: '#ef4444', C: '#ef4444',
      D: '#f59e0b', E: '#f59e0b', F: '#f59e0b',
      G: '#10b981', H: '#10b981', I: '#10b981', J: '#10b981', K: '#10b981'
    };
    return colors[option] || '#3b82f6';
  };

  const getStatusLabel = (status) => {
    switch(status) {
      case 'draft': return 'Brouillon';
      case 'published': return 'Publiée ✅';
      case 'archived': return 'Archivée';
      default: return status || 'Inconnu';
    }
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'draft': return '#f59e0b';
      case 'published': return '#10b981';
      case 'archived': return '#64748b';
      default: return '#64748b';
    }
  };

  // Vérifier si la date est valide (future ou aujourd'hui)
  const isValidDate = (dateString) => {
    if (!dateString) return true;
    const selectedDate = new Date(dateString);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const selectedDay = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
    return selectedDay >= today;
  };

  // Vérifier si l'épreuve a déjà une date passée
  const isExamDatePassed = (exam) => {
    if (!exam.scheduledDate) return false;
    const examDate = new Date(exam.scheduledDate);
    const now = new Date();
    return examDate < now;
  };

  useEffect(() => {
    if (!isAdmin) {
      toast.error('Accès non autorisé');
      navigate('/evaluate');
      return;
    }
    loadData();
  }, []);

  // Mettre à jour les détails de l'épreuve sélectionnée
  useEffect(() => {
    if (selectedExam) {
      const exam = exams.find(e => e._id === selectedExam);
      setSelectedExamDetails(exam || null);
    } else {
      setSelectedExamDetails(null);
    }
  }, [selectedExam, exams]);

  const loadData = async () => {
    setLoading(true);
    try {
      console.log('[AssignExam] Chargement des données...');
      
      const [examsRes, operatorsRes] = await Promise.all([
        api.get('/api/exams'),
        api.get('/api/operators')
      ]);
      
      // Extraction des données
      let examsData = [];
      if (examsRes?.data?.data && Array.isArray(examsRes.data.data)) {
        examsData = examsRes.data.data;
      } else if (examsRes?.data && Array.isArray(examsRes.data)) {
        examsData = examsRes.data;
      } else if (Array.isArray(examsRes)) {
        examsData = examsRes;
      }
      
      let operatorsData = [];
      if (operatorsRes?.data?.data && Array.isArray(operatorsRes.data.data)) {
        operatorsData = operatorsRes.data.data;
      } else if (operatorsRes?.data && Array.isArray(operatorsRes.data)) {
        operatorsData = operatorsRes.data;
      } else if (Array.isArray(operatorsRes)) {
        operatorsData = operatorsRes;
      }
      
      console.log(`[AssignExam] ${examsData.length} épreuves, ${operatorsData.length} opérateurs`);
      
      setExams(examsData);
      setOperators(operatorsData);
      
      if (examsData.length === 0) {
        toast('📚 Aucune épreuve trouvée', { icon: 'ℹ️' });
      }
      if (operatorsData.length === 0) {
        toast('👥 Aucun opérateur trouvé', { icon: 'ℹ️' });
      }
      
    } catch (error) {
      console.error('[AssignExam] Erreur chargement:', error);
      toast.error('Erreur chargement des données');
    } finally {
      setLoading(false);
    }
  };

  const validateAssignment = () => {
    setDateError('');
    
    if (!selectedExam || !selectedOperator) {
      toast.error('Sélectionnez une épreuve et un opérateur');
      return false;
    }
    
    if (scheduledDate && !isValidDate(scheduledDate)) {
      const errorMsg = 'Impossible d\'assigner à une date passée. Veuillez sélectionner une date future ou aujourd\'hui.';
      setDateError(errorMsg);
      toast.error(errorMsg);
      return false;
    }
    
    return true;
  };

  const handleAssign = async () => {
    if (!validateAssignment()) return;
    
    try {
      console.log('[AssignExam] Assignation:', { selectedExam, selectedOperator, scheduledDate, sessionRoom });
      
      await api.put(`/api/exams/${selectedExam}/assign`, {
        operatorId: selectedOperator,
        scheduledDate: scheduledDate || new Date().toISOString(),
        sessionRoom: sessionRoom
      });
      
      toast.success('✅ Épreuve assignée avec succès');
      
      // Réinitialiser le formulaire
      setSelectedExam('');
      setSelectedOperator('');
      setScheduledDate('');
      setSessionRoom('Salle principale');
      setDateError('');
      setSelectedExamDetails(null);
      
      // Recharger les données
      loadData();
      
    } catch (error) {
      console.error('[AssignExam] Erreur assignation:', error);
      toast.error(error.response?.data?.message || 'Erreur lors de l\'assignation');
    }
  };

  const handleUnassign = async (examId) => {
    if (!window.confirm('Confirmer la désassignation de cette épreuve ?')) return;
    
    try {
      await api.put(`/api/exams/${examId}/assign`, { operatorId: null });
      toast.success('✅ Assignation supprimée');
      loadData();
    } catch (error) {
      console.error('[AssignExam] Erreur désassignation:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  const handlePublish = async (examId) => {
    if (!window.confirm('Publier cette épreuve ? Elle deviendra disponible pour distribution par l\'opérateur.')) return;
    
    try {
      await api.patch(`/api/exams/${examId}/publish`);
      toast.success('✅ Épreuve publiée avec succès');
      loadData();
    } catch (error) {
      console.error('[AssignExam] Erreur publication:', error);
      toast.error(error.response?.data?.message || 'Erreur lors de la publication');
    }
  };

  const handlePreview = (examId) => {
    navigate(`/preview/${examId}`);
  };

  const formatDate = (dateString) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    const now = new Date();
    const isPassed = date < now;
    return {
      formatted: date.toLocaleString('fr-FR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
      }),
      isPassed
    };
  };

  const getMinDate = () => {
    const today = new Date();
    return today.toISOString().slice(0, 16);
  };

  const filteredExams = exams.filter(e =>
    !searchTerm ||
    e.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.domain?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const assignedExams = filteredExams.filter(e => e.assignedTo);
  const unassignedExams = filteredExams.filter(e => !e.assignedTo);

  if (!isAdmin) return null;

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #05071a 0%, #0a0f2e 60%, #05071a 100%)',
      padding: '24px'
    }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: rgba(15,23,42,0.3); border-radius: 10px; }
        ::-webkit-scrollbar-thumb { background: rgba(99,102,241,0.3); border-radius: 10px; }
        select option { background: #1e293b; color: #f8fafc; }
      `}</style>

      <div style={{ maxWidth: 1400, margin: '0 auto' }}>
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
              cursor: 'pointer'
            }}
          >
            <ArrowLeft size={20} />
          </motion.button>
          <div>
            <h1 style={{ fontSize: '1.8rem', fontWeight: 700, color: '#f8fafc' }}>
              <Shield size={28} style={{ display: 'inline', marginRight: 12, color: '#f59e0b' }} />
              Assignation des épreuves
            </h1>
            <p style={{ color: '#64748b' }}>Assignez des épreuves aux opérateurs pour les sessions d'examen</p>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 12 }}>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                placeholder="Rechercher..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  padding: '8px 12px',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(59,130,246,0.2)',
                  borderRadius: 8,
                  color: '#f8fafc',
                  width: 200
                }}
              />
            </div>
            <button
              onClick={loadData}
              style={{
                padding: '8px 16px',
                background: 'rgba(59,130,246,0.1)',
                border: '1px solid rgba(59,130,246,0.3)',
                borderRadius: 8,
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
        </div>

        {/* Formulaire d'assignation */}
        <div style={{
          background: 'rgba(15,23,42,0.7)',
          border: '1px solid rgba(59,130,246,0.2)',
          borderRadius: 20,
          padding: 24,
          marginBottom: 32
        }}>
          <h2 style={{ color: '#f8fafc', fontSize: '1.2rem', fontWeight: 600, marginBottom: 20 }}>
            <PlusCircle size={18} style={{ display: 'inline', marginRight: 8 }} />
            Nouvelle assignation
          </h2>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 20 }}>
            <div>
              <label style={{ color: '#94a3b8', fontSize: '0.8rem', marginBottom: 6, display: 'block' }}>
                <BookOpen size={14} style={{ display: 'inline', marginRight: 4 }} />
                Épreuve
              </label>
              <select
                value={selectedExam}
                onChange={(e) => setSelectedExam(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(59,130,246,0.2)',
                  borderRadius: 10,
                  color: '#f8fafc'
                }}
              >
                <option value="">-- Sélectionner une épreuve --</option>
                {unassignedExams.map(exam => (
                  <option key={exam._id} value={exam._id}>
                    {exam.title} {exam.domain ? `(${exam.domain})` : ''}
                    {exam.status === 'draft' && ' (Brouillon)'}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label style={{ color: '#94a3b8', fontSize: '0.8rem', marginBottom: 6, display: 'block' }}>
                <Users size={14} style={{ display: 'inline', marginRight: 4 }} />
                Opérateur
              </label>
              <select
                value={selectedOperator}
                onChange={(e) => setSelectedOperator(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(59,130,246,0.2)',
                  borderRadius: 10,
                  color: '#f8fafc'
                }}
              >
                <option value="">-- Sélectionner un opérateur --</option>
                {operators.map(op => (
                  <option key={op._id} value={op._id}>
                    {op.name} ({op.email})
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label style={{ color: '#94a3b8', fontSize: '0.8rem', marginBottom: 6, display: 'block' }}>
                <Calendar size={14} style={{ display: 'inline', marginRight: 4 }} />
                Date programmée
              </label>
              <input
                type="datetime-local"
                value={scheduledDate}
                onChange={(e) => {
                  setScheduledDate(e.target.value);
                  setDateError('');
                }}
                min={getMinDate()}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  background: 'rgba(255,255,255,0.05)',
                  border: `1px solid ${dateError ? '#ef4444' : 'rgba(59,130,246,0.2)'}`,
                  borderRadius: 10,
                  color: '#f8fafc'
                }}
              />
              {dateError && (
                <p style={{ color: '#ef4444', fontSize: '0.7rem', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <AlertCircle size={12} /> {dateError}
                </p>
              )}
            </div>
            
            <div>
              <label style={{ color: '#94a3b8', fontSize: '0.8rem', marginBottom: 6, display: 'block' }}>
                <Monitor size={14} style={{ display: 'inline', marginRight: 4 }} />
                Salle
              </label>
              <input
                type="text"
                value={sessionRoom}
                onChange={(e) => setSessionRoom(e.target.value)}
                placeholder="Salle principale"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(59,130,246,0.2)',
                  borderRadius: 10,
                  color: '#f8fafc'
                }}
              />
            </div>
          </div>
          
          {/* Détails de l'épreuve sélectionnée */}
          {selectedExamDetails && (
            <div style={{
              marginTop: 20,
              padding: 16,
              background: 'rgba(99,102,241,0.08)',
              borderRadius: 12,
              border: '1px solid rgba(99,102,241,0.2)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <Settings size={14} color="#a5b4fc" />
                <span style={{ color: '#a5b4fc', fontSize: '0.75rem', fontWeight: 600 }}>
                  Configuration de l'épreuve
                </span>
                <span style={{
                  marginLeft: 'auto',
                  padding: '2px 8px',
                  borderRadius: 12,
                  background: `${getStatusColor(selectedExamDetails.status)}20`,
                  color: getStatusColor(selectedExamDetails.status),
                  fontSize: '0.65rem',
                  fontWeight: 600
                }}>
                  {getStatusLabel(selectedExamDetails.status)}
                </span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
                <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                  Option: <span style={{ color: getExamOptionColor(selectedExamDetails.examOption), fontWeight: 600 }}>
                    {getExamOptionLabel(selectedExamDetails.examOption)} ({selectedExamDetails.examOption || 'Non définie'})
                  </span>
                </span>
                {selectedExamDetails.config?.openRange && (
                  <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                    Plage ouverte: {selectedExamDetails.config.requiredQuestions} questions
                  </span>
                )}
                <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                  Séquencement: {selectedExamDetails.config?.sequencing === 'identical' ? 'Identique' : 'Aléatoire'}
                </span>
                <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                  Points: {selectedExamDetails.totalPoints || 0} pts
                </span>
                <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                  Questions: {selectedExamDetails.questionCount || selectedExamDetails.questions?.length || 0}
                </span>
              </div>
            </div>
          )}
          
          <button
            onClick={handleAssign}
            disabled={!selectedExam || !selectedOperator}
            style={{
              marginTop: 20,
              padding: '10px 24px',
              background: !selectedExam || !selectedOperator 
                ? 'rgba(245,158,11,0.3)' 
                : 'linear-gradient(135deg, #f59e0b, #d97706)',
              border: 'none',
              borderRadius: 10,
              color: '#fff',
              fontWeight: 600,
              cursor: !selectedExam || !selectedOperator ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              opacity: !selectedExam || !selectedOperator ? 0.6 : 1
            }}
          >
            <CheckCircle size={18} /> Assigner l'épreuve
          </button>
        </div>

        {/* Épreuves assignées */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ color: '#f8fafc', fontSize: '1.1rem', fontWeight: 600 }}>
            📋 Épreuves assignées ({assignedExams.length})
          </h2>
          <span style={{ fontSize: '0.7rem', color: '#64748b' }}>
            ⏳ Brouillon | ✅ Publiée | 📦 Archivée
          </span>
        </div>
        
        {loading ? (
          <div style={{ textAlign: 'center', padding: 60 }}>
            <RefreshCw size={32} style={{ animation: 'spin 1s linear infinite', color: '#3b82f6' }} />
          </div>
        ) : assignedExams.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#64748b', background: 'rgba(15,23,42,0.5)', borderRadius: 16 }}>
            📭 Aucune épreuve assignée pour le moment
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: 16 }}>
            {assignedExams.map(exam => {
              const operator = operators.find(op => op._id === exam.assignedTo);
              const dateInfo = formatDate(exam.scheduledDate);
              const isDatePassed = dateInfo?.isPassed || false;
              const optionColor = getExamOptionColor(exam.examOption);
              const statusColor = getStatusColor(exam.status);
              
              return (
                <motion.div
                  key={exam._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileHover={{ y: -2 }}
                  style={{
                    background: 'rgba(15,23,42,0.7)',
                    border: `1px solid ${isDatePassed ? 'rgba(239,68,68,0.3)' : `${optionColor}40`}`,
                    borderRadius: 16,
                    padding: 16,
                    transition: 'all 0.2s'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{
                        width: 8, height: 8, borderRadius: '50%',
                        background: statusColor,
                        display: 'inline-block',
                        animation: exam.status === 'published' ? 'pulse 1.5s infinite' : 'none'
                      }} />
                      <span style={{ color: statusColor, fontSize: '0.65rem', fontWeight: 600 }}>
                        {getStatusLabel(exam.status)}
                      </span>
                    </div>
                    <button
                      onClick={() => handleUnassign(exam._id)}
                      style={{
                        padding: '4px 8px',
                        borderRadius: 6,
                        background: 'rgba(239,68,68,0.2)',
                        border: 'none',
                        color: '#ef4444',
                        cursor: 'pointer',
                        fontSize: '0.65rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4
                      }}
                    >
                      <X size={12} /> Désassigner
                    </button>
                  </div>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <h3 style={{ color: '#f8fafc', fontSize: '1rem', fontWeight: 600 }}>{exam.title}</h3>
                      {exam.examOption && (
                        <span style={{
                          fontSize: '0.6rem',
                          padding: '2px 6px',
                          background: `${optionColor}20`,
                          color: optionColor,
                          borderRadius: 4,
                          marginTop: 4,
                          display: 'inline-block'
                        }}>
                          {getExamOptionLabel(exam.examOption)} ({exam.examOption})
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        onClick={() => handlePreview(exam._id)}
                        style={{
                          padding: '4px 8px',
                          borderRadius: 6,
                          background: 'rgba(59,130,246,0.2)',
                          border: '1px solid rgba(59,130,246,0.3)',
                          color: '#60a5fa',
                          cursor: 'pointer',
                          fontSize: '0.65rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4
                        }}
                        title="Aperçu"
                      >
                        <Eye size={12} /> Aperçu
                      </button>
                      {exam.status === 'draft' && (
                        <button
                          onClick={() => handlePublish(exam._id)}
                          style={{
                            padding: '4px 8px',
                            borderRadius: 6,
                            background: 'rgba(16,185,129,0.2)',
                            border: '1px solid rgba(16,185,129,0.3)',
                            color: '#10b981',
                            cursor: 'pointer',
                            fontSize: '0.65rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4
                          }}
                          title="Publier l'épreuve"
                        >
                          <Send size={12} /> Publier
                        </button>
                      )}
                    </div>
                  </div>
                  
                  <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
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
                    {exam.subject && (
                      <span style={{ fontSize: '0.65rem', padding: '2px 6px', background: 'rgba(16,185,129,0.15)', borderRadius: 4, color: '#34d399' }}>
                        <BookOpen size={10} style={{ display: 'inline', marginRight: 2 }} />
                        {exam.subject}
                      </span>
                    )}
                  </div>
                  
                  <div style={{ marginTop: 12, paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                    <p style={{ color: '#94a3b8', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <User size={12} /> Opérateur: {operator?.name || 'Inconnu'}
                    </p>
                    {exam.scheduledDate && (
                      <p style={{ 
                        color: isDatePassed ? '#ef4444' : '#94a3b8', 
                        fontSize: '0.75rem', 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: 6, 
                        marginTop: 4 
                      }}>
                        <Calendar size={12} /> 
                        Date: {dateInfo?.formatted}
                        {isDatePassed && <span style={{ marginLeft: 6, fontSize: '0.65rem' }}>(Dépassée)</span>}
                      </p>
                    )}
                    {exam.sessionRoom && (
                      <p style={{ color: '#94a3b8', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                        <Monitor size={12} /> Salle: {exam.sessionRoom}
                      </p>
                    )}
                    {exam.duration && (
                      <p style={{ color: '#94a3b8', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                        <Timer size={12} /> Durée: {exam.duration} min
                      </p>
                    )}
                  </div>
                  
                  {isDatePassed && (
                    <div style={{ marginTop: 8, padding: 6, background: 'rgba(239,68,68,0.1)', borderRadius: 6 }}>
                      <p style={{ color: '#ef4444', fontSize: '0.65rem', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <AlertCircle size={10} />
                        ⚠️ Date d'assignation dépassée. Veuillez reprogrammer.
                      </p>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}
        
        {/* Épreuves non assignées */}
        <h2 style={{ color: '#f8fafc', fontSize: '1.1rem', fontWeight: 600, margin: '24px 0 16px' }}>
          📚 Épreuves non assignées ({unassignedExams.length})
        </h2>
        
        {unassignedExams.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#64748b', background: 'rgba(15,23,42,0.5)', borderRadius: 16 }}>
            🎉 Toutes les épreuves sont assignées
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: 16 }}>
            {unassignedExams.slice(0, 12).map(exam => (
              <motion.div
                key={exam._id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                whileHover={{ y: -2 }}
                style={{
                  background: 'rgba(15,23,42,0.5)',
                  border: `1px solid ${exam.status === 'draft' ? 'rgba(245,158,11,0.2)' : 'rgba(255,255,255,0.05)'}`,
                  borderRadius: 16,
                  padding: 16,
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onClick={() => setSelectedExam(exam._id)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ color: '#cbd5e1', fontSize: '0.9rem', fontWeight: 500 }}>{exam.title}</h3>
                  {exam.status === 'draft' && (
                    <span style={{
                      fontSize: '0.55rem',
                      padding: '2px 6px',
                      background: 'rgba(245,158,11,0.2)',
                      borderRadius: 4,
                      color: '#f59e0b'
                    }}>
                      Brouillon
                    </span>
                  )}
                </div>
                <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {exam.domain && (
                    <span style={{ fontSize: '0.6rem', padding: '2px 6px', background: 'rgba(59,130,246,0.1)', borderRadius: 4, color: '#60a5fa' }}>
                      {exam.domain}
                    </span>
                  )}
                  {exam.level && (
                    <span style={{ fontSize: '0.6rem', padding: '2px 6px', background: 'rgba(139,92,246,0.1)', borderRadius: 4, color: '#a78bfa' }}>
                      {exam.level}
                    </span>
                  )}
                  {exam.examOption && (
                    <span style={{ fontSize: '0.6rem', padding: '2px 6px', background: 'rgba(245,158,11,0.1)', borderRadius: 4, color: '#f59e0b' }}>
                      Option {exam.examOption}
                    </span>
                  )}
                </div>
                <div style={{ marginTop: 8, fontSize: '0.6rem', color: '#64748b' }}>
                  {exam.questions?.length || 0} questions · {exam.totalPoints || 0} pts
                </div>
              </motion.div>
            ))}
            {unassignedExams.length > 12 && (
              <div style={{
                background: 'rgba(15,23,42,0.5)',
                borderRadius: 16,
                padding: 16,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#64748b'
              }}>
                + {unassignedExams.length - 12} autres épreuves
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AssignExamToOperator;