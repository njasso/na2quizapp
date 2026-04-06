// src/pages/creation/CreateQuestion.jsx - VERSION COMPLÈTE avec chargement d'édition
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Save, ArrowLeft, BookOpen, Layers, Tag, Clock, Award, 
  HelpCircle, PlusCircle, Trash2, AlertCircle, Loader, 
  XCircle, Eye, CheckCircle, Image as ImageIcon
} from 'lucide-react';

import { useAuth } from '../../contexts/AuthContext';
import api, { saveQuestions } from '../../services/api';import ImageUploader from '../../components/ImageUploader';
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
import ENV_CONFIG from '../../config/env';

const BACKEND_URL = ENV_CONFIG.BACKEND_URL;

console.log('[CreateQuestion] 🔧 Composant chargé');
console.log('[CreateQuestion] 🌐 BACKEND_URL:', BACKEND_URL);

const QUESTION_TYPES = [
  { id: 1, nom: "Notions de base (le Savoir)", description: "Évaluation des connaissances théoriques" },
  { id: 2, nom: "Intelligence Pratique (Savoir-Faire)", description: "Évaluation des compétences pratiques" },
  { id: 3, nom: "Savoir-être", description: "Évaluation du potentiel psychologique" }
];

// Composant d'aperçu de la question avec logs
const QuestionPreviewModal = ({ question, onClose }) => {
  console.log('[PreviewModal] 🖼️ Question reçue:', question);
  
  if (!question) {
    console.log('[PreviewModal] ❌ Aucune question');
    return null;
  }
  
  const getFullImageUrl = () => {
    console.log('[PreviewModal] 🔍 Recherche de l\'image...');
    console.log('[PreviewModal] - imageQuestion:', question.imageQuestion);
    console.log('[PreviewModal] - imageBase64:', question.imageBase64 ? '(présent)' : '(absent)');
    console.log('[PreviewModal] - imageMetadata:', question.imageMetadata);
    
    let imagePath = question.imageQuestion || question.imageBase64 || null;
    
    if (!imagePath) {
      console.log('[PreviewModal] ❌ Aucune image trouvée');
      return null;
    }
    
    console.log('[PreviewModal] 📷 Image path brute:', imagePath.substring(0, 100));
    
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
      console.log('[PreviewModal] ✅ URL complète détectée');
      return imagePath;
    }
    
    if (imagePath.startsWith('data:')) {
      console.log('[PreviewModal] ✅ Base64 détecté, longueur:', imagePath.length);
      return imagePath;
    }
    
    if (imagePath.startsWith('/uploads/')) {
      const fullUrl = `${BACKEND_URL}${imagePath}`;
      console.log('[PreviewModal] ✅ Chemin relatif converti:', fullUrl);
      return fullUrl;
    }
    
    if (imagePath.includes('qcm-')) {
      const fullUrl = `${BACKEND_URL}/uploads/questions/${imagePath}`;
      console.log('[PreviewModal] ✅ Nom de fichier converti:', fullUrl);
      return fullUrl;
    }
    
    console.log('[PreviewModal] ⚠️ Format non reconnu, retour tel quel');
    return imagePath;
  };
  
  const imageSrc = getFullImageUrl();
  const filledOptions = question.options?.filter(opt => opt && opt.trim() !== '') || [];
  const isMultipleChoice = question.typeQuestion === 2;
  const correctAnswers = isMultipleChoice ? (question.correctAnswers || []) : [question.correctAnswer];
  
  console.log('[PreviewModal] 🖼️ Image finale:', imageSrc);
  console.log('[PreviewModal] 📝 Options:', filledOptions.length);
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '20px'
      }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        style={{
          background: '#0f172a', border: '1px solid rgba(99,102,241,0.3)',
          borderRadius: 20, padding: 24, width: '100%', maxWidth: 600,
          maxHeight: '80vh', overflowY: 'auto'
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ color: '#f8fafc', fontSize: '1.1rem', fontWeight: 600 }}>
            Aperçu de la question
            {isMultipleChoice && <span style={{ color: '#f59e0b', marginLeft: 8, fontSize: '0.7rem' }}>(Choix multiples)</span>}
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}>
            <XCircle size={20} />
          </button>
        </div>
        
        {imageSrc ? (
          <div style={{ marginBottom: 16, textAlign: 'center' }}>
            <img 
              src={imageSrc} 
              alt="Illustration de la question" 
              style={{ 
                maxWidth: '100%', 
                maxHeight: 200, 
                borderRadius: 12, 
                objectFit: 'contain',
                background: 'rgba(0,0,0,0.2)'
              }} 
              onLoad={() => console.log('[PreviewModal] ✅ Image chargée avec succès')}
              onError={(e) => {
                console.error('[PreviewModal] ❌ Erreur chargement image:', imageSrc);
                e.target.style.display = 'none';
                const parent = e.target.parentElement;
                if (parent && !parent.querySelector('.error-message')) {
                  const errorMsg = document.createElement('p');
                  errorMsg.className = 'error-message';
                  errorMsg.style.cssText = 'color:#ef4444;font-size:0.7rem;margin-top:8px;text-align:center;';
                  errorMsg.textContent = '⚠️ Image non disponible';
                  parent.appendChild(errorMsg);
                }
              }}
            />
          </div>
        ) : (
          <div style={{ 
            marginBottom: 16, 
            padding: 20, 
            textAlign: 'center', 
            background: 'rgba(0,0,0,0.2)', 
            borderRadius: 8,
            color: '#64748b'
          }}>
            <ImageIcon size={24} style={{ marginBottom: 8 }} />
            <p style={{ fontSize: '0.7rem' }}>Aucune image</p>
          </div>
        )}
        
        <p style={{ color: '#f8fafc', fontSize: '1rem', marginBottom: 20, lineHeight: 1.5 }}>
          {question.libQuestion}
        </p>
        
        <div style={{ marginBottom: 16 }}>
          <p style={{ color: '#94a3b8', fontSize: '0.75rem', marginBottom: 8, fontWeight: 600 }}>Options :</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filledOptions.map((opt, i) => {
              const isCorrect = isMultipleChoice 
                ? correctAnswers.includes(opt)
                : opt === question.correctAnswer;
              return (
                <div key={i} style={{
                  padding: '10px 12px',
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
                  <span style={{ color: '#94a3b8', flex: 1 }}>{opt}</span>
                  {isCorrect && <CheckCircle size={14} color="#10b981" />}
                </div>
              );
            })}
          </div>
        </div>
        
        {question.explanation && (
          <div style={{ marginBottom: 16, padding: 10, background: 'rgba(59,130,246,0.05)', borderRadius: 8 }}>
            <p style={{ color: '#64748b', fontSize: '0.75rem' }}>💡 Explication : {question.explanation}</p>
          </div>
        )}
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
          <div style={{ padding: 8, background: 'rgba(255,255,255,0.03)', borderRadius: 8 }}>
            <p style={{ color: '#64748b', fontSize: '0.6rem' }}>Points</p>
            <p style={{ color: '#f59e0b', fontWeight: 600 }}>{question.points} pt{question.points > 1 ? 's' : ''}</p>
          </div>
          <div style={{ padding: 8, background: 'rgba(255,255,255,0.03)', borderRadius: 8 }}>
            <p style={{ color: '#64748b', fontSize: '0.6rem' }}>Temps</p>
            <p style={{ color: '#60a5fa', fontWeight: 600 }}>{question.tempsMin} min</p>
          </div>
          <div style={{ padding: 8, background: 'rgba(255,255,255,0.03)', borderRadius: 8 }}>
            <p style={{ color: '#64748b', fontSize: '0.6rem' }}>Niveau</p>
            <p style={{ color: '#a78bfa', fontWeight: 600 }}>{question.niveau}</p>
          </div>
          <div style={{ padding: 8, background: 'rgba(255,255,255,0.03)', borderRadius: 8 }}>
            <p style={{ color: '#64748b', fontSize: '0.6rem' }}>Matière</p>
            <p style={{ color: '#34d399', fontWeight: 600 }}>{question.matiere}</p>
          </div>
        </div>

        {question.libChapitre && (
          <div style={{ marginBottom: 16, padding: 8, background: 'rgba(139,92,246,0.1)', borderRadius: 8 }}>
            <p style={{ color: '#a78bfa', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: 6 }}>
              <BookOpen size={12} /> Chapitre : {question.libChapitre}
            </p>
          </div>
        )}
        
        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '8px 20px', background: '#475569', border: 'none', borderRadius: 8, color: '#fff', cursor: 'pointer' }}>
            Fermer
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

const CreateQuestion = () => {
  console.log('[CreateQuestion] 🚀 Composant monté');
  
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  console.log('[CreateQuestion] 👤 Utilisateur:', user?.name, user?.role);
  console.log('[CreateQuestion] 📍 Location state:', location.state);

  // Référentiel
  const [selectedDomainId, setSelectedDomainId] = useState('');
  const [selectedSousDomaineId, setSelectedSousDomaineId] = useState('');
  const [selectedLevelId, setSelectedLevelId] = useState('');
  const [selectedMatiereId, setSelectedMatiereId] = useState('');
  
  // Noms affichés
  const [domainNom, setDomainNom] = useState('');
  const [sousDomaineNom, setSousDomaineNom] = useState('');
  const [levelNom, setLevelNom] = useState('');
  const [matiereNom, setMatiereNom] = useState('');
  
  // Contenu question
  const [libQuestion, setLibQuestion] = useState('');
  const [options, setOptions] = useState(['', '', '']);
  const [correctAnswer, setCorrectAnswer] = useState('');
  const [correctAnswers, setCorrectAnswers] = useState([]);
  const [typeQuestion, setTypeQuestion] = useState(1);
  const [points, setPoints] = useState(1);
  const [tempsMin, setTempsMin] = useState(1);
  const [explanation, setExplanation] = useState('');
  const [libChapitre, setLibChapitre] = useState('');
  
  // Image
  const [imageQuestion, setImageQuestion] = useState('');
  const [imageBase64, setImageBase64] = useState('');
  const [imageMetadata, setImageMetadata] = useState({});
  
  // États UI
  const [isLoading, setIsLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingQuestionId, setEditingQuestionId] = useState(null);
  const [validationErrors, setValidationErrors] = useState({
    libQuestion: false,
    options: false,
    correctAnswer: false,
    domaine: false,
    niveau: false,
    matiere: false,
    libChapitre: false,
  });

  // ✅ RÉCUPÉRATION DES DONNÉES D'ÉDITION
  useEffect(() => {
    console.log('[CreateQuestion] 🔍 Vérification des données d\'édition...');
    
    // 1. Vérifier dans location.state
    if (location.state?.editQuestion) {
      const q = location.state.editQuestion;
      console.log('[CreateQuestion] 📝 Édition depuis location.state:', q);
      loadQuestionForEditing(q);
    } 
    // 2. Vérifier dans sessionStorage (fallback)
    else {
      const storedQuestion = sessionStorage.getItem('editQuestion');
      if (storedQuestion) {
        console.log('[CreateQuestion] 📝 Édition depuis sessionStorage');
        const q = JSON.parse(storedQuestion);
        loadQuestionForEditing(q);
        // Nettoyer après chargement
        sessionStorage.removeItem('editQuestion');
      }
    }
  }, [location]);

  // Fonction pour charger les données dans le formulaire
  const loadQuestionForEditing = (q) => {
    console.log('[CreateQuestion] 📥 Chargement des données pour édition:', q);
    console.log('[CreateQuestion] 🖼️ Image reçue:', q.imageQuestion);
    console.log('[CreateQuestion] 🖼️ ImageBase64 reçue:', q.imageBase64 ? '(présent, longueur: ' + q.imageBase64.length + ')' : '(absent)');
    
    setIsEditing(true);
    setEditingQuestionId(q._id);
    
    // Référentiel - on garde les noms affichés
    setLibQuestion(q.libQuestion || '');
    
    // Options
    if (q.options && Array.isArray(q.options)) {
      setOptions(q.options);
    } else {
      setOptions(['', '', '']);
    }
    
    setTypeQuestion(q.typeQuestion || 1);
    setPoints(q.points || 1);
    setTempsMin(q.tempsMin || 1);
    setExplanation(q.explanation || '');
    setLibChapitre(q.libChapitre || '');
    
    // Image
    setImageQuestion(q.imageQuestion || '');
    setImageBase64(q.imageBase64 || '');
    setImageMetadata(q.imageMetadata || {});
    
    // Réponse correcte
    if (q.typeQuestion === 1) {
      const correctOpt = q.correctAnswer || (q.options && q.options[q.bonOpRep]);
      setCorrectAnswer(correctOpt || '');
    } else {
      setCorrectAnswers(q.correctAnswers || []);
    }
    
    // Pour les IDs des référentiels (si vous avez des fonctions de mapping nom -> ID)
    // À implémenter si nécessaire
    if (q.domaine) {
      // Chercher l'ID correspondant au nom
      const domaines = getAllDomaines();
      const found = domaines.find(d => d.nom === q.domaine);
      if (found) setSelectedDomainId(found.id);
    }
    
    toast.success('Question chargée pour modification');
  };

  // Mise à jour des noms
  useEffect(() => {
    if (selectedDomainId) {
      const nom = getDomainNom(selectedDomainId);
      setDomainNom(nom);
      console.log('[CreateQuestion] Domaine sélectionné:', nom);
    }
  }, [selectedDomainId]);

  useEffect(() => {
    if (selectedDomainId && selectedSousDomaineId) {
      const nom = getSousDomaineNom(selectedDomainId, selectedSousDomaineId);
      setSousDomaineNom(nom);
      console.log('[CreateQuestion] Sous-domaine sélectionné:', nom);
    }
  }, [selectedDomainId, selectedSousDomaineId]);

  useEffect(() => {
    if (selectedDomainId && selectedSousDomaineId && selectedLevelId) {
      const nom = getLevelNom(selectedDomainId, selectedSousDomaineId, selectedLevelId);
      setLevelNom(nom);
      console.log('[CreateQuestion] Niveau sélectionné:', nom);
    }
  }, [selectedDomainId, selectedSousDomaineId, selectedLevelId]);

  useEffect(() => {
    if (selectedDomainId && selectedSousDomaineId && selectedMatiereId) {
      const nom = getMatiereNom(selectedDomainId, selectedSousDomaineId, selectedMatiereId);
      setMatiereNom(nom);
      console.log('[CreateQuestion] Matière sélectionnée:', nom);
    }
  }, [selectedDomainId, selectedSousDomaineId, selectedMatiereId]);

  // Gestion des options dynamiques
  const addOption = () => {
    if (options.length < 5) {
      setOptions([...options, '']);
      console.log('[CreateQuestion] Option ajoutée, total:', options.length + 1);
    }
  };

  const removeOption = (index) => {
    if (options.length > 3) {
      const newOptions = options.filter((_, i) => i !== index);
      setOptions(newOptions);
      console.log('[CreateQuestion] Option supprimée, reste:', newOptions.length);
      if (typeQuestion === 1 && correctAnswer === options[index]) {
        setCorrectAnswer('');
      }
      if (typeQuestion === 2 && correctAnswers.includes(options[index])) {
        setCorrectAnswers(correctAnswers.filter(a => a !== options[index]));
      }
    }
  };

  const handleOptionChange = (index, value) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const handleCorrectAnswerChange = (value, index) => {
    if (typeQuestion === 1) {
      setCorrectAnswer(value);
      console.log('[CreateQuestion] Réponse correcte (unique):', value);
    } else {
      if (correctAnswers.includes(value)) {
        setCorrectAnswers(correctAnswers.filter(a => a !== value));
        console.log('[CreateQuestion] Réponse retirée:', value);
      } else {
        setCorrectAnswers([...correctAnswers, value]);
        console.log('[CreateQuestion] Réponse ajoutée:', value);
      }
    }
  };

  // Gestion du changement d'image avec logs
  const handleImageChange = (url, base64, metadata) => {
    console.log('[CreateQuestion] ========== IMAGE CHANGE RECEIVED ==========');
    console.log('[CreateQuestion] 📷 url:', url);
    console.log('[CreateQuestion] 📷 base64 présent:', !!base64);
    console.log('[CreateQuestion] 📷 base64 length:', base64?.length);
    console.log('[CreateQuestion] 📷 metadata:', metadata);
    
    setImageQuestion(url || '');
    setImageBase64(base64 || '');
    setImageMetadata(metadata || {});
    
    console.log('[CreateQuestion] ✅ État mis à jour - imageQuestion:', url);
    console.log('[CreateQuestion] ✅ État mis à jour - imageBase64 présent:', !!base64);
  };

  // Validation du formulaire
  const validateForm = () => {
    const filledOptions = options.filter(opt => opt.trim() !== '');
    const hasCorrectAnswer = typeQuestion === 1 
      ? correctAnswer.trim() !== ''
      : correctAnswers.length > 0;
    
    const errors = {
      libQuestion: !libQuestion.trim(),
      options: filledOptions.length < 3 || filledOptions.length > 5,
      correctAnswer: !hasCorrectAnswer,
      domaine: !selectedDomainId,
      niveau: !selectedLevelId,
      matiere: !selectedMatiereId,
      libChapitre: !libChapitre.trim(),
    };
    setValidationErrors(errors);
    
    const isValid = !errors.libQuestion && !errors.options && !errors.correctAnswer && 
           !errors.domaine && !errors.niveau && !errors.matiere && !errors.libChapitre;
    
    console.log('[CreateQuestion] Validation:', isValid ? '✅ OK' : '❌ ERREURS', errors);
    return isValid;
  };

  // Construction de l'objet question pour l'aperçu
  const buildPreviewQuestion = () => {
    const filledOptions = options.filter(opt => opt.trim() !== '');
    const previewData = {
      libQuestion,
      options: filledOptions,
      correctAnswer,
      correctAnswers,
      typeQuestion,
      points,
      tempsMin,
      explanation,
      domaine: domainNom,
      niveau: levelNom,
      matiere: matiereNom,
      libChapitre,
      imageQuestion: imageQuestion,
      imageBase64: imageBase64,
      imageMetadata: imageMetadata,
    };
    
    console.log('[CreateQuestion] 📦 Construction aperçu:', {
      libQuestion: previewData.libQuestion?.substring(0, 50),
      imageQuestion: previewData.imageQuestion,
      imageBase64: previewData.imageBase64 ? '(présent)' : '(absent)',
      optionsCount: previewData.options.length
    });
    
    return previewData;
  };

  const handleSave = async () => {
    console.log('[CreateQuestion] 💾 Tentative de sauvegarde...');
    
    if (!validateForm()) {
      toast.error('Veuillez corriger les erreurs avant d\'enregistrer');
      return;
    }

    const filledOptions = options.filter(opt => opt.trim() !== '');
    
    const resolvedDomainNom = domainNom || getDomainNom(selectedDomainId) || '';
    const resolvedLevelNom = levelNom || getLevelNom(selectedDomainId, selectedSousDomaineId, selectedLevelId) || '';
    const resolvedMatiereNom = matiereNom || getMatiereNom(selectedDomainId, selectedSousDomaineId, selectedMatiereId) || '';
    const resolvedSousDomaineNom = sousDomaineNom || getSousDomaineNom(selectedDomainId, selectedSousDomaineId) || '';
    
    if (!resolvedDomainNom || !resolvedLevelNom || !resolvedMatiereNom) {
      toast.error('Veuillez sélectionner un domaine, un niveau et une matière valides');
      return;
    }
    
    if (!libChapitre.trim()) {
      toast.error('Veuillez renseigner le chapitre');
      return;
    }
    
    let bonOpRep = null;
    if (typeQuestion === 1 && correctAnswer) {
      bonOpRep = filledOptions.findIndex(opt => opt === correctAnswer);
    } else if (typeQuestion === 2 && correctAnswers.length > 0) {
      bonOpRep = filledOptions.findIndex(opt => correctAnswers.includes(opt));
    }
    
    if (bonOpRep === -1 || bonOpRep === null) {
      bonOpRep = 0;
    }
    
    const questionData = {
      libQuestion: libQuestion,
      options: filledOptions,
      correctAnswer: typeQuestion === 1 ? correctAnswer : correctAnswers,
      bonOpRep: bonOpRep,
      typeQuestion: typeQuestion,
      points: points,
      tempsMin: tempsMin,
      explanation: explanation,
      domaine: resolvedDomainNom,
      niveau: resolvedLevelNom,
      matiere: resolvedMatiereNom,
      sousDomaine: resolvedSousDomaineNom,
      libChapitre: libChapitre,
      imageQuestion: imageQuestion,
      imageBase64: imageBase64,
      imageMetadata: imageMetadata,
      matriculeAuteur: user?.matricule || user?.email || '',
      status: 'pending'
    };

    console.log('[CreateQuestion] 📤 Envoi des données:', {
      libQuestion: questionData.libQuestion?.substring(0, 50),
      imageQuestion: questionData.imageQuestion,
      imageBase64: questionData.imageBase64 ? '(présent, longueur: ' + questionData.imageBase64.length + ')' : '(absent)',
      optionsCount: questionData.options.length,
      bonOpRep: questionData.bonOpRep,
      isEditing: isEditing
    });
    
    setIsLoading(true);
    try {
      let response;
      
      if (isEditing && editingQuestionId) {
        // Mise à jour d'une question existante
        console.log('[CreateQuestion] Mise à jour question:', editingQuestionId);
        response = await api.put(`/api/questions/${editingQuestionId}`, questionData);
      } else {
        // Création d'une nouvelle question
        response = await saveQuestions({ questions: [questionData] });
      }
      
      console.log('[CreateQuestion] ✅ Réponse serveur:', response);

      if (response.success) {
        toast.success(isEditing ? 'Question modifiée et renvoyée en validation !' : 'Question créée et envoyée en validation !');
        navigate('/teacher/questions');
      } else {
        throw new Error(response.error || 'Erreur lors de la création');
      }
    } catch (error) {
      console.error('[CreateQuestion] ❌ Erreur:', error);
      toast.error(error.message || 'Erreur lors de la création');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    const hasData = libQuestion.trim() || options.some(opt => opt.trim()) || imageQuestion || imageBase64;
    if (hasData) {
      if (window.confirm('Voulez-vous vraiment annuler ? Les données non enregistrées seront perdues.')) {
        navigate('/evaluate');
      }
    } else {
      navigate('/evaluate');
    }
  };

  const previewQuestion = buildPreviewQuestion();

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

      <main style={{ position: 'relative', zIndex: 1, maxWidth: 900, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
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
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '4px 12px', background: 'rgba(99,102,241,0.1)',
              border: '1px solid rgba(99,102,241,0.3)', borderRadius: 20,
              marginBottom: 8
            }}>
              <HelpCircle size={14} color="#6366f1" />
              <span style={{ color: '#a5b4fc', fontSize: '0.7rem', fontWeight: 600 }}>
                {isEditing ? 'MODIFICATION DE QCM' : 'CRÉATION DE QCM'}
              </span>
            </div>
            <h1 style={{ fontSize: '2rem', fontWeight: 700, color: '#f8fafc' }}>
              {isEditing ? 'Modifier la question' : 'Créer une question'}
            </h1>
            <p style={{ color: '#64748b' }}>
              {isEditing ? 'Modifiez votre question et renvoyez-la en validation' : 'La question sera soumise à validation avant d\'être disponible dans la base'}
            </p>
          </div>
        </div>

        <div style={{
          background: 'rgba(15,23,42,0.7)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(99,102,241,0.2)',
          borderRadius: 24,
          padding: 32
        }}>
          {/* Référentiel */}
          <div style={{ marginBottom: 24 }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#f8fafc', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <BookOpen size={16} color="#8b5cf6" />
              Référentiel de la question *
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label style={{ color: '#94a3b8', fontSize: '0.75rem', marginBottom: 4, display: 'block' }}>Domaine *</label>
                <select value={selectedDomainId} onChange={(e) => { setSelectedDomainId(e.target.value); setSelectedSousDomaineId(''); setSelectedLevelId(''); setSelectedMatiereId(''); }}
                  style={{ width: '100%', padding: 10, background: 'rgba(255,255,255,0.05)', border: `1px solid ${validationErrors.domaine ? '#ef4444' : 'rgba(99,102,241,0.2)'}`, borderRadius: 8, color: '#f8fafc' }}>
                  <option value="">Sélectionner...</option>
                  {getAllDomaines().map(d => <option key={d.id} value={d.id}>{d.id} - {d.nom}</option>)}
                </select>
              </div>
              <div>
                <label style={{ color: '#94a3b8', fontSize: '0.75rem', marginBottom: 4, display: 'block' }}>Sous-domaine *</label>
                <select value={selectedSousDomaineId} onChange={(e) => setSelectedSousDomaineId(e.target.value)} disabled={!selectedDomainId}
                  style={{ width: '100%', padding: 10, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 8, color: '#f8fafc', opacity: !selectedDomainId ? 0.5 : 1 }}>
                  <option value="">Sélectionner...</option>
                  {getAllSousDomaines(selectedDomainId).map(sd => <option key={sd.id} value={sd.id}>{sd.id} - {sd.nom}</option>)}
                </select>
              </div>
              <div>
                <label style={{ color: '#94a3b8', fontSize: '0.75rem', marginBottom: 4, display: 'block' }}>Niveau *</label>
                <select value={selectedLevelId} onChange={(e) => setSelectedLevelId(e.target.value)} disabled={!selectedSousDomaineId}
                  style={{ width: '100%', padding: 10, background: 'rgba(255,255,255,0.05)', border: `1px solid ${validationErrors.niveau ? '#ef4444' : 'rgba(99,102,241,0.2)'}`, borderRadius: 8, color: '#f8fafc', opacity: !selectedSousDomaineId ? 0.5 : 1 }}>
                  <option value="">Sélectionner...</option>
                  {getAllLevels(selectedDomainId, selectedSousDomaineId).map(l => <option key={l.id} value={l.id}>{l.id} - {l.nom}</option>)}
                </select>
              </div>
              <div>
                <label style={{ color: '#94a3b8', fontSize: '0.75rem', marginBottom: 4, display: 'block' }}>Matière *</label>
                <select value={selectedMatiereId} onChange={(e) => setSelectedMatiereId(e.target.value)} disabled={!selectedSousDomaineId}
                  style={{ width: '100%', padding: 10, background: 'rgba(255,255,255,0.05)', border: `1px solid ${validationErrors.matiere ? '#ef4444' : 'rgba(99,102,241,0.2)'}`, borderRadius: 8, color: '#f8fafc', opacity: !selectedSousDomaineId ? 0.5 : 1 }}>
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

          {/* Type de question */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ color: '#94a3b8', fontSize: '0.8rem', marginBottom: 6, display: 'block' }}>Type de question *</label>
            <select value={typeQuestion} onChange={(e) => { setTypeQuestion(parseInt(e.target.value)); setCorrectAnswer(''); setCorrectAnswers([]); }}
              style={{ width: '100%', padding: 10, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 8, color: '#f8fafc' }}>
              {QUESTION_TYPES.map(t => <option key={t.id} value={t.id}>{t.id} - {t.nom}</option>)}
            </select>
            <p style={{ fontSize: '0.65rem', color: '#64748b', marginTop: 4 }}>
              {QUESTION_TYPES.find(t => t.id === typeQuestion)?.description}
            </p>
          </div>

          {/* Libellé */}
          <div style={{ position: 'relative' }}>
            <textarea value={libQuestion} onChange={(e) => setLibQuestion(e.target.value)}
              rows={3} placeholder="Libellé de la question *"
              style={{ width: '100%', padding: 12, marginBottom: 16, background: 'rgba(255,255,255,0.05)', border: `1px solid ${validationErrors.libQuestion ? '#ef4444' : 'rgba(99,102,241,0.2)'}`, borderRadius: 10, color: '#f8fafc' }} />
            {validationErrors.libQuestion && <p style={{ color: '#ef4444', fontSize: '0.7rem' }}><AlertCircle size={12} /> Le libellé est requis</p>}
          </div>

          {/* Image Uploader */}
          <ImageUploader 
            value={imageQuestion || imageBase64} 
            onChange={handleImageChange}
            label="Image (optionnel)" 
          /> 
          
          {/* Options */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ color: '#94a3b8', fontSize: '0.7rem', marginBottom: 8, display: 'block' }}>
              Options (3 à 5) *
            </label>
            {options.map((opt, idx) => (
              <div key={idx} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <input type="text" value={opt} onChange={(e) => handleOptionChange(idx, e.target.value)}
                  placeholder={`Option ${String.fromCharCode(65 + idx)}`}
                  style={{ flex: 1, padding: 10, background: 'rgba(255,255,255,0.05)', border: `1px solid ${validationErrors.options ? '#ef4444' : 'rgba(99,102,241,0.2)'}`, borderRadius: 8, color: '#f8fafc' }} />
                {options.length > 3 && (
                  <button onClick={() => removeOption(idx)} style={{ padding: '0 12px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 6, color: '#ef4444', cursor: 'pointer' }}>
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            ))}
            {options.length < 5 && (
              <button onClick={addOption} style={{ marginTop: 8, padding: '6px 12px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 6, color: '#10b981', cursor: 'pointer', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                <PlusCircle size={14} /> Ajouter une option ({options.length}/5)
              </button>
            )}
            {validationErrors.options && <p style={{ color: '#ef4444', fontSize: '0.7rem', marginTop: 8 }}><AlertCircle size={12} /> Entre 3 et 5 options sont requises</p>}
          </div>
          
          {/* Points et temps */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div>
              <label style={{ color: '#94a3b8', fontSize: '0.7rem' }}>Points (1-10)</label>
              <input type="number" min="1" max="10" value={points} onChange={(e) => setPoints(parseInt(e.target.value))}
                style={{ width: '100%', padding: 10, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 8, color: '#f8fafc' }} />
            </div>
            <div>
              <label style={{ color: '#94a3b8', fontSize: '0.7rem' }}>Temps (minutes)</label>
              <input type="number" min="0.5" max="30" step="0.5" value={tempsMin} onChange={(e) => setTempsMin(parseFloat(e.target.value))}
                style={{ width: '100%', padding: 10, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 8, color: '#f8fafc' }} />
            </div>
          </div>

          {/* Chapitre */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ color: '#94a3b8', fontSize: '0.7rem' }}>
              Chapitre <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input 
              type="text" 
              value={libChapitre} 
              onChange={(e) => setLibChapitre(e.target.value)}
              placeholder="Ex: Chapitre 3 - Les fonctions dérivées"
              style={{ 
                width: '100%', padding: 10, 
                background: 'rgba(255,255,255,0.05)', 
                border: `1px solid ${validationErrors.libChapitre ? '#ef4444' : 'rgba(99,102,241,0.2)'}`, 
                borderRadius: 8, color: '#f8fafc' 
              }}
            />
            {validationErrors.libChapitre && (
              <p style={{ color: '#ef4444', fontSize: '0.7rem', marginTop: 4 }}>
                <AlertCircle size={12} /> Le chapitre est obligatoire
              </p>
            )}
          </div>

          {/* Réponse correcte */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ color: '#94a3b8', fontSize: '0.7rem', marginBottom: 4, display: 'block' }}>Bonne réponse *</label>
            {typeQuestion === 1 ? (
              <select value={correctAnswer} onChange={(e) => handleCorrectAnswerChange(e.target.value)}
                style={{ width: '100%', padding: 10, background: 'rgba(255,255,255,0.05)', border: `1px solid ${validationErrors.correctAnswer ? '#ef4444' : 'rgba(99,102,241,0.2)'}`, borderRadius: 8, color: '#f8fafc' }}>
                <option value="">Sélectionner...</option>
                {options.filter(opt => opt.trim()).map((opt, idx) => <option key={idx} value={opt}>{String.fromCharCode(65 + idx)} - {opt}</option>)}
              </select>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {options.filter(opt => opt.trim()).map((opt, idx) => (
                  <label key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input type="checkbox" checked={correctAnswers.includes(opt)} onChange={() => handleCorrectAnswerChange(opt)} />
                    <span style={{ color: '#f8fafc' }}>{String.fromCharCode(65 + idx)} - {opt}</span>
                  </label>
                ))}
              </div>
            )}
            {validationErrors.correctAnswer && <p style={{ color: '#ef4444', fontSize: '0.7rem' }}><AlertCircle size={12} /> Sélectionnez au moins une réponse correcte</p>}
          </div>

          {/* Explication */}
          <textarea value={explanation} onChange={(e) => setExplanation(e.target.value)} rows={2}
            placeholder="Explication (optionnel)"
            style={{ width: '100%', padding: 12, marginBottom: 16, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 10, color: '#f8fafc' }} />

          {/* Boutons */}
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <motion.button 
              whileHover={{ scale: 1.02 }} 
              whileTap={{ scale: 0.98 }} 
              onClick={() => {
                console.log('[CreateQuestion] 👁️ Ouverture aperçu');
                setShowPreview(true);
              }}
              disabled={!libQuestion.trim() || options.filter(opt => opt.trim()).length < 3}
              style={{ 
                padding: '12px 20px', 
                background: 'rgba(59,130,246,0.15)', 
                border: '1px solid rgba(59,130,246,0.3)', 
                borderRadius: 10, 
                color: '#60a5fa', 
                cursor: (!libQuestion.trim() || options.filter(opt => opt.trim()).length < 3) ? 'not-allowed' : 'pointer',
                opacity: (!libQuestion.trim() || options.filter(opt => opt.trim()).length < 3) ? 0.5 : 1,
                display: 'flex',
                alignItems: 'center',
                gap: 8
              }}
            >
              <Eye size={16} /> Aperçu
            </motion.button>
            
            <motion.button 
              whileHover={{ scale: 1.02 }} 
              whileTap={{ scale: 0.98 }} 
              onClick={handleSave} 
              disabled={isLoading}
              style={{ 
                flex: 1, 
                padding: 14, 
                background: isLoading ? 'rgba(16,185,129,0.3)' : 'linear-gradient(135deg, #10b981, #059669)', 
                border: 'none', 
                borderRadius: 12, 
                color: 'white', 
                fontWeight: 600, 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                gap: 8, 
                cursor: isLoading ? 'not-allowed' : 'pointer' 
              }}
            >
              {isLoading ? <><Loader size={16} className="animate-spin" /> Enregistrement...</> : <><Save size={16} /> {isEditing ? 'Mettre à jour' : 'Envoyer en validation'}</>}
            </motion.button>
            
            <motion.button 
              whileHover={{ scale: 1.02 }} 
              whileTap={{ scale: 0.98 }} 
              onClick={handleCancel}
              style={{ 
                padding: '12px 24px', 
                background: 'rgba(255,255,255,0.1)', 
                border: '1px solid rgba(255,255,255,0.2)', 
                borderRadius: 10, 
                color: '#94a3b8', 
                cursor: 'pointer' 
              }}
            >
              Annuler
            </motion.button>
          </div>

          <div style={{ marginTop: 16, padding: 12, background: 'rgba(245,158,11,0.05)', borderRadius: 8 }}>
            <p style={{ fontSize: '0.75rem', color: '#f59e0b', display: 'flex', alignItems: 'center', gap: 8 }}>
              <AlertCircle size={14} />
              ⚠️ Cette question sera soumise à validation pédagogique avant d'être disponible dans la base de données.
            </p>
          </div>
        </div>
      </main>

      {/* Modal d'aperçu */}
      <AnimatePresence>
        {showPreview && previewQuestion.libQuestion && (
          <QuestionPreviewModal 
            question={previewQuestion} 
            onClose={() => {
              console.log('[CreateQuestion] 🔒 Fermeture aperçu');
              setShowPreview(false);
            }} 
          />
        )}
      </AnimatePresence>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .animate-spin { animation: spin 1s linear infinite; }
      `}</style>
    </div>
  );
};

export default CreateQuestion;