// src/utils/examCodeGenerator.js

// ==================== CODES MATIÈRES (2 chiffres) ====================
const MATIERE_CODES = {
  // Secondaire Général - Série C/D
  '1219': 'MA', // Mathématiques
  '1220': 'PH', // Physique
  '1221': 'CH', // Chimie
  '1222': 'SV', // SVT (Sciences de la Vie et de la Terre)
  
  // Secondaire Général - Série A
  '1215': 'FR', // Français
  '1216': 'AN', // Anglais
  '1213': 'HI', // Histoire
  '1214': 'GE', // Géographie
  '1212': 'PH', // Philosophie
  '1211': 'LI', // Littérature
  
  // Secondaire Technique
  '1314': 'IN', // Informatique
  '1311': 'GM', // Génie Mécanique
  '1312': 'EL', // Électrotechnique
  '1313': 'GC', // Génie Civil
  '1315': 'AG', // Agro-industrie
  '1316': 'SS', // Santé-Social
  
  // Universitaire
  '1429': 'IF', // Informatique
  '1432': 'IA', // Intelligence Artificielle
  '1436': 'EC', // Économie
  '1439': 'FI', // Finance
  '1443': 'MG', // Management
  '1411': 'DR', // Droit
  '1417': 'AN', // Anatomie
  '1425': 'MT', // Mathématiques
  
  // Primaire
  '1112': 'MA', // Mathématiques
  '1111': 'FR', // Français
  '1114': 'SC', // Sciences
  
  // Professionnel
  '2128': 'IF', // Informatique
  '2136': 'GE', // Gestion
  '2137': 'CP', // Comptabilité
  '2142': 'HO', // Hôtellerie
  '2146': 'SI', // Soins Infirmiers
  '2150': 'CO', // Couture
};

// ==================== CODES NIVEAUX (2 chiffres) ====================
const NIVEAU_CODES = {
  // Secondaire Général
  '130': 'TC', // Terminale C
  '129': '1C', // 1ère C
  '128': '2C', // 2nde C
  '133': 'TD', // Terminale D
  '132': '1D', // 1ère D
  '131': '2D', // 2nde D
  '127': 'TA', // Terminale A
  '126': '1A', // 1ère A
  '125': '2A', // 2nde A
  '124': '3E', // 3ème
  '123': '4E', // 4ème
  '122': '5E', // 5ème
  '121': '6E', // 6ème
  
  // Secondaire Technique
  '133': 'TF', // Terminale F
  '132': '1F', // 1ère F
  '131': '2F', // 2nde F
  
  // Universitaire (Licence, Master, Doctorat)
  '143': 'L3', // Licence 3
  '142': 'L2', // Licence 2
  '141': 'L1', // Licence 1
  '145': 'M2', // Master 2
  '144': 'M1', // Master 1
  '149': 'PH', // Doctorat (PhD)
  
  // Primaire
  '116': 'CM', // CM2
  '115': 'CM', // CM1
  '114': 'CE', // CE2
  '113': 'CE', // CE1
  '112': 'CP', // CP
  '111': 'SI', // SIL
};

// ==================== FONCTION PRINCIPALE ====================
/**
 * Génère un code d'épreuve unique
 * Format: MAT-NIV-ENSEIGNANT-ORDRE
 * Exemple: MA-TC-TCH001-01
 * 
 * @param {string} matiereId - ID de la matière
 * @param {string} niveauId - ID du niveau
 * @param {string} teacherMatricule - Matricule de l'enseignant
 * @param {number} order - Numéro d'ordre (1, 2, 3...)
 * @returns {string} Code d'épreuve formaté
 */
export const generateExamCode = (matiereId, niveauId, teacherMatricule, order) => {
  // Récupérer le code matière depuis le mapping, fallback sur les 2 derniers chiffres
  let matiereCode = MATIERE_CODES[String(matiereId)];
  if (!matiereCode && matiereId) {
    matiereCode = String(matiereId).slice(-2);
  }
  
  // Récupérer le code niveau depuis le mapping, fallback sur les 2 derniers chiffres
  let niveauCode = NIVEAU_CODES[String(niveauId)];
  if (!niveauCode && niveauId) {
    niveauCode = String(niveauId).slice(-2);
  }
  
  // Formater l'ordre sur 2 chiffres
  const orderStr = String(order).padStart(2, '0');
  
  // Nettoyer le matricule (garde seulement lettres et chiffres)
  const cleanMatricule = String(teacherMatricule).replace(/[^A-Za-z0-9]/g, '').slice(0, 6);
  
  return `${matiereCode}-${niveauCode}-${cleanMatricule}-${orderStr}`;
};

// ==================== COMPTER LES ÉPREUVES ====================
/**
 * Récupère le prochain numéro d'ordre pour un enseignant/matière/niveau
 * 
 * @param {string} teacherMatricule - Matricule de l'enseignant
 * @param {string} matiereId - ID de la matière
 * @param {string} niveauId - ID du niveau
 * @param {Object} api - Instance API axios
 * @returns {Promise<number>} Prochain numéro d'ordre
 */
export const getExamOrder = async (teacherMatricule, matiereId, niveauId, api) => {
  try {
    const response = await api.get('/api/exams/count', {
      params: { 
        teacher: teacherMatricule, 
        matiere: matiereId, 
        niveau: niveauId 
      }
    });
    return (response.data.count || 0) + 1;
  } catch (error) {
    console.warn('[ExamCodeGenerator] Erreur récupération ordre, fallback à 1:', error);
    return 1;
  }
};

// ==================== FONCTIONS UTILITAIRES ====================
/**
 * Décode un code d'épreuve en ses composants
 * 
 * @param {string} examCode - Code d'épreuve (ex: MA-TC-TCH001-01)
 * @returns {Object} Composants décodés
 */
export const decodeExamCode = (examCode) => {
  if (!examCode) return null;
  
  const parts = examCode.split('-');
  if (parts.length !== 4) return null;
  
  return {
    matiereCode: parts[0],
    niveauCode: parts[1],
    teacherMatricule: parts[2],
    order: parseInt(parts[3], 10),
    fullCode: examCode
  };
};

/**
 * Formate un code d'épreuve pour l'affichage
 * 
 * @param {string} examCode - Code d'épreuve
 * @returns {string} Version formatée pour l'affichage
 */
export const formatExamCode = (examCode) => {
  if (!examCode) return '—';
  
  const decoded = decodeExamCode(examCode);
  if (!decoded) return examCode;
  
  return `${decoded.matiereCode} · ${decoded.niveauCode} · ${decoded.teacherMatricule} · n°${decoded.order}`;
};

/**
 * Valide un code d'épreuve
 * 
 * @param {string} examCode - Code d'épreuve à valider
 * @returns {boolean} true si valide
 */
export const isValidExamCode = (examCode) => {
  if (!examCode) return false;
  const regex = /^[A-Z0-9]{2}-[A-Z0-9]{2}-[A-Z0-9]{3,6}-\d{2}$/i;
  return regex.test(examCode);
};

// ==================== EXPORT DES MAPPINGS ====================
export { MATIERE_CODES, NIVEAU_CODES };