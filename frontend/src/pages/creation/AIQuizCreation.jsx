// src/pages/creation/AIQuizCreation.jsx - Version complète avec chapitre obligatoire
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, Loader2, ArrowLeft, Bot,
  Settings, Eye, BookOpen, Layers, Tag,
  AlertCircle, CheckCircle, RefreshCw,
  Clock, Award, ChevronDown, ChevronUp, Shield, User, XCircle,
  Database, Download, Save, Trash2, Edit, Copy
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
import { generateQuestionsAI, saveQuestions } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import ImageUploader from '../../components/ImageUploader';
import toast, { Toaster } from 'react-hot-toast';

const ALLOWED_ROLES = ['ENSEIGNANT', 'ADMIN_DELEGUE', 'ADMIN_SYSTEME'];

const QUESTION_TYPES = [
  { id: 1, nom: "Notions de base (le Savoir)", description: "Évaluation des connaissances théoriques" },
  { id: 2, nom: "Intelligence Pratique (Savoir-Faire)", description: "Évaluation des compétences pratiques" },
  { id: 3, nom: "Savoir-être", description: "Évaluation du potentiel psychologique" }
];

// Composant d'aperçu de question avec chapitre
const QuestionPreviewModal = ({ question, onClose }) => {
  if (!question) return null;
  
  const imageSrc = question.imageQuestion || (question.imageBase64?.startsWith('data:') ? question.imageBase64 : null);
  const filledOptions = question.options?.filter(opt => opt && opt.trim() !== '') || [];
  const isMultipleChoice = question.typeQuestion === 2;
  const correctAnswers = isMultipleChoice ? (question.correctAnswers || [question.correctAnswer]) : [question.correctAnswer];
  
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
        
        {imageSrc && (
          <div style={{ marginBottom: 16, textAlign: 'center' }}>
            <img 
              src={imageSrc} 
              alt="Illustration" 
              style={{ maxWidth: '100%', maxHeight: 150, borderRadius: 8, objectFit: 'contain' }} 
            />
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
        
        {/* ✅ Affichage du chapitre */}
        {question.libChapitre && (
          <div style={{ marginBottom: 16, padding: 8, background: 'rgba(139,92,246,0.1)', borderRadius: 8 }}>
            <p style={{ color: '#a78bfa', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: 6 }}>
              <BookOpen size={12} /> Chapitre : {question.libChapitre}
            </p>
          </div>
        )}
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
          <div style={{ padding: 8, background: 'rgba(255,255,255,0.03)', borderRadius: 8 }}>
            <p style={{ color: '#64748b', fontSize: '0.6rem' }}>Points</p>
            <p style={{ color: '#f59e0b', fontWeight: 600 }}>{question.points} pt{question.points > 1 ? 's' : ''}</p>
          </div>
          <div style={{ padding: 8, background: 'rgba(255,255,255,0.03)', borderRadius: 8 }}>
            <p style={{ color: '#64748b', fontSize: '0.6rem' }}>Temps</p>
            <p style={{ color: '#60a5fa', fontWeight: 600 }}>{question.tempsMin || 1} min</p>
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
        
        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '8px 20px', background: '#475569', border: 'none', borderRadius: 8, color: '#fff', cursor: 'pointer' }}>
            Fermer
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

const AIQuizCreation = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  // États pour les IDs (conforme Table QCM)
  const [selectedDomainId, setSelectedDomainId] = useState('');
  const [selectedSousDomaineId, setSelectedSousDomaineId] = useState('');
  const [selectedLevelId, setSelectedLevelId] = useState('');
  const [selectedMatiereId, setSelectedMatiereId] = useState('');
  
  const [domainNom, setDomainNom] = useState('');
  const [sousDomaineNom, setSousDomaineNom] = useState('');
  const [levelNom, setLevelNom] = useState('');
  const [matiereNom, setMatiereNom] = useState('');
  
  // ✅ Nouvel état pour le chapitre
  const [libChapitre, setLibChapitre] = useState('');
  
  const [questionType, setQuestionType] = useState('single');
  const [numQuestions, setNumQuestions] = useState(5);
  const [difficulty, setDifficulty] = useState('moyen');
  const keywordsRef = useRef('');
  const [expandedAdvanced, setExpandedAdvanced] = useState(false);
  
  // États pour les points
  const [pointsType, setPointsType] = useState('uniform');
  const [globalPoints, setGlobalPoints] = useState(1);

  // État des questions générées
  const [generatedQuestions, setGeneratedQuestions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [error, setError] = useState(null);
  const [authError, setAuthError] = useState(null);
  const [editingIndex, setEditingIndex] = useState(null);
  const [editData, setEditData] = useState(null);
  const [previewQuestion, setPreviewQuestion] = useState(null);
  
  // ✅ Validation du chapitre
  const [chapitreError, setChapitreError] = useState(false);

  // Mise à jour des noms
  useEffect(() => { if (selectedDomainId) setDomainNom(getDomainNom(selectedDomainId)); }, [selectedDomainId]);
  useEffect(() => { if (selectedDomainId && selectedSousDomaineId) setSousDomaineNom(getSousDomaineNom(selectedDomainId, selectedSousDomaineId)); }, [selectedDomainId, selectedSousDomaineId]);
  useEffect(() => { if (selectedDomainId && selectedSousDomaineId && selectedLevelId) setLevelNom(getLevelNom(selectedDomainId, selectedSousDomaineId, selectedLevelId)); }, [selectedDomainId, selectedSousDomaineId, selectedLevelId]);
  useEffect(() => { if (selectedDomainId && selectedSousDomaineId && selectedMatiereId) setMatiereNom(getMatiereNom(selectedDomainId, selectedSousDomaineId, selectedMatiereId)); }, [selectedDomainId, selectedSousDomaineId, selectedMatiereId]);

  // Vérification auth
  useEffect(() => {
    if (authLoading) return;
    if (!user) { setAuthError('Vous devez être connecté'); toast.error('Veuillez vous connecter'); setTimeout(() => navigate('/login'), 2000); return; }
    if (!ALLOWED_ROLES.includes(user?.role)) { setAuthError(`Accès non autorisé. Rôle requis: ENSEIGNANT`); toast.error('Accès non autorisé.'); setTimeout(() => navigate('/dashboard'), 2000); return; }
    setAuthError(null);
  }, [user, authLoading, navigate]);

  const getDifficultyFromLevel = () => {
    const levelName = levelNom.toLowerCase();
    if (levelName.includes('cp') || levelName.includes('ce1') || levelName.includes('ce2')) return 'facile';
    if (levelName.includes('cm1') || levelName.includes('cm2') || levelName.includes('6e')) return 'moyen';
    if (levelName.includes('5e') || levelName.includes('4e') || levelName.includes('3e')) return 'difficile';
    if (levelName.includes('2nde') || levelName.includes('1ère') || levelName.includes('terminale')) return 'difficile';
    return difficulty;
  };

  useEffect(() => {
    let interval;
    if (isLoading) { setGenerationProgress(0); interval = setInterval(() => setGenerationProgress(prev => prev >= 90 ? 90 : prev + 10), 300); }
    return () => clearInterval(interval);
  }, [isLoading]);

  // Génération des questions par IA
  const handleGenerate = async () => {
    if (!user) { toast.error('Veuillez vous connecter'); navigate('/login'); return; }
    if (!selectedDomainId || !selectedSousDomaineId || !selectedLevelId || !selectedMatiereId) {
      toast.error('Veuillez remplir tous les champs obligatoires (Domaine, Sous-domaine, Niveau, Matière)');
      return;
    }
    
    // ✅ Vérification du chapitre
    if (!libChapitre.trim()) {
      setChapitreError(true);
      toast.error('Veuillez renseigner le chapitre');
      return;
    }
    setChapitreError(false);

    setIsLoading(true);
    setError(null);

    try {
      const resolvedDomainNom = domainNom || getDomainNom(selectedDomainId) || selectedDomainId;
      const resolvedSousDomNom = sousDomaineNom || getSousDomaineNom(selectedDomainId, selectedSousDomaineId) || selectedSousDomaineId;
      const resolvedLevelNom = levelNom || getLevelNom(selectedDomainId, selectedSousDomaineId, selectedLevelId) || selectedLevelId;
      const resolvedMatiereNom = matiereNom || getMatiereNom(selectedDomainId, selectedSousDomaineId, selectedMatiereId) || selectedMatiereId;

      const requestData = {
        domain: resolvedDomainNom,
        sousDomaine: resolvedSousDomNom,
        level: resolvedLevelNom,
        subject: resolvedMatiereNom,
        chapter: libChapitre, // ✅ Ajout du chapitre dans la requête
        numQuestions: numQuestions,
        typeQuestion: questionType === 'multiple' ? 2 : 1,
        difficulty: getDifficultyFromLevel(),
        keywords: keywordsRef.current || '',
      };

      console.log('🚀 Envoi IA:', requestData);
      const response = await generateQuestionsAI(requestData);

      if (response && response.questions && Array.isArray(response.questions)) {
        const formatted = response.questions.map((q, index) => ({
          id: index + 1,
          libQuestion: q.text || q.question,
          options: q.options || [],
          correctAnswer: q.answer || q.correctAnswer,
          bonOpRep: null,
          explanation: q.explanation || '',
          points: q.points || 1,
          typeQuestion: questionType === 'multiple' ? 2 : 1,
          tempsMinParQuestion: 60,
          tempsMin: 1,
          nDomaine: parseInt(selectedDomainId),
          nSousDomaine: parseInt(selectedSousDomaineId),
          niveauId: parseInt(selectedLevelId),
          niveau: resolvedLevelNom,
          matiereId: parseInt(selectedMatiereId),
          matiere: resolvedMatiereNom,
          libChapitre: libChapitre, // ✅ Ajout du chapitre dans chaque question
          imageQuestion: '', imageBase64: '', imageMetadata: {},
          matriculeAuteur: user?.matricule || user?.email || '',
        }));

        formatted.forEach(q => {
          if (q.options && q.correctAnswer) {
            q.bonOpRep = q.options.findIndex(opt => opt === q.correctAnswer);
          }
        });

        setGeneratedQuestions(formatted);
        setGenerationProgress(100);
        toast.success(`${formatted.length} questions générées!`);
      } else {
        throw new Error('Format de réponse invalide');
      }
    } catch (error) {
      console.error('❌ Erreur génération:', error);
      let errorMsg = error.message || 'Erreur lors de la génération';
      if (error.message?.includes('timeout')) errorMsg = 'Le serveur ne répond pas.';
      else if (error.message?.includes('Failed to fetch')) errorMsg = "Impossible de contacter le serveur.";
      else if (error.message?.includes('401')) { errorMsg = 'Session expirée.'; setTimeout(() => navigate('/login'), 2000); }
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  // Sauvegarde des questions dans la base (status: pending)
  const saveToBase = async () => {
    if (generatedQuestions.length === 0) {
      toast.error('Aucune question à sauvegarder');
      return;
    }

    const resolvedDomainNom = domainNom || getDomainNom(selectedDomainId) || selectedDomainId;
    const resolvedSousDomNom = sousDomaineNom || getSousDomaineNom(selectedDomainId, selectedSousDomaineId) || selectedSousDomaineId;
    const resolvedLevelNom = levelNom || getLevelNom(selectedDomainId, selectedSousDomaineId, selectedLevelId) || selectedLevelId;
    const resolvedMatiereNom = matiereNom || getMatiereNom(selectedDomainId, selectedSousDomaineId, selectedMatiereId) || selectedMatiereId;

    setIsLoading(true);
    try {
      const questionsToSave = generatedQuestions.map(q => ({
        libQuestion: q.libQuestion?.trim() || 'Question sans libellé',
        options: q.options.filter(opt => opt && opt.trim() !== ''),
        correctAnswer: q.correctAnswer?.trim() || (q.options[0]?.trim() || 'A'),
        typeQuestion: q.typeQuestion || 1,
        points: pointsType === 'uniform' ? globalPoints : (q.points || 1),
        tempsMin: q.tempsMin || 1,
        explanation: q.explanation?.trim() || '',
        domaine: resolvedDomainNom?.trim() || 'Non spécifié',
        sousDomaine: resolvedSousDomNom?.trim() || 'Non spécifié',
        niveau: resolvedLevelNom?.trim() || 'Non spécifié',
        matiere: resolvedMatiereNom?.trim() || 'Non spécifié',
        libChapitre: q.libChapitre || libChapitre, // ✅ Ajout du chapitre
        imageQuestion: q.imageQuestion || '',
        imageBase64: q.imageBase64 || '',
        imageMetadata: q.imageMetadata || {},
        matriculeAuteur: user?.matricule || user?.email || 'inconnu',
        status: 'pending'
      }));

      const response = await saveQuestions({ questions: questionsToSave });

      if (response.success) {
        toast.success(`${questionsToSave.length} questions envoyées en validation!`);
        setGeneratedQuestions([]);
        setLibChapitre(''); // ✅ Réinitialiser le chapitre
        navigate('/teacher/questions');
      } else {
        throw new Error(response.error || 'Erreur lors de la sauvegarde');
      }
    } catch (error) {
      console.error('❌ Erreur sauvegarde:', error);
      toast.error(error.message || 'Erreur lors de la sauvegarde');
    } finally {
      setIsLoading(false);
    }
  };

  // Supprimer une question
  const removeQuestion = (index) => {
    if (window.confirm(`Supprimer la question ${index + 1} ?`)) {
      setGeneratedQuestions(generatedQuestions.filter((_, i) => i !== index));
      toast.success('Question supprimée');
    }
  };

  // Dupliquer une question
  const duplicateQuestion = (index) => {
    const q = { ...generatedQuestions[index], id: generatedQuestions.length + 1 };
    setGeneratedQuestions([...generatedQuestions, q]);
    toast.success('Question dupliquée');
  };

  // Modifier une question
  const startEdit = (index) => {
    const q = generatedQuestions[index];
    setEditingIndex(index);
    setEditData({
      libQuestion: q.libQuestion,
      options: [...q.options],
      correctAnswer: q.correctAnswer,
      points: q.points,
      explanation: q.explanation,
      typeQuestion: q.typeQuestion,
      libChapitre: q.libChapitre || libChapitre,
      imageQuestion: q.imageQuestion || '',
      imageBase64: q.imageBase64 || '',
    });
  };

  const saveEdit = () => {
    if (!editData || editingIndex === null) return;
    const updated = [...generatedQuestions];
    updated[editingIndex] = {
      ...updated[editingIndex],
      libQuestion: editData.libQuestion,
      options: editData.options,
      correctAnswer: editData.correctAnswer,
      points: editData.points,
      explanation: editData.explanation,
      typeQuestion: editData.typeQuestion,
      libChapitre: editData.libChapitre,
      imageQuestion: editData.imageQuestion,
      imageBase64: editData.imageBase64,
    };
    // Recalculer bonOpRep
    const idx = updated[editingIndex].options.findIndex(opt => opt === editData.correctAnswer);
    if (idx !== -1) updated[editingIndex].bonOpRep = idx;
    setGeneratedQuestions(updated);
    setEditingIndex(null);
    setEditData(null);
    toast.success('Question modifiée');
  };

  const cancelEdit = () => {
    setEditingIndex(null);
    setEditData(null);
  };

  // Exporter en JSON
  const exportJSON = () => {
    if (generatedQuestions.length === 0) {
      toast.error('Aucune question à exporter');
      return;
    }
    const exportData = {
      domain: { id: selectedDomainId, nom: domainNom },
      sousDomaine: { id: selectedSousDomaineId, nom: sousDomaineNom },
      level: { id: selectedLevelId, nom: levelNom },
      subject: { id: selectedMatiereId, nom: matiereNom },
      chapter: libChapitre, // ✅ Ajout du chapitre dans l'export
      config: {
        pointsType: pointsType,
        globalPoints: globalPoints
      },
      questions: generatedQuestions,
      exportedAt: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `questions_${matiereNom}_${new Date().toISOString().slice(0, 19)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Export JSON réussi');
  };

  const handleImageChange = (url, base64, metadata) => {
    if (!editData) return;
    setEditData({ ...editData, imageQuestion: url, imageBase64: base64, imageMetadata: metadata });
  };

  if (authLoading) return <div style={styles.loaderContainer}><Loader2 size={48} color="#6366f1" className="animate-spin" /></div>;
  if (authError) return <div style={styles.errorContainer}>{authError}</div>;
  if (!user) return <div style={styles.loaderContainer}><Loader2 size={48} color="#6366f1" className="animate-spin" /></div>;

  const styles = {
    loaderContainer: { minHeight: '100vh', background: 'linear-gradient(135deg, #05071a, #0a0f2e)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
    errorContainer: { minHeight: '100vh', background: 'linear-gradient(135deg, #05071a, #0a0f2e)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444' },
    container: { minHeight: '100vh', background: 'linear-gradient(135deg, #05071a 0%, #0a0f2e 60%, #05071a 100%)', padding: '24px' },
    main: { position: 'relative', zIndex: 1, maxWidth: 1000, margin: '0 auto' },
    card: { background: 'rgba(15,23,42,0.7)', backdropFilter: 'blur(12px)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 24, padding: 32, marginBottom: 24 },
    grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 },
    label: { display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: 6 },
    select: { width: '100%', padding: 12, background: '#0f172a', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 10, color: '#f8fafc' },
    input: { width: '100%', padding: 12, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 10, color: '#f8fafc' },
    button: { padding: '12px 24px', borderRadius: 10, border: 'none', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }
  };

  return (
    <div style={styles.container}>
      <div style={{ position: 'fixed', inset: 0, backgroundImage: 'linear-gradient(rgba(99,102,241,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.03) 1px, transparent 1px)', backgroundSize: '40px 40px', pointerEvents: 'none', zIndex: 0 }} />
      <main style={styles.main}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => navigate(-1)} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 12, padding: 12, color: '#94a3b8', cursor: 'pointer' }}>
            <ArrowLeft size={20} />
          </motion.button>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '4px 12px', background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 20, marginBottom: 8 }}>
              <Bot size={14} color="#6366f1" />
              <span style={{ color: '#a5b4fc', fontSize: '0.7rem', fontWeight: 600 }}>GÉNÉRATION IA</span>
            </div>
            <h1 style={{ fontSize: '2rem', fontWeight: 700, color: '#f8fafc' }}>Génération de QCM</h1>
            <p style={{ color: '#64748b' }}>Générez des questions par IA, modifiez-les, puis envoyez-les en validation pédagogique</p>
          </div>
        </div>

        {/* Formulaire de configuration */}
        <div style={styles.card}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
            <User size={16} color="#10b981" />
            <span style={{ color: '#10b981' }}>✅ Connecté : <strong>{user?.name}</strong> ({user?.role})</span>
          </div>

          {error && (
            <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid #ef4444', borderRadius: 12, padding: 12, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8, color: '#ef4444' }}>
              <AlertCircle size={20} /> {error}
            </div>
          )}

          <div style={styles.grid2}>
            <div>
              <label style={styles.label}>N°Domaine *</label>
              <select value={selectedDomainId} onChange={e => { setSelectedDomainId(e.target.value); setSelectedSousDomaineId(''); setSelectedLevelId(''); setSelectedMatiereId(''); }} style={styles.select}>
                <option value="">Sélectionner...</option>
                {getAllDomaines().map(d => <option key={d.id} value={d.id}>{d.id} - {d.nom}</option>)}
              </select>
            </div>
            <div>
              <label style={styles.label}>N°Sous-Domaine *</label>
              <select value={selectedSousDomaineId} onChange={e => { setSelectedSousDomaineId(e.target.value); setSelectedLevelId(''); setSelectedMatiereId(''); }} disabled={!selectedDomainId} style={{...styles.select, opacity: !selectedDomainId ? 0.5 : 1}}>
                <option value="">Sélectionner...</option>
                {getAllSousDomaines(selectedDomainId).map(sd => <option key={sd.id} value={sd.id}>{sd.id} - {sd.nom}</option>)}
              </select>
            </div>
            <div>
              <label style={styles.label}>Niveau *</label>
              <select value={selectedLevelId} onChange={e => setSelectedLevelId(e.target.value)} disabled={!selectedSousDomaineId} style={{...styles.select, opacity: !selectedSousDomaineId ? 0.5 : 1}}>
                <option value="">Sélectionner...</option>
                {getAllLevels(selectedDomainId, selectedSousDomaineId).map(l => <option key={l.id} value={l.id}>{l.id} - {l.nom}</option>)}
              </select>
            </div>
            <div>
              <label style={styles.label}>Matière *</label>
              <select value={selectedMatiereId} onChange={e => setSelectedMatiereId(e.target.value)} disabled={!selectedSousDomaineId} style={{...styles.select, opacity: !selectedSousDomaineId ? 0.5 : 1}}>
                <option value="">Sélectionner...</option>
                {getAllMatieres(selectedDomainId, selectedSousDomaineId).map(m => <option key={m.id} value={m.id}>{m.id} - {m.nom}</option>)}
              </select>
            </div>
          </div>

          {/* Affichage des noms sélectionnés */}
          {(domainNom || sousDomaineNom || levelNom || matiereNom) && (
            <div style={{ marginTop: 12, marginBottom: 20, padding: 8, background: 'rgba(99,102,241,0.05)', borderRadius: 8, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {domainNom && <span style={{ fontSize: '0.7rem', color: '#a78bfa' }}>Domaine: {domainNom}</span>}
              {sousDomaineNom && <span style={{ fontSize: '0.7rem', color: '#a78bfa' }}>Sous-domaine: {sousDomaineNom}</span>}
              {levelNom && <span style={{ fontSize: '0.7rem', color: '#a78bfa' }}>Niveau: {levelNom}</span>}
              {matiereNom && <span style={{ fontSize: '0.7rem', color: '#a78bfa' }}>Matière: {matiereNom}</span>}
            </div>
          )}

          {/* ✅ Champ Chapitre - OBLIGATOIRE */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ ...styles.label, color: chapitreError ? '#ef4444' : '#94a3b8' }}>
              Chapitre <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input 
              type="text" 
              value={libChapitre} 
              onChange={(e) => { setLibChapitre(e.target.value); setChapitreError(false); }}
              placeholder="Ex: Chapitre 3 - Les fonctions dérivées"
              style={{
                ...styles.input,
                border: `1px solid ${chapitreError ? '#ef4444' : 'rgba(99,102,241,0.2)'}`
              }}
            />
            {chapitreError && (
              <p style={{ color: '#ef4444', fontSize: '0.7rem', marginTop: 4 }}>
                <AlertCircle size={12} /> Le chapitre est obligatoire
              </p>
            )}
          </div>

          <div style={{ marginBottom: 20 }}>
            <button onClick={() => setExpandedAdvanced(!expandedAdvanced)} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '8px 0' }}>
              <Settings size={14} /> Paramètres avancés {expandedAdvanced ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
            {expandedAdvanced && (
              <div style={{ marginTop: 12, ...styles.grid2 }}>
                <div>
                  <label style={styles.label}>Type de questions</label>
                  <select value={questionType} onChange={e => setQuestionType(e.target.value)} style={styles.select}>
                    <option value="single">Choix unique</option>
                    <option value="multiple">Choix multiple</option>
                  </select>
                </div>
                <div>
                  <label style={styles.label}>Difficulté</label>
                  <select value={difficulty} onChange={e => setDifficulty(e.target.value)} style={styles.select}>
                    <option value="facile">Facile</option>
                    <option value="moyen">Moyen</option>
                    <option value="difficile">Difficile</option>
                  </select>
                </div>
                <div>
                  <label style={styles.label}>Mots-clés</label>
                  <input type="text" placeholder="Ex: management, stratégie..." onChange={e => keywordsRef.current = e.target.value} style={styles.input} />
                </div>
                <div>
                  <label style={styles.label}>Nombre de questions</label>
                  <input type="number" min="1" max="30" value={numQuestions} onChange={e => setNumQuestions(Math.min(30, Math.max(1, parseInt(e.target.value) || 5)))} style={styles.input} />
                </div>
                <div>
                  <label style={styles.label}>Attribution des points</label>
                  <div style={{ display: 'flex', gap: 16, marginBottom: 8 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <input type="radio" name="pointsType" checked={pointsType === 'uniform'} onChange={() => setPointsType('uniform')} />
                      <span style={{ fontSize: '0.7rem' }}>Uniforme</span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <input type="radio" name="pointsType" checked={pointsType === 'variable'} onChange={() => setPointsType('variable')} />
                      <span style={{ fontSize: '0.7rem' }}>Variable (par question)</span>
                    </label>
                  </div>
                  {pointsType === 'uniform' && (
                    <input type="number" min="0.5" max="10" step="0.5" value={globalPoints} onChange={e => setGlobalPoints(parseFloat(e.target.value) || 1)} style={styles.input} placeholder="Points par question" />
                  )}
                </div>
              </div>
            )}
          </div>

          {isLoading && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ color: '#94a3b8' }}>Génération en cours...</span>
                <span style={{ color: '#a5b4fc' }}>{generationProgress}%</span>
              </div>
              <div style={{ width: '100%', height: 6, background: '#1e293b', borderRadius: 3, overflow: 'hidden' }}>
                <motion.div initial={{ width: 0 }} animate={{ width: `${generationProgress}%` }} style={{ height: '100%', background: 'linear-gradient(90deg, #6366f1, #8b5cf6)' }} />
              </div>
            </div>
          )}

          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleGenerate} disabled={isLoading}
            style={{ width: '100%', padding: 16, background: isLoading ? 'rgba(99,102,241,0.3)' : 'linear-gradient(135deg, #6366f1, #8b5cf6)', border: 'none', borderRadius: 12, color: 'white', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            {isLoading ? <><Loader2 size={18} className="animate-spin" /> Génération...</> : <><Sparkles size={18} /> Générer les questions</>}
          </motion.button>
        </div>

        {/* Liste des questions générées */}
        {generatedQuestions.length > 0 && (
          <div style={styles.card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 600, color: '#f8fafc' }}>Questions générées ({generatedQuestions.length})</h2>
              <div style={{ display: 'flex', gap: 8 }}>
                <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={exportJSON} style={{ padding: '8px 16px', background: 'rgba(16,185,129,0.2)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 8, color: '#10b981', fontSize: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Download size={14} /> Exporter JSON
                </motion.button>
                <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={saveToBase} disabled={isLoading} style={{ padding: '8px 16px', background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none', borderRadius: 8, color: 'white', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Save size={14} /> Envoyer en validation
                </motion.button>
              </div>
            </div>

            <div style={{ maxHeight: 500, overflowY: 'auto', paddingRight: 8 }}>
              {generatedQuestions.map((q, idx) => {
                const isEditing = editingIndex === idx;
                const imageSrc = q.imageQuestion || (q.imageBase64?.startsWith('data:') ? q.imageBase64 : null);
                return (
                  <motion.div key={idx} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(99,102,241,0.1)', borderRadius: 12, padding: 16, marginBottom: 12 }}>
                    {isEditing && editData ? (
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                          <h4 style={{ color: '#f8fafc' }}>Modifier la question {idx + 1}</h4>
                          <button onClick={cancelEdit} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}>Annuler</button>
                        </div>
                        <textarea value={editData.libQuestion} onChange={e => setEditData({...editData, libQuestion: e.target.value})} rows={2} style={styles.input} placeholder="Question..." />
                        <div style={{ marginTop: 12, marginBottom: 12 }}>
                          <label style={{ color: '#94a3b8', fontSize: '0.7rem' }}>Options</label>
                          {editData.options.map((opt, optIdx) => (
                            <div key={optIdx} style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                              <input type="text" value={opt} onChange={e => { const newOpts = [...editData.options]; newOpts[optIdx] = e.target.value; setEditData({...editData, options: newOpts}); }} style={styles.input} placeholder={`Option ${String.fromCharCode(65 + optIdx)}`} />
                              <button onClick={() => setEditData({...editData, correctAnswer: opt})} style={{ padding: '8px', background: editData.correctAnswer === opt ? '#10b981' : '#475569', border: 'none', borderRadius: 6, color: 'white', cursor: 'pointer' }}>✓</button>
                            </div>
                          ))}
                        </div>
                        <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
                          <div><label style={{ color: '#94a3b8', fontSize: '0.7rem' }}>Points</label><input type="number" min="0.5" max="10" step="0.5" value={editData.points} onChange={e => setEditData({...editData, points: parseFloat(e.target.value)})} style={styles.input} /></div>
                          <div style={{ flex: 1 }}><label style={{ color: '#94a3b8', fontSize: '0.7rem' }}>Explication</label><input type="text" value={editData.explanation} onChange={e => setEditData({...editData, explanation: e.target.value})} style={styles.input} placeholder="Explication..." /></div>
                        </div>
                        <div>
                          <label style={{ color: '#94a3b8', fontSize: '0.7rem' }}>Chapitre</label>
                          <input type="text" value={editData.libChapitre} onChange={e => setEditData({...editData, libChapitre: e.target.value})} style={styles.input} placeholder="Chapitre..." />
                        </div>
                        <ImageUploader value={editData.imageQuestion || editData.imageBase64} onImageChange={handleImageChange} label="Image" />
                        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={saveEdit} style={{ marginTop: 12, padding: '8px 16px', background: '#10b981', border: 'none', borderRadius: 8, color: 'white', cursor: 'pointer' }}>Enregistrer</motion.button>
                      </div>
                    ) : (
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div style={{ flex: 1 }}>
                            {imageSrc && <img src={imageSrc} alt="" style={{ maxWidth: '100%', maxHeight: 80, borderRadius: 4, marginBottom: 8, objectFit: 'contain' }} />}
                            <p style={{ color: '#f8fafc', fontWeight: 500 }}>{idx + 1}. {q.libQuestion}</p>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 8 }}>
                              {q.options.filter(opt => opt.trim()).map((opt, i) => {
                                const isCorrect = opt === q.correctAnswer;
                                return (
                                  <span key={i} style={{ padding: '2px 8px', background: isCorrect ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.03)', borderRadius: 4, color: isCorrect ? '#10b981' : '#94a3b8', fontSize: '0.7rem' }}>
                                    {String.fromCharCode(65 + i)}: {opt.length > 25 ? opt.substring(0, 25) + '...' : opt}
                                  </span>
                                );
                              })}
                            </div>
                            <div style={{ marginTop: 8, display: 'flex', gap: 12, fontSize: '0.65rem', color: '#64748b' }}>
                              <span>📚 N°Dom: {q.nDomaine}</span>
                              <span>🎓 Niv: {q.niveau}</span>
                              <span>⭐ {pointsType === 'uniform' ? globalPoints : q.points} pts</span>
                              {q.libChapitre && <span>📑 {q.libChapitre}</span>}
                              {q.explanation && <span>💡 Avec explication</span>}
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button onClick={() => setPreviewQuestion(q)} title="Aperçu" style={{ padding: 6, background: 'rgba(59,130,246,0.2)', border: '1px solid rgba(59,130,246,0.3)', borderRadius: 6, color: '#3b82f6', cursor: 'pointer' }}><Eye size={14} /></button>
                            <button onClick={() => startEdit(idx)} title="Modifier" style={{ padding: 6, background: 'rgba(245,158,11,0.2)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 6, color: '#f59e0b', cursor: 'pointer' }}><Edit size={14} /></button>
                            <button onClick={() => duplicateQuestion(idx)} title="Dupliquer" style={{ padding: 6, background: 'rgba(16,185,129,0.2)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 6, color: '#10b981', cursor: 'pointer' }}><Copy size={14} /></button>
                            <button onClick={() => removeQuestion(idx)} title="Supprimer" style={{ padding: 6, background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 6, color: '#ef4444', cursor: 'pointer' }}><Trash2 size={14} /></button>
                          </div>
                        </div>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>

            <div style={{ marginTop: 20, padding: 12, background: 'rgba(245,158,11,0.05)', borderRadius: 8 }}>
              <p style={{ fontSize: '0.7rem', color: '#f59e0b', display: 'flex', alignItems: 'center', gap: 8 }}>
                <AlertCircle size={12} />
                💡 Ces questions seront envoyées en validation pédagogique. Un administrateur devra les approuver avant qu'elles puissent être utilisées dans une épreuve.
              </p>
            </div>
          </div>
        )}
      </main>

      {/* Modal d'aperçu */}
      <AnimatePresence>
        {previewQuestion && (
          <QuestionPreviewModal 
            question={previewQuestion} 
            onClose={() => setPreviewQuestion(null)} 
          />
        )}
      </AnimatePresence>

      <Toaster position="top-right" toastOptions={{ style: { background: '#1e293b', color: '#f8fafc', border: '1px solid #3b82f6' } }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } } .animate-spin { animation: spin 1s linear infinite; }`}</style>
    </div>
  );
};

export default AIQuizCreation;