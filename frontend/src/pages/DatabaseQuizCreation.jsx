// src/pages/DatabaseQuizCreation.jsx - Version corrigée avec tous les imports
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Database, Save, Trash2, ArrowLeft, Search, Filter,
  BookOpen, BookMarked, Loader, AlertCircle, RefreshCw,
  CheckCircle, XCircle  // ✅ AJOUT DES IMPORTS MANQUANTS
} from 'lucide-react';
import DOMAIN_DATA from '../data/domainConfig';
import { getQuestions, createExam } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
};

const DatabaseQuizCreation = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [selectedDomain, setSelectedDomain] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedLevel, setSelectedLevel] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [examTitle, setExamTitle] = useState('');
  const [availableQuestions, setAvailableQuestions] = useState([]);
  const [selectedQuestions, setSelectedQuestions] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [fetchingQuestions, setFetchingQuestions] = useState(false);

  const domains = Object.keys(DOMAIN_DATA);
  const categories = selectedDomain ? Object.keys(DOMAIN_DATA[selectedDomain]) : [];
  const levels = selectedCategory ? DOMAIN_DATA[selectedDomain][selectedCategory].levels : [];
  const subjects = selectedCategory ? DOMAIN_DATA[selectedDomain][selectedCategory].subjects : [];

  // Charger les questions depuis l'API
  const loadAvailableQuestions = async () => {
    if (!selectedDomain || !selectedCategory || !selectedLevel || !selectedSubject) return;
    
    setFetchingQuestions(true);
    try {
      const response = await getQuestions({ 
        domaine: selectedDomain,
        sousDomaine: selectedCategory,
        niveau: selectedLevel,
        matiere: selectedSubject,
        limit: 1000 
      });
      
      // ✅ Normaliser toutes les formes de réponse possibles
      let allQuestions = [];
      const raw = response?.data?.data   // { success, data: [...], count }
                || response?.data        // axios response.data direct
                || response;             // déjà le tableau
      if (Array.isArray(raw)) {
        allQuestions = raw;
      } else if (raw?.data && Array.isArray(raw.data)) {
        allQuestions = raw.data;
      } else if (raw?.questions && Array.isArray(raw.questions)) {
        allQuestions = raw.questions;
      }
      
      // Normaliser les questions
      const normalized = allQuestions.map(q => ({
        id: q._id || q.id,
        text: q.question || q.text,
        options: q.options || [],
        correctAnswer: q.correctAnswer || q.answer,
        points: q.points || 1,
        explanation: q.explanation || '',
        type: q.type || 'single',
        niveau: q.niveau || selectedLevel,
        matiere: q.matiere || selectedSubject
      }));
      
      setAvailableQuestions(normalized);
      
      if (normalized.length === 0) {
        toast.error(`Aucune question trouvée pour ${selectedSubject} (niveau ${selectedLevel})`);
      } else {
        toast.success(`${normalized.length} questions trouvées`);
      }
    } catch (error) {
      console.error('Erreur chargement questions:', error);
      toast.error('Impossible de charger les questions');
    } finally {
      setFetchingQuestions(false);
    }
  };

  useEffect(() => {
    if (selectedDomain && selectedCategory && selectedLevel && selectedSubject) {
      loadAvailableQuestions();
    } else {
      setAvailableQuestions([]);
    }
  }, [selectedDomain, selectedCategory, selectedLevel, selectedSubject]);

  const filteredQuestions = availableQuestions.filter(q =>
    q.text?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const addQuestion = (question) => {
    if (!selectedQuestions.some(q => q.id === question.id)) {
      setSelectedQuestions([...selectedQuestions, question]);
      toast.success('Question ajoutée');
    } else {
      toast.error('Question déjà sélectionnée');
    }
  };

  const removeQuestion = (questionId) => {
    setSelectedQuestions(selectedQuestions.filter(q => q.id !== questionId));
    toast.success('Question retirée');
  };

  const saveExam = async () => {
    if (!examTitle || selectedQuestions.length === 0) {
      toast.error('Veuillez donner un titre et sélectionner au moins une question');
      return;
    }

    setIsLoading(true);
    try {
      // Format des questions pour le backend (modèle Exam)
      const formattedQuestions = selectedQuestions.map(q => ({
        question: q.text,
        options: q.options,
        correctAnswer: q.correctAnswer,
        points: q.points || 1,
        explanation: q.explanation || '',
        type: q.type || 'single'
      }));

      const examData = {
        title: examTitle,
        domain: selectedDomain,
        category: selectedCategory,
        level: selectedLevel,
        subject: selectedSubject,
        questions: formattedQuestions,
        duration: 60,
        passingScore: 70,
        createdBy: user?._id || user?.id
      };

      const response = await createExam(examData);
      
      if (response.success !== false) {
        toast.success('Épreuve créée avec succès !');
        navigate('/exams');
      } else {
        throw new Error(response.error || 'Erreur lors de la création');
      }
    } catch (error) {
      console.error('Erreur création examen:', error);
      toast.error(error.message || 'Erreur lors de la création');
    } finally {
      setIsLoading(false);
    }
  };

  const QuestionCard = ({ question, onSelect, onRemove, isSelected }) => (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      whileHover={{ y: -4 }}
      onClick={() => isSelected ? onRemove(question.id) : onSelect(question)}
      style={{
        background: isSelected ? 'rgba(16,185,129,0.1)' : 'rgba(15,23,42,0.7)',
        backdropFilter: 'blur(12px)',
        border: `1px solid ${isSelected ? '#10b981' : 'rgba(99,102,241,0.2)'}`,
        borderRadius: 16,
        padding: 16,
        cursor: 'pointer',
        position: 'relative'
      }}
    >
      {isSelected && (
        <div style={{
          position: 'absolute', top: 8, right: 8,
          background: '#10b981', borderRadius: '50%',
          width: 20, height: 20, display: 'flex',
          alignItems: 'center', justifyContent: 'center'
        }}>
          <CheckCircle size={12} color="white" />
        </div>
      )}
      <p style={{ color: '#f8fafc', fontSize: '0.9rem', marginBottom: 8 }}>
        {question.text}
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
        {question.options.slice(0, 4).map((opt, i) => (
          <span key={i} style={{
            padding: '2px 6px', background: 'rgba(255,255,255,0.03)',
            borderRadius: 4, color: '#94a3b8', fontSize: '0.7rem'
          }}>
            {String.fromCharCode(65 + i)}: {opt.length > 20 ? opt.substring(0, 20) + '...' : opt}
          </span>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <span style={{ fontSize: '0.6rem', color: '#64748b' }}>{question.niveau}</span>
        <span style={{ fontSize: '0.6rem', color: '#10b981' }}>{question.points} pt</span>
      </div>
    </motion.div>
  );

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #05071a 0%, #0a0f2e 60%, #05071a 100%)',
      padding: '24px'
    }}>
      {/* Grille de fond */}
      <div style={{
        position: 'fixed', inset: 0,
        backgroundImage: 'linear-gradient(rgba(99,102,241,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.03) 1px, transparent 1px)',
        backgroundSize: '40px 40px', pointerEvents: 'none', zIndex: 0
      }} />

      <main style={{ position: 'relative', zIndex: 1, maxWidth: 1400, margin: '0 auto' }}>
        {/* En-tête */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate(-1)}
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(99,102,241,0.2)',
              borderRadius: 12, padding: 12,
              color: '#94a3b8', cursor: 'pointer'
            }}
          >
            <ArrowLeft size={20} />
          </motion.button>
          <div>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '4px 12px', background: 'rgba(99,102,241,0.1)',
              border: '1px solid rgba(99,102,241,0.3)', borderRadius: 20,
              marginBottom: 8
            }}>
              <Database size={14} color="#6366f1" />
              <span style={{ color: '#a5b4fc', fontSize: '0.7rem', fontWeight: 600 }}>
                BASE DE DONNÉES
              </span>
            </div>
            <h1 style={{ fontSize: '2rem', fontWeight: 700, color: '#f8fafc' }}>
              Créer depuis la base
            </h1>
            <p style={{ color: '#64748b' }}>Sélectionnez des questions depuis votre base de données</p>
          </div>
        </div>

        {/* Configuration Panel - 3 colonnes */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 24 }}>
          
          {/* Colonne 1: Configuration */}
          <div style={{
            background: 'rgba(15,23,42,0.7)', backdropFilter: 'blur(12px)',
            border: '1px solid rgba(99,102,241,0.2)', borderRadius: 24, padding: 24
          }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 600, color: '#f8fafc', marginBottom: 20 }}>
              Configuration
            </h2>

            <div style={{ marginBottom: 16 }}>
              <label style={{ color: '#94a3b8', fontSize: '0.8rem', marginBottom: 6, display: 'block' }}>
                Titre de l'épreuve *
              </label>
              <input
                type="text"
                value={examTitle}
                onChange={(e) => setExamTitle(e.target.value)}
                placeholder="Ex: Management de Projet - Examen"
                style={{
                  width: '100%', padding: 12,
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(99,102,241,0.2)', borderRadius: 10,
                  color: '#f8fafc', outline: 'none'
                }}
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ color: '#94a3b8', fontSize: '0.8rem', marginBottom: 6, display: 'block' }}>
                Domaine *
              </label>
              <select
                value={selectedDomain}
                onChange={(e) => {
                  setSelectedDomain(e.target.value);
                  setSelectedCategory('');
                  setSelectedLevel('');
                  setSelectedSubject('');
                }}
                style={{
                  width: '100%', padding: 12,
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(99,102,241,0.2)', borderRadius: 10,
                  color: '#f8fafc', outline: 'none'
                }}
              >
                <option value="">Sélectionner...</option>
                {domains.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>

            {selectedDomain && (
              <div style={{ marginBottom: 16 }}>
                <label style={{ color: '#94a3b8', fontSize: '0.8rem', marginBottom: 6, display: 'block' }}>
                  Catégorie *
                </label>
                <select
                  value={selectedCategory}
                  onChange={(e) => {
                    setSelectedCategory(e.target.value);
                    setSelectedLevel('');
                    setSelectedSubject('');
                  }}
                  style={{
                    width: '100%', padding: 12,
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(99,102,241,0.2)', borderRadius: 10,
                    color: '#f8fafc', outline: 'none'
                  }}
                >
                  <option value="">Sélectionner...</option>
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            )}

            {selectedCategory && (
              <>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ color: '#94a3b8', fontSize: '0.8rem', marginBottom: 6, display: 'block' }}>
                    Niveau *
                  </label>
                  <select
                    value={selectedLevel}
                    onChange={(e) => setSelectedLevel(e.target.value)}
                    style={{
                      width: '100%', padding: 12,
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(99,102,241,0.2)', borderRadius: 10,
                      color: '#f8fafc', outline: 'none'
                    }}
                  >
                    <option value="">Sélectionner...</option>
                    {levels.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>

                <div style={{ marginBottom: 16 }}>
                  <label style={{ color: '#94a3b8', fontSize: '0.8rem', marginBottom: 6, display: 'block' }}>
                    Matière *
                  </label>
                  <select
                    value={selectedSubject}
                    onChange={(e) => setSelectedSubject(e.target.value)}
                    style={{
                      width: '100%', padding: 12,
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(99,102,241,0.2)', borderRadius: 10,
                      color: '#f8fafc', outline: 'none'
                    }}
                  >
                    <option value="">Sélectionner...</option>
                    {subjects.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </>
            )}

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={saveExam}
              disabled={isLoading}
              style={{
                width: '100%', padding: 14, marginTop: 16,
                background: isLoading ? 'rgba(16,185,129,0.3)' : 'linear-gradient(135deg, #10b981, #059669)',
                border: 'none', borderRadius: 12, color: 'white',
                fontWeight: 600, display: 'flex', alignItems: 'center',
                justifyContent: 'center', gap: 8, cursor: isLoading ? 'not-allowed' : 'pointer'
              }}
            >
              {isLoading ? (
                <><Loader size={16} className="animate-spin" /> Enregistrement...</>
              ) : (
                <><Save size={16} /> Créer l'épreuve</>
              )}
            </motion.button>
          </div>

          {/* Colonne 2: Questions disponibles */}
          <div style={{
            background: 'rgba(15,23,42,0.7)', backdropFilter: 'blur(12px)',
            border: '1px solid rgba(99,102,241,0.2)', borderRadius: 24, padding: 24
          }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 600, color: '#f8fafc', marginBottom: 20 }}>
              Questions disponibles
              {availableQuestions.length > 0 && (
                <span style={{ marginLeft: 8, fontSize: '0.8rem', color: '#a5b4fc' }}>
                  ({availableQuestions.length})
                </span>
              )}
            </h2>

            <div style={{ position: 'relative', marginBottom: 16 }}>
              <Search size={16} style={{ position: 'absolute', left: 12, top: 12, color: '#64748b' }} />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Rechercher..."
                style={{
                  width: '100%', padding: '10px 12px 10px 40px',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(99,102,241,0.2)', borderRadius: 10,
                  color: '#f8fafc', outline: 'none'
                }}
              />
            </div>

            {fetchingQuestions ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
                <Loader size={32} color="#6366f1" className="animate-spin" />
              </div>
            ) : filteredQuestions.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>
                <AlertCircle size={32} style={{ marginBottom: 12 }} />
                <p>Aucune question trouvée</p>
              </div>
            ) : (
              <div style={{ maxHeight: 500, overflowY: 'auto', paddingRight: 8 }}>
                {filteredQuestions.map(q => (
                  <QuestionCard
                    key={q.id}
                    question={q}
                    onSelect={addQuestion}
                    onRemove={removeQuestion}
                    isSelected={selectedQuestions.some(sq => sq.id === q.id)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Colonne 3: Questions sélectionnées */}
          <div style={{
            background: 'rgba(15,23,42,0.7)', backdropFilter: 'blur(12px)',
            border: '1px solid rgba(99,102,241,0.2)', borderRadius: 24, padding: 24
          }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 600, color: '#f8fafc', marginBottom: 20 }}>
              Questions sélectionnées ({selectedQuestions.length})
            </h2>

            {selectedQuestions.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 60, color: '#64748b' }}>
                <BookMarked size={32} style={{ marginBottom: 12, opacity: 0.3 }} />
                <p>Aucune question sélectionnée</p>
              </div>
            ) : (
              <div style={{ maxHeight: 500, overflowY: 'auto', paddingRight: 8 }}>
                {selectedQuestions.map((q, idx) => (
                  <div key={q.id} style={{
                    background: 'rgba(16,185,129,0.05)',
                    border: '1px solid rgba(16,185,129,0.2)',
                    borderRadius: 12, padding: 12, marginBottom: 12,
                    display: 'flex', alignItems: 'center', gap: 8
                  }}>
                    <span style={{
                      width: 24, height: 24, borderRadius: 6, background: '#10b981',
                      color: 'white', display: 'flex', alignItems: 'center',
                      justifyContent: 'center', fontSize: '0.7rem', fontWeight: 600
                    }}>
                      {idx + 1}
                    </span>
                    <p style={{ color: '#f8fafc', fontSize: '0.85rem', flex: 1 }}>
                      {q.text.length > 60 ? q.text.substring(0, 60) + '...' : q.text}
                    </p>
                    <button
                      onClick={() => removeQuestion(q.id)}
                      style={{
                        padding: 4, background: 'rgba(239,68,68,0.1)',
                        border: '1px solid rgba(239,68,68,0.3)', borderRadius: 6,
                        color: '#ef4444', cursor: 'pointer'
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
                <div style={{
                  marginTop: 16, padding: 12, background: 'rgba(255,255,255,0.02)',
                  borderRadius: 12, display: 'flex', justifyContent: 'space-between'
                }}>
                  <span style={{ color: '#94a3b8' }}>Total points</span>
                  <span style={{ color: '#f59e0b', fontWeight: 600 }}>
                    {selectedQuestions.reduce((sum, q) => sum + (q.points || 1), 0)}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .animate-spin { animation: spin 1s linear infinite; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: rgba(15,23,42,0.3); border-radius: 10px; }
        ::-webkit-scrollbar-thumb { background: rgba(99,102,241,0.3); border-radius: 10px; }
      `}</style>
    </div>
  );
};

export default DatabaseQuizCreation;
