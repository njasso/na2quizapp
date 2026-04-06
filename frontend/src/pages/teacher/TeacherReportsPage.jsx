// src/pages/teacher/TeacherReportsPage.jsx - Version CORRIGÉE
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';  // ✅ Correction: from manquant
import { motion } from 'framer-motion';
import { toast, Toaster } from 'react-hot-toast';
import {
  Home, RefreshCw, Search, Eye, Download, Printer,
  FileText, ArrowLeft, Loader2, ShieldAlert, Tag, Layers
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';

const TeacherReportsPage = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const [exams, setExams] = useState([]);
  const [selectedExam, setSelectedExam] = useState(null);
  const [results, setResults] = useState([]);
  const [filteredResults, setFilteredResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [stats, setStats] = useState({ total: 0, passed: 0, avgScore: 0, bestScore: 0, worstScore: 0 });
  const [error, setError] = useState(null);
  const [accessDenied, setAccessDenied] = useState(false);

  // Fonctions utilitaires
  const getMention = (percentage) => {
    if (percentage >= 90) return { label: 'Très Bien', color: '#10b981' };
    if (percentage >= 75) return { label: 'Bien', color: '#3b82f6' };
    if (percentage >= 60) return { label: 'Assez Bien', color: '#8b5cf6' };
    if (percentage >= 50) return { label: 'Passable', color: '#f59e0b' };
    return { label: 'Insuffisant', color: '#ef4444' };
  };

  const viewBulletin = (resultId) => {
    const baseURL = api.defaults.baseURL;
    window.open(`${baseURL}/api/bulletin/${resultId}`, '_blank');
  };

  const exportCSV = () => {
    if (filteredResults.length === 0) {
      toast.error('Aucune donnée à exporter');
      return;
    }

    const headers = ['Nom', 'Prénom', 'Matricule', 'Domaine', 'Niveau', 'Score', 'Pourcentage', 'Statut', 'Date', 'Note/20'];
    const rows = filteredResults.map(r => [
      r.studentInfo?.lastName || '',
      r.studentInfo?.firstName || '',
      r.studentInfo?.matricule || '',
      r.examId?.domain || r.domain || '',
      r.examId?.level || r.level || '',
      r.score || 0,
      r.percentage || 0,
      r.passed ? 'Réussi' : 'Échoué',
      new Date(r.createdAt).toLocaleDateString('fr-FR'),
      ((r.percentage / 100) * 20).toFixed(2)
    ]);
    
    const csvContent = [headers, ...rows].map(row => row.join(';')).join('\n');
    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.setAttribute('download', `rapport_${selectedExam?.title?.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().slice(0, 19)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('Export CSV réussi');
  };

  // ✅ RÉCUPÉRATION DES RÉSULTATS D'UN EXAMEN
  const fetchExamResults = async (examId) => {
    setLoading(true);
    setError(null);
    try {
      console.log('🔍 Récupération des résultats pour examen:', examId);
      
      const response = await api.get(`/api/results/exam/${examId}`);
      
      console.log('📦 Réponse brute:', response);
      
      let data = [];
      if (response?.data && Array.isArray(response.data)) {
        data = response.data;
      } else if (response && Array.isArray(response)) {
        data = response;
      } else if (response?.results && Array.isArray(response.results)) {
        data = response.results;
      } else if (response?.success === true && response?.data && Array.isArray(response.data)) {
        data = response.data;
      }
      
      console.log('✅ Données extraites:', data.length, 'résultats');
      
      setResults(data);
      setFilteredResults(data);
      
      if (data.length > 0) {
        const passed = data.filter(r => r.passed).length;
        const scores = data.map(r => r.percentage || 0);
        const avgScore = scores.reduce((a, b) => a + b, 0) / data.length;
        const bestScore = Math.max(...scores);
        const worstScore = Math.min(...scores);
        
        setStats({
          total: data.length,
          passed,
          avgScore: avgScore.toFixed(1),
          bestScore,
          worstScore
        });
      } else {
        setStats({ total: 0, passed: 0, avgScore: 0, bestScore: 0, worstScore: 0 });
        toast.info('Aucun résultat pour cette épreuve');
      }
      
    } catch (error) {
      console.error('❌ Erreur chargement résultats:', error);
      let errorMsg = "Erreur chargement des résultats";
      
      if (error.response?.status === 401) {
        errorMsg = "Session expirée. Veuillez vous reconnecter.";
        localStorage.removeItem('userToken');
        localStorage.removeItem('userInfo');
        setTimeout(() => navigate('/login'), 2000);
      } else if (error.response?.status === 403) {
        errorMsg = "Accès non autorisé. Vous n'êtes pas le propriétaire de cette épreuve.";
      } else if (error.response?.status === 404) {
        errorMsg = "Épreuve non trouvée";
      } else if (error.message) {
        errorMsg = error.message;
      }
      
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // ✅ RÉCUPÉRATION DES ÉPREUVES DE L'ENSEIGNANT
  const fetchTeacherExams = async () => {
    setLoading(true);
    setError(null);
    try {
      console.log('🔍 Récupération des épreuves de l\'enseignant...');
      console.log('👤 Utilisateur:', user?.name, 'Rôle:', user?.role);
      
      const response = await api.get('/api/exams/teacher');
      
      console.log('📦 Réponse épreuves:', response);
      
      let examsData = [];
      if (response?.data && Array.isArray(response.data)) {
        examsData = response.data;
      } else if (Array.isArray(response)) {
        examsData = response;
      } else if (response?.exams && Array.isArray(response.exams)) {
        examsData = response.exams;
      } else if (response?.success === true && response?.data && Array.isArray(response.data)) {
        examsData = response.data;
      }
      
      console.log('✅ Épreuves extraites:', examsData.length);
      setExams(examsData);
      
      if (examsData.length === 0) {
        toast('Aucune épreuve trouvée', { icon: 'ℹ️' });
      } else {
        toast.success(`${examsData.length} épreuve(s) trouvée(s)`);
      }
    } catch (error) {
      console.error('❌ Erreur chargement épreuves:', error);
      
      let errorMsg = "Erreur chargement des épreuves";
      if (error.response?.status === 401) {
        errorMsg = "Session expirée. Veuillez vous reconnecter.";
        localStorage.removeItem('userToken');
        localStorage.removeItem('userInfo');
        setTimeout(() => navigate('/login'), 2000);
      } else if (error.response?.status === 403) {
        errorMsg = "Accès non autorisé. Rôle ENSEIGNANT requis.";
        setAccessDenied(true);
        setTimeout(() => navigate('/evaluate'), 2000);
      } else if (error.message) {
        errorMsg = error.message;
      }
      
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // Filtrage
  useEffect(() => {
    let filtered = [...results];
    
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(r => 
        `${r.studentInfo?.lastName} ${r.studentInfo?.firstName}`.toLowerCase().includes(searchLower) ||
        r.studentInfo?.matricule?.toLowerCase().includes(searchLower)
      );
    }
    
    if (filterStatus === 'passed') {
      filtered = filtered.filter(r => r.passed);
    } else if (filterStatus === 'failed') {
      filtered = filtered.filter(r => !r.passed);
    }
    
    setFilteredResults(filtered);
  }, [results, searchTerm, filterStatus]);

  // Authentification et chargement initial
  useEffect(() => {
    if (authLoading) return;
    
    if (!isAuthenticated || !user) {
      toast.error('Veuillez vous connecter');
      navigate('/login');
      return;
    }
    
    const allowedRoles = ['ENSEIGNANT', 'ADMIN_DELEGUE', 'ADMIN_SYSTEME'];
    if (!allowedRoles.includes(user.role)) {
      console.warn(`Accès refusé: rôle ${user.role} non autorisé`);
      setAccessDenied(true);
      toast.error('Accès non autorisé. Cette page est réservée aux enseignants.');
      setTimeout(() => navigate('/evaluate'), 2000);
      return;
    }
    
    fetchTeacherExams();
  }, [user, isAuthenticated, authLoading, navigate]);

  if (accessDenied) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #05071a, #0a0f2e)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px'
      }}>
        <div style={{
          background: 'rgba(239,68,68,0.1)',
          border: '1px solid #ef4444',
          borderRadius: 24,
          padding: 48,
          textAlign: 'center',
          maxWidth: 500
        }}>
          <ShieldAlert size={64} color="#ef4444" style={{ marginBottom: 16 }} />
          <h2 style={{ color: '#f8fafc', marginBottom: 12 }}>Accès non autorisé</h2>
          <p style={{ color: '#ef4444', marginBottom: 24 }}>
            Cette page est réservée aux enseignants.
            <br />Votre rôle actuel: <strong>{user?.role || 'inconnu'}</strong>
          </p>
          <button
            onClick={() => navigate('/evaluate')}
            style={{
              padding: '10px 24px',
              background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
              border: 'none',
              borderRadius: 8,
              color: 'white',
              cursor: 'pointer'
            }}
          >
            Retour au tableau de bord
          </button>
        </div>
      </div>
    );
  }

  if (authLoading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #05071a, #0a0f2e)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <Loader2 size={48} color="#3b82f6" className="animate-spin" />
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #05071a 0%, #0a0f2e 60%, #05071a 100%)',
      padding: '24px'
    }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        {/* Header avec retour */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 32 }}>
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
            <span>Tableau de bord</span>
          </motion.button>
          <div>
            <h1 style={{ fontSize: '2rem', fontWeight: 700, color: '#f8fafc', marginBottom: 4 }}>
              Rapports d'évaluation
            </h1>
            <p style={{ color: '#64748b' }}>
              {user?.name} · Consultez les résultats de vos épreuves
            </p>
          </div>
        </div>

        {error && (
          <div style={{
            background: 'rgba(239,68,68,0.1)',
            border: '1px solid #ef4444',
            borderRadius: 12,
            padding: 16,
            marginBottom: 20,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            color: '#ef4444'
          }}>
            <span>{error}</span>
            <button
              onClick={selectedExam ? () => fetchExamResults(selectedExam._id) : fetchTeacherExams}
              style={{
                padding: '6px 16px',
                background: 'rgba(239,68,68,0.2)',
                border: 'none',
                borderRadius: 8,
                color: '#ef4444',
                cursor: 'pointer'
              }}
            >
              Réessayer
            </button>
          </div>
        )}

        {/* Sélection de l'épreuve */}
        <div style={{ marginBottom: 24 }}>
          <label style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: 8, display: 'block' }}>
            Sélectionner une épreuve
          </label>
          <select
            value={selectedExam?._id || ''}
            onChange={(e) => {
              const exam = exams.find(exp => exp._id === e.target.value);
              setSelectedExam(exam);
              if (exam) fetchExamResults(exam._id);
            }}
            disabled={loading || exams.length === 0}
            style={{
              width: '100%',
              maxWidth: 500,
              padding: '12px 16px',
              background: 'rgba(15,23,42,0.7)',
              border: '1px solid rgba(59,130,246,0.2)',
              borderRadius: 12,
              color: '#f8fafc',
              fontSize: '0.9rem',
              outline: 'none',
              cursor: exams.length === 0 ? 'not-allowed' : 'pointer'
            }}
          >
            <option value="">-- Choisir une épreuve --</option>
            {exams.map(exam => (
              <option key={exam._id} value={exam._id}>
                {exam.title} {exam.level ? `(${exam.level})` : ''}
              </option>
            ))}
          </select>
          {selectedExam && (selectedExam.domain || selectedExam.level) && (
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              {selectedExam.domain && (
                <span style={{ fontSize: '0.7rem', padding: '2px 8px', background: 'rgba(59,130,246,0.15)', borderRadius: 4, color: '#60a5fa' }}>
                  <Tag size={10} style={{ display: 'inline', marginRight: 2 }} />
                  {selectedExam.domain}
                </span>
              )}
              {selectedExam.level && (
                <span style={{ fontSize: '0.7rem', padding: '2px 8px', background: 'rgba(139,92,246,0.15)', borderRadius: 4, color: '#a78bfa' }}>
                  <Layers size={10} style={{ display: 'inline', marginRight: 2 }} />
                  {selectedExam.level}
                </span>
              )}
            </div>
          )}
        </div>

        {selectedExam && (
          <>
            {/* Stats */}
            {results.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 16, marginBottom: 24 }}>
                <div style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 12, padding: 16 }}>
                  <div style={{ color: '#3b82f6', fontSize: '1.5rem', fontWeight: 700 }}>{stats.total}</div>
                  <div style={{ color: '#94a3b8', fontSize: '0.75rem' }}>Participants</div>
                </div>
                <div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 12, padding: 16 }}>
                  <div style={{ color: '#10b981', fontSize: '1.5rem', fontWeight: 700 }}>{stats.passed}</div>
                  <div style={{ color: '#94a3b8', fontSize: '0.75rem' }}>Reçus</div>
                </div>
                <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 12, padding: 16 }}>
                  <div style={{ color: '#ef4444', fontSize: '1.5rem', fontWeight: 700 }}>{stats.total - stats.passed}</div>
                  <div style={{ color: '#94a3b8', fontSize: '0.75rem' }}>Échoués</div>
                </div>
                <div style={{ background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.2)', borderRadius: 12, padding: 16 }}>
                  <div style={{ color: '#8b5cf6', fontSize: '1.5rem', fontWeight: 700 }}>{stats.avgScore}%</div>
                  <div style={{ color: '#94a3b8', fontSize: '0.75rem' }}>Moyenne</div>
                </div>
                <div style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 12, padding: 16 }}>
                  <div style={{ color: '#f59e0b', fontSize: '1.5rem', fontWeight: 700 }}>{stats.bestScore}%</div>
                  <div style={{ color: '#94a3b8', fontSize: '0.75rem' }}>Meilleur score</div>
                </div>
              </div>
            )}

            {/* Filtres et actions */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
                <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                <input
                  type="text"
                  placeholder="Rechercher un étudiant..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  style={{
                    width: '100%', padding: '10px 12px 10px 38px',
                    background: 'rgba(15,23,42,0.7)', border: '1px solid rgba(59,130,246,0.2)',
                    borderRadius: 10, color: '#f8fafc', outline: 'none'
                  }}
                />
              </div>
              
              <select
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)}
                style={{
                  padding: '10px 12px', background: '#0f172a',
                  border: '1px solid rgba(59,130,246,0.2)', borderRadius: 10,
                  color: '#e2e8f0', outline: 'none'
                }}
              >
                <option value="">Tous les statuts</option>
                <option value="passed">✓ Reçus</option>
                <option value="failed">✗ Échoués</option>
              </select>
              
              {(searchTerm || filterStatus) && (
                <button
                  onClick={() => { setSearchTerm(''); setFilterStatus(''); }}
                  style={{
                    padding: '8px 16px', background: 'rgba(239,68,68,0.1)',
                    border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8,
                    color: '#ef4444', cursor: 'pointer'
                  }}
                >
                  Effacer
                </button>
              )}
              
              <button
                onClick={exportCSV}
                disabled={filteredResults.length === 0}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '8px 16px',
                  background: filteredResults.length === 0 ? 'rgba(16,185,129,0.05)' : 'rgba(16,185,129,0.1)',
                  border: '1px solid rgba(16,185,129,0.3)',
                  borderRadius: 8,
                  color: filteredResults.length === 0 ? '#64748b' : '#10b981',
                  cursor: filteredResults.length === 0 ? 'not-allowed' : 'pointer'
                }}
              >
                <Download size={14} /> Exporter CSV
              </button>
              
              <button
                onClick={() => window.print()}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '8px 16px',
                  background: 'rgba(59,130,246,0.1)',
                  border: '1px solid rgba(59,130,246,0.3)',
                  borderRadius: 8,
                  color: '#60a5fa',
                  cursor: 'pointer'
                }}
              >
                <Printer size={14} /> Imprimer
              </button>
            </div>

            {/* Liste des résultats */}
            {loading ? (
              <div style={{ textAlign: 'center', padding: 60 }}>
                <RefreshCw size={32} style={{ animation: 'spin 1s linear infinite', color: '#3b82f6' }} />
                <p style={{ color: '#94a3b8', marginTop: 16 }}>Chargement des résultats...</p>
              </div>
            ) : filteredResults.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 80, color: '#64748b', background: 'rgba(15,23,42,0.5)', borderRadius: 24 }}>
                <FileText size={48} style={{ marginBottom: 16 }} />
                <p>{results.length === 0 ? 'Aucun résultat pour cette épreuve.' : 'Aucun résultat ne correspond aux filtres.'}</p>
              </div>
            ) : (
              <div style={{ background: 'rgba(15,23,42,0.5)', borderRadius: 16, overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(0,0,0,0.2)' }}>
                        <th style={{ padding: '12px 16px', textAlign: 'left', color: '#94a3b8' }}>Candidat</th>
                        <th style={{ padding: '12px 16px', textAlign: 'left', color: '#94a3b8' }}>Matricule</th>
                        <th style={{ padding: '12px 16px', textAlign: 'left', color: '#94a3b8' }}>Domaine</th>
                        <th style={{ padding: '12px 16px', textAlign: 'left', color: '#94a3b8' }}>Niveau</th>
                        <th style={{ padding: '12px 16px', textAlign: 'center', color: '#94a3b8' }}>Score</th>
                        <th style={{ padding: '12px 16px', textAlign: 'center', color: '#94a3b8' }}>%</th>
                        <th style={{ padding: '12px 16px', textAlign: 'center', color: '#94a3b8' }}>Note/20</th>
                        <th style={{ padding: '12px 16px', textAlign: 'center', color: '#94a3b8' }}>Mention</th>
                        <th style={{ padding: '12px 16px', textAlign: 'center', color: '#94a3b8' }}>Bulletin</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredResults.map((result) => {
                        const mention = getMention(result.percentage);
                        const note20 = ((result.percentage / 100) * 20).toFixed(2);
                        return (
                          <tr key={result._id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                            <td style={{ padding: '12px 16px', color: '#f8fafc' }}>
                              {result.studentInfo?.lastName} {result.studentInfo?.firstName}
                            </td>
                            <td style={{ padding: '12px 16px', color: '#94a3b8', fontFamily: 'monospace' }}>
                              {result.studentInfo?.matricule || '—'}
                            </td>
                            <td style={{ padding: '12px 16px', color: '#60a5fa' }}>
                              {result.examId?.domain || result.domain || '—'}
                            </td>
                            <td style={{ padding: '12px 16px', color: '#a78bfa' }}>
                              {result.examId?.level || result.level || '—'}
                            </td>
                            <td style={{ padding: '12px 16px', textAlign: 'center', color: '#f8fafc' }}>
                              {result.score} / {result.totalQuestions}
                            </td>
                            <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                              <span style={{
                                padding: '2px 8px',
                                borderRadius: 20,
                                background: result.percentage >= 50 ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                                color: result.percentage >= 50 ? '#10b981' : '#ef4444',
                                fontWeight: 600
                              }}>
                                {result.percentage}%
                              </span>
                            </td>
                            <td style={{ padding: '12px 16px', textAlign: 'center', color: '#8b5cf6', fontWeight: 600 }}>
                              {note20}
                            </td>
                            <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                              <span style={{ color: mention.color, fontSize: '0.8rem' }}>
                                {mention.label}
                              </span>
                            </td>
                            <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                              <button
                                onClick={() => viewBulletin(result._id)}
                                style={{
                                  padding: '4px 10px',
                                  background: 'rgba(59,130,246,0.1)',
                                  border: '1px solid rgba(59,130,246,0.3)',
                                  borderRadius: 6,
                                  color: '#60a5fa',
                                  cursor: 'pointer',
                                  fontSize: '0.75rem'
                                }}
                              >
                                <Eye size={12} style={{ display: 'inline', marginRight: 4 }} />
                                Voir
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .animate-spin { animation: spin 1s linear infinite; }
      `}</style>
    </div>
  );
};

export default TeacherReportsPage;