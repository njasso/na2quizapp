// src/pages/admin/ImportQuestions.jsx - Version avec validation des chapitres et compatibilité backend
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Upload, FileText, Download, X, CheckCircle, AlertCircle,
  Loader, Database, Trash2, FileSpreadsheet, FileJson, Eye,
  ArrowLeft, Home, Tag, Layers, BookOpen, Clock, Bookmark
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { saveQuestions } from '../../services/api';
import toast from 'react-hot-toast';
import DOMAIN_DATA from '../../data/domainConfig';

const ImportQuestions = () => {
  const navigate = useNavigate();
  const { user, hasRole } = useAuth();
  const [file, setFile] = useState(null);
  const [previewData, setPreviewData] = useState([]);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [invalidQuestions, setInvalidQuestions] = useState([]);

  // Vérifier les droits
  if (!hasRole('ADMIN_DELEGUE') && !hasRole('ADMIN_SYSTEME')) {
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
          <p>Accès non autorisé. Rôle ADMIN_DELEGUE requis.</p>
        </div>
      </div>
    );
  }

  // ==================== FONCTIONS DE RECHERCHE DES IDs ====================
  
  const findDomainId = (domaineNom) => {
    if (!domaineNom) return '';
    const domain = Object.values(DOMAIN_DATA).find(d => 
      d.nom?.toLowerCase() === domaineNom.toLowerCase() ||
      d.code?.toLowerCase() === domaineNom.toLowerCase()
    );
    return domain ? String(domain.id) : '';
  };

  const findSousDomaineId = (domainId, sousDomaineNom) => {
    if (!domainId || !sousDomaineNom) return '';
    const domain = DOMAIN_DATA[domainId];
    if (!domain) return '';
    const sousDomaine = Object.values(domain.sousDomaines).find(sd => 
      sd.nom?.toLowerCase() === sousDomaineNom.toLowerCase() ||
      sd.code?.toLowerCase() === sousDomaineNom.toLowerCase()
    );
    return sousDomaine ? String(sousDomaine.id) : '';
  };

  const findLevelId = (domainId, sousDomaineId, levelNom) => {
    if (!domainId || !sousDomaineId || !levelNom) return '';
    const domain = DOMAIN_DATA[domainId];
    if (!domain) return '';
    const sousDomaine = domain.sousDomaines[sousDomaineId];
    if (!sousDomaine || !sousDomaine.levels) return '';
    const level = sousDomaine.levels.find(l => 
      l.nom?.toLowerCase() === levelNom.toLowerCase()
    );
    return level ? String(level.id) : '';
  };

  const findMatiereId = (domainId, sousDomaineId, matiereNom) => {
    if (!domainId || !sousDomaineId || !matiereNom) return '';
    const domain = DOMAIN_DATA[domainId];
    if (!domain) return '';
    const sousDomaine = domain.sousDomaines[sousDomaineId];
    if (!sousDomaine || !sousDomaine.matieres) return '';
    const matiere = sousDomaine.matieres.find(m => 
      m.nom?.toLowerCase() === matiereNom.toLowerCase() ||
      m.code?.toLowerCase() === matiereNom.toLowerCase()
    );
    return matiere ? String(matiere.id) : '';
  };

  const getMatiereCode = (domainId, sousDomaineId, matiereId) => {
    if (!domainId || !sousDomaineId || !matiereId) return '';
    const domain = DOMAIN_DATA[domainId];
    if (!domain) return '';
    const sousDomaine = domain.sousDomaines[sousDomaineId];
    if (!sousDomaine || !sousDomaine.matieres) return '';
    const matiere = sousDomaine.matieres.find(m => String(m.id) === matiereId);
    return matiere?.code || '';
  };

  // Modèle de question (nouvelle structure avec chapitre)
  const questionTemplate = {
    // Référentiel
    domaine: "Éducatif",
    sousDomaine: "Secondaire Général",
    niveau: "3e",
    matiere: "Géographie",
    libChapitre: "Chapitre 1: Introduction",
    // Contenu
    libQuestion: "Question exemple ?",
    options: ["Option A", "Option B", "Option C", "Option D"],
    correctAnswer: "Option A",
    bonOpRep: 0,
    // Métadonnées
    typeQuestion: 1,
    points: 1,
    explanation: "Explication de la réponse",
    tempsMin: 1,
    tempsMinParQuestion: 60,
    difficulty: "moyen",
    tags: [],
    // Auteur
    matriculeAuteur: "",
  };

  // Télécharger le template CSV (avec chapitre)
  const downloadTemplate = () => {
    const template = [
      [
        "domaine", "sousDomaine", "niveau", "matiere", "libChapitre",
        "libQuestion", "options", "correctAnswer", "typeQuestion", 
        "points", "tempsMin", "explanation", "difficulty", "tags"
      ],
      [
        "Éducatif", "Secondaire Général", "3e", "Géographie", "Chapitre 1: Le Cameroun",
        "Quelle est la capitale du Cameroun ?", 
        "Douala|Yaoundé|Garoua|Bafoussam", 
        "Yaoundé", "1", "1", "1", 
        "Yaoundé est la capitale politique du Cameroun", "facile", "géographie,capitale"
      ],
      [
        "Éducatif", "Secondaire Général", "4e", "Mathématiques", "Chapitre 2: Nombres",
        "Quelle est la valeur de π ?", 
        "3.12|3.14|3.16|3.18", 
        "3.14", "1", "1", "1", 
        "π ≈ 3.14159", "facile", "maths,constante"
      ],
      [
        "Professionnel", "Management", "Licence 3", "Gestion de Projet", "Chapitre 3: Méthodes Agiles",
        "Qu'est-ce que la méthode agile ?", 
        "Méthode séquentielle|Méthode itérative|Méthode linéaire|Méthode statique", 
        "Méthode itérative", "1", "2", "2", 
        "L'agilité favorise l'itération et l'adaptation", "moyen", "agile,management"
      ]
    ];
    
    const csvContent = template.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.setAttribute('download', 'questions_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('Template CSV téléchargé');
  };

  // Télécharger le template JSON (avec chapitre)
  const downloadJsonTemplate = () => {
    const template = [
      {
        domaine: "Éducatif",
        sousDomaine: "Secondaire Général",
        niveau: "3e",
        matiere: "Géographie",
        libChapitre: "Chapitre 1: Le Cameroun",
        libQuestion: "Quelle est la capitale du Cameroun ?",
        options: ["Douala", "Yaoundé", "Garoua", "Bafoussam"],
        correctAnswer: "Yaoundé",
        typeQuestion: 1,
        points: 1,
        tempsMin: 1,
        tempsMinParQuestion: 60,
        explanation: "Yaoundé est la capitale politique du Cameroun",
        difficulty: "facile",
        tags: ["géographie", "capitale"]
      },
      {
        domaine: "Éducatif",
        sousDomaine: "Secondaire Général",
        niveau: "4e",
        matiere: "Mathématiques",
        libChapitre: "Chapitre 2: Nombres",
        libQuestion: "Quelle est la valeur de π ?",
        options: ["3.12", "3.14", "3.16", "3.18"],
        correctAnswer: "3.14",
        typeQuestion: 1,
        points: 1,
        tempsMin: 1,
        tempsMinParQuestion: 60,
        explanation: "π ≈ 3.14159",
        difficulty: "facile",
        tags: ["maths", "constante"]
      }
    ];
    
    const blob = new Blob([JSON.stringify(template, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.setAttribute('download', 'questions_template.json');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('Template JSON téléchargé');
  };

  // ✅ Fonction de validation des données d'une question
  const validateQuestionData = (q, index) => {
    const errors = [];
    
    if (!q.libQuestion || q.libQuestion.trim().length < 5) {
      errors.push('Libellé de question trop court (min 5 caractères)');
    }
    if (!q.options || q.options.length < 2) {
      errors.push('Au moins 2 options requises');
    }
    if (!q.correctAnswer) {
      errors.push('Réponse correcte manquante');
    } else if (q.options && !q.options.includes(q.correctAnswer)) {
      errors.push('La réponse correcte n\'existe pas dans les options');
    }
    if (!q.matiere || q.matiere.trim().length < 2) {
      errors.push('Matière requise (min 2 caractères)');
    }
    if (!q.niveau || q.niveau.trim().length < 1) {
      errors.push('Niveau requis');
    }
    if (!q.domaine || q.domaine.trim().length < 2) {
      errors.push('Domaine requis');
    }
    if (q.points && (q.points < 0.5 || q.points > 10)) {
      errors.push('Les points doivent être entre 0.5 et 10');
    }
    if (q.tempsMin && (q.tempsMin < 0.5 || q.tempsMin > 10)) {
      errors.push('Le temps doit être entre 0.5 et 10 minutes');
    }
    const validDifficulties = ['facile', 'moyen', 'difficile', 'très difficile'];
    if (q.difficulty && !validDifficulties.includes(q.difficulty.toLowerCase())) {
      errors.push(`Difficulté invalide. Utilisez: ${validDifficulties.join(', ')}`);
    }
    
    return errors;
  };

  // ✅ Normaliser une question au format attendu par le backend (avec IDs)
  const normalizeQuestion = (q) => {
    // Calculer bonOpRep si correctAnswer est fourni
    let bonOpRep = q.bonOpRep;
    if (bonOpRep === undefined && q.correctAnswer && q.options) {
      bonOpRep = q.options.findIndex(opt => opt === q.correctAnswer);
    }
    
    // Convertir typeQuestion
    let typeQuestion = q.typeQuestion;
    if (typeQuestion === undefined) {
      if (q.type === 'multiple') typeQuestion = 2;
      else if (q.type === 'single') typeQuestion = 1;
      else typeQuestion = 1;
    }
    
    // Temps en minutes
    let tempsMin = q.tempsMin;
    if (tempsMin === undefined && q.tempsMinParQuestion) {
      tempsMin = Math.ceil(q.tempsMinParQuestion / 60);
    } else if (tempsMin === undefined) {
      tempsMin = 1;
    }
    
    // Temps en secondes
    let tempsMinParQuestion = q.tempsMinParQuestion;
    if (tempsMinParQuestion === undefined && q.tempsMin) {
      tempsMinParQuestion = q.tempsMin * 60;
    } else if (tempsMinParQuestion === undefined) {
      tempsMinParQuestion = 60;
    }
    
    // ✅ Récupérer les IDs depuis DOMAIN_DATA
    const domaineId = findDomainId(q.domaine);
    const sousDomaineId = findSousDomaineId(domaineId, q.sousDomaine);
    const niveauId = findLevelId(domaineId, sousDomaineId, q.niveau);
    const matiereId = findMatiereId(domaineId, sousDomaineId, q.matiere);
    
    // Récupérer les codes
    const domaineCode = DOMAIN_DATA[domaineId]?.code || '';
    const sousDomaineCode = DOMAIN_DATA[domaineId]?.sousDomaines[sousDomaineId]?.code || '';
    const matiereCode = getMatiereCode(domaineId, sousDomaineId, matiereId);
    
    return {
      // ✅ Référentiel avec IDs (compatible avec le backend)
      domaineId: domaineId,
      domaine: q.domaine || q.domain || '',
      domaineCode: domaineCode,
      sousDomaineId: sousDomaineId,
      sousDomaine: q.sousDomaine || q.subDomain || q.category || '',
      sousDomaineCode: sousDomaineCode,
      niveauId: niveauId,
      niveau: q.niveau || q.level || '',
      matiereId: matiereId,
      matiere: q.matiere || q.subject || '',
      matiereCode: matiereCode,
      libChapitre: q.libChapitre || q.chapitre || q.chapter || '',
      
      // Contenu
      libQuestion: q.libQuestion || q.question || q.text || '',
      options: Array.isArray(q.options) ? q.options : (q.options ? q.options.split('|') : []),
      correctAnswer: q.correctAnswer || q.answer || '',
      bonOpRep: bonOpRep >= 0 ? bonOpRep : 0,
      
      // Métadonnées
      typeQuestion: typeQuestion,
      type: typeQuestion === 2 ? 'multiple' : 'single',
      points: parseFloat(q.points) || 1,
      explanation: q.explanation || '',
      tempsMin: parseFloat(tempsMin) || 1,
      tempsMinParQuestion: parseInt(tempsMinParQuestion) || 60,
      difficulty: q.difficulty || 'moyen',
      tags: Array.isArray(q.tags) ? q.tags : (q.tags ? q.tags.split(',').map(t => t.trim()) : []),
      
      // Auteur
      matriculeAuteur: user?.matricule || user?.email || '',
      createdBy: user?._id,
      status: 'pending'
    };
  };

  // Lire le fichier CSV
  const parseCSV = (text) => {
    if (text.charCodeAt(0) === 0xFEFF) {
      text = text.substring(1);
    }
    
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length === 0) return [];
    
    const headers = lines[0].split(',').map(h => h.replace(/^["']|["']$/g, '').trim());
    
    const data = [];
    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      
      const values = [];
      let inQuote = false;
      let currentValue = '';
      
      for (let j = 0; j < lines[i].length; j++) {
        const char = lines[i][j];
        if (char === '"') {
          inQuote = !inQuote;
        } else if (char === ',' && !inQuote) {
          values.push(currentValue.trim());
          currentValue = '';
        } else {
          currentValue += char;
        }
      }
      values.push(currentValue.trim());
      
      if (values.length === headers.length && values[0]) {
        const obj = {};
        headers.forEach((header, idx) => {
          let value = values[idx].replace(/^["']|["']$/g, '');
          if (header === 'options') {
            obj[header] = value.split('|').map(v => v.trim());
          } else if (header === 'tags') {
            obj[header] = value ? value.split(',').map(v => v.trim()) : [];
          } else if (header === 'points' || header === 'typeQuestion' || header === 'tempsMin') {
            obj[header] = parseFloat(value) || 1;
          } else {
            obj[header] = value;
          }
        });
        
        if (obj.question && !obj.libQuestion) obj.libQuestion = obj.question;
        if (obj.chapitre && !obj.libChapitre) obj.libChapitre = obj.chapitre;
        
        data.push(obj);
      }
    }
    return data;
  };

  // Lire le fichier JSON
  const parseJSON = (text) => {
    try {
      const data = JSON.parse(text);
      return Array.isArray(data) ? data : [data];
    } catch (e) {
      throw new Error('Format JSON invalide');
    }
  };

  // Gérer l'upload de fichier
  const handleFileUpload = (file) => {
    setError(null);
    setInvalidQuestions([]);
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const content = e.target.result;
        let rawData = [];
        
        if (file.name.endsWith('.csv')) {
          rawData = parseCSV(content);
        } else if (file.name.endsWith('.json')) {
          rawData = parseJSON(content);
        } else {
          throw new Error('Format non supporté. Utilisez CSV ou JSON');
        }
        
        // Normaliser chaque question
        const normalizedData = rawData.map(q => normalizeQuestion(q));
        
        // Valider les données
        const validationErrors = [];
        const validData = [];
        
        normalizedData.forEach((q, idx) => {
          const errors = validateQuestionData(q, idx);
          if (errors.length > 0) {
            validationErrors.push({
              index: idx,
              question: q.libQuestion?.substring(0, 50) || 'Question sans libellé',
              errors
            });
          } else {
            // Vérifier les IDs
            if (!q.domaineId) {
              validationErrors.push({
                index: idx,
                question: q.libQuestion?.substring(0, 50) || 'Question sans libellé',
                errors: [`Domaine "${q.domaine}" non trouvé dans le référentiel`]
              });
            } else if (!q.sousDomaineId) {
              validationErrors.push({
                index: idx,
                question: q.libQuestion?.substring(0, 50) || 'Question sans libellé',
                errors: [`Sous-domaine "${q.sousDomaine}" non trouvé dans le référentiel`]
              });
            } else if (!q.niveauId) {
              validationErrors.push({
                index: idx,
                question: q.libQuestion?.substring(0, 50) || 'Question sans libellé',
                errors: [`Niveau "${q.niveau}" non trouvé dans le référentiel`]
              });
            } else if (!q.matiereId) {
              validationErrors.push({
                index: idx,
                question: q.libQuestion?.substring(0, 50) || 'Question sans libellé',
                errors: [`Matière "${q.matiere}" non trouvée dans le référentiel`]
              });
            } else {
              validData.push(q);
            }
          }
        });
        
        if (validationErrors.length > 0) {
  setInvalidQuestions(validationErrors);
  console.warn('Questions invalides:', validationErrors);
  // ✅ Remplacer toast.warning par toast (avec icône)
  toast(`${validationErrors.length} question(s) ignorée(s)`, { 
    duration: 5000,
    icon: '⚠️'
  });
}
        
        if (validData.length === 0) {
          throw new Error('Aucune question valide trouvée. Vérifiez le format et les champs obligatoires.');
        }
        
        setPreviewData(validData);
        toast.success(`${validData.length} questions chargées pour import${validationErrors.length > 0 ? ` (${validationErrors.length} ignorées)` : ''}`);
      } catch (err) {
        setError(err.message);
        toast.error(err.message);
      }
    };
    
    reader.readAsText(file, 'UTF-8');
  };

  // Importer les questions
  const handleImport = async () => {
    if (previewData.length === 0) {
      toast.error('Aucune question à importer');
      return;
    }
    
    setImporting(true);
    try {
      const questionsWithAuthor = previewData.map(q => ({
        ...q,
        matriculeAuteur: user?.matricule || user?.email || '',
        createdBy: user?._id,
        dateCreation: new Date().toISOString()
      }));
      
      const result = await saveQuestions({ questions: questionsWithAuthor });
      
      if (result.success) {
        toast.success(`${previewData.length} questions importées avec succès (en attente de validation)`);
        setPreviewData([]);
        setFile(null);
        setInvalidQuestions([]);
      } else {
        throw new Error(result.error || 'Erreur lors de l\'import');
      }
    } catch (err) {
      console.error('Erreur import:', err);
      toast.error(err.message || 'Erreur lors de l\'import');
    } finally {
      setImporting(false);
    }
  };

  // Supprimer une question de la prévisualisation
  const removePreviewQuestion = (index) => {
    setPreviewData(prev => prev.filter((_, i) => i !== index));
    toast.success('Question supprimée de la liste');
  };

  // Vider la prévisualisation
  const clearPreview = () => {
  setPreviewData([]);
  setFile(null);
  setInvalidQuestions([]);
  toast.success('Liste vidée');  // ✅ Option 1
  // OU
  toast('Liste vidée', { icon: '🗑️' });  // ✅ Option 2
};

  // Obtenir l'affichage des options limité
  const getOptionsPreview = (options) => {
    if (!options) return '';
    const preview = options.slice(0, 3).map(opt => opt.length > 15 ? opt.substring(0, 12) + '...' : opt);
    if (options.length > 3) preview.push(`+${options.length - 3}`);
    return preview.join(' | ');
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #05071a 0%, #0a0f2e 60%, #05071a 100%)',
      padding: '24px'
    }}>
      <div style={{
        position: 'fixed', inset: 0,
        backgroundImage: 'linear-gradient(rgba(16,185,129,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(16,185,129,0.03) 1px, transparent 1px)',
        backgroundSize: '40px 40px', pointerEvents: 'none', zIndex: 0,
      }} />

      <div style={{ maxWidth: 1200, margin: '0 auto', position: 'relative', zIndex: 1 }}>
        {/* En-tête avec bouton retour */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate('/admin/qcm-validation')}
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(16,185,129,0.2)',
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
              <span style={{ fontSize: '0.8rem' }}>Retour</span>
            </motion.button>
            <div>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '4px 12px', background: 'rgba(16,185,129,0.1)',
                border: '1px solid rgba(16,185,129,0.3)', borderRadius: 20,
                marginBottom: 8
              }}>
                <Database size={14} color="#10b981" />
                <span style={{ color: '#10b981', fontSize: '0.7rem', fontWeight: 600 }}>
                  IMPORT EN MASSE
                </span>
              </div>
              <h1 style={{ fontSize: '2rem', fontWeight: 700, color: '#f8fafc', marginBottom: 8 }}>
                Importer des questions
              </h1>
              <p style={{ color: '#64748b' }}>
                Importez un lot de questions depuis un fichier CSV ou JSON
              </p>
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          {/* Panneau d'import */}
          <div style={{
            background: 'rgba(15,23,42,0.7)', backdropFilter: 'blur(12px)',
            border: '1px solid rgba(16,185,129,0.2)', borderRadius: 20,
            padding: 24
          }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 600, color: '#f8fafc', marginBottom: 20 }}>
              <Upload size={18} style={{ display: 'inline', marginRight: 8 }} />
              Importer un fichier
            </h2>

            {/* Zone de dépôt */}
            <div
              onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
              onDragLeave={() => setDragActive(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragActive(false);
                const file = e.dataTransfer.files[0];
                if (file && (file.name.endsWith('.csv') || file.name.endsWith('.json'))) {
                  setFile(file);
                  handleFileUpload(file);
                } else {
                  toast.error('Format non supporté. Utilisez CSV ou JSON');
                }
              }}
              style={{
                border: `2px dashed ${dragActive ? '#10b981' : 'rgba(16,185,129,0.3)'}`,
                borderRadius: 12, padding: '40px 20px', textAlign: 'center',
                background: dragActive ? 'rgba(16,185,129,0.05)' : 'rgba(255,255,255,0.02)',
                cursor: 'pointer', transition: 'all 0.2s', marginBottom: 24
              }}
              onClick={() => document.getElementById('fileInput').click()}
            >
              <Upload size={40} color={dragActive ? '#10b981' : '#64748b'} style={{ marginBottom: 12 }} />
              <p style={{ color: '#f8fafc', fontSize: '0.9rem', marginBottom: 4 }}>
                {file ? file.name : 'Glissez un fichier ici ou cliquez pour sélectionner'}
              </p>
              <p style={{ color: '#64748b', fontSize: '0.7rem' }}>
                Formats supportés: CSV, JSON
              </p>
              <input
                id="fileInput"
                type="file"
                accept=".csv,.json"
                style={{ display: 'none' }}
                onChange={(e) => {
                  const file = e.target.files[0];
                  if (file) {
                    setFile(file);
                    handleFileUpload(file);
                  }
                }}
              />
            </div>

            {error && (
              <div style={{
                background: 'rgba(239,68,68,0.1)', border: '1px solid #ef4444',
                borderRadius: 8, padding: 12, marginBottom: 24,
                color: '#ef4444', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 8
              }}>
                <AlertCircle size={16} />
                {error}
              </div>
            )}

            {/* Afficher les erreurs de validation */}
            {invalidQuestions.length > 0 && (
              <div style={{
                background: 'rgba(245,158,11,0.1)', border: '1px solid #f59e0b',
                borderRadius: 8, padding: 12, marginBottom: 24
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <AlertCircle size={16} color="#f59e0b" />
                  <span style={{ color: '#f59e0b', fontWeight: 600, fontSize: '0.8rem' }}>
                    {invalidQuestions.length} question(s) ignorée(s)
                  </span>
                </div>
                <div style={{ maxHeight: 150, overflowY: 'auto' }}>
                  {invalidQuestions.slice(0, 5).map((inv, idx) => (
                    <div key={idx} style={{ fontSize: '0.7rem', color: '#f59e0b', marginTop: 4 }}>
                      • "{inv.question}": {inv.errors.join(', ')}
                    </div>
                  ))}
                  {invalidQuestions.length > 5 && (
                    <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: 4 }}>
                      ... et {invalidQuestions.length - 5} autre(s)
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Templates */}
            <div style={{ marginBottom: 24 }}>
              <p style={{ color: '#94a3b8', fontSize: '0.75rem', marginBottom: 12, fontWeight: 600 }}>
                Télécharger un modèle
              </p>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <button
                  onClick={downloadTemplate}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '8px 16px', background: 'rgba(59,130,246,0.1)',
                    border: '1px solid rgba(59,130,246,0.3)', borderRadius: 8,
                    color: '#60a5fa', cursor: 'pointer'
                  }}
                >
                  <FileSpreadsheet size={14} /> CSV Template
                </button>
                <button
                  onClick={downloadJsonTemplate}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '8px 16px', background: 'rgba(139,92,246,0.1)',
                    border: '1px solid rgba(139,92,246,0.3)', borderRadius: 8,
                    color: '#a78bfa', cursor: 'pointer'
                  }}
                >
                  <FileJson size={14} /> JSON Template
                </button>
              </div>
            </div>

            {/* Bouton d'import */}
            {previewData.length > 0 && (
              <div style={{ display: 'flex', gap: 12 }}>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleImport}
                  disabled={importing}
                  style={{
                    flex: 1, padding: '12px',
                    background: importing ? 'rgba(16,185,129,0.3)' : 'linear-gradient(135deg, #10b981, #059669)',
                    border: 'none', borderRadius: 10, color: 'white',
                    fontWeight: 600, cursor: importing ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
                  }}
                >
                  {importing ? <Loader size={16} className="animate-spin" /> : <Database size={16} />}
                  {importing ? 'Import en cours...' : `Importer ${previewData.length} question(s)`}
                </motion.button>
                
                <button
                  onClick={clearPreview}
                  style={{
                    padding: '12px', background: 'rgba(239,68,68,0.1)',
                    border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10,
                    color: '#ef4444', cursor: 'pointer'
                  }}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            )}
          </div>

          {/* Prévisualisation */}
          <div style={{
            background: 'rgba(15,23,42,0.7)', backdropFilter: 'blur(12px)',
            border: '1px solid rgba(16,185,129,0.2)', borderRadius: 20,
            padding: 24, overflow: 'hidden'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 600, color: '#f8fafc' }}>
                <FileText size={18} style={{ display: 'inline', marginRight: 8 }} />
                Prévisualisation ({previewData.length})
              </h2>
              {previewData.length > 0 && (
                <span style={{
                  background: '#10b981', padding: '2px 8px', borderRadius: 20,
                  fontSize: '0.7rem', color: '#fff'
                }}>
                  Prêt pour import
                </span>
              )}
            </div>

            {previewData.length === 0 ? (
              <div style={{
                textAlign: 'center', padding: '60px 20px',
                color: '#64748b', border: '1px dashed rgba(16,185,129,0.2)',
                borderRadius: 12
              }}>
                <FileText size={32} style={{ marginBottom: 12, opacity: 0.5 }} />
                <p>Aucune question chargée</p>
                <p style={{ fontSize: '0.7rem', marginTop: 8 }}>
                  Importez un fichier CSV ou JSON pour prévisualiser les questions
                </p>
              </div>
            ) : (
              <div style={{ maxHeight: 500, overflowY: 'auto', paddingRight: 8 }}>
                {previewData.map((q, idx) => (
                  <div
                    key={idx}
                    style={{
                      background: 'rgba(255,255,255,0.02)', borderRadius: 10,
                      padding: 12, marginBottom: 12, position: 'relative'
                    }}
                  >
                    <button
                      onClick={() => removePreviewQuestion(idx)}
                      style={{
                        position: 'absolute', top: 8, right: 8,
                        background: 'rgba(239,68,68,0.1)', border: 'none',
                        borderRadius: 4, color: '#ef4444', cursor: 'pointer',
                        padding: 4, display: 'flex', alignItems: 'center', gap: 4
                      }}
                    >
                      <X size={12} />
                    </button>
                    
                    {/* Tags */}
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                      <span style={{
                        background: 'rgba(16,185,129,0.2)', color: '#10b981',
                        padding: '2px 8px', borderRadius: 4, fontSize: '0.65rem',
                        display: 'flex', alignItems: 'center', gap: 4
                      }}>
                        <BookOpen size={10} />
                        {q.matiere}
                      </span>
                      <span style={{
                        background: 'rgba(59,130,246,0.2)', color: '#60a5fa',
                        padding: '2px 8px', borderRadius: 4, fontSize: '0.65rem',
                        display: 'flex', alignItems: 'center', gap: 4
                      }}>
                        <Layers size={10} />
                        {q.niveau}
                      </span>
                      <span style={{
                        background: 'rgba(139,92,246,0.2)', color: '#a78bfa',
                        padding: '2px 8px', borderRadius: 4, fontSize: '0.65rem',
                        display: 'flex', alignItems: 'center', gap: 4
                      }}>
                        <Tag size={10} />
                        {q.domaine}
                      </span>
                      {q.sousDomaine && (
                        <span style={{
                          background: 'rgba(245,158,11,0.2)', color: '#f59e0b',
                          padding: '2px 8px', borderRadius: 4, fontSize: '0.65rem'
                        }}>
                          {q.sousDomaine}
                        </span>
                      )}
                      {q.libChapitre && (
                        <span style={{
                          background: 'rgba(16,185,129,0.15)', color: '#10b981',
                          padding: '2px 8px', borderRadius: 4, fontSize: '0.65rem',
                          display: 'flex', alignItems: 'center', gap: 4
                        }}>
                          <Bookmark size={10} />
                          {q.libChapitre.length > 30 ? q.libChapitre.substring(0, 27) + '...' : q.libChapitre}
                        </span>
                      )}
                      <span style={{
                        background: 'rgba(16,185,129,0.2)', color: '#10b981',
                        padding: '2px 8px', borderRadius: 4, fontSize: '0.65rem',
                        display: 'flex', alignItems: 'center', gap: 4
                      }}>
                        <Clock size={10} />
                        {q.tempsMin} min
                      </span>
                      <span style={{
                        background: q.typeQuestion === 2 ? 'rgba(245,158,11,0.2)' : 'rgba(59,130,246,0.2)',
                        color: q.typeQuestion === 2 ? '#f59e0b' : '#60a5fa',
                        padding: '2px 8px', borderRadius: 4, fontSize: '0.65rem'
                      }}>
                        {q.typeQuestion === 2 ? 'Multiple' : 'Unique'}
                      </span>
                      {q.tags && q.tags.length > 0 && (
                        <span style={{
                          background: 'rgba(139,92,246,0.2)', color: '#a78bfa',
                          padding: '2px 8px', borderRadius: 4, fontSize: '0.65rem'
                        }}>
                          #{q.tags.slice(0, 2).join(', #')}{q.tags.length > 2 ? ` +${q.tags.length - 2}` : ''}
                        </span>
                      )}
                    </div>
                    
                    {/* Question */}
                    <p style={{ color: '#f8fafc', fontSize: '0.85rem', marginBottom: 8, fontWeight: 500 }}>
                      {idx + 1}. {q.libQuestion}
                    </p>
                    
                    {/* Options (aperçu) */}
                    {q.options && q.options.length > 0 && (
                      <div style={{ fontSize: '0.7rem', color: '#64748b', marginBottom: 6 }}>
                        <span style={{ color: '#94a3b8' }}>Options: </span>
                        {getOptionsPreview(q.options)}
                      </div>
                    )}
                    
                    {/* Réponse correcte */}
                    <div style={{ fontSize: '0.7rem', color: '#10b981' }}>
                      ✓ Réponse: {q.correctAnswer}
                    </div>
                    
                    {/* Points */}
                    <div style={{ fontSize: '0.65rem', color: '#f59e0b', marginTop: 6 }}>
                      {q.points} point{q.points > 1 ? 's' : ''} • {q.difficulty}
                    </div>
                    
                    {/* IDs (débogage) - affiché seulement en développement */}
                    {process.env.NODE_ENV === 'development' && (
                      <div style={{ fontSize: '0.6rem', color: '#475569', marginTop: 4, fontFamily: 'monospace' }}>
                        IDs: {q.domaineId}/{q.sousDomaineId}/{q.niveauId}/{q.matiereId}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <div style={{ marginTop: 32, display: 'flex', gap: 16, justifyContent: 'center' }}>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate('/admin/qcm-validation')}
            style={{
              padding: '12px 28px',
              background: 'linear-gradient(135deg, #10b981, #059669)',
              border: 'none',
              borderRadius: 12,
              color: 'white',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              boxShadow: '0 4px 14px rgba(16,185,129,0.3)'
            }}
          >
            <Eye size={18} />
            Aller à la validation
          </motion.button>
          
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate('/evaluate')}
            style={{
              padding: '12px 28px',
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: 12,
              color: '#94a3b8',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}
          >
            <Home size={18} />
            Tableau de bord
          </motion.button>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .animate-spin { animation: spin 1s linear infinite; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: rgba(15,23,42,0.3); border-radius: 10px; }
        ::-webkit-scrollbar-thumb { background: rgba(16,185,129,0.3); border-radius: 10px; }
      `}</style>
    </div>
  );
};

export default ImportQuestions;