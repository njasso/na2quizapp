// src/pages/creation/EvaluationSummative.jsx — NA2Quiz Professional Design
// Version finale avec tous les modules par rôle - CORRIGÉE
// ✅ Création Manuelle retirée pour ENSEIGNANT (conforme au circuit de validation)

import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BookOpen, Database, Bot, Home, List, Monitor, Download,
  CheckSquare, Users, LogOut, Eye, FileText, Shield, 
  ClipboardList, Award, BarChart3, Terminal, TrendingUp, Calendar
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';

// Définition de tous les modules avec leurs rôles autorisés
const ALL_MODULES = [
  // ========== MODULES ENSEIGNANT / ADMIN ==========
  {
    id: 'create_question',
    path: '/create/question',
    icon: FileText,
    title: 'Créer une question',
    desc: 'Créez une question individuelle qui sera soumise à validation pédagogique',
    color: '#3b82f6',
    glow: 'rgba(59,130,246,0.25)',
    gradient: 'linear-gradient(135deg, #1d4ed8 0%, #3b82f6 100%)',
    tag: 'Validation',
    roles: ['ENSEIGNANT', 'ADMIN_DELEGUE', 'ADMIN_SYSTEME']
  },
  {
    id: 'database',
    path: '/create/database',
    icon: Database,
    title: 'Base de Données',
    desc: 'Composez votre épreuve depuis notre catalogue de questions validées',
    color: '#ef4444',
    glow: 'rgba(239,68,68,0.2)',
    gradient: 'linear-gradient(135deg, #b91c1c 0%, #ef4444 100%)',
    tag: 'Catalogue',
    roles: ['ENSEIGNANT', 'ADMIN_DELEGUE', 'ADMIN_SYSTEME']
  },
  {
    id: 'ai',
    path: '/create/ai',
    icon: Bot,
    title: 'Génération par IA',
    desc: 'Laissez l\'intelligence artificielle générer des questions (soumises à validation)',
    color: '#8b5cf6',
    glow: 'rgba(139,92,246,0.25)',
    gradient: 'linear-gradient(135deg, #6d28d9 0%, #8b5cf6 100%)',
    tag: 'IA · DeepSeek',
    roles: ['ENSEIGNANT', 'ADMIN_DELEGUE', 'ADMIN_SYSTEME']
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
    roles: ['ENSEIGNANT', 'ADMIN_DELEGUE', 'ADMIN_SYSTEME', 'OPERATEUR_EVALUATION']
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
    roles: ['OPERATEUR_EVALUATION', 'ADMIN_DELEGUE', 'ADMIN_SYSTEME']
  },
  {
    id: 'reports',
    path: '/reports',
    icon: FileText,
    title: 'Rapports complets',
    desc: 'Analysez les résultats, classements et exportez les bulletins (administration)',
    color: '#64748b',
    glow: 'rgba(100,116,139,0.2)',
    gradient: 'linear-gradient(135deg, #334155 0%, #64748b 100%)',
    tag: 'Analytics',
    roles: ['ADMIN_DELEGUE', 'ADMIN_SYSTEME']
  },
  {
    id: 'teacher_reports',
    path: '/teacher/reports',
    icon: BarChart3,
    title: 'Rapports de classe',
    desc: 'Consultez les résultats détaillés de vos épreuves et classes',
    color: '#10b981',
    glow: 'rgba(16,185,129,0.2)',
    gradient: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
    tag: 'Évaluation',
    roles: ['ENSEIGNANT', 'ADMIN_DELEGUE', 'ADMIN_SYSTEME']
  },
  {
    id: 'my_questions',
    path: '/teacher/questions',
    icon: FileText,
    title: 'Mes Questions',
    desc: 'Consultez vos questions et suivez leur état de validation',
    color: '#8b5cf6',
    glow: 'rgba(139,92,246,0.25)',
    gradient: 'linear-gradient(135deg, #6d28d9 0%, #8b5cf6 100%)',
    tag: 'Suivi',
    roles: ['ENSEIGNANT']
  },
  {
    id: 'qcm_validation',
    path: '/admin/qcm-validation',
    icon: CheckSquare,
    title: 'Validation QCM',
    desc: 'Valider les questions proposées par les enseignants',
    color: '#8b5cf6',
    glow: 'rgba(139,92,246,0.2)',
    gradient: 'linear-gradient(135deg, #7c3aed 0%, #8b5cf6 100%)',
    tag: 'Comité',
    roles: ['ADMIN_DELEGUE', 'ADMIN_SYSTEME']
  },
  {
    id: 'qcm_import',
    path: '/admin/qcm-import',
    icon: Database,
    title: 'Import QCM',
    desc: 'Importer des questions en masse depuis un fichier CSV ou JSON',
    color: '#10b981',
    glow: 'rgba(16,185,129,0.2)',
    gradient: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
    tag: 'Import',
    roles: ['ADMIN_DELEGUE', 'ADMIN_SYSTEME']
  },
  {
    id: 'user_management',
    path: '/admin/users',
    icon: Users,
    title: 'Gestion Utilisateurs',
    desc: 'Créer, modifier et supprimer des comptes utilisateurs',
    color: '#ec4899',
    glow: 'rgba(236,72,153,0.2)',
    gradient: 'linear-gradient(135deg, #db2777 0%, #ec4899 100%)',
    tag: 'Administration',
    roles: ['ADMIN_SYSTEME', 'ADMIN_DELEGUE']
  },

  // ========== MODULES APPRENANT ==========
  {
    id: 'available_exams',
    path: '/available-exams',
    icon: ClipboardList,
    title: 'Épreuves disponibles',
    desc: 'Consultez les épreuves auxquelles vous êtes inscrit et commencez la composition',
    color: '#10b981',
    glow: 'rgba(16,185,129,0.2)',
    gradient: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
    tag: 'Composition',
    roles: ['APPRENANT']
  },
  {
    id: 'my_results',
    path: '/my-results',
    icon: Award,
    title: 'Mes Résultats',
    desc: 'Consultez vos résultats, bulletins et suivi de progression',
    color: '#f59e0b',
    glow: 'rgba(245,158,11,0.2)',
    gradient: 'linear-gradient(135deg, #b45309 0%, #f59e0b 100%)',
    tag: 'Suivi',
    roles: ['APPRENANT']
  },
  {
    id: 'terminal',
    path: 'http://192.168.0.1:5000/terminal.html',
    icon: Terminal,
    title: 'Terminal d\'examen',
    desc: 'Accédez directement à l\'interface de composition (poste étudiant)',
    color: '#8b5cf6',
    glow: 'rgba(139,92,246,0.2)',
    gradient: 'linear-gradient(135deg, #7c3aed 0%, #8b5cf6 100%)',
    tag: 'Examen',
    roles: ['APPRENANT'],
    external: true
  }
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
  const { user, hasRole, logout } = useAuth();

  // Filtrer les modules selon le rôle de l'utilisateur connecté
  const accessibleModules = ALL_MODULES.filter(mod => {
    return mod.roles.some(role => hasRole(role));
  });

  // Gestion de la déconnexion
  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Gestion du clic sur un module (externe ou interne)
  const handleModuleClick = (mod) => {
    if (mod.external) {
      window.open(mod.path, '_blank');
    } else {
      navigate(mod.path);
    }
  };

  // Redirection vers la page d'accueil si non authentifié
  if (!user) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #05071a 0%, #0a0f2e 60%, #05071a 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{ textAlign: 'center' }}>
          <Shield size={48} color="#ef4444" style={{ marginBottom: 16 }} />
          <h2 style={{ color: '#f8fafc' }}>Accès non autorisé</h2>
          <p style={{ color: '#64748b' }}>Veuillez vous connecter pour accéder à cette page</p>
          <button
            onClick={() => navigate('/login')}
            style={{
              marginTop: 20,
              padding: '10px 24px',
              background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
              border: 'none',
              borderRadius: 8,
              color: 'white',
              cursor: 'pointer'
            }}
          >
            Se connecter
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      fontFamily: "'DM Sans', sans-serif",
      background: 'linear-gradient(135deg, #05071a 0%, #0a0f2e 60%, #05071a 100%)',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Grille de fond */}
      <div style={{
        position: 'fixed', inset: 0,
        backgroundImage: 'linear-gradient(rgba(59,130,246,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,0.03) 1px, transparent 1px)',
        backgroundSize: '40px 40px', pointerEvents: 'none', zIndex: 0,
      }} />

      {/* Glow */}
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
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          {user && (
            <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
              {user.name || user.email} · <span style={{ color: '#60a5fa' }}>{user.role}</span>
            </span>
          )}
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleLogout}
            style={{
              display: 'flex', alignItems: 'center', gap: '7px',
              padding: '8px 16px', borderRadius: '8px',
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: '#cbd5e1', fontSize: '0.875rem', fontWeight: 500,
              cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
            }}
          >
            <LogOut size={15} />
            Déconnexion
          </motion.button>
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
        </div>
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
            {user?.role === 'APPRENANT' 
              ? 'Accédez à vos épreuves et consultez vos résultats'
              : user?.role === 'OPERATEUR_EVALUATION'
              ? 'Supervisez les sessions d\'examen en temps réel'
              : 'Créez des questions, composez des épreuves avec des questions validées, ou accédez aux outils de gestion'}
          </p>
        </motion.div>

        {/* Module Grid - uniquement les modules accessibles */}
        {accessibleModules.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px', color: '#64748b' }}>
            Aucun module n'est accessible avec votre profil actuel.
          </div>
        ) : (
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
            {accessibleModules.map((mod) => {
              const Icon = mod.icon;
              return (
                <motion.button
                  key={mod.id}
                  variants={cardVariants}
                  whileHover={{ y: -5, scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleModuleClick(mod)}
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
                  <div style={{
                    position: 'absolute', top: 0, left: 0, right: 0, height: '1px',
                    background: `linear-gradient(90deg, transparent, ${mod.color}66, transparent)`,
                  }} />

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

                  <span style={{
                    fontSize: '0.6875rem', fontWeight: 700,
                    letterSpacing: '0.1em', textTransform: 'uppercase',
                    color: mod.color, marginBottom: '6px',
                  }}>
                    {mod.tag}
                  </span>

                  <h3 style={{
                    fontFamily: "'Sora', sans-serif",
                    fontSize: '1.125rem', fontWeight: 700,
                    color: '#f1f5f9', marginBottom: '8px', letterSpacing: '-0.01em',
                  }}>
                    {mod.title}
                  </h3>

                  <p style={{ fontSize: '0.875rem', color: 'rgba(148,163,184,0.8)', lineHeight: 1.5, margin: 0 }}>
                    {mod.desc}
                  </p>

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
        )}
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