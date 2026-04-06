// src/pages/UserManagementPage.jsx - VERSION ULTIME COMPLÈTE
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import axios from 'axios';
import { toast, Toaster } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, Plus, Trash2, Edit, Save, X, Search, 
  ChevronLeft, ChevronRight, Download, RefreshCw,
  Filter, Mail, User, Key, Shield, AlertCircle,
  CheckCircle, XCircle, Eye, EyeOff, ArrowLeft, Home,
  PenTool, Upload, FileSpreadsheet, Clock, History,
  Activity, Power, Lock, Unlock, MoreVertical, Copy,
  Printer, BarChart3, Calendar, TrendingUp, UserCheck,
  UserX, Send, Bell, Settings, Database, Server, LogOut
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

// ========== COMPOSANTS ULTIMES ==========

// Badge de rôle amélioré
const RoleBadge = ({ role, status }) => {
  const roles = {
    APPRENANT: { bg: 'rgba(59,130,246,0.15)', color: '#60a5fa', icon: '👨‍🎓', label: 'Apprenant' },
    ENSEIGNANT: { bg: 'rgba(16,185,129,0.15)', color: '#10b981', icon: '👨‍🏫', label: 'Enseignant' },
    SAISISEUR: { bg: 'rgba(99,102,241,0.15)', color: '#a5b4fc', icon: '✏️', label: 'Saisisseur' },
    OPERATEUR_EVALUATION: { bg: 'rgba(245,158,11,0.15)', color: '#f59e0b', icon: '🎮', label: 'Opérateur' },
    ADMIN_DELEGUE: { bg: 'rgba(139,92,246,0.15)', color: '#a78bfa', icon: '👑', label: 'Admin délégué' },
    ADMIN_SYSTEME: { bg: 'rgba(239,68,68,0.15)', color: '#ef4444', icon: '⚡', label: 'Admin système' }
  };
  const style = roles[role] || roles.APPRENANT;
  return (
    <span style={{
      background: style.bg,
      color: style.color,
      padding: '4px 10px',
      borderRadius: '999px',
      fontSize: '0.7rem',
      fontWeight: 600,
      display: 'inline-flex',
      alignItems: 'center',
      gap: '6px'
    }}>
      <span>{style.icon}</span> {style.label}
      {status === 'inactive' && (
        <span style={{ marginLeft: 4, fontSize: '0.6rem', opacity: 0.7 }}>(inactif)</span>
      )}
    </span>
  );
};

// Carte de statistiques
const StatCard = ({ title, value, icon, color, trend }) => (
  <motion.div
    whileHover={{ y: -2 }}
    style={{
      background: 'rgba(15,23,42,0.7)',
      border: `1px solid ${color}20`,
      borderRadius: 16,
      padding: '16px 20px',
      minWidth: 140
    }}
  >
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
      <span style={{ color: '#64748b', fontSize: '0.7rem', textTransform: 'uppercase' }}>{title}</span>
      <div style={{ color, background: `${color}10`, padding: 6, borderRadius: 10 }}>{icon}</div>
    </div>
    <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#f8fafc' }}>{value}</div>
    {trend && <span style={{ color: trend > 0 ? '#10b981' : '#ef4444', fontSize: '0.65rem' }}>
      {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}%
    </span>}
  </motion.div>
);

// Modal d'import CSV
const ImportModal = ({ isOpen, onClose, onImport, loading }) => {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState([]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    setFile(file);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result;
      const rows = text.split('\n').slice(0, 6);
      setPreview(rows);
    };
    reader.readAsText(file);
  };

  const handleImport = () => {
    if (file) onImport(file);
  };

  if (!isOpen) return null;

  return (
    <div style={styles.modalOverlay}>
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} style={styles.modalContent}>
        <div style={styles.modalHeader}>
          <h3><Upload size={18} style={{ display: 'inline', marginRight: 8 }} />Import CSV</h3>
          <button onClick={onClose} style={styles.closeBtn}><X size={20} /></button>
        </div>
        <div style={styles.modalBody}>
          <p style={{ color: '#94a3b8', fontSize: '0.8rem', marginBottom: 16 }}>
            Format attendu : nom;email;username;role;niveau (optionnel)
          </p>
          <a href="#" onClick={(e) => {
            e.preventDefault();
            const template = "Nom;Email;Username;Role;Niveau\nJean Dupont;jean@email.com;jean.dupont;APPRENANT;Terminale";
            const blob = new Blob([template], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'template_import.csv';
            a.click();
            URL.revokeObjectURL(url);
          }} style={{ color: '#3b82f6', fontSize: '0.75rem', marginBottom: 16, display: 'inline-block' }}>
            📥 Télécharger le template
          </a>
          <input type="file" accept=".csv" onChange={handleFileChange} style={styles.fileInput} />
          {preview.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <p style={{ fontSize: '0.7rem', color: '#64748b' }}>Aperçu :</p>
              <pre style={{ background: '#0f172a', padding: 8, borderRadius: 8, fontSize: '0.6rem', overflowX: 'auto' }}>
                {preview.join('\n')}
              </pre>
            </div>
          )}
        </div>
        <div style={styles.modalFooter}>
          <button onClick={onClose} style={styles.cancelBtn}>Annuler</button>
          <button onClick={handleImport} disabled={!file || loading} style={{...styles.confirmBtn, background: '#10b981'}}>
            {loading ? 'Import...' : 'Importer'}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

// Modal de détail utilisateur - CORRIGÉ
const UserDetailModal = ({ isOpen, onClose, user, onUpdate }) => {
  const [formData, setFormData] = useState({});
  const [sessions, setSessions] = useState([]);
  const [stats, setStats] = useState({});
  const [loadingStats, setLoadingStats] = useState(false);

  useEffect(() => {
    if (user) {
      setFormData(user);
      loadUserStats(user._id);
      loadUserSessions(user._id);
    }
  }, [user]);

  const loadUserStats = async (userId) => {
    setLoadingStats(true);
    try {
      const token = localStorage.getItem('userToken');
      const res = await axios.get(`${NODE_BACKEND_URL}/api/users/${userId}/stats`, getAuthHeaders(token));
      // ✅ CORRECTION: Extraire correctement les données
      if (res.data?.success && res.data?.data) {
        setStats(res.data.data);
        console.log('✅ Stats chargées:', res.data.data);
      } else if (res.data) {
        setStats(res.data);
        console.log('✅ Stats chargées (format direct):', res.data);
      } else {
        console.warn('⚠️ Format de stats inattendu:', res);
      }
    } catch (err) { 
      console.error('❌ Erreur chargement stats:', err);
      toast.error('Impossible de charger les statistiques');
    } finally {
      setLoadingStats(false);
    }
  };

  const loadUserSessions = async (userId) => {
    try {
      const token = localStorage.getItem('userToken');
      const res = await axios.get(`${NODE_BACKEND_URL}/api/users/${userId}/sessions`, getAuthHeaders(token));
      // ✅ CORRECTION: Extraire correctement les sessions
      if (res.data?.success && res.data?.data) {
        setSessions(res.data.data);
      } else if (res.data?.sessions) {
        setSessions(res.data.sessions);
      } else if (Array.isArray(res.data)) {
        setSessions(res.data);
      } else if (res.data?.data && Array.isArray(res.data.data)) {
        setSessions(res.data.data);
      } else {
        setSessions([]);
      }
      console.log('✅ Sessions chargées:', sessions.length);
    } catch (err) { 
      console.error('❌ Erreur chargement sessions:', err);
    }
  };

  const handleUpdate = () => {
    onUpdate(user._id, formData);
    onClose();
  };

  if (!isOpen || !user) return null;

  return (
    <div style={styles.modalOverlay}>
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} style={{...styles.modalContent, maxWidth: 600, maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={styles.modalHeader}>
          <h3><User size={18} style={{ display: 'inline', marginRight: 8 }} />Détails utilisateur</h3>
          <button onClick={onClose} style={styles.closeBtn}><X size={20} /></button>
        </div>
        <div style={styles.modalBody}>
          <div style={{ marginBottom: 16 }}>
            <label style={styles.label}>Nom complet</label>
            <input type="text" value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} style={styles.input} />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={styles.label}>Email</label>
            <input type="email" value={formData.email || ''} onChange={e => setFormData({...formData, email: e.target.value})} style={styles.input} />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={styles.label}>Nom d'utilisateur</label>
            <input type="text" value={formData.username || ''} onChange={e => setFormData({...formData, username: e.target.value})} style={styles.input} />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={styles.label}>Matricule</label>
            <input type="text" value={formData.matricule || ''} onChange={e => setFormData({...formData, matricule: e.target.value})} style={styles.input} />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={styles.label}>Niveau</label>
            <input type="text" value={formData.level || ''} onChange={e => setFormData({...formData, level: e.target.value})} style={styles.input} />
          </div>
          
          <div style={{ margin: '20px 0', paddingTop: 16, borderTop: '1px solid rgba(99,102,241,0.1)' }}>
            <h4 style={{ color: '#60a5fa', fontSize: '0.8rem', marginBottom: 12 }}>📊 Statistiques</h4>
            {loadingStats ? (
              <div style={{ textAlign: 'center', padding: 20 }}>Chargement...</div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <StatCard title="Épreuves créées" value={stats.examsCreated || 0} icon={<FileSpreadsheet size={16} />} color="#10b981" />
                <StatCard title="Questions créées" value={stats.questionsCreated || 0} icon={<PenTool size={16} />} color="#3b82f6" />
                <StatCard title="Dernière connexion" value={stats.lastLogin ? new Date(stats.lastLogin).toLocaleDateString() : 'Jamais'} icon={<Clock size={16} />} color="#f59e0b" />
                <StatCard title="Sessions actives" value={stats.sessionCount || 0} icon={<Activity size={16} />} color="#8b5cf6" />
                {stats.loginCount !== undefined && (
                  <StatCard title="Connexions totales" value={stats.loginCount || 0} icon={<History size={16} />} color="#f59e0b" />
                )}
              </div>
            )}
          </div>

          {sessions.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <h4 style={{ color: '#60a5fa', fontSize: '0.8rem', marginBottom: 12 }}>🖥️ Sessions actives</h4>
              {sessions.map(s => (
                <div key={s._id || s.socketId} style={{ background: '#0f172a', padding: 8, borderRadius: 8, marginBottom: 8 }}>
                  <p style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                    Type: {s.type} | Statut: {s.status} | Dernière activité: {s.lastUpdate ? new Date(s.lastUpdate).toLocaleString() : 'N/A'}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
        <div style={styles.modalFooter}>
          <button onClick={onClose} style={styles.cancelBtn}>Fermer</button>
          <button onClick={handleUpdate} style={{...styles.confirmBtn, background: '#3b82f6'}}>Enregistrer</button>
        </div>
      </motion.div>
    </div>
  );
};

// Modal de confirmation avancée
const ConfirmModal = ({ isOpen, onClose, onConfirm, title, message, loading, type = 'danger' }) => {
  if (!isOpen) return null;
  const colors = { danger: '#ef4444', warning: '#f59e0b', info: '#3b82f6' };
  return (
    <div style={styles.modalOverlay}>
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} style={{...styles.modalContent, maxWidth: 400 }}>
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{ background: `${colors[type]}20`, width: 48, height: 48, borderRadius: 48, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            {type === 'danger' ? <Trash2 size={24} color={colors[type]} /> : <AlertCircle size={24} color={colors[type]} />}
          </div>
          <h3 style={{ color: '#f8fafc', fontSize: '1.1rem', fontWeight: 600, marginBottom: 8 }}>{title}</h3>
          <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>{message}</p>
        </div>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          <button onClick={onClose} style={styles.cancelBtn}>Annuler</button>
          <button onClick={onConfirm} disabled={loading} style={{...styles.confirmBtn, background: colors[type]}}>
            {loading ? 'Chargement...' : 'Confirmer'}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

// Modal de création utilisateur (version améliorée)
const CreateUserModal = ({ isOpen, onClose, onCreate, loading }) => {
  const [formData, setFormData] = useState({
    name: '', email: '', username: '', password: '', role: 'APPRENANT', confirmPassword: '',
    level: '', matricule: '', sendEmail: true
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
    <div style={styles.modalOverlay}>
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} style={{...styles.modalContent, maxWidth: 500, maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={styles.modalHeader}>
          <h3><Plus size={18} style={{ display: 'inline', marginRight: 8 }} />Nouvel utilisateur</h3>
          <button onClick={onClose} style={styles.closeBtn}><X size={20} /></button>
        </div>
        <div style={styles.modalBody}>
          <div style={{ marginBottom: 16 }}>
            <label style={styles.label}><User size={12} style={{ display: 'inline', marginRight: 4 }} /> Nom complet *</label>
            <input type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} style={{...styles.input, borderColor: errors.name ? '#ef4444' : 'rgba(99,102,241,0.2)'}} />
            {errors.name && <p style={styles.errorText}>{errors.name}</p>}
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={styles.label}><Mail size={12} style={{ display: 'inline', marginRight: 4 }} /> Email *</label>
            <input type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} style={{...styles.input, borderColor: errors.email ? '#ef4444' : 'rgba(99,102,241,0.2)'}} />
            {errors.email && <p style={styles.errorText}>{errors.email}</p>}
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={styles.label}><User size={12} style={{ display: 'inline', marginRight: 4 }} /> Nom d'utilisateur *</label>
            <input type="text" value={formData.username} onChange={e => setFormData({ ...formData, username: e.target.value.toLowerCase() })} style={{...styles.input, borderColor: errors.username ? '#ef4444' : 'rgba(99,102,241,0.2)'}} />
            {errors.username && <p style={styles.errorText}>{errors.username}</p>}
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={styles.label}><Key size={12} style={{ display: 'inline', marginRight: 4 }} /> Mot de passe *</label>
            <div style={{ position: 'relative' }}>
              <input type={showPassword ? 'text' : 'password'} value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} style={{...styles.input, paddingRight: 36, borderColor: errors.password ? '#ef4444' : 'rgba(99,102,241,0.2)'}} />
              <button onClick={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button>
            </div>
            {errors.password && <p style={styles.errorText}>{errors.password}</p>}
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={styles.label}><Key size={12} style={{ display: 'inline', marginRight: 4 }} /> Confirmer mot de passe *</label>
            <input type={showPassword ? 'text' : 'password'} value={formData.confirmPassword} onChange={e => setFormData({ ...formData, confirmPassword: e.target.value })} style={{...styles.input, borderColor: errors.confirmPassword ? '#ef4444' : 'rgba(99,102,241,0.2)'}} />
            {errors.confirmPassword && <p style={styles.errorText}>{errors.confirmPassword}</p>}
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={styles.label}><Shield size={12} style={{ display: 'inline', marginRight: 4 }} /> Rôle *</label>
            <select value={formData.role} onChange={e => setFormData({ ...formData, role: e.target.value })} style={styles.select}>
              <option value="APPRENANT">👨‍🎓 Apprenant</option>
              <option value="ENSEIGNANT">👨‍🏫 Enseignant</option>
              <option value="SAISISEUR">✏️ Saisisseur</option>
              <option value="OPERATEUR_EVALUATION">🎮 Opérateur d'évaluation</option>
              <option value="ADMIN_DELEGUE">👑 Admin délégué</option>
              <option value="ADMIN_SYSTEME">⚡ Admin système</option>
            </select>
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={styles.label}>Niveau (optionnel)</label>
            <input type="text" value={formData.level} onChange={e => setFormData({ ...formData, level: e.target.value })} style={styles.input} placeholder="Ex: Terminale C" />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={styles.label}>Matricule (optionnel)</label>
            <input type="text" value={formData.matricule} onChange={e => setFormData({ ...formData, matricule: e.target.value })} style={styles.input} placeholder="Ex: STU001" />
          </div>
          <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <input type="checkbox" checked={formData.sendEmail} onChange={e => setFormData({ ...formData, sendEmail: e.target.checked })} style={{ width: 16, height: 16 }} />
            <label style={{ color: '#94a3b8', fontSize: '0.8rem' }}>Envoyer les identifiants par email</label>
          </div>
        </div>
        <div style={styles.modalFooter}>
          <button onClick={onClose} style={styles.cancelBtn}>Annuler</button>
          <button onClick={handleSubmit} disabled={loading} style={{...styles.confirmBtn, background: 'linear-gradient(135deg, #10b981, #059669)'}}>
            {loading ? 'Création...' : 'Créer'}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

// ========== COMPOSANT PRINCIPAL ==========
const UserManagementPage = () => {
  const { user, hasRole, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [filterRole, setFilterRole] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [createLoading, setCreateLoading] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const [stats, setStats] = useState({ total: 0, byRole: {} });

  const isAdminSysteme = hasRole('ADMIN_SYSTEME');
  const isAdminDelegue = hasRole('ADMIN_DELEGUE');

  useEffect(() => {
    if (!isAuthenticated) {
      toast.error('Veuillez vous connecter');
      setTimeout(() => navigate('/login'), 1500);
      return;
    }
    if (!isAdminSysteme && !isAdminDelegue) {
      toast.error("Accès non autorisé.");
      setTimeout(() => navigate('/evaluate'), 1500);
      return;
    }
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('userToken');
      if (!token) throw new Error('Token non trouvé');
      
      const response = await axios.get(`${NODE_BACKEND_URL}/api/users`, getAuthHeaders(token));
      let usersData = [];
      if (Array.isArray(response.data)) usersData = response.data;
      else if (response.data?.data && Array.isArray(response.data.data)) usersData = response.data.data;
      else if (response.data?.users && Array.isArray(response.data.users)) usersData = response.data.users;
      
      setUsers(usersData);
      
      // Calculer les statistiques
      const byRole = {};
      usersData.forEach(u => { byRole[u.role] = (byRole[u.role] || 0) + 1; });
      setStats({ total: usersData.length, byRole });
      
      toast.success(`${usersData.length} utilisateur(s) chargé(s)`);
    } catch (err) {
      console.error('Erreur:', err);
      if (err.response?.status === 401) {
        toast.error('Session expirée');
        localStorage.removeItem('userToken');
        setTimeout(() => navigate('/login'), 1500);
      } else {
        toast.error(err.response?.data?.message || "Erreur chargement");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (formData) => {
    setCreateLoading(true);
    try {
      const token = localStorage.getItem('userToken');
      await axios.post(`${NODE_BACKEND_URL}/api/auth/register`, formData, getAuthHeaders(token));
      toast.success("Utilisateur créé avec succès");
      setShowCreateModal(false);
      loadUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || "Erreur création");
    } finally {
      setCreateLoading(false);
    }
  };

  const handleImport = async (file) => {
    setImportLoading(true);
    try {
      const token = localStorage.getItem('userToken');
      const formData = new FormData();
      formData.append('file', file);
      await axios.post(`${NODE_BACKEND_URL}/api/users/import`, formData, {
        ...getAuthHeaders(token),
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success("Import réussi");
      setShowImportModal(false);
      loadUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || "Erreur import");
    } finally {
      setImportLoading(false);
    }
  };

  const handleUpdate = async (userId, data) => {
    try {
      const token = localStorage.getItem('userToken');
      await axios.put(`${NODE_BACKEND_URL}/api/users/${userId}`, data, getAuthHeaders(token));
      toast.success("Utilisateur mis à jour");
      loadUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || "Erreur mise à jour");
    }
  };

  const handleBulkAction = async (action) => {
    if (selectedUsers.length === 0) {
      toast.error("Aucun utilisateur sélectionné");
      return;
    }
    setBulkActionLoading(true);
    try {
      const token = localStorage.getItem('userToken');
      await axios.post(`${NODE_BACKEND_URL}/api/users/bulk`, 
        { userIds: selectedUsers, action },
        getAuthHeaders(token)
      );
      toast.success(`${selectedUsers.length} utilisateur(s) traités`);
      setSelectedUsers([]);
      loadUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || "Erreur action groupée");
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleDelete = async (userId) => {
    setDeleteLoading(true);
    try {
      const token = localStorage.getItem('userToken');
      await axios.delete(`${NODE_BACKEND_URL}/api/users/${userId}`, getAuthHeaders(token));
      toast.success("Utilisateur supprimé");
      loadUsers();
      setDeleteConfirm(null);
    } catch (err) {
      toast.error(err.response?.data?.message || "Erreur suppression");
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleToggleStatus = async (userId, currentStatus) => {
  try {
    const token = localStorage.getItem('userToken');
    // currentStatus est maintenant 'active' ou 'inactive'
    const willBeActive = currentStatus !== 'active'; // inverse
    await axios.patch(`${NODE_BACKEND_URL}/api/users/${userId}/status`, 
      { active: willBeActive },
      getAuthHeaders(token)
    );
    toast.success(`Utilisateur ${willBeActive ? 'activé' : 'désactivé'}`);
    loadUsers();
  } catch (err) {
    console.error('Erreur toggle status:', err);
    toast.error(err.response?.data?.message || "Erreur lors du changement de statut");
  }
};

  const handleResetPassword = async (userId) => {
    try {
      const token = localStorage.getItem('userToken');
      const res = await axios.post(`${NODE_BACKEND_URL}/api/users/${userId}/reset-password`, {}, getAuthHeaders(token));
      toast.success(`Nouveau mot de passe: ${res.data.temporaryPassword}`);
    } catch (err) {
      toast.error(err.response?.data?.message || "Erreur");
    }
  };

  const exportToCSV = () => {
    const headers = ['Nom', 'Email', 'Nom utilisateur', 'Rôle', 'Matricule', 'Niveau', 'Statut', 'Date création'];
    const rows = filteredUsers.map(u => [
      u.name, u.email, u.username,
      u.role === 'SAISISEUR' ? 'Saisisseur' : u.role === 'APPRENANT' ? 'Apprenant' : u.role === 'ENSEIGNANT' ? 'Enseignant' : u.role === 'OPERATEUR_EVALUATION' ? 'Opérateur' : u.role === 'ADMIN_DELEGUE' ? 'Admin délégué' : 'Admin système',
      u.matricule || '', u.level || '', u.status === 'active' ? 'Actif' : 'Inactif',
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

  const exportToPDF = () => {
    window.print();
  };

  const filteredUsers = useMemo(() => {
    let filtered = [...users];
    
    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(u => 
        u.name?.toLowerCase().includes(searchLower) ||
        u.email?.toLowerCase().includes(searchLower) ||
        u.username?.toLowerCase().includes(searchLower) ||
        u.matricule?.toLowerCase().includes(searchLower)
      );
    }
    
    if (filterRole !== 'all') {
      filtered = filtered.filter(u => u.role === filterRole);
    }
    
   if (filterStatus !== 'all') {
  const isActive = filterStatus === 'active';
  filtered = filtered.filter(u => u.status === (isActive ? 'active' : 'inactive'));
}
    
    filtered.sort((a, b) => {
      let aVal = a[sortBy];
      let bVal = b[sortBy];
      if (sortBy === 'name') {
        aVal = a.name?.toLowerCase() || '';
        bVal = b.name?.toLowerCase() || '';
      }
      return sortOrder === 'asc' ? (aVal > bVal ? 1 : -1) : (aVal < bVal ? 1 : -1);
    });
    
    return filtered;
  }, [users, search, filterRole, filterStatus, sortBy, sortOrder]);

  const totalPages = Math.ceil(filteredUsers.length / PAGE_SIZE);
  const paginatedUsers = filteredUsers.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedUsers(paginatedUsers.map(u => u._id));
    } else {
      setSelectedUsers([]);
    }
  };

  const handleSelectUser = (userId) => {
    setSelectedUsers(prev => 
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const roles = [
    { value: 'all', label: 'Tous', icon: '👥', count: stats.total },
    { value: 'APPRENANT', label: 'Apprenants', icon: '👨‍🎓', count: stats.byRole.APPRENANT || 0 },
    { value: 'ENSEIGNANT', label: 'Enseignants', icon: '👨‍🏫', count: stats.byRole.ENSEIGNANT || 0 },
    { value: 'SAISISEUR', label: 'Saisisseurs', icon: '✏️', count: stats.byRole.SAISISEUR || 0 },
    { value: 'OPERATEUR_EVALUATION', label: 'Opérateurs', icon: '🎮', count: stats.byRole.OPERATEUR_EVALUATION || 0 },
    { value: 'ADMIN_DELEGUE', label: 'Admin délégués', icon: '👑', count: stats.byRole.ADMIN_DELEGUE || 0 },
    { value: 'ADMIN_SYSTEME', label: 'Admin système', icon: '⚡', count: stats.byRole.ADMIN_SYSTEME || 0 }
  ];

  if (!isAuthenticated || (!isAdminSysteme && !isAdminDelegue)) {
    return (
      <div style={styles.authContainer}>
        <div style={styles.authCard}>
          <Shield size={48} color="#ef4444" />
          <h2>Accès restreint</h2>
          <p>Rôle ADMIN_DELEGUE requis</p>
          <button onClick={() => navigate('/evaluate')} style={styles.authButton}>Retour</button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.app}>
      <div style={styles.container}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.headerLeft}>
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => navigate('/evaluate')} style={styles.backBtn}>
              <ArrowLeft size={18} /> Retour
            </motion.button>
            <div>
              <h1 style={styles.title}><Users size={28} color="#3b82f6" /> Gestion des utilisateurs</h1>
              <p style={styles.subtitle}>{stats.total} utilisateur(s) au total</p>
            </div>
          </div>
          <div style={styles.headerRight}>
            <motion.button whileHover={{ scale: 1.02 }} onClick={exportToCSV} style={{...styles.iconBtn, color: '#10b981'}}>
              <Download size={16} /> CSV
            </motion.button>
            <motion.button whileHover={{ scale: 1.02 }} onClick={exportToPDF} style={{...styles.iconBtn, color: '#f59e0b'}}>
              <Printer size={16} /> PDF
            </motion.button>
            <motion.button whileHover={{ scale: 1.02 }} onClick={() => setShowImportModal(true)} style={{...styles.iconBtn, color: '#8b5cf6'}}>
              <Upload size={16} /> Import
            </motion.button>
            <motion.button whileHover={{ scale: 1.02 }} onClick={loadUsers} style={styles.iconBtn}>
              <RefreshCw size={16} /> Rafraîchir
            </motion.button>
            {isAdminSysteme && (
              <motion.button whileHover={{ scale: 1.02 }} onClick={() => setShowCreateModal(true)} style={styles.createBtn}>
                <Plus size={16} /> Nouvel utilisateur
              </motion.button>
            )}
            <button onClick={logout} style={styles.logoutBtn}><LogOut size={16} /> Déconnexion</button>
          </div>
        </div>

        {/* Statistiques */}
        <div style={styles.statsGrid}>
          {roles.map(role => (
            <StatCard key={role.value} title={role.label} value={role.count} icon={<span>{role.icon}</span>} color="#3b82f6" />
          ))}
        </div>

        {/* Bulk Actions */}
        {selectedUsers.length > 0 && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} style={styles.bulkBar}>
            <span style={{ color: '#f8fafc' }}>{selectedUsers.length} sélectionné(s)</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => handleBulkAction('activate')} style={styles.bulkBtn}><Unlock size={14} /> Activer</button>
              <button onClick={() => handleBulkAction('deactivate')} style={styles.bulkBtn}><Lock size={14} /> Désactiver</button>
              <button onClick={() => handleBulkAction('delete')} style={{...styles.bulkBtn, color: '#ef4444'}}><Trash2 size={14} /> Supprimer</button>
              <button onClick={() => setSelectedUsers([])} style={styles.bulkBtn}><X size={14} /> Annuler</button>
            </div>
          </motion.div>
        )}

        {/* Filtres */}
        <div style={styles.filtersBar}>
          <div style={styles.searchWrapper}>
            <Search size={16} style={styles.searchIcon} />
            <input type="text" placeholder="Rechercher par nom, email, matricule..." value={search} onChange={e => { setSearch(e.target.value); setCurrentPage(1); }} style={styles.searchInput} />
          </div>
          <div style={styles.filterGroup}>
            {roles.map(role => (
              <button key={role.value} onClick={() => { setFilterRole(role.value); setCurrentPage(1); }} style={{...styles.filterBtn, background: filterRole === role.value ? 'rgba(59,130,246,0.2)' : 'rgba(255,255,255,0.05)', borderColor: filterRole === role.value ? '#3b82f6' : 'rgba(59,130,246,0.2)'}}>
                {role.icon} {role.label}
              </button>
            ))}
          </div>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={styles.statusSelect}>
            <option value="all">Tous statuts</option>
            <option value="active">Actifs</option>
            <option value="inactive">Inactifs</option>
          </select>
        </div>

        {/* Tableau des utilisateurs */}
        {loading ? (
          <div style={styles.loadingState}>
            <RefreshCw size={32} style={{ animation: 'spin 1s linear infinite' }} />
            <p>Chargement des utilisateurs...</p>
          </div>
        ) : paginatedUsers.length === 0 ? (
          <div style={styles.emptyState}>
            <Users size={48} color="#1e293b" />
            <p>Aucun utilisateur trouvé</p>
            {search && <button onClick={() => setSearch('')} style={styles.clearBtn}>Effacer la recherche</button>}
          </div>
        ) : (
          <>
            <div style={styles.tableContainer}>
              <table style={styles.table}>
                <thead>
                  <tr style={styles.tableHeader}>
                    <th style={{ width: 40 }}>
                      <input type="checkbox" onChange={handleSelectAll} checked={selectedUsers.length === paginatedUsers.length && paginatedUsers.length > 0} style={styles.checkbox} />
                    </th>
                    <th onClick={() => { setSortBy('name'); setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc'); }} style={styles.sortableHeader}>
                      Utilisateur {sortBy === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </th>
                    <th>Contact</th>
                    <th>Rôle</th>
                    <th>Statut</th>
                    <th style={{ width: 120 }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <AnimatePresence>
                    {paginatedUsers.map(u => (
                      <motion.tr key={u._id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={styles.tableRow}>
                        <td><input type="checkbox" checked={selectedUsers.includes(u._id)} onChange={() => handleSelectUser(u._id)} style={styles.checkbox} /></td>
                        <td>
                          <div style={styles.userCell}>
                            <div style={styles.userAvatar}>{u.name?.charAt(0) || '?'}</div>
                            <div>
                              <div style={styles.userName}>{u.name}</div>
                              <div style={styles.userMeta}>@{u.username} • {u.matricule && `Mat: ${u.matricule}`}</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div style={styles.contactCell}>
                            <div>{u.email}</div>
                            {u.level && <div style={styles.userMeta}>{u.level}</div>}
                          </div>
                        </td>
                        <td><RoleBadge role={u.role} status={u.status === 'active' ? 'active' : 'inactive'} /></td>
                        <td>
                          <span style={{...styles.statusBadge, 
  background: u.status === 'active' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)', 
  color: u.status === 'active' ? '#10b981' : '#ef4444'}}>
  {u.status === 'active' ? 'Actif' : 'Inactif'}
</span>
                        </td>
                        <td>
                          <div style={styles.actionsCell}>
                            <button onClick={() => setShowDetailModal(u)} style={styles.actionBtn} title="Détails"><Eye size={14} />
                            </button>
                            <button 
  onClick={() => handleToggleStatus(u._id, u.status)} 
  style={styles.actionBtn} 
  title={u.status === 'active' ? 'Désactiver' : 'Activer'}
>
  {u.status === 'active' ? <Lock size={14} /> : <Unlock size={14} />}
</button>
                            <button onClick={() => handleResetPassword(u._id)} style={styles.actionBtn} title="Réinitialiser mot de passe"><Key size={14} /></button>
                            {isAdminSysteme && (
                              <button onClick={() => setDeleteConfirm(u._id)} style={{...styles.actionBtn, color: '#ef4444'}} title="Supprimer"><Trash2 size={14} /></button>
                            )}
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div style={styles.pagination}>
                <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} style={{...styles.pageBtn, opacity: currentPage === 1 ? 0.5 : 1}}><ChevronLeft size={16} /></button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum = currentPage <= 3 ? i + 1 : currentPage >= totalPages - 2 ? totalPages - 4 + i : currentPage - 2 + i;
                  return (
                    <button key={pageNum} onClick={() => setCurrentPage(pageNum)} style={{...styles.pageBtn, background: currentPage === pageNum ? '#3b82f6' : 'rgba(255,255,255,0.05)'}}>
                      {pageNum}
                    </button>
                  );
                })}
                <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} style={{...styles.pageBtn, opacity: currentPage === totalPages ? 0.5 : 1}}><ChevronRight size={16} /></button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modals */}
      <CreateUserModal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} onCreate={handleCreate} loading={createLoading} />
      <ImportModal isOpen={showImportModal} onClose={() => setShowImportModal(false)} onImport={handleImport} loading={importLoading} />
      <UserDetailModal isOpen={!!showDetailModal} onClose={() => setShowDetailModal(null)} user={showDetailModal} onUpdate={handleUpdate} />
      <ConfirmModal isOpen={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} onConfirm={() => handleDelete(deleteConfirm)} title="Supprimer l'utilisateur" message="Cette action est irréversible." loading={deleteLoading} />

      <Toaster position="top-right" toastOptions={{ style: { background: '#1e293b', color: '#f8fafc', border: '1px solid #3b82f6' } }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } } @media print { .no-print { display: none; } }`}</style>
    </div>
  );
};

// ========== STYLES COMPLETS ==========
const styles = {
  app: { minHeight: '100vh', background: 'linear-gradient(135deg, #05071a, #0a0f2e)' },
  container: { maxWidth: 1400, margin: '0 auto', padding: 24 },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 16 },
  headerLeft: { display: 'flex', alignItems: 'center', gap: 16 },
  headerRight: { display: 'flex', gap: 12, flexWrap: 'wrap' },
  backBtn: { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 12, padding: '8px 16px', color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 },
  title: { fontSize: '1.8rem', fontWeight: 700, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: 12 },
  subtitle: { color: '#64748b', fontSize: '0.8rem', marginTop: 4 },
  iconBtn: { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(99,102,241,0.2)', padding: '8px 14px', borderRadius: 10, color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 },
  createBtn: { background: 'linear-gradient(135deg, #3b82f6, #2563eb)', padding: '8px 20px', borderRadius: 10, color: '#fff', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 },
  logoutBtn: { background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', padding: '8px 16px', borderRadius: 10, color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 24 },
  bulkBar: { background: 'rgba(59,130,246,0.1)', border: '1px solid #3b82f6', borderRadius: 12, padding: '12px 20px', marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 },
  bulkBtn: { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(99,102,241,0.2)', padding: '6px 12px', borderRadius: 8, color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem' },
  filtersBar: { display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 20, alignItems: 'center' },
  searchWrapper: { position: 'relative', flex: 1, minWidth: 200 },
  searchIcon: { position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#64748b' },
  searchInput: { width: '100%', padding: '10px 12px 10px 38px', background: 'rgba(15,23,42,0.7)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 10, color: '#f8fafc', outline: 'none' },
  filterGroup: { display: 'flex', gap: 8, flexWrap: 'wrap' },
  filterBtn: { padding: '6px 12px', borderRadius: 20, fontSize: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 },
  statusSelect: { padding: '8px 12px', background: 'rgba(15,23,42,0.7)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 10, color: '#f8fafc' },
  tableContainer: { background: 'rgba(15,23,42,0.5)', borderRadius: 16, overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse' },
  tableHeader: { borderBottom: '1px solid rgba(99,102,241,0.1)', color: '#64748b', fontSize: '0.75rem', textAlign: 'left' },
  sortableHeader: { padding: '14px 12px', cursor: 'pointer', userSelect: 'none' },
  tableRow: { borderBottom: '1px solid rgba(99,102,241,0.05)', transition: 'background 0.2s', cursor: 'pointer', '&:hover': { background: 'rgba(59,130,246,0.05)' } },
  checkbox: { width: 16, height: 16, cursor: 'pointer' },
  userCell: { display: 'flex', alignItems: 'center', gap: 12, padding: '12px' },
  userAvatar: { width: 36, height: 36, borderRadius: 36, background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 600 },
  userName: { color: '#f8fafc', fontWeight: 500, fontSize: '0.85rem' },
  userMeta: { color: '#64748b', fontSize: '0.7rem' },
  contactCell: { padding: '12px' },
  statusBadge: { padding: '2px 8px', borderRadius: 20, fontSize: '0.7rem', fontWeight: 500 },
  actionsCell: { display: 'flex', gap: 8, padding: '12px' },
  actionBtn: { background: 'rgba(255,255,255,0.05)', border: 'none', padding: 6, borderRadius: 6, color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center' },
  pagination: { display: 'flex', justifyContent: 'center', gap: 8, marginTop: 24 },
  pageBtn: { width: 32, height: 32, borderRadius: 8, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(99,102,241,0.2)', color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  loadingState: { textAlign: 'center', padding: '60px', color: '#94a3b8' },
  emptyState: { textAlign: 'center', padding: '60px', color: '#64748b', background: 'rgba(15,23,42,0.5)', borderRadius: 16 },
  clearBtn: { marginTop: 12, color: '#3b82f6', background: 'none', border: 'none', cursor: 'pointer' },
  authContainer: { minHeight: '100vh', background: 'linear-gradient(135deg, #05071a, #0a0f2e)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  authCard: { textAlign: 'center', background: 'rgba(15,23,42,0.7)', border: '1px solid #ef4444', borderRadius: 24, padding: 40, maxWidth: 380 },
  authButton: { marginTop: 20, padding: '10px 28px', background: 'linear-gradient(135deg, #4f46e5, #6366f1)', border: 'none', borderRadius: 32, color: '#fff', cursor: 'pointer' },
  modalOverlay: { position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  modalContent: { background: '#0f172a', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 20, width: '90%', maxWidth: 500, maxHeight: '90vh', overflow: 'auto' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid rgba(99,102,241,0.1)', color: '#f8fafc', fontWeight: 600 },
  modalBody: { padding: '20px' },
  modalFooter: { display: 'flex', justifyContent: 'flex-end', gap: 12, padding: '16px 20px', borderTop: '1px solid rgba(99,102,241,0.1)' },
  closeBtn: { background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' },
  cancelBtn: { padding: '8px 16px', background: '#334155', border: 'none', borderRadius: 8, color: '#fff', cursor: 'pointer' },
  confirmBtn: { padding: '8px 16px', border: 'none', borderRadius: 8, color: '#fff', cursor: 'pointer' },
  label: { color: '#94a3b8', fontSize: '0.75rem', marginBottom: 4, display: 'block' },
  input: { width: '100%', padding: '10px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 8, color: '#f8fafc', outline: 'none' },
  select: { width: '100%', padding: '10px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 8, color: '#f8fafc' },
  fileInput: { width: '100%', padding: 8, background: 'rgba(255,255,255,0.05)', border: '1px dashed #3b82f6', borderRadius: 8, color: '#f8fafc' },
  eyeBtn: { position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' },
  errorText: { color: '#ef4444', fontSize: '0.65rem', marginTop: 4 }
};

export default UserManagementPage;