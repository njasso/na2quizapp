// src/pages/auth/LoginPage.jsx - Version production prête
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { Lock, Mail, Loader2, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

// ==================== CONFIGURATION DYNAMIQUE ====================
// Détection automatique de l'environnement
const getBackendUrl = () => {
  // En production (Netlify)
  if (process.env.NODE_ENV === 'production') {
    // Utiliser l'URL Render configurée dans les variables d'environnement Netlify
    const renderUrl = process.env.REACT_APP_BACKEND_URL;
    if (renderUrl) {
      return renderUrl;
    }
    // Fallback: utiliser le même domaine mais avec /api (si les fonctions Netlify sont utilisées)
    return '';
  }
  
  // En développement local
  if (process.env.NODE_ENV === 'development') {
    return process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';
  }
  
  // Fallback pour les cas non déterminés
  return process.env.REACT_APP_BACKEND_URL || 'http://192.168.0.1:5000';
};

const BACKEND_URL = getBackendUrl();

console.log('[LoginPage] 🌐 Backend URL:', BACKEND_URL || '/api (relatif)');

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    
    try {
      // Construction de l'URL - si BACKEND_URL est vide, utiliser le chemin relatif
      const apiUrl = BACKEND_URL 
        ? `${BACKEND_URL}/api/auth/login`
        : '/api/auth/login';
      
      console.log('[LoginPage] 📡 Appel API:', apiUrl);
      
      const response = await axios.post(
        apiUrl,
        { email, password },
        { 
          headers: { 'Content-Type': 'application/json' }, 
          timeout: 15000,
          withCredentials: false
        }
      );
      
      const data = response.data;
      
      if (!data.token) {
        throw new Error('Token manquant dans la réponse.');
      }
      
      // Stockage des données utilisateur
      const userData = {
        token: data.token,
        email: data.email,
        username: data.username || data.email,
        role: data.role || 'APPRENANT',
        name: data.name,
        _id: data._id,
        matricule: data.matricule,
        isAdmin: data.isAdmin || false
      };
      
      // Appel au contexte d'authentification
      login(userData, data.token);
      
      // Notification de bienvenue
      toast.success(`Bienvenue ${data.name || data.email || '!'}`);
      
      // Redirection vers le tableau de bord unifié
      navigate('/evaluate');
      
    } catch (err) {
      console.error('[LoginPage] ❌ Erreur:', err);
      
      // Gestion des erreurs
      if (err.response) {
        // Erreur serveur avec réponse
        const status = err.response.status;
        const message = err.response.data?.message || err.response.data?.error || 'Erreur de connexion';
        
        if (status === 401) {
          setError('Email ou mot de passe incorrect');
        } else if (status === 404) {
          setError('Serveur indisponible. Veuillez réessayer plus tard.');
        } else {
          setError(message);
        }
      } else if (err.code === 'ECONNABORTED') {
        setError('Le serveur ne répond pas. Vérifiez votre connexion.');
      } else if (err.message === 'Network Error') {
        setError('Impossible de joindre le serveur. Vérifiez votre connexion internet.');
      } else {
        setError(err.message || 'Une erreur est survenue');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const fieldStyle = {
    width: '100%',
    background: 'rgba(5,7,26,0.8)',
    border: '1px solid rgba(59,130,246,0.2)',
    borderRadius: '10px',
    color: '#e2e8f0',
    fontFamily: "'DM Sans', sans-serif",
    fontSize: '0.9375rem',
    padding: '12px 14px',
    outline: 'none',
    transition: 'border-color 0.2s, box-shadow 0.2s',
    boxSizing: 'border-box',
  };

  return (
    <div style={{
      minHeight: '100vh',
      fontFamily: "'DM Sans', sans-serif",
      background: 'linear-gradient(135deg, #05071a 0%, #0a0f2e 60%, #05071a 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Grille de fond */}
      <div style={{
        position: 'fixed',
        inset: 0,
        backgroundImage: 'linear-gradient(rgba(59,130,246,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,0.035) 1px, transparent 1px)',
        backgroundSize: '40px 40px',
        pointerEvents: 'none',
      }} />
      
      {/* Glow effect */}
      <div style={{
        position: 'fixed',
        top: '-20%',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '60vw',
        height: '50vh',
        background: 'radial-gradient(ellipse, rgba(37,99,235,0.14) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: [0.25, 0.1, 0.25, 1] }}
        style={{
          position: 'relative',
          zIndex: 1,
          width: '100%',
          maxWidth: '440px',
        }}
      >
        {/* Logo / Brand */}
        <div style={{ textAlign: 'center', marginBottom: '36px' }}>
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.5 }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '64px',
              height: '64px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, #1d4ed8, #7c3aed)',
              marginBottom: '16px',
              boxShadow: '0 8px 32px rgba(37,99,235,0.4)',
            }}
          >
            <span style={{
              fontFamily: "'Sora', sans-serif",
              fontWeight: 800,
              fontSize: '1.5rem',
              color: '#fff'
            }}>
              NA²
            </span>
          </motion.div>
          
          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            style={{
              fontFamily: "'Sora', sans-serif",
              fontSize: '1.75rem',
              fontWeight: 800,
              letterSpacing: '-0.03em',
              color: '#f8fafc',
              marginBottom: '6px',
            }}
          >
            Connexion
          </motion.h1>
          
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.25 }}
            style={{
              fontSize: '0.9rem',
              color: 'rgba(148,163,184,0.75)',
            }}
          >
            Accédez à votre espace d'évaluation NA²QUIZ
          </motion.p>
        </div>

        {/* Carte de connexion */}
        <div style={{
          background: 'rgba(15,23,42,0.75)',
          border: '1px solid rgba(59,130,246,0.15)',
          borderRadius: '20px',
          backdropFilter: 'blur(24px)',
          boxShadow: '0 8px 48px rgba(0,0,0,0.5)',
          padding: '36px',
        }}>
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                animate={{ opacity: 1, height: 'auto', marginBottom: '20px' }}
                exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                style={{
                  padding: '13px 16px',
                  background: 'rgba(239,68,68,0.1)',
                  border: '1px solid rgba(239,68,68,0.3)',
                  borderLeft: '3px solid #ef4444',
                  borderRadius: '10px',
                  color: '#fca5a5',
                  fontSize: '0.875rem',
                  lineHeight: 1.5,
                }}
              >
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleLogin} noValidate>
            <div style={{ marginBottom: '18px' }}>
              <label style={{
                display: 'block',
                fontSize: '0.8125rem',
                fontWeight: 600,
                color: '#94a3b8',
                marginBottom: '7px',
                letterSpacing: '0.02em',
              }}>
                Adresse email
              </label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} style={{
                  position: 'absolute',
                  left: '14px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#64748b'
                }} />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  autoComplete="username"
                  placeholder="votre@email.com"
                  style={{ ...fieldStyle, paddingLeft: '42px' }}
                  onFocus={e => {
                    e.target.style.borderColor = '#3b82f6';
                    e.target.style.boxShadow = '0 0 0 3px rgba(59,130,246,0.15)';
                  }}
                  onBlur={e => {
                    e.target.style.borderColor = 'rgba(59,130,246,0.2)';
                    e.target.style.boxShadow = 'none';
                  }}
                />
              </div>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{
                display: 'block',
                fontSize: '0.8125rem',
                fontWeight: 600,
                color: '#94a3b8',
                marginBottom: '7px',
                letterSpacing: '0.02em',
              }}>
                Mot de passe
              </label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} style={{
                  position: 'absolute',
                  left: '14px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#64748b'
                }} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  style={{ ...fieldStyle, paddingLeft: '42px', paddingRight: '44px' }}
                  onFocus={e => {
                    e.target.style.borderColor = '#3b82f6';
                    e.target.style.boxShadow = '0 0 0 3px rgba(59,130,246,0.15)';
                  }}
                  onBlur={e => {
                    e.target.style.borderColor = 'rgba(59,130,246,0.2)';
                    e.target.style.boxShadow = 'none';
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#64748b',
                    padding: '2px',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <div style={{ textAlign: 'right', marginTop: '7px' }}>
                <Link to="/forgot-password" style={{
                  fontSize: '0.8rem',
                  color: '#60a5fa',
                  textDecoration: 'none',
                }}>
                  Mot de passe oublié ?
                </Link>
              </div>
            </div>

            <motion.button
              type="submit"
              disabled={isLoading}
              whileHover={{ scale: isLoading ? 1 : 1.02 }}
              whileTap={{ scale: isLoading ? 1 : 0.98 }}
              style={{
                width: '100%',
                padding: '13px',
                background: isLoading ? 'rgba(37,99,235,0.5)' : 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 60%, #7c3aed 100%)',
                border: 'none',
                borderRadius: '10px',
                color: '#fff',
                fontFamily: "'DM Sans', sans-serif",
                fontSize: '0.9375rem',
                fontWeight: 700,
                cursor: isLoading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: isLoading ? 'none' : '0 4px 20px rgba(37,99,235,0.4)',
              }}
            >
              {isLoading ? (
                <>
                  <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
                  Connexion en cours…
                </>
              ) : (
                <>
                  Se connecter
                  <ArrowRight size={17} />
                </>
              )}
            </motion.button>
          </form>

          <div style={{ marginTop: '28px', textAlign: 'center' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '18px',
            }}>
              <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.07)' }} />
              <span style={{ fontSize: '0.8rem', color: '#475569' }}>Pas encore de compte ?</span>
              <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.07)' }} />
            </div>
            <Link
              to="/register"
              style={{
                display: 'block',
                padding: '11px',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '10px',
                color: '#cbd5e1',
                fontSize: '0.9rem',
                fontWeight: 500,
                textDecoration: 'none',
                textAlign: 'center',
                transition: 'background 0.2s',
              }}
              onMouseEnter={e => e.target.style.background = 'rgba(255,255,255,0.09)'}
              onMouseLeave={e => e.target.style.background = 'rgba(255,255,255,0.05)'}
            >
              Créer un compte
            </Link>
          </div>
        </div>
      </motion.div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@700;800&family=DM+Sans:wght@400;500;600;700&display=swap');
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        input::placeholder {
          color: #475569;
        }
        * {
          box-sizing: border-box;
        }
      `}</style>
    </div>
  );
};

export default LoginPage;