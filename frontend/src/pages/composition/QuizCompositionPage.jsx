// src/pages/composition/QuizCompositionPage.jsx - VERSION FINALE AVEC CONFIGURATIONS A à K
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { toast, Toaster } from 'react-hot-toast';
import Confetti from 'react-confetti';
import { v4 as uuidv4 } from 'uuid';
import io from 'socket.io-client';
import {
  Clock, CheckCircle, Send, ArrowLeft, ArrowRight,
  AlertTriangle, Loader, Users, RefreshCw, Eye, XCircle,
  Save as SaveIcon, Image as ImageIcon
} from 'lucide-react';
import ENV_CONFIG from '../../config/env';

const NODE_BACKEND_URL = ENV_CONFIG.BACKEND_URL;
const SOCKET_URL = ENV_CONFIG.SOCKET_URL;

console.log('[QuizCompositionPage] Backend URL:', NODE_BACKEND_URL);
console.log('[QuizCompositionPage] Socket URL:', SOCKET_URL);

// Timer component avec support des modes d'affichage
const Timer = ({ initialTime, onTimeEnd, isActive, resetTrigger, timerConfig = 'permanent', onTick, displayMode = 'permanent', onDisplayShown }) => {
  const [timeLeft, setTimeLeft] = useState(initialTime);
  const [hasShown, setHasShown] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    setTimeLeft(initialTime);
    setHasShown(false);
  }, [initialTime, resetTrigger]);

  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (!isActive) return;

    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          if (onTimeEnd) onTimeEnd();
          return 0;
        }
        if (onTick) onTick(prev - 1);
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isActive, onTimeEnd, onTick]);

  useEffect(() => {
    if (isActive && !hasShown && onDisplayShown) {
      setHasShown(true);
      onDisplayShown();
    }
  }, [isActive, hasShown, onDisplayShown]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (displayMode === 'once' && hasShown) return null;
  if (!isActive) return null;

  return (
    <div style={{
      fontFamily: "'DM Mono', monospace",
      fontSize: '1.5rem',
      fontWeight: 700,
      color: timeLeft < 10 ? '#ef4444' : '#f8fafc',
      background: 'rgba(0,0,0,0.3)',
      padding: '4px 12px',
      borderRadius: '8px',
      letterSpacing: '0.05em'
    }}>
      {formatTime(timeLeft)}
    </div>
  );
};

const QuizCompositionPage = () => {
  const { examId } = useParams();
  const navigate = useNavigate();

  // États principaux
  const [exam, setExam] = useState(null);
  const [studentInfo, setStudentInfo] = useState(null);
  const [config, setConfig] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [attempts, setAttempts] = useState({});
  const [showResult, setShowResult] = useState({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [quizStarted, setQuizStarted] = useState(false);
  const [quizFinished, setQuizFinished] = useState(false);
  const [waitingForStart, setWaitingForStart] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [waitingCount, setWaitingCount] = useState(0);
  const [remainingTime, setRemainingTime] = useState(0);
  const [timerResetTrigger, setTimerResetTrigger] = useState(0);
  const [socket, setSocket] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showConfetti, setShowConfetti] = useState(false);
  const [lastSaveTime, setLastSaveTime] = useState(Date.now());
  
  // États pour les modes d'affichage du timer
  const [timerDisplayStep, setTimerDisplayStep] = useState(0);
  const [timerHasShown, setTimerHasShown] = useState(false);

  // ✅ NOUVEAUX ÉTATS POUR LES CONFIGURATIONS A à K
  const [requiredQuestions, setRequiredQuestions] = useState(0);
  const [openRangeMode, setOpenRangeMode] = useState(false);
  const [selectedQuestions, setSelectedQuestions] = useState([]);
  const [plageOuverteSeuil, setPlageOuverteSeuil] = useState(0);

  // Refs
  const socketRef = useRef(null);
  const submittingRef = useRef(false);
  const quizFinishedRef = useRef(false);
  const waitingForStartRef = useRef(false);
  const answersRef = useRef(answers);
  const attemptsRef = useRef(attempts);
  const showResultRef = useRef(showResult);
  const currentQuestionIndexRef = useRef(0);
  const configRef = useRef(config);
  const examRef = useRef(exam);
  const studentInfoRef = useRef(studentInfo);
  const terminalSessionIdRef = useRef(null);
  const stableSessionIdRef = useRef(null);
  const autoSaveIntervalRef = useRef(null);

  // Fonction pour récupérer le token JWT
  const getAuthToken = () => {
    return localStorage.getItem('userToken') || localStorage.getItem('token');
  };

  // Mise à jour des refs
  useEffect(() => { answersRef.current = answers; }, [answers]);
  useEffect(() => { attemptsRef.current = attempts; }, [attempts]);
  useEffect(() => { showResultRef.current = showResult; }, [showResult]);
  useEffect(() => { currentQuestionIndexRef.current = currentQuestionIndex; }, [currentQuestionIndex]);
  useEffect(() => { configRef.current = config; }, [config]);
  useEffect(() => { examRef.current = exam; }, [exam]);
  useEffect(() => { studentInfoRef.current = studentInfo; }, [studentInfo]);

  // Fonction pour déterminer si le timer doit être affiché
  const shouldShowTimer = useCallback(() => {
    const mode = config?.timerDisplayMode || 'permanent';
    const progress = (currentQuestionIndex + 1) / (questions.length || 1);
    
    switch(mode) {
      case 'once':
        return !timerHasShown;
      case 'twice':
        return !timerHasShown || (quizFinished && !timerHasShown);
      case 'fourTimes':
        if (!timerHasShown) return true;
        if (progress >= 0.25 && timerDisplayStep < 1) return true;
        if (progress >= 0.5 && timerDisplayStep < 2) return true;
        if (progress >= 0.75 && timerDisplayStep < 3) return true;
        return false;
      case 'permanent':
      default:
        return true;
    }
  }, [config?.timerDisplayMode, currentQuestionIndex, questions.length, quizFinished, timerHasShown, timerDisplayStep]);

  const onTimerDisplayShown = useCallback(() => {
    if (!timerHasShown) {
      setTimerHasShown(true);
    }
    const mode = config?.timerDisplayMode;
    if (mode === 'fourTimes') {
      const progress = (currentQuestionIndex + 1) / (questions.length || 1);
      if (progress >= 0.75 && timerDisplayStep < 3) setTimerDisplayStep(3);
      else if (progress >= 0.5 && timerDisplayStep < 2) setTimerDisplayStep(2);
      else if (progress >= 0.25 && timerDisplayStep < 1) setTimerDisplayStep(1);
    }
  }, [config?.timerDisplayMode, currentQuestionIndex, questions.length, timerDisplayStep, timerHasShown]);

  const shuffleArray = (array) => {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  };

  const normalizeQuestion = (q) => {
    let options = [];
    if (q.options && q.options.length > 0) {
      options = q.options;
    } else {
      ['opRep1', 'opRep2', 'opRep3', 'opRep4', 'opRep5'].forEach(k => {
        if (q[k] !== undefined && q[k] !== '') options.push(String(q[k]));
      });
    }

    let correctAnswer = null;
    let bonOpRep = q.bonOpRep;

    if (typeof bonOpRep === 'number' && options[bonOpRep]) {
      correctAnswer = options[bonOpRep];
    } else if (q.correctAnswer) {
      correctAnswer = q.correctAnswer;
      bonOpRep = options.findIndex(opt => opt === correctAnswer);
    }

    let imageUrl = q.imageQuestion || '';
    if (!imageUrl && q.imageBase64 && q.imageBase64.startsWith('data:')) {
      imageUrl = q.imageBase64;
    }

    return {
      _id: q._id || uuidv4(),
      libQuestion: q.libQuestion || q.question || q.text || '',
      question: q.libQuestion || q.question || q.text || '',
      text: q.libQuestion || q.question || q.text || '',
      options: options.filter(opt => opt !== ''),
      correctAnswer: correctAnswer,
      bonOpRep: bonOpRep >= 0 ? bonOpRep : 0,
      points: q.points || 1,
      explanation: q.explanation || '',
      typeQuestion: q.typeQuestion || 1,
      type: q.type || (q.typeQuestion === 2 ? 'multiple' : 'single'),
      tempsMinParQuestion: (q.tempsMinParQuestion || q.tempsMin || 1) * 60,
      tempsMin: q.tempsMin || 1,
      domaine: q.domaine || '',
      sousDomaine: q.sousDomaine || '',
      niveau: q.niveau || '',
      matiere: q.matiere || '',
      imageQuestion: q.imageQuestion || '',
      imageBase64: q.imageBase64 || '',
      imageMetadata: q.imageMetadata || {},
      imageUrl: imageUrl
    };
  };

  const getImageUrl = (question) => {
    if (!question) return null;
    let imagePath = question.imageQuestion || question.imageBase64 || null;
    if (!imagePath) return null;
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) return imagePath;
    if (imagePath.startsWith('data:')) return imagePath;
    if (imagePath.startsWith('/uploads/')) return `${NODE_BACKEND_URL}${imagePath}`;
    if (imagePath.includes('qcm-')) return `${NODE_BACKEND_URL}/uploads/questions/${imagePath}`;
    return imagePath;
  };

  const getDisplayPoints = useCallback((question) => {
    if (config?.pointsType === 'uniform') {
      return config?.globalPoints || 1;
    }
    return question.points || 1;
  }, [config?.pointsType, config?.globalPoints]);

  // ✅ Fonction pour gérer la plage ouverte (sélection des questions)
  const handleSelectQuestionForOpenRange = useCallback((questionIndex) => {
    if (quizFinished || submittingRef.current) return;
    
    setSelectedQuestions(prev => {
      if (prev.includes(questionIndex)) {
        return prev.filter(i => i !== questionIndex);
      } else {
        if (prev.length < requiredQuestions) {
          return [...prev, questionIndex];
        }
        toast.warning(`Vous devez répondre à ${requiredQuestions} questions maximum`);
        return prev;
      }
    });
  }, [quizFinished, requiredQuestions]);

  // ═══════════════════════════════════════════════════════════════
  // SAUVEGARDE AUTOMATIQUE
  // ═══════════════════════════════════════════════════════════════

  useEffect(() => {
    const savedAnswers = localStorage.getItem(`exam_${examId}_answers`);
    const savedIndex = localStorage.getItem(`exam_${examId}_index`);
    const savedAttempts = localStorage.getItem(`exam_${examId}_attempts`);
    const savedShowResult = localStorage.getItem(`exam_${examId}_showResult`);

    if (savedAnswers && !quizFinishedRef.current) {
      try {
        const parsedAnswers = JSON.parse(savedAnswers);
        setAnswers(parsedAnswers);
        answersRef.current = parsedAnswers;

        if (savedIndex) {
          const idx = parseInt(savedIndex);
          setCurrentQuestionIndex(idx);
          currentQuestionIndexRef.current = idx;
        }

        if (savedAttempts) {
          setAttempts(JSON.parse(savedAttempts));
          attemptsRef.current = JSON.parse(savedAttempts);
        }

        if (savedShowResult) {
          setShowResult(JSON.parse(savedShowResult));
          showResultRef.current = JSON.parse(savedShowResult);
        }

        toast.success("Progression chargée automatiquement", { duration: 3000 });
      } catch (e) {
        console.error('Erreur chargement sauvegarde:', e);
      }
    }
  }, [examId]);

  useEffect(() => {
    if (quizFinishedRef.current || waitingForStartRef.current) return;

    autoSaveIntervalRef.current = setInterval(() => {
      if (Object.keys(answersRef.current).length > 0 || currentQuestionIndexRef.current > 0) {
        localStorage.setItem(`exam_${examId}_answers`, JSON.stringify(answersRef.current));
        localStorage.setItem(`exam_${examId}_index`, currentQuestionIndexRef.current);
        localStorage.setItem(`exam_${examId}_attempts`, JSON.stringify(attemptsRef.current));
        localStorage.setItem(`exam_${examId}_showResult`, JSON.stringify(showResultRef.current));
        localStorage.setItem(`exam_${examId}_lastSave`, Date.now());
        setLastSaveTime(Date.now());
      }
    }, 30000);

    return () => {
      if (autoSaveIntervalRef.current) clearInterval(autoSaveIntervalRef.current);
    };
  }, [examId, quizFinished, waitingForStart]);

  useEffect(() => {
    if (quizFinishedRef.current || waitingForStartRef.current) return;
    localStorage.setItem(`exam_${examId}_answers`, JSON.stringify(answersRef.current));
    localStorage.setItem(`exam_${examId}_index`, currentQuestionIndexRef.current);
    localStorage.setItem(`exam_${examId}_attempts`, JSON.stringify(attemptsRef.current));
    localStorage.setItem(`exam_${examId}_showResult`, JSON.stringify(showResultRef.current));
  }, [answers, currentQuestionIndex, attempts, showResult, examId, quizFinished, waitingForStart]);

  const clearAutoSave = useCallback(() => {
    localStorage.removeItem(`exam_${examId}_answers`);
    localStorage.removeItem(`exam_${examId}_index`);
    localStorage.removeItem(`exam_${examId}_attempts`);
    localStorage.removeItem(`exam_${examId}_showResult`);
    localStorage.removeItem(`exam_${examId}_lastSave`);
    localStorage.removeItem(`exam_${examId}_lastToast`);
  }, [examId]);

  const cleanupBeforeRedirect = useCallback(() => {
    if (autoSaveIntervalRef.current) clearInterval(autoSaveIntervalRef.current);
    if (socketRef.current) {
      socketRef.current.removeAllListeners();
      socketRef.current.disconnect();
      socketRef.current = null;
    }
  }, []);

  const sendProgressUpdate = useCallback((index) => {
    if (!examRef.current || quizFinishedRef.current || waitingForStartRef.current || !socketRef.current?.connected) return;
    const total = examRef.current.questions.length;
    const progress = Math.round(((index + 1) / total) * 100);
    const answeredCount = Object.keys(answersRef.current).length;
    const percentage = total > 0 ? Math.round((answeredCount / total) * 100) : 0;
    
    socketRef.current.emit('updateStudentProgress', {
      examId: examRef.current._id,
      progress,
      currentQuestion: index + 1,
      totalQuestions: total,
      score: answeredCount,
      percentage: percentage
    });
  }, []);

  // Anti-triche
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && !quizFinished && !submittingRef.current && !waitingForStartRef.current) {
        if (socketRef.current?.connected) {
          socketRef.current.emit('studentWindowChanged', {
            examId: examRef.current?._id,
            studentId: socketRef.current.id,
            studentName: `${studentInfo?.firstName} ${studentInfo?.lastName}`,
            studentMatricule: studentInfo?.matricule,
            timestamp: new Date().toISOString()
          });
        }
        
        toast.error("⚠️ Changement de fenêtre détecté ! Restez sur l'examen.", {
          duration: 5000,
          icon: '🔴',
          style: { background: '#ef4444', color: '#fff' }
        });
        
        console.warn('[Security] Changement de fenêtre détecté');
      }
    };
    
    const blockShortcuts = (e) => {
      if (e.key === 'PrintScreen') {
        e.preventDefault();
        toast.error("Capture d'écran désactivée pendant l'examen", { duration: 2000 });
        return false;
      }
      
      if (e.key === 'F12' || 
          (e.ctrlKey && e.shiftKey && e.key === 'I') ||
          (e.ctrlKey && e.shiftKey && e.key === 'C') ||
          (e.ctrlKey && e.key === 'U') ||
          (e.ctrlKey && e.key === 'S') ||
          (e.ctrlKey && e.key === 'P')) {
        e.preventDefault();
        toast.error("Action non autorisée pendant l'examen", { duration: 2000 });
        return false;
      }
      
      if ((e.ctrlKey && (e.key === 'c' || e.key === 'v' || e.key === 'x')) ||
          (e.metaKey && (e.key === 'c' || e.key === 'v' || e.key === 'x'))) {
        e.preventDefault();
        toast.error("Copier/Coller désactivé pendant l'examen", { duration: 1500 });
        return false;
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('keydown', blockShortcuts);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('keydown', blockShortcuts);
    };
  }, [quizFinished, studentInfo]);

  // ═══════════════════════════════════════════════════════════════
  // SOUMISSION
  // ═══════════════════════════════════════════════════════════════
  const handleSubmitExam = useCallback(async (isManual = false) => {
    if (quizFinishedRef.current || submittingRef.current) return;

    if (!examRef.current || !examRef.current._id) {
      console.error('[QuizCompositionPage] ❌ examRef.current est undefined');
      toast.error("Erreur: impossible de soumettre l'examen.");
      submittingRef.current = false;
      quizFinishedRef.current = false;
      setQuizFinished(false);
      setIsSubmitting(false);
      return;
    }

    submittingRef.current = true;
    quizFinishedRef.current = true;
    setQuizFinished(true);
    setIsSubmitting(true);

    clearAutoSave();

    if (socketRef.current?.connected) {
      try {
        socketRef.current.emit('examSubmitting', { 
          studentSocketId: socketRef.current.id, 
          examId: examRef.current._id 
        });
      } catch (e) {
        console.error("Erreur d'émission socket:", e);
      }
    }

    try {
      const token = getAuthToken();
      const axiosConfig = token ? {
        headers: { Authorization: `Bearer ${token}` }
      } : {};

      const studentData = {
        firstName: studentInfoRef.current?.firstName || studentInfoRef.current?.name?.split(' ')[0] || '',
        lastName: studentInfoRef.current?.lastName || studentInfoRef.current?.name?.split(' ')[1] || '',
        matricule: studentInfoRef.current?.matricule || '',
        level: studentInfoRef.current?.level || ''
      };

      const currentQuestionsList = examRef.current.questions || [];
      const formattedAnswers = {};

      // ✅ Pour la plage ouverte, ne soumettre que les questions sélectionnées
      let questionsToSubmit = currentQuestionsList;
      let answersToSubmit = {};

      if (configRef.current?.openRange && selectedQuestions.length > 0) {
        questionsToSubmit = selectedQuestions.map(idx => currentQuestionsList[idx]);
        selectedQuestions.forEach(idx => {
          answersToSubmit[idx] = answersRef.current[idx] || null;
        });
      } else {
        answersToSubmit = answersRef.current;
      }

      currentQuestionsList.forEach((question, idx) => {
        let answer = answersRef.current[idx];
        if (answer === undefined) answer = answersRef.current[question._id];
        if (answer && typeof answer === 'object') answer = answer.value || answer.text || null;
        formattedAnswers[idx] = answer || null;
      });

      console.log('[QuizCompositionPage] 📤 Soumission:', {
        examId: examRef.current._id,
        answersCount: Object.keys(formattedAnswers).filter(k => formattedAnswers[k] !== null).length,
        totalQuestions: currentQuestionsList.length,
        openRange: configRef.current?.openRange,
        selectedQuestions
      });

      const res = await axios.post(`${NODE_BACKEND_URL}/api/results`, {
        examId: examRef.current._id,
        studentInfo: studentData,
        answers: formattedAnswers,
        config: {
          openRange: configRef.current?.openRange || false,
          requiredQuestions: configRef.current?.requiredQuestions || 0,
          selectedQuestions: configRef.current?.openRange ? selectedQuestions : undefined
        }
      }, {
        timeout: 10000,
        ...axiosConfig
      });

      const result = res.data?.data || res.data?.result;
      const correctionDetails = res.data?.details || null;

      if (!result) {
        console.error("Réponse de soumission invalide:", res.data);
        toast.error("Échec de la soumission: Réponse serveur inattendue.");
        submittingRef.current = false;
        quizFinishedRef.current = false;
        setQuizFinished(false);
        setIsSubmitting(false);
        return;
      }

      setShowConfetti(true);
      toast.success(isManual ? "Examen soumis avec succès!" : "Temps écoulé! Examen soumis automatiquement...");

      if (socketRef.current?.connected) {
        try {
          socketRef.current.emit('examSubmitted', { 
            studentSocketId: socketRef.current.id, 
            examResultId: result._id 
          });
          socketRef.current.disconnect();
        } catch (e) {
          console.error("Erreur d'émission socket:", e);
        }
      }

      setTimeout(() => {
        const opt = configRef.current?.examOption;
        // ── C, F, K : pas d'affichage de résultat → page "épreuve terminée" simple ──
        const noResultOptions = ['C', 'F', 'K'];
        if (noResultOptions.includes(opt)) {
          navigate(`/exam/completed/${examRef.current._id}`, {
            state: {
              studentInfo: studentData,
              examTitle: examRef.current.title,
              examOption: opt,
              terminalSessionId: terminalSessionIdRef.current
            },
            replace: true
          });
          return;
        }
        navigate(`/results/${examRef.current._id}`, {
          state: {
            resultId: result._id,
            submittedAnswers: formattedAnswers,
            studentInfo: studentData,
            submittedScore: result.score,
            submittedPercentage: result.percentage,
            examTitle: examRef.current.title,
            passingScore: examRef.current.passingScore,
            examQuestions: examRef.current.questions,
            questionDetails: correctionDetails || null,
            resultSnapshot: {
              examTitle: result.examTitle || examRef.current.title,
              examLevel: result.examLevel || examRef.current.level,
              domain: result.domain || examRef.current.domain,
              subject: result.subject || examRef.current.subject,
              category: result.category || examRef.current.category,
              duration: result.duration || examRef.current.duration,
              passingScore: result.passingScore || examRef.current.passingScore,
              examOption: result.examOption || opt,
              examQuestions: result.examQuestions || [],
              // ✅ Config complète transmise pour que ResultsPage respecte les règles
              config: configRef.current || null,
            },
            terminalSessionId: terminalSessionIdRef.current
          },
          replace: true
        });
      }, 1500);

    } catch (error) {
      console.error("Erreur soumission:", error);
      submittingRef.current = false;
      quizFinishedRef.current = false;
      setQuizFinished(false);
      setIsSubmitting(false);
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        toast.error("Session expirée. Veuillez vous reconnecter.");
        localStorage.removeItem('userToken');
        localStorage.removeItem('token');
        setTimeout(() => navigate('/login'), 2000);
      } else {
        toast.error(error.response?.data?.message || "Échec de la soumission. Veuillez réessayer.");
      }
    }
  }, [navigate, clearAutoSave, selectedQuestions]);

  const handleTimeEnd = useCallback(() => {
    if (quizFinishedRef.current || submittingRef.current) return;
    const opt = configRef.current?.examOption;
    const idx = currentQuestionIndexRef.current;
    const total = examRef.current?.questions?.length;

    if (!examRef.current || !total) {
      console.error("Exam data or total questions missing in handleTimeEnd.");
      return;
    }

    // ── A & D : séquentiel figé par question — avancer ou soumettre ──
    if (opt === 'A' || opt === 'D') {
      if (idx < total - 1) {
        const nextIndex = idx + 1;
        currentQuestionIndexRef.current = nextIndex;
        setCurrentQuestionIndex(nextIndex);
        const timeForNextQuestion = examRef.current.questions[nextIndex]?.tempsMinParQuestion || (configRef.current?.timePerQuestion || 60) * 60;
        setRemainingTime(timeForNextQuestion);
        setTimerResetTrigger(prev => prev + 1);
        setTimeout(() => sendProgressUpdate(nextIndex), 100);
        toast(opt === 'D' ? "Temps écoulé! Question suivante (Aléatoire)." : "Temps écoulé! Passage à la question suivante.", {
          style: { background: '#f59e0b', color: '#fff' }, icon: '⏳',
        });
      } else {
        handleSubmitExam(false);
      }
    } else {
      // ── B, C, E, F : plage fermée timer global — soumettre automatiquement ──
      // ── G, H, I, J, K : plage ouverte — soumettre automatiquement si timer défini ──
      toast("Temps global écoulé ! Soumission automatique…", {
        style: { background: '#ef4444', color: '#fff' }, icon: '⏱️', duration: 3000
      });
      handleSubmitExam(false);
    }
  }, [handleSubmitExam, sendProgressUpdate]);

  const handlePrevQuestion = useCallback(() => {
    const idx = currentQuestionIndexRef.current;
    if (examRef.current && idx > 0) {
      localStorage.setItem(`exam_${examId}_answers`, JSON.stringify(answersRef.current));
      localStorage.setItem(`exam_${examId}_index`, idx - 1);
      
      const prevIndex = idx - 1;
      currentQuestionIndexRef.current = prevIndex;
      setCurrentQuestionIndex(prevIndex);
      const timeForPrevQuestion = examRef.current.questions[prevIndex]?.tempsMinParQuestion || (configRef.current?.timePerQuestion || 60) * 60;
      setRemainingTime(timeForPrevQuestion);
      setTimerResetTrigger(prev => prev + 1);
      setTimeout(() => sendProgressUpdate(prevIndex), 50);
    }
  }, [examId, sendProgressUpdate]);

  const handleNextQuestion = useCallback(() => {
    const idx = currentQuestionIndexRef.current;
    if (examRef.current && idx < examRef.current.questions.length - 1) {
      localStorage.setItem(`exam_${examId}_answers`, JSON.stringify(answersRef.current));
      localStorage.setItem(`exam_${examId}_index`, idx + 1);
      
      const nextIndex = idx + 1;
      currentQuestionIndexRef.current = nextIndex;
      setCurrentQuestionIndex(nextIndex);
      const timeForNextQuestion = examRef.current.questions[nextIndex]?.tempsMinParQuestion || (configRef.current?.timePerQuestion || 60) * 60;
      setRemainingTime(timeForNextQuestion);
      setTimerResetTrigger(prev => prev + 1);
      setTimeout(() => sendProgressUpdate(nextIndex), 50);
    }
  }, [examId, sendProgressUpdate]);

  const handleManualSubmit = useCallback(() => {
    if (quizFinishedRef.current || submittingRef.current) return;
    // ── C, F, K : confirmer avant soumission (pas de résultat affiché après) ──
    const noResultOptions = ['C', 'F', 'K'];
    if (noResultOptions.includes(configRef.current?.examOption)) {
      setShowSubmitConfirm(true);
      return;
    }
    handleSubmitExam(true);
  }, [handleSubmitExam]);

  // ✅ Feedback selon la configuration (A à K)
  const handleOptionChange = useCallback((questionId, selectedOption, questionIndex) => {
    if (quizFinishedRef.current || submittingRef.current) return;

    const currentQ = examRef.current?.questions?.find(q => q._id === questionId);
    if (!currentQ) return;

    const currentAttempts = attemptsRef.current[questionId] || 0;

    // ── Vérifier la limite de tentatives si reprise autorisée (G, I) ──
    // allowRetry=true signifie UNE reprise autorisée → bloquer après la 2e tentative
    if (configRef.current?.allowRetry && currentAttempts >= 2) {
      toast.error("Vous avez déjà utilisé votre seconde chance sur cette question.");
      return;
    }
    // Sans reprise : bloquer si déjà répondu (1 tentative max)
    if (!configRef.current?.allowRetry && currentAttempts >= 1) {
      return;
    }

    // Vérifier si la réponse est correcte
    let isCorrect = false;
    if (typeof currentQ.bonOpRep === 'number') {
      const selectedIndex = currentQ.options.findIndex(opt => opt === selectedOption);
      isCorrect = selectedIndex === currentQ.bonOpRep;
    } else {
      isCorrect = selectedOption === currentQ.correctAnswer;
    }

    // Stocker la réponse
    const newAnswers = {
      ...answersRef.current,
      [questionIndex]: selectedOption,
      [questionId]: selectedOption
    };
    
    answersRef.current = newAnswers;
    setAnswers(newAnswers);

    // Mettre à jour les tentatives
    const newAttempts = { ...attemptsRef.current, [questionId]: (currentAttempts + 1) };
    attemptsRef.current = newAttempts;
    setAttempts(newAttempts);

    // ═══════════════════════════════════════════════════════════════
    // FEEDBACK SELON LA CONFIGURATION
    // ═══════════════════════════════════════════════════════════════
    
    if (configRef.current?.showBinaryResult) {
      toast[isCorrect ? 'success' : 'error'](
        isCorrect ? '✓ Bonne réponse!' : '✗ Mauvaise réponse', 
        { duration: 2000 }
      );
      setShowResult(prev => ({ ...prev, [questionId]: isCorrect }));
      
      if (configRef.current?.showCorrectAnswer && !isCorrect) {
        const correctAnswerText = currentQ.options?.[currentQ.bonOpRep] || currentQ.correctAnswer;
        toast.success(`💡 Bonne réponse : ${correctAnswerText}`, { duration: 3000 });
      }
    } else {
      setShowResult(prev => ({ ...prev, [questionId]: null }));
    }

    // ═══════════════════════════════════════════════════════════════
    // AVANCEMENT AUTOMATIQUE — A et D uniquement (séquentiel figé piloté par réponse)
    // B, E : l'étudiant navigue manuellement (feedback binaire mais pas d'auto-avance)
    // G–K  : plage ouverte, pas d'ordre forcé
    // ═══════════════════════════════════════════════════════════════
    const shouldAutoAdvance = configRef.current?.examOption === 'A' || configRef.current?.examOption === 'D';
    
    // Ne pas avancer si la réponse est incorrecte ET qu'il reste une reprise (1ère tentative avec allowRetry)
    const hasRetryLeft = configRef.current?.allowRetry && newAttempts[questionId] === 1 && !isCorrect;
    if (hasRetryLeft) {
      toast.info('💡 Vous pouvez réessayer cette question une fois.', { duration: 3000 });
      return;
    }

    if (shouldAutoAdvance) {
      const currentIdx = currentQuestionIndexRef.current;
      const totalQuestions = examRef.current?.questions?.length || 0;
      const isLastQuestion = currentIdx >= totalQuestions - 1;
      
      if (!isLastQuestion) {
        const nextIndex = currentIdx + 1;
        currentQuestionIndexRef.current = nextIndex;
        setCurrentQuestionIndex(nextIndex);
        
        const timeForNextQuestion = examRef.current?.questions[nextIndex]?.tempsMinParQuestion 
          || (configRef.current?.timePerQuestion || 60) * 60;
        setRemainingTime(timeForNextQuestion);
        setTimerResetTrigger(prev => prev + 1);
        
        setTimeout(() => sendProgressUpdate(nextIndex), 500);
        
        if (configRef.current?.examOption === 'D') {
          toast.info(`Question suivante (${nextIndex + 1}/${totalQuestions})`, { 
            duration: 1500,
            icon: '⏩'
          });
        }
      } else {
        handleSubmitExam(false);
      }
    }
  }, [handleSubmitExam, sendProgressUpdate]);

  // Chargement de l'examen
  useEffect(() => {
    const storedInfo = localStorage.getItem('studentInfoForExam');
    if (!storedInfo) {
      navigate(`/exam/profile/${examId}`, { replace: true });
      return;
    }
    const parsed = JSON.parse(storedInfo);
    if (parsed.examId !== examId) {
      navigate(`/exam/profile/${examId}`, { replace: true });
      return;
    }
    setStudentInfo(parsed.info);
    setConfig(parsed.config);
    configRef.current = parsed.config;
    terminalSessionIdRef.current = parsed.terminalSessionId || null;
    
    // ✅ Récupérer les paramètres de plage ouverte
    if (parsed.config?.openRange) {
      setOpenRangeMode(true);
      setRequiredQuestions(parsed.config.requiredQuestions || 0);
      setPlageOuverteSeuil(parsed.config.requiredQuestions || 0);
    }

    const fetchExam = async () => {
      try {
        const token = getAuthToken();
        const axiosConfig = token ? {
          headers: { Authorization: `Bearer ${token}` }
        } : {};

        const res = await axios.get(`${NODE_BACKEND_URL}/api/exams/${examId}`, {
          timeout: 10000,
          ...axiosConfig
        });

        let examData = res.data;
        if (examData?.data?.questions) examData = examData.data;
        else if (examData?.exam?.questions) examData = examData.exam;
        else if (examData?.success && examData?.data?.questions) examData = examData.data;

        if (!examData || !examData.questions || !Array.isArray(examData.questions) || examData.questions.length === 0) {
          throw new Error("Données d'examen invalides");
        }

        console.log('[QuizCompositionPage] ✅ Examen chargé:', examData.title);
        console.log('[QuizCompositionPage] 📊 Questions brutes:', examData.questions.length);

        let fetchedQuestions = examData.questions.map((q, idx) => normalizeQuestion({ ...q, _id: q._id || `q_${idx}` }));

        const safeConfig = parsed.config || {};

        // ✅ Gestion de la plage ouverte
        if (safeConfig.openRange && safeConfig.requiredQuestions > 0 && safeConfig.requiredQuestions < fetchedQuestions.length) {
          const shuffled = shuffleArray([...fetchedQuestions]);
          fetchedQuestions = shuffled.slice(0, safeConfig.requiredQuestions);
          toast.info(`Mode plage ouverte: ${safeConfig.requiredQuestions} questions à traiter sur ${examData.questions.length}`, {
            duration: 4000,
            icon: '📖'
          });
        }

        if (safeConfig.sequencing === 'randomPerStudent') {
          fetchedQuestions = shuffleArray(fetchedQuestions);
          toast.info("L'ordre des questions est aléatoire", { duration: 2000, icon: '🎲' });
        }

        if (parsed.examOption === 'D' && safeConfig.sequencing !== 'randomPerStudent') {
          fetchedQuestions = shuffleArray(fetchedQuestions);
        }

        setQuestions(fetchedQuestions);
        setExam({ ...examData, questions: fetchedQuestions });
        examRef.current = { ...examData, questions: fetchedQuestions };

        if (safeConfig.timerPerQuestion && fetchedQuestions.length > 0) {
          const firstQuestionTime = fetchedQuestions[0]?.tempsMinParQuestion || (safeConfig.timePerQuestion || 60) * 60;
          setRemainingTime(firstQuestionTime);
        } else {
          setRemainingTime((safeConfig.totalTime || 60) * 60);
        }

        setQuizStarted(true);

        const opt = parsed.examOption;
        if (opt === 'A' || opt === 'B') {
          setWaitingForStart(true);
          waitingForStartRef.current = true;
        } else {
          setWaitingForStart(false);
          waitingForStartRef.current = false;
        }

      } catch (error) {
        console.error("Erreur chargement examen:", error);
        if (axios.isAxiosError(error) && error.response?.status === 401) {
          toast.error("Session expirée. Veuillez vous reconnecter.");
          localStorage.removeItem('userToken');
          localStorage.removeItem('token');
          setTimeout(() => navigate('/login'), 2000);
        } else {
          toast.error("Échec du chargement de l'examen.");
          navigate('/', { replace: true });
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchExam();

    // Connexion socket
    const newSocket = io(SOCKET_URL, {
      reconnection: true,
      reconnectionAttempts: 20,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      transports: ['polling'],
      upgrade: false,
      forceNew: true,
      timeout: 20000
    });

    setSocket(newSocket);
    socketRef.current = newSocket;

    const stableKey = `studentSessionId_${examId}`;
    let stableId = sessionStorage.getItem(stableKey);
    if (!stableId) {
      stableId = `STU_${examId.slice(-8)}_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
      sessionStorage.setItem(stableKey, stableId);
    }
    stableSessionIdRef.current = stableId;

    newSocket.on('connect', () => {
      console.log('[QuizCompositionPage] ✅ Socket connecté, ID:', newSocket.id);

      newSocket.emit('registerSession', {
        type: 'student',
        sessionId: stableSessionIdRef.current,
        examId: examId
      });

      const currentStatus = configRef.current?.examOption === 'B' || configRef.current?.examOption === 'A' ? 'waiting' : 'composing';

      newSocket.emit('studentReadyForExam', {
        examId,
        studentInfo: parsed.info,
        sessionId: stableSessionIdRef.current,
        status: currentStatus,
        terminalSessionId: terminalSessionIdRef.current,
        examOption: parsed.examOption
      });
    });

    newSocket.on('connect_error', (error) => {
      console.error('[QuizCompositionPage] ❌ Erreur Socket:', error.message);
      toast.error("Problème de connexion. Reconnexion en cours...");
    });

    newSocket.on('examStarted', (data) => {
      if (data.examId !== examId) return;
      waitingForStartRef.current = false;
      setWaitingForStart(false);
      
      if (data.examOption) {
        const updatedConfig = { ...configRef.current, examOption: data.examOption };
        setConfig(updatedConfig);
        configRef.current = updatedConfig;
      }
      
      const qIdx = data.questionIndex || 0;
      currentQuestionIndexRef.current = qIdx;
      setCurrentQuestionIndex(qIdx);
      setTimerResetTrigger(prev => prev + 1);
      toast.success("L'examen commence maintenant!", { icon: '🚀', duration: 3000 });
      setTimeout(() => sendProgressUpdate(qIdx), 500);
    });

    newSocket.on('displayQuestion', (data) => {
      if (data.examId !== examId) return;
      const idx = data.questionIndex ?? 0;
      if (examRef.current && idx >= examRef.current.questions.length) {
        if (!quizFinishedRef.current && !submittingRef.current) handleSubmitExam(false);
        return;
      }
      
      currentQuestionIndexRef.current = idx;
      setCurrentQuestionIndex(idx);
      setTimerResetTrigger(prev => prev + 1);
      
      const timeForQuestion = examRef.current.questions[idx]?.tempsMinParQuestion 
        || (configRef.current?.timePerQuestion || 60) * 60;
      setRemainingTime(timeForQuestion);
      
      toast(`Question ${idx + 1}`, { icon: '📋', duration: 2000 });
      setTimeout(() => sendProgressUpdate(idx), 500);
    });

    newSocket.on('examFinished', (data) => {
      if (data.examId === examId && !quizFinishedRef.current && !submittingRef.current) {
        handleSubmitExam(false);
      }
    });

    newSocket.on('waitingCountUpdate', (data) => {
      if (data.examId === examId) setWaitingCount(data.count);
    });

    return () => {
      if (newSocket) {
        newSocket.removeAllListeners();
        newSocket.disconnect();
      }
      cleanupBeforeRedirect();
    };
  }, [examId, navigate, handleSubmitExam, sendProgressUpdate, cleanupBeforeRedirect]);

  // Gestion du timer
  useEffect(() => {
    if (!quizStarted || quizFinished || waitingForStart) return;
    let interval = null;
    if (remainingTime > 0) {
      interval = setInterval(() => {
        setRemainingTime(prev => {
          if (prev <= 1) {
            clearInterval(interval);
            handleTimeEnd();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (remainingTime === 0 && !quizFinished) {
      handleTimeEnd();
    }
    return () => clearInterval(interval);
  }, [quizStarted, quizFinished, waitingForStart, remainingTime, handleTimeEnd]);

  // Réinitialisation du timerHasShown
  useEffect(() => {
    setTimerHasShown(false);
    setTimerDisplayStep(0);
  }, [currentQuestionIndex]);

  // Affichage conditionnel
  if (isLoading || !exam || !studentInfo) {
    return (
      <div style={{ minHeight: '100vh', background: '#05071a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Loader size={48} style={{ color: '#3b82f6', animation: 'spin 1s linear infinite' }} />
        <Toaster />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (waitingForStart && (config?.examOption === 'A' || config?.examOption === 'B')) {
    return (
      <div style={styles.waitingContainer}>
        <div style={styles.waitingCard}>
          <div style={styles.waitingIcon}><Clock size={36} color="#3b82f6" /></div>
          <h2>{config?.examOption === 'A' ? 'Salle d\'attente' : 'En attente de démarrage'}</h2>
          <p>{config?.examOption === 'A' ? 'Le superviseur démarrera l\'épreuve pour tous les participants simultanément.' : 'Le superviseur démarrera l\'épreuve pour tous les postes simultanément.'}</p>
          {config?.examOption === 'B' && (
            <div style={styles.waitingCount}>
              <Users size={20} />
              <span>{waitingCount} participant{waitingCount > 1 ? 's' : ''} en attente</span>
              <button onClick={() => {
                if (socketRef.current?.connected) {
                  socketRef.current.emit('getWaitingStudents', { examId }, (resp) => setWaitingCount(resp.count));
                } else {
                  toast.error("Non connecté au serveur. Veuillez patienter pour la reconnexion.");
                }
              }}><RefreshCw size={12} /> Rafraîchir</button>
            </div>
          )}
          <div style={styles.connectedBadge}>
            <div style={styles.pulseDot} />
            <span>{studentInfo.firstName} {studentInfo.lastName} · Connecté</span>
          </div>
          <p style={styles.waitingNote}>Ne quittez pas cette page · Option {config?.examOption} — {config?.examOption === 'A' ? 'Collective Figée' : 'Collective Souple'}</p>
        </div>
        <Toaster />
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const answeredCount = Object.keys(answers).length;
  const progressPercentage = (answeredCount / questions.length) * 100;
  const displayPoints = getDisplayPoints(currentQuestion);
  
  const isOptionA = config?.examOption === 'A';
  const isOptionB = config?.examOption === 'B';
  const isOptionD = config?.examOption === 'D';
  
  const disablePrev = quizFinished || currentQuestionIndex === 0 || isOptionA || isOptionD;
  const hasCurrentAnswer = answers[currentQuestion?._id] || answers[currentQuestionIndex];
  const optionBNextDisabled = isOptionB && (!hasCurrentAnswer || currentQuestionIndex === questions.length - 1);
  const disableNext = quizFinished || currentQuestionIndex === questions.length - 1 || isOptionA || isOptionD || optionBNextDisabled;

  if (!currentQuestion) {
    return (
      <div style={{ minHeight: '100vh', background: '#05071a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Loader size={48} style={{ color: '#3b82f6', animation: 'spin 1s linear infinite' }} />
        <p style={{ color: '#f8fafc', marginLeft: '16px' }}>Chargement des questions...</p>
        <Toaster />
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.bgGrid} />
      <div style={styles.bgGlow} />
      {showConfetti && <Confetti recycle={false} numberOfPieces={200} gravity={0.1} />}
      <main style={styles.main}>
        <div style={styles.quizCard}>
          <div style={styles.header}>
            <div>
              <div style={styles.titleRow}>
                <h1>{exam.title}</h1>
                <span style={styles.optionBadge(config?.examOption)}>
                  {config?.examOption === 'A' ? 'COLLECTIVE FIGÉE' :
                   config?.examOption === 'B' ? 'COLLECTIVE SOUPLE' :
                   config?.examOption === 'C' ? 'PERSONNALISÉE' : 
                   config?.examOption === 'D' ? 'ALÉATOIRE' :
                   config?.examOption === 'E' ? 'ALÉATOIRE+' :
                   config?.examOption === 'F' ? 'ALÉATOIRE LIBRE' :
                   config?.examOption === 'G' ? 'PLAGE OUVERTE + REPRISE' :
                   config?.examOption === 'H' ? 'PLAGE OUVERTE' :
                   config?.examOption === 'I' ? 'PLAGE OUVERTE+' :
                   config?.examOption === 'J' ? 'PLAGE OUVERTE++' :
                   config?.examOption === 'K' ? 'PLAGE OUVERTE LIBRE' : 'CONFIGURATION'}
                </span>
              </div>
              <p style={styles.studentInfo}>{studentInfo.firstName} {studentInfo.lastName} · {studentInfo.matricule}</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              {!quizFinished && !waitingForStart && Object.keys(answers).length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.65rem', color: '#10b981', marginBottom: '4px', justifyContent: 'flex-end' }}>
                  <SaveIcon size={10} />
                  <span>Sauvegarde auto</span>
                </div>
              )}
              {quizStarted && !quizFinished && config?.examOption !== 'B' && shouldShowTimer() && (
                <Timer
                  initialTime={remainingTime}
                  onTimeEnd={handleTimeEnd}
                  isActive={!quizFinished && remainingTime > 0}
                  resetTrigger={timerResetTrigger}
                  timerConfig={config?.timerConfig || 'permanent'}
                  displayMode={config?.timerDisplayMode || 'permanent'}
                  onDisplayShown={onTimerDisplayShown}
                />
              )}
              {config?.examOption === 'C' && quizStarted && !quizFinished && (
                <span style={styles.globalTimerHint}>TEMPS GLOBAL ({questions.length} × {config?.timePerQuestion || 60}s)</span>
              )}
            </div>
          </div>

          {/* Indicateur pour Option A */}
          {isOptionA && !quizFinished && (
            <div style={styles.currentQuestionIndicator}>
              <span>Question {currentQuestionIndex + 1} / {questions.length}</span>
              <span style={{ color: '#ef4444' }}>(Navigation contrôlée par le superviseur)</span>
            </div>
          )}

          {/* Indicateur pour Plage ouverte */}
          {openRangeMode && plageOuverteSeuil > 0 && (
            <div style={{ ...styles.currentQuestionIndicator, background: 'rgba(16,185,129,0.1)', border: '1px solid #10b98133', marginBottom: 16 }}>
              <span>📖 Plage ouverte: {selectedQuestions.length} / {plageOuverteSeuil} questions sélectionnées</span>
              <span style={{ color: '#10b981', fontSize: '0.7rem', marginLeft: 12 }}>
                (Vous devez traiter exactement {plageOuverteSeuil} questions)
              </span>
            </div>
          )}

          <div style={styles.progressArea}>
            <div style={styles.progressLabels}>
              <span>Progression</span>
              <span>{answeredCount}/{questions.length} questions · {Math.round(progressPercentage)}%</span>
            </div>
            <div style={styles.progressBar}>
              <div style={{ ...styles.progressFill, width: `${progressPercentage}%` }} />
            </div>
          </div>

          {/* Navigation grille pour Option C et configurations à navigation libre */}
          {(config?.examOption === 'C' || config?.examOption === 'F' || config?.examOption === 'K') && (
            <div style={styles.navGrid}>
              <h3>Navigation des questions</h3>
              <div style={styles.questionButtons}>
                {questions.map((q, idx) => (
                  <button
                    key={q._id}
                    onClick={() => {
                      currentQuestionIndexRef.current = idx;
                      setCurrentQuestionIndex(idx);
                      const timeForQuestion = examRef.current.questions[idx]?.tempsMinParQuestion || (configRef.current?.timePerQuestion || 60) * 60;
                      setRemainingTime(timeForQuestion);
                      setTimerResetTrigger(prev => prev + 1);
                      sendProgressUpdate(idx);
                    }}
                    disabled={quizFinished}
                    style={{
                      ...styles.questionButton(idx === currentQuestionIndex, answers[q._id] || answers[idx]),
                      background: openRangeMode && selectedQuestions.includes(idx) ? 'rgba(16,185,129,0.3)' : styles.questionButton(idx === currentQuestionIndex, answers[q._id] || answers[idx]).background,
                      border: openRangeMode && selectedQuestions.includes(idx) ? '1px solid #10b981' : styles.questionButton(idx === currentQuestionIndex, answers[q._id] || answers[idx]).border
                    }}
                  >
                    {idx + 1}
                    {openRangeMode && selectedQuestions.includes(idx) && <span style={{ fontSize: '0.6rem', marginLeft: 2 }}>✓</span>}
                  </button>
                ))}
              </div>
            </div>
          )}

          <AnimatePresence mode="wait">
            <motion.div key={currentQuestionIndex} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }}>
              <div style={styles.questionCard}>
                <div style={styles.questionHeader}>
                  <span style={styles.questionNumber}>Question {currentQuestionIndex + 1}</span>
                  <span style={styles.pointsBadge}>
                    ⭐ {displayPoints} pt{displayPoints > 1 ? 's' : ''}
                  </span>
                  {(answers[currentQuestion._id] || answers[currentQuestionIndex]) && (
                    <span style={styles.answeredBadge}>Répondue</span>
                  )}
                  {showResult[currentQuestion._id] !== undefined && showResult[currentQuestion._id] !== null && (
                    <span style={{ ...styles.resultBadge, background: showResult[currentQuestion._id] ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)', color: showResult[currentQuestion._id] ? '#10b981' : '#ef4444' }}>
                      {showResult[currentQuestion._id] ? '✓ Bonne réponse' : '✗ Mauvaise réponse'}
                    </span>
                  )}
                  {openRangeMode && (
                    <button
                      onClick={() => handleSelectQuestionForOpenRange(currentQuestionIndex)}
                      style={{
                        marginLeft: 'auto',
                        padding: '4px 12px',
                        borderRadius: '20px',
                        background: selectedQuestions.includes(currentQuestionIndex) ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.1)',
                        border: `1px solid ${selectedQuestions.includes(currentQuestionIndex) ? '#10b981' : 'rgba(255,255,255,0.2)'}`,
                        color: selectedQuestions.includes(currentQuestionIndex) ? '#10b981' : '#94a3b8',
                        fontSize: '0.7rem',
                        cursor: 'pointer'
                      }}
                    >
                      {selectedQuestions.includes(currentQuestionIndex) ? '✓ Sélectionnée' : '☐ Sélectionner'}
                    </button>
                  )}
                </div>

                {getImageUrl(currentQuestion) && (
                  <div style={{ marginBottom: 16, textAlign: 'center' }}>
                    <img
                      src={getImageUrl(currentQuestion)}
                      alt="Illustration de la question"
                      style={{
                        maxWidth: '100%',
                        maxHeight: 200,
                        borderRadius: 12,
                        objectFit: 'contain',
                        background: 'rgba(0,0,0,0.2)'
                      }}
                    />
                  </div>
                )}

                <p style={styles.questionText}>{currentQuestion.libQuestion || currentQuestion.text}</p>
                <div style={styles.optionsList}>
                  {currentQuestion.options.map((opt, idx) => {
                    const currentAnswer = answers[currentQuestion._id] || answers[currentQuestionIndex];
                    const isSelected = currentAnswer === opt;
                    const isCorrect = typeof currentQuestion.bonOpRep === 'number'
                      ? idx === currentQuestion.bonOpRep
                      : opt === currentQuestion.correctAnswer;

                    const isOptionDisabled = quizFinished || submittingRef.current ||
                      (config?.examOption !== 'C' && config?.examOption !== 'F' && config?.examOption !== 'K' && currentAnswer &&
                       !(config?.allowRetry && attempts[currentQuestion._id] === 0));

                    const canRetry = config?.allowRetry && attempts[currentQuestion._id] === 1;
                    const isDisabled = quizFinished || submittingRef.current || (isOptionDisabled && !canRetry);

                    return (
                      <label
                        key={idx}
                        style={{
                          ...styles.option,
                          background: isSelected ? 'rgba(59,130,246,0.15)' : 'rgba(255,255,255,0.02)',
                          borderColor: isSelected ? '#3b82f6' : 'rgba(59,130,246,0.15)',
                          opacity: isDisabled ? 0.6 : 1,
                          cursor: isDisabled ? 'not-allowed' : 'pointer'
                        }}
                      >
                        <input
                          type="radio"
                          name={`q-${currentQuestion._id}`}
                          checked={isSelected}
                          onChange={() => handleOptionChange(currentQuestion._id, opt, currentQuestionIndex)}
                          disabled={isDisabled}
                          style={{ marginRight: '12px', accentColor: '#3b82f6' }}
                        />
                        <span style={{ color: '#f8fafc' }}>{opt}</span>
                        {config?.showCorrectAnswer && isCorrect && !isSelected && <CheckCircle size={14} color="#10b981" style={{ marginLeft: 'auto' }} />}
                      </label>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* ACTIONS - Navigation corrigée pour toutes les options */}
          <div style={styles.actions}>
            <div style={{ display: 'flex', gap: 12 }}>
              {config?.examOption === 'A' ? (
                <div style={styles.waitingIndicator}>
                  <div style={styles.pulseDotSmall} />
                  Navigation contrôlée par le superviseur
                </div>
              ) : (
                <>
                  <button onClick={handlePrevQuestion} disabled={disablePrev || submittingRef.current} style={styles.prevButton(disablePrev)}>
                    <ArrowLeft size={16} /> Précédent
                  </button>
                  <button onClick={handleNextQuestion} disabled={disableNext || submittingRef.current} style={styles.nextButton(disableNext)}>
                    Suivant <ArrowRight size={16} />
                  </button>
                </>
              )}
            </div>

            {!quizFinished && config?.examOption !== 'A' && config?.examOption !== 'B' && (
              <button onClick={handleManualSubmit} disabled={isSubmitting || submittingRef.current} style={styles.submitButton(isSubmitting)}>
                {isSubmitting ? (
                  <><Loader size={16} style={{ animation: 'spin 1s linear infinite' }} /> Soumission...</>
                ) : (
                  <><Send size={16} /> {config?.examOption === 'C' || config?.examOption === 'F' || config?.examOption === 'K' ? 'Terminer l\'examen' : 'Soumettre l\'examen'}</>
                )}
              </button>
            )}
          </div>

          {quizFinished && (
            <div style={styles.finishedBox}>
              <CheckCircle size={48} color="#10b981" />
              <p>Examen terminé!</p>
              <p style={{ color: '#94a3b8' }}>Redirection vers les résultats...</p>
            </div>
          )}
        </div>
      </main>

      {showSubmitConfirm && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <AlertTriangle size={48} color="#f59e0b" />
            <h3>Confirmer la soumission?</h3>
            <p>Vous avez répondu à <strong>{Object.keys(answers).length}/{questions.length}</strong> questions.</p>
            <p>Cette action est irréversible.</p>
            <div style={styles.modalButtons}>
              <button onClick={() => setShowSubmitConfirm(false)}>Annuler</button>
              <button onClick={() => { setShowSubmitConfirm(false); handleSubmitExam(true); }}>Oui, soumettre</button>
            </div>
          </div>
        </div>
      )}

      <Toaster />
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
        .animate-spin { animation: spin 1s linear infinite; }
      `}</style>
    </div>
  );
};

// Styles complets (inchangés)
const styles = {
  container: { minHeight: '100vh', fontFamily: "'DM Sans', sans-serif", background: 'linear-gradient(135deg, #05071a 0%, #0a0f2e 60%, #05071a 100%)', position: 'relative', overflow: 'hidden', padding: '24px' },
  bgGrid: { position: 'fixed', inset: 0, backgroundImage: 'linear-gradient(rgba(59,130,246,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,0.03) 1px, transparent 1px)', backgroundSize: '40px 40px', pointerEvents: 'none', zIndex: 0 },
  bgGlow: { position: 'fixed', top: '-15%', left: '50%', transform: 'translateX(-50%)', width: '70vw', height: '50vh', background: 'radial-gradient(ellipse, rgba(37,99,235,0.12) 0%, transparent 70%)', pointerEvents: 'none', zIndex: 0 },
  main: { position: 'relative', zIndex: 1, maxWidth: '900px', margin: '0 auto' },
  quizCard: { background: 'rgba(15,23,42,0.7)', backdropFilter: 'blur(12px)', border: '1px solid rgba(59,130,246,0.15)', borderRadius: '24px', padding: '32px' },
  header: { marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 },
  titleRow: { display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  optionBadge: (opt) => {
    const optColors = {
      'A': '#ef4444', 'B': '#ef4444', 'C': '#ef4444',
      'D': '#f59e0b', 'E': '#f59e0b', 'F': '#f59e0b',
      'G': '#10b981', 'H': '#10b981', 'I': '#10b981', 'J': '#10b981', 'K': '#10b981'
    };
    const color = optColors[opt] || '#3b82f6';
    return {
      padding: '3px 10px', borderRadius: '999px', fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.06em',
      background: `${color}25`,
      border: `1px solid ${color}44`,
      color: color,
    };
  },
  studentInfo: { color: '#94a3b8', fontSize: '0.875rem', marginTop: 4 },
  globalTimerHint: { display: 'block', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.1em', color: '#475569', marginTop: 4, textAlign: 'center' },
  currentQuestionIndicator: { textAlign: 'center', padding: '8px', marginBottom: '16px', background: 'rgba(239,68,68,0.1)', borderRadius: '8px', fontSize: '0.8rem', color: '#f8fafc' },
  progressArea: { marginBottom: '16px' },
  progressLabels: { display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', color: '#94a3b8', marginBottom: '8px' },
  progressBar: { width: '100%', height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px' },
  progressFill: { height: '100%', background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)', borderRadius: '3px', transition: 'width 0.3s ease' },
  navGrid: { marginBottom: '24px', padding: '16px', background: 'rgba(59,130,246,0.1)', borderRadius: '12px' },
  questionButtons: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(40px, 1fr))', gap: '8px', marginTop: 8 },
  questionButton: (isCurrent, hasAnswer) => ({
    width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: isCurrent ? '#3b82f6' : hasAnswer ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.05)',
    border: isCurrent ? 'none' : hasAnswer ? '1px solid #10b981' : '1px solid rgba(255,255,255,0.1)',
    borderRadius: '8px', color: isCurrent ? '#fff' : hasAnswer ? '#10b981' : '#94a3b8',
    fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer'
  }),
  questionCard: { padding: '24px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: '16px', marginBottom: '20px' },
  questionHeader: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' },
  questionNumber: { background: '#3b82f6', color: '#fff', fontSize: '0.875rem', fontWeight: 600, padding: '4px 10px', borderRadius: '999px' },
  pointsBadge: { background: 'rgba(245,158,11,0.15)', color: '#f59e0b', padding: '2px 8px', borderRadius: '999px', fontSize: '0.7rem', fontWeight: 600 },
  answeredBadge: { background: 'rgba(16,185,129,0.2)', color: '#10b981', fontSize: '0.75rem', fontWeight: 600, padding: '2px 8px', borderRadius: '999px' },
  resultBadge: { background: 'rgba(16,185,129,0.2)', color: '#10b981', fontSize: '0.75rem', fontWeight: 600, padding: '2px 8px', borderRadius: '999px' },
  questionText: { fontSize: '1.125rem', color: '#f8fafc', lineHeight: 1.6, marginBottom: '24px' },
  optionsList: { display: 'flex', flexDirection: 'column', gap: '12px' },
  option: { display: 'flex', alignItems: 'center', padding: '14px 16px', border: '2px solid', borderRadius: '12px', transition: 'all 0.2s' },
  actions: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, flexWrap: 'wrap', gap: 12 },
  prevButton: (disabled) => ({ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: '10px', color: disabled ? '#4b5563' : '#f8fafc', fontSize: '0.9375rem', fontWeight: 500, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1 }),
  nextButton: (disabled) => ({ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', background: disabled ? 'rgba(59,130,246,0.3)' : 'linear-gradient(135deg, #3b82f6, #2563eb)', border: 'none', borderRadius: '10px', color: '#fff', fontSize: '0.9375rem', fontWeight: 500, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1 }),
  submitButton: (submitting) => ({ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px', background: submitting ? 'rgba(16,185,129,0.3)' : 'linear-gradient(135deg, #10b981, #059669)', border: 'none', borderRadius: '10px', color: '#fff', fontSize: '1rem', fontWeight: 600, cursor: submitting ? 'not-allowed' : 'pointer', boxShadow: '0 4px 12px rgba(16,185,129,0.2)' }),
  finishedBox: { marginTop: '32px', padding: '24px', background: 'rgba(16,185,129,0.1)', border: '1px solid #10b981', borderRadius: '12px', textAlign: 'center' },
  modalOverlay: { position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' },
  modal: { background: 'rgba(15,23,42,0.97)', border: '1px solid rgba(139,92,246,0.3)', borderRadius: '20px', padding: '32px', maxWidth: '420px', width: '100%', textAlign: 'center' },
  modalButtons: { display: 'flex', gap: '12px', justifyContent: 'center', marginTop: 24 },
  waitingContainer: { minHeight: '100vh', background: 'linear-gradient(135deg, #05071a, #0a0f2e)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'DM Sans', sans-serif", padding: '24px' },
  waitingCard: { background: 'rgba(15,23,42,0.8)', backdropFilter: 'blur(12px)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: '24px', padding: '48px 40px', textAlign: 'center', maxWidth: '480px', width: '100%' },
  waitingIcon: { width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(59,130,246,0.12)', border: '2px solid rgba(59,130,246,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' },
  waitingCount: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderRadius: '12px', background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)', marginBottom: '16px' },
  connectedBadge: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', padding: '12px 20px', borderRadius: '12px', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' },
  pulseDot: { width: 10, height: 10, borderRadius: '50%', background: '#10b981', animation: 'pulse 1.5s infinite' },
  pulseDotSmall: { width: 8, height: 8, borderRadius: '50%', background: '#3b82f6', display: 'inline-block', animation: 'pulse 1.5s infinite', marginRight: 6 },
  waitingIndicator: { display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: '10px', color: '#94a3b8', fontSize: '0.875rem' },
  waitingNote: { color: '#475569', fontSize: '0.78rem', marginTop: '8px' }
};

export default QuizCompositionPage;