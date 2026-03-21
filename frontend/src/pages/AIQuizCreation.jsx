// src/pages/AIQuizCreation.jsx - Version corrigée sans authentification
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, Loader2, Save, ArrowLeft, Bot,
  Settings, Eye, BookOpen, Layers, Tag,
  AlertCircle, CheckCircle, RefreshCw, Zap
} from 'lucide-react';
import DOMAIN_DATA from '../data/domainConfig';
import { generateQuestionsAI, createExam } from '../services/api';
import toast from 'react-hot-toast';

const AIQuizCreation = () => {
  const navigate = useNavigate();
  
  // État du formulaire
  const [selectedDomain, setSelectedDomain] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedLevel, setSelectedLevel] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [questionType, setQuestionType] = useState('single');
  const [numQuestions, setNumQuestions] = useState(5);
  const [keywords, setKeywords] = useState('');
  
  // État de l'application
  const [generatedQuiz, setGeneratedQuiz] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [quizName, setQuizName] = useState('');
  const [currentStep, setCurrentStep] = useState(1);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [error, setError] = useState(null);

  // Helpers pour les données
  const getCategories = () => selectedDomain ? Object.keys(DOMAIN_DATA[selectedDomain]) : [];
  const getLevels = () => {
    if (!selectedDomain || !selectedCategory) return [];
    const categoryData = DOMAIN_DATA[selectedDomain][selectedCategory];
    return categoryData?.levels || [];
  };
  const getSubjects = () => {
    if (!selectedDomain || !selectedCategory) return [];
    const categoryData = DOMAIN_DATA[selectedDomain][selectedCategory];
    return categoryData?.subjects || [];
  };

  const getDifficultyFromLevel = (level) => {
    if (level.includes('CP') || level.includes('CE1') || level.includes('CE2')) return 'facile';
    if (level.includes('CM1') || level.includes('CM2') || level.includes('6e')) return 'moyen';
    if (level.includes('5e') || level.includes('4e') || level.includes('3e')) return 'difficile';
    if (level.includes('2nde') || level.includes('1ère') || level.includes('Terminale')) return 'difficile';
    return 'moyen';
  };

  // Simulation de progression
  useEffect(() => {
    let interval;
    if (isLoading) {
      setGenerationProgress(0);
      interval = setInterval(() => {
        setGenerationProgress(prev => {
          if (prev >= 90) {
            clearInterval(interval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);
    }
    return () => clearInterval(interval);
  }, [isLoading]);

  // ✅ HANDLE GENERATE - Format adapté pour l'API
  const handleGenerate = async () => {
    if (!selectedDomain || !selectedCategory || !selectedLevel || !selectedSubject) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }

    setIsLoading(true);
    setError(null);
    setGenerationProgress(0);

    try {
      const requestData = {
        domain: selectedDomain,
        subDomain: selectedCategory,
        level: selectedLevel,
        subject: selectedSubject,
        numQuestions: numQuestions,
        difficulty: getDifficultyFromLevel(selectedLevel),
        type: questionType === 'multiple' ? 'multiple' : 'qcm',
        keywords: keywords
      };

      console.log('🚀 Envoi au backend:', requestData);
      
      // ✅ Utiliser fetch avec un timeout plus long
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 90000); // 90s pour DeepSeek
      
      const BASE = process.env.REACT_APP_BACKEND_URL || 'https://na2quizapp.onrender.com';
      const response = await fetch(`${BASE}/api/generate-questions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      console.log('📦 Réponse reçue:', data);

      // Traiter la réponse
      if (data && data.questions && Array.isArray(data.questions)) {
        const questions = data.questions;
        
        const formattedQuestions = questions.map((q, index) => ({
          id: index + 1,
          text: q.text,
          options: q.options,
          correctAnswer: q.answer || q.correctAnswer,
          explanation: q.explanation,
          points: q.points || 1,
          difficulty: q.difficulty || 'moyen'
        }));

        setGeneratedQuiz({
          title: `${selectedSubject} - Quiz IA`,
          description: data.metadata?.description || `Quiz généré sur ${selectedSubject}`,
          questions: formattedQuestions
        });

        setQuizName(`${selectedSubject} - Quiz IA`);
        setGenerationProgress(100);
        setTimeout(() => setCurrentStep(2), 500);
        toast.success(`${formattedQuestions.length} questions générées !`);
      } else {
        throw new Error('Format de réponse invalide');
      }

    } catch (error) {
      console.error('❌ Erreur génération:', error);
      setError(error.message || 'Erreur lors de la génération');
      toast.error(error.message || 'Erreur lors de la génération');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegenerate = () => {
    setGeneratedQuiz(null);
    setCurrentStep(1);
    setError(null);
    handleGenerate();
  };

  // Sauvegarde du quiz dans le backend
  const handleSave = async () => {
  if (!generatedQuiz || !quizName) {
    toast.error('Veuillez générer un quiz et lui donner un nom');
    return;
  }

  setIsLoading(true);
  try {
    // Formater les questions pour le backend
    const formattedQuestions = generatedQuiz.questions.map(q => ({
      question: q.text,
      text: q.text,
      options: q.options,
      answer: q.correctAnswer,
      correctAnswer: q.correctAnswer,
      explanation: q.explanation || '',
      points: q.points || 1,
      type: questionType === 'multiple' ? 'multiple' : 'single'
    }));

    const examData = {
      title: quizName,
      domain: selectedDomain,
      category: selectedCategory,
      level: selectedLevel,
      subject: selectedSubject,
      questions: formattedQuestions,
      duration: 60,
      passingScore: 70,
      totalPoints: formattedQuestions.reduce((sum, q) => sum + (q.points || 1), 0),
      source: 'ai_generated',
      metadata: {
        generatedAt: new Date().toISOString(),
        model: 'deepseek-chat',
        prompt: keywords,
        numQuestions: numQuestions,
        difficulty: getDifficultyFromLevel(selectedLevel)
      }
    };

    console.log('📦 Sauvegarde de l\'épreuve:', examData);
    
    // Utiliser fetch directement au lieu de createExam pour avoir plus de contrôle
    const BASE2 = process.env.REACT_APP_BACKEND_URL || 'https://na2quizapp.onrender.com';
    const response = await fetch(`${BASE2}/api/exams`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(examData),
    });

    console.log('📡 Réponse du serveur:', response.status, response.statusText);
    
    const responseData = await response.json();
    console.log('📦 Données de réponse:', responseData);

    if (response.ok && responseData.success !== false) {
      toast.success('Épreuve enregistrée avec succès !');
      setTimeout(() => navigate('/exams'), 1000);
    } else {
      throw new Error(responseData.error || responseData.message || 'Erreur lors de la sauvegarde');
    }
  } catch (error) {
    console.error('❌ Erreur détaillée sauvegarde:', error);
    console.error('Message:', error.message);
    
    // Afficher un message plus informatif
    let errorMessage = 'Erreur lors de la sauvegarde';
    if (error.message.includes('Failed to fetch')) {
      errorMessage = 'Impossible de contacter le serveur Render. Vérifiez la connexion.';
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    toast.error(errorMessage);
  } finally {
    setIsLoading(false);
  }
};

  // Composant de configuration
  const ConfigStep = () => (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
    >
      <div style={styles.card}>
        {/* Affichage de l'erreur */}
        {error && (
          <div style={{
            ...styles.statusBadge,
            background: 'rgba(239,68,68,0.1)',
            borderColor: '#ef4444',
            marginBottom: 24,
          }}>
            <AlertCircle size={20} color="#ef4444" />
            <span style={{ color: '#ef4444' }}>
              {error}
            </span>
          </div>
        )}

        <div style={styles.sectionHeader}>
          <div style={styles.iconContainer}>
            <Settings size={20} color="white" />
          </div>
          <div>
            <h2 style={styles.sectionTitle}>Configuration du quiz</h2>
            <p style={styles.sectionSubtitle}>Paramétrez les critères de génération</p>
          </div>
        </div>

        <div style={styles.grid2}>
          <div>
            <label style={styles.label}>
              <BookOpen size={14} style={{ marginRight: 4 }} />
              Domaine *
            </label>
            <select
              value={selectedDomain}
              onChange={(e) => setSelectedDomain(e.target.value)}
              style={styles.select}
            >
              <option value="">Sélectionner...</option>
              {Object.keys(DOMAIN_DATA).map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={styles.label}>
              <Layers size={14} style={{ marginRight: 4 }} />
              Catégorie *
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              disabled={!selectedDomain}
              style={{...styles.select, opacity: !selectedDomain ? 0.5 : 1}}
            >
              <option value="">Sélectionner...</option>
              {getCategories().map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={styles.label}>
              <Zap size={14} style={{ marginRight: 4 }} />
              Niveau *
            </label>
            <select
              value={selectedLevel}
              onChange={(e) => setSelectedLevel(e.target.value)}
              disabled={!selectedCategory}
              style={{...styles.select, opacity: !selectedCategory ? 0.5 : 1}}
            >
              <option value="">Sélectionner...</option>
              {getLevels().map(l => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={styles.label}>
              <BookOpen size={14} style={{ marginRight: 4 }} />
              Matière *
            </label>
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              disabled={!selectedCategory}
              style={{...styles.select, opacity: !selectedCategory ? 0.5 : 1}}
            >
              <option value="">Sélectionner...</option>
              {getSubjects().map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>

        <div style={styles.grid2}>
          <div>
            <label style={styles.label}>Type de questions</label>
            <select
              value={questionType}
              onChange={(e) => setQuestionType(e.target.value)}
              style={styles.select}
            >
              <option value="single">Choix unique</option>
              <option value="multiple">Choix multiple</option>
            </select>
          </div>

          <div>
            <label style={styles.label}>Nombre de questions</label>
            <input
              type="number"
              min="1"
              max="30"
              value={numQuestions}
              onChange={(e) => setNumQuestions(Number(e.target.value))}
              style={styles.input}
            />
          </div>
        </div>

        <div style={{ marginBottom: 24 }}>
          <label style={styles.label}>
            <Tag size={14} style={{ marginRight: 4 }} />
            Mots-clés (optionnel)
          </label>
          <input
            type="text"
            value={keywords}
            onChange={(e) => setKeywords(e.target.value)}
            placeholder="Ex: management, stratégie, leadership..."
            style={styles.input}
          />
        </div>

        {/* Progression */}
        {isLoading && (
          <div style={{ marginBottom: 20 }}>
            <div style={styles.progressHeader}>
              <span style={{ color: '#94a3b8' }}>Génération en cours...</span>
              <span style={{ color: '#a5b4fc' }}>{generationProgress}%</span>
            </div>
            <div style={styles.progressBar}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${generationProgress}%` }}
                style={styles.progressFill}
              />
            </div>
          </div>
        )}

        {/* Bouton de génération */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleGenerate}
          disabled={isLoading}
          style={{
            ...styles.generateButton,
            background: isLoading ? 'rgba(99,102,241,0.3)' : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            cursor: isLoading ? 'not-allowed' : 'pointer',
          }}
        >
          {isLoading ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              Génération en cours...
            </>
          ) : (
            <>
              <Sparkles size={18} />
              Générer le quiz
            </>
          )}
        </motion.button>
      </div>
    </motion.div>
  );

  // Composant de prévisualisation
  const PreviewStep = () => (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
    >
      <div style={styles.card}>
        <div style={styles.previewHeader}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{...styles.iconContainer, background: 'linear-gradient(135deg, #10b981, #059669)'}}>
              <Eye size={20} color="white" />
            </div>
            <div>
              <h2 style={styles.sectionTitle}>Aperçu du quiz</h2>
              <p style={styles.sectionSubtitle}>
                {generatedQuiz?.questions?.length || 0} questions
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <input
              type="text"
              value={quizName}
              onChange={(e) => setQuizName(e.target.value)}
              placeholder="Nom du quiz..."
              style={styles.quizNameInput}
            />
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleRegenerate}
              style={styles.regenerateButton}
              title="Régénérer"
            >
              <RefreshCw size={18} />
            </motion.button>
          </div>
        </div>

        {/* Liste des questions */}
        <div style={styles.questionList}>
          {generatedQuiz?.questions?.map((q, index) => (
            <motion.div
              key={q.id || index}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              style={styles.questionCard}
            >
              <div style={styles.questionHeader}>
                <span style={styles.questionNumber}>{index + 1}</span>
                <p style={styles.questionText}>{q.text}</p>
                <span style={{
                  ...styles.difficultyBadge,
                  background: 'rgba(245,158,11,0.1)',
                  borderColor: '#f59e0b',
                  color: '#f59e0b',
                }}>
                  {q.points} pt{q.points > 1 ? 's' : ''}
                </span>
              </div>

              <div style={styles.optionsGrid}>
                {q.options?.map((opt, optIndex) => {
                  const isCorrect = opt === q.correctAnswer;
                  return (
                    <div
                      key={optIndex}
                      style={{
                        ...styles.option,
                        background: isCorrect ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.02)',
                        borderColor: isCorrect ? '#10b981' : 'rgba(99,102,241,0.2)',
                      }}
                    >
                      <span style={{
                        ...styles.optionLetter,
                        color: isCorrect ? '#10b981' : '#64748b',
                      }}>
                        {String.fromCharCode(65 + optIndex)}.
                      </span>
                      <span style={{
                        ...styles.optionText,
                        color: isCorrect ? '#10b981' : '#94a3b8',
                      }}>
                        {opt}
                      </span>
                      {isCorrect && <CheckCircle size={14} color="#10b981" />}
                    </div>
                  );
                })}
              </div>

              {q.explanation && (
                <div style={styles.explanation}>
                  <span style={{ color: '#94a3b8' }}>💡 </span>
                  {q.explanation}
                </div>
              )}
            </motion.div>
          ))}
        </div>

        {/* Actions */}
        <div style={styles.actionButtons}>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setCurrentStep(1)}
            style={styles.editButton}
          >
            Modifier
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleSave}
            disabled={isLoading}
            style={{
              ...styles.saveButton,
              background: isLoading ? 'rgba(16,185,129,0.3)' : 'linear-gradient(135deg, #10b981, #059669)',
              cursor: isLoading ? 'not-allowed' : 'pointer',
            }}
          >
            {isLoading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Sauvegarde...
              </>
            ) : (
              <>
                <Save size={16} />
                Enregistrer l'épreuve
              </>
            )}
          </motion.button>
        </div>
      </div>
    </motion.div>
  );

  // Rendu principal
  return (
    <div style={styles.container}>
      <div style={styles.backgroundGrid} />
      <div style={styles.glowEffect} />

      <main style={styles.main}>
        <div style={styles.header}>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate(-1)}
            style={styles.backButton}
          >
            <ArrowLeft size={20} />
          </motion.button>

          <div>
            <div style={styles.aiBadge}>
              <Bot size={14} color="#6366f1" />
              <span>GÉNÉRATION PAR IA</span>
            </div>
            <h1 style={styles.title}>Générateur Intelligent</h1>
          </div>
        </div>

        <div style={styles.stepIndicator}>
          {[1, 2].map((step) => (
            <React.Fragment key={step}>
              <div style={{
                ...styles.stepCircle,
                background: currentStep >= step ? '#6366f1' : 'rgba(255,255,255,0.05)',
                borderColor: currentStep >= step ? '#6366f1' : 'rgba(99,102,241,0.2)',
                color: currentStep >= step ? 'white' : '#64748b',
              }}>
                {step}
              </div>
              {step === 1 && (
                <div style={{
                  ...styles.stepLine,
                  background: currentStep > 1 ? '#6366f1' : 'rgba(255,255,255,0.1)',
                }} />
              )}
            </React.Fragment>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {currentStep === 1 ? <ConfigStep /> : <PreviewStep />}
        </AnimatePresence>
      </main>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .animate-spin {
          animation: spin 1s linear infinite;
        }
      `}</style>
    </div>
  );
};

const styles = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #05071a 0%, #0a0f2e 60%, #05071a 100%)',
    position: 'relative',
    padding: '24px',
  },
  backgroundGrid: {
    position: 'fixed',
    inset: 0,
    backgroundImage: 'linear-gradient(rgba(99,102,241,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.03) 1px, transparent 1px)',
    backgroundSize: '40px 40px',
    pointerEvents: 'none',
    zIndex: 0,
  },
  glowEffect: {
    position: 'fixed',
    top: '-15%',
    left: '50%',
    transform: 'translateX(-50%)',
    width: '70vw',
    height: '50vh',
    background: 'radial-gradient(ellipse, rgba(99,102,241,0.12) 0%, transparent 70%)',
    pointerEvents: 'none',
    zIndex: 0,
  },
  main: {
    position: 'relative',
    zIndex: 1,
    maxWidth: 900,
    margin: '0 auto',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    marginBottom: 24,
  },
  backButton: {
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(99,102,241,0.2)',
    borderRadius: 12,
    padding: 12,
    color: '#94a3b8',
    cursor: 'pointer',
    display: 'flex',
  },
  aiBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    padding: '4px 12px',
    background: 'rgba(99,102,241,0.1)',
    border: '1px solid rgba(99,102,241,0.3)',
    borderRadius: 20,
    marginBottom: 8,
    color: '#a5b4fc',
    fontSize: '0.7rem',
    fontWeight: 600,
  },
  title: {
    fontSize: '2rem',
    fontWeight: 700,
    color: '#f8fafc',
    margin: 0,
  },
  stepIndicator: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 24,
  },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: '50%',
    border: '1px solid',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.8rem',
    fontWeight: 600,
  },
  stepLine: {
    width: 60,
    height: 2,
  },
  card: {
    background: 'rgba(15,23,42,0.7)',
    backdropFilter: 'blur(12px)',
    border: '1px solid rgba(99,102,241,0.2)',
    borderRadius: 24,
    padding: 32,
  },
  statusBadge: {
    padding: 12,
    border: '1px solid',
    borderRadius: 12,
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    marginBottom: 24,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: '1.2rem',
    fontWeight: 600,
    color: '#f8fafc',
    margin: 0,
  },
  sectionSubtitle: {
    fontSize: '0.8rem',
    color: '#64748b',
    margin: 0,
  },
  grid2: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 20,
    marginBottom: 20,
  },
  label: {
    display: 'block',
    fontSize: '0.8rem',
    color: '#94a3b8',
    marginBottom: 6,
  },
  select: {
    width: '100%',
    padding: 12,
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(99,102,241,0.2)',
    borderRadius: 10,
    color: '#f8fafc',
    outline: 'none',
  },
  input: {
    width: '100%',
    padding: 12,
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(99,102,241,0.2)',
    borderRadius: 10,
    color: '#f8fafc',
    outline: 'none',
  },
  progressHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  progressBar: {
    width: '100%',
    height: 6,
    background: '#1e293b',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    background: 'linear-gradient(90deg, #6366f1, #8b5cf6)',
    borderRadius: 3,
  },
  generateButton: {
    width: '100%',
    padding: 16,
    border: 'none',
    borderRadius: 12,
    color: 'white',
    fontSize: '1rem',
    fontWeight: 600,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    boxShadow: '0 8px 20px rgba(99,102,241,0.3)',
  },
  previewHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
    flexWrap: 'wrap',
    gap: 16,
  },
  quizNameInput: {
    padding: '10px 16px',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(99,102,241,0.2)',
    borderRadius: 10,
    color: '#f8fafc',
    width: 300,
    outline: 'none',
  },
  regenerateButton: {
    padding: '10px',
    background: 'rgba(99,102,241,0.1)',
    border: '1px solid rgba(99,102,241,0.3)',
    borderRadius: 10,
    color: '#a5b4fc',
    cursor: 'pointer',
  },
  questionList: {
    maxHeight: 500,
    overflowY: 'auto',
    paddingRight: 8,
    marginBottom: 24,
  },
  questionCard: {
    background: 'rgba(255,255,255,0.02)',
    border: '1px solid rgba(99,102,241,0.1)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  questionHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  questionNumber: {
    width: 28,
    height: 28,
    borderRadius: 8,
    background: '#6366f1',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.8rem',
    fontWeight: 600,
  },
  questionText: {
    color: '#f8fafc',
    fontWeight: 500,
    flex: 1,
    margin: 0,
  },
  difficultyBadge: {
    padding: '2px 8px',
    border: '1px solid',
    borderRadius: 12,
    fontSize: '0.6rem',
  },
  optionsGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 8,
    marginBottom: 8,
  },
  option: {
    padding: '10px 12px',
    border: '1px solid',
    borderRadius: 8,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  optionLetter: {
    fontSize: '0.7rem',
    fontWeight: 600,
    minWidth: 20,
  },
  optionText: {
    fontSize: '0.9rem',
    flex: 1,
  },
  explanation: {
    marginTop: 8,
    padding: 8,
    background: 'rgba(59,130,246,0.05)',
    borderRadius: 8,
    fontSize: '0.8rem',
    color: '#64748b',
  },
  actionButtons: {
    display: 'flex',
    gap: 12,
    justifyContent: 'flex-end',
  },
  editButton: {
    padding: '12px 24px',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(99,102,241,0.2)',
    borderRadius: 10,
    color: '#94a3b8',
    cursor: 'pointer',
  },
  saveButton: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '12px 24px',
    border: 'none',
    borderRadius: 10,
    color: 'white',
    fontWeight: 600,
    cursor: 'pointer',
  },
};

export default AIQuizCreation;
