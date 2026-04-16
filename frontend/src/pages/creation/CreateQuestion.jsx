// src/pages/creation/CreateQuestion.jsx — VERSION FINALE
// CORRECTIONS :
//  1. Save via POST /api/questions (route unitaire) → .save() déclenche les hooks Mongoose
//     → cleInterne généré → plus de "0 questions insérées"
//  2. libChapitre déplacé AVANT typeQuestion et rendu OBLIGATOIRE
//  3. Après save : modal avec 4 variantes de réinitialisation intelligente
//  4. Refs pour repositionner le curseur sur le bon champ après reset

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Save, ArrowLeft, BookOpen, Clock, Award,
  HelpCircle, PlusCircle, Trash2, AlertCircle, Loader,
  XCircle, Eye, CheckCircle, Image as ImageIcon,
  RefreshCw, ChevronRight
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import ImageUploader from '../../components/ImageUploader';
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
import toast from 'react-hot-toast';
import ENV_CONFIG from '../../config/env';

const BACKEND_URL = ENV_CONFIG.BACKEND_URL;

const QUESTION_TYPES = [
  { id: 1, nom: 'Notions de base (le Savoir)',           description: 'Évaluation des connaissances théoriques' },
  { id: 2, nom: 'Intelligence Pratique (Savoir-Faire)', description: 'Évaluation des compétences pratiques' },
  { id: 3, nom: 'Savoir-être',                          description: 'Évaluation du potentiel psychologique' },
];

// ─────────────────────────────────────────────────────────────────────────────
// Modal d'aperçu
// ─────────────────────────────────────────────────────────────────────────────
const QuestionPreviewModal = ({ question, onClose }) => {
  if (!question) return null;

  const getFullImageUrl = () => {
    let src = question.imageQuestion || question.imageBase64 || null;
    if (!src) return null;
    if (src.startsWith('http') || src.startsWith('data:')) return src;
    if (src.startsWith('/uploads/')) return `${BACKEND_URL}${src}`;
    if (src.includes('qcm-')) return `${BACKEND_URL}/uploads/questions/${src}`;
    return src;
  };

  const imageSrc = getFullImageUrl();
  const filledOptions = question.options?.filter(o => o && o.trim()) || [];
  const isMultiple = question.typeQuestion === 2;
  const correctAnswers = isMultiple ? (question.correctAnswers || []) : [question.correctAnswer];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
      onClick={onClose}>
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
        style={{ background: '#0f172a', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 20, padding: 24, width: '100%', maxWidth: 600, maxHeight: '80vh', overflowY: 'auto' }}
        onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ color: '#f8fafc', fontSize: '1.1rem', fontWeight: 600 }}>
            Aperçu {isMultiple && <span style={{ color: '#f59e0b', marginLeft: 8, fontSize: '0.7rem' }}>(Choix multiples)</span>}
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}><XCircle size={20} /></button>
        </div>

        {imageSrc ? (
          <div style={{ marginBottom: 16, textAlign: 'center' }}>
            <img src={imageSrc} alt="Illustration" style={{ maxWidth: '100%', maxHeight: 200, borderRadius: 12, objectFit: 'contain', background: 'rgba(0,0,0,0.2)' }}
              onError={e => { e.target.style.display = 'none'; }} />
          </div>
        ) : (
          <div style={{ marginBottom: 16, padding: 20, textAlign: 'center', background: 'rgba(0,0,0,0.2)', borderRadius: 8, color: '#64748b' }}>
            <ImageIcon size={24} style={{ marginBottom: 8 }} />
            <p style={{ fontSize: '0.7rem' }}>Aucune image</p>
          </div>
        )}

        <p style={{ color: '#f8fafc', fontSize: '1rem', marginBottom: 20, lineHeight: 1.5 }}>{question.libQuestion}</p>

        <div style={{ marginBottom: 16 }}>
          <p style={{ color: '#94a3b8', fontSize: '0.75rem', marginBottom: 8, fontWeight: 600 }}>Options :</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filledOptions.map((opt, i) => {
              const isCorrect = isMultiple ? correctAnswers.includes(opt) : opt === question.correctAnswer;
              return (
                <div key={i} style={{ padding: '10px 12px', background: isCorrect ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.02)', border: `1px solid ${isCorrect ? '#10b981' : 'rgba(99,102,241,0.2)'}`, borderRadius: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ color: isCorrect ? '#10b981' : '#64748b', fontWeight: 600 }}>{String.fromCharCode(65 + i)}.</span>
                  <span style={{ color: '#94a3b8', flex: 1 }}>{opt}</span>
                  {isCorrect && <CheckCircle size={14} color="#10b981" />}
                </div>
              );
            })}
          </div>
        </div>

        {question.libChapitre && (
          <div style={{ marginBottom: 12, padding: 8, background: 'rgba(139,92,246,0.1)', borderRadius: 8 }}>
            <p style={{ color: '#a78bfa', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: 6 }}>
              <BookOpen size={12} /> Chapitre : {question.libChapitre}
            </p>
          </div>
        )}

        {question.explanation && (
          <div style={{ marginBottom: 16, padding: 10, background: 'rgba(59,130,246,0.05)', borderRadius: 8 }}>
            <p style={{ color: '#64748b', fontSize: '0.75rem' }}>💡 {question.explanation}</p>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {[['Points', `${question.points} pt${question.points > 1 ? 's' : ''}`, '#f59e0b'],
            ['Temps', `${question.tempsMin} min`, '#60a5fa'],
            ['Niveau', question.niveau, '#a78bfa'],
            ['Matière', question.matiere, '#34d399']].map(([lbl, val, color]) => (
            <div key={lbl} style={{ padding: 8, background: 'rgba(255,255,255,0.03)', borderRadius: 8 }}>
              <p style={{ color: '#64748b', fontSize: '0.6rem' }}>{lbl}</p>
              <p style={{ color, fontWeight: 600, fontSize: '0.85rem' }}>{val}</p>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
          <button onClick={onClose} style={{ padding: '8px 20px', background: '#475569', border: 'none', borderRadius: 8, color: '#fff', cursor: 'pointer' }}>Fermer</button>
        </div>
      </motion.div>
    </motion.div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Modal post-sauvegarde — 4 variantes de réinitialisation intelligente
// ─────────────────────────────────────────────────────────────────────────────
const PostSaveModal = ({ isEditing, onVariant, onFinish }) => {
  const variants = [
    {
      id: 1,
      icon: '✏️',
      title: 'Autre libellé de QCM',
      desc: 'Même chapitre, même type, même référentiel — seul le contenu change',
      color: '#3b82f6',
      reset: 'libelle',
    },
    {
      id: 2,
      icon: '🔄',
      title: 'Autre type de QCM',
      desc: 'Même chapitre, même référentiel — le type et le contenu changent',
      color: '#8b5cf6',
      reset: 'type',
    },
    {
      id: 3,
      icon: '📖',
      title: 'Autre chapitre',
      desc: 'Même référentiel — chapitre, type et contenu changent',
      color: '#f59e0b',
      reset: 'chapitre',
    },
    {
      id: 4,
      icon: '🗂️',
      title: 'Autre référentiel',
      desc: 'Domaine, sous-domaine, niveau et matière changent — tout est réinitialisé',
      color: '#ef4444',
      reset: 'referentiel',
    },
  ];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ position: 'fixed', inset: 0, zIndex: 1100, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <motion.div initial={{ scale: 0.9, y: 20, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        style={{ background: '#0f172a', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 24, padding: 32, width: '100%', maxWidth: 560 }}>
        
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(16,185,129,0.15)', border: '2px solid #10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', fontSize: '1.5rem' }}>✅</div>
          <h2 style={{ color: '#f8fafc', fontWeight: 700, fontSize: '1.2rem' }}>
            {isEditing ? 'Question mise à jour !' : 'Question envoyée en validation !'}
          </h2>
          <p style={{ color: '#64748b', fontSize: '0.85rem', marginTop: 6 }}>Que souhaitez-vous faire maintenant ?</p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
          {variants.map(v => (
            <motion.button key={v.id} whileHover={{ scale: 1.02, x: 4 }} whileTap={{ scale: 0.98 }}
              onClick={() => onVariant(v.reset)}
              style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px', background: 'rgba(255,255,255,0.03)', border: `1px solid ${v.color}30`, borderRadius: 12, cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s' }}>
              <span style={{ fontSize: '1.4rem', width: 32, textAlign: 'center', flexShrink: 0 }}>{v.icon}</span>
              <div style={{ flex: 1 }}>
                <p style={{ color: '#f8fafc', fontWeight: 600, fontSize: '0.9rem' }}>{v.title}</p>
                <p style={{ color: '#64748b', fontSize: '0.72rem', marginTop: 2 }}>{v.desc}</p>
              </div>
              <ChevronRight size={16} color={v.color} style={{ flexShrink: 0 }} />
            </motion.button>
          ))}
        </div>

        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
          onClick={onFinish}
          style={{ width: '100%', padding: 12, background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none', borderRadius: 12, color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: '0.95rem' }}>
          Terminer la saisie
        </motion.button>
      </motion.div>
    </motion.div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Composant principal
// ─────────────────────────────────────────────────────────────────────────────
const CreateQuestion = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  // Refs pour focus après reset
  const libQuestionRef  = useRef(null);
  const typeQuestionRef = useRef(null);
  const libChapitreRef  = useRef(null);
  const domainRef       = useRef(null);

  // ── Référentiel ────────────────────────────────────────────────────────────
  const [selectedDomainId,     setSelectedDomainId]     = useState('');
  const [selectedSousDomaineId,setSelectedSousDomaineId] = useState('');
  const [selectedLevelId,      setSelectedLevelId]      = useState('');
  const [selectedMatiereId,    setSelectedMatiereId]    = useState('');
  const [domainNom,      setDomainNom]      = useState('');
  const [sousDomaineNom, setSousDomaineNom] = useState('');
  const [levelNom,       setLevelNom]       = useState('');
  const [matiereNom,     setMatiereNom]     = useState('');

  // ── Contenu question ───────────────────────────────────────────────────────
  const [libChapitre,    setLibChapitre]    = useState('');
  const [typeQuestion,   setTypeQuestion]   = useState(1);
  const [libQuestion,    setLibQuestion]    = useState('');
  const [options,        setOptions]        = useState(['', '', '']);
  const [correctAnswer,  setCorrectAnswer]  = useState('');
  const [correctAnswers, setCorrectAnswers] = useState([]);
  const [points,         setPoints]         = useState(1);
  const [tempsMin,       setTempsMin]       = useState(1);
  const [explanation,    setExplanation]    = useState('');

  // ── Image ──────────────────────────────────────────────────────────────────
  const [imageQuestion, setImageQuestion] = useState('');
  const [imageBase64,   setImageBase64]   = useState('');
  const [imageMetadata, setImageMetadata] = useState({});

  // ── UI ─────────────────────────────────────────────────────────────────────
  const [isLoading,         setIsLoading]         = useState(false);
  const [showPreview,       setShowPreview]        = useState(false);
  const [showPostSaveModal, setShowPostSaveModal]  = useState(false);
  const [isEditing,         setIsEditing]          = useState(false);
  const [editingQuestionId, setEditingQuestionId]  = useState(null);
  const [validationErrors,  setValidationErrors]   = useState({});

  // ── Chargement édition ─────────────────────────────────────────────────────
  useEffect(() => {
    const q = location.state?.editQuestion || (() => {
      const s = sessionStorage.getItem('editQuestion');
      if (s) { sessionStorage.removeItem('editQuestion'); return JSON.parse(s); }
      return null;
    })();
    if (!q) return;

    setIsEditing(true);
    setEditingQuestionId(q._id);
    setLibQuestion(q.libQuestion || '');
    setLibChapitre(q.libChapitre || '');
    setOptions(q.options?.length >= 3 ? q.options : ['', '', '']);
    setTypeQuestion(q.typeQuestion || 1);
    setPoints(q.points || 1);
    setTempsMin(q.tempsMin || 1);
    setExplanation(q.explanation || '');
    setImageQuestion(q.imageQuestion || '');
    setImageBase64(q.imageBase64 || '');
    setImageMetadata(q.imageMetadata || {});
    if (q.typeQuestion === 1) {
      setCorrectAnswer(q.correctAnswer || (q.options?.[q.bonOpRep] ?? ''));
    } else {
      setCorrectAnswers(q.correctAnswers || []);
    }
    if (q.domaine) {
      const found = getAllDomaines().find(d => d.nom === q.domaine);
      if (found) setSelectedDomainId(found.id);
    }
    toast.success('Question chargée pour modification');
  }, [location]);

  // ── Sync noms référentiel ──────────────────────────────────────────────────
  useEffect(() => { if (selectedDomainId) setDomainNom(getDomainNom(selectedDomainId)); }, [selectedDomainId]);
  useEffect(() => { if (selectedDomainId && selectedSousDomaineId) setSousDomaineNom(getSousDomaineNom(selectedDomainId, selectedSousDomaineId)); }, [selectedDomainId, selectedSousDomaineId]);
  useEffect(() => { if (selectedDomainId && selectedSousDomaineId && selectedLevelId) setLevelNom(getLevelNom(selectedDomainId, selectedSousDomaineId, selectedLevelId)); }, [selectedDomainId, selectedSousDomaineId, selectedLevelId]);
  useEffect(() => { if (selectedDomainId && selectedSousDomaineId && selectedMatiereId) setMatiereNom(getMatiereNom(selectedDomainId, selectedSousDomaineId, selectedMatiereId)); }, [selectedDomainId, selectedSousDomaineId, selectedMatiereId]);

  // ── Options ────────────────────────────────────────────────────────────────
  const addOption    = () => { if (options.length < 5) setOptions([...options, '']); };
  const removeOption = (i) => {
    if (options.length <= 3) return;
    const n = options.filter((_, idx) => idx !== i);
    setOptions(n);
    if (correctAnswer === options[i]) setCorrectAnswer('');
    if (correctAnswers.includes(options[i])) setCorrectAnswers(correctAnswers.filter(a => a !== options[i]));
  };
  const handleOptionChange = (i, v) => { const n = [...options]; n[i] = v; setOptions(n); };
  const handleCorrectChange = (v) => {
    if (typeQuestion === 1) { setCorrectAnswer(v); }
    else { setCorrectAnswers(prev => prev.includes(v) ? prev.filter(a => a !== v) : [...prev, v]); }
  };

  // ── Image ──────────────────────────────────────────────────────────────────
  const handleImageChange = useCallback((url, base64, metadata) => {
    setImageQuestion(url || '');
    setImageBase64(base64 || '');
    setImageMetadata(metadata || {});
  }, []);

  // ── Validation ─────────────────────────────────────────────────────────────
  const validateForm = () => {
    const filled   = options.filter(o => o.trim());
    const hasCorrect = typeQuestion === 1 ? correctAnswer.trim() !== '' : correctAnswers.length > 0;
    const errs = {
      libQuestion:   !libQuestion.trim(),
      libChapitre:   !libChapitre.trim(),
      options:       filled.length < 3 || filled.length > 5,
      correctAnswer: !hasCorrect,
      domaine:       !selectedDomainId,
      niveau:        !selectedLevelId,
      matiere:       !selectedMatiereId,
    };
    setValidationErrors(errs);
    return !Object.values(errs).some(Boolean);
  };

  // ── Sauvegarde ─────────────────────────────────────────────────────────────
  // ✅ FIX: utilise POST /api/questions (route unitaire avec .save())
  // → déclenche les hooks Mongoose → cleInterne généré → pas de doublons silencieux
 // ── Sauvegarde ─────────────────────────────────────────────────────────────
const handleSave = async () => {
  if (!validateForm()) { 
    toast.error('Veuillez corriger les erreurs avant d\'enregistrer'); 
    return; 
  }

  const filled = options.filter(o => o.trim());
  
  // ✅ Récupération des données du référentiel avec IDs
  const domainData = DOMAIN_DATA[selectedDomainId];
  const sousDomaineData = domainData?.sousDomaines[selectedSousDomaineId];
  const levelData = sousDomaineData?.levels?.find(l => String(l.id) === selectedLevelId);
  const matiereData = sousDomaineData?.matieres?.find(m => String(m.id) === selectedMatiereId);

  // Validation des IDs
  if (!selectedDomainId || !selectedSousDomaineId || !selectedLevelId || !selectedMatiereId) {
    toast.error('Veuillez sélectionner tous les champs du référentiel');
    return;
  }

  // Calculer bonOpRep correctement
  let bonOpRep = -1;
  if (typeQuestion === 1) {
    bonOpRep = filled.findIndex(o => o === correctAnswer);
  } else {
    // Pour les questions multiples, prendre la première réponse correcte comme référence
    if (correctAnswers.length > 0) {
      bonOpRep = filled.findIndex(o => o === correctAnswers[0]);
    }
  }
  if (bonOpRep < 0) bonOpRep = 0;

  // ✅ Payload COMPLET avec IDs ET noms
  const payload = {
    domaineId: selectedDomainId,
    sousDomaineId: selectedSousDomaineId,
    niveauId: selectedLevelId,
    matiereId: selectedMatiereId,
    domaine: domainData?.nom || '',
    domaineCode: domainData?.code || '',
    sousDomaine: sousDomaineData?.nom || '',
    sousDomaineCode: sousDomaineData?.code || '',
    niveau: levelData?.nom || '',
    matiere: matiereData?.nom || '',
    matiereCode: matiereData?.code || '',
    libQuestion,
    libChapitre: libChapitre.trim(),
    options: filled,
    correctAnswer: typeQuestion === 1 ? correctAnswer : correctAnswers,
    bonOpRep,
    typeQuestion,
    points,
    tempsMin,
    explanation,
    imageQuestion: imageQuestion || '',
    imageBase64: imageBase64 || '',
    imageMetadata: imageMetadata || { originalName: '', mimeType: '', size: 0, storageType: 'none' },
    matriculeAuteur: user?.matricule || user?.email || '',
    status: 'pending',
  };

  console.log('[CreateQuestion] 📤 Payload:', {
    ...payload,
    bonOpRep,
    correctAnswer: typeQuestion === 1 ? correctAnswer : correctAnswers,
    imageBase64: payload.imageBase64 ? 'present' : 'absent'
  });

  setIsLoading(true);
  try {
    let response;
    if (isEditing && editingQuestionId) {
      console.log('[CreateQuestion] ✏️ Mise à jour question:', editingQuestionId);
      response = await api.put(`/api/questions/${editingQuestionId}`, payload);
      console.log('[CreateQuestion] 📦 Réponse mise à jour:', response.data);
      
      // ✅ Vérifier la réponse
      if (response.data?.success) {
        toast.success('Question mise à jour avec succès !');
        
        // ✅ FORCER LE RAFRAÎCHISSEMENT DE LA PAGE PRÉCÉDENTE
        // Méthode 1: sessionStorage
        sessionStorage.setItem('refreshQuestions', Date.now().toString());
        // Méthode 2: localStorage
        localStorage.setItem('forceRefreshQuestions', Date.now().toString());
        
        // Rediriger vers la page des questions avec un flag
        navigate('/teacher/questions', { 
          state: { refreshed: true, timestamp: Date.now(), questionId: editingQuestionId },
          replace: true 
        });
        return;
      } else {
        throw new Error(response.data?.error || 'Erreur lors de la mise à jour');
      }
    } else {
      response = await api.post('/api/questions', payload);
      if (response.data?.success) {
        toast.success('Question créée et envoyée en validation !');
        setShowPostSaveModal(true);
        return;
      } else {
        throw new Error(response.data?.error || 'Erreur lors de la création');
      }
    }
  } catch (err) {
    console.error('[CreateQuestion] ❌ Erreur:', err);
    const errorMessage = err.response?.data?.error || err.message || 'Erreur lors de l\'enregistrement';
    toast.error(errorMessage);
  } finally {
    setIsLoading(false);
  }
};  // ── Réinitialisations après sauvegarde (4 variantes) ──────────────────────
  const resetContent = () => {
    setLibQuestion(''); setOptions(['', '', '']); setCorrectAnswer(''); setCorrectAnswers([]);
    setExplanation(''); setImageQuestion(''); setImageBase64(''); setImageMetadata({});
  };

  const handleVariant = (variant) => {
    setShowPostSaveModal(false);
    setIsEditing(false);
    setEditingQuestionId(null);

    switch (variant) {
      case 'libelle':
        // Garde : référentiel + chapitre + type
        // Reset : libellé, options, réponse, image, explication
        resetContent();
        setTimeout(() => libQuestionRef.current?.focus(), 100);
        toast('Nouveau libellé — même chapitre et même type', { icon: '✏️' });
        break;

      case 'type':
        // Garde : référentiel + chapitre
        // Reset : type + tout le contenu
        setTypeQuestion(1); setCorrectAnswer(''); setCorrectAnswers([]);
        resetContent();
        setTimeout(() => typeQuestionRef.current?.focus(), 100);
        toast('Nouveau type — même chapitre', { icon: '🔄' });
        break;

      case 'chapitre':
        // Garde : référentiel seulement
        // Reset : chapitre + type + tout le contenu
        setLibChapitre(''); setTypeQuestion(1);
        resetContent();
        setTimeout(() => libChapitreRef.current?.focus(), 100);
        toast('Nouveau chapitre — même référentiel', { icon: '📖' });
        break;

      case 'referentiel':
        // Reset : tout
        setSelectedDomainId(''); setSelectedSousDomaineId(''); setSelectedLevelId(''); setSelectedMatiereId('');
        setDomainNom(''); setSousDomaineNom(''); setLevelNom(''); setMatiereNom('');
        setLibChapitre(''); setTypeQuestion(1);
        resetContent();
        setTimeout(() => domainRef.current?.focus(), 100);
        toast('Nouveau référentiel — tout réinitialisé', { icon: '🗂️' });
        break;

      default:
        break;
    }
  };

  const handleFinish = () => {
    setShowPostSaveModal(false);
    navigate('/teacher/questions');
  };

  const handleCancel = () => {
    const hasData = libQuestion.trim() || options.some(o => o.trim()) || imageQuestion || imageBase64;
    if (hasData && !window.confirm('Annuler ? Les données non enregistrées seront perdues.')) return;
    navigate('/evaluate');
  };

  // ── Aperçu ─────────────────────────────────────────────────────────────────
  const previewQuestion = {
    libQuestion, options: options.filter(o => o.trim()),
    correctAnswer, correctAnswers, typeQuestion, points, tempsMin,
    explanation, domaine: domainNom, niveau: levelNom, matiere: matiereNom,
    libChapitre, imageQuestion, imageBase64, imageMetadata,
  };

  const canPreview = libQuestion.trim() && options.filter(o => o.trim()).length >= 3;

  // ─────────────────────────────────────────────────────────────────────────
  // RENDU
  // ─────────────────────────────────────────────────────────────────────────
  const inputStyle = (hasError = false) => ({
    width: '100%', padding: 10,
    background: 'rgba(255,255,255,0.05)',
    border: `1px solid ${hasError ? '#ef4444' : 'rgba(99,102,241,0.2)'}`,
    borderRadius: 8, color: '#f8fafc', outline: 'none',
    fontFamily: "'DM Sans', sans-serif",
  });

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #05071a 0%, #0a0f2e 60%, #05071a 100%)', padding: 24 }}>
      <div style={{ position: 'fixed', inset: 0, backgroundImage: 'linear-gradient(rgba(99,102,241,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.03) 1px, transparent 1px)', backgroundSize: '40px 40px', pointerEvents: 'none', zIndex: 0 }} />

      <main style={{ position: 'relative', zIndex: 1, maxWidth: 900, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => navigate('/evaluate')}
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 12, padding: 12, color: '#94a3b8', cursor: 'pointer' }}>
            <ArrowLeft size={20} />
          </motion.button>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '4px 12px', background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 20, marginBottom: 8 }}>
              <HelpCircle size={14} color="#6366f1" />
              <span style={{ color: '#a5b4fc', fontSize: '0.7rem', fontWeight: 600 }}>
                {isEditing ? 'MODIFICATION DE QCM' : 'CRÉATION DE QCM'}
              </span>
            </div>
            <h1 style={{ fontSize: '2rem', fontWeight: 700, color: '#f8fafc' }}>
              {isEditing ? 'Modifier la question' : 'Créer une question'}
            </h1>
            <p style={{ color: '#64748b' }}>La question sera soumise à validation pédagogique</p>
          </div>
        </div>

        {/* Card principale */}
        <div style={{ background: 'rgba(15,23,42,0.7)', backdropFilter: 'blur(12px)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 24, padding: 32 }}>

          {/* ═══ 1. RÉFÉRENTIEL ═══ */}
          <section style={{ marginBottom: 28 }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#f8fafc', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <BookOpen size={16} color="#8b5cf6" /> Référentiel *
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              {/* Domaine */}
              <div>
                <label style={{ color: '#94a3b8', fontSize: '0.75rem', display: 'block', marginBottom: 4 }}>Domaine *</label>
                <select ref={domainRef} value={selectedDomainId}
                  onChange={e => { setSelectedDomainId(e.target.value); setSelectedSousDomaineId(''); setSelectedLevelId(''); setSelectedMatiereId(''); }}
                  style={inputStyle(validationErrors.domaine)}>
                  <option value="">Sélectionner...</option>
                  {getAllDomaines().map(d => <option key={d.id} value={d.id}>{d.id} - {d.nom}</option>)}
                </select>
              </div>
              {/* Sous-domaine */}
              <div>
                <label style={{ color: '#94a3b8', fontSize: '0.75rem', display: 'block', marginBottom: 4 }}>Sous-domaine *</label>
                <select value={selectedSousDomaineId} onChange={e => setSelectedSousDomaineId(e.target.value)} disabled={!selectedDomainId}
                  style={{ ...inputStyle(), opacity: !selectedDomainId ? 0.5 : 1 }}>
                  <option value="">Sélectionner...</option>
                  {getAllSousDomaines(selectedDomainId).map(sd => <option key={sd.id} value={sd.id}>{sd.id} - {sd.nom}</option>)}
                </select>
              </div>
              {/* Niveau */}
              <div>
                <label style={{ color: '#94a3b8', fontSize: '0.75rem', display: 'block', marginBottom: 4 }}>Niveau *</label>
                <select value={selectedLevelId} onChange={e => setSelectedLevelId(e.target.value)} disabled={!selectedSousDomaineId}
                  style={{ ...inputStyle(validationErrors.niveau), opacity: !selectedSousDomaineId ? 0.5 : 1 }}>
                  <option value="">Sélectionner...</option>
                  {getAllLevels(selectedDomainId, selectedSousDomaineId).map(l => <option key={l.id} value={l.id}>{l.id} - {l.nom}</option>)}
                </select>
              </div>
              {/* Matière */}
              <div>
                <label style={{ color: '#94a3b8', fontSize: '0.75rem', display: 'block', marginBottom: 4 }}>Matière *</label>
                <select value={selectedMatiereId} onChange={e => setSelectedMatiereId(e.target.value)} disabled={!selectedSousDomaineId}
                  style={{ ...inputStyle(validationErrors.matiere), opacity: !selectedSousDomaineId ? 0.5 : 1 }}>
                  <option value="">Sélectionner...</option>
                  {getAllMatieres(selectedDomainId, selectedSousDomaineId).map(m => <option key={m.id} value={m.id}>{m.id} - {m.nom}</option>)}
                </select>
              </div>
            </div>
            {(domainNom || levelNom || matiereNom) && (
              <div style={{ marginTop: 10, padding: 8, background: 'rgba(99,102,241,0.05)', borderRadius: 8, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                {domainNom     && <span style={{ fontSize: '0.7rem', color: '#a78bfa' }}>📌 {domainNom}</span>}
                {sousDomaineNom && <span style={{ fontSize: '0.7rem', color: '#a78bfa' }}>↳ {sousDomaineNom}</span>}
                {levelNom      && <span style={{ fontSize: '0.7rem', color: '#a78bfa' }}>🎓 {levelNom}</span>}
                {matiereNom    && <span style={{ fontSize: '0.7rem', color: '#34d399' }}>📚 {matiereNom}</span>}
              </div>
            )}
          </section>

          {/* ═══ 2. CHAPITRE (avant typeQuestion — obligatoire) ═══ */}
          <section style={{ marginBottom: 20 }}>
            <label style={{ color: '#94a3b8', fontSize: '0.8rem', display: 'block', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
              <BookOpen size={14} color="#f59e0b" />
              Chapitre <span style={{ color: '#ef4444', marginLeft: 2 }}>*</span>
            </label>
            <input ref={libChapitreRef} type="text" value={libChapitre} onChange={e => setLibChapitre(e.target.value)}
              placeholder="Ex : Chapitre 3 — Les fonctions dérivées"
              style={inputStyle(validationErrors.libChapitre)} />
            {validationErrors.libChapitre && (
              <p style={{ color: '#ef4444', fontSize: '0.7rem', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                <AlertCircle size={12} /> Le chapitre est obligatoire
              </p>
            )}
          </section>

          {/* ═══ 3. TYPE DE QUESTION ═══ */}
          <section style={{ marginBottom: 20 }}>
            <label style={{ color: '#94a3b8', fontSize: '0.8rem', display: 'block', marginBottom: 6 }}>Type de question *</label>
            <select ref={typeQuestionRef} value={typeQuestion}
              onChange={e => { setTypeQuestion(parseInt(e.target.value)); setCorrectAnswer(''); setCorrectAnswers([]); }}
              style={inputStyle()}>
              {QUESTION_TYPES.map(t => <option key={t.id} value={t.id}>{t.id} — {t.nom}</option>)}
            </select>
            <p style={{ fontSize: '0.65rem', color: '#64748b', marginTop: 4 }}>
              {QUESTION_TYPES.find(t => t.id === typeQuestion)?.description}
            </p>
          </section>

          {/* ═══ 4. LIBELLÉ ═══ */}
          <section style={{ marginBottom: 20 }}>
            <label style={{ color: '#94a3b8', fontSize: '0.8rem', display: 'block', marginBottom: 6 }}>Libellé de la question *</label>
            <textarea ref={libQuestionRef} value={libQuestion} onChange={e => setLibQuestion(e.target.value)}
              rows={3} placeholder="Énoncé de la question (max 500 caractères)"
              maxLength={500}
              style={{ ...inputStyle(validationErrors.libQuestion), resize: 'vertical' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
              {validationErrors.libQuestion
                ? <p style={{ color: '#ef4444', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: 4 }}><AlertCircle size={12} /> Le libellé est requis</p>
                : <span />}
              <span style={{ fontSize: '0.65rem', color: '#475569' }}>{libQuestion.length}/500</span>
            </div>
          </section>

          {/* ═══ 5. IMAGE ═══ */}
          <section style={{ marginBottom: 20 }}>
            <ImageUploader
              value={imageQuestion || imageBase64}
              onChange={handleImageChange}
              label="Image (optionnel)"
            />
          </section>

          {/* ═══ 6. OPTIONS ═══ */}
          <section style={{ marginBottom: 20 }}>
            <label style={{ color: '#94a3b8', fontSize: '0.7rem', display: 'block', marginBottom: 8 }}>
              Options (3 à 5) *
            </label>
            {options.map((opt, idx) => (
              <div key={idx} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <span style={{ width: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontWeight: 700, fontSize: '0.85rem' }}>
                  {String.fromCharCode(65 + idx)}
                </span>
                <input type="text" value={opt} onChange={e => handleOptionChange(idx, e.target.value)}
                  placeholder={`Option ${String.fromCharCode(65 + idx)}`}
                  style={{ flex: 1, padding: 10, background: 'rgba(255,255,255,0.05)', border: `1px solid ${validationErrors.options ? '#ef4444' : 'rgba(99,102,241,0.2)'}`, borderRadius: 8, color: '#f8fafc', outline: 'none' }} />
                {options.length > 3 && (
                  <button onClick={() => removeOption(idx)} style={{ padding: '0 12px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 6, color: '#ef4444', cursor: 'pointer' }}>
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            ))}
            {options.length < 5 && (
              <button onClick={addOption} style={{ marginTop: 4, padding: '6px 12px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 6, color: '#10b981', cursor: 'pointer', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                <PlusCircle size={14} /> Ajouter une option ({options.length}/5)
              </button>
            )}
            {validationErrors.options && (
              <p style={{ color: '#ef4444', fontSize: '0.7rem', marginTop: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                <AlertCircle size={12} /> Entre 3 et 5 options sont requises
              </p>
            )}
          </section>

          {/* ═══ 7. POINTS & TEMPS ═══ */}
          <section style={{ marginBottom: 20 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label style={{ color: '#94a3b8', fontSize: '0.7rem', display: 'block', marginBottom: 4 }}>
                  <Award size={12} style={{ display: 'inline', marginRight: 4 }} /> Points (1–10)
                </label>
                <input type="number" min="1" max="10" value={points} onChange={e => setPoints(parseInt(e.target.value))} style={inputStyle()} />
              </div>
              <div>
                <label style={{ color: '#94a3b8', fontSize: '0.7rem', display: 'block', marginBottom: 4 }}>
                  <Clock size={12} style={{ display: 'inline', marginRight: 4 }} /> Temps (minutes)
                </label>
                <input type="number" min="0.5" max="30" step="0.5" value={tempsMin} onChange={e => setTempsMin(parseFloat(e.target.value))} style={inputStyle()} />
              </div>
            </div>
          </section>

          {/* ═══ 8. BONNE RÉPONSE ═══ */}
          <section style={{ marginBottom: 20 }}>
            <label style={{ color: '#94a3b8', fontSize: '0.7rem', display: 'block', marginBottom: 6 }}>
              Bonne réponse * {typeQuestion === 2 && <span style={{ color: '#f59e0b', fontSize: '0.65rem' }}>(Cochez toutes les bonnes réponses)</span>}
            </label>
            {typeQuestion === 1 ? (
              <select value={correctAnswer} onChange={e => handleCorrectChange(e.target.value)}
                style={inputStyle(validationErrors.correctAnswer)}>
                <option value="">Sélectionner la bonne réponse...</option>
                {options.filter(o => o.trim()).map((opt, idx) => (
                  <option key={idx} value={opt}>{String.fromCharCode(65 + idx)} — {opt}</option>
                ))}
              </select>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {options.filter(o => o.trim()).map((opt, idx) => (
                  <label key={idx} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: correctAnswers.includes(opt) ? 'rgba(16,185,129,0.08)' : 'rgba(255,255,255,0.02)', border: `1px solid ${correctAnswers.includes(opt) ? '#10b981' : 'rgba(99,102,241,0.2)'}`, borderRadius: 8, cursor: 'pointer' }}>
                    <input type="checkbox" checked={correctAnswers.includes(opt)} onChange={() => handleCorrectChange(opt)}
                      style={{ accentColor: '#10b981', width: 16, height: 16 }} />
                    <span style={{ color: '#f8fafc' }}>{String.fromCharCode(65 + idx)} — {opt}</span>
                    {correctAnswers.includes(opt) && <CheckCircle size={14} color="#10b981" style={{ marginLeft: 'auto' }} />}
                  </label>
                ))}
              </div>
            )}
            {validationErrors.correctAnswer && (
              <p style={{ color: '#ef4444', fontSize: '0.7rem', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                <AlertCircle size={12} /> Sélectionnez au moins une réponse correcte
              </p>
            )}
          </section>

          {/* ═══ 9. EXPLICATION ═══ */}
          <section style={{ marginBottom: 24 }}>
            <label style={{ color: '#94a3b8', fontSize: '0.7rem', display: 'block', marginBottom: 4 }}>Explication (optionnel)</label>
            <textarea value={explanation} onChange={e => setExplanation(e.target.value)} rows={2}
              placeholder="Justification pédagogique de la bonne réponse"
              style={{ ...inputStyle(), resize: 'vertical' }} />
          </section>

          {/* ═══ BOUTONS ═══ */}
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              onClick={() => setShowPreview(true)}
              disabled={!canPreview}
              style={{ padding: '12px 20px', background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.3)', borderRadius: 10, color: '#60a5fa', cursor: canPreview ? 'pointer' : 'not-allowed', opacity: canPreview ? 1 : 0.5, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Eye size={16} /> Aperçu
            </motion.button>

            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              onClick={handleSave} disabled={isLoading}
              style={{ flex: 1, padding: 14, background: isLoading ? 'rgba(16,185,129,0.3)' : 'linear-gradient(135deg, #10b981, #059669)', border: 'none', borderRadius: 12, color: '#fff', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: isLoading ? 'not-allowed' : 'pointer' }}>
              {isLoading
                ? <><Loader size={16} style={{ animation: 'spin 1s linear infinite' }} /> Enregistrement...</>
                : <><Save size={16} /> {isEditing ? 'Mettre à jour' : 'Envoyer en validation'}</>}
            </motion.button>

            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              onClick={handleCancel}
              style={{ padding: '12px 24px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 10, color: '#94a3b8', cursor: 'pointer' }}>
              Annuler
            </motion.button>
          </div>

          {/* Note de validation */}
          <div style={{ marginTop: 16, padding: 12, background: 'rgba(245,158,11,0.05)', borderRadius: 8, border: '1px solid rgba(245,158,11,0.15)' }}>
            <p style={{ fontSize: '0.75rem', color: '#f59e0b', display: 'flex', alignItems: 'center', gap: 8 }}>
              <AlertCircle size={14} />
              Cette question sera soumise au circuit de validation pédagogique avant d'être disponible dans la banque.
            </p>
          </div>
        </div>
      </main>

      {/* Modals */}
      <AnimatePresence>
        {showPreview && (
          <QuestionPreviewModal question={previewQuestion} onClose={() => setShowPreview(false)} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showPostSaveModal && (
          <PostSaveModal isEditing={isEditing} onVariant={handleVariant} onFinish={handleFinish} />
        )}
      </AnimatePresence>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        select option { background: #1e293b; color: #f8fafc; }
        input:focus, textarea:focus, select:focus { 
          border-color: rgba(99,102,241,0.5) !important; 
          box-shadow: 0 0 0 3px rgba(99,102,241,0.12); 
        }
      `}</style>
    </div>
  );
};

export default CreateQuestion;