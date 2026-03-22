// src/pages/RegisterPage.jsx — NA2Quiz Professional Design
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { UserPlus, Mail, Lock, User, AtSign, Loader2, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const RegisterPage = () => {
  const [form, setForm] = useState({ name: '', username: '', email: '', password: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const navigate = useNavigate();

  const set = (key) => (e) => setForm(f => ({ ...f, [key]: e.target.value }));

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirmPassword) { setError('Les mots de passe ne correspondent pas.'); return; }
    setIsLoading(true);
    try {
      const { data } = await axios.post(
        `${process.env.REACT_APP_BACKEND_URL || ""}/api/auth/register`,
        { name: form.name, username: form.username, email: form.email, password: form.password },
        { headers: { 'Content-Type': 'application/json' }, timeout: 10000 }
      );
      if (!data.token) throw new Error('Token manquant.');
      localStorage.setItem('userToken', data.token);
      localStorage.setItem('userData', JSON.stringify({ email: data.email, username: data.username, role: data.role, name: data.name, _id: data._id }));
      navigate('/evaluate');
    } catch (err) {
      let msg = "Erreur lors de l'inscription.";
      if (axios.isAxiosError(err)) {
        if (err.code === 'ECONNABORTED') msg = 'Le serveur ne répond pas.';
        else if (err.response?.status === 409) msg = 'Email ou nom d\'utilisateur déjà utilisé.';
        else if (err.response?.status === 400) msg = err.response.data?.message || 'Champs manquants ou invalides.';
        else if (err.message?.includes('Network Error')) msg = 'Problème de connexion réseau.';
        else msg = err.response?.data?.message || msg;
      } else { msg = err.message || msg; }
      setError(msg);
    } finally { setIsLoading(false); }
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

  const LabeledField = ({ label, icon: Icon, children }) => (
    <div style={{ marginBottom: '16px' }}>
      <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#94a3b8', marginBottom: '7px', letterSpacing: '0.02em' }}>
        {label}
      </label>
      <div style={{ position: 'relative' }}>
        <Icon size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
        {children}
      </div>
    </div>
  );

  const focusStyle = (e) => { e.target.style.borderColor = '#3b82f6'; e.target.style.boxShadow = '0 0 0 3px rgba(59,130,246,0.15)'; };
  const blurStyle = (e) => { e.target.style.borderColor = 'rgba(59,130,246,0.2)'; e.target.style.boxShadow = 'none'; };

  return (
    <div style={{
      minHeight: '100vh', fontFamily: "'DM Sans', sans-serif",
      background: 'linear-gradient(135deg, #05071a 0%, #0a0f2e 60%, #05071a 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '32px 24px', position: 'relative', overflow: 'hidden',
    }}>
      <div style={{
        position: 'fixed', inset: 0,
        backgroundImage: 'linear-gradient(rgba(59,130,246,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,0.035) 1px, transparent 1px)',
        backgroundSize: '40px 40px', pointerEvents: 'none',
      }} />
      <div style={{
        position: 'fixed', top: '-20%', left: '50%', transform: 'translateX(-50%)',
        width: '60vw', height: '50vh',
        background: 'radial-gradient(ellipse, rgba(124,58,237,0.12) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55 }}
        style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: '460px' }}
      >
        {/* Brand */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.5 }}
            style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: '64px', height: '64px', borderRadius: '16px',
              background: 'linear-gradient(135deg, #6d28d9, #2563eb)',
              marginBottom: '14px',
              boxShadow: '0 8px 32px rgba(109,40,217,0.4)',
            }}
          >
            <UserPlus size={26} color="#fff" strokeWidth={1.75} />
          </motion.div>
          <h1 style={{
            fontFamily: "'Sora', sans-serif",
            fontSize: '1.75rem', fontWeight: 800,
            letterSpacing: '-0.03em', color: '#f8fafc', marginBottom: '6px',
          }}>Créer un compte</h1>
          <p style={{ fontSize: '0.9rem', color: 'rgba(148,163,184,0.7)' }}>Rejoignez la plateforme NA²QUIZ</p>
        </div>

        {/* Card */}
        <div style={{
          background: 'rgba(15,23,42,0.75)',
          border: '1px solid rgba(139,92,246,0.15)',
          borderRadius: '20px', backdropFilter: 'blur(24px)',
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
                  padding: '12px 16px',
                  background: 'rgba(239,68,68,0.1)',
                  border: '1px solid rgba(239,68,68,0.3)',
                  borderLeft: '3px solid #ef4444',
                  borderRadius: '10px',
                  color: '#fca5a5', fontSize: '0.875rem',
                }}
              >
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleRegister} noValidate>
            {/* Name + Username row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <LabeledField label="Nom complet" icon={User}>
                <input type="text" value={form.name} onChange={set('name')} required
                  placeholder="Jean Dupont" autoComplete="name"
                  style={{ ...fieldStyle, paddingLeft: '42px' }}
                  onFocus={focusStyle} onBlur={blurStyle} />
              </LabeledField>
              <LabeledField label="Nom d'utilisateur" icon={AtSign}>
                <input type="text" value={form.username} onChange={set('username')} required
                  placeholder="jeandupont" autoComplete="username"
                  style={{ ...fieldStyle, paddingLeft: '42px' }}
                  onFocus={focusStyle} onBlur={blurStyle} />
              </LabeledField>
            </div>

            <LabeledField label="Adresse email" icon={Mail}>
              <input type="email" value={form.email} onChange={set('email')} required
                placeholder="votre@email.com" autoComplete="email"
                style={{ ...fieldStyle, paddingLeft: '42px' }}
                onFocus={focusStyle} onBlur={blurStyle} />
            </LabeledField>

            <LabeledField label="Mot de passe" icon={Lock}>
              <input
                type={showPwd ? 'text' : 'password'}
                value={form.password} onChange={set('password')} required
                placeholder="Minimum 6 caractères" autoComplete="new-password" minLength={6}
                style={{ ...fieldStyle, paddingLeft: '42px', paddingRight: '44px' }}
                onFocus={focusStyle} onBlur={blurStyle}
              />
              <button type="button" onClick={() => setShowPwd(v => !v)} style={{
                position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: '2px', display: 'flex',
              }}>
                {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </LabeledField>

            <LabeledField label="Confirmer le mot de passe" icon={Lock}>
              <input
                type={showPwd ? 'text' : 'password'}
                value={form.confirmPassword} onChange={set('confirmPassword')} required
                placeholder="Répétez le mot de passe" autoComplete="new-password" minLength={6}
                style={{ ...fieldStyle, paddingLeft: '42px' }}
                onFocus={focusStyle} onBlur={blurStyle}
              />
            </LabeledField>

            <motion.button
              type="submit" disabled={isLoading}
              whileHover={{ scale: isLoading ? 1 : 1.02 }}
              whileTap={{ scale: isLoading ? 1 : 0.98 }}
              style={{
                width: '100%', padding: '13px', marginTop: '8px',
                background: isLoading ? 'rgba(109,40,217,0.45)' : 'linear-gradient(135deg, #6d28d9 0%, #8b5cf6 60%, #2563eb 100%)',
                border: 'none', borderRadius: '10px',
                color: '#fff', fontFamily: "'DM Sans', sans-serif",
                fontSize: '0.9375rem', fontWeight: 700,
                cursor: isLoading ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                boxShadow: isLoading ? 'none' : '0 4px 20px rgba(109,40,217,0.4)',
              }}
            >
              {isLoading ? (
                <><Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> Création en cours…</>
              ) : (
                <>Créer mon compte <ArrowRight size={17} /></>
              )}
            </motion.button>
          </form>

          <div style={{ marginTop: '24px', textAlign: 'center' }}>
            <span style={{ fontSize: '0.875rem', color: '#475569' }}>Déjà un compte ? </span>
            <a href="/login" style={{ fontSize: '0.875rem', color: '#60a5fa', fontWeight: 600, textDecoration: 'none' }}>
              Se connecter
            </a>
          </div>
        </div>
      </motion.div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@700;800&family=DM+Sans:wght@400;500;600;700&display=swap');
        @keyframes spin { to { transform: rotate(360deg); } }
        input::placeholder { color: #475569; }
      `}</style>
    </div>
  );
};

export default RegisterPage;