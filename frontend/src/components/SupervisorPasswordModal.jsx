// src/components/SupervisorPasswordModal.jsx
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, Lock, X, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const SUPERVISOR_PASSWORD = 'NA2ADMIN2026'; // À stocker dans .env en production

const SupervisorPasswordModal = ({ isOpen, onClose, onSuccess, title, message }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    
    setTimeout(() => {
      if (password === SUPERVISOR_PASSWORD) {
        toast.success('Accès autorisé');
        onSuccess();
        setPassword('');
        onClose();
      } else {
        setError('Mot de passe incorrect');
        toast.error('Mot de passe incorrect');
      }
      setIsLoading(false);
    }, 500);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '20px'
      }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        style={{
          background: '#0f172a', border: '1px solid rgba(139,92,246,0.3)',
          borderRadius: 20, padding: 32, width: '100%', maxWidth: 400,
          textAlign: 'center'
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{
          width: 64, height: 64, borderRadius: '50%',
          background: 'rgba(139,92,246,0.15)', border: '2px solid #8b5cf6',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 20px'
        }}>
          <Shield size={32} color="#8b5cf6" />
        </div>
        
        <h3 style={{ color: '#f8fafc', fontSize: '1.2rem', fontWeight: 700, marginBottom: 8 }}>
          {title || 'Accès superviseur'}
        </h3>
        
        <p style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: 20 }}>
          {message || 'Veuillez entrer le mot de passe superviseur pour continuer.'}
        </p>
        
        <form onSubmit={handleSubmit}>
          <div style={{ position: 'relative', marginBottom: 16 }}>
            <Lock size={16} style={{
              position: 'absolute', left: 12, top: '50%',
              transform: 'translateY(-50%)', color: '#64748b'
            }} />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mot de passe superviseur"
              autoFocus
              style={{
                width: '100%', padding: '12px 12px 12px 40px',
                background: 'rgba(255,255,255,0.05)',
                border: `1px solid ${error ? '#ef4444' : 'rgba(139,92,246,0.2)'}`,
                borderRadius: 10, color: '#f8fafc',
                outline: 'none'
              }}
            />
          </div>
          
          {error && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: 8, background: 'rgba(239,68,68,0.1)',
              borderRadius: 8, marginBottom: 16, color: '#ef4444',
              fontSize: '0.75rem'
            }}>
              <AlertCircle size={14} /> {error}
            </div>
          )}
          
          <div style={{ display: 'flex', gap: 12 }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                flex: 1, padding: '10px', background: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8,
                color: '#94a3b8', cursor: 'pointer'
              }}
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isLoading}
              style={{
                flex: 1, padding: '10px',
                background: isLoading ? 'rgba(139,92,246,0.5)' : 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
                border: 'none', borderRadius: 8, color: '#fff',
                fontWeight: 600, cursor: isLoading ? 'not-allowed' : 'pointer'
              }}
            >
              {isLoading ? 'Vérification...' : 'Valider'}
            </button>
          </div>
        </form>
        
        <p style={{ fontSize: '0.6rem', color: '#475569', marginTop: 16 }}>
          Contactez l'administrateur si vous avez perdu le mot de passe
        </p>
      </motion.div>
    </motion.div>
  );
};

export default SupervisorPasswordModal;