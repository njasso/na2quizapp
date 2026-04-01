// src/pages/creation/CreateQuestion.jsx
// Création de question individuelle avec validation pédagogique
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Save, ArrowLeft, BookOpen, Layers, Tag, Clock, Award, HelpCircle, PlusCircle, Trash2, AlertCircle, Loader, XCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { saveQuestions } from '../../services/api';
import ImageUploader from '../../components/ImageUploader';
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
import toast from 'react-hot-toast';

const QUESTION_TYPES = [
  { id: 1, nom: "Notions de base (le Savoir)", description: "Évaluation des connaissances théoriques" },
  { id: 2, nom: "Intelligence Pratique (Savoir-Faire)", description: "Évaluation des compétences pratiques" },
  { id: 3, nom: "Savoir-être", description: "Évaluation du potentiel psychologique" }
];

const CreateQuestion = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Référentiel
  const [selectedDomainId, setSelectedDomainId] = useState('');
  const [selectedSousDomaineId, setSelectedSousDomaineId] = useState('');
  const [selectedLevelId, setSelectedLevelId] = useState('');
  const [selectedMatiereId, setSelectedMatiereId] = useState('');
  
  // Noms affichés
  const [domainNom, setDomainNom] = useState('');
  const [sousDomaineNom, setSousDomaineNom] = useState('');
  const [levelNom, setLevelNom] = useState('');
  const [matiereNom, setMatiereNom] = useState('');
  
  // Contenu question
  const [libQuestion, setLibQuestion] = useState('');
  const [options, setOptions] = useState(['', '', '']);
  const [correctAnswer, setCorrectAnswer] = useState('');
  const [correctAnswers, setCorrectAnswers] = useState([]);
  const [typeQuestion, setTypeQuestion] = useState(1);
  const [points, setPoints] = useState(1);
  const [tempsMin, setTempsMin] = useState(1);
  const [explanation, setExplanation] = useState('');
  const [libChapitre, setLibChapitre] = useState('');
  
  // Image
  const [imageQuestion, setImageQuestion] = useState('');
  const [imageBase64, setImageBase64] = useState('');
  const [imageMetadata, setImageMetadata] = useState({});
  
  const [isLoading, setIsLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState({
    libQuestion: false,
    options: false,
    correctAnswer: false,
    domaine: false,
    niveau: false,
    matiere: false,
  });

  // Mise à jour des noms
  useEffect(() => {
    if (selectedDomainId) {
      const nom = getDomainNom(selectedDomainId);
      setDomainNom(nom);
    }
  }, [selectedDomainId]);

  useEffect(() => {
    if (selectedDomainId && selectedSousDomaineId) {
      const nom = getSousDomaineNom(selectedDomainId, selectedSousDomaineId);
      setSousDomaineNom(nom);
    }
  }, [selectedDomainId, selectedSousDomaineId]);

  useEffect(() => {
    if (selectedDomainId && selectedSousDomaineId && selectedLevelId) {
      const nom = getLevelNom(selectedDomainId, selectedSousDomaineId, selectedLevelId);
      setLevelNom(nom);
    }
  }, [selectedDomainId, selectedSousDomaineId, selectedLevelId]);

  useEffect(() => {
    if (selectedDomainId && selectedSousDomaineId && selectedMatiereId) {
      const nom = getMatiereNom(selectedDomainId, selectedSousDomaineId, selectedMatiereId);
      setMatiereNom(nom);
    }
  }, [selectedDomainId, selectedSousDomaineId, selectedMatiereId]);

  // Gestion des options dynamiques
  const addOption = () => {
    if (options.length < 5) setOptions([...options, '']);
  };

  const removeOption = (index) => {
    if (options.length > 3) {
      const newOptions = options.filter((_, i) => i !== index);
      setOptions(newOptions);
      if (typeQuestion === 1 && correctAnswer === options[index]) {
        setCorrectAnswer('');
      }
      if (typeQuestion === 2 && correctAnswers.includes(options[index])) {
        setCorrectAnswers(correctAnswers.filter(a => a !== options[index]));
      }
    }
  };

  const handleOptionChange = (index, value) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const handleCorrectAnswerChange = (value, index) => {
    if (typeQuestion === 1) {
      setCorrectAnswer(value);
    } else {
      if (correctAnswers.includes(value)) {
        setCorrectAnswers(correctAnswers.filter(a => a !== value));
      } else {
        setCorrectAnswers([...correctAnswers, value]);
      }
    }
  };

  const handleImageChange = (url, base64, metadata) => {
    setImageQuestion(url || '');
    setImageBase64(base64 || '');
    setImageMetadata(metadata || {});
  };

  const validateForm = () => {
    const filledOptions = options.filter(opt => opt.trim() !== '');
    const hasCorrectAnswer = typeQuestion === 1 
      ? correctAnswer.trim() !== ''
      : correctAnswers.length > 0;
    
    const errors = {
      libQuestion: !libQuestion.trim(),
      options: filledOptions.length < 3 || filledOptions.length > 5,
      correctAnswer: !hasCorrectAnswer,
      domaine: !selectedDomainId,
      niveau: !selectedLevelId,
      matiere: !selectedMatiereId,
    };
    setValidationErrors(errors);
    return !errors.libQuestion && !errors.options && !errors.correctAnswer && !errors.domaine && !errors.niveau && !errors.matiere;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      toast.error('Veuillez corriger les erreurs avant d\'enregistrer');
      return;
    }

    const filledOptions = options.filter(opt => opt.trim() !== '');
    
    // Vérifier que les noms sont résolus
    const resolvedDomainNom = domainNom || getDomainNom(selectedDomainId) || '';
    const resolvedLevelNom = levelNom || getLevelNom(selectedDomainId, selectedSousDomaineId, selectedLevelId) || '';
    const resolvedMatiereNom = matiereNom || getMatiereNom(selectedDomainId, selectedSousDomaineId, selectedMatiereId) || '';
    const resolvedSousDomaineNom = sousDomaineNom || getSousDomaineNom(selectedDomainId, selectedSousDomaineId) || '';
    
    if (!resolvedDomainNom || !resolvedLevelNom || !resolvedMatiereNom) {
      toast.error('Veuillez sélectionner un domaine, un niveau et une matière valides');
      setIsLoading(false);
      return;
    }
    
    // Calculer bonOpRep (index de la bonne réponse dans le tableau d'options)
    let bonOpRep = null;
    if (typeQuestion === 1 && correctAnswer) {
      bonOpRep = filledOptions.findIndex(opt => opt === correctAnswer);
    } else if (typeQuestion === 2 && correctAnswers.length > 0) {
      bonOpRep = filledOptions.findIndex(opt => correctAnswers.includes(opt));
    }
    
    // Si bonOpRep est invalide, prendre 0 par défaut
    if (bonOpRep === -1 || bonOpRep === null) {
      bonOpRep = 0;
      console.warn('bonOpRep invalide, utilisation de l\'index 0');
    }
    
    setIsLoading(true);
    try {
      // Formatage des données pour l'API /api/questions/save
      const questionData = {
        libQuestion: libQuestion,
        options: filledOptions,
        correctAnswer: typeQuestion === 1 ? correctAnswer : correctAnswers,
        bonOpRep: bonOpRep,
        typeQuestion: typeQuestion,
        points: points,
        tempsMin: tempsMin,
        explanation: explanation,
        // Champs requis par le backend - utiliser les valeurs résolues
        domaine: resolvedDomainNom,
        niveau: resolvedLevelNom,
        matiere: resolvedMatiereNom,
        sousDomaine: resolvedSousDomaineNom,
        libChapitre: libChapitre,
        // Image
        imageQuestion: imageQuestion,
        imageBase64: imageBase64,
        imageMetadata: imageMetadata,
        // Auteur
        matriculeAuteur: user?.matricule || user?.email || '',
        status: 'pending'
      };

      console.log('📤 Envoi des données à /api/questions/save:', JSON.stringify(questionData, null, 2));

      const response = await saveQuestions({ questions: [questionData] });

      if (response.success) {
        toast.success('Question créée et envoyée en validation !');
        navigate('/teacher/questions');
      } else {
        throw new Error(response.error || 'Erreur lors de la création');
      }
    } catch (error) {
      console.error('Erreur:', error);
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
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
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
              <HelpCircle size={14} color="#6366f1" />
              <span style={{ color: '#a5b4fc', fontSize: '0.7rem', fontWeight: 600 }}>
                CRÉATION DE QCM
              </span>
            </div>
            <h1 style={{ fontSize: '2rem', fontWeight: 700, color: '#f8fafc' }}>
              Créer une question
            </h1>
            <p style={{ color: '#64748b' }}>
              La question sera soumise à validation avant d'être disponible dans la base
            </p>
          </div>
        </div>

        <div style={{
          background: 'rgba(15,23,42,0.7)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(99,102,241,0.2)',
          borderRadius: 24,
          padding: 32
        }}>
          {/* Référentiel */}
          <div style={{ marginBottom: 24 }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#f8fafc', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <BookOpen size={16} color="#8b5cf6" />
              Référentiel de la question *
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label style={{ color: '#94a3b8', fontSize: '0.75rem', marginBottom: 4, display: 'block' }}>Domaine *</label>
                <select value={selectedDomainId} onChange={(e) => { setSelectedDomainId(e.target.value); setSelectedSousDomaineId(''); setSelectedLevelId(''); setSelectedMatiereId(''); }}
                  style={{ width: '100%', padding: 10, background: 'rgba(255,255,255,0.05)', border: `1px solid ${validationErrors.domaine ? '#ef4444' : 'rgba(99,102,241,0.2)'}`, borderRadius: 8, color: '#f8fafc' }}>
                  <option value="">Sélectionner...</option>
                  {getAllDomaines().map(d => <option key={d.id} value={d.id}>{d.id} - {d.nom}</option>)}
                </select>
              </div>
              <div>
                <label style={{ color: '#94a3b8', fontSize: '0.75rem', marginBottom: 4, display: 'block' }}>Sous-domaine *</label>
                <select value={selectedSousDomaineId} onChange={(e) => setSelectedSousDomaineId(e.target.value)} disabled={!selectedDomainId}
                  style={{ width: '100%', padding: 10, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 8, color: '#f8fafc', opacity: !selectedDomainId ? 0.5 : 1 }}>
                  <option value="">Sélectionner...</option>
                  {getAllSousDomaines(selectedDomainId).map(sd => <option key={sd.id} value={sd.id}>{sd.id} - {sd.nom}</option>)}
                </select>
              </div>
              <div>
                <label style={{ color: '#94a3b8', fontSize: '0.75rem', marginBottom: 4, display: 'block' }}>Niveau *</label>
                <select value={selectedLevelId} onChange={(e) => setSelectedLevelId(e.target.value)} disabled={!selectedSousDomaineId}
                  style={{ width: '100%', padding: 10, background: 'rgba(255,255,255,0.05)', border: `1px solid ${validationErrors.niveau ? '#ef4444' : 'rgba(99,102,241,0.2)'}`, borderRadius: 8, color: '#f8fafc', opacity: !selectedSousDomaineId ? 0.5 : 1 }}>
                  <option value="">Sélectionner...</option>
                  {getAllLevels(selectedDomainId, selectedSousDomaineId).map(l => <option key={l.id} value={l.id}>{l.id} - {l.nom}</option>)}
                </select>
              </div>
              <div>
                <label style={{ color: '#94a3b8', fontSize: '0.75rem', marginBottom: 4, display: 'block' }}>Matière *</label>
                <select value={selectedMatiereId} onChange={(e) => setSelectedMatiereId(e.target.value)} disabled={!selectedSousDomaineId}
                  style={{ width: '100%', padding: 10, background: 'rgba(255,255,255,0.05)', border: `1px solid ${validationErrors.matiere ? '#ef4444' : 'rgba(99,102,241,0.2)'}`, borderRadius: 8, color: '#f8fafc', opacity: !selectedSousDomaineId ? 0.5 : 1 }}>
                  <option value="">Sélectionner...</option>
                  {getAllMatieres(selectedDomainId, selectedSousDomaineId).map(m => <option key={m.id} value={m.id}>{m.id} - {m.nom}</option>)}
                </select>
              </div>
            </div>
            {(domainNom || sousDomaineNom || levelNom || matiereNom) && (
              <div style={{ marginTop: 12, padding: 8, background: 'rgba(99,102,241,0.05)', borderRadius: 8, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                {domainNom && <span style={{ fontSize: '0.7rem', color: '#a78bfa' }}>Domaine: {domainNom}</span>}
                {sousDomaineNom && <span style={{ fontSize: '0.7rem', color: '#a78bfa' }}>Sous-domaine: {sousDomaineNom}</span>}
                {levelNom && <span style={{ fontSize: '0.7rem', color: '#a78bfa' }}>Niveau: {levelNom}</span>}
                {matiereNom && <span style={{ fontSize: '0.7rem', color: '#a78bfa' }}>Matière: {matiereNom}</span>}
              </div>
            )}
          </div>

          {/* Type de question */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ color: '#94a3b8', fontSize: '0.8rem', marginBottom: 6, display: 'block' }}>Type de question *</label>
            <select value={typeQuestion} onChange={(e) => { setTypeQuestion(parseInt(e.target.value)); setCorrectAnswer(''); setCorrectAnswers([]); }}
              style={{ width: '100%', padding: 10, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 8, color: '#f8fafc' }}>
              {QUESTION_TYPES.map(t => <option key={t.id} value={t.id}>{t.id} - {t.nom}</option>)}
            </select>
            <p style={{ fontSize: '0.65rem', color: '#64748b', marginTop: 4 }}>
              {QUESTION_TYPES.find(t => t.id === typeQuestion)?.description}
            </p>
          </div>

          {/* Libellé */}
          <div style={{ position: 'relative' }}>
            <textarea value={libQuestion} onChange={(e) => setLibQuestion(e.target.value)}
              rows={3} placeholder="Libellé de la question *"
              style={{ width: '100%', padding: 12, marginBottom: 16, background: 'rgba(255,255,255,0.05)', border: `1px solid ${validationErrors.libQuestion ? '#ef4444' : 'rgba(99,102,241,0.2)'}`, borderRadius: 10, color: '#f8fafc' }} />
            {validationErrors.libQuestion && <p style={{ color: '#ef4444', fontSize: '0.7rem' }}><AlertCircle size={12} /> Le libellé est requis</p>}
          </div>

          {/* Image */}
          <ImageUploader value={imageQuestion || imageBase64} onImageChange={handleImageChange} label="Image (optionnel)" />

          {/* Options */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ color: '#94a3b8', fontSize: '0.7rem', marginBottom: 8, display: 'block' }}>
              Options (3 à 5) *
            </label>
            {options.map((opt, idx) => (
              <div key={idx} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <input type="text" value={opt} onChange={(e) => handleOptionChange(idx, e.target.value)}
                  placeholder={`Option ${String.fromCharCode(65 + idx)}`}
                  style={{ flex: 1, padding: 10, background: 'rgba(255,255,255,0.05)', border: `1px solid ${validationErrors.options ? '#ef4444' : 'rgba(99,102,241,0.2)'}`, borderRadius: 8, color: '#f8fafc' }} />
                {options.length > 3 && (
                  <button onClick={() => removeOption(idx)} style={{ padding: '0 12px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 6, color: '#ef4444', cursor: 'pointer' }}>
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            ))}
            {options.length < 5 && (
              <button onClick={addOption} style={{ marginTop: 8, padding: '6px 12px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 6, color: '#10b981', cursor: 'pointer', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                <PlusCircle size={14} /> Ajouter une option ({options.length}/5)
              </button>
            )}
            {validationErrors.options && <p style={{ color: '#ef4444', fontSize: '0.7rem', marginTop: 8 }}><AlertCircle size={12} /> Entre 3 et 5 options sont requises</p>}
          </div>

          {/* Points et temps */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div>
              <label style={{ color: '#94a3b8', fontSize: '0.7rem' }}>Points (1-10)</label>
              <input type="number" min="1" max="10" value={points} onChange={(e) => setPoints(parseInt(e.target.value))}
                style={{ width: '100%', padding: 10, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 8, color: '#f8fafc' }} />
            </div>
            <div>
              <label style={{ color: '#94a3b8', fontSize: '0.7rem' }}>Temps (minutes)</label>
              <input type="number" min="0.5" max="30" step="0.5" value={tempsMin} onChange={(e) => setTempsMin(parseFloat(e.target.value))}
                style={{ width: '100%', padding: 10, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 8, color: '#f8fafc' }} />
            </div>
          </div>

          {/* Chapitre */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ color: '#94a3b8', fontSize: '0.7rem' }}>Chapitre (optionnel)</label>
            <input type="text" value={libChapitre} onChange={(e) => setLibChapitre(e.target.value)}
              style={{ width: '100%', padding: 10, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 8, color: '#f8fafc' }} />
          </div>

          {/* Réponse correcte */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ color: '#94a3b8', fontSize: '0.7rem', marginBottom: 4, display: 'block' }}>Bonne réponse *</label>
            {typeQuestion === 1 ? (
              <select value={correctAnswer} onChange={(e) => handleCorrectAnswerChange(e.target.value)}
                style={{ width: '100%', padding: 10, background: 'rgba(255,255,255,0.05)', border: `1px solid ${validationErrors.correctAnswer ? '#ef4444' : 'rgba(99,102,241,0.2)'}`, borderRadius: 8, color: '#f8fafc' }}>
                <option value="">Sélectionner...</option>
                {options.filter(opt => opt.trim()).map((opt, idx) => <option key={idx} value={opt}>{String.fromCharCode(65 + idx)} - {opt}</option>)}
              </select>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {options.filter(opt => opt.trim()).map((opt, idx) => (
                  <label key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input type="checkbox" checked={correctAnswers.includes(opt)} onChange={() => handleCorrectAnswerChange(opt)} />
                    <span style={{ color: '#f8fafc' }}>{String.fromCharCode(65 + idx)} - {opt}</span>
                  </label>
                ))}
              </div>
            )}
            {validationErrors.correctAnswer && <p style={{ color: '#ef4444', fontSize: '0.7rem' }}><AlertCircle size={12} /> Sélectionnez au moins une réponse correcte</p>}
          </div>

          {/* Explication */}
          <textarea value={explanation} onChange={(e) => setExplanation(e.target.value)} rows={2}
            placeholder="Explication (optionnel)"
            style={{ width: '100%', padding: 12, marginBottom: 16, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 10, color: '#f8fafc' }} />

          {/* Boutons */}
          <div style={{ display: 'flex', gap: 12 }}>
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleSave} disabled={isLoading}
              style={{ flex: 1, padding: 14, background: isLoading ? 'rgba(16,185,129,0.3)' : 'linear-gradient(135deg, #10b981, #059669)', border: 'none', borderRadius: 12, color: 'white', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: isLoading ? 'not-allowed' : 'pointer' }}>
              {isLoading ? <><Loader size={16} className="animate-spin" /> Enregistrement...</> : <><Save size={16} /> Envoyer en validation</>}
            </motion.button>
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => navigate('/evaluate')}
              style={{ padding: '12px 24px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 10, color: '#94a3b8', cursor: 'pointer' }}>
              Annuler
            </motion.button>
          </div>

          <div style={{ marginTop: 16, padding: 12, background: 'rgba(245,158,11,0.05)', borderRadius: 8 }}>
            <p style={{ fontSize: '0.75rem', color: '#f59e0b', display: 'flex', alignItems: 'center', gap: 8 }}>
              <AlertCircle size={14} />
              ⚠️ Cette question sera soumise à validation pédagogique avant d'être disponible dans la base de données.
            </p>
          </div>
        </div>
      </main>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } } .animate-spin { animation: spin 1s linear infinite; }`}</style>
    </div>
  );
};

export default CreateQuestion;