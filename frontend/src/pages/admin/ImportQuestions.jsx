// src/pages/admin/ImportQuestions.jsx - Version ULTIME avec corrections complètes
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Upload, FileText, Download, X, AlertCircle,
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

  // ==================== FONCTIONS DE RECHERCHE DES IDs (CORRIGÉES) ====================
  
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
    
    const normalizedNom = sousDomaineNom.toLowerCase().trim();
    
    // Chercher par nom ou code exact
    const sousDomaine = Object.values(domain.sousDomaines).find(sd => 
      sd.nom?.toLowerCase() === normalizedNom ||
      sd.code?.toLowerCase() === normalizedNom
    );
    if (sousDomaine) return String(sousDomaine.id);
    
    // Correspondances pour les noms courts
    const mappings = {
      'primaire': '11',
      'primaire (francophone)': '11',
      'secondaire': '12',
      'secondaire général': '12',
      'secondaire general': '12',
      'secondaire technique': '13',
      'technique': '13',
      'primary': '1A',
      'gce ordinary': '1B',
      'gce advanced': '1C',
      'supérieur': '1D',
      'superieur': '1D',
      'enseignement supérieur': '1D',
      'universitaire': '1D'
    };
    
    for (const [key, id] of Object.entries(mappings)) {
      if (normalizedNom.includes(key)) return id;
    }
    
    return '';
  };

  const findLevelId = (domainId, sousDomaineId, levelNom) => {
    if (!domainId || !levelNom) return '';
    const domain = DOMAIN_DATA[domainId];
    if (!domain) return '';
    
    const normalizedLevelNom = levelNom.toLowerCase().trim();
    
    // Si sousDomaineId est fourni, chercher d'abord dans ce sous-domaine
    if (sousDomaineId) {
      const sousDomaine = domain.sousDomaines[sousDomaineId];
      if (sousDomaine && sousDomaine.levels) {
        const level = sousDomaine.levels.find(l => 
          l.nom?.toLowerCase() === normalizedLevelNom
        );
        if (level) return String(level.id);
      }
    }
    
    // Chercher dans TOUS les sous-domaines
    for (const sdId in domain.sousDomaines) {
      const sousDomaine = domain.sousDomaines[sdId];
      if (sousDomaine && sousDomaine.levels) {
        const level = sousDomaine.levels.find(l => 
          l.nom?.toLowerCase() === normalizedLevelNom
        );
        if (level) return String(level.id);
      }
    }
    
    // Correspondances spéciales (mapping direct)
    const specialMappings = {
      'cm2': '116', 'cm1': '115', 'ce2': '114', 'ce1': '113', 'cp': '112', 'sil': '111',
      '6e': '121', '6ème': '121', 'sixieme': '121',
      '5e': '122', '5ème': '122', 'cinquieme': '122',
      '4e': '123', '4ème': '123', 'quatrieme': '123',
      '3e': '124', '3ème': '124', 'troisieme': '124',
      '2nde': '125', 'seconde': '125', '2nde a': '125',
      '1ère': '126', '1ere': '126', 'premiere': '126', '1ère a': '126',
      'terminale': '127', 'tle': '127', 'terminale a': '127',
      'l1': '1D1', 'l1 / year 1': '1D1', 'l1 / year 1 (bachelor)': '1D1',
      'l2': '1D2', 'l2 / year 2': '1D2', 'l2 / year 2 (bachelor)': '1D2',
      'l3': '1D3', 'l3 / year 3': '1D3', 'l3 / year 3 (bachelor)': '1D3',
      'm1': '1D4', 'm2': '1D5'
    };
    
    if (specialMappings[normalizedLevelNom]) {
      return specialMappings[normalizedLevelNom];
    }
    
    return '';
  };

  const findMatiereId = (domainId, sousDomaineId, matiereNom) => {
    if (!domainId || !matiereNom) return '';
    const domain = DOMAIN_DATA[domainId];
    if (!domain) return '';
    
    const normalizedNom = matiereNom.toLowerCase().trim();
    
    // Si sousDomaineId fourni, chercher d'abord dedans
    if (sousDomaineId) {
      const sousDomaine = domain.sousDomaines[sousDomaineId];
      if (sousDomaine && sousDomaine.matieres) {
        const matiere = sousDomaine.matieres.find(m => 
          m.nom?.toLowerCase() === normalizedNom ||
          m.code?.toLowerCase() === normalizedNom
        );
        if (matiere) return String(matiere.id);
      }
    }
    
    // Chercher dans tous les sous-domaines
    for (const sdId in domain.sousDomaines) {
      const sousDomaine = domain.sousDomaines[sdId];
      if (sousDomaine && sousDomaine.matieres) {
        const matiere = sousDomaine.matieres.find(m => 
          m.nom?.toLowerCase() === normalizedNom ||
          m.code?.toLowerCase() === normalizedNom
        );
        if (matiere) return String(matiere.id);
      }
    }
    
    return '';
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
    let domaineId = findDomainId(q.domaine);
    let sousDomaineId = findSousDomaineId(domaineId, q.sousDomaine);
    let niveauId = findLevelId(domaineId, sousDomaineId, q.niveau);
    
    // ✅ CORRECTION AUTOMATIQUE : Si niveauId trouvé mais pas sousDomaineId
    if (!sousDomaineId && niveauId) {
      if (niveauId.startsWith('11')) {
        sousDomaineId = '11';
        q.sousDomaine = 'Primaire (Francophone)';
      } else if (niveauId.startsWith('12')) {
        sousDomaineId = '12';
        q.sousDomaine = 'Secondaire Général (Francophone)';
      } else if (niveauId.startsWith('13')) {
        sousDomaineId = '13';
        q.sousDomaine = 'Secondaire Technique (Francophone)';
      } else if (niveauId.startsWith('1D')) {
        sousDomaineId = '1D';
        q.sousDomaine = 'Enseignement Supérieur (Universitaire)';
      }
    }
    
    // ✅ CORRECTION POUR LES NIVEAUX PRIMAIRES (CM2, CE1, CE2, etc.)
    const niveauxPrimaire = ['CM2', 'CM1', 'CE2', 'CE1', 'CP', 'SIL'];
    if (niveauxPrimaire.includes(q.niveau) && sousDomaineId !== '11') {
      sousDomaineId = '11';
      q.sousDomaine = 'Primaire (Francophone)';
      niveauId = findLevelId(domaineId, '11', q.niveau);
    }
    
    // ✅ CORRECTION POUR LES NIVEAUX SECONDAIRES
    const niveauxSecondaire = ['6e', '5e', '4e', '3e', '2nde', '1ère', 'Terminale'];
    if (niveauxSecondaire.includes(q.niveau) && sousDomaineId !== '12' && sousDomaineId !== '13') {
      sousDomaineId = '12';
      q.sousDomaine = 'Secondaire Général (Francophone)';
    }
    
    const matiereId = findMatiereId(domaineId, sousDomaineId, q.matiere);
    
    // Récupérer les codes
    const domaineCode = DOMAIN_DATA[domaineId]?.code || '';
    const sousDomaineCode = DOMAIN_DATA[domaineId]?.sousDomaines[sousDomaineId]?.code || '';
    const matiereCode = getMatiereCode(domaineId, sousDomaineId, matiereId);
    
    return {
      // Référentiel avec IDs
      domaineId: domaineId || '1',
      domaine: q.domaine || 'Éducatif',
      domaineCode: domaineCode || 'EDU',
      sousDomaineId: sousDomaineId || '12',
      sousDomaine: q.sousDomaine || 'Secondaire Général (Francophone)',
      sousDomaineCode: sousDomaineCode || 'SEC-FR',
      niveauId: niveauId || '124',
      niveau: q.niveau || '3e',
      matiereId: matiereId || '1215',
      matiere: q.matiere || 'Français',
      matiereCode: matiereCode || 'FRA',
      libChapitre: q.libChapitre || q.chapitre || q.chapter || 'Général',
      
      // Contenu
      libQuestion: q.libQuestion || q.question || q.text || '',
      options: Array.isArray(q.options) ? q.options : (q.options ? q.options.split('|') : ['Option A', 'Option B', 'Option C']),
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
            validData.push(q);
          }
        });
        
        if (validationErrors.length > 0) {
          setInvalidQuestions(validationErrors);
          console.warn('Questions invalides:', validationErrors);
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
    toast.success('Liste vidée');
  };

  // Obtenir l'affichage des options limité
  const getOptionsPreview = (options) => {
    if (!options) return '';
    const preview = options.slice(0, 3).map(opt => opt.length > 15 ? opt.substring(0, 12) + '...' : opt);
    if (options.length > 3) preview.push(`+${options.length - 3}`);
    return preview.join(' | ');
  };

  // Télécharger le template CSV
  const downloadTemplate = () => {
    const template = [
      ["domaine", "sousDomaine", "niveau", "matiere", "libChapitre", "libQuestion", "options", "correctAnswer", "typeQuestion", "points", "tempsMin", "explanation", "difficulty", "tags"],
      ["Éducatif", "Secondaire Général", "3e", "Géographie", "Chapitre 1", "Quelle est la capitale du Cameroun ?", "Douala|Yaoundé|Garoua|Bafoussam", "Yaoundé", "1", "1", "1", "Yaoundé est la capitale", "facile", "géographie"],
      ["Éducatif", "Primaire", "CM2", "Mathématiques", "Chapitre 2", "Combien font 5 + 3 ?", "6|7|8|9", "8", "1", "1", "1", "5 + 3 = 8", "facile", "maths"]
    ];
    
    const csvContent = template.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'questions_template.csv';
    link.click();
    URL.revokeObjectURL(link.href);
    toast.success('Template CSV téléchargé');
  };

  // Télécharger le template JSON
  const downloadJsonTemplate = () => {
    const template = [
      {
        domaine: "Éducatif",
        sousDomaine: "Secondaire Général (Francophone)",
        niveau: "3e",
        matiere: "Géographie",
        libChapitre: "Chapitre 1: Le Cameroun",
        libQuestion: "Quelle est la capitale du Cameroun ?",
        options: ["Douala", "Yaoundé", "Garoua", "Bafoussam"],
        correctAnswer: "Yaoundé",
        typeQuestion: 1,
        points: 1,
        tempsMin: 1,
        explanation: "Yaoundé est la capitale politique du Cameroun",
        difficulty: "facile",
        tags: ["géographie", "capitale"]
      },
      {
        domaine: "Éducatif",
        sousDomaine: "Primaire (Francophone)",
        niveau: "CM2",
        matiere: "Mathématiques",
        libChapitre: "Chapitre 2: Addition",
        libQuestion: "Combien font 5 + 3 ?",
        options: ["6", "7", "8", "9"],
        correctAnswer: "8",
        typeQuestion: 1,
        points: 1,
        tempsMin: 1,
        explanation: "5 + 3 = 8",
        difficulty: "facile",
        tags: ["maths", "addition"]
      }
    ];
    
    const blob = new Blob([JSON.stringify(template, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'questions_template.json';
    link.click();
    URL.revokeObjectURL(link.href);
    toast.success('Template JSON téléchargé');
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
        {/* En-tête */}
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

            {/* Erreurs de validation */}
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
                <button onClick={downloadTemplate} style={{
                  display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px',
                  background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.3)',
                  borderRadius: 8, color: '#60a5fa', cursor: 'pointer'
                }}>
                  <FileSpreadsheet size={14} /> CSV Template
                </button>
                <button onClick={downloadJsonTemplate} style={{
                  display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px',
                  background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.3)',
                  borderRadius: 8, color: '#a78bfa', cursor: 'pointer'
                }}>
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
                
                <button onClick={clearPreview} style={{
                  padding: '12px', background: 'rgba(239,68,68,0.1)',
                  border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10,
                  color: '#ef4444', cursor: 'pointer'
                }}>
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
                <span style={{ background: '#10b981', padding: '2px 8px', borderRadius: 20, fontSize: '0.7rem', color: '#fff' }}>
                  Prêt pour import
                </span>
              )}
            </div>

            {previewData.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: '#64748b', border: '1px dashed rgba(16,185,129,0.2)', borderRadius: 12 }}>
                <FileText size={32} style={{ marginBottom: 12, opacity: 0.5 }} />
                <p>Aucune question chargée</p>
                <p style={{ fontSize: '0.7rem', marginTop: 8 }}>
                  Importez un fichier CSV ou JSON pour prévisualiser les questions
                </p>
              </div>
            ) : (
              <div style={{ maxHeight: 500, overflowY: 'auto', paddingRight: 8 }}>
                {previewData.map((q, idx) => (
                  <div key={idx} style={{ background: 'rgba(255,255,255,0.02)', borderRadius: 10, padding: 12, marginBottom: 12, position: 'relative' }}>
                    <button onClick={() => removePreviewQuestion(idx)} style={{
                      position: 'absolute', top: 8, right: 8, background: 'rgba(239,68,68,0.1)',
                      border: 'none', borderRadius: 4, color: '#ef4444', cursor: 'pointer',
                      padding: 4, display: 'flex', alignItems: 'center', gap: 4
                    }}>
                      <X size={12} />
                    </button>
                    
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                      <span style={{ background: 'rgba(16,185,129,0.2)', color: '#10b981', padding: '2px 8px', borderRadius: 4, fontSize: '0.65rem', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <BookOpen size={10} /> {q.matiere}
                      </span>
                      <span style={{ background: 'rgba(59,130,246,0.2)', color: '#60a5fa', padding: '2px 8px', borderRadius: 4, fontSize: '0.65rem', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Layers size={10} /> {q.niveau}
                      </span>
                      <span style={{ background: 'rgba(139,92,246,0.2)', color: '#a78bfa', padding: '2px 8px', borderRadius: 4, fontSize: '0.65rem', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Tag size={10} /> {q.domaine}
                      </span>
                      {q.sousDomaine && (
                        <span style={{ background: 'rgba(245,158,11,0.2)', color: '#f59e0b', padding: '2px 8px', borderRadius: 4, fontSize: '0.65rem' }}>
                          {q.sousDomaine}
                        </span>
                      )}
                      {q.libChapitre && (
                        <span style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981', padding: '2px 8px', borderRadius: 4, fontSize: '0.65rem', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Bookmark size={10} />
                          {q.libChapitre.length > 30 ? q.libChapitre.substring(0, 27) + '...' : q.libChapitre}
                        </span>
                      )}
                      <span style={{ background: 'rgba(16,185,129,0.2)', color: '#10b981', padding: '2px 8px', borderRadius: 4, fontSize: '0.65rem', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Clock size={10} /> {q.tempsMin} min
                      </span>
                    </div>
                    
                    <p style={{ color: '#f8fafc', fontSize: '0.85rem', marginBottom: 8, fontWeight: 500 }}>
                      {idx + 1}. {q.libQuestion}
                    </p>
                    
                    {q.options && q.options.length > 0 && (
                      <div style={{ fontSize: '0.7rem', color: '#64748b', marginBottom: 6 }}>
                        <span style={{ color: '#94a3b8' }}>Options: </span>
                        {getOptionsPreview(q.options)}
                      </div>
                    )}
                    
                    <div style={{ fontSize: '0.7rem', color: '#10b981' }}>
                      ✓ Réponse: {q.correctAnswer}
                    </div>
                    
                    <div style={{ fontSize: '0.65rem', color: '#f59e0b', marginTop: 6 }}>
                      {q.points} point{q.points > 1 ? 's' : ''} • {q.difficulty}
                    </div>
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
              border: 'none', borderRadius: 12, color: 'white', fontWeight: 600,
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
              boxShadow: '0 4px 14px rgba(16,185,129,0.3)'
            }}
          >
            <Eye size={18} /> Aller à la validation
          </motion.button>
          
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate('/evaluate')}
            style={{
              padding: '12px 28px',
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: 12, color: '#94a3b8', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 8
            }}
          >
            <Home size={18} /> Tableau de bord
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