// src/utils/examConfig.js
// Configuration centralisée des épreuves (A à K)

export const EXAM_CONFIGURATIONS = {
  A: { 
    label: 'Collective Figée', 
    color: '#ef4444', 
    isOpenRange: false, 
    showResult: 'binary', 
    allowRetry: false,
    description: 'Plage fermée · Séquentiel figé · Même QCM · Résultat binaire · Pas de reprise'
  },
  B: { 
    label: 'Collective Souple', 
    color: '#ef4444', 
    isOpenRange: false, 
    showResult: 'binaryPlus', 
    allowRetry: false,
    description: 'Plage fermée · Séquentiel figé · Même QCM · Résultat binaire+ · Pas de reprise'
  },
  C: { 
    label: 'Personnalisée', 
    color: '#ef4444', 
    isOpenRange: false, 
    showResult: 'none', 
    allowRetry: false,
    description: 'Plage fermée · Séquentiel figé · Même QCM · Pas de résultat · Pas de reprise'
  },
  D: { 
    label: 'Aléatoire', 
    color: '#f59e0b', 
    isOpenRange: false, 
    showResult: 'binary', 
    allowRetry: false,
    description: 'Plage fermée · Séquentiel figé · QCM aléatoire · Résultat binaire · Pas de reprise'
  },
  E: { 
    label: 'Aléatoire+', 
    color: '#f59e0b', 
    isOpenRange: false, 
    showResult: 'binaryPlus', 
    allowRetry: false,
    description: 'Plage fermée · Séquentiel figé · QCM aléatoire · Résultat binaire+ · Pas de reprise'
  },
  F: { 
    label: 'Aléatoire Libre', 
    color: '#f59e0b', 
    isOpenRange: false, 
    showResult: 'none', 
    allowRetry: false,
    description: 'Plage fermée · Séquentiel figé · QCM aléatoire · Pas de résultat · Pas de reprise'
  },
  G: { 
    label: 'Plage Ouverte + Reprise', 
    color: '#10b981', 
    isOpenRange: true, 
    showResult: 'binary', 
    allowRetry: true,
    description: 'Plage ouverte · Résultat binaire · Reprise OK'
  },
  H: { 
    label: 'Plage Ouverte', 
    color: '#10b981', 
    isOpenRange: true, 
    showResult: 'binary', 
    allowRetry: false,
    description: 'Plage ouverte · Résultat binaire · No Reply'
  },
  I: { 
    label: 'Plage Ouverte+', 
    color: '#10b981', 
    isOpenRange: true, 
    showResult: 'binaryPlus', 
    allowRetry: true,
    description: 'Plage ouverte · Résultat binaire+ · Reprise OK'
  },
  J: { 
    label: 'Plage Ouverte++', 
    color: '#10b981', 
    isOpenRange: true, 
    showResult: 'binaryPlus', 
    allowRetry: false,
    description: 'Plage ouverte · Résultat binaire+ · No Reply'
  },
  K: { 
    label: 'Plage Ouverte Libre', 
    color: '#10b981', 
    isOpenRange: true, 
    showResult: 'none', 
    allowRetry: false,
    description: 'Plage ouverte · Pas de résultat · No Reply'
  }
};

export const getExamConfig = (option) => {
  return EXAM_CONFIGURATIONS[option] || EXAM_CONFIGURATIONS['C'];
};

export const getOptionColor = (option) => {
  const config = getExamConfig(option);
  return config.color;
};

export const getOptionLabel = (option) => {
  const config = getExamConfig(option);
  return config.label;
};

export const getOptionDescription = (option) => {
  const config = getExamConfig(option);
  return config.description;
};

export const EXAM_OPTIONS_LIST = Object.keys(EXAM_CONFIGURATIONS).map(key => ({
  key,
  ...EXAM_CONFIGURATIONS[key]
}));