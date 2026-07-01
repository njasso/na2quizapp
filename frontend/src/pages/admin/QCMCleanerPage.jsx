// src/pages/admin/QCMCleanerPage.jsx
// Outil de nettoyage de la banque de QCM - Version épurée
// ✅ Fonctionnalités conservées :
//   - Détection des doublons de chapitres
//   - Renommage en masse d'un chapitre
//   - Normalisation automatique de tous les chapitres
//   - Règles de normalisation (consultation)

import React, { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Search, RefreshCw, CheckCircle, AlertTriangle,
  Loader, BookOpen, Zap, Settings, Eye, ChevronDown, ChevronUp,
  Check, X, AlertCircle, Edit3, ArrowRight, Database
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import toast from 'react-hot-toast';

// ══════════════════════════════════════════════════════════
// CONSTANTES
// ══════════════════════════════════════════════════════════

const TABS = [
  { id: 'dedup', label: 'Doublons chapitres', icon: Search, color: '#f59e0b' },
  { id: 'bulk', label: 'Actions de masse', icon: Zap, color: '#3b82f6' },
  { id: 'regles', label: 'Règles & Bonnes pratiques', icon: BookOpen, color: '#10b981' },
];

// ── Normalisation canonique ──────────────────────────────
const normalizeStr = (s) =>
  (s || '')
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[.;:,!?]+$/, '')
    .trim()
    .toUpperCase();

// ── Diff visuel entre deux chaînes ──────────────────────
const diffStr = (original, normalized) => {
  const issues = [];
  if (original.trim() !== original) issues.push({ label: 'espace(s) bord', color: '#ef4444' });
  if (/[.;:,!?]$/.test(original)) issues.push({ label: 'ponctuation finale', color: '#f59e0b' });
  if (/\s{2,}/.test(original)) issues.push({ label: 'espaces multiples', color: '#f59e0b' });
  if (original !== original.toUpperCase() && original.toLowerCase() !== original)
    issues.push({ label: 'casse mixte', color: '#8b5cf6' });
  if (original === original.toLowerCase()) issues.push({ label: 'minuscules', color: '#ef4444' });
  return issues;
};

// ═══════════════════════════════════════════════════
// COMPOSANT PRINCIPAL
// ═══════════════════════════════════════════════════
const QCMCleanerPage = () => {
  const navigate = useNavigate();
  const { user, hasRole } = useAuth();

  const [activeTab, setActiveTab] = useState('dedup');
  const [isLoading, setIsLoading] = useState(false);

  // ── Onglet Doublons ──────────────────────────────
  const [dupGroups, setDupGroups] = useState([]);
  const [cleanChapters, setCleanChapters] = useState([]);
  const [chaptersLoaded, setChaptersLoaded] = useState(false);
  const [expandedGroup, setExpandedGroup] = useState(null);
  const [resolving, setResolving] = useState({});

  // ── Onglet Actions de masse ──────────────────────
  const [renameOld, setRenameOld] = useState('');
  const [renameNew, setRenameNew] = useState('');
  const [renameResult, setRenameResult] = useState(null);
  const [normalizeResult, setNormalizeResult] = useState(null);
  const [confirmNorm, setConfirmNorm] = useState(false);
  const [isNormalizing, setIsNormalizing] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);

  // ══════════════════════════════════════════════════
  // CHARGEMENT DES CHAPITRES
  // ══════════════════════════════════════════════════
  const loadChapters = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/api/questions/chapter-duplicates');
      if (res.data?.duplicates) {
        setDupGroups(res.data.duplicates);
        setChaptersLoaded(true);
        if (res.data.duplicates.length > 0) {
          toast.error(`⚠️ ${res.data.duplicates.length} groupe(s) de doublons détecté(s)`);
        } else {
          toast.success('✅ Aucun doublon — chapitres propres');
        }
      }
    } catch (err) {
      console.error('[QCMCleaner] Erreur chargement:', err);
      toast.error('Impossible de charger les chapitres');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ══════════════════════════════════════════════════
  // ACTIONS
  // ══════════════════════════════════════════════════

  // Renommer un chapitre (un doublon) → forme canonique
  const resolveGroup = async (groupIdx, variantToReplace, canonicalTarget) => {
    setResolving(prev => ({ ...prev, [groupIdx]: true }));
    try {
      const res = await api.post('/api/questions/bulk-rename-chapter', {
        oldChapter: variantToReplace,
        newChapter: canonicalTarget,
      });
      const count = res?.data?.modifiedCount ?? 0;
      toast.success(`✅ ${count} question(s) mises à jour`);
      
      // Retirer la variante du groupe
      setDupGroups(prev => prev.map((g, i) => {
        if (i !== groupIdx) return g;
        const newVariants = g.variants.filter(v => v !== variantToReplace);
        return newVariants.length <= 1 ? null : { ...g, variants: newVariants };
      }).filter(Boolean));
    } catch (err) {
      toast.error(err?.response?.data?.error || err.message || 'Erreur lors du renommage');
    } finally {
      setResolving(prev => ({ ...prev, [groupIdx]: false }));
    }
  };

  // Renommage manuel
  const handleRename = async () => {
    if (!renameOld.trim() || !renameNew.trim()) {
      toast.error('Remplissez les deux champs');
      return;
    }
    setIsRenaming(true);
    setRenameResult(null);
    try {
      const res = await api.post('/api/questions/bulk-rename-chapter', {
        oldChapter: renameOld.trim(),
        newChapter: renameNew.trim(),
      });
      const count = res?.data?.modifiedCount ?? 0;
      setRenameResult({ success: true, count, old: renameOld, new: renameNew });
      toast.success(`✅ ${count} question(s) renommées`);
      if (count > 0) loadChapters();
    } catch (err) {
      const msg = err?.response?.data?.error || err.message || 'Erreur';
      setRenameResult({ success: false, error: msg });
      toast.error(msg);
    } finally {
      setIsRenaming(false);
    }
  };

  // Normalisation globale
  const handleNormalize = async () => {
    setIsNormalizing(true);
    setNormalizeResult(null);
    setConfirmNorm(false);
    try {
      const res = await api.post('/api/questions/bulk-normalize-chapters', {});
      const count = res?.data?.modifiedCount ?? 0;
      setNormalizeResult({ success: true, count });
      toast.success(`✅ ${count} chapitres normalisés`);
      if (count > 0) loadChapters();
    } catch (err) {
      const msg = err?.response?.data?.error || err.message || 'Erreur';
      setNormalizeResult({ success: false, error: msg });
      toast.error(msg);
    } finally {
      setIsNormalizing(false);
    }
  };

  // ══════════════════════════════════════════════════
  // APERÇU NORMALISATION
  // ══════════════════════════════════════════════════
  const previewNormalize = useMemo(() => {
    const examples = [];
    dupGroups.forEach(g => {
      g.variants?.forEach(v => {
        const n = normalizeStr(v);
        if (n !== v) examples.push({ original: v, normalized: n, issues: diffStr(v, n) });
      });
    });
    return examples.slice(0, 20);
  }, [dupGroups]);

  // ══════════════════════════════════════════════════
  // STYLES
  // ══════════════════════════════════════════════════
  const S = {
    page: { minHeight: '100vh', background: 'linear-gradient(135deg,#05071a 0%,#0a0f2e 60%,#05071a 100%)', padding: 24, fontFamily: "'DM Sans',sans-serif" },
    grid: { position: 'fixed', inset: 0, backgroundImage: 'linear-gradient(rgba(99,102,241,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(99,102,241,0.03) 1px,transparent 1px)', backgroundSize: '40px 40px', pointerEvents: 'none', zIndex: 0 },
    main: { maxWidth: 1300, margin: '0 auto', position: 'relative', zIndex: 1 },
    card: (border = 'rgba(99,102,241,0.2)') => ({ background: 'rgba(15,23,42,0.7)', backdropFilter: 'blur(12px)', border: `1px solid ${border}`, borderRadius: 16, padding: 20, marginBottom: 12 }),
    input: () => ({ width: '100%', padding: '9px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(99,102,241,0.25)', borderRadius: 8, color: '#f8fafc', outline: 'none', fontSize: '0.85rem' }),
    label: { color: '#94a3b8', fontSize: '0.75rem', marginBottom: 4, display: 'block' },
    btn: (bg, col = '#fff', disabled) => ({ padding: '9px 18px', background: disabled ? 'rgba(100,116,139,0.2)' : bg, border: 'none', borderRadius: 10, color: disabled ? '#64748b' : col, cursor: disabled ? 'not-allowed' : 'pointer', fontWeight: 600, fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: 6, opacity: disabled ? 0.6 : 1 }),
    badge: (c) => ({ display: 'inline-flex', alignItems: 'center', padding: '2px 8px', borderRadius: 4, fontSize: '0.65rem', fontWeight: 600, background: `${c}18`, color: c }),
    mono: { fontFamily: "'Fira Code',monospace", fontSize: '0.78rem', background: 'rgba(0,0,0,0.3)', padding: '2px 6px', borderRadius: 4 },
    sectionTitle: { color: '#f8fafc', fontSize: '0.9rem', fontWeight: 700, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 },
  };

  // ══════════════════════════════════════════════════
  // RENDU
  // ══════════════════════════════════════════════════
  return (
    <div style={S.page}>
      <div style={S.grid} />

      <main style={S.main}>

        {/* ── Header ─────────────────────────────────── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            onClick={() => navigate(-1)}
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 12, padding: 12, color: '#94a3b8', cursor: 'pointer' }}>
            <ArrowLeft size={20} />
          </motion.button>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '4px 12px', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 20, marginBottom: 8 }}>
              <Database size={14} color="#f59e0b" />
              <span style={{ color: '#fbbf24', fontSize: '0.7rem', fontWeight: 600 }}>QUALITÉ DES DONNÉES</span>
            </div>
            <h1 style={{ fontSize: '1.9rem', fontWeight: 700, color: '#f8fafc' }}>Nettoyage de la Banque QCM</h1>
            <p style={{ color: '#64748b' }}>Détection de doublons · Actions de masse · Normalisation automatique</p>
          </div>
        </div>

        {/* ── Onglets ─────────────────────────────────── */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: 12 }}>
          {TABS.map(tab => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <motion.button key={tab.id} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                onClick={() => setActiveTab(tab.id)}
                style={{ padding: '8px 16px', borderRadius: 20, border: 'none', background: active ? tab.color : 'rgba(255,255,255,0.05)', color: active ? '#fff' : '#94a3b8', cursor: 'pointer', fontWeight: active ? 700 : 500, fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Icon size={14} />
                {tab.label}
              </motion.button>
            );
          })}
        </div>

        {/* ══════════════════════════════════════════════
            ONGLET 1 — DOUBLONS
        ══════════════════════════════════════════════ */}
        {activeTab === 'dedup' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                onClick={loadChapters} disabled={isLoading}
                style={S.btn('#f59e0b', '#fff', isLoading)}>
                {isLoading ? <Loader size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Search size={14} />}
                {isLoading ? 'Analyse en cours…' : chaptersLoaded ? 'Relancer l\'analyse' : 'Analyser les chapitres'}
              </motion.button>
              {dupGroups.length === 0 && chaptersLoaded && <span style={S.badge('#10b981')}>✅ Aucun doublon</span>}
              {dupGroups.length > 0 && <span style={S.badge('#ef4444')}>⚠️ {dupGroups.length} groupe(s) de doublons</span>}
            </div>

            {!chaptersLoaded && !isLoading && (
              <div style={{ ...S.card(), textAlign: 'center', padding: 60, color: '#64748b' }}>
                <Search size={40} style={{ marginBottom: 12, opacity: 0.3 }} />
                <p>Cliquez sur <strong style={{ color: '#f8fafc' }}>"Analyser les chapitres"</strong> pour détecter les doublons.</p>
              </div>
            )}

            {chaptersLoaded && dupGroups.length === 0 && (
              <div style={{ ...S.card('rgba(16,185,129,0.3)'), textAlign: 'center', padding: 40 }}>
                <CheckCircle size={40} color="#10b981" style={{ marginBottom: 12 }} />
                <p style={{ color: '#10b981', fontWeight: 700, fontSize: '1rem' }}>Banque de chapitres propre ✅</p>
              </div>
            )}

            {dupGroups.map((g, gIdx) => (
              <div key={gIdx} style={{ ...S.card('rgba(245,158,11,0.3)'), marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
                  <AlertTriangle size={18} color="#f59e0b" />
                  <span style={{ fontWeight: 700, color: '#f8fafc', fontSize: '0.9rem' }}>Groupe {gIdx + 1}</span>
                  <span style={S.badge('#f59e0b')}>{g.variants?.length || g.count} variantes</span>
                  <span style={{ color: '#64748b', fontSize: '0.75rem' }}>Forme canonique :</span>
                  <span style={S.mono}>{g.canonical}</span>
                  <motion.button whileHover={{ scale: 1.03 }} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}
                    onClick={() => setExpandedGroup(expandedGroup === gIdx ? null : gIdx)}>
                    {expandedGroup === gIdx ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </motion.button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {g.variants?.map((variant, vIdx) => {
                    const issues = diffStr(variant, g.canonical);
                    const isCanonical = normalizeStr(variant) === g.canonical && variant === normalizeStr(variant);

                    return (
                      <div key={vIdx} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'rgba(0,0,0,0.2)', borderRadius: 8, flexWrap: 'wrap' }}>
                        <span style={{ width: 22, height: 22, borderRadius: 4, background: isCanonical ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 700, color: isCanonical ? '#10b981' : '#ef4444', flexShrink: 0 }}>
                          {vIdx + 1}
                        </span>
                        <code style={{ flex: 1, color: '#f8fafc', fontSize: '0.82rem', background: 'rgba(255,255,255,0.04)', padding: '2px 8px', borderRadius: 4 }}>
                          {JSON.stringify(variant)}
                        </code>
                        {issues.map((iss, iIdx) => (
                          <span key={iIdx} style={{ ...S.badge(iss.color), fontSize: '0.6rem' }}>{iss.label}</span>
                        ))}
                        {isCanonical ? (
                          <span style={{ ...S.badge('#10b981'), fontSize: '0.65rem' }}>✓ Forme correcte</span>
                        ) : (
                          <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                            disabled={resolving[gIdx]}
                            onClick={() => resolveGroup(gIdx, variant, g.canonical)}
                            style={S.btn('rgba(245,158,11,0.8)', '#fff', resolving[gIdx])}>
                            {resolving[gIdx] ? <Loader size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <ArrowRight size={12} />}
                            → Corriger
                          </motion.button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </motion.div>
        )}

        {/* ══════════════════════════════════════════════
            ONGLET 2 — ACTIONS DE MASSE
        ══════════════════════════════════════════════ */}
        {activeTab === 'bulk' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>

            {/* ① Renommage ciblé */}
            <div style={S.card()}>
              <p style={S.sectionTitle}><Edit3 size={16} color="#3b82f6" /> ① Renommer un chapitre</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                <div>
                  <label style={S.label}>Ancien intitulé</label>
                  <input value={renameOld} onChange={e => setRenameOld(e.target.value)} placeholder="LA FILIATION." style={S.input()} />
                  {renameOld && (
                    <p style={{ fontSize: '0.65rem', color: '#f59e0b', marginTop: 4 }}>
                      Normalisé : <code style={S.mono}>{normalizeStr(renameOld)}</code>
                    </p>
                  )}
                </div>
                <div>
                  <label style={S.label}>Nouvel intitulé</label>
                  <input value={renameNew} onChange={e => setRenameNew(e.target.value)} placeholder="LA FILIATION" style={S.input()} />
                  {renameNew && renameOld && renameNew === normalizeStr(renameOld) && (
                    <p style={{ fontSize: '0.65rem', color: '#10b981', marginTop: 4 }}>✅ Forme normalisée</p>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  onClick={handleRename} disabled={!renameOld.trim() || !renameNew.trim() || isRenaming}
                  style={S.btn('linear-gradient(135deg,#3b82f6,#2563eb)', '#fff', !renameOld.trim() || !renameNew.trim() || isRenaming)}>
                  {isRenaming ? <Loader size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Zap size={14} />}
                  {isRenaming ? 'Renommage…' : 'Exécuter'}
                </motion.button>

                {renameOld && (
                  <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                    onClick={() => setRenameNew(normalizeStr(renameOld))}
                    style={{ padding: '9px 14px', background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 10, color: '#10b981', cursor: 'pointer', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <CheckCircle size={13} /> Auto-normaliser
                  </motion.button>
                )}
              </div>

              {renameResult && (
                <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                  style={{ ...S.card(renameResult.success ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'), marginTop: 12, padding: 14 }}>
                  {renameResult.success
                    ? <><CheckCircle size={14} color="#10b981" style={{ display: 'inline', marginRight: 6 }} /><span style={{ color: '#10b981', fontWeight: 600 }}>{renameResult.count} question(s) mises à jour</span></>
                    : <><AlertCircle size={14} color="#ef4444" style={{ display: 'inline', marginRight: 6 }} /><span style={{ color: '#ef4444' }}>{renameResult.error}</span></>
                  }
                </motion.div>
              )}
            </div>

            {/* ② Normalisation globale */}
            <div style={S.card()}>
              <p style={S.sectionTitle}><RefreshCw size={16} color="#10b981" /> ② Normalisation automatique</p>
              <p style={{ color: '#64748b', fontSize: '0.8rem', marginBottom: 12 }}>
                Applique automatiquement toutes les règles de normalisation sur <strong style={{ color: '#f8fafc' }}>tous les chapitres</strong> :
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
                {['Trim espaces', 'Suppr. ponctuation', 'MAJUSCULES', 'Espaces multiples → 1'].map(r => (
                  <span key={r} style={{ padding: '3px 10px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 12, color: '#34d399', fontSize: '0.7rem' }}>✓ {r}</span>
                ))}
              </div>

              {previewNormalize.length > 0 && (
                <div style={{ ...S.card('rgba(245,158,11,0.2)'), marginBottom: 12, padding: 14 }}>
                  <p style={{ color: '#f59e0b', fontSize: '0.75rem', fontWeight: 600, marginBottom: 8 }}>Aperçu des transformations :</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 150, overflowY: 'auto' }}>
                    {previewNormalize.slice(0, 8).map((ex, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.72rem', color: '#94a3b8' }}>
                        <code style={{ ...S.mono, color: '#ef4444' }}>{JSON.stringify(ex.original)}</code>
                        <ArrowRight size={10} color="#64748b" />
                        <code style={{ ...S.mono, color: '#10b981' }}>{JSON.stringify(ex.normalized)}</code>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {!confirmNorm ? (
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  onClick={() => setConfirmNorm(true)}
                  style={S.btn('rgba(16,185,129,0.2)', '#10b981')}>
                  <Settings size={14} /> Lancer la normalisation
                </motion.button>
              ) : (
                <div style={{ ...S.card('rgba(239,68,68,0.3)'), padding: 12 }}>
                  <p style={{ color: '#fbbf24', fontWeight: 600, fontSize: '0.82rem', marginBottom: 10 }}>⚠️ Cette opération modifie TOUTES les questions. Confirmer ?</p>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                      onClick={handleNormalize} disabled={isNormalizing}
                      style={S.btn('linear-gradient(135deg,#10b981,#059669)', '#fff', isNormalizing)}>
                      {isNormalizing ? <Loader size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Check size={13} />}
                      {isNormalizing ? 'Normalisation…' : 'Oui, normaliser'}
                    </motion.button>
                    <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                      onClick={() => setConfirmNorm(false)}
                      style={{ padding: '9px 14px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, color: '#94a3b8', cursor: 'pointer', fontSize: '0.8rem' }}>
                      <X size={13} /> Annuler
                    </motion.button>
                  </div>
                </div>
              )}

              {normalizeResult && (
                <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                  style={{ ...S.card(normalizeResult.success ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'), marginTop: 12, padding: 14 }}>
                  {normalizeResult.success
                    ? <><CheckCircle size={14} color="#10b981" style={{ display: 'inline', marginRight: 6 }} /><span style={{ color: '#10b981', fontWeight: 600 }}>✅ {normalizeResult.count} chapitre(s) normalisé(s)</span></>
                    : <span style={{ color: '#ef4444' }}>{normalizeResult.error}</span>
                  }
                </motion.div>
              )}
            </div>
          </motion.div>
        )}

        {/* ══════════════════════════════════════════════
            ONGLET 3 — RÈGLES & BONNES PRATIQUES
        ══════════════════════════════════════════════ */}
        {activeTab === 'regles' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <div style={S.card()}>
              <p style={S.sectionTitle}><BookOpen size={16} color="#10b981" /> Règles de normalisation</p>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                      {['Problème', 'Exemple erroné', 'Exemple corrigé', 'Fréquence'].map(h => (
                        <th key={h} style={{ padding: '8px 10px', textAlign: 'left', color: '#64748b', fontWeight: 600, fontSize: '0.72rem' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ['Ponctuation finale', '"LA FILIATION."', '"LA FILIATION"', '🔴 Très fréquent'],
                      ['Minuscules', '"la filiation"', '"LA FILIATION"', '🟡 Fréquent'],
                      ['Casse mixte', '"La Filiation"', '"LA FILIATION"', '🟡 Fréquent'],
                      ['Espaces multiples', '"DROIT  PENAL"', '"DROIT PENAL"', '🟠 Modéré'],
                    ].map(([prob, err, fix, freq], i) => (
                      <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: i % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent' }}>
                        <td style={{ padding: '7px 10px', color: '#f59e0b', fontWeight: 600 }}>{prob}</td>
                        <td style={{ padding: '7px 10px' }}><code style={{ ...S.mono, color: '#ef4444' }}>{err}</code></td>
                        <td style={{ padding: '7px 10px' }}><code style={{ ...S.mono, color: '#10b981' }}>{fix}</code></td>
                        <td style={{ padding: '7px 10px', fontSize: '0.75rem' }}>{freq}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}

      </main>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        select option { background: #1e293b; color: #f8fafc; }
        input:focus, select:focus, textarea:focus {
          border-color: rgba(99,102,241,0.5) !important;
          box-shadow: 0 0 0 3px rgba(99,102,241,0.12);
        }
        ::-webkit-scrollbar { width: 5px; height: 5px; }
        ::-webkit-scrollbar-track { background: rgba(15,23,42,0.3); border-radius: 10px; }
        ::-webkit-scrollbar-thumb { background: rgba(99,102,241,0.3); border-radius: 10px; }
      `}</style>
    </div>
  );
};

export default QCMCleanerPage;