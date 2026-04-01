// src/pages/HomePage.jsx
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FiHome, FiBook, FiDatabase, FiCpu, FiMonitor, 
  FiClock, FiAward, FiBarChart2, FiUsers
} from 'react-icons/fi';
import { 
  Bot, Sparkles, Shield, Zap, Eye, BookOpen,
  Award, BarChart3, CheckCircle, Lock, Clock, Users
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import './HomePage.css';

// ✅ Définir l'URL du backend
const NODE_BACKEND_URL = process.env.NODE_ENV === 'production' 
  ? (process.env.REACT_APP_BACKEND_URL || '')
  : 'http://localhost:5000';

// ✅ URL de la vidéo YouTube de démo
const DEMO_VIDEO_URL = 'https://youtu.be/EADlStlCA5I';

const HomePage = () => {
  const navigate = useNavigate();
  const audioRef = useRef(null);
  const [isInteracted, setIsInteracted] = useState(false);
  const [showFeatures, setShowFeatures] = useState(false);
  const [activeFeature, setActiveFeature] = useState(null);

  // Gestion de l'interaction utilisateur
  const handleUserInteraction = useCallback(() => {
    if (!isInteracted) {
      setIsInteracted(true);
      try {
        audioRef.current?.play();
      } catch (err) {
        console.warn("Échec de la lecture audio:", err);
      }
    }
  }, [isInteracted]);

  // Écouteur d'événements global
  useEffect(() => {
    const interactionTypes = ['click', 'keydown', 'touchstart'];
    interactionTypes.forEach(type => {
      window.addEventListener(type, handleUserInteraction, { once: true });
    });
    return () => {
      interactionTypes.forEach(type => {
        window.removeEventListener(type, handleUserInteraction);
      });
    };
  }, [handleUserInteraction]);

  // Redirige vers la page d'évaluation sommative
  const handleEnter = useCallback(() => {
    navigate('/evaluate');
  }, [navigate]);

  // ✅ Nouvelle fonction pour ouvrir la vidéo de démo
  const handleDemoClick = useCallback(() => {
    // Ouvre le lien YouTube dans un nouvel onglet
    window.open(DEMO_VIDEO_URL, '_blank', 'noopener,noreferrer');
  }, []);

  // Données des fonctionnalités principales
  const mainFeatures = [
    {
      id: 1,
      icon: <FiBook size={28} />,
      lucideIcon: <BookOpen size={28} />,
      title: "Création Manuelle",
      description: "Rédigez vos questions une par une avec un contrôle total sur chaque détail",
      longDescription: "Interface intuitive pour créer des épreuves personnalisées. Ajoutez, modifiez et organisez vos questions avec précision.",
      color: "#3b82f6",
      gradient: "linear-gradient(135deg, #1d4ed8, #3b82f6)",
      tag: "Personnalisé",
      stats: { questions: "Illimité", format: "QCM", export: "PDF/Word" }
    },
    {
      id: 2,
      icon: <FiDatabase size={28} />,
      lucideIcon: <FiDatabase size={28} />,
      title: "Base de Données",
      description: "Composez votre épreuve depuis notre catalogue de questions existantes",
      longDescription: "Accédez à une bibliothèque de milliers de questions classées par domaine, niveau et matière.",
      color: "#ef4444",
      gradient: "linear-gradient(135deg, #b91c1c, #ef4444)",
      tag: "Catalogue",
      stats: { questions: "5000+", catégories: "25+", niveaux: "12" }
    },
    {
      id: 3,
      icon: <FiCpu size={28} />,
      lucideIcon: <Bot size={28} />,
      title: "Génération par IA",
      description: "L'intelligence artificielle génère des questions adaptées à vos critères",
      longDescription: "DeepSeek AI analyse vos besoins et génère automatiquement des questions pertinentes avec réponses.",
      color: "#8b5cf6",
      gradient: "linear-gradient(135deg, #6d28d9, #8b5cf6)",
      tag: "IA · DeepSeek",
      isNew: true,
      stats: { temps: "30s", pertinence: "95%", adaptation: "Automatique" }
    },
    {
      id: 4,
      icon: <FiMonitor size={28} />,
      lucideIcon: <Eye size={28} />,
      title: "Surveillance",
      description: "Supervisez les sessions d'examens en cours en temps réel",
      longDescription: "Tableau de bord complet pour suivre la progression des étudiants et détecter les anomalies.",
      color: "#f59e0b",
      gradient: "linear-gradient(135deg, #b45309, #f59e0b)",
      tag: "Temps réel",
      stats: { sessions: "Multiples", alertes: "Instantannées", rapports: "Détaillés" }
    },
    {
      id: 5,
      icon: <FiBarChart2 size={28} />,
      lucideIcon: <BarChart3 size={28} />,
      title: "Rapports & Analyses",
      description: "Analysez les résultats, classements et exportez les bulletins",
      longDescription: "Statistiques détaillées, graphiques de performance et génération automatique de bulletins PDF.",
      color: "#10b981",
      gradient: "linear-gradient(135deg, #047857, #10b981)",
      tag: "Analytics",
      stats: { formats: "PDF/Excel", graphiques: "Temps réel", classement: "Automatique" }
    },
    {
      id: 6,
      icon: <FiUsers size={28} />,
      lucideIcon: <Users size={28} />,
      title: "Gestion des Élèves",
      description: "Gérez les profils, les inscriptions et les historiques",
      longDescription: "Base de données élèves, suivi individuel, historique complet des examens passés.",
      color: "#ec4899",
      gradient: "linear-gradient(135deg, #9d174d, #ec4899)",
      tag: "Administration",
      stats: { profils: "Illimités", historique: "Complet", export: "CSV" }
    }
  ];

  // Options d'examen
  const examOptions = [
    { letter: "A", name: "Collective Figée", description: "Tous les étudiants voient la même question en même temps", color: "#3b82f6" },
    { letter: "B", name: "Collective Souple", description: "Questions collectives mais progression individuelle", color: "#10b981" },
    { letter: "C", name: "Personnalisée", description: "Chaque étudiant a son propre parcours", color: "#8b5cf6" },
    { letter: "D", name: "Aléatoire", description: "Questions mélangées pour chaque étudiant", color: "#f59e0b" }
  ];

  // Statistiques globales
  const globalStats = [
    { value: "5000+", label: "Questions", icon: <FiBook size={20} />, color: "#3b82f6" },
    { value: "1200+", label: "Élèves", icon: <FiUsers size={20} />, color: "#10b981" },
    { value: "98%", label: "Satisfaction", icon: <FiAward size={20} />, color: "#8b5cf6" },
    { value: "24/7", label: "Disponibilité", icon: <FiClock size={20} />, color: "#f59e0b" }
  ];

  // Technologies utilisées
  const technologies = [
    { name: "React", icon: "⚛️" },
    { name: "Node.js", icon: "🟢" },
    { name: "MongoDB", icon: "🍃" },
    { name: "Socket.io", icon: "🔌" },
    { name: "DeepSeek AI", icon: "🤖" },
    { name: "Framer Motion", icon: "🎭" }
  ];

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <div className="home-container" onClick={handleUserInteraction}>
      {/* Effets d'arrière-plan */}
      <div className="home-grid-overlay" />
      <div className="home-glow-effect" />
      <div className="home-gradient-orb orb-1" />
      <div className="home-gradient-orb orb-2" />

      <motion.div 
        className="home-content"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        {/* En-tête avec navigation */}
        <header className="home-header">
          <motion.button 
            onClick={() => navigate('/')} 
            className="home-nav-button"
            whileHover={{ scale: 1.05, backgroundColor: 'rgba(59,130,246,0.2)' }}
            whileTap={{ scale: 0.95 }}
            aria-label="Accueil"
          >
            <FiHome size={20} />
            <span>Accueil</span>
          </motion.button>

          <motion.div 
            className="home-logo"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <span className="logo-na">NA</span>
            <span className="logo-square">²</span>
            <span className="logo-quiz">QUIZ</span>
            <span className="logo-badge">v2.0 Pro</span>
          </motion.div>

          <motion.div 
            className="home-actions"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <button className="action-button" onClick={() => navigate('/login')}>
              Connexion
            </button>
            <button className="action-button primary" onClick={() => navigate('/register')}>
              Inscription
            </button>
          </motion.div>
        </header>

        {/* Section Hero principale */}
        <main className="home-main">
          <motion.div 
            className="hero-section"
            variants={containerVariants}
            initial="hidden"
            animate="show"
          >
            <motion.div variants={itemVariants} className="hero-badge">
              <Sparkles size={16} />
              <span>Plateforme d'Évaluation Intelligente</span>
            </motion.div>

            <motion.h1 variants={itemVariants} className="hero-title">
              NA<span className="hero-title-accent">²</span>QUIZ
            </motion.h1>

            <motion.p variants={itemVariants} className="hero-subtitle">
              La solution complète pour créer, gérer et superviser vos examens
              <br />avec intelligence artificielle et suivi en temps réel
            </motion.p>

            <motion.div variants={itemVariants} className="hero-cta">
              <motion.button
                onClick={handleEnter}
                className="cta-primary"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onMouseEnter={() => setShowFeatures(true)}
                onMouseLeave={() => setShowFeatures(false)}
              >
                <span>Commencer maintenant</span>
                <Sparkles size={20} />
              </motion.button>

              {/* ✅ Bouton "Voir la démo" modifié avec lien YouTube */}
              <motion.button
                onClick={handleDemoClick}
                className="cta-secondary"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <span>Voir la démo</span>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginLeft: 8 }}>
                  <path d="M10 15L15 12L10 9V15Z" fill="currentColor"/>
                  <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 20C7.58 20 4 16.42 4 12C4 7.58 7.58 4 12 4C16.42 4 20 7.58 20 12C20 16.42 16.42 20 12 20Z" fill="currentColor"/>
                </svg>
              </motion.button>
            </motion.div>

            {/* Statistiques rapides */}
            <motion.div variants={itemVariants} className="quick-stats">
              {globalStats.map((stat, index) => (
                <motion.div 
                  key={index}
                  className="stat-card"
                  whileHover={{ y: -5 }}
                  style={{ borderLeft: `3px solid ${stat.color}` }}
                >
                  <div className="stat-icon" style={{ color: stat.color }}>
                    {stat.icon}
                  </div>
                  <div className="stat-info">
                    <span className="stat-value">{stat.value}</span>
                    <span className="stat-label">{stat.label}</span>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>

          {/* Section des fonctionnalités principales */}
          <motion.div 
            className="features-wrapper"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <div className="features-header">
              <h2>Fonctionnalités principales</h2>
              <p>Tout ce dont vous avez besoin pour une évaluation professionnelle</p>
            </div>

            <div className="features-grid">
              {mainFeatures.map((feature, index) => (
                <motion.div
                  key={feature.id}
                  className="feature-card"
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 + index * 0.1 }}
                  whileHover={{ y: -8, scale: 1.02 }}
                  onMouseEnter={() => setActiveFeature(feature.id)}
                  onMouseLeave={() => setActiveFeature(null)}
                  style={{
                    background: `linear-gradient(135deg, ${feature.color}08, transparent)`,
                    borderTop: `2px solid ${feature.color}30`,
                  }}
                >
                  <div className="feature-icon-wrapper" style={{ background: feature.gradient }}>
                    {feature.lucideIcon}
                    {feature.isNew && <span className="feature-new-badge">Nouveau</span>}
                  </div>

                  <div className="feature-content">
                    <div className="feature-header">
                      <h3>{feature.title}</h3>
                      <span className="feature-tag" style={{ color: feature.color }}>
                        {feature.tag}
                      </span>
                    </div>

                    <p className="feature-description">{feature.description}</p>

                    <AnimatePresence>
                      {activeFeature === feature.id && (
                        <motion.div 
                          className="feature-details"
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                        >
                          <p className="feature-long-description">{feature.longDescription}</p>
                          <div className="feature-stats">
                            {Object.entries(feature.stats).map(([key, value]) => (
                              <div key={key} className="feature-stat-item">
                                <span className="stat-key">{key}:</span>
                                <span className="stat-value" style={{ color: feature.color }}>
                                  {value}
                                </span>
                              </div>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Section des options d'examen */}
          <motion.div 
            className="exam-options-section"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9 }}
          >
            <div className="section-header">
              <h2>Options d'examen</h2>
              <p>4 modes adaptés à tous vos besoins pédagogiques</p>
            </div>

            <div className="options-grid">
              {examOptions.map((option, index) => (
                <motion.div
                  key={option.letter}
                  className="option-card"
                  whileHover={{ scale: 1.05, rotate: 1 }}
                  style={{ borderColor: `${option.color}40` }}
                >
                  <div className="option-letter" style={{ background: option.color }}>
                    {option.letter}
                  </div>
                  <h3>{option.name}</h3>
                  <p>{option.description}</p>
                  <div className="option-badge" style={{ background: `${option.color}20`, color: option.color }}>
                    Option {option.letter}
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Section Technologies */}
          <motion.div 
            className="tech-section"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.1 }}
          >
            <div className="section-header">
              <h2>Technologies utilisées</h2>
              <p>Une stack moderne et performante</p>
            </div>

            <div className="tech-grid">
              {technologies.map((tech, index) => (
                <motion.div
                  key={tech.name}
                  className="tech-card"
                  whileHover={{ y: -5, scale: 1.05 }}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 1.2 + index * 0.05 }}
                >
                  <span className="tech-icon">{tech.icon}</span>
                  <span className="tech-name">{tech.name}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Section Avantages */}
          <motion.div 
            className="benefits-section"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.3 }}
          >
            <div className="benefits-grid">
              <motion.div 
                className="benefit-card"
                whileHover={{ scale: 1.02 }}
                style={{ borderColor: '#3b82f6' }}
              >
                <Lock size={24} color="#3b82f6" />
                <h3>Sécurisé</h3>
                <p>Authentification robuste et protection des données</p>
              </motion.div>

              <motion.div 
                className="benefit-card"
                whileHover={{ scale: 1.02 }}
                style={{ borderColor: '#10b981' }}
              >
                <Zap size={24} color="#10b981" />
                <h3>Temps réel</h3>
                <p>Mise à jour instantanée avec Socket.io</p>
              </motion.div>

              <motion.div 
                className="benefit-card"
                whileHover={{ scale: 1.02 }}
                style={{ borderColor: '#8b5cf6' }}
              >
                <CheckCircle size={24} color="#8b5cf6" />
                <h3>Fiable</h3>
                <p>Tests automatisés et sauvegarde MongoDB</p>
              </motion.div>

              <motion.div 
                className="benefit-card"
                whileHover={{ scale: 1.02 }}
                style={{ borderColor: '#f59e0b' }}
              >
                <Award size={24} color="#f59e0b" />
                <h3>Professionnel</h3>
                <p>Interface moderne et responsive</p>
              </motion.div>
            </div>
          </motion.div>

          {/* Section Témoignages */}
          <motion.div 
            className="testimonials-section"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.4 }}
          >
            <div className="section-header">
              <h2>Ils nous font confiance</h2>
            </div>

            <div className="testimonials-grid">
              <div className="testimonial-card">
                <p>"Une plateforme exceptionnelle qui a révolutionné nos évaluations."</p>
                <div className="testimonial-author">
                  <strong>Jean Dupont</strong>
                  <span>Professeur de Mathématiques</span>
                </div>
              </div>

              <div className="testimonial-card">
                <p>"L'IA génère des questions pertinentes, un gain de temps considérable."</p>
                <div className="testimonial-author">
                  <strong>Marie Lambert</strong>
                  <span>Directrice pédagogique</span>
                </div>
              </div>

              <div className="testimonial-card">
                <p>"Le suivi en temps réel est incroyablement utile pour la surveillance."</p>
                <div className="testimonial-author">
                  <strong>Pierre Martin</strong>
                  <span>Surveillant</span>
                </div>
              </div>
            </div>
          </motion.div>
        </main>

        {/* Pied de page */}
        <footer className="home-footer">
          <div className="footer-content">
            <div className="footer-section">
              <h4>NA²QUIZ</h4>
              <p>Plateforme d'évaluation intelligente</p>
              <p>Propulsé par DeepSeek AI</p>
            </div>

            <div className="footer-section">
              <h4>Liens rapides</h4>
              <ul>
                <li><button onClick={() => navigate('/evaluate')}>Évaluation</button></li>
                <li><button onClick={() => navigate('/exams')}>Examens</button></li>
                <li><button onClick={() => navigate('/reports')}>Rapports</button></li>
                <li><button onClick={() => navigate('/surveillance')}>Surveillance</button></li>
              </ul>
            </div>

            <div className="footer-section">
              <h4>Légal</h4>
              <ul>
                <li><button>Mentions légales</button></li>
                <li><button>Politique de confidentialité</button></li>
                <li><button>CGU</button></li>
              </ul>
            </div>

            <div className="footer-section">
              <h4>Contact</h4>
              <p>africanutindustry@outlook.com</p>
              <p>+237 620 37 02 86</p>
              <div className="social-links">
                <span className="social-icon">📘</span>
                <span className="social-icon">🐦</span>
                <span className="social-icon">📷</span>
                <span className="social-icon">💼</span>
              </div>
            </div>
          </div>

          <div className="footer-bottom">
            <p>© 2024 NA²QUIZ - Tous droits réservés</p>
            <p>Version 2.0.0 - Dernière mise à jour: Février 2024</p>
          </div>
        </footer>

        {/* Audio de bienvenue */}
        <audio 
          ref={audioRef} 
          src="/audio/bienvenue.mp3" 
          preload="metadata"
          aria-label="Message de bienvenue audio"
        />
      </motion.div>
    </div>
  );
};

export default HomePage;