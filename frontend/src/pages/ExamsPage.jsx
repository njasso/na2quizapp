// src/pages/ExamsPage.jsx — NA2Quiz Professional Design
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Edit, Trash2, Play, Eye, Plus, Home, RefreshCw, Search, Clock, Layers, BookOpen } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';

const NODE_BACKEND_URL = process.env.REACT_APP_BACKEND_URL || (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:5000');

const ExamsPage = () => {
  const navigate = useNavigate();
  const [exams, setExams] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchExams = async () => {
      setIsLoading(true);
      try {
        const response = await axios.get(`${NODE_BACKEND_URL}/api/exams`);
        console.log('📦 Réponse examens brute:', response.data);
        
        // ✅ CORRECTION: Extraire le tableau selon le format de la réponse
        let examsData = [];
        if (Array.isArray(response.data)) {
          examsData = response.data;
        } else if (response.data?.data && Array.isArray(response.data.data)) {
          examsData = response.data.data;
        } else if (response.data?.success && Array.isArray(response.data.data)) {
          examsData = response.data.data;
        } else {
          examsData = [];
        }
        
        console.log(`✅ ${examsData.length} examens chargés`);
        setExams(examsData);
      } catch (error) {
        console.error('Erreur chargement épreuves:', error);
        setExams([]);
      } finally { 
        setIsLoading(false); 
      }
    };
    fetchExams();
  }, []);

  const deleteExam = async (examId) => {
    try {
      await axios.delete(`${NODE_BACKEND_URL}/api/exams/${examId}`);
      setExams(exams.filter(e => e._id !== examId));
      setDeleteConfirm(null);
    } catch (error) { 
      console.error('Erreur suppression:', error); 
    }
  };

  // ✅ Vérification que exams est un tableau avant d'utiliser .filter
  const filtered = Array.isArray(exams) ? exams.filter(e =>
    !search ||
    e.title?.toLowerCase().includes(search.toLowerCase()) ||
    e.domain?.toLowerCase().includes(search.toLowerCase()) ||
    e.subject?.toLowerCase().includes(search.toLowerCase())
  ) : [];

  const domainColor = (domain) => {
    const map = { 
      'Informatique': '#3b82f6', 
      'Mathématiques': '#10b981', 
      'Sciences': '#f59e0b', 
      'Histoire': '#ef4444', 
      'Langue': '#8b5cf6',
      'Professionnel': '#10b981',
      'Éducatif': '#6366f1',
      'Management': '#8b5cf6'
    };
    return map[domain] || '#64748b';
  };

  const ActionBtn = ({ color, title, onClick, children }) => (
    <motion.button
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.92 }}
      title={title}
      onClick={onClick}
      style={{
        width: '34px', height: '34px',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        borderRadius: '8px',
        background: `${color}18`,
        border: `1px solid ${color}33`,
        color: color, cursor: 'pointer',
      }}
    >
      {children}
    </motion.button>
  );

  return (
    <div style={{
      minHeight: '100vh', fontFamily: "'DM Sans', sans-serif",
      background: 'linear-gradient(135deg, #05071a 0%, #0a0f2e 60%, #05071a 100%)',
      position: 'relative',
    }}>
      <div style={{
        position: 'fixed', inset: 0,
        backgroundImage: 'linear-gradient(rgba(59,130,246,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,0.03) 1px, transparent 1px)',
        backgroundSize: '40px 40px', pointerEvents: 'none', zIndex: 0,
      }} />

      {/* Topbar */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'rgba(5,7,26,0.9)', backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(59,130,246,0.1)',
        padding: '0 32px', height: '60px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span style={{
            fontFamily: "'Sora', sans-serif", fontWeight: 800, fontSize: '1.125rem',
            background: 'linear-gradient(135deg, #60a5fa, #a78bfa)',
            WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent',
          }}>NA²QUIZ</span>
          <div style={{ width: '1px', height: '20px', background: 'rgba(255,255,255,0.1)' }} />
          <span style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Épreuves</span>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
            onClick={() => navigate('/')}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 14px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: '#94a3b8', fontSize: '0.875rem', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
            <Home size={14} /> Accueil
          </motion.button>
          <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
            onClick={() => navigate('/create/database')}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 16px', borderRadius: '8px', background: 'linear-gradient(135deg, #1d4ed8, #2563eb)', border: 'none', color: '#fff', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
            <Plus size={14} /> Nouvelle épreuve
          </motion.button>
        </div>
      </header>

      <main style={{ position: 'relative', zIndex: 1, maxWidth: '1280px', margin: '0 auto', padding: '40px 24px' }}>

        {/* Page title + search */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 style={{ fontFamily: "'Sora', sans-serif", fontSize: '1.875rem', fontWeight: 800, letterSpacing: '-0.03em', color: '#f8fafc', marginBottom: '4px' }}>
              Épreuves d'Examens
            </h1>
            <p style={{ color: '#64748b', fontSize: '0.9rem' }}>
              {Array.isArray(exams) ? exams.length : 0} épreuve{exams.length !== 1 ? 's' : ''} au total
            </p>
          </div>
          <div style={{ position: 'relative', width: '280px' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#475569' }} />
            <input
              type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher une épreuve..."
              style={{
                width: '100%', padding: '9px 12px 9px 38px',
                background: 'rgba(15,23,42,0.7)', border: '1px solid rgba(59,130,246,0.18)',
                borderRadius: '10px', color: '#e2e8f0', fontFamily: "'DM Sans', sans-serif",
                fontSize: '0.875rem', outline: 'none',
              }}
            />
          </div>
        </div>

        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px', flexDirection: 'column', gap: '16px' }}>
            <RefreshCw size={32} color="#3b82f6" style={{ animation: 'spin 1s linear infinite' }} />
            <span style={{ color: '#64748b', fontSize: '0.9rem' }}>Chargement des épreuves…</span>
          </div>
        ) : filtered.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            style={{
              textAlign: 'center', padding: '80px 24px',
              background: 'rgba(15,23,42,0.5)', border: '1px dashed rgba(59,130,246,0.2)',
              borderRadius: '16px',
            }}>
            <BookOpen size={48} color="#1e293b" style={{ marginBottom: '16px' }} />
            <p style={{ color: '#475569', fontSize: '1rem', marginBottom: '20px' }}>
              {search ? 'Aucune épreuve ne correspond à votre recherche.' : 'Aucune épreuve disponible.'}
            </p>
            <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              onClick={() => navigate('/create/database')}
              style={{ padding: '10px 24px', background: 'linear-gradient(135deg, #1d4ed8, #2563eb)', border: 'none', borderRadius: '8px', color: '#fff', fontFamily: "'DM Sans', sans-serif", fontWeight: 600, cursor: 'pointer' }}>
              <Plus size={15} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle' }} />
              Créer une épreuve
            </motion.button>
          </motion.div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '18px' }}>
            <AnimatePresence>
              {filtered.map((exam, i) => {
                const color = domainColor(exam.domain);
                return (
                  <motion.div
                    key={exam._id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: i * 0.04 }}
                    whileHover={{ y: -4 }}
                    style={{
                      background: 'rgba(15,23,42,0.75)',
                      border: `1px solid ${color}22`,
                      borderRadius: '14px', padding: '22px',
                      backdropFilter: 'blur(12px)',
                      boxShadow: '0 4px 20px rgba(0,0,0,0.35)',
                      position: 'relative', overflow: 'hidden',
                      transition: 'border-color 0.2s, box-shadow 0.2s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = `${color}44`; e.currentTarget.style.boxShadow = `0 8px 32px rgba(0,0,0,0.4), 0 0 24px ${color}15`; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = `${color}22`; e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.35)'; }}
                  >
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: `linear-gradient(90deg, ${color}, transparent)` }} />

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
                      <h3 style={{ fontFamily: "'Sora', sans-serif", fontSize: '1rem', fontWeight: 700, color: '#f1f5f9', letterSpacing: '-0.01em', lineHeight: 1.35, flex: 1, paddingRight: '12px' }}>
                        {exam.title}
                      </h3>
                      <span style={{
                        padding: '3px 10px', borderRadius: '999px',
                        background: `${color}18`, border: `1px solid ${color}33`,
                        color: color, fontSize: '0.75rem', fontWeight: 700,
                        whiteSpace: 'nowrap',
                      }}>
                        {exam.totalPoints || 0} pts
                      </span>
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
                      {[exam.domain, exam.level, exam.subject].filter(Boolean).map((tag, j) => (
                        <span key={j} style={{
                          padding: '3px 8px', borderRadius: '6px',
                          background: 'rgba(255,255,255,0.06)',
                          color: '#94a3b8', fontSize: '0.75rem',
                        }}>
                          {tag}
                        </span>
                      ))}
                    </div>

                    <div style={{ display: 'flex', gap: '16px', marginBottom: '18px', paddingBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.8125rem', color: '#64748b' }}>
                        <Clock size={13} /> {exam.duration} min
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.8125rem', color: '#64748b' }}>
                        <Layers size={13} /> {exam.questions?.length || 0} questions
                      </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <ActionBtn color="#10b981" title="Composer" onClick={() => navigate(`/exam/profile/${exam._id}`)}>
                          <Play size={15} />
                        </ActionBtn>
                        <ActionBtn color="#3b82f6" title="Prévisualiser" onClick={() => navigate(`/preview/${exam._id}`)}>
                          <Eye size={15} />
                        </ActionBtn>
                        <ActionBtn color="#f59e0b" title="Modifier" onClick={() => navigate(`/edit/${exam._id}`)}>
                          <Edit size={15} />
                        </ActionBtn>
                      </div>
                      {deleteConfirm === exam._id ? (
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button onClick={() => deleteExam(exam._id)} style={{ padding: '5px 10px', background: '#dc2626', border: 'none', borderRadius: '6px', color: '#fff', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>Confirmer</button>
                          <button onClick={() => setDeleteConfirm(null)} style={{ padding: '5px 10px', background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: '6px', color: '#94a3b8', fontSize: '0.75rem', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>Annuler</button>
                        </div>
                      ) : (
                        <ActionBtn color="#ef4444" title="Supprimer" onClick={() => setDeleteConfirm(exam._id)}>
                          <Trash2 size={15} />
                        </ActionBtn>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </main>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@700;800&family=DM+Sans:wght@400;500;600;700&display=swap');
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default ExamsPage;