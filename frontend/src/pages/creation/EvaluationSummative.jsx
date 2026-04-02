// src/pages/creation/EvaluationSummative.jsx — Tableau de bord professionnel
// Version avec thème harmonisé avec QCMBankPage

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

// ========== PALETTE PROFESSIONNELLE (harmonisée avec QCMBankPage) ==========
const COLORS = {
  primary: '#2d5a9c',
  primaryLight: '#3d6aac',
  primaryDark: '#1d4a8c',
  secondary: '#6b5b7e',
  success: '#2b6e4f',
  warning: '#b66d2e',
  danger: '#a94442',
  info: '#2c6e7e',
  gray: '#5a6a7a',
  dark: '#0e1622',
  cardBg: 'rgba(18, 22, 35, 0.85)',
  cardBorder: 'rgba(75, 85, 105, 0.25)',
  text: '#e8edf5',
  textDim: '#9aa9b9',
  textMuted: '#6f7d8f',
  glow: 'rgba(45, 90, 156, 0.12)',
  bgGradientStart: '#0a0e1a',
  bgGradientMid: '#111624',
  bgGradientEnd: '#0a0e1a'
};

// ========== 12 MODULES PRINCIPAUX (avec rôles corrigés) ==========
const ALL_MODULES = [
  // 1. Création digitale ex nihilo d'une QCM
  {
    id: 'create_question',
    path: '/create/question',
    icon: FileText,
    title: 'Création digitale ex nihilo',
    subtitle: 'Question individuelle',
    desc: 'Concevoir une question originale destinée au circuit de validation pédagogique',
    color: COLORS.primary,
    gradient: 'linear-gradient(135deg, #1e3a5f, #2d5a9c)',
    tag: 'Création',
    roles: ['ENSEIGNANT', 'ADMIN_DELEGUE', 'ADMIN_SYSTEME']
  },
  // 2. Création depuis la banque de questions disponibles
  {
    id: 'database',
    path: '/create/database',
    icon: Database,
    title: 'Création depuis la banque',
    subtitle: 'Questions validées',
    desc: 'Composer une épreuve à partir des questions approuvées par le comité pédagogique',
    color: COLORS.warning,
    gradient: 'linear-gradient(135deg, #8b5a2b, #b66d2e)',
    tag: 'Banque',
    roles: ['ENSEIGNANT', 'ADMIN_DELEGUE', 'ADMIN_SYSTEME']
  },
  // 3. Création par intelligence artificielle
  {
    id: 'ai',
    path: '/create/ai',
    icon: Bot,
    title: 'Génération par IA',
    subtitle: 'DeepSeek',
    desc: 'Générer automatiquement des questions QCM avec révision préalable',
    color: COLORS.secondary,
    gradient: 'linear-gradient(135deg, #524b6b, #6b5b7e)',
    tag: 'IA',
    roles: ['ENSEIGNANT', 'ADMIN_DELEGUE', 'ADMIN_SYSTEME']
  },
  // 4. Gestion des épreuves
  {
    id: 'exams',
    path: '/exams',
    icon: List,
    title: 'Gestion des épreuves',
    subtitle: 'Bibliothèque',
    desc: 'Consulter, modifier, prévisualiser et déployer les examens créés',
    color: COLORS.success,
    gradient: 'linear-gradient(135deg, #1f6e48, #2b6e4f)',
    tag: 'Épreuves',
    roles: ['ENSEIGNANT', 'ADMIN_DELEGUE', 'ADMIN_SYSTEME', 'OPERATEUR_EVALUATION']
  },
  // 5. Surveillance en temps réel
  {
    id: 'surveillance',
    path: '/surveillance',
    icon: Monitor,
    title: 'Surveillance temps réel',
    subtitle: 'Sessions actives',
    desc: 'Piloter et surveiller le déroulement des évaluations en cours',
    color: COLORS.warning,
    gradient: 'linear-gradient(135deg, #9e5a2b, #b66d2e)',
    tag: 'Live',
    roles: ['OPERATEUR_EVALUATION', 'ADMIN_DELEGUE', 'ADMIN_SYSTEME']
  },
  // 6. Élaboration et analyse complète des rapports
  {
    id: 'reports',
    path: '/reports',
    icon: BarChart3,
    title: 'Rapports institutionnels',
    subtitle: 'Analyse complète',
    desc: 'Générer et analyser les résultats consolidés, classements et statistiques globales',
    color: COLORS.gray,
    gradient: 'linear-gradient(135deg, #4a5a6a, #5a6a7a)',
    tag: 'Analytics',
    roles: ['ADMIN_DELEGUE', 'ADMIN_SYSTEME']
  },
  // 7. Rapports de classe
  {
    id: 'teacher_reports',
    path: '/teacher/reports',
    icon: TrendingUp,
    title: 'Rapports de classe',
    subtitle: 'Suivi pédagogique',
    desc: 'Consulter les résultats détaillés de vos apprenants et classes',
    color: COLORS.success,
    gradient: 'linear-gradient(135deg, #1f6e48, #2b6e4f)',
    tag: 'Classe',
    roles: ['ENSEIGNANT', 'ADMIN_DELEGUE', 'ADMIN_SYSTEME']
  },
  // 8. Validation des QCM en attente
  {
    id: 'qcm_validation',
    path: '/admin/qcm-validation',
    icon: CheckSquare,
    title: 'Validation pédagogique',
    subtitle: 'Questions en attente',
    desc: 'Examiner et statuer sur les questions proposées par les enseignants',
    color: COLORS.secondary,
    gradient: 'linear-gradient(135deg, #5e4a7a, #6b5b7e)',
    tag: 'Validation',
    roles: ['ADMIN_DELEGUE', 'ADMIN_SYSTEME']
  },
  // 9. Importation des QCM
  {
    id: 'qcm_import',
    path: '/admin/qcm-import',
    icon: Download,
    title: 'Importation massive',
    subtitle: 'CSV / JSON',
    desc: 'Intégrer un lot de questions depuis un fichier structuré',
    color: COLORS.success,
    gradient: 'linear-gradient(135deg, #266e4a, #2b6e4f)',
    tag: 'Import',
    roles: ['ADMIN_DELEGUE', 'ADMIN_SYSTEME']
  },
  // 10. Gestion des utilisateurs
  {
    id: 'user_management',
    path: '/admin/users',
    icon: Users,
    title: 'Gestion des comptes',
    subtitle: 'Utilisateurs',
    desc: 'Administrer les profils, rôles et accès au système',
    color: COLORS.danger,
    gradient: 'linear-gradient(135deg, #964b4b, #a94442)',
    tag: 'Admin',
    roles: ['ADMIN_SYSTEME', 'ADMIN_DELEGUE']
  },
  // 11. Consultation analytique de la banque de QCM
  {
    id: 'qcm_bank',
    path: '/qcm-bank',
    icon: Library,
    title: 'Banque analytique',
    subtitle: 'Consultation détaillée',
    desc: 'Explorer, filtrer et analyser l\'intégralité des questions validées dans la base',
    color: COLORS.info,
    gradient: 'linear-gradient(135deg, #265e6b, #2c6e7e)',
    tag: 'Analyse',
    roles: ['ENSEIGNANT', 'ADMIN_DELEGUE', 'ADMIN_SYSTEME', 'OPERATEUR_EVALUATION']
  },
  // 12. Mes questions - Suivi des QCM pour l'enseignant
  {
    id: 'my_questions',
    path: '/teacher/questions',
    icon: FileQuestion,
    title: 'Mes questions',
    subtitle: 'Suivi des QCM',
    desc: 'Consulter l\'état de vos questions (en attente, validées, rejetées)',
    color: COLORS.info,
    gradient: 'linear-gradient(135deg, #1e4a6b, #2c6e7e)',
    tag: 'Suivi',
    roles: ['ENSEIGNANT']
  },

  // === Modules APPRENANT ===
  {
    id: 'available_exams',
    path: '/available-exams',
    icon: ClipboardList,
    title: 'Épreuves disponibles',
    subtitle: 'Composition',
    desc: 'Accéder aux évaluations auxquelles vous êtes inscrit',
    color: COLORS.success,
    gradient: 'linear-gradient(135deg, #1f6e48, #2b6e4f)',
    tag: 'Composition',
    roles: ['APPRENANT']
  },
  {
    id: 'my_results',
    path: '/my-results',
    icon: Award,
    title: 'Mon parcours',
    subtitle: 'Résultats',
    desc: 'Visualiser l\'historique de vos évaluations et télécharger vos bulletins',
    color: COLORS.warning,
    gradient: 'linear-gradient(135deg, #9e5a2b, #b66d2e)',
    tag: 'Suivi',
    roles: ['APPRENANT']
  },
  {
    id: 'terminal',
    path: 'http://192.168.0.1:5000/terminal.html',
    icon: Terminal,
    title: 'Terminal d\'examen',
    subtitle: 'Poste candidat',
    desc: 'Interface de composition pour les évaluations en salle',
    color: COLORS.secondary,
    gradient: 'linear-gradient(135deg, #5e4a7a, #6b5b7e)',
    tag: 'Examen',
    roles: ['APPRENANT'],
    external: true
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
    gradient: 'linear-gradient(135deg, #1e3a5f, #2d5a9c)'
  },
  {
    id: 'exam',
    title: 'Gestion des épreuves',
    subtitle: 'Composition · Distribution',
    icon: GraduationCap,
    modules: ['exams'],
    color: COLORS.success,
    gradient: 'linear-gradient(135deg, #1f6e48, #2b6e4f)'
  },
  {
    id: 'evaluation',
    title: 'Évaluation opérationnelle',
    subtitle: 'Supervision · Analyse · Rapports',
    icon: Activity,
    modules: ['surveillance', 'reports', 'teacher_reports'],
    color: COLORS.warning,
    gradient: 'linear-gradient(135deg, #9e5a2b, #b66d2e)'
  },
  {
    id: 'users',
    title: 'Administration',
    subtitle: 'Comptes · Sécurité · Rôles',
    icon: Shield,
    modules: ['user_management'],
    color: COLORS.danger,
    gradient: 'linear-gradient(135deg, #964b4b, #a94442)'
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

  const accessibleModules = ALL_MODULES.filter(mod =>
    mod.roles.some(role => hasRole(role))
  );

  const accessibleModulesMap = new Map(accessibleModules.map(m => [m.id, m]));

  const visibleGroups = INTEREST_GROUPS.filter(group =>
    group.modules.some(id => accessibleModulesMap.has(id))
  );

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleModuleClick = (mod) => {
    if (mod.external) {
      window.open(mod.path, '_blank');
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

  return (
    <div style={styles.app}>
      {/* Fond */}
      <div style={styles.bgPattern} />
      <div style={styles.bgGradient} />

      {/* Header */}
      <header style={styles.header}>
        <div style={styles.logo}>na²quiz · évaluation sommative</div>
        <div style={styles.headerActions}>
          {user && (
            <div style={styles.userBadge}>
              <User size={12} style={{ marginRight: 6 }} />
              {user.name?.split(' ')[0] || user.email?.split('@')[0]} · <span style={{ color: COLORS.primaryLight }}>{user.role}</span>
            </div>
          )}
          <button onClick={handleLogout} style={styles.iconButton}>
            <LogOutIcon size={14} /> Déconnexion
          </button>
          <button onClick={() => navigate('/')} style={styles.iconButton}>
            <HomeIcon size={14} /> Accueil
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
          <h1 style={styles.title}>Évaluation sommative</h1>
          <p style={styles.subtitle}>
            {user?.role === 'APPRENANT'
              ? 'Accédez à vos évaluations et suivez votre progression'
              : user?.role === 'OPERATEUR_EVALUATION'
              ? 'Pilotez et supervisez les sessions d\'examen en temps réel'
              : 'Concevez, validez et analysez les évaluations pédagogiques'}
          </p>
        </motion.div>

        {/* Groupes */}
        {visibleGroups.length === 0 ? (
          <div style={styles.emptyState}>
            <LayoutDashboard size={48} color={COLORS.textMuted} />
            <p>Aucun module accessible avec votre profil</p>
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
                          whileHover={{ y: -3 }}
                          whileTap={{ scale: 0.99 }}
                          onClick={() => handleModuleClick(mod)}
                          style={styles.card}
                          onMouseEnter={e => e.currentTarget.style.borderColor = `${mod.color}60`}
                          onMouseLeave={e => e.currentTarget.style.borderColor = COLORS.cardBorder}
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
      `}</style>
    </div>
  );
};

// ========== STYLES (harmonisés avec QCMBankPage) ==========
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
    backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(75,85,105,0.08) 1px, transparent 0)',
    backgroundSize: '32px 32px',
    pointerEvents: 'none',
    zIndex: 0
  },
  bgGradient: {
    position: 'fixed',
    top: '-30%',
    left: '30%',
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
    background: 'rgba(14, 22, 34, 0.85)',
    backdropFilter: 'blur(16px)',
    borderBottom: '1px solid rgba(75,85,105,0.2)',
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
    color: COLORS.text,
    opacity: 0.8,
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
    background: 'rgba(255,255,255,0.03)',
    padding: '4px 12px',
    borderRadius: '32px',
    border: '1px solid rgba(255,255,255,0.05)'
  },
  iconButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    padding: '4px 12px',
    borderRadius: '32px',
    background: 'rgba(255,255,255,0.02)',
    border: '1px solid rgba(255,255,255,0.05)',
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
    background: 'rgba(45,90,156,0.12)',
    border: '1px solid rgba(45,90,156,0.2)',
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
    textTransform: 'lowercase'
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
    borderBottom: '1px solid rgba(75,85,105,0.2)'
  },
  groupIcon: {
    width: '36px',
    height: '36px',
    borderRadius: '10px',
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
    borderRadius: '16px',
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  },
  cardIcon: {
    width: '42px',
    height: '42px',
    borderRadius: '12px',
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
    background: 'rgba(18,22,35,0.5)',
    borderRadius: '24px',
    border: '1px dashed rgba(75,85,105,0.3)'
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
    border: '1px solid rgba(169,68,66,0.3)',
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