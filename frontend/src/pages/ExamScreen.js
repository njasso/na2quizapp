// src/pages/ExamScreen.js
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BookOpen, Clock, Calendar, Eye, ChevronRight } from 'lucide-react';
import axios from 'axios';

const NODE_BACKEND_URL = process.env.REACT_APP_BACKEND_URL || (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:5000');

function ExamScreen() {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const loadExams = async () => {
      try {
        const response = await axios.get(`${NODE_BACKEND_URL}/api/exams`);
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
        setExams(examsData);
      } catch (err) {
        setError("Échec du chargement des épreuves");
        console.error('Erreur chargement examens:', err);
      } finally {
        setLoading(false);
      }
    };
    loadExams();
  }, []);

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #05071a 0%, #0a0f2e 60%, #05071a 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: "'DM Sans', sans-serif",
      }}>
        <div style={{
          width: '48px',
          height: '48px',
          border: '3px solid rgba(59,130,246,0.1)',
          borderTopColor: '#3b82f6',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
        }} />
        <p style={{ color: '#94a3b8', marginTop: '16px' }}>Chargement des épreuves...</p>
        <style>{`
          @keyframes spin { to { transform: rotate(360deg); } }
        `}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #05071a 0%, #0a0f2e 60%, #05071a 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: "'DM Sans', sans-serif",
        color: '#ef4444',
      }}>
        Erreur : {error}
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      fontFamily: "'DM Sans', sans-serif",
      background: 'linear-gradient(135deg, #05071a 0%, #0a0f2e 60%, #05071a 100%)',
      position: 'relative',
      overflow: 'hidden',
      padding: '24px',
    }}>
      {/* Grille de fond */}
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

      <main style={{ position: 'relative', zIndex: 1, maxWidth: '1200px', margin: '0 auto' }}>
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ textAlign: 'center', marginBottom: '48px' }}
        >
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px',
            padding: '5px 14px', marginBottom: '16px',
            background: 'rgba(37,99,235,0.12)',
            border: '1px solid rgba(59,130,246,0.25)',
            borderRadius: '999px',
          }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#3b82f6', boxShadow: '0 0 8px #3b82f6' }} />
            <span style={{ fontSize: '0.75rem', color: '#93c5fd', fontWeight: 600, letterSpacing: '0.08em' }}>
              BIBLIOTHÈQUE D'ÉPREUVES
            </span>
          </div>
          <h1 style={{
            fontFamily: "'Sora', sans-serif",
            fontSize: '2rem',
            fontWeight: 700,
            color: '#f8fafc',
            marginBottom: '8px',
          }}>
            Épreuves Disponibles
          </h1>
          <p style={{ fontSize: '0.9375rem', color: 'rgba(203,213,225,0.7)' }}>
            {exams.length} épreuve(s) trouvée(s) dans la base de données
          </p>
        </motion.div>

        {exams.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '60px 20px',
            background: 'rgba(15,23,42,0.5)',
            borderRadius: '16px',
            color: '#94a3b8',
          }}>
            Aucune épreuve disponible pour le moment.
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: '20px',
          }}>
            {exams.map((exam, index) => (
              <motion.div
                key={exam._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                whileHover={{ y: -4 }}
                style={{
                  background: 'rgba(15,23,42,0.7)',
                  backdropFilter: 'blur(12px)',
                  border: '1px solid rgba(59,130,246,0.15)',
                  borderRadius: '16px',
                  padding: '24px',
                  cursor: 'pointer',
                }}
                onClick={() => navigate(`/exam/profile/${exam._id}`)}
              >
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '16px',
                }}>
                  <BookOpen size={22} color="#fff" />
                </div>

                <h3 style={{
                  fontFamily: "'Sora', sans-serif",
                  fontSize: '1.125rem',
                  fontWeight: 600,
                  color: '#f8fafc',
                  marginBottom: '8px',
                }}>
                  {exam.title}
                </h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                  {exam.domain && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{
                        fontSize: '0.75rem',
                        padding: '2px 8px',
                        background: 'rgba(59,130,246,0.1)',
                        color: '#3b82f6',
                        borderRadius: '999px',
                      }}>
                        {exam.domain}
                      </span>
                      {exam.level && (
                        <span style={{
                          fontSize: '0.75rem',
                          padding: '2px 8px',
                          background: 'rgba(139,92,246,0.1)',
                          color: '#8b5cf6',
                          borderRadius: '999px',
                        }}>
                          {exam.level}
                        </span>
                      )}
                    </div>
                  )}

                  {exam.duration && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#94a3b8' }}>
                      <Clock size={14} />
                      <span style={{ fontSize: '0.875rem' }}>{exam.duration} minutes</span>
                    </div>
                  )}

                  {exam.createdAt && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#94a3b8' }}>
                      <Calendar size={14} />
                      <span style={{ fontSize: '0.875rem' }}>
                        {new Date(exam.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginTop: '16px',
                  paddingTop: '16px',
                  borderTop: '1px solid rgba(59,130,246,0.1)',
                }}>
                  <span style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    color: '#94a3b8',
                    fontSize: '0.875rem',
                  }}>
                    <Eye size={14} />
                    {exam.questions?.length || 0} questions
                  </span>
                  <ChevronRight size={18} color="#3b82f6" />
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </main>

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
      `}</style>
    </div>
  );
}

export default ExamScreen;