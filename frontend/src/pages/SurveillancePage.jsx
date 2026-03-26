/**
 * SurveillancePage.jsx — Page de surveillance NA² QuizApp
 * Version avec liste déroulante pour les sessions
 * Interface web : colonne Bulletin avec liens individuels
 * Impression PDF : document professionnel sans liens
 */

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
  Terminal, Clock, AlertCircle,
  Eye, ArrowRight, RefreshCw,
  Trophy, Printer, Play, Calendar, ChevronUp, ChevronDown
} from 'lucide-react';
import { getExams, getResults, getActiveSessions, getSurveillanceData } from '../services/api';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

// URL du backend avec fallback
const NODE_BACKEND_URL = process.env.REACT_APP_BACKEND_URL || (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:5000');
const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || NODE_BACKEND_URL;

// Fonction utilitaire pour échapper le HTML
const escapeHtml = (str) => {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};

// ══════════════════════════════════════════════════════════════
//  SOUS-COMPOSANTS
// ══════════════════════════════════════════════════════════════

/* Indicateur de connexion */
const ConnectionBadge = ({ connected, error }) => (
  <div style={{
    display: 'flex', alignItems: 'center', gap: '7px',
    padding: '5px 14px', borderRadius: '999px',
    background: connected
      ? 'rgba(16,185,129,0.1)'
      : 'rgba(239,68,68,0.1)',
    border: `1px solid ${connected ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
    fontSize: '0.75rem', fontWeight: 600,
    color: connected ? '#10b981' : '#ef4444',
  }}>
    <span style={{
      width: 7, height: 7, borderRadius: '50%',
      background: connected ? '#10b981' : '#ef4444',
      animation: connected ? 'pulse 2s infinite' : 'none',
      display: 'inline-block',
    }} />
    {connected ? 'Connecté' : error ? `Erreur: ${error.slice(0, 30)}` : 'Déconnecté'}
  </div>
);

/* Carte terminal */
const TerminalCard = ({ terminal }) => {
  const colors = {
    connected:       { bg: 'rgba(16,185,129,0.08)',  border: 'rgba(16,185,129,0.25)', dot: '#10b981', label: 'En attente' },
    exam_distributed:{ bg: 'rgba(245,158,11,0.08)',  border: 'rgba(245,158,11,0.25)', dot: '#f59e0b', label: 'Épreuve reçue' },
  };
  const c = colors[terminal.status] || colors.connected;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '10px 14px',
        background: c.bg, border: `1px solid ${c.border}`,
        borderRadius: '10px', gap: '8px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <Monitor size={16} color={c.dot} />
        <div>
          <div style={{ color: '#e2e8f0', fontSize: '0.8rem', fontFamily: 'monospace' }}>
            {terminal.sessionId?.slice(0, 14) || terminal.socketId?.slice(0, 14)}…
          </div>
          {terminal.currentExamId && (
            <div style={{ color: '#64748b', fontSize: '0.68rem', marginTop: '2px' }}>
              Exam ID: {terminal.currentExamId.slice(0, 8)}…
            </div>
          )}
        </div>
      </div>
      <span style={{
        display: 'flex', alignItems: 'center', gap: '5px',
        color: c.dot, fontSize: '0.72rem', fontWeight: 600,
        padding: '3px 10px', borderRadius: '999px',
        background: `${c.dot}18`,
      }}>
        <span style={{
          width: 6, height: 6, borderRadius: '50%',
          background: c.dot, display: 'inline-block',
          animation: terminal.status === 'connected' ? 'pulse 2s infinite' : 'none',
        }} />
        {c.label}
      </span>
    </motion.div>
  );
};

/* Carte étudiant en composition */
const StudentCard = ({ student, examTitle, backendUrl }) => {
  const statusConfig = {
    composing:       { color: '#3b82f6', label: 'En cours' },
    finished:        { color: '#10b981', label: 'Terminé' },
    'forced-finished':{ color: '#f59e0b', label: 'Clôturé' },
    waiting:         { color: '#8b5cf6', label: 'En attente' },
  };
  const cfg = statusConfig[student.status] || statusConfig.composing;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: `1px solid ${cfg.color}35`,
        borderRadius: '12px', padding: '16px',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
        <div>
          <div style={{ color: '#f1f5f9', fontWeight: 600, fontSize: '0.95rem' }}>
            {student.studentInfo?.firstName} {student.studentInfo?.lastName}
          </div>
          <div style={{ color: '#64748b', fontSize: '0.8rem', marginTop: '2px' }}>
            {student.studentInfo?.matricule || 'N/A'}
            {student.studentInfo?.level && ` · ${student.studentInfo.level}`}
          </div>
        </div>
        <span style={{
          background: `${cfg.color}18`, color: cfg.color,
          fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.05em',
          padding: '4px 10px', borderRadius: '999px', textTransform: 'uppercase',
        }}>
          {cfg.label}
        </span>
      </div>

      <div style={{ color: '#64748b', fontSize: '0.78rem', marginBottom: '10px' }}>
        {examTitle}
      </div>

      {student.progress !== undefined && (
        <div style={{ marginBottom: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#64748b', marginBottom: '5px' }}>
            <span>Progression</span>
            <span style={{ color: '#94a3b8', fontWeight: 600 }}>{student.progress}%</span>
          </div>
          <div style={{ width: '100%', height: '5px', background: 'rgba(255,255,255,0.07)', borderRadius: '3px', overflow: 'hidden' }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${student.progress}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              style={{
                height: '100%',
                background: student.status === 'finished'
                  ? `linear-gradient(90deg, #10b981, #34d399)`
                  : `linear-gradient(90deg, #3b82f6, #60a5fa)`,
                borderRadius: '3px',
              }}
            />
          </div>
        </div>
      )}

      {student.score !== undefined && (
        <div style={{
          display: 'flex', gap: '12px',
          padding: '8px 12px', borderRadius: '8px',
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.06)',
          fontSize: '0.78rem',
        }}>
          <span style={{ color: '#64748b' }}>Score</span>
          <span style={{ color: '#f1f5f9', fontWeight: 600 }}>
            {student.score} / {student.totalQuestions}
          </span>
          <span style={{ color: '#64748b' }}>|</span>
          <span style={{
            color: student.percentage >= 70 ? '#10b981' : '#ef4444',
            fontWeight: 700,
          }}>
            {student.percentage}%
          </span>
        </div>
      )}

      {student.resultUrl && (
        <motion.a
          href={`${backendUrl}${student.resultUrl}`}
          target="_blank" rel="noopener noreferrer"
          whileHover={{ scale: 1.02 }}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            marginTop: '10px', padding: '6px 12px',
            background: 'rgba(139,92,246,0.15)',
            border: '1px solid rgba(139,92,246,0.4)',
            borderRadius: '8px', color: '#a78bfa',
            fontSize: '0.78rem', fontWeight: 600, textDecoration: 'none',
          }}
        >
          <Download size={13} /> Bulletin PDF
        </motion.a>
      )}
    </motion.div>
  );
};

// ══════════════════════════════════════════════════════════════
//  COMPOSANT PRINCIPAL
// ══════════════════════════════════════════════════════════════
const SurveillancePage = () => {
  const [exams, setExams] = useState([]);
  const [activeSessions, setActiveSessions] = useState([]);
  const [selectedExamId, setSelectedExamId] = useState('');
  const [selectedExamOption, setSelectedExamOption] = useState('A');
  const [realtimeStats, setRealtimeStats] = useState(null);
  const [currentQIdx, setCurrentQIdx] = useState({});
  const [isConnected, setIsConnected] = useState(false);
  const [socketError, setSocketError] = useState(null);
  const [isStartingExam, setIsStartingExam] = useState(false);

  // ── Classement par session (liste déroulante) ────────────────
  const [resultsData, setResultsData] = useState([]);
  const [selectedSessionKey, setSelectedSessionKey] = useState('');
  const [selectedSessionData, setSelectedSessionData] = useState(null);

  const socketRef = useRef(null);
  const navigate = useNavigate();

  // Fonction de filtrage des doublons
  const getUniqueSessions = useCallback((sessions) => {
    const terminalMap = new Map();
    const studentMap = new Map();
    
    sessions.forEach(session => {
      if (session.type === 'terminal') {
        const key = session.sessionId || session.socketId;
        if (!terminalMap.has(key) || 
            (session.lastUpdate > (terminalMap.get(key)?.lastUpdate || 0))) {
          terminalMap.set(key, session);
        }
      } else if (session.type === 'student') {
        const key = session.studentInfo?.matricule || session.sessionId || session.socketId;
        if (!studentMap.has(key) || 
            (session.lastUpdate > (studentMap.get(key)?.lastUpdate || 0))) {
          studentMap.set(key, session);
        }
      }
    });
    
    return [...terminalMap.values(), ...studentMap.values()];
  }, []);

  // ── Connexion Socket.IO ──────────────────────────────────────
  useEffect(() => {
    console.log('[SurveillancePage] Connexion à:', NODE_BACKEND_URL);
    
    const socket = io(SOCKET_URL, {
      transports: ['polling', 'websocket'],
      path: '/socket.io',
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
      forceNew: false,
      autoConnect: true,
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('[SurveillancePage] Socket connecté');
      setIsConnected(true);
      setSocketError(null);
      toast.success('Connecté au serveur de surveillance.');
      socket.emit('registerSession', { type: 'surveillance' });
    });

    socket.on('disconnect', (reason) => {
      console.log('[SurveillancePage] Déconnecté:', reason);
      setIsConnected(false);
      if (reason === 'io server disconnect') {
        toast.error('Déconnecté par le serveur.');
      }
    });

    socket.on('connect_error', (err) => {
      console.error('[SurveillancePage] Erreur de connexion:', err.message);
      setIsConnected(false);
      setSocketError(err.message);
      toast.error(`Erreur de connexion : ${err.message}`);
    });

    socket.on('reconnect_attempt', (n) => {
      console.log('[SurveillancePage] Tentative de reconnexion:', n);
      toast.loading(`Reconnexion (tentative ${n})…`, { id: 'reconnect' });
    });

    socket.on('reconnect', () => {
      toast.dismiss('reconnect');
      toast.success('Reconnecté au serveur.');
    });

    socket.on('sessionUpdate', (data) => {
      setActiveSessions(data.activeSessions || []);
    });

    socket.on('realtimeExamStats', (stats) => {
      setRealtimeStats(stats);
    });

    socket.on('currentQuestionIndexForOptionA', (data) => {
      if (data.examId) {
        setCurrentQIdx(prev => ({ ...prev, [data.examId]: data.questionIndex }));
      }
    });

    socket.on('waitingCountUpdate', (data) => {
      console.log(`[Waiting] Exam ${data.examId}: ${data.count} en attente`);
    });

    socket.on('examStartedConfirm', (data) => {
      console.log('[SurveillancePage] ✅ Confirmation démarrage:', data);
      setIsStartingExam(false);
      if (data.startedCount > 0) {
        toast.success(`✅ ${data.startedCount} étudiant(s) ont commencé l'épreuve !`);
      } else {
        toast.warning('⚠️ Aucun étudiant n\'a pu démarrer l\'épreuve.');
      }
    });

    socket.on('startExamError', (data) => {
      console.error('[SurveillancePage] ❌ Erreur démarrage:', data);
      setIsStartingExam(false);
      toast.error(`Erreur: ${data.error || 'Impossible de démarrer l\'épreuve'}`);
    });

    socket.on('noWaitingStudents', (data) => {
      console.log('[SurveillancePage] ⚠️ Aucun étudiant en attente:', data);
      setIsStartingExam(false);
      toast.warning('Aucun étudiant en attente pour cette épreuve.');
    });

    return () => {
      console.log('[SurveillancePage] Nettoyage socket');
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  // ── Chargement initial ───────────────────────────────────────
  useEffect(() => {
    // Charger les examens
    getExams()
      .then(r => {
        const examsData = Array.isArray(r.data) ? r.data : (r.data?.data || []);
        setExams(examsData);
        console.log(`✅ ${examsData.length} examens chargés`);
      })
      .catch(err => {
        console.error('Erreur chargement examens:', err);
        toast.error('Impossible de charger les épreuves.');
        setExams([]);
      });

    // Charger les résultats
    getResults()
      .then(r => {
        const results = Array.isArray(r.data) ? r.data : (r.data?.data || []);
        setResultsData(results);
        console.log(`✅ ${results.length} résultats chargés`);
      })
      .catch(err => console.warn('[Init] Erreur chargement résultats:', err.message));
  }, []);

  // ── Chargement des sessions actives (API REST) ─────────────────
  useEffect(() => {
    const fetchActiveSessions = () => {
      getActiveSessions()
        .then(r => {
          if (r.data?.sessions) {
            setActiveSessions(r.data.sessions);
            const waitingCount = r.data.sessions.filter(s => s.type === 'student' && s.status === 'waiting').length;
            const composingCount = r.data.sessions.filter(s => s.type === 'student' && s.status === 'composing').length;
            console.log(`✅ Sessions chargées: ${r.data.sessions.length} (${waitingCount} en attente, ${composingCount} en composition)`);
          }
        })
        .catch(e => console.warn('[Init] Erreur chargement sessions:', e.message));
    };
    
    fetchActiveSessions();
    
    // Rafraîchir toutes les 10 secondes
    const interval = setInterval(fetchActiveSessions, 10000);
    return () => clearInterval(interval);
  }, []);

  // ── Polling fallback toutes les 5s ──────────────────────────
  useEffect(() => {
    const pollInterval = setInterval(() => {
      getSurveillanceData()
        .then(r => {
          if (r.data?.activeSessions) {
            setActiveSessions(r.data.activeSessions);
          }
          if (r.data?.realtimeStats) {
            setRealtimeStats(r.data.realtimeStats);
          }
        })
        .catch(() => {});
    }, 5000);
    return () => clearInterval(pollInterval);
  }, []);

  // ── Calcul des sessions groupées pour la liste déroulante ───
  const sessionOptions = useMemo(() => {
    const groups = {};
    resultsData.forEach(r => {
      const examId = r.examId?._id || r.examId || 'unknown';
      const dateStr = r.createdAt ? new Date(r.createdAt).toISOString().slice(0, 10) : 'sans-date';
      const key = `${examId}__${dateStr}`;
      if (!groups[key]) {
        groups[key] = {
          key,
          examId,
          dateStr,
          examTitle: r.examId?.title || r.examTitle || 'Épreuve inconnue',
          examDomain: r.examId?.domain || '',
          examLevel: r.examId?.level || '',
          results: [],
        };
      }
      groups[key].results.push(r);
    });
    
    return Object.values(groups)
      .map(session => ({
        ...session,
        rankings: [...session.results]
          .sort((a, b) => (b.percentage || 0) - (a.percentage || 0))
          .map((r, i) => ({ ...r, rank: i + 1 })),
      }))
      .sort((a, b) => b.dateStr.localeCompare(a.dateStr));
  }, [resultsData]);

  // ── Mise à jour de la session sélectionnée ───────────────────
  useEffect(() => {
    if (selectedSessionKey) {
      const session = sessionOptions.find(s => s.key === selectedSessionKey);
      setSelectedSessionData(session || null);
    } else {
      setSelectedSessionData(null);
    }
  }, [selectedSessionKey, sessionOptions]);

  // ── Handlers ─────────────────────────────────────────────────
  const handleDistributeExam = useCallback(() => {
    if (!selectedExamId) return toast.error('Sélectionnez une épreuve.');
    if (!selectedExamOption) return toast.error('Choisissez une option.');
    if (!socketRef.current?.connected) return toast.error('Socket non connecté.');

    socketRef.current.emit('distributeExam', {
      examId: selectedExamId,
      examOption: selectedExamOption,
    });
    toast.success(`Épreuve distribuée — Option ${selectedExamOption}`);
  }, [selectedExamId, selectedExamOption]);

  const handleAdvanceQuestion = useCallback(() => {
    if (!socketRef.current?.connected) return toast.error('Socket non connecté.');
    const nextIdx = (currentQIdx[selectedExamId] ?? -1) + 1;

    if (selectedExamOption === 'B') {
      socketRef.current.emit('displayQuestion', {
        examId: selectedExamId,
        questionIndex: nextIdx,
      });
    } else {
      socketRef.current.emit('advanceQuestionForOptionA', {
        examId: selectedExamId,
        nextQuestionIndex: nextIdx,
      });
    }

    setCurrentQIdx(prev => ({ ...prev, [selectedExamId]: nextIdx }));
    toast.success(`Question ${nextIdx + 1} affichée sur tous les terminaux.`);
  }, [selectedExamId, currentQIdx, selectedExamOption]);

  const handleStartExam = useCallback(() => {
    if (!selectedExamId) return toast.error('Sélectionnez une épreuve.');
    if (!socketRef.current?.connected) return toast.error('Socket non connecté.');
    if (isStartingExam) return toast.info('Démarrage en cours...');

    const uniqueSessions = getUniqueSessions(activeSessions);
    
    let targetStudents = [];
    
    if (selectedExamOption === 'B') {
      targetStudents = uniqueSessions.filter(
        s => s.type === 'student' && 
             s.currentExamId === selectedExamId && 
             s.status === 'waiting'
      );
    } else {
      targetStudents = uniqueSessions.filter(
        s => s.type === 'student' && 
             s.currentExamId === selectedExamId && 
             (s.status === 'composing' || s.status === 'waiting')
      );
    }

    if (targetStudents.length === 0) {
      const exam = exams.find(e => e._id === selectedExamId);
      if (selectedExamOption === 'B') {
        return toast.error(`⚠️ Aucun étudiant en attente pour "${exam?.title || 'cette épreuve'}"`);
      } else {
        return toast.warning(`⚠️ Aucun étudiant prêt pour "${exam?.title || 'cette épreuve'}"`);
      }
    }

    // Demander confirmation avant de démarrer
    toast((t) => (
      <div style={{ background: '#1e293b', padding: '16px', borderRadius: '12px', color: '#fff', maxWidth: '400px' }}>
        <p style={{ marginBottom: '12px', fontWeight: 600 }}>
          {selectedExamOption === 'B' 
            ? `🚀 Démarrer l'épreuve pour ${targetStudents.length} étudiant(s) en attente ?` 
            : `🚀 Démarrer l'épreuve pour ${targetStudents.length} étudiant(s) ?`}
        </p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
          <button
            onClick={() => {
              toast.dismiss(t.id);
              setIsStartingExam(true);
              socketRef.current.emit('startExam', { 
                examId: selectedExamId,
                option: selectedExamOption 
              });
              
              setTimeout(() => {
                setIsStartingExam(false);
              }, 10000);
            }}
            style={{ background: '#10b981', color: '#fff', border: 'none', padding: '8px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}
          >
            Démarrer
          </button>
          <button
            onClick={() => toast.dismiss(t.id)}
            style={{ background: '#475569', color: '#fff', border: 'none', padding: '8px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}
          >
            Annuler
          </button>
        </div>
      </div>
    ), { duration: 10000 });
  }, [selectedExamId, selectedExamOption, activeSessions, getUniqueSessions, exams, isStartingExam]);

  const handleFinishExam = useCallback(() => {
    if (!selectedExamId) return toast.error('Sélectionnez une épreuve.');
    if (!socketRef.current?.connected) return toast.error('Socket non connecté.');

    toast((t) => (
      <div style={{ background: '#1e293b', padding: '16px', borderRadius: '12px', color: '#fff' }}>
        <p style={{ marginBottom: '12px' }}>
          Forcer la fin de l'épreuve pour <strong>tous</strong> les participants ?
        </p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
          <button
            onClick={() => { 
              toast.dismiss(t.id); 
              socketRef.current.emit('finishExam', { examId: selectedExamId }); 
              toast.success('Fin d\'épreuve envoyée.'); 
            }}
            style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}
          >
            Confirmer
          </button>
          <button
            onClick={() => toast.dismiss(t.id)}
            style={{ background: '#475569', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}
          >
            Annuler
          </button>
        </div>
      </div>
    ), { duration: Infinity });
  }, [selectedExamId]);

  const getExamTitle = useCallback((examId) => {
    const exam = Array.isArray(exams) ? exams.find(e => e._id === examId) : null;
    return exam?.title || 'Examen inconnu';
  }, [exams]);

  // ── Fonction d'impression SANS liens de bulletins ───────────
  const printSessionRanking = useCallback((session) => {
    if (!session || !session.rankings.length) {
      toast.error('Aucune donnée à imprimer');
      return;
    }

    const medals = ['🥇', '🥈', '🥉'];
    const passed = session.rankings.filter(r => (r.percentage || 0) >= 50).length;
    const avg = session.rankings.length
      ? (session.rankings.reduce((a, r) => a + (r.percentage || 0), 0) / session.rankings.length).toFixed(1)
      : '0';
    const highest = Math.max(...session.rankings.map(r => r.percentage || 0));
    const lowest = Math.min(...session.rankings.map(r => r.percentage || 0));
    const dateLabel = session.dateStr !== 'sans-date'
      ? new Date(session.dateStr).toLocaleDateString('fr-FR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })
      : 'Date inconnue';

    // Génération des lignes SANS liens de bulletins
    const rows = session.rankings.map((r, idx) => {
      const note20 = ((r.percentage || 0) / 100 * 20).toFixed(2);
      return `
        <tr style="border-bottom: 1px solid #e2e8f0; background: ${idx % 2 === 0 ? '#f8fafc' : '#fff'}">
          <td style="padding: 12px 15px; font-weight: 700; text-align: center; width: 60px;">${idx < 3 ? medals[idx] : r.rank}</td>
          <td style="padding: 12px 15px; font-weight: 600;">${escapeHtml(r.studentInfo?.firstName || '')} ${escapeHtml(r.studentInfo?.lastName || '')}</td>
          <td style="padding: 12px 15px; color: #475569; font-family: monospace;">${escapeHtml(r.studentInfo?.matricule || '—')}</td>
          <td style="padding: 12px 15px; text-align: center;">${r.score ?? '—'}</td>
          <td style="padding: 12px 15px; text-align: center; font-weight: 700; color: ${(r.percentage || 0) >= 50 ? '#15803d' : '#dc2626'};">${r.percentage ?? 0}%</td>
          <td style="padding: 12px 15px; text-align: center; font-weight: 600;">${note20}/20</td>
        </tr>
      `;
    }).join('');

    const html = `<!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Classement - ${escapeHtml(session.examTitle)}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: 'Segoe UI', 'Roboto', system-ui, sans-serif;
          margin: 40px;
          background: white;
          color: #1e293b;
        }
        .container { max-width: 1200px; margin: 0 auto; }
        h1 {
          color: #1e293b;
          border-bottom: 3px solid #f59e0b;
          display: inline-block;
          padding-bottom: 8px;
          margin-bottom: 20px;
          font-size: 1.8rem;
        }
        .header-info {
          margin: 20px 0;
          background: linear-gradient(135deg, #fef3c7, #fde68a);
          padding: 20px 24px;
          border-radius: 16px;
          display: flex;
          flex-wrap: wrap;
          gap: 30px;
        }
        .info-group {
          flex: 1;
          min-width: 180px;
        }
        .info-group h3 {
          font-size: 0.7rem;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: #92400e;
          margin-bottom: 8px;
        }
        .info-group p {
          font-size: 1.2rem;
          font-weight: 700;
          color: #1e293b;
        }
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 15px;
          margin: 20px 0;
        }
        .stat-card {
          background: #f1f5f9;
          border-radius: 12px;
          padding: 12px 16px;
          text-align: center;
        }
        .stat-card .label {
          font-size: 0.7rem;
          text-transform: uppercase;
          color: #64748b;
          margin-bottom: 6px;
        }
        .stat-card .value {
          font-size: 1.5rem;
          font-weight: 800;
          color: #f59e0b;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 20px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        th {
          background: linear-gradient(135deg, #f59e0b, #d97706);
          color: white;
          padding: 14px 15px;
          text-align: left;
          font-weight: 700;
          text-transform: uppercase;
          font-size: 0.75rem;
          letter-spacing: 0.05em;
        }
        td { padding: 12px 15px; }
        .footer {
          margin-top: 30px;
          text-align: center;
          font-size: 0.7rem;
          color: #64748b;
          border-top: 1px solid #e2e8f0;
          padding-top: 20px;
        }
        @media print {
          body { margin: 0; padding: 20px; }
          th { background: #f59e0b !important; }
          .no-print { display: none; }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>📊 ${escapeHtml(session.examTitle)}</h1>
        
        <div class="header-info">
          <div class="info-group">
            <h3>📅 Date de la session</h3>
            <p>${dateLabel}</p>
          </div>
          <div class="info-group">
            <h3>📚 Domaine / Niveau</h3>
            <p>${escapeHtml(session.examDomain || '—')} · ${escapeHtml(session.examLevel || '—')}</p>
          </div>
          <div class="info-group">
            <h3>👥 Nombre de candidats</h3>
            <p>${session.rankings.length}</p>
          </div>
        </div>

        <div class="stats-grid">
          <div class="stat-card">
            <div class="label">Moyenne</div>
            <div class="value">${avg}%</div>
          </div>
          <div class="stat-card">
            <div class="label">Note moyenne /20</div>
            <div class="value">${(parseFloat(avg) / 5).toFixed(1)}/20</div>
          </div>
          <div class="stat-card">
            <div class="label">Taux de réussite</div>
            <div class="value">${((passed / session.rankings.length) * 100).toFixed(1)}%</div>
          </div>
          <div class="stat-card">
            <div class="label">Meilleur score</div>
            <div class="value">${highest}%</div>
          </div>
          <div class="stat-card">
            <div class="label">Plus faible score</div>
            <div class="value">${lowest}%</div>
          </div>
        </div>

        <h3 style="margin: 20px 0 10px 0;">🏆 Classement par ordre de mérite</h3>
        
         <table>
          <thead>
             <tr>
              <th style="width: 60px;">Rang</th>
              <th>Étudiant</th>
              <th>Matricule</th>
              <th style="text-align: center;">Score</th>
              <th style="text-align: center;">%</th>
              <th style="text-align: center;">Note /20</th>
             </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
         </table>
        
        <div class="footer">
          Document généré par NA²QUIZ · ${new Date().toLocaleString()}<br>
          Ce document présente le classement des candidats par ordre de mérite.
        </div>
      </div>
    </body>
    </html>`;

    const win = window.open('', '_blank');
    win.document.write(html);
    win.document.close();
    win.print();
  }, []);

  // ✅ Application du filtre unique
  const uniqueSessions = useMemo(() => getUniqueSessions(activeSessions), [activeSessions, getUniqueSessions]);

  // ── Filtres de sessions ────────────
  const terminalsWaiting = uniqueSessions.filter(s => s.type === 'terminal' && s.status === 'connected');
  const terminalsWithExam = uniqueSessions.filter(s => s.type === 'terminal' && s.status === 'exam_distributed');
  const studentsWaitingForStart = uniqueSessions.filter(s => s.type === 'student' && s.status === 'waiting');
  const studentsReady = uniqueSessions.filter(s => s.type === 'student' && s.status === 'composing');
  const studentsActive = uniqueSessions.filter(s => s.type === 'student' && ['composing', 'finished', 'forced-finished'].includes(s.status));

  const totalTerminals = terminalsWaiting.length + terminalsWithExam.length;
  const totalStudents = studentsWaitingForStart.length + studentsReady.length + studentsActive.length;

  // ── Chart données ─────────────────────────────────────────
  const chartData = {
    labels: ['Moyenne', 'Médiane', 'Max', 'Min'],
    datasets: [{
      label: 'Scores (%)',
      data: realtimeStats
        ? [realtimeStats.averageScore, realtimeStats.medianScore, realtimeStats.highestScore, realtimeStats.lowestScore]
        : [0, 0, 0, 0],
      backgroundColor: ['rgba(59,130,246,0.65)', 'rgba(139,92,246,0.65)', 'rgba(16,185,129,0.65)', 'rgba(239,68,68,0.65)'],
      borderColor: ['#3b82f6', '#8b5cf6', '#10b981', '#ef4444'],
      borderWidth: 2, borderRadius: 6,
    }],
  };

  const chartOptions = {
    responsive: true, maintainAspectRatio: false,
    plugins: {
      legend: { labels: { color: '#94a3b8' } },
      title: { display: false },
    },
    scales: {
      y: { min: 0, max: 100, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94a3b8' } },
      x: { grid: { display: false }, ticks: { color: '#94a3b8' } },
    },
  };

  // ── Render ────────────────────────────────────────────────
  return (
    <div style={{
      minHeight: '100vh',
      fontFamily: "'DM Sans', sans-serif",
      background: 'linear-gradient(135deg, #05071a 0%, #0a0f2e 60%, #05071a 100%)',
      position: 'relative', overflow: 'hidden', padding: '0 0 40px',
    }}>
      {/* Grid bg */}
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

      {/* ── TOPBAR ─────────────────────────────────────────── */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'rgba(5,7,26,0.92)', backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(59,130,246,0.12)',
        padding: '0 28px', height: '60px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: '28px',
      }}>
        <div style={{
          fontFamily: "'Sora', sans-serif", fontWeight: 800, fontSize: '1.1rem',
          letterSpacing: '-0.02em',
          background: 'linear-gradient(135deg, #60a5fa, #a78bfa)',
          WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent',
        }}>
          NA²QUIZ · SURVEILLANCE
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <ConnectionBadge connected={isConnected} error={socketError} />
          
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => {
              getActiveSessions()
                .then(r => {
                  if (r.data?.sessions) {
                    setActiveSessions(r.data.sessions);
                    const waitingCount = r.data.sessions.filter(s => s.type === 'student' && s.status === 'waiting').length;
                    toast.success(`${waitingCount} étudiant(s) en attente`);
                  }
                });
              if (socketRef.current?.connected) {
                socketRef.current.emit('getSurveillanceData');
              }
            }}
            style={{
              display: 'flex', alignItems: 'center', gap: '7px',
              padding: '8px 16px', borderRadius: '8px',
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: '#cbd5e1', fontSize: '0.875rem', fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            <RefreshCw size={15} />
            Rafraîchir
          </motion.button>
          
          <motion.button
            whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
            onClick={() => navigate(-1)}
            style={{
              display: 'flex', alignItems: 'center', gap: '7px',
              padding: '8px 16px', borderRadius: '8px',
              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
              color: '#cbd5e1', fontSize: '0.875rem', fontWeight: 500, cursor: 'pointer',
            }}
          >
            <Home size={15} /> Retour
          </motion.button>
        </div>
      </header>

      <main style={{ position: 'relative', zIndex: 1, maxWidth: '1440px', margin: '0 auto', padding: '0 24px' }}>

        <motion.h1
          initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
          style={{
            fontFamily: "'Sora', sans-serif", fontSize: '1.875rem', fontWeight: 700,
            color: '#f8fafc', textAlign: 'center', marginBottom: '32px',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px',
          }}
        >
          <Eye size={28} style={{ color: '#3b82f6' }} />
          Tableau de Surveillance
          <span style={{
            background: 'rgba(59,130,246,0.15)',
            color: '#60a5fa',
            padding: '4px 12px',
            borderRadius: '999px',
            fontSize: '0.875rem',
            fontWeight: 600
          }}>
            {totalStudents} étudiant{totalStudents > 1 ? 's' : ''}
          </span>
        </motion.h1>

        {/* ── LIGNE 1 : Contrôle + Terminaux + Stats ─────── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '20px', marginBottom: '20px' }}>

          {/* Panneau gestion épreuves */}
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            style={{ background: 'rgba(15,23,42,0.75)', backdropFilter: 'blur(12px)', border: '1px solid rgba(59,130,246,0.15)', borderRadius: '20px', padding: '22px' }}
          >
            <h2 style={{ fontFamily: "'Sora', sans-serif", fontSize: '1.1rem', fontWeight: 700, color: '#f8fafc', marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Radio size={18} color="#3b82f6" /> Gestion des Épreuves
            </h2>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '7px' }}>Épreuve à distribuer</label>
              <select
                value={selectedExamId}
                onChange={e => setSelectedExamId(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: '10px', color: '#f8fafc', fontSize: '0.9rem', outline: 'none' }}
              >
                <option value="" style={{ background: '#1e293b' }}>-- Choisir --</option>
                {Array.isArray(exams) && exams.map(e => (
                  <option key={e._id} value={e._id} style={{ background: '#1e293b' }}>
                    {e.title} ({e.domain || e.metadata?.domain} · {e.level || e.metadata?.level})
                  </option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: '18px' }}>
              <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Clock size={13} color="#3b82f6" /> Mode de composition
              </p>
              {[
                { key: 'A', label: 'Collective Figée',  desc: 'Même question, temps 60s/question', color: '#ef4444' },
                { key: 'B', label: 'Collective Souple', desc: 'Démarrage sync., pas de chrono', color: '#3b82f6' },
                { key: 'C', label: 'Personnalisée',     desc: 'Libre navigation, temps global', color: '#8b5cf6' },
                { key: 'D', label: 'Aléatoire',         desc: 'Questions mélangées, 60s/Q', color: '#f59e0b' },
              ].map(opt => (
                <label key={opt.key} style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  padding: '9px 12px', marginBottom: '7px', cursor: 'pointer',
                  background: selectedExamOption === opt.key ? `${opt.color}12` : 'rgba(255,255,255,0.02)',
                  border: `1px solid ${selectedExamOption === opt.key ? `${opt.color}44` : 'rgba(255,255,255,0.06)'}`,
                  borderRadius: '10px', transition: 'all 0.2s',
                }}>
                  <input
                    type="radio" name="examOption" value={opt.key}
                    checked={selectedExamOption === opt.key}
                    onChange={e => setSelectedExamOption(e.target.value)}
                    style={{ accentColor: opt.color, width: 15, height: 15, flexShrink: 0 }}
                  />
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 18, height: 18, borderRadius: 4, background: `${opt.color}22`, color: opt.color, fontSize: '0.62rem', fontWeight: 800 }}>{opt.key}</span>
                      <span style={{ color: '#f8fafc', fontSize: '0.85rem', fontWeight: 600 }}>{opt.label}</span>
                    </div>
                    <p style={{ fontSize: '0.7rem', color: '#64748b', marginTop: 2 }}>{opt.desc}</p>
                  </div>
                </label>
              ))}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <motion.button
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                onClick={handleDistributeExam}
                disabled={!selectedExamId || !isConnected}
                style={{
                  padding: '11px', borderRadius: '10px', border: 'none',
                  background: (!selectedExamId || !isConnected) ? 'rgba(59,130,246,0.25)' : 'linear-gradient(135deg, #3b82f6, #2563eb)',
                  color: '#fff', fontWeight: 600, cursor: !selectedExamId ? 'not-allowed' : 'pointer',
                  fontSize: '0.875rem',
                }}
              >
                📡 Distribuer l'épreuve
              </motion.button>

              {selectedExamId && (
                <motion.button
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  onClick={handleStartExam}
                  disabled={isStartingExam}
                  style={{
                    padding: '12px', borderRadius: '10px', border: 'none',
                    background: isStartingExam 
                      ? 'rgba(16,185,129,0.5)' 
                      : 'linear-gradient(135deg, #10b981, #059669)',
                    color: '#fff', fontWeight: 700, cursor: isStartingExam ? 'wait' : 'pointer',
                    fontSize: '0.875rem',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                    boxShadow: isStartingExam ? 'none' : '0 4px 14px rgba(16,185,129,0.3)',
                    opacity: isStartingExam ? 0.7 : 1,
                  }}
                >
                  {isStartingExam ? (
                    <>
                      <RefreshCw size={15} style={{ animation: 'spin 1s linear infinite' }} />
                      Démarrage en cours...
                    </>
                  ) : (
                    <>
                      <Play size={15} />
                      COMMENCER L'ÉPREUVE
                      <span style={{ background: 'rgba(255,255,255,0.2)', padding: '2px 8px', borderRadius: '999px', fontSize: '0.72rem' }}>
                        {selectedExamOption === 'B' 
                          ? `${studentsWaitingForStart.length} en attente`
                          : `${studentsReady.length} prêts`}
                      </span>
                    </>
                  )}
                </motion.button>
              )}

              {selectedExamOption === 'B' && selectedExamId && (
                <motion.button
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  onClick={handleAdvanceQuestion}
                  style={{
                    padding: '12px', borderRadius: '10px', border: 'none',
                    background: 'linear-gradient(135deg, #4f46e5, #6366f1)',
                    color: '#fff', fontWeight: 700, cursor: 'pointer',
                    fontSize: '0.875rem',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                    boxShadow: '0 4px 14px rgba(79,70,229,0.3)',
                    marginTop: '10px',
                  }}
                >
                  <ArrowRight size={15} />
                  QUESTION SUIVANTE (Option B)
                  {currentQIdx[selectedExamId] !== undefined && (
                    <span style={{ background: 'rgba(255,255,255,0.2)', padding: '2px 8px', borderRadius: '999px', fontSize: '0.72rem' }}>
                      Q{(currentQIdx[selectedExamId] ?? 0) + 1} → Q{(currentQIdx[selectedExamId] ?? 0) + 2}
                    </span>
                  )}
                </motion.button>
              )}

              <motion.button
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                onClick={handleFinishExam}
                disabled={!selectedExamId || !isConnected}
                style={{
                  padding: '11px', borderRadius: '10px', border: 'none',
                  background: (!selectedExamId || !isConnected) ? 'rgba(239,68,68,0.25)' : 'linear-gradient(135deg, #ef4444, #dc2626)',
                  color: '#fff', fontWeight: 600, cursor: !selectedExamId ? 'not-allowed' : 'pointer',
                  fontSize: '0.875rem',
                }}
              >
                ⏹ Terminer l'épreuve (tous)
              </motion.button>
            </div>
          </motion.div>

          {/* Panneau terminaux */}
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
            style={{ background: 'rgba(15,23,42,0.75)', backdropFilter: 'blur(12px)', border: '1px solid rgba(59,130,246,0.15)', borderRadius: '20px', padding: '22px', display: 'flex', flexDirection: 'column', gap: '16px' }}
          >
            <div>
              <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#f8fafc', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '7px' }}>
                <Terminal size={16} color="#10b981" />
                Terminaux en attente
                <span style={{ marginLeft: 'auto', background: 'rgba(16,185,129,0.15)', color: '#10b981', fontSize: '0.72rem', fontWeight: 700, padding: '2px 9px', borderRadius: '999px' }}>
                  {terminalsWaiting.length}
                </span>
              </h3>
              {terminalsWaiting.length === 0
                ? <p style={{ color: '#475569', fontSize: '0.8rem', textAlign: 'center', padding: '12px 0' }}>Aucun terminal connecté</p>
                : <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <AnimatePresence>
                      {terminalsWaiting.map(t => <TerminalCard key={t.socketId} terminal={t} />)}
                    </AnimatePresence>
                  </div>
              }
            </div>

            {/* ÉTUDIANTS EN ATTENTE - OPTION B */}
            {studentsWaitingForStart.length > 0 && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '7px' }}>
                    <Clock size={16} color="#8b5cf6" />
                    En attente de démarrage (Option B)
                    <span style={{ background: 'rgba(139,92,246,0.15)', color: '#8b5cf6', fontSize: '0.72rem', fontWeight: 700, padding: '2px 9px', borderRadius: '999px' }}>
                      {studentsWaitingForStart.length}
                    </span>
                  </h3>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '300px', overflowY: 'auto' }}>
                  <AnimatePresence>
                    {studentsWaitingForStart.map(s => (
                      <motion.div
                        key={s.socketId || s.matricule}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        style={{
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                          padding: '10px 14px',
                          background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.25)',
                          borderRadius: '10px',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#8b5cf6', display: 'inline-block', animation: 'pulse 1.5s infinite' }} />
                          <div>
                            <div style={{ color: '#e2e8f0', fontSize: '0.8rem', fontWeight: 600 }}>
                              {s.studentInfo?.firstName} {s.studentInfo?.lastName}
                            </div>
                            <div style={{ color: '#64748b', fontSize: '0.68rem' }}>
                              {s.studentInfo?.matricule || s.socketId?.slice(0, 10)}
                            </div>
                          </div>
                        </div>
                        <span style={{ color: '#8b5cf6', fontSize: '0.72rem', fontWeight: 600 }}>
                          Prêt
                        </span>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            )}

            {terminalsWithExam.length > 0 && (
              <div>
                <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#f8fafc', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '7px' }}>
                  <Monitor size={16} color="#f59e0b" />
                  Épreuve envoyée
                  <span style={{ marginLeft: 'auto', background: 'rgba(245,158,11,0.15)', color: '#f59e0b', fontSize: '0.72rem', fontWeight: 700, padding: '2px 9px', borderRadius: '999px' }}>
                    {terminalsWithExam.length}
                  </span>
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <AnimatePresence>
                    {terminalsWithExam.map(t => <TerminalCard key={t.socketId} terminal={t} />)}
                  </AnimatePresence>
                </div>
              </div>
            )}

            <div style={{
              marginTop: 'auto', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.06)',
              display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#64748b',
            }}>
              <span>Total terminaux</span>
              <span style={{ color: '#94a3b8', fontWeight: 600 }}>
                {totalTerminals}
              </span>
            </div>
          </motion.div>

          {/* Stats temps réel */}
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            style={{ background: 'rgba(15,23,42,0.75)', backdropFilter: 'blur(12px)', border: '1px solid rgba(59,130,246,0.15)', borderRadius: '20px', padding: '22px' }}
          >
            <h2 style={{ fontFamily: "'Sora', sans-serif", fontSize: '1.1rem', fontWeight: 700, color: '#f8fafc', marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <BarChart3 size={18} color="#8b5cf6" /> Statistiques Temps Réel
            </h2>

            {realtimeStats ? (
              <>
                <div style={{ marginBottom: '14px' }}>
                  <p style={{ color: '#64748b', fontSize: '0.75rem', marginBottom: '3px' }}>Épreuve active</p>
                  <p style={{ color: '#f1f5f9', fontWeight: 600, fontSize: '0.9rem' }}>{getExamTitle(realtimeStats.examId)}</p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
                  {[
                    { label: 'Participants', value: realtimeStats.activeStudentsCount, color: '#3b82f6' },
                    { label: 'Taux réussite', value: `${(realtimeStats.passRate ?? 0).toFixed(1)}%`, color: '#10b981' },
                    { label: 'Moyenne', value: `${(realtimeStats.averageScore ?? 0).toFixed(1)}%`, color: '#8b5cf6' },
                    { label: 'Médiane', value: `${(realtimeStats.medianScore ?? 0).toFixed(1)}%`, color: '#f59e0b' },
                  ].map(stat => (
                    <div key={stat.label} style={{ background: `${stat.color}12`, border: `1px solid ${stat.color}25`, padding: '10px', borderRadius: '10px' }}>
                      <p style={{ color: '#64748b', fontSize: '0.68rem', marginBottom: '3px' }}>{stat.label}</p>
                      <p style={{ color: stat.color, fontSize: '1.3rem', fontWeight: 700, lineHeight: 1 }}>{stat.value}</p>
                    </div>
                  ))}
                </div>

                <div style={{ height: '160px' }}>
                  <Bar data={chartData} options={chartOptions} />
                </div>

                <p style={{ color: '#475569', fontSize: '0.68rem', marginTop: '10px', textAlign: 'right' }}>
                  Mise à jour : {new Date(realtimeStats.lastUpdate).toLocaleTimeString()}
                </p>
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <BarChart3 size={32} color="#1e293b" style={{ marginBottom: '12px' }} />
                <p style={{ color: '#475569', fontSize: '0.85rem' }}>En attente des statistiques…</p>
                <p style={{ color: '#334155', fontSize: '0.75rem', marginTop: '6px' }}>Les statistiques apparaissent quand des étudiants commencent l'épreuve.</p>
              </div>
            )}
          </motion.div>
        </div>

        {/* ── LIGNE 2 : Étudiants en composition ─────────── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          style={{ background: 'rgba(15,23,42,0.75)', backdropFilter: 'blur(12px)', border: '1px solid rgba(59,130,246,0.15)', borderRadius: '20px', padding: '22px' }}
        >
          <h2 style={{ fontFamily: "'Sora', sans-serif", fontSize: '1.1rem', fontWeight: 700, color: '#f8fafc', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <Users size={18} color="#3b82f6" />
            Étudiants en Composition
            {['composing', 'finished', 'forced-finished'].map(st => {
              const cnt = studentsActive.filter(s => s.status === st).length;
              if (!cnt) return null;
              const colors = { composing: '#3b82f6', finished: '#10b981', 'forced-finished': '#f59e0b' };
              const labels = { composing: 'en cours', finished: 'terminé', 'forced-finished': 'clôturé' };
              return (
                <span key={st} style={{ background: `${colors[st]}15`, color: colors[st], padding: '2px 10px', borderRadius: '999px', fontSize: '0.72rem', fontWeight: 700 }}>
                  {cnt} {labels[st]}
                </span>
              );
            })}
          </h2>

          {studentsActive.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <Users size={32} color="#1e293b" style={{ marginBottom: '12px' }} />
              <p style={{ color: '#475569', fontSize: '0.85rem' }}>Aucun étudiant en composition pour l'instant.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: '14px' }}>
              <AnimatePresence>
                {studentsActive.map(student => (
                  <StudentCard
                    key={student.socketId}
                    student={student}
                    examTitle={getExamTitle(student.currentExamId)}
                    backendUrl={NODE_BACKEND_URL}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}
        </motion.div>

        {/* ── LIGNE 3 : Liste déroulante des sessions et classement AVEC LIENS ──────── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          style={{
            background: 'rgba(15,23,42,0.75)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(139,92,246,0.2)',
            borderRadius: '20px',
            padding: '22px',
            marginTop: '20px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '16px' }}>
            <h2 style={{ fontFamily: "'Sora', sans-serif", fontSize: '1.1rem', fontWeight: 700, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
              <Trophy size={18} color="#f59e0b" /> Classement par session
            </h2>
            {selectedSessionData && (
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => printSessionRanking(selectedSessionData)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  padding: '8px 18px', borderRadius: '10px',
                  background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                  border: 'none', color: '#fff', fontWeight: 600,
                  cursor: 'pointer', fontSize: '0.85rem',
                }}
              >
                <Printer size={15} /> Imprimer le classement
              </motion.button>
            )}
          </div>

          {/* Liste déroulante */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '8px' }}>
              📋 Sélectionner une session
            </label>
            <select
              value={selectedSessionKey}
              onChange={e => setSelectedSessionKey(e.target.value)}
              style={{
                width: '100%', maxWidth: '500px', padding: '12px 16px',
                background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(139,92,246,0.3)',
                borderRadius: '12px', color: '#f8fafc', fontSize: '0.9rem', fontWeight: 500,
                outline: 'none', cursor: 'pointer',
              }}
            >
              <option value="" style={{ background: '#1e293b' }}>-- Choisir une session --</option>
              {sessionOptions.map(session => {
                const dateLabel = session.dateStr !== 'sans-date'
                  ? new Date(session.dateStr).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
                  : 'Date inconnue';
                const avg = session.rankings.length
                  ? (session.rankings.reduce((a, r) => a + (r.percentage || 0), 0) / session.rankings.length).toFixed(0)
                  : '0';
                return (
                  <option key={session.key} value={session.key} style={{ background: '#1e293b' }}>
                    {dateLabel} - {session.examTitle} ({session.rankings.length} candidats · {avg}% moy.)
                  </option>
                );
              })}
            </select>
          </div>

          {/* Affichage du classement sélectionné AVEC liens individuels */}
          {selectedSessionData ? (
            <div>
              {/* Statistiques de la session */}
              <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '12px', marginBottom: '24px', padding: '16px',
                background: 'rgba(245,158,11,0.08)', borderRadius: '16px', border: '1px solid rgba(245,158,11,0.2)'
              }}>
                {[
                  { label: 'Candidats', value: selectedSessionData.rankings.length, color: '#3b82f6' },
                  { label: 'Moyenne', value: `${(selectedSessionData.rankings.reduce((a, r) => a + (r.percentage || 0), 0) / selectedSessionData.rankings.length).toFixed(1)}%`, color: '#8b5cf6' },
                  { label: 'Reçus', value: selectedSessionData.rankings.filter(r => (r.percentage || 0) >= 50).length, color: '#10b981' },
                  { label: 'Échoués', value: selectedSessionData.rankings.filter(r => (r.percentage || 0) < 50).length, color: '#ef4444' },
                  { label: 'Meilleur score', value: `${Math.max(...selectedSessionData.rankings.map(r => r.percentage || 0))}%`, color: '#f59e0b' },
                ].map(stat => (
                  <div key={stat.label} style={{ background: `${stat.color}10`, border: `1px solid ${stat.color}25`, borderRadius: '12px', padding: '12px', textAlign: 'center' }}>
                    <div style={{ color: '#64748b', fontSize: '0.7rem', textTransform: 'uppercase', marginBottom: '4px' }}>{stat.label}</div>
                    <div style={{ color: stat.color, fontSize: '1.3rem', fontWeight: 800 }}>{stat.value}</div>
                  </div>
                ))}
              </div>

              {/* Tableau du classement AVEC liens de bulletins individuels */}
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid rgba(139,92,246,0.4)', background: 'rgba(139,92,246,0.1)' }}>
                      <th style={{ padding: '12px 15px', textAlign: 'left', color: '#f59e0b', fontWeight: 700 }}>Rang</th>
                      <th style={{ padding: '12px 15px', textAlign: 'left', color: '#94a3b8', fontWeight: 600 }}>Étudiant</th>
                      <th style={{ padding: '12px 15px', textAlign: 'left', color: '#94a3b8', fontWeight: 600 }}>Matricule</th>
                      <th style={{ padding: '12px 15px', textAlign: 'center', color: '#94a3b8', fontWeight: 600 }}>Score</th>
                      <th style={{ padding: '12px 15px', textAlign: 'center', color: '#94a3b8', fontWeight: 600 }}>%</th>
                      <th style={{ padding: '12px 15px', textAlign: 'center', color: '#94a3b8', fontWeight: 600 }}>Note /20</th>
                      <th style={{ padding: '12px 15px', textAlign: 'center', color: '#94a3b8', fontWeight: 600 }}>Bulletin</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedSessionData.rankings.map((r, idx) => {
                      const note20 = ((r.percentage || 0) / 100 * 20).toFixed(2);
                      const bulletinUrl = `${NODE_BACKEND_URL}/api/bulletin/${r._id}`;
                      return (
                        <tr key={r._id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                          <td style={{ padding: '12px 15px' }}>
                            <span style={{
                              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                              width: 32, height: 32, borderRadius: '50%',
                              background: idx === 0 ? '#fbbf24' : idx === 1 ? '#94a3b8' : idx === 2 ? '#b45309' : 'rgba(255,255,255,0.1)',
                              color: idx < 3 ? '#000' : '#94a3b8', fontWeight: 700,
                            }}>
                              {idx < 3 ? ['🥇', '🥈', '🥉'][idx] : r.rank}
                            </span>
                          </td>
                          <td style={{ padding: '12px 15px', color: '#f1f5f9', fontWeight: 500 }}>
                            {r.studentInfo?.firstName} {r.studentInfo?.lastName}
                          </td>
                          <td style={{ padding: '12px 15px', color: '#64748b', fontFamily: 'monospace' }}>
                            {r.studentInfo?.matricule || '—'}
                          </td>
                          <td style={{ padding: '12px 15px', textAlign: 'center', color: '#f1f5f9', fontWeight: 600 }}>
                            {r.score ?? '—'}
                          </td>
                          <td style={{ padding: '12px 15px', textAlign: 'center' }}>
                            <span style={{
                              padding: '3px 10px', borderRadius: '999px',
                              background: (r.percentage || 0) >= 50 ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                              color: (r.percentage || 0) >= 50 ? '#10b981' : '#ef4444',
                              fontWeight: 700, fontSize: '0.85rem',
                            }}>
                              {r.percentage ?? 0}%
                            </span>
                          </td>
                          <td style={{ padding: '12px 15px', textAlign: 'center', color: '#8b5cf6', fontWeight: 700 }}>
                            {note20}/20
                          </td>
                          <td style={{ padding: '12px 15px', textAlign: 'center' }}>
                            <a
                              href={bulletinUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                display: 'inline-flex', alignItems: 'center', gap: '4px',
                                padding: '4px 10px', borderRadius: '6px',
                                background: 'rgba(99,102,241,0.1)',
                                border: '1px solid rgba(99,102,241,0.25)',
                                color: '#a5b4fc', textDecoration: 'none', fontSize: '0.7rem', fontWeight: 600,
                              }}
                            >
                              <Eye size={10} /> Voir bulletin
                            </a>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '60px 20px' }}>
              <Calendar size={48} color="#1e293b" style={{ marginBottom: '16px' }} />
              <p style={{ color: '#475569', fontSize: '0.9rem' }}>Sélectionnez une session dans la liste déroulante pour afficher le classement.</p>
              <p style={{ color: '#334155', fontSize: '0.8rem', marginTop: '8px' }}>Les sessions apparaissent après que des étudiants aient complété des épreuves.</p>
            </div>
          )}
        </motion.div>

      </main>

      <Toaster position="bottom-right" toastOptions={{ style: { background: '#1e293b', color: '#f1f5f9', border: '1px solid rgba(59,130,246,0.2)' } }} />

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.5;transform:scale(1.3)} }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default SurveillancePage;
