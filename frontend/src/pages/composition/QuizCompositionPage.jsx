// src/pages/QuizCompositionPage.jsx - Version avec double stockage d'images
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

const NODE_BACKEND_URL = process.env.NODE_ENV === 'production' 
  ? (process.env.REACT_APP_BACKEND_URL || 'https://na2quizapp.onrender.com')
  : 'http://localhost:5000';
const SOCKET_URL = NODE_BACKEND_URL;

// Timer component (inchangé)
const Timer = ({ initialTime, onTimeEnd, isActive, resetTrigger, timerConfig = 'permanent', onTick }) => {
  // ... code inchangé ...
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

  // Mise à jour des refs
  useEffect(() => { answersRef.current = answers; }, [answers]);
  useEffect(() => { attemptsRef.current = attempts; }, [attempts]);
  useEffect(() => { showResultRef.current = showResult; }, [showResult]);
  useEffect(() => { currentQuestionIndexRef.current = currentQuestionIndex; }, [currentQuestionIndex]);
  useEffect(() => { configRef.current = config; }, [config]);
  useEffect(() => { examRef.current = exam; }, [exam]);
  useEffect(() => { studentInfoRef.current = studentInfo; }, [studentInfo]);

  // Fonction de mélange
  const shuffleArray = (array) => {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  };

  // Normaliser une question du nouveau format (AVEC IMAGES)
  const normalizeQuestion = (q) => {
    // Récupérer l'URL de l'image (priorité à imageQuestion, fallback imageBase64)
    let imageUrl = q.imageQuestion || '';
    if (!imageUrl && q.imageBase64 && q.imageBase64.startsWith('data:')) {
      imageUrl = q.imageBase64;
    }
    
    return {
      _id: q._id,
      libQuestion: q.libQuestion || q.question || q.text,
      question: q.libQuestion || q.question || q.text,
      text: q.libQuestion || q.question || q.text,
      options: q.options || [],
      correctAnswer: q.options && typeof q.bonOpRep === 'number' 
        ? q.options[q.bonOpRep] 
        : (q.correctAnswer || q.bonOpRep),
      bonOpRep: q.bonOpRep,
      points: q.points || 1,
      explanation: q.explanation || '',
      typeQuestion: q.typeQuestion || 1,
      type: q.type || (q.typeQuestion === 2 ? 'multiple' : 'single'),
      tempsMinParQuestion: (q.tempsMin || 1) * 60,
      tempsMin: q.tempsMin || 1,
      domaine: q.domaine || '',
      sousDomaine: q.sousDomaine || '',
      niveau: q.niveau || '',
      matiere: q.matiere || '',
      // === STOCKAGE DES IMAGES ===
      imageQuestion: q.imageQuestion || '',
      imageBase64: q.imageBase64 || '',
      imageMetadata: q.imageMetadata || {},
      imageUrl: imageUrl
    };
  };

  // Obtenir l'URL de l'image pour l'affichage
  const getImageUrl = (question) => {
    if (question.imageQuestion) return question.imageQuestion;
    if (question.imageBase64 && question.imageBase64.startsWith('data:')) return question.imageBase64;
    return null;
  };

  // ═══════════════════════════════════════════════════════════════
  // SAUVEGARDE AUTOMATIQUE ET RÉCUPÉRATION
  // ═══════════════════════════════════════════════════════════════
  
  // Récupération des données sauvegardées au chargement
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

  // Sauvegarde automatique périodique (toutes les 30 secondes)
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
        
        const lastToast = localStorage.getItem(`exam_${examId}_lastToast`);
        if (!lastToast || Date.now() - parseInt(lastToast) > 120000) {
          toast.success("💾 Sauvegarde automatique effectuée", { duration: 2000, icon: '💾' });
          localStorage.setItem(`exam_${examId}_lastToast`, Date.now());
        }
      }
    }, 30000);
    
    return () => {
      if (autoSaveIntervalRef.current) clearInterval(autoSaveIntervalRef.current);
    };
  }, [examId, quizFinished, waitingForStart]);

  // Sauvegarde immédiate à chaque changement
  useEffect(() => {
    if (quizFinishedRef.current || waitingForStartRef.current) return;
    
    localStorage.setItem(`exam_${examId}_answers`, JSON.stringify(answersRef.current));
    localStorage.setItem(`exam_${examId}_index`, currentQuestionIndexRef.current);
    localStorage.setItem(`exam_${examId}_attempts`, JSON.stringify(attemptsRef.current));
    localStorage.setItem(`exam_${examId}_showResult`, JSON.stringify(showResultRef.current));
  }, [answers, currentQuestionIndex, attempts, showResult, examId, quizFinished, waitingForStart]);

  // Sauvegarde avant de quitter la page
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (!quizFinishedRef.current && !submittingRef.current && Object.keys(answersRef.current).length > 0) {
        localStorage.setItem(`exam_${examId}_answers`, JSON.stringify(answersRef.current));
        localStorage.setItem(`exam_${examId}_index`, currentQuestionIndexRef.current);
        localStorage.setItem(`exam_${examId}_attempts`, JSON.stringify(attemptsRef.current));
        localStorage.setItem(`exam_${examId}_showResult`, JSON.stringify(showResultRef.current));
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [examId]);

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
    socketRef.current.emit('updateStudentProgress', {
      examId: examRef.current._id,
      progress,
      currentQuestion: index + 1,
      totalQuestions: total,
      score: Object.keys(answersRef.current).length,
      percentage: Math.round((Object.keys(answersRef.current).length / total) * 100)
    });
  }, []);

  // Soumission finale
  const handleSubmitExam = useCallback(async (isManual = false) => {
    if (quizFinishedRef.current || submittingRef.current) return;

    submittingRef.current = true;
    quizFinishedRef.current = true;
    setQuizFinished(true);
    setIsSubmitting(true);
    
    clearAutoSave();

    if (socketRef.current?.connected) {
      try {
        socketRef.current.emit('examSubmitting', { studentSocketId: socketRef.current.id, examId: examRef.current._id });
      } catch (e) {}
    }

    try {
      const res = await axios.post(`${NODE_BACKEND_URL}/api/results`, {
        examId: examRef.current._id,
        studentInfo: studentInfoRef.current,
        answers: answersRef.current,
        config: configRef.current
      }, { timeout: 10000 });
      
      const { result, details: correctionDetails } = res.data;
      setShowConfetti(true);
      toast.success(isManual ? "Examen soumis avec succès !" : "Temps écoulé ! Examen soumis automatiquement...");

      if (socketRef.current?.connected) {
        socketRef.current.emit('examSubmitted', { studentSocketId: socketRef.current.id, examResultId: result._id });
        socketRef.current.disconnect();
      }

      setTimeout(() => {
        navigate(`/results/${examRef.current._id}`, {
          state: {
            submittedAnswers: answersRef.current,
            studentInfo: studentInfoRef.current,
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
              examOption: result.examOption || configRef.current?.examOption,
              examQuestions: result.examQuestions || [],
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
      toast.error(error.response?.data?.message || "Échec de la soumission. Veuillez réessayer.");
    }
  }, [navigate, clearAutoSave]);

  const handleTimeEnd = useCallback(() => {
    if (quizFinishedRef.current || submittingRef.current) return;
    const opt = configRef.current?.examOption;
    const idx = currentQuestionIndexRef.current;
    const total = examRef.current.questions.length;

    if (opt === 'A' || opt === 'D') {
      if (idx < total - 1) {
        const nextIndex = idx + 1;
        currentQuestionIndexRef.current = nextIndex;
        setCurrentQuestionIndex(nextIndex);
        setTimerResetTrigger(prev => prev + 1);
        setTimeout(() => sendProgressUpdate(nextIndex), 100);
        toast(opt === 'D' ? "Temps écoulé ! Question suivante (Aléatoire)." : "Temps écoulé ! Passage à la question suivante.", {
          style: { background: '#f59e0b', color: '#fff' }, icon: '⏳',
        });
      } else {
        handleSubmitExam(false);
      }
    } else if (opt === 'C') {
      toast("Temps global écoulé ! Soumission automatique...", {
        style: { background: '#ef4444', color: '#fff' }, icon: '⏱️', duration: 3000
      });
      handleSubmitExam(false);
    }
  }, [handleSubmitExam, sendProgressUpdate]);

  const handleNextQuestion = useCallback(() => {
    const idx = currentQuestionIndexRef.current;
    if (idx < examRef.current.questions.length - 1) {
      const nextIndex = idx + 1;
      currentQuestionIndexRef.current = nextIndex;
      setCurrentQuestionIndex(nextIndex);
      setTimeout(() => sendProgressUpdate(nextIndex), 50);
    }
  }, [sendProgressUpdate]);

  const handlePrevQuestion = useCallback(() => {
    const idx = currentQuestionIndexRef.current;
    if (idx > 0) {
      const prevIndex = idx - 1;
      currentQuestionIndexRef.current = prevIndex;
      setCurrentQuestionIndex(prevIndex);
      setTimeout(() => sendProgressUpdate(prevIndex), 50);
    }
  }, [sendProgressUpdate]);

  const handleManualSubmit = useCallback(() => {
    if (quizFinishedRef.current || submittingRef.current) return;
    if (configRef.current?.examOption === 'C') {
      setShowSubmitConfirm(true);
      return;
    }
    handleSubmitExam(true);
  }, [handleSubmitExam]);

  const handleOptionChange = (questionId, selectedOption) => {
    if (quizFinishedRef.current || submittingRef.current) return;
    
    const currentQ = examRef.current.questions.find(q => q._id === questionId);
    if (!currentQ) return;

    const currentAttempts = attemptsRef.current[questionId] || 0;
    if (configRef.current?.allowRetry && currentAttempts >= 1) {
      toast.error("Vous avez déjà utilisé votre seconde chance sur cette question.");
      return;
    }

    let isCorrect = false;
    if (typeof currentQ.bonOpRep === 'number') {
      const selectedIndex = currentQ.options.findIndex(opt => opt === selectedOption);
      isCorrect = selectedIndex === currentQ.bonOpRep;
    } else {
      isCorrect = selectedOption === currentQ.correctAnswer;
    }

    const newAnswers = { ...answersRef.current, [questionId]: selectedOption };
    answersRef.current = newAnswers;
    setAnswers(newAnswers);

    const newAttempts = { ...attemptsRef.current, [questionId]: (currentAttempts + 1) };
    attemptsRef.current = newAttempts;
    setAttempts(newAttempts);

    if (configRef.current?.showBinaryResult) {
      toast[isCorrect ? 'success' : 'error'](isCorrect ? '✓ Bonne réponse !' : '✗ Mauvaise réponse');
      setShowResult(prev => ({ ...prev, [questionId]: isCorrect }));
    }
    
    if (configRef.current?.showCorrectAnswer && !isCorrect) {
      const correctAnswerText = currentQ.options?.[currentQ.bonOpRep] || currentQ.correctAnswer;
      toast.info(`💡 Bonne réponse : ${correctAnswerText}`, { duration: 3000 });
    }

    if (!isCorrect && configRef.current?.allowRetry) {
      return;
    }

    if (configRef.current?.examOption === 'A' || configRef.current?.examOption === 'D') {
      const idx = currentQuestionIndexRef.current;
      if (idx < examRef.current.questions.length - 1) {
        const nextIndex = idx + 1;
        currentQuestionIndexRef.current = nextIndex;
        setCurrentQuestionIndex(nextIndex);
        setTimerResetTrigger(prev => prev + 1);
        setTimeout(() => sendProgressUpdate(nextIndex), 500);
      } else {
        handleSubmitExam(false);
      }
    }
  };

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

    const fetchExam = async () => {
      try {
        const res = await axios.get(`${NODE_BACKEND_URL}/api/exams/${examId}`, { timeout: 10000 });
        if (!res.data || !Array.isArray(res.data.questions) || res.data.questions.length === 0) {
          throw new Error("Données d'examen invalides");
        }

        let fetchedQuestions = res.data.questions.map(q => normalizeQuestion({ ...q, _id: q._id || uuidv4() }));

        if (parsed.config?.openRange && parsed.config.requiredQuestions > 0 && parsed.config.requiredQuestions < fetchedQuestions.length) {
          const shuffled = shuffleArray([...fetchedQuestions]);
          fetchedQuestions = shuffled.slice(0, parsed.config.requiredQuestions);
        }

        if (parsed.config?.sequencing === 'randomPerStudent') {
          fetchedQuestions = shuffleArray(fetchedQuestions);
        }

        if (parsed.examOption === 'D' && parsed.config?.sequencing !== 'randomPerStudent') {
          fetchedQuestions = shuffleArray(fetchedQuestions);
        }

        setQuestions(fetchedQuestions);
        setExam({ ...res.data, questions: fetchedQuestions });
        examRef.current = { ...res.data, questions: fetchedQuestions };

        if (parsed.config?.timerPerQuestion) {
          setRemainingTime(parsed.config.timePerQuestion);
        } else {
          setRemainingTime(parsed.config.totalTime * 60);
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
        toast.error("Échec du chargement de l'examen.");
        navigate('/', { replace: true });
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
      transports: ['polling', 'websocket'],
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
      newSocket.emit('registerSession', { type: 'student', sessionId: stableSessionIdRef.current });
      const currentStatus = parsed.examOption === 'B' ? 'waiting' : 'composing';
      newSocket.emit('studentReadyForExam', {
        examId,
        studentInfo: parsed.info,
        sessionId: stableSessionIdRef.current,
        status: currentStatus,
        terminalSessionId: terminalSessionIdRef.current,
        examOption: parsed.examOption
      });
    });

    newSocket.on('examStartedForOptionB', (data) => {
      if (data.examId !== examId) return;
      waitingForStartRef.current = false;
      setWaitingForStart(false);
      const qIdx = data.questionIndex || 0;
      currentQuestionIndexRef.current = qIdx;
      setCurrentQuestionIndex(qIdx);
      setTimerResetTrigger(prev => prev + 1);
      toast.success("L'examen commence maintenant !", { icon: '🚀', duration: 3000 });
      setTimeout(() => sendProgressUpdate(qIdx), 500);
    });

    newSocket.on('examStarted', (data) => {
      if (data.examId !== examId) return;
      waitingForStartRef.current = false;
      setWaitingForStart(false);
      const qIdx = data.questionIndex || 0;
      currentQuestionIndexRef.current = qIdx;
      setCurrentQuestionIndex(qIdx);
      setTimerResetTrigger(prev => prev + 1);
      toast.success("L'examen commence maintenant !", { icon: '🚀', duration: 3000 });
      setTimeout(() => sendProgressUpdate(qIdx), 500);
    });

    newSocket.on('displayQuestion', (data) => {
      if (data.examId !== examId) return;
      const idx = data.questionIndex ?? data.nextQuestionIndex ?? 0;
      if (examRef.current && idx >= examRef.current.questions.length) {
        if (!quizFinishedRef.current && !submittingRef.current) handleSubmitExam(false);
        return;
      }
      const opt = configRef.current?.examOption;
      if (opt === 'B' || opt === 'A') {
        currentQuestionIndexRef.current = idx;
        setCurrentQuestionIndex(idx);
        setTimerResetTrigger(prev => prev + 1);
        toast(`Question ${idx + 1} affichée par le superviseur.`, { icon: 'ℹ️' });
        setTimeout(() => sendProgressUpdate(idx), 500);
      }
    });

    newSocket.on('examFinished', (data) => {
      if (data.examId === examId && !quizFinishedRef.current && !submittingRef.current) {
        handleSubmitExam(false);
      }
    });

    newSocket.on('waitingCountUpdate', (data) => {
      if (data.examId === examId) setWaitingCount(data.count);
    });

    newSocket.on('connect_error', () => toast.error("Problème de connexion. Reconnexion en cours..."));

    return () => {
      if (newSocket) newSocket.disconnect();
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

  // Affichage conditionnel
  if (isLoading || !exam || !studentInfo) {
    return (
      <div style={{ minHeight: '100vh', background: '#05071a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Loader size={48} style={{ color: '#3b82f6', animation: 'spin 1s linear infinite' }} />
        <Toaster />
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
                if (socketRef.current?.connected) socketRef.current.emit('getWaitingStudents', { examId }, (resp) => setWaitingCount(resp.count));
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
  const disablePrev = quizFinished || currentQuestionIndex === 0 || config?.examOption === 'A' || config?.examOption === 'B' || config?.examOption === 'D';
  const disableNext = quizFinished || currentQuestionIndex === questions.length - 1 || config?.examOption === 'A' || config?.examOption === 'D' || (config?.examOption === 'B' && !answers[currentQuestion?._id]);

  return (
    <div style={styles.container}>
      <div style={styles.bgGrid} />
      <div style={styles.bgGlow} />
      {showConfetti && <Confetti recycle={false} numberOfPieces={200} gravity={0.1} />}
      <main style={styles.main}>
        <div style={styles.quizCard}>
          {/* En-tête */}
          <div style={styles.header}>
            <div>
              <div style={styles.titleRow}>
                <h1>{exam.title}</h1>
                <span style={styles.optionBadge(config?.examOption)}>
                  {config?.examOption === 'A' ? 'COLLECTIVE FIGÉE' :
                   config?.examOption === 'B' ? 'COLLECTIVE SOUPLE' :
                   config?.examOption === 'C' ? 'PERSONNALISÉE' : 'ALÉATOIRE'}
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
              {quizStarted && !quizFinished && remainingTime > 0 && config?.examOption !== 'B' && (
                <Timer
                  initialTime={remainingTime}
                  onTimeEnd={handleTimeEnd}
                  isActive={!quizFinished}
                  resetTrigger={timerResetTrigger}
                  timerConfig={config?.timerConfig || 'permanent'}
                />
              )}
              {config?.examOption === 'C' && quizStarted && !quizFinished && (
                <span style={styles.globalTimerHint}>TEMPS GLOBAL ({questions.length} × {config?.timePerQuestion || 60}s)</span>
              )}
            </div>
          </div>

          {/* Progression */}
          <div style={styles.progressArea}>
            <div style={styles.progressLabels}>
              <span>Progression</span>
              <span>{answeredCount}/{questions.length} questions · {Math.round(progressPercentage)}%</span>
            </div>
            <div style={styles.progressBar}>
              <div style={{ ...styles.progressFill, width: `${progressPercentage}%` }} />
            </div>
          </div>

          {/* Navigation pour Option C */}
          {config?.examOption === 'C' && (
            <div style={styles.navGrid}>
              <h3>Navigation des questions</h3>
              <div style={styles.questionButtons}>
                {questions.map((q, idx) => (
                  <button
                    key={q._id}
                    onClick={() => {
                      currentQuestionIndexRef.current = idx;
                      setCurrentQuestionIndex(idx);
                      sendProgressUpdate(idx);
                    }}
                    disabled={quizFinished}
                    style={styles.questionButton(idx === currentQuestionIndex, answers[q._id])}
                  >
                    {idx + 1}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Question courante AVEC IMAGE */}
          <AnimatePresence mode="wait">
            <motion.div key={currentQuestionIndex} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }}>
              <div style={styles.questionCard}>
                <div style={styles.questionHeader}>
                  <span style={styles.questionNumber}>Question {currentQuestionIndex + 1}</span>
                  {answers[currentQuestion._id] && (
                    <span style={styles.answeredBadge}>Répondue</span>
                  )}
                  {showResult[currentQuestion._id] !== undefined && (
                    <span style={{ ...styles.resultBadge, background: showResult[currentQuestion._id] ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)', color: showResult[currentQuestion._id] ? '#10b981' : '#ef4444' }}>
                      {showResult[currentQuestion._id] ? '✓ Bonne réponse' : '✗ Mauvaise réponse'}
                    </span>
                  )}
                </div>
                
                {/* ✅ AFFICHAGE DE L'IMAGE */}
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
                    const isSelected = answers[currentQuestion._id] === opt;
                    const isCorrect = typeof currentQuestion.bonOpRep === 'number' 
                      ? idx === currentQuestion.bonOpRep 
                      : opt === currentQuestion.correctAnswer;
                    
                    return (
                      <label
                        key={idx}
                        style={{
                          ...styles.option,
                          background: isSelected ? 'rgba(59,130,246,0.15)' : 'rgba(255,255,255,0.02)',
                          borderColor: isSelected ? '#3b82f6' : 'rgba(59,130,246,0.15)',
                          opacity: (quizFinished || submittingRef.current || (config?.examOption !== 'C' && answers[currentQuestion._id])) ? 0.6 : 1,
                          cursor: (quizFinished || submittingRef.current || (config?.examOption !== 'C' && answers[currentQuestion._id])) ? 'not-allowed' : 'pointer'
                        }}
                      >
                        <input
                          type="radio"
                          name={`q-${currentQuestion._id}`}
                          checked={isSelected}
                          onChange={() => handleOptionChange(currentQuestion._id, opt)}
                          disabled={quizFinished || submittingRef.current || (config?.examOption !== 'C' && answers[currentQuestion._id])}
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

          {/* Boutons de navigation et soumission */}
          <div style={styles.actions}>
            <div style={{ display: 'flex', gap: 12 }}>
              {config?.examOption === 'B' ? (
                <div style={styles.waitingIndicator}>
                  <div style={styles.pulseDotSmall} />
                  En attente du superviseur…
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
                  <><Send size={16} /> {config?.examOption === 'C' ? 'Terminer l\'examen' : 'Soumettre l\'examen'}</>
                )}
              </button>
            )}
            {!quizFinished && config?.examOption === 'A' && (
              <div style={styles.autoSubmitHint}><Clock size={14} /> Soumission automatique (60s/question)</div>
            )}
            {!quizFinished && config?.examOption === 'B' && (
              <div style={styles.supervisorHint}><div style={styles.pulseDotSmall} /> Fin contrôlée par le superviseur</div>
            )}
          </div>

          {quizFinished && (
            <div style={styles.finishedBox}>
              <CheckCircle size={48} color="#10b981" />
              <p>Examen terminé !</p>
              <p style={{ color: '#94a3b8' }}>Redirection vers les résultats...</p>
            </div>
          )}
        </div>
      </main>

      {/* Modal de confirmation */}
      {showSubmitConfirm && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <AlertTriangle size={48} color="#f59e0b" />
            <h3>Confirmer la soumission ?</h3>
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

// Styles (inchangés)
const styles = {
  container: { minHeight: '100vh', fontFamily: "'DM Sans', sans-serif", background: 'linear-gradient(135deg, #05071a 0%, #0a0f2e 60%, #05071a 100%)', position: 'relative', overflow: 'hidden', padding: '24px' },
  bgGrid: { position: 'fixed', inset: 0, backgroundImage: 'linear-gradient(rgba(59,130,246,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,0.03) 1px, transparent 1px)', backgroundSize: '40px 40px', pointerEvents: 'none', zIndex: 0 },
  bgGlow: { position: 'fixed', top: '-15%', left: '50%', transform: 'translateX(-50%)', width: '70vw', height: '50vh', background: 'radial-gradient(ellipse, rgba(37,99,235,0.12) 0%, transparent 70%)', pointerEvents: 'none', zIndex: 0 },
  main: { position: 'relative', zIndex: 1, maxWidth: '900px', margin: '0 auto' },
  quizCard: { background: 'rgba(15,23,42,0.7)', backdropFilter: 'blur(12px)', border: '1px solid rgba(59,130,246,0.15)', borderRadius: '24px', padding: '32px' },
  header: { marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 },
  titleRow: { display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  optionBadge: (opt) => ({
    padding: '3px 10px', borderRadius: '999px', fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.06em',
    background: opt === 'A' ? 'rgba(239,68,68,0.15)' : opt === 'B' ? 'rgba(59,130,246,0.15)' : opt === 'C' ? 'rgba(139,92,246,0.15)' : 'rgba(245,158,11,0.15)',
    border: `1px solid ${opt === 'A' ? '#ef4444' : opt === 'B' ? '#3b82f6' : opt === 'C' ? '#8b5cf6' : '#f59e0b'}44`,
    color: opt === 'A' ? '#ef4444' : opt === 'B' ? '#3b82f6' : opt === 'C' ? '#8b5cf6' : '#f59e0b',
  }),
  studentInfo: { color: '#94a3b8', fontSize: '0.875rem', marginTop: 4 },
  timerArea: { textAlign: 'right' },
  globalTimerHint: { display: 'block', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.1em', color: '#475569', marginTop: 4, textAlign: 'center' },
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
  answeredBadge: { background: 'rgba(16,185,129,0.2)', color: '#10b981', fontSize: '0.75rem', fontWeight: 600, padding: '2px 8px', borderRadius: '999px' },
  resultBadge: { background: 'rgba(16,185,129,0.2)', color: '#10b981', fontSize: '0.75rem', fontWeight: 600, padding: '2px 8px', borderRadius: '999px' },
  questionText: { fontSize: '1.125rem', color: '#f8fafc', lineHeight: 1.6, marginBottom: '24px' },
  optionsList: { display: 'flex', flexDirection: 'column', gap: '12px' },
  option: { display: 'flex', alignItems: 'center', padding: '14px 16px', border: '2px solid', borderRadius: '12px', transition: 'all 0.2s' },
  actions: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, flexWrap: 'wrap', gap: 12 },
  prevButton: (disabled) => ({ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: '10px', color: disabled ? '#4b5563' : '#f8fafc', fontSize: '0.9375rem', fontWeight: 500, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1 }),
  nextButton: (disabled) => ({ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', background: disabled ? 'rgba(59,130,246,0.3)' : 'linear-gradient(135deg, #3b82f6, #2563eb)', border: 'none', borderRadius: '10px', color: '#fff', fontSize: '0.9375rem', fontWeight: 500, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1 }),
  submitButton: (submitting) => ({ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px', background: submitting ? 'rgba(16,185,129,0.3)' : 'linear-gradient(135deg, #10b981, #059669)', border: 'none', borderRadius: '10px', color: '#fff', fontSize: '1rem', fontWeight: 600, cursor: submitting ? 'not-allowed' : 'pointer', boxShadow: '0 4px 12px rgba(16,185,129,0.2)' }),
  autoSubmitHint: { display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '10px', color: '#ef4444', fontSize: '0.8rem', fontWeight: 600 },
  supervisorHint: { display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: '10px', color: '#3b82f6', fontSize: '0.8rem', fontWeight: 600 },
  waitingIndicator: { display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: '10px', color: '#94a3b8', fontSize: '0.875rem' },
  finishedBox: { marginTop: '32px', padding: '24px', background: 'rgba(16,185,129,0.1)', border: '1px solid #10b981', borderRadius: '12px', textAlign: 'center' },
  modalOverlay: { position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' },
  modal: { background: 'rgba(15,23,42,0.97)', border: '1px solid rgba(139,92,246,0.3)', borderRadius: '20px', padding: '32px', maxWidth: '420px', width: '100%', textAlign: 'center' },
  modalButtons: { display: 'flex', gap: '12px', justifyContent: 'center', marginTop: 24 },
  waitingContainer: { minHeight: '100vh', background: 'linear-gradient(135deg, #05071a, #0a0f2e)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'DM Sans', sans-serif", padding: '24px' },
  waitingCard: { background: 'rgba(15,23,42,0.8)', backdropFilter: 'blur(12px)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: '24px', padding: '48px 40px', textAlign: 'center', maxWidth: '480px', width: '100%' },
  waitingIcon: { width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(59,130,246,0.12)', border: '2px solid rgba(59,130,246,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', animation: 'pulseBorder 2s infinite' },
  waitingCount: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderRadius: '12px', background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)', marginBottom: '16px' },
  connectedBadge: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', padding: '12px 20px', borderRadius: '12px', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' },
  pulseDot: { width: 10, height: 10, borderRadius: '50%', background: '#10b981', animation: 'pulse 1.5s infinite' },
  pulseDotSmall: { width: 8, height: 8, borderRadius: '50%', background: '#3b82f6', display: 'inline-block', animation: 'pulse 1.5s infinite', marginRight: 6 },
  waitingNote: { color: '#475569', fontSize: '0.78rem', marginTop: '8px' }
};

export default QuizCompositionPage;