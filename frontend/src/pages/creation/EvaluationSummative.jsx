// src/pages/creation/EvaluationSummative.jsx — Tableau de bord professionnel
// Version avec lien terminal fonctionnel pour APPRENANT

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  BookOpen, Database, Bot, Home, List, Monitor, Download,
  CheckSquare, Users, LogOut, Eye, FileText, Shield,
  ClipboardList, Award, BarChart3, Terminal, TrendingUp,
  Library, LayoutDashboard, User, LogOutIcon, HomeIcon,
  FileQuestion, GraduationCap, Activity
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

// ========== PALETTE SOMBRE TAMISÉE ==========
const COLORS = {
  primary: '#6366f1',
  primaryLight: '#8b5cf6',
  primaryDark: '#4f46e5',
  secondary: '#6b5b7e',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  info: '#3b82f6',
  gray: '#6b7280',
  dark: '#0f172a',
  cardBg: 'rgba(15, 23, 42, 0.85)',
  cardBorder: 'rgba(99, 102, 241, 0.15)',
  text: '#f1f5f9',
  textDim: '#94a3b8',
  textMuted: '#64748b',
  glow: 'rgba(99, 102, 241, 0.08)',
  bgGradientStart: '#05071a',
  bgGradientMid: '#0a0f2e',
  bgGradientEnd: '#05071a'
};

// ========== MODULES AVEC RÔLES CORRIGÉS ==========
const ALL_MODULES = [
  // ========== MODULES ENSEIGNANT & ADMIN ==========
  {
    id: 'create_question',
    path: '/create/question',
    icon: FileText,
    title: 'Création digitale ex nihilo',
    subtitle: 'Question individuelle',
    desc: 'Concevoir une question originale destinée au circuit de validation pédagogique',
    color: COLORS.primary,
    gradient: 'linear-gradient(135deg, #4f46e5, #6366f1)',
    tag: 'Création',
    roles: ['ENSEIGNANT', 'ADMIN_DELEGUE', 'ADMIN_SYSTEME']
  },
  {
    id: 'database',
    path: '/create/database',
    icon: Database,
    title: 'Création depuis la banque',
    subtitle: 'Questions validées',
    desc: 'Composer une épreuve à partir des questions approuvées par le comité pédagogique',
    color: COLORS.warning,
    gradient: 'linear-gradient(135deg, #d97706, #f59e0b)',
    tag: 'Banque',
    roles: ['ENSEIGNANT', 'OPERATEUR_EVALUATION', 'ADMIN_DELEGUE', 'ADMIN_SYSTEME']
  },
  {
    id: 'ai',
    path: '/create/ai',
    icon: Bot,
    title: 'Génération par IA',
    subtitle: 'DeepSeek',
    desc: 'Générer automatiquement des questions QCM avec révision préalable',
    color: COLORS.secondary,
    gradient: 'linear-gradient(135deg, #7c3aed, #8b5cf6)',
    tag: 'IA',
    roles: ['ENSEIGNANT', 'ADMIN_DELEGUE', 'ADMIN_SYSTEME']
  },
  {
    id: 'exams',
    path: '/exams',
    icon: List,
    title: 'Gestion des épreuves',
    subtitle: 'Bibliothèque',
    desc: 'Consulter, modifier, prévisualiser et déployer les examens créés',
    color: COLORS.success,
    gradient: 'linear-gradient(135deg, #059669, #10b981)',
    tag: 'Épreuves',
    roles: ['ENSEIGNANT', 'OPERATEUR_EVALUATION', 'ADMIN_DELEGUE', 'ADMIN_SYSTEME']
  },
  {
    id: 'surveillance',
    path: '/surveillance',
    icon: Monitor,
    title: 'Surveillance temps réel',
    subtitle: 'Sessions actives',
    desc: 'Piloter et surveiller le déroulement des évaluations en cours',
    color: COLORS.warning,
    gradient: 'linear-gradient(135deg, #ea580c, #f97316)',
    tag: 'Live',
    roles: ['ENSEIGNANT', 'OPERATEUR_EVALUATION', 'ADMIN_DELEGUE', 'ADMIN_SYSTEME']
  },
  {
    id: 'reports',
    path: '/reports',
    icon: BarChart3,
    title: 'Rapports institutionnels',
    subtitle: 'Analyse complète',
    desc: 'Générer et analyser les résultats consolidés, classements et statistiques globales',
    color: COLORS.gray,
    gradient: 'linear-gradient(135deg, #475569, #64748b)',
    tag: 'Analytics',
    roles: ['ENSEIGNANT', 'ADMIN_DELEGUE', 'ADMIN_SYSTEME']
  },
  {
    id: 'teacher_reports',
    path: '/teacher/reports',
    icon: TrendingUp,
    title: 'Rapports de classe',
    subtitle: 'Suivi pédagogique',
    desc: 'Consulter les résultats détaillés de vos apprenants et classes',
    color: COLORS.success,
    gradient: 'linear-gradient(135deg, #059669, #10b981)',
    tag: 'Classe',
    roles: ['ENSEIGNANT', 'ADMIN_DELEGUE', 'ADMIN_SYSTEME']
  },
  {
    id: 'qcm_validation',
    path: '/admin/qcm-validation',
    icon: CheckSquare,
    title: 'Validation pédagogique',
    subtitle: 'Questions en attente',
    desc: 'Examiner et statuer sur les questions proposées par les enseignants',
    color: COLORS.secondary,
    gradient: 'linear-gradient(135deg, #7c3aed, #8b5cf6)',
    tag: 'Validation',
    roles: ['ADMIN_DELEGUE', 'ADMIN_SYSTEME']
  },
  {
    id: 'qcm_import',
    path: '/admin/qcm-import',
    icon: Download,
    title: 'Importation massive',
    subtitle: 'CSV / JSON',
    desc: 'Intégrer un lot de questions depuis un fichier structuré',
    color: COLORS.success,
    gradient: 'linear-gradient(135deg, #059669, #10b981)',
    tag: 'Import',
    roles: ['ADMIN_DELEGUE', 'ADMIN_SYSTEME']
  },
  {
    id: 'user_management',
    path: '/admin/users',
    icon: Users,
    title: 'Gestion des comptes',
    subtitle: 'Utilisateurs',
    desc: 'Administrer les profils, rôles et accès au système',
    color: COLORS.danger,
    gradient: 'linear-gradient(135deg, #dc2626, #ef4444)',
    tag: 'Admin',
    roles: ['ADMIN_DELEGUE', 'ADMIN_SYSTEME']
  },
  {
    id: 'qcm_bank',
    path: '/qcm-bank',
    icon: Library,
    title: 'Banque analytique',
    subtitle: 'Consultation détaillée',
    desc: 'Explorer, filtrer et analyser l\'intégralité des questions validées dans la base',
    color: COLORS.info,
    gradient: 'linear-gradient(135deg, #2563eb, #3b82f6)',
    tag: 'Analyse',
    roles: ['ENSEIGNANT', 'ADMIN_DELEGUE', 'ADMIN_SYSTEME']
  },
  {
    id: 'my_questions',
    path: '/teacher/questions',
    icon: FileQuestion,
    title: 'Mes questions',
    subtitle: 'Suivi des QCM',
    desc: 'Consulter l\'état de vos questions (en attente, validées, rejetées)',
    color: COLORS.info,
    gradient: 'linear-gradient(135deg, #2563eb, #3b82f6)',
    tag: 'Suivi',
    roles: ['ENSEIGNANT']
  },

  // ========== MODULES APPRENANT ==========
  {
    id: 'available_exams',
    path: '/available-exams',
    icon: ClipboardList,
    title: 'Épreuves disponibles',
    subtitle: 'Mes évaluations',
    desc: 'Accéder aux évaluations auxquelles vous êtes inscrit et composer',
    color: COLORS.success,
    gradient: 'linear-gradient(135deg, #059669, #10b981)',
    tag: 'Composition',
    roles: ['APPRENANT']
  },
  {
    id: 'my_results',
    path: '/my-results',
    icon: Award,
    title: 'Mes résultats',
    subtitle: 'Mon parcours',
    desc: 'Visualiser l\'historique de vos évaluations et télécharger vos bulletins',
    color: COLORS.warning,
    gradient: 'linear-gradient(135deg, #d97706, #f59e0b)',
    tag: 'Suivi',
    roles: ['APPRENANT']
  },
  {
    id: 'terminal',
    path: 'https://na2quizapp.onrender.com/terminal.html',
    icon: Terminal,
    title: 'Terminal d\'examen',
    subtitle: 'Poste candidat',
    desc: 'Interface de composition pour les évaluations en salle',
    color: COLORS.primary,
    gradient: 'linear-gradient(135deg, #4f46e5, #6366f1)',
    tag: 'Examen',
    roles: ['APPRENANT'],
    external: true  // ← Ouvre dans un nouvel onglet
  }
];

// ========== GROUPES FONCTIONNELS ==========
const INTEREST_GROUPS = [
  {
    id: 'qcm',
    title: 'Gestion des questions',
    subtitle: 'Création · Validation · Import · Analyse · Suivi',
    icon: FileQuestion,
    modules: ['create_question', 'database', 'ai', 'qcm_validation', 'qcm_import', 'qcm_bank', 'my_questions'],
    color: COLORS.primary,
    gradient: 'linear-gradient(135deg, #4f46e5, #6366f1)'
  },
  {
    id: 'exam',
    title: 'Gestion des épreuves',
    subtitle: 'Composition · Distribution',
    icon: GraduationCap,
    modules: ['exams'],
    color: COLORS.success,
    gradient: 'linear-gradient(135deg, #059669, #10b981)'
  },
  {
    id: 'evaluation',
    title: 'Évaluation opérationnelle',
    subtitle: 'Supervision · Analyse · Rapports',
    icon: Activity,
    modules: ['surveillance', 'reports', 'teacher_reports'],
    color: COLORS.warning,
    gradient: 'linear-gradient(135deg, #d97706, #f59e0b)'
  },
  {
    id: 'users',
    title: 'Administration',
    subtitle: 'Comptes · Sécurité · Rôles',
    icon: Shield,
    modules: ['user_management'],
    color: COLORS.danger,
    gradient: 'linear-gradient(135deg, #dc2626, #ef4444)'
  },
  {
    id: 'apprenant',
    title: 'Espace Apprenant',
    subtitle: 'Évaluations · Résultats · Terminal',
    icon: GraduationCap,
    modules: ['available_exams', 'my_results', 'terminal'],
    color: COLORS.info,
    gradient: 'linear-gradient(135deg, #2563eb, #3b82f6)'
  }
];

// ========== ANIMATIONS ==========
const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } }
};

const groupVariants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.2, 0.8, 0.4, 1] } }
};

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.2, 0.7, 0.3, 1] } }
};

const EvaluationSummative = () => {
  const navigate = useNavigate();
  const { user, hasRole, logout } = useAuth();

  // Filtrer les modules accessibles selon le rôle de l'utilisateur
  const accessibleModules = ALL_MODULES.filter(mod =>
    mod.roles.some(role => hasRole(role))
  );

  const accessibleModulesMap = new Map(accessibleModules.map(m => [m.id, m]));

  // Filtrer les groupes qui ont au moins un module accessible
  const visibleGroups = INTEREST_GROUPS.filter(group =>
    group.modules.some(id => accessibleModulesMap.has(id))
  );

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleModuleClick = (mod) => {
    if (mod.external) {
      // Ouvre le terminal dans un nouvel onglet
      window.open(mod.path, '_blank', 'noopener,noreferrer');
    } else {
      navigate(mod.path);
    }
  };

  if (!user) {
    return (
      <div style={styles.authContainer}>
        <div style={styles.authCard}>
          <Shield size={48} color={COLORS.danger} style={{ marginBottom: 20 }} />
          <h2 style={styles.authTitle}>Accès restreint</h2>
          <p style={styles.authText}>Authentification requise</p>
          <button onClick={() => navigate('/login')} style={styles.authButton}>
            Accéder à l'espace sécurisé
          </button>
        </div>
      </div>
    );
  }

  // Déterminer le message d'accueil selon le rôle
  const getWelcomeMessage = () => {
    switch (user?.role) {
      case 'APPRENANT':
        return 'Accédez à vos épreuves, consultez vos résultats et utilisez le terminal d\'examen';
      case 'OPERATEUR_EVALUATION':
        return 'Pilotez et supervisez les sessions d\'examen en temps réel';
      case 'ENSEIGNANT':
        return 'Concevez, gérez et analysez vos évaluations pédagogiques';
      case 'ADMIN_DELEGUE':
        return 'Validez les QCM, gérez les épreuves et consultez les rapports';
      case 'ADMIN_SYSTEME':
        return 'Administration complète du système';
      default:
        return 'Tableau de bord NA²QUIZ';
    }
  };

  return (
    <div style={styles.app}>
      {/* Fond avec pattern */}
      <div style={styles.bgPattern} />
      <div style={styles.bgGradient} />

      {/* Header */}
      <header style={styles.header}>
        <div style={styles.logo}>
          <span style={{ color: COLORS.primary }}>na²</span>quiz · évaluation sommative
        </div>
        <div style={styles.headerActions}>
          {user && (
            <div style={styles.userBadge}>
              <User size={12} style={{ marginRight: 6 }} />
              {user.name?.split(' ')[0] || user.email?.split('@')[0]} · 
              <span style={{ color: COLORS.primaryLight, marginLeft: 4 }}>{user.role}</span>
            </div>
          )}
          <button onClick={() => navigate('/')} style={styles.iconButton}>
            <HomeIcon size={14} /> Accueil
          </button>
          <button onClick={handleLogout} style={{...styles.iconButton, borderColor: 'rgba(239,68,68,0.3)', color: COLORS.danger}}>
            <LogOutIcon size={14} /> Déconnexion
          </button>
        </div>
      </header>

      <main style={styles.main}>
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          style={styles.hero}
        >
          <div style={styles.badge}>
            <span style={styles.badgeDot} />
            <span style={styles.badgeText}>Tableau de bord</span>
          </div>
          <h1 style={styles.title}>ÉVALUATION SOMMATIVE</h1>
          <p style={styles.subtitle}>{getWelcomeMessage()}</p>
        </motion.div>

        {/* Groupes de modules */}
        {visibleGroups.length === 0 ? (
          <div style={styles.emptyState}>
            <LayoutDashboard size={48} color={COLORS.textMuted} />
            <p>Aucun module accessible avec votre profil</p>
            <p style={{ fontSize: '0.7rem', marginTop: 8 }}>Contactez votre administrateur</p>
          </div>
        ) : (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="show"
            style={styles.groupsContainer}
          >
            {visibleGroups.map((group) => {
              const groupModules = group.modules
                .map(id => accessibleModulesMap.get(id))
                .filter(Boolean);

              if (groupModules.length === 0) return null;

              const GroupIcon = group.icon;

              return (
                <motion.div key={group.id} variants={groupVariants} style={styles.group}>
                  <div style={styles.groupHeader}>
                    <div style={{ ...styles.groupIcon, background: group.gradient }}>
                      <GroupIcon size={18} color="#fff" />
                    </div>
                    <div>
                      <h2 style={styles.groupTitle}>{group.title}</h2>
                      <p style={styles.groupSubtitle}>{group.subtitle}</p>
                    </div>
                    <div style={{ ...styles.groupCount, color: group.color, borderColor: `${group.color}40` }}>
                      {groupModules.length}
                    </div>
                  </div>

                  <div style={styles.grid}>
                    {groupModules.map((mod) => {
                      const Icon = mod.icon;
                      return (
                        <motion.button
                          key={mod.id}
                          variants={cardVariants}
                          whileHover={{ y: -3, borderColor: mod.color }}
                          whileTap={{ scale: 0.99 }}
                          onClick={() => handleModuleClick(mod)}
                          style={styles.card}
                        >
                          <div style={{ ...styles.cardIcon, background: mod.gradient }}>
                            <Icon size={20} color="#fff" />
                          </div>
                          <div style={styles.cardContent}>
                            <span style={{ ...styles.cardTag, color: mod.color }}>{mod.tag}</span>
                            <h3 style={styles.cardTitle}>{mod.title}</h3>
                            <p style={styles.cardDesc}>{mod.desc}</p>
                          </div>
                          <div style={styles.cardArrow}>→</div>
                        </motion.button>
                      );
                    })}
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </main>

      <style>{`
        @keyframes subtlePulse {
          0%, 100% { opacity: 0.5; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.2); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        ::-webkit-scrollbar {
          width: 6px;
        }
        ::-webkit-scrollbar-track {
          background: rgba(15, 23, 42, 0.5);
          border-radius: 10px;
        }
        ::-webkit-scrollbar-thumb {
          background: rgba(99, 102, 241, 0.3);
          border-radius: 10px;
        }
      `}</style>
    </div>
  );
};

// ========== STYLES ==========
const styles = {
  app: {
    minHeight: '100vh',
    background: `linear-gradient(135deg, ${COLORS.bgGradientStart} 0%, ${COLORS.bgGradientMid} 50%, ${COLORS.bgGradientEnd} 100%)`,
    fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
    position: 'relative',
    color: COLORS.text
  },
  bgPattern: {
    position: 'fixed',
    inset: 0,
    backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(99, 102, 241, 0.05) 1px, transparent 0)',
    backgroundSize: '40px 40px',
    pointerEvents: 'none',
    zIndex: 0
  },
  bgGradient: {
    position: 'fixed',
    top: '-30%',
    left: '20%',
    width: '60vw',
    height: '60vh',
    background: `radial-gradient(ellipse, ${COLORS.glow} 0%, transparent 70%)`,
    pointerEvents: 'none',
    zIndex: 0,
    filter: 'blur(100px)'
  },
  header: {
    position: 'sticky',
    top: 0,
    zIndex: 50,
    background: 'rgba(5, 7, 26, 0.85)',
    backdropFilter: 'blur(16px)',
    borderBottom: '1px solid rgba(99, 102, 241, 0.15)',
    padding: '0 28px',
    height: '56px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  logo: {
    fontFamily: "'Inter', system-ui",
    fontWeight: 500,
    fontSize: '0.85rem',
    letterSpacing: '-0.01em',
    color: COLORS.textDim,
    textTransform: 'lowercase'
  },
  headerActions: {
    display: 'flex',
    gap: '10px',
    alignItems: 'center'
  },
  userBadge: {
    fontSize: '0.7rem',
    color: COLORS.textDim,
    background: 'rgba(99, 102, 241, 0.08)',
    padding: '4px 12px',
    borderRadius: '32px',
    border: '1px solid rgba(99, 102, 241, 0.15)'
  },
  iconButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    padding: '4px 12px',
    borderRadius: '32px',
    background: 'rgba(255,255,255,0.02)',
    border: '1px solid rgba(99, 102, 241, 0.15)',
    color: COLORS.textDim,
    fontSize: '0.7rem',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.15s'
  },
  main: {
    position: 'relative',
    zIndex: 2,
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '40px 24px 64px'
  },
  hero: {
    textAlign: 'center',
    marginBottom: '48px'
  },
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '3px 12px',
    marginBottom: '16px',
    background: 'rgba(99, 102, 241, 0.08)',
    border: '1px solid rgba(99, 102, 241, 0.2)',
    borderRadius: '32px'
  },
  badgeDot: {
    width: '5px',
    height: '5px',
    borderRadius: '50%',
    background: COLORS.primary,
    animation: 'subtlePulse 1.8s infinite'
  },
  badgeText: {
    fontSize: '0.65rem',
    fontWeight: 500,
    letterSpacing: '0.08em',
    color: COLORS.primaryLight,
    textTransform: 'uppercase'
  },
  title: {
    fontFamily: "'Inter', system-ui",
    fontSize: 'clamp(1.6rem, 4vw, 2.2rem)',
    fontWeight: 600,
    letterSpacing: '-0.02em',
    color: COLORS.text,
    marginBottom: '12px',
    textTransform: 'uppercase'
  },
  subtitle: {
    fontSize: '0.9rem',
    color: COLORS.textDim,
    maxWidth: '500px',
    margin: '0 auto',
    lineHeight: 1.5
  },
  groupsContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '48px'
  },
  group: {
    animation: 'fadeIn 0.4s ease-out'
  },
  groupHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    marginBottom: '20px',
    paddingBottom: '10px',
    borderBottom: '1px solid rgba(99, 102, 241, 0.15)'
  },
  groupIcon: {
    width: '36px',
    height: '36px',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0
  },
  groupTitle: {
    fontFamily: "'Inter', system-ui",
    fontSize: '1rem',
    fontWeight: 500,
    color: COLORS.text,
    letterSpacing: '-0.01em',
    margin: 0
  },
  groupSubtitle: {
    fontSize: '0.6rem',
    color: COLORS.textMuted,
    marginTop: '1px',
    letterSpacing: '0.05em'
  },
  groupCount: {
    marginLeft: 'auto',
    padding: '2px 8px',
    borderRadius: '24px',
    fontSize: '0.65rem',
    fontWeight: 500,
    background: 'rgba(255,255,255,0.02)',
    border: '1px solid'
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
    gap: '16px'
  },
  card: {
    position: 'relative',
    display: 'flex',
    alignItems: 'flex-start',
    gap: '14px',
    textAlign: 'left',
    padding: '18px',
    background: COLORS.cardBg,
    backdropFilter: 'blur(8px)',
    border: '1px solid',
    borderColor: COLORS.cardBorder,
    borderRadius: '20px',
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  },
  cardIcon: {
    width: '42px',
    height: '42px',
    borderRadius: '14px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
  },
  cardContent: {
    flex: 1
  },
  cardTag: {
    fontSize: '0.6rem',
    fontWeight: 500,
    letterSpacing: '0.08em',
    marginBottom: '4px',
    display: 'inline-block',
    textTransform: 'uppercase'
  },
  cardTitle: {
    fontFamily: "'Inter', system-ui",
    fontSize: '0.85rem',
    fontWeight: 500,
    color: COLORS.text,
    marginBottom: '4px',
    letterSpacing: '-0.01em',
    lineHeight: 1.3
  },
  cardDesc: {
    fontSize: '0.7rem',
    color: COLORS.textDim,
    lineHeight: 1.45,
    margin: 0
  },
  cardArrow: {
    position: 'absolute',
    bottom: '12px',
    right: '14px',
    fontSize: '0.9rem',
    opacity: 0.35,
    transition: 'opacity 0.2s'
  },
  emptyState: {
    textAlign: 'center',
    padding: '60px 20px',
    color: COLORS.textMuted,
    background: 'rgba(15, 23, 42, 0.5)',
    borderRadius: '24px',
    border: '1px dashed rgba(99, 102, 241, 0.3)'
  },
  authContainer: {
    minHeight: '100vh',
    background: `linear-gradient(135deg, ${COLORS.bgGradientStart}, ${COLORS.bgGradientEnd})`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  authCard: {
    textAlign: 'center',
    background: COLORS.cardBg,
    backdropFilter: 'blur(12px)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    borderRadius: '24px',
    padding: '40px',
    maxWidth: '380px'
  },
  authTitle: {
    color: COLORS.text,
    fontSize: '1.2rem',
    fontWeight: 500,
    marginBottom: '8px'
  },
  authText: {
    color: COLORS.textDim,
    fontSize: '0.85rem',
    marginBottom: '24px'
  },
  authButton: {
    padding: '10px 28px',
    background: `linear-gradient(135deg, ${COLORS.primaryDark}, ${COLORS.primary})`,
    border: 'none',
    borderRadius: '32px',
    color: '#fff',
    fontWeight: 500,
    cursor: 'pointer',
    fontSize: '0.85rem'
  }
};

export default EvaluationSummative;