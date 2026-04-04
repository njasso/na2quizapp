// src/pages/creation/DatabaseQuizCreation.jsx - Version complète avec chapitre obligatoire et contrôles points/temps
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Database, Save, Trash2, ArrowLeft, Search,
  BookOpen, BookMarked, Loader, AlertCircle, RefreshCw,
  CheckCircle, XCircle, Tag, Layers, Clock, Plus, Eye,
  Settings, ChevronDown, ChevronUp, Award, Timer , 
} from 'lucide-react';
import DOMAIN_DATA, { 
  getAllDomaines, 
  getAllSousDomaines, 
  getAllLevels, 
  getAllMatieres,
  getDomainNom,
  getSousDomaineNom,
  getLevelNom,
  getMatiereNom, 
} from '../../data/domainConfig';
import { getQuestions, createExam } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import ImageUploader from '../../components/ImageUploader';
import toast from 'react-hot-toast';

// Composant d'aperçu de question
const QuestionPreview = ({ question, onClose }) => {
  if (!question) return null;
  const imageSrc = question.imageQuestion || (question.imageBase64?.startsWith('data:') ? question.imageBase64 : null);
  
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
        <h3 style={{ color: '#f8fafc', fontSize: '1.1rem', fontWeight: 600 }}>Aperçu de la question</h3>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}>
          <XCircle size={20} />
        </button>
      </div>
      
      {imageSrc && (
        <div style={{ marginBottom: 16, textAlign: 'center' }}>
          <img src={imageSrc} alt="Illustration" style={{ maxWidth: '100%', maxHeight: 200, borderRadius: 8, objectFit: 'contain' }} />
        </div>
      )}
      
      <p style={{ color: '#f8fafc', fontSize: '1rem', marginBottom: 16 }}>{question.libQuestion}</p>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {question.options.filter(opt => opt.trim()).map((opt, i) => {
          const isCorrect = typeof question.bonOpRep === 'number' 
            ? i === question.bonOpRep 
            : (Array.isArray(question.correctAnswer) ? question.correctAnswer.includes(opt) : opt === question.correctAnswer);
          return (
            <div key={i} style={{
              padding: '8px 12px',
              background: isCorrect ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.02)',
              border: `1px solid ${isCorrect ? '#10b981' : 'rgba(99,102,241,0.2)'}`,
              borderRadius: 8, display: 'flex', alignItems: 'center', gap: 8
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
      
      {question.explanation && (
        <div style={{ marginTop: 12, padding: 8, background: 'rgba(59,130,246,0.05)', borderRadius: 8 }}>
          <p style={{ color: '#64748b', fontSize: '0.8rem' }}>💡 {question.explanation}</p>
        </div>
      )}
      
      <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#64748b', flexWrap: 'wrap', gap: 8 }}>
        <span>📚 Domaine: {question.domaine}</span>
        <span>📁 Sous-domaine: {question.sousDomaine}</span>
        <span>🎓 Niveau: {question.niveau}</span>
        <span>📖 Matière: {question.matiere}</span>
        {question.libChapitre && <span>📑 Chapitre: {question.libChapitre}</span>}
        <span>⏱️ {question.tempsMin} min</span>
        <span>⭐ {question.points} pts</span>
      </div>
      
      <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        <button onClick={onClose} style={{ padding: '6px 12px', background: '#475569', border: 'none', borderRadius: 6, color: '#fff', cursor: 'pointer' }}>
          Fermer
        </button>
      </div>
    </motion.div>
  );
};

const DatabaseQuizCreation = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // États pour les IDs
  const [selectedDomainId, setSelectedDomainId] = useState('');
  const [selectedSousDomaineId, setSelectedSousDomaineId] = useState('');
  const [selectedLevelId, setSelectedLevelId] = useState('');
  const [selectedMatiereId, setSelectedMatiereId] = useState('');
  
  // Noms affichés (résolus)
  const [domainNom, setDomainNom] = useState('');
  const [sousDomaineNom, setSousDomaineNom] = useState('');
  const [levelNom, setLevelNom] = useState('');
  const [matiereNom, setMatiereNom] = useState('');
  const [searchChapitre, setSearchChapitre] = useState('');

  const [examTitle, setExamTitle] = useState('');
  const [examDescription, setExamDescription] = useState('');
  const [availableQuestions, setAvailableQuestions] = useState([]);
  const [selectedQuestions, setSelectedQuestions] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [fetchingQuestions, setFetchingQuestions] = useState(false);
  const [previewQuestion, setPreviewQuestion] = useState(null);
  
  // ✅ Configuration complète avec toutes les variantes
  const [config, setConfig] = useState({
    examOption: 'C',
    openRange: false,
    requiredQuestions: 0,
    sequencing: 'identical',
    allowRetry: false,
    showBinaryResult: false,
    showCorrectAnswer: false,
    timerPerQuestion: true,
    timePerQuestion: 60,
    totalTime: 60,
    pointsType: 'uniform',
    globalPoints: 1,
    timerDisplayMode: 'permanent'
  });
  
  const [advancedOpen, setAdvancedOpen] = useState(false);
  
  // ✅ États pour les avertissements
  const [totalPointsWarning, setTotalPointsWarning] = useState(false);
  const [totalTimeWarning, setTotalTimeWarning] = useState(false);

  // Mettre à jour les noms quand les IDs changent
  useEffect(() => {
    if (selectedDomainId) setDomainNom(getDomainNom(selectedDomainId));
  }, [selectedDomainId]);

  useEffect(() => {
    if (selectedDomainId && selectedSousDomaineId) setSousDomaineNom(getSousDomaineNom(selectedDomainId, selectedSousDomaineId));
  }, [selectedDomainId, selectedSousDomaineId]);

  useEffect(() => {
    if (selectedDomainId && selectedSousDomaineId && selectedLevelId) setLevelNom(getLevelNom(selectedDomainId, selectedSousDomaineId, selectedLevelId));
  }, [selectedDomainId, selectedSousDomaineId, selectedLevelId]);

  useEffect(() => {
    if (selectedDomainId && selectedSousDomaineId && selectedMatiereId) setMatiereNom(getMatiereNom(selectedDomainId, selectedSousDomaineId, selectedMatiereId));
  }, [selectedDomainId, selectedSousDomaineId, selectedMatiereId]);

  // Calcul des totaux
  const totalPoints = config.pointsType === 'uniform'
    ? config.globalPoints * selectedQuestions.length
    : selectedQuestions.reduce((sum, q) => sum + (q.points || 1), 0);
    
  const totalDuration = config.timerPerQuestion
    ? (config.timePerQuestion * selectedQuestions.length) / 60
    : config.totalTime;

  // ✅ Vérification des totaux
  useEffect(() => {
    setTotalPointsWarning(totalPoints > 100 || totalPoints < 10);
    setTotalTimeWarning(totalDuration > 180 || totalDuration < 15);
  }, [totalPoints, totalDuration]);

  // ✅ Fonction d'ajustement des points
  const adjustPointsToTarget = (targetTotalPoints) => {
    if (selectedQuestions.length === 0) {
      toast.error('Aucune question sélectionnée');
      return;
    }
    
    if (config.pointsType === 'uniform') {
      const newGlobalPoints = targetTotalPoints / selectedQuestions.length;
      setConfig({...config, globalPoints: Math.round(newGlobalPoints * 10) / 10});
      toast.success(`Points ajustés : ${Math.round(newGlobalPoints * 10) / 10} point(s) par question`);
    } else {
      const ratio = targetTotalPoints / totalPoints;
      const updatedQuestions = selectedQuestions.map(q => ({
        ...q,
        points: Math.round((q.points * ratio) * 10) / 10
      }));
      setSelectedQuestions(updatedQuestions);
      toast.success(`Points ajustés proportionnellement (ratio: ${ratio.toFixed(2)})`);
    }
  };

  // ✅ Fonction d'ajustement du temps
  const adjustTimeToTarget = (targetTotalMinutes) => {
    if (selectedQuestions.length === 0) {
      toast.error('Aucune question sélectionnée');
      return;
    }
    
    if (config.timerPerQuestion) {
      const newTimePerQuestion = (targetTotalMinutes * 60) / selectedQuestions.length;
      setConfig({...config, timePerQuestion: Math.round(newTimePerQuestion)});
      toast.success(`Temps ajusté : ${Math.round(newTimePerQuestion)} secondes par question`);
    } else {
      setConfig({...config, totalTime: targetTotalMinutes});
      toast.success(`Temps ajusté : ${targetTotalMinutes} minutes totales`);
    }
  };

  // ========== CHARGEMENT DES QUESTIONS ==========
  const loadAvailableQuestions = async () => {
    if (!selectedDomainId || !selectedSousDomaineId || !selectedLevelId || !selectedMatiereId) {
      toast.error('Veuillez sélectionner tous les critères');
      return;
    }

    setFetchingQuestions(true);
    try {
      const resolvedDomainNom = domainNom || getDomainNom(selectedDomainId);
      const resolvedSousDomNom = sousDomaineNom || getSousDomaineNom(selectedDomainId, selectedSousDomaineId);
      const resolvedLevelNom = levelNom || getLevelNom(selectedDomainId, selectedSousDomaineId, selectedLevelId);
      const resolvedMatiereNom = matiereNom || getMatiereNom(selectedDomainId, selectedSousDomaineId, selectedMatiereId);
      
      console.log('🔍 Recherche avec les noms:', {
        domaine: resolvedDomainNom,
        sousDomaine: resolvedSousDomNom,
        niveau: resolvedLevelNom,
        matiere: resolvedMatiereNom
      });
      
      const response = await getQuestions({
  domaine: resolvedDomainNom,
  sousDomaine: resolvedSousDomNom,
  niveau: resolvedLevelNom,
  matiere: resolvedMatiereNom,
  libChapitre: searchChapitre, // ✅ Ajout possible si besoin
  status: 'approved',
  limit: 1000
});

      let allQuestions = [];
      if (Array.isArray(response)) {
        allQuestions = response;
      } else if (response?.data && Array.isArray(response.data)) {
        allQuestions = response.data;
      } else if (response?.questions && Array.isArray(response.questions)) {
        allQuestions = response.questions;
      }

      const normalized = allQuestions.map((q, idx) => ({
        id: q._id || q.id || idx,
        libQuestion: q.libQuestion || q.question || q.text,
        text: q.libQuestion || q.question || q.text,
        question: q.libQuestion || q.question || q.text,
        options: q.options || [],
        correctAnswer: q.correctAnswer || (q.options && typeof q.bonOpRep === 'number' ? q.options[q.bonOpRep] : ''),
        bonOpRep: q.bonOpRep,
        points: q.points || 1,
        explanation: q.explanation || '',
        typeQuestion: q.typeQuestion || (Array.isArray(q.correctAnswer) ? 2 : 1),
        tempsMinParQuestion: q.tempsMinParQuestion || 60,
        tempsMin: q.tempsMin || 1,
        domaine: q.domaine || resolvedDomainNom,
        sousDomaine: q.sousDomaine || resolvedSousDomNom,
        niveau: q.niveau || resolvedLevelNom,
        matiere: q.matiere || resolvedMatiereNom,
        libChapitre: q.libChapitre || '',
        imageQuestion: q.imageQuestion || '',
        imageBase64: q.imageBase64 || '',
        imageMetadata: q.imageMetadata || {},
        matriculeAuteur: q.matriculeAuteur || '',
        dateCrea: q.dateCrea || new Date().toISOString(),
      }));

      setAvailableQuestions(normalized);

      if (normalized.length === 0) {
        toast.error(`Aucune question trouvée pour ${resolvedMatiereNom} (niveau ${resolvedLevelNom})`);
      } else {
        toast.success(`${normalized.length} questions trouvées`);
      }
    } catch (error) {
      console.error('Erreur chargement questions:', error);
      toast.error('Impossible de charger les questions');
    } finally {
      setFetchingQuestions(false);
    }
  };

  // Recharger quand les critères changent
  useEffect(() => {
    if (selectedDomainId && selectedSousDomaineId && selectedLevelId && selectedMatiereId) {
      loadAvailableQuestions();
    } else {
      setAvailableQuestions([]);
    }
  }, [selectedDomainId, selectedSousDomaineId, selectedLevelId, selectedMatiereId]);

  // Filtrer les questions par recherche
  const filteredQuestions = availableQuestions.filter(q =>
    q.libQuestion?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    q.libChapitre?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Ajouter une question
  const addQuestion = (question) => {
    if (!selectedQuestions.some(q => q.id === question.id)) {
      setSelectedQuestions([...selectedQuestions, question]);
      toast.success('Question ajoutée');
    } else {
      toast.error('Question déjà sélectionnée');
    }
  };

  // Retirer une question
  const removeQuestion = (questionId) => {
    setSelectedQuestions(selectedQuestions.filter(q => q.id !== questionId));
    toast.success('Question retirée');
  };

  // Déplacer une question
  const moveQuestionUp = (index) => {
    if (index > 0) {
      const newQuestions = [...selectedQuestions];
      [newQuestions[index], newQuestions[index - 1]] = [newQuestions[index - 1], newQuestions[index]];
      setSelectedQuestions(newQuestions);
    }
  };

  const moveQuestionDown = (index) => {
    if (index < selectedQuestions.length - 1) {
      const newQuestions = [...selectedQuestions];
      [newQuestions[index], newQuestions[index + 1]] = [newQuestions[index + 1], newQuestions[index]];
      setSelectedQuestions(newQuestions);
    }
  };

  // ✅ Sauvegarder l'épreuve avec vérifications
  const saveExam = async () => {
    if (!examTitle || selectedQuestions.length === 0) {
      toast.error('Veuillez donner un titre et sélectionner au moins une question');
      return;
    }

    if (!selectedDomainId || !selectedSousDomaineId || !selectedLevelId || !selectedMatiereId) {
      toast.error('Veuillez sélectionner Domaine, Sous-domaine, Niveau et Matière');
      return;
    }

    if (config.openRange && config.requiredQuestions > selectedQuestions.length) {
      toast.error(`Le nombre de questions à traiter (${config.requiredQuestions}) ne peut pas dépasser le total (${selectedQuestions.length})`);
      return;
    }

    // ✅ Vérification des points
    if (totalPoints > 100) {
      if (!window.confirm(`⚠️ Le total des points (${totalPoints}) dépasse 100. Voulez-vous continuer quand même ?`)) {
        return;
      }
    } else if (totalPoints < 10) {
      if (!window.confirm(`⚠️ Le total des points (${totalPoints}) est inférieur à 10. Voulez-vous continuer quand même ?`)) {
        return;
      }
    }

    // ✅ Vérification du temps
    if (totalDuration > 180) {
      if (!window.confirm(`⚠️ La durée totale (${totalDuration.toFixed(1)} min) dépasse 3 heures. Voulez-vous continuer quand même ?`)) {
        return;
      }
    } else if (totalDuration < 15) {
      if (!window.confirm(`⚠️ La durée totale (${totalDuration.toFixed(1)} min) est inférieure à 15 minutes. Voulez-vous continuer quand même ?`)) {
        return;
      }
    }

    setIsLoading(true);
    try {
      const formattedQuestions = selectedQuestions.map((q, idx) => {
        const validOptions = q.options.filter(opt => opt && opt.trim() !== '');
        
        let points = q.points || 1;
        if (config.pointsType === 'uniform') {
          points = config.globalPoints;
        }
        
        return {
          nQuestion: idx + 1,
          nDomaine: parseInt(selectedDomainId),
          nSousDomaine: parseInt(selectedSousDomaineId),
          niveau: parseInt(selectedLevelId),
          libMatiere: parseInt(selectedMatiereId),
          libChapitre: q.libChapitre || '',
          libQuestion: q.libQuestion,
          imageQuestion: q.imageQuestion || '',
          typeQuestion: q.typeQuestion,
          opRep1: validOptions[0] || '',
          opRep2: validOptions[1] || '',
          opRep3: validOptions[2] || '',
          opRep4: validOptions[3] || '',
          opRep5: validOptions[4] || '',
          bonOpRep: q.bonOpRep !== null ? q.bonOpRep + 1 : null,
          tempsMin: Math.ceil((q.tempsMinParQuestion || 60) / 60),
          tempsMinParQuestion: q.tempsMinParQuestion || 60,
          points: points,
          explanation: q.explanation || '',
          imageBase64: q.imageBase64 || '',
          imageMetadata: q.imageMetadata || {},
          matriculeAuteur: user?.matricule || user?.email || '',
          dateCrea: new Date().toISOString(),
        };
      });

      const totalDurationCalc = config.timerPerQuestion
        ? (config.timePerQuestion * selectedQuestions.length) / 60
        : config.totalTime;

      const totalPointsValue = config.pointsType === 'uniform'
        ? config.globalPoints * selectedQuestions.length
        : selectedQuestions.reduce((sum, q) => sum + (q.points || 1), 0);

      const examData = {
        title: examTitle,
        description: examDescription || `Épreuve créée depuis la base de données - ${matiereNom}`,
        subject: matiereNom,
        level: levelNom,
        domain: domainNom,
        nDomaine: parseInt(selectedDomainId),
        nSousDomaine: parseInt(selectedSousDomaineId),
        niveau: parseInt(selectedLevelId),
        niveauNom: levelNom,
        matiere: parseInt(selectedMatiereId),
        matiereNom: matiereNom,
        questions: formattedQuestions,
        duration: Math.ceil(totalDurationCalc),
        totalPoints: totalPointsValue,
        passingScore: 70,
        createdBy: user?._id || user?.id,
        teacherName: user?.name,
        teacherGrade: user?.role,
        source: 'database',
        status: 'draft',
        examOption: config.examOption,
        config: {
          examOption: config.examOption,
          openRange: config.openRange,
          requiredQuestions: config.requiredQuestions,
          sequencing: config.sequencing,
          allowRetry: config.allowRetry,
          showBinaryResult: config.showBinaryResult,
          showCorrectAnswer: config.showCorrectAnswer,
          timerPerQuestion: config.timerPerQuestion,
          timePerQuestion: config.timePerQuestion,
          totalTime: config.totalTime,
          pointsType: config.pointsType,
          globalPoints: config.globalPoints,
          timerDisplayMode: config.timerDisplayMode
        }
      };
      
      const response = await createExam(examData);

      if (response.success !== false) {
        toast.success('Épreuve créée avec succès!');
        navigate('/exams');
      } else {
        throw new Error(response.error || 'Erreur lors de la création');
      }
    } catch (error) {
      console.error('Erreur création examen:', error);
      toast.error(error.message || 'Erreur lors de la création');
    } finally {
      setIsLoading(false);
    }
  };

  // Composant QuestionCard avec affichage du chapitre
  const QuestionCard = ({ question, onSelect, onRemove, isSelected, onPreview }) => {
    const imageSrc = question.imageQuestion || (question.imageBase64?.startsWith('data:') ? question.imageBase64 : null);
    
    return (
      <motion.div
        layout
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        whileHover={{ y: -2 }}
        style={{
          background: isSelected ? 'rgba(16,185,129,0.1)' : 'rgba(15,23,42,0.7)',
          backdropFilter: 'blur(12px)',
          border: `1px solid ${isSelected ? '#10b981' : 'rgba(99,102,241,0.2)'}`,
          borderRadius: 16,
          padding: 16,
          marginBottom: 12,
          position: 'relative'
        }}
      >
        {isSelected && (
          <div style={{
            position: 'absolute', top: 8, right: 8,
            background: '#10b981', borderRadius: '50%',
            width: 20, height: 20, display: 'flex',
            alignItems: 'center', justifyContent: 'center'
          }}>
            <CheckCircle size={12} color="white" />
          </div>
        )}
        
        {imageSrc && (
          <div style={{ marginBottom: 8 }}>
            <img src={imageSrc} alt="Illustration" style={{ maxWidth: '100%', maxHeight: 60, borderRadius: 4, objectFit: 'contain' }} />
          </div>
        )}
        
        <p style={{ color: '#f8fafc', fontSize: '0.9rem', marginBottom: 8 }}>
          {question.libQuestion.length > 100 ? question.libQuestion.substring(0, 100) + '...' : question.libQuestion}
          {question.typeQuestion === 2 && (
            <span style={{ color: '#f59e0b', marginLeft: 6 }}>(Multiple)</span>
          )}
        </p>
        
        {/* ✅ Affichage du chapitre */}
        {question.libChapitre && (
          <div style={{ marginBottom: 8 }}>
            <span style={{
              fontSize: '0.6rem', padding: '2px 8px',
              background: 'rgba(139,92,246,0.15)', borderRadius: 4,
              color: '#a78bfa', display: 'inline-flex', alignItems: 'center', gap: 4
            }}>
              📑 {question.libChapitre}
            </span>
          </div>
        )}
        
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
          {question.options.filter(opt => opt.trim()).slice(0, 4).map((opt, i) => {
            const isCorrect = typeof question.bonOpRep === 'number' 
              ? i === question.bonOpRep 
              : (Array.isArray(question.correctAnswer) && question.correctAnswer.includes(opt));
            return (
              <span key={i} style={{
                padding: '2px 6px',
                background: isCorrect ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.03)',
                borderRadius: 4,
                color: isCorrect ? '#10b981' : '#94a3b8',
                fontSize: '0.7rem'
              }}>
                {String.fromCharCode(65 + i)}: {opt.length > 15 ? opt.substring(0, 15) + '...' : opt}
              </span>
            );
          })}
          {question.options.filter(opt => opt.trim()).length > 4 && (
            <span style={{ fontSize: '0.6rem', color: '#64748b' }}>+{question.options.filter(opt => opt.trim()).length - 4}</span>
          )}
        </div>
        
        <div style={{ display: 'flex', gap: 8, marginBottom: 8, fontSize: '0.6rem', color: '#64748b', flexWrap: 'wrap' }}>
          <span>🎓 {question.niveau}</span>
          <span>📖 {question.matiere}</span>
          <span>⭐ {question.points} pts</span>
          <span>⏱️ {question.tempsMinParQuestion}s</span>
        </div>
        
        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
          <button
            onClick={(e) => { e.stopPropagation(); onPreview(question); }}
            style={{
              padding: '4px 8px',
              background: 'rgba(59,130,246,0.2)',
              border: 'none',
              borderRadius: 4,
              color: '#3b82f6',
              cursor: 'pointer',
              fontSize: '0.7rem',
              display: 'flex',
              alignItems: 'center',
              gap: 4
            }}
          >
            <Eye size={12} /> Aperçu
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onSelect(question); }}
            style={{
              padding: '4px 8px',
              background: isSelected ? '#ef4444' : '#10b981',
              border: 'none',
              borderRadius: 4,
              color: 'white',
              cursor: 'pointer',
              fontSize: '0.7rem',
              display: 'flex',
              alignItems: 'center',
              gap: 4
            }}
          >
            {isSelected ? <Trash2 size={12} /> : <Plus size={12} />}
            {isSelected ? 'Retirer' : 'Ajouter'}
          </button>
        </div>
      </motion.div>
    );
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #05071a 0%, #0a0f2e 60%, #05071a 100%)',
      padding: '24px'
    }}>
      <div style={{
        position: 'fixed', inset: 0,
        backgroundImage: 'linear-gradient(rgba(99,102,241,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.03) 1px, transparent 1px)',
        backgroundSize: '40px 40px', pointerEvents: 'none', zIndex: 0
      }} />

      <main style={{ position: 'relative', zIndex: 1, maxWidth: 1400, margin: '0 auto' }}>
        {/* En-tête */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate(-1)}
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
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '4px 12px', background: 'rgba(99,102,241,0.1)',
              border: '1px solid rgba(99,102,241,0.3)', borderRadius: 20,
              marginBottom: 8
            }}>
              <Database size={14} color="#6366f1" />
              <span style={{ color: '#a5b4fc', fontSize: '0.7rem', fontWeight: 600 }}>
                BASE DE DONNÉES
              </span>
            </div>
            <h1 style={{ fontSize: '2rem', fontWeight: 700, color: '#f8fafc' }}>
              Créer depuis la base
            </h1>
            <p style={{ color: '#64748b' }}>Sélectionnez des questions validées depuis votre base de données</p>
          </div>
        </div>

        {/* Configuration Panel - 3 colonnes */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 24 }}>

          {/* Colonne 1: Configuration */}
          <div style={{
            background: 'rgba(15,23,42,0.7)', backdropFilter: 'blur(12px)',
            border: '1px solid rgba(99,102,241,0.2)', borderRadius: 24, padding: 24
          }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 600, color: '#f8fafc', marginBottom: 20 }}>
              Configuration de l'épreuve
            </h2>

            <div style={{ marginBottom: 16 }}>
              <label style={{ color: '#94a3b8', fontSize: '0.8rem', marginBottom: 6, display: 'block' }}>
                <BookOpen size={14} style={{ display: 'inline', marginRight: 4 }} />
                Titre de l'épreuve *
              </label>
              <input
                type="text"
                value={examTitle}
                onChange={(e) => setExamTitle(e.target.value)}
                placeholder="Ex: Management de Projet - Examen"
                style={{
                  width: '100%', padding: 12,
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(99,102,241,0.2)', borderRadius: 10,
                  color: '#f8fafc', outline: 'none'
                }}
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ color: '#94a3b8', fontSize: '0.8rem', marginBottom: 6, display: 'block' }}>
                Description
              </label>
              <textarea
                value={examDescription}
                onChange={(e) => setExamDescription(e.target.value)}
                rows={2}
                placeholder="Description de l'épreuve..."
                style={{
                  width: '100%', padding: 12,
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(99,102,241,0.2)', borderRadius: 10,
                  color: '#f8fafc', outline: 'none', resize: 'vertical'
                }}
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ color: '#94a3b8', fontSize: '0.8rem', marginBottom: 6, display: 'block' }}>
                Domaine *
              </label>
              <select
                value={selectedDomainId}
                onChange={(e) => {
                  setSelectedDomainId(e.target.value);
                  setSelectedSousDomaineId('');
                  setSelectedLevelId('');
                  setSelectedMatiereId('');
                }}
                style={{
                  width: '100%', padding: 12,
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(99,102,241,0.2)', borderRadius: 10,
                  color: '#f8fafc', outline: 'none'
                }}
              >
                <option value="">Sélectionner...</option>
                {getAllDomaines().map(d => (
                  <option key={d.id} value={d.id}>{d.id} - {d.nom}</option>
                ))}
              </select>
            </div>

            {selectedDomainId && (
              <div style={{ marginBottom: 16 }}>
                <label style={{ color: '#94a3b8', fontSize: '0.8rem', marginBottom: 6, display: 'block' }}>
                  Sous-domaine *
                </label>
                <select
                  value={selectedSousDomaineId}
                  onChange={(e) => {
                    setSelectedSousDomaineId(e.target.value);
                    setSelectedLevelId('');
                    setSelectedMatiereId('');
                  }}
                  style={{
                    width: '100%', padding: 12,
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(99,102,241,0.2)', borderRadius: 10,
                    color: '#f8fafc', outline: 'none'
                  }}
                >
                  <option value="">Sélectionner...</option>
                  {getAllSousDomaines(selectedDomainId).map(sd => (
                    <option key={sd.id} value={sd.id}>{sd.id} - {sd.nom}</option>
                  ))}
                </select>
              </div>
            )}

            {selectedSousDomaineId && (
              <>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ color: '#94a3b8', fontSize: '0.8rem', marginBottom: 6, display: 'block' }}>
                    Niveau *
                  </label>
                  <select
                    value={selectedLevelId}
                    onChange={(e) => setSelectedLevelId(e.target.value)}
                    style={{
                      width: '100%', padding: 12,
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(99,102,241,0.2)', borderRadius: 10,
                      color: '#f8fafc', outline: 'none'
                    }}
                  >
                    <option value="">Sélectionner...</option>
                    {getAllLevels(selectedDomainId, selectedSousDomaineId).map(l => (
                      <option key={l.id} value={l.id}>{l.id} - {l.nom}</option>
                    ))}
                  </select>
                </div>

                <div style={{ marginBottom: 16 }}>
                  <label style={{ color: '#94a3b8', fontSize: '0.8rem', marginBottom: 6, display: 'block' }}>
                    Matière *
                  </label>
                  <select
                    value={selectedMatiereId}
                    onChange={(e) => setSelectedMatiereId(e.target.value)}
                    style={{
                      width: '100%', padding: 12,
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(99,102,241,0.2)', borderRadius: 10,
                      color: '#f8fafc', outline: 'none'
                    }}
                  >
                    <option value="">Sélectionner...</option>
                    {getAllMatieres(selectedDomainId, selectedSousDomaineId).map(m => (
                      <option key={m.id} value={m.id}>{m.id} - {m.nom}</option>
                    ))}
                  </select>
                </div>
              </>
            )}

            {/* Affichage des noms sélectionnés */}
            {(domainNom || sousDomaineNom || levelNom || matiereNom) && (
              <div style={{ marginTop: 12, padding: 8, background: 'rgba(99,102,241,0.05)', borderRadius: 8, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                {domainNom && <span style={{ fontSize: '0.7rem', color: '#a78bfa' }}>Domaine: {domainNom}</span>}
                {sousDomaineNom && <span style={{ fontSize: '0.7rem', color: '#a78bfa' }}>Sous-domaine: {sousDomaineNom}</span>}
                {levelNom && <span style={{ fontSize: '0.7rem', color: '#a78bfa' }}>Niveau: {levelNom}</span>}
                {matiereNom && <span style={{ fontSize: '0.7rem', color: '#a78bfa' }}>Matière: {matiereNom}</span>}
              </div>
            )}

            {/* Paramètres avancés */}
            <div style={{ marginTop: 16, borderTop: '1px solid rgba(99,102,241,0.2)', paddingTop: 16 }}>
              <button
                onClick={() => setAdvancedOpen(!advancedOpen)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  background: 'none', border: 'none', color: '#94a3b8',
                  fontSize: '0.85rem', cursor: 'pointer', width: '100%',
                  justifyContent: 'space-between', padding: '8px 0'
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Settings size={14} /> Paramètres d'évaluation
                </span>
                {advancedOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>

              {advancedOpen && (
                <div style={{ marginTop: 12 }}>
                  {/* Option d'examen */}
                  <div style={{ marginBottom: 12 }}>
                    <label style={{ color: '#94a3b8', fontSize: '0.75rem', marginBottom: 4, display: 'block' }}>
                      Option d'examen
                    </label>
                    <select
                      value={config.examOption}
                      onChange={(e) => setConfig({...config, examOption: e.target.value})}
                      style={{
                        width: '100%', padding: 8,
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(99,102,241,0.2)', borderRadius: 8,
                        color: '#f8fafc'
                      }}
                    >
                      <option value="A">A - Collective Figée (superviseur contrôle)</option>
                      <option value="B">B - Collective Souple (démarrage synchro)</option>
                      <option value="C">C - Personnalisée (libre navigation)</option>
                      <option value="D">D - Aléatoire (questions mélangées)</option>
                    </select>
                  </div>

                  {/* Plage ouverte */}
                  <div style={{ marginBottom: 12 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <input
                        type="checkbox"
                        checked={config.openRange}
                        onChange={(e) => setConfig({...config, openRange: e.target.checked})}
                      />
                      <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>Plage ouverte (l'étudiant choisit les questions)</span>
                    </label>
                    {config.openRange && (
                      <input
                        type="number"
                        min="1"
                        max={selectedQuestions.length || 10}
                        value={config.requiredQuestions}
                        onChange={(e) => setConfig({...config, requiredQuestions: parseInt(e.target.value) || 0})}
                        placeholder="Nombre de questions à traiter"
                        style={{
                          width: '100%', padding: 8, marginTop: 6,
                          background: 'rgba(255,255,255,0.05)',
                          border: '1px solid rgba(99,102,241,0.2)', borderRadius: 8,
                          color: '#f8fafc'
                        }}
                      />
                    )}
                  </div>

                  {/* Séquencement */}
                  <div style={{ marginBottom: 12 }}>
                    <label style={{ color: '#94a3b8', fontSize: '0.75rem', marginBottom: 4, display: 'block' }}>
                      Séquencement des questions
                    </label>
                    <select
                      value={config.sequencing}
                      onChange={(e) => setConfig({...config, sequencing: e.target.value})}
                      style={{
                        width: '100%', padding: 8,
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(99,102,241,0.2)', borderRadius: 8,
                        color: '#f8fafc'
                      }}
                    >
                      <option value="identical">Identique pour tous</option>
                      <option value="randomPerStudent">Aléatoire par étudiant</option>
                    </select>
                  </div>

                  {/* Reprise */}
                  <div style={{ marginBottom: 12 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <input
                        type="checkbox"
                        checked={config.allowRetry}
                        onChange={(e) => setConfig({...config, allowRetry: e.target.checked})}
                      />
                      <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>Autoriser une reprise après échec</span>
                    </label>
                  </div>

                  <div style={{ marginBottom: 12 }}>
  <label style={{ color: '#94a3b8', fontSize: '0.75rem', marginBottom: 4, display: 'block' }}>
    Feedback après chaque question
  </label>
  <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
    <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <input
        type="radio"
        name="feedbackType"
        checked={!config.showBinaryResult && !config.showCorrectAnswer}
        onChange={() => setConfig({
          ...config, 
          showBinaryResult: false, 
          showCorrectAnswer: false
        })}
      />
      <span style={{ fontSize: '0.7rem' }}>Aucun résultat immédiat</span>
    </label>
    <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <input
        type="radio"
        name="feedbackType"
        checked={config.showBinaryResult && !config.showCorrectAnswer}
        onChange={() => setConfig({
          ...config, 
          showBinaryResult: true, 
          showCorrectAnswer: false
        })}
      />
      <span style={{ fontSize: '0.7rem' }}>Résultat binaire (bon/mauvais)</span>
    </label>
    <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <input
        type="radio"
        name="feedbackType"
        checked={config.showBinaryResult && config.showCorrectAnswer}
        onChange={() => setConfig({
          ...config, 
          showBinaryResult: true, 
          showCorrectAnswer: true
        })}
      />
      <span style={{ fontSize: '0.7rem' }}>Résultat binaire + Bonne réponse</span>
    </label>
  </div>
  <p style={{ fontSize: '0.65rem', color: '#64748b', marginTop: 6 }}>
    💡 L'explication détaillée sera disponible dans la version Didacticiel
  </p>
</div>

                  {/* Chronomètre */}
                  <div style={{ marginBottom: 12 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <input
                        type="checkbox"
                        checked={config.timerPerQuestion}
                        onChange={(e) => setConfig({...config, timerPerQuestion: e.target.checked})}
                      />
                      <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>Chronomètre par question</span>
                    </label>
                    {config.timerPerQuestion ? (
                      <input
                        type="number"
                        min="5"
                        max="300"
                        value={config.timePerQuestion}
                        onChange={(e) => setConfig({...config, timePerQuestion: parseInt(e.target.value) || 60})}
                        placeholder="Secondes par question"
                        style={{
                          width: '100%', padding: 8, marginTop: 6,
                          background: 'rgba(255,255,255,0.05)',
                          border: '1px solid rgba(99,102,241,0.2)', borderRadius: 8,
                          color: '#f8fafc'
                        }}
                      />
                    ) : (
                      <input
                        type="number"
                        min="1"
                        max="300"
                        value={config.totalTime}
                        onChange={(e) => setConfig({...config, totalTime: parseInt(e.target.value) || 60})}
                        placeholder="Minutes totales"
                        style={{
                          width: '100%', padding: 8, marginTop: 6,
                          background: 'rgba(255,255,255,0.05)',
                          border: '1px solid rgba(99,102,241,0.2)', borderRadius: 8,
                          color: '#f8fafc'
                        }}
                      />
                    )}
                  </div>

                  {/* Type de points */}
                  <div style={{ marginBottom: 12 }}>
                    <label style={{ color: '#94a3b8', fontSize: '0.75rem', marginBottom: 4, display: 'block' }}>
                      <Award size={12} style={{ display: 'inline', marginRight: 4 }} />
                      Attribution des points
                    </label>
                    <div style={{ display: 'flex', gap: 16, marginBottom: 8 }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <input
                          type="radio"
                          name="pointsType"
                          checked={config.pointsType === 'uniform'}
                          onChange={() => setConfig({...config, pointsType: 'uniform'})}
                        />
                        <span style={{ fontSize: '0.7rem' }}>Uniforme (même points pour toutes les questions)</span>
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <input
                          type="radio"
                          name="pointsType"
                          checked={config.pointsType === 'variable'}
                          onChange={() => setConfig({...config, pointsType: 'variable'})}
                        />
                        <span style={{ fontSize: '0.7rem' }}>Variable (points individuels par question)</span>
                      </label>
                    </div>
                    {config.pointsType === 'uniform' && (
                      <input
                        type="number"
                        min="0.5"
                        max="10"
                        step="0.5"
                        value={config.globalPoints}
                        onChange={(e) => setConfig({...config, globalPoints: parseFloat(e.target.value) || 1})}
                        placeholder="Points par question"
                        style={{
                          width: '100%', padding: 8,
                          background: 'rgba(255,255,255,0.05)',
                          border: '1px solid rgba(99,102,241,0.2)', borderRadius: 8,
                          color: '#f8fafc'
                        }}
                      />
                    )}
                  </div>

                  {/* Mode d'affichage du chronomètre */}
                  <div style={{ marginBottom: 12 }}>
                    <label style={{ color: '#94a3b8', fontSize: '0.75rem', marginBottom: 4, display: 'block' }}>
                      <Timer size={12} style={{ display: 'inline', marginRight: 4 }} />
                      Affichage du chronomètre
                    </label>
                    <select
                      value={config.timerDisplayMode}
                      onChange={(e) => setConfig({...config, timerDisplayMode: e.target.value})}
                      style={{
                        width: '100%', padding: 8,
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(99,102,241,0.2)', borderRadius: 8,
                        color: '#f8fafc'
                      }}
                    >
                      <option value="once">1 fois (début de l'épreuve)</option>
                      <option value="twice">2 fois (début et fin)</option>
                      <option value="fourTimes">4 fois (début, 1/4, mi, 3/4)</option>
                      <option value="permanent">Permanent (toujours visible)</option>
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* Résumé de la configuration avec avertissements */}
            <div style={{ marginTop: 16, padding: 12, background: 'rgba(99,102,241,0.05)', borderRadius: 8 }}>
              <p style={{ fontSize: '0.65rem', color: '#64748b', marginBottom: 4 }}>
                📋 Résumé de la configuration
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, fontSize: '0.6rem' }}>
                <span style={{ color: '#a5b4fc' }}>Option {config.examOption}</span>
                {config.openRange && <span style={{ color: '#f59e0b' }}>Plage ouverte ({config.requiredQuestions} req.)</span>}
                <span style={{ color: '#10b981' }}>{config.pointsType === 'uniform' ? `Points: ${config.globalPoints}` : 'Points variables'}</span>
                <span style={{ color: '#8b5cf6' }}>Chrono: {config.timerDisplayMode === 'permanent' ? 'permanent' : config.timerDisplayMode === 'once' ? '1x' : config.timerDisplayMode === 'twice' ? '2x' : '4x'}</span>
              </div>
            </div>

            {/* ✅ Avertissements points et temps */}
            {totalPointsWarning && (
              <div style={{ marginTop: 12, padding: 10, background: 'rgba(245,158,11,0.1)', borderRadius: 8 }}>
                <p style={{ color: '#f59e0b', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <AlertCircle size={12} />
                  ⚠️ Total points: {totalPoints} pts {totalPoints > 100 ? '(>100 recommandé)' : totalPoints < 10 ? '(<10 recommandé)' : ''}
                  <button 
                    onClick={() => adjustPointsToTarget(totalPoints > 100 ? 100 : 50)}
                    style={{ marginLeft: 'auto', padding: '2px 10px', background: '#f59e0b', border: 'none', borderRadius: 4, color: '#fff', fontSize: '0.6rem', cursor: 'pointer' }}
                  >
                    Ajuster à {totalPoints > 100 ? '100' : '50'} pts
                  </button>
                </p>
              </div>
            )}

            {totalTimeWarning && (
              <div style={{ marginTop: 8, padding: 10, background: 'rgba(245,158,11,0.1)', borderRadius: 8 }}>
                <p style={{ color: '#f59e0b', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <Clock size={12} />
                  ⚠️ Durée totale: {totalDuration.toFixed(1)} min {totalDuration > 180 ? '(>180 min recommandé)' : totalDuration < 15 ? '(<15 min recommandé)' : ''}
                  <button 
                    onClick={() => adjustTimeToTarget(totalDuration > 180 ? 120 : 60)}
                    style={{ marginLeft: 'auto', padding: '2px 10px', background: '#f59e0b', border: 'none', borderRadius: 4, color: '#fff', fontSize: '0.6rem', cursor: 'pointer' }}
                  >
                    Ajuster à {totalDuration > 180 ? '120' : '60'} min
                  </button>
                </p>
              </div>
            )}

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={saveExam}
              disabled={isLoading}
              style={{
                width: '100%', padding: 14, marginTop: 16,
                background: isLoading ? 'rgba(16,185,129,0.3)' : 'linear-gradient(135deg, #10b981, #059669)',
                border: 'none', borderRadius: 12, color: 'white',
                fontWeight: 600, display: 'flex', alignItems: 'center',
                justifyContent: 'center', gap: 8, cursor: isLoading ? 'not-allowed' : 'pointer'
              }}
            >
              {isLoading ? (
                <><Loader size={16} className="animate-spin" /> Enregistrement...</>
              ) : (
                <><Save size={16} /> Créer l'épreuve</>
              )}
            </motion.button>
          </div>

          {/* Colonne 2: Questions disponibles */}
          <div style={{
            background: 'rgba(15,23,42,0.7)', backdropFilter: 'blur(12px)',
            border: '1px solid rgba(99,102,241,0.2)', borderRadius: 24, padding: 24
          }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 600, color: '#f8fafc', marginBottom: 20 }}>
              Questions disponibles
              {availableQuestions.length > 0 && (
                <span style={{ marginLeft: 8, fontSize: '0.8rem', color: '#a5b4fc' }}>
                  ({availableQuestions.length})
                </span>
              )}
            </h2>

            <div style={{ position: 'relative', marginBottom: 16 }}>
              <Search size={16} style={{ position: 'absolute', left: 12, top: 12, color: '#64748b' }} />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Rechercher par mot-clé ou chapitre..."
                style={{
                  width: '100%', padding: '10px 12px 10px 40px',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(99,102,241,0.2)', borderRadius: 10,
                  color: '#f8fafc', outline: 'none'
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <p style={{ color: '#64748b', fontSize: '0.7rem' }}>
                {filteredQuestions.length} question(s) trouvée(s)
              </p>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={loadAvailableQuestions}
                disabled={!selectedDomainId || !selectedSousDomaineId || !selectedLevelId || !selectedMatiereId}
                style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  padding: '4px 8px',
                  background: 'rgba(59,130,246,0.2)',
                  border: '1px solid rgba(59,130,246,0.3)',
                  borderRadius: 6,
                  color: '#3b82f6',
                  fontSize: '0.7rem',
                  cursor: (!selectedDomainId || !selectedSousDomaineId || !selectedLevelId || !selectedMatiereId) ? 'not-allowed' : 'pointer',
                  opacity: (!selectedDomainId || !selectedSousDomaineId || !selectedLevelId || !selectedMatiereId) ? 0.5 : 1
                }}
              >
                <RefreshCw size={12} /> Actualiser
              </motion.button>
            </div>

            {fetchingQuestions ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
                <Loader size={32} color="#6366f1" className="animate-spin" />
              </div>
            ) : !selectedDomainId || !selectedSousDomaineId || !selectedLevelId || !selectedMatiereId ? (
              <div style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>
                <Database size={32} style={{ marginBottom: 12, opacity: 0.3 }} />
                <p>Sélectionnez tous les critères</p>
                <p style={{ fontSize: '0.7rem' }}>Domaine, Sous-domaine, Niveau et Matière</p>
              </div>
            ) : filteredQuestions.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>
                <AlertCircle size={32} style={{ marginBottom: 12 }} />
                <p>Aucune question trouvée</p>
                <p style={{ fontSize: '0.7rem' }}>Vérifiez que des questions ont été validées pour ces critères</p>
              </div>
            ) : (
              <div style={{ maxHeight: 500, overflowY: 'auto', paddingRight: 8 }}>
                {filteredQuestions.map(q => (
                  <QuestionCard
                    key={q.id}
                    question={q}
                    onSelect={addQuestion}
                    onRemove={removeQuestion}
                    isSelected={selectedQuestions.some(sq => sq.id === q.id)}
                    onPreview={setPreviewQuestion}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Colonne 3: Questions sélectionnées */}
          <div style={{
            background: 'rgba(15,23,42,0.7)', backdropFilter: 'blur(12px)',
            border: '1px solid rgba(99,102,241,0.2)', borderRadius: 24, padding: 24
          }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 600, color: '#f8fafc', marginBottom: 20 }}>
              Questions sélectionnées ({selectedQuestions.length})
            </h2>

            {selectedQuestions.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 60, color: '#64748b' }}>
                <BookMarked size={32} style={{ marginBottom: 12, opacity: 0.3 }} />
                <p>Aucune question sélectionnée</p>
                <p style={{ fontSize: '0.7rem' }}>Cliquez sur "Ajouter" depuis la liste de gauche</p>
              </div>
            ) : (
              <div style={{ maxHeight: 500, overflowY: 'auto', paddingRight: 8 }}>
                {selectedQuestions.map((q, idx) => {
                  const imageSrc = q.imageQuestion || (q.imageBase64?.startsWith('data:') ? q.imageBase64 : null);
                  return (
                    <div key={q.id} style={{
                      background: 'rgba(16,185,129,0.05)',
                      border: '1px solid rgba(16,185,129,0.2)',
                      borderRadius: 12, padding: 12, marginBottom: 12
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{
                          width: 28, height: 28, borderRadius: 6, background: '#10b981',
                          color: 'white', display: 'flex', alignItems: 'center',
                          justifyContent: 'center', fontSize: '0.7rem', fontWeight: 600,
                          cursor: 'pointer'
                        }}
                        onClick={() => moveQuestionUp(idx)}
                        >
                          ↑
                        </span>
                        <span style={{
                          width: 28, height: 28, borderRadius: 6, background: '#10b981',
                          color: 'white', display: 'flex', alignItems: 'center',
                          justifyContent: 'center', fontSize: '0.7rem', fontWeight: 600,
                          cursor: 'pointer'
                        }}
                        onClick={() => moveQuestionDown(idx)}
                        >
                          ↓
                        </span>
                        <div style={{ flex: 1 }}>
                          {imageSrc && (
                            <img src={imageSrc} alt="Illustration" style={{ maxWidth: '100%', maxHeight: 40, borderRadius: 4, objectFit: 'contain', marginBottom: 4 }} />
                          )}
                          <p style={{ color: '#f8fafc', fontSize: '0.85rem' }}>
                            <strong style={{ color: '#f59e0b' }}>{idx + 1}.</strong> {q.libQuestion.length > 60 ? q.libQuestion.substring(0, 60) + '...' : q.libQuestion}
                            {q.typeQuestion === 2 && <span style={{ color: '#f59e0b' }}> (Multiple)</span>}
                          </p>
                          {q.libChapitre && (
                            <div style={{ marginTop: 4 }}>
                              <span style={{ fontSize: '0.6rem', padding: '2px 8px', background: 'rgba(139,92,246,0.15)', borderRadius: 4, color: '#a78bfa' }}>
                                📑 {q.libChapitre}
                              </span>
                            </div>
                          )}
                          <div style={{ marginTop: 4, display: 'flex', gap: 8, fontSize: '0.6rem', color: '#64748b' }}>
                            <span>⭐ {config.pointsType === 'uniform' ? config.globalPoints : q.points} pts</span>
                            <span>⏱️ {q.tempsMinParQuestion}s</span>
                          </div>
                        </div>
                        <button
                          onClick={() => removeQuestion(q.id)}
                          style={{
                            padding: 6, background: 'rgba(239,68,68,0.1)',
                            border: '1px solid rgba(239,68,68,0.3)', borderRadius: 6,
                            color: '#ef4444', cursor: 'pointer'
                          }}
                        >
                          <Trash2 size={14} />
                        </button>
                        <button
                          onClick={() => setPreviewQuestion(q)}
                          style={{
                            padding: 6, background: 'rgba(59,130,246,0.1)',
                            border: '1px solid rgba(59,130,246,0.3)', borderRadius: 6,
                            color: '#3b82f6', cursor: 'pointer'
                          }}
                        >
                          <Eye size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
                
                {/* Résumé avec points variables/uniformes et avertissements */}
                <div style={{
                  marginTop: 16, padding: 12, background: 'rgba(255,255,255,0.02)',
                  borderRadius: 12, border: '1px solid rgba(99,102,241,0.1)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ color: '#94a3b8' }}>Total points</span>
                    <span style={{ color: totalPointsWarning ? '#f59e0b' : '#f59e0b', fontWeight: 600 }}>{totalPoints}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ color: '#94a3b8' }}>Durée totale</span>
                    <span style={{ color: totalTimeWarning ? '#f59e0b' : '#8b5cf6', fontWeight: 600 }}>{totalDuration.toFixed(1)} min</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#94a3b8' }}>Questions</span>
                    <span style={{ color: '#10b981', fontWeight: 600 }}>{selectedQuestions.length}</span>
                  </div>
                  {config.openRange && config.requiredQuestions > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, paddingTop: 8, borderTop: '1px solid rgba(99,102,241,0.2)' }}>
                      <span style={{ color: '#f59e0b' }}>À traiter</span>
                      <span style={{ color: '#f59e0b', fontWeight: 600 }}>{config.requiredQuestions}</span>
                    </div>
                  )}
                  {config.pointsType === 'variable' && (
                    <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid rgba(99,102,241,0.2)', fontSize: '0.65rem', color: '#64748b' }}>
                      ℹ️ Points variables : chaque question a son propre coefficient
                    </div>
                  )}
                  {(totalPointsWarning || totalTimeWarning) && (
                    <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid rgba(99,102,241,0.2)', fontSize: '0.6rem', color: '#f59e0b' }}>
                      ⚠️ Des ajustements sont recommandés (voir panneau de configuration)
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Modal d'aperçu */}
      <AnimatePresence>
        {previewQuestion && (
          <QuestionPreview question={previewQuestion} onClose={() => setPreviewQuestion(null)} />
        )}
      </AnimatePresence>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .animate-spin { animation: spin 1s linear infinite; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: rgba(15,23,42,0.3); border-radius: 10px; }
        ::-webkit-scrollbar-thumb { background: rgba(99,102,241,0.3); border-radius: 10px; }
      `}</style>
    </div>
  );
};

export default DatabaseQuizCreation;