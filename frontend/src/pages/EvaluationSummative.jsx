// src/pages/EvaluationSummative.jsx — NA2Quiz Professional Design
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Database, Bot, Home, List, Monitor, Download, LogOut } from 'lucide-react';
import { motion } from 'framer-motion';

const MODULES = [
  {
    id: 'manual',
    path: '/create/manual',
    icon: BookOpen,
    title: 'Création Manuelle',
    desc: 'Rédigez vos questions une par une avec un contrôle total sur chaque détail',
    color: '#3b82f6',
    glow: 'rgba(59,130,246,0.25)',
    gradient: 'linear-gradient(135deg, #1d4ed8 0%, #3b82f6 100%)',
    tag: 'Personnalisé',
  },
  {
    id: 'database',
    path: '/create/database',
    icon: Database,
    title: 'Base de Données',
    desc: 'Composez votre épreuve depuis notre catalogue de questions existantes',
    color: '#ef4444',
    glow: 'rgba(239,68,68,0.2)',
    gradient: 'linear-gradient(135deg, #b91c1c 0%, #ef4444 100%)',
    tag: 'Catalogue',
  },
  {
    id: 'ai',
    path: '/create/ai',
    icon: Bot,
    title: 'Génération par IA',
    desc: 'Laissez l\'intelligence artificielle générer des questions adaptées',
    color: '#8b5cf6',
    glow: 'rgba(139,92,246,0.25)',
    gradient: 'linear-gradient(135deg, #6d28d9 0%, #8b5cf6 100%)',
    tag: 'IA · DeepSeek',
  },
  {
    id: 'exams',
    path: '/exams',
    icon: List,
    title: 'Mes Épreuves',
    desc: 'Consultez, prévisualisez et lancez les examens créés',
    color: '#10b981',
    glow: 'rgba(16,185,129,0.2)',
    gradient: 'linear-gradient(135deg, #047857 0%, #10b981 100%)',
    tag: 'Bibliothèque',
  },
  {
    id: 'surveillance',
    path: '/surveillance',
    icon: Monitor,
    title: 'Surveillance',
    desc: 'Supervisez les sessions d\'examens en cours en temps réel',
    color: '#f59e0b',
    glow: 'rgba(245,158,11,0.2)',
    gradient: 'linear-gradient(135deg, #b45309 0%, #f59e0b 100%)',
    tag: 'Temps réel',
  },
  {
    id: 'reports',
    path: '/reports',
    icon: Download,
    title: 'Rapports',
    desc: 'Analysez les résultats, classements et exportez les bulletins',
    color: '#64748b',
    glow: 'rgba(100,116,139,0.2)',
    gradient: 'linear-gradient(135deg, #334155 0%, #64748b 100%)',
    tag: 'Analytics',
  },
];

const containerVariants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.08 }
  }
};

const cardVariants = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.25, 0.1, 0.25, 1] } }
};

const EvaluationSummative = () => {
  const navigate = useNavigate();

  return (
    <div style={{
      minHeight: '100vh',
      fontFamily: "'DM Sans', sans-serif",
      background: 'linear-gradient(135deg, #05071a 0%, #0a0f2e 60%, #05071a 100%)',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Grid */}
      <div style={{
        position: 'fixed', inset: 0,
        backgroundImage: 'linear-gradient(rgba(59,130,246,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,0.03) 1px, transparent 1px)',
        backgroundSize: '40px 40px', pointerEvents: 'none', zIndex: 0,
      }} />

      {/* Top glow */}
      <div style={{
        position: 'fixed', top: '-15%', left: '50%', transform: 'translateX(-50%)',
        width: '70vw', height: '50vh',
        background: 'radial-gradient(ellipse, rgba(37,99,235,0.12) 0%, transparent 70%)',
        pointerEvents: 'none', zIndex: 0,
      }} />

      {/* Topbar */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'rgba(5,7,26,0.88)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(59,130,246,0.12)',
        padding: '0 32px',
        height: '60px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{
          fontFamily: "'Sora', sans-serif",
          fontWeight: 800, fontSize: '1.125rem',
          letterSpacing: '-0.02em',
          background: 'linear-gradient(135deg, #60a5fa, #a78bfa)',
          WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent',
        }}>
          NA²QUIZ
        </div>
        <motion.button
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => navigate('/')}
          style={{
            display: 'flex', alignItems: 'center', gap: '7px',
            padding: '8px 16px', borderRadius: '8px',
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.1)',
            color: '#cbd5e1', fontSize: '0.875rem', fontWeight: 500,
            cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
          }}
        >
          <Home size={15} />
          Accueil
        </motion.button>
      </header>

      {/* Main content */}
      <main style={{ position: 'relative', zIndex: 1, maxWidth: '1200px', margin: '0 auto', padding: '48px 24px 64px' }}>

        {/* Header section */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          style={{ textAlign: 'center', marginBottom: '56px' }}
        >
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px',
            padding: '5px 14px', marginBottom: '20px',
            background: 'rgba(37,99,235,0.12)',
            border: '1px solid rgba(59,130,246,0.25)',
            borderRadius: '999px',
          }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#3b82f6', boxShadow: '0 0 8px #3b82f6' }} />
            <span style={{ fontSize: '0.75rem', color: '#93c5fd', fontWeight: 600, letterSpacing: '0.08em' }}>
              TABLEAU DE BORD
            </span>
          </div>
          <h1 style={{
            fontFamily: "'Sora', sans-serif",
            fontSize: 'clamp(1.75rem, 4vw, 2.75rem)',
            fontWeight: 800,
            letterSpacing: '-0.03em',
            color: '#f8fafc',
            marginBottom: '12px',
          }}>
            Système d'Évaluation Sommative
          </h1>
          <p style={{ fontSize: '1.0625rem', color: 'rgba(203,213,225,0.7)', maxWidth: '520px', margin: '0 auto', lineHeight: 1.6 }}>
            Choisissez votre mode de création d'épreuves ou accédez aux outils de gestion
          </p>
        </motion.div>

        {/* Module Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: '20px',
          }}
        >
          {MODULES.map((mod) => {
            const Icon = mod.icon;
            return (
              <motion.button
                key={mod.id}
                variants={cardVariants}
                whileHover={{ y: -5, scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate(mod.path)}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
                  textAlign: 'left', padding: '26px 24px',
                  background: 'rgba(15,23,42,0.7)',
                  border: `1px solid ${mod.color}22`,
                  borderRadius: '16px',
                  cursor: 'pointer',
                  fontFamily: "'DM Sans', sans-serif",
                  backdropFilter: 'blur(12px)',
                  boxShadow: `0 4px 24px rgba(0,0,0,0.3), 0 0 0 0 ${mod.glow}`,
                  transition: 'border-color 0.25s, box-shadow 0.25s',
                  position: 'relative', overflow: 'hidden',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = `${mod.color}55`;
                  e.currentTarget.style.boxShadow = `0 8px 32px rgba(0,0,0,0.4), 0 0 32px ${mod.glow}`;
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = `${mod.color}22`;
                  e.currentTarget.style.boxShadow = '0 4px 24px rgba(0,0,0,0.3)';
                }}
              >
                {/* Subtle top gradient accent */}
                <div style={{
                  position: 'absolute', top: 0, left: 0, right: 0, height: '1px',
                  background: `linear-gradient(90deg, transparent, ${mod.color}66, transparent)`,
                }} />

                {/* Icon */}
                <div style={{
                  width: '48px', height: '48px',
                  borderRadius: '12px',
                  background: mod.gradient,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginBottom: '16px',
                  boxShadow: `0 4px 16px ${mod.glow}`,
                }}>
                  <Icon size={22} color="#fff" strokeWidth={1.75} />
                </div>

                {/* Tag */}
                <span style={{
                  fontSize: '0.6875rem', fontWeight: 700,
                  letterSpacing: '0.1em', textTransform: 'uppercase',
                  color: mod.color, marginBottom: '6px',
                }}>
                  {mod.tag}
                </span>

                {/* Title */}
                <h3 style={{
                  fontFamily: "'Sora', sans-serif",
                  fontSize: '1.125rem', fontWeight: 700,
                  color: '#f1f5f9', marginBottom: '8px', letterSpacing: '-0.01em',
                }}>
                  {mod.title}
                </h3>

                {/* Description */}
                <p style={{ fontSize: '0.875rem', color: 'rgba(148,163,184,0.8)', lineHeight: 1.5, margin: 0 }}>
                  {mod.desc}
                </p>

                {/* Arrow */}
                <div style={{
                  position: 'absolute', bottom: '22px', right: '20px',
                  color: mod.color, opacity: 0.5,
                  fontSize: '1.25rem', fontWeight: 300,
                }}>
                  →
                </div>
              </motion.button>
            );
          })}
        </motion.div>
      </main>

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
      `}</style>
    </div>
  );
};

export default EvaluationSummative;