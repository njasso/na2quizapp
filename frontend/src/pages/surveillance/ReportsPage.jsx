// src/pages/surveillance/ReportsPage.jsx - Version finale corrigée
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { toast, Toaster } from 'react-hot-toast';
import api from '../../services/api';
import {
  Home, RefreshCw, Search, Filter, Trash2, Eye, Printer,
  ChevronDown, ChevronUp, ChevronLeft, ChevronRight,
  Trophy, Users, BarChart3, FileText, Calendar,
  CheckCircle, XCircle, Download, Copy, X,
  TrendingUp, Award, BookOpen, Link, Settings, ArrowLeft, Tag, Layers, AlertCircle
} from 'lucide-react';

const NODE_BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'https://na2quizapp.onrender.com';
const PAGE_SIZE = 12;

// ── Helpers ────────────────────────────────────────────────────
const mention = (pct) =>
  pct >= 90 ? { label: 'Très Bien', color: '#10b981' } :
  pct >= 75 ? { label: 'Bien', color: '#3b82f6' } :
  pct >= 60 ? { label: 'Assez Bien', color: '#8b5cf6' } :
  pct >= 50 ? { label: 'Passable', color: '#f59e0b' } :
              { label: 'Insuffisant', color: '#ef4444' };

const note20 = (pct) => ((pct / 100) * 20).toFixed(2);

// ✅ Définir normalizeQuestionForDisplay AVANT son utilisation
const normalizeQuestionForDisplay = (q, studentAnswer) => {
  let correctAnswerText = '';
  if (typeof q.bonOpRep === 'number' && q.options) {
    correctAnswerText = q.options[q.bonOpRep] || '';
  } else if (q.correctAnswer) {
    correctAnswerText = q.correctAnswer;
  } else if (q.answer) {
    correctAnswerText = q.answer;
  }
  
  let isCorrect = false;
  if (typeof q.bonOpRep === 'number' && q.options) {
    const selectedIndex = q.options.findIndex(opt => opt === studentAnswer);
    isCorrect = selectedIndex === q.bonOpRep;
  } else {
    isCorrect = studentAnswer && studentAnswer === correctAnswerText;
  }
  
  return {
    _id: q._id,
    questionText: q.libQuestion || q.question || q.text || '',
    options: q.options || [],
    studentAnswer: studentAnswer || 'Non répondu',
    correctAnswer: correctAnswerText,
    isCorrect,
    type: q.type || (q.typeQuestion === 2 ? 'multiple' : 'single'),
    points: q.points || 1,
    explanation: q.explanation || '',
    domaine: q.domaine || '',
    niveau: q.niveau || '',
    matiere: q.matiere || '',
  };
};

const Btn = ({ children, onClick, color = '#64748b', active, style: s }) => (
  <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
    onClick={onClick}
    style={{
      display: 'flex', alignItems: 'center', gap: 5,
      padding: '7px 14px', borderRadius: 8, cursor: 'pointer',
      border: `1px solid ${active ? color : color + '44'}`,
      background: active ? `${color}20` : `${color}0d`,
      color: active ? color : '#94a3b8',
      fontSize: '0.82rem', fontWeight: active ? 700 : 500,
      fontFamily: 'DM Sans, sans-serif', ...s,
    }}>
    {children}
  </motion.button>
);

// ── Fonction d'export CSV ──────────────────────────────────────
const exportToCSV = (data, filename = 'rapport_na2quiz') => {
  if (!data || data.length === 0) {
    toast.error('Aucune donnée à exporter');
    return;
  }

  const headers = ['Nom', 'Prénom', 'Matricule', 'Épreuve', 'Domaine', 'Niveau', 'Matière', 'Score', 'Pourcentage', 'Statut', 'Date', 'Option', 'Note/20'];
  const rows = data.map(r => [
    r.studentInfo?.lastName || '',
    r.studentInfo?.firstName || '',
    r.studentInfo?.matricule || '',
    r.examId?.title || r.examTitle || '',
    r.examId?.domain || r.domain || '',
    r.examId?.level || r.level || '',
    r.examId?.subject || r.subject || '',
    r.score || 0,
    r.percentage || 0,
    r.passed ? 'Réussi' : 'Échoué',
    new Date(r.createdAt).toLocaleDateString('fr-FR'),
    r.examOption || (r.examId?.examOption) || '',
    note20(r.percentage || 0)
  ]);
  
  const csvContent = [headers, ...rows].map(row => row.join(';')).join('\n');
  const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.href = url;
  link.setAttribute('download', `${filename}_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  toast.success('Export CSV réussi');
};

// ── Modal Bulletin enrichie avec affichage de la configuration ──
const BulletinModal = ({ report, onClose }) => {
  // ✅ TOUS LES HOOKS AVANT LE RETURN CONDITIONNEL
  
  // Mémoriser les données calculées
  const m = useMemo(() => mention(report?.percentage || 0), [report?.percentage]);
  const n20 = useMemo(() => note20(report?.percentage || 0), [report?.percentage]);
  
  const qs = report?.examQuestions || report?.examId?.questions || [];
  const ans = report?.answers instanceof Object ? report?.answers : {};
  const config = report?.config || report?.examId?.config || null;
  
  const normalizedQuestions = useMemo(() => {
    return qs.map((q, idx) => {
      const qId = q._id?.toString?.() || String(idx);
      const studentAnswer = ans[qId] || null;
      return normalizeQuestionForDisplay(q, studentAnswer);
    });
  }, [qs, ans]);

  const printBulletin = useCallback(() => {
    if (report?._id) {
      window.open(`${NODE_BACKEND_URL}/api/bulletin/${report._id}`, '_blank');
    }
  }, [report]);

  const getOptionLabel = useCallback((opt) => {
    const labels = {
      A: 'Collective Figée',
      B: 'Collective Souple',
      C: 'Personnalisée',
      D: 'Aléatoire'
    };
    return labels[opt] || `Option ${opt}`;
  }, []);

  // ✅ APRÈS TOUS LES HOOKS, ON PEUT FAIRE LE RETURN CONDITIONNEL
  if (!report) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
          onClick={e => e.stopPropagation()}
          style={{ background: '#0d1424', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 20, width: '100%', maxWidth: 680, maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
        >
          <div style={{ padding: '18px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
            <div>
              <div style={{ color: '#f1f5f9', fontWeight: 700, fontSize: '1rem', fontFamily: 'Sora, sans-serif' }}>
                {report.studentInfo?.lastName} {report.studentInfo?.firstName}
              </div>
              <div style={{ color: '#64748b', fontSize: '0.78rem', marginTop: 2 }}>
                {report.examId?.title || report.examTitle} · {new Date(report.createdAt).toLocaleDateString('fr-FR')}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <Btn onClick={printBulletin} color="#3b82f6"><Printer size={13}/> Imprimer PDF</Btn>
              <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <X size={15}/>
              </button>
            </div>
          </div>

          <div style={{ overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
              {[
                { label: 'Score', value: `${report.score || 0} / ${report.totalQuestions || qs.length}`, color: '#3b82f6' },
                { label: 'Résultat', value: `${report.percentage || 0}%`, color: m.color },
                { label: 'Note /20', value: n20, color: '#8b5cf6' },
              ].map(({ label, value, color }) => (
                <div key={label} style={{ background: `${color}10`, border: `1px solid ${color}25`, borderRadius: 12, padding: '12px 14px', textAlign: 'center' }}>
                  <div style={{ color: '#64748b', fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>{label}</div>
                  <div style={{ color, fontSize: '1.5rem', fontWeight: 800, fontFamily: 'Sora, sans-serif' }}>{value}</div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '10px 16px', background: `${m.color}10`, border: `1px solid ${m.color}30`, borderRadius: 10 }}>
              {report.passed ? <CheckCircle size={16} color="#10b981"/> : <XCircle size={16} color="#ef4444"/>}
              <span style={{ color: m.color, fontWeight: 700, fontSize: '0.95rem' }}>
                {report.passed ? '✓ REÇU' : '✗ AJOURNÉ'} — {m.label}
              </span>
            </div>

            {config && (
              <div style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 12, padding: '14px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <Settings size={14} color="#8b5cf6" />
                  <span style={{ color: '#a5b4fc', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Configuration de l'épreuve</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.78rem' }}>
                  <span style={{ color: '#64748b' }}>Option :</span>
                  <span style={{ color: '#e2e8f0' }}>{getOptionLabel(config.examOption)} ({config.examOption})</span>
                  {config.openRange && (
                    <>
                      <span style={{ color: '#64748b' }}>Plage ouverte :</span>
                      <span style={{ color: '#e2e8f0' }}>{config.requiredQuestions} questions à traiter</span>
                    </>
                  )}
                  <span style={{ color: '#64748b' }}>Séquencement :</span>
                  <span style={{ color: '#e2e8f0' }}>{config.sequencing === 'identical' ? 'Identique pour tous' : 'Aléatoire par étudiant'}</span>
                  {config.allowRetry && (
                    <>
                      <span style={{ color: '#64748b' }}>Reprise :</span>
                      <span style={{ color: '#e2e8f0' }}>Autorisée (une fois)</span>
                    </>
                  )}
                  <span style={{ color: '#64748b' }}>Chronomètre :</span>
                  <span style={{ color: '#e2e8f0' }}>
                    {config.timerPerQuestion ? `${config.timePerQuestion} sec/question` : `${config.totalTime} min totales`}
                  </span>
                  {config.showBinaryResult && (
                    <span style={{ color: '#64748b', gridColumn: 'span 2' }}>✓ Résultat binaire affiché après chaque QCM</span>
                  )}
                  {config.showCorrectAnswer && (
                    <span style={{ color: '#64748b', gridColumn: 'span 2' }}>✓ Bonne réponse affichée après chaque QCM</span>
                  )}
                </div>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {[
                ['Candidat', [
                  ['Nom', `${report.studentInfo?.lastName || '—'}`],
                  ['Prénom', `${report.studentInfo?.firstName || '—'}`],
                  ['Matricule', report.studentInfo?.matricule || '—'],
                  ['Niveau', report.studentInfo?.level || '—'],
                ]],
                ['Épreuve', [
                  ['Domaine', report.examId?.domain || report.domain || '—'],
                  ['Niveau', report.examId?.level || report.level || '—'],
                  ['Matière', report.examId?.subject || report.subject || '—'],
                  ['Seuil', `${report.passingScore || report.examId?.passingScore || 50}%`],
                  ['Date', new Date(report.createdAt).toLocaleDateString('fr-FR')],
                ]],
              ].map(([title, rows]) => (
                <div key={title} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: '12px 14px' }}>
                  <div style={{ color: '#64748b', fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>{title}</div>
                  {rows.map(([k, v]) => (
                    <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: 4 }}>
                      <span style={{ color: '#64748b' }}>{k}</span>
                      <span style={{ color: '#e2e8f0', fontWeight: 500 }}>{v}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>

            {normalizedQuestions.length > 0 && (
              <div>
                <div style={{ color: '#64748b', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Détail des réponses</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {normalizedQuestions.map((q, i) => (
                    <div key={i} style={{ padding: '10px 12px', borderRadius: 9, border: `1px solid ${q.isCorrect ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`, background: q.isCorrect ? 'rgba(16,185,129,0.05)' : 'rgba(239,68,68,0.05)' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 4 }}>
                        {q.isCorrect ? <CheckCircle size={13} color="#10b981" style={{ flexShrink: 0, marginTop: 2 }}/> : <XCircle size={13} color="#ef4444" style={{ flexShrink: 0, marginTop: 2 }}/>}
                        <span style={{ color: '#e2e8f0', fontSize: '0.83rem', fontWeight: 500, lineHeight: 1.4 }}>Q{i+1}. {q.questionText}</span>
                      </div>
                      <div style={{ paddingLeft: 21, fontSize: '0.78rem' }}>
                        <span style={{ color: '#64748b' }}>Réponse : </span>
                        <span style={{ color: q.isCorrect ? '#10b981' : '#ef4444', fontWeight: 600 }}>{q.studentAnswer || '—'}</span>
                        {!q.isCorrect && <><span style={{ color: '#334155' }}> | Correcte : </span><span style={{ color: '#10b981', fontWeight: 600 }}>{q.correctAnswer}</span></>}
                      </div>
                      {q.explanation && (
                        <div style={{ paddingLeft: 21, marginTop: 4, fontSize: '0.7rem', color: '#64748b' }}>💡 {q.explanation}</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ padding: '10px 14px', background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <span style={{ color: '#64748b', fontSize: '0.78rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {NODE_BACKEND_URL}/api/bulletin/{report._id}
              </span>
              <button onClick={() => { navigator.clipboard?.writeText(`${NODE_BACKEND_URL}/api/bulletin/${report._id}`); toast.success('Lien copié !'); }} style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 7, background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.3)', color: '#a5b4fc', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600 }}>
                <Copy size={12}/> Copier
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
// ── Carte résultat ──────────────────────────────────────────────
const ReportCard = ({ report, onView, onDelete, onPrint }) => {
  const m   = mention(report.percentage || 0);
  const n20 = note20(report.percentage || 0);
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      style={{ background: 'rgba(15,23,42,0.8)', border: `1px solid ${report.passed ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.15)'}`, borderRadius: 12, padding: '14px 16px', backdropFilter: 'blur(8px)' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: '#f1f5f9', fontWeight: 700, fontSize: '0.92rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {report.studentInfo?.lastName} {report.studentInfo?.firstName}
          </div>
          <div style={{ color: '#64748b', fontSize: '0.75rem', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {report.studentInfo?.matricule || '—'} · {report.examId?.title || report.examTitle || '—'}
          </div>
        </div>
        <span style={{ padding: '2px 8px', borderRadius: 999, background: `${m.color}12`, border: `1px solid ${m.color}30`, color: m.color, fontSize: '0.7rem', fontWeight: 700, flexShrink: 0, marginLeft: 8 }}>
          {report.passed ? '✓' : '✗'} {m.label}
        </span>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, marginBottom: 12 }}>
        {[
          { l: 'Score',   v: `${report.score || 0}/${report.totalQuestions || '?'}`, c: '#3b82f6' },
          { l: 'Résultat', v: `${report.percentage || 0}%`, c: m.color },
          { l: '/20',     v: n20, c: '#8b5cf6' },
        ].map(({ l, v, c }) => (
          <div key={l} style={{ background: `${c}08`, border: `1px solid ${c}18`, borderRadius: 8, padding: '5px 8px', textAlign: 'center' }}>
            <div style={{ color: '#475569', fontSize: '0.62rem', textTransform: 'uppercase' }}>{l}</div>
            <div style={{ color: c, fontWeight: 700, fontSize: '0.9rem' }}>{v}</div>
          </div>
        ))}
      </div>

      {/* Date */}
      <div style={{ color: '#334155', fontSize: '0.7rem', marginBottom: 10 }}>
        {new Date(report.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 6 }}>
        <Btn onClick={() => onView(report)} color="#6366f1" style={{ flex: 1, justifyContent: 'center' }}>
          <Eye size={12}/> Voir
        </Btn>
        <Btn onClick={() => onPrint(report)} color="#3b82f6">
          <Printer size={12}/>
        </Btn>
        <Btn onClick={() => onDelete(report._id)} color="#ef4444">
          <Trash2 size={12}/>
        </Btn>
      </div>
    </motion.div>
  );
};

// ── Pagination ──────────────────────────────────────────────────
const Pagination = ({ page, total, perPage, onChange }) => {
  const pages = Math.ceil(total / perPage);
  if (pages <= 1) return null;
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 20 }}>
      <button onClick={() => onChange(page - 1)} disabled={page === 1}
        style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: page === 1 ? '#334155' : '#94a3b8', cursor: page === 1 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <ChevronLeft size={15}/>
      </button>
      {Array.from({ length: pages }, (_, i) => i + 1).filter(p => p === 1 || p === pages || Math.abs(p - page) <= 1).map((p, idx, arr) => (
        <React.Fragment key={p}>
          {idx > 0 && arr[idx-1] !== p - 1 && <span style={{ color: '#334155' }}>…</span>}
          <button onClick={() => onChange(p)}
            style={{ width: 32, height: 32, borderRadius: 8, background: p === page ? '#3b82f6' : 'rgba(255,255,255,0.04)', border: `1px solid ${p === page ? '#3b82f6' : 'rgba(255,255,255,0.08)'}`, color: p === page ? '#fff' : '#94a3b8', cursor: 'pointer', fontWeight: p === page ? 700 : 400, fontSize: '0.83rem' }}>
            {p}
          </button>
        </React.Fragment>
      ))}
      <button onClick={() => onChange(page + 1)} disabled={page === pages}
        style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: page === pages ? '#334155' : '#94a3b8', cursor: page === pages ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <ChevronRight size={15}/>
      </button>
      <span style={{ color: '#475569', fontSize: '0.75rem', marginLeft: 4 }}>
        Page {page} / {pages} · {total} résultat{total > 1 ? 's' : ''}
      </span>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════
//  PAGE PRINCIPALE
// ══════════════════════════════════════════════════════════════
const ReportsPage = () => {
  const navigate = useNavigate();

  const [results, setResults]   = useState([]);
  const [exams, setExams]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [tab, setTab]           = useState('results');
  const [search, setSearch]     = useState('');
  const [filterExam, setFilterExam] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterDateStart, setFilterDateStart] = useState('');
  const [filterDateEnd, setFilterDateEnd] = useState('');
  const [filterSubject, setFilterSubject] = useState('');
  const [filterLevel, setFilterLevel] = useState('');
  const [page, setPage]         = useState(1);
  const [selectedReport, setSelectedReport] = useState(null);
  const [rankExamId, setRankExamId] = useState('');
  const [rankings, setRankings] = useState([]);
  const [rankLoading, setRankLoading] = useState(false);
  const [expandedSessions, setExpandedSessions] = useState({});

  // ── Chargement ───────────────────────────────────────────────
  const load = useCallback(async () => {
  setLoading(true);
  try {
    const [resResp, examResp] = await Promise.all([
      api.get('/api/results'),
      api.get('/api/exams'),
    ]);
    
    // ✅ Extraction robuste des résultats
    let r = [];
    if (resResp?.data && Array.isArray(resResp.data)) {
      r = resResp.data;
    } else if (resResp?.results && Array.isArray(resResp.results)) {
      r = resResp.results;
    } else if (Array.isArray(resResp)) {
      r = resResp;
    }
    
    // ✅ Extraction robuste des examens
    let e = [];
    if (examResp?.data && Array.isArray(examResp.data)) {
      e = examResp.data;
    } else if (examResp?.exams && Array.isArray(examResp.exams)) {
      e = examResp.exams;
    } else if (Array.isArray(examResp)) {
      e = examResp;
    }
    
    console.log('📊 Résultats chargés:', r.length);
    console.log('📚 Examens chargés:', e.length);
    
    setResults(r);
    setExams(e);
  } catch (err) {
    console.error('❌ Erreur chargement:', err);
    toast.error('Erreur chargement : ' + err.message);
  } finally { 
    setLoading(false);
  }
}, []);

 useEffect(() => { 
  load(); 
}, [load]);

// Pour debug - afficher la structure dans la console
console.log('Structure résultats:', results);
console.log('Structure examens:', exams);

  // ── Classements ───────────────────────────────────────────────
  useEffect(() => {
    if (!rankExamId) { setRankings([]); return; }
    setRankLoading(true);
    api.get(`/api/rankings/${rankExamId}`)
      .then(r => setRankings(r?.rankings || []))
      .catch(() => toast.error('Erreur chargement classement'))
      .finally(() => setRankLoading(false));
  }, [rankExamId]);

  // ── Suppression ───────────────────────────────────────────────
  const deleteReport = (id) => {
    toast((t) => (
      <div style={{ background: '#1e293b', padding: 16, borderRadius: 12, color: '#fff' }}>
        <p style={{ marginBottom: 12 }}>Supprimer ce résultat définitivement ?</p>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={() => { toast.dismiss(t.id); api.delete(`/api/results/${id}`).then(() => { setResults(prev => prev.filter(r => r._id !== id)); toast.success('Supprimé'); }).catch(() => toast.error('Erreur')); }}
            style={{ padding: '7px 14px', background: '#ef4444', border: 'none', borderRadius: 7, color: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: '0.83rem' }}>Confirmer</button>
          <button onClick={() => toast.dismiss(t.id)}
            style={{ padding: '7px 14px', background: '#475569', border: 'none', borderRadius: 7, color: '#fff', cursor: 'pointer', fontSize: '0.83rem' }}>Annuler</button>
        </div>
      </div>
    ), { duration: Infinity });
  };

  const openBulletin = (report) => window.open(`${NODE_BACKEND_URL}/api/bulletin/${report._id}`, '_blank');

  // ── Filtres paramétriques ─────────────────────────────────────
  const filtered = useMemo(() => {
    return results.filter(r => {
      // Recherche textuelle
      const name = `${r.studentInfo?.lastName} ${r.studentInfo?.firstName} ${r.studentInfo?.matricule}`.toLowerCase();
      const title = (r.examId?.title || r.examTitle || '').toLowerCase();
      const q = search.toLowerCase();
      if (search && !name.includes(q) && !title.includes(q)) return false;

      // Filtre épreuve
      if (filterExam && (r.examId?._id || r.examId) !== filterExam) return false;

      // Filtre statut
      if (filterStatus === 'passed' && !r.passed) return false;
      if (filterStatus === 'failed' && r.passed) return false;

      // Filtre date
      if (filterDateStart && r.createdAt && new Date(r.createdAt) < new Date(filterDateStart)) return false;
      if (filterDateEnd && r.createdAt && new Date(r.createdAt) > new Date(filterDateEnd)) return false;

      // Filtre matière (subject)
      if (filterSubject) {
        const subject = (r.examId?.subject || r.subject || '').toLowerCase();
        if (!subject.includes(filterSubject.toLowerCase())) return false;
      }

      // Filtre niveau (level)
      if (filterLevel) {
        const level = (r.examId?.level || r.level || '').toLowerCase();
        if (!level.includes(filterLevel.toLowerCase())) return false;
      }

      return true;
    });
  }, [results, search, filterExam, filterStatus, filterDateStart, filterDateEnd, filterSubject, filterLevel]);

  const paginated = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);

  useEffect(() => { setPage(1); }, [search, filterExam, filterStatus, filterDateStart, filterDateEnd, filterSubject, filterLevel]);

  // ── Sessions groupées ─────────────────────────────────────────
  const sessions = useMemo(() => {
    const groups = {};
    results.forEach(r => {
      const examId  = r.examId?._id || r.examId || 'unknown';
      const dateStr = r.createdAt ? new Date(r.createdAt).toISOString().slice(0, 10) : 'sans-date';
      const key     = `${examId}__${dateStr}`;
      if (!groups[key]) {
        groups[key] = { key, examId, dateStr, examTitle: r.examId?.title || r.examTitle || 'Épreuve inconnue', examDomain: r.examId?.domain || '', examLevel: r.examId?.level || '', results: [] };
      }
      groups[key].results.push(r);
    });
    return Object.values(groups)
      .map(s => ({
        ...s,
        rankings: [...s.results].sort((a, b) => (b.percentage || 0) - (a.percentage || 0)).map((r, i) => ({ ...r, rank: i + 1 })),
      }))
      .sort((a, b) => b.dateStr.localeCompare(a.dateStr));
  }, [results]);

  // ── Stats globales ────────────────────────────────────────────
  const globalStats = useMemo(() => {
    if (!results.length) return null;
    const passed = results.filter(r => r.passed).length;
    const avg    = results.reduce((s, r) => s + (r.percentage || 0), 0) / results.length;
    return { total: results.length, passed, failed: results.length - passed, avg: avg.toFixed(1), best: Math.max(...results.map(r => r.percentage || 0)), worst: Math.min(...results.map(r => r.percentage || 0)) };
  }, [results]);

  // ── Tabs ──────────────────────────────────────────────────────
  const TABS = [
    { id: 'results',  label: 'Résultats',   icon: <FileText size={14}/>,  count: results.length },
    { id: 'sessions', label: 'Sessions',    icon: <Calendar size={14}/>,  count: sessions.length },
    { id: 'rankings', label: 'Classements', icon: <Trophy size={14}/>,    count: null },
    { id: 'stats',    label: 'Statistiques',icon: <BarChart3 size={14}/>, count: null },
  ];

  // ── Loading ───────────────────────────────────────────────────
  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#05071a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
      <RefreshCw size={28} color="#3b82f6" style={{ animation: 'spin 1s linear infinite' }} />
      <span style={{ color: '#64748b', fontFamily: 'DM Sans, sans-serif' }}>Chargement des données…</span>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #05071a 0%, #0a0f2e 60%, #05071a 100%)', fontFamily: "'DM Sans', sans-serif" }}>
      <div style={{ position: 'fixed', inset: 0, backgroundImage: 'linear-gradient(rgba(59,130,246,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,0.03) 1px, transparent 1px)', backgroundSize: '40px 40px', pointerEvents: 'none', zIndex: 0 }} />

      {/* HEADER avec bouton retour */}
      <header style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(5,7,26,0.92)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(59,130,246,0.1)', padding: '0 24px', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate('/evaluate')}
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(99,102,241,0.2)',
              borderRadius: 10,
              padding: '8px',
              color: '#94a3b8',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <ArrowLeft size={18} />
            <span style={{ fontSize: '0.8rem' }}>Tableau de bord</span>
          </motion.button>
          <div style={{ width: '1px', height: '20px', background: 'rgba(255,255,255,0.1)' }} />
          <span style={{ fontFamily: 'Sora, sans-serif', fontWeight: 800, fontSize: '1rem', background: 'linear-gradient(135deg,#60a5fa,#a78bfa)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>NA²QUIZ</span>
          <span style={{ color: '#334155' }}>/</span>
          <span style={{ color: '#64748b', fontSize: '0.85rem' }}>Rapports</span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Btn onClick={load} color="#64748b"><RefreshCw size={13}/> Actualiser</Btn>
          <Btn onClick={() => navigate('/')} color="#64748b"><Home size={13}/> Accueil</Btn>
        </div>
      </header>

      <main style={{ position: 'relative', zIndex: 1, maxWidth: 1280, margin: '0 auto', padding: '24px 20px' }}>

        {/* KPIs */}
        {globalStats && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10, marginBottom: 24 }}>
            {[
              { l: 'Total',   v: globalStats.total,   c: '#3b82f6' },
              { l: 'Reçus',   v: globalStats.passed,  c: '#10b981' },
              { l: 'Échoués', v: globalStats.failed,  c: '#ef4444' },
              { l: 'Moyenne', v: `${globalStats.avg}%`,c: '#8b5cf6' },
              { l: 'Meilleur',v: `${globalStats.best}%`,c:'#f59e0b' },
            ].map(({ l, v, c }) => (
              <motion.div key={l} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                style={{ background: 'rgba(15,23,42,0.8)', border: `1px solid ${c}20`, borderRadius: 12, padding: '12px 14px', backdropFilter: 'blur(8px)' }}>
                <div style={{ color: '#64748b', fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>{l}</div>
                <div style={{ color: c, fontSize: '1.4rem', fontWeight: 800, fontFamily: 'Sora, sans-serif' }}>{v}</div>
              </motion.div>
            ))}
          </div>
        )}

        {/* TABS */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: 0 }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '10px 16px', background: 'none', border: 'none', borderBottom: `2px solid ${tab === t.id ? '#3b82f6' : 'transparent'}`, color: tab === t.id ? '#60a5fa' : '#64748b', cursor: 'pointer', fontSize: '0.85rem', fontWeight: tab === t.id ? 700 : 400, fontFamily: 'DM Sans, sans-serif', transition: 'all 0.15s', marginBottom: -1 }}>
              {t.icon} {t.label}
              {t.count !== null && <span style={{ padding: '1px 7px', borderRadius: 999, background: tab === t.id ? 'rgba(59,130,246,0.15)' : 'rgba(255,255,255,0.05)', color: tab === t.id ? '#60a5fa' : '#475569', fontSize: '0.7rem', fontWeight: 700 }}>{t.count}</span>}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">

          {/* ONGLET RÉSULTATS avec filtres paramétriques et bouton export */}
          {tab === 'results' && (
            <motion.div key="results" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {/* Barre de filtres étendue */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 16, alignItems: 'center' }}>
                <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
                  <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#475569' }} />
                  <input value={search} onChange={e => setSearch(e.target.value)}
                    placeholder="Rechercher un candidat…"
                    style={{ width: '100%', padding: '8px 12px 8px 32px', background: 'rgba(15,23,42,0.7)', border: '1px solid rgba(59,130,246,0.15)', borderRadius: 9, color: '#e2e8f0', fontSize: '0.85rem', outline: 'none', fontFamily: 'DM Sans, sans-serif' }} />
                </div>
                <select value={filterExam} onChange={e => setFilterExam(e.target.value)}
                  style={{ padding: '8px 12px', background: '#0d1424', border: '1px solid rgba(59,130,246,0.15)', borderRadius: 9, color: filterExam ? '#e2e8f0' : '#475569', fontSize: '0.82rem', outline: 'none', maxWidth: 200 }}>
                  <option value="">Toutes épreuves</option>
                  {exams.map(e => <option key={e._id} value={e._id}>{e.title}</option>)}
                </select>
                <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                  style={{ padding: '8px 12px', background: '#0d1424', border: '1px solid rgba(59,130,246,0.15)', borderRadius: 9, color: '#e2e8f0', fontSize: '0.82rem', outline: 'none' }}>
                  <option value="">Tous statuts</option>
                  <option value="passed">✓ Reçus</option>
                  <option value="failed">✗ Échoués</option>
                </select>
                <input type="date" value={filterDateStart} onChange={e => setFilterDateStart(e.target.value)}
                  placeholder="Date début"
                  style={{ padding: '8px 12px', background: '#0d1424', border: '1px solid rgba(59,130,246,0.15)', borderRadius: 9, color: '#e2e8f0', fontSize: '0.82rem', outline: 'none' }} />
                <input type="date" value={filterDateEnd} onChange={e => setFilterDateEnd(e.target.value)}
                  placeholder="Date fin"
                  style={{ padding: '8px 12px', background: '#0d1424', border: '1px solid rgba(59,130,246,0.15)', borderRadius: 9, color: '#e2e8f0', fontSize: '0.82rem', outline: 'none' }} />
                <input type="text" value={filterSubject} onChange={e => setFilterSubject(e.target.value)}
                  placeholder="Matière"
                  style={{ width: '120px', padding: '8px 12px', background: '#0d1424', border: '1px solid rgba(59,130,246,0.15)', borderRadius: 9, color: '#e2e8f0', fontSize: '0.82rem', outline: 'none' }} />
                <input type="text" value={filterLevel} onChange={e => setFilterLevel(e.target.value)}
                  placeholder="Niveau"
                  style={{ width: '100px', padding: '8px 12px', background: '#0d1424', border: '1px solid rgba(59,130,246,0.15)', borderRadius: 9, color: '#e2e8f0', fontSize: '0.82rem', outline: 'none' }} />
                
                {/* Boutons d'action */}
                <Btn onClick={() => exportToCSV(filtered, 'rapport_resultats')} color="#10b981">
                  <Download size={13}/> Exporter CSV
                </Btn>
                
                {(search || filterExam || filterStatus || filterDateStart || filterDateEnd || filterSubject || filterLevel) && (
                  <Btn onClick={() => { setSearch(''); setFilterExam(''); setFilterStatus(''); setFilterDateStart(''); setFilterDateEnd(''); setFilterSubject(''); setFilterLevel(''); }} color="#ef4444">
                    <X size={12}/> Effacer
                  </Btn>
                )}
              </div>

              {filtered.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 20px', color: '#475569', background: 'rgba(15,23,42,0.5)', borderRadius: 14, border: '1px dashed rgba(255,255,255,0.06)' }}>
                  <FileText size={36} color="#1e293b" style={{ marginBottom: 12 }} />
                  <p>Aucun résultat{search ? ` pour "${search}"` : ''}.</p>
                </div>
              ) : (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
                    <AnimatePresence>
                      {paginated.map(r => (
                        <ReportCard key={r._id} report={r}
                          onView={setSelectedReport}
                          onDelete={deleteReport}
                          onPrint={openBulletin} />
                      ))}
                    </AnimatePresence>
                  </div>
                  <Pagination page={page} total={filtered.length} perPage={PAGE_SIZE} onChange={setPage} />
                </>
              )}
            </motion.div>
          )}

          {/* ONGLET SESSIONS (inchangé) */}
          {tab === 'sessions' && (
            <motion.div key="sessions" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {sessions.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 60, color: '#475569' }}>
                  <Calendar size={36} color="#1e293b" style={{ marginBottom: 12 }} />
                  <p>Aucune session enregistrée.</p>
                </div>
              ) : sessions.map(s => {
                const isOpen  = expandedSessions[s.key];
                const passed  = s.rankings.filter(r => r.passed || r.percentage >= 50).length;
                const avg     = s.rankings.length ? (s.rankings.reduce((a, r) => a + (r.percentage || 0), 0) / s.rankings.length).toFixed(1) : '0';
                const dateLabel = s.dateStr !== 'sans-date'
                  ? new Date(s.dateStr).toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })
                  : 'Date inconnue';
                return (
                  <motion.div key={s.key} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    style={{ background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 14, overflow: 'hidden', backdropFilter: 'blur(8px)' }}>
                    <div onClick={() => setExpandedSessions(prev => ({ ...prev, [s.key]: !prev[s.key] }))}
                      style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px', cursor: 'pointer', userSelect: 'none' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                          <span style={{ padding: '2px 8px', borderRadius: 999, background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.25)', color: '#f59e0b', fontSize: '0.7rem', fontWeight: 700 }}>
                            📅 {dateLabel}
                          </span>
                          <span style={{ color: '#f1f5f9', fontWeight: 700, fontSize: '0.92rem' }}>{s.examTitle}</span>
                          {s.examLevel && <span style={{ color: '#64748b', fontSize: '0.7rem' }}>{s.examLevel}</span>}
                        </div>
                        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', fontSize: '0.75rem', color: '#64748b' }}>
                          <span><span style={{ color: '#3b82f6', fontWeight: 700 }}>{s.results.length}</span> candidats</span>
                          <span>Moy. <span style={{ color: '#8b5cf6', fontWeight: 700 }}>{avg}%</span></span>
                          <span>✓ <span style={{ color: '#10b981', fontWeight: 700 }}>{passed}</span> reçus</span>
                          <span>✗ <span style={{ color: '#ef4444', fontWeight: 700 }}>{s.results.length - passed}</span> échoués</span>
                          {s.rankings[0] && <span>🥇 <span style={{ color: '#f59e0b', fontWeight: 700 }}>{s.rankings[0].percentage}%</span></span>}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                        <button
                          onClick={e => { e.stopPropagation(); window.open(`${NODE_BACKEND_URL}/api/bulletin/${s.rankings[0]?._id}`, '_blank'); }}
                          style={{ padding: '4px 10px', borderRadius: 7, background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.25)', color: '#a5b4fc', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Printer size={11}/> Classement
                        </button>
                        <span style={{ color: '#f59e0b' }}>{isOpen ? <ChevronUp size={15}/> : <ChevronDown size={15}/>}</span>
                      </div>
                    </div>

                    <AnimatePresence>
                      {isOpen && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                          style={{ borderTop: '1px solid rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                          <div style={{ overflowX: 'auto', padding: '12px 18px' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 480 }}>
                              <thead>
                                <tr style={{ borderBottom: '1px solid rgba(245,158,11,0.2)' }}>
                                  {['Rang','Candidat','Matricule','Score','%','/20','Bulletin'].map(h => (
                                    <th key={h} style={{ padding: '7px 10px', textAlign: 'left', color: '#64748b', fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>{h}</th>
                                  ))}
                                  </tr>
                              </thead>
                              <tbody>
                                {s.rankings.map((r, i) => (
                                  <tr key={r._id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                                    <td style={{ padding: '8px 10px' }}>
                                      <span style={{ width: 24, height: 24, borderRadius: '50%', background: i === 0 ? '#fbbf24' : i === 1 ? '#94a3b8' : i === 2 ? '#b45309' : 'rgba(255,255,255,0.06)', color: i < 3 ? '#000' : '#94a3b8', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700 }}>
                                        {i < 3 ? ['🥇','🥈','🥉'][i] : r.rank}
                                      </span>
                                    </td>
                                    <td style={{ padding: '8px 10px', color: '#f1f5f9', fontSize: '0.85rem', fontWeight: 500 }}>{r.studentInfo?.firstName} {r.studentInfo?.lastName}</td>
                                    <td style={{ padding: '8px 10px', color: '#64748b', fontFamily: 'monospace', fontSize: '0.78rem' }}>{r.studentInfo?.matricule || '—'}</td>
                                    <td style={{ padding: '8px 10px', color: '#f1f5f9', fontSize: '0.85rem', fontWeight: 600 }}>{r.score ?? '—'}</td>
                                    <td style={{ padding: '8px 10px' }}>
                                      <span style={{ padding: '2px 7px', borderRadius: 999, background: (r.percentage||0)>=50?'rgba(16,185,129,0.1)':'rgba(239,68,68,0.1)', color:(r.percentage||0)>=50?'#10b981':'#ef4444', fontWeight:700, fontSize:'0.78rem', border:`1px solid ${(r.percentage||0)>=50?'rgba(16,185,129,0.25)':'rgba(239,68,68,0.25)'}` }}>
                                        {r.percentage??0}%
                                      </span>
                                    </td>
                                    <td style={{ padding: '8px 10px', color: '#8b5cf6', fontWeight: 700, fontSize: '0.85rem' }}>{note20(r.percentage||0)}</td>
                                    <td style={{ padding: '8px 10px' }}>
                                      <button onClick={() => setSelectedReport(r)}
                                        style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 6, background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.25)', color: '#a5b4fc', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 600 }}>
                                        <Eye size={10}/> Voir
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </motion.div>
          )}

          {/* ONGLET CLASSEMENTS (inchangé) */}
          {tab === 'rankings' && (
            <motion.div key="rankings" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ color: '#64748b', fontSize: '0.75rem', marginBottom: 6, display: 'block' }}>Sélectionner une épreuve</label>
                <select value={rankExamId} onChange={e => setRankExamId(e.target.value)}
                  style={{ padding: '9px 14px', background: '#0d1424', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 9, color: rankExamId ? '#e2e8f0' : '#475569', fontSize: '0.88rem', outline: 'none', width: '100%', maxWidth: 480 }}>
                  <option value="">-- Choisir une épreuve --</option>
                  {exams.map(e => <option key={e._id} value={e._id}>{e.title} · {e.level}</option>)}
                </select>
              </div>

              {rankLoading ? (
                <div style={{ textAlign: 'center', padding: 40 }}>
                  <RefreshCw size={24} color="#8b5cf6" style={{ animation: 'spin 1s linear infinite' }} />
                </div>
              ) : rankings.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 60, color: '#475569' }}>
                  <Trophy size={36} color="#1e293b" style={{ marginBottom: 12 }} />
                  <p>{rankExamId ? 'Aucun résultat pour cette épreuve.' : 'Sélectionnez une épreuve ci-dessus.'}</p>
                </div>
              ) : (
                <>
                  {/* KPIs classement */}
                  {(() => {
                    const passed = rankings.filter(r => r.percentage >= 50).length;
                    const avg    = (rankings.reduce((a,r) => a+(r.percentage||0),0)/rankings.length).toFixed(1);
                    return (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10, marginBottom: 16 }}>
                        {[
                          { l:'Candidats',v:rankings.length, c:'#3b82f6'},
                          { l:'Moyenne',  v:`${avg}%`,        c:'#8b5cf6'},
                          { l:'Reçus',    v:passed,           c:'#10b981'},
                          { l:'Échoués',  v:rankings.length-passed,c:'#ef4444'},
                          { l:'Meilleur', v:`${rankings[0]?.percentage||0}%`,c:'#f59e0b'},
                        ].map(({l,v,c}) => (
                          <div key={l} style={{background:`${c}10`,border:`1px solid ${c}20`,borderRadius:10,padding:'10px 12px',textAlign:'center'}}>
                            <div style={{color:'#64748b',fontSize:'0.65rem',textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:3}}>{l}</div>
                            <div style={{color:c,fontSize:'1.2rem',fontWeight:800,fontFamily:'Sora,sans-serif'}}>{v}</div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}

                  <div style={{ background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(99,102,241,0.15)', borderRadius: 14, overflow: 'hidden' }}>
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr style={{ background: 'rgba(99,102,241,0.08)', borderBottom: '1px solid rgba(99,102,241,0.2)' }}>
                            {['Rang','Candidat','Matricule','Score','Résultat','/20','Bulletin'].map(h => (
                              <th key={h} style={{ padding: '10px 14px', textAlign: 'left', color: '#64748b', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>{h}</th>
                            ))}
                           </tr>
                        </thead>
                        <tbody>
                          {rankings.map((r, i) => (
                            <motion.tr key={r.resultId || i}
                              initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
                              style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', background: i===0?'rgba(251,191,36,0.04)':i===1?'rgba(148,163,184,0.02)':i===2?'rgba(180,83,9,0.02)':'transparent' }}>
                              <td style={{ padding: '10px 14px' }}>
                                <span style={{ width: 28, height: 28, borderRadius: '50%', background: i===0?'#fbbf24':i===1?'#94a3b8':i===2?'#b45309':'rgba(255,255,255,0.06)', color:i<3?'#000':'#94a3b8', display:'inline-flex',alignItems:'center',justifyContent:'center',fontSize:'0.85rem',fontWeight:700 }}>
                                  {i<3?['🥇','🥈','🥉'][i]:r.rank}
                                </span>
                              </td>
                              <td style={{ padding:'10px 14px',color:'#f1f5f9',fontWeight:500,fontSize:'0.88rem' }}>{r.studentInfo?.firstName} {r.studentInfo?.lastName}</td>
                              <td style={{ padding:'10px 14px',color:'#64748b',fontFamily:'monospace',fontSize:'0.82rem' }}>{r.studentInfo?.matricule||'—'}</td>
                              <td style={{ padding:'10px 14px',color:'#f1f5f9',fontWeight:600 }}>{r.score}</td>
                              <td style={{ padding:'10px 14px' }}>
                                <span style={{padding:'3px 9px',borderRadius:999,background:r.percentage>=50?'rgba(16,185,129,0.1)':'rgba(239,68,68,0.1)',color:r.percentage>=50?'#10b981':'#ef4444',fontWeight:700,fontSize:'0.82rem',border:`1px solid ${r.percentage>=50?'rgba(16,185,129,0.25)':'rgba(239,68,68,0.25)'}`}}>
                                  {r.percentage}%
                                </span>
                              </td>
                              <td style={{ padding:'10px 14px',color:'#8b5cf6',fontWeight:700 }}>{note20(r.percentage||0)}</td>
                              <td style={{ padding:'10px 14px' }}>
                                {r.resultUrl && (
                                  <button onClick={() => setSelectedReport(results.find(res => res._id === r.resultId) || r)}
                                    style={{ display:'inline-flex',alignItems:'center',gap:4,padding:'4px 10px',borderRadius:6,background:'rgba(99,102,241,0.1)',border:'1px solid rgba(99,102,241,0.25)',color:'#a5b4fc',cursor:'pointer',fontSize:'0.75rem',fontWeight:600 }}>
                                    <Eye size={11}/> Voir
                                  </button>
                                )}
                              </td>
                            </motion.tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}
            </motion.div>
          )}

          {/* ONGLET STATISTIQUES (inchangé) */}
          {tab === 'stats' && (
            <motion.div key="stats" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {!globalStats ? (
                <div style={{ textAlign: 'center', padding: 60, color: '#475569' }}>
                  <BarChart3 size={36} color="#1e293b" style={{ marginBottom: 12 }} />
                  <p>Aucune donnée disponible.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {/* Distribution par épreuve */}
                  <div style={{ background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(59,130,246,0.15)', borderRadius: 14, padding: '20px 22px', backdropFilter: 'blur(8px)' }}>
                    <h3 style={{ color: '#f1f5f9', fontFamily: 'Sora,sans-serif', fontSize: '0.95rem', fontWeight: 700, marginBottom: 16 }}>Résultats par épreuve</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {(() => {
                        const byExam = {};
                        results.forEach(r => {
                          const key   = r.examId?._id || r.examId || 'unknown';
                          const title = r.examId?.title || r.examTitle || 'Inconnu';
                          if (!byExam[key]) byExam[key] = { title, results: [] };
                          byExam[key].results.push(r);
                        });
                        return Object.values(byExam).sort((a,b) => b.results.length - a.results.length).map(({ title, results: rs }) => {
                          const passed = rs.filter(r => r.passed).length;
                          const avg    = (rs.reduce((a,r) => a+(r.percentage||0),0)/rs.length).toFixed(0);
                          const pct    = Math.round((passed/rs.length)*100);
                          return (
                            <div key={title}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: '0.82rem' }}>
                                <span style={{ color: '#e2e8f0', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '60%' }}>{title}</span>
                                <span style={{ color: '#64748b', flexShrink: 0 }}>{rs.length} candidats · moy {avg}% · {pct}% reçus</span>
                              </div>
                              <div style={{ height: 6, background: 'rgba(255,255,255,0.05)', borderRadius: 3, overflow: 'hidden' }}>
                                <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.6, ease: 'easeOut' }}
                                  style={{ height: '100%', background: pct >= 70 ? 'linear-gradient(90deg,#10b981,#34d399)' : pct >= 50 ? 'linear-gradient(90deg,#f59e0b,#fbbf24)' : 'linear-gradient(90deg,#ef4444,#f87171)', borderRadius: 3 }} />
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </div>

                  {/* Distribution mentions */}
                  <div style={{ background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(139,92,246,0.15)', borderRadius: 14, padding: '20px 22px', backdropFilter: 'blur(8px)' }}>
                    <h3 style={{ color: '#f1f5f9', fontFamily: 'Sora,sans-serif', fontSize: '0.95rem', fontWeight: 700, marginBottom: 16 }}>Distribution des mentions</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10 }}>
                      {[
                        { label: 'Très Bien',   min: 90, max: 100, color: '#10b981' },
                        { label: 'Bien',        min: 75, max: 89,  color: '#3b82f6' },
                        { label: 'Assez Bien',  min: 60, max: 74,  color: '#8b5cf6' },
                        { label: 'Passable',    min: 50, max: 59,  color: '#f59e0b' },
                        { label: 'Insuffisant', min: 0,  max: 49,  color: '#ef4444' },
                      ].map(({ label, min, max, color }) => {
                        const count = results.filter(r => (r.percentage||0) >= min && (r.percentage||0) <= max).length;
                        const pct   = results.length ? Math.round((count/results.length)*100) : 0;
                        return (
                          <div key={label} style={{ background: `${color}08`, border: `1px solid ${color}20`, borderRadius: 10, padding: '12px 14px' }}>
                            <div style={{ color: '#64748b', fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>{label}</div>
                            <div style={{ color, fontSize: '1.5rem', fontWeight: 800, fontFamily: 'Sora,sans-serif' }}>{count}</div>
                            <div style={{ color: '#475569', fontSize: '0.72rem' }}>{pct}% des résultats</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          )}

        </AnimatePresence>
      </main>

      {/* MODAL BULLETIN */}
      {selectedReport && (
        <BulletinModal report={selectedReport} onClose={() => setSelectedReport(null)} />
      )}

      <Toaster position="bottom-right" toastOptions={{ style: { background: '#1e293b', color: '#f1f5f9', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 10 } }} />

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@700;800&family=DM+Sans:wght@400;500;600;700&display=swap');
        @keyframes spin { to { transform: rotate(360deg); } }
        select option { background: #0d1424; color: #e2e8f0; }
      `}</style>
    </div>
  );
};

export default ReportsPage;