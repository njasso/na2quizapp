// src/pages/UserManagementPage.jsx - Version corrigée avec support complet de l'authentification
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import axios from 'axios';
import { toast, Toaster } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, Plus, Trash2, Edit, Save, X, Search, 
  ChevronLeft, ChevronRight, Download, RefreshCw,
  Filter, Mail, User, Key, Shield, AlertCircle,
  CheckCircle, XCircle, Eye, EyeOff, ArrowLeft, Home
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const NODE_BACKEND_URL = process.env.NODE_ENV === 'production' 
  ? (process.env.REACT_APP_BACKEND_URL || 'https://na2quizapp.onrender.com')
  : 'http://localhost:5000';

const PAGE_SIZE = 10;

const getAuthHeaders = (token) => {
  if (!token) {
    console.warn('⚠️ Pas de token disponible');
    return null;
  }
  return { headers: { Authorization: `Bearer ${token}` } };
};

// Composant de badge de rôle avec icônes améliorées
const RoleBadge = ({ role }) => {
  const colors = {
    APPRENANT: { bg: 'rgba(59,130,246,0.15)', color: '#60a5fa', icon: '👨‍🎓', label: 'Apprenant' },
    ENSEIGNANT: { bg: 'rgba(16,185,129,0.15)', color: '#10b981', icon: '👨‍🏫', label: 'Enseignant' },
    OPERATEUR_EVALUATION: { bg: 'rgba(245,158,11,0.15)', color: '#f59e0b', icon: '🎮', label: 'Opérateur' },
    ADMIN_DELEGUE: { bg: 'rgba(139,92,246,0.15)', color: '#a78bfa', icon: '👑', label: 'Admin délégué' },
    ADMIN_SYSTEME: { bg: 'rgba(239,68,68,0.15)', color: '#ef4444', icon: '⚡', label: 'Admin système' }
  };
  const style = colors[role] || colors.APPRENANT;
  return (
    <span style={{
      background: style.bg,
      color: style.color,
      padding: '2px 8px',
      borderRadius: '999px',
      fontSize: '0.7rem',
      fontWeight: 600,
      display: 'inline-flex',
      alignItems: 'center',
      gap: '4px'
    }}>
      <span>{style.icon}</span> {style.label}
    </span>
  );
};

// Modal de confirmation
const ConfirmModal = ({ isOpen, onClose, onConfirm, title, message, loading }) => {
  if (!isOpen) return null;
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center'
    }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        style={{
          background: '#0f172a', border: '1px solid rgba(239,68,68,0.3)',
          borderRadius: 16, padding: 24, maxWidth: 400, width: '90%'
        }}
      >
        <h3 style={{ color: '#f8fafc', fontSize: '1.1rem', fontWeight: 600, marginBottom: 8 }}>{title}</h3>
        <p style={{ color: '#94a3b8', marginBottom: 20 }}>{message}</p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '8px 16px', background: '#334155', border: 'none', borderRadius: 8, color: '#fff', cursor: 'pointer' }}>
            Annuler
          </button>
          <button onClick={onConfirm} disabled={loading} style={{
            padding: '8px 16px', background: '#ef4444', border: 'none', borderRadius: 8, color: '#fff', cursor: 'pointer', opacity: loading ? 0.6 : 1
          }}>
            {loading ? 'Suppression...' : 'Confirmer'}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

// Modal de création d'utilisateur
const CreateUserModal = ({ isOpen, onClose, onCreate, loading }) => {
  const [formData, setFormData] = useState({
    name: '', email: '', username: '', password: '', role: 'APPRENANT', confirmPassword: ''
  });
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);

  const validate = () => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = 'Nom requis';
    if (!formData.email.trim()) newErrors.email = 'Email requis';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) newErrors.email = 'Email invalide';
    if (!formData.username.trim()) newErrors.username = 'Nom d\'utilisateur requis';
    else if (formData.username.length < 3) newErrors.username = 'Minimum 3 caractères';
    if (!formData.password) newErrors.password = 'Mot de passe requis';
    else if (formData.password.length < 6) newErrors.password = 'Minimum 6 caractères';
    if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = 'Les mots de passe ne correspondent pas';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (validate()) {
      onCreate(formData);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center'
    }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        style={{
          background: '#0f172a', border: '1px solid rgba(59,130,246,0.3)',
          borderRadius: 16, padding: 24, width: '90%', maxWidth: 500,
          maxHeight: '90vh', overflowY: 'auto'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ color: '#f8fafc', fontSize: '1.2rem', fontWeight: 600 }}>
            <Plus size={18} style={{ display: 'inline', marginRight: 8 }} />
            Nouvel utilisateur
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ color: '#94a3b8', fontSize: '0.8rem', marginBottom: 4, display: 'block' }}>
            <User size={12} style={{ display: 'inline', marginRight: 4 }} /> Nom complet *
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={e => setFormData({ ...formData, name: e.target.value })}
            style={{
              width: '100%', padding: '10px 12px',
              background: 'rgba(255,255,255,0.05)',
              border: `1px solid ${errors.name ? '#ef4444' : 'rgba(99,102,241,0.2)'}`,
              borderRadius: 8, color: '#f8fafc'
            }}
          />
          {errors.name && <p style={{ color: '#ef4444', fontSize: '0.7rem', marginTop: 4 }}>{errors.name}</p>}
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ color: '#94a3b8', fontSize: '0.8rem', marginBottom: 4, display: 'block' }}>
            <Mail size={12} style={{ display: 'inline', marginRight: 4 }} /> Email *
          </label>
          <input
            type="email"
            value={formData.email}
            onChange={e => setFormData({ ...formData, email: e.target.value })}
            style={{
              width: '100%', padding: '10px 12px',
              background: 'rgba(255,255,255,0.05)',
              border: `1px solid ${errors.email ? '#ef4444' : 'rgba(99,102,241,0.2)'}`,
              borderRadius: 8, color: '#f8fafc'
            }}
          />
          {errors.email && <p style={{ color: '#ef4444', fontSize: '0.7rem', marginTop: 4 }}>{errors.email}</p>}
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ color: '#94a3b8', fontSize: '0.8rem', marginBottom: 4, display: 'block' }}>
            <User size={12} style={{ display: 'inline', marginRight: 4 }} /> Nom d'utilisateur *
          </label>
          <input
            type="text"
            value={formData.username}
            onChange={e => setFormData({ ...formData, username: e.target.value.toLowerCase() })}
            style={{
              width: '100%', padding: '10px 12px',
              background: 'rgba(255,255,255,0.05)',
              border: `1px solid ${errors.username ? '#ef4444' : 'rgba(99,102,241,0.2)'}`,
              borderRadius: 8, color: '#f8fafc'
            }}
          />
          {errors.username && <p style={{ color: '#ef4444', fontSize: '0.7rem', marginTop: 4 }}>{errors.username}</p>}
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ color: '#94a3b8', fontSize: '0.8rem', marginBottom: 4, display: 'block' }}>
            <Key size={12} style={{ display: 'inline', marginRight: 4 }} /> Mot de passe *
          </label>
          <div style={{ position: 'relative' }}>
            <input
              type={showPassword ? 'text' : 'password'}
              value={formData.password}
              onChange={e => setFormData({ ...formData, password: e.target.value })}
              style={{
                width: '100%', padding: '10px 12px',
                background: 'rgba(255,255,255,0.05)',
                border: `1px solid ${errors.password ? '#ef4444' : 'rgba(99,102,241,0.2)'}`,
                borderRadius: 8, color: '#f8fafc', paddingRight: '36px'
              }}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {errors.password && <p style={{ color: '#ef4444', fontSize: '0.7rem', marginTop: 4 }}>{errors.password}</p>}
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ color: '#94a3b8', fontSize: '0.8rem', marginBottom: 4, display: 'block' }}>
            <Key size={12} style={{ display: 'inline', marginRight: 4 }} /> Confirmer le mot de passe *
          </label>
          <input
            type={showPassword ? 'text' : 'password'}
            value={formData.confirmPassword}
            onChange={e => setFormData({ ...formData, confirmPassword: e.target.value })}
            style={{
              width: '100%', padding: '10px 12px',
              background: 'rgba(255,255,255,0.05)',
              border: `1px solid ${errors.confirmPassword ? '#ef4444' : 'rgba(99,102,241,0.2)'}`,
              borderRadius: 8, color: '#f8fafc'
            }}
          />
          {errors.confirmPassword && <p style={{ color: '#ef4444', fontSize: '0.7rem', marginTop: 4 }}>{errors.confirmPassword}</p>}
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={{ color: '#94a3b8', fontSize: '0.8rem', marginBottom: 4, display: 'block' }}>
            <Shield size={12} style={{ display: 'inline', marginRight: 4 }} /> Rôle *
          </label>
          <select
            value={formData.role}
            onChange={e => setFormData({ ...formData, role: e.target.value })}
            style={{
              width: '100%', padding: '10px 12px',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(99,102,241,0.2)',
              borderRadius: 8, color: '#f8fafc'
            }}
          >
            <option value="APPRENANT">Apprenant</option>
            <option value="ENSEIGNANT">Enseignant</option>
            <option value="OPERATEUR_EVALUATION">Opérateur d'évaluation</option>
            <option value="ADMIN_DELEGUE">Admin délégué</option>
            <option value="ADMIN_SYSTEME">Admin système</option>
          </select>
        </div>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '10px 20px', background: '#334155', border: 'none', borderRadius: 8, color: '#fff', cursor: 'pointer' }}>
            Annuler
          </button>
          <button onClick={handleSubmit} disabled={loading} style={{
            padding: '10px 20px', background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none', borderRadius: 8, color: '#fff', cursor: 'pointer', opacity: loading ? 0.6 : 1
          }}>
            {loading ? 'Création...' : 'Créer'}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

const UserManagementPage = () => {
  const { user, hasRole, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [filterRole, setFilterRole] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');

  const isAdminSysteme = hasRole('ADMIN_SYSTEME');
  const isAdminDelegue = hasRole('ADMIN_DELEGUE');

  // Vérifier l'authentification au chargement
  useEffect(() => {
    if (!isAuthenticated) {
      toast.error('Veuillez vous connecter');
      setTimeout(() => navigate('/login'), 1500);
      return;
    }
    
    if (!isAdminSysteme && !isAdminDelegue) {
      toast.error("Accès non autorisé. Rôle ADMIN_DELEGUE requis.");
      setTimeout(() => navigate('/evaluate'), 1500);
      return;
    }
    
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('userToken');
      if (!token) {
        throw new Error('Token non trouvé');
      }
      
      console.log('🔍 Chargement des utilisateurs...');
      const response = await axios.get(
        `${NODE_BACKEND_URL}/api/users`,
        getAuthHeaders(token)
      );
      
      let usersData = [];
      if (Array.isArray(response.data)) {
        usersData = response.data;
      } else if (response.data?.data && Array.isArray(response.data.data)) {
        usersData = response.data.data;
      } else if (response.data?.users && Array.isArray(response.data.users)) {
        usersData = response.data.users;
      }
      
      setUsers(usersData);
      toast.success(`${usersData.length} utilisateur(s) chargé(s)`);
    } catch (err) {
      console.error('Erreur chargement utilisateurs:', err);
      
      if (err.response?.status === 401) {
        toast.error('Session expirée, veuillez vous reconnecter');
        localStorage.removeItem('userToken');
        localStorage.removeItem('userInfo');
        setTimeout(() => navigate('/login'), 1500);
      } else {
        toast.error(err.response?.data?.message || "Erreur chargement utilisateurs");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (formData) => {
    setCreateLoading(true);
    try {
      const token = localStorage.getItem('userToken');
      if (!token) throw new Error('Token non trouvé');
      
      await axios.post(
        `${NODE_BACKEND_URL}/api/auth/register`,
        formData,
        getAuthHeaders(token)
      );
      toast.success("Utilisateur créé avec succès");
      setShowCreateModal(false);
      loadUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || "Erreur création");
    } finally {
      setCreateLoading(false);
    }
  };

  const handleUpdateRole = async (userId, role) => {
    try {
      const token = localStorage.getItem('userToken');
      if (!token) throw new Error('Token non trouvé');
      
      await axios.put(
        `${NODE_BACKEND_URL}/api/users/${userId}`,
        { role },
        getAuthHeaders(token)
      );
      toast.success("Rôle mis à jour");
      loadUsers();
      setEditing(null);
    } catch (err) {
      toast.error(err.response?.data?.message || "Erreur mise à jour");
    }
  };

  const handleDelete = async (userId) => {
    setDeleteLoading(true);
    try {
      const token = localStorage.getItem('userToken');
      if (!token) throw new Error('Token non trouvé');
      
      await axios.delete(
        `${NODE_BACKEND_URL}/api/users/${userId}`,
        getAuthHeaders(token)
      );
      toast.success("Utilisateur supprimé");
      loadUsers();
      setDeleteConfirm(null);
    } catch (err) {
      toast.error(err.response?.data?.message || "Erreur suppression");
    } finally {
      setDeleteLoading(false);
    }
  };

  const exportToCSV = () => {
    const headers = ['Nom', 'Email', 'Nom d\'utilisateur', 'Rôle', 'Date de création'];
    const rows = filteredUsers.map(u => [
      u.name,
      u.email,
      u.username,
      u.role,
      new Date(u.createdAt).toLocaleDateString('fr-FR')
    ]);
    const csvContent = [headers, ...rows].map(row => row.join(';')).join('\n');
    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `utilisateurs_${new Date().toISOString().slice(0, 19)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Export CSV réussi');
  };

  const filteredUsers = useMemo(() => {
    let filtered = users.filter(u => {
      if (search) {
        const searchLower = search.toLowerCase();
        return u.name?.toLowerCase().includes(searchLower) ||
               u.email?.toLowerCase().includes(searchLower) ||
               u.username?.toLowerCase().includes(searchLower);
      }
      return true;
    });
    
    if (filterRole !== 'all') {
      filtered = filtered.filter(u => u.role === filterRole);
    }
    
    filtered.sort((a, b) => {
      let aVal = a[sortBy];
      let bVal = b[sortBy];
      if (sortBy === 'name') {
        aVal = a.name?.toLowerCase() || '';
        bVal = b.name?.toLowerCase() || '';
      }
      if (sortOrder === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });
    
    return filtered;
  }, [users, search, filterRole, sortBy, sortOrder]);

  const totalPages = Math.ceil(filteredUsers.length / PAGE_SIZE);
  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  const roles = [
    { value: 'all', label: 'Tous', icon: '👥' },
    { value: 'APPRENANT', label: 'Apprenants', icon: '👨‍🎓' },
    { value: 'ENSEIGNANT', label: 'Enseignants', icon: '👨‍🏫' },
    { value: 'OPERATEUR_EVALUATION', label: 'Opérateurs', icon: '🎮' },
    { value: 'ADMIN_DELEGUE', label: 'Admin délégués', icon: '👑' },
    { value: 'ADMIN_SYSTEME', label: 'Admin système', icon: '⚡' }
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!isAuthenticated) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #05071a, #0a0f2e)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{
          background: 'rgba(239,68,68,0.1)',
          border: '1px solid #ef4444',
          borderRadius: 12,
          padding: 20,
          color: '#ef4444',
          display: 'flex',
          alignItems: 'center',
          gap: 12
        }}>
          <AlertCircle size={24} />
          <p>Veuillez vous connecter pour accéder à cette page</p>
        </div>
      </div>
    );
  }

  if (!isAdminSysteme && !isAdminDelegue) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #05071a, #0a0f2e)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{
          background: 'rgba(239,68,68,0.1)',
          border: '1px solid #ef4444',
          borderRadius: 12,
          padding: 20,
          color: '#ef4444',
          display: 'flex',
          alignItems: 'center',
          gap: 12
        }}>
          <Shield size={24} />
          <p>Accès non autorisé. Rôle ADMIN_DELEGUE requis.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #05071a, #0a0f2e)', padding: 24 }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        {/* Header avec navigation */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate('/evaluate')}
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(99,102,241,0.2)',
                borderRadius: 12,
                padding: 12,
                color: '#94a3b8',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8
              }}
            >
              <ArrowLeft size={20} />
              <span>Retour</span>
            </motion.button>
            
            <div>
              <h1 style={{ fontSize: '2rem', fontWeight: 700, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Users size={28} color="#3b82f6" />
                Gestion des utilisateurs
              </h1>
              <p style={{ color: '#64748b', fontSize: '0.85rem' }}>
                {users.length} utilisateur{users.length !== 1 ? 's' : ''} au total
              </p>
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: 12 }}>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={exportToCSV}
              style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', padding: '8px 16px', borderRadius: 8, color: '#10b981', display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}
            >
              <Download size={16} /> Exporter CSV
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={loadUsers}
              style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.3)', padding: '8px 16px', borderRadius: 8, color: '#60a5fa', display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}
            >
              <RefreshCw size={16} /> Actualiser
            </motion.button>
            {isAdminSysteme && (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setShowCreateModal(true)}
                style={{ background: 'linear-gradient(135deg, #3b82f6, #2563eb)', padding: '8px 20px', borderRadius: 8, color: '#fff', border: 'none', display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}
              >
                <Plus size={16} /> Nouvel utilisateur
              </motion.button>
            )}
            <button
              onClick={handleLogout}
              style={{
                background: 'rgba(239,68,68,0.1)',
                border: '1px solid rgba(239,68,68,0.3)',
                borderRadius: 10,
                padding: '8px 16px',
                color: '#ef4444',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6
              }}
            >
              <Home size={16} /> Déconnexion
            </button>
          </div>
        </div>

        {/* Filtres et recherche */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 20, alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
            <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
            <input
              type="text"
              placeholder="Rechercher par nom, email ou nom d'utilisateur..."
              value={search}
              onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
              style={{
                width: '100%', padding: '10px 12px 10px 38px',
                background: 'rgba(15,23,42,0.7)', border: '1px solid rgba(59,130,246,0.2)',
                borderRadius: 10, color: '#f8fafc', outline: 'none'
              }}
            />
          </div>
          
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {roles.map(role => (
              <button
                key={role.value}
                onClick={() => { setFilterRole(role.value); setCurrentPage(1); }}
                style={{
                  padding: '6px 12px',
                  background: filterRole === role.value ? 'rgba(59,130,246,0.2)' : 'rgba(255,255,255,0.05)',
                  border: `1px solid ${filterRole === role.value ? '#3b82f6' : 'rgba(59,130,246,0.2)'}`,
                  borderRadius: 20,
                  color: filterRole === role.value ? '#60a5fa' : '#94a3b8',
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4
                }}
              >
                <span>{role.icon}</span> {role.label}
              </button>
            ))}
          </div>
        </div>

        {/* Liste des utilisateurs */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px', color: '#94a3b8' }}>
            <RefreshCw size={32} style={{ animation: 'spin 1s linear infinite', marginBottom: 12 }} />
            <p>Chargement des utilisateurs...</p>
          </div>
        ) : paginatedUsers.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px', color: '#64748b', background: 'rgba(15,23,42,0.5)', borderRadius: 16 }}>
            <Users size={48} color="#1e293b" style={{ marginBottom: 12 }} />
            <p>Aucun utilisateur trouvé</p>
            {search && (
              <button onClick={() => setSearch('')} style={{ marginTop: 12, color: '#3b82f6', background: 'none', border: 'none', cursor: 'pointer' }}>
                Effacer la recherche
              </button>
            )}
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <AnimatePresence>
                {paginatedUsers.map(u => (
                  <motion.div
                    key={u._id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    style={{
                      background: 'rgba(15,23,42,0.7)',
                      borderRadius: 12,
                      padding: 16,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: 12,
                      border: `1px solid ${u.role === 'ADMIN_SYSTEME' ? 'rgba(239,68,68,0.3)' : 'rgba(59,130,246,0.2)'}`
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 4 }}>
                        <p style={{ color: '#f8fafc', fontWeight: 600, fontSize: '1rem' }}>{u.name}</p>
                        <RoleBadge role={u.role} />
                      </div>
                      <p style={{ color: '#94a3b8', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <Mail size={12} /> {u.email}
                        <span style={{ color: '#475569' }}>•</span>
                        <User size={12} /> @{u.username}
                      </p>
                      <p style={{ color: '#475569', fontSize: '0.7rem', marginTop: 4 }}>
                        Créé le {new Date(u.createdAt).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {editing === u._id ? (
                        <>
                          <select
                            defaultValue={u.role}
                            onChange={e => handleUpdateRole(u._id, e.target.value)}
                            style={{
                              background: 'rgba(255,255,255,0.05)',
                              border: '1px solid rgba(99,102,241,0.2)',
                              borderRadius: 6,
                              padding: '6px 8px',
                              color: '#f8fafc'
                            }}
                          >
                            <option value="APPRENANT">Apprenant</option>
                            <option value="ENSEIGNANT">Enseignant</option>
                            <option value="OPERATEUR_EVALUATION">Opérateur</option>
                            <option value="ADMIN_DELEGUE">Admin délégué</option>
                            <option value="ADMIN_SYSTEME">Admin système</option>
                          </select>
                          <button
                            onClick={() => setEditing(null)}
                            style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 6 }}
                          >
                            <X size={16} />
                          </button>
                        </>
                      ) : (
                        <>
                          {(isAdminSysteme || isAdminDelegue) && (
                            <button
                              onClick={() => setEditing(u._id)}
                              style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', padding: 6 }}
                              title="Modifier le rôle"
                            >
                              <Edit size={16} />
                            </button>
                          )}
                          {isAdminSysteme && (
                            <button
                              onClick={() => setDeleteConfirm(u._id)}
                              style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 6 }}
                              title="Supprimer"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 24 }}>
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  style={{
                    width: 32, height: 32, borderRadius: 8,
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: currentPage === 1 ? '#334155' : '#94a3b8',
                    cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}
                >
                  <ChevronLeft size={16} />
                </button>
                
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) pageNum = i + 1;
                  else if (currentPage <= 3) pageNum = i + 1;
                  else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
                  else pageNum = currentPage - 2 + i;
                  
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      style={{
                        width: 32, height: 32, borderRadius: 8,
                        background: currentPage === pageNum ? '#3b82f6' : 'rgba(255,255,255,0.05)',
                        border: `1px solid ${currentPage === pageNum ? '#3b82f6' : 'rgba(255,255,255,0.1)'}`,
                        color: currentPage === pageNum ? '#fff' : '#94a3b8',
                        cursor: 'pointer'
                      }}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  style={{
                    width: 32, height: 32, borderRadius: 8,
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: currentPage === totalPages ? '#334155' : '#94a3b8',
                    cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modals */}
      <CreateUserModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={handleCreate}
        loading={createLoading}
      />
      
      <ConfirmModal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={() => handleDelete(deleteConfirm)}
        title="Supprimer l'utilisateur"
        message="Cette action est irréversible. Voulez-vous vraiment supprimer cet utilisateur ?"
        loading={deleteLoading}
      />

      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#1e293b',
            color: '#f8fafc',
            border: '1px solid #3b82f6',
            borderRadius: '10px'
          }
        }}
      />

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default UserManagementPage;