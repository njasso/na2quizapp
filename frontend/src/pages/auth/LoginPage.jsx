// src/pages/auth/LoginPage.jsx - Version COMPLÈTE CORRIGÉE
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { Lock, Mail, Loader2, ArrowRight, Eye, EyeOff, Wifi, WifiOff, Server, CheckCircle, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

// ═══════════════════════════════════════════════════════════════
// CONFIGURATION DYNAMIQUE - DÉTECTION AUTO DE L'IP
// ═══════════════════════════════════════════════════════════════
const SERVER_PORT = 5000;
const currentHostname = window.location.hostname;

// Détection du type d'environnement
const isLocalhost = currentHostname === 'localhost' || currentHostname === '127.0.0.1';
const isLocalIP = /^(\d{1,3}\.){3}\d{1,3}$/.test(currentHostname) && 
                  (currentHostname.startsWith('192.168.') || 
                   currentHostname.startsWith('10.') || 
                   currentHostname.startsWith('172.'));

// Construction de l'URL backend
const getBackendUrl = () => {
  // 1. URL personnalisée stockée par l'utilisateur
  const savedUrl = localStorage.getItem('customBackendUrl');
  if (savedUrl) {
    console.log('[LoginPage] 📡 Backend personnalisé:', savedUrl);
    return savedUrl;
  }
  
  // 2. Détection automatique basée sur l'URL courante
  if (isLocalIP) {
    const url = `http://${currentHostname}:${SERVER_PORT}`;
    console.log('[LoginPage] 📡 Backend auto-détecté (IP locale):', url);
    return url;
  }
  
  if (isLocalhost) {
    const url = `http://localhost:${SERVER_PORT}`;
    console.log('[LoginPage] 📡 Backend auto-détecté (localhost):', url);
    return url;
  }
  
  // 3. Production (Render)
  console.log('[LoginPage] 📡 Backend production');
  return 'https://na2quizapp.onrender.com';
};

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [backendStatus, setBackendStatus] = useState('checking'); // checking, online, offline
  const [backendUrl, setBackendUrl] = useState(getBackendUrl());
  const [showSettings, setShowSettings] = useState(false);
  const [customIp, setCustomIp] = useState('');
  const [networkInfo, setNetworkInfo] = useState(null);
  const [availableIps, setAvailableIps] = useState([]);
  
  const navigate = useNavigate();
  const { login } = useAuth();

  // ═══════════════════════════════════════════════════════════════
  // 1. VÉRIFICATION DE LA CONNEXION BACKEND
  // ═══════════════════════════════════════════════════════════════
  const checkBackend = async (url) => {
    const testUrl = url || backendUrl;
    console.log('[LoginPage] 🔍 Vérification backend:', testUrl);
    setBackendStatus('checking');
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(`${testUrl}/health`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        console.log('[LoginPage] ✅ Backend accessible');
        setBackendStatus('online');
        return true;
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (err) {
      console.warn('[LoginPage] ❌ Backend inaccessible:', err.message);
      setBackendStatus('offline');
      return false;
    }
  };

  // ═══════════════════════════════════════════════════════════════
  // 2. RÉCUPÉRATION DES INFOS RÉSEAU DEPUIS LE SERVEUR
  // ═══════════════════════════════════════════════════════════════
  const fetchNetworkInfo = async () => {
    try {
      const response = await fetch(`${backendUrl}/api/network-info`);
      if (response.ok) {
        const data = await response.json();
        console.log('[LoginPage] 🌐 Infos réseau reçues:', data);
        setNetworkInfo(data);
        
        // Extraire les IPs disponibles
        if (data.localIPs && data.localIPs.length > 0) {
          const ips = data.localIPs.map(ip => ({
            ip: ip.ip,
            interface: ip.interface,
            url: ip.backendUrl || `http://${ip.ip}:${SERVER_PORT}`
          }));
          setAvailableIps(ips);
        }
        return data;
      } else {
        console.warn('[LoginPage] ⚠️ /api/network-info retourne', response.status);
      }
    } catch (err) {
      console.warn('[LoginPage] ⚠️ Impossible de récupérer les infos réseau:', err.message);
    }
    return null;
  };

  // ═══════════════════════════════════════════════════════════════
  // 3. INITIALISATION AU CHARGEMENT
  // ═══════════════════════════════════════════════════════════════
  useEffect(() => {
    const init = async () => {
      const isOnline = await checkBackend();
      if (isOnline) {
        await fetchNetworkInfo();
      }
    };
    init();
  }, []);

  // ═══════════════════════════════════════════════════════════════
  // 4. CHANGEMENT MANUEL DE L'URL BACKEND
  // ═══════════════════════════════════════════════════════════════
  const handleSetCustomBackend = async () => {
    if (!customIp.trim()) return;
    
    let newUrl = customIp;
    if (!newUrl.startsWith('http')) {
      newUrl = `http://${newUrl}:${SERVER_PORT}`;
    }
    
    setBackendUrl(newUrl);
    localStorage.setItem('customBackendUrl', newUrl);
    
    const isOnline = await checkBackend(newUrl);
    if (isOnline) {
      toast.success(`Connecté à ${newUrl}`);
      await fetchNetworkInfo();
    } else {
      toast.error(`Impossible de joindre ${newUrl}`);
    }
    
    setShowSettings(false);
    setCustomIp('');
  };

  // ═══════════════════════════════════════════════════════════════
  // 5. UTILISER UNE IP DÉTECTÉE AUTOMATIQUEMENT
  // ═══════════════════════════════════════════════════════════════
  const handleUseAutoIp = async (ipUrl) => {
    setBackendUrl(ipUrl);
    localStorage.setItem('customBackendUrl', ipUrl);
    
    const isOnline = await checkBackend(ipUrl);
    if (isOnline) {
      toast.success(`Connecté à ${ipUrl}`);
      await fetchNetworkInfo();
    } else {
      toast.error(`Impossible de joindre ${ipUrl}`);
    }
    
    setShowSettings(false);
  };

  // ═══════════════════════════════════════════════════════════════
  // 6. RÉINITIALISER À LA DÉTECTION AUTO
  // ═══════════════════════════════════════════════════════════════
  const handleResetToAuto = async () => {
    const autoUrl = getBackendUrl();
    setBackendUrl(autoUrl);
    localStorage.removeItem('customBackendUrl');
    
    const isOnline = await checkBackend(autoUrl);
    if (isOnline) {
      toast.success(`Retour à la détection automatique: ${autoUrl}`);
      await fetchNetworkInfo();
    } else {
      toast.error(`Le backend automatique ${autoUrl} est inaccessible`);
    }
    
    setShowSettings(false);
  };

  // ═══════════════════════════════════════════════════════════════
  // 7. LOGIN
  // ═══════════════════════════════════════════════════════════════
  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    
    const apiUrl = `${backendUrl}/api/auth/login`;
    
    try {
      console.log('[LoginPage] 📡 Appel API:', apiUrl);
      console.log('[LoginPage] 📧 Email:', email);
      
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
      console.log('[LoginPage] 📦 Réponse API:', data);
      console.log('[LoginPage] 🎭 Rôle reçu:', data.role);
      
      if (!data.token) {
        throw new Error('Token manquant dans la réponse.');
      }
      
      // Stockage des données utilisateur
      const userData = {
        _id: data._id || data.id,
        id: data._id || data.id,
        email: data.email,
        username: data.username || data.email,
        role: data.role || 'APPRENANT',
        name: data.name,
        matricule: data.matricule,
        isAdmin: data.isAdmin || false,
        token: data.token
      };
      
      console.log('[LoginPage] ✅ Utilisateur connecté:', userData.email);
      console.log('[LoginPage] 🎭 Rôle final:', userData.role);
      
      // Sauvegarder l'URL backend utilisée
      if (backendUrl !== getBackendUrl()) {
        localStorage.setItem('customBackendUrl', backendUrl);
      }
      
      login(userData, data.token);
      
      setTimeout(() => {
        toast.success(`Bienvenue ${userData.name || userData.email || '!'}`);
        
        // Redirection basée sur le rôle
        switch (userData.role) {
          case 'APPRENANT':
            navigate('/available-exams', { replace: true });
            break;
          case 'OPERATEUR_EVALUATION':
            navigate('/surveillance', { replace: true });
            break;
          case 'ENSEIGNANT':
          case 'SAISISEUR':
            navigate('/evaluate', { replace: true });
            break;
          case 'ADMIN_DELEGUE':
          case 'ADMIN_SYSTEME':
            navigate('/admin', { replace: true });
            break;
          default:
            navigate('/evaluate', { replace: true });
            break;
        }
      }, 100);
      
    } catch (err) {
      console.error('[LoginPage] ❌ Erreur:', err);
      
      if (err.response?.status === 401) {
        setError('Email ou mot de passe incorrect');
      } else if (err.code === 'ECONNABORTED' || err.message === 'Network Error') {
        setError(`Impossible de joindre le serveur à ${apiUrl}. Vérifiez que le backend est démarré sur le port ${SERVER_PORT}.`);
        setBackendStatus('offline');
      } else {
        setError(err.response?.data?.message || err.message || 'Erreur de connexion');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Styles (inchangés)
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
      {/* Fond avec grille */}
      <div style={{
        position: 'fixed',
        inset: 0,
        backgroundImage: 'linear-gradient(rgba(59,130,246,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,0.035) 1px, transparent 1px)',
        backgroundSize: '40px 40px',
        pointerEvents: 'none',
      }} />
      
      {/* Glow radial */}
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

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* INDICATEUR DE STATUT BACKEND */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <div style={{
        position: 'fixed',
        top: '16px',
        right: '16px',
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        background: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(8px)',
        padding: '6px 12px',
        borderRadius: '20px',
        fontSize: '0.7rem',
        cursor: 'pointer',
        border: '1px solid rgba(255,255,255,0.1)',
      }} onClick={() => setShowSettings(!showSettings)}>
        {backendStatus === 'online' && <Wifi size={12} color="#22c55e" />}
        {backendStatus === 'offline' && <WifiOff size={12} color="#ef4444" />}
        {backendStatus === 'checking' && <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} />}
        <Server size={12} color="#64748b" />
        <span style={{ color: '#94a3b8', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {backendUrl.replace('http://', '').replace(':5000', '')}
        </span>
      </div>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* PANEL DE CONFIGURATION BACKEND */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            style={{
              position: 'fixed',
              top: '70px',
              right: '16px',
              background: 'rgba(15,23,42,0.98)',
              backdropFilter: 'blur(16px)',
              border: '1px solid rgba(59,130,246,0.25)',
              borderRadius: '16px',
              padding: '16px',
              zIndex: 100,
              minWidth: '280px',
              maxWidth: '320px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <Server size={14} color="#60a5fa" />
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#e2e8f0' }}>
                Configuration du backend
              </span>
            </div>
            
            {/* IPs automatiquement détectées */}
            {availableIps.length > 0 && (
              <div style={{ marginBottom: '12px' }}>
                <div style={{ fontSize: '0.6rem', color: '#64748b', marginBottom: '6px' }}>
                  📡 Serveurs détectés sur le réseau :
                </div>
                {availableIps.map((ip, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleUseAutoIp(ip.url)}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      padding: '6px 10px',
                      background: backendUrl === ip.url ? 'rgba(59,130,246,0.2)' : 'rgba(255,255,255,0.03)',
                      border: `1px solid ${backendUrl === ip.url ? 'rgba(59,130,246,0.5)' : 'rgba(255,255,255,0.05)'}`,
                      borderRadius: '8px',
                      marginBottom: '4px',
                      fontSize: '0.7rem',
                      color: backendUrl === ip.url ? '#60a5fa' : '#94a3b8',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <span>{ip.ip}</span>
                    <span style={{ fontSize: '0.55rem', color: '#475569' }}>{ip.interface}</span>
                    {backendUrl === ip.url && <CheckCircle size={10} color="#22c55e" />}
                  </button>
                ))}
              </div>
            )}
            
            {/* Saisie manuelle */}
            <div style={{ marginBottom: '12px' }}>
              <div style={{ fontSize: '0.6rem', color: '#64748b', marginBottom: '6px' }}>
                ✏️ Saisir une IP manuellement :
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                <input
                  type="text"
                  value={customIp}
                  onChange={(e) => setCustomIp(e.target.value)}
                  placeholder="ex: 192.168.1.100"
                  style={{
                    flex: 1,
                    padding: '6px 10px',
                    background: 'rgba(0,0,0,0.4)',
                    border: '1px solid rgba(59,130,246,0.3)',
                    borderRadius: '8px',
                    color: '#e2e8f0',
                    fontSize: '0.7rem',
                  }}
                />
                <button
                  onClick={handleSetCustomBackend}
                  style={{
                    padding: '6px 12px',
                    background: '#3b82f6',
                    border: 'none',
                    borderRadius: '8px',
                    color: 'white',
                    fontSize: '0.7rem',
                    cursor: 'pointer',
                  }}
                >
                  OK
                </button>
              </div>
            </div>
            
            {/* Bouton reset */}
            <button
              onClick={handleResetToAuto}
              style={{
                width: '100%',
                padding: '6px',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px',
                color: '#94a3b8',
                fontSize: '0.65rem',
                cursor: 'pointer',
                marginBottom: '10px',
              }}
            >
              🔄 Réinitialiser à la détection automatique
            </button>
            
            {/* Status actuel */}
            <div style={{
              fontSize: '0.55rem',
              color: backendStatus === 'online' ? '#22c55e' : (backendStatus === 'offline' ? '#ef4444' : '#f59e0b'),
              textAlign: 'center',
              paddingTop: '8px',
              borderTop: '1px solid rgba(255,255,255,0.05)',
            }}>
              {backendStatus === 'online' && '✅ Serveur accessible'}
              {backendStatus === 'offline' && '❌ Serveur inaccessible'}
              {backendStatus === 'checking' && '⏳ Vérification...'}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* FORMULAIRE DE CONNEXION */}
      {/* ═══════════════════════════════════════════════════════════════ */}
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

        <div style={{
          background: 'rgba(15,23,42,0.75)',
          border: '1px solid rgba(59,130,246,0.15)',
          borderRadius: '20px',
          backdropFilter: 'blur(24px)',
          boxShadow: '0 8px 48px rgba(0,0,0,0.5)',
          padding: '36px',
        }}>
          {/* Message d'alerte si backend offline */}
          {backendStatus === 'offline' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              style={{
                marginBottom: '20px',
                padding: '12px',
                background: 'rgba(239,68,68,0.1)',
                border: '1px solid rgba(239,68,68,0.3)',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <AlertCircle size={16} color="#ef4444" />
              <span style={{ fontSize: '0.75rem', color: '#fca5a5' }}>
                Serveur backend inaccessible. Cliquez sur l'icône en haut à droite pour configurer l'IP.
              </span>
            </motion.div>
          )}

          {/* Message d'info réseau local */}
          {isLocalIP && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{
                marginBottom: '20px',
                padding: '8px 12px',
                background: 'rgba(59,130,246,0.1)',
                border: '1px solid rgba(59,130,246,0.2)',
                borderRadius: '10px',
                fontSize: '0.7rem',
                color: '#60a5fa',
                textAlign: 'center',
              }}
            >
              🌐 Connexion depuis le réseau local ({currentHostname})
            </motion.div>
          )}

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
              disabled={isLoading || backendStatus === 'offline'}
              whileHover={{ scale: (isLoading || backendStatus === 'offline') ? 1 : 1.02 }}
              whileTap={{ scale: (isLoading || backendStatus === 'offline') ? 1 : 0.98 }}
              style={{
                width: '100%',
                padding: '13px',
                background: (isLoading || backendStatus === 'offline') 
                  ? 'rgba(37,99,235,0.3)' 
                  : 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 60%, #7c3aed 100%)',
                border: 'none',
                borderRadius: '10px',
                color: '#fff',
                fontFamily: "'DM Sans', sans-serif",
                fontSize: '0.9375rem',
                fontWeight: 700,
                cursor: (isLoading || backendStatus === 'offline') ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: (isLoading || backendStatus === 'offline') ? 'none' : '0 4px 20px rgba(37,99,235,0.4)',
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