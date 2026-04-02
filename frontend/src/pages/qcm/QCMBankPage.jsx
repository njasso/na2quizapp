// src/pages/qcm/QCMBankPage.jsx — Dashboard analytique avancé avec IA
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Library, Search, Filter, Eye, Download, FileText, BookOpen,
  Layers, Tag, Clock, Award, CheckCircle, XCircle, AlertCircle,
  ChevronDown, ChevronUp, ArrowLeft, Home, User, RefreshCw,
  BarChart3, TrendingUp, PieChart, FilterX, Copy, Trash2,
  Brain, Zap, Target, AlertTriangle, Lightbulb, Settings, Sparkles,
  Calendar, TrendingDown, Activity, BarChart, LineChart
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { getQuestions } from '../../services/api';
import DOMAIN_DATA, {
  getAllDomaines,
  getAllSousDomaines,
  getAllLevels,
  getAllMatieres,
  getDomainNom,
  getSousDomaineNom,
  getLevelNom,
  getMatiereNom
} from '../../data/domainConfig';
import { Bar, Line, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  Filler
} from 'chart.js';
import toast from 'react-hot-toast';

ChartJS.register(
  CategoryScale, LinearScale, BarElement, LineElement,
  PointElement, Title, Tooltip, Legend, ArcElement, Filler
);

const QUESTION_TYPES = [
  { id: 1, nom: "Savoir", color: "#3b82f6", description: "Notions de base" },
  { id: 2, nom: "Savoir-Faire", color: "#10b981", description: "Intelligence pratique" },
  { id: 3, nom: "Savoir-être", color: "#8b5cf6", description: "Potentiel psychologique" }
];

const QCMBankPage = () => {
  const navigate = useNavigate();
  const { user, hasRole } = useAuth();

  // ========== ÉTATS ==========
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dashboardView, setDashboardView] = useState('analytics'); // 'analytics', 'insights', 'recommendations'
  const [timeRange, setTimeRange] = useState('month'); // 'week', 'month', 'year', 'all'

  // Filtres
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDomainId, setSelectedDomainId] = useState('');
  const [selectedSousDomaineId, setSelectedSousDomaineId] = useState('');
  const [selectedLevelId, setSelectedLevelId] = useState('');
  const [selectedMatiereId, setSelectedMatiereId] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('approved');
  const [showFilters, setShowFilters] = useState(true);
  const [expandedQuestion, setExpandedQuestion] = useState(null);

  // Noms
  const [domainNom, setDomainNom] = useState('');
  const [sousDomaineNom, setSousDomaineNom] = useState('');
  const [levelNom, setLevelNom] = useState('');
  const [matiereNom, setMatiereNom] = useState('');

  // IA Insights
  const [aiInsights, setAiInsights] = useState({
    strengths: [],
    weaknesses: [],
    recommendations: [],
    predictedGrowth: 12,
    qualityScore: 78,
    balanceScore: 65,
    coverageScore: 82
  });

  // Statistiques avancées
  const [stats, setStats] = useState({
    total: 0,
    byType: { 1: 0, 2: 0, 3: 0 },
    byStatus: { approved: 0, pending: 0, rejected: 0 },
    avgPoints: 0,
    avgTime: 0,
    byLevel: {},
    byMatiere: {},
    monthlyGrowth: [],
    validationRate: 0,
    avgValidationDays: 0
  });

  // Mise à jour des noms
  useEffect(() => {
    if (selectedDomainId) setDomainNom(getDomainNom(selectedDomainId));
  }, [selectedDomainId]);

  useEffect(() => {
    if (selectedDomainId && selectedSousDomaineId) {
      setSousDomaineNom(getSousDomaineNom(selectedDomainId, selectedSousDomaineId));
    }
  }, [selectedDomainId, selectedSousDomaineId]);

  useEffect(() => {
    if (selectedDomainId && selectedSousDomaineId && selectedLevelId) {
      setLevelNom(getLevelNom(selectedDomainId, selectedSousDomaineId, selectedLevelId));
    }
  }, [selectedDomainId, selectedSousDomaineId, selectedLevelId]);

  useEffect(() => {
    if (selectedDomainId && selectedSousDomaineId && selectedMatiereId) {
      setMatiereNom(getMatiereNom(selectedDomainId, selectedSousDomaineId, selectedMatiereId));
    }
  }, [selectedDomainId, selectedSousDomaineId, selectedMatiereId]);

  // Chargement des questions
  const loadQuestions = async () => {
    setLoading(true);
    setError(null);
    try {
      const filter = {};
      if (selectedDomainId) filter.nDomaine = parseInt(selectedDomainId);
      if (selectedSousDomaineId) filter.nSousDomaine = parseInt(selectedSousDomaineId);
      if (selectedLevelId) filter.niveau = parseInt(selectedLevelId);
      if (selectedMatiereId) filter.matiere = parseInt(selectedMatiereId);
      if (selectedStatus !== 'all') filter.status = selectedStatus;

      const response = await getQuestions(filter);

      let questionsData = [];
      if (Array.isArray(response)) questionsData = response;
      else if (response?.data && Array.isArray(response.data)) questionsData = response.data;
      else if (response?.data?.data && Array.isArray(response.data.data)) questionsData = response.data.data;

      const normalized = questionsData.map(q => ({
        ...q,
        libQuestion: q.libQuestion || q.question || q.text,
        typeInfo: QUESTION_TYPES.find(t => t.id === q.typeQuestion) || QUESTION_TYPES[0],
        imageUrl: q.imageQuestion || (q.imageBase64?.startsWith('data:') ? q.imageBase64 : null),
        createdAtDate: new Date(q.createdAt),
        approvedAtDate: q.approvedAt ? new Date(q.approvedAt) : null
      }));

      setQuestions(normalized);

      // Calcul des statistiques avancées
      const statsCalc = {
        total: normalized.length,
        byType: { 1: 0, 2: 0, 3: 0 },
        byStatus: { approved: 0, pending: 0, rejected: 0 },
        avgPoints: 0,
        avgTime: 0,
        byLevel: {},
        byMatiere: {},
        monthlyGrowth: {},
        validationRate: 0,
        avgValidationDays: 0
      };

      let totalPoints = 0;
      let totalTime = 0;
      let totalValidationDays = 0;
      let validationCount = 0;
      let rejectedCount = 0;

      // Analyse temporelle
      const monthlyData = {};

      normalized.forEach(q => {
        // Par type
        if (q.typeQuestion && statsCalc.byType[q.typeQuestion] !== undefined) {
          statsCalc.byType[q.typeQuestion]++;
        }
        
        // Par statut
        if (q.status) statsCalc.byStatus[q.status] = (statsCalc.byStatus[q.status] || 0) + 1;
        
        // Par niveau
        if (q.niveau) {
          statsCalc.byLevel[q.niveau] = (statsCalc.byLevel[q.niveau] || 0) + 1;
        }
        
        // Par matière
        if (q.matiere) {
          statsCalc.byMatiere[q.matiere] = (statsCalc.byMatiere[q.matiere] || 0) + 1;
        }
        
        totalPoints += q.points || 1;
        totalTime += q.tempsMin || 1;
        
        // Temps de validation
        if (q.status === 'approved' && q.createdAtDate && q.approvedAtDate) {
          const days = (q.approvedAtDate - q.createdAtDate) / (1000 * 60 * 60 * 24);
          totalValidationDays += days;
          validationCount++;
        }
        
        if (q.status === 'rejected') rejectedCount++;
        
        // Croissance mensuelle
        if (q.createdAtDate) {
          const monthKey = `${q.createdAtDate.getFullYear()}-${q.createdAtDate.getMonth() + 1}`;
          monthlyData[monthKey] = (monthlyData[monthKey] || 0) + 1;
        }
      });
      
      statsCalc.avgPoints = normalized.length ? (totalPoints / normalized.length).toFixed(1) : 0;
      statsCalc.avgTime = normalized.length ? (totalTime / normalized.length).toFixed(0) : 0;
      statsCalc.avgValidationDays = validationCount ? (totalValidationDays / validationCount).toFixed(1) : 0;
      statsCalc.validationRate = normalized.length ? ((validationCount / (validationCount + rejectedCount)) * 100).toFixed(0) : 0;
      
      // Convertir monthlyData en tableau trié
      statsCalc.monthlyGrowth = Object.entries(monthlyData)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .slice(-12)
        .map(([month, count]) => ({ month, count }));

      setStats(statsCalc);
      
      // Générer les insights IA
      generateAIInsights(normalized, statsCalc);
      
    } catch (err) {
      console.error('Erreur chargement questions:', err);
      setError(err.message || 'Erreur lors du chargement');
      toast.error('Impossible de charger les questions');
    } finally {
      setLoading(false);
    }
  };

  // IA : Génération des insights
  const generateAIInsights = (questionsData, statsCalc) => {
    const insights = {
      strengths: [],
      weaknesses: [],
      recommendations: [],
      predictedGrowth: 0,
      qualityScore: 0,
      balanceScore: 0,
      coverageScore: 0
    };
    
    // Analyse des forces
    const topMatieres = Object.entries(statsCalc.byMatiere)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);
    
    topMatieres.forEach(([matiere, count]) => {
      insights.strengths.push(`${matiere} (${count} questions)`);
    });
    
    // Analyse des faiblesses
    const weakMatieres = Object.entries(statsCalc.byMatiere)
      .sort((a, b) => a[1] - b[1])
      .slice(0, 3);
    
    weakMatieres.forEach(([matiere, count]) => {
      if (count < 5) {
        insights.weaknesses.push(`${matiere} (seulement ${count} questions)`);
      }
    });
    
    // Analyse de l'équilibre des types
    const total = statsCalc.total;
    const type1Percent = (statsCalc.byType[1] / total) * 100;
    const type2Percent = (statsCalc.byType[2] / total) * 100;
    const type3Percent = (statsCalc.byType[3] / total) * 100;
    
    insights.balanceScore = Math.round(100 - (Math.abs(type1Percent - 33) + Math.abs(type2Percent - 33) + Math.abs(type3Percent - 34)) / 2);
    
    if (type1Percent > 50) {
      insights.recommendations.push("Ajouter plus de questions de type 'Savoir-Faire' et 'Savoir-être' pour équilibrer");
    }
    if (type2Percent < 20) {
      insights.recommendations.push("Augmenter les questions pratiques (Savoir-Faire)");
    }
    if (type3Percent < 10) {
      insights.recommendations.push("Intégrer des questions d'évaluation comportementale (Savoir-être)");
    }
    
    // Analyse de la qualité
    const explanationRate = questionsData.filter(q => q.explanation && q.explanation.length > 10).length / total * 100;
    const imageRate = questionsData.filter(q => q.imageQuestion || q.imageBase64).length / total * 100;
    
    insights.qualityScore = Math.round((explanationRate * 0.6 + imageRate * 0.4));
    
    if (explanationRate < 50) {
      insights.recommendations.push("Améliorer les explications des réponses (taux actuel: ${explanationRate.toFixed(0)}%)");
    }
    if (imageRate < 20) {
      insights.recommendations.push("Ajouter des illustrations pour enrichir les questions");
    }
    
    // Analyse de la couverture
    const uniqueLevels = new Set(questionsData.map(q => q.niveau)).size;
    const targetLevels = 20; // Estimation
    insights.coverageScore = Math.round((uniqueLevels / targetLevels) * 100);
    
    if (uniqueLevels < 10) {
      insights.recommendations.push("Diversifier les niveaux couverts par les questions");
    }
    
    // Prédiction de croissance (basée sur les 3 derniers mois)
    const growthRates = [];
    for (let i = 1; i < statsCalc.monthlyGrowth.length; i++) {
      const prev = statsCalc.monthlyGrowth[i-1]?.count || 0;
      const curr = statsCalc.monthlyGrowth[i]?.count || 0;
      if (prev > 0) {
        growthRates.push((curr - prev) / prev);
      }
    }
    const avgGrowth = growthRates.length > 0 
      ? growthRates.reduce((a, b) => a + b, 0) / growthRates.length 
      : 0.1;
    insights.predictedGrowth = Math.round(avgGrowth * 100);
    
    // Recommandations supplémentaires
    if (statsCalc.avgValidationDays > 7) {
      insights.recommendations.push(`Accélérer le circuit de validation (moyenne: ${statsCalc.avgValidationDays} jours)`);
    }
    if (statsCalc.validationRate < 70) {
      insights.recommendations.push("Améliorer la qualité des questions soumises (taux validation: ${statsCalc.validationRate}%)");
    }
    
    setAiInsights(insights);
  };

  useEffect(() => {
    loadQuestions();
  }, [selectedDomainId, selectedSousDomaineId, selectedLevelId, selectedMatiereId, selectedStatus]);

  // Filtrage textuel
  const filteredQuestions = useMemo(() => {
    if (!searchTerm) return questions;
    const term = searchTerm.toLowerCase();
    return questions.filter(q =>
      q.libQuestion?.toLowerCase().includes(term) ||
      q.matiere?.toLowerCase().includes(term) ||
      q.niveau?.toLowerCase().includes(term) ||
      q.domaine?.toLowerCase().includes(term)
    );
  }, [questions, searchTerm]);

  const resetFilters = () => {
    setSearchTerm('');
    setSelectedDomainId('');
    setSelectedSousDomaineId('');
    setSelectedLevelId('');
    setSelectedMatiereId('');
    setSelectedType('');
    setSelectedStatus('approved');
  };

  const hasActiveFilters = searchTerm || selectedDomainId || selectedSousDomaineId || selectedLevelId || selectedMatiereId || selectedType || selectedStatus !== 'approved';

  // Export CSV amélioré
  const exportToCSV = () => {
    const headers = ['N°Question', 'Domaine', 'Sous-domaine', 'Niveau', 'Matière', 'Question', 'Type', 'Points', 'Temps (min)', 'Statut', 'Date création', 'Date validation', 'Auteur'];
    const rows = filteredQuestions.map((q, idx) => [
      idx + 1,
      q.domaine || '',
      q.sousDomaine || '',
      q.niveau || '',
      q.matiere || '',
      q.libQuestion || '',
      q.typeInfo?.nom || '',
      q.points || 1,
      q.tempsMin || 1,
      q.status === 'approved' ? 'Validée' : q.status === 'pending' ? 'En attente' : 'Rejetée',
      new Date(q.createdAt).toLocaleDateString('fr-FR'),
      q.approvedAt ? new Date(q.approvedAt).toLocaleDateString('fr-FR') : '',
      q.matriculeAuteur || q.createdBy?.name || ''
    ]);

    const csvContent = [headers, ...rows].map(row => row.join(';')).join('\n');
    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `banque_qcm_analytics_${new Date().toISOString().slice(0, 19)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Export CSV réussi');
  };

  // Graphiques
  const typeChartData = {
    labels: QUESTION_TYPES.map(t => t.nom),
    datasets: [{
      data: [stats.byType[1], stats.byType[2], stats.byType[3]],
      backgroundColor: QUESTION_TYPES.map(t => t.color + '80'),
      borderColor: QUESTION_TYPES.map(t => t.color),
      borderWidth: 2,
    }]
  };

  const growthChartData = {
    labels: stats.monthlyGrowth.map(m => m.month),
    datasets: [{
      label: 'Nouvelles questions',
      data: stats.monthlyGrowth.map(m => m.count),
      borderColor: '#3b82f6',
      backgroundColor: 'rgba(59,130,246,0.1)',
      fill: true,
      tension: 0.4,
    }]
  };

  const growthChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { labels: { color: '#94a3b8' } }
    },
    scales: {
      y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94a3b8' } },
      x: { grid: { display: false }, ticks: { color: '#94a3b8' } }
    }
  };

  const typeChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { labels: { color: '#94a3b8' } }
    }
  };

  // Top matières
  const topMatieres = Object.entries(stats.byMatiere)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  // Composant de carte de question
  const QuestionCard = ({ question, index }) => {
    const isExpanded = expandedQuestion === question._id;
    const typeInfo = question.typeInfo;
    const imageUrl = question.imageUrl;

    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.03 }}
        style={{
          background: 'rgba(15,23,42,0.7)',
          border: `1px solid ${typeInfo?.color || '#6366f1'}30`,
          borderRadius: 16,
          overflow: 'hidden',
          backdropFilter: 'blur(8px)'
        }}
      >
        <div
          onClick={() => setExpandedQuestion(isExpanded ? null : question._id)}
          style={{
            padding: '16px 20px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'flex-start',
            gap: 12,
            transition: 'background 0.2s'
          }}
        >
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: `${typeInfo?.color}20`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0
          }}>
            <FileText size={16} color={typeInfo?.color} />
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
              <span style={{
                padding: '2px 8px', borderRadius: 12, fontSize: '0.6rem', fontWeight: 600,
                background: `${typeInfo?.color}20`, color: typeInfo?.color
              }}>
                {typeInfo?.nom}
              </span>
              <span style={{
                padding: '2px 8px', borderRadius: 12, fontSize: '0.6rem', fontWeight: 600,
                background: question.status === 'approved' ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)',
                color: question.status === 'approved' ? '#10b981' : '#f59e0b'
              }}>
                {question.status === 'approved' ? '✓ Validée' : question.status === 'pending' ? '⏳ En attente' : '✗ Rejetée'}
              </span>
              <span style={{ fontSize: '0.6rem', color: '#64748b' }}>
                ⭐ {question.points || 1} pt
              </span>
              <span style={{ fontSize: '0.6rem', color: '#64748b' }}>
                ⏱️ {question.tempsMin || 1} min
              </span>
            </div>

            <p style={{ color: '#f8fafc', fontSize: '0.9rem', fontWeight: 500, lineHeight: 1.4 }}>
              {index + 1}. {question.libQuestion}
            </p>

            <div style={{ display: 'flex', gap: 12, marginTop: 8, fontSize: '0.65rem', color: '#64748b', flexWrap: 'wrap' }}>
              <span>📚 {question.domaine || '—'}</span>
              <span>🎓 {question.niveau || '—'}</span>
              <span>📖 {question.matiere || '—'}</span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {imageUrl && <img src={imageUrl} alt="" style={{ width: 40, height: 40, borderRadius: 6, objectFit: 'cover' }} />}
            {isExpanded ? <ChevronUp size={16} color="#64748b" /> : <ChevronDown size={16} color="#64748b" />}
          </div>
        </div>

        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              style={{ borderTop: '1px solid rgba(255,255,255,0.05)', overflow: 'hidden' }}
            >
              <div style={{ padding: '16px 20px 20px 64px' }}>
                {imageUrl && (
                  <div style={{ marginBottom: 12 }}>
                    <img src={imageUrl} alt="Illustration" style={{ maxWidth: '100%', maxHeight: 150, borderRadius: 8, objectFit: 'contain' }} />
                  </div>
                )}

                <div style={{ marginBottom: 12 }}>
                  <p style={{ color: '#94a3b8', fontSize: '0.7rem', marginBottom: 6 }}>Options :</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {question.options?.map((opt, i) => {
                      const isCorrect = typeof question.bonOpRep === 'number'
                        ? i === question.bonOpRep
                        : opt === question.correctAnswer;
                      return (
                        <div key={i} style={{
                          padding: '6px 12px',
                          background: isCorrect ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.02)',
                          border: `1px solid ${isCorrect ? '#10b981' : 'rgba(99,102,241,0.2)'}`,
                          borderRadius: 8,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8
                        }}>
                          <span style={{ color: isCorrect ? '#10b981' : '#64748b', fontWeight: 600 }}>
                            {String.fromCharCode(65 + i)}.
                          </span>
                          <span style={{ color: '#94a3b8' }}>{opt}</span>
                          {isCorrect && <CheckCircle size={12} color="#10b981" style={{ marginLeft: 'auto' }} />}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {question.explanation && (
                  <div style={{ padding: 8, background: 'rgba(59,130,246,0.05)', borderRadius: 8, marginBottom: 12 }}>
                    <p style={{ color: '#64748b', fontSize: '0.75rem' }}>💡 {question.explanation}</p>
                  </div>
                )}

                <div style={{ display: 'flex', gap: 16, fontSize: '0.65rem', color: '#64748b', marginTop: 8 }}>
                  <span>👤 Auteur: {question.matriculeAuteur || question.createdBy?.name || 'Inconnu'}</span>
                  <span>📅 Créée: {new Date(question.createdAt).toLocaleDateString('fr-FR')}</span>
                  {question.approvedAt && <span>✅ Validée: {new Date(question.approvedAt).toLocaleDateString('fr-FR')}</span>}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
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

      <main style={{ position: 'relative', zIndex: 1, maxWidth: 1400, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate('/evaluate')}
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
              <Library size={14} color="#6366f1" />
              <span style={{ color: '#a5b4fc', fontSize: '0.7rem', fontWeight: 600 }}>BANQUE DE QCM</span>
            </div>
            <h1 style={{ fontSize: '2rem', fontWeight: 700, color: '#f8fafc' }}>
              Dashboard Analytique
            </h1>
            <p style={{ color: '#64748b' }}>
              Analyse avancée, insights IA et recommandations pédagogiques
            </p>
          </div>
        </div>

        {/* Vue Dashboard / Liste */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 24, borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: 12 }}>
          <button
            onClick={() => setDashboardView('analytics')}
            style={{
              padding: '8px 20px',
              borderRadius: 20,
              background: dashboardView === 'analytics' ? '#3b82f6' : 'rgba(255,255,255,0.05)',
              border: 'none',
              color: dashboardView === 'analytics' ? '#fff' : '#94a3b8',
              cursor: 'pointer',
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}
          >
            <BarChart3 size={16} /> Tableau de bord
          </button>
          <button
            onClick={() => setDashboardView('insights')}
            style={{
              padding: '8px 20px',
              borderRadius: 20,
              background: dashboardView === 'insights' ? '#8b5cf6' : 'rgba(255,255,255,0.05)',
              border: 'none',
              color: dashboardView === 'insights' ? '#fff' : '#94a3b8',
              cursor: 'pointer',
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}
          >
            <Brain size={16} /> Insights IA
          </button>
          <button
            onClick={() => setDashboardView('recommendations')}
            style={{
              padding: '8px 20px',
              borderRadius: 20,
              background: dashboardView === 'recommendations' ? '#10b981' : 'rgba(255,255,255,0.05)',
              border: 'none',
              color: dashboardView === 'recommendations' ? '#fff' : '#94a3b8',
              cursor: 'pointer',
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}
          >
            <Lightbulb size={16} /> Recommandations
          </button>
        </div>

        {/* DASHBOARD ANALYTIQUE */}
        {dashboardView === 'analytics' && !loading && questions.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{ marginBottom: 24 }}
          >
            {/* KPIs avancés */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 24 }}>
              <div style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 12, padding: 12 }}>
                <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#3b82f6' }}>{stats.total}</div>
                <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Total questions</div>
                <div style={{ fontSize: '0.6rem', color: '#10b981', marginTop: 4 }}>+{aiInsights.predictedGrowth}% croissance</div>
              </div>
              <div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 12, padding: 12 }}>
                <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#10b981' }}>{stats.byStatus.approved || 0}</div>
                <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Validées</div>
                <div style={{ fontSize: '0.6rem', color: '#f59e0b' }}>{stats.validationRate}% taux validation</div>
              </div>
              <div style={{ background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.2)', borderRadius: 12, padding: 12 }}>
                <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#a78bfa' }}>{stats.avgPoints}</div>
                <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Points moyen</div>
                <div style={{ fontSize: '0.6rem', color: '#f59e0b' }}>{stats.avgTime} min/question</div>
              </div>
              <div style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 12, padding: 12 }}>
                <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#f59e0b' }}>{stats.byStatus.pending || 0}</div>
                <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>En attente</div>
                <div style={{ fontSize: '0.6rem', color: '#ef4444' }}>{stats.avgValidationDays} jours validation</div>
              </div>
            </div>

            {/* Graphiques */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
              <div style={{ background: 'rgba(15,23,42,0.5)', borderRadius: 16, padding: 20 }}>
                <h3 style={{ color: '#f8fafc', fontSize: '0.9rem', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <PieChart size={16} color="#8b5cf6" /> Répartition par type
                </h3>
                <div style={{ height: 200 }}>
                  <Doughnut data={typeChartData} options={typeChartOptions} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginTop: 16 }}>
                  {QUESTION_TYPES.map(type => (
                    <div key={type.id} style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '1.2rem', fontWeight: 700, color: type.color }}>{stats.byType[type.id] || 0}</div>
                      <div style={{ fontSize: '0.6rem', color: '#64748b' }}>{type.nom}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ background: 'rgba(15,23,42,0.5)', borderRadius: 16, padding: 20 }}>
                <h3 style={{ color: '#f8fafc', fontSize: '0.9rem', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <LineChart size={16} color="#3b82f6" /> Croissance mensuelle
                </h3>
                <div style={{ height: 200 }}>
                  <Line data={growthChartData} options={growthChartOptions} />
                </div>
              </div>
            </div>

            {/* Top matières */}
            <div style={{ background: 'rgba(15,23,42,0.5)', borderRadius: 16, padding: 20, marginBottom: 24 }}>
              <h3 style={{ color: '#f8fafc', fontSize: '0.9rem', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                <TrendingUp size={16} color="#10b981" /> Top matières
              </h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                {topMatieres.map(([matiere, count]) => (
                  <div key={matiere} style={{
                    background: 'rgba(16,185,129,0.1)',
                    border: '1px solid rgba(16,185,129,0.2)',
                    borderRadius: 8,
                    padding: '8px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8
                  }}>
                    <span style={{ color: '#10b981', fontWeight: 600 }}>{count}</span>
                    <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>{matiere}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* INSIGHTS IA */}
        {dashboardView === 'insights' && !loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}
          >
            {/* Scores */}
            <div style={{ background: 'rgba(15,23,42,0.5)', borderRadius: 16, padding: 20 }}>
              <h3 style={{ color: '#f8fafc', fontSize: '0.9rem', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Activity size={16} color="#8b5cf6" /> Scores de qualité
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>Qualité des questions</span>
                    <span style={{ color: '#f59e0b', fontWeight: 600 }}>{aiInsights.qualityScore}%</span>
                  </div>
                  <div style={{ height: 6, background: 'rgba(255,255,255,0.1)', borderRadius: 3 }}>
                    <div style={{ width: `${aiInsights.qualityScore}%`, height: '100%', background: 'linear-gradient(90deg, #f59e0b, #10b981)', borderRadius: 3 }} />
                  </div>
                </div>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>Équilibre des types</span>
                    <span style={{ color: '#10b981', fontWeight: 600 }}>{aiInsights.balanceScore}%</span>
                  </div>
                  <div style={{ height: 6, background: 'rgba(255,255,255,0.1)', borderRadius: 3 }}>
                    <div style={{ width: `${aiInsights.balanceScore}%`, height: '100%', background: 'linear-gradient(90deg, #3b82f6, #10b981)', borderRadius: 3 }} />
                  </div>
                </div>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>Couverture des niveaux</span>
                    <span style={{ color: '#8b5cf6', fontWeight: 600 }}>{aiInsights.coverageScore}%</span>
                  </div>
                  <div style={{ height: 6, background: 'rgba(255,255,255,0.1)', borderRadius: 3 }}>
                    <div style={{ width: `${aiInsights.coverageScore}%`, height: '100%', background: 'linear-gradient(90deg, #8b5cf6, #3b82f6)', borderRadius: 3 }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Forces et Faiblesses */}
            <div style={{ background: 'rgba(15,23,42,0.5)', borderRadius: 16, padding: 20 }}>
              <h3 style={{ color: '#f8fafc', fontSize: '0.9rem', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Target size={16} color="#10b981" /> Analyse SWOT
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <p style={{ color: '#10b981', fontSize: '0.75rem', marginBottom: 8 }}>📈 Forces</p>
                  {aiInsights.strengths.map((s, i) => (
                    <div key={i} style={{ padding: '6px 0', color: '#94a3b8', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <CheckCircle size={10} color="#10b981" /> {s}
                    </div>
                  ))}
                  {aiInsights.strengths.length === 0 && (
                    <p style={{ color: '#64748b', fontSize: '0.7rem' }}>Aucune donnée</p>
                  )}
                </div>
                <div>
                  <p style={{ color: '#ef4444', fontSize: '0.75rem', marginBottom: 8 }}>📉 Faiblesses</p>
                  {aiInsights.weaknesses.map((w, i) => (
                    <div key={i} style={{ padding: '6px 0', color: '#94a3b8', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <AlertTriangle size={10} color="#ef4444" /> {w}
                    </div>
                  ))}
                  {aiInsights.weaknesses.length === 0 && (
                    <p style={{ color: '#10b981', fontSize: '0.7rem' }}>✅ Bonne couverture</p>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* RECOMMANDATIONS IA */}
        {dashboardView === 'recommendations' && !loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{ background: 'rgba(15,23,42,0.5)', borderRadius: 16, padding: 24, marginBottom: 24 }}
          >
            <h3 style={{ color: '#f8fafc', fontSize: '1rem', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Sparkles size={18} color="#f59e0b" /> Recommandations pédagogiques IA
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {aiInsights.recommendations.map((rec, i) => (
                <div key={i} style={{
                  padding: '12px 16px',
                  background: 'rgba(245,158,11,0.05)',
                  border: '1px solid rgba(245,158,11,0.2)',
                  borderRadius: 10,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12
                }}>
                  <Lightbulb size={18} color="#f59e0b" />
                  <span style={{ color: '#e2e8f0', fontSize: '0.85rem' }}>{rec}</span>
                </div>
              ))}
              {aiInsights.recommendations.length === 0 && (
                <div style={{ textAlign: 'center', padding: 40 }}>
                  <CheckCircle size={40} color="#10b981" />
                  <p style={{ color: '#10b981', marginTop: 12 }}>✅ Tout est optimal !</p>
                </div>
              )}
            </div>

            {/* Prédiction */}
            <div style={{ marginTop: 20, padding: 12, background: 'rgba(99,102,241,0.1)', borderRadius: 10 }}>
              <p style={{ color: '#a5b4fc', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Brain size={14} />
                Projection IA : Croissance estimée à <strong>{aiInsights.predictedGrowth}%</strong> dans les 3 prochains mois
              </p>
            </div>
          </motion.div>
        )}

        {/* Barre de recherche et filtres (toujours visible) */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
            <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
              <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Rechercher par question, matière, niveau..."
                style={{
                  width: '100%', padding: '10px 12px 10px 38px',
                  background: 'rgba(15,23,42,0.7)', border: '1px solid rgba(59,130,246,0.2)',
                  borderRadius: 10, color: '#f8fafc', outline: 'none'
                }}
              />
            </div>

            <button
              onClick={() => setShowFilters(!showFilters)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '10px 16px', background: 'rgba(99,102,241,0.1)',
                border: '1px solid rgba(99,102,241,0.3)', borderRadius: 10,
                color: '#a5b4fc', cursor: 'pointer'
              }}
            >
              <Filter size={14} /> Filtres {showFilters ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>

            <button
              onClick={exportToCSV}
              disabled={filteredQuestions.length === 0}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '10px 16px', background: 'rgba(16,185,129,0.1)',
                border: '1px solid rgba(16,185,129,0.3)', borderRadius: 10,
                color: '#10b981', cursor: filteredQuestions.length === 0 ? 'not-allowed' : 'pointer',
                opacity: filteredQuestions.length === 0 ? 0.5 : 1
              }}
            >
              <Download size={14} /> Exporter CSV
            </button>

            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '10px 16px', background: 'rgba(239,68,68,0.1)',
                  border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10,
                  color: '#ef4444', cursor: 'pointer'
                }}
              >
                <FilterX size={14} /> Réinitialiser
              </button>
            )}
          </div>

          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                style={{ overflow: 'hidden' }}
              >
                <div style={{
                  display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                  gap: 12, marginTop: 12, padding: 16,
                  background: 'rgba(15,23,42,0.5)', borderRadius: 12,
                  border: '1px solid rgba(99,102,241,0.15)'
                }}>
                  <div>
                    <label style={{ fontSize: '0.7rem', color: '#94a3b8', marginBottom: 4, display: 'block' }}>Domaine</label>
                    <select value={selectedDomainId} onChange={e => setSelectedDomainId(e.target.value)} style={{ width: '100%', padding: 8, background: '#0f172a', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 8, color: '#f8fafc' }}>
                      <option value="">Tous</option>
                      {getAllDomaines().map(d => <option key={d.id} value={d.id}>{d.id} - {d.nom}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '0.7rem', color: '#94a3b8', marginBottom: 4, display: 'block' }}>Sous-domaine</label>
                    <select value={selectedSousDomaineId} onChange={e => setSelectedSousDomaineId(e.target.value)} disabled={!selectedDomainId} style={{ width: '100%', padding: 8, background: '#0f172a', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 8, color: '#f8fafc', opacity: !selectedDomainId ? 0.5 : 1 }}>
                      <option value="">Tous</option>
                      {getAllSousDomaines(selectedDomainId).map(sd => <option key={sd.id} value={sd.id}>{sd.id} - {sd.nom}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '0.7rem', color: '#94a3b8', marginBottom: 4, display: 'block' }}>Niveau</label>
                    <select value={selectedLevelId} onChange={e => setSelectedLevelId(e.target.value)} disabled={!selectedSousDomaineId} style={{ width: '100%', padding: 8, background: '#0f172a', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 8, color: '#f8fafc', opacity: !selectedSousDomaineId ? 0.5 : 1 }}>
                      <option value="">Tous</option>
                      {getAllLevels(selectedDomainId, selectedSousDomaineId).map(l => <option key={l.id} value={l.id}>{l.id} - {l.nom}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '0.7rem', color: '#94a3b8', marginBottom: 4, display: 'block' }}>Matière</label>
                    <select value={selectedMatiereId} onChange={e => setSelectedMatiereId(e.target.value)} disabled={!selectedSousDomaineId} style={{ width: '100%', padding: 8, background: '#0f172a', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 8, color: '#f8fafc', opacity: !selectedSousDomaineId ? 0.5 : 1 }}>
                      <option value="">Toutes</option>
                      {getAllMatieres(selectedDomainId, selectedSousDomaineId).map(m => <option key={m.id} value={m.id}>{m.id} - {m.nom}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '0.7rem', color: '#94a3b8', marginBottom: 4, display: 'block' }}>Type</label>
                    <select value={selectedType} onChange={e => setSelectedType(e.target.value)} style={{ width: '100%', padding: 8, background: '#0f172a', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 8, color: '#f8fafc' }}>
                      <option value="">Tous</option>
                      {QUESTION_TYPES.map(t => <option key={t.id} value={t.id}>{t.nom}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '0.7rem', color: '#94a3b8', marginBottom: 4, display: 'block' }}>Statut</label>
                    <select value={selectedStatus} onChange={e => setSelectedStatus(e.target.value)} style={{ width: '100%', padding: 8, background: '#0f172a', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 8, color: '#f8fafc' }}>
                      <option value="approved">Validées</option>
                      <option value="pending">En attente</option>
                      <option value="all">Toutes</option>
                    </select>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Liste des questions */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: 60 }}>
            <RefreshCw size={32} color="#3b82f6" style={{ animation: 'spin 1s linear infinite' }} />
            <p style={{ color: '#64748b', marginTop: 16 }}>Chargement des questions...</p>
          </div>
        ) : error ? (
          <div style={{ textAlign: 'center', padding: 60, color: '#ef4444', background: 'rgba(239,68,68,0.1)', borderRadius: 16 }}>
            <AlertCircle size={32} />
            <p style={{ marginTop: 12 }}>{error}</p>
            <button onClick={loadQuestions} style={{ marginTop: 16, padding: '8px 20px', background: '#3b82f6', border: 'none', borderRadius: 8, color: '#fff', cursor: 'pointer' }}>Réessayer</button>
          </div>
        ) : filteredQuestions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60, color: '#64748b', background: 'rgba(15,23,42,0.5)', borderRadius: 16 }}>
            <Library size={48} color="#1e293b" style={{ marginBottom: 12 }} />
            <p>Aucune question trouvée{hasActiveFilters ? ' avec ces critères' : ''}</p>
            {hasActiveFilters && <button onClick={resetFilters} style={{ marginTop: 12, padding: '6px 16px', background: 'rgba(99,102,241,0.2)', border: 'none', borderRadius: 8, color: '#a5b4fc', cursor: 'pointer' }}>Effacer les filtres</button>}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <p style={{ color: '#64748b', fontSize: '0.8rem' }}>{filteredQuestions.length} question(s) trouvée(s)</p>
              <button onClick={loadQuestions} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px', background: 'rgba(99,102,241,0.1)', border: 'none', borderRadius: 6, color: '#a5b4fc', cursor: 'pointer', fontSize: '0.7rem' }}>
                <RefreshCw size={12} /> Actualiser
              </button>
            </div>
            {filteredQuestions.map((q, idx) => (
              <QuestionCard key={q._id || idx} question={q} index={idx} />
            ))}
          </div>
        )}
      </main>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: rgba(15,23,42,0.3); border-radius: 10px; }
        ::-webkit-scrollbar-thumb { background: rgba(99,102,241,0.3); border-radius: 10px; }
      `}</style>
    </div>
  );
};

export default QCMBankPage;