// src/pages/admin/AssignExamToOperator.jsx - VERSION CORRIGÉE
// ✅ a) Renommage : "ASSIGNER une EPREUVE à une SESSION D'EVALUATION"
// ✅ b) Clarification : les épreuves 'BROUILLON' sont non publiées
// ✅ c) Bouton activé UNIQUEMENT après date/heure renseignée
// ✅ d) Suppression de l'affichage des caractéristiques de configuration (doublon)
// ✅ f) Clarification : La configuration est choisie à la session, pas figée à l'épreuve
// ✅ g) Ajout d'un bouton "Accéder à la Surveillance" après assignation
// ✅ h) Filtrage : liste déroulante affiche UNIQUEMENT les épreuves assignées à l'opérateur

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, RefreshCw, Calendar, User, Monitor, Tag, Layers, 
  CheckCircle, Shield, Users, PlusCircle, X, Clock, BookOpen,
  AlertCircle, Settings, Award, Timer, Send, Eye, ChevronRight, Info
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
  const [isAssigning, setIsAssigning] = useState(false);
  const [lastAssignedExamId, setLastAssignedExamId] = useState(null);

  const isAdmin = hasRole('ADMIN_SYSTEME') || hasRole('ADMIN_DELEGUE');

  // ✅ Configuration des libellés pour les options A à K
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
      case 'draft': return '✏️ Brouillon (non publiée)';
      case 'published': return '✅ Publiée';
      case 'archived': return '📦 Archivée';
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

  // ✅ b) Explication : une épreuve 'BROUILLON' n'est pas encore publiée
  //    Elle ne peut pas être distribuée aux étudiants tant qu'elle n'est pas publiée.
  //    L'administrateur doit d'abord la publier via le bouton "Publier".

  const fixTimezone = (dateString) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return null;
    const timezoneOffset = date.getTimezoneOffset();
    const correctedDate = new Date(date.getTime() - timezoneOffset * 60000);
    return correctedDate.toISOString();
  };

  const formatScheduledDate = (dateString) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return null;
    const options = {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Africa/Douala'
    };
    return date.toLocaleString('fr-FR', options);
  };

  const isValidDate = (dateString) => {
    if (!dateString) return true;
    const selectedDate = new Date(dateString);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const selectedDay = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
    return selectedDay >= today;
  };

  useEffect(() => {
    if (!isAdmin) {
      toast.error('Accès non autorisé');
      navigate('/evaluate');
      return;
    }
    loadData();
  }, []);

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
      
      operatorsData = operatorsData.filter(op => op.status !== 'inactive');
      
      console.log(`[AssignExam] ${examsData.length} épreuves, ${operatorsData.length} opérateurs actifs`);
      
      setExams(examsData);
      setOperators(operatorsData);
      
      if (examsData.length === 0) {
        toast('📚 Aucune épreuve trouvée', { icon: 'ℹ️' });
      }
      if (operatorsData.length === 0) {
        toast('👥 Aucun opérateur actif trouvé', { icon: 'ℹ️' });
      }
      
    } catch (error) {
      console.error('[AssignExam] Erreur chargement:', error);
      toast.error('Erreur chargement des données');
    } finally {
      setLoading(false);
    }
  };

  // ✅ c) Validation : tous les champs requis doivent être remplis
  const isFormValid = () => {
    return selectedExam && selectedOperator && scheduledDate && sessionRoom && !isAssigning;
  };

  const validateAssignment = () => {
    setDateError('');
    
    if (!selectedExam) {
      toast.error('Sélectionnez une épreuve');
      return false;
    }
    
    if (!selectedOperator) {
      toast.error('Sélectionnez un opérateur');
      return false;
    }
    
    if (!scheduledDate) {
      toast.error('Veuillez renseigner la date et l\'horaire de début');
      return false;
    }
    
    if (!sessionRoom) {
      toast.error('Veuillez renseigner la salle');
      return false;
    }
    
    if (!isValidDate(scheduledDate)) {
      const errorMsg = 'Impossible d\'assigner à une date passée. Veuillez sélectionner une date future ou aujourd\'hui.';
      setDateError(errorMsg);
      toast.error(errorMsg);
      return false;
    }
    
    return true;
  };

  const handleAssign = async () => {
    if (!validateAssignment()) return;
    
    setIsAssigning(true);
    try {
      let finalDate = scheduledDate;
      if (scheduledDate) {
        const corrected = fixTimezone(scheduledDate);
        if (corrected) finalDate = corrected;
      } else {
        finalDate = new Date().toISOString();
      }
      
      console.log('[AssignExam] Assignation:', { 
        selectedExam, 
        selectedOperator, 
        scheduledDate: scheduledDate,
        correctedDate: finalDate,
        sessionRoom 
      });
      
      await api.put(`/api/exams/${selectedExam}/assign`, {
        operatorId: selectedOperator,
        scheduledDate: finalDate,
        sessionRoom: sessionRoom
      });
      
      toast.success('✅ Épreuve assignée avec succès');
      setLastAssignedExamId(selectedExam);
      
      // Réinitialiser le formulaire
      setSelectedExam('');
      setSelectedOperator('');
      setScheduledDate('');
      setSessionRoom('Salle principale');
      setDateError('');
      setSelectedExamDetails(null);
      
      loadData();
      
      // ✅ g) Proposer d'aller directement à la surveillance
      toast.success(
        'Épreuve assignée ! Cliquez sur "Accéder à la Surveillance" pour gérer la session.',
        { duration: 5000 }
      );
      
    } catch (error) {
      console.error('[AssignExam] Erreur assignation:', error);
      toast.error(error.response?.data?.message || 'Erreur lors de l\'assignation');
    } finally {
      setIsAssigning(false);
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

  // ✅ g) Navigation directe vers la surveillance
  const goToSurveillance = () => {
    navigate('/surveillance');
  };

  const formatDate = (dateString) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    const now = new Date();
    const isPassed = date < now;
    return {
      formatted: formatScheduledDate(dateString),
      isPassed
    };
  };

  const getMinDate = () => {
    const now = new Date();
    const offset = now.getTimezoneOffset();
    const corrected = new Date(now.getTime() - offset * 60000);
    return corrected.toISOString().slice(0, 16);
  };

  // ✅ h) Filtrer : UNIQUEMENT les épreuves non assignées (disponibles)
  //    Les épreuves assignées apparaissent dans la section "Épreuves assignées"
  const getAvailableExams = () => {
    return exams.filter(e => 
      !e.assignedTo && 
      e.status !== 'archived' &&
      (!searchTerm ||
        e.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.domain?.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  };

  const assignedExams = exams.filter(e => 
    e.assignedTo && 
    e.status !== 'archived' &&
    (!searchTerm ||
      e.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.domain?.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const availableExams = getAvailableExams();

  if (!isAdmin) return null;

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #05071a 0%, #0a0f2e 60%, #05071a 100%)',
      padding: '24px'
    }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
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
            {/* ✅ a) Renommage du titre */}
            <h1 style={{ fontSize: '1.8rem', fontWeight: 700, color: '#f8fafc' }}>
              <Shield size={28} style={{ display: 'inline', marginRight: 12, color: '#f59e0b' }} />
              ASSIGNER une EPREUVE à une SESSION D'EVALUATION
            </h1>
            <p style={{ color: '#64748b' }}>Sélectionnez une épreuve, un opérateur et programmez la session</p>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 12 }}>
            {/* ✅ g) Bouton "Accéder à la Surveillance" */}
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
              onClick={goToSurveillance}
              style={{
                padding: '8px 16px',
                background: 'linear-gradient(135deg, #10b981, #059669)',
                border: 'none',
                borderRadius: 8,
                color: '#fff',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontWeight: 600,
                fontSize: '0.875rem'
              }}
            >
              <Monitor size={16} /> Accéder à la Surveillance
            </motion.button>
            
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

        {/* ✅ Message d'information sur les épreuves BROUILLON */}
        <div style={{
          marginBottom: 16,
          padding: '10px 16px',
          background: 'rgba(245,158,11,0.1)',
          border: '1px solid rgba(245,158,11,0.3)',
          borderRadius: 10,
          display: 'flex',
          alignItems: 'center',
          gap: 8
        }}>
          <Info size={16} color="#f59e0b" />
          <span style={{ color: '#f59e0b', fontSize: '0.8rem' }}>
            💡 Les épreuves marquées <strong>✏️ Brouillon</strong> ne sont pas encore publiées. 
            Un administrateur doit les <strong>publier</strong> avant qu'elles puissent être distribuées.
            Les configurations (A à K) sont choisies <strong>au moment de la session</strong> par le surveillant.
          </span>
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
                Épreuve à assigner *
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
                {availableExams.length === 0 ? (
                  <option value="" disabled style={{ color: '#64748b' }}>
                    ⚠️ Aucune épreuve disponible
                  </option>
                ) : (
                  availableExams.map(exam => (
                    <option key={exam._id} value={exam._id}>
                      {exam.title} {exam.domain ? `(${exam.domain})` : ''}
                      {exam.status === 'draft' && ' ✏️ Brouillon'}
                    </option>
                  ))
                )}
              </select>
              {availableExams.length === 0 && (
                <p style={{ color: '#f59e0b', fontSize: '0.65rem', marginTop: 4 }}>
                  ⚠️ Aucune épreuve non assignée disponible
                </p>
              )}
              {/* ✅ b) Explication du statut BROUILLON */}
              {selectedExamDetails?.status === 'draft' && (
                <div style={{ marginTop: 6, padding: '6px 10px', background: 'rgba(245,158,11,0.1)', borderRadius: 6 }}>
                  <p style={{ color: '#f59e0b', fontSize: '0.65rem' }}>
                    ⚠️ Cette épreuve est en <strong>brouillon</strong>. 
                    Elle doit être <strong>publiée</strong> avant d'être distribuée.
                  </p>
                </div>
              )}
            </div>
            
            <div>
              <label style={{ color: '#94a3b8', fontSize: '0.8rem', marginBottom: 6, display: 'block' }}>
                <Users size={14} style={{ display: 'inline', marginRight: 4 }} />
                Opérateur de surveillance *
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
              {operators.length === 0 && (
                <p style={{ color: '#f59e0b', fontSize: '0.65rem', marginTop: 4 }}>
                  ⚠️ Aucun opérateur actif disponible
                </p>
              )}
            </div>
            
            <div>
              <label style={{ color: '#94a3b8', fontSize: '0.8rem', marginBottom: 6, display: 'block' }}>
                <Calendar size={14} style={{ display: 'inline', marginRight: 4 }} />
                Date et heure de début * ⏰
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
                Salle *
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
          
          {/* ✅ d) Suppression de l'affichage des caractéristiques de configuration */}
          {/*    Elles seront choisies par le surveillant au moment de la session */}
          
          {selectedExamDetails && (
            <div style={{
              marginTop: 20,
              padding: 16,
              background: 'rgba(99,102,241,0.08)',
              borderRadius: 12,
              border: '1px solid rgba(99,102,241,0.2)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <Info size={14} color="#a5b4fc" />
                <span style={{ color: '#a5b4fc', fontSize: '0.75rem', fontWeight: 600 }}>
                  Informations de l'épreuve
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
                  📚 {selectedExamDetails.questions?.length || 0} questions
                </span>
                <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                  ⭐ {selectedExamDetails.totalPoints || 0} pts
                </span>
                <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                  ⏱️ {selectedExamDetails.duration || 60} min
                </span>
                {selectedExamDetails.domain && (
                  <span style={{ fontSize: '0.7rem', color: '#60a5fa' }}>
                    <Tag size={10} style={{ display: 'inline', marginRight: 2 }} />
                    {selectedExamDetails.domain}
                  </span>
                )}
                {selectedExamDetails.level && (
                  <span style={{ fontSize: '0.7rem', color: '#a78bfa' }}>
                    <Layers size={10} style={{ display: 'inline', marginRight: 2 }} />
                    {selectedExamDetails.level}
                  </span>
                )}
              </div>
              {/* ✅ f) Message clarifiant que la configuration est choisie à la session */}
              <div style={{
                marginTop: 8,
                padding: '6px 10px',
                background: 'rgba(59,130,246,0.1)',
                borderRadius: 6,
                fontSize: '0.65rem',
                color: '#60a5fa'
              }}>
                💡 La configuration (A à K) sera choisie par le surveillant lors de la session d'évaluation.
              </div>
            </div>
          )}
          
          {/* ✅ c) Bouton activé UNIQUEMENT si tous les champs sont remplis */}
          <button
            onClick={handleAssign}
            disabled={!isFormValid()}
            style={{
              marginTop: 20,
              padding: '10px 24px',
              background: isFormValid() 
                ? 'linear-gradient(135deg, #f59e0b, #d97706)' 
                : 'rgba(100,116,139,0.3)',
              border: 'none',
              borderRadius: 10,
              color: isFormValid() ? '#fff' : '#94a3b8',
              fontWeight: 600,
              cursor: isFormValid() ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              opacity: isFormValid() ? 1 : 0.6,
              transition: 'all 0.3s ease'
            }}
          >
            <CheckCircle size={18} /> 
            {isAssigning ? 'Assignation en cours...' : "ASSIGNER L'ÉPREUVE À LA SESSION"}
          </button>
          
          {/* ✅ c) Message d'aide si le formulaire est incomplet */}
          {!isFormValid() && selectedExam && (
            <div style={{
              marginTop: 8,
              padding: '6px 10px',
              background: 'rgba(245,158,11,0.1)',
              borderRadius: 6,
              fontSize: '0.65rem',
              color: '#f59e0b'
            }}>
              ⚠️ Veuillez renseigner tous les champs obligatoires (*) pour activer l'assignation.
              {!scheduledDate && ' La date et l\'horaire de début sont requis.'}
            </div>
          )}
        </div>

        {/* ✅ g) Bouton d'accès à la surveillance après assignation */}
        {lastAssignedExamId && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              marginBottom: 24,
              padding: '12px 20px',
              background: 'rgba(16,185,129,0.1)',
              border: '1px solid rgba(16,185,129,0.3)',
              borderRadius: 12,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 12
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <CheckCircle size={20} color="#10b981" />
              <span style={{ color: '#10b981', fontWeight: 600 }}>
                ✅ Épreuve assignée avec succès !
              </span>
            </div>
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
              onClick={goToSurveillance}
              style={{
                padding: '8px 20px',
                background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                border: 'none',
                borderRadius: 8,
                color: '#fff',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontWeight: 600
              }}
            >
              <Monitor size={16} /> Accéder à la Surveillance <ChevronRight size={16} />
            </motion.button>
          </motion.div>
        )}

        {/* Épreuves assignées */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ color: '#f8fafc', fontSize: '1.1rem', fontWeight: 600 }}>
            📋 Épreuves assignées ({assignedExams.length})
          </h2>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <span style={{ fontSize: '0.7rem', color: '#64748b' }}>
              ✏️ Brouillon | ✅ Publiée | 📦 Archivée
            </span>
            <input
              type="text"
              placeholder="Rechercher..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                padding: '6px 12px',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(59,130,246,0.2)',
                borderRadius: 6,
                color: '#f8fafc',
                width: 180,
                fontSize: '0.8rem'
              }}
            />
          </div>
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
          📚 Épreuves disponibles ({availableExams.length})
        </h2>
        
        {availableExams.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#64748b', background: 'rgba(15,23,42,0.5)', borderRadius: 16 }}>
            🎉 Toutes les épreuves sont assignées
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: 16 }}>
            {availableExams.slice(0, 12).map(exam => (
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
                      ✏️ Brouillon
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
                </div>
                <div style={{ marginTop: 8, fontSize: '0.6rem', color: '#64748b' }}>
                  {exam.questions?.length || 0} questions · {exam.totalPoints || 0} pts
                </div>
              </motion.div>
            ))}
            {availableExams.length > 12 && (
              <div style={{
                background: 'rgba(15,23,42,0.5)',
                borderRadius: 16,
                padding: 16,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#64748b'
              }}>
                + {availableExams.length - 12} autres épreuves
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AssignExamToOperator;