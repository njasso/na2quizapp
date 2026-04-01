// src/pages/PreviewExamPage.jsx - Version avec support des images
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../services/api';
import {
  ArrowLeft, Clock, Layers, BookOpen, Award, CheckCircle,
  ChevronDown, ChevronUp, Edit3, Play, RefreshCw, User,
  Trash2, Copy, Plus, Save, AlertTriangle, GripVertical,
  Check, X, ArrowUp, ArrowDown, Settings, Image as ImageIcon
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

// Styles communs
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

// Helper pour le libellé de l'option
const getOptionLabel = (opt) => {
  const labels = {
    A: 'Collective Figée',
    B: 'Collective Souple',
    C: 'Personnalisée',
    D: 'Aléatoire'
  };
  return labels[opt] || `Option ${opt}`;
};

// Normaliser une question pour l'affichage (AVEC IMAGES)
const normalizeQuestion = (q) => {
  // Récupérer l'URL de l'image (priorité à imageQuestion, fallback imageBase64)
  let imageUrl = q.imageQuestion || '';
  if (!imageUrl && q.imageBase64 && q.imageBase64.startsWith('data:')) {
    imageUrl = q.imageBase64;
  }
  
  return {
    _id: q._id,
    libQuestion: q.libQuestion || q.question || q.text || '',
    text: q.libQuestion || q.question || q.text || '',
    question: q.libQuestion || q.question || q.text || '',
    options: q.options || [],
    correctAnswer: q.correctAnswer || (q.options && typeof q.bonOpRep === 'number' ? q.options[q.bonOpRep] : ''),
    bonOpRep: q.bonOpRep,
    points: q.points || 1,
    explanation: q.explanation || '',
    typeQuestion: q.typeQuestion || 1,
    type: q.type || 'single',
    tempsMinParQuestion: q.tempsMinParQuestion || 60,
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

// Composant éditeur d'une question (AVEC IMAGES)
const QuestionEditor = ({ q, idx, total, onChange, onDelete, onDuplicate, onMoveUp, onMoveDown }) => {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(null);
  const [imagePreview, setImagePreview] = useState(q.imageUrl || null);

  const startEdit = (e) => {
    e.stopPropagation();
    setDraft({
      libQuestion: q.libQuestion || q.text || '',
      text: q.libQuestion || q.text || '',
      options: [...(q.options || ['', '', '', ''])],
      correctAnswer: q.correctAnswer || '',
      bonOpRep: q.bonOpRep,
      points: q.points || 1,
      explanation: q.explanation || '',
      typeQuestion: q.typeQuestion || 1,
      tempsMinParQuestion: q.tempsMinParQuestion || 60,
      domaine: q.domaine || '',
      sousDomaine: q.sousDomaine || '',
      niveau: q.niveau || '',
      matiere: q.matiere || '',
      imageQuestion: q.imageQuestion || '',
      imageBase64: q.imageBase64 || '',
    });
    setImagePreview(q.imageUrl || null);
    setEditing(true);
    setOpen(true);
  };

  const cancelEdit = () => {
    setEditing(false);
    setDraft(null);
    setImagePreview(null);
  };

  const saveEdit = () => {
    const updated = { ...q, ...draft };
    if (updated.typeQuestion === 1 && updated.correctAnswer) {
      updated.bonOpRep = updated.options.findIndex(opt => opt === updated.correctAnswer);
    }
    // Mettre à jour l'imageUrl
    updated.imageUrl = draft.imageQuestion || (draft.imageBase64?.startsWith('data:') ? draft.imageBase64 : null);
    onChange(updated);
    setEditing(false);
    setDraft(null);
    setImagePreview(null);
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result;
        setImagePreview(base64);
        setDraft({ ...draft, imageQuestion: '', imageBase64: base64 });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleImageUrlChange = (url) => {
    setImagePreview(url);
    setDraft({ ...draft, imageQuestion: url, imageBase64: '' });
  };

  const removeImage = () => {
    setImagePreview(null);
    setDraft({ ...draft, imageQuestion: '', imageBase64: '' });
  };

  const setOpt = (i, v) => {
    const opts = [...draft.options];
    opts[i] = v;
    setDraft({ ...draft, options: opts });
  };

  const qText = q.libQuestion || q.text || '';
  const opts = q.options || [];
  const correct = q.correctAnswer || '';
  const pts = q.points || 1;
  const imageUrl = q.imageUrl;

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
      <div
        onClick={() => !editing && setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '12px 16px', cursor: editing ? 'default' : 'pointer',
          userSelect: 'none',
        }}
      >
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

        <p style={{ flex: 1, color: '#e2e8f0', fontWeight: 500, fontSize: '0.92rem', margin: 0, lineHeight: 1.4 }}>
          {qText || <span style={{ color: '#475569', fontStyle: 'italic' }}>Question sans énoncé</span>}
        </p>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
          <span style={{ padding: '2px 8px', borderRadius: 999, background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)', color: '#f59e0b', fontSize: '0.7rem', fontWeight: 700 }}>
            {pts} pt{pts > 1 ? 's' : ''}
          </span>

          <button disabled={idx === 0} onClick={() => onMoveUp(idx)}
            style={{ ...S.iconBtn('#94a3b8'), opacity: idx === 0 ? 0.3 : 1 }} title="Monter">
            <ArrowUp size={13} />
          </button>
          <button disabled={idx === total - 1} onClick={() => onMoveDown(idx)}
            style={{ ...S.iconBtn('#94a3b8'), opacity: idx === total - 1 ? 0.3 : 1 }} title="Descendre">
            <ArrowDown size={13} />
          </button>
          <button onClick={() => onDuplicate(idx)} style={S.iconBtn('#3b82f6')} title="Dupliquer">
            <Copy size={13} />
          </button>
          <button onClick={startEdit} style={S.iconBtn('#a78bfa')} title="Modifier">
            <Edit3 size={13} />
          </button>
          <button onClick={() => onDelete(idx)} style={S.iconBtn('#ef4444')} title="Supprimer">
            <Trash2 size={13} />
          </button>
          <span style={{ color: '#475569' }}>
            {open ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          </span>
        </div>
      </div>

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
                <>
                  <div>
                    <label style={{ color: '#64748b', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 4, display: 'block' }}>Énoncé</label>
                    <textarea
                      value={draft.libQuestion}
                      onChange={e => setDraft({ ...draft, libQuestion: e.target.value, text: e.target.value })}
                      rows={2}
                      style={{ ...S.input, resize: 'vertical' }}
                    />
                  </div>

                  {/* Image de la question */}
                  <div>
                    <label style={{ color: '#64748b', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 4, display: 'block' }}>Image</label>
                    {imagePreview ? (
                      <div style={{ position: 'relative', marginBottom: 8 }}>
                        <img src={imagePreview} alt="Aperçu" style={{ maxWidth: '100%', maxHeight: 100, borderRadius: 8, objectFit: 'contain' }} />
                        <button
                          onClick={removeImage}
                          style={{
                            position: 'absolute', top: 4, right: 4,
                            background: '#ef4444', border: 'none', borderRadius: '50%',
                            width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: 'pointer', color: 'white'
                          }}
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <input
                          type="text"
                          value={draft.imageQuestion || ''}
                          onChange={(e) => handleImageUrlChange(e.target.value)}
                          placeholder="URL de l'image"
                          style={{ ...S.input, flex: 1 }}
                        />
                        <label style={{
                          padding: '8px 12px', background: '#6366f1', borderRadius: 8,
                          cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                          color: 'white', fontSize: '0.7rem'
                        }}>
                          <ImageIcon size={14} />
                          <input type="file" accept="image/*" onChange={handleImageChange} style={{ display: 'none' }} />
                          Upload
                        </label>
                      </div>
                    )}
                  </div>

                  <div>
                    <label style={{ color: '#64748b', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6, display: 'block' }}>
                      Options <span style={{ color: '#475569', fontWeight: 400 }}>(clic sur ✓ pour définir la bonne réponse)</span>
                    </label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {draft.options.map((opt, j) => {
                        const isCorrect = String(opt).trim() !== '' && String(opt).trim() === String(draft.correctAnswer).trim();
                        return (
                          <div key={j} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ width: 22, height: 22, borderRadius: 6, background: isCorrect ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.06)', color: isCorrect ? '#10b981' : '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.72rem', fontWeight: 700, flexShrink: 0 }}>
                              {String.fromCharCode(65 + j)}
                            </span>
                            <input
                              value={opt}
                              onChange={e => setOpt(j, e.target.value)}
                              style={{ ...S.input, borderColor: isCorrect ? 'rgba(16,185,129,0.4)' : 'rgba(99,102,241,0.2)' }}
                              placeholder={`Option ${String.fromCharCode(65 + j)}`}
                            />
                            <button
                              title="Définir comme bonne réponse"
                              onClick={() => setDraft({ ...draft, correctAnswer: opt, bonOpRep: j })}
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

                  <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr 1fr', gap: 10 }}>
                    <div>
                      <label style={{ color: '#64748b', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 4, display: 'block' }}>Points</label>
                      <input type="number" min={0.5} max={10} step={0.5}
                        value={draft.points}
                        onChange={e => setDraft({ ...draft, points: parseFloat(e.target.value) || 1 })}
                        style={S.input}
                      />
                    </div>
                    <div>
                      <label style={{ color: '#64748b', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 4, display: 'block' }}>Temps (sec)</label>
                      <input type="number" min={5} max={300}
                        value={draft.tempsMinParQuestion}
                        onChange={e => setDraft({ ...draft, tempsMinParQuestion: parseInt(e.target.value) || 60 })}
                        style={S.input}
                      />
                    </div>
                    <div>
                      <label style={{ color: '#64748b', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 4, display: 'block' }}>Explication</label>
                      <input value={draft.explanation}
                        onChange={e => setDraft({ ...draft, explanation: e.target.value })}
                        style={S.input} placeholder="Explication de la bonne réponse…" />
                    </div>
                  </div>

                  <div>
                    <label style={{ color: '#64748b', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 4, display: 'block' }}>Référentiel</label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      <input value={draft.domaine} onChange={e => setDraft({ ...draft, domaine: e.target.value })} placeholder="Domaine" style={S.input} />
                      <input value={draft.sousDomaine} onChange={e => setDraft({ ...draft, sousDomaine: e.target.value })} placeholder="Sous-domaine" style={S.input} />
                      <input value={draft.niveau} onChange={e => setDraft({ ...draft, niveau: e.target.value })} placeholder="Niveau" style={S.input} />
                      <input value={draft.matiere} onChange={e => setDraft({ ...draft, matiere: e.target.value })} placeholder="Matière" style={S.input} />
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
                    <button onClick={cancelEdit} style={S.btn('#94a3b8')}>
                      <X size={13} /> Annuler
                    </button>
                    <button onClick={saveEdit} style={{ ...S.btn('#10b981', 'rgba(16,185,129,0.15)') }}>
                      <Check size={13} /> Valider la modification
                    </button>
                  </div>
                </>
              ) : (
                <>
                  {/* Affichage de l'image */}
                  {imageUrl && (
                    <div style={{ marginBottom: 12, textAlign: 'center' }}>
                      <img 
                        src={imageUrl} 
                        alt="Illustration"
                        style={{ maxWidth: '100%', maxHeight: 100, borderRadius: 8, objectFit: 'contain' }}
                      />
                    </div>
                  )}
                  
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
                  <div style={{ display: 'flex', gap: 12, fontSize: '0.7rem', color: '#64748b', marginTop: 4 }}>
                    <span>Domaine: {q.domaine || '—'}</span>
                    <span>Niveau: {q.niveau || '—'}</span>
                    <span>Matière: {q.matiere || '—'}</span>
                    {q.imageQuestion && <span>📁 Image locale</span>}
                    {q.imageBase64 && !q.imageQuestion && <span>💾 Image Base64</span>}
                  </div>
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

// ====================== PAGE PRINCIPALE ======================
const PreviewExamPage = () => {
  const { examId } = useParams();
  const navigate = useNavigate();

  const [exam, setExam] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showAll, setShowAll] = useState(false);

  const newBlank = () => ({
    libQuestion: '',
    text: '',
    options: ['', '', '', ''],
    correctAnswer: '',
    bonOpRep: null,
    points: 1,
    explanation: '',
    typeQuestion: 1,
    type: 'single',
    tempsMinParQuestion: 60,
    domaine: '',
    sousDomaine: '',
    niveau: '',
    matiere: '',
    imageQuestion: '',
    imageBase64: '',
  });

  const [addMode, setAddMode] = useState(false);
  const [newQ, setNewQ] = useState(newBlank());
  const [newImagePreview, setNewImagePreview] = useState(null);

  // Chargement de l'épreuve
  useEffect(() => {
    const controller = new AbortController();

    const loadExam = async () => {
      setIsLoading(true);
      try {
        const res = await api.get(`/api/exams/${examId}`, {
          signal: controller.signal,
        });

        const examData = res.data?.data || res.data || res;
        setExam(examData);
        setQuestions((examData?.questions || []).map(q => normalizeQuestion(q)));
      } catch (e) {
        if (e.name === 'CanceledError' || e.code === 'ERR_CANCELED') {
          console.log('[PreviewExamPage] Requête annulée');
          return;
        }

        console.error('Erreur chargement épreuve:', e);
        if (e.response?.status === 401) {
          toast.error('Session expirée, veuillez vous reconnecter');
          localStorage.removeItem('userToken');
          localStorage.removeItem('userInfo');
          navigate('/login');
        } else {
          toast.error("Épreuve introuvable ou erreur serveur.");
          navigate('/exams');
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadExam();

    return () => controller.abort();
  }, [examId, navigate]);

  // Sauvegarde
  const save = useCallback(async (qs = questions) => {
    setIsSaving(true);
    try {
      const formatted = qs.map(q => ({
        libQuestion: q.libQuestion || q.text,
        options: q.options,
        correctAnswer: q.correctAnswer,
        bonOpRep: q.bonOpRep,
        points: q.points || 1,
        explanation: q.explanation || '',
        typeQuestion: q.typeQuestion || 1,
        type: q.type || 'single',
        tempsMin: Math.ceil((q.tempsMinParQuestion || 60) / 60),
        tempsMinParQuestion: q.tempsMinParQuestion || 60,
        domaine: q.domaine || exam?.domain || '',
        sousDomaine: q.sousDomaine || exam?.category || '',
        niveau: q.niveau || exam?.level || '',
        matiere: q.matiere || exam?.subject || '',
        imageQuestion: q.imageQuestion || '',
        imageBase64: q.imageBase64 || '',
      }));

      await api.put(`/api/exams/${examId}`, {
        ...exam,
        questions: formatted,
        questionCount: formatted.length,
        totalPoints: formatted.reduce((s, q) => s + (q.points || 1), 0),
        duration: Math.ceil(formatted.reduce((s, q) => s + (q.tempsMinParQuestion || 60), 0) / 60),
      });

      setIsDirty(false);
      toast.success('Épreuve sauvegardée avec succès !');
    } catch (e) {
      console.error('Erreur sauvegarde:', e);
      if (e.response?.status === 401) {
        toast.error('Session expirée');
        localStorage.removeItem('userToken');
        localStorage.removeItem('userInfo');
        navigate('/login');
      } else {
        toast.error('Erreur lors de la sauvegarde : ' + (e.response?.data?.message || e.message));
      }
    } finally {
      setIsSaving(false);
    }
  }, [questions, exam, examId, navigate]);

  // Mutations des questions
  const update = (i, q) => {
    const qs = [...questions];
    qs[i] = q;
    setQuestions(qs);
    setIsDirty(true);
  };

  const remove = (i) => {
    if (!window.confirm(`Supprimer la question ${i + 1} ?`)) return;
    const qs = questions.filter((_, j) => j !== i);
    setQuestions(qs);
    setIsDirty(true);
    toast.success('Question supprimée');
  };

  const duplicate = (i) => {
    const qs = [...questions];
    qs.splice(i + 1, 0, { ...questions[i] });
    setQuestions(qs);
    setIsDirty(true);
    toast.success('Question dupliquée');
  };

  const moveUp = (i) => {
    if (i === 0) return;
    const qs = [...questions];
    [qs[i - 1], qs[i]] = [qs[i], qs[i - 1]];
    setQuestions(qs);
    setIsDirty(true);
  };

  const moveDown = (i) => {
    if (i === questions.length - 1) return;
    const qs = [...questions];
    [qs[i], qs[i + 1]] = [qs[i + 1], qs[i]];
    setQuestions(qs);
    setIsDirty(true);
  };

  // Gestion de l'image pour la nouvelle question
  const handleNewImageFile = (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result;
        setNewImagePreview(base64);
        setNewQ({ ...newQ, imageQuestion: '', imageBase64: base64 });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleNewImageUrl = (url) => {
    setNewImagePreview(url);
    setNewQ({ ...newQ, imageQuestion: url, imageBase64: '' });
  };

  const removeNewImage = () => {
    setNewImagePreview(null);
    setNewQ({ ...newQ, imageQuestion: '', imageBase64: '' });
  };

  // Ajouter une question
  const addQuestion = () => {
    if (!newQ.libQuestion.trim()) {
      toast.error("L'énoncé est requis.");
      return;
    }
    if (!newQ.correctAnswer.trim()) {
      toast.error("Sélectionnez la bonne réponse.");
      return;
    }
    const filled = newQ.options.filter(o => o.trim() !== '');
    if (filled.length < 2) {
      toast.error("Ajoutez au moins 2 options.");
      return;
    }

    const bonOpRep = filled.findIndex(opt => opt === newQ.correctAnswer);
    const newQuestion = {
      ...newQ,
      options: filled,
      bonOpRep: bonOpRep >= 0 ? bonOpRep : null,
      imageUrl: newQ.imageQuestion || (newQ.imageBase64?.startsWith('data:') ? newQ.imageBase64 : null),
    };
    const qs = [...questions, newQuestion];
    setQuestions(qs);
    setIsDirty(true);
    setNewQ(newBlank());
    setNewImagePreview(null);
    setAddMode(false);
    toast.success('Question ajoutée');
  };

  if (isLoading) {
    return (
      <div style={{ minHeight: '100vh', background: '#05071a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
        <RefreshCw size={32} color="#3b82f6" style={{ animation: 'spin 1s linear infinite' }} />
        <span style={{ color: '#64748b', fontFamily: 'DM Sans, sans-serif' }}>Chargement de l'épreuve...</span>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const totalPts = questions.reduce((s, q) => s + (q.points || 1), 0);

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #05071a 0%, #0a0f2e 60%, #05071a 100%)', fontFamily: "'DM Sans', sans-serif", position: 'relative' }}>
      <div style={{ position: 'fixed', inset: 0, backgroundImage: 'linear-gradient(rgba(59,130,246,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,0.03) 1px, transparent 1px)', backgroundSize: '40px 40px', pointerEvents: 'none', zIndex: 0 }} />

      {/* HEADER */}
      <header style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(5,7,26,0.92)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(59,130,246,0.1)', padding: '0 24px', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            onClick={() => navigate('/exams')}
            style={{ ...S.btn('#94a3b8'), padding: '6px 12px', flexShrink: 0 }}>
            <ArrowLeft size={14} /> Épreuves
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
              {isSaving ? <RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={13} />}
              {isSaving ? 'Sauvegarde…' : 'Sauvegarder'}
            </motion.button>
          )}
          <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
            onClick={() => {
              localStorage.setItem('studentInfoForExam', JSON.stringify({
                examId,
                info: { firstName: 'Test', lastName: 'Enseignant', matricule: 'PROF-001', level: exam?.level || '' },
                examOption: 'C',
                terminalSessionId: null
              }));
              navigate(`/exam/compose/${examId}`);
            }}
            style={{ ...S.btn('#10b981', 'rgba(16,185,129,0.1)'), padding: '7px 14px' }}>
            <Play size={13} /> Composer
          </motion.button>
        </div>
      </header>

      <main style={{ position: 'relative', zIndex: 1, maxWidth: 900, margin: '0 auto', padding: '28px 20px' }}>
        {/* FICHE ÉPREUVE */}
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
              { ic: <Clock size={13} />, l: 'Durée', v: `${Math.ceil(questions.reduce((s, q) => s + (q.tempsMinParQuestion || 60), 0) / 60)} min` },
              { ic: <Award size={13} />, l: 'Points', v: `${totalPts} pts` },
              { ic: <BookOpen size={13} />, l: 'Matière', v: exam?.subject || '—' },
              { ic: <Layers size={13} />, l: 'Niveau', v: exam?.level || '—' },
              { ic: <User size={13} />, l: 'Seuil', v: `${exam?.passingScore || 70}%` },
            ].map(({ ic, l, v }) => (
              <div key={l} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: '9px 12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#64748b', fontSize: '0.68rem', marginBottom: 3 }}>{ic} {l}</div>
                <div style={{ color: '#e2e8f0', fontWeight: 600, fontSize: '0.86rem' }}>{v}</div>
              </div>
            ))}
          </div>

          {exam?.config && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                marginTop: 16,
                background: 'rgba(99,102,241,0.08)',
                border: '1px solid rgba(99,102,241,0.2)',
                borderRadius: 12,
                padding: '14px 16px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <Settings size={14} color="#8b5cf6" />
                <span style={{ color: '#a5b4fc', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Configuration de l'épreuve
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.78rem' }}>
                <span style={{ color: '#64748b' }}>Option :</span>
                <span style={{ color: '#e2e8f0' }}>{getOptionLabel(exam.config.examOption)} ({exam.config.examOption})</span>
                
                {exam.config.openRange && (
                  <>
                    <span style={{ color: '#64748b' }}>Plage ouverte :</span>
                    <span style={{ color: '#e2e8f0' }}>{exam.config.requiredQuestions} questions à traiter</span>
                  </>
                )}
                
                <span style={{ color: '#64748b' }}>Séquencement :</span>
                <span style={{ color: '#e2e8f0' }}>{exam.config.sequencing === 'identical' ? 'Identique pour tous' : 'Aléatoire par étudiant'}</span>
                
                {exam.config.allowRetry && (
                  <>
                    <span style={{ color: '#64748b' }}>Reprise :</span>
                    <span style={{ color: '#e2e8f0' }}>Autorisée (une fois)</span>
                  </>
                )}
                
                <span style={{ color: '#64748b' }}>Chronomètre :</span>
                <span style={{ color: '#e2e8f0' }}>
                  {exam.config.timerPerQuestion 
                    ? `${exam.config.timePerQuestion} sec/question` 
                    : `${exam.config.totalTime} min totales`}
                </span>
              </div>
            </motion.div>
          )}
        </motion.div>

        {/* TOOLBAR QUESTIONS */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
          <h2 style={{ fontFamily: "'Sora', sans-serif", color: '#f8fafc', fontSize: '1rem', fontWeight: 700, margin: 0 }}>
            Questions ({questions.length})
          </h2>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setShowAll(v => !v)}
              style={S.btn('#64748b')}>
              {showAll ? <><ChevronUp size={13} /> Replier</> : <><ChevronDown size={13} /> Tout déplier</>}
            </button>
            <button onClick={() => { setAddMode(true); setNewQ(newBlank()); setNewImagePreview(null); }}
              style={{ ...S.btn('#6366f1', 'rgba(99,102,241,0.12)'), padding: '6px 14px' }}>
              <Plus size={13} /> Ajouter une question
            </button>
          </div>
        </div>

        {/* FORMULAIRE NOUVELLE QUESTION AVEC IMAGE */}
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
                  <textarea rows={2} value={newQ.libQuestion} onChange={e => setNewQ({ ...newQ, libQuestion: e.target.value, text: e.target.value })}
                    style={{ ...S.input, resize: 'vertical' }} placeholder="Saisissez la question…" />
                </div>

                {/* Image pour nouvelle question */}
                <div>
                  <label style={{ color: '#64748b', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4, display: 'block' }}>Image</label>
                  {newImagePreview ? (
                    <div style={{ position: 'relative', marginBottom: 8 }}>
                      <img src={newImagePreview} alt="Aperçu" style={{ maxWidth: '100%', maxHeight: 100, borderRadius: 8, objectFit: 'contain' }} />
                      <button
                        onClick={removeNewImage}
                        style={{
                          position: 'absolute', top: 4, right: 4,
                          background: '#ef4444', border: 'none', borderRadius: '50%',
                          width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center',
                          cursor: 'pointer', color: 'white'
                        }}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <input
                        type="text"
                        value={newQ.imageQuestion || ''}
                        onChange={(e) => handleNewImageUrl(e.target.value)}
                        placeholder="URL de l'image"
                        style={{ ...S.input, flex: 1 }}
                      />
                      <label style={{
                        padding: '8px 12px', background: '#6366f1', borderRadius: 8,
                        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                        color: 'white', fontSize: '0.7rem'
                      }}>
                        <ImageIcon size={14} />
                        <input type="file" accept="image/*" onChange={handleNewImageFile} style={{ display: 'none' }} />
                        Upload
                      </label>
                    </div>
                  )}
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
                        <button onClick={() => setNewQ({ ...newQ, correctAnswer: opt, bonOpRep: j })}
                          style={{ ...S.iconBtn(isCorrect ? '#10b981' : '#475569'), flexShrink: 0 }}>
                          <Check size={13} />
                        </button>
                      </div>
                    );
                  })}
                  <p style={{ color: '#475569', fontSize: '0.72rem' }}>Bonne réponse : <span style={{ color: '#10b981', fontWeight: 600 }}>{newQ.correctAnswer || '—'}</span></p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '90px 90px 1fr', gap: 10 }}>
                  <div>
                    <label style={{ color: '#64748b', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4, display: 'block' }}>Points</label>
                    <input type="number" min={0.5} max={10} step={0.5} value={newQ.points}
                      onChange={e => setNewQ({ ...newQ, points: parseFloat(e.target.value) || 1 })}
                      style={S.input} />
                  </div>
                  <div>
                    <label style={{ color: '#64748b', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4, display: 'block' }}>Temps (sec)</label>
                    <input type="number" min={5} max={300} value={newQ.tempsMinParQuestion}
                      onChange={e => setNewQ({ ...newQ, tempsMinParQuestion: parseInt(e.target.value) || 60 })}
                      style={S.input} />
                  </div>
                  <div>
                    <label style={{ color: '#64748b', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4, display: 'block' }}>Explication</label>
                    <input value={newQ.explanation}
                      onChange={e => setNewQ({ ...newQ, explanation: e.target.value })}
                      style={S.input} placeholder="Optionnel…" />
                  </div>
                </div>

                <div>
                  <label style={{ color: '#64748b', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4, display: 'block' }}>Référentiel</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <input value={newQ.domaine} onChange={e => setNewQ({ ...newQ, domaine: e.target.value })} placeholder="Domaine" style={S.input} />
                    <input value={newQ.sousDomaine} onChange={e => setNewQ({ ...newQ, sousDomaine: e.target.value })} placeholder="Sous-domaine" style={S.input} />
                    <input value={newQ.niveau} onChange={e => setNewQ({ ...newQ, niveau: e.target.value })} placeholder="Niveau" style={S.input} />
                    <input value={newQ.matiere} onChange={e => setNewQ({ ...newQ, matiere: e.target.value })} placeholder="Matière" style={S.input} />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <button onClick={() => { setAddMode(false); setNewImagePreview(null); }} style={S.btn('#94a3b8')}>
                    <X size={13} /> Annuler
                  </button>
                  <button onClick={addQuestion} style={{ ...S.btn('#6366f1', 'rgba(99,102,241,0.15)') }}>
                    <Plus size={13} /> Ajouter
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* LISTE DES QUESTIONS */}
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
                  key={`${i}-${q.libQuestion?.slice(0, 10)}`}
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

        {isDirty && (
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            style={{ position: 'sticky', bottom: 20, marginTop: 20, display: 'flex', justifyContent: 'center' }}
          >
            <button onClick={() => save()} disabled={isSaving}
              style={{ ...S.btn('#10b981', 'rgba(16,185,129,0.15)'), padding: '12px 28px', fontSize: '0.95rem', borderRadius: 12, boxShadow: '0 8px 24px rgba(16,185,129,0.25)', backdropFilter: 'blur(8px)' }}>
              {isSaving
                ? <><RefreshCw size={15} style={{ animation: 'spin 1s linear infinite' }} /> Sauvegarde en cours…</>
                : <><Save size={15} /> Sauvegarder toutes les modifications ({questions.length} questions)</>
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