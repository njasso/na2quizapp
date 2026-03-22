import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Lock, Mail, Loader2, LogIn } from 'lucide-react';
import { motion } from 'framer-motion';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const config = {
        headers: { 'Content-Type': 'application/json' },
        timeout: 10000,
      };

      const { data } = await axios.post(
        `${process.env.REACT_APP_BACKEND_URL || ""}/api/auth/login`,
        { email, password },
        config
      );

      if (!data.token) {
        throw new Error('Invalid server response: authentication token missing.');
      }

      localStorage.setItem('userToken', data.token);
      localStorage.setItem('userInfo', JSON.stringify({
        email: data.email,
        username: data.username,
        role: data.role,
        name: data.name,
        _id: data._id,
        token: data.token,
      }));

      navigate('/evaluate');

    } catch (err) {
      let errorMessage = "Connection error. Please try again.";

      if (axios.isAxiosError(err)) {
        if (err.code === 'ECONNABORTED') {
          errorMessage = "Server did not respond in time. Please try again.";
        } else if (err.response) {
          switch (err.response.status) {
            case 400:
              errorMessage = err.response.data?.message || "Invalid request (missing fields or bad data).";
              break;
            case 401:
              errorMessage = err.response.data?.message || "Invalid email or password.";
              break;
            case 404:
              errorMessage = err.response.data?.message || "Login endpoint not found. Please check API URL configuration.";
              break;
            case 500:
              errorMessage = err.response.data?.message || "Server error. Please try again later.";
              break;
            default:
              errorMessage = err.response.data?.message || `An unknown error occurred (Status: ${err.response.status}).`;
          }
        } else if (err.message.includes('Network Error')) {
          errorMessage = "Network error. Please check your internet connection.";
        }
      } else {
        errorMessage = err.message || "An unexpected error occurred.";
      }

      setError(errorMessage);
      console.error("Login error details:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      fontFamily: "'DM Sans', sans-serif",
      background: 'linear-gradient(135deg, #05071a 0%, #0a0f2e 60%, #05071a 100%)',
      position: 'relative',
      overflow: 'hidden',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
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

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        style={{
          position: 'relative',
          zIndex: 1,
          width: '100%',
          maxWidth: '440px',
          background: 'rgba(15,23,42,0.7)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(59,130,246,0.15)',
          borderRadius: '24px',
          padding: '40px 32px',
          boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            fontFamily: "'Sora', sans-serif",
            fontWeight: 800,
            fontSize: '2rem',
            letterSpacing: '-0.02em',
            background: 'linear-gradient(135deg, #60a5fa, #a78bfa)',
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            color: 'transparent',
            marginBottom: '8px',
          }}>
            NA²QUIZ
          </div>
          <p style={{ fontSize: '0.9375rem', color: 'rgba(203,213,225,0.7)' }}>
            Accédez à votre espace d'évaluation
          </p>
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              marginBottom: '24px',
              padding: '12px 16px',
              background: 'rgba(239,68,68,0.1)',
              border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: '12px',
              color: '#ef4444',
              fontSize: '0.875rem',
            }}
          >
            {error}
          </motion.div>
        )}

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <label htmlFor="email" style={{
              display: 'block',
              fontSize: '0.875rem',
              fontWeight: 500,
              color: '#94a3b8',
              marginBottom: '6px',
            }}>
              Adresse email
            </label>
            <div style={{ position: 'relative' }}>
              <Mail size={18} style={{
                position: 'absolute',
                left: '14px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#64748b',
              }} />
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '14px 14px 14px 42px',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(59,130,246,0.2)',
                  borderRadius: '12px',
                  color: '#f8fafc',
                  fontSize: '0.9375rem',
                  outline: 'none',
                  transition: 'border-color 0.2s',
                }}
                onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                onBlur={(e) => e.target.style.borderColor = 'rgba(59,130,246,0.2)'}
                placeholder="votre@email.com"
              />
            </div>
          </div>

          <div>
            <label htmlFor="password" style={{
              display: 'block',
              fontSize: '0.875rem',
              fontWeight: 500,
              color: '#94a3b8',
              marginBottom: '6px',
            }}>
              Mot de passe
            </label>
            <div style={{ position: 'relative' }}>
              <Lock size={18} style={{
                position: 'absolute',
                left: '14px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#64748b',
              }} />
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '14px 14px 14px 42px',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(59,130,246,0.2)',
                  borderRadius: '12px',
                  color: '#f8fafc',
                  fontSize: '0.9375rem',
                  outline: 'none',
                }}
                onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                onBlur={(e) => e.target.style.borderColor = 'rgba(59,130,246,0.2)'}
                placeholder="••••••••"
              />
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                style={{
                  width: '16px',
                  height: '16px',
                  accentColor: '#3b82f6',
                }}
              />
              <span style={{ fontSize: '0.875rem', color: '#94a3b8' }}>
                Se souvenir de moi
              </span>
            </label>

            <a
              href="/forgot-password"
              style={{
                fontSize: '0.875rem',
                color: '#3b82f6',
                textDecoration: 'none',
                transition: 'color 0.2s',
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = '#60a5fa'}
              onMouseLeave={(e) => e.currentTarget.style.color = '#3b82f6'}
            >
              Mot de passe oublié ?
            </a>
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={isLoading}
            style={{
              marginTop: '16px',
              width: '100%',
              padding: '16px',
              background: isLoading
                ? 'rgba(59,130,246,0.3)'
                : 'linear-gradient(135deg, #3b82f6, #2563eb)',
              border: 'none',
              borderRadius: '12px',
              color: '#fff',
              fontSize: '1rem',
              fontWeight: 600,
              cursor: isLoading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: '0 4px 20px rgba(59,130,246,0.3)',
            }}
          >
            {isLoading ? (
              <>
                <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
                Connexion en cours...
              </>
            ) : (
              <>
                <LogIn size={18} />
                Se connecter
              </>
            )}
          </motion.button>
        </form>

        <div style={{ marginTop: '32px', textAlign: 'center' }}>
          <div style={{
            position: 'relative',
            marginBottom: '24px',
          }}>
            <div style={{
              position: 'absolute',
              top: '50%',
              left: 0,
              right: 0,
              height: '1px',
              background: 'rgba(59,130,246,0.2)',
            }} />
            <span style={{
              position: 'relative',
              background: 'rgba(15,23,42,0.7)',
              padding: '0 16px',
              color: '#94a3b8',
              fontSize: '0.875rem',
            }}>
              Pas encore de compte ?
            </span>
          </div>

          <a
            href="/register"
            style={{
              display: 'inline-block',
              padding: '12px 24px',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(59,130,246,0.2)',
              borderRadius: '10px',
              color: '#cbd5e1',
              fontSize: '0.9375rem',
              fontWeight: 500,
              textDecoration: 'none',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(59,130,246,0.1)';
              e.currentTarget.style.borderColor = '#3b82f6';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
              e.currentTarget.style.borderColor = 'rgba(59,130,246,0.2)';
            }}
          >
            Créer un compte
          </a>
        </div>
      </motion.div>

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
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default LoginPage;