// src/pages/creation/AIQuizCreation.jsx - Version corrigée avec validation pédagogique
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, Loader2, Save, ArrowLeft, Bot,
  Settings, Eye, BookOpen, Layers, Tag,
  AlertCircle, CheckCircle, RefreshCw, Zap,
  Clock, Award, ChevronDown, ChevronUp, Shield, User, XCircle,
  Database, Download, Upload, FileText, PlusCircle
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
import { generateQuestionsAI, createExam, saveQuestions } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import ImageUploader from '../../components/ImageUploader';
import toast, { Toaster } from 'react-hot-toast';

const NODE_BACKEND_URL = process.env.NODE_ENV === 'production'
  ? (process.env.REACT_APP_BACKEND_URL || 'https://na2quizapp.onrender.com')
  : 'http://localhost:5000';

const ALLOWED_ROLES = ['ENSEIGNANT', 'ADMIN_DELEGUE', 'ADMIN_SYSTEME'];

const QUESTION_TYPES = [
  { id: 1, nom: "Notions de base (le Savoir)", description: "Évaluation des connaissances théoriques" },
  { id: 2, nom: "Intelligence Pratique (Savoir-Faire)", description: "Évaluation des compétences pratiques" },
  { id: 3, nom: "Savoir-être", description: "Évaluation du potentiel psychologique" }
];

const AIQuizCreation = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const [selectedDomainId, setSelectedDomainId] = useState('');
  const [selectedSousDomaineId, setSelectedSousDomaineId] = useState('');
  const [selectedLevelId, setSelectedLevelId] = useState('');
  const [selectedMatiereId, setSelectedMatiereId] = useState('');
  
  const [domainNom, setDomainNom] = useState('');
  const [sousDomaineNom, setSousDomaineNom] = useState('');
  const [levelNom, setLevelNom] = useState('');
  const [matiereNom, setMatiereNom] = useState('');
  
  const [questionType, setQuestionType] = useState('single');
  const [numQuestions, setNumQuestions] = useState(5);
  const [difficulty, setDifficulty] = useState('moyen');
  const keywordsRef = useRef('');
  const [expandedAdvanced, setExpandedAdvanced] = useState(false);

  const [generatedQuiz, setGeneratedQuiz] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [quizName, setQuizName] = useState('');
  const [quizDescription, setQuizDescription] = useState('');
  const [currentStep, setCurrentStep] = useState(1);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [error, setError] = useState(null);
  const [examDuration, setExamDuration] = useState(60);
  const [passingScore, setPassingScore] = useState(70);
  const [authError, setAuthError] = useState(null);
  const [config, setConfig] = useState({
    examOption: 'C', openRange: false, requiredQuestions: 0,
    sequencing: 'identical', allowRetry: false, showBinaryResult: false,
    showCorrectAnswer: false, timerConfig: 'permanent',
    timerPerQuestion: true, timePerQuestion: 60, totalTime: 60,
  });
  const [advancedConfigOpen, setAdvancedConfigOpen] = useState(false);
  const [editingQuestionIndex, setEditingQuestionIndex] = useState(null);
  const [editQuestionData, setEditQuestionData] = useState(null);
  const [saveMode, setSaveMode] = useState(null); // 'exam' or 'questions'

  useEffect(() => { if (selectedDomainId) setDomainNom(getDomainNom(selectedDomainId)); }, [selectedDomainId]);
  useEffect(() => { if (selectedDomainId && selectedSousDomaineId) setSousDomaineNom(getSousDomaineNom(selectedDomainId, selectedSousDomaineId)); }, [selectedDomainId, selectedSousDomaineId]);
  useEffect(() => { if (selectedDomainId && selectedSousDomaineId && selectedLevelId) setLevelNom(getLevelNom(selectedDomainId, selectedSousDomaineId, selectedLevelId)); }, [selectedDomainId, selectedSousDomaineId, selectedLevelId]);
  useEffect(() => { if (selectedDomainId && selectedSousDomaineId && selectedMatiereId) setMatiereNom(getMatiereNom(selectedDomainId, selectedSousDomaineId, selectedMatiereId)); }, [selectedDomainId, selectedSousDomaineId, selectedMatiereId]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { setAuthError('Vous devez être connecté pour accéder à cette page'); toast.error('Veuillez vous connecter'); setTimeout(() => navigate('/login'), 2000); return; }
    if (!ALLOWED_ROLES.includes(user?.role)) { setAuthError(`Accès non autorisé. Rôles requis: ${ALLOWED_ROLES.join(', ')}. Votre rôle: ${user?.role || 'inconnu'}`); toast.error('Accès non autorisé.'); setTimeout(() => navigate('/dashboard'), 2000); return; }
    setAuthError(null);
  }, [user, authLoading, navigate]);

  const getDifficultyFromLevel = (levelId) => {
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

  const handleGenerate = async () => {
    if (!user) { toast.error('Veuillez vous connecter'); navigate('/login'); return; }
    if (!selectedDomainId || !selectedSousDomaineId || !selectedLevelId || !selectedMatiereId) {
      toast.error('Veuillez remplir tous les champs obligatoires (Domaine, Sous-domaine, Niveau, Matière)'); return;
    }

    setIsLoading(true);
    setError(null);
    setGenerationProgress(0);

    try {
      const resolvedDomainNom  = domainNom      || getDomainNom(selectedDomainId)                                           || selectedDomainId      || '';
      const resolvedSousDomNom = sousDomaineNom || getSousDomaineNom(selectedDomainId, selectedSousDomaineId)                || selectedSousDomaineId || '';
      const resolvedLevelNom   = levelNom       || getLevelNom(selectedDomainId, selectedSousDomaineId, selectedLevelId)     || selectedLevelId       || '';
      const resolvedMatiereNom = matiereNom     || getMatiereNom(selectedDomainId, selectedSousDomaineId, selectedMatiereId) || selectedMatiereId     || '';

      const requestData = {
        domain:              resolvedDomainNom,
        sousDomaine:         resolvedSousDomNom,
        level:               resolvedLevelNom,
        subject:             resolvedMatiereNom,
        numQuestions:        numQuestions,
        typeQuestion:        questionType === 'multiple' ? 2 : 1,
        tempsMinParQuestion: 1,
        difficulty:          getDifficultyFromLevel(selectedLevelId),
        keywords:            keywordsRef.current || '',
      };

      console.log('🚀 Envoi au backend:', requestData);
      const response = await generateQuestionsAI(requestData);
      console.log('📦 Réponse reçue:', response);

      if (response && response.questions && Array.isArray(response.questions)) {
        const formattedQuestions = response.questions.map((q, index) => ({
          id: index + 1,
          libQuestion: q.text || q.question,
          text: q.text || q.question,
          question: q.text || q.question,
          options: q.options || [],
          correctAnswer: q.answer || q.correctAnswer,
          bonOpRep: null,
          explanation: q.explanation || '',
          points: q.points || 1,
          difficulty: q.difficulty || getDifficultyFromLevel(selectedLevelId),
          typeQuestion: questionType === 'multiple' ? 2 : 1,
          type: questionType === 'multiple' ? 'multiple' : 'single',
          tempsMinParQuestion: 60,
          tempsMin: 1,
          nDomaine: parseInt(selectedDomainId),
          nSousDomaine: parseInt(selectedSousDomaineId),
          niveauId: parseInt(selectedLevelId),
          niveau: resolvedLevelNom,
          matiereId: parseInt(selectedMatiereId),
          matiere: resolvedMatiereNom,
          libChapitre: '',
          imageQuestion: '', imageBase64: '', imageMetadata: {},
          matriculeAuteur: user?.matricule || user?.email || '',
        }));

        formattedQuestions.forEach(q => {
          if (q.options && q.correctAnswer) q.bonOpRep = q.options.findIndex(opt => opt === q.correctAnswer);
        });

        setGeneratedQuiz({
          title: `${resolvedMatiereNom} - Quiz IA`,
          description: response.metadata?.description || `Quiz généré sur ${resolvedMatiereNom}`,
          questions: formattedQuestions,
          metadata: { ...response.metadata, generatedBy: user?.name, generatedByRole: user?.role, generatedAt: new Date().toISOString(), nDomaine: selectedDomainId, nSousDomaine: selectedSousDomaineId, niveauId: selectedLevelId, matiereId: selectedMatiereId }
        });

        setQuizName(`${resolvedMatiereNom} - Quiz IA`);
        setGenerationProgress(100);
        setTimeout(() => setCurrentStep(2), 500);
        toast.success(`${formattedQuestions.length} questions générées!`);
      } else {
        throw new Error('Format de réponse invalide');
      }
    } catch (error) {
      console.error('❌ Erreur génération:', error);
      let errorMsg = error.message || 'Erreur lors de la génération';
      if (error.message?.includes('timeout')) errorMsg = 'Le serveur ne répond pas. Vérifiez que le backend est démarré sur http://localhost:5000';
      else if (error.message?.includes('Failed to fetch')) errorMsg = "Impossible de contacter le serveur. Assurez-vous que le backend est en cours d'exécution.";
      else if (error.message?.includes('401') || error.message?.includes('Unauthorized')) { errorMsg = 'Session expirée. Veuillez vous reconnecter.'; setTimeout(() => navigate('/login'), 2000); }
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegenerate = () => { setGeneratedQuiz(null); setCurrentStep(1); setError(null); handleGenerate(); };

  // ========== SAUVEGARDE DES QUESTIONS DANS LA BASE (validation) ==========
  const saveQuestionsToBase = async () => {
    if (!generatedQuiz) return;
    
    const resolvedDomainNom  = domainNom      || getDomainNom(selectedDomainId) || selectedDomainId || '';
    const resolvedSousDomNom = sousDomaineNom || getSousDomaineNom(selectedDomainId, selectedSousDomaineId) || selectedSousDomaineId || '';
    const resolvedLevelNom   = levelNom       || getLevelNom(selectedDomainId, selectedSousDomaineId, selectedLevelId) || selectedLevelId || '';
    const resolvedMatiereNom = matiereNom     || getMatiereNom(selectedDomainId, selectedSousDomaineId, selectedMatiereId) || selectedMatiereId || '';

    setIsLoading(true);
    try {
      const questionsToSave = generatedQuiz.questions.map(q => ({
        libQuestion: q.libQuestion,
        options: q.options,
        correctAnswer: q.correctAnswer,
        typeQuestion: q.typeQuestion,
        points: q.points,
        tempsMin: q.tempsMin,
        explanation: q.explanation,
        domaine: resolvedDomainNom,
        sousDomaine: resolvedSousDomNom,
        niveau: resolvedLevelNom,
        matiere: resolvedMatiereNom,
        libChapitre: q.libChapitre || '',
        imageQuestion: q.imageQuestion || '',
        imageBase64: q.imageBase64 || '',
        imageMetadata: q.imageMetadata || {},
        matriculeAuteur: user?.matricule || user?.email || '',
        status: 'pending'
      }));

      const response = await saveQuestions({ questions: questionsToSave });

      if (response.success) {
        toast.success(`${questionsToSave.length} questions enregistrées et envoyées en validation!`);
        navigate('/teacher/questions');
      } else {
        throw new Error(response.error || 'Erreur lors de la sauvegarde');
      }
    } catch (error) {
      console.error('❌ Erreur sauvegarde questions:', error);
      toast.error(error.message || 'Erreur lors de la sauvegarde des questions');
    } finally {
      setIsLoading(false);
    }
  };

  // ========== SAUVEGARDE DIRECTE EN ÉPREUVE (sans validation) ==========
  const saveExamDirectly = async () => {
    if (!user) { toast.error('Veuillez vous connecter'); navigate('/login'); return; }
    if (!generatedQuiz || !quizName) { toast.error('Veuillez générer un quiz et lui donner un nom'); return; }

    setIsLoading(true);
    try {
      const resolvedDomainNom  = domainNom      || getDomainNom(selectedDomainId) || selectedDomainId || '';
      const resolvedSousDomNom = sousDomaineNom || getSousDomaineNom(selectedDomainId, selectedSousDomaineId) || selectedSousDomaineId || '';
      const resolvedLevelNom   = levelNom       || getLevelNom(selectedDomainId, selectedSousDomaineId, selectedLevelId) || selectedLevelId || '';
      const resolvedMatiereNom = matiereNom     || getMatiereNom(selectedDomainId, selectedSousDomaineId, selectedMatiereId) || selectedMatiereId || '';

      const formattedQuestions = generatedQuiz.questions.map((q, idx) => {
        const validOptions = q.options.filter(opt => opt && opt.trim() !== '');
        
        let bonOpRep = null;
        if (q.typeQuestion === 1 && q.correctAnswer) {
          bonOpRep = validOptions.findIndex(opt => opt === q.correctAnswer);
        } else if (q.typeQuestion === 2 && q.correctAnswers && q.correctAnswers.length > 0) {
          bonOpRep = validOptions.findIndex(opt => q.correctAnswers.includes(opt));
        }
        
        if (bonOpRep === -1 || bonOpRep === null) bonOpRep = 0;
        
        return {
          nQuestion: idx + 1,
          libQuestion: q.libQuestion,
          options: validOptions,
          bonOpRep: bonOpRep,
          correctAnswer: q.correctAnswer,
          explanation: q.explanation || '',
          points: q.points || 1,
          typeQuestion: q.typeQuestion,
          type: q.type,
          tempsMin: q.tempsMin || 1,
          tempsMinParQuestion: q.tempsMinParQuestion || 60,
          nDomaine: parseInt(selectedDomainId),
          nSousDomaine: parseInt(selectedSousDomaineId),
          niveau: resolvedLevelNom,
          matiere: resolvedMatiereNom,
          libChapitre: q.libChapitre || '',
          imageQuestion: q.imageQuestion || '', 
          imageBase64: q.imageBase64 || '', 
          imageMetadata: q.imageMetadata || {},
          matriculeAuteur: user?.matricule || user?.email || '',
          dateCrea: new Date().toISOString(),
        };
      });

      const totalPoints = formattedQuestions.reduce((sum, q) => sum + (q.points || 1), 0);
      const totalDuration = formattedQuestions.reduce((sum, q) => sum + (q.tempsMinParQuestion || 60), 0) / 60;

      const examData = {
        title: quizName,
        description: quizDescription || generatedQuiz.description,
        domain: resolvedDomainNom,
        category: resolvedSousDomNom,
        level: resolvedLevelNom,
        subject: resolvedMatiereNom,
        questions: formattedQuestions,
        duration: Math.ceil(totalDuration),
        passingScore,
        totalPoints,
        questionCount: formattedQuestions.length,
        source: 'ai_generated',
        isAIgenerated: true,
        createdBy: user?._id,
        teacherName: user?.name,
        teacherGrade: user?.grade || '',
        teacherEmail: user?.email,
        config,
        examOption: config.examOption,
        status: 'draft',
        metadata: { 
          generatedAt: new Date().toISOString(), 
          model: 'deepseek-chat', 
          prompt: keywordsRef.current, 
          numQuestions, 
          difficulty: getDifficultyFromLevel(selectedLevelId), 
          generatedBy: user?.name, 
          generatedByRole: user?.role, 
          generatedById: user?._id, 
          ...generatedQuiz.metadata 
        }
      };

      console.log('📤 Envoi des données:', JSON.stringify({
        title: examData.title,
        questionsCount: examData.questions.length,
        firstQuestion: {
          libQuestion: examData.questions[0]?.libQuestion,
          options: examData.questions[0]?.options,
          bonOpRep: examData.questions[0]?.bonOpRep
        }
      }, null, 2));

      const response = await createExam(examData);
      if (response && (response.success !== false || response._id)) {
        toast.success('Épreuve enregistrée avec succès!');
        setTimeout(() => navigate('/exams'), 1500);
      } else {
        throw new Error(response?.error || 'Erreur lors de la sauvegarde');
      }
    } catch (error) {
      console.error('❌ Erreur sauvegarde:', error);
      let errorMessage = error.message || 'Erreur lors de la sauvegarde';
      if (error.message?.includes('Failed to fetch')) errorMessage = 'Impossible de contacter le serveur.';
      else if (error.message?.includes('401') || error.message?.includes('Unauthorized')) { 
        errorMessage = 'Session expirée.'; 
        setTimeout(() => navigate('/login'), 2000); 
      }
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageChange = (index, url, base64, metadata) => {
    if (!generatedQuiz) return;
    const updatedQuestions = [...generatedQuiz.questions];
    updatedQuestions[index] = { ...updatedQuestions[index], imageQuestion: url || '', imageBase64: base64 || '', imageMetadata: metadata || {} };
    setGeneratedQuiz({ ...generatedQuiz, questions: updatedQuestions });
  };

  const startEditQuestion = (index) => {
    const q = generatedQuiz.questions[index];
    setEditingQuestionIndex(index);
    setEditQuestionData({ libQuestion: q.libQuestion, options: [...q.options], correctAnswer: q.correctAnswer, points: q.points, explanation: q.explanation, imageQuestion: q.imageQuestion || '', imageBase64: q.imageBase64 || '', imageMetadata: q.imageMetadata || {} });
  };

  const saveEditQuestion = () => {
    if (!editQuestionData || editingQuestionIndex === null) return;
    const updatedQuestions = [...generatedQuiz.questions];
    updatedQuestions[editingQuestionIndex] = { ...updatedQuestions[editingQuestionIndex], ...editQuestionData };
    const idx = updatedQuestions[editingQuestionIndex].options.findIndex(opt => opt === editQuestionData.correctAnswer);
    if (idx !== -1) updatedQuestions[editingQuestionIndex].bonOpRep = idx;
    setGeneratedQuiz({ ...generatedQuiz, questions: updatedQuestions });
    setEditingQuestionIndex(null); setEditQuestionData(null);
    toast.success('Question modifiée');
  };

  const exportQuiz = () => {
    if (!generatedQuiz) { toast.error('Aucun quiz à exporter'); return; }
    const exportData = { title: quizName, description: quizDescription, domain: { id: selectedDomainId, nom: domainNom }, sousDomaine: { id: selectedSousDomaineId, nom: sousDomaineNom }, level: { id: selectedLevelId, nom: levelNom }, subject: { id: selectedMatiereId, nom: matiereNom }, config, questions: generatedQuiz.questions.map(q => ({ ...q, imageBase64: q.imageBase64 ? '[BASE64_DATA]' : null })), exportedAt: new Date().toISOString(), version: '1.0' };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${quizName || 'quiz_ia'}_${new Date().toISOString().slice(0, 19)}.json`; a.click();
    URL.revokeObjectURL(url);
    toast.success('Quiz exporté');
  };

  const QuestionPreview = ({ question, onClose }) => {
    if (!question) return null;
    const imageSrc = question.imageQuestion || (question.imageBase64?.startsWith('data:') ? question.imageBase64 : null);
    const questionTypeInfo = QUESTION_TYPES.find(t => t.id === question.typeQuestion) || QUESTION_TYPES[0];
    return (
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
        style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 1000, background: '#0f172a', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 20, padding: 24, width: '90%', maxWidth: 600, boxShadow: '0 20px 40px rgba(0,0,0,0.5)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ color: '#f8fafc', fontSize: '1.1rem', fontWeight: 600 }}>Aperçu {question.typeQuestion === 2 ? '(Multiples)' : '(Unique)'}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}><XCircle size={20} /></button>
        </div>
        <div style={{ marginBottom: 12, padding: '4px 8px', background: 'rgba(99,102,241,0.1)', borderRadius: 6, display: 'inline-block' }}>
          <span style={{ fontSize: '0.7rem', color: '#a78bfa' }}>{questionTypeInfo.nom}</span>
        </div>
        {imageSrc && <div style={{ marginBottom: 16, textAlign: 'center' }}><img src={imageSrc} alt="" style={{ maxWidth: '100%', maxHeight: 150, borderRadius: 8, objectFit: 'contain' }} /></div>}
        <p style={{ color: '#f8fafc', fontSize: '1rem', marginBottom: 16 }}>{question.libQuestion}</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {question.options.filter(opt => opt.trim()).map((opt, i) => {
            const isCorrect = typeof question.bonOpRep === 'number' ? i === question.bonOpRep : (Array.isArray(question.correctAnswer) ? question.correctAnswer.includes(opt) : opt === question.correctAnswer);
            return (
              <div key={i} style={{ padding: '8px 12px', background: isCorrect ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.02)', border: `1px solid ${isCorrect ? '#10b981' : 'rgba(99,102,241,0.2)'}`, borderRadius: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ color: isCorrect ? '#10b981' : '#64748b', fontWeight: 600 }}>{String.fromCharCode(65 + i)}.</span>
                <span style={{ color: '#94a3b8' }}>{opt}</span>
                {isCorrect && <CheckCircle size={14} color="#10b981" style={{ marginLeft: 'auto' }} />}
              </div>
            );
          })}
        </div>
        {question.explanation && <div style={{ marginTop: 12, padding: 8, background: 'rgba(59,130,246,0.05)', borderRadius: 8 }}><p style={{ color: '#64748b', fontSize: '0.8rem' }}>💡 {question.explanation}</p></div>}
        <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end' }}><button onClick={onClose} style={{ padding: '6px 12px', background: '#475569', border: 'none', borderRadius: 6, color: '#fff', cursor: 'pointer' }}>Fermer</button></div>
      </motion.div>
    );
  };

  if (authLoading) return <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #05071a 0%, #0a0f2e 60%, #05071a 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Loader2 size={48} color="#6366f1" className="animate-spin" /></div>;

  if (authError) return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #05071a 0%, #0a0f2e 60%, #05071a 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ background: 'rgba(15,23,42,0.9)', border: '1px solid rgba(239,68,68,0.4)', borderRadius: 24, padding: 48, textAlign: 'center', maxWidth: 500 }}>
        <Shield size={40} color="#ef4444" style={{ margin: '0 auto 24px' }} />
        <h2 style={{ color: '#f8fafc', marginBottom: 12 }}>Accès non autorisé</h2>
        <p style={{ color: '#ef4444', marginBottom: 24 }}>{authError}</p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          <button onClick={() => navigate('/login')} style={{ padding: '10px 20px', background: 'linear-gradient(135deg, #3b82f6, #2563eb)', border: 'none', borderRadius: 8, color: 'white', cursor: 'pointer' }}>Se connecter</button>
          <button onClick={() => navigate('/dashboard')} style={{ padding: '10px 20px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 8, color: '#94a3b8', cursor: 'pointer' }}>Dashboard</button>
        </div>
      </div>
    </div>
  );

  if (!user) return <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #05071a 0%, #0a0f2e 60%, #05071a 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Loader2 size={48} color="#6366f1" className="animate-spin" /></div>;

  const ConfigStep = () => (
    <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.3 }}>
      <div style={styles.card}>
        <div style={{ ...styles.userBadge, background: 'rgba(16,185,129,0.1)', borderColor: '#10b981', marginBottom: 24 }}>
          <User size={16} color="#10b981" />
          <span style={{ color: '#10b981', fontSize: '0.8rem' }}>✅ Connecté en tant que : <strong>{user?.name || user?.email}</strong> ({user?.role})</span>
        </div>

        {error && (
          <div style={{ ...styles.statusBadge, background: 'rgba(239,68,68,0.1)', borderColor: '#ef4444', marginBottom: 24 }}>
            <AlertCircle size={20} color="#ef4444" /><span style={{ color: '#ef4444' }}>{error}</span>
          </div>
        )}

        <div style={styles.sectionHeader}>
          <div style={styles.iconContainer}><Settings size={20} color="white" /></div>
          <div><h2 style={styles.sectionTitle}>Configuration du quiz</h2><p style={styles.sectionSubtitle}>Paramétrez les critères de génération</p></div>
        </div>

        <div style={styles.grid2}>
          <div>
            <label style={styles.label}><BookOpen size={14} style={{ marginRight: 4 }} />N°Domaine *</label>
            <select value={selectedDomainId} onChange={(e) => { setSelectedDomainId(e.target.value); setSelectedSousDomaineId(''); setSelectedLevelId(''); setSelectedMatiereId(''); }} style={styles.select}>
              <option value="">Sélectionner...</option>
              {getAllDomaines().map(d => <option key={d.id} value={d.id}>{d.id} - {d.nom}</option>)}
            </select>
          </div>
          <div>
            <label style={styles.label}><Layers size={14} style={{ marginRight: 4 }} />N°Sous-Domaine *</label>
            <select value={selectedSousDomaineId} onChange={(e) => { setSelectedSousDomaineId(e.target.value); setSelectedLevelId(''); setSelectedMatiereId(''); }} disabled={!selectedDomainId} style={{...styles.select, opacity: !selectedDomainId ? 0.5 : 1}}>
              <option value="">Sélectionner...</option>
              {getAllSousDomaines(selectedDomainId).map(sd => <option key={sd.id} value={sd.id}>{sd.id} - {sd.nom}</option>)}
            </select>
          </div>
          <div>
            <label style={styles.label}><Zap size={14} style={{ marginRight: 4 }} />Niveau *</label>
            <select value={selectedLevelId} onChange={(e) => setSelectedLevelId(e.target.value)} disabled={!selectedSousDomaineId} style={{...styles.select, opacity: !selectedSousDomaineId ? 0.5 : 1}}>
              <option value="">Sélectionner...</option>
              {getAllLevels(selectedDomainId, selectedSousDomaineId).map(l => <option key={l.id} value={l.id}>{l.id} - {l.nom}</option>)}
            </select>
          </div>
          <div>
            <label style={styles.label}><BookOpen size={14} style={{ marginRight: 4 }} />Matière *</label>
            <select value={selectedMatiereId} onChange={(e) => setSelectedMatiereId(e.target.value)} disabled={!selectedSousDomaineId} style={{...styles.select, opacity: !selectedSousDomaineId ? 0.5 : 1}}>
              <option value="">Sélectionner...</option>
              {getAllMatieres(selectedDomainId, selectedSousDomaineId).map(m => <option key={m.id} value={m.id}>{m.id} - {m.nom}</option>)}
            </select>
          </div>
        </div>

        {(domainNom || sousDomaineNom || levelNom || matiereNom) && (
          <div style={{ marginTop: 12, marginBottom: 20, padding: 8, background: 'rgba(99,102,241,0.05)', borderRadius: 8, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {domainNom && <span style={{ fontSize: '0.7rem', color: '#a78bfa' }}>Domaine: {domainNom}</span>}
            {sousDomaineNom && <span style={{ fontSize: '0.7rem', color: '#a78bfa' }}>Sous-domaine: {sousDomaineNom}</span>}
            {levelNom && <span style={{ fontSize: '0.7rem', color: '#a78bfa' }}>Niveau: {levelNom}</span>}
            {matiereNom && <span style={{ fontSize: '0.7rem', color: '#a78bfa' }}>Matière: {matiereNom}</span>}
          </div>
        )}

        <div style={{ marginBottom: 20 }}>
          <button onClick={() => setExpandedAdvanced(!expandedAdvanced)} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none', color: '#94a3b8', fontSize: '0.85rem', cursor: 'pointer', padding: '8px 0' }}>
            <Settings size={14} />Paramètres avancés{expandedAdvanced ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          {expandedAdvanced && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} style={{ marginTop: '12px' }}>
              <div style={styles.grid2}>
                <div><label style={styles.label}>Type de questions</label><select value={questionType} onChange={(e) => setQuestionType(e.target.value)} style={styles.select}><option value="single">Choix unique</option><option value="multiple">Choix multiple</option></select></div>
                <div><label style={styles.label}><Award size={14} style={{ marginRight: 4 }} />Difficulté</label><select value={difficulty} onChange={(e) => setDifficulty(e.target.value)} style={styles.select}><option value="facile">Facile</option><option value="moyen">Moyen</option><option value="difficile">Difficile</option></select></div>
                <div><label style={styles.label}><Tag size={14} style={{ marginRight: 4 }} />Mots-clés</label><input type="text" defaultValue="" onChange={(e) => { keywordsRef.current = e.target.value; }} placeholder="Ex: management, stratégie..." style={styles.input} /></div>
                <div><label style={styles.label}><Clock size={14} style={{ marginRight: 4 }} />Durée (minutes)</label><input type="number" min="10" max="300" value={examDuration} onChange={(e) => setExamDuration(parseInt(e.target.value) || 60)} style={styles.input} /></div>
              </div>
            </motion.div>
          )}
        </div>

        <div style={styles.grid2}>
          <div><label style={styles.label}>Nombre de questions</label><input type="number" min="1" max="30" value={numQuestions} onChange={(e) => setNumQuestions(Math.min(30, Math.max(1, parseInt(e.target.value) || 5)))} style={styles.input} /></div>
          <div><label style={styles.label}><Award size={14} style={{ marginRight: 4 }} />Seuil de réussite (%)</label><input type="number" min="0" max="100" value={passingScore} onChange={(e) => setPassingScore(Math.min(100, Math.max(0, parseInt(e.target.value) || 70)))} style={styles.input} /></div>
        </div>

        <div style={{ marginTop: 16, borderTop: '1px solid rgba(99,102,241,0.2)', paddingTop: 16 }}>
          <button onClick={() => setAdvancedConfigOpen(!advancedConfigOpen)} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', color: '#94a3b8', fontSize: '0.85rem', cursor: 'pointer', width: '100%', justifyContent: 'space-between', padding: '8px 0' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Settings size={14} /> Configuration de l'épreuve</span>
            {advancedConfigOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          {advancedConfigOpen && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} style={{ marginTop: 12 }}>
              <div style={styles.grid2}>
                <div><label style={styles.label}>Option d'examen</label><select value={config.examOption} onChange={(e) => setConfig({...config, examOption: e.target.value})} style={styles.select}><option value="A">A - Collective Figée</option><option value="B">B - Collective Souple</option><option value="C">C - Personnalisée</option><option value="D">D - Aléatoire</option></select></div>
                <div><label style={styles.label}>Séquencement</label><select value={config.sequencing} onChange={(e) => setConfig({...config, sequencing: e.target.value})} style={styles.select}><option value="identical">Identique pour tous</option><option value="randomPerStudent">Aléatoire par étudiant</option></select></div>
                <div><label style={{ display: 'flex', alignItems: 'center', gap: 8 }}><input type="checkbox" checked={config.openRange} onChange={(e) => setConfig({...config, openRange: e.target.checked})} /><span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>Plage ouverte</span></label></div>
                <div><label style={{ display: 'flex', alignItems: 'center', gap: 8 }}><input type="checkbox" checked={config.allowRetry} onChange={(e) => setConfig({...config, allowRetry: e.target.checked})} /><span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>Autoriser une reprise</span></label></div>
                <div><label style={{ display: 'flex', alignItems: 'center', gap: 8 }}><input type="checkbox" checked={config.showBinaryResult} onChange={(e) => setConfig({...config, showBinaryResult: e.target.checked})} /><span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>Résultat binaire</span></label></div>
                <div><label style={{ display: 'flex', alignItems: 'center', gap: 8 }}><input type="checkbox" checked={config.showCorrectAnswer} onChange={(e) => setConfig({...config, showCorrectAnswer: e.target.checked})} /><span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>Afficher la bonne réponse</span></label></div>
                <div><label style={styles.label}>Chronomètre</label><select value={config.timerConfig} onChange={(e) => setConfig({...config, timerConfig: e.target.value})} style={styles.select}><option value="once">Une fois</option><option value="twice">Deux fois</option><option value="threeTimes">Trois fois</option><option value="fourTimes">Quatre fois</option><option value="permanent">Permanent</option></select></div>
                <div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}><input type="checkbox" checked={config.timerPerQuestion} onChange={(e) => setConfig({...config, timerPerQuestion: e.target.checked})} /><span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>Chrono par question</span></label>
                  {config.timerPerQuestion
                    ? <input type="number" min="5" max="300" value={config.timePerQuestion} onChange={(e) => setConfig({...config, timePerQuestion: parseInt(e.target.value) || 60})} style={{...styles.input, marginTop: 6}} placeholder="Secondes par question" />
                    : <input type="number" min="1" max="300" value={config.totalTime} onChange={(e) => setConfig({...config, totalTime: parseInt(e.target.value) || 60})} style={{...styles.input, marginTop: 6}} placeholder="Minutes totales" />}
                </div>
              </div>
            </motion.div>
          )}
        </div>

        {isLoading && (
          <div style={{ marginBottom: 20 }}>
            <div style={styles.progressHeader}><span style={{ color: '#94a3b8' }}>Génération en cours...</span><span style={{ color: '#a5b4fc' }}>{generationProgress}%</span></div>
            <div style={styles.progressBar}><motion.div initial={{ width: 0 }} animate={{ width: `${generationProgress}%` }} style={styles.progressFill} /></div>
          </div>
        )}

        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleGenerate} disabled={isLoading}
          style={{ ...styles.generateButton, background: isLoading ? 'rgba(99,102,241,0.3)' : 'linear-gradient(135deg, #6366f1, #8b5cf6)', cursor: isLoading ? 'not-allowed' : 'pointer' }}>
          {isLoading ? <><Loader2 size={18} className="animate-spin" />Génération en cours...</> : <><Sparkles size={18} />Générer le quiz</>}
        </motion.button>
      </div>
    </motion.div>
  );

  const PreviewStep = () => (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }}>
      <div style={styles.card}>
        <div style={styles.previewHeader}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{...styles.iconContainer, background: 'linear-gradient(135deg, #10b981, #059669)'}}><Eye size={20} color="white" /></div>
            <div><h2 style={styles.sectionTitle}>Aperçu du quiz</h2><p style={styles.sectionSubtitle}>{generatedQuiz?.questions?.length || 0} questions</p></div>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <input type="text" value={quizName} onChange={(e) => setQuizName(e.target.value)} placeholder="Nom du quiz..." style={styles.quizNameInput} />
            <textarea value={quizDescription} onChange={(e) => setQuizDescription(e.target.value)} placeholder="Description..." rows={1} style={styles.descriptionInput} />
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={exportQuiz} style={{...styles.regenerateButton, background: 'rgba(16,185,129,0.1)', borderColor: '#10b981', color: '#10b981'}} title="Exporter JSON"><Download size={18} /></motion.button>
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={handleRegenerate} style={styles.regenerateButton} title="Régénérer"><RefreshCw size={18} /></motion.button>
          </div>
        </div>

        {/* Messages d'information */}
        <div style={{ marginBottom: 20, padding: 12, background: 'rgba(99,102,241,0.1)', borderRadius: 12, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <AlertCircle size={18} color="#8b5cf6" />
          <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>
            Vous pouvez enregistrer ces questions dans la base (avec validation) ou créer directement une épreuve.
          </span>
        </div>

        <div style={styles.questionList}>
          {generatedQuiz?.questions?.map((q, index) => {
            const imageSrc = q.imageQuestion || (q.imageBase64?.startsWith('data:') ? q.imageBase64 : null);
            const isEditing = editingQuestionIndex === index;
            return (
              <motion.div key={q.id || index} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}
                style={{ ...styles.questionCard, border: isEditing ? '1px solid rgba(99,102,241,0.5)' : styles.questionCard.border, background: isEditing ? 'rgba(99,102,241,0.1)' : styles.questionCard.background }}>
                {isEditing && editQuestionData ? (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                      <h4 style={{ color: '#f8fafc' }}>Modifier la question</h4>
                      <button onClick={() => { setEditingQuestionIndex(null); setEditQuestionData(null); }} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}>Annuler</button>
                    </div>
                    <textarea value={editQuestionData.libQuestion} onChange={(e) => setEditQuestionData({...editQuestionData, libQuestion: e.target.value})} style={styles.input} rows={2} placeholder="Question..." />
                    <div style={{ marginTop: 12, marginBottom: 12 }}>
                      <label style={{ color: '#94a3b8', fontSize: '0.7rem' }}>Options</label>
                      {editQuestionData.options.map((opt, optIdx) => (
                        <div key={optIdx} style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                          <input type="text" value={opt} onChange={(e) => { const newOpts = [...editQuestionData.options]; newOpts[optIdx] = e.target.value; setEditQuestionData({...editQuestionData, options: newOpts}); }} style={styles.input} placeholder={`Option ${String.fromCharCode(65 + optIdx)}`} />
                          <button onClick={() => setEditQuestionData({...editQuestionData, correctAnswer: opt})} style={{ padding: '8px', background: editQuestionData.correctAnswer === opt ? '#10b981' : '#475569', border: 'none', borderRadius: 6, color: 'white', cursor: 'pointer' }}>✓</button>
                        </div>
                      ))}
                    </div>
                    <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
                      <div><label style={{ color: '#94a3b8', fontSize: '0.7rem' }}>Points</label><input type="number" min="0.5" max="10" step="0.5" value={editQuestionData.points} onChange={(e) => setEditQuestionData({...editQuestionData, points: parseFloat(e.target.value)})} style={styles.input} /></div>
                      <div style={{ flex: 1 }}><label style={{ color: '#94a3b8', fontSize: '0.7rem' }}>Explication</label><input type="text" value={editQuestionData.explanation} onChange={(e) => setEditQuestionData({...editQuestionData, explanation: e.target.value})} style={styles.input} placeholder="Explication..." /></div>
                    </div>
                    <ImageUploader value={editQuestionData.imageQuestion || editQuestionData.imageBase64} onImageChange={(url, base64, metadata) => setEditQuestionData({...editQuestionData, imageQuestion: url, imageBase64: base64, imageMetadata: metadata})} label="Image" />
                    <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={saveEditQuestion} style={{ marginTop: 12, padding: '8px 16px', background: '#10b981', border: 'none', borderRadius: 8, color: 'white', cursor: 'pointer' }}>Enregistrer</motion.button>
                  </div>
                ) : (
                  <>
                    <div style={styles.questionHeader}>
                      <span style={styles.questionNumber}>{index + 1}</span>
                      <p style={styles.questionText}>{q.libQuestion}{q.typeQuestion === 2 && <span style={{ color: '#f59e0b', marginLeft: 6 }}>(Multiple)</span>}</p>
                      <span style={{ ...styles.difficultyBadge, background: q.difficulty === 'facile' ? 'rgba(16,185,129,0.1)' : q.difficulty === 'moyen' ? 'rgba(245,158,11,0.1)' : 'rgba(239,68,68,0.1)', borderColor: q.difficulty === 'facile' ? '#10b981' : q.difficulty === 'moyen' ? '#f59e0b' : '#ef4444', color: q.difficulty === 'facile' ? '#10b981' : q.difficulty === 'moyen' ? '#f59e0b' : '#ef4444' }}>{q.points} pt{q.points > 1 ? 's' : ''}</span>
                      <button onClick={() => startEditQuestion(index)} style={{ marginLeft: 8, padding: '4px 8px', background: 'rgba(245,158,11,0.2)', border: 'none', borderRadius: 4, color: '#f59e0b', cursor: 'pointer', fontSize: '0.7rem' }}>Modifier</button>
                    </div>
                    {imageSrc && <div style={{ marginBottom: 12 }}><img src={imageSrc} alt="" style={{ maxWidth: '100%', maxHeight: 100, borderRadius: 8, objectFit: 'contain' }} /></div>}
                    <div style={styles.optionsGrid}>
                      {q.options.filter(opt => opt.trim()).map((opt, optIndex) => {
                        const isCorrect = Array.isArray(q.correctAnswer) ? q.correctAnswer.includes(opt) : opt === q.correctAnswer;
                        return (
                          <div key={optIndex} style={{ ...styles.option, background: isCorrect ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.02)', borderColor: isCorrect ? '#10b981' : 'rgba(99,102,241,0.2)' }}>
                            <span style={{ ...styles.optionLetter, color: isCorrect ? '#10b981' : '#64748b' }}>{String.fromCharCode(65 + optIndex)}.</span>
                            <span style={{ ...styles.optionText, color: isCorrect ? '#10b981' : '#94a3b8' }}>{opt}</span>
                            {isCorrect && <CheckCircle size={14} color="#10b981" />}
                          </div>
                        );
                      })}
                    </div>
                    {q.explanation && <div style={styles.explanation}><span style={{ color: '#94a3b8' }}>💡 </span>{q.explanation}</div>}
                    <div style={{ marginTop: 12, display: 'flex', gap: 12, fontSize: '0.7rem', color: '#64748b', flexWrap: 'wrap' }}>
                      <span>📚 {q.nDomaine}</span><span>📁 {q.nSousDomaine}</span><span>🎓 {q.niveau}</span><span>📖 {q.matiere}</span><span>⏱️ {q.tempsMin} min</span>
                    </div>
                  </>
                )}
              </motion.div>
            );
          })}
        </div>

        {/* Boutons d'action avec deux options */}
        <div style={styles.actionButtons}>
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => setCurrentStep(1)} style={styles.editButton}>
            Modifier
          </motion.button>
          
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={saveQuestionsToBase}
            disabled={isLoading}
            style={{
              ...styles.saveButton,
              background: isLoading ? 'rgba(139,92,246,0.3)' : 'linear-gradient(135deg, #8b5cf6, #6366f1)',
              cursor: isLoading ? 'not-allowed' : 'pointer'
            }}
          >
            {isLoading ? <><Loader2 size={16} className="animate-spin" /> Enregistrement...</> : <><Database size={16} /> Envoyer en validation</>}
          </motion.button>
          
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={saveExamDirectly}
            disabled={isLoading}
            style={{
              ...styles.saveButton,
              background: isLoading ? 'rgba(16,185,129,0.3)' : 'linear-gradient(135deg, #10b981, #059669)',
              cursor: isLoading ? 'not-allowed' : 'pointer'
            }}
          >
            {isLoading ? <><Loader2 size={16} className="animate-spin" /> Sauvegarde...</> : <><Save size={16} /> Enregistrer comme épreuve</>}
          </motion.button>
        </div>
        
        {/* Note explicative */}
        <div style={{ marginTop: 16, padding: 12, background: 'rgba(245,158,11,0.05)', borderRadius: 8 }}>
          <p style={{ fontSize: '0.7rem', color: '#f59e0b', display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertCircle size={12} />
            💡 <strong>"Envoyer en validation"</strong> : les questions seront stockées dans la base et devront être validées par un administrateur avant utilisation.
            <br />
            💡 <strong>"Enregistrer comme épreuve"</strong> : l'épreuve sera créée immédiatement sans validation préalable.
          </p>
        </div>
      </div>
    </motion.div>
  );

  const styles = {
    container: { minHeight: '100vh', background: 'linear-gradient(135deg, #05071a 0%, #0a0f2e 60%, #05071a 100%)', position: 'relative', padding: '24px' },
    backgroundGrid: { position: 'fixed', inset: 0, backgroundImage: 'linear-gradient(rgba(99,102,241,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.03) 1px, transparent 1px)', backgroundSize: '40px 40px', pointerEvents: 'none', zIndex: 0 },
    glowEffect: { position: 'fixed', top: '-15%', left: '50%', transform: 'translateX(-50%)', width: '70vw', height: '50vh', background: 'radial-gradient(ellipse, rgba(99,102,241,0.12) 0%, transparent 70%)', pointerEvents: 'none', zIndex: 0 },
    main: { position: 'relative', zIndex: 1, maxWidth: 900, margin: '0 auto' },
    header: { display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 },
    backButton: { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 12, padding: 12, color: '#94a3b8', cursor: 'pointer', display: 'flex' },
    aiBadge: { display: 'inline-flex', alignItems: 'center', gap: 8, padding: '4px 12px', background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 20, marginBottom: 8, color: '#a5b4fc', fontSize: '0.7rem', fontWeight: 600 },
    userBadge: { display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', border: '1px solid', borderRadius: 10 },
    title: { fontSize: '2rem', fontWeight: 700, color: '#f8fafc', margin: 0 },
    stepIndicator: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24 },
    stepCircle: { width: 32, height: 32, borderRadius: '50%', border: '1px solid', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 600 },
    stepLine: { width: 60, height: 2 },
    card: { background: 'rgba(15,23,42,0.7)', backdropFilter: 'blur(12px)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 24, padding: 32 },
    statusBadge: { padding: 12, border: '1px solid', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 12 },
    sectionHeader: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 },
    iconContainer: { width: 40, height: 40, borderRadius: 12, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
    sectionTitle: { fontSize: '1.2rem', fontWeight: 600, color: '#f8fafc', margin: 0 },
    sectionSubtitle: { fontSize: '0.8rem', color: '#64748b', margin: 0 },
    grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 },
    label: { display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: 6 },
    select: { width: '100%', padding: 12, background: '#0f172a', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 10, color: '#f8fafc', outline: 'none', cursor: 'pointer' },
    input: { width: '100%', padding: 12, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 10, color: '#f8fafc', outline: 'none' },
    progressHeader: { display: 'flex', justifyContent: 'space-between', marginBottom: 6 },
    progressBar: { width: '100%', height: 6, background: '#1e293b', borderRadius: 3, overflow: 'hidden' },
    progressFill: { height: '100%', background: 'linear-gradient(90deg, #6366f1, #8b5cf6)', borderRadius: 3 },
    generateButton: { width: '100%', padding: 16, border: 'none', borderRadius: 12, color: 'white', fontSize: '1rem', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: '0 8px 20px rgba(99,102,241,0.3)' },
    previewHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 16 },
    quizNameInput: { padding: '10px 16px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 10, color: '#f8fafc', width: 200, outline: 'none' },
    descriptionInput: { padding: '10px 16px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 10, color: '#f8fafc', width: 200, outline: 'none', resize: 'none' },
    regenerateButton: { padding: '10px', background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 10, color: '#a5b4fc', cursor: 'pointer' },
    questionList: { maxHeight: 500, overflowY: 'auto', paddingRight: 8, marginBottom: 24 },
    questionCard: { background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(99,102,241,0.1)', borderRadius: 16, padding: 20, marginBottom: 16 },
    questionHeader: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 },
    questionNumber: { width: 28, height: 28, borderRadius: 8, background: '#6366f1', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 600 },
    questionText: { color: '#f8fafc', fontWeight: 500, flex: 1, margin: 0 },
    difficultyBadge: { padding: '2px 8px', border: '1px solid', borderRadius: 12, fontSize: '0.6rem' },
    optionsGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 },
    option: { padding: '10px 12px', border: '1px solid', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 8 },
    optionLetter: { fontSize: '0.7rem', fontWeight: 600, minWidth: 20 },
    optionText: { fontSize: '0.9rem', flex: 1 },
    explanation: { marginTop: 8, padding: 8, background: 'rgba(59,130,246,0.05)', borderRadius: 8, fontSize: '0.8rem', color: '#64748b' },
    actionButtons: { display: 'flex', gap: 12, justifyContent: 'flex-end', flexWrap: 'wrap' },
    editButton: { padding: '12px 24px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 10, color: '#94a3b8', cursor: 'pointer' },
    saveButton: { display: 'flex', alignItems: 'center', gap: 8, padding: '12px 24px', border: 'none', borderRadius: 10, color: 'white', fontWeight: 600, cursor: 'pointer' },
  };

  return (
    <div style={styles.container}>
      <div style={styles.backgroundGrid} />
      <div style={styles.glowEffect} />
      <main style={styles.main}>
        <div style={styles.header}>
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => navigate(-1)} style={styles.backButton}><ArrowLeft size={20} /></motion.button>
          <div>
            <div style={styles.aiBadge}><Bot size={14} color="#6366f1" /><span>GÉNÉRATION PAR IA</span></div>
            <h1 style={styles.title}>Générateur Intelligent</h1>
          </div>
        </div>
        <div style={styles.stepIndicator}>
          {[1, 2].map((step) => (
            <React.Fragment key={step}>
              <div style={{ ...styles.stepCircle, background: currentStep >= step ? '#6366f1' : 'rgba(255,255,255,0.05)', borderColor: currentStep >= step ? '#6366f1' : 'rgba(99,102,241,0.2)', color: currentStep >= step ? 'white' : '#64748b' }}>{step}</div>
              {step === 1 && <div style={{ ...styles.stepLine, background: currentStep > 1 ? '#6366f1' : 'rgba(255,255,255,0.1)' }} />}
            </React.Fragment>
          ))}
        </div>
        <AnimatePresence mode="wait">{currentStep === 1 ? <ConfigStep /> : <PreviewStep />}</AnimatePresence>
      </main>
      <Toaster position="top-right" toastOptions={{ style: { background: '#1e293b', color: '#f8fafc', border: '1px solid #3b82f6', borderRadius: '10px' } }} />
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .animate-spin { animation: spin 1s linear infinite; }
        select option { background: #0f172a !important; color: #f8fafc !important; }
        select:focus, input:focus, textarea:focus { border-color: #6366f1 !important; box-shadow: 0 0 0 2px rgba(99,102,241,0.2) !important; }
        ::-webkit-scrollbar { width: 6px; } ::-webkit-scrollbar-track { background: rgba(15,23,42,0.3); border-radius: 10px; } ::-webkit-scrollbar-thumb { background: rgba(99,102,241,0.3); border-radius: 10px; }
      `}</style>
    </div>
  );
};

export default AIQuizCreation;