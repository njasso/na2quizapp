// src/pages/surveillance/SurveillancePage.jsx - VERSION COMPLÈTE CORRIGÉE
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
  Image as ImageIcon
} from 'lucide-react';
import { getExams, getResults, getActiveSessions, getSurveillanceData } from '../../services/api';
import ENV_CONFIG from '../../config/env';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const NODE_BACKEND_URL = ENV_CONFIG.BACKEND_URL;
const SOCKET_URL = ENV_CONFIG.SOCKET_URL;

console.log('[Surveillance] Backend URL:', NODE_BACKEND_URL);
console.log('[Surveillance] Socket URL:', SOCKET_URL);
console.log('[Surveillance] Environnement:', ENV_CONFIG.isLocalhost ? 'LOCAL' : 'PRODUCTION');

// ══════════════════════════════════════════════════════════════
//  SOUS-COMPOSANTS
// ══════════════════════════════════════════════════════════════

const ConnectionBadge = ({ connected, error, reconnectAttempt }) => (
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
    {reconnectAttempt > 0 && !connected && (
      <span style={{ marginLeft: '4px', fontSize: '0.65rem' }}>(tentative {reconnectAttempt})</span>
    )}
  </div>
);

const TerminalCard = React.memo(({ terminal }) => {
  const colors = {
    connected:       { bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.25)', dot: '#10b981', label: 'En attente' },
    exam_distributed: { bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.25)', dot: '#f59e0b', label: 'Épreuve reçue' },
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
});

const StudentCard = React.memo(({ student, examTitle, examInfo, backendUrl, onAlert }) => {
  const statusConfig = {
    composing:       { color: '#3b82f6', label: 'En cours' },
    finished:        { color: '#10b981', label: 'Terminé' },
    'forced-finished':{ color: '#f59e0b', label: 'Clôturé' },
    waiting:         { color: '#8b5cf6', label: 'En attente' },
  };
  const cfg = statusConfig[student.status] || statusConfig.composing;
  
  const timeSinceLastUpdate = Date.now() - (student.lastUpdate || Date.now());
  const isStalled = student.status === 'composing' && timeSinceLastUpdate > 300000 && student.progress < 100;
  
  useEffect(() => {
    if (isStalled && onAlert) {
      onAlert({
        type: 'stalled',
        message: `⚠️ ${student.studentInfo?.firstName} ${student.studentInfo?.lastName} - Progression bloquée`,
        severity: 'medium'
      });
    }
  }, [isStalled, onAlert, student.studentInfo]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      style={{
        background: isStalled ? 'rgba(245,158,11,0.1)' : 'rgba(255,255,255,0.03)',
        border: `1px solid ${isStalled ? '#f59e0b' : cfg.color}35`,
        borderRadius: '12px', padding: '16px',
        position: 'relative',
      }}
    >
      {isStalled && (
        <div style={{
          position: 'absolute', top: 8, right: 8,
          background: '#f59e0b', borderRadius: '999px',
          padding: '2px 6px', fontSize: '0.6rem', color: '#fff',
          display: 'flex', alignItems: 'center', gap: '4px'
        }}>
          <AlertTriangle size={10} /> Bloqué
        </div>
      )}
      
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

      {examInfo && (
        <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
          {examInfo.domain && (
            <span style={{ fontSize: '0.6rem', padding: '2px 6px', background: 'rgba(59,130,246,0.15)', borderRadius: '4px', color: '#60a5fa' }}>
              <Tag size={8} style={{ display: 'inline', marginRight: 2 }} />
              {examInfo.domain}
            </span>
          )}
          {examInfo.level && (
            <span style={{ fontSize: '0.6rem', padding: '2px 6px', background: 'rgba(139,92,246,0.15)', borderRadius: '4px', color: '#a78bfa' }}>
              <Layers size={8} style={{ display: 'inline', marginRight: 2 }} />
              {examInfo.level}
            </span>
          )}
          {examInfo.subject && (
            <span style={{ fontSize: '0.6rem', padding: '2px 6px', background: 'rgba(16,185,129,0.15)', borderRadius: '4px', color: '#34d399' }}>
              <BookOpen size={8} style={{ display: 'inline', marginRight: 2 }} />
              {examInfo.subject}
            </span>
          )}
        </div>
      )}

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
});

const SessionHistoryPanel = ({ history, onClose, onExport, onClear }) => {
  const [filter, setFilter] = useState('');
  const [expanded, setExpanded] = useState({});
  
  const filteredHistory = useMemo(() => {
    return history.filter(s => 
      s.examTitle?.toLowerCase().includes(filter.toLowerCase()) ||
      s.examId?.toLowerCase().includes(filter.toLowerCase()) ||
      s.domain?.toLowerCase().includes(filter.toLowerCase()) ||
      s.level?.toLowerCase().includes(filter.toLowerCase())
    );
  }, [history, filter]);
  
  return (
    <motion.div
      initial={{ opacity: 0, x: 300 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 300 }}
      style={{
        position: 'fixed', right: 0, top: 0, bottom: 0, zIndex: 100,
        width: '400px', background: '#0f172a', borderLeft: '1px solid rgba(59,130,246,0.2)',
        boxShadow: '-4px 0 24px rgba(0,0,0,0.4)', display: 'flex', flexDirection: 'column'
      }}
    >
      <div style={{
        padding: '20px', borderBottom: '1px solid rgba(59,130,246,0.2)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <History size={20} color="#3b82f6" />
          <h3 style={{ color: '#f8fafc', fontWeight: 700 }}>Historique des sessions</h3>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={onExport} style={{ padding: '6px 10px', background: '#10b981', border: 'none', borderRadius: 6, color: '#fff', cursor: 'pointer' }}>
            <Download size={14} />
          </button>
          <button onClick={onClear} style={{ padding: '6px 10px', background: '#ef4444', border: 'none', borderRadius: 6, color: '#fff', cursor: 'pointer' }}>
            <Trash2 size={14} />
          </button>
          <button onClick={onClose} style={{ padding: '6px 10px', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 6, color: '#94a3b8', cursor: 'pointer' }}>
            <X size={14} />
          </button>
        </div>
      </div>
      
      <div style={{ padding: '16px' }}>
        <input
          type="text"
          placeholder="Filtrer par épreuve, domaine, niveau..."
          value={filter}
          onChange={e => setFilter(e.target.value)}
          style={{
            width: '100%', padding: '8px 12px',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(59,130,246,0.2)', borderRadius: 8,
            color: '#f8fafc', outline: 'none'
          }}
        />
      </div>
      
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px 16px' }}>
        {filteredHistory.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
            Aucune session enregistrée
          </div>
        ) : (
          filteredHistory.map((session, idx) => (
            <motion.div
              key={session.id || idx}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(59,130,246,0.15)',
                borderRadius: 12, marginBottom: 12, overflow: 'hidden'
              }}
            >
              <div
                onClick={() => setExpanded(prev => ({ ...prev, [idx]: !prev[idx] }))}
                style={{
                  padding: '12px 16px', cursor: 'pointer',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }}
              >
                <div>
                  <div style={{ color: '#f8fafc', fontWeight: 600 }}>{session.examTitle}</div>
                  <div style={{ color: '#64748b', fontSize: '0.7rem' }}>
                    {new Date(session.startTime).toLocaleString()} · {session.students?.length || 0} étudiants
                  </div>
                  {(session.domain || session.level) && (
                    <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
                      {session.domain && (
                        <span style={{ fontSize: '0.6rem', padding: '1px 5px', background: 'rgba(59,130,246,0.15)', borderRadius: 4, color: '#60a5fa' }}>
                          {session.domain}
                        </span>
                      )}
                      {session.level && (
                        <span style={{ fontSize: '0.6rem', padding: '1px 5px', background: 'rgba(139,92,246,0.15)', borderRadius: 4, color: '#a78bfa' }}>
                          {session.level}
                        </span>
                      )}
                    </div>
                  )}
                </div>
                {expanded[idx] ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </div>
              
              <AnimatePresence>
                {expanded[idx] && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    style={{ borderTop: '1px solid rgba(59,130,246,0.1)', padding: '12px 16px' }}
                  >
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                      <div>ID: {session.examId}</div>
                      <div>Durée: {session.duration} min</div>
                      <div>Option: {session.examOption}</div>
                      <div>Domaine: {session.domain || 'N/A'}</div>
                      <div>Niveau: {session.level || 'N/A'}</div>
                      {session.coverImage && (
                        <div style={{ marginTop: '8px' }}>
                          <img 
                            src={session.coverImage} 
                            alt="Couverture"
                            style={{ 
                              maxWidth: '100%', 
                              maxHeight: '80px', 
                              borderRadius: '8px', 
                              objectFit: 'contain',
                              background: 'rgba(0,0,0,0.3)',
                              padding: '4px'
                            }}
                            onError={(e) => { e.target.style.display = 'none'; }}
                          />
                        </div>
                      )}
                      <div>Taux réussite: {session.successRate || 0}%</div>
                      <div>Score moyen: {session.avgScore || 0}%</div>
                    </div>
                    {session.students?.length > 0 && (
                      <div style={{ marginTop: 8 }}>
                        <div style={{ fontSize: '0.7rem', color: '#64748b', marginBottom: 4 }}>Participants:</div>
                        {session.students.slice(0, 5).map((s, i) => (
                          <div key={i} style={{ fontSize: '0.7rem', color: '#e2e8f0' }}>
                            {s.name} - {s.score}/{s.total} ({s.percentage}%)
                          </div>
                        ))}
                        {session.students.length > 5 && (
                          <div style={{ fontSize: '0.7rem', color: '#64748b' }}>+{session.students.length - 5} autres</div>
                        )}
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))
        )}
      </div>
    </motion.div>
  );
};

// ══════════════════════════════════════════════════════════════
//  COMPOSANT PRINCIPAL
// ══════════════════════════════════════════════════════════════
const SurveillancePage = () => {
  // State
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
  const [resultsData, setResultsData] = useState([]);
  const [waitingCounts, setWaitingCounts] = useState({});

  // Refs
  const socketRef = useRef(null);
  const socketInitialized = useRef(false);
  const pollingIntervalRef = useRef(null);
  const autoAdvanceTimerRef = useRef(null);
  const isMounted = useRef(true);
  const navigate = useNavigate();

  // ══════════════════════════════════════════════════════════════
  //  FONCTIONS UTILES
  // ══════════════════════════════════════════════════════════════

  const addAlert = useCallback((alert) => {
    const newAlert = {
      id: Date.now(),
      ...alert,
      timestamp: new Date(),
      read: false
    };
    setAlerts(prev => [newAlert, ...prev].slice(0, 50));
    toast.error(alert.message, { duration: 5000 });
  }, []);

  const getImageUrl = useCallback((exam) => {
    if (!exam) return null;
    if (exam.coverImage) return exam.coverImage;
    if (exam.questions && exam.questions.length > 0) {
      const firstQuestionWithImage = exam.questions.find(q => q.imageQuestion || q.imageBase64);
      if (firstQuestionWithImage) {
        return firstQuestionWithImage.imageQuestion || 
               (firstQuestionWithImage.imageBase64?.startsWith('data:') ? firstQuestionWithImage.imageBase64 : null);
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
        if (!terminalMap.has(key) || (session.lastUpdate > (terminalMap.get(key)?.lastUpdate || 0))) {
          terminalMap.set(key, session);
        }
      } else if (session.type === 'student') {
        const key = session.studentInfo?.matricule || session.sessionId || session.socketId;
        if (!studentMap.has(key) || (session.lastUpdate > (studentMap.get(key)?.lastUpdate || 0))) {
          studentMap.set(key, session);
        }
      }
    });
    
    return [...terminalMap.values(), ...studentMap.values()];
  }, []);

  const getExamTitle = useCallback((examId) => {
    const exam = Array.isArray(exams) ? exams.find(e => e._id === examId) : null;
    return exam?.title || 'Examen inconnu';
  }, [exams]);
  
  const getExamInfo = useCallback((examId) => {
    const exam = Array.isArray(exams) ? exams.find(e => e._id === examId) : null;
    return {
      domain: exam?.domain || '',
      level: exam?.level || '',
      subject: exam?.subject || '',
      coverImage: getImageUrl(exam),
    };
  }, [exams, getImageUrl]);

  const getFilteredSessions = useCallback(() => {
    const unique = getUniqueSessions(activeSessions);
    return {
      unique,
      terminalsWaiting: unique.filter(s => s.type === 'terminal' && s.status === 'connected'),
      terminalsWithExam: unique.filter(s => s.type === 'terminal' && s.status === 'exam_distributed'),
      studentsWaitingForStart: unique.filter(s => s.type === 'student' && s.status === 'waiting'),
      studentsReady: unique.filter(s => s.type === 'student' && s.status === 'composing'),
      studentsActive: unique.filter(s => s.type === 'student' && ['composing', 'finished', 'forced-finished'].includes(s.status)),
    };
  }, [activeSessions, getUniqueSessions]);

  const filtered = getFilteredSessions();
  const { terminalsWaiting, terminalsWithExam, studentsWaitingForStart, studentsReady, studentsActive } = filtered;
  const totalTerminals = terminalsWaiting.length + terminalsWithExam.length;
  const totalStudents = studentsWaitingForStart.length + studentsReady.length + studentsActive.length;

    // ══════════════════════════════════════════════════════════════
  //  CONNEXION SOCKET.IO
  // ══════════════════════════════════════════════════════════════

  useEffect(() => {
    if (socketInitialized.current) {
      console.log('[Surveillance] Socket déjà initialisé, skip');
      return;
    }

    socketInitialized.current = true;
    console.log('[Surveillance] Initialisation Socket.IO');

    const socket = io(SOCKET_URL, {
      transports: ['polling', 'websocket'],
      path: '/socket.io',
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
      forceNew: true,
      autoConnect: true,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      if (!isMounted.current) return;
      console.log('[Surveillance] Socket connecté');
      setIsConnected(true);
      setSocketError(null);
      setReconnectAttempt(0);
      toast.success('Connecté au serveur de surveillance.');
      socket.emit('registerSession', { type: 'surveillance' });
    });

    socket.on('disconnect', (reason) => {
      if (!isMounted.current) return;
      console.log('[Surveillance] Déconnecté:', reason);
      setIsConnected(false);
      if (reason !== 'io client disconnect') {
        addAlert({ type: 'disconnect', message: 'Déconnexion du serveur', severity: 'high' });
      }
    });

    socket.on('connect_error', (err) => {
      if (!isMounted.current) return;
      console.error('[Surveillance] Erreur connexion:', err.message);
      setIsConnected(false);
      setSocketError(err.message);
      addAlert({ type: 'connection_error', message: `Erreur: ${err.message}`, severity: 'medium' });
    });

    socket.on('reconnect_attempt', (attempt) => {
      if (!isMounted.current) return;
      setReconnectAttempt(attempt);
    });

    socket.on('reconnect', () => {
      if (!isMounted.current) return;
      toast.success('Reconnecté au serveur.');
      addAlert({ type: 'reconnect', message: 'Reconnexion réussie', severity: 'info' });
    });

    socket.on('sessionUpdate', (data) => {
      if (!isMounted.current) return;
      const sessions = data.activeSessions || [];
      const enrichedSessions = sessions.map(s => {
        if (s.type === 'student' && s.currentExamId) {
          return { ...s, examInfo: getExamInfo(s.currentExamId) };
        }
        return s;
      });
      setActiveSessions(enrichedSessions);
    });

    socket.on('realtimeExamStats', (stats) => {
      if (!isMounted.current) return;
      console.log('[Surveillance] 📈 Stats reçues:', stats);
      setRealtimeStats(stats);
    });

    socket.on('studentProgressUpdate', (data) => {
      if (!isMounted.current) return;
      console.log('[Surveillance] 📊 Progression reçue:', data);
      
      setActiveSessions(prev => prev.map(session => {
        if (session.socketId === data.studentId) {
          return {
            ...session,
            progress: data.progress,
            currentQuestion: data.currentQuestion,
            score: data.score,
            percentage: data.percentage,
            lastUpdate: Date.now()
          };
        }
        return session;
      }));
    });

    socket.on('currentQuestionIndexForOptionA', (data) => {
      if (!isMounted.current || !data.examId) return;
      setCurrentQIdx(prev => ({ ...prev, [data.examId]: data.questionIndex }));
    });

    socket.on('waitingCountUpdate', (data) => {
      if (!isMounted.current) return;
      console.log(`[Waiting] Exam ${data.examId}: ${data.count} en attente`);
      setWaitingCounts(prev => ({ ...prev, [data.examId]: data.count }));
    });

    socket.on('examStartedConfirm', (data) => {
      if (!isMounted.current) return;
      console.log('[Surveillance] ✅ Confirmation démarrage:', data);
      setIsStartingExam(false);
      if (data.startedCount > 0) {
        toast.success(`✅ ${data.startedCount} étudiant(s) ont commencé l'épreuve !`);
      } else {
        toast('⚠️ Aucun étudiant n\'a pu démarrer l\'épreuve.', { icon: '⚠️' });
        addAlert({ type: 'start_failed', message: 'Aucun étudiant n\'a démarré l\'épreuve', severity: 'medium' });
      }
    });

    socket.on('startExamError', (data) => {
      if (!isMounted.current) return;
      console.error('[Surveillance] ❌ Erreur démarrage:', data);
      setIsStartingExam(false);
      addAlert({ type: 'start_error', message: `Erreur: ${data.error}`, severity: 'high' });
    });

    socket.on('noWaitingStudents', (data) => {
      if (!isMounted.current) return;
      console.log('[Surveillance] ⚠️ Aucun étudiant en attente:', data);
      setIsStartingExam(false);
      addAlert({ type: 'no_students', message: 'Aucun étudiant en attente pour cette épreuve', severity: 'medium' });
    });

    socket.on('studentDisconnected', (data) => {
      if (!isMounted.current) return;
      addAlert({ type: 'student_disconnect', message: `Étudiant ${data.studentName} s'est déconnecté`, severity: 'low' });
    });

    socket.on('terminalReady', (data) => {
      if (!isMounted.current) return;
      console.log('[Surveillance] 🖥️ Terminal prêt:', data);
      addAlert({ type: 'terminal_ready', message: `Terminal ${data.terminalId} prêt pour l'épreuve`, severity: 'low' });
    });

    // ✅ NOUVEAU: Alerte de sécurité (changement de fenêtre)
    socket.on('securityAlert', (alert) => {
      if (!isMounted.current) return;
      console.log('[Surveillance] 🚨 Alerte sécurité reçue:', alert);
      
      // Ajouter l'alerte dans le panneau d'alertes
      addAlert({
        type: 'security',
        message: alert.message,
        severity: alert.severity || 'medium'
      });
      
      // Notification toast
      toast.error(alert.message, { 
        duration: 8000, 
        icon: '⚠️',
        style: { background: '#ef4444', color: '#fff' }
      });
    });

    // ✅ NOUVEAU: Notification de changement de statut de question (pour enseignants)
    socket.on('questionStatusChanged', (data) => {
      if (!isMounted.current) return;
      console.log('[Surveillance] 📝 Statut question changé:', data);
      
      const isRejected = data.status === 'rejected';
      const isApproved = data.status === 'approved';
      
      if (isRejected) {
        addAlert({
          type: 'question_rejected',
          message: `❌ Question rejetée: ${data.questionText}${data.comment ? ` - Motif: ${data.comment}` : ''}`,
          severity: 'medium'
        });
        toast.error(`Question rejetée: ${data.questionText}`, { duration: 8000 });
      } else if (isApproved) {
        addAlert({
          type: 'question_approved',
          message: `✅ Question approuvée: ${data.questionText}`,
          severity: 'low'
        });
        toast.success(`Question approuvée: ${data.questionText}`, { duration: 5000 });
      }
    });

    return () => {
      console.log('[Surveillance] Nettoyage socket');
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      socketInitialized.current = false;
    };
  }, [addAlert, getExamInfo]);

  // ══════════════════════════════════════════════════════════════
  //  POLLING
  // ══════════════════════════════════════════════════════════════

  useEffect(() => {
    const fetchData = async () => {
      if (!isMounted.current) return;
      try {
        const [sessions, surveillance] = await Promise.allSettled([
          getActiveSessions(),
          getSurveillanceData()
        ]);
        
        if (sessions.status === 'fulfilled' && sessions.value?.data?.sessions && isMounted.current) {
          const enriched = sessions.value.data.sessions.map(s => {
            if (s.type === 'student' && s.currentExamId) {
              return { ...s, examInfo: getExamInfo(s.currentExamId) };
            }
            return s;
          });
          setActiveSessions(enriched);
        }
        if (surveillance.status === 'fulfilled' && surveillance.value?.data?.realtimeStats && isMounted.current) {
          setRealtimeStats(surveillance.value.data.realtimeStats);
        }
      } catch (err) {
        console.warn('[Surveillance] Polling error:', err.message);
      }
    };

    fetchData();
    pollingIntervalRef.current = setInterval(fetchData, 30000);

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [getExamInfo]);

  // ══════════════════════════════════════════════════════════════
  //  AVANCEMENT AUTOMATIQUE OPTION A - CORRIGÉ
  // ══════════════════════════════════════════════════════════════

  const handleAdvanceQuestion = useCallback(() => {
    if (!socketRef.current?.connected) {
      toast.error('Socket non connecté');
      return;
    }
    
    const nextIdx = (currentQIdx[selectedExamId] ?? -1) + 1;
    const exam = exams.find(e => e._id === selectedExamId);
    
    if (exam && nextIdx >= (exam.questions?.length || 0)) {
      toast('Fin de l\'épreuve', { icon: 'ℹ️' });
      return;
    }

    if (selectedExamOption === 'B') {
      socketRef.current.emit('displayQuestion', {
        examId: selectedExamId,
        questionIndex: nextIdx,
      });
      toast.success(`Question ${nextIdx + 1} affichée`);
    } else if (selectedExamOption === 'A') {
      socketRef.current.emit('advanceQuestionForOptionA', {
        examId: selectedExamId,
        nextQuestionIndex: nextIdx,
      });
      toast.success(`Question ${nextIdx + 1}`);
    }

    setCurrentQIdx(prev => ({ ...prev, [selectedExamId]: nextIdx }));
  }, [selectedExamId, currentQIdx, selectedExamOption, exams]);

  useEffect(() => {
    if (autoAdvanceTimerRef.current) {
      clearInterval(autoAdvanceTimerRef.current);
      autoAdvanceTimerRef.current = null;
    }

    if (selectedExamOption === 'A' && selectedExamId && autoAdvanceOptionA) {
      autoAdvanceTimerRef.current = setInterval(() => {
        const currentQuestion = currentQIdx[selectedExamId] || 0;
        const exam = exams.find(e => e._id === selectedExamId);
        if (exam && currentQuestion < (exam.questions?.length || 0) - 1) {
          handleAdvanceQuestion();
          toast(`Avancement automatique: Question ${currentQuestion + 2}`, { 
            icon: 'ℹ️', 
            duration: 2000 
          });
        }
      }, 60000);
    }

    return () => {
      if (autoAdvanceTimerRef.current) {
        clearInterval(autoAdvanceTimerRef.current);
        autoAdvanceTimerRef.current = null;
      }
    };
  }, [selectedExamOption, selectedExamId, autoAdvanceOptionA, currentQIdx, exams, handleAdvanceQuestion]);

  // ══════════════════════════════════════════════════════════════
  //  SAUVEGARDE DES SESSIONS
  // ══════════════════════════════════════════════════════════════
  
  const saveSessionToHistory = useCallback((examId, examTitle, examOption, students) => {
    const examInfo = getExamInfo(examId);
    const exam = exams.find(e => e._id === examId);
    const coverImage = getImageUrl(exam);
    
    const session = {
      id: Date.now(),
      examId,
      examTitle,
      examOption,
      domain: examInfo.domain,
      level: examInfo.level,
      subject: examInfo.subject,
      coverImage: coverImage,
      startTime: new Date(),
      endTime: new Date(),
      duration: exams.find(e => e._id === examId)?.duration || 60,
      students: students.map(s => ({
        name: `${s.studentInfo?.firstName} ${s.studentInfo?.lastName}`,
        matricule: s.studentInfo?.matricule,
        score: s.score,
        total: s.totalQuestions,
        percentage: s.percentage
      })),
      avgScore: students.length ? students.reduce((a, s) => a + (s.percentage || 0), 0) / students.length : 0,
      successRate: students.length ? (students.filter(s => s.percentage >= 70).length / students.length) * 100 : 0
    };
    setSessionHistory(prev => [session, ...prev].slice(0, 100));
    const stored = localStorage.getItem('surveillance_history');
    const history = stored ? JSON.parse(stored) : [];
    history.unshift(session);
    localStorage.setItem('surveillance_history', JSON.stringify(history.slice(0, 100)));
  }, [exams, getExamInfo, getImageUrl]);

  useEffect(() => {
    const stored = localStorage.getItem('surveillance_history');
    if (stored) {
      try {
        setSessionHistory(JSON.parse(stored));
      } catch (e) {}
    }
  }, []);

  // ══════════════════════════════════════════════════════════════
  //  EXPORT DES LOGS
  // ══════════════════════════════════════════════════════════════
  
  const exportLogs = useCallback(() => {
    const uniqueSessions = getUniqueSessions(activeSessions);
    const logs = {
      timestamp: new Date().toISOString(),
      activeSessions: uniqueSessions,
      sessionHistory,
      alerts,
      realtimeStats
    };
    
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

  // ══════════════════════════════════════════════════════════════
  //  CHARGEMENT INITIAL AVEC IMAGES
  // ══════════════════════════════════════════════════════════════

  useEffect(() => {
    isMounted.current = true;
    
    const token = localStorage.getItem('userToken');
    console.log('[Surveillance] Token présent au chargement:', !!token);
    
    Promise.all([
      getExams(),
      getResults()
    ]).then(([examsRes, resultsRes]) => {
      if (!isMounted.current) return;
      
      let examsData = [];
      if (Array.isArray(examsRes)) {
        examsData = examsRes;
      } else if (examsRes?.data && Array.isArray(examsRes.data)) {
        examsData = examsRes.data;
      } else if (examsRes?.data?.data && Array.isArray(examsRes.data.data)) {
        examsData = examsRes.data.data;
      }
      
      const normalizedExams = examsData.map(exam => ({
        ...exam,
        domain: exam.domain || exam.metadata?.domain || '',
        level: exam.level || exam.metadata?.level || '',
        subject: exam.subject || exam.metadata?.subject || '',
        coverImage: getImageUrl(exam),
      }));
      
      let results = [];
      if (Array.isArray(resultsRes)) {
        results = resultsRes;
      } else if (resultsRes?.data && Array.isArray(resultsRes.data)) {
        results = resultsRes.data;
      } else if (resultsRes?.data?.data && Array.isArray(resultsRes.data.data)) {
        results = resultsRes.data.data;
      } else if (resultsRes?.results && Array.isArray(resultsRes.results)) {
        results = resultsRes.results;
      }
      
      setExams(normalizedExams);
      setResultsData(results);
      
      console.log(`✅ Chargé: ${normalizedExams.length} examens, ${results.length} résultats`);
      console.log(`📸 Examens avec image: ${normalizedExams.filter(e => e.coverImage).length}`);
    }).catch(err => {
      console.error('Erreur chargement initial:', err);
      if (err.response?.status === 401) {
        toast.error('Session expirée, veuillez vous reconnecter');
        navigate('/login');
      } else {
        toast.error('Erreur de chargement des données');
      }
    });

    return () => {
      isMounted.current = false;
    };
  }, [navigate, getImageUrl]);

  // ══════════════════════════════════════════════════════════════
  //  HANDLERS
  // ══════════════════════════════════════════════════════════════

  const handleDistributeExam = useCallback(() => {
    if (!selectedExamId) {
      toast.error('Sélectionnez une épreuve.');
      return;
    }
    if (!selectedExamOption) {
      toast.error('Choisissez une option.');
      return;
    }
    if (!socketRef.current?.connected) {
      toast.error('Socket non connecté.');
      return;
    }

    console.log('[Surveillance] Distribution épreuve:', selectedExamId, 'Option:', selectedExamOption);
    
    socketRef.current.emit('distributeExam', {
      examId: selectedExamId,
      examOption: selectedExamOption,
      config: null,
      questionCount: 0
    });
    
    toast.success(`Épreuve distribuée — Option ${selectedExamOption}`);
  }, [selectedExamId, selectedExamOption]);

  const handleStartExam = useCallback(() => {
    if (!selectedExamId) {
      toast.error('Sélectionnez une épreuve.');
      return;
    }
    if (!socketRef.current?.connected) {
      toast.error('Socket non connecté.');
      return;
    }
    if (isStartingExam) {
      toast('Démarrage en cours...', { icon: '⏳' });
      return;
    }

    const uniqueSessionsLocal = getUniqueSessions(activeSessions);
    
    const targetStudents = uniqueSessionsLocal.filter(
      s => s.type === 'student' && 
           s.currentExamId === selectedExamId && 
           s.status === 'waiting'
    );

    if (targetStudents.length === 0) {
      const exam = exams.find(e => e._id === selectedExamId);
      toast.error(`⚠️ Aucun étudiant en attente pour "${exam?.title || 'cette épreuve'}"`);
      return;
    }

    toast((t) => (
      <div style={{ background: '#1e293b', padding: '16px', borderRadius: '12px', color: '#fff', maxWidth: '400px' }}>
        <p style={{ marginBottom: '12px', fontWeight: 600 }}>
          🚀 Démarrer l'épreuve pour {targetStudents.length} étudiant(s) en attente ?
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
                const exam = exams.find(e => e._id === selectedExamId);
                saveSessionToHistory(selectedExamId, exam?.title, selectedExamOption, targetStudents);
              }, 1000);
              
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
  }, [selectedExamId, selectedExamOption, activeSessions, getUniqueSessions, exams, isStartingExam, saveSessionToHistory]);

  const handleFinishExam = useCallback(() => {
    if (!selectedExamId) {
      toast.error('Sélectionnez une épreuve.');
      return;
    }
    if (!socketRef.current?.connected) {
      toast.error('Socket non connecté.');
      return;
    }

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

  // ── Classements ──────────────────────────────────────────────
  const fetchRankings = useCallback(async (examId) => {
    if (!examId) { setRankingsData([]); return; }
    setIsLoadingRankings(true);
    try {
      const res = await fetch(`${NODE_BACKEND_URL}/api/rankings/${examId}`);
      const data = await res.json();
      setRankingsData(data?.rankings || []);
    } catch {
      setRankingsData([]);
      toast.error('Impossible de charger le classement.');
    } finally {
      setIsLoadingRankings(false);
    }
  }, []);

  useEffect(() => {
    fetchRankings(rankingExamId);
  }, [rankingExamId, fetchRankings]);

  // ── Impression classement avec image ───────────────────────────────────
  const printRankings = useCallback(() => {
    if (!rankingsData.length) {
      toast.error('Aucun classement à imprimer.');
      return;
    }
    const exam = exams.find(e => e._id === rankingExamId);
    const examTitle = exam?.title || 'Épreuve';
    const examDomain = exam?.domain || '';
    const examLevel = exam?.level || '';
    const coverImage = getImageUrl(exam);
    const medals = ['🥇', '🥈', '🥉'];
    const passed  = rankingsData.filter(e => e.percentage >= 50).length;
    const avg     = (rankingsData.reduce((a, e) => a + (e.percentage || 0), 0) / rankingsData.length).toFixed(1);

    const rows = rankingsData.map((entry, i) => `
      <tr style="border-bottom:1px solid #e2e8f0; background:${i % 2 === 0 ? '#f8fafc' : '#fff'}">
        <td style="padding:8px 12px; font-weight:700; text-align:center; font-size:1.1rem;">${i < 3 ? medals[i] : entry.rank}<\/td>
        <td style="padding:8px 12px; font-weight:600;">${entry.studentInfo?.firstName || ''} ${entry.studentInfo?.lastName || ''}<\/td>
        <td style="padding:8px 12px; color:#64748b; font-family:monospace;">${entry.studentInfo?.matricule || 'N/A'}<\/td>
        <td style="padding:8px 12px; text-align:center;">${entry.score}<\/td>
        <td style="padding:8px 12px; text-align:center; font-weight:700; color:${entry.percentage >= 50 ? '#15803d' : '#dc2626'};">${entry.percentage}%<\/td>
        <td style="padding:8px 12px; text-align:center;">${entry.resultUrl ? `<a href="${NODE_BACKEND_URL}${entry.resultUrl}" target="_blank" style="color:#7c3aed;font-weight:600;">PDF</a>` : '—'}<\/td>
       <\/tr>`).join('');

    const win = window.open('', '_blank');
    win.document.write(`<!DOCTYPE html><html><head><title>Classement — ${examTitle}</title><style>
      body{font-family:Arial,sans-serif;margin:20px;}
      table{border-collapse:collapse;width:100%;}
      th,td{padding:8px;text-align:left;border-bottom:1px solid #ddd;}
      th{background:#f2f2f2;}
      .exam-image{max-width:200px;margin-bottom:20px;border-radius:8px;}
    </style></head><body>
      <h1>Classement - ${examTitle}</h1>
      ${coverImage ? `<img src="${coverImage}" alt="${examTitle}" class="exam-image" onerror="this.style.display='none'" />` : ''}
      ${examDomain ? `<p><strong>Domaine:</strong> ${examDomain}</p>` : ''}
      ${examLevel ? `<p><strong>Niveau:</strong> ${examLevel}</p>` : ''}
      <p>Moyenne: ${avg}% | Taux de réussite: ${((passed/rankingsData.length)*100).toFixed(1)}% | ${rankingsData.length} candidats</p>
      <table><thead><tr><th>Rang</th><th>Candidat</th><th>Matricule</th><th>Score</th><th>%</th><th>Bulletin</th></tr></thead><tbody>${rows}</tbody></table>
      <script>window.onload=()=>{window.print();setTimeout(()=>window.close(),500);}</script>
    </body></html>`);
    win.document.close();
  }, [rankingsData, rankingExamId, exams, getImageUrl]);

  // ── Chart données ───────────────────────────────────────────
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
    plugins: { legend: { labels: { color: '#94a3b8' } }, title: { display: false } },
    scales: {
      y: { min: 0, max: 100, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94a3b8' } },
      x: { grid: { display: false }, ticks: { color: '#94a3b8' } },
    },
  };

  // ══════════════════════════════════════════════════════════════
  //  RENDER
  // ══════════════════════════════════════════════════════════════
  return (
    <div style={{
      minHeight: '100vh',
      fontFamily: "'DM Sans', sans-serif",
      background: 'linear-gradient(135deg, #05071a 0%, #0a0f2e 60%, #05071a 100%)',
      position: 'relative', overflow: 'hidden', padding: '0 0 40px',
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
          <ConnectionBadge connected={isConnected} error={socketError} reconnectAttempt={reconnectAttempt} />
          
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setShowHistory(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: '7px',
              padding: '8px 16px', borderRadius: '8px',
              background: 'rgba(59,130,246,0.15)',
              border: '1px solid rgba(59,130,246,0.3)',
              color: '#60a5fa', fontSize: '0.875rem', fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            <History size={15} /> Historique
          </motion.button>
          
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setShowAlerts(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: '7px',
              padding: '8px 16px', borderRadius: '8px',
              background: alerts.length > 0 ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.06)',
              border: `1px solid ${alerts.length > 0 ? '#ef4444' : 'rgba(255,255,255,0.1)'}`,
              color: alerts.length > 0 ? '#ef4444' : '#cbd5e1',
              cursor: 'pointer',
              position: 'relative',
            }}
          >
            <AlertCircle size={15} />
            Alertes
            {alerts.length > 0 && (
              <span style={{
                position: 'absolute', top: -4, right: -4,
                background: '#ef4444', borderRadius: '999px',
                width: '16px', height: '16px', fontSize: '10px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff'
              }}>
                {alerts.length}
              </span>
            )}
          </motion.button>
          
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => {
              getActiveSessions().then(r => {
                if (r.data?.sessions) {
                  const enriched = r.data.sessions.map(s => {
                    if (s.type === 'student' && s.currentExamId) {
                      return { ...s, examInfo: getExamInfo(s.currentExamId) };
                    }
                    return s;
                  });
                  setActiveSessions(enriched);
                }
              });
              if (socketRef.current?.connected) socketRef.current.emit('getSurveillanceData');
              toast.success('Actualisé');
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
            <RefreshCw size={15} /> Rafraîchir
          </motion.button>
          
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
            onClick={exportLogs}
            style={{
              display: 'flex', alignItems: 'center', gap: '7px',
              padding: '8px 16px', borderRadius: '8px',
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: '#cbd5e1', fontSize: '0.875rem', fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            <FileText size={15} /> Export Logs
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

        {/* LIGNE 1 : Contrôle + Terminaux + Stats */}
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
                {Array.isArray(exams) && exams.map(e => {
                  const info = `${e.title}${e.domain ? ` (${e.domain})` : ''}${e.level ? ` - ${e.level}` : ''}`;
                  return (
                    <option key={e._id} value={e._id} style={{ background: '#1e293b' }}>
                      {info}
                    </option>
                  );
                })}
              </select>
              {selectedExamId && (() => {
                const exam = exams.find(e => e._id === selectedExamId);
                if (!exam) return null;
                const imageUrl = getImageUrl(exam);
                return (
                  <div style={{ marginTop: '12px' }}>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
                      {exam.domain && (
                        <span style={{ fontSize: '0.65rem', padding: '2px 6px', background: 'rgba(59,130,246,0.15)', borderRadius: '4px', color: '#60a5fa' }}>
                          <Tag size={10} style={{ display: 'inline', marginRight: 2 }} />
                          {exam.domain}
                        </span>
                      )}
                      {exam.level && (
                        <span style={{ fontSize: '0.65rem', padding: '2px 6px', background: 'rgba(139,92,246,0.15)', borderRadius: '4px', color: '#a78bfa' }}>
                          <Layers size={10} style={{ display: 'inline', marginRight: 2 }} />
                          {exam.level}
                        </span>
                      )}
                      {exam.subject && (
                        <span style={{ fontSize: '0.65rem', padding: '2px 6px', background: 'rgba(16,185,129,0.15)', borderRadius: '4px', color: '#34d399' }}>
                          <BookOpen size={10} style={{ display: 'inline', marginRight: 2 }} />
                          {exam.subject}
                        </span>
                      )}
                    </div>
                    
                    {imageUrl && (
                      <div style={{ marginTop: '12px' }}>
                        <div style={{ fontSize: '0.7rem', color: '#64748b', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <ImageIcon size={12} /> Image de l'épreuve
                        </div>
                        <img 
                          src={imageUrl} 
                          alt={exam.title}
                          style={{
                            width: '100%',
                            maxHeight: '120px',
                            borderRadius: '8px',
                            objectFit: 'cover',
                            border: '1px solid rgba(59,130,246,0.2)',
                            background: '#0f172a'
                          }}
                          onError={(e) => {
                            e.target.style.display = 'none';
                            console.warn('Image non trouvée pour:', exam.title);
                          }}
                        />
                      </div>
                    )}
                  </div>
                );
              })()}
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

            {selectedExamOption === 'A' && (
              <div style={{ marginBottom: '16px', padding: '8px 12px', background: 'rgba(239,68,68,0.1)', borderRadius: '8px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={autoAdvanceOptionA}
                    onChange={e => setAutoAdvanceOptionA(e.target.checked)}
                    style={{ accentColor: '#ef4444' }}
                  />
                  <span style={{ color: '#ef4444', fontSize: '0.8rem' }}>Avancement automatique des questions (60s)</span>
                </label>
                <p style={{ color: '#64748b', fontSize: '0.7rem', marginTop: '4px' }}>
                  {autoAdvanceOptionA ? '✓ Avancement automatique actif' : '✗ Avancement manuel uniquement'}
                </p>
              </div>
            )}

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
                        {waitingCounts[selectedExamId] || 0} en attente
                      </span>
                    </>
                  )}
                </motion.button>
              )}

              {selectedExamId && (selectedExamOption === 'B' || selectedExamOption === 'A') && (
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
                  QUESTION SUIVANTE
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
                      {terminalsWaiting.map(t => <TerminalCard key={t.socketId || t.sessionId} terminal={t} />)}
                    </AnimatePresence>
                  </div>
              }
            </div>

            {studentsWaitingForStart.length > 0 && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '7px' }}>
                    <Clock size={16} color="#8b5cf6" />
                    En attente de démarrage
                    <span style={{ background: 'rgba(139,92,246,0.15)', color: '#8b5cf6', fontSize: '0.72rem', fontWeight: 700, padding: '2px 9px', borderRadius: '999px' }}>
                      {studentsWaitingForStart.length}
                    </span>
                  </h3>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      getActiveSessions().then(r => {
                        if (r.data?.sessions) {
                          const enriched = r.data.sessions.map(s => {
                            if (s.type === 'student' && s.currentExamId) {
                              return { ...s, examInfo: getExamInfo(s.currentExamId) };
                            }
                            return s;
                          });
                          setActiveSessions(enriched);
                        }
                      });
                    }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '4px',
                      padding: '4px 8px', borderRadius: '6px',
                      background: 'rgba(139,92,246,0.2)',
                      border: '1px solid rgba(139,92,246,0.3)',
                      color: '#8b5cf6', fontSize: '0.7rem', cursor: 'pointer'
                    }}
                  >
                    <RefreshCw size={12} /> Rafraîchir
                  </motion.button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '300px', overflowY: 'auto' }}>
                  <AnimatePresence>
                    {studentsWaitingForStart.map(s => (
                      <motion.div
                        key={s.socketId || s.studentInfo?.matricule || s.sessionId}
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
                            {s.examInfo?.domain && (
                              <div style={{ display: 'flex', gap: '4px', marginTop: '2px' }}>
                                <span style={{ fontSize: '0.55rem', color: '#60a5fa' }}>{s.examInfo.domain}</span>
                              </div>
                            )}
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

            {/* Affichage du compteur d'attente pour l'épreuve sélectionnée */}
            {selectedExamId && waitingCounts[selectedExamId] !== undefined && (
              <div style={{
                marginTop: '8px',
                padding: '8px',
                background: 'rgba(59,130,246,0.15)',
                borderRadius: '8px',
                textAlign: 'center'
              }}>
                <span style={{ color: '#3b82f6', fontWeight: 700 }}>
                  {waitingCounts[selectedExamId]} étudiant(s) en salle d'attente
                </span>
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
                    {terminalsWithExam.map(t => <TerminalCard key={t.socketId || t.sessionId} terminal={t} />)}
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
                  {(() => {
                    const exam = exams.find(e => e._id === realtimeStats.examId);
                    if (!exam) return null;
                    return (
                      <div style={{ display: 'flex', gap: '8px', marginTop: '4px', flexWrap: 'wrap' }}>
                        {exam.domain && <span style={{ fontSize: '0.6rem', padding: '1px 5px', background: 'rgba(59,130,246,0.15)', borderRadius: 4, color: '#60a5fa' }}>{exam.domain}</span>}
                        {exam.level && <span style={{ fontSize: '0.6rem', padding: '1px 5px', background: 'rgba(139,92,246,0.15)', borderRadius: 4, color: '#a78bfa' }}>{exam.level}</span>}
                      </div>
                    );
                  })()}
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

        {/* LIGNE 2 : Étudiants en composition */}
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
                    key={student.socketId || student.sessionId || student.studentInfo?.matricule || Math.random()}
                    student={student}
                    examTitle={getExamTitle(student.currentExamId)}
                    examInfo={getExamInfo(student.currentExamId)}
                    backendUrl={NODE_BACKEND_URL}
                    onAlert={addAlert}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}
        </motion.div>

        {/* LIGNE 3 : Classement des Compétiteurs avec images */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
          style={{ background: 'rgba(15,23,42,0.75)', backdropFilter: 'blur(12px)', border: '1px solid rgba(139,92,246,0.2)', borderRadius: '20px', padding: '22px', marginTop: '20px' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '12px' }}>
            <h2 style={{ fontFamily: "'Sora', sans-serif", fontSize: '1.1rem', fontWeight: 700, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
              <Trophy size={18} color="#f59e0b" />
              Classement des Compétiteurs
              {rankingsData.length > 0 && (
                <span style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b', padding: '2px 10px', borderRadius: '999px', fontSize: '0.72rem', fontWeight: 700 }}>
                  {rankingsData.length} candidats
                </span>
              )}
            </h2>
            <div style={{ display: 'flex', gap: '8px' }}>
              {rankingsData.length > 0 && (
                <>
                  <motion.button
                    whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                    onClick={() => fetchRankings(rankingExamId)}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 14px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', fontSize: '0.8rem', cursor: 'pointer' }}
                  >
                    <RefreshCw size={13} /> Actualiser
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                    onClick={printRankings}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 14px', borderRadius: '8px', background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', border: 'none', color: '#fff', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}
                  >
                    <Printer size={13} /> Imprimer PDF
                  </motion.button>
                </>
              )}
            </div>
          </div>

          <div style={{ marginBottom: '18px' }}>
            <label style={{ display: 'block', fontSize: '0.78rem', color: '#64748b', marginBottom: '7px' }}>Sélectionner une épreuve</label>
            <select
              value={rankingExamId}
              onChange={e => setRankingExamId(e.target.value)}
              style={{ width: '100%', maxWidth: '520px', padding: '10px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(139,92,246,0.25)', borderRadius: '10px', color: rankingExamId ? '#f8fafc' : '#64748b', fontSize: '0.88rem', outline: 'none' }}
            >
              <option value="" style={{ background: '#1e293b' }}>-- Choisir une épreuve --</option>
              {Array.isArray(exams) && exams.map(e => {
                const info = `${e.title}${e.domain ? ` (${e.domain})` : ''}${e.level ? ` - ${e.level}` : ''}`;
                return (
                  <option key={e._id} value={e._id} style={{ background: '#1e293b' }}>
                    {info}
                  </option>
                );
              })}
            </select>
          </div>

          {!rankingExamId ? (
            <div style={{ textAlign: 'center', padding: '36px 0' }}>
              <Trophy size={36} color="#1e293b" style={{ marginBottom: '12px' }} />
              <p style={{ color: '#475569', fontSize: '0.85rem' }}>Sélectionnez une épreuve pour afficher le classement.</p>
            </div>
          ) : isLoadingRankings ? (
            <div style={{ textAlign: 'center', padding: '36px 0' }}>
              <RefreshCw size={24} color="#8b5cf6" style={{ animation: 'spin 1s linear infinite', marginBottom: '10px' }} />
              <p style={{ color: '#64748b', fontSize: '0.85rem' }}>Chargement…</p>
            </div>
          ) : rankingsData.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '36px 0', color: '#475569', fontSize: '0.85rem' }}>
              Aucun résultat enregistré pour cette épreuve.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid rgba(139,92,246,0.3)' }}>
                    <th style={{ padding: '10px 12px', textAlign: 'left', color: '#94a3b8' }}>Rang</th>
                    <th style={{ padding: '10px 12px', textAlign: 'left', color: '#94a3b8' }}>Image</th>
                    <th style={{ padding: '10px 12px', textAlign: 'left', color: '#94a3b8' }}>Étudiant</th>
                    <th style={{ padding: '10px 12px', textAlign: 'left', color: '#94a3b8' }}>Score</th>
                    <th style={{ padding: '10px 12px', textAlign: 'left', color: '#94a3b8' }}>%</th>
                    <th style={{ padding: '10px 12px', textAlign: 'left', color: '#94a3b8' }}>Domaine</th>
                    <th style={{ padding: '10px 12px', textAlign: 'left', color: '#94a3b8' }}>Niveau</th>
                  </tr>
                </thead>
                <tbody>
                  {rankingsData.slice(0, 10).map((entry, index) => {
                    const exam = exams.find(e => e._id === rankingExamId);
                    const imageUrl = getImageUrl(exam);
                    return (
                      <tr key={entry.resultId || index} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <td style={{ padding: '10px 12px' }}>{index + 1}</td>
                        <td style={{ padding: '10px 12px' }}>
                          {imageUrl ? (
                            <img 
                              src={imageUrl} 
                              alt=""
                              style={{ 
                                width: '40px', 
                                height: '40px', 
                                borderRadius: '6px', 
                                objectFit: 'cover',
                                background: '#0f172a',
                                border: '1px solid rgba(139,92,246,0.3)'
                              }}
                              onError={(e) => { e.target.style.display = 'none'; }}
                            />
                          ) : (
                            <div style={{ 
                              width: '40px', 
                              height: '40px', 
                              borderRadius: '6px', 
                              background: 'rgba(139,92,246,0.1)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#64748b'
                            }}>
                              <ImageIcon size={16} />
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '10px 12px', color: '#f1f5f9' }}>{entry.studentInfo?.firstName} {entry.studentInfo?.lastName}</td>
                        <td style={{ padding: '10px 12px', color: '#f1f5f9' }}>{entry.score}</td>
                        <td style={{ padding: '10px 12px' }}>
                          <span style={{ color: entry.percentage >= 50 ? '#10b981' : '#ef4444' }}>{entry.percentage}%</span>
                        </td>
                        <td style={{ padding: '10px 12px', color: '#60a5fa', fontSize: '0.8rem' }}>{exam?.domain || '—'}</td>
                        <td style={{ padding: '10px 12px', color: '#a78bfa', fontSize: '0.8rem' }}>{exam?.level || '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>
      </main>

      {/* Panneau Historique */}
      <AnimatePresence>
        {showHistory && (
          <SessionHistoryPanel
            history={sessionHistory}
            onClose={() => setShowHistory(false)}
            onExport={exportLogs}
            onClear={clearHistory}
          />
        )}
      </AnimatePresence>

      {/* Panneau Alertes */}
      <AnimatePresence>
        {showAlerts && (
          <motion.div
            initial={{ opacity: 0, x: 300 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 300 }}
            style={{
              position: 'fixed', right: 0, top: 0, bottom: 0, zIndex: 100,
              width: '380px', background: '#0f172a', borderLeft: '1px solid rgba(239,68,68,0.3)',
              boxShadow: '-4px 0 24px rgba(0,0,0,0.4)', display: 'flex', flexDirection: 'column'
            }}
          >
            <div style={{
              padding: '20px', borderBottom: '1px solid rgba(239,68,68,0.2)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertCircle size={20} color="#ef4444" />
                <h3 style={{ color: '#f8fafc', fontWeight: 700 }}>Alertes système</h3>
                <span style={{ background: '#ef4444', padding: '2px 8px', borderRadius: '999px', fontSize: '0.7rem', color: '#fff' }}>
                  {alerts.length}
                </span>
              </div>
              <button onClick={() => setShowAlerts(false)} style={{ padding: '6px 10px', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 6, color: '#94a3b8', cursor: 'pointer' }}>
                <X size={14} />
              </button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
              {alerts.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                  Aucune alerte
                </div>
              ) : (
                alerts.map(alert => (
                  <motion.div
                    key={alert.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{
                      background: alert.severity === 'high' ? 'rgba(239,68,68,0.1)' : 
                                  alert.severity === 'medium' ? 'rgba(245,158,11,0.1)' : 
                                  'rgba(59,130,246,0.1)',
                      border: `1px solid ${alert.severity === 'high' ? '#ef4444' : 
                                          alert.severity === 'medium' ? '#f59e0b' : 
                                          '#3b82f6'}30`,
                      borderRadius: '10px', padding: '12px', marginBottom: '10px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                      {alert.severity === 'high' && <AlertTriangle size={14} color="#ef4444" />}
                      <span style={{ color: '#f8fafc', fontSize: '0.85rem', fontWeight: 600 }}>{alert.type}</span>
                      <span style={{ marginLeft: 'auto', color: '#64748b', fontSize: '0.65rem' }}>
                        {new Date(alert.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <p style={{ color: '#94a3b8', fontSize: '0.8rem' }}>{alert.message}</p>
                  </motion.div>
                ))
              )}
            </div>
            <div style={{ padding: '16px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
              <button
                onClick={() => setAlerts([])}
                style={{ width: '100%', padding: '8px', background: '#ef4444', border: 'none', borderRadius: '8px', color: '#fff', cursor: 'pointer', fontSize: '0.8rem' }}
              >
                Effacer toutes les alertes
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <Toaster position="bottom-right" toastOptions={{ style: { background: '#1e293b', color: '#f1f5f9', border: '1px solid rgba(59,130,246,0.2)' } }} />

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.5;transform:scale(1.3)} }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default SurveillancePage;