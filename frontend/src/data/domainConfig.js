// src/data/domainConfig.js
// Version conforme au nouveau canevas de la Table QCM
// CORRIGÉE : Conversion des IDs en nombres pour les fonctions de recherche

const DOMAIN_DATA = {
  // N°Domaine 1: Éducatif
  "1": {
    id: 1,
    nom: "Éducatif",
    sousDomaines: {
      "11": {
        id: 11,
        nom: "Primaire",
        levels: [
          { id: 111, nom: "SIL" },
          { id: 112, nom: "CP" },
          { id: 113, nom: "CE1" },
          { id: 114, nom: "CE2" },
          { id: 115, nom: "CM1" },
          { id: 116, nom: "CM2" }
        ],
        matieres: [
          { id: 1111, nom: "Français" },
          { id: 1112, nom: "Mathématiques" },
          { id: 1113, nom: "Éducation Civique et Morale" },
          { id: 1114, nom: "Sciences" },
          { id: 1115, nom: "Éducation Artistique" },
          { id: 1116, nom: "Éducation Physique" },
          { id: 1117, nom: "Culture et Spiritualité Camerounaise" }
        ]
      },
      "12": {
        id: 12,
        nom: "Secondaire Général",
        levels: [
          { id: 121, nom: "6e" },
          { id: 122, nom: "5e" },
          { id: 123, nom: "4e" },
          { id: 124, nom: "3e" },
          { id: 125, nom: "2nde A" },
          { id: 126, nom: "1ère A" },
          { id: 127, nom: "Terminale A" },
          { id: 128, nom: "2nde C" },
          { id: 129, nom: "1ère C" },
          { id: 130, nom: "Terminale C" },
          { id: 131, nom: "2nde D" },
          { id: 132, nom: "1ère D" },
          { id: 133, nom: "Terminale D" }
        ],
        matieres: [
          { id: 1211, nom: "Littérature" },
          { id: 1212, nom: "Philosophie" },
          { id: 1213, nom: "Histoire" },
          { id: 1214, nom: "Géographie" },
          { id: 1215, nom: "Français" },
          { id: 1216, nom: "Anglais" },
          { id: 1217, nom: "Espagnol" },
          { id: 1218, nom: "Allemand" },
          { id: 1219, nom: "Mathématiques" },
          { id: 1220, nom: "Physique" },
          { id: 1221, nom: "Chimie" },
          { id: 1222, nom: "SVT" },
          { id: 1223, nom: "Technologie" },
          { id: 1224, nom: "Sciences industrielles" },
          { id: 1225, nom: "Culture et Spiritualité Camerounaise" }
        ]
      },
      "13": {
        id: 13,
        nom: "Secondaire Technique",
        levels: [
          { id: 131, nom: "2nde F1" },
          { id: 132, nom: "1ère F1" },
          { id: 133, nom: "Terminale F1" },
          { id: 134, nom: "2nde F2" },
          { id: 135, nom: "1ère F2" },
          { id: 136, nom: "Terminale F2" },
          { id: 137, nom: "2nde F3" },
          { id: 138, nom: "1ère F3" },
          { id: 139, nom: "Terminale F3" },
          { id: 140, nom: "2nde F4" },
          { id: 141, nom: "1ère F4" },
          { id: 142, nom: "Terminale F4" },
          { id: 143, nom: "2nde F5" },
          { id: 144, nom: "1ère F5" },
          { id: 145, nom: "Terminale F5" },
          { id: 146, nom: "2nde F6" },
          { id: 147, nom: "1ère F6" },
          { id: 148, nom: "Terminale F6" }
        ],
        matieres: [
          { id: 1311, nom: "Génie Mécanique" },
          { id: 1312, nom: "Électrotechnique" },
          { id: 1313, nom: "Génie Civil" },
          { id: 1314, nom: "Informatique" },
          { id: 1315, nom: "Agro-industrie" },
          { id: 1316, nom: "Santé-Social" },
          { id: 1317, nom: "Usinage" },
          { id: 1318, nom: "Automatisme" },
          { id: 1319, nom: "Soins Infirmiers" },
          { id: 1320, nom: "Culture et Spiritualité Camerounaise" }
        ]
      },
      "14": {
        id: 14,
        nom: "Universitaire",
        levels: [
          { id: 141, nom: "L1" },
          { id: 142, nom: "L2" },
          { id: 143, nom: "L3" },
          { id: 144, nom: "M1" },
          { id: 145, nom: "M2" }
        ],
        matieres: [
          { id: 1411, nom: "Droit" },
          { id: 1412, nom: "Médecine" },
          { id: 1413, nom: "Informatique" },
          { id: 1414, nom: "Agronomie" },
          { id: 1415, nom: "Économie" },
          { id: 1416, nom: "Sciences Sociales" },
          { id: 1417, nom: "Programmation Avancée" },
          { id: 1418, nom: "Systèmes Distribués" },
          { id: 1419, nom: "IA" },
          { id: 1420, nom: "Anatomie" },
          { id: 1421, nom: "Pathologie" },
          { id: 1422, nom: "Culture et Spiritualité Camerounaise" }
        ]
      }
    }
  },
  
  // N°Domaine 2: Professionnel
  "2": {
    id: 2,
    nom: "Professionnel",
    sousDomaines: {
      "21": {
        id: 21,
        nom: "Compétences",
        levels: [
          { id: 211, nom: "CAP" },
          { id: 212, nom: "BEP" },
          { id: 213, nom: "BTS" },
          { id: 214, nom: "HND" },
          { id: 215, nom: "Certificat Professionnel" }
        ],
        matieres: [
          { id: 2111, nom: "Agriculture" },
          { id: 2112, nom: "Agro-industrie" },
          { id: 2113, nom: "BTP" },
          { id: 2114, nom: "Électricité" },
          { id: 2115, nom: "Électrotechnique" },
          { id: 2116, nom: "Informatique" },
          { id: 2117, nom: "Réseaux" },
          { id: 2118, nom: "Développement" },
          { id: 2119, nom: "Mécanique Automobile" },
          { id: 2120, nom: "Gestion" },
          { id: 2121, nom: "Comptabilité" },
          { id: 2122, nom: "Entrepreneuriat et Leadership" },
          { id: 2123, nom: "Gestion de Chaîne Logistique" },
          { id: 2124, nom: "Management International" },
          { id: 2125, nom: "Management Public" },
          { id: 2126, nom: "Management de l'Innovation" },
          { id: 2127, nom: "Management du Développement Durable" },
          { id: 2128, nom: "Hôtellerie" },
          { id: 2129, nom: "Tourisme" },
          { id: 2130, nom: "Santé" },
          { id: 2131, nom: "Soins Infirmiers" },
          { id: 2132, nom: "Pisciculture" },
          { id: 2133, nom: "Élevage" },
          { id: 2134, nom: "Couture" },
          { id: 2135, nom: "Stylisme" },
          { id: 2136, nom: "Coiffure" },
          { id: 2137, nom: "Esthétique" },
          { id: 2138, nom: "Art et Artisanat" },
          { id: 2139, nom: "Maintenance industrielle" }
        ]
      },
      "22": {
        id: 22,
        nom: "Management",
        levels: [
          { id: 221, nom: "Licence" },
          { id: 222, nom: "Master" },
          { id: 223, nom: "MBA" },
          { id: 224, nom: "Certificat Professionnel" }
        ],
        matieres: [
          { id: 2211, nom: "Management de Projet" },
          { id: 2212, nom: "Management Stratégique" },
          { id: 2213, nom: "Management des Ressources Humaines" },
          { id: 2214, nom: "Management Financier" },
          { id: 2215, nom: "Management des Opérations" },
          { id: 2216, nom: "Management Interculturel" },
          { id: 2217, nom: "Management de la Qualité" },
          { id: 2218, nom: "Management des Systèmes d'Information" },
          { id: 2219, nom: "Management du Changement" },
          { id: 2220, nom: "Management des Organisations" },
          { id: 2221, nom: "Entrepreneuriat et Leadership" },
          { id: 2222, nom: "Gestion de Chaîne Logistique" },
          { id: 2223, nom: "Management International" },
          { id: 2224, nom: "Management Public" },
          { id: 2225, nom: "Management de l'Innovation" },
          { id: 2226, nom: "Management du Développement Durable" }
        ]
      }
    }
  },
  
  // N°Domaine 3: Spiritualité et Culture Camerounaise
  "3": {
    id: 3,
    nom: "Spiritualité et Culture Camerounaise",
    sousDomaines: {
      "31": {
        id: 31,
        nom: "Rites et Traditions",
        levels: [{ id: 311, nom: "Tous niveaux" }],
        matieres: [
          { id: 3111, nom: "Rites de passage" },
          { id: 3112, nom: "Mariage traditionnel" },
          { id: 3113, nom: "Culte des ancêtres" },
          { id: 3114, nom: "Symbolique des masques et totems" }
        ]
      },
      "32": {
        id: 32,
        nom: "Histoire",
        levels: [{ id: 321, nom: "Tous niveaux" }],
        matieres: [
          { id: 3211, nom: "Royaumes précoloniaux" },
          { id: 3212, nom: "Colonisation" },
          { id: 3213, nom: "Indépendance" },
          { id: 3214, nom: "Réunification" }
        ]
      },
      "33": {
        id: 33,
        nom: "Ethnies",
        levels: [{ id: 331, nom: "Tous niveaux" }],
        matieres: [
          { id: 3311, nom: "Fang-Beti" },
          { id: 3312, nom: "Sawa" },
          { id: 3313, nom: "Bamiléké" },
          { id: 3314, nom: "Bassa" },
          { id: 3315, nom: "Kirdi" },
          { id: 3316, nom: "Peulh" }
        ]
      },
      "34": {
        id: 34,
        nom: "Langues et Savoirs Traditionnels",
        levels: [{ id: 341, nom: "Tous niveaux" }],
        matieres: [
          { id: 3411, nom: "Langues nationales" },
          { id: 3412, nom: "Médecine traditionnelle" },
          { id: 3413, nom: "Artisanat local" },
          { id: 3414, nom: "Contes et légendes" }
        ]
      }
    }
  }
};

// Fonctions utilitaires pour accéder aux données
export const getDomainById = (id) => DOMAIN_DATA[String(id)];
export const getDomainNom = (id) => DOMAIN_DATA[String(id)]?.nom || '';

export const getSousDomaineById = (domainId, sousDomaineId) => {
  return DOMAIN_DATA[String(domainId)]?.sousDomaines[String(sousDomaineId)];
};

export const getSousDomaineNom = (domainId, sousDomaineId) => {
  return DOMAIN_DATA[String(domainId)]?.sousDomaines[String(sousDomaineId)]?.nom || '';
};

// ✅ CORRECTION : Convertir les IDs en nombres pour la recherche dans les tableaux
export const getLevelNom = (domainId, sousDomaineId, levelId) => {
  const domain = DOMAIN_DATA[String(domainId)];
  if (!domain) return '';
  const sousDomaine = domain.sousDomaines[String(sousDomaineId)];
  if (!sousDomaine) return '';
  // Convertir levelId en nombre pour la recherche
  const levelIdNum = parseInt(levelId);
  const level = sousDomaine.levels?.find(l => l.id === levelIdNum);
  return level?.nom || '';
};

// ✅ CORRECTION : Convertir les IDs en nombres pour la recherche dans les tableaux
export const getMatiereNom = (domainId, sousDomaineId, matiereId) => {
  const domain = DOMAIN_DATA[String(domainId)];
  if (!domain) return '';
  const sousDomaine = domain.sousDomaines[String(sousDomaineId)];
  if (!sousDomaine) return '';
  // Convertir matiereId en nombre pour la recherche
  const matiereIdNum = parseInt(matiereId);
  const matiere = sousDomaine.matieres?.find(m => m.id === matiereIdNum);
  return matiere?.nom || '';
};

// Récupérer toutes les options pour les selects
export const getAllDomaines = () => {
  return Object.values(DOMAIN_DATA).map(d => ({ id: String(d.id), nom: d.nom }));
};

export const getAllSousDomaines = (domainId) => {
  if (!domainId) return [];
  const domain = DOMAIN_DATA[String(domainId)];
  if (!domain) return [];
  return Object.values(domain.sousDomaines).map(sd => ({ id: String(sd.id), nom: sd.nom }));
};

export const getAllLevels = (domainId, sousDomaineId) => {
  if (!domainId || !sousDomaineId) return [];
  const domain = DOMAIN_DATA[String(domainId)];
  if (!domain) return [];
  const sousDomaine = domain.sousDomaines[String(sousDomaineId)];
  if (!sousDomaine) return [];
  // Retourner les IDs sous forme de chaînes pour la compatibilité
  return sousDomaine.levels.map(l => ({ id: String(l.id), nom: l.nom }));
};

export const getAllMatieres = (domainId, sousDomaineId) => {
  if (!domainId || !sousDomaineId) return [];
  const domain = DOMAIN_DATA[String(domainId)];
  if (!domain) return [];
  const sousDomaine = domain.sousDomaines[String(sousDomaineId)];
  if (!sousDomaine) return [];
  // Retourner les IDs sous forme de chaînes pour la compatibilité
  return sousDomaine.matieres.map(m => ({ id: String(m.id), nom: m.nom }));
};

export default DOMAIN_DATA;