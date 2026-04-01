// src/pages/creation/ManualQuizCreation.jsx - Version complète respectant TABLE QCM
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PlusCircle, Save, ArrowLeft, FileText, User, Award,
  HelpCircle, Trash2, Loader, Settings, ChevronDown, ChevronUp,
  AlertCircle, CheckCircle, XCircle, Copy, Edit, Eye, BookOpen, Tag,
  Database, Download
} from 'lucide-react';
import { createExam, updateExam, getQuestions } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import ImageUploader from '../../components/ImageUploader';
import DOMAIN_DATA, { 
  getAllDomaines, 
  getAllSousDomaines, 
  getAllLevels, 
  getAllMatieres,
  getDomainNom,
  getSousDomaineNom,
  getLevelNom,
  getMatiereNom
} from '../../data/domainConfig';
import toast from 'react-hot-toast';

// Types de questions selon le canevas
const QUESTION_TYPES = [
  { id: 1, nom: "Notions de base (le Savoir)", description: "Évaluation des connaissances théoriques" },
  { id: 2, nom: "Intelligence Pratique (Savoir-Faire)", description: "Évaluation des compétences pratiques" },
  { id: 3, nom: "Savoir-être", description: "Évaluation du potentiel psychologique" }
];

// Composant d'aperçu de question
const QuestionPreview = ({ question, onClose }) => {
  if (!question) return null;
  
  // Récupérer les options depuis le format TABLE QCM ou le format interne
  const options = [];
  for (let i = 1; i <= 5; i++) {
    const opt = question[`OpRép-${i}`] || question.options?.[i-1];
    if (opt && opt.trim()) options.push(opt);
  }
  
  const imageSrc = question.ImageQuestion || question.imageQuestion || 
                   (question.imageBase64?.startsWith('data:') ? question.imageBase64 : null);
  const questionType = QUESTION_TYPES.find(t => t.id === (question.TypeQuestion || question.typeQuestion)) || QUESTION_TYPES[0];
  const bonOpRep = question.BonOpRép || question.bonOpRep;
    
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
      
      <div style={{ marginBottom: 12, padding: '4px 8px', background: 'rgba(99,102,241,0.1)', borderRadius: 6, display: 'inline-block' }}>
        <span style={{ fontSize: '0.7rem', color: '#a78bfa' }}>{questionType.nom}</span>
      </div>
      
      {imageSrc && (
        <div style={{ marginBottom: 16, textAlign: 'center' }}>
          <img src={imageSrc} alt="Illustration" style={{ maxWidth: '100%', maxHeight: 200, borderRadius: 8, objectFit: 'contain' }} />
        </div>
      )}
      
      <p style={{ color: '#f8fafc', fontSize: '1rem', marginBottom: 16 }}>{question.LibQuestion || question.libQuestion}</p>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {options.map((opt, i) => {
          const isCorrect = bonOpRep === i;
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
        <span>📚 N°Domaine: {question["N°Domaine"] || question.nDomaine}</span>
        <span>📁 N°S/Domaine: {question["N°S/Domaine"] || question.nSousDomaine}</span>
        <span>🎓 Niveau: {question.Niveau || question.niveau}</span>
        <span>📖 Matière: {question.LibMatière || question.matiere}</span>
        {question.LibChapitre && <span>📑 Chapitre: {question.LibChapitre}</span>}
        <span>⏱️ {question.TempsMin || question.tempsMin} min</span>
        <span>⭐ {question.points || 1} pts</span>
      </div>
      
      <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        <button onClick={onClose} style={{ padding: '6px 12px', background: '#475569', border: 'none', borderRadius: 6, color: '#fff', cursor: 'pointer' }}>
          Fermer
        </button>
      </div>
    </motion.div>
  );
};

const ManualQuizCreation = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const editExam = location.state?.exam || null;
  const isEditMode = !!editExam;

  // ========== ÉTAT PRINCIPAL ==========
  const [examTitle, setExamTitle] = useState(editExam?.title || '');
  const [teacherName, setTeacherName] = useState(editExam?.teacherName || '');
  const [teacherGrade, setTeacherGrade] = useState(editExam?.teacherGrade || '');
  const [description, setDescription] = useState(editExam?.description || '');
  
  // Référentiel de l'épreuve (avec IDs)
  const [selectedDomainId, setSelectedDomainId] = useState(editExam?.nDomaine?.toString() || editExam?.["N°Domaine"]?.toString() || '');
  const [selectedSousDomaineId, setSelectedSousDomaineId] = useState(editExam?.nSousDomaine?.toString() || editExam?.["N°S/Domaine"]?.toString() || '');
  const [selectedLevelId, setSelectedLevelId] = useState(editExam?.niveauId?.toString() || '');
  const [selectedMatiereId, setSelectedMatiereId] = useState(editExam?.matiereId?.toString() || '');
  
  // Noms affichés
  const [domainNom, setDomainNom] = useState(editExam?.domaine || editExam?.domain || '');
  const [sousDomaineNom, setSousDomaineNom] = useState(editExam?.sousDomaine || '');
  const [levelNom, setLevelNom] = useState(editExam?.niveau || editExam?.level || '');
  const [matiereNom, setMatiereNom] = useState(editExam?.matiere || editExam?.subject || editExam?.LibMatière || '');
  
  const [questions, setQuestions] = useState(() => {
    if (!editExam?.questions) return [];
    return editExam.questions.map((q, idx) => {
      // Extraire les options du format TABLE QCM ou du format interne
      const options = [];
      for (let i = 1; i <= 5; i++) {
        const opt = q[`OpRép-${i}`] || q.options?.[i-1];
        if (opt && opt.trim()) options.push(opt);
      }
      if (options.length === 0 && q.options?.length) options.push(...q.options);
      
      return {
        id: q.id || q["N°Question"] || idx + 1,
        libQuestion: q.LibQuestion || q.libQuestion || q.question || q.text || '',
        options: options.length ? options : ['', '', ''],
        correctAnswer: (() => {
          const bonOpRep = q.BonOpRép || q.bonOpRep;
          if (typeof bonOpRep === 'number' && options[bonOpRep - 1]) return options[bonOpRep - 1];
          if (q.correctAnswer) return q.correctAnswer;
          return '';
        })(),
        correctAnswers: q.correctAnswers || [],
        bonOpRep: (() => {
          const bonOpRep = q.BonOpRép || q.bonOpRep;
          if (typeof bonOpRep === 'number') return bonOpRep - 1;
          return null;
        })(),
        points: q.points || 1,
        explanation: q.explanation || '',
        typeQuestion: q.TypeQuestion || q.typeQuestion || 1,
        tempsMin: q.TempsMin || q.tempsMin || 1,
        tempsMinParQuestion: (q.TempsMin || q.tempsMin || 1) * 60,
        nDomaine: q["N°Domaine"]?.toString() || q.nDomaine?.toString() || '',
        nSousDomaine: q["N°S/Domaine"]?.toString() || q.nSousDomaine?.toString() || '',
        niveau: q.Niveau || q.niveau || '',
        niveauId: q.niveauId || '',
        matiere: q.LibMatière || q.matiere || '',
        matiereId: q.matiereId || '',
        libChapitre: q.LibChapitre || q.libChapitre || '',
        imageQuestion: q.ImageQuestion || q.imageQuestion || '',
        imageBase64: q.imageBase64 || '',
        imageMetadata: q.imageMetadata || {},
        matriculeAuteur: q.MatrAuteur || q.matriculeAuteur || user?.matricule || user?.email || '',
      };
    });
  });

  // Question en cours d'ajout - avec 3 options par défaut
  const [currentQuestion, setCurrentQuestion] = useState({
    libQuestion: '',
    options: ['', '', ''],
    correctAnswer: '',
    correctAnswers: [],
    bonOpRep: null,
    points: 1,
    explanation: '',
    typeQuestion: 1,
    tempsMinParQuestion: 60,
    tempsMin: 1,
    nDomaine: selectedDomainId,
    nSousDomaine: selectedSousDomaineId,
    niveauId: selectedLevelId,
    niveau: levelNom,
    matiereId: selectedMatiereId,
    matiere: matiereNom,
    libChapitre: '',
    imageQuestion: '',
    imageBase64: '',
    imageMetadata: {},
    matriculeAuteur: user?.matricule || user?.email || '',
  });

  const [config, setConfig] = useState({
    examOption: editExam?.examOption || 'A',
    openRange: editExam?.config?.openRange || false,
    requiredQuestions: editExam?.config?.requiredQuestions || 0,
    sequencing: editExam?.config?.sequencing || 'identical',
    allowRetry: editExam?.config?.allowRetry || false,
    showBinaryResult: editExam?.config?.showBinaryResult || false,
    showCorrectAnswer: editExam?.config?.showCorrectAnswer || false,
    timerConfig: editExam?.config?.timerConfig || 'permanent',
    timerPerQuestion: editExam?.config?.timerPerQuestion !== undefined ? editExam.config.timerPerQuestion : true,
    timePerQuestion: editExam?.config?.timePerQuestion || 60,
    totalTime: editExam?.config?.totalTime || 60,
  });

  const [isLoading, setIsLoading] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [previewQuestion, setPreviewQuestion] = useState(null);
  const [editMode, setEditMode] = useState(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [availableQuestions, setAvailableQuestions] = useState([]);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);
  const [selectedImportQuestions, setSelectedImportQuestions] = useState([]);
  const [draftLoaded, setDraftLoaded] = useState(false);
  
  const [validationErrors, setValidationErrors] = useState({
    libQuestion: false,
    options: false,
    correctAnswer: false,
    nDomaine: false,
    niveauId: false,
    matiereId: false,
  });

  // ========== FONCTIONS DE GESTION DES OPTIONS DYNAMIQUES ==========
  
  const addOption = () => {
    if (currentQuestion.options.length < 5) {
      setCurrentQuestion({
        ...currentQuestion,
        options: [...currentQuestion.options, '']
      });
    }
  };

  const removeOption = (index) => {
    if (currentQuestion.options.length > 3) {
      const newOptions = currentQuestion.options.filter((_, i) => i !== index);
      setCurrentQuestion({...currentQuestion, options: newOptions});
      
      if (currentQuestion.typeQuestion === 1) {
        if (currentQuestion.correctAnswer === currentQuestion.options[index]) {
          setCurrentQuestion(prev => ({...prev, correctAnswer: '', bonOpRep: null }));
        }
      } else {
        if (currentQuestion.correctAnswers.includes(currentQuestion.options[index])) {
          const newAnswers = currentQuestion.correctAnswers.filter(a => a !== currentQuestion.options[index]);
          setCurrentQuestion(prev => ({...prev, correctAnswers: newAnswers }));
        }
      }
    }
  };

  // ========== FONCTIONS DE SYNCHRONISATION ==========
  
  useEffect(() => {
    if (selectedDomainId) {
      const nom = getDomainNom(selectedDomainId);
      setDomainNom(nom);
    }
  }, [selectedDomainId]);

  useEffect(() => {
    if (selectedDomainId && selectedSousDomaineId) {
      const nom = getSousDomaineNom(selectedDomainId, selectedSousDomaineId);
      setSousDomaineNom(nom);
    }
  }, [selectedDomainId, selectedSousDomaineId]);

  useEffect(() => {
    if (selectedDomainId && selectedSousDomaineId && selectedLevelId) {
      const nom = getLevelNom(selectedDomainId, selectedSousDomaineId, selectedLevelId);
      setLevelNom(nom);
    }
  }, [selectedDomainId, selectedSousDomaineId, selectedLevelId]);

  useEffect(() => {
    if (selectedDomainId && selectedSousDomaineId && selectedMatiereId) {
      const nom = getMatiereNom(selectedDomainId, selectedSousDomaineId, selectedMatiereId);
      setMatiereNom(nom);
    }
  }, [selectedDomainId, selectedSousDomaineId, selectedMatiereId]);

  // Synchronisation automatique currentQuestion avec les sélections
  useEffect(() => {
    setCurrentQuestion(prev => ({ ...prev, nDomaine: selectedDomainId }));
  }, [selectedDomainId]);

  useEffect(() => {
    setCurrentQuestion(prev => ({ ...prev, nSousDomaine: selectedSousDomaineId }));
  }, [selectedSousDomaineId]);

  useEffect(() => {
    setCurrentQuestion(prev => ({ ...prev, niveauId: selectedLevelId, niveau: levelNom }));
  }, [selectedLevelId, levelNom]);

  useEffect(() => {
    setCurrentQuestion(prev => ({ ...prev, matiereId: selectedMatiereId, matiere: matiereNom }));
  }, [selectedMatiereId, matiereNom]);

  // Sauvegarde automatique
  useEffect(() => {
    if (!isEditMode && questions.length > 0 && draftLoaded) {
      const draft = {
        examTitle, teacherName, teacherGrade, description,
        selectedDomainId, selectedSousDomaineId, selectedLevelId, selectedMatiereId,
        questions, config,
        savedAt: new Date().toISOString()
      };
      localStorage.setItem('manual_quiz_draft', JSON.stringify(draft));
    }
  }, [examTitle, teacherName, teacherGrade, description, selectedDomainId, selectedSousDomaineId, selectedLevelId, selectedMatiereId, questions, config, isEditMode, draftLoaded]);

  // Charger brouillon
  useEffect(() => {
    if (!isEditMode && !draftLoaded) {
      const saved = localStorage.getItem('manual_quiz_draft');
      if (saved) {
        try {
          const draft = JSON.parse(saved);
          const shouldLoad = window.confirm('Un brouillon non sauvegardé a été trouvé. Voulez-vous le charger ?');
          if (shouldLoad) {
            setExamTitle(draft.examTitle || '');
            setTeacherName(draft.teacherName || '');
            setTeacherGrade(draft.teacherGrade || '');
            setDescription(draft.description || '');
            setSelectedDomainId(draft.selectedDomainId || '');
            setSelectedSousDomaineId(draft.selectedSousDomaineId || '');
            setSelectedLevelId(draft.selectedLevelId || '');
            setSelectedMatiereId(draft.selectedMatiereId || '');
            setQuestions(draft.questions || []);
            setConfig(draft.config || config);
            toast.success('Brouillon chargé');
          } else {
            localStorage.removeItem('manual_quiz_draft');
          }
        } catch (error) {
          console.error('Erreur chargement brouillon:', error);
          localStorage.removeItem('manual_quiz_draft');
        }
      }
      setDraftLoaded(true);
    }
  }, [isEditMode, draftLoaded, config]);

  // ========== VALIDATION ==========
  const validateCurrentQuestion = () => {
    const filledOptions = currentQuestion.options.filter(opt => opt.trim() !== '');
    const correct = currentQuestion.typeQuestion === 1 
      ? currentQuestion.correctAnswer.trim() !== ''
      : currentQuestion.correctAnswers.length > 0;
    
    const errors = {
      libQuestion: !currentQuestion.libQuestion.trim(),
      options: filledOptions.length < 3 || filledOptions.length > 5,
      correctAnswer: !correct,
      nDomaine: !currentQuestion.nDomaine,
      niveauId: !currentQuestion.niveauId,
      matiereId: !currentQuestion.matiereId,
    };
    setValidationErrors(errors);
    return !errors.libQuestion && !errors.options && !errors.correctAnswer && !errors.nDomaine && !errors.niveauId && !errors.matiereId;
  };

  // ========== GESTION DES QUESTIONS ==========
  const handleOptionChange = (index, value) => {
    const newOptions = [...currentQuestion.options];
    newOptions[index] = value;
    setCurrentQuestion({...currentQuestion, options: newOptions });
    if (validationErrors.options && newOptions.filter(opt => opt.trim()).length >= 3 && newOptions.filter(opt => opt.trim()).length <= 5) {
      setValidationErrors(prev => ({...prev, options: false }));
    }
  };

  const handleCorrectAnswerChange = (value, index) => {
    if (currentQuestion.typeQuestion === 1) {
      setCurrentQuestion({...currentQuestion, correctAnswer: value, bonOpRep: index });
    } else {
      setCurrentQuestion(prev => {
        const exists = prev.correctAnswers.includes(value);
        const newAnswers = exists ? prev.correctAnswers.filter(v => v !== value) : [...prev.correctAnswers, value];
        return {
          ...prev,
          correctAnswers: newAnswers,
          bonOpRep: newAnswers.length > 0 ? prev.options.findIndex(opt => opt === newAnswers[0]) : null,
        };
      });
    }
    if (validationErrors.correctAnswer) {
      setValidationErrors(prev => ({...prev, correctAnswer: false }));
    }
  };

  const handleImageChange = (url, base64, metadata) => {
    setCurrentQuestion({
      ...currentQuestion,
      imageQuestion: url || '',
      imageBase64: base64 || '',
      imageMetadata: metadata || {}
    });
  };

  const addQuestion = () => {
    if (!validateCurrentQuestion()) {
      toast.error('Veuillez corriger les erreurs avant d\'ajouter la question');
      return;
    }

    const filledOptions = currentQuestion.options.filter(opt => opt.trim() !== '');
    
    if (filledOptions.length < 3 || filledOptions.length > 5) {
      toast.error('La question doit avoir entre 3 et 5 options');
      return;
    }

    const finalCorrect = currentQuestion.typeQuestion === 1 
      ? currentQuestion.correctAnswer 
      : currentQuestion.correctAnswers;
    
    let bonOpRep = null;
    if (currentQuestion.typeQuestion === 1) {
      bonOpRep = filledOptions.findIndex(opt => opt === currentQuestion.correctAnswer);
    } else if (currentQuestion.correctAnswers.length > 0) {
      bonOpRep = filledOptions.findIndex(opt => currentQuestion.correctAnswers.includes(opt));
    }

    const newQuestion = {
      id: questions.length + 1,
      libQuestion: currentQuestion.libQuestion,
      options: filledOptions,
      correctAnswer: finalCorrect,
      correctAnswers: currentQuestion.typeQuestion === 2 ? currentQuestion.correctAnswers : [],
      bonOpRep: bonOpRep,
      points: currentQuestion.points,
      explanation: currentQuestion.explanation,
      typeQuestion: currentQuestion.typeQuestion,
      tempsMin: Math.ceil(currentQuestion.tempsMinParQuestion / 60),
      tempsMinParQuestion: currentQuestion.tempsMinParQuestion,
      nDomaine: currentQuestion.nDomaine,
      nSousDomaine: currentQuestion.nSousDomaine,
      niveauId: currentQuestion.niveauId,
      niveau: currentQuestion.niveau,
      matiereId: currentQuestion.matiereId,
      matiere: currentQuestion.matiere,
      libChapitre: currentQuestion.libChapitre,
      imageQuestion: currentQuestion.imageQuestion,
      imageBase64: currentQuestion.imageBase64,
      imageMetadata: currentQuestion.imageMetadata,
      matriculeAuteur: user?.matricule || user?.email || '',
      dateCrea: new Date().toISOString(),
    };

    setQuestions([...questions, newQuestion]);

    setCurrentQuestion({
      libQuestion: '',
      options: ['', '', ''],
      correctAnswer: '',
      correctAnswers: [],
      bonOpRep: null,
      points: 1,
      explanation: '',
      typeQuestion: 1,
      tempsMinParQuestion: 60,
      tempsMin: 1,
      nDomaine: selectedDomainId,
      nSousDomaine: selectedSousDomaineId,
      niveauId: selectedLevelId,
      niveau: levelNom,
      matiereId: selectedMatiereId,
      matiere: matiereNom,
      libChapitre: '',
      imageQuestion: '',
      imageBase64: '',
      imageMetadata: {},
      matriculeAuteur: user?.matricule || user?.email || '',
    });
    
    setValidationErrors({ 
      libQuestion: false, options: false, correctAnswer: false,
      nDomaine: false, niveauId: false, matiereId: false 
    });
    setEditMode(null);
    toast.success('Question ajoutée');
  };

  const removeQuestion = (index) => {
    if (window.confirm(`Supprimer la question ${index + 1}?`)) {
      setQuestions(questions.filter((_, i) => i !== index));
      toast.success('Question supprimée');
    }
  };

  const duplicateQuestion = (index) => {
    const q = {...questions[index], id: questions.length + 1 };
    setQuestions([...questions, q]);
    toast.success('Question dupliquée');
  };

  const editQuestion = (index) => {
  const q = questions[index];
  setCurrentQuestion({
    libQuestion: q.libQuestion,
    options: [...(q.options || [])],
    correctAnswer: q.typeQuestion === 1 ? (q.correctAnswer || '') : '',
    correctAnswers: q.typeQuestion === 2 
      ? (q.correctAnswers?.length ? q.correctAnswers : (Array.isArray(q.correctAnswer) ? q.correctAnswer : []))
      : [],
    bonOpRep: q.bonOpRep,
    points: q.points,
    explanation: q.explanation,
    typeQuestion: q.typeQuestion,
    tempsMinParQuestion: q.tempsMinParQuestion || 60,
    tempsMin: q.tempsMin || 1,
    nDomaine: q.nDomaine || selectedDomainId,
    nSousDomaine: q.nSousDomaine || selectedSousDomaineId,
    niveauId: q.niveauId || selectedLevelId,
    niveau: q.niveau || levelNom,
    matiereId: q.matiereId || selectedMatiereId,
    matiere: q.matiere || matiereNom,
    libChapitre: q.libChapitre || '',
    imageQuestion: q.imageQuestion || '',
    imageBase64: q.imageBase64 || '',
    imageMetadata: q.imageMetadata || {},
    matriculeAuteur: q.matriculeAuteur || user?.matricule || user?.email || '',
  });
  setEditMode(index);
  setQuestions(questions.filter((_, i) => i !== index));
  // Correction: remplacer toast.info par toast.success
  toast.success('Question chargée pour modification', { icon: '✏️', duration: 3000 });
};

  // ========== IMPORT DEPUIS LA BASE ==========
  const loadAvailableQuestions = async () => {
    if (!selectedDomainId || !selectedSousDomaineId || !selectedLevelId || !selectedMatiereId) {
      toast.error('Veuillez d\'abord sélectionner Domaine, Sous-domaine, Niveau et Matière');
      return;
    }
    
    setIsLoadingQuestions(true);
    try {
      const response = await getQuestions({
        nDomaine: parseInt(selectedDomainId),
        nSousDomaine: parseInt(selectedSousDomaineId),
        niveau: parseInt(selectedLevelId),
        matiere: parseInt(selectedMatiereId),
        status: 'approved'
      });
      
      let questionsData = [];
      if (Array.isArray(response)) {
        questionsData = response;
      } else if (response?.data && Array.isArray(response.data)) {
        questionsData = response.data;
      } else if (response?.questions && Array.isArray(response.questions)) {
        questionsData = response.questions;
      }
      
      setAvailableQuestions(questionsData);
      setShowImportModal(true);
    } catch (error) {
      console.error('Erreur chargement questions:', error);
      toast.error('Impossible de charger les questions');
    } finally {
      setIsLoadingQuestions(false);
    }
  };

  const importSelectedQuestions = () => {
    if (selectedImportQuestions.length === 0) {
      toast.error('Sélectionnez au moins une question');
      return;
    }
    
    const newQuestions = selectedImportQuestions.map((q, idx) => {
      // Extraire les options
      const options = [];
      for (let i = 1; i <= 5; i++) {
        const opt = q[`OpRép-${i}`] || q.options?.[i-1];
        if (opt && opt.trim()) options.push(opt);
      }
      
      return {
        id: questions.length + idx + 1,
        libQuestion: q.LibQuestion || q.libQuestion || q.text,
        options: options.length ? options : ['', '', ''],
        correctAnswer: q.correctAnswer,
        bonOpRep: q.bonOpRep,
        points: q.points || 1,
        explanation: q.explanation || '',
        typeQuestion: q.TypeQuestion || q.typeQuestion || 1,
        tempsMin: q.TempsMin || q.tempsMin || 1,
        tempsMinParQuestion: (q.TempsMin || q.tempsMin || 1) * 60,
        nDomaine: q["N°Domaine"] || q.nDomaine || selectedDomainId,
        nSousDomaine: q["N°S/Domaine"] || q.nSousDomaine || selectedSousDomaineId,
        niveauId: q.niveauId || selectedLevelId,
        niveau: q.Niveau || q.niveau || levelNom,
        matiereId: q.matiereId || selectedMatiereId,
        matiere: q.LibMatière || q.matiere || matiereNom,
        libChapitre: q.LibChapitre || q.libChapitre || '',
        imageQuestion: q.ImageQuestion || q.imageQuestion || '',
        imageBase64: q.imageBase64 || '',
        imageMetadata: q.imageMetadata || {},
        matriculeAuteur: q.MatrAuteur || q.matriculeAuteur || user?.matricule || user?.email || '',
        dateCrea: new Date().toISOString(),
      };
    });
    
    setQuestions([...questions, ...newQuestions]);
    setShowImportModal(false);
    setSelectedImportQuestions([]);
    toast.success(`${newQuestions.length} question(s) importée(s)`);
  };

  // ========== EXPORT JSON ==========
  const exportExam = () => {
    if (questions.length === 0) {
      toast.error('Aucune question à exporter');
      return;
    }
    
    const exportData = {
      title: examTitle || 'Épreuve sans titre',
      description,
      teacherName,
      teacherGrade,
      domain: { id: selectedDomainId, nom: domainNom },
      sousDomaine: { id: selectedSousDomaineId, nom: sousDomaineNom },
      level: { id: selectedLevelId, nom: levelNom },
      subject: { id: selectedMatiereId, nom: matiereNom },
      config,
      questions: questions.map(q => ({
        ...q,
        imageBase64: q.imageBase64 ? '[BASE64_DATA]' : null
      })),
      exportedAt: new Date().toISOString(),
      version: '1.0'
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${examTitle || 'epreuve'}_${new Date().toISOString().slice(0, 19)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Épreuve exportée');
  };

 // ========== SAUVEGARDE - FORMAT CORRIGÉ ==========
const saveExam = async () => {
  if (!examTitle || !teacherName || !teacherGrade) {
    toast.error('Veuillez remplir tous les champs du formulaire');
    return;
  }

  if (!selectedDomainId || !selectedLevelId || !selectedMatiereId) {
    toast.error('Veuillez spécifier le domaine, le niveau et la matière');
    return;
  }

  if (questions.length === 0) {
    toast.error('Veuillez ajouter au moins une question');
    return;
  }

  // Validation des options pour chaque question
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    const validOptions = q.options.filter(opt => opt && opt.trim() !== '');
    if (validOptions.length < 3 || validOptions.length > 5) {
      toast.error(`Question ${i + 1}: doit avoir entre 3 et 5 options (actuellement: ${validOptions.length})`);
      return;
    }
    
    if (q.typeQuestion === 1 && (!q.correctAnswer || q.correctAnswer.trim() === '')) {
      toast.error(`Question ${i + 1}: veuillez sélectionner une réponse correcte`);
      return;
    }
    
    if (q.typeQuestion === 2 && (!q.correctAnswers || q.correctAnswers.length === 0)) {
      toast.error(`Question ${i + 1}: veuillez sélectionner au moins une réponse correcte`);
      return;
    }
    
    const validOptionsList = q.options.filter(opt => opt && opt.trim() !== '');
    if (q.typeQuestion === 1) {
      const correctIndex = validOptionsList.findIndex(opt => opt === q.correctAnswer);
      if (correctIndex === -1) {
        toast.error(`Question ${i + 1}: la réponse correcte ne correspond à aucune option`);
        return;
      }
    }
  }

  if (config.openRange && config.requiredQuestions > questions.length) {
    toast.error(`Le nombre de questions à traiter (${config.requiredQuestions}) ne peut pas dépasser le total (${questions.length})`);
    return;
  }

  // Vérification des doublons
  const questionKeys = new Set();
  for (const q of questions) {
    const cleanQuestion = q.libQuestion?.toLowerCase().trim();
    const key = `${selectedMatiereId}::${cleanQuestion}`;
    if (questionKeys.has(key)) {
      toast.error(`Question en double détectée: "${q.libQuestion}"`);
      return;
    }
    questionKeys.add(key);
  }

  setIsLoading(true);
  try {
    // Résolution des noms directement depuis les IDs (évite les problèmes de timing des useEffect)
    const resolvedDomainNom    = domainNom      || getDomainNom(selectedDomainId)                                    || selectedDomainId      || '';
    const resolvedSousDomNom   = sousDomaineNom || getSousDomaineNom(selectedDomainId, selectedSousDomaineId)        || selectedSousDomaineId || '';
    const resolvedLevelNom     = levelNom       || getLevelNom(selectedDomainId, selectedSousDomaineId, selectedLevelId)   || selectedLevelId   || '';
    const resolvedMatiereNom   = matiereNom     || getMatiereNom(selectedDomainId, selectedSousDomaineId, selectedMatiereId) || selectedMatiereId || '';

    if (!resolvedLevelNom || !resolvedMatiereNom) {
      toast.error('Impossible de résoudre le niveau ou la matière. Vérifiez vos sélections.');
      setIsLoading(false);
      return;
    }

    // Formatage des questions pour le backend (format attendu par Exam.js)
    const formattedQuestions = questions.map((q, idx) => {
      const validOptions = q.options.filter(opt => opt && opt.trim() !== '');
      
      let bonOpRep = null;
      if (q.typeQuestion === 1 && q.correctAnswer) {
        bonOpRep = validOptions.findIndex(opt => opt === q.correctAnswer);
      } else if (q.typeQuestion === 2 && q.correctAnswers && q.correctAnswers.length > 0) {
        bonOpRep = validOptions.findIndex(opt => q.correctAnswers.includes(opt));
      }
      
      if (bonOpRep === -1 || bonOpRep === null) {
        bonOpRep = 0;
      }
      
      return {
        // Référentiel
        domaine: resolvedDomainNom,
        sousDomaine: resolvedSousDomNom,
        niveau: q.niveau || resolvedLevelNom,
        matiere: q.matiere || resolvedMatiereNom,
        libChapitre: q.libChapitre || '',
        // Contenu
        libQuestion: q.libQuestion,
        imageQuestion: q.imageQuestion || '',
        imageBase64: q.imageBase64 || '',
        imageMetadata: q.imageMetadata || {},
        typeQuestion: q.typeQuestion,
        options: validOptions,
        bonOpRep: bonOpRep,
        // Métadonnées
        tempsMin: q.tempsMin || 1,
        matriculeAuteur: q.matriculeAuteur || user?.matricule || user?.email || '',
        dateCreation: new Date().toISOString(),
        // Gestion interne
        cleInterne: `${selectedMatiereId}::${q.libQuestion?.toLowerCase().trim()}`,
        // Anciens champs pour compatibilité
        points: q.points || 1,
        explanation: q.explanation || '',
        type: q.typeQuestion === 2 ? 'multiple' : 'single'
      };
    });

    const totalDuration = config.timerPerQuestion
      ? (config.timePerQuestion * questions.length) / 60
      : config.totalTime;

    const examData = {
      title: examTitle,
      description: description,
      duration: Math.ceil(totalDuration),
      // Référentiel
      domain: resolvedDomainNom,
      category: resolvedSousDomNom,
      level: resolvedLevelNom,
      subject: resolvedMatiereNom,
      // Questions
      questions: formattedQuestions,
      passingScore: 70,
      teacherName,
      teacherGrade,
      createdBy: user?._id || user?.id,
      config: config,
      examOption: config.examOption,
      source: 'manual',
      status: 'draft',
      cleExterne: `QCM_${resolvedMatiereNom.replace(/\s/g, '_')}_${new Date().getFullYear()}`,
    };

    console.log('📤 Envoi des données au backend:', {
      title: examData.title,
      questionsCount: examData.questions.length,
      firstQuestion: {
        libQuestion: examData.questions[0]?.libQuestion,
        options: examData.questions[0]?.options,
        bonOpRep: examData.questions[0]?.bonOpRep
      }
    });

    let response;
    if (isEditMode && editExam?._id) {
      response = await updateExam(editExam._id, examData);
      if (response?.data || response?._id || response?.title) {
        toast.success('Épreuve mise à jour avec succès!');
        localStorage.removeItem('manual_quiz_draft');
        navigate('/exams');
      } else {
        throw new Error(response?.error || 'Erreur lors de la mise à jour');
      }
    } else {
      response = await createExam(examData);
      if (response.success !== false) {
        toast.success('Épreuve créée avec succès!');
        localStorage.removeItem('manual_quiz_draft');
        navigate('/exams');
      } else {
        throw new Error(response.error || 'Erreur lors de la création');
      }
    }
  } catch (error) {
    console.error('Erreur création examen:', error);
    toast.error(error.message || 'Erreur lors de la création');
  } finally {
    setIsLoading(false);
  }
};

  const totalPoints = questions.reduce((sum, q) => sum + (q.points || 1), 0);
  const avgPoints = questions.length ? (totalPoints / questions.length).toFixed(1) : 0;

  // ========== RENDU ==========
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

      <main style={{ position: 'relative', zIndex: 1, maxWidth: 1000, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
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
            <h1 style={{ fontSize: '2rem', fontWeight: 700, color: '#f8fafc' }}>
              {isEditMode ? `Modifier l'épreuve` : 'Création manuelle'}
            </h1>
            <p style={{ color: '#64748b' }}>
              {isEditMode ? `${questions.length} questions chargées` : 'Créez votre épreuve question par question (3 à 5 options par question)'}
            </p>
          </div>
          {questions.length > 0 && (
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 12, background: 'rgba(16,185,129,0.1)', padding: '8px 16px', borderRadius: 12 }}>
              <span style={{ color: '#10b981' }}>{questions.length} questions</span>
              <span style={{ color: '#f59e0b' }}>{totalPoints} pts</span>
              <span style={{ color: '#8b5cf6' }}>Ø {avgPoints} pts</span>
            </div>
          )}
        </div>

        <div style={{
          background: 'rgba(15,23,42,0.7)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(99,102,241,0.2)',
          borderRadius: 24,
          padding: 32
        }}>
          {/* Informations générales */}
          <div style={{ marginBottom: 24 }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 600, color: '#f8fafc', marginBottom: 20 }}>Informations générales</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div>
                <label style={{ color: '#94a3b8', fontSize: '0.8rem', marginBottom: 6, display: 'block' }}>
                  <User size={14} style={{ display: 'inline', marginRight: 4 }} />Nom de l'enseignant *
                </label>
                <input type="text" value={teacherName} onChange={(e) => setTeacherName(e.target.value)}
                  style={{ width: '100%', padding: 12, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 10, color: '#f8fafc' }} />
              </div>
              <div>
                <label style={{ color: '#94a3b8', fontSize: '0.8rem', marginBottom: 6, display: 'block' }}>
                  <Award size={14} style={{ display: 'inline', marginRight: 4 }} />Grade / Titre *
                </label>
                <input type="text" value={teacherGrade} onChange={(e) => setTeacherGrade(e.target.value)}
                  style={{ width: '100%', padding: 12, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 10, color: '#f8fafc' }} />
              </div>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ color: '#94a3b8', fontSize: '0.8rem', marginBottom: 6, display: 'block' }}>
                <FileText size={14} style={{ display: 'inline', marginRight: 4 }} />Titre de l'épreuve *
              </label>
              <input type="text" value={examTitle} onChange={(e) => setExamTitle(e.target.value)}
                style={{ width: '100%', padding: 12, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 10, color: '#f8fafc' }} />
            </div>
            <div>
              <label style={{ color: '#94a3b8', fontSize: '0.8rem', marginBottom: 6, display: 'block' }}>Description</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3}
                style={{ width: '100%', padding: 12, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 10, color: '#f8fafc', resize: 'vertical' }} />
            </div>
          </div>

          {/* Référentiel de l'épreuve */}
          <div style={{ marginBottom: 24, borderTop: '1px solid rgba(99,102,241,0.2)', paddingTop: 16 }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#f8fafc', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <BookOpen size={16} color="#8b5cf6" />Référentiel de l'épreuve (TABLE QCM)
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label style={{ color: '#94a3b8', fontSize: '0.75rem', marginBottom: 4, display: 'block' }}>N°Domaine *</label>
                <select value={selectedDomainId} onChange={(e) => { setSelectedDomainId(e.target.value); setSelectedSousDomaineId(''); setSelectedLevelId(''); setSelectedMatiereId(''); }}
                  style={{ width: '100%', padding: 10, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 8, color: '#f8fafc' }}>
                  <option value="">Sélectionner...</option>
                  {getAllDomaines().map(d => <option key={d.id} value={d.id}>{d.id} - {d.nom}</option>)}
                </select>
              </div>
              <div>
                <label style={{ color: '#94a3b8', fontSize: '0.75rem', marginBottom: 4, display: 'block' }}>N°Sous-Domaine *</label>
                <select value={selectedSousDomaineId} onChange={(e) => { setSelectedSousDomaineId(e.target.value); setSelectedLevelId(''); setSelectedMatiereId(''); }} disabled={!selectedDomainId}
                  style={{ width: '100%', padding: 10, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 8, color: '#f8fafc', opacity: !selectedDomainId ? 0.5 : 1 }}>
                  <option value="">Sélectionner...</option>
                  {getAllSousDomaines(selectedDomainId).map(sd => <option key={sd.id} value={sd.id}>{sd.id} - {sd.nom}</option>)}
                </select>
              </div>
              <div>
                <label style={{ color: '#94a3b8', fontSize: '0.75rem', marginBottom: 4, display: 'block' }}>Niveau *</label>
                <select value={selectedLevelId} onChange={(e) => setSelectedLevelId(e.target.value)} disabled={!selectedSousDomaineId}
                  style={{ width: '100%', padding: 10, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 8, color: '#f8fafc', opacity: !selectedSousDomaineId ? 0.5 : 1 }}>
                  <option value="">Sélectionner...</option>
                  {getAllLevels(selectedDomainId, selectedSousDomaineId).map(l => <option key={l.id} value={l.id}>{l.id} - {l.nom}</option>)}
                </select>
              </div>
              <div>
                <label style={{ color: '#94a3b8', fontSize: '0.75rem', marginBottom: 4, display: 'block' }}>Matière (LibMatière) *</label>
                <select value={selectedMatiereId} onChange={(e) => setSelectedMatiereId(e.target.value)} disabled={!selectedSousDomaineId}
                  style={{ width: '100%', padding: 10, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 8, color: '#f8fafc', opacity: !selectedSousDomaineId ? 0.5 : 1 }}>
                  <option value="">Sélectionner...</option>
                  {getAllMatieres(selectedDomainId, selectedSousDomaineId).map(m => <option key={m.id} value={m.id}>{m.id} - {m.nom}</option>)}
                </select>
              </div>
            </div>
            {(domainNom || sousDomaineNom || levelNom || matiereNom) && (
              <div style={{ marginTop: 12, padding: 8, background: 'rgba(99,102,241,0.05)', borderRadius: 8, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                {domainNom && <span style={{ fontSize: '0.7rem', color: '#a78bfa' }}>Domaine: {domainNom}</span>}
                {sousDomaineNom && <span style={{ fontSize: '0.7rem', color: '#a78bfa' }}>Sous-domaine: {sousDomaineNom}</span>}
                {levelNom && <span style={{ fontSize: '0.7rem', color: '#a78bfa' }}>Niveau: {levelNom}</span>}
                {matiereNom && <span style={{ fontSize: '0.7rem', color: '#a78bfa' }}>Matière: {matiereNom}</span>}
              </div>
            )}
          </div>

          {/* Paramètres avancés */}
          <div style={{ marginBottom: 24, borderTop: '1px solid rgba(99,102,241,0.2)', paddingTop: 16 }}>
            <button onClick={() => setAdvancedOpen(!advancedOpen)} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', color: '#94a3b8', fontSize: '0.9rem', cursor: 'pointer', width: '100%', justifyContent: 'space-between', padding: '8px 0' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Settings size={16} /> Paramètres d'évaluation</span>
              {advancedOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            <AnimatePresence>
              {advancedOpen && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                  style={{ marginTop: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, overflow: 'hidden' }}>
                  <div><label style={{ color: '#94a3b8', fontSize: '0.8rem' }}>Option d'examen</label>
                    <select value={config.examOption} onChange={(e) => setConfig({...config, examOption: e.target.value })} style={{ width: '100%', padding: 10, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 8, color: '#f8fafc' }}>
                      <option value="A">A - Collective Figée</option><option value="B">B - Collective Souple</option><option value="C">C - Personnalisée</option><option value="D">D - Aléatoire</option>
                    </select>
                  </div>
                  <div><label style={{ color: '#94a3b8', fontSize: '0.8rem' }}>Séquencement</label>
                    <select value={config.sequencing} onChange={(e) => setConfig({...config, sequencing: e.target.value })} style={{ width: '100%', padding: 10, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 8, color: '#f8fafc' }}>
                      <option value="identical">Identique pour tous</option><option value="randomPerStudent">Aléatoire par étudiant</option>
                    </select>
                  </div>
                  <div><label style={{ display: 'flex', alignItems: 'center', gap: 8 }}><input type="checkbox" checked={config.openRange} onChange={(e) => setConfig({...config, openRange: e.target.checked })} /><span style={{ color: '#94a3b8' }}>Plage ouverte</span></label>
                    {config.openRange && <input type="number" min="1" max={questions.length || 10} value={config.requiredQuestions} onChange={(e) => setConfig({...config, requiredQuestions: parseInt(e.target.value) || 0 })} style={{ width: '100%', padding: 10, marginTop: 6, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 8, color: '#f8fafc' }} />}
                  </div>
                  <div><label style={{ display: 'flex', alignItems: 'center', gap: 8 }}><input type="checkbox" checked={config.allowRetry} onChange={(e) => setConfig({...config, allowRetry: e.target.checked })} /><span style={{ color: '#94a3b8' }}>Autoriser reprise</span></label></div>
                  <div><label style={{ display: 'flex', alignItems: 'center', gap: 8 }}><input type="checkbox" checked={config.showBinaryResult} onChange={(e) => setConfig({...config, showBinaryResult: e.target.checked })} /><span style={{ color: '#94a3b8' }}>Résultat binaire</span></label></div>
                  <div><label style={{ display: 'flex', alignItems: 'center', gap: 8 }}><input type="checkbox" checked={config.showCorrectAnswer} onChange={(e) => setConfig({...config, showCorrectAnswer: e.target.checked })} /><span style={{ color: '#94a3b8' }}>Afficher bonne réponse</span></label></div>
                  <div><label style={{ color: '#94a3b8' }}>Chronomètre</label>
                    <select value={config.timerConfig} onChange={(e) => setConfig({...config, timerConfig: e.target.value })} style={{ width: '100%', padding: 10, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 8, color: '#f8fafc' }}>
                      <option value="once">Une fois</option><option value="twice">Deux fois</option><option value="threeTimes">Trois fois</option><option value="fourTimes">Quatre fois</option><option value="permanent">Permanent</option>
                    </select>
                  </div>
                  <div><label style={{ display: 'flex', alignItems: 'center', gap: 8 }}><input type="checkbox" checked={config.timerPerQuestion} onChange={(e) => setConfig({...config, timerPerQuestion: e.target.checked })} /><span style={{ color: '#94a3b8' }}>Chrono par question</span></label>
                    {config.timerPerQuestion ? 
                      <input type="number" min="5" max="300" value={config.timePerQuestion} onChange={(e) => setConfig({...config, timePerQuestion: parseInt(e.target.value) || 60 })} style={{ width: '100%', padding: 10, marginTop: 6, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 8, color: '#f8fafc' }} /> :
                      <input type="number" min="1" max="300" value={config.totalTime} onChange={(e) => setConfig({...config, totalTime: parseInt(e.target.value) || 60 })} style={{ width: '100%', padding: 10, marginTop: 6, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 8, color: '#f8fafc' }} />
                    }
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Ajout de question avec options dynamiques */}
          <div style={{ marginBottom: 24 }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 600, color: '#f8fafc', marginBottom: 20 }}>
              <HelpCircle size={18} style={{ display: 'inline', marginRight: 8 }} />
              {editMode !== null ? 'Modifier la question' : 'Ajouter une question'}
            </h2>

            <div style={{ marginBottom: 16 }}>
              <label style={{ color: '#94a3b8', fontSize: '0.8rem', marginBottom: 6, display: 'block' }}>TypeQuestion *</label>
              <select value={currentQuestion.typeQuestion} onChange={(e) => setCurrentQuestion({...currentQuestion, typeQuestion: parseInt(e.target.value), correctAnswer: '', correctAnswers: [] })}
                style={{ width: '100%', padding: 10, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 8, color: '#f8fafc' }}>
                {QUESTION_TYPES.map(t => <option key={t.id} value={t.id}>{t.id} - {t.nom}</option>)}
              </select>
            </div>

            <div style={{ position: 'relative' }}>
              <textarea value={currentQuestion.libQuestion} onChange={(e) => { setCurrentQuestion({...currentQuestion, libQuestion: e.target.value }); if (validationErrors.libQuestion && e.target.value.trim()) setValidationErrors(prev => ({...prev, libQuestion: false })); }}
                rows={3} placeholder="LibQuestion *" style={{ width: '100%', padding: 12, marginBottom: 16, background: 'rgba(255,255,255,0.05)', border: `1px solid ${validationErrors.libQuestion ? '#ef4444' : 'rgba(99,102,241,0.2)'}`, borderRadius: 10, color: '#f8fafc' }} />
              {validationErrors.libQuestion && <p style={{ color: '#ef4444', fontSize: '0.7rem' }}><AlertCircle size={12} /> La question est requise</p>}
            </div>

            <ImageUploader value={currentQuestion.imageQuestion || currentQuestion.imageBase64} onImageChange={handleImageChange} label="ImageQuestion (optionnel)" />

            {/* Options dynamiques 3 à 5 */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ color: '#94a3b8', fontSize: '0.7rem', marginBottom: 8, display: 'block' }}>
                Options (OpRép-1 à OpRép-5) - 3 à 5 options *
              </label>
              {currentQuestion.options.map((opt, idx) => (
                <div key={idx} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                  <input type="text" value={opt} onChange={(e) => handleOptionChange(idx, e.target.value)}
                    placeholder={`OpRép-${idx + 1}`}
                    style={{ flex: 1, padding: 10, background: 'rgba(255,255,255,0.05)', border: `1px solid ${validationErrors.options ? '#ef4444' : 'rgba(99,102,241,0.2)'}`, borderRadius: 8, color: '#f8fafc' }} />
                  {currentQuestion.options.length > 3 && (
                    <button onClick={() => removeOption(idx)} style={{ padding: '0 12px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 6, color: '#ef4444', cursor: 'pointer' }}>
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              ))}
              {currentQuestion.options.length < 5 && (
                <button onClick={addOption} style={{ marginTop: 8, padding: '6px 12px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 6, color: '#10b981', cursor: 'pointer', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <PlusCircle size={14} /> Ajouter une option ({currentQuestion.options.length}/5)
                </button>
              )}
              {validationErrors.options && <p style={{ color: '#ef4444', fontSize: '0.7rem', marginTop: 8 }}><AlertCircle size={12} /> Entre 3 et 5 options sont requises</p>}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div><label style={{ color: '#94a3b8', fontSize: '0.7rem' }}>Points (1-10)</label>
                <input type="number" min="1" max="10" value={currentQuestion.points} onChange={(e) => setCurrentQuestion({...currentQuestion, points: parseInt(e.target.value) })} style={{ width: '100%', padding: 10, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 8, color: '#f8fafc' }} />
              </div>
              <div><label style={{ color: '#94a3b8', fontSize: '0.7rem' }}>TempsMin (minutes)</label>
                <input type="number" min="0.5" max="30" step="0.5" value={currentQuestion.tempsMin} onChange={(e) => setCurrentQuestion({...currentQuestion, tempsMin: parseFloat(e.target.value), tempsMinParQuestion: parseFloat(e.target.value) * 60 })} style={{ width: '100%', padding: 10, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 8, color: '#f8fafc' }} />
              </div>
            </div>

            {/* Référentiel automatique */}
            <div style={{ marginBottom: 16, borderTop: '1px solid rgba(99,102,241,0.1)', paddingTop: 12 }}>
              <label style={{ color: '#94a3b8', fontSize: '0.7rem', marginBottom: 8, display: 'block' }}><Tag size={12} /> Référentiel (auto-rempli)</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <input type="text" value={currentQuestion.nDomaine || ''} readOnly placeholder="N°Domaine" style={{ padding: 8, background: 'rgba(255,255,255,0.03)', border: `1px solid ${validationErrors.nDomaine ? '#ef4444' : 'rgba(99,102,241,0.2)'}`, borderRadius: 6, color: '#94a3b8' }} />
                <input type="text" value={currentQuestion.nSousDomaine || ''} readOnly placeholder="N°S/Domaine" style={{ padding: 8, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 6, color: '#94a3b8' }} />
                <input type="text" value={currentQuestion.niveau || ''} readOnly placeholder="Niveau" style={{ padding: 8, background: 'rgba(255,255,255,0.03)', border: `1px solid ${validationErrors.niveauId ? '#ef4444' : 'rgba(99,102,241,0.2)'}`, borderRadius: 6, color: '#94a3b8' }} />
                <input type="text" value={currentQuestion.matiere || ''} readOnly placeholder="LibMatière" style={{ padding: 8, background: 'rgba(255,255,255,0.03)', border: `1px solid ${validationErrors.matiereId ? '#ef4444' : 'rgba(99,102,241,0.2)'}`, borderRadius: 6, color: '#94a3b8' }} />
                <input type="text" value={currentQuestion.libChapitre} onChange={(e) => setCurrentQuestion({...currentQuestion, libChapitre: e.target.value })} placeholder="LibChapitre - optionnel" style={{ gridColumn: 'span 2', padding: 8, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 6, color: '#f8fafc' }} />
              </div>
              <p style={{ fontSize: '0.65rem', color: '#10b981', marginTop: 8 }}>✓ Ces champs sont automatiquement synchronisés avec le référentiel de l'épreuve</p>
            </div>

            {/* Réponse correcte */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ color: '#94a3b8', fontSize: '0.7rem', marginBottom: 4, display: 'block' }}>BonOpRép (bonne réponse) *</label>
              {currentQuestion.typeQuestion === 1 ? (
                <select value={currentQuestion.correctAnswer} onChange={(e) => { const idx = e.target.selectedIndex - 1; handleCorrectAnswerChange(e.target.value, idx); }}
                  style={{ width: '100%', padding: 10, background: 'rgba(255,255,255,0.05)', border: `1px solid ${validationErrors.correctAnswer ? '#ef4444' : 'rgba(99,102,241,0.2)'}`, borderRadius: 8, color: '#f8fafc' }}>
                  <option value="">Sélectionner...</option>
                  {currentQuestion.options.filter(opt => opt.trim()).map((opt, idx) => <option key={idx} value={opt}>{idx + 1} - {opt}</option>)}
                </select>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {currentQuestion.options.filter(opt => opt.trim()).map((opt, idx) => (
                    <label key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <input type="checkbox" checked={currentQuestion.correctAnswers.includes(opt)} onChange={() => handleCorrectAnswerChange(opt, idx)} />
                      <span style={{ color: '#f8fafc' }}>{idx + 1} - {opt}</span>
                    </label>
                  ))}
                </div>
              )}
              {validationErrors.correctAnswer && <p style={{ color: '#ef4444', fontSize: '0.7rem' }}><AlertCircle size={12} /> Sélectionnez une réponse correcte</p>}
            </div>

            <textarea value={currentQuestion.explanation} onChange={(e) => setCurrentQuestion({ ...currentQuestion, explanation: e.target.value })} rows={2} placeholder="Explication (optionnel)"
              style={{ width: '100%', padding: 12, marginBottom: 16, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 10, color: '#f8fafc' }} />

            <div style={{ display: 'flex', gap: 12 }}>
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={addQuestion}
                style={{ flex: 1, padding: 12, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', border: 'none', borderRadius: 10, color: 'white', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer' }}>
                <PlusCircle size={18} /> {editMode !== null ? 'Enregistrer' : 'Ajouter la question'}
              </motion.button>
              {editMode !== null && (
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => { setEditMode(null); setCurrentQuestion({ ...currentQuestion, libQuestion: '', options: ['', '', ''], correctAnswer: '', correctAnswers: [], points: 1, explanation: '', typeQuestion: 1, tempsMin: 1, tempsMinParQuestion: 60, libChapitre: '', imageQuestion: '', imageBase64: '', imageMetadata: {} }); setValidationErrors({ libQuestion: false, options: false, correctAnswer: false, nDomaine: false, niveauId: false, matiereId: false }); }}
                  style={{ padding: '12px 24px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 10, color: '#94a3b8', cursor: 'pointer' }}>
                  Annuler
                </motion.button>
              )}
            </div>
          </div>

          {/* Liste des questions */}
          {questions.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#f8fafc' }}>Questions ajoutées ({questions.length})</h3>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={loadAvailableQuestions} disabled={!selectedDomainId || !selectedSousDomaineId || !selectedLevelId || !selectedMatiereId}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', background: 'rgba(59,130,246,0.2)', border: '1px solid rgba(59,130,246,0.3)', borderRadius: 8, color: '#3b82f6', fontSize: '0.75rem', cursor: (!selectedDomainId || !selectedSousDomaineId || !selectedLevelId || !selectedMatiereId) ? 'not-allowed' : 'pointer', opacity: (!selectedDomainId || !selectedSousDomaineId || !selectedLevelId || !selectedMatiereId) ? 0.5 : 1 }}>
                    <Database size={14} /> Importer depuis base
                  </button>
                  <button onClick={exportExam} disabled={questions.length === 0}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', background: 'rgba(16,185,129,0.2)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 8, color: '#10b981', fontSize: '0.75rem', cursor: questions.length === 0 ? 'not-allowed' : 'pointer', opacity: questions.length === 0 ? 0.5 : 1 }}>
                    <Download size={14} /> Exporter JSON
                  </button>
                </div>
              </div>
              <div style={{ maxHeight: 400, overflowY: 'auto', paddingRight: 8 }}>
                {questions.map((q, idx) => (
                  <div key={idx} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(99,102,241,0.1)', borderRadius: 12, padding: 16, marginBottom: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ flex: 1 }}>
                        <p style={{ color: '#f8fafc', fontWeight: 500 }}>{idx + 1}. {q.libQuestion}</p>
                        <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                          {q.options.filter(opt => opt.trim()).map((opt, i) => (
                            <span key={i} style={{ padding: '2px 8px', background: 'rgba(255,255,255,0.03)', borderRadius: 4, color: '#94a3b8', fontSize: '0.7rem' }}>
                              {i + 1}: {opt.length > 25 ? opt.substring(0, 25) + '...' : opt}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => setPreviewQuestion(q)} style={{ padding: 6, background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.3)', borderRadius: 6, color: '#3b82f6', cursor: 'pointer' }}><Eye size={14} /></button>
                        <button onClick={() => duplicateQuestion(idx)} style={{ padding: 6, background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 6, color: '#10b981', cursor: 'pointer' }}><Copy size={14} /></button>
                        <button onClick={() => editQuestion(idx)} style={{ padding: 6, background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 6, color: '#f59e0b', cursor: 'pointer' }}><Edit size={14} /></button>
                        <button onClick={() => removeQuestion(idx)} style={{ padding: 6, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 6, color: '#ef4444', cursor: 'pointer' }}><Trash2 size={14} /></button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Bouton sauvegarde */}
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={saveExam} disabled={isLoading}
            style={{ width: '100%', padding: 14, background: isLoading ? 'rgba(16,185,129,0.3)' : 'linear-gradient(135deg, #10b981, #059669)', border: 'none', borderRadius: 12, color: 'white', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: isLoading ? 'not-allowed' : 'pointer' }}>
            {isLoading ? <><Loader size={16} className="animate-spin" /> Enregistrement...</> : <><Save size={16} /> {isEditMode ? 'Mettre à jour l\'épreuve' : 'Enregistrer l\'épreuve'}</>}
          </motion.button>
        </div>
      </main>

      {/* Modal d'import de questions */}
      <AnimatePresence>
        {showImportModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              style={{ background: '#0f172a', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 24, padding: 24, width: '100%', maxWidth: 800, maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h3 style={{ color: '#f8fafc' }}>Importer des questions depuis la base</h3>
                <button onClick={() => setShowImportModal(false)}><XCircle size={24} color="#64748b" /></button>
              </div>
              {isLoadingQuestions ? (
                <div style={{ textAlign: 'center', padding: 40 }}><Loader size={32} className="animate-spin" color="#6366f1" /><p>Chargement...</p></div>
              ) : availableQuestions.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 40 }}><p>Aucune question disponible pour ces critères</p></div>
              ) : (
                <>
                  <div><label style={{ display: 'flex', alignItems: 'center', gap: 8 }}><input type="checkbox" onChange={(e) => e.target.checked ? setSelectedImportQuestions([...availableQuestions]) : setSelectedImportQuestions([])} /> <span>Tout sélectionner ({availableQuestions.length})</span></label></div>
                  <div style={{ flex: 1, overflowY: 'auto', maxHeight: '50vh', marginTop: 12 }}>
                    {availableQuestions.map((q, idx) => (
                      <div key={q._id || idx} onClick={() => setSelectedImportQuestions(prev => prev.includes(q) ? prev.filter(p => p !== q) : [...prev, q])}
                        style={{ padding: 12, marginBottom: 8, background: selectedImportQuestions.includes(q) ? 'rgba(99,102,241,0.1)' : 'rgba(255,255,255,0.02)', border: `1px solid ${selectedImportQuestions.includes(q) ? 'rgba(99,102,241,0.3)' : 'rgba(99,102,241,0.1)'}`, borderRadius: 8, cursor: 'pointer' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <input type="checkbox" checked={selectedImportQuestions.includes(q)} onChange={(e) => e.stopPropagation()} />
                          <div><p style={{ color: '#f8fafc' }}>{q.LibQuestion || q.libQuestion || q.text}</p></div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: 12, marginTop: 16, justifyContent: 'flex-end' }}>
                    <button onClick={() => setShowImportModal(false)} style={{ padding: '8px 16px', background: 'rgba(255,255,255,0.1)', borderRadius: 8, color: '#94a3b8' }}>Annuler</button>
                    <button onClick={importSelectedQuestions} style={{ padding: '8px 16px', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', borderRadius: 8, color: 'white' }}>Importer ({selectedImportQuestions.length})</button>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>{previewQuestion && <QuestionPreview question={previewQuestion} onClose={() => setPreviewQuestion(null)} />}</AnimatePresence>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } } .animate-spin { animation: spin 1s linear infinite; }`}</style>
    </div>
  );
};

export default ManualQuizCreation;