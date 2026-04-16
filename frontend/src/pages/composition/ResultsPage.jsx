// src/pages/composition/ResultsPage.jsx — Version Ultime Corrigée
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import axios from 'axios';
import { toast, Toaster } from 'react-hot-toast';
import { CheckCircle, XCircle, Award, User, FileText, Settings } from 'lucide-react';
import ENV_CONFIG from '../../config/env';

const NODE_BACKEND_URL = ENV_CONFIG.BACKEND_URL;

console.log('[ResultsPage] Backend URL:', NODE_BACKEND_URL);

// ═══════════════════════════════════════════════════════════════
// CONFIGURATIONS DES RÉSULTATS
// ═══════════════════════════════════════════════════════════════
const getResultDisplayType = (configOption) => {
  const binaryOnly = ['A', 'D', 'G', 'H'];
  const binaryPlus = ['B', 'E', 'I', 'J'];
  const noResult = ['C', 'F', 'K'];
  
  if (noResult.includes(configOption)) return 'none';
  if (binaryOnly.includes(configOption)) return 'binary';
  if (binaryPlus.includes(configOption)) return 'binaryPlus';
  return 'binaryPlus';
};

const getOptionLabel = (opt) => {
  const labels = {
    A: 'Fermée · Figée · Binaire',
    B: 'Fermée · Figée · Binaire+',
    C: 'Fermée · Figée · Sans résultat',
    D: 'Fermée · Aléatoire · Binaire',
    E: 'Fermée · Aléatoire · Binaire+',
    F: 'Fermée · Aléatoire · Sans résultat',
    G: 'Ouverte · Binaire · Reprise OK',
    H: 'Ouverte · Binaire · No Reply',
    I: 'Ouverte · Binaire+ · Reprise OK',
    J: 'Ouverte · Binaire+ · No Reply',
    K: 'Ouverte · Sans résultat · No Reply',
  };
  return labels[opt] || `Configuration ${opt}`;
};

const getAuthToken = () => {
  return localStorage.getItem('userToken') || localStorage.getItem('token');
};

const ResultsPage = () => {
  const { examId } = useParams();
  const { state } = useLocation();
  const navigate = useNavigate();

  const {
    submittedAnswers,
    studentInfo,
    submittedScore,
    submittedPercentage,
    examTitle: passedExamTitle,
    passingScore: passedPassingScore,
    examQuestions: passedExamQuestions,
    resultSnapshot: passedResultSnapshot,
    terminalSessionId: passedTerminalSessionId,
    resultId: passedResultId,
  } = state || {};

  const [exam, setExam] = useState(null);
  const [config, setConfig] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [countdown, setCountdown] = useState(120);
  const [redirectTimerActive, setRedirectTimerActive] = useState(true);
  
  const questionDetailsRef = useRef([]);
  const countdownIntervalRef = useRef(null);
  const isTerminalContext = !!passedTerminalSessionId;
  const resultId = passedResultId || state?.resultId || '';
  
  const examOption = config?.examOption || passedResultSnapshot?.examOption || passedResultSnapshot?.config?.examOption;
  const displayType = getResultDisplayType(examOption);
  const allowRetry = config?.allowRetry || passedResultSnapshot?.config?.allowRetry;

  // ═══════════════════════════════════════════════════════════════
  // REDIRECTION SELON REPRISE
  // ═══════════════════════════════════════════════════════════════
  const handleRedirect = useCallback(() => {
    localStorage.removeItem('studentInfoForExam');
    if (examId) {
      localStorage.removeItem(`exam_${examId}_answers`);
      localStorage.removeItem(`exam_${examId}_index`);
      localStorage.removeItem(`exam_${examId}_attempts`);
      localStorage.removeItem(`exam_${examId}_showResult`);
    }
    
    if (allowRetry && passedTerminalSessionId) {
      // ✅ Reprise OK → retour au terminal
      const redirectUrl = `${ENV_CONFIG.TERMINAL_URL}${passedTerminalSessionId ? `?sessionId=${passedTerminalSessionId}` : ''}`;
      window.location.replace(redirectUrl);
    } else {
      // ✅ No Reply → retour accueil
      navigate('/', { replace: true });
    }
  }, [allowRetry, passedTerminalSessionId, examId, navigate]);

  // Timer redirection
  useEffect(() => {
    if (isLoading || !redirectTimerActive) return;
    
    countdownIntervalRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          handleRedirect();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => {
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, [isLoading, redirectTimerActive, handleRedirect]);

  const extendStay = useCallback(() => {
    setRedirectTimerActive(false);
    toast.success("Temps prolongé.", { duration: 4000 });
    setTimeout(() => {
      setRedirectTimerActive(true);
      setCountdown(120);
    }, 300000);
  }, []);

  // ═══════════════════════════════════════════════════════════════
  // NORMALISATION QUESTIONS
  // ═══════════════════════════════════════════════════════════════
  const normalizeQuestionForDisplay = (q, studentAnswer, questionIndex) => {
    let correctAnswerIndex = -1;
    let correctAnswerText = '';
    
    if (typeof q.bonOpRep === 'number') {
      correctAnswerIndex = q.bonOpRep;
      correctAnswerText = q.options?.[correctAnswerIndex] || '';
    } else if (q.correctAnswer) {
      correctAnswerText = q.correctAnswer;
    }
    
    let finalStudentAnswer = 'Non répondu';
    if (studentAnswer && studentAnswer !== 'Non répondu') {
      finalStudentAnswer = studentAnswer;
    } else if (submittedAnswers) {
      finalStudentAnswer = submittedAnswers[q._id] 
        || submittedAnswers[questionIndex]
        || 'Non répondu';
    }
    
    let isCorrect = false;
    if (finalStudentAnswer !== 'Non répondu') {
      if (typeof q.bonOpRep === 'number') {
        const selectedIndex = q.options?.findIndex(opt => opt === finalStudentAnswer);
        isCorrect = selectedIndex === q.bonOpRep;
      } else {
        isCorrect = finalStudentAnswer === q.correctAnswer;
      }
    }
    
    return {
      _id: q._id,
      questionText: q.libQuestion || q.question || q.text || 'Question sans texte',
      options: q.options || [],
      studentAnswer: finalStudentAnswer,
      correctAnswer: correctAnswerText,
      isCorrect,
      points: q.points || 1,
      explanation: q.explanation || '',
    };
  };

  const getTotalQuestions = () => {
    if (exam?.questions?.length > 0) return exam.questions.length;
    if (passedResultSnapshot?.examQuestions?.length > 0) return passedResultSnapshot.examQuestions.length;
    if (passedExamQuestions?.length > 0) return passedExamQuestions.length;
    return questionDetailsRef.current.length;
  };

  const getTotalPoints = () => {
    const questions = passedResultSnapshot?.examQuestions || passedExamQuestions || exam?.questions || [];
    if (questions.length === 0) return getTotalQuestions();
    return questions.reduce((sum, q) => sum + (q.points || 1), 0);
  };

  // ═══════════════════════════════════════════════════════════════
  // CHARGEMENT
  // ═══════════════════════════════════════════════════════════════
  useEffect(() => {
    if (!examId || !submittedAnswers || !studentInfo || submittedPercentage === undefined) {
      toast.error("Données manquantes.");
      navigate(`/exam/profile/${examId}`, { replace: true });
      return;
    }

    const fetchAndProcessResults = async () => {
      try {
        if (passedResultSnapshot?.examQuestions?.length > 0) {
          questionDetailsRef.current = passedResultSnapshot.examQuestions.map((q, idx) => 
            normalizeQuestionForDisplay(q, null, idx)
          );
          
          setExam({
            _id: examId,
            title: passedResultSnapshot.examTitle || passedExamTitle || 'Épreuve',
            questions: passedResultSnapshot.examQuestions || [],
            passingScore: passedResultSnapshot.passingScore || passedPassingScore || 70,
          });
          setConfig(passedResultSnapshot.config || null);
          setIsLoading(false);
          return;
        }

        const token = getAuthToken();
        const axiosConfig = token ? { headers: { Authorization: `Bearer ${token}` } } : {};

        const response = await axios.get(`${NODE_BACKEND_URL}/api/exams/${examId}`, { 
          timeout: 10000,
          ...axiosConfig 
        });
        
        const examData = response.data;
        const questionsArray = examData.questions || [];
        
        questionDetailsRef.current = questionsArray.map((q, idx) => 
          normalizeQuestionForDisplay(q, null, idx)
        );
        
        setExam({ ...examData, questions: questionsArray });
        setConfig(examData.config || null);
        
      } catch (error) {
        console.error("Erreur chargement:", error);
        if (passedExamQuestions?.length > 0) {
          questionDetailsRef.current = passedExamQuestions.map((q, idx) => 
            normalizeQuestionForDisplay(q, null, idx)
          );
          setExam({
            _id: examId,
            title: passedExamTitle || 'Titre inconnu',
            questions: passedExamQuestions,
            passingScore: passedPassingScore || 70,
          });
          setConfig(passedResultSnapshot?.config || null);
        } else {
          toast.error("Erreur de chargement.");
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchAndProcessResults();
  }, [examId, submittedAnswers, studentInfo, submittedPercentage, passedExamTitle, passedExamQuestions, passedResultSnapshot, navigate]);

  // ═══════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════
  if (isLoading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner} />
        <p style={{ color: '#94a3b8', marginTop: '16px' }}>Chargement des résultats...</p>
        <Toaster />
      </div>
    );
  }

  // ✅ C, F, K : Aucun résultat
  if (displayType === 'none') {
    return (
      <div style={styles.container}>
        <div style={styles.noResultCard}>
          <div style={styles.checkIcon}>✓</div>
          <h1 style={styles.noResultTitle}>Épreuve terminée</h1>
          <p style={styles.noResultText}>
            {studentInfo?.firstName} {studentInfo?.lastName}
          </p>
          <p style={styles.noResultSubtext}>
            Vos réponses ont bien été enregistrées.<br />
            Les résultats de cette configuration (<strong>{examOption}</strong>) ne sont pas communiqués.
          </p>
          <button onClick={() => navigate('/', { replace: true })} style={styles.homeButton}>
            Retour à l'accueil
          </button>
        </div>
      </div>
    );
  }

  const totalQuestions = getTotalQuestions();
  const totalPoints = getTotalPoints();
  const correctCount = questionDetailsRef.current.filter(q => q.isCorrect).length;
  const passStatus = submittedPercentage >= (exam?.passingScore || passedPassingScore || 70);
  const note20 = ((submittedPercentage / 100) * 20).toFixed(2);

  return (
    <div style={styles.container}>
      <div style={styles.bgGrid} />
      <div style={styles.bgGlow} />
      
      <main style={styles.main}>
        {/* Timer redirection */}
        {!isLoading && redirectTimerActive && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} style={styles.redirectBanner(countdown)}>
            <div style={styles.redirectInfo}>
              <span style={styles.pulseDot(countdown)} />
              <span>Retour automatique dans</span>
              <span style={styles.countdown(countdown)}>
                {Math.floor(countdown / 60)}:{(countdown % 60).toString().padStart(2, '0')}
              </span>
            </div>
            <button onClick={extendStay} style={styles.extendButton}>+ 5 min</button>
          </motion.div>
        )}

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={styles.resultCard}>
          
          {/* En-tête */}
          <div style={styles.header}>
            <div style={styles.badge}>
              <span style={styles.badgeDot} />
              <span>RÉSULTATS</span>
            </div>
            <h1 style={styles.title}>Bulletin de Résultats</h1>
          </div>

          {/* Infos étudiant + Performance */}
          <div style={styles.infoGrid}>
            <div style={styles.infoBox}>
              <div style={styles.infoHeader}>
                <User size={20} color="#3b82f6" />
                <h2>Informations</h2>
              </div>
              <p><span>Nom:</span> {studentInfo?.lastName || 'N/A'}</p>
              <p><span>Prénom:</span> {studentInfo?.firstName || 'N/A'}</p>
              <p><span>Niveau:</span> {studentInfo?.level || 'N/A'}</p>
              {studentInfo?.matricule && <p><span>Matricule:</span> {studentInfo.matricule}</p>}
            </div>

            <div style={styles.perfBox(passStatus)}>
              <div style={styles.infoHeader}>
                <Award size={20} color={passStatus ? '#10b981' : '#ef4444'} />
                <h2>Performance</h2>
              </div>
              <p><span>Titre:</span> {exam?.title || passedExamTitle || 'N/A'}</p>
              <p><span>Points:</span> {submittedScore} / {totalPoints} pts</p>
              <p><span>Bonnes rép.:</span> {correctCount} / {totalQuestions}</p>
              <p><span>Pourcentage:</span> <span style={{ color: passStatus ? '#10b981' : '#ef4444', fontWeight: 600 }}>{submittedPercentage.toFixed(2)}%</span></p>
              
              {/* Note /20 */}
              <div style={styles.noteBox}>
                <span>NOTE / 20</span>
                <span style={styles.noteValue}>{note20}</span>
              </div>
              
              <p><span>Statut:</span> <span style={{ color: passStatus ? '#10b981' : '#ef4444', fontWeight: 600 }}>{passStatus ? 'RÉUSSI' : 'ÉCHOUÉ'}</span></p>
            </div>
          </div>

          {/* Configuration */}
          {config && (
            <div style={styles.configBox}>
              <div style={styles.configHeader}>
                <Settings size={14} color="#8b5cf6" />
                <span>Configuration de l'épreuve</span>
              </div>
              <div style={styles.configGrid}>
                <span>Option:</span><span>{getOptionLabel(config.examOption)} ({config.examOption})</span>
                {config.openRange && <><span>Plage ouverte:</span><span>{config.requiredQuestions} questions</span></>}
                <span>Séquencement:</span><span>{config.sequencing === 'identical' ? 'Identique' : 'Aléatoire'}</span>
                {config.allowRetry && <><span>Reprise:</span><span>Autorisée (une fois)</span></>}
              </div>
            </div>
          )}

          {/* ✅ Résultat Binaire (toujours affiché) */}
          <div style={styles.binaryResult(passStatus)}>
            <h3>{passStatus ? '🎉 FÉLICITATIONS !' : '😔 DOMMAGE...'}</h3>
            <p style={styles.binaryPercentage}>{submittedPercentage.toFixed(1)}%</p>
            <p>Score : {submittedScore} / {totalPoints} pts</p>
          </div>

          {/* ✅ Détails des réponses - UNIQUEMENT pour BINARY+ */}
          {displayType === 'binaryPlus' && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={styles.detailsSection}>
              <div style={styles.detailsHeader}>
                <FileText size={20} color="#3b82f6" />
                <h2>Détails des Réponses</h2>
              </div>
              <div style={styles.detailsList}>
                {questionDetailsRef.current.map((qDetail, index) => (
                  <div key={qDetail._id || index} style={styles.detailItem(qDetail.isCorrect)}>
                    <div style={styles.detailHeaderRow}>
                      <span>Question {index + 1}</span>
                      {qDetail.isCorrect ? <CheckCircle size={20} color="#10b981" /> : <XCircle size={20} color="#ef4444" />}
                    </div>
                    <p style={styles.detailQuestion}>{qDetail.questionText}</p>
                    <div style={styles.detailOptions}>
                      {qDetail.options.map((opt, i) => {
                        const isCorrectOpt = opt === qDetail.correctAnswer;
                        const isStudentOpt = opt === qDetail.studentAnswer;
                        return (
                          <div key={i} style={styles.detailOption(isCorrectOpt, isStudentOpt)}>
                            {String.fromCharCode(65 + i)}. {opt}
                            {isStudentOpt && <span style={{ marginLeft: 8, color: isCorrectOpt ? '#10b981' : '#ef4444' }}>(Votre réponse)</span>}
                            {isCorrectOpt && !isStudentOpt && <span style={{ marginLeft: 8, color: '#10b981' }}>(Correcte)</span>}
                          </div>
                        );
                      })}
                    </div>
                    <div style={styles.detailMeta}>
                      <span>Votre réponse: <span style={{ color: qDetail.isCorrect ? '#10b981' : '#ef4444' }}>{qDetail.studentAnswer}</span></span>
                      <span>Bonne réponse: <span style={{ color: '#10b981' }}>{qDetail.correctAnswer}</span></span>
                      <span>Points: {qDetail.points}</span>
                    </div>
                    {qDetail.explanation && (
                      <div style={styles.explanation}>💡 {qDetail.explanation}</div>
                    )}
                  </div>
                ))}
              </div>
            </motion.div>
          )}

        </motion.div>
      </main>
      <Toaster />
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════
const styles = {
  container: { minHeight: '100vh', fontFamily: "'DM Sans', sans-serif", background: 'linear-gradient(135deg, #05071a 0%, #0a0f2e 60%, #05071a 100%)', position: 'relative', overflow: 'hidden', padding: '24px' },
  bgGrid: { position: 'fixed', inset: 0, backgroundImage: 'linear-gradient(rgba(59,130,246,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,0.03) 1px, transparent 1px)', backgroundSize: '40px 40px', pointerEvents: 'none', zIndex: 0 },
  bgGlow: { position: 'fixed', top: '-15%', left: '50%', transform: 'translateX(-50%)', width: '70vw', height: '50vh', background: 'radial-gradient(ellipse, rgba(37,99,235,0.12) 0%, transparent 70%)', pointerEvents: 'none', zIndex: 0 },
  main: { position: 'relative', zIndex: 1, maxWidth: '900px', margin: '0 auto' },
  redirectBanner: (countdown) => ({ marginBottom: '16px', padding: '12px 20px', background: countdown <= 30 ? 'rgba(239,68,68,0.12)' : 'rgba(59,130,246,0.1)', border: `1px solid ${countdown <= 30 ? 'rgba(239,68,68,0.3)' : 'rgba(59,130,246,0.25)'}`, borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }),
  redirectInfo: { display: 'flex', alignItems: 'center', gap: '10px', flex: 1, color: '#94a3b8', fontSize: '0.875rem' },
  pulseDot: (countdown) => ({ width: 8, height: 8, borderRadius: '50%', background: countdown <= 30 ? '#ef4444' : '#3b82f6', display: 'inline-block', animation: 'pulse 1s infinite' }),
  countdown: (countdown) => ({ fontFamily: "'Sora', sans-serif", fontWeight: 700, fontSize: '1.25rem', color: countdown <= 30 ? '#ef4444' : '#60a5fa', minWidth: '60px' }),
  extendButton: { padding: '6px 12px', background: 'rgba(59,130,246,0.2)', border: '1px solid rgba(59,130,246,0.4)', borderRadius: '8px', color: '#93c5fd', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' },
  resultCard: { background: 'rgba(15,23,42,0.7)', backdropFilter: 'blur(12px)', border: '1px solid rgba(59,130,246,0.15)', borderRadius: '24px', padding: '32px' },
  header: { textAlign: 'center', marginBottom: '32px' },
  badge: { display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '5px 14px', marginBottom: '16px', background: 'rgba(37,99,235,0.12)', border: '1px solid rgba(59,130,246,0.25)', borderRadius: '999px' },
  badgeDot: { width: '6px', height: '6px', borderRadius: '50%', background: '#3b82f6', boxShadow: '0 0 8px #3b82f6' },
  title: { fontFamily: "'Sora', sans-serif", fontSize: '2rem', fontWeight: 700, color: '#f8fafc', marginBottom: '8px' },
  infoGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' },
  infoBox: { background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: '16px', padding: '20px' },
  perfBox: (pass) => ({ background: pass ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', border: `1px solid ${pass ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`, borderRadius: '16px', padding: '20px' }),
  infoHeader: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' },
  noteBox: { marginTop: '8px', padding: '10px 14px', background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.35)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  noteValue: { fontSize: '1.5rem', fontWeight: 800, color: '#60a5fa' },
  configBox: { marginBottom: '24px', background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 12, padding: '14px 16px' },
  configHeader: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, color: '#a5b4fc', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' },
  configGrid: { display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '4px 12px', fontSize: '0.78rem', color: '#e2e8f0' },
  binaryResult: (pass) => ({ marginTop: '24px', padding: '20px', background: pass ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', border: `1px solid ${pass ? '#10b981' : '#ef4444'}40`, borderRadius: '16px', textAlign: 'center' }),
  binaryPercentage: { fontSize: '2.5rem', fontWeight: 800, color: 'inherit' },
  detailsSection: { marginTop: '32px' },
  detailsHeader: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', color: '#f8fafc' },
  detailsList: { display: 'flex', flexDirection: 'column', gap: '16px' },
  detailItem: (isCorrect) => ({ background: 'rgba(255,255,255,0.02)', border: `1px solid ${isCorrect ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`, borderRadius: '12px', padding: '16px' }),
  detailHeaderRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px', color: '#f8fafc', fontWeight: 600 },
  detailQuestion: { color: '#94a3b8', marginBottom: '12px' },
  detailOptions: { display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '12px' },
  detailOption: (isCorrect, isStudent) => ({ padding: '8px 12px', background: isCorrect ? 'rgba(16,185,129,0.1)' : (isStudent && !isCorrect ? 'rgba(239,68,68,0.1)' : 'rgba(255,255,255,0.02)'), border: `1px solid ${isCorrect ? 'rgba(16,185,129,0.3)' : (isStudent && !isCorrect ? 'rgba(239,68,68,0.3)' : 'rgba(255,255,255,0.05)')}`, borderRadius: '8px', color: '#94a3b8', fontSize: '0.9375rem' }),
  detailMeta: { display: 'flex', gap: '16px', fontSize: '0.875rem', flexWrap: 'wrap', color: '#94a3b8', marginTop: '8px' },
  explanation: { marginTop: '8px', padding: '8px', background: 'rgba(59,130,246,0.05)', borderRadius: '8px', color: '#64748b', fontSize: '0.8rem' },
  loadingContainer: { minHeight: '100vh', background: 'linear-gradient(135deg, #05071a 0%, #0a0f2e 60%, #05071a 100%)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' },
  spinner: { width: '48px', height: '48px', border: '3px solid rgba(59,130,246,0.1)', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin 1s linear infinite' },
  noResultCard: { textAlign: 'center', maxWidth: '480px', margin: '0 auto', background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: '24px', padding: '48px 32px' },
  checkIcon: { width: '72px', height: '72px', borderRadius: '50%', background: 'rgba(16,185,129,0.15)', border: '2px solid #10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', fontSize: '2rem' },
  noResultTitle: { fontFamily: "'Sora', sans-serif", fontSize: '1.75rem', fontWeight: 700, color: '#f8fafc', marginBottom: '12px' },
  noResultText: { color: '#94a3b8', fontSize: '1rem', marginBottom: '8px' },
  noResultSubtext: { color: '#64748b', fontSize: '0.875rem', marginBottom: '32px' },
  homeButton: { padding: '12px 32px', background: 'linear-gradient(135deg, #3b82f6, #2563eb)', border: 'none', borderRadius: '10px', color: '#fff', fontWeight: 600, fontSize: '0.95rem', cursor: 'pointer' }
};

export default ResultsPage;