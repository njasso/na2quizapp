// src/pages/PreviewExamPage.jsx — Gestion complète d'épreuve
// Fonctionnalités : réordonnancement ▲▼, édition inline, suppression,
//                  duplication, ajout, sauvegarde auto → PUT /api/exams/:id
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import {
  ArrowLeft, Clock, Layers, BookOpen, Award, CheckCircle,
  ChevronDown, ChevronUp, Edit3, Play, RefreshCw, User,
  Trash2, Copy, Plus, Save, AlertTriangle, GripVertical,
  Check, X, ArrowUp, ArrowDown
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

const NODE_BACKEND_URL =
  process.env.REACT_APP_BACKEND_URL ||
  (process.env.NODE_ENV === 'production'
    ? 'https://na2quizapp.onrender.com'
    : 'http://localhost:5000');

// ── Styles communs ────────────────────────────────────────────
const S = {
  input: {
    width: '100%', padding: '8px 12px',
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(99,102,241,0.3)',
    borderRadius: 8, color: '#f1f5f9',
    fontSize: '0.88rem', outline: 'none',
    fontFamily: 'DM Sans, sans-serif',
  },
  btn: (color, bg) => ({
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    gap: 5, padding: '6px 12px', borderRadius: 8, cursor: 'pointer',
    border: `1px solid ${color}44`, background: bg || `${color}12`,
    color, fontSize: '0.8rem', fontWeight: 600,
    fontFamily: 'DM Sans, sans-serif',
  }),
  iconBtn: (color) => ({
    width: 30, height: 30, borderRadius: 7, cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: `${color}12`, border: `1px solid ${color}30`, color,
  }),
};

// ── Composant éditeur d'une question ─────────────────────────
const QuestionEditor = ({ q, idx, total, onChange, onDelete, onDuplicate, onMoveUp, onMoveDown }) => {
  const [open, setOpen]       = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft]     = useState(null);

  const startEdit = (e) => {
    e.stopPropagation();
    setDraft({
      text:          q.text          || q.question || '',
      options:       [...(q.options  || ['', '', '', ''])],
      correctAnswer: q.correctAnswer || '',
      points:        q.points        || 1,
      explanation:   q.explanation   || '',
    });
    setEditing(true);
    setOpen(true);
  };

  const cancelEdit = () => { setEditing(false); setDraft(null); };

  const saveEdit = () => {
    onChange({ ...q, ...draft, question: draft.text, text: draft.text });
    setEditing(false);
    setDraft(null);
  };

  const setOpt = (i, v) => {
    const opts = [...draft.options];
    opts[i] = v;
    setDraft({ ...draft, options: opts });
  };

  const qText    = q.text || q.question || '';
  const opts     = q.options || [];
  const correct  = q.correctAnswer || '';
  const pts      = q.points || 1;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      style={{
        background: 'rgba(15,23,42,0.8)',
        border: `1px solid ${editing ? 'rgba(99,102,241,0.4)' : 'rgba(255,255,255,0.07)'}`,
        borderRadius: 14, overflow: 'hidden', backdropFilter: 'blur(8px)',
        boxShadow: editing ? '0 0 0 2px rgba(99,102,241,0.15)' : 'none',
      }}
    >
      {/* ── En-tête question ── */}
      <div
        onClick={() => !editing && setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '12px 16px', cursor: editing ? 'default' : 'pointer',
          userSelect: 'none',
        }}
      >
        {/* Drag handle + numéro */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flexShrink: 0 }}>
          <span style={{
            minWidth: 26, height: 26, borderRadius: 7,
            background: editing ? '#6366f1' : 'rgba(99,102,241,0.6)',
            color: '#fff', display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontSize: '0.78rem', fontWeight: 700,
          }}>
            {idx + 1}
          </span>
        </div>

        {/* Texte */}
        <p style={{ flex: 1, color: '#e2e8f0', fontWeight: 500, fontSize: '0.92rem', margin: 0, lineHeight: 1.4 }}>
          {qText || <span style={{ color: '#475569', fontStyle: 'italic' }}>Question sans énoncé</span>}
        </p>

        {/* Badges + actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
          <span style={{ padding: '2px 8px', borderRadius: 999, background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)', color: '#f59e0b', fontSize: '0.7rem', fontWeight: 700 }}>
            {pts} pt{pts > 1 ? 's' : ''}
          </span>

          {/* Boutons ordre */}
          <button disabled={idx === 0} onClick={() => onMoveUp(idx)}
            style={{ ...S.iconBtn('#94a3b8'), opacity: idx === 0 ? 0.3 : 1 }} title="Monter">
            <ArrowUp size={13} />
          </button>
          <button disabled={idx === total - 1} onClick={() => onMoveDown(idx)}
            style={{ ...S.iconBtn('#94a3b8'), opacity: idx === total - 1 ? 0.3 : 1 }} title="Descendre">
            <ArrowDown size={13} />
          </button>

          {/* Dupliquer */}
          <button onClick={() => onDuplicate(idx)} style={S.iconBtn('#3b82f6')} title="Dupliquer">
            <Copy size={13} />
          </button>

          {/* Éditer */}
          <button onClick={startEdit} style={S.iconBtn('#a78bfa')} title="Modifier">
            <Edit3 size={13} />
          </button>

          {/* Supprimer */}
          <button onClick={() => onDelete(idx)} style={S.iconBtn('#ef4444')} title="Supprimer">
            <Trash2 size={13} />
          </button>

          <span style={{ color: '#475569' }}>
            {open ? <ChevronUp size={15}/> : <ChevronDown size={15}/>}
          </span>
        </div>
      </div>

      {/* ── Corps (lecture ou édition) ── */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            style={{ borderTop: '1px solid rgba(255,255,255,0.05)', overflow: 'hidden' }}
          >
            <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>

              {editing && draft ? (
                /* ─── MODE ÉDITION ─────────────────────────── */
                <>
                  {/* Énoncé */}
                  <div>
                    <label style={{ color: '#64748b', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 4, display: 'block' }}>Énoncé</label>
                    <textarea
                      value={draft.text}
                      onChange={e => setDraft({ ...draft, text: e.target.value })}
                      rows={2}
                      style={{ ...S.input, resize: 'vertical' }}
                    />
                  </div>

                  {/* Options */}
                  <div>
                    <label style={{ color: '#64748b', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6, display: 'block' }}>
                      Options <span style={{ color: '#475569', fontWeight: 400 }}>(clic sur ✓ pour définir la bonne réponse)</span>
                    </label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {draft.options.map((opt, j) => {
                        const isCorrect = String(opt).trim() !== '' && String(opt).trim() === String(draft.correctAnswer).trim();
                        return (
                          <div key={j} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            {/* Lettre */}
                            <span style={{ width: 22, height: 22, borderRadius: 6, background: isCorrect ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.06)', color: isCorrect ? '#10b981' : '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.72rem', fontWeight: 700, flexShrink: 0 }}>
                              {String.fromCharCode(65 + j)}
                            </span>
                            {/* Input option */}
                            <input
                              value={opt}
                              onChange={e => setOpt(j, e.target.value)}
                              style={{ ...S.input, borderColor: isCorrect ? 'rgba(16,185,129,0.4)' : 'rgba(99,102,241,0.2)' }}
                              placeholder={`Option ${String.fromCharCode(65 + j)}`}
                            />
                            {/* Bouton bonne réponse */}
                            <button
                              title="Définir comme bonne réponse"
                              onClick={() => setDraft({ ...draft, correctAnswer: opt })}
                              style={{ ...S.iconBtn(isCorrect ? '#10b981' : '#475569'), flexShrink: 0, background: isCorrect ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.04)' }}
                            >
                              <Check size={13} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                    <p style={{ color: '#475569', fontSize: '0.72rem', marginTop: 4 }}>
                      Bonne réponse sélectionnée : <span style={{ color: '#10b981', fontWeight: 600 }}>{draft.correctAnswer || '—'}</span>
                    </p>
                  </div>

                  {/* Points + explication */}
                  <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr', gap: 10 }}>
                    <div>
                      <label style={{ color: '#64748b', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 4, display: 'block' }}>Points</label>
                      <input type="number" min={0.5} max={10} step={0.5}
                        value={draft.points}
                        onChange={e => setDraft({ ...draft, points: parseFloat(e.target.value) || 1 })}
                        style={S.input}
                      />
                    </div>
                    <div>
                      <label style={{ color: '#64748b', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 4, display: 'block' }}>Explication (optionnel)</label>
                      <input value={draft.explanation}
                        onChange={e => setDraft({ ...draft, explanation: e.target.value })}
                        style={S.input} placeholder="Explication de la bonne réponse…" />
                    </div>
                  </div>

                  {/* Boutons édition */}
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
                    <button onClick={cancelEdit} style={S.btn('#94a3b8')}>
                      <X size={13}/> Annuler
                    </button>
                    <button onClick={saveEdit} style={{ ...S.btn('#10b981', 'rgba(16,185,129,0.15)') }}>
                      <Check size={13}/> Valider la modification
                    </button>
                  </div>
                </>
              ) : (
                /* ─── MODE LECTURE ─────────────────────────── */
                <>
                  {opts.map((opt, j) => {
                    const isCorrect = String(opt).trim() === String(correct).trim();
                    return (
                      <div key={j} style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '8px 12px', borderRadius: 9,
                        background: isCorrect ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.02)',
                        border: `1px solid ${isCorrect ? 'rgba(16,185,129,0.35)' : 'rgba(255,255,255,0.06)'}`,
                      }}>
                        <span style={{ width: 22, height: 22, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.72rem', fontWeight: 700, background: isCorrect ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.06)', color: isCorrect ? '#10b981' : '#64748b', flexShrink: 0 }}>
                          {String.fromCharCode(65 + j)}
                        </span>
                        <span style={{ flex: 1, fontSize: '0.88rem', color: isCorrect ? '#10b981' : '#94a3b8', fontWeight: isCorrect ? 600 : 400 }}>
                          {opt}
                        </span>
                        {isCorrect && <CheckCircle size={14} color="#10b981" />}
                      </div>
                    );
                  })}
                  {q.explanation && (
                    <div style={{ padding: '7px 12px', background: 'rgba(59,130,246,0.05)', borderRadius: 8, border: '1px solid rgba(59,130,246,0.15)', fontSize: '0.8rem', color: '#64748b' }}>
                      💡 {q.explanation}
                    </div>
                  )}
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// ══════════════════════════════════════════════════════════════
//  PAGE PRINCIPALE
// ══════════════════════════════════════════════════════════════
const PreviewExamPage = () => {
  const { examId } = useParams();
  const navigate   = useNavigate();

  const [exam, setExam]           = useState(null);
  const [questions, setQuestions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDirty, setIsDirty]     = useState(false);
  const [isSaving, setIsSaving]   = useState(false);
  const [showAll, setShowAll]     = useState(false);

  // Nouvelle question vide
  const newBlank = () => ({
    text: '', question: '', options: ['', '', '', ''],
    correctAnswer: '', points: 1, explanation: '', type: 'single',
  });
  const [addMode, setAddMode]     = useState(false);
  const [newQ, setNewQ]           = useState(newBlank());

  // ── Charger l'épreuve ─────────────────────────────────────
  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      try {
        const res = await axios.get(`${NODE_BACKEND_URL}/api/exams/${examId}`, { signal: controller.signal });
        setExam(res.data);
        setQuestions((res.data.questions || []).map(q => ({
          ...q,
          text: q.text || q.question || '',
        })));
      } catch (e) {
        if (axios.isCancel(e) || e.code === 'ERR_CANCELED') return;
        toast.error("Épreuve introuvable.");
        navigate('/exams');
      } finally { setIsLoading(false); }
    };
    load();
    return () => controller.abort();
  }, [examId, navigate]);

  // ── Sauvegarder → PUT /api/exams/:id ─────────────────────
  const save = useCallback(async (qs = questions) => {
    setIsSaving(true);
    try {
      const formatted = qs.map(q => ({
        question:      q.text || q.question || '',
        text:          q.text || q.question || '',
        options:       q.options,
        correctAnswer: q.correctAnswer,
        points:        q.points || 1,
        explanation:   q.explanation || '',
        type:          q.type || 'single',
      }));
      await axios.put(`${NODE_BACKEND_URL}/api/exams/${examId}`, {
        ...exam,
        questions:     formatted,
        questionCount: formatted.length,
        totalPoints:   formatted.reduce((s, q) => s + (q.points || 1), 0),
        duration:      formatted.length, // 1 min / question
      });
      setIsDirty(false);
      toast.success('Épreuve sauvegardée !');
    } catch (e) {
      toast.error('Erreur lors de la sauvegarde : ' + e.message);
    } finally { setIsSaving(false); }
  }, [questions, exam, examId]);

  // ── Mutations questions ───────────────────────────────────
  const update = (i, q) => { const qs = [...questions]; qs[i] = q; setQuestions(qs); setIsDirty(true); };
  const remove = (i) => {
    if (!window.confirm(`Supprimer la question ${i + 1} ?`)) return;
    const qs = questions.filter((_, j) => j !== i);
    setQuestions(qs); setIsDirty(true);
    toast.success('Question supprimée');
  };
  const duplicate = (i) => {
    const qs = [...questions];
    qs.splice(i + 1, 0, { ...questions[i] });
    setQuestions(qs); setIsDirty(true);
    toast.success('Question dupliquée');
  };
  const moveUp   = (i) => { if (i === 0) return; const qs = [...questions]; [qs[i-1], qs[i]] = [qs[i], qs[i-1]]; setQuestions(qs); setIsDirty(true); };
  const moveDown = (i) => { if (i === questions.length-1) return; const qs = [...questions]; [qs[i], qs[i+1]] = [qs[i+1], qs[i]]; setQuestions(qs); setIsDirty(true); };

  // ── Ajouter une question ──────────────────────────────────
  const addQuestion = () => {
    if (!newQ.text.trim()) { toast.error("L'énoncé est requis."); return; }
    if (!newQ.correctAnswer.trim()) { toast.error("Sélectionnez la bonne réponse."); return; }
    const filled = newQ.options.filter(o => o.trim() !== '');
    if (filled.length < 2) { toast.error("Ajoutez au moins 2 options."); return; }
    const qs = [...questions, { ...newQ, options: filled }];
    setQuestions(qs); setIsDirty(true);
    setNewQ(newBlank()); setAddMode(false);
    toast.success('Question ajoutée');
  };

  // ── Loading ───────────────────────────────────────────────
  if (isLoading) return (
    <div style={{ minHeight: '100vh', background: '#05071a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
      <RefreshCw size={32} color="#3b82f6" style={{ animation: 'spin 1s linear infinite' }} />
      <span style={{ color: '#64748b', fontFamily: 'DM Sans, sans-serif' }}>Chargement…</span>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  const totalPts = questions.reduce((s, q) => s + (q.points || 1), 0);

  // ── Rendu ─────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #05071a 0%, #0a0f2e 60%, #05071a 100%)', fontFamily: "'DM Sans', sans-serif", position: 'relative' }}>
      <div style={{ position: 'fixed', inset: 0, backgroundImage: 'linear-gradient(rgba(59,130,246,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,0.03) 1px, transparent 1px)', backgroundSize: '40px 40px', pointerEvents: 'none', zIndex: 0 }} />

      {/* ── HEADER ── */}
      <header style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(5,7,26,0.92)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(59,130,246,0.1)', padding: '0 24px', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            onClick={() => navigate('/exams')}
            style={{ ...S.btn('#94a3b8'), padding: '6px 12px', flexShrink: 0 }}>
            <ArrowLeft size={14}/> Épreuves
          </motion.button>
          <span style={{ color: '#334155' }}>/</span>
          <span style={{ color: '#64748b', fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {exam?.title}
          </span>
          {isDirty && (
            <span style={{ padding: '2px 8px', borderRadius: 999, background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)', color: '#f59e0b', fontSize: '0.68rem', fontWeight: 700, flexShrink: 0 }}>
              ● Non sauvegardé
            </span>
          )}
        </div>

        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          {isDirty && (
            <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
              onClick={() => save()}
              disabled={isSaving}
              style={{ ...S.btn('#10b981', 'rgba(16,185,129,0.12)'), padding: '7px 16px', opacity: isSaving ? 0.6 : 1 }}>
              {isSaving ? <RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }}/> : <Save size={13}/>}
              {isSaving ? 'Sauvegarde…' : 'Sauvegarder'}
            </motion.button>
          )}
          <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
            onClick={() => {
              localStorage.setItem('studentInfoForExam', JSON.stringify({ examId, info: { firstName: 'Test', lastName: 'Enseignant', matricule: 'PROF-001', level: exam?.level || '' }, examOption: 'C', terminalSessionId: null }));
              navigate(`/exam/compose/${examId}`);
            }}
            style={{ ...S.btn('#10b981', 'rgba(16,185,129,0.1)'), padding: '7px 14px' }}>
            <Play size={13}/> Composer
          </motion.button>
        </div>
      </header>

      <main style={{ position: 'relative', zIndex: 1, maxWidth: 900, margin: '0 auto', padding: '28px 20px' }}>

        {/* ── FICHE ÉPREUVE ── */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          style={{ background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(59,130,246,0.18)', borderRadius: 18, padding: '22px 24px', marginBottom: 22, backdropFilter: 'blur(12px)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
            <div>
              <h1 style={{ fontFamily: "'Sora', sans-serif", fontSize: '1.5rem', fontWeight: 800, color: '#f8fafc', marginBottom: 4, letterSpacing: '-0.02em' }}>{exam?.title}</h1>
              {exam?.description && <p style={{ color: '#64748b', fontSize: '0.88rem' }}>{exam.description}</p>}
            </div>
            <span style={{ padding: '4px 12px', borderRadius: 999, background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', color: '#a5b4fc', fontSize: '0.78rem', fontWeight: 700 }}>
              {questions.length} question{questions.length > 1 ? 's' : ''} · {totalPts} pts
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 10 }}>
            {[
              { ic: <Clock size={13}/>,    l: 'Durée',   v: `${questions.length} min` },
              { ic: <Award size={13}/>,    l: 'Points',  v: `${totalPts} pts` },
              { ic: <BookOpen size={13}/>, l: 'Matière', v: exam?.subject || '—' },
              { ic: <Layers size={13}/>,   l: 'Niveau',  v: exam?.level   || '—' },
              { ic: <User size={13}/>,     l: 'Seuil',   v: `${exam?.passingScore || 70}%` },
            ].map(({ ic, l, v }) => (
              <div key={l} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: '9px 12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#64748b', fontSize: '0.68rem', marginBottom: 3 }}>{ic} {l}</div>
                <div style={{ color: '#e2e8f0', fontWeight: 600, fontSize: '0.86rem' }}>{v}</div>
              </div>
            ))}
          </div>

          {exam?.teacherName && (
            <div style={{ marginTop: 12, padding: '8px 12px', background: 'rgba(59,130,246,0.05)', borderRadius: 8, border: '1px solid rgba(59,130,246,0.12)', fontSize: '0.83rem', color: '#64748b', display: 'flex', gap: 16 }}>
              <span><strong style={{ color: '#e2e8f0' }}>Enseignant :</strong> {exam.teacherName}</span>
              {exam.teacherGrade && <span><strong style={{ color: '#e2e8f0' }}>Grade :</strong> {exam.teacherGrade}</span>}
            </div>
          )}
        </motion.div>

        {/* ── TOOLBAR QUESTIONS ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
          <h2 style={{ fontFamily: "'Sora', sans-serif", color: '#f8fafc', fontSize: '1rem', fontWeight: 700, margin: 0 }}>
            Questions ({questions.length})
          </h2>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setShowAll(v => !v)}
              style={S.btn('#64748b')}>
              {showAll ? <><ChevronUp size={13}/> Replier</> : <><ChevronDown size={13}/> Tout déplier</>}
            </button>
            <button onClick={() => { setAddMode(true); setNewQ(newBlank()); }}
              style={{ ...S.btn('#6366f1', 'rgba(99,102,241,0.12)'), padding: '6px 14px' }}>
              <Plus size={13}/> Ajouter une question
            </button>
          </div>
        </div>

        {/* ── FORMULAIRE NOUVELLE QUESTION ── */}
        <AnimatePresence>
          {addMode && (
            <motion.div
              initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
              style={{ background: 'rgba(99,102,241,0.07)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 14, padding: '18px 18px', marginBottom: 12 }}
            >
              <p style={{ color: '#a5b4fc', fontWeight: 700, fontSize: '0.88rem', marginBottom: 12 }}>➕ Nouvelle question</p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div>
                  <label style={{ color: '#64748b', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4, display: 'block' }}>Énoncé *</label>
                  <textarea rows={2} value={newQ.text} onChange={e => setNewQ({ ...newQ, text: e.target.value, question: e.target.value })}
                    style={{ ...S.input, resize: 'vertical' }} placeholder="Saisissez la question…" />
                </div>

                <div>
                  <label style={{ color: '#64748b', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6, display: 'block' }}>
                    Options <span style={{ fontWeight: 400 }}>(cliquer ✓ pour la bonne réponse)</span>
                  </label>
                  {newQ.options.map((opt, j) => {
                    const isCorrect = opt.trim() !== '' && opt.trim() === newQ.correctAnswer.trim();
                    return (
                      <div key={j} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                        <span style={{ width: 22, height: 22, borderRadius: 6, background: isCorrect ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.06)', color: isCorrect ? '#10b981' : '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.72rem', fontWeight: 700, flexShrink: 0 }}>
                          {String.fromCharCode(65 + j)}
                        </span>
                        <input value={opt}
                          onChange={e => { const o = [...newQ.options]; o[j] = e.target.value; setNewQ({ ...newQ, options: o }); }}
                          style={{ ...S.input, borderColor: isCorrect ? 'rgba(16,185,129,0.4)' : 'rgba(99,102,241,0.2)' }}
                          placeholder={`Option ${String.fromCharCode(65 + j)}`} />
                        <button onClick={() => setNewQ({ ...newQ, correctAnswer: opt })}
                          style={{ ...S.iconBtn(isCorrect ? '#10b981' : '#475569'), flexShrink: 0 }}>
                          <Check size={13}/>
                        </button>
                      </div>
                    );
                  })}
                  <p style={{ color: '#475569', fontSize: '0.72rem' }}>Bonne réponse : <span style={{ color: '#10b981', fontWeight: 600 }}>{newQ.correctAnswer || '—'}</span></p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '90px 1fr', gap: 10 }}>
                  <div>
                    <label style={{ color: '#64748b', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4, display: 'block' }}>Points</label>
                    <input type="number" min={0.5} max={10} step={0.5} value={newQ.points}
                      onChange={e => setNewQ({ ...newQ, points: parseFloat(e.target.value) || 1 })}
                      style={S.input} />
                  </div>
                  <div>
                    <label style={{ color: '#64748b', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4, display: 'block' }}>Explication</label>
                    <input value={newQ.explanation}
                      onChange={e => setNewQ({ ...newQ, explanation: e.target.value })}
                      style={S.input} placeholder="Optionnel…" />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <button onClick={() => setAddMode(false)} style={S.btn('#94a3b8')}>
                    <X size={13}/> Annuler
                  </button>
                  <button onClick={addQuestion} style={{ ...S.btn('#6366f1', 'rgba(99,102,241,0.15)') }}>
                    <Plus size={13}/> Ajouter
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── LISTE DES QUESTIONS ── */}
        {questions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#475569', background: 'rgba(15,23,42,0.5)', borderRadius: 14, border: '1px dashed rgba(255,255,255,0.08)' }}>
            <BookOpen size={36} color="#1e293b" style={{ marginBottom: 12 }} />
            <p>Aucune question. Ajoutez-en une avec le bouton ci-dessus.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <AnimatePresence>
              {questions.map((q, i) => (
                <QuestionEditor
                  key={`${i}-${q.text?.slice(0, 10)}`}
                  q={q} idx={i} total={questions.length}
                  onChange={(nq) => update(i, nq)}
                  onDelete={remove}
                  onDuplicate={duplicate}
                  onMoveUp={moveUp}
                  onMoveDown={moveDown}
                />
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* ── BOUTON SAUVEGARDER BAS ── */}
        {isDirty && (
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            style={{ position: 'sticky', bottom: 20, marginTop: 20, display: 'flex', justifyContent: 'center' }}
          >
            <button onClick={() => save()} disabled={isSaving}
              style={{ ...S.btn('#10b981', 'rgba(16,185,129,0.15)'), padding: '12px 28px', fontSize: '0.95rem', borderRadius: 12, boxShadow: '0 8px 24px rgba(16,185,129,0.25)', backdropFilter: 'blur(8px)' }}>
              {isSaving
                ? <><RefreshCw size={15} style={{ animation: 'spin 1s linear infinite' }}/> Sauvegarde en cours…</>
                : <><Save size={15}/> Sauvegarder toutes les modifications ({questions.length} questions)</>
              }
            </button>
          </motion.div>
        )}
      </main>

      <Toaster position="bottom-right" toastOptions={{ style: { background: '#1e293b', color: '#f1f5f9', border: '1px solid rgba(59,130,246,0.2)' } }} />

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@700;800&family=DM+Sans:wght@400;500;600;700&display=swap');
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default PreviewExamPage;