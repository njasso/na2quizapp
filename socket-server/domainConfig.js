// src/data/domainConfig.js
// Version complète - Référentiel du système éducatif camerounais
// INCLUT : Système francophone + Système anglophone + Doctorat (7 ans)

const DOMAIN_DATA = {
  // ==================== DOMAINE 1: ÉDUCATIF ====================
  "1": {
    id: 1,
    nom: "Éducatif",
    code: "EDU",
    description: "Enseignement général (Primaire, Secondaire, Supérieur)",
    sousDomaines: {
      // ==================== SYSTÈME FRANCOPHONE ====================
      // Primaire Francophone
      "11": {
        id: 11,
        nom: "Primaire (Francophone)",
        code: "PRI-FR",
        levels: [
          { id: 111, nom: "SIL" },
          { id: 112, nom: "CP" },
          { id: 113, nom: "CE1" },
          { id: 114, nom: "CE2" },
          { id: 115, nom: "CM1" },
          { id: 116, nom: "CM2" }
        ],
        matieres: [
          { id: 1111, nom: "Français", code: "FRA" },
          { id: 1112, nom: "Mathématiques", code: "MAT" },
          { id: 1113, nom: "Éducation Civique et Morale", code: "ECM" },
          { id: 1114, nom: "Sciences", code: "SCI" },
          { id: 1115, nom: "Éducation Artistique", code: "ART" },
          { id: 1116, nom: "Éducation Physique", code: "EPS" },
          { id: 1117, nom: "Culture et Spiritualité Camerounaise", code: "CSC" }
        ]
      },
      
      // Secondaire Général Francophone
      "12": {
        id: 12,
        nom: "Secondaire Général (Francophone)",
        code: "SEC-FR",
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
          { id: 133, nom: "Terminale D" },
          { id: 134, nom: "2nde E" },
          { id: 135, nom: "1ère E" },
          { id: 136, nom: "Terminale E" },
          { id: 137, nom: "2nde F" },
          { id: 138, nom: "1ère F" },
          { id: 139, nom: "Terminale F" }
        ],
        matieres: [
          { id: 1211, nom: "Littérature", code: "LIT" },
          { id: 1212, nom: "Philosophie", code: "PHI" },
          { id: 1213, nom: "Histoire", code: "HIS" },
          { id: 1214, nom: "Géographie", code: "GEO" },
          { id: 1215, nom: "Français", code: "FRA" },
          { id: 1216, nom: "Anglais", code: "ANG" },
          { id: 1217, nom: "Espagnol", code: "ESP" },
          { id: 1218, nom: "Allemand", code: "ALL" },
          { id: 1219, nom: "Mathématiques", code: "MAT" },
          { id: 1220, nom: "Physique", code: "PHY" },
          { id: 1221, nom: "Chimie", code: "CHI" },
          { id: 1222, nom: "SVT", code: "SVT" },
          { id: 1223, nom: "Technologie", code: "TEC" },
          { id: 1224, nom: "Sciences industrielles", code: "SIN" },
          { id: 1225, nom: "Culture et Spiritualité Camerounaise", code: "CSC" },
          { id: 1226, nom: "Économie", code: "ECO" },
          { id: 1227, nom: "Gestion", code: "GES" },
          { id: 1228, nom: "Comptabilité", code: "COM" }
        ]
      },
      
      // Secondaire Technique Francophone
      "13": {
        id: 13,
        nom: "Secondaire Technique (Francophone)",
        code: "TEC-FR",
        levels: [
          { id: 131, nom: "2nde F1" }, { id: 132, nom: "1ère F1" }, { id: 133, nom: "Terminale F1" },
          { id: 134, nom: "2nde F2" }, { id: 135, nom: "1ère F2" }, { id: 136, nom: "Terminale F2" },
          { id: 137, nom: "2nde F3" }, { id: 138, nom: "1ère F3" }, { id: 139, nom: "Terminale F3" },
          { id: 140, nom: "2nde F4" }, { id: 141, nom: "1ère F4" }, { id: 142, nom: "Terminale F4" },
          { id: 143, nom: "2nde F5" }, { id: 144, nom: "1ère F5" }, { id: 145, nom: "Terminale F5" },
          { id: 146, nom: "2nde F6" }, { id: 147, nom: "1ère F6" }, { id: 148, nom: "Terminale F6" }
        ],
        matieres: [
          { id: 1311, nom: "Génie Mécanique", code: "GME" },
          { id: 1312, nom: "Électrotechnique", code: "ELE" },
          { id: 1313, nom: "Génie Civil", code: "GCI" },
          { id: 1314, nom: "Informatique", code: "INF" },
          { id: 1315, nom: "Agro-industrie", code: "AGI" },
          { id: 1316, nom: "Santé-Social", code: "SAS" },
          { id: 1317, nom: "Usinage", code: "USI" },
          { id: 1318, nom: "Automatisme", code: "AUT" },
          { id: 1319, nom: "Soins Infirmiers", code: "SOI" },
          { id: 1320, nom: "Maintenance industrielle", code: "MAI" },
          { id: 1321, nom: "Culture et Spiritualité Camerounaise", code: "CSC" }
        ]
      },

      // ==================== SYSTÈME ANGLOPHONE ====================
      // Primary School (Anglophone)
      "1A": {
        id: "1A",
        nom: "Primary School (Anglophone)",
        code: "PRI-EN",
        levels: [
          { id: "1A1", nom: "Nursery 1" },
          { id: "1A2", nom: "Nursery 2" },
          { id: "1A3", nom: "Class 1" },
          { id: "1A4", nom: "Class 2" },
          { id: "1A5", nom: "Class 3" },
          { id: "1A6", nom: "Class 4" },
          { id: "1A7", nom: "Class 5" },
          { id: "1A8", nom: "Class 6" }
        ],
        matieres: [
          { id: "1A11", nom: "English Language", code: "ENG" },
          { id: "1A12", nom: "Mathematics", code: "MAT" },
          { id: "1A13", nom: "Social Studies", code: "SST" },
          { id: "1A14", nom: "Science", code: "SCI" },
          { id: "1A15", nom: "French", code: "FRE" },
          { id: "1A16", nom: "Physical Education", code: "PED" },
          { id: "1A17", nom: "Arts and Crafts", code: "ART" },
          { id: "1A18", nom: "Cameroonian Culture", code: "CSC" }
        ]
      },
      
      // GCE Ordinary Level (Anglophone)
      "1B": {
        id: "1B",
        nom: "GCE Ordinary Level (Anglophone)",
        code: "GCE-O",
        levels: [
          { id: "1B1", nom: "Form 1" },
          { id: "1B2", nom: "Form 2" },
          { id: "1B3", nom: "Form 3" },
          { id: "1B4", nom: "Form 4" },
          { id: "1B5", nom: "Form 5" }
        ],
        matieres: [
          { id: "1B11", nom: "English Language", code: "ENG" },
          { id: "1B12", nom: "Literature in English", code: "LIT" },
          { id: "1B13", nom: "Mathematics", code: "MAT" },
          { id: "1B14", nom: "Biology", code: "BIO" },
          { id: "1B15", nom: "Chemistry", code: "CHM" },
          { id: "1B16", nom: "Physics", code: "PHY" },
          { id: "1B17", nom: "History", code: "HIS" },
          { id: "1B18", nom: "Geography", code: "GEO" },
          { id: "1B19", nom: "Economics", code: "ECO" },
          { id: "1B20", nom: "French", code: "FRE" },
          { id: "1B21", nom: "Religious Studies", code: "REL" },
          { id: "1B22", nom: "Commerce", code: "COM" },
          { id: "1B23", nom: "Accounting", code: "ACC" },
          { id: "1B24", nom: "Computer Science", code: "CSC" },
          { id: "1B25", nom: "Additional Mathematics", code: "AMT" },
          { id: "1B26", nom: "Food and Nutrition", code: "FNT" },
          { id: "1B27", nom: "Home Economics", code: "HEC" },
          { id: "1B28", nom: "Technical Drawing", code: "TDR" },
          { id: "1B29", nom: "Woodwork", code: "WOD" },
          { id: "1B30", nom: "Metalwork", code: "MET" },
          { id: "1B31", nom: "Cameroonian Culture", code: "CSC" }
        ]
      },
      
      // GCE Advanced Level (Anglophone)
      "1C": {
        id: "1C",
        nom: "GCE Advanced Level (Anglophone)",
        code: "GCE-A",
        levels: [
          { id: "1C1", nom: "Lower Sixth" },
          { id: "1C2", nom: "Upper Sixth" }
        ],
        matieres: [
          // Sciences
          { id: "1C11", nom: "Biology", code: "BIO" },
          { id: "1C12", nom: "Chemistry", code: "CHM" },
          { id: "1C13", nom: "Physics", code: "PHY" },
          { id: "1C14", nom: "Pure Mathematics", code: "PMA" },
          { id: "1C15", nom: "Further Mathematics", code: "FMA" },
          // Arts
          { id: "1C16", nom: "English Literature", code: "ELI" },
          { id: "1C17", nom: "History", code: "HIS" },
          { id: "1C18", nom: "Geography", code: "GEO" },
          { id: "1C19", nom: "French", code: "FRE" },
          { id: "1C20", nom: "Philosophy", code: "PHL" },
          // Social Sciences
          { id: "1C21", nom: "Economics", code: "ECO" },
          { id: "1C22", nom: "Business Studies", code: "BUS" },
          { id: "1C23", nom: "Accounting", code: "ACC" },
          { id: "1C24", nom: "Sociology", code: "SOC" },
          { id: "1C25", nom: "Psychology", code: "PSY" },
          { id: "1C26", nom: "Law", code: "LAW" },
          // Technical
          { id: "1C27", nom: "Computer Science", code: "CSC" },
          { id: "1C28", nom: "Physics with Electronics", code: "PHE" },
          { id: "1C29", nom: "Geology", code: "GEL" },
          { id: "1C30", nom: "Cameroonian Culture", code: "CSC" }
        ]
      },
      
      // ==================== ENSEIGNEMENT SUPÉRIEUR (UNIVERSITAIRE) ====================
      // Universitaire (Francophone & Anglophone) - AVEC DOCTORAT 7 ANS
      "1D": {
        id: "1D",
        nom: "Enseignement Supérieur (Universitaire)",
        code: "SUP",
        description: "Licence, Master, Doctorat (Bachelor, Master, PhD)",
        levels: [
          // Licence / Bachelor (3 ans)
          { id: "1D1", nom: "L1 / Year 1 (Bachelor)" },
          { id: "1D2", nom: "L2 / Year 2 (Bachelor)" },
          { id: "1D3", nom: "L3 / Year 3 (Bachelor)" },
          // Master (2 ans)
          { id: "1D4", nom: "M1 / Year 4 (Master)" },
          { id: "1D5", nom: "M2 / Year 5 (Master)" },
          // Doctorat / PhD (3 ans de recherche + thèse)
          { id: "1D6", nom: "D1 / PhD Year 1 (Doctorat)" },
          { id: "1D7", nom: "D2 / PhD Year 2 (Doctorat)" },
          { id: "1D8", nom: "D3 / PhD Year 3 (Doctorat)" },
          { id: "1D9", nom: "Doctorat / PhD (Soutenance de thèse)" }
        ],
        matieres: [
          // ========== DROIT / LAW ==========
          { id: "1D101", nom: "Droit Constitutionnel / Constitutional Law", code: "DRC" },
          { id: "1D102", nom: "Droit Civil / Civil Law", code: "DRV" },
          { id: "1D103", nom: "Droit Pénal / Criminal Law", code: "DRP" },
          { id: "1D104", nom: "Droit des Affaires / Business Law", code: "DRA" },
          { id: "1D105", nom: "Droit International / International Law", code: "DRI" },
          { id: "1D106", nom: "Droit Administratif / Administrative Law", code: "DAD" },
          { id: "1D107", nom: "Science Politique / Political Science", code: "SCP" },
          // ========== MÉDECINE / MEDICINE ==========
          { id: "1D108", nom: "Anatomie / Anatomy", code: "ANA" },
          { id: "1D109", nom: "Physiologie / Physiology", code: "PHY" },
          { id: "1D110", nom: "Pathologie / Pathology", code: "PAT" },
          { id: "1D111", nom: "Pharmacologie / Pharmacology", code: "PHA" },
          { id: "1D112", nom: "Médecine Interne / Internal Medicine", code: "MED" },
          { id: "1D113", nom: "Chirurgie / Surgery", code: "CHI" },
          { id: "1D114", nom: "Pédiatrie / Pediatrics", code: "PED" },
          { id: "1D115", nom: "Gynécologie / Gynecology", code: "GYN" },
          { id: "1D116", nom: "Santé Publique / Public Health", code: "SPU" },
          // ========== SCIENCES / SCIENCES ==========
          { id: "1D117", nom: "Mathématiques / Mathematics", code: "MAT" },
          { id: "1D118", nom: "Physique / Physics", code: "PHY" },
          { id: "1D119", nom: "Chimie / Chemistry", code: "CHM" },
          { id: "1D120", nom: "Biologie / Biology", code: "BIO" },
          { id: "1D121", nom: "Sciences de la Terre / Earth Sciences", code: "STE" },
          // ========== INFORMATIQUE / COMPUTER SCIENCE ==========
          { id: "1D122", nom: "Informatique / Computer Science", code: "INF" },
          { id: "1D123", nom: "Programmation Avancée / Advanced Programming", code: "PRA" },
          { id: "1D124", nom: "Systèmes Distribués / Distributed Systems", code: "SYD" },
          { id: "1D125", nom: "Intelligence Artificielle / Artificial Intelligence", code: "IA" },
          { id: "1D126", nom: "Génie Logiciel / Software Engineering", code: "GSL" },
          { id: "1D127", nom: "Cybersécurité / Cybersecurity", code: "SEC" },
          { id: "1D128", nom: "Data Science", code: "DSC" },
          // ========== INGÉNIERIE / ENGINEERING ==========
          { id: "1D129", nom: "Génie Civil / Civil Engineering", code: "GCI" },
          { id: "1D130", nom: "Génie Électrique / Electrical Engineering", code: "GEL" },
          { id: "1D131", nom: "Génie Mécanique / Mechanical Engineering", code: "GME" },
          { id: "1D132", nom: "Génie Informatique / Computer Engineering", code: "GIN" },
          { id: "1D133", nom: "Génie Énergétique / Energy Engineering", code: "GEN" },
          // ========== ÉCONOMIE / ECONOMICS ==========
          { id: "1D134", nom: "Microéconomie / Microeconomics", code: "MIC" },
          { id: "1D135", nom: "Macroéconomie / Macroeconomics", code: "MAC" },
          { id: "1D136", nom: "Économétrie / Econometrics", code: "ECO" },
          { id: "1D137", nom: "Économie du Développement / Development Economics", code: "EDE" },
          // ========== FINANCE / FINANCE ==========
          { id: "1D138", nom: "Finance d'Entreprise / Corporate Finance", code: "FIN" },
          { id: "1D139", nom: "Comptabilité / Accounting", code: "CPT" },
          { id: "1D140", nom: "Audit et Contrôle / Audit and Control", code: "AUD" },
          { id: "1D141", nom: "Marchés Financiers / Financial Markets", code: "MAR" },
          // ========== MARKETING / MARKETING ==========
          { id: "1D142", nom: "Marketing Digital / Digital Marketing", code: "MKD" },
          { id: "1D143", nom: "Marketing Stratégique / Strategic Marketing", code: "MKS" },
          // ========== MANAGEMENT ==========
          { id: "1D144", nom: "Gestion des RH / HR Management", code: "GRH" },
          { id: "1D145", nom: "Management Stratégique / Strategic Management", code: "MGS" },
          { id: "1D146", nom: "Entrepreneuriat / Entrepreneurship", code: "ENT" },
          { id: "1D147", nom: "Management de Projet / Project Management", code: "MGP" },
          { id: "1D148", nom: "Management des Opérations / Operations Management", code: "MGO" },
          // ========== SCIENCES SOCIALES ==========
          { id: "1D149", nom: "Sociologie / Sociology", code: "SOC" },
          { id: "1D150", nom: "Anthropologie / Anthropology", code: "ANT" },
          { id: "1D151", nom: "Psychologie / Psychology", code: "PSY" },
          { id: "1D152", nom: "Pédagogie / Pedagogy", code: "PED" },
          // ========== CULTURE ==========
          { id: "1D153", nom: "Culture et Spiritualité Camerounaise", code: "CSC" },
          { id: "1D154", nom: "Histoire du Cameroun / Cameroonian History", code: "HIS" },
          { id: "1D155", nom: "Langues Nationales / National Languages", code: "LAN" },
          { id: "1D156", nom: "Méthodologie de Recherche / Research Methodology", code: "MTR" },
          { id: "1D157", nom: "Rédaction de Thèse / Thesis Writing", code: "THE" },
          { id: "1D158", nom: "Publication Scientifique / Scientific Publication", code: "PUB" },
          { id: "1D159", nom: "Éthique et Déontologie / Ethics", code: "ETH" }
        ]
      }
    }
  },

  // ==================== DOMAINE 2: PROFESSIONNEL ====================
  "2": {
    id: 2,
    nom: "Professionnel",
    code: "PRO",
    description: "Formation technique et professionnelle",
    sousDomaines: {
      "21": {
        id: 21,
        nom: "Compétences Professionnelles",
        code: "COM",
        levels: [
          { id: 211, nom: "CAP" }, { id: 212, nom: "BEP" },
          { id: 213, nom: "BTS" }, { id: 214, nom: "HND" },
          { id: 215, nom: "Certificat Professionnel" },
          { id: 216, nom: "Licence Pro" }, { id: 217, nom: "Master Pro" }
        ],
        matieres: [
          { id: 2111, nom: "Agriculture Générale", code: "AGR" },
          { id: 2112, nom: "Agro-industrie", code: "AGI" },
          { id: 2113, nom: "Élevage", code: "ELE" },
          { id: 2114, nom: "Pisciculture", code: "PIS" },
          { id: 2115, nom: "Agronomie", code: "AGO" },
          { id: 2116, nom: "Machinisme Agricole", code: "MAC" },
          { id: 2117, nom: "BTP", code: "BTP" },
          { id: 2118, nom: "Topographie", code: "TOP" },
          { id: 2119, nom: "Architecture", code: "ARC" },
          { id: 2120, nom: "Matériaux", code: "MAT" },
          { id: 2121, nom: "Électricité Bâtiment", code: "ELB" },
          { id: 2122, nom: "Mécanique Automobile", code: "MAU" },
          { id: 2123, nom: "Maintenance industrielle", code: "MAI" },
          { id: 2124, nom: "Électrotechnique", code: "ELE" },
          { id: 2125, nom: "Automatisme", code: "AUT" },
          { id: 2126, nom: "Usinage", code: "USI" },
          { id: 2127, nom: "Soudure", code: "SOU" },
          { id: 2128, nom: "Informatique", code: "INF" },
          { id: 2129, nom: "Réseaux", code: "RES" },
          { id: 2130, nom: "Développement Web", code: "WEB" },
          { id: 2131, nom: "Développement Mobile", code: "MOB" },
          { id: 2132, nom: "Bases de Données", code: "BDD" },
          { id: 2133, nom: "Cybersécurité", code: "SEC" },
          { id: 2134, nom: "Cloud Computing", code: "CLD" },
          { id: 2135, nom: "DevOps", code: "DEV" },
          { id: 2136, nom: "Gestion", code: "GES" },
          { id: 2137, nom: "Comptabilité", code: "CPT" },
          { id: 2138, nom: "Finance d'Entreprise", code: "FIN" },
          { id: 2139, nom: "Marketing", code: "MKT" },
          { id: 2140, nom: "Vente", code: "VEN" },
          { id: 2141, nom: "Logistique", code: "LOG" },
          { id: 2142, nom: "Hôtellerie", code: "HOT" },
          { id: 2143, nom: "Restauration", code: "RES" },
          { id: 2144, nom: "Tourisme", code: "TOU" },
          { id: 2145, nom: "Événementiel", code: "EVE" },
          { id: 2146, nom: "Soins Infirmiers", code: "SOI" },
          { id: 2147, nom: "Santé Communautaire", code: "SAC" },
          { id: 2148, nom: "Assistance Sociale", code: "ASS" },
          { id: 2149, nom: "Petite Enfance", code: "PEN" },
          { id: 2150, nom: "Couture", code: "COU" },
          { id: 2151, nom: "Stylisme", code: "STY" },
          { id: 2152, nom: "Coiffure", code: "COI" },
          { id: 2153, nom: "Esthétique", code: "EST" },
          { id: 2154, nom: "Art et Artisanat", code: "ART" },
          { id: 2155, nom: "Design", code: "DES" },
          { id: 2156, nom: "Culture et Spiritualité Camerounaise", code: "CSC" }
        ]
      },
      "22": {
        id: 22,
        nom: "Management",
        code: "MGT",
        levels: [
          { id: 221, nom: "Licence" }, { id: 222, nom: "Master" },
          { id: 223, nom: "MBA" }, { id: 224, nom: "Certificat Professionnel" },
          { id: 225, nom: "Executive Education" }
        ],
        matieres: [
          { id: 2211, nom: "Management de Projet", code: "MGP" },
          { id: 2212, nom: "Management Stratégique", code: "MGS" },
          { id: 2213, nom: "Management des RH", code: "MGR" },
          { id: 2214, nom: "Management Financier", code: "MGF" },
          { id: 2215, nom: "Management des Opérations", code: "MGO" },
          { id: 2216, nom: "Management Interculturel", code: "MGI" },
          { id: 2217, nom: "Management de la Qualité", code: "MGQ" },
          { id: 2218, nom: "Management des SI", code: "MGS" },
          { id: 2219, nom: "Management du Changement", code: "MGC" },
          { id: 2220, nom: "Management des Organisations", code: "MGO" },
          { id: 2221, nom: "Entrepreneuriat et Leadership", code: "ENT" },
          { id: 2222, nom: "Gestion de Chaîne Logistique", code: "GCL" },
          { id: 2223, nom: "Management International", code: "MGI" },
          { id: 2224, nom: "Management Public", code: "MGP" },
          { id: 2225, nom: "Management de l'Innovation", code: "MGI" },
          { id: 2226, nom: "Management du Développement Durable", code: "MGD" },
          { id: 2227, nom: "Culture et Spiritualité Camerounaise", code: "CSC" }
        ]
      },
      "23": {
        id: 23,
        nom: "Numérique et Technologies Émergentes",
        code: "DIG",
        levels: [
          { id: 231, nom: "Certification" },
          { id: 232, nom: "Licence Pro" },
          { id: 233, nom: "Master Pro" },
          { id: 234, nom: "Bootcamp" },
          { id: 235, nom: "Formation Continue" }
        ],
        matieres: [
          { id: 2311, nom: "Data Science", code: "DSC" },
          { id: 2312, nom: "Intelligence Artificielle", code: "IA" },
          { id: 2313, nom: "DevOps", code: "DEV" },
          { id: 2314, nom: "Cloud Computing", code: "CLD" },
          { id: 2315, nom: "Cybersécurité", code: "SEC" },
          { id: 2316, nom: "UI/UX Design", code: "UIX" },
          { id: 2317, nom: "Blockchain", code: "BLC" },
          { id: 2318, nom: "IoT", code: "IOT" },
          { id: 2319, nom: "Product Management", code: "PDM" },
          { id: 2320, nom: "Tech Leadership", code: "TLD" },
          { id: 2321, nom: "Low-Code/No-Code", code: "LCN" },
          { id: 2322, nom: "RPA", code: "RPA" },
          { id: 2323, nom: "QA & Testing", code: "QAT" },
          { id: 2324, nom: "Mobile Development", code: "MOB" },
          { id: 2325, nom: "Web3 Development", code: "W3D" }
        ]
      },
      "24": {
        id: 24,
        nom: "Énergies Renouvelables et Environnement",
        code: "ENE",
        levels: [
          { id: 241, nom: "CAP" },
          { id: 242, nom: "BTS" },
          { id: 243, nom: "Licence Pro" },
          { id: 244, nom: "Master" }
        ],
        matieres: [
          { id: 2411, nom: "Solaire Photovoltaïque", code: "PV" },
          { id: 2412, nom: "Solaire Thermique", code: "STH" },
          { id: 2413, nom: "Éolien", code: "EOL" },
          { id: 2414, nom: "Biomasse", code: "BIO" },
          { id: 2415, nom: "Hydroélectricité", code: "HYD" },
          { id: 2416, nom: "Efficacité Énergétique", code: "EFE" },
          { id: 2417, nom: "Smart Grids", code: "SGR" },
          { id: 2418, nom: "Stockage d'Énergie", code: "STE" },
          { id: 2419, nom: "Écologie Industrielle", code: "ECI" },
          { id: 2420, nom: "Gestion des Déchets", code: "GDE" },
          { id: 2421, nom: "Traitement des Eaux", code: "TEA" },
          { id: 2422, nom: "Qualité de l'Air", code: "QAR" },
          { id: 2423, nom: "Énergie Rural", code: "ERU" },
          { id: 2424, nom: "Financement ENR", code: "FEN" }
        ]
      },
      "25": {
        id: 25,
        nom: "Agro-industrie Moderne et Agritech",
        code: "AGR",
        levels: [
          { id: 251, nom: "CAP" },
          { id: 252, nom: "BTS" },
          { id: 253, nom: "Licence Pro" },
          { id: 254, nom: "Master" }
        ],
        matieres: [
          { id: 2511, nom: "Agriculture de Précision", code: "APR" },
          { id: 2512, nom: "Agritech Digital", code: "AGT" },
          { id: 2513, nom: "Hydroponie et Aquaponie", code: "HYA" },
          { id: 2514, nom: "Agriculture Biologique", code: "ABI" },
          { id: 2515, nom: "Semences Améliorées", code: "SMA" },
          { id: 2516, nom: "Transformation Digitale Agricole", code: "TDA" },
          { id: 2517, nom: "Bioéconomie", code: "BEC" },
          { id: 2518, nom: "Irrigation Moderne", code: "IRM" },
          { id: 2519, nom: "Agriculture Verticale", code: "AVT" },
          { id: 2520, nom: "Gestion Post-Récolte", code: "GPR" },
          { id: 2521, nom: "Certification Qualité", code: "CQU" },
          { id: 2522, nom: "Agriculture Contractuelle", code: "ACT" }
        ]
      },
      "26": {
        id: 26,
        nom: "Économie Informelle et TPE/PME",
        code: "ECO",
        levels: [
          { id: 261, nom: "Formation de base" },
          { id: 262, nom: "Perfectionnement" },
          { id: 263, nom: "Certification" }
        ],
        matieres: [
          { id: 2611, nom: "Création d'Entreprise", code: "CRE" },
          { id: 2612, nom: "Gestion Financière Simplifiée", code: "GFS" },
          { id: 2613, nom: "Marketing Digital Local", code: "MDL" },
          { id: 2614, nom: "E-commerce pour TPE", code: "ECO" },
          { id: 2615, nom: "Microfinance", code: "MIC" },
          { id: 2616, nom: "Formalisation d'Entreprise", code: "FOR" },
          { id: 2617, nom: "Gestion des Stocks", code: "GST" },
          { id: 2618, nom: "Service Client", code: "SCL" },
          { id: 2619, nom: "Négociation et Vente", code: "NEV" },
          { id: 2620, nom: "Économie Circulaire", code: "CIR" },
          { id: 2621, nom: "Franchise et Réseau", code: "FRA" },
          { id: 2622, nom: "Digitalisation des Processus", code: "DIP" },
          { id: 2623, nom: "Gestion des RH", code: "GRH" }
        ]
      },
      "27": {
        id: 27,
        nom: "Logistique et Transport Modernes",
        code: "LOG",
        levels: [
          { id: 271, nom: "BTS" },
          { id: 272, nom: "Licence Pro" },
          { id: 273, nom: "Master" }
        ],
        matieres: [
          { id: 2711, nom: "E-logistique", code: "ELO" },
          { id: 2712, nom: "Transport Frigorifique", code: "TFR" },
          { id: 2713, nom: "Douanes Modernisées", code: "DOU" },
          { id: 2714, nom: "Supply Chain Durable", code: "SCD" },
          { id: 2715, nom: "Gestion des Flux", code: "GFL" },
          { id: 2716, nom: "Transport Multimodal", code: "TMU" },
          { id: 2717, nom: "Dernier Kilomètre", code: "DKI" },
          { id: 2718, nom: "Entreposage", code: "ENT" },
          { id: 2719, nom: "Gestion des Risques", code: "GRI" },
          { id: 2720, nom: "Transport International", code: "TIN" }
        ]
      },
      "28": {
        id: 28,
        nom: "Industries Créatives et Médias",
        code: "CRE",
        levels: [
          { id: 281, nom: "Certification" },
          { id: 282, nom: "Bachelor" },
          { id: 283, nom: "Master" }
        ],
        matieres: [
          { id: 2811, nom: "Game Design", code: "GAM" },
          { id: 2812, nom: "Animation 3D", code: "A3D" },
          { id: 2813, nom: "Production Audiovisuelle", code: "PAU" },
          { id: 2814, nom: "Journalisme Numérique", code: "JNU" },
          { id: 2815, nom: "Community Management", code: "COM" },
          { id: 2816, nom: "Création de Contenu", code: "CCN" },
          { id: 2817, nom: "Streaming", code: "STR" },
          { id: 2818, nom: "Podcast Production", code: "POD" },
          { id: 2819, nom: "Marketing d'Influence", code: "MIN" },
          { id: 2820, nom: "Réalité Virtuelle/Augmentée", code: "RVA" },
          { id: 2821, nom: "Motion Design", code: "MOT" },
          { id: 2822, nom: "Sound Design", code: "SOU" }
        ]
      },
      "29": {
        id: 29,
        nom: "Santé Moderne et Bien-être",
        code: "SAN",
        levels: [
          { id: 291, nom: "Auxiliaire" },
          { id: 292, nom: "Technicien" },
          { id: 293, nom: "Spécialiste" }
        ],
        matieres: [
          { id: 2911, nom: "Télémédecine", code: "TEL" },
          { id: 2912, nom: "Gérontologie", code: "GER" },
          { id: 2913, nom: "Nutrition Clinique", code: "NUC" },
          { id: 2914, nom: "Santé Mentale", code: "SME" },
          { id: 2915, nom: "Médical Devices", code: "MDE" },
          { id: 2916, nom: "E-santé", code: "ESA" },
          { id: 2917, nom: "Santé au Travail", code: "SAT" },
          { id: 2918, nom: "Soins Palliatifs", code: "SPA" },
          { id: 2919, nom: "Réadaptation", code: "REA" },
          { id: 2920, nom: "Pharmacie d'Officine", code: "PHA" }
        ]
      },
      "210": {
        id: 210,
        nom: "Écotourisme et Tourisme Durable",
        code: "TOU",
        levels: [
          { id: 2101, nom: "Guide" },
          { id: 2102, nom: "Technicien" },
          { id: 2103, nom: "Manager" }
        ],
        matieres: [
          { id: 21011, nom: "Écotourisme", code: "ECO" },
          { id: 21012, nom: "Tourisme Médical", code: "TME" },
          { id: 21013, nom: "Digital Travel", code: "DTR" },
          { id: 21014, nom: "Tourisme Durable", code: "TDU" },
          { id: 21015, nom: "Patrimoine Culturel", code: "PAC" },
          { id: 21016, nom: "Agritourisme", code: "AGR" },
          { id: 21017, nom: "Tourisme d'Aventure", code: "TAV" },
          { id: 21018, nom: "Gestion Hôtelière", code: "GHO" },
          { id: 21019, nom: "Gastronomie Locale", code: "GAL" },
          { id: 21020, nom: "Marketing Touristique", code: "MTO" }
        ]
      },
      "211": {
        id: 211,
        nom: "BTP et Urbanisme du Futur",
        code: "BTP",
        levels: [
          { id: 2111, nom: "Ouvrier" },
          { id: 2112, nom: "Technicien" },
          { id: 2113, nom: "Ingénieur" }
        ],
        matieres: [
          { id: 21111, nom: "Smart Building", code: "SBL" },
          { id: 21112, nom: "BIM", code: "BIM" },
          { id: 21113, nom: "Urbanisme Durable", code: "URB" },
          { id: 21114, nom: "Matériaux Innovants", code: "MIN" },
          { id: 21115, nom: "Rénovation Énergétique", code: "REN" },
          { id: 21116, nom: "Construction Modulaire", code: "CMO" },
          { id: 21117, nom: "Sécurité Chantier", code: "SEC" },
          { id: 21118, nom: "Gestion de Projet BTP", code: "GPB" },
          { id: 21119, nom: "Infrastructure Durable", code: "INF" }
        ]
      }
    }
  },

  // ==================== DOMAINE 3: SPIRITUALITÉ ET CULTURE ====================
  "3": {
    id: 3,
    nom: "Spiritualité et Culture Camerounaise",
    code: "CUL",
    description: "Patrimoine national, traditions et valeurs",
    sousDomaines: {
      "31": {
        id: 31,
        nom: "Rites et Traditions",
        code: "RIT",
        levels: [{ id: 311, nom: "Tous niveaux" }],
        matieres: [
          { id: 3111, nom: "Rites de passage", code: "RPA" },
          { id: 3112, nom: "Mariage traditionnel", code: "MAR" },
          { id: 3113, nom: "Culte des ancêtres", code: "CAN" },
          { id: 3114, nom: "Symbolique des masques et totems", code: "MAS" },
          { id: 3115, nom: "Calendrier traditionnel", code: "CAL" },
          { id: 3116, nom: "Chefferie traditionnelle", code: "CHE" }
        ]
      },
      "32": {
        id: 32,
        nom: "Histoire",
        code: "HIS",
        levels: [{ id: 321, nom: "Tous niveaux" }],
        matieres: [
          { id: 3211, nom: "Royaumes précoloniaux", code: "ROY" },
          { id: 3212, nom: "Colonisation allemande", code: "COL" },
          { id: 3213, nom: "Période franco-britannique", code: "FRA" },
          { id: 3214, nom: "Indépendance (1960)", code: "IND" },
          { id: 3215, nom: "Réunification (1961-1972)", code: "REU" },
          { id: 3216, nom: "Grandes figures historiques", code: "FIG" },
          { id: 3217, nom: "Histoire des peuples", code: "PEU" }
        ]
      },
      "33": {
        id: 33,
        nom: "Ethnies",
        code: "ETH",
        levels: [{ id: 331, nom: "Tous niveaux" }],
        matieres: [
          { id: 3311, nom: "Fang-Beti", code: "FAN" },
          { id: 3312, nom: "Sawa", code: "SAW" },
          { id: 3313, nom: "Bamiléké", code: "BAM" },
          { id: 3314, nom: "Bassa", code: "BAS" },
          { id: 3315, nom: "Kirdi", code: "KIR" },
          { id: 3316, nom: "Peulh", code: "PEU" },
          { id: 3317, nom: "Béti", code: "BET" },
          { id: 3318, nom: "Bulu", code: "BUL" },
          { id: 3319, nom: "Douala", code: "DOU" },
          { id: 3320, nom: "Tikar", code: "TIK" },
          { id: 3321, nom: "Maka", code: "MAK" }
        ]
      },
      "34": {
        id: 34,
        nom: "Langues et Savoirs Traditionnels",
        code: "LAN",
        levels: [{ id: 341, nom: "Tous niveaux" }],
        matieres: [
          { id: 3411, nom: "Langues nationales", code: "LAN" },
          { id: 3412, nom: "Médecine traditionnelle", code: "MED" },
          { id: 3413, nom: "Artisanat local", code: "ART" },
          { id: 3414, nom: "Contes et légendes", code: "CON" },
          { id: 3415, nom: "Musique et danse traditionnelle", code: "MUS" },
          { id: 3416, nom: "Architecture traditionnelle", code: "ARC" },
          { id: 3417, nom: "Gastronomie", code: "GAS" },
          { id: 3418, nom: "Sagesse et proverbes", code: "SAG" }
        ]
      }
    }
  }
};

// ==================== FONCTIONS UTILITAIRES ====================

export const getDomainById = (id) => DOMAIN_DATA[String(id)];
export const getDomainNom = (id) => DOMAIN_DATA[String(id)]?.nom || '';
export const getDomainCode = (id) => DOMAIN_DATA[String(id)]?.code || '';

export const getSousDomaineById = (domainId, sousDomaineId) => {
  return DOMAIN_DATA[String(domainId)]?.sousDomaines[String(sousDomaineId)];
};
export const getSousDomaineNom = (domainId, sousDomaineId) => {
  return DOMAIN_DATA[String(domainId)]?.sousDomaines[String(sousDomaineId)]?.nom || '';
};
export const getSousDomaineCode = (domainId, sousDomaineId) => {
  return DOMAIN_DATA[String(domainId)]?.sousDomaines[String(sousDomaineId)]?.code || '';
};

export const getLevelNom = (domainId, sousDomaineId, levelId) => {
  const domain = DOMAIN_DATA[String(domainId)];
  if (!domain) return '';
  const sousDomaine = domain.sousDomaines[String(sousDomaineId)];
  if (!sousDomaine) return '';
  const levelIdStr = String(levelId);
  const level = sousDomaine.levels?.find(l => String(l.id) === levelIdStr);
  return level?.nom || '';
};

export const getMatiereNom = (domainId, sousDomaineId, matiereId) => {
  const domain = DOMAIN_DATA[String(domainId)];
  if (!domain) return '';
  const sousDomaine = domain.sousDomaines[String(sousDomaineId)];
  if (!sousDomaine) return '';
  const matiereIdStr = String(matiereId);
  const matiere = sousDomaine.matieres?.find(m => String(m.id) === matiereIdStr);
  return matiere?.nom || '';
};

export const getMatiereCode = (domainId, sousDomaineId, matiereId) => {
  const domain = DOMAIN_DATA[String(domainId)];
  if (!domain) return '';
  const sousDomaine = domain.sousDomaines[String(sousDomaineId)];
  if (!sousDomaine) return '';
  const matiereIdStr = String(matiereId);
  const matiere = sousDomaine.matieres?.find(m => String(m.id) === matiereIdStr);
  return matiere?.code || '';
};

export const getAllDomaines = () => {
  return Object.values(DOMAIN_DATA).map(d => ({ id: String(d.id), nom: d.nom, code: d.code }));
};

export const getAllSousDomaines = (domainId) => {
  if (!domainId) return [];
  const domain = DOMAIN_DATA[String(domainId)];
  if (!domain) return [];
  return Object.values(domain.sousDomaines).map(sd => ({ id: String(sd.id), nom: sd.nom, code: sd.code }));
};

export const getAllLevels = (domainId, sousDomaineId) => {
  if (!domainId || !sousDomaineId) return [];
  const domain = DOMAIN_DATA[String(domainId)];
  if (!domain) return [];
  const sousDomaine = domain.sousDomaines[String(sousDomaineId)];
  if (!sousDomaine) return [];
  return sousDomaine.levels.map(l => ({ id: String(l.id), nom: l.nom }));
};

export const getAllMatieres = (domainId, sousDomaineId) => {
  if (!domainId || !sousDomaineId) return [];
  const domain = DOMAIN_DATA[String(domainId)];
  if (!domain) return [];
  const sousDomaine = domain.sousDomaines[String(sousDomaineId)];
  if (!sousDomaine) return [];
  return sousDomaine.matieres.map(m => ({ id: String(m.id), nom: m.nom, code: m.code }));
};

// Fonction pour générer l'examCode
export const generateExamCode = (matiereId, levelId, teacherMatricule, order) => {
  const matiereCode = getMatiereCode('1', '12', matiereId) || String(matiereId).padStart(2, '0');
  const levelCode = String(levelId).slice(-2);
  return `${matiereCode}-${levelCode}-${teacherMatricule}-${String(order).padStart(2, '0')}`;
};

export default DOMAIN_DATA;