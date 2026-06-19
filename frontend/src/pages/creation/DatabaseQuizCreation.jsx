// src/pages/creation/DatabaseQuizCreation.jsx - VERSION COMPLÈTE CORRIGÉE
// ✅ CORRECTIONS :
//  1. La configuration N'EST PLUS FIGÉE dans l'épreuve → stockée comme suggestion
//  2. Message explicatif : "Le surveillant pourra choisir une autre configuration"
//  3. Chargement des matières : 1 seul appel API
//  4. Liste déroulante pour filtrer les chapitres
//  5. Cache local des chapitres par matière

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Database, Save, Trash2, ArrowLeft, Search,
  BookOpen, BookMarked, Loader, AlertCircle, RefreshCw,
  CheckCircle, XCircle, Tag, Layers, Clock, Plus, Eye,
  Settings, ChevronDown, ChevronUp, Award, Timer, Image as ImageIcon,
  Info
} from 'lucide-react';
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
import { 
  getPublicQuestions, 
  createExam, 
  countExamsBySubject,
  getMatieresWithQuestions,
  getChapitresByMatiere,
  getLevels,
  getMatieresBySousDomaine
} from '../../services/api';

import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import ENV_CONFIG from '../../config/env';

const BACKEND_URL = ENV_CONFIG.BACKEND_URL;

// ✅ Fonction utilitaire pour appeler le backend directement
const fetchMatieresWithQuestions = async (token) => {
  const response = await fetch(`${BACKEND_URL}/api/referentiel/matieres-with-questions`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
  if (!response.ok) throw new Error('Erreur serveur');
  return response.json();
};

const fetchChapitresByMatiere = async (matiereId, token) => {
  const response = await fetch(`${BACKEND_URL}/api/referentiel/chapitres/${matiereId}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
  if (!response.ok) throw new Error('Erreur serveur');
  return response.json();
};

// Types de feedback selon spec Excel (4 niveaux)
const FEEDBACK_TYPES = [
  { value: 'none', label: 'Aucun', description: 'Pas de feedback après chaque question' },
  { value: 'binary', label: 'Binaire', description: 'Affichage "Réussi / Échoué"' },
  { value: 'binary+answer', label: 'Binaire + Bonne Réponse', description: 'Affichage du résultat et de la bonne réponse' },
  { value: 'binary+answer+justification', label: 'Binaire + Bonne Réponse + Justification', description: 'Affichage complet avec explication' }
];

// Modes d'affichage du chronomètre
const TIMER_DISPLAY_MODES = [
  { value: 'permanent', label: 'Permanent', description: 'Toujours visible' },
  { value: 'once', label: 'Une seule fois', description: 'Au début de l\'épreuve' },
  { value: 'twice', label: 'Instantané 2 fois', description: 'Au 1/3 et au 2/3 du temps' },
  { value: 'fourTimes', label: 'Instantané 4 fois', description: 'Tous les 1/4 du temps' }
];

// ✅ CONFIGURATIONS COMPLÈTES A à K
const EXAM_CONFIGURATIONS = [
  { key: 'A', label: 'Configuration A', desc: 'Plage fermée · Séquentiel figé · Même QCM · Résultat binaire · Pas de reprise', color: '#ef4444', config: { examOption: 'A', openRange: false, sequencing: 'identical', showBinaryResult: true, showCorrectAnswer: false, allowRetry: false, requiredQuestions: 0 } },
  { key: 'B', label: 'Configuration B', desc: 'Plage fermée · Séquentiel figé · Même QCM · Résultat binaire+ · Pas de reprise', color: '#ef4444', config: { examOption: 'B', openRange: false, sequencing: 'identical', showBinaryResult: true, showCorrectAnswer: true, allowRetry: false, requiredQuestions: 0 } },
  { key: 'C', label: 'Configuration C', desc: 'Plage fermée · Séquentiel figé · Même QCM · Pas de résultat · Pas de reprise', color: '#ef4444', config: { examOption: 'C', openRange: false, sequencing: 'identical', showBinaryResult: false, showCorrectAnswer: false, allowRetry: false, requiredQuestions: 0 } },
  { key: 'D', label: 'Configuration D', desc: 'Plage fermée · Séquentiel figé · QCM aléatoire · Résultat binaire · Pas de reprise', color: '#f59e0b', config: { examOption: 'D', openRange: false, sequencing: 'randomPerStudent', showBinaryResult: true, showCorrectAnswer: false, allowRetry: false, requiredQuestions: 0 } },
  { key: 'E', label: 'Configuration E', desc: 'Plage fermée · Séquentiel figé · QCM aléatoire · Résultat binaire+ · Pas de reprise', color: '#f59e0b', config: { examOption: 'E', openRange: false, sequencing: 'randomPerStudent', showBinaryResult: true, showCorrectAnswer: true, allowRetry: false, requiredQuestions: 0 } },
  { key: 'F', label: 'Configuration F', desc: 'Plage fermée · Séquentiel figé · QCM aléatoire · Pas de résultat · Pas de reprise', color: '#f59e0b', config: { examOption: 'F', openRange: false, sequencing: 'randomPerStudent', showBinaryResult: false, showCorrectAnswer: false, allowRetry: false, requiredQuestions: 0 } },
  { key: 'G', label: 'Configuration G', desc: 'Plage ouverte · Résultat binaire · Reprise OK', color: '#10b981', config: { examOption: 'G', openRange: true, requiredQuestions: 0, showBinaryResult: true, showCorrectAnswer: false, allowRetry: true } },
  { key: 'H', label: 'Configuration H', desc: 'Plage ouverte · Résultat binaire · No Reply', color: '#10b981', config: { examOption: 'H', openRange: true, requiredQuestions: 0, showBinaryResult: true, showCorrectAnswer: false, allowRetry: false } },
  { key: 'I', label: 'Configuration I', desc: 'Plage ouverte · Résultat binaire+ · Reprise OK', color: '#10b981', config: { examOption: 'I', openRange: true, requiredQuestions: 0, showBinaryResult: true, showCorrectAnswer: true, allowRetry: true } },
  { key: 'J', label: 'Configuration J', desc: 'Plage ouverte · Résultat binaire+ · No Reply', color: '#10b981', config: { examOption: 'J', openRange: true, requiredQuestions: 0, showBinaryResult: true, showCorrectAnswer: true, allowRetry: false } },
  { key: 'K', label: 'Configuration K', desc: 'Plage ouverte · Pas de résultat · No Reply', color: '#10b981', config: { examOption: 'K', openRange: true, requiredQuestions: 0, showBinaryResult: false, showCorrectAnswer: false, allowRetry: false } }
];

// Préfixes selon le niveau éducatif
const getExamPrefix = (levelId, levelNom) => {
  const niveau = (levelNom || '').toLowerCase();
  if (niveau.includes('licence') || niveau.includes('master') || niveau.includes('doctorat') || niveau.includes('supérieur')) {
    return 'T.D.';
  }
  return 'D.S.';
};

const generateAutoTitle = (prefix, subject, ordinal) => {
  return `${prefix} ${subject} - ${ordinal}`;
};

const getImageUrl = (question) => {
  if (!question) return null;
  let imagePath = question.imageQuestion || question.imageBase64 || null;
  if (!imagePath) return null;
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) return imagePath;
  if (imagePath.startsWith('data:')) return imagePath;
  if (imagePath.startsWith('/uploads/')) return `${BACKEND_URL}${imagePath}`;
  return imagePath;
};

// Composant QuestionCard
const QuestionCard = ({ question, onSelect, onRemove, isSelected, onPreview }) => {
  const imageSrc = getImageUrl(question);
  
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
      
      <div style={{ position: 'absolute', top: 8, left: 8 }}>
        <span style={{
          fontSize: '0.55rem',
          padding: '2px 6px',
          background: '#10b981',
          color: 'white',
          borderRadius: 4,
          fontWeight: 600
        }}>
          ✅ Validée
        </span>
      </div>
      
      {imageSrc && (
        <div style={{ marginBottom: 8, marginTop: 20 }}>
          <img 
            src={imageSrc} 
            alt="Illustration" 
            style={{ maxWidth: '100%', maxHeight: 60, borderRadius: 4, objectFit: 'contain' }} 
            onError={(e) => { e.target.style.display = 'none'; }}
          />
        </div>
      )}
      
      <p style={{ color: '#f8fafc', fontSize: '0.9rem', marginBottom: 8, marginTop: imageSrc ? 0 : 20 }}>
        {question.libQuestion?.length > 100 ? question.libQuestion.substring(0, 100) + '...' : question.libQuestion}
      </p>

      {question.libChapitre && (
        <p style={{ color: '#64748b', fontSize: '0.65rem', marginBottom: 6 }}>
          📚 {question.libChapitre}
        </p>
      )}
      
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
        {question.options?.filter(opt => opt && opt.trim()).slice(0, 3).map((opt, i) => (
          <span key={i} style={{
            padding: '2px 6px',
            background: 'rgba(255,255,255,0.03)',
            borderRadius: 4,
            color: '#94a3b8',
            fontSize: '0.7rem'
          }}>
            {String.fromCharCode(65 + i)}: {opt?.length > 20 ? opt.substring(0, 20) + '...' : opt}
          </span>
        ))}
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

const DatabaseQuizCreation = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // ─── Sélection matière / niveau ────────────────────────────────
  const [selectedMatiereId, setSelectedMatiereId] = useState('');
  const [selectedMatiereInfo, setSelectedMatiereInfo] = useState(null);
  const [selectedLevelId, setSelectedLevelId] = useState('');
  const [levelNom, setLevelNom] = useState('');

  // ─── Filtre chapitres ───────────────────────────────────────────
  const [selectedChapitre, setSelectedChapitre] = useState('');
  const [availableChapitres, setAvailableChapitres] = useState([]);
  const [loadingChapitres, setLoadingChapitres] = useState(false);
  const chapitresCacheRef = useRef({});

  // ─── Titre auto ────────────────────────────────────────────────
  const [examTitle, setExamTitle] = useState('');
  const [examTitleAutoGenerated, setExamTitleAutoGenerated] = useState(false);
  const [existingExamsCount, setExistingExamsCount] = useState(0);
  const [examDescription, setExamDescription] = useState('');

  // ─── Questions ─────────────────────────────────────────────────
  const [availableQuestions, setAvailableQuestions] = useState([]);
  const [selectedQuestions, setSelectedQuestions] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [fetchingQuestions, setFetchingQuestions] = useState(false);
  const [previewQuestion, setPreviewQuestion] = useState(null);

  // ─── Matières (chargement optimisé) ────────────────────────────
  const [matieresWithQuestions, setMatieresWithQuestions] = useState([]);
  const [loadingMatieres, setLoadingMatieres] = useState(true);

  // ─── Config épreuve ─────────────────────────────────────────────
  const [selectedExamOption, setSelectedExamOption] = useState('A');
  const [config, setConfig] = useState({
    openRange: false,
    requiredQuestions: 0,
    sequencing: 'identical',
    allowRetry: false,
    feedbackType: 'none',
    timerPerQuestion: true,
    timePerQuestion: 60,
    totalTime: 60,
    pointsType: 'uniform',
    globalPoints: 1,
    timerDisplayMode: 'permanent'
  });
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [totalPointsWarning, setTotalPointsWarning] = useState(false);
  const [totalTimeWarning, setTotalTimeWarning] = useState(false);

  const autoGeneratedRef = useRef(false);
  const isLoadingQuestionsRef = useRef(false);

  // ─────────────────────────────────────────────────────────────────
  // ✅ OPTIMISATION 1 : Chargement des matières en 1 seul appel API
  // ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      setLoadingMatieres(true);
      try {
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        const result = await fetchMatieresWithQuestions(token);

        if (!isMounted) return;

        if (result.success && Array.isArray(result.data)) {
          setMatieresWithQuestions(result.data);
          if (result.data.length === 0) {
            toast('Aucune matière ne contient de questions validées', { icon: 'ℹ️', duration: 5000 });
          } else {
            console.log(`📚 ${result.data.length} matière(s) avec questions (${result.cached ? 'cache' : 'fraîches'})`);
          }
        } else {
          throw new Error('Format de réponse inattendu');
        }
      } catch (error) {
        console.error('Erreur chargement matières:', error);
        if (!isMounted) return;
        toast.error('Impossible de charger la liste des matières');
        setMatieresWithQuestions([]);
      } finally {
        if (isMounted) setLoadingMatieres(false);
      }
    };

    load();
    return () => { isMounted = false; };
  }, []);

  // ─────────────────────────────────────────────────────────────────
  // ✅ OPTIMISATION 2 : Chargement des chapitres avec cache
  // ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!selectedMatiereId) {
      setAvailableChapitres([]);
      setSelectedChapitre('');
      return;
    }

    if (chapitresCacheRef.current[selectedMatiereId]) {
      setAvailableChapitres(chapitresCacheRef.current[selectedMatiereId]);
      return;
    }

    let isMounted = true;
    const loadChapitres = async () => {
      setLoadingChapitres(true);
      try {
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        const result = await fetchChapitresByMatiere(selectedMatiereId, token);
        if (!isMounted) return;
        const chapitres = result.data || [];
        chapitresCacheRef.current[selectedMatiereId] = chapitres;
        setAvailableChapitres(chapitres);
      } catch (err) {
        console.warn('Erreur chargement chapitres:', err);
        if (!isMounted) return;
        setAvailableChapitres([]);
      } finally {
        if (isMounted) setLoadingChapitres(false);
      }
    };

    loadChapitres();
    return () => { isMounted = false; };
  }, [selectedMatiereId]);

  // Mise à jour des infos matière
  const handleMatiereChange = useCallback((matiereId) => {
    if (!matiereId) {
      setSelectedMatiereId('');
      setSelectedMatiereInfo(null);
      setSelectedLevelId('');
      setLevelNom('');
      setSelectedChapitre('');
      setAvailableChapitres([]);
      return;
    }
    const matiere = matieresWithQuestions.find(m => String(m.id) === String(matiereId));
    if (matiere) {
      setSelectedMatiereId(matiereId);
      setSelectedMatiereInfo(matiere);
      setSelectedLevelId('');
      setLevelNom('');
      setSelectedChapitre('');
      autoGeneratedRef.current = false;
      setExamTitleAutoGenerated(false);
    }
  }, [matieresWithQuestions]);

  // Niveaux disponibles
  const levelsForMatiere = useMemo(() => {
    if (!selectedMatiereInfo) return [];
    return getAllLevels(selectedMatiereInfo.domaineId, selectedMatiereInfo.sousDomaineId);
  }, [selectedMatiereInfo?.domaineId, selectedMatiereInfo?.sousDomaineId]);

  // Auto-génération du titre
  useEffect(() => {
    let isMounted = true;
    const updateAutoTitle = async () => {
      if (!selectedMatiereId || !selectedMatiereInfo?.nom || !levelNom) return;
      if (autoGeneratedRef.current && examTitleAutoGenerated) return;
      try {
        const count = await countExamsBySubject(selectedMatiereId);
        if (!isMounted) return;
        setExistingExamsCount(count + 1);
        const prefix = getExamPrefix(selectedLevelId, levelNom);
        const autoTitle = generateAutoTitle(prefix, selectedMatiereInfo.nom, count + 1);
        if (!examTitle || !examTitleAutoGenerated) {
          setExamTitle(autoTitle);
          setExamTitleAutoGenerated(true);
          autoGeneratedRef.current = true;
        }
      } catch (error) {
        if (!isMounted) return;
        if (!examTitle || !examTitleAutoGenerated) {
          const prefix = getExamPrefix(selectedLevelId, levelNom);
          setExamTitle(`${prefix} ${selectedMatiereInfo?.nom || ''} - 1`);
          setExamTitleAutoGenerated(true);
          autoGeneratedRef.current = true;
        }
      }
    };
    updateAutoTitle();
    return () => { isMounted = false; };
  }, [selectedMatiereId, selectedMatiereInfo?.nom, levelNom, selectedLevelId]);

  // ─────────────────────────────────────────────────────────────────
  // Chargement des questions (déclenché par matière + chapitre)
  // ─────────────────────────────────────────────────────────────────
  const doLoadQuestions = useCallback(async (matiereId, chapitre, matiereInfo, levelId, lvlNom) => {
    if (!matiereId) {
      setAvailableQuestions([]);
      return;
    }
    if (isLoadingQuestionsRef.current) return;
    isLoadingQuestionsRef.current = true;
    setFetchingQuestions(true);

    try {
      const result = await getPublicQuestions({
        matiereId,
        libChapitre: chapitre || undefined,
        limit: 1000
      });

      let allQuestions = [];
      if (result.questions && Array.isArray(result.questions)) allQuestions = result.questions;
      else if (Array.isArray(result)) allQuestions = result;
      else if (result.data && Array.isArray(result.data)) allQuestions = result.data;

      const normalized = allQuestions.map((q, idx) => ({
        id: q._id || q.id || idx,
        _id: q._id,
        libQuestion: q.libQuestion || q.question || q.text || 'Sans titre',
        options: q.options || [],
        correctAnswer: q.correctAnswer,
        bonOpRep: q.bonOpRep,
        points: q.points || 1,
        explanation: q.explanation || '',
        typeQuestion: q.typeQuestion || 1,
        tempsMinParQuestion: q.tempsMinParQuestion || 60,
        domaineId: matiereInfo?.domaineId || '',
        sousDomaineId: matiereInfo?.sousDomaineId || '',
        niveauId: levelId,
        matiereId,
        domaineNom: matiereInfo?.domaineNom || '',
        sousDomaineNom: matiereInfo?.sousDomaineNom || '',
        niveauNom: lvlNom,
        matiereNom: matiereInfo?.nom || '',
        libChapitre: q.libChapitre || '',
        imageQuestion: q.imageQuestion || '',
        imageBase64: q.imageBase64 || '',
      }));

      setAvailableQuestions(normalized);
      if (normalized.length === 0) {
        toast(`Aucune question validée${chapitre ? ` pour le chapitre "${chapitre}"` : ''}`, { icon: 'ℹ️', duration: 4000 });
      } else {
        toast.success(`${normalized.length} question(s) trouvée(s)${chapitre ? ` — chapitre "${chapitre}"` : ''}`);
      }
    } catch (error) {
      console.error('Erreur chargement questions:', error);
      toast.error('Impossible de charger les questions');
      setAvailableQuestions([]);
    } finally {
      setFetchingQuestions(false);
      isLoadingQuestionsRef.current = false;
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    const run = async () => {
      if (!isMounted) return;
      await doLoadQuestions(selectedMatiereId, selectedChapitre, selectedMatiereInfo, selectedLevelId, levelNom);
    };
    run();
    return () => { isMounted = false; };
  }, [selectedMatiereId, selectedChapitre]);

  // Calcul des totaux
  const totalPoints = useMemo(() => {
    if (config.pointsType === 'uniform') return config.globalPoints * selectedQuestions.length;
    return selectedQuestions.reduce((sum, q) => sum + (q.points || 1), 0);
  }, [config.pointsType, config.globalPoints, selectedQuestions]);

  const totalDurationSeconds = useMemo(() => {
    if (config.timerPerQuestion) return config.timePerQuestion * selectedQuestions.length;
    return config.totalTime * 60;
  }, [config.timerPerQuestion, config.timePerQuestion, config.totalTime, selectedQuestions.length]);

  const totalDurationMinutes = totalDurationSeconds / 60;
  const durationMinutes = Math.floor(totalDurationMinutes);
  const durationSeconds = Math.floor((totalDurationMinutes - durationMinutes) * 60);

  const getDurationWarningMessage = () => {
    if (totalDurationMinutes < 15) {
      return durationSeconds > 0
        ? `⚠️ La durée totale (${durationMinutes} min ${durationSeconds} sec) est inférieure à 15 minutes. Continuer ?`
        : `⚠️ La durée totale (${durationMinutes.toFixed(1)} min) est inférieure à 15 minutes. Continuer ?`;
    }
    return null;
  };

  useEffect(() => {
    setTotalPointsWarning(totalPoints > 100 || totalPoints < 10);
    setTotalTimeWarning(totalDurationMinutes > 180 || totalDurationMinutes < 15);
  }, [totalPoints, totalDurationMinutes]);

  const filteredQuestions = useMemo(() => {
    return availableQuestions.filter(q =>
      !searchTerm ||
      q.libQuestion?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      q.libChapitre?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [availableQuestions, searchTerm]);

  const addQuestion = (question) => {
    if (!selectedQuestions.some(q => q.id === question.id)) {
      setSelectedQuestions(prev => [...prev, question]);
      toast.success('Question ajoutée');
    } else {
      toast.error('Question déjà sélectionnée');
    }
  };

  const removeQuestion = (questionId) => {
    setSelectedQuestions(prev => prev.filter(q => q.id !== questionId));
  };

  const moveQuestionUp = (index) => {
    if (index > 0) {
      const arr = [...selectedQuestions];
      [arr[index], arr[index - 1]] = [arr[index - 1], arr[index]];
      setSelectedQuestions(arr);
    }
  };

  const moveQuestionDown = (index) => {
    if (index < selectedQuestions.length - 1) {
      const arr = [...selectedQuestions];
      [arr[index], arr[index + 1]] = [arr[index + 1], arr[index]];
      setSelectedQuestions(arr);
    }
  };

  const adjustPointsToTarget = (target) => {
    if (selectedQuestions.length === 0) { toast.error('Aucune question sélectionnée'); return; }
    if (config.pointsType === 'uniform') {
      setConfig({ ...config, globalPoints: Math.round((target / selectedQuestions.length) * 10) / 10 });
    } else {
      const ratio = target / totalPoints;
      setSelectedQuestions(selectedQuestions.map(q => ({ ...q, points: Math.round((q.points * ratio) * 10) / 10 })));
    }
    toast.success(`Points ajustés`);
  };

  const adjustTimeToTarget = (targetMin) => {
    if (selectedQuestions.length === 0) { toast.error('Aucune question sélectionnée'); return; }
    if (config.timerPerQuestion) {
      setConfig({ ...config, timePerQuestion: Math.round((targetMin * 60) / selectedQuestions.length) });
    } else {
      setConfig({ ...config, totalTime: targetMin });
    }
    toast.success(`Temps ajusté`);
  };

  const formatDurationDisplay = () => {
    return durationSeconds > 0 ? `${durationMinutes} min ${durationSeconds} sec` : `${durationMinutes.toFixed(1)} min`;
  };

  const getSelectedConfig = () => EXAM_CONFIGURATIONS.find(cfg => cfg.key === selectedExamOption);

  // ─────────────────────────────────────────────────────────────────
  // Sauvegarde - VERSION CORRIGÉE
  // ✅ La configuration N'EST PLUS FIGÉE
  // ✅ La configuration est stockée comme SUGGESTION
  // ─────────────────────────────────────────────────────────────────
  const saveExam = async () => {
    if (!examTitle || selectedQuestions.length === 0) {
      toast.error('Veuillez donner un titre et sélectionner au moins une question');
      return;
    }
    if (!selectedMatiereId || !selectedMatiereInfo) {
      toast.error('Veuillez sélectionner une matière valide');
      return;
    }
    if (!selectedLevelId || !levelNom) {
      toast.error('Veuillez sélectionner un niveau');
      return;
    }

    const selectedConfig = EXAM_CONFIGURATIONS.find(cfg => cfg.key === selectedExamOption);
    if (selectedConfig?.config?.openRange && selectedConfig.config.requiredQuestions > selectedQuestions.length) {
      toast.error(`Le nombre de questions à traiter (${selectedConfig.config.requiredQuestions}) ne peut pas dépasser le total (${selectedQuestions.length})`);
      return;
    }
    if (totalPoints > 100 && !window.confirm(`⚠️ Le total des points (${totalPoints}) dépasse 100. Continuer ?`)) return;
    if (totalPoints < 10 && !window.confirm(`⚠️ Le total des points (${totalPoints}) est inférieur à 10. Continuer ?`)) return;

    const warningMsg = getDurationWarningMessage();
    if (warningMsg && !window.confirm(warningMsg)) return;

    setIsLoading(true);
    try {
      const showBinaryResult = config.feedbackType !== 'none';
      const showCorrectAnswer = config.feedbackType === 'binary+answer' || config.feedbackType === 'binary+answer+justification';
      const showJustification = config.feedbackType === 'binary+answer+justification';

      const formattedQuestions = selectedQuestions.map((q, idx) => {
        const validOptions = q.options.filter(opt => opt && opt.trim() !== '');
        let points = q.points || 1;
        if (config.pointsType === 'uniform') points = config.globalPoints;
        return {
          nQuestion: idx + 1,
          nDomaine: parseInt(q.domaineId) || parseInt(selectedMatiereInfo.domaineId) || 0,
          nSousDomaine: parseInt(q.sousDomaineId) || parseInt(selectedMatiereInfo.sousDomaineId) || 0,
          niveau: parseInt(selectedLevelId) || 0,
          libMatiere: parseInt(selectedMatiereId),
          libChapitre: q.libChapitre || '',
          libQuestion: q.libQuestion,
          imageQuestion: q.imageQuestion || '',
          imageBase64: q.imageBase64 || '',
          typeQuestion: q.typeQuestion,
          opRep1: validOptions[0] || '',
          opRep2: validOptions[1] || '',
          opRep3: validOptions[2] || '',
          opRep4: validOptions[3] || '',
          opRep5: validOptions[4] || '',
          bonOpRep: q.bonOpRep !== null ? q.bonOpRep + 1 : null,
          tempsMin: Math.ceil((q.tempsMinParQuestion || 60) / 60),
          tempsMinParQuestion: q.tempsMinParQuestion || 60,
          points,
          explanation: q.explanation || '',
          matriculeAuteur: user?.matricule || user?.email || '',
          dateCrea: new Date().toISOString(),
        };
      });

      // ✅ CORRECTION : La configuration est stockée comme SUGGESTION
      // ✅ Le surveillant pourra en choisir une autre lors de la session
      const examData = {
        title: examTitle,
        description: examDescription || `Épreuve créée depuis la base de données - ${selectedMatiereInfo.nom}`,
        subject: selectedMatiereInfo.nom,
        level: levelNom,
        domain: selectedMatiereInfo.domaineNom,
        nDomaine: parseInt(selectedMatiereInfo.domaineId) || 0,
        nSousDomaine: parseInt(selectedMatiereInfo.sousDomaineId) || 0,
        niveau: parseInt(selectedLevelId) || 0,
        niveauNom: levelNom,
        matiere: parseInt(selectedMatiereId),
        matiereNom: selectedMatiereInfo.nom,
        questions: formattedQuestions,
        duration: Math.ceil(totalDurationMinutes),
        durationSeconds: totalDurationSeconds,
        totalPoints,
        passingScore: 70,
        createdBy: user?._id || user?.id,
        teacherName: user?.name,
        teacherGrade: user?.role,
        source: 'database',
        status: 'draft',
        // ✅ La configuration est stockée comme SUGGESTION
        // ✅ Le flag isSuggestion indique que ce n'est pas figé
        examOption: selectedExamOption,
        config: {
          examOption: selectedExamOption,
          openRange: selectedConfig?.config?.openRange || false,
          requiredQuestions: selectedConfig?.config?.requiredQuestions || 0,
          sequencing: selectedConfig?.config?.sequencing || 'identical',
          allowRetry: selectedConfig?.config?.allowRetry || false,
          showBinaryResult,
          showCorrectAnswer,
          showJustification,
          timerPerQuestion: config.timerPerQuestion,
          timePerQuestion: config.timePerQuestion,
          totalTime: config.totalTime,
          pointsType: config.pointsType,
          globalPoints: config.globalPoints,
          timerDisplayMode: config.timerDisplayMode,
          // ✅ Flag pour indiquer que c'est une suggestion
          isSuggestion: true,
          message: "Configuration suggérée. Le surveillant peut en choisir une autre lors de la session."
        }
      };

      const response = await createExam(examData);
      if (response.success !== false) {
        toast.success('✅ Épreuve créée avec succès !');
        toast.info('💡 La configuration choisie est une suggestion. Le surveillant pourra en choisir une autre lors de la session.', {
          duration: 6000,
          icon: 'ℹ️'
        });
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

  // ═══════════════════════════════════════════════════════════════
  // RENDU
  // ═══════════════════════════════════════════════════════════════
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

      <main style={{ position: 'relative', zIndex: 1, maxWidth: 1400, margin: '0 auto', display: 'flex', flexDirection: 'column', height: 'calc(100vh - 48px)' }}>
        {/* En-tête */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24, flexShrink: 0 }}>
          <motion.button
            whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            onClick={() => navigate(-1)}
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 12, padding: 12, color: '#94a3b8', cursor: 'pointer' }}
          >
            <ArrowLeft size={20} />
          </motion.button>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '4px 12px', background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 20, marginBottom: 8 }}>
              <Database size={14} color="#6366f1" />
              <span style={{ color: '#a5b4fc', fontSize: '0.7rem', fontWeight: 600 }}>BASE DE DONNÉES</span>
            </div>
            <h1 style={{ fontSize: '2rem', fontWeight: 700, color: '#f8fafc' }}>Créer depuis la base</h1>
            <p style={{ color: '#64748b' }}>Sélectionnez une matière puis les questions validées</p>
          </div>
        </div>

        {/* ✅ Message d'information sur la configuration SUGGÉRÉE */}
        <div style={{
          marginBottom: 16,
          padding: '10px 16px',
          background: 'rgba(59,130,246,0.08)',
          border: '1px solid rgba(59,130,246,0.2)',
          borderRadius: 10,
          display: 'flex',
          alignItems: 'center',
          gap: 10
        }}>
          <Info size={18} color="#60a5fa" />
          <div>
            <span style={{ color: '#60a5fa', fontSize: '0.85rem', fontWeight: 600 }}>
              💡 La configuration choisie est une SUGGESTION
            </span>
            <p style={{ color: '#94a3b8', fontSize: '0.75rem', marginTop: 2 }}>
              Le surveillant pourra en choisir une autre (A à K) lors de la session d'évaluation.
              Cela offre une flexibilité maximale pour l'organisation de l'examen.
            </p>
          </div>
        </div>

        {/* 3 colonnes */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 24, flex: 1, minHeight: 0 }}>

          {/* ══════════════════════════════════════════
              Colonne 1 : Configuration
          ══════════════════════════════════════════ */}
          <div style={{ background: 'rgba(15,23,42,0.7)', backdropFilter: 'blur(12px)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 24, padding: 24, overflowY: 'auto', height: '100%', display: 'flex', flexDirection: 'column' }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 600, color: '#f8fafc', marginBottom: 20, flexShrink: 0 }}>
              Configuration de l'épreuve
            </h2>

            {/* Titre */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ color: '#94a3b8', fontSize: '0.8rem', marginBottom: 6, display: 'block' }}>
                <BookOpen size={14} style={{ display: 'inline', marginRight: 4 }} />Titre de l'épreuve *
              </label>
              <input
                type="text"
                value={examTitle}
                onChange={(e) => { setExamTitle(e.target.value); setExamTitleAutoGenerated(false); autoGeneratedRef.current = false; }}
                placeholder="Ex: Management de Projet - Examen"
                style={{ width: '100%', padding: 12, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 10, color: '#f8fafc', outline: 'none' }}
              />
              {examTitleAutoGenerated && selectedMatiereId && (
                <p style={{ fontSize: '0.65rem', color: '#10b981', marginTop: 4 }}>
                  ✨ Titre auto-généré (préfixe {getExamPrefix(selectedLevelId, levelNom)} + matière + N°{existingExamsCount})
                </p>
              )}
            </div>

            {/* Description */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ color: '#94a3b8', fontSize: '0.8rem', marginBottom: 6, display: 'block' }}>Description</label>
              <textarea
                value={examDescription}
                onChange={(e) => setExamDescription(e.target.value)}
                rows={2}
                placeholder="Description de l'épreuve..."
                style={{ width: '100%', padding: 12, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 10, color: '#f8fafc', outline: 'none', resize: 'vertical' }}
              />
            </div>

            {/* Sélection matière optimisée */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ color: '#94a3b8', fontSize: '0.8rem', marginBottom: 6, display: 'block' }}>
                <BookMarked size={14} style={{ display: 'inline', marginRight: 4 }} />
                Matière *
                {!loadingMatieres && matieresWithQuestions.length > 0 && (
                  <span style={{ fontSize: '0.65rem', color: '#10b981', marginLeft: 6 }}>
                    ({matieresWithQuestions.length} disponible(s))
                  </span>
                )}
              </label>

              {loadingMatieres ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 12, background: 'rgba(255,255,255,0.05)', borderRadius: 10 }}>
                  <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} color="#6366f1" />
                  <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>Chargement des matières...</span>
                </div>
              ) : (
                <select
                  value={selectedMatiereId}
                  onChange={(e) => handleMatiereChange(e.target.value)}
                  style={{ width: '100%', padding: 12, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 10, color: '#f8fafc', outline: 'none' }}
                >
                  <option value="">Sélectionner une matière...</option>
                  {matieresWithQuestions.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.nom} — {m.questionsCount} question(s) ({m.sousDomaineNom})
                    </option>
                  ))}
                </select>
              )}

              {!loadingMatieres && matieresWithQuestions.length === 0 && (
                <div style={{ marginTop: 8, padding: '10px 12px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, fontSize: '0.7rem', color: '#ef4444' }}>
                  ⚠️ Aucune matière avec questions validées. Créez et validez d'abord des questions.
                </div>
              )}

              {selectedMatiereInfo && (
                <div style={{ marginTop: 8, padding: '8px 12px', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 8, fontSize: '0.7rem' }}>
                  <strong style={{ color: '#10b981' }}>✓ {selectedMatiereInfo.nom}</strong><br />
                  {selectedMatiereInfo.domaineNom} › {selectedMatiereInfo.sousDomaineNom}<br />
                  <span style={{ color: '#64748b' }}>{selectedMatiereInfo.questionsCount} question(s) validée(s)</span>
                </div>
              )}
            </div>

            {/* Niveau */}
            {selectedMatiereId && (
              <div style={{ marginBottom: 16 }}>
                <label style={{ color: '#94a3b8', fontSize: '0.8rem', marginBottom: 6, display: 'block' }}>
                  <Layers size={14} style={{ display: 'inline', marginRight: 4 }} />Niveau *
                </label>
                <select
                  value={selectedLevelId}
                  onChange={(e) => {
                    const id = e.target.value;
                    setSelectedLevelId(id);
                    setLevelNom(getLevelNom(selectedMatiereInfo?.domaineId, selectedMatiereInfo?.sousDomaineId, id));
                    autoGeneratedRef.current = false;
                    setExamTitleAutoGenerated(false);
                  }}
                  style={{ width: '100%', padding: 12, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 10, color: '#f8fafc', outline: 'none' }}
                >
                  <option value="">Sélectionner un niveau...</option>
                  {levelsForMatiere.map(l => (
                    <option key={l.id} value={l.id}>{l.nom}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Filtre chapitre par dropdown */}
            {selectedMatiereId && (
              <div style={{ marginBottom: 16 }}>
                <label style={{ color: '#94a3b8', fontSize: '0.8rem', marginBottom: 6, display: 'block' }}>
                  <BookMarked size={14} style={{ display: 'inline', marginRight: 4 }} />
                  Filtrer par chapitre
                  {loadingChapitres && (
                    <Loader size={12} style={{ display: 'inline', marginLeft: 6, animation: 'spin 1s linear infinite' }} color="#6366f1" />
                  )}
                </label>

                {loadingChapitres ? (
                  <div style={{ padding: 10, background: 'rgba(255,255,255,0.03)', borderRadius: 8, color: '#64748b', fontSize: '0.75rem' }}>
                    Chargement des chapitres...
                  </div>
                ) : availableChapitres.length === 0 ? (
                  <div style={{ padding: 10, background: 'rgba(255,255,255,0.03)', borderRadius: 8, color: '#64748b', fontSize: '0.75rem' }}>
                    Aucun chapitre distinct disponible
                  </div>
                ) : (
                  <select
                    value={selectedChapitre}
                    onChange={(e) => setSelectedChapitre(e.target.value)}
                    style={{ width: '100%', padding: 12, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 10, color: '#f8fafc', outline: 'none' }}
                  >
                    <option value="">Tous les chapitres ({availableChapitres.length})</option>
                    {availableChapitres.map((ch, i) => (
                      <option key={i} value={ch}>{ch}</option>
                    ))}
                  </select>
                )}

                {selectedChapitre && (
                  <button
                    onClick={() => setSelectedChapitre('')}
                    style={{ marginTop: 6, padding: '3px 10px', background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 6, color: '#ef4444', fontSize: '0.65rem', cursor: 'pointer' }}
                  >
                    ✕ Effacer le filtre chapitre
                  </button>
                )}
              </div>
            )}

            {/* Configuration A-K */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ color: '#94a3b8', fontSize: '0.8rem', marginBottom: 6, display: 'block' }}>
                <Settings size={14} style={{ display: 'inline', marginRight: 4 }} />
                Configuration SUGGÉRÉE *
                <span style={{ fontSize: '0.6rem', color: '#60a5fa', marginLeft: 6 }}>
                  (le surveillant pourra en changer)
                </span>
              </label>
              <select
                value={selectedExamOption}
                onChange={(e) => setSelectedExamOption(e.target.value)}
                style={{ width: '100%', padding: 12, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 10, color: '#f8fafc', outline: 'none', fontSize: '0.9rem' }}
              >
                {EXAM_CONFIGURATIONS.map((cfg) => (
                  <option key={cfg.key} value={cfg.key} style={{ background: '#1e293b', color: '#f8fafc' }}>
                    {cfg.key} — {cfg.label}
                  </option>
                ))}
              </select>
              {(() => {
                const sc = EXAM_CONFIGURATIONS.find(c => c.key === selectedExamOption);
                const isClosedRange = ['A', 'B', 'C', 'D', 'E', 'F'].includes(selectedExamOption);
                const isOpenRange = ['G', 'H', 'I', 'J', 'K'].includes(selectedExamOption);
                return (
                  <div style={{ marginTop: 8, padding: '8px 12px', background: `${sc?.color}12`, border: `1px solid ${sc?.color}33`, borderRadius: 8, fontSize: '0.7rem', color: '#94a3b8' }}>
                    <strong style={{ color: sc?.color }}>Config {selectedExamOption}</strong> : {sc?.desc}
                    {isClosedRange && (
                      <span style={{ marginLeft: 6, color: '#f59e0b' }}>🔒 Auto-avance</span>
                    )}
                    {isOpenRange && (
                      <span style={{ marginLeft: 6, color: '#10b981' }}>✅ Navigation libre</span>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* ✅ Message explicatif */}
            <div style={{
              padding: '8px 12px',
              marginBottom: 16,
              background: 'rgba(59,130,246,0.08)',
              border: '1px solid rgba(59,130,246,0.2)',
              borderRadius: 8,
              fontSize: '0.75rem',
              color: '#60a5fa'
            }}>
              <Info size={14} style={{ display: 'inline', marginRight: 6, verticalAlign: 'middle' }} />
              Cette configuration est une <strong>suggestion</strong>. 
              Le surveillant pourra choisir une autre configuration (A à K) lors de la session.
            </div>

            {selectedExamOption === 'A' && (
              <div style={{ padding: '8px 12px', marginBottom: 16, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, fontSize: '0.75rem', color: '#ef4444' }}>
                ⏱ Config A : avancement automatique par timer côté candidat
              </div>
            )}

            {/* Paramètres avancés */}
            <div style={{ marginTop: 16, borderTop: '1px solid rgba(99,102,241,0.2)', paddingTop: 16 }}>
              <button
                onClick={() => setAdvancedOpen(!advancedOpen)}
                style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', color: '#94a3b8', fontSize: '0.85rem', cursor: 'pointer', width: '100%', justifyContent: 'space-between', padding: '8px 0' }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Settings size={14} /> Paramètres avancés (Feedback & Chrono)
                </span>
                {advancedOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>

              {advancedOpen && (
                <div style={{ marginTop: 12 }}>
                  {/* Type de feedback */}
                  <div style={{ marginBottom: 12 }}>
                    <label style={{ color: '#94a3b8', fontSize: '0.75rem', marginBottom: 4, display: 'block' }}>Type de feedback à l'apprenant</label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {FEEDBACK_TYPES.map((fb) => (
                        <label key={fb.value} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                          <input type="radio" name="feedbackType" value={fb.value} checked={config.feedbackType === fb.value} onChange={() => setConfig({ ...config, feedbackType: fb.value })} style={{ accentColor: '#3b82f6' }} />
                          <div>
                            <span style={{ color: '#f8fafc', fontSize: '0.75rem', fontWeight: 500 }}>{fb.label}</span>
                            <p style={{ color: '#64748b', fontSize: '0.65rem', marginTop: 2 }}>{fb.description}</p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Séquencement */}
                  <div style={{ marginBottom: 12 }}>
                    <label style={{ color: '#94a3b8', fontSize: '0.75rem', marginBottom: 4, display: 'block' }}>Séquencement des QCM</label>
                    <select value={config.sequencing} onChange={(e) => setConfig({ ...config, sequencing: e.target.value })} style={{ width: '100%', padding: 8, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 8, color: '#f8fafc' }}>
                      <option value="identical">Même QCM pour tous les apprenants</option>
                      <option value="randomPerStudent">Variable par apprenant</option>
                    </select>
                  </div>

                  {/* Reprise */}
                  <div style={{ marginBottom: 12 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <input type="checkbox" checked={config.allowRetry} onChange={(e) => setConfig({ ...config, allowRetry: e.target.checked })} />
                      <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>Possibilité de reprise suite feedback négatif</span>
                    </label>
                  </div>

                  {/* Note par QCM */}
                  <div style={{ marginBottom: 12 }}>
                    <label style={{ color: '#94a3b8', fontSize: '0.75rem', marginBottom: 4, display: 'block' }}>
                      <Award size={12} style={{ display: 'inline', marginRight: 4 }} />Note par QCM
                    </label>
                    <div style={{ display: 'flex', gap: 16, marginBottom: 8 }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <input type="radio" name="pointsType" checked={config.pointsType === 'uniform'} onChange={() => setConfig({ ...config, pointsType: 'uniform' })} />
                        <span style={{ fontSize: '0.7rem' }}>Homogène</span>
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <input type="radio" name="pointsType" checked={config.pointsType === 'variable'} onChange={() => setConfig({ ...config, pointsType: 'variable' })} />
                        <span style={{ fontSize: '0.7rem' }}>Variable</span>
                      </label>
                    </div>
                    {config.pointsType === 'uniform' && (
                      <input type="number" min="0.5" max="10" step="0.5" value={config.globalPoints} onChange={(e) => setConfig({ ...config, globalPoints: parseFloat(e.target.value) || 1 })} style={{ width: '100%', padding: 8, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 8, color: '#f8fafc' }} />
                    )}
                  </div>

                  {/* Chronomètre */}
                  <div style={{ marginBottom: 12 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <input type="checkbox" checked={config.timerPerQuestion} onChange={(e) => setConfig({ ...config, timerPerQuestion: e.target.checked })} />
                      <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>Chronomètre par QCM (0-180 sec)</span>
                    </label>
                    <input
                      type="number"
                      min={config.timerPerQuestion ? 0 : 1}
                      max={config.timerPerQuestion ? 180 : 300}
                      value={config.timerPerQuestion ? config.timePerQuestion : config.totalTime}
                      onChange={(e) => config.timerPerQuestion ? setConfig({ ...config, timePerQuestion: parseInt(e.target.value) || 60 }) : setConfig({ ...config, totalTime: parseInt(e.target.value) || 60 })}
                      placeholder={config.timerPerQuestion ? 'Secondes par question' : 'Minutes totales'}
                      style={{ width: '100%', padding: 8, marginTop: 6, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 8, color: '#f8fafc' }}
                    />
                  </div>

                  {/* Type d'affichage Chrono */}
                  <div style={{ marginBottom: 12 }}>
                    <label style={{ color: '#94a3b8', fontSize: '0.75rem', marginBottom: 4, display: 'block' }}>
                      <Timer size={12} style={{ display: 'inline', marginRight: 4 }} />Type d'affichage du chronomètre
                    </label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {TIMER_DISPLAY_MODES.map((mode) => (
                        <label key={mode.value} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                          <input type="radio" name="timerDisplayMode" value={mode.value} checked={config.timerDisplayMode === mode.value} onChange={() => setConfig({ ...config, timerDisplayMode: mode.value })} style={{ accentColor: '#8b5cf6' }} />
                          <div>
                            <span style={{ color: '#f8fafc', fontSize: '0.75rem' }}>{mode.label}</span>
                            <p style={{ color: '#64748b', fontSize: '0.65rem' }}>{mode.description}</p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Résumé config */}
            <div style={{ marginTop: 16, padding: 12, background: 'rgba(99,102,241,0.05)', borderRadius: 8 }}>
              <p style={{ fontSize: '0.65rem', color: '#64748b', marginBottom: 4 }}>📋 Résumé de la suggestion</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, fontSize: '0.6rem' }}>
                <span style={{ color: '#a5b4fc' }}>Config: {selectedExamOption}</span>
                <span style={{ color: '#10b981' }}>{config.pointsType === 'uniform' ? `Points: ${config.globalPoints}` : 'Points variables'}</span>
                <span style={{ color: '#8b5cf6' }}>Chrono: {config.timerDisplayMode === 'permanent' ? 'Permanent' : config.timerDisplayMode === 'once' ? '1x' : config.timerDisplayMode === 'twice' ? '2x' : '4x'}</span>
                <span style={{ color: '#a78bfa' }}>Feedback: {FEEDBACK_TYPES.find(f => f.value === config.feedbackType)?.label || 'Aucun'}</span>
              </div>
              <p style={{ fontSize: '0.55rem', color: '#475569', marginTop: 4 }}>
                💡 Le surveillant pourra modifier ces paramètres lors de la session
              </p>
            </div>

            {/* Avertissements */}
            {totalPointsWarning && (
              <div style={{ marginTop: 12, padding: 10, background: 'rgba(245,158,11,0.1)', borderRadius: 8 }}>
                <p style={{ color: '#f59e0b', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <AlertCircle size={12} />
                  ⚠️ Total points: {totalPoints} pts
                  <button onClick={() => adjustPointsToTarget(totalPoints > 100 ? 100 : 50)} style={{ marginLeft: 'auto', padding: '2px 10px', background: '#f59e0b', border: 'none', borderRadius: 4, color: '#fff', fontSize: '0.6rem', cursor: 'pointer' }}>
                    Ajuster à {totalPoints > 100 ? '100' : '50'} pts
                  </button>
                </p>
              </div>
            )}
            {totalTimeWarning && (
              <div style={{ marginTop: 8, padding: 10, background: 'rgba(245,158,11,0.1)', borderRadius: 8 }}>
                <p style={{ color: '#f59e0b', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <Clock size={12} />
                  ⚠️ Durée: {formatDurationDisplay()}
                  <button onClick={() => adjustTimeToTarget(totalDurationMinutes > 180 ? 120 : 60)} style={{ marginLeft: 'auto', padding: '2px 10px', background: '#f59e0b', border: 'none', borderRadius: 4, color: '#fff', fontSize: '0.6rem', cursor: 'pointer' }}>
                    Ajuster à {totalDurationMinutes > 180 ? '120' : '60'} min
                  </button>
                </p>
              </div>
            )}
          </div>

          {/* ══════════════════════════════════════════
              Colonne 2 : Questions disponibles
          ══════════════════════════════════════════ */}
          <div style={{ background: 'rgba(15,23,42,0.7)', backdropFilter: 'blur(12px)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 24, padding: 24, overflowY: 'auto', height: '100%', display: 'flex', flexDirection: 'column' }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 600, color: '#f8fafc', marginBottom: 20, flexShrink: 0 }}>
              Questions validées
              {availableQuestions.length > 0 && (
                <span style={{ marginLeft: 8, fontSize: '0.8rem', color: '#10b981' }}>
                  ({availableQuestions.length}{selectedChapitre ? ` — ${selectedChapitre}` : ''})
                </span>
              )}
            </h2>

            {/* Recherche texte libre */}
            <div style={{ position: 'relative', marginBottom: 12, flexShrink: 0 }}>
              <Search size={16} style={{ position: 'absolute', left: 12, top: 12, color: '#64748b' }} />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Rechercher par mot-clé..."
                style={{ width: '100%', padding: '10px 12px 10px 40px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 10, color: '#f8fafc', outline: 'none' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexShrink: 0 }}>
              <p style={{ color: '#64748b', fontSize: '0.7rem' }}>
                {filteredQuestions.length} résultat(s)
                {searchTerm && ` pour "${searchTerm}"`}
              </p>
              <motion.button
                whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                onClick={() => {
                  isLoadingQuestionsRef.current = false;
                  doLoadQuestions(selectedMatiereId, selectedChapitre, selectedMatiereInfo, selectedLevelId, levelNom);
                }}
                disabled={!selectedMatiereId}
                style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px', background: 'rgba(59,130,246,0.2)', border: '1px solid rgba(59,130,246,0.3)', borderRadius: 6, color: '#3b82f6', fontSize: '0.7rem', cursor: !selectedMatiereId ? 'not-allowed' : 'pointer', opacity: !selectedMatiereId ? 0.5 : 1 }}
              >
                <RefreshCw size={12} /> Actualiser
              </motion.button>
            </div>

            {fetchingQuestions ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
                <Loader size={32} color="#6366f1" style={{ animation: 'spin 1s linear infinite' }} />
              </div>
            ) : !selectedMatiereId ? (
              <div style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>
                <Database size={32} style={{ marginBottom: 12, opacity: 0.3 }} />
                <p>Sélectionnez une matière</p>
                <p style={{ fontSize: '0.7rem' }}>Dans le panneau de gauche</p>
              </div>
            ) : filteredQuestions.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>
                <AlertCircle size={32} style={{ marginBottom: 12 }} />
                <p>Aucune question trouvée</p>
                {selectedChapitre && <p style={{ fontSize: '0.7rem' }}>Chapitre : {selectedChapitre}</p>}
              </div>
            ) : (
              <div style={{ flex: 1, overflowY: 'auto', paddingRight: 8 }}>
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

          {/* ══════════════════════════════════════════
              Colonne 3 : Questions sélectionnées
          ══════════════════════════════════════════ */}
          <div style={{ background: 'rgba(15,23,42,0.7)', backdropFilter: 'blur(12px)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 24, padding: 24, overflowY: 'auto', height: '100%', display: 'flex', flexDirection: 'column' }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 600, color: '#f8fafc', marginBottom: 20, flexShrink: 0 }}>
              Questions sélectionnées ({selectedQuestions.length})
            </h2>

            {selectedQuestions.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 60, color: '#64748b' }}>
                <BookMarked size={32} style={{ marginBottom: 12, opacity: 0.3 }} />
                <p>Aucune question sélectionnée</p>
                <p style={{ fontSize: '0.7rem' }}>Cliquez sur "Ajouter" depuis la liste</p>
              </div>
            ) : (
              <>
                <div style={{ flex: 1, overflowY: 'auto', paddingRight: 8 }}>
                  {selectedQuestions.map((q, idx) => {
                    const imageSrc = getImageUrl(q);
                    return (
                      <div key={q.id} style={{ background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 12, padding: 12, marginBottom: 12 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            <button onClick={() => moveQuestionUp(idx)} disabled={idx === 0} style={{ width: 28, height: 28, borderRadius: 6, background: idx === 0 ? '#475569' : '#10b981', border: 'none', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: idx === 0 ? 'not-allowed' : 'pointer', opacity: idx === 0 ? 0.5 : 1 }}>↑</button>
                            <button onClick={() => moveQuestionDown(idx)} disabled={idx === selectedQuestions.length - 1} style={{ width: 28, height: 28, borderRadius: 6, background: idx === selectedQuestions.length - 1 ? '#475569' : '#10b981', border: 'none', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: idx === selectedQuestions.length - 1 ? 'not-allowed' : 'pointer', opacity: idx === selectedQuestions.length - 1 ? 0.5 : 1 }}>↓</button>
                          </div>
                          <div style={{ flex: 1 }}>
                            {imageSrc && <img src={imageSrc} alt="Illustration" style={{ maxWidth: '100%', maxHeight: 40, borderRadius: 4, objectFit: 'contain', marginBottom: 4 }} onError={(e) => { e.target.style.display = 'none'; }} />}
                            <p style={{ color: '#f8fafc', fontSize: '0.85rem' }}>
                              <strong style={{ color: '#f59e0b' }}>{idx + 1}.</strong> {q.libQuestion?.length > 60 ? q.libQuestion.substring(0, 60) + '...' : q.libQuestion}
                            </p>
                            {q.libChapitre && <p style={{ color: '#64748b', fontSize: '0.6rem', marginTop: 2 }}>📚 {q.libChapitre}</p>}
                            <div style={{ marginTop: 4, display: 'flex', gap: 8, fontSize: '0.6rem', color: '#64748b' }}>
                              <span>⭐ {config.pointsType === 'uniform' ? config.globalPoints : q.points} pts</span>
                              <span>⏱️ {q.tempsMinParQuestion || 60}s</span>
                            </div>
                          </div>
                          <button onClick={() => removeQuestion(q.id)} style={{ padding: 6, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 6, color: '#ef4444', cursor: 'pointer' }}>
                            <Trash2 size={14} />
                          </button>
                          <button onClick={() => setPreviewQuestion(q)} style={{ padding: 6, background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.3)', borderRadius: 6, color: '#3b82f6', cursor: 'pointer' }}>
                            <Eye size={14} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Résumé + bouton créer */}
                <div style={{ marginTop: 16, padding: 12, background: 'rgba(255,255,255,0.02)', borderRadius: 12, border: '1px solid rgba(99,102,241,0.1)', flexShrink: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ color: '#94a3b8' }}>Total points</span>
                    <span style={{ color: '#f59e0b', fontWeight: 600 }}>{totalPoints}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ color: '#94a3b8' }}>Durée totale</span>
                    <span style={{ color: '#8b5cf6', fontWeight: 600 }}>{formatDurationDisplay()}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ color: '#94a3b8' }}>Questions</span>
                    <span style={{ color: '#10b981', fontWeight: 600 }}>{selectedQuestions.length}</span>
                  </div>

                  {/* ✅ Message avant création */}
                  <div style={{
                    marginTop: 8,
                    padding: '6px 10px',
                    background: 'rgba(59,130,246,0.08)',
                    borderRadius: 6,
                    fontSize: '0.6rem',
                    color: '#60a5fa',
                    textAlign: 'center'
                  }}>
                    💡 La configuration sera une <strong>suggestion</strong> modifiable par le surveillant
                  </div>

                  <motion.button
                    whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                    onClick={saveExam}
                    disabled={isLoading || selectedQuestions.length === 0 || !selectedLevelId}
                    style={{
                      width: '100%', padding: 14, marginTop: 16,
                      background: (isLoading || selectedQuestions.length === 0 || !selectedLevelId) ? 'rgba(16,185,129,0.3)' : 'linear-gradient(135deg, #10b981, #059669)',
                      border: 'none', borderRadius: 12, color: 'white', fontWeight: 600,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                      cursor: (isLoading || selectedQuestions.length === 0 || !selectedLevelId) ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {isLoading ? <><Loader size={16} style={{ animation: 'spin 1s linear infinite' }} /> Enregistrement...</> : <><Save size={16} /> Créer l'épreuve</>}
                  </motion.button>
                </div>
              </>
            )}
          </div>
        </div>
      </main>

      {/* Modal aperçu */}
      <AnimatePresence>
        {previewQuestion && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 1000, background: '#0f172a', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 20, padding: 24, width: '90%', maxWidth: 600, boxShadow: '0 20px 40px rgba(0,0,0,0.5)', maxHeight: '80vh', overflowY: 'auto' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ color: '#f8fafc', fontSize: '1.1rem', fontWeight: 600 }}>Aperçu de la question</h3>
              <button onClick={() => setPreviewQuestion(null)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}><XCircle size={20} /></button>
            </div>
            {previewQuestion.libChapitre && (
              <p style={{ color: '#64748b', fontSize: '0.7rem', marginBottom: 8 }}>📚 {previewQuestion.libChapitre}</p>
            )}
            {getImageUrl(previewQuestion) && (
              <div style={{ marginBottom: 16, textAlign: 'center' }}>
                <img src={getImageUrl(previewQuestion)} alt="Illustration" style={{ maxWidth: '100%', maxHeight: 200, borderRadius: 8, objectFit: 'contain' }} onError={(e) => { e.target.style.display = 'none'; }} />
              </div>
            )}
            <p style={{ color: '#f8fafc', fontSize: '1rem', marginBottom: 16 }}>{previewQuestion.libQuestion}</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {previewQuestion.options?.filter(opt => opt && opt.trim()).map((opt, i) => {
                const isCorrect = typeof previewQuestion.bonOpRep === 'number' ? i === previewQuestion.bonOpRep : opt === previewQuestion.correctAnswer;
                return (
                  <div key={i} style={{ padding: '8px 12px', background: isCorrect ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.02)', border: `1px solid ${isCorrect ? '#10b981' : 'rgba(99,102,241,0.2)'}`, borderRadius: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ color: isCorrect ? '#10b981' : '#64748b', fontWeight: 600 }}>{String.fromCharCode(65 + i)}.</span>
                    <span style={{ color: '#94a3b8' }}>{opt}</span>
                    {isCorrect && <CheckCircle size={14} color="#10b981" style={{ marginLeft: 'auto' }} />}
                  </div>
                );
              })}
            </div>
            <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={() => setPreviewQuestion(null)} style={{ padding: '6px 12px', background: '#475569', border: 'none', borderRadius: 6, color: '#fff', cursor: 'pointer' }}>Fermer</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: rgba(15,23,42,0.3); border-radius: 10px; }
        ::-webkit-scrollbar-thumb { background: rgba(99,102,241,0.3); border-radius: 10px; }
        select option { background: #1e293b; color: #f8fafc; }
      `}</style>
    </div>
  );
};

export default DatabaseQuizCreation;