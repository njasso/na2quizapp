// src/pages/ManualQuizCreation.jsx - Version corrigée avec API
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { PlusCircle, Save, ArrowLeft, FileText, User, Award, HelpCircle, XCircle, CheckCircle, Trash2, Loader } from 'lucide-react';
import { createExam } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

const ManualQuizCreation = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [examTitle, setExamTitle] = useState('');
  const [teacherName, setTeacherName] = useState('');
  const [teacherGrade, setTeacherGrade] = useState('');
  const [description, setDescription] = useState('');
  const [questions, setQuestions] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState({
    text: '',
    options: ['', '', '', ''],
    correctAnswer: '',
    points: 1,
    explanation: ''
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleOptionChange = (index, value) => {
    const newOptions = [...currentQuestion.options];
    newOptions[index] = value;
    setCurrentQuestion({ ...currentQuestion, options: newOptions });
  };

  const addQuestion = () => {
    if (!currentQuestion.text.trim()) {
      toast.error('Veuillez saisir l\'énoncé de la question');
      return;
    }

    const filledOptions = currentQuestion.options.filter(opt => opt.trim() !== '');
    if (filledOptions.length < 2) {
      toast.error('Veuillez ajouter au moins 2 options');
      return;
    }

    if (!currentQuestion.correctAnswer.trim()) {
      toast.error('Veuillez sélectionner la bonne réponse');
      return;
    }

    setQuestions([...questions, { ...currentQuestion, options: filledOptions }]);
    setCurrentQuestion({
      text: '',
      options: ['', '', '', ''],
      correctAnswer: '',
      points: 1,
      explanation: ''
    });
    toast.success('Question ajoutée');
  };

  const removeQuestion = (index) => {
    setQuestions(questions.filter((_, i) => i !== index));
    toast.success('Question supprimée');
  };

  const saveExam = async () => {
    if (!examTitle || !teacherName || !teacherGrade) {
      toast.error('Veuillez remplir tous les champs du formulaire');
      return;
    }

    if (questions.length === 0) {
      toast.error('Veuillez ajouter au moins une question');
      return;
    }

    setIsLoading(true);
    try {
      const formattedQuestions = questions.map(q => ({
        question: q.text,
        options: q.options,
        correctAnswer: q.correctAnswer,
        points: q.points,
        explanation: q.explanation,
        type: 'single'
      }));

      const examData = {
        title: examTitle,
        description: description,
        domain: 'Professionnel',
        category: 'Management',
        level: 'MBA',
        subject: examTitle,
        questions: formattedQuestions,
        duration: 60,
        passingScore: 70,
        teacherName,
        teacherGrade,
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

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #05071a 0%, #0a0f2e 60%, #05071a 100%)',
      padding: '24px'
    }}>
      <div style={{
        position: 'fixed', inset: 0,
        backgroundImage: 'linear-gradient(rgba(99,102,241,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.03) 1px, transparent 1px)',
        backgroundSize: '40px 40px', pointerEvents: 'none', zIndex: 0
      }} />

      <main style={{ position: 'relative', zIndex: 1, maxWidth: 900, margin: '0 auto' }}>
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
            <h1 style={{ fontSize: '2rem', fontWeight: 700, color: '#f8fafc' }}>
              Création manuelle
            </h1>
            <p style={{ color: '#64748b' }}>Créez votre épreuve question par question</p>
          </div>
        </div>

        <div style={{
          background: 'rgba(15,23,42,0.7)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(99,102,241,0.2)',
          borderRadius: 24,
          padding: 32
        }}>
          {/* Informations générales */}
          <div style={{ marginBottom: 24 }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 600, color: '#f8fafc', marginBottom: 20 }}>
              Informations générales
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div>
                <label style={{ color: '#94a3b8', fontSize: '0.8rem', marginBottom: 6, display: 'block' }}>
                  <User size={14} style={{ display: 'inline', marginRight: 4 }} />
                  Nom de l'enseignant *
                </label>
                <input
                  type="text"
                  value={teacherName}
                  onChange={(e) => setTeacherName(e.target.value)}
                  placeholder="Ex: M. Jean Dupont"
                  style={{
                    width: '100%', padding: 12,
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(99,102,241,0.2)', borderRadius: 10,
                    color: '#f8fafc', outline: 'none'
                  }}
                />
              </div>
              <div>
                <label style={{ color: '#94a3b8', fontSize: '0.8rem', marginBottom: 6, display: 'block' }}>
                  <Award size={14} style={{ display: 'inline', marginRight: 4 }} />
                  Grade / Titre *
                </label>
                <input
                  type="text"
                  value={teacherGrade}
                  onChange={(e) => setTeacherGrade(e.target.value)}
                  placeholder="Ex: Professeur de Mathématiques"
                  style={{
                    width: '100%', padding: 12,
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(99,102,241,0.2)', borderRadius: 10,
                    color: '#f8fafc', outline: 'none'
                  }}
                />
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ color: '#94a3b8', fontSize: '0.8rem', marginBottom: 6, display: 'block' }}>
                <FileText size={14} style={{ display: 'inline', marginRight: 4 }} />
                Titre de l'épreuve *
              </label>
              <input
                type="text"
                value={examTitle}
                onChange={(e) => setExamTitle(e.target.value)}
                placeholder="Ex: Évaluation de Mathématiques"
                style={{
                  width: '100%', padding: 12,
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(99,102,241,0.2)', borderRadius: 10,
                  color: '#f8fafc', outline: 'none'
                }}
              />
            </div>

            <div>
              <label style={{ color: '#94a3b8', fontSize: '0.8rem', marginBottom: 6, display: 'block' }}>
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="Décrivez brièvement le contenu..."
                style={{
                  width: '100%', padding: 12,
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(99,102,241,0.2)', borderRadius: 10,
                  color: '#f8fafc', outline: 'none', resize: 'vertical'
                }}
              />
            </div>
          </div>

          {/* Ajout de question */}
          <div style={{ marginBottom: 24 }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 600, color: '#f8fafc', marginBottom: 20 }}>
              <HelpCircle size={18} style={{ display: 'inline', marginRight: 8 }} />
              Ajouter une question
            </h2>

            <textarea
              value={currentQuestion.text}
              onChange={(e) => setCurrentQuestion({ ...currentQuestion, text: e.target.value })}
              rows={3}
              placeholder="Saisissez votre question..."
              style={{
                width: '100%', padding: 12, marginBottom: 16,
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(99,102,241,0.2)', borderRadius: 10,
                color: '#f8fafc', resize: 'vertical'
              }}
            />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              {currentQuestion.options.map((opt, idx) => (
                <div key={idx}>
                  <label style={{ color: '#94a3b8', fontSize: '0.7rem', marginBottom: 4, display: 'block' }}>
                    Option {String.fromCharCode(65 + idx)} *
                  </label>
                  <input
                    type="text"
                    value={opt}
                    onChange={(e) => handleOptionChange(idx, e.target.value)}
                    style={{
                      width: '100%', padding: 10,
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(99,102,241,0.2)', borderRadius: 8,
                      color: '#f8fafc'
                    }}
                  />
                </div>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div>
                <label style={{ color: '#94a3b8', fontSize: '0.7rem', marginBottom: 4, display: 'block' }}>
                  Points
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={currentQuestion.points}
                  onChange={(e) => setCurrentQuestion({ ...currentQuestion, points: parseInt(e.target.value) })}
                  style={{
                    width: '100%', padding: 10,
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(99,102,241,0.2)', borderRadius: 8,
                    color: '#f8fafc'
                  }}
                />
              </div>
              <div>
                <label style={{ color: '#94a3b8', fontSize: '0.7rem', marginBottom: 4, display: 'block' }}>
                  Réponse correcte *
                </label>
                <select
                  value={currentQuestion.correctAnswer}
                  onChange={(e) => setCurrentQuestion({ ...currentQuestion, correctAnswer: e.target.value })}
                  style={{
                    width: '100%', padding: 10,
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(99,102,241,0.2)', borderRadius: 8,
                    color: '#f8fafc'
                  }}
                >
                  <option value="">Sélectionner...</option>
                  {currentQuestion.options.filter(opt => opt.trim()).map((opt, idx) => (
                    <option key={idx} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
            </div>

            <textarea
              value={currentQuestion.explanation}
              onChange={(e) => setCurrentQuestion({ ...currentQuestion, explanation: e.target.value })}
              rows={2}
              placeholder="Explication (optionnel)"
              style={{
                width: '100%', padding: 12, marginBottom: 16,
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(99,102,241,0.2)', borderRadius: 10,
                color: '#f8fafc', resize: 'vertical'
              }}
            />

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={addQuestion}
              style={{
                width: '100%', padding: 12,
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                border: 'none', borderRadius: 10, color: 'white',
                fontWeight: 600, display: 'flex', alignItems: 'center',
                justifyContent: 'center', gap: 8, cursor: 'pointer'
              }}
            >
              <PlusCircle size={18} />
              Ajouter la question
            </motion.button>
          </div>

          {/* Liste des questions */}
          {questions.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#f8fafc', marginBottom: 16 }}>
                Questions ajoutées ({questions.length})
              </h3>
              {questions.map((q, idx) => (
                <div key={idx} style={{
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(99,102,241,0.1)',
                  borderRadius: 12, padding: 16, marginBottom: 12
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                    <p style={{ color: '#f8fafc', fontSize: '0.9rem', flex: 1 }}>
                      {idx + 1}. {q.text}
                    </p>
                    <button
                      onClick={() => removeQuestion(idx)}
                      style={{
                        padding: 4, background: 'rgba(239,68,68,0.1)',
                        border: '1px solid rgba(239,68,68,0.3)', borderRadius: 6,
                        color: '#ef4444', cursor: 'pointer'
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 8 }}>
                    {q.options.map((opt, i) => (
                      <span key={i} style={{
                        padding: '2px 6px', background: opt === q.correctAnswer ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.03)',
                        borderRadius: 4, color: opt === q.correctAnswer ? '#10b981' : '#94a3b8', fontSize: '0.7rem'
                      }}>
                        {String.fromCharCode(65 + i)}: {opt.length > 30 ? opt.substring(0, 30) + '...' : opt}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={saveExam}
            disabled={isLoading}
            style={{
              width: '100%', padding: 14,
              background: isLoading ? 'rgba(16,185,129,0.3)' : 'linear-gradient(135deg, #10b981, #059669)',
              border: 'none', borderRadius: 12, color: 'white',
              fontWeight: 600, display: 'flex', alignItems: 'center',
              justifyContent: 'center', gap: 8,
              cursor: isLoading ? 'not-allowed' : 'pointer'
            }}
          >
            {isLoading ? (
              <><Loader size={16} className="animate-spin" /> Enregistrement...</>
            ) : (
              <><Save size={16} /> Enregistrer l'épreuve</>
            )}
          </motion.button>
        </div>
      </main>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .animate-spin { animation: spin 1s linear infinite; }
      `}</style>
    </div>
  );
};

export default ManualQuizCreation;
