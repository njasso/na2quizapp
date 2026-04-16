// src/pages/composition/ExamCompletedPage.jsx - Version COMPLÈTE CORRIGÉE
// Page de fin d'épreuve pour les options C, F, K (sans affichage de résultat)
import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Home, LogOut, Shield } from 'lucide-react';

// ── Labels configurations ────────────────────────────────────────────────────
const OPTION_LABELS = {
  C: { label: 'Configuration C', desc: 'Plage fermée · Séquentiel figé · Même QCM · Sans résultat', color: '#ef4444' },
  F: { label: 'Configuration F', desc: 'Plage fermée · Séquentiel aléatoire · QCM aléatoire · Sans résultat', color: '#f59e0b' },
  K: { label: 'Configuration K', desc: 'Plage ouverte · Sans résultat · No Reply', color: '#10b981' },
};

// ── Particule animée ─────────────────────────────────────────────────────────
const Particle = ({ delay, x, size }) => (
  <motion.div
    initial={{ y: '100vh', opacity: 0, x }}
    animate={{ y: '-10vh', opacity: [0, 0.7, 0], x: x + Math.sin(delay) * 40 }}
    transition={{ duration: 3.5 + delay * 0.4, delay: delay * 0.3, ease: 'easeOut' }}
    style={{
      position: 'fixed', bottom: 0, left: 0,
      width: size, height: size,
      borderRadius: '50%',
      background: 'radial-gradient(circle, rgba(96,165,250,0.9), transparent)',
      pointerEvents: 'none', zIndex: 0,
      filter: 'blur(1px)',
    }}
  />
);

// ── Composant principal ──────────────────────────────────────────────────────
const ExamCompletedPage = () => {
  const { examId } = useParams();
  const navigate = useNavigate();
  const { state } = useLocation();
  const [searchParams] = useSearchParams();
  
  // ✅ Récupération du token dans l'URL
  const urlToken = searchParams.get('token');

  const {
    studentInfo,
    examTitle,
    examOption,
    terminalSessionId,
  } = state || {};

  const [countdown, setCountdown] = useState(60);
  const [particles] = useState(() =>
    Array.from({ length: 14 }, (_, i) => ({
      id: i,
      delay: i * 0.4,
      x: 60 + Math.random() * (typeof window !== 'undefined' ? window.innerWidth - 120 : 600),
      size: 4 + Math.random() * 8,
    }))
  );
  const intervalRef = useRef(null);

  const optionMeta = OPTION_LABELS[examOption] || {
    label: `Configuration ${examOption || '?'}`,
    desc: 'Épreuve soumise avec succès',
    color: '#3b82f6',
  };

  // ✅ Stockage du token
  useEffect(() => {
    if (urlToken) {
      console.log('[ExamCompletedPage] 🔑 Token reçu dans l\'URL, stockage...');
      localStorage.setItem('userToken', urlToken);
      localStorage.setItem('token', urlToken);
    }
  }, [urlToken]);

  // ── Countdown + redirection auto ────────────────────────────────────────
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(intervalRef.current);
          handleExit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(intervalRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleExit = () => {
    // Nettoyer le localStorage de l'épreuve
    if (examId) {
      localStorage.removeItem('studentInfoForExam');
      localStorage.removeItem(`exam_${examId}_answers`);
      localStorage.removeItem(`exam_${examId}_index`);
      localStorage.removeItem(`exam_${examId}_attempts`);
      localStorage.removeItem(`exam_${examId}_showResult`);
    }
    navigate('/', { replace: true });
  };

  const mins = Math.floor(countdown / 60).toString().padStart(2, '0');
  const secs = (countdown % 60).toString().padStart(2, '0');

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #05071a 0%, #080e1f 50%, #05071a 100%)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      fontFamily: "'DM Sans', sans-serif",
      padding: '24px', position: 'relative', overflow: 'hidden',
    }}>

      {/* Grille de fond */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
        backgroundImage: [
          'linear-gradient(rgba(59,130,246,0.04) 1px, transparent 1px)',
          'linear-gradient(90deg, rgba(59,130,246,0.04) 1px, transparent 1px)',
        ].join(','),
        backgroundSize: '44px 44px',
      }} />

      {/* Halo central */}
      <div style={{
        position: 'fixed', top: '30%', left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '600px', height: '400px',
        background: `radial-gradient(ellipse, ${optionMeta.color}18 0%, transparent 70%)`,
        pointerEvents: 'none', zIndex: 0,
      }} />

      {/* Particules montantes */}
      {particles.map(p => <Particle key={p.id} {...p} />)}

      {/* ── Carte principale ── */}
      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        style={{
          position: 'relative', zIndex: 1,
          width: '100%', maxWidth: '520px',
          background: 'rgba(10,14,30,0.85)',
          backdropFilter: 'blur(20px)',
          border: `1px solid ${optionMeta.color}35`,
          borderRadius: '28px',
          padding: '48px 40px',
          boxShadow: `0 0 80px ${optionMeta.color}12, 0 32px 64px rgba(0,0,0,0.5)`,
          textAlign: 'center',
        }}
      >
        {/* Barre d'accent */}
        <div style={{
          position: 'absolute', top: 0, left: '20%', right: '20%', height: '2px',
          background: `linear-gradient(90deg, transparent, ${optionMeta.color}, transparent)`,
          borderRadius: '2px',
        }} />

        {/* Icône scellée */}
        <motion.div
          initial={{ scale: 0, rotate: -20 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ delay: 0.25, duration: 0.5, type: 'spring', stiffness: 200 }}
          style={{
            width: '80px', height: '80px', borderRadius: '50%',
            background: `${optionMeta.color}18`,
            border: `2px solid ${optionMeta.color}60`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 28px',
            boxShadow: `0 0 32px ${optionMeta.color}20`,
          }}
        >
          <Shield size={36} color={optionMeta.color} strokeWidth={1.5} />
        </motion.div>

        {/* Titre */}
        <motion.h1
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          style={{
            fontFamily: "'Sora', sans-serif",
            fontSize: '1.85rem', fontWeight: 800,
            color: '#f8fafc', marginBottom: '10px', letterSpacing: '-0.02em',
          }}
        >
          Épreuve soumise
        </motion.h1>

        {/* Sous-titre étudiant */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.45 }}
          style={{ color: '#94a3b8', fontSize: '1rem', marginBottom: '28px' }}
        >
          {studentInfo?.firstName && studentInfo?.lastName
            ? `${studentInfo.firstName} ${studentInfo.lastName}`
            : 'Vos réponses ont été enregistrées'}
          {studentInfo?.matricule && (
            <span style={{
              display: 'block', marginTop: '4px',
              fontFamily: 'monospace', fontSize: '0.78rem',
              color: '#475569', letterSpacing: '0.06em',
            }}>
              {studentInfo.matricule}
            </span>
          )}
        </motion.p>

        {/* Séparateur */}
        <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)', margin: '0 0 24px' }} />

        {/* Message principal */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: '14px',
            padding: '18px 20px',
            marginBottom: '24px',
            textAlign: 'left',
          }}
        >
          <p style={{ color: '#cbd5e1', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: '10px' }}>
            Vos réponses ont bien été <strong style={{ color: '#f1f5f9' }}>enregistrées et transmises</strong>.
            Conformément à la politique de cette épreuve, les résultats ne vous sont pas communiqués.
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{
              display: 'inline-block', padding: '3px 10px',
              background: `${optionMeta.color}18`,
              border: `1px solid ${optionMeta.color}40`,
              borderRadius: '999px',
              color: optionMeta.color,
              fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.04em',
            }}>
              {optionMeta.label}
            </span>
            <span style={{ color: '#475569', fontSize: '0.72rem' }}>{optionMeta.desc}</span>
          </div>
        </motion.div>

        {/* Épreuve */}
        {examTitle && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.55 }}
            style={{
              color: '#64748b', fontSize: '0.8rem',
              marginBottom: '28px', letterSpacing: '0.02em',
            }}
          >
            <span style={{ color: '#475569' }}>Épreuve : </span>
            <span style={{ color: '#94a3b8', fontWeight: 500 }}>{examTitle}</span>
          </motion.p>
        )}

        {/* Countdown */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.65 }}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: '10px', marginBottom: '28px',
          }}
        >
          <span style={{ color: '#334155', fontSize: '0.78rem' }}>Retour automatique dans</span>
          <span style={{
            fontFamily: "'Sora', sans-serif",
            fontWeight: 700, fontSize: '1.1rem',
            color: countdown <= 15 ? '#ef4444' : '#60a5fa',
            transition: 'color 0.3s',
            minWidth: '52px', textAlign: 'center',
          }}>
            {mins}:{secs}
          </span>
        </motion.div>

        {/* Boutons */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}
        >
          <motion.button
            whileHover={{ scale: 1.03, background: 'rgba(255,255,255,0.08)' }}
            whileTap={{ scale: 0.97 }}
            onClick={handleExit}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '11px 22px',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: '10px', color: '#94a3b8',
              fontSize: '0.88rem', fontWeight: 500, cursor: 'pointer',
              transition: 'background 0.2s',
            }}
          >
            <Home size={15} />
            Accueil
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => {
              // Si l'étudiant vient d'un terminal, retourner au terminal
              if (terminalSessionId) {
                localStorage.removeItem('studentInfoForExam');
                navigate(`/terminal`, { replace: true });
              } else {
                handleExit();
              }
            }}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '11px 22px',
              background: `linear-gradient(135deg, ${optionMeta.color}cc, ${optionMeta.color}99)`,
              border: 'none',
              borderRadius: '10px', color: '#fff',
              fontSize: '0.88rem', fontWeight: 700, cursor: 'pointer',
              boxShadow: `0 4px 16px ${optionMeta.color}30`,
            }}
          >
            <LogOut size={15} />
            {terminalSessionId ? 'Retour au terminal' : 'Quitter'}
          </motion.button>
        </motion.div>
      </motion.div>

      {/* Mention bas de page */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        style={{
          position: 'relative', zIndex: 1,
          marginTop: '28px', color: '#1e293b',
          fontSize: '0.72rem', letterSpacing: '0.06em',
          fontFamily: 'monospace',
        }}
      >
        NA²QUIZ · SESSION CLÔTURÉE
      </motion.p>
    </div>
  );
};

export default ExamCompletedPage;