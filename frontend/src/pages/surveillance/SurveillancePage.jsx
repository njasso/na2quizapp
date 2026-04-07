// src/pages/surveillance/SurveillancePage.jsx - VERSION CORRIGÉE AVEC SESSION PERSISTANTE
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import io from 'socket.io-client';
import { toast, Toaster } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale,
  BarElement, Title, Tooltip, Legend
} from 'chart.js';
import { useNavigate } from 'react-router-dom';
import {
  Monitor, Home, Download, Users, Radio, BarChart3,
  Terminal, Clock, AlertCircle, AlertTriangle,
  Eye, ArrowRight, RefreshCw, History,
  Trophy, Printer, Play, Calendar, Filter,
  FileText, Trash2, X, ChevronDown, ChevronUp, Tag, Layers, BookOpen,
  Image as ImageIcon, Shield, Settings, Wifi, WifiOff
} from 'lucide-react';
import { getExams, getResults, getActiveSessions, getSurveillanceData, getRankings } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import ENV_CONFIG from '../../config/env';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const NODE_BACKEND_URL = ENV_CONFIG.BACKEND_URL;
const SOCKET_URL = ENV_CONFIG.SOCKET_URL;

console.log('[Surveillance] Backend URL:', NODE_BACKEND_URL);
console.log('[Surveillance] Socket URL:', SOCKET_URL);

// ══════════════════════════════════════════════════════════════
//  CONFIGURATIONS DES ÉPREUVES (A à K)
// ══════════════════════════════════════════════════════════════
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

// ══════════════════════════════════════════════════════════════
//  COMPOSANT PRINCIPAL
// ══════════════════════════════════════════════════════════════
const SurveillancePage = () => {
  const navigate = useNavigate();
  const { user, hasRole } = useAuth();

  const isOperator = hasRole('OPERATEUR_EVALUATION');
  const isAdmin = hasRole('ADMIN_SYSTEME') || hasRole('ADMIN_DELEGUE');
  const isTeacher = hasRole('ENSEIGNANT');

  const [exams, setExams] = useState([]);
  const [activeSessions, setActiveSessions] = useState([]);
  const [selectedExamId, setSelectedExamId] = useState('');
  const [selectedExamOption, setSelectedExamOption] = useState('A');
  const [realtimeStats, setRealtimeStats] = useState(null);
  const [currentQIdx, setCurrentQIdx] = useState({});
  const [isConnected, setIsConnected] = useState(false);
  const [socketError, setSocketError] = useState(null);
  const [reconnectAttempt, setReconnectAttempt] = useState(0);
  const [isStartingExam, setIsStartingExam] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [sessionHistory, setSessionHistory] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [showAlerts, setShowAlerts] = useState(false);
  const [autoAdvanceOptionA, setAutoAdvanceOptionA] = useState(true);
  const [rankingExamId, setRankingExamId] = useState('');
  const [rankingsData, setRankingsData] = useState([]);
  const [isLoadingRankings, setIsLoadingRankings] = useState(false);
  const [waitingCounts, setWaitingCounts] = useState({});
  const [accessDenied, setAccessDenied] = useState(false);

  const socketRef = useRef(null);
  const socketInitialized = useRef(false);
  const pollingIntervalRef = useRef(null);
  const autoAdvanceTimerRef = useRef(null);
  const isMounted = useRef(true);
  
  // ✅ Session ID persistant pour la surveillance
  const surveillanceSessionIdRef = useRef(null);

  // ✅ Créer ou récupérer un sessionId persistant
  const getOrCreateSessionId = useCallback(() => {
    let id = localStorage.getItem('surveillanceSessionId');
    if (!id) {
      id = `SURV_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('surveillanceSessionId', id);
      console.log('[Surveillance] 🆕 Nouvelle session créée:', id);
    } else {
      console.log('[Surveillance] 🔄 Session existante:', id);
    }
    return id;
  }, []);

  // ✅ Vérification d'accès
  useEffect(() => {
    if (!isOperator && !isAdmin && !isTeacher) {
      setAccessDenied(true);
      toast.error('Accès non autorisé.');
      setTimeout(() => navigate('/evaluate'), 2000);
    }
  }, [user, isOperator, isAdmin, isTeacher, navigate]);

  const addAlert = useCallback((alert) => {
    setAlerts(prev => [{ id: Date.now(), ...alert, timestamp: new Date() }, ...prev].slice(0, 50));
    toast.error(alert.message, { duration: 5000 });
  }, []);

  const getImageUrl = useCallback((exam) => {
    if (!exam) return null;
    if (exam.coverImage && exam.coverImage.trim() !== '') {
      let url = exam.coverImage;
      if (url.startsWith('/uploads/')) url = `${NODE_BACKEND_URL}${url}`;
      return url;
    }
    if (exam.questions && Array.isArray(exam.questions)) {
      for (const q of exam.questions) {
        if (q.imageQuestion) {
          let url = q.imageQuestion;
          if (url.startsWith('/uploads/')) url = `${NODE_BACKEND_URL}${url}`;
          return url;
        }
        if (q.imageBase64?.startsWith('data:')) return q.imageBase64;
      }
    }
    return null;
  }, []);

  const getUniqueSessions = useCallback((sessions) => {
    const terminalMap = new Map();
    const studentMap = new Map();
    sessions.forEach(session => {
      if (session.type === 'terminal') {
        const key = session.sessionId || session.socketId;
        if (!terminalMap.has(key) || (session.lastUpdate > (terminalMap.get(key)?.lastUpdate || 0))) terminalMap.set(key, session);
      } else if (session.type === 'student') {
        const key = session.studentInfo?.matricule || session.sessionId || session.socketId;
        if (!studentMap.has(key) || (session.lastUpdate > (studentMap.get(key)?.lastUpdate || 0))) studentMap.set(key, session);
      }
    });
    return [...terminalMap.values(), ...studentMap.values()];
  }, []);

  const getExamTitle = useCallback((examId) => {
    const exam = exams.find(e => e._id === examId);
    return exam?.title || 'Examen inconnu';
  }, [exams]);

  const getExamInfo = useCallback((examId) => {
    const exam = exams.find(e => e._id === examId);
    return { domain: exam?.domain || '', level: exam?.level || '', subject: exam?.subject || '', coverImage: getImageUrl(exam) };
  }, [exams, getImageUrl]);

  const getFilteredSessions = useCallback(() => {
    const unique = getUniqueSessions(activeSessions);
    return {
      unique,
      terminalsWaiting: unique.filter(s => s.type === 'terminal' && s.status === 'connected'),
      terminalsWithExam: unique.filter(s => s.type === 'terminal' && s.status === 'exam_distributed'),
      studentsWaitingForStart: unique.filter(s => s.type === 'student' && s.status === 'waiting'),
      studentsActive: unique.filter(s => s.type === 'student' && ['composing', 'finished', 'forced-finished'].includes(s.status)),
    };
  }, [activeSessions, getUniqueSessions]);

  const filtered = getFilteredSessions();
  const { terminalsWaiting, terminalsWithExam, studentsWaitingForStart, studentsActive } = filtered;
  const totalTerminals = terminalsWaiting.length + terminalsWithExam.length;
  const totalStudents = studentsWaitingForStart.length + studentsActive.length;

  // ══════════════════════════════════════════════════════════════
  //  SOCKET.IO AVEC SESSION PERSISTANTE
  // ══════════════════════════════════════════════════════════════

  // ✅ Refs stables pour éviter que le socket se recrée à chaque changement d'état
  const examsRef = useRef([]);
  const addAlertRef = useRef(addAlert);
  useEffect(() => { addAlertRef.current = addAlert; }, [addAlert]);
  const getImageUrlRef = useRef(getImageUrl);
  useEffect(() => { getImageUrlRef.current = getImageUrl; }, [getImageUrl]);

  // Synchronise examsRef avec le state exams sans toucher aux deps du socket
  useEffect(() => { examsRef.current = exams; }, [exams]);

  useEffect(() => {
    if (socketInitialized.current) return;
    socketInitialized.current = true;

    const sessionId = getOrCreateSessionId();
    surveillanceSessionIdRef.current = sessionId;

    console.log('[Surveillance] 🔌 Connexion socket avec sessionId:', sessionId);

 const socket = io(SOCKET_URL, { 
  transports: ['polling'],     // ✅ Uniquement polling
  reconnection: true, 
  reconnectionAttempts: 10,    // ✅ Augmenter les tentatives
  reconnectionDelay: 2000,
  reconnectionDelayMax: 10000,
  timeout: 60000,              // ✅ Augmenter le timeout
  forceNew: false,
  path: '/socket.io/',
  withCredentials: true        // ✅ Important pour CORS
})
    socketRef.current = socket;

    socket.on('connect', () => { 
      setIsConnected(true); 
      setSocketError(null); 
      setReconnectAttempt(0);
      console.log('[Surveillance] ✅ Socket connecté, ID:', socket.id);
      
      // ✅ Envoyer le sessionId persistant
      socket.emit('registerSession', { 
        type: 'surveillance', 
        sessionId: surveillanceSessionIdRef.current,
        status: 'active' 
      });
      
      toast.success('Connecté au serveur de surveillance.');
    });
    
    socket.on('disconnect', (reason) => { 
      setIsConnected(false); 
      console.log('[Surveillance] 👋 Déconnecté:', reason);
      addAlert({ type: 'disconnect', message: 'Déconnexion du serveur', severity: 'high' }); 
    });
    
    socket.on('connect_error', (err) => { 
      setIsConnected(false); 
      setSocketError(err.message);
      setReconnectAttempt(prev => prev + 1);
      console.error('[Surveillance] ❌ Erreur socket:', err.message);
    });
    
    socket.on('reconnect', (attempt) => {
      console.log('[Surveillance] 🔄 Reconnecté après', attempt, 'tentatives');
      setReconnectAttempt(0);
      // ✅ Ré-envoyer le sessionId après reconnexion
      if (socket.connected) {
        socket.emit('registerSession', { 
          type: 'surveillance', 
          sessionId: surveillanceSessionIdRef.current,
          status: 'active' 
        });
      }
    });

    socket.on('sessionUpdate', (data) => { 
      const sessions = data.activeSessions || []; 
      // ✅ Utilise examsRef.current (toujours à jour) au lieu de getExamInfo (qui changeait à chaque setExams)
      const enriched = sessions.map(s => { 
        if (s.type === 'student' && s.currentExamId) {
          const exam = examsRef.current.find(e => e._id === s.currentExamId);
          return { ...s, examInfo: { domain: exam?.domain || '', level: exam?.level || '', subject: exam?.subject || '', coverImage: exam ? getImageUrlRef.current(exam) : null } };
        }
        return s; 
      }); 
      setActiveSessions(enriched); 
    });
    
    socket.on('realtimeExamStats', (stats) => setRealtimeStats(stats));
    
    socket.on('studentProgressUpdate', (data) => { 
      setActiveSessions(prev => prev.map(session => { 
        if (session.socketId === data.studentId) return { ...session, progress: data.progress, score: data.score, percentage: data.percentage, lastUpdate: Date.now() }; 
        return session; 
      })); 
    });
    
    socket.on('waitingCountUpdate', (data) => setWaitingCounts(prev => ({ ...prev, [data.examId]: data.count })));
    
    socket.on('examStartedConfirm', (data) => { 
      setIsStartingExam(false); 
      if (data.startedCount > 0) toast.success(`✅ ${data.startedCount} étudiant(s) ont commencé !`); 
    });
    
    socket.on('securityAlert', (alert) => { 
      addAlert({ message: alert.message, severity: alert.severity || 'medium' }); 
      toast.error(alert.message, { duration: 8000, icon: '⚠️' }); 
    });

    return () => { 
      if (socketRef.current) {
        socketRef.current.removeAllListeners();
        socketRef.current.disconnect();
      }
      socketInitialized.current = false; 
    };
  // ✅ Dépendances vides : le socket ne doit s'initialiser qu'UNE seule fois.
  // addAlert, getExamInfo et getOrCreateSessionId sont lus via des refs stables ci-dessus.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ══════════════════════════════════════════════════════════════
  //  POLLING & CHARGEMENT INITIAL
  // ══════════════════════════════════════════════════════════════
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [examsRes, sessionsRes] = await Promise.all([getExams(), getActiveSessions()]);
        
        // ✅ Le serveur retourne { success: true, data: [...], count: N }
        // Selon si api.js renvoie response.data ou la réponse axios brute :
        //   • api.js retourne response.data           → examsRes = { success, data:[...] }  → examsRes.data est le tableau
        //   • api.js retourne la réponse axios brute  → examsRes = { data: { success, data:[...] } } → examsRes.data.data est le tableau
        let examsData = [];
        if (Array.isArray(examsRes))                          examsData = examsRes;              // tableau direct
        else if (Array.isArray(examsRes?.data))               examsData = examsRes.data;          // { data: [...] }
        else if (Array.isArray(examsRes?.data?.data))         examsData = examsRes.data.data;     // axios: { data: { data: [...] } }
        else if (examsRes?.success && Array.isArray(examsRes?.exams)) examsData = examsRes.exams; // { success, exams:[...] }
        
        console.log(`[Surveillance] 📚 Épreuves récupérées: ${examsData.length}`, examsRes);
        // ✅ Utilise getImageUrlRef.current (stable) pour ne pas créer de dépendance sur getImageUrl
        const normalizedExams = examsData.map(exam => ({ ...exam, coverImage: getImageUrlRef.current(exam) }));
        setExams(normalizedExams);
        // ✅ Même logique pour les sessions : extraire le tableau quelle que soit la profondeur
        const rawSessions = sessionsRes?.data?.sessions   // axios: { data: { sessions:[...] } }
          ?? sessionsRes?.sessions                        // { sessions:[...] }
          ?? sessionsRes?.data                            // { data:[...] }
          ?? null;
        if (Array.isArray(rawSessions)) {
          // ✅ Enrichissement inline avec normalizedExams (fraîchement chargé) — plus de dépendance sur getExamInfo
          const enriched = rawSessions.map(s => {
            if (s.type === 'student' && s.currentExamId) {
              const exam = normalizedExams.find(e => e._id === s.currentExamId);
              return { ...s, examInfo: { domain: exam?.domain || '', level: exam?.level || '', subject: exam?.subject || '', coverImage: exam?.coverImage } };
            }
            return s;
          });
          setActiveSessions(enriched);
        }
      } catch (err) { console.error('Erreur chargement:', err); }
    };
    fetchData();
    pollingIntervalRef.current = setInterval(fetchData, 30000);
    return () => { if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current); };
  // ✅ Dépendances vides : fetchData ne doit s'enregistrer qu'une fois.
  // getImageUrl est lu via getImageUrlRef.current pour rester stable.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ══════════════════════════════════════════════════════════════
  //  HANDLERS
  // ══════════════════════════════════════════════════════════════
  const handleDistributeExam = useCallback(() => {
    if (!selectedExamId || !socketRef.current?.connected) {
      toast.error(!selectedExamId ? 'Sélectionnez une épreuve.' : 'Socket non connecté.');
      return;
    }
    socketRef.current.emit('distributeExam', { examId: selectedExamId, examOption: selectedExamOption });
    toast.success(`Épreuve distribuée — Option ${selectedExamOption}`);
  }, [selectedExamId, selectedExamOption]);

  const handleStartExam = useCallback(() => {
    if (!selectedExamId || !socketRef.current?.connected) {
      toast.error(!selectedExamId ? 'Sélectionnez une épreuve.' : 'Socket non connecté.');
      return;
    }
    const targetStudents = getUniqueSessions(activeSessions).filter(s => s.type === 'student' && s.currentExamId === selectedExamId && s.status === 'waiting');
    if (targetStudents.length === 0) { toast.error('⚠️ Aucun étudiant en attente'); return; }
    setIsStartingExam(true);
    socketRef.current.emit('startExam', { examId: selectedExamId, option: selectedExamOption });
    setTimeout(() => setIsStartingExam(false), 10000);
  }, [selectedExamId, selectedExamOption, activeSessions, getUniqueSessions]);

  const handleFinishExam = useCallback(() => {
    if (!selectedExamId || !socketRef.current?.connected) {
      toast.error(!selectedExamId ? 'Sélectionnez une épreuve.' : 'Socket non connecté.');
      return;
    }
    socketRef.current.emit('finishExam', { examId: selectedExamId });
    toast.success('Fin d\'épreuve envoyée.');
  }, [selectedExamId]);

  const handleAdvanceQuestion = useCallback(() => {
    if (!socketRef.current?.connected) { toast.error('Socket non connecté'); return; }
    const nextIdx = (currentQIdx[selectedExamId] ?? -1) + 1;
    const exam = exams.find(e => e._id === selectedExamId);
    if (exam && nextIdx >= (exam.questions?.length || 0)) { toast('Fin de l\'épreuve'); return; }
    if (selectedExamOption === 'B') socketRef.current.emit('displayQuestion', { examId: selectedExamId, questionIndex: nextIdx });
    else if (selectedExamOption === 'A') socketRef.current.emit('advanceQuestionForOptionA', { examId: selectedExamId, nextQuestionIndex: nextIdx });
    setCurrentQIdx(prev => ({ ...prev, [selectedExamId]: nextIdx }));
    toast.success(`Question ${nextIdx + 1}`);
  }, [selectedExamId, currentQIdx, selectedExamOption, exams]);

  const exportLogs = useCallback(() => {
    const uniqueSessions = getUniqueSessions(activeSessions);
    const logs = { timestamp: new Date().toISOString(), activeSessions: uniqueSessions, sessionHistory: sessionHistory.slice(0, 50), alerts: alerts.slice(0, 50), realtimeStats };
    const blob = new Blob([JSON.stringify(logs, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `surveillance_logs_${new Date().toISOString().slice(0, 19)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Logs exportés');
  }, [activeSessions, sessionHistory, alerts, realtimeStats, getUniqueSessions]);

  const clearHistory = useCallback(() => {
    if (window.confirm('Supprimer tout l\'historique des sessions ?')) {
      setSessionHistory([]);
      localStorage.removeItem('surveillance_history');
      toast.success('Historique effacé');
    }
  }, []);

  // ── Classements ──────────────────────────────────────────────
const fetchRankings = useCallback(async (examId) => {
  if (!examId) { 
    setRankingsData([]); 
    return; 
  }
  setIsLoadingRankings(true);
  try {
    console.log('[Rankings] 🔍 Chargement classement pour examId:', examId);
    const response = await getRankings(examId);
    console.log('[Rankings] 📦 Réponse:', response);
    
    // ✅ Extraction correcte des rankings
    let rankings = [];
    if (response?.rankings && Array.isArray(response.rankings)) {
      rankings = response.rankings;
    } else if (response?.data?.rankings && Array.isArray(response.data.rankings)) {
      rankings = response.data.rankings;
    } else if (Array.isArray(response)) {
      rankings = response;
    }
    
    console.log('[Rankings] ✅ Classement chargé:', rankings.length, 'entrées');
    setRankingsData(rankings);
    
    if (rankings.length === 0) {
      toast.info('Aucun résultat pour cette épreuve', { icon: 'ℹ️' });
    }
  } catch (err) { 
    console.error('[Rankings] ❌ Erreur:', err);
    setRankingsData([]); 
    if (err.response?.status === 401) {
      toast.error('Session expirée, veuillez vous reconnecter');
    } else if (err.response?.status === 404) {
      toast.info('Aucun résultat pour cette épreuve');
    } else {
      toast.error('Impossible de charger le classement'); 
    }
  } finally { 
    setIsLoadingRankings(false); 
  }
}, []);

// ✅ Ajoutez ce useEffect pour charger automatiquement le classement
// quand une épreuve est sélectionnée
useEffect(() => {
  if (rankingExamId) {
    fetchRankings(rankingExamId);
  }
}, [rankingExamId, fetchRankings])

  // ── Impression classement ────────────────────────────────────
  const printRankings = useCallback(() => {
    if (!rankingsData.length) { toast.error('Aucun classement à imprimer.'); return; }
    const exam = exams.find(e => e._id === rankingExamId);
    const examTitle = exam?.title || 'Épreuve';
    const examDomain = exam?.domain || '';
    const examLevel = exam?.level || '';
    const coverImage = getImageUrl(exam);
    const medals = ['🥇', '🥈', '🥉'];
    const passed = rankingsData.filter(e => e.percentage >= 50).length;
    const avg = (rankingsData.reduce((a, e) => a + (e.percentage || 0), 0) / rankingsData.length).toFixed(1);
    const rows = rankingsData.map((entry, i) => `<tr style="border-bottom:1px solid #e2e8f0; background:${i % 2 === 0 ? '#f8fafc' : '#fff'}"><td style="padding:8px 12px; font-weight:700; text-align:center; font-size:1.1rem;">${i < 3 ? medals[i] : entry.rank}<\/td><td style="padding:8px 12px; font-weight:600;">${entry.studentInfo?.firstName || ''} ${entry.studentInfo?.lastName || ''}<\/td><td style="padding:8px 12px; color:#64748b; font-family:monospace;">${entry.studentInfo?.matricule || 'N/A'}<\/td><td style="padding:8px 12px; text-align:center;">${entry.score}<\/td><td style="padding:8px 12px; text-align:center; font-weight:700; color:${entry.percentage >= 50 ? '#15803d' : '#dc2626'};">${entry.percentage}%<\/td><td style="padding:8px 12px; text-align:center;">${entry.resultUrl ? `<a href="${NODE_BACKEND_URL}${entry.resultUrl}" target="_blank" style="color:#7c3aed;font-weight:600;">PDF</a>` : '—'}<\/td><\/tr>`).join('');
    const win = window.open('', '_blank');
    win.document.write(`<!DOCTYPE html><html><head><title>Classement — ${examTitle}</title><style>body{font-family:Arial,sans-serif;margin:20px;}table{border-collapse:collapse;width:100%;}th,td{padding:8px;text-align:left;border-bottom:1px solid #ddd;}th{background:#f2f2f2;}.exam-image{max-width:200px;margin-bottom:20px;border-radius:8px;}</style></head><body><h1>Classement - ${examTitle}</h1>${coverImage ? `<img src="${coverImage}" alt="${examTitle}" class="exam-image" onerror="this.style.display='none'" />` : ''}${examDomain ? `<p><strong>Domaine:</strong> ${examDomain}</p>` : ''}${examLevel ? `<p><strong>Niveau:</strong> ${examLevel}</p>` : ''}<p>Moyenne: ${avg}% | Taux de réussite: ${((passed / rankingsData.length) * 100).toFixed(1)}% | ${rankingsData.length} candidats</p><table><thead><tr><th>Rang</th><th>Candidat</th><th>Matricule</th><th>Score</th><th>%</th><th>Bulletin</th></tr></thead><tbody>${rows}</tbody></table><script>window.onload=()=>{window.print();setTimeout(()=>window.close(),500);}<\/script></body></html>`);
    win.document.close();
  }, [rankingsData, rankingExamId, exams, getImageUrl]);

  // ── Chart données ────────────────────────────────────────────
  const chartData = {
    labels: ['Moyenne', 'Médiane', 'Max', 'Min'],
    datasets: [{ label: 'Scores (%)', data: realtimeStats ? [realtimeStats.averageScore, realtimeStats.medianScore, realtimeStats.highestScore, realtimeStats.lowestScore] : [0, 0, 0, 0], backgroundColor: ['rgba(59,130,246,0.65)', 'rgba(139,92,246,0.65)', 'rgba(16,185,129,0.65)', 'rgba(239,68,68,0.65)'], borderColor: ['#3b82f6', '#8b5cf6', '#10b981', '#ef4444'], borderWidth: 2, borderRadius: 6 }],
  };
  const chartOptions = { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: '#94a3b8' } }, title: { display: false } }, scales: { y: { min: 0, max: 100, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94a3b8' } }, x: { grid: { display: false }, ticks: { color: '#94a3b8' } } } };

  if (accessDenied) {
    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #05071a, #0a0f2e)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
        <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid #ef4444', borderRadius: 24, padding: 48, textAlign: 'center', maxWidth: 500 }}>
          <Shield size={64} color="#ef4444" style={{ marginBottom: 16 }} />
          <h2 style={{ color: '#f8fafc', marginBottom: 12 }}>Accès non autorisé</h2>
          <p style={{ color: '#ef4444', marginBottom: 24 }}>Cette page est réservée aux opérateurs, enseignants et administrateurs.<br />Votre rôle actuel: <strong>{user?.role || 'inconnu'}</strong></p>
          <button onClick={() => navigate('/evaluate')} style={{ padding: '10px 24px', background: 'linear-gradient(135deg, #3b82f6, #2563eb)', border: 'none', borderRadius: 8, color: 'white', cursor: 'pointer' }}>Retour au tableau de bord</button>
        </div>
      </div>
    );
  }

  // Composant ConnectionBadge interne
  const ConnectionBadge = () => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '5px 14px', borderRadius: '999px', background: isConnected ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', border: `1px solid ${isConnected ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`, fontSize: '0.75rem', fontWeight: 600, color: isConnected ? '#10b981' : '#ef4444' }}>
      {isConnected ? <Wifi size={12} /> : <WifiOff size={12} />}
      {isConnected ? 'Connecté' : socketError ? `Erreur: ${socketError.slice(0, 30)}` : 'Déconnecté'}
      {reconnectAttempt > 0 && !isConnected && <span style={{ marginLeft: '4px', fontSize: '0.65rem' }}>(tentative {reconnectAttempt})</span>}
    </div>
  );

  // Composant TerminalCard
  const TerminalCard = ({ terminal }) => {
    const colors = {
      connected: { bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.25)', dot: '#10b981', label: 'En attente' },
      exam_distributed: { bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.25)', dot: '#f59e0b', label: 'Épreuve reçue' },
    };
    const c = colors[terminal.status] || colors.connected;
    return (
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: c.bg, border: `1px solid ${c.border}`, borderRadius: '10px', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><Monitor size={16} color={c.dot} /><div><div style={{ color: '#e2e8f0', fontSize: '0.8rem', fontFamily: 'monospace' }}>{terminal.sessionId?.slice(0, 14) || terminal.socketId?.slice(0, 14)}…</div>{terminal.currentExamId && <div style={{ color: '#64748b', fontSize: '0.68rem', marginTop: '2px' }}>Exam ID: {terminal.currentExamId.slice(0, 8)}…</div>}</div></div>
        <span style={{ display: 'flex', alignItems: 'center', gap: '5px', color: c.dot, fontSize: '0.72rem', fontWeight: 600, padding: '3px 10px', borderRadius: '999px', background: `${c.dot}18` }}><span style={{ width: 6, height: 6, borderRadius: '50%', background: c.dot, display: 'inline-block', animation: terminal.status === 'connected' ? 'pulse 2s infinite' : 'none' }} />{c.label}</span>
      </motion.div>
    );
  };

  // Composant StudentCard
  const StudentCard = React.memo(({ student, examTitle, examInfo, backendUrl, onAlert }) => {
    const statusConfig = {
      composing: { color: '#3b82f6', label: 'En cours' },
      finished: { color: '#10b981', label: 'Terminé' },
      'forced-finished': { color: '#f59e0b', label: 'Clôturé' },
      waiting: { color: '#8b5cf6', label: 'En attente' },
    };
    const cfg = statusConfig[student.status] || statusConfig.composing;
    const timeSinceLastUpdate = Date.now() - (student.lastUpdate || Date.now());
    const isStalled = student.status === 'composing' && timeSinceLastUpdate > 300000 && student.progress < 100;

    useEffect(() => {
      if (isStalled && onAlert) onAlert({ type: 'stalled', message: `⚠️ ${student.studentInfo?.firstName} ${student.studentInfo?.lastName} - Progression bloquée`, severity: 'medium' });
    }, [isStalled, onAlert, student.studentInfo]);

    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} style={{ background: isStalled ? 'rgba(245,158,11,0.1)' : 'rgba(255,255,255,0.03)', border: `1px solid ${isStalled ? '#f59e0b' : cfg.color}35`, borderRadius: '12px', padding: '16px', position: 'relative' }}>
        {isStalled && <div style={{ position: 'absolute', top: 8, right: 8, background: '#f59e0b', borderRadius: '999px', padding: '2px 6px', fontSize: '0.6rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '4px' }}><AlertTriangle size={10} /> Bloqué</div>}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
          <div><div style={{ color: '#f1f5f9', fontWeight: 600, fontSize: '0.95rem' }}>{student.studentInfo?.firstName} {student.studentInfo?.lastName}</div><div style={{ color: '#64748b', fontSize: '0.8rem', marginTop: '2px' }}>{student.studentInfo?.matricule || 'N/A'}{student.studentInfo?.level && ` · ${student.studentInfo.level}`}</div></div>
          <span style={{ background: `${cfg.color}18`, color: cfg.color, fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.05em', padding: '4px 10px', borderRadius: '999px', textTransform: 'uppercase' }}>{cfg.label}</span>
        </div>
        <div style={{ color: '#64748b', fontSize: '0.78rem', marginBottom: '10px' }}>{examTitle}</div>
        {examInfo && <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
          {examInfo.domain && <span style={{ fontSize: '0.6rem', padding: '2px 6px', background: 'rgba(59,130,246,0.15)', borderRadius: 4, color: '#60a5fa' }}><Tag size={8} /> {examInfo.domain}</span>}
          {examInfo.level && <span style={{ fontSize: '0.6rem', padding: '2px 6px', background: 'rgba(139,92,246,0.15)', borderRadius: 4, color: '#a78bfa' }}><Layers size={8} /> {examInfo.level}</span>}
          {examInfo.subject && <span style={{ fontSize: '0.6rem', padding: '2px 6px', background: 'rgba(16,185,129,0.15)', borderRadius: 4, color: '#34d399' }}><BookOpen size={8} /> {examInfo.subject}</span>}
        </div>}
        {student.progress !== undefined && <div style={{ marginBottom: '10px' }}><div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#64748b', marginBottom: '5px' }}><span>Progression</span><span style={{ color: '#94a3b8', fontWeight: 600 }}>{student.progress}%</span></div><div style={{ width: '100%', height: '5px', background: 'rgba(255,255,255,0.07)', borderRadius: '3px', overflow: 'hidden' }}><motion.div initial={{ width: 0 }} animate={{ width: `${student.progress}%` }} transition={{ duration: 0.5, ease: 'easeOut' }} style={{ height: '100%', background: student.status === 'finished' ? 'linear-gradient(90deg, #10b981, #34d399)' : 'linear-gradient(90deg, #3b82f6, #60a5fa)', borderRadius: '3px' }} /></div></div>}
        {student.score !== undefined && <div style={{ display: 'flex', gap: '12px', padding: '8px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', fontSize: '0.78rem' }}><span style={{ color: '#64748b' }}>Score</span><span style={{ color: '#f1f5f9', fontWeight: 600 }}>{student.score} / {student.totalQuestions}</span><span style={{ color: '#64748b' }}>|</span><span style={{ color: student.percentage >= 70 ? '#10b981' : '#ef4444', fontWeight: 700 }}>{student.percentage}%</span></div>}
        {student.resultUrl && <motion.a href={`${backendUrl}${student.resultUrl}`} target="_blank" rel="noopener noreferrer" whileHover={{ scale: 1.02 }} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', marginTop: '10px', padding: '6px 12px', background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.4)', borderRadius: '8px', color: '#a78bfa', fontSize: '0.78rem', fontWeight: 600, textDecoration: 'none' }}><Download size={13} /> Bulletin PDF</motion.a>}
      </motion.div>
    );
  });

  // Composant SessionHistoryPanel
  const SessionHistoryPanel = ({ history, onClose, onExport, onClear }) => {
    const [filter, setFilter] = useState('');
    const [expanded, setExpanded] = useState({});
    const filteredHistory = useMemo(() => history.filter(s => s.examTitle?.toLowerCase().includes(filter.toLowerCase()) || s.examId?.toLowerCase().includes(filter.toLowerCase()) || s.domain?.toLowerCase().includes(filter.toLowerCase()) || s.level?.toLowerCase().includes(filter.toLowerCase())), [history, filter]);
    return (
      <motion.div initial={{ opacity: 0, x: 300 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 300 }} style={{ position: 'fixed', right: 0, top: 0, bottom: 0, zIndex: 100, width: '400px', background: '#0f172a', borderLeft: '1px solid rgba(59,130,246,0.2)', boxShadow: '-4px 0 24px rgba(0,0,0,0.4)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '20px', borderBottom: '1px solid rgba(59,130,246,0.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><History size={20} color="#3b82f6" /><h3 style={{ color: '#f8fafc', fontWeight: 700 }}>Historique des sessions</h3></div><div style={{ display: 'flex', gap: '8px' }}><button onClick={onExport} style={{ padding: '6px 10px', background: '#10b981', border: 'none', borderRadius: 6, color: '#fff', cursor: 'pointer' }}><Download size={14} /></button><button onClick={onClear} style={{ padding: '6px 10px', background: '#ef4444', border: 'none', borderRadius: 6, color: '#fff', cursor: 'pointer' }}><Trash2 size={14} /></button><button onClick={onClose} style={{ padding: '6px 10px', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 6, color: '#94a3b8', cursor: 'pointer' }}><X size={14} /></button></div></div>
        <div style={{ padding: '16px' }}><input type="text" placeholder="Filtrer par épreuve, domaine, niveau..." value={filter} onChange={e => setFilter(e.target.value)} style={{ width: '100%', padding: '8px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 8, color: '#f8fafc', outline: 'none' }} /></div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px 16px' }}>{filteredHistory.length === 0 ? <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>Aucune session enregistrée</div> : filteredHistory.map((session, idx) => (<motion.div key={session.id || idx} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(59,130,246,0.15)', borderRadius: 12, marginBottom: 12, overflow: 'hidden' }}><div onClick={() => setExpanded(prev => ({ ...prev, [idx]: !prev[idx] }))} style={{ padding: '12px 16px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><div><div style={{ color: '#f8fafc', fontWeight: 600 }}>{session.examTitle}</div><div style={{ color: '#64748b', fontSize: '0.7rem' }}>{new Date(session.startTime).toLocaleString()} · {session.students?.length || 0} étudiants</div>{(session.domain || session.level) && <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>{session.domain && <span style={{ fontSize: '0.6rem', padding: '1px 5px', background: 'rgba(59,130,246,0.15)', borderRadius: 4, color: '#60a5fa' }}>{session.domain}</span>}{session.level && <span style={{ fontSize: '0.6rem', padding: '1px 5px', background: 'rgba(139,92,246,0.15)', borderRadius: 4, color: '#a78bfa' }}>{session.level}</span>}</div>}</div>{expanded[idx] ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</div><AnimatePresence>{expanded[idx] && <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ borderTop: '1px solid rgba(59,130,246,0.1)', padding: '12px 16px' }}><div style={{ fontSize: '0.75rem', color: '#94a3b8' }}><div>ID: {session.examId}</div><div>Durée: {session.duration} min</div><div>Option: {session.examOption}</div><div>Domaine: {session.domain || 'N/A'}</div><div>Niveau: {session.level || 'N/A'}</div>{session.coverImage && <div style={{ marginTop: '8px' }}><img src={session.coverImage} alt="Couverture" style={{ maxWidth: '100%', maxHeight: '80px', borderRadius: '8px', objectFit: 'contain', background: 'rgba(0,0,0,0.3)', padding: '4px' }} onError={(e) => { e.target.style.display = 'none'; }} /></div>}<div>Taux réussite: {session.successRate || 0}%</div><div>Score moyen: {session.avgScore || 0}%</div></div>{session.students?.length > 0 && <div style={{ marginTop: 8 }}><div style={{ fontSize: '0.7rem', color: '#64748b', marginBottom: 4 }}>Participants:</div>{session.students.slice(0, 5).map((s, i) => <div key={i} style={{ fontSize: '0.7rem', color: '#e2e8f0' }}>{s.name} - {s.score}/{s.total} ({s.percentage}%)</div>)}{session.students.length > 5 && <div style={{ fontSize: '0.7rem', color: '#64748b' }}>+{session.students.length - 5} autres</div>}</div>}</motion.div>}</AnimatePresence></motion.div>))}</div>
      </motion.div>
    );
  };

  // ══════════════════════════════════════════════════════════════
  //  RENDER
  // ══════════════════════════════════════════════════════════════
  return (
    <div style={{ minHeight: '100vh', fontFamily: "'DM Sans', sans-serif", background: 'linear-gradient(135deg, #05071a 0%, #0a0f2e 60%, #05071a 100%)', position: 'relative', overflow: 'hidden', padding: '0 0 40px' }}>
      <div style={{ position: 'fixed', inset: 0, backgroundImage: 'linear-gradient(rgba(59,130,246,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,0.03) 1px, transparent 1px)', backgroundSize: '40px 40px', pointerEvents: 'none', zIndex: 0 }} />
      <div style={{ position: 'fixed', top: '-15%', left: '50%', transform: 'translateX(-50%)', width: '70vw', height: '50vh', background: 'radial-gradient(ellipse, rgba(37,99,235,0.12) 0%, transparent 70%)', pointerEvents: 'none', zIndex: 0 }} />

      <header style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(5,7,26,0.92)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(59,130,246,0.12)', padding: '0 28px', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px' }}>
        <div style={{ fontFamily: "'Sora', sans-serif", fontWeight: 800, fontSize: '1.1rem', letterSpacing: '-0.02em', background: 'linear-gradient(135deg, #60a5fa, #a78bfa)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>NA²QUIZ · SURVEILLANCE</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <ConnectionBadge />
          <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }} onClick={() => setShowHistory(true)} style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '8px 16px', borderRadius: '8px', background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.3)', color: '#60a5fa', fontSize: '0.875rem', fontWeight: 500, cursor: 'pointer' }}><History size={15} /> Historique</motion.button>
          <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }} onClick={() => setShowAlerts(true)} style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '8px 16px', borderRadius: '8px', background: alerts.length > 0 ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.06)', border: `1px solid ${alerts.length > 0 ? '#ef4444' : 'rgba(255,255,255,0.1)'}`, color: alerts.length > 0 ? '#ef4444' : '#cbd5e1', cursor: 'pointer', position: 'relative' }}><AlertCircle size={15} /> Alertes{alerts.length > 0 && <span style={{ position: 'absolute', top: -4, right: -4, background: '#ef4444', borderRadius: '999px', width: '16px', height: '16px', fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>{alerts.length}</span>}</motion.button>
          <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }} onClick={() => { getActiveSessions().then(r => { if (r.data?.sessions) { const enriched = r.data.sessions.map(s => { if (s.type === 'student' && s.currentExamId) return { ...s, examInfo: getExamInfo(s.currentExamId) }; return s; }); setActiveSessions(enriched); } }); if (socketRef.current?.connected) socketRef.current.emit('getSurveillanceData'); toast.success('Actualisé'); }} style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '8px 16px', borderRadius: '8px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#cbd5e1', fontSize: '0.875rem', fontWeight: 500, cursor: 'pointer' }}><RefreshCw size={15} /> Rafraîchir</motion.button>
          <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }} onClick={exportLogs} style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '8px 16px', borderRadius: '8px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#cbd5e1', fontSize: '0.875rem', fontWeight: 500, cursor: 'pointer' }}><FileText size={15} /> Export Logs</motion.button>
          <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }} onClick={() => navigate(-1)} style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '8px 16px', borderRadius: '8px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#cbd5e1', fontSize: '0.875rem', fontWeight: 500, cursor: 'pointer' }}><Home size={15} /> Retour</motion.button>
        </div>
      </header>

      <main style={{ position: 'relative', zIndex: 1, maxWidth: '1440px', margin: '0 auto', padding: '0 24px' }}>
        <motion.h1 initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} style={{ fontFamily: "'Sora', sans-serif", fontSize: '1.875rem', fontWeight: 700, color: '#f8fafc', textAlign: 'center', marginBottom: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}><Eye size={28} style={{ color: '#3b82f6' }} /> Tableau de Surveillance <span style={{ background: 'rgba(59,130,246,0.15)', color: '#60a5fa', padding: '4px 12px', borderRadius: '999px', fontSize: '0.875rem', fontWeight: 600 }}>{totalStudents} étudiant{totalStudents > 1 ? 's' : ''}</span></motion.h1>

        {/* LIGNE 1 : Contrôle + Terminaux + Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '20px', marginBottom: '20px' }}>

          {/* Panneau gestion épreuves avec TOUTES LES CONFIGURATIONS A à K */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} style={{ background: 'rgba(15,23,42,0.75)', backdropFilter: 'blur(12px)', border: '1px solid rgba(59,130,246,0.15)', borderRadius: '20px', padding: '22px' }}>
            <h2 style={{ fontFamily: "'Sora', sans-serif", fontSize: '1.1rem', fontWeight: 700, color: '#f8fafc', marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}><Radio size={18} color="#3b82f6" /> Gestion des Épreuves</h2>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '7px' }}>Épreuve à distribuer</label>
              <select value={selectedExamId} onChange={e => setSelectedExamId(e.target.value)} style={{ width: '100%', padding: '10px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: '10px', color: '#f8fafc', fontSize: '0.9rem', outline: 'none' }}>
                <option value="">-- Choisir --</option>
                {exams.map(e => <option key={e._id} value={e._id}>{e.title} {e.domain ? `(${e.domain})` : ''}</option>)}
              </select>
            </div>

            {/* ✅ LISTE COMPLÈTE DES CONFIGURATIONS A à K */}
            <div style={{ marginBottom: '18px' }}>
              <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}><Settings size={13} color="#3b82f6" /> Configuration de l'épreuve</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '8px', maxHeight: '300px', overflowY: 'auto' }}>
                {EXAM_CONFIGURATIONS.map((cfg) => (
                  <label key={cfg.key} style={{ display: 'flex', alignItems: 'flex-start', padding: '10px', background: selectedExamOption === cfg.key ? `${cfg.color}12` : 'rgba(255,255,255,0.02)', border: `1px solid ${selectedExamOption === cfg.key ? `${cfg.color}44` : 'rgba(255,255,255,0.06)'}`, borderRadius: '10px', cursor: 'pointer', gap: '8px' }}>
                    <input type="radio" name="examOption" value={cfg.key} checked={selectedExamOption === cfg.key} onChange={e => setSelectedExamOption(e.target.value)} style={{ accentColor: cfg.color, marginTop: '2px' }} />
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '24px', height: '24px', borderRadius: '4px', background: `${cfg.color}22`, color: cfg.color, fontSize: '0.7rem', fontWeight: 800 }}>{cfg.key}</span><span style={{ color: '#f8fafc', fontSize: '0.8rem', fontWeight: 600 }}>{cfg.label}</span></div>
                      <p style={{ fontSize: '0.6rem', color: '#64748b', marginTop: '4px' }}>{cfg.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {selectedExamOption === 'A' && <div style={{ marginBottom: '16px', padding: '8px 12px', background: 'rgba(239,68,68,0.1)', borderRadius: '8px' }}><label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}><input type="checkbox" checked={autoAdvanceOptionA} onChange={e => setAutoAdvanceOptionA(e.target.checked)} style={{ accentColor: '#ef4444' }} /><span style={{ color: '#ef4444', fontSize: '0.8rem' }}>Avancement automatique des questions (60s)</span></label><p style={{ color: '#64748b', fontSize: '0.7rem', marginTop: '4px' }}>{autoAdvanceOptionA ? '✓ Avancement automatique actif' : '✗ Avancement manuel uniquement'}</p></div>}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleDistributeExam} disabled={!selectedExamId || !isConnected} style={{ padding: '11px', borderRadius: '10px', border: 'none', background: (!selectedExamId || !isConnected) ? 'rgba(59,130,246,0.25)' : 'linear-gradient(135deg, #3b82f6, #2563eb)', color: '#fff', fontWeight: 600, cursor: !selectedExamId ? 'not-allowed' : 'pointer', fontSize: '0.875rem' }}>📡 Distribuer l'épreuve</motion.button>
              {selectedExamId && <motion.button initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleStartExam} disabled={isStartingExam} style={{ padding: '12px', borderRadius: '10px', border: 'none', background: isStartingExam ? 'rgba(16,185,129,0.5)' : 'linear-gradient(135deg, #10b981, #059669)', color: '#fff', fontWeight: 700, cursor: isStartingExam ? 'wait' : 'pointer', fontSize: '0.875rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: isStartingExam ? 'none' : '0 4px 14px rgba(16,185,129,0.3)', opacity: isStartingExam ? 0.7 : 1 }}>{isStartingExam ? <><RefreshCw size={15} style={{ animation: 'spin 1s linear infinite' }} /> Démarrage en cours...</> : <><Play size={15} /> COMMENCER L'ÉPREUVE <span style={{ background: 'rgba(255,255,255,0.2)', padding: '2px 8px', borderRadius: '999px', fontSize: '0.72rem' }}>{waitingCounts[selectedExamId] || 0} en attente</span></>}</motion.button>}
              {selectedExamId && (selectedExamOption === 'B' || selectedExamOption === 'A') && <motion.button initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleAdvanceQuestion} style={{ padding: '12px', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg, #4f46e5, #6366f1)', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: '0.875rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: '0 4px 14px rgba(79,70,229,0.3)', marginTop: '10px' }}><ArrowRight size={15} /> QUESTION SUIVANTE {currentQIdx[selectedExamId] !== undefined && <span style={{ background: 'rgba(255,255,255,0.2)', padding: '2px 8px', borderRadius: '999px', fontSize: '0.72rem' }}>Q{(currentQIdx[selectedExamId] ?? 0) + 1} → Q{(currentQIdx[selectedExamId] ?? 0) + 2}</span>}</motion.button>}
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleFinishExam} disabled={!selectedExamId || !isConnected} style={{ padding: '11px', borderRadius: '10px', border: 'none', background: (!selectedExamId || !isConnected) ? 'rgba(239,68,68,0.25)' : 'linear-gradient(135deg, #ef4444, #dc2626)', color: '#fff', fontWeight: 600, cursor: !selectedExamId ? 'not-allowed' : 'pointer', fontSize: '0.875rem' }}>⏹ Terminer l'épreuve (tous)</motion.button>
            </div>
          </motion.div>

          {/* Panneau terminaux */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} style={{ background: 'rgba(15,23,42,0.75)', backdropFilter: 'blur(12px)', border: '1px solid rgba(59,130,246,0.15)', borderRadius: '20px', padding: '22px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div><h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#f8fafc', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '7px' }}><Terminal size={16} color="#10b981" /> Terminaux en attente <span style={{ marginLeft: 'auto', background: 'rgba(16,185,129,0.15)', color: '#10b981', fontSize: '0.72rem', fontWeight: 700, padding: '2px 9px', borderRadius: '999px' }}>{terminalsWaiting.length}</span></h3>{terminalsWaiting.length === 0 ? <p style={{ color: '#475569', fontSize: '0.8rem', textAlign: 'center', padding: '12px 0' }}>Aucun terminal connecté</p> : <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}><AnimatePresence>{terminalsWaiting.map(t => <TerminalCard key={t.socketId || t.sessionId} terminal={t} />)}</AnimatePresence></div>}</div>
            {studentsWaitingForStart.length > 0 && <div><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}><h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '7px' }}><Clock size={16} color="#8b5cf6" /> En attente de démarrage <span style={{ background: 'rgba(139,92,246,0.15)', color: '#8b5cf6', fontSize: '0.72rem', fontWeight: 700, padding: '2px 9px', borderRadius: '999px' }}>{studentsWaitingForStart.length}</span></h3><motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => { getActiveSessions().then(r => { if (r.data?.sessions) { const enriched = r.data.sessions.map(s => { if (s.type === 'student' && s.currentExamId) return { ...s, examInfo: getExamInfo(s.currentExamId) }; return s; }); setActiveSessions(enriched); } }); }} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 8px', borderRadius: '6px', background: 'rgba(139,92,246,0.2)', border: '1px solid rgba(139,92,246,0.3)', color: '#8b5cf6', fontSize: '0.7rem', cursor: 'pointer' }}><RefreshCw size={12} /> Rafraîchir</motion.button></div><div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '300px', overflowY: 'auto' }}><AnimatePresence>{studentsWaitingForStart.map(s => <motion.div key={s.socketId || s.studentInfo?.matricule || s.sessionId} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.25)', borderRadius: '10px' }}><div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: '#8b5cf6', display: 'inline-block', animation: 'pulse 1.5s infinite' }} /><div><div style={{ color: '#e2e8f0', fontSize: '0.8rem', fontWeight: 600 }}>{s.studentInfo?.firstName} {s.studentInfo?.lastName}</div><div style={{ color: '#64748b', fontSize: '0.68rem' }}>{s.studentInfo?.matricule || s.socketId?.slice(0, 10)}</div>{s.examInfo?.domain && <div style={{ display: 'flex', gap: '4px', marginTop: '2px' }}><span style={{ fontSize: '0.55rem', color: '#60a5fa' }}>{s.examInfo.domain}</span></div>}</div></div><span style={{ color: '#8b5cf6', fontSize: '0.72rem', fontWeight: 600 }}>Prêt</span></motion.div>)}</AnimatePresence></div></div>}
            {selectedExamId && waitingCounts[selectedExamId] !== undefined && <div style={{ marginTop: '8px', padding: '8px', background: 'rgba(59,130,246,0.15)', borderRadius: '8px', textAlign: 'center' }}><span style={{ color: '#3b82f6', fontWeight: 700 }}>{waitingCounts[selectedExamId]} étudiant(s) en salle d'attente</span></div>}
            {terminalsWithExam.length > 0 && <div><h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#f8fafc', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '7px' }}><Monitor size={16} color="#f59e0b" /> Épreuve envoyée <span style={{ marginLeft: 'auto', background: 'rgba(245,158,11,0.15)', color: '#f59e0b', fontSize: '0.72rem', fontWeight: 700, padding: '2px 9px', borderRadius: '999px' }}>{terminalsWithExam.length}</span></h3><div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}><AnimatePresence>{terminalsWithExam.map(t => <TerminalCard key={t.socketId || t.sessionId} terminal={t} />)}</AnimatePresence></div></div>}
            <div style={{ marginTop: 'auto', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#64748b' }}><span>Total terminaux</span><span style={{ color: '#94a3b8', fontWeight: 600 }}>{totalTerminals}</span></div>
          </motion.div>

          {/* Stats temps réel */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} style={{ background: 'rgba(15,23,42,0.75)', backdropFilter: 'blur(12px)', border: '1px solid rgba(59,130,246,0.15)', borderRadius: '20px', padding: '22px' }}>
            <h2 style={{ fontFamily: "'Sora', sans-serif", fontSize: '1.1rem', fontWeight: 700, color: '#f8fafc', marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}><BarChart3 size={18} color="#8b5cf6" /> Statistiques Temps Réel</h2>
            {realtimeStats ? <>
              <div style={{ marginBottom: '14px' }}><p style={{ color: '#64748b', fontSize: '0.75rem', marginBottom: '3px' }}>Épreuve active</p><p style={{ color: '#f1f5f9', fontWeight: 600, fontSize: '0.9rem' }}>{getExamTitle(realtimeStats.examId)}</p></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>{[
                { label: 'Participants', value: realtimeStats.activeStudentsCount, color: '#3b82f6' },
                { label: 'Taux réussite', value: `${(realtimeStats.passRate ?? 0).toFixed(1)}%`, color: '#10b981' },
                { label: 'Moyenne', value: `${(realtimeStats.averageScore ?? 0).toFixed(1)}%`, color: '#8b5cf6' },
                { label: 'Médiane', value: `${(realtimeStats.medianScore ?? 0).toFixed(1)}%`, color: '#f59e0b' },
              ].map(stat => <div key={stat.label} style={{ background: `${stat.color}12`, border: `1px solid ${stat.color}25`, padding: '10px', borderRadius: '10px' }}><p style={{ color: '#64748b', fontSize: '0.68rem', marginBottom: '3px' }}>{stat.label}</p><p style={{ color: stat.color, fontSize: '1.3rem', fontWeight: 700, lineHeight: 1 }}>{stat.value}</p></div>)}</div>
              <div style={{ height: '160px' }}><Bar data={chartData} options={chartOptions} /></div>
              <p style={{ color: '#475569', fontSize: '0.68rem', marginTop: '10px', textAlign: 'right' }}>Mise à jour : {new Date(realtimeStats.lastUpdate).toLocaleTimeString()}</p>
            </> : <div style={{ textAlign: 'center', padding: '40px 0' }}><BarChart3 size={32} color="#1e293b" style={{ marginBottom: '12px' }} /><p style={{ color: '#475569', fontSize: '0.85rem' }}>En attente des statistiques…</p><p style={{ color: '#334155', fontSize: '0.75rem', marginTop: '6px' }}>Les statistiques apparaissent quand des étudiants commencent l'épreuve.</p></div>}
          </motion.div>
        </div>

        {/* LIGNE 2 : Étudiants en composition */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} style={{ background: 'rgba(15,23,42,0.75)', backdropFilter: 'blur(12px)', border: '1px solid rgba(59,130,246,0.15)', borderRadius: '20px', padding: '22px' }}>
          <h2 style={{ fontFamily: "'Sora', sans-serif", fontSize: '1.1rem', fontWeight: 700, color: '#f8fafc', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}><Users size={18} color="#3b82f6" /> Étudiants en Composition {['composing', 'finished', 'forced-finished'].map(st => { const cnt = studentsActive.filter(s => s.status === st).length; if (!cnt) return null; const colors = { composing: '#3b82f6', finished: '#10b981', 'forced-finished': '#f59e0b' }; const labels = { composing: 'en cours', finished: 'terminé', 'forced-finished': 'clôturé' }; return <span key={st} style={{ background: `${colors[st]}15`, color: colors[st], padding: '2px 10px', borderRadius: '999px', fontSize: '0.72rem', fontWeight: 700 }}>{cnt} {labels[st]}</span>; })}</h2>
          {studentsActive.length === 0 ? <div style={{ textAlign: 'center', padding: '40px 0' }}><Users size={32} color="#1e293b" style={{ marginBottom: '12px' }} /><p style={{ color: '#475569', fontSize: '0.85rem' }}>Aucun étudiant en composition pour l'instant.</p></div> : <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: '14px' }}><AnimatePresence>{studentsActive.map(student => <StudentCard key={student.socketId || student.sessionId || student.studentInfo?.matricule || Math.random()} student={student} examTitle={getExamTitle(student.currentExamId)} examInfo={getExamInfo(student.currentExamId)} backendUrl={NODE_BACKEND_URL} onAlert={addAlert} />)}</AnimatePresence></div>}
        </motion.div>

        {/* LIGNE 3 : Classement */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} style={{ background: 'rgba(15,23,42,0.75)', backdropFilter: 'blur(12px)', border: '1px solid rgba(139,92,246,0.2)', borderRadius: '20px', padding: '22px', marginTop: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '12px' }}><h2 style={{ fontFamily: "'Sora', sans-serif", fontSize: '1.1rem', fontWeight: 700, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}><Trophy size={18} color="#f59e0b" /> Classement des Compétiteurs {rankingsData.length > 0 && <span style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b', padding: '2px 10px', borderRadius: '999px', fontSize: '0.72rem', fontWeight: 700 }}>{rankingsData.length} candidats</span>}</h2><div style={{ display: 'flex', gap: '8px' }}>{rankingsData.length > 0 && <><motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={() => fetchRankings(rankingExamId)} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 14px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', fontSize: '0.8rem', cursor: 'pointer' }}><RefreshCw size={13} /> Actualiser</motion.button><motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={printRankings} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 14px', borderRadius: '8px', background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', border: 'none', color: '#fff', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}><Printer size={13} /> Imprimer PDF</motion.button></>}</div></div>
          <div style={{ marginBottom: '18px' }}><label style={{ display: 'block', fontSize: '0.78rem', color: '#64748b', marginBottom: '7px' }}>Sélectionner une épreuve</label><select value={rankingExamId} onChange={e => setRankingExamId(e.target.value)} style={{ width: '100%', maxWidth: '520px', padding: '10px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(139,92,246,0.25)', borderRadius: '10px', color: rankingExamId ? '#f8fafc' : '#64748b', fontSize: '0.88rem', outline: 'none' }}><option value="">-- Choisir une épreuve --</option>{exams.map(e => <option key={e._id} value={e._id}>{e.title} {e.domain ? `(${e.domain})` : ''}</option>)}</select></div>
          {!rankingExamId ? <div style={{ textAlign: 'center', padding: '36px 0' }}><Trophy size={36} color="#1e293b" style={{ marginBottom: '12px' }} /><p style={{ color: '#475569', fontSize: '0.85rem' }}>Sélectionnez une épreuve pour afficher le classement.</p></div> : isLoadingRankings ? <div style={{ textAlign: 'center', padding: '36px 0' }}><RefreshCw size={24} color="#8b5cf6" style={{ animation: 'spin 1s linear infinite', marginBottom: '10px' }} /><p style={{ color: '#64748b', fontSize: '0.85rem' }}>Chargement…</p></div> : rankingsData.length === 0 ? <div style={{ textAlign: 'center', padding: '36px 0', color: '#475569', fontSize: '0.85rem' }}>Aucun résultat enregistré pour cette épreuve.</div> : <div style={{ overflowX: 'auto' }}><table style={{ width: '100%', borderCollapse: 'collapse' }}><thead><tr style={{ borderBottom: '2px solid rgba(139,92,246,0.3)' }}><th style={{ padding: '10px 12px', textAlign: 'left', color: '#94a3b8' }}>Rang</th><th style={{ padding: '10px 12px', textAlign: 'left', color: '#94a3b8' }}>Image</th><th style={{ padding: '10px 12px', textAlign: 'left', color: '#94a3b8' }}>Étudiant</th><th style={{ padding: '10px 12px', textAlign: 'left', color: '#94a3b8' }}>Score</th><th style={{ padding: '10px 12px', textAlign: 'left', color: '#94a3b8' }}>%</th><th style={{ padding: '10px 12px', textAlign: 'left', color: '#94a3b8' }}>Domaine</th><th style={{ padding: '10px 12px', textAlign: 'left', color: '#94a3b8' }}>Niveau</th></tr></thead><tbody>{rankingsData.slice(0, 10).map((entry, index) => { const exam = exams.find(e => e._id === rankingExamId); const imageUrl = getImageUrl(exam); return <tr key={entry.resultId || index} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}><td style={{ padding: '10px 12px' }}>{index + 1}</td><td style={{ padding: '10px 12px' }}>{imageUrl ? <img src={imageUrl} alt="" style={{ width: '40px', height: '40px', borderRadius: '6px', objectFit: 'cover', background: '#0f172a', border: '1px solid rgba(139,92,246,0.3)' }} onError={(e) => { e.target.style.display = 'none'; }} /> : <div style={{ width: '40px', height: '40px', borderRadius: '6px', background: 'rgba(139,92,246,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}><ImageIcon size={16} /></div>}</td><td style={{ padding: '10px 12px', color: '#f1f5f9' }}>{entry.studentInfo?.firstName} {entry.studentInfo?.lastName}</td><td style={{ padding: '10px 12px', color: '#f1f5f9' }}>{entry.score}</td><td style={{ padding: '10px 12px' }}><span style={{ color: entry.percentage >= 50 ? '#10b981' : '#ef4444' }}>{entry.percentage}%</span></td><td style={{ padding: '10px 12px', color: '#60a5fa', fontSize: '0.8rem' }}>{exam?.domain || '—'}</td><td style={{ padding: '10px 12px', color: '#a78bfa', fontSize: '0.8rem' }}>{exam?.level || '—'}</td></tr>; })}</tbody></table></div>}
        </motion.div>
      </main>

      {/* Panneaux */}
      <AnimatePresence>{showHistory && <SessionHistoryPanel history={sessionHistory} onClose={() => setShowHistory(false)} onExport={exportLogs} onClear={clearHistory} />}</AnimatePresence>
      <AnimatePresence>{showAlerts && <motion.div initial={{ opacity: 0, x: 300 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 300 }} style={{ position: 'fixed', right: 0, top: 0, bottom: 0, zIndex: 100, width: '380px', background: '#0f172a', borderLeft: '1px solid rgba(239,68,68,0.3)', boxShadow: '-4px 0 24px rgba(0,0,0,0.4)', display: 'flex', flexDirection: 'column' }}><div style={{ padding: '20px', borderBottom: '1px solid rgba(239,68,68,0.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><AlertCircle size={20} color="#ef4444" /><h3 style={{ color: '#f8fafc', fontWeight: 700 }}>Alertes système</h3><span style={{ background: '#ef4444', padding: '2px 8px', borderRadius: '999px', fontSize: '0.7rem', color: '#fff' }}>{alerts.length}</span></div><button onClick={() => setShowAlerts(false)} style={{ padding: '6px 10px', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 6, color: '#94a3b8', cursor: 'pointer' }}><X size={14} /></button></div><div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>{alerts.length === 0 ? <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>Aucune alerte</div> : alerts.map(alert => <motion.div key={alert.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ background: alert.severity === 'high' ? 'rgba(239,68,68,0.1)' : alert.severity === 'medium' ? 'rgba(245,158,11,0.1)' : 'rgba(59,130,246,0.1)', border: `1px solid ${alert.severity === 'high' ? '#ef4444' : alert.severity === 'medium' ? '#f59e0b' : '#3b82f6'}30`, borderRadius: '10px', padding: '12px', marginBottom: '10px' }}><div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>{alert.severity === 'high' && <AlertTriangle size={14} color="#ef4444" />}<span style={{ color: '#f8fafc', fontSize: '0.85rem', fontWeight: 600 }}>{alert.type}</span><span style={{ marginLeft: 'auto', color: '#64748b', fontSize: '0.65rem' }}>{new Date(alert.timestamp).toLocaleTimeString()}</span></div><p style={{ color: '#94a3b8', fontSize: '0.8rem' }}>{alert.message}</p></motion.div>)}</div><div style={{ padding: '16px', borderTop: '1px solid rgba(255,255,255,0.05)' }}><button onClick={() => setAlerts([])} style={{ width: '100%', padding: '8px', background: '#ef4444', border: 'none', borderRadius: '8px', color: '#fff', cursor: 'pointer', fontSize: '0.8rem' }}>Effacer toutes les alertes</button></div></motion.div>}</AnimatePresence>

      <Toaster position="bottom-right" toastOptions={{ style: { background: '#1e293b', color: '#f1f5f9', border: '1px solid rgba(59,130,246,0.2)' } }} />
      <style>{`@keyframes pulse { 0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.5;transform:scale(1.3)} } @keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default SurveillancePage;