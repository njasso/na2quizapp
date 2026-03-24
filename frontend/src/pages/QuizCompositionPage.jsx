// src/pages/QuizCompositionPage.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { toast, Toaster } from 'react-hot-toast';
import Confetti from 'react-confetti';
import { v4 as uuidv4 } from 'uuid';
import io from 'socket.io-client';
import { 
  Clock, 
  CheckCircle, 
  Send, 
  ArrowLeft, 
  ArrowRight,
  AlertTriangle,
  Loader,
  Users,
  RefreshCw
} from 'lucide-react';

const NODE_BACKEND_URL = process.env.REACT_APP_BACKEND_URL || (process.env.NODE_ENV === 'production' ? 'https://na2quizapp.onrender.com' : 'http://localhost:5000');
const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || NODE_BACKEND_URL;
const DURATION_PER_QUESTION_SECONDS = 60;

const Timer = ({ initialTime, onTimeEnd, isActive, resetTrigger }) => {
  const [timeLeft, setTimeLeft] = useState(initialTime);
  const timerRef = useRef(null);
  const startTimeRef = useRef(Date.now());
  const onTimeEndRef = useRef(onTimeEnd);

  useEffect(() => {
    onTimeEndRef.current = onTimeEnd;
  }, [onTimeEnd]);

  useEffect(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    if (!isActive || initialTime <= 0) {
      return;
    }

    startTimeRef.current = Date.now();
    setTimeLeft(initialTime);

    timerRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
      const remaining = Math.max(0, initialTime - elapsed);
      setTimeLeft(remaining);

      if (remaining <= 0) {
        clearInterval(timerRef.current);
        onTimeEndRef.current();
      }
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [initialTime, isActive, resetTrigger]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const percentage = (timeLeft / initialTime) * 100;
  const isLow = timeLeft <= 10;

  if (initialTime <= 0) return null;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <Clock size={18} color={isLow ? '#ef4444' : '#3b82f6'} />
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{
            fontSize: '1rem',
            fontWeight: 600,
            color: isLow ? '#ef4444' : '#f8fafc',
            transition: 'color 0.2s',
          }}>
            {formatTime(timeLeft)}
          </span>
          {isLow && (
            <AlertTriangle size={16} color="#ef4444" style={{ animation: 'pulse 1s infinite' }} />
          )}
        </div>
        <div style={{
          width: '100px',
          height: '4px',
          background: 'rgba(255,255,255,0.1)',
          borderRadius: '2px',
          marginTop: '2px',
        }}>
          <div style={{
            width: `${percentage}%`,
            height: '100%',
            background: isLow ? '#ef4444' : '#3b82f6',
            borderRadius: '2px',
            transition: 'width 0.3s',
          }} />
        </div>
      </div>
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
};

const QuizCompositionPage = () => {
  const { examId } = useParams();
  const navigate = useNavigate();

  const [exam, setExam] = useState(null);
  const [studentInfo, setStudentInfo] = useState(null);
  const [answers, setAnswers] = useState({});
  const [lockedAnswers, setLockedAnswers] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [quizStarted, setQuizStarted] = useState(false);
  const [quizFinished, setQuizFinished] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [quizDurationSeconds, setQuizDurationSeconds] = useState(0);
  const [timerResetTrigger, setTimerResetTrigger] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [examOption, setExamOption] = useState('A');
  const [waitingForStart, setWaitingForStart] = useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [waitingCount, setWaitingCount] = useState(0);
  const [terminalSessionId, setTerminalSessionId] = useState(null);
  const [lastPongTime, setLastPongTime] = useState(Date.now());

  const socketRef = useRef(null);
  const submittingRef = useRef(false);
  const redirectTimeoutRef = useRef(null);
  const pingIntervalRef = useRef(null);

  // REFS MIROIR
  const examRef = useRef(null);
  const quizFinishedRef = useRef(false);
  const waitingForStartRef = useRef(false);
  const currentQuestionIndexRef = useRef(0);
  const answersRef = useRef({});
  const examOptionRef = useRef('A');
  const studentInfoRef = useRef(null);
  const terminalSessionIdRef = useRef(null);
  const stableSessionIdRef = useRef(null);

  const shuffleArray = (array) => {
    let currentIndex = array.length, randomIndex;
    while (currentIndex !== 0) {
      randomIndex = Math.floor(Math.random() * currentIndex);
      currentIndex--;
      [array[currentIndex], array[randomIndex]] = [
        array[randomIndex], array[currentIndex]];
    }
    return array;
  };

  const cleanupBeforeRedirect = useCallback(() => {
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = null;
    }
    if (socketRef.current) {
      socketRef.current.removeAllListeners();
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    if (redirectTimeoutRef.current) {
      clearTimeout(redirectTimeoutRef.current);
      redirectTimeoutRef.current = null;
    }
  }, []);

  const sendProgressUpdate = useCallback((questionIndex) => {
    const currentExam = examRef.current;
    if (currentExam && !quizFinishedRef.current && !waitingForStartRef.current && socketRef.current?.connected) {
      const answeredCount = Object.keys(answersRef.current).length;
      const totalQuestions = currentExam.questions.length;
      const progress = Math.round(((questionIndex + 1) / totalQuestions) * 100);
      const percentage = Math.round((answeredCount / totalQuestions) * 100);
      
      socketRef.current.emit('updateStudentProgress', {
        examId: currentExam._id,
        progress,
        currentQuestion: questionIndex + 1,
        totalQuestions: totalQuestions,
        score: answeredCount,
        percentage: percentage
      });
    }
  }, []);

  const handleSubmitExam = useCallback(async (isManual = false) => {
    if (quizFinishedRef.current || submittingRef.current) return;

    const exam = examRef.current;
    const studentInfo = studentInfoRef.current;
    const answers = answersRef.current;
    const terminalSessionId = terminalSessionIdRef.current;

    submittingRef.current = true;
    quizFinishedRef.current = true;
    setQuizFinished(true);
    setIsSubmitting(true);

    if (socketRef.current?.connected) {
      try {
        socketRef.current.emit('examSubmitting', { 
          studentSocketId: socketRef.current.id,
          examId: exam._id
        });
      } catch (e) {}
    }

    try {
      const res = await axios.post(`${NODE_BACKEND_URL}/api/results`, {
        examId: exam._id,
        studentInfo,
        answers
      }, { timeout: 10000 });
      
      const { result, details: correctionDetails } = res.data;
      setShowConfetti(true);
      toast.success(isManual ? "Examen soumis avec succès !" : "Temps écoulé ! Examen soumis automatiquement...");

      if (socketRef.current?.connected) {
        try {
          socketRef.current.emit('examSubmitted', {
            studentSocketId: socketRef.current.id,
            examResultId: result._id
          });
        } catch (e) {}
        socketRef.current.removeAllListeners();
        socketRef.current.disconnect();
        socketRef.current = null;
      }

      redirectTimeoutRef.current = setTimeout(() => {
        navigate(`/results/${exam._id}`, {
          state: {
            submittedAnswers: answers,
            studentInfo,
            submittedScore: result.score,
            submittedPercentage: result.percentage,
            examTitle: exam.title,
            passingScore: exam.passingScore,
            examQuestions: exam.questions,
            questionDetails: correctionDetails || null,
            resultSnapshot: {
              examTitle: result.examTitle || exam.title,
              examLevel: result.examLevel || exam.level,
              domain: result.domain || exam.domain,
              subject: result.subject || exam.subject,
              category: result.category || exam.category,
              duration: result.duration || exam.duration,
              passingScore: result.passingScore || exam.passingScore,
              examOption: result.examOption || null,
              examQuestions: result.examQuestions || [],
            },
            terminalSessionId
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
  }, [navigate]);

  const handleTimeEnd = useCallback(() => {
    if (quizFinishedRef.current || submittingRef.current) return;
    const option = examOptionRef.current;
    const idx = currentQuestionIndexRef.current;
    const exam = examRef.current;

    if (option === 'A' || option === 'D') {
      if (idx < exam.questions.length - 1) {
        const nextIndex = idx + 1;
        currentQuestionIndexRef.current = nextIndex;
        setCurrentQuestionIndex(nextIndex);
        setTimerResetTrigger(prev => prev + 1);
        setTimeout(() => sendProgressUpdate(nextIndex), 100);
        toast(option === 'D' ? "Temps écoulé ! Question suivante (Aléatoire)." : "Temps écoulé ! Passage à la question suivante.", {
          style: { background: '#f59e0b', color: '#fff' }, icon: '⏳',
        });
      } else {
        handleSubmitExam(false);
      }
    } else if (option === 'C') {
      toast("Temps global écoulé ! Soumission automatique...", {
        style: { background: '#ef4444', color: '#fff' }, icon: '⏱️', duration: 3000
      });
      handleSubmitExam(false);
    }
  }, [handleSubmitExam, sendProgressUpdate]);

  const handleManualSubmit = useCallback(() => {
    if (quizFinishedRef.current || submittingRef.current) return;
    if (examOptionRef.current === 'C') {
      setShowSubmitConfirm(true);
      return;
    }
    handleSubmitExam(true);
  }, [handleSubmitExam]);

  const handleNextQuestion = useCallback(() => {
    const exam = examRef.current;
    const idx = currentQuestionIndexRef.current;
    if (idx < exam.questions.length - 1) {
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

  // Sync des refs miroir
  useEffect(() => { examRef.current = exam; }, [exam]);
  useEffect(() => { quizFinishedRef.current = quizFinished; }, [quizFinished]);
  useEffect(() => { waitingForStartRef.current = waitingForStart; }, [waitingForStart]);
  useEffect(() => { currentQuestionIndexRef.current = currentQuestionIndex; }, [currentQuestionIndex]);
  useEffect(() => { answersRef.current = answers; }, [answers]);
  useEffect(() => { examOptionRef.current = examOption; }, [examOption]);
  useEffect(() => { studentInfoRef.current = studentInfo; }, [studentInfo]);
  useEffect(() => { terminalSessionIdRef.current = terminalSessionId; }, [terminalSessionId]);

  // ✅ CORRECTION: Utiliser answersRef.current pour la progression
  useEffect(() => {
    if (exam && quizStarted && !quizFinished && !waitingForStart) {
      const answeredCount = Object.keys(answersRef.current).length;
      const totalQuestions = exam.questions.length;
      const progressPercentage = Math.round((answeredCount / totalQuestions) * 100);
      
      if (socketRef.current?.connected) {
        socketRef.current.emit('updateStudentProgress', {
          examId: exam._id,
          progress: progressPercentage,
          currentQuestion: currentQuestionIndex + 1,
          totalQuestions: totalQuestions,
          score: answeredCount,
          percentage: progressPercentage
        });
      }
    }
  }, [currentQuestionIndex, exam, quizStarted, quizFinished, waitingForStart]);

  useEffect(() => {
    if (socketRef.current?.connected && !quizFinished) {
      pingIntervalRef.current = setInterval(() => {
        if (socketRef.current?.connected) {
          socketRef.current.emit('ping');
        }
      }, 25000);
    }
    
    return () => {
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
        pingIntervalRef.current = null;
      }
    };
  }, [quizFinished]);

  useEffect(() => {
    return () => {
      cleanupBeforeRedirect();
    };
  }, [cleanupBeforeRedirect]);

  useEffect(() => {
    const storedInfo = localStorage.getItem('studentInfoForExam');
    if (!storedInfo) {
      navigate(`/exam/profile/${examId}`, { replace: true });
      return;
    }

    try {
      const parsed = JSON.parse(storedInfo);
      if (parsed.examId !== examId) {
        navigate(`/exam/profile/${examId}`, { replace: true });
        return;
      }
      
      setStudentInfo(parsed.info);
      studentInfoRef.current = parsed.info;
      setTerminalSessionId(parsed.terminalSessionId || null);
      terminalSessionIdRef.current = parsed.terminalSessionId || null;
      const option = parsed.examOption || 'A';
      setExamOption(option);
      examOptionRef.current = option;

      const stableKey = `studentSessionId_${examId}`;
      let stableId = sessionStorage.getItem(stableKey);
      if (!stableId) {
        stableId = `STU_${examId.slice(-8)}_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
        sessionStorage.setItem(stableKey, stableId);
      }
      stableSessionIdRef.current = stableId;

      const handleBeforeUnload = (e) => {
        if (!quizFinishedRef.current && !submittingRef.current) {
          e.preventDefault();
          e.returnValue = 'Voulez-vous vraiment quitter ? Votre progression sera perdue.';
        }
      };

      const handlePopState = () => {
        if (!quizFinishedRef.current && !submittingRef.current) {
          window.history.pushState(null, '', window.location.href);
          toast.error("⚠️ Navigation bloquée pendant l'examen !");
        }
      };

      window.addEventListener('beforeunload', handleBeforeUnload);
      window.addEventListener('popstate', handlePopState);
      window.history.pushState(null, '', window.location.href);

      socketRef.current = io(SOCKET_URL, {
        reconnection: true,
        reconnectionAttempts: 20,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 8000,
        timeout: 15000,
        transports: ['polling', 'websocket'],
        forceNew: false,
      });

      pingIntervalRef.current = setInterval(() => {
        if (socketRef.current?.connected) socketRef.current.emit('ping');
      }, 25000);
      
      socketRef.current.on('connect', () => {
        console.log('✅ Socket connecté, ID:', socketRef.current.id);
        const currentStatus = examOptionRef.current === 'B' ? 'waiting' : 'composing';

        socketRef.current.emit('registerSession', {
          type: 'student',
          sessionId: stableSessionIdRef.current
        });
        socketRef.current.emit('studentReadyForExam', {
          examId,
          studentInfo: studentInfoRef.current,
          sessionId: stableSessionIdRef.current,
          status: currentStatus,
          terminalSessionId: terminalSessionIdRef.current,
          examOption: examOptionRef.current
        });
        
        if (examOptionRef.current === 'A' || examOptionRef.current === 'B') {
          setWaitingForStart(true);
          waitingForStartRef.current = true;
        }
        
        if (examRef.current && !waitingForStartRef.current && !quizFinishedRef.current) {
          sendProgressUpdate(currentQuestionIndexRef.current);
        }
      });

      const onExamStartedForOptionB = (data) => {
        if (data.examId !== examId) return;
        console.log('🚀 Option B démarré, question:', data.questionIndex);
        
        waitingForStartRef.current = false;
        setWaitingForStart(false);
        
        const qIdx = data.questionIndex || 0;
        currentQuestionIndexRef.current = qIdx;
        setCurrentQuestionIndex(qIdx);
        setTimerResetTrigger(prev => prev + 1);
        
        toast.success("L'examen commence maintenant !", { icon: '🚀', duration: 3000 });
        
        if (examRef.current) {
          const totalQuestions = examRef.current.questions.length;
          setQuizDurationSeconds(totalQuestions * DURATION_PER_QUESTION_SECONDS);
        }
        
        setTimeout(() => sendProgressUpdate(qIdx), 500);
      };

      const onExamStarted = (data) => {
        if (data.examId !== examId) return;
        console.log('🚀 Examen démarré, question:', data.questionIndex);
        const qIdx = data.questionIndex || 0;
        waitingForStartRef.current = false;
        currentQuestionIndexRef.current = qIdx;
        setWaitingForStart(false);
        setCurrentQuestionIndex(qIdx);
        setTimerResetTrigger(prev => prev + 1);
        toast.success("L'examen commence maintenant !", { icon: '🚀', duration: 3000 });
        setTimeout(() => sendProgressUpdate(qIdx), 500);
      };

      const onReconnectSuccess = ({ status, progress, waitingCount: count }) => {
        console.log('🔄 Reconnecté avec succès, status:', status);
        if (status === 'composing') {
          waitingForStartRef.current = false;
          setWaitingForStart(false);
          if (progress !== undefined) {
            currentQuestionIndexRef.current = progress;
            setCurrentQuestionIndex(progress);
          }
          toast.success("Reconnexion réussie ! Reprise de l'examen.");
        } else if (status === 'waiting') {
          setWaitingForStart(true);
          waitingForStartRef.current = true;
          if (count !== undefined) setWaitingCount(count);
          toast.success("Reconnecté à la salle d'attente.");
        }
      };

      socketRef.current.on('examStartedForOptionB', onExamStartedForOptionB);
      socketRef.current.on('examStarted', onExamStarted);
      socketRef.current.on('reconnectSuccess', onReconnectSuccess);

      socketRef.current.on('waitingCountUpdate', (data) => {
        if (data.examId === examId) setWaitingCount(data.count);
      });

      socketRef.current.on('examFinished', (data) => {
        if (data.examId === examId && !quizFinishedRef.current && !submittingRef.current) {
          handleSubmitExam(false);
        }
      });

      socketRef.current.on('pong', () => {
        setLastPongTime(Date.now());
      });

      const handleDisplayQuestion = (data) => {
        if (data.examId !== examId) return;
        const idx = data.questionIndex ?? data.nextQuestionIndex ?? 0;
        const currentExam = examRef.current;
        if (currentExam && idx >= currentExam.questions.length) {
          if (!quizFinishedRef.current && !submittingRef.current) handleSubmitExam(false);
          return;
        }
        const opt = examOptionRef.current;
        if (opt === 'B' || opt === 'A') {
          console.log(`Affichage question index: ${idx}`);
          currentQuestionIndexRef.current = idx;
          setCurrentQuestionIndex(idx);
          setTimerResetTrigger(prev => prev + 1);
          toast(`Question ${idx + 1} affichée par le superviseur.`, { icon: 'ℹ️' });
          setTimeout(() => sendProgressUpdate(idx), 500);
        }
      };

      socketRef.current.on('displayQuestion', handleDisplayQuestion);
      socketRef.current.on('advanceQuestionForOptionA', handleDisplayQuestion);

      socketRef.current.on('connect_error', () => {
        toast.error("Problème de connexion. Reconnexion en cours...");
      });

      socketRef.current.on('reconnect', (attempt) => {
        console.log(`✅ Reconnecté après ${attempt} tentative(s)`);
        toast.success("Reconnecté au serveur");
        const currentStatus = quizFinishedRef.current ? 'finished'
          : waitingForStartRef.current ? 'waiting' : 'composing';
        socketRef.current.emit('registerSession', { type: 'student', sessionId: stableSessionIdRef.current });
        socketRef.current.emit('studentReadyForExam', {
          examId,
          studentInfo: studentInfoRef.current,
          sessionId: stableSessionIdRef.current,
          status: currentStatus,
          terminalSessionId: terminalSessionIdRef.current,
          examOption: examOptionRef.current
        });
        if (!waitingForStartRef.current && !quizFinishedRef.current) {
          sendProgressUpdate(currentQuestionIndexRef.current);
        }
      });

      return () => {
        clearInterval(pingIntervalRef.current);
        if (socketRef.current) {
          socketRef.current.removeAllListeners();
          socketRef.current.disconnect();
          socketRef.current = null;
        }
        window.removeEventListener('beforeunload', handleBeforeUnload);
        window.removeEventListener('popstate', handlePopState);
      };
    } catch (error) {
      console.error("Erreur:", error);
      navigate(`/exam/profile/${examId}`, { replace: true });
    }
  }, [examId, navigate, handleSubmitExam, sendProgressUpdate, cleanupBeforeRedirect]);

  useEffect(() => {
    const fetchExam = async () => {
      try {
        const res = await axios.get(`${NODE_BACKEND_URL}/api/exams/${examId}`, {
          timeout: 10000
        });

        if (!res.data || !Array.isArray(res.data.questions) || res.data.questions.length === 0) {
          throw new Error("Données d'examen invalides");
        }

        let fetchedQuestions = res.data.questions.map(q => ({ ...q, _id: q._id || uuidv4() }));

        if (examOption === 'D') {
          fetchedQuestions = shuffleArray(fetchedQuestions);
          toast("Questions mélangées (Aléatoire).", { icon: '🔀' });
        }

        const data = {
          ...res.data,
          questions: fetchedQuestions
        };
        setExam(data);
        examRef.current = data;

        let durationForTimer;
        const totalQuestions = data.questions.length;
        
        if (examOption === 'A' || examOption === 'D') {
          durationForTimer = DURATION_PER_QUESTION_SECONDS;
        } else if (examOption === 'B') {
          durationForTimer = 0;
        } else {
          durationForTimer = totalQuestions * DURATION_PER_QUESTION_SECONDS;
        }
        
        setQuizDurationSeconds(durationForTimer);
        setQuizStarted(true);

        setTimeout(() => {
          setTimerResetTrigger(prev => prev + 1);
        }, 100);
      } catch (error) {
        console.error("Erreur chargement examen:", error);
        toast.error("Échec du chargement de l'examen.");
        navigate('/', { replace: true });
      } finally {
        setIsLoading(false);
      }
    };
    
    if (examId && !exam && examOption) fetchExam();
  }, [examId, exam, navigate, examOption]);

  const handleOptionChange = (questionId, option) => {
    if (quizFinishedRef.current || submittingRef.current) {
      toast.error("Examen terminé. Vous ne pouvez plus modifier les réponses.");
      return;
    }

    if ((examOptionRef.current === 'A' || examOptionRef.current === 'B' || examOptionRef.current === 'D') && lockedAnswers[questionId]) {
      toast.error("Réponse déjà verrouillée.");
      return;
    }

    // ✅ Mettre à jour la REF et le STATE
    const newAnswers = { ...answersRef.current, [questionId]: option };
    answersRef.current = newAnswers;
    setAnswers(newAnswers);
    
    toast.success("Réponse enregistrée.");

    const opt = examOptionRef.current;
    if (opt === 'A' || opt === 'B' || opt === 'D') {
      setLockedAnswers(prev => ({ ...prev, [questionId]: true }));
      
      // Pour Option B, ne pas passer automatiquement à la question suivante
      if (opt === 'B') {
        // Attendre que le superviseur avance
        return;
      }
      
      const exam = examRef.current;
      const idx = currentQuestionIndexRef.current;
      if (opt === 'D' && exam && idx < exam.questions.length - 1) {
        setTimeout(() => {
          const nextIndex = idx + 1;
          currentQuestionIndexRef.current = nextIndex;
          setCurrentQuestionIndex(nextIndex);
          setTimerResetTrigger(prev => prev + 1);
          sendProgressUpdate(nextIndex);
        }, 500);
      } else if (opt === 'D' && exam && idx === exam.questions.length - 1) {
        setTimeout(() => handleSubmitExam(false), 1500);
      }
    }
  };

  const navigateToQuestion = (index) => {
    if (index >= 0 && index < examRef.current?.questions.length) {
      currentQuestionIndexRef.current = index;
      setCurrentQuestionIndex(index);
      sendProgressUpdate(index);
    }
  };

  const handleRefreshWaitingCount = () => {
    if (socketRef.current?.connected && examId) {
      socketRef.current.emit('getWaitingStudents', { examId }, (response) => {
        if (response) {
          setWaitingCount(response.count);
          toast.success(`${response.count} participant(s) en attente`);
        }
      });
    }
  };

  if (isLoading || !exam || !studentInfo) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #05071a 0%, #0a0f2e 60%, #05071a 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: "'DM Sans', sans-serif",
      }}>
        <Loader size={48} style={{ color: '#3b82f6', animation: 'spin 1s linear infinite' }} />
        <p style={{ color: '#94a3b8', marginTop: '16px' }}>Chargement de l'examen...</p>
        <Toaster />
        <style>{`
          @keyframes spin { to { transform: rotate(360deg); } }
        `}</style>
      </div>
    );
  }

  if (waitingForStart && (examOption === 'A' || examOption === 'B')) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #05071a 0%, #0a0f2e 60%, #05071a 100%)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        fontFamily: "'DM Sans', sans-serif", padding: '24px',
      }}>
        <div style={{
          background: 'rgba(15,23,42,0.8)', backdropFilter: 'blur(12px)',
          border: '1px solid rgba(59,130,246,0.2)', borderRadius: '24px',
          padding: '48px 40px', textAlign: 'center', maxWidth: '480px', width: '100%',
        }}>
          <div style={{
            width: '80px', height: '80px', borderRadius: '50%',
            background: 'rgba(59,130,246,0.12)', border: '2px solid rgba(59,130,246,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 24px',
            animation: 'pulseBorder 2s infinite',
          }}>
            <Clock size={36} color="#3b82f6" />
          </div>
          <h2 style={{
            fontFamily: "'Sora', sans-serif", fontSize: '1.5rem', fontWeight: 700,
            color: '#f8fafc', marginBottom: '12px',
          }}>
            {examOption === 'A' ? 'Salle d\'attente' : 'En attente de démarrage'}
          </h2>
          <p style={{ color: '#94a3b8', fontSize: '1rem', marginBottom: '24px', lineHeight: 1.6 }}>
            {examOption === 'A' 
              ? `Votre profil est enregistré. Le superviseur démarrera l'épreuve pour tous les participants simultanément.`
              : 'Le superviseur démarrera l\'épreuve pour tous les postes simultanément.'}
          </p>
          {examOption === 'B' && (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '12px 20px', borderRadius: '12px',
              background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)',
              marginBottom: '16px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Users size={20} color="#3b82f6" />
                <span style={{ color: '#f8fafc', fontSize: '1rem', fontWeight: 600 }}>
                  {waitingCount} participant{waitingCount > 1 ? 's' : ''} en attente
                </span>
              </div>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleRefreshWaitingCount}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '6px 12px', borderRadius: '8px',
                  background: 'rgba(59,130,246,0.2)',
                  border: '1px solid rgba(59,130,246,0.3)',
                  color: '#3b82f6', fontSize: '0.75rem', fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                <RefreshCw size={12} />
                Rafraîchir
              </motion.button>
            </div>
          )}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
            padding: '12px 20px', borderRadius: '12px',
            background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)',
          }}>
            <div style={{
              width: 10, height: 10, borderRadius: '50%', background: '#10b981',
              animation: 'pulse 1.5s infinite',
            }} />
            <span style={{ color: '#10b981', fontSize: '0.875rem', fontWeight: 600 }}>
              {studentInfo?.firstName} {studentInfo?.lastName} · Connecté
            </span>
          </div>
          {examOption === 'A' && (
            <p style={{ color: '#475569', fontSize: '0.78rem', marginTop: '16px' }}>
              En attente des autres participants...
            </p>
          )}
          <p style={{ color: '#475569', fontSize: '0.78rem', marginTop: '8px' }}>
            Option {examOption} — {examOption === 'A' ? 'Collective Figée' : 'Collective Souple'} · Ne quittez pas cette page
          </p>
        </div>
        <style>{`
          @keyframes spin { to { transform: rotate(360deg); } }
          @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }
          @keyframes pulseBorder { 0%,100% { box-shadow: 0 0 0 0 rgba(59,130,246,0.3); } 50% { box-shadow: 0 0 0 12px rgba(59,130,246,0); } }
        `}</style>
      </div>
    );
  }

  const currentQuestion = exam.questions[currentQuestionIndex];
  // ✅ Utiliser answersRef.current pour compter les réponses
  const answeredQuestions = Object.keys(answersRef.current).length;
  const progressPercentage = (answeredQuestions / exam.questions.length) * 100;

  const disablePrevButton = quizFinished || currentQuestionIndex === 0 || examOption === 'A' || examOption === 'B' || examOption === 'D';
  const disableNextButton = quizFinished || currentQuestionIndex === exam.questions.length - 1 || examOption === 'A' || examOption === 'D' || (examOption === 'B' && !answers[currentQuestion._id]);

  return (
    <div style={{
      minHeight: '100vh',
      fontFamily: "'DM Sans', sans-serif",
      background: 'linear-gradient(135deg, #05071a 0%, #0a0f2e 60%, #05071a 100%)',
      position: 'relative',
      overflow: 'hidden',
      padding: '24px',
    }}>
      <div style={{
        position: 'fixed', inset: 0,
        backgroundImage: 'linear-gradient(rgba(59,130,246,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,0.03) 1px, transparent 1px)',
        backgroundSize: '40px 40px', pointerEvents: 'none', zIndex: 0,
      }} />

      <div style={{
        position: 'fixed', top: '-15%', left: '50%', transform: 'translateX(-50%)',
        width: '70vw', height: '50vh',
        background: 'radial-gradient(ellipse, rgba(37,99,235,0.12) 0%, transparent 70%)',
        pointerEvents: 'none', zIndex: 0,
      }} />

      {showConfetti && <Confetti recycle={false} numberOfPieces={200} gravity={0.1} />}

      <main style={{ position: 'relative', zIndex: 1, maxWidth: '900px', margin: '0 auto' }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            background: 'rgba(15,23,42,0.7)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(59,130,246,0.15)',
            borderRadius: '24px',
            padding: '32px',
          }}
        >
          <div style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                  <h1 style={{
                    fontFamily: "'Sora', sans-serif",
                    fontSize: '1.5rem',
                    fontWeight: 700,
                    color: '#f8fafc',
                  }}>
                    {exam.title}
                  </h1>
                  <span style={{
                    padding: '3px 10px',
                    borderRadius: '999px',
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    letterSpacing: '0.06em',
                    background: examOption === 'A' ? 'rgba(239,68,68,0.15)' :
                                examOption === 'B' ? 'rgba(59,130,246,0.15)' :
                                examOption === 'C' ? 'rgba(139,92,246,0.15)' :
                                                    'rgba(245,158,11,0.15)',
                    border: `1px solid ${examOption === 'A' ? '#ef4444' :
                                         examOption === 'B' ? '#3b82f6' :
                                         examOption === 'C' ? '#8b5cf6' : '#f59e0b'}44`,
                    color: examOption === 'A' ? '#ef4444' :
                           examOption === 'B' ? '#3b82f6' :
                           examOption === 'C' ? '#8b5cf6' : '#f59e0b',
                  }}>
                    {examOption === 'A' ? 'COLLECTIVE FIGÉE' :
                     examOption === 'B' ? 'COLLECTIVE SOUPLE' :
                     examOption === 'C' ? 'PERSONNALISÉE' : 'ALÉATOIRE'}
                  </span>
                </div>
                <p style={{ color: '#94a3b8', fontSize: '0.875rem' }}>
                  {studentInfo.firstName} {studentInfo.lastName} · {studentInfo.matricule}
                </p>
              </div>
              {quizStarted && !quizFinished && quizDurationSeconds > 0 && examOption !== 'B' && (
                <div style={{ textAlign: 'right' }}>
                  <Timer
                    initialTime={quizDurationSeconds}
                    onTimeEnd={handleTimeEnd}
                    isActive={!quizFinished}
                    resetTrigger={timerResetTrigger}
                  />
                  {examOption === 'C' && (
                    <span style={{
                      display: 'block',
                      fontSize: '0.65rem',
                      fontWeight: 700,
                      letterSpacing: '0.1em',
                      color: '#475569',
                      marginTop: '4px',
                      textAlign: 'center',
                    }}>
                      TEMPS GLOBAL ({exam.questions.length} × 60s)
                    </span>
                  )}
                </div>
              )}
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', color: '#94a3b8', marginBottom: '8px' }}>
                <span>Progression</span>
                <span>{answeredQuestions}/{exam.questions.length} questions · {Math.round(progressPercentage)}%</span>
              </div>
              <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px' }}>
                <div style={{
                  width: `${progressPercentage}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)',
                  borderRadius: '3px',
                  transition: 'width 0.3s ease',
                }} />
              </div>
            </div>
          </div>

          {examOption === 'C' && (
            <div style={{
              marginBottom: '24px',
              padding: '16px',
              background: 'rgba(59,130,246,0.1)',
              borderRadius: '12px',
            }}>
              <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#94a3b8', marginBottom: '12px' }}>
                Navigation des questions
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(40px, 1fr))', gap: '8px' }}>
                {exam.questions.map((q, index) => (
                  <button
                    key={q._id}
                    onClick={() => navigateToQuestion(index)}
                    disabled={quizFinished}
                    style={{
                      width: '40px',
                      height: '40px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: index === currentQuestionIndex
                        ? '#3b82f6'
                        : answersRef.current[q._id]
                          ? 'rgba(16,185,129,0.2)'
                          : 'rgba(255,255,255,0.05)',
                      border: index === currentQuestionIndex
                        ? 'none'
                        : answersRef.current[q._id]
                          ? '1px solid #10b981'
                          : '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '8px',
                      color: index === currentQuestionIndex ? '#fff' : answersRef.current[q._id] ? '#10b981' : '#94a3b8',
                      fontSize: '0.875rem',
                      fontWeight: 600,
                      cursor: quizFinished ? 'not-allowed' : 'pointer',
                      transition: 'all 0.2s',
                    }}
                  >
                    {index + 1}
                  </button>
                ))}
              </div>
            </div>
          )}

          <AnimatePresence mode="wait">
            <motion.div
              key={currentQuestionIndex}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              style={{ marginBottom: '24px' }}
            >
              <div style={{
                padding: '24px',
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(59,130,246,0.2)',
                borderRadius: '16px',
                marginBottom: '20px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                  <span style={{
                    background: '#3b82f6',
                    color: '#fff',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    padding: '4px 10px',
                    borderRadius: '999px',
                  }}>
                    Question {currentQuestionIndex + 1}
                  </span>
                  {answersRef.current[currentQuestion._id] && (
                    <span style={{
                      background: 'rgba(16,185,129,0.2)',
                      color: '#10b981',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      padding: '2px 8px',
                      borderRadius: '999px',
                    }}>
                      Répondue
                    </span>
                  )}
                </div>
                <p style={{ fontSize: '1.125rem', color: '#f8fafc', lineHeight: 1.6, marginBottom: '24px' }}>
                  {currentQuestion.question}
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {currentQuestion.options.map((opt, idx) => (
                    <label
                      key={idx}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: '14px 16px',
                        background: answersRef.current[currentQuestion._id] === opt
                          ? 'rgba(59,130,246,0.15)'
                          : 'rgba(255,255,255,0.02)',
                        border: `2px solid ${answersRef.current[currentQuestion._id] === opt
                          ? '#3b82f6'
                          : 'rgba(59,130,246,0.15)'}`,
                        borderRadius: '12px',
                        cursor: (quizFinished || submittingRef.current || ((examOption === 'A' || examOption === 'B' || examOption === 'D') && lockedAnswers[currentQuestion._id]))
                          ? 'not-allowed'
                          : 'pointer',
                        opacity: (quizFinished || submittingRef.current || ((examOption === 'A' || examOption === 'B' || examOption === 'D') && lockedAnswers[currentQuestion._id]))
                          ? 0.6
                          : 1,
                        transition: 'all 0.2s',
                      }}
                    >
                      <input
                        type="radio"
                        name={`q-${currentQuestion._id}`}
                        checked={answersRef.current[currentQuestion._id] === opt}
                        onChange={() => handleOptionChange(currentQuestion._id, opt)}
                        disabled={quizFinished || submittingRef.current || ((examOption === 'A' || examOption === 'B' || examOption === 'D') && lockedAnswers[currentQuestion._id])}
                        style={{ marginRight: '12px', accentColor: '#3b82f6', width: '18px', height: '18px' }}
                      />
                      <span style={{ color: '#f8fafc', fontSize: '1rem' }}>{opt}</span>
                    </label>
                  ))}
                </div>
              </div>
            </motion.div>
          </AnimatePresence>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: '12px' }}>
              {examOption === 'B' ? (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  padding: '10px 18px',
                  background: 'rgba(59,130,246,0.08)',
                  border: '1px solid rgba(59,130,246,0.2)',
                  borderRadius: '10px',
                  color: '#94a3b8', fontSize: '0.875rem',
                }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#3b82f6', display: 'inline-block', animation: 'pulse 1.5s infinite' }} />
                  En attente du superviseur…
                </div>
              ) : (
                <>
                  <motion.button
                    whileHover={{ scale: disablePrevButton ? 1 : 1.02 }}
                    whileTap={{ scale: disablePrevButton ? 1 : 0.98 }}
                    onClick={handlePrevQuestion}
                    disabled={disablePrevButton || submittingRef.current}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '10px 20px',
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(59,130,246,0.2)',
                      borderRadius: '10px',
                      color: disablePrevButton ? '#4b5563' : '#f8fafc',
                      fontSize: '0.9375rem',
                      fontWeight: 500,
                      cursor: disablePrevButton ? 'not-allowed' : 'pointer',
                      opacity: disablePrevButton ? 0.5 : 1,
                    }}
                  >
                    <ArrowLeft size={16} />
                    Précédent
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: disableNextButton ? 1 : 1.02 }}
                    whileTap={{ scale: disableNextButton ? 1 : 0.98 }}
                    onClick={handleNextQuestion}
                    disabled={disableNextButton || submittingRef.current}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '10px 20px',
                      background: disableNextButton ? 'rgba(59,130,246,0.3)' : 'linear-gradient(135deg, #3b82f6, #2563eb)',
                      border: 'none',
                      borderRadius: '10px',
                      color: '#fff',
                      fontSize: '0.9375rem',
                      fontWeight: 500,
                      cursor: disableNextButton ? 'not-allowed' : 'pointer',
                      opacity: disableNextButton ? 0.5 : 1,
                    }}
                  >
                    Suivant
                    <ArrowRight size={16} />
                  </motion.button>
                </>
              )}
            </div>

            {!quizFinished && examOption !== 'A' && examOption !== 'B' && (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleManualSubmit}
                disabled={isSubmitting || submittingRef.current}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '12px 24px',
                  background: isSubmitting ? 'rgba(16,185,129,0.3)' : 'linear-gradient(135deg, #10b981, #059669)',
                  border: 'none',
                  borderRadius: '10px',
                  color: '#fff',
                  fontSize: '1rem',
                  fontWeight: 600,
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  boxShadow: '0 4px 12px rgba(16,185,129,0.2)',
                }}
              >
                {isSubmitting ? (
                  <>
                    <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} />
                    Soumission...
                  </>
                ) : (
                  <>
                    <Send size={16} />
                    {examOption === 'C' ? 'Terminer l\'examen' : 'Soumettre l\'examen'}
                  </>
                )}
              </motion.button>
            )}
            {!quizFinished && examOption === 'A' && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '10px 18px',
                background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
                borderRadius: '10px', color: '#ef4444', fontSize: '0.8rem', fontWeight: 600,
              }}>
                <Clock size={14} />
                Soumission automatique (60s/question)
              </div>
            )}
            {!quizFinished && examOption === 'B' && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '10px 18px',
                background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)',
                borderRadius: '10px', color: '#3b82f6', fontSize: '0.8rem', fontWeight: 600,
              }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#3b82f6', display: 'inline-block', animation: 'pulse 1.5s infinite' }} />
                Fin contrôlée par le superviseur
              </div>
            )}
          </div>

          {quizFinished && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                marginTop: '32px',
                padding: '24px',
                background: 'rgba(16,185,129,0.1)',
                border: '1px solid #10b981',
                borderRadius: '12px',
                textAlign: 'center',
              }}
            >
              <CheckCircle size={48} color="#10b981" style={{ marginBottom: '12px' }} />
              <p style={{ color: '#10b981', fontSize: '1.25rem', fontWeight: 600, marginBottom: '4px' }}>
                Examen terminé !
              </p>
              <p style={{ color: '#94a3b8' }}>Redirection vers les résultats...</p>
            </motion.div>
          )}
        </motion.div>
      </main>

      {showSubmitConfirm && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px',
        }}>
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            style={{
              background: 'rgba(15,23,42,0.97)', border: '1px solid rgba(139,92,246,0.3)',
              borderRadius: '20px', padding: '32px', maxWidth: '420px', width: '100%',
              textAlign: 'center',
            }}
          >
            <AlertTriangle size={48} color="#f59e0b" style={{ marginBottom: '16px' }} />
            <h3 style={{ fontFamily: "'Sora',sans-serif", fontSize: '1.25rem', fontWeight: 700, color: '#f8fafc', marginBottom: '8px' }}>
              Confirmer la soumission ?
            </h3>
            <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '8px', lineHeight: 1.6 }}>
              Vous avez répondu à <strong style={{ color: '#f8fafc' }}>{Object.keys(answersRef.current).length}/{exam.questions.length}</strong> questions.
            </p>
            <p style={{ color: '#64748b', fontSize: '0.8rem', marginBottom: '28px' }}>
              Cette action est irréversible. Voulez-vous vraiment terminer l'examen ?
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                onClick={() => setShowSubmitConfirm(false)}
                style={{
                  padding: '12px 24px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)',
                  background: 'rgba(255,255,255,0.05)', color: '#94a3b8',
                  fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer',
                }}
              >
                Annuler
              </button>
              <button
                onClick={() => { setShowSubmitConfirm(false); handleSubmitExam(true); }}
                style={{
                  padding: '12px 24px', borderRadius: '10px', border: 'none',
                  background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff',
                  fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer',
                }}
              >
                Oui, soumettre
              </button>
            </div>
          </motion.div>
        </div>
      )}

      <Toaster 
        position="top-right"
        toastOptions={{
          style: {
            background: '#1e293b',
            color: '#f8fafc',
            border: '1px solid #3b82f6',
            borderRadius: '10px',
          },
        }}
      />
      <style>{`
        @font-face {
          font-family: 'Sora';
          font-style: normal;
          font-weight: 400 800;
          src: local('Segoe UI'), local('Ubuntu'), local('Cantarell'), local('Arial');
        }
        @font-face {
          font-family: 'DM Sans';
          font-style: normal;
          font-weight: 400 700;
          src: local('Segoe UI'), local('Ubuntu'), local('Cantarell'), local('Arial');
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }
      `}</style>
    </div>
  );
};

export default QuizCompositionPage;
