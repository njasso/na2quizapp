// src/pages/qcm/QCMBankPage.jsx — Consultation analytique de la Banque de QCM
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Library, Search, Filter, Eye, Download, FileText, BookOpen,
  Layers, Tag, Clock, Award, CheckCircle, XCircle, AlertCircle,
  ChevronDown, ChevronUp, ArrowLeft, Home, User, RefreshCw,
  BarChart3, TrendingUp, PieChart, FilterX, Copy, Trash2
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { getQuestions } from '../../services/api';
import DOMAIN_DATA, {
  getAllDomaines,
  getAllSousDomaines,
  getAllLevels,
  getAllMatieres,
  getDomainNom,
  getSousDomaineNom,
  getLevelNom,
  getMatiereNom
} from '../../data/domainConfig';
import toast from 'react-hot-toast';

const QUESTION_TYPES = [
  { id: 1, nom: "Savoir", color: "#3b82f6", description: "Notions de base" },
  { id: 2, nom: "Savoir-Faire", color: "#10b981", description: "Intelligence pratique" },
  { id: 3, nom: "Savoir-être", color: "#8b5cf6", description: "Potentiel psychologique" }
];

const QCMBankPage = () => {
  const navigate = useNavigate();
  const { user, hasRole } = useAuth();

  // ========== ÉTATS ==========
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filtres
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDomainId, setSelectedDomainId] = useState('');
  const [selectedSousDomaineId, setSelectedSousDomaineId] = useState('');
  const [selectedLevelId, setSelectedLevelId] = useState('');
  const [selectedMatiereId, setSelectedMatiereId] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('approved'); // approved, pending, all
  const [showFilters, setShowFilters] = useState(true);
  const [expandedQuestion, setExpandedQuestion] = useState(null);

  // Noms
  const [domainNom, setDomainNom] = useState('');
  const [sousDomaineNom, setSousDomaineNom] = useState('');
  const [levelNom, setLevelNom] = useState('');
  const [matiereNom, setMatiereNom] = useState('');

  // Statistiques
  const [stats, setStats] = useState({
    total: 0,
    byType: { 1: 0, 2: 0, 3: 0 },
    byStatus: { approved: 0, pending: 0, rejected: 0 },
    avgPoints: 0
  });

  // Mise à jour des noms
  useEffect(() => {
    if (selectedDomainId) setDomainNom(getDomainNom(selectedDomainId));
  }, [selectedDomainId]);

  useEffect(() => {
    if (selectedDomainId && selectedSousDomaineId) {
      setSousDomaineNom(getSousDomaineNom(selectedDomainId, selectedSousDomaineId));
    }
  }, [selectedDomainId, selectedSousDomaineId]);

  useEffect(() => {
    if (selectedDomainId && selectedSousDomaineId && selectedLevelId) {
      setLevelNom(getLevelNom(selectedDomainId, selectedSousDomaineId, selectedLevelId));
    }
  }, [selectedDomainId, selectedSousDomaineId, selectedLevelId]);

  useEffect(() => {
    if (selectedDomainId && selectedSousDomaineId && selectedMatiereId) {
      setMatiereNom(getMatiereNom(selectedDomainId, selectedSousDomaineId, selectedMatiereId));
    }
  }, [selectedDomainId, selectedSousDomaineId, selectedMatiereId]);

  // Chargement des questions
  const loadQuestions = async () => {
    setLoading(true);
    setError(null);
    try {
      const filter = {};
      if (selectedDomainId) filter.nDomaine = parseInt(selectedDomainId);
      if (selectedSousDomaineId) filter.nSousDomaine = parseInt(selectedSousDomaineId);
      if (selectedLevelId) filter.niveau = parseInt(selectedLevelId);
      if (selectedMatiereId) filter.matiere = parseInt(selectedMatiereId);
      if (selectedStatus !== 'all') filter.status = selectedStatus;

      const response = await getQuestions(filter);

      let questionsData = [];
      if (Array.isArray(response)) questionsData = response;
      else if (response?.data && Array.isArray(response.data)) questionsData = response.data;
      else if (response?.data?.data && Array.isArray(response.data.data)) questionsData = response.data.data;

      const normalized = questionsData.map(q => ({
        ...q,
        libQuestion: q.libQuestion || q.question || q.text,
        typeInfo: QUESTION_TYPES.find(t => t.id === q.typeQuestion) || QUESTION_TYPES[0],
        imageUrl: q.imageQuestion || (q.imageBase64?.startsWith('data:') ? q.imageBase64 : null)
      }));

      setQuestions(normalized);

      // Calcul des statistiques
      const statsCalc = {
        total: normalized.length,
        byType: { 1: 0, 2: 0, 3: 0 },
        byStatus: { approved: 0, pending: 0, rejected: 0 },
        avgPoints: 0
      };
      let totalPoints = 0;

      normalized.forEach(q => {
        if (q.typeQuestion && statsCalc.byType[q.typeQuestion] !== undefined) {
          statsCalc.byType[q.typeQuestion]++;
        }
        if (q.status) statsCalc.byStatus[q.status] = (statsCalc.byStatus[q.status] || 0) + 1;
        totalPoints += q.points || 1;
      });
      statsCalc.avgPoints = normalized.length ? (totalPoints / normalized.length).toFixed(1) : 0;

      setStats(statsCalc);
    } catch (err) {
      console.error('Erreur chargement questions:', err);
      setError(err.message || 'Erreur lors du chargement');
      toast.error('Impossible de charger les questions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQuestions();
  }, [selectedDomainId, selectedSousDomaineId, selectedLevelId, selectedMatiereId, selectedStatus]);

  // Filtrage textuel
  const filteredQuestions = useMemo(() => {
    if (!searchTerm) return questions;
    const term = searchTerm.toLowerCase();
    return questions.filter(q =>
      q.libQuestion?.toLowerCase().includes(term) ||
      q.matiere?.toLowerCase().includes(term) ||
      q.niveau?.toLowerCase().includes(term) ||
      q.domaine?.toLowerCase().includes(term)
    );
  }, [questions, searchTerm]);

  const resetFilters = () => {
    setSearchTerm('');
    setSelectedDomainId('');
    setSelectedSousDomaineId('');
    setSelectedLevelId('');
    setSelectedMatiereId('');
    setSelectedType('');
    setSelectedStatus('approved');
  };

  const hasActiveFilters = searchTerm || selectedDomainId || selectedSousDomaineId || selectedLevelId || selectedMatiereId || selectedType || selectedStatus !== 'approved';

  const exportToCSV = () => {
    const headers = ['N°Question', 'Domaine', 'Sous-domaine', 'Niveau', 'Matière', 'Question', 'Type', 'Points', 'Statut', 'Date création'];
    const rows = filteredQuestions.map((q, idx) => [
      idx + 1,
      q.domaine || '',
      q.sousDomaine || '',
      q.niveau || '',
      q.matiere || '',
      q.libQuestion || '',
      q.typeInfo?.nom || '',
      q.points || 1,
      q.status || '',
      new Date(q.createdAt).toLocaleDateString('fr-FR')
    ]);

    const csvContent = [headers, ...rows].map(row => row.join(';')).join('\n');
    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `banque_qcm_${new Date().toISOString().slice(0, 19)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Export CSV réussi');
  };

  // Composant de carte de question
  const QuestionCard = ({ question, index }) => {
    const isExpanded = expandedQuestion === question._id;
    const typeInfo = question.typeInfo;
    const imageUrl = question.imageUrl;

    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.03 }}
        style={{
          background: 'rgba(15,23,42,0.7)',
          border: `1px solid ${typeInfo?.color || '#6366f1'}30`,
          borderRadius: 16,
          overflow: 'hidden',
          backdropFilter: 'blur(8px)'
        }}
      >
        <div
          onClick={() => setExpandedQuestion(isExpanded ? null : question._id)}
          style={{
            padding: '16px 20px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'flex-start',
            gap: 12,
            transition: 'background 0.2s'
          }}
        >
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: `${typeInfo?.color}20`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0
          }}>
            <FileText size={16} color={typeInfo?.color} />
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
              <span style={{
                padding: '2px 8px', borderRadius: 12, fontSize: '0.6rem', fontWeight: 600,
                background: `${typeInfo?.color}20`, color: typeInfo?.color
              }}>
                {typeInfo?.nom}
              </span>
              <span style={{
                padding: '2px 8px', borderRadius: 12, fontSize: '0.6rem', fontWeight: 600,
                background: question.status === 'approved' ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)',
                color: question.status === 'approved' ? '#10b981' : '#f59e0b'
              }}>
                {question.status === 'approved' ? '✓ Validée' : question.status === 'pending' ? '⏳ En attente' : '✗ Rejetée'}
              </span>
              <span style={{ fontSize: '0.6rem', color: '#64748b' }}>
                ⭐ {question.points || 1} pt
              </span>
              <span style={{ fontSize: '0.6rem', color: '#64748b' }}>
                ⏱️ {question.tempsMin || 1} min
              </span>
            </div>

            <p style={{ color: '#f8fafc', fontSize: '0.9rem', fontWeight: 500, lineHeight: 1.4 }}>
              {index + 1}. {question.libQuestion}
            </p>

            <div style={{ display: 'flex', gap: 12, marginTop: 8, fontSize: '0.65rem', color: '#64748b', flexWrap: 'wrap' }}>
              <span>📚 {question.domaine || '—'}</span>
              <span>🎓 {question.niveau || '—'}</span>
              <span>📖 {question.matiere || '—'}</span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {imageUrl && <img src={imageUrl} alt="" style={{ width: 40, height: 40, borderRadius: 6, objectFit: 'cover' }} />}
            {isExpanded ? <ChevronUp size={16} color="#64748b" /> : <ChevronDown size={16} color="#64748b" />}
          </div>
        </div>

        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              style={{ borderTop: '1px solid rgba(255,255,255,0.05)', overflow: 'hidden' }}
            >
              <div style={{ padding: '16px 20px 20px 64px' }}>
                {imageUrl && (
                  <div style={{ marginBottom: 12 }}>
                    <img src={imageUrl} alt="Illustration" style={{ maxWidth: '100%', maxHeight: 150, borderRadius: 8, objectFit: 'contain' }} />
                  </div>
                )}

                <div style={{ marginBottom: 12 }}>
                  <p style={{ color: '#94a3b8', fontSize: '0.7rem', marginBottom: 6 }}>Options :</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {question.options?.map((opt, i) => {
                      const isCorrect = typeof question.bonOpRep === 'number'
                        ? i === question.bonOpRep
                        : opt === question.correctAnswer;
                      return (
                        <div key={i} style={{
                          padding: '6px 12px',
                          background: isCorrect ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.02)',
                          border: `1px solid ${isCorrect ? '#10b981' : 'rgba(99,102,241,0.2)'}`,
                          borderRadius: 8,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8
                        }}>
                          <span style={{ color: isCorrect ? '#10b981' : '#64748b', fontWeight: 600 }}>
                            {String.fromCharCode(65 + i)}.
                          </span>
                          <span style={{ color: '#94a3b8' }}>{opt}</span>
                          {isCorrect && <CheckCircle size={12} color="#10b981" style={{ marginLeft: 'auto' }} />}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {question.explanation && (
                  <div style={{ padding: 8, background: 'rgba(59,130,246,0.05)', borderRadius: 8, marginBottom: 12 }}>
                    <p style={{ color: '#64748b', fontSize: '0.75rem' }}>💡 {question.explanation}</p>
                  </div>
                )}

                <div style={{ display: 'flex', gap: 16, fontSize: '0.65rem', color: '#64748b', marginTop: 8 }}>
                  <span>👤 Auteur: {question.matriculeAuteur || question.createdBy?.name || 'Inconnu'}</span>
                  <span>📅 Créée: {new Date(question.createdAt).toLocaleDateString('fr-FR')}</span>
                  {question.approvedAt && <span>✅ Validée: {new Date(question.approvedAt).toLocaleDateString('fr-FR')}</span>}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #05071a 0%, #0a0f2e 60%, #05071a 100%)',
      padding: '24px'
    }}>
      <div style={{
        position: 'fixed', inset: 0,
        backgroundImage: 'linear-gradient(rgba(99,102,241,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.03) 1px, transparent 1px)',
        backgroundSize: '40px 40px', pointerEvents: 'none', zIndex: 0
      }} />

      <main style={{ position: 'relative', zIndex: 1, maxWidth: 1200, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate('/evaluate')}
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(99,102,241,0.2)',
              borderRadius: 12, padding: 12,
              color: '#94a3b8', cursor: 'pointer'
            }}
          >
            <ArrowLeft size={20} />
          </motion.button>
          <div>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '4px 12px', background: 'rgba(99,102,241,0.1)',
              border: '1px solid rgba(99,102,241,0.3)', borderRadius: 20,
              marginBottom: 8
            }}>
              <Library size={14} color="#6366f1" />
              <span style={{ color: '#a5b4fc', fontSize: '0.7rem', fontWeight: 600 }}>BANQUE DE QCM</span>
            </div>
            <h1 style={{ fontSize: '2rem', fontWeight: 700, color: '#f8fafc' }}>
              Consultation analytique
            </h1>
            <p style={{ color: '#64748b' }}>
              Explorez, filtrez et analysez l'ensemble des questions disponibles
            </p>
          </div>
        </div>

        {/* Stats */}
        {!loading && questions.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 24 }}>
            <div style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 12, padding: 12 }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#3b82f6' }}>{stats.total}</div>
              <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Total questions</div>
            </div>
            <div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 12, padding: 12 }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#10b981' }}>{stats.byStatus.approved || 0}</div>
              <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Validées</div>
            </div>
            <div style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 12, padding: 12 }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#f59e0b' }}>{stats.byStatus.pending || 0}</div>
              <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>En attente</div>
            </div>
            <div style={{ background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.2)', borderRadius: 12, padding: 12 }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#a78bfa' }}>{stats.avgPoints}</div>
              <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Points moyen</div>
            </div>
            <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 12, padding: 12 }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#ef4444' }}>{stats.byStatus.rejected || 0}</div>
              <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Rejetées</div>
            </div>
          </div>
        )}

        {/* Barre de recherche et filtres */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
            <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
              <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Rechercher par question, matière, niveau..."
                style={{
                  width: '100%', padding: '10px 12px 10px 38px',
                  background: 'rgba(15,23,42,0.7)', border: '1px solid rgba(59,130,246,0.2)',
                  borderRadius: 10, color: '#f8fafc', outline: 'none'
                }}
              />
            </div>

            <button
              onClick={() => setShowFilters(!showFilters)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '10px 16px', background: 'rgba(99,102,241,0.1)',
                border: '1px solid rgba(99,102,241,0.3)', borderRadius: 10,
                color: '#a5b4fc', cursor: 'pointer'
              }}
            >
              <Filter size={14} /> Filtres {showFilters ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>

            <button
              onClick={exportToCSV}
              disabled={filteredQuestions.length === 0}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '10px 16px', background: 'rgba(16,185,129,0.1)',
                border: '1px solid rgba(16,185,129,0.3)', borderRadius: 10,
                color: '#10b981', cursor: filteredQuestions.length === 0 ? 'not-allowed' : 'pointer',
                opacity: filteredQuestions.length === 0 ? 0.5 : 1
              }}
            >
              <Download size={14} /> Exporter CSV
            </button>

            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '10px 16px', background: 'rgba(239,68,68,0.1)',
                  border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10,
                  color: '#ef4444', cursor: 'pointer'
                }}
              >
                <FilterX size={14} /> Réinitialiser
              </button>
            )}
          </div>

          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                style={{ overflow: 'hidden' }}
              >
                <div style={{
                  display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                  gap: 12, marginTop: 12, padding: 16,
                  background: 'rgba(15,23,42,0.5)', borderRadius: 12,
                  border: '1px solid rgba(99,102,241,0.15)'
                }}>
                  <div>
                    <label style={{ fontSize: '0.7rem', color: '#94a3b8', marginBottom: 4, display: 'block' }}>Domaine</label>
                    <select value={selectedDomainId} onChange={e => setSelectedDomainId(e.target.value)} style={{ width: '100%', padding: 8, background: '#0f172a', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 8, color: '#f8fafc' }}>
                      <option value="">Tous</option>
                      {getAllDomaines().map(d => <option key={d.id} value={d.id}>{d.id} - {d.nom}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '0.7rem', color: '#94a3b8', marginBottom: 4, display: 'block' }}>Sous-domaine</label>
                    <select value={selectedSousDomaineId} onChange={e => setSelectedSousDomaineId(e.target.value)} disabled={!selectedDomainId} style={{ width: '100%', padding: 8, background: '#0f172a', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 8, color: '#f8fafc', opacity: !selectedDomainId ? 0.5 : 1 }}>
                      <option value="">Tous</option>
                      {getAllSousDomaines(selectedDomainId).map(sd => <option key={sd.id} value={sd.id}>{sd.id} - {sd.nom}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '0.7rem', color: '#94a3b8', marginBottom: 4, display: 'block' }}>Niveau</label>
                    <select value={selectedLevelId} onChange={e => setSelectedLevelId(e.target.value)} disabled={!selectedSousDomaineId} style={{ width: '100%', padding: 8, background: '#0f172a', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 8, color: '#f8fafc', opacity: !selectedSousDomaineId ? 0.5 : 1 }}>
                      <option value="">Tous</option>
                      {getAllLevels(selectedDomainId, selectedSousDomaineId).map(l => <option key={l.id} value={l.id}>{l.id} - {l.nom}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '0.7rem', color: '#94a3b8', marginBottom: 4, display: 'block' }}>Matière</label>
                    <select value={selectedMatiereId} onChange={e => setSelectedMatiereId(e.target.value)} disabled={!selectedSousDomaineId} style={{ width: '100%', padding: 8, background: '#0f172a', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 8, color: '#f8fafc', opacity: !selectedSousDomaineId ? 0.5 : 1 }}>
                      <option value="">Toutes</option>
                      {getAllMatieres(selectedDomainId, selectedSousDomaineId).map(m => <option key={m.id} value={m.id}>{m.id} - {m.nom}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '0.7rem', color: '#94a3b8', marginBottom: 4, display: 'block' }}>Type</label>
                    <select value={selectedType} onChange={e => setSelectedType(e.target.value)} style={{ width: '100%', padding: 8, background: '#0f172a', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 8, color: '#f8fafc' }}>
                      <option value="">Tous</option>
                      {QUESTION_TYPES.map(t => <option key={t.id} value={t.id}>{t.nom}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '0.7rem', color: '#94a3b8', marginBottom: 4, display: 'block' }}>Statut</label>
                    <select value={selectedStatus} onChange={e => setSelectedStatus(e.target.value)} style={{ width: '100%', padding: 8, background: '#0f172a', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 8, color: '#f8fafc' }}>
                      <option value="approved">Validées</option>
                      <option value="pending">En attente</option>
                      <option value="all">Toutes</option>
                    </select>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Liste des questions */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: 60 }}>
            <RefreshCw size={32} color="#3b82f6" style={{ animation: 'spin 1s linear infinite' }} />
            <p style={{ color: '#64748b', marginTop: 16 }}>Chargement des questions...</p>
          </div>
        ) : error ? (
          <div style={{ textAlign: 'center', padding: 60, color: '#ef4444', background: 'rgba(239,68,68,0.1)', borderRadius: 16 }}>
            <AlertCircle size={32} />
            <p style={{ marginTop: 12 }}>{error}</p>
            <button onClick={loadQuestions} style={{ marginTop: 16, padding: '8px 20px', background: '#3b82f6', border: 'none', borderRadius: 8, color: '#fff', cursor: 'pointer' }}>Réessayer</button>
          </div>
        ) : filteredQuestions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60, color: '#64748b', background: 'rgba(15,23,42,0.5)', borderRadius: 16 }}>
            <Library size={48} color="#1e293b" style={{ marginBottom: 12 }} />
            <p>Aucune question trouvée{hasActiveFilters ? ' avec ces critères' : ''}</p>
            {hasActiveFilters && <button onClick={resetFilters} style={{ marginTop: 12, padding: '6px 16px', background: 'rgba(99,102,241,0.2)', border: 'none', borderRadius: 8, color: '#a5b4fc', cursor: 'pointer' }}>Effacer les filtres</button>}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <p style={{ color: '#64748b', fontSize: '0.8rem' }}>{filteredQuestions.length} question(s) trouvée(s)</p>
              <button onClick={loadQuestions} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px', background: 'rgba(99,102,241,0.1)', border: 'none', borderRadius: 6, color: '#a5b4fc', cursor: 'pointer', fontSize: '0.7rem' }}>
                <RefreshCw size={12} /> Actualiser
              </button>
            </div>
            {filteredQuestions.map((q, idx) => (
              <QuestionCard key={q._id || idx} question={q} index={idx} />
            ))}
          </div>
        )}
      </main>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: rgba(15,23,42,0.3); border-radius: 10px; }
        ::-webkit-scrollbar-thumb { background: rgba(99,102,241,0.3); border-radius: 10px; }
      `}</style>
    </div>
  );
};

export default QCMBankPage;