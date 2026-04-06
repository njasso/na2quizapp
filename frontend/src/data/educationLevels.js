// src/data/educationLevels.js
// src/data/educationLevels.js
// Niveaux d'éducation du système camerounais (Francophone + Anglophone)

export const educationLevels = [
  {
    id: "primary",
    name: "Primaire",
    nameEn: "Primary",
    code: "PRI",
    subLevels: [
      { id: "pri_sil", name: "SIL", nameEn: "SIL", order: 1 },
      { id: "pri_cp", name: "CP", nameEn: "CP", order: 2 },
      { id: "pri_ce1", name: "CE1", nameEn: "CE1", order: 3 },
      { id: "pri_ce2", name: "CE2", nameEn: "CE2", order: 4 },
      { id: "pri_cm1", name: "CM1", nameEn: "CM1", order: 5 },
      { id: "pri_cm2", name: "CM2", nameEn: "CM2", order: 6 }
    ]
  },
  {
    id: "primary_en",
    name: "Primary School (Anglophone)",
    nameEn: "Primary School (Anglophone)",
    code: "PRI-EN",
    subLevels: [
      { id: "pri_nursery1", name: "Nursery 1", nameEn: "Nursery 1", order: 1 },
      { id: "pri_nursery2", name: "Nursery 2", nameEn: "Nursery 2", order: 2 },
      { id: "pri_class1", name: "Class 1", nameEn: "Class 1", order: 3 },
      { id: "pri_class2", name: "Class 2", nameEn: "Class 2", order: 4 },
      { id: "pri_class3", name: "Class 3", nameEn: "Class 3", order: 5 },
      { id: "pri_class4", name: "Class 4", nameEn: "Class 4", order: 6 },
      { id: "pri_class5", name: "Class 5", nameEn: "Class 5", order: 7 },
      { id: "pri_class6", name: "Class 6", nameEn: "Class 6", order: 8 }
    ]
  },
  {
    id: "secondary",
    name: "Secondaire Général",
    nameEn: "Secondary General",
    code: "SEC",
    subLevels: [
      { id: "sec_6e", name: "6e", nameEn: "Form 1", order: 1 },
      { id: "sec_5e", name: "5e", nameEn: "Form 2", order: 2 },
      { id: "sec_4e", name: "4e", nameEn: "Form 3", order: 3 },
      { id: "sec_3e", name: "3e", nameEn: "Form 4", order: 4 },
      { id: "sec_2nde_a", name: "2nde A", nameEn: "Lower Sixth A", order: 5 },
      { id: "sec_1ere_a", name: "1ère A", nameEn: "Upper Sixth A", order: 6 },
      { id: "sec_terminale_a", name: "Terminale A", nameEn: "Final Year A", order: 7 },
      { id: "sec_2nde_c", name: "2nde C", nameEn: "Lower Sixth C", order: 8 },
      { id: "sec_1ere_c", name: "1ère C", nameEn: "Upper Sixth C", order: 9 },
      { id: "sec_terminale_c", name: "Terminale C", nameEn: "Final Year C", order: 10 },
      { id: "sec_2nde_d", name: "2nde D", nameEn: "Lower Sixth D", order: 11 },
      { id: "sec_1ere_d", name: "1ère D", nameEn: "Upper Sixth D", order: 12 },
      { id: "sec_terminale_d", name: "Terminale D", nameEn: "Final Year D", order: 13 },
      { id: "sec_2nde_e", name: "2nde E", nameEn: "Lower Sixth E", order: 14 },
      { id: "sec_1ere_e", name: "1ère E", nameEn: "Upper Sixth E", order: 15 },
      { id: "sec_terminale_e", name: "Terminale E", nameEn: "Final Year E", order: 16 },
      { id: "sec_2nde_f", name: "2nde F", nameEn: "Lower Sixth F", order: 17 },
      { id: "sec_1ere_f", name: "1ère F", nameEn: "Upper Sixth F", order: 18 },
      { id: "sec_terminale_f", name: "Terminale F", nameEn: "Final Year F", order: 19 }
    ]
  },
  {
    id: "secondary_en",
    name: "Secondary School (Anglophone)",
    nameEn: "Secondary School (Anglophone)",
    code: "SEC-EN",
    subLevels: [
      { id: "sec_form1", name: "Form 1", nameEn: "Form 1", order: 1 },
      { id: "sec_form2", name: "Form 2", nameEn: "Form 2", order: 2 },
      { id: "sec_form3", name: "Form 3", nameEn: "Form 3", order: 3 },
      { id: "sec_form4", name: "Form 4", nameEn: "Form 4", order: 4 },
      { id: "sec_form5", name: "Form 5", nameEn: "Form 5", order: 5 }
    ]
  },
  {
    id: "secondary_technical",
    name: "Secondaire Technique",
    nameEn: "Technical Secondary",
    code: "TEC",
    subLevels: [
      { id: "tec_2nde_f1", name: "2nde F1", nameEn: "Lower Sixth F1", order: 1 },
      { id: "tec_1ere_f1", name: "1ère F1", nameEn: "Upper Sixth F1", order: 2 },
      { id: "tec_terminale_f1", name: "Terminale F1", nameEn: "Final Year F1", order: 3 },
      { id: "tec_2nde_f2", name: "2nde F2", nameEn: "Lower Sixth F2", order: 4 },
      { id: "tec_1ere_f2", name: "1ère F2", nameEn: "Upper Sixth F2", order: 5 },
      { id: "tec_terminale_f2", name: "Terminale F2", nameEn: "Final Year F2", order: 6 },
      { id: "tec_2nde_f3", name: "2nde F3", nameEn: "Lower Sixth F3", order: 7 },
      { id: "tec_1ere_f3", name: "1ère F3", nameEn: "Upper Sixth F3", order: 8 },
      { id: "tec_terminale_f3", name: "Terminale F3", nameEn: "Final Year F3", order: 9 },
      { id: "tec_2nde_f4", name: "2nde F4", nameEn: "Lower Sixth F4", order: 10 },
      { id: "tec_1ere_f4", name: "1ère F4", nameEn: "Upper Sixth F4", order: 11 },
      { id: "tec_terminale_f4", name: "Terminale F4", nameEn: "Final Year F4", order: 12 },
      { id: "tec_2nde_f5", name: "2nde F5", nameEn: "Lower Sixth F5", order: 13 },
      { id: "tec_1ere_f5", name: "1ère F5", nameEn: "Upper Sixth F5", order: 14 },
      { id: "tec_terminale_f5", name: "Terminale F5", nameEn: "Final Year F5", order: 15 },
      { id: "tec_2nde_f6", name: "2nde F6", nameEn: "Lower Sixth F6", order: 16 },
      { id: "tec_1ere_f6", name: "1ère F6", nameEn: "Upper Sixth F6", order: 17 },
      { id: "tec_terminale_f6", name: "Terminale F6", nameEn: "Final Year F6", order: 18 }
    ]
  },
  {
    id: "gce_advanced",
    name: "GCE Advanced Level",
    nameEn: "GCE Advanced Level",
    code: "GCE-A",
    subLevels: [
      { id: "gce_lower_sixth", name: "Lower Sixth", nameEn: "Lower Sixth", order: 1 },
      { id: "gce_upper_sixth", name: "Upper Sixth", nameEn: "Upper Sixth", order: 2 }
    ]
  },
  {
    id: "university",
    name: "Universitaire",
    nameEn: "University",
    code: "UNI",
    subLevels: [
      { id: "uni_l1", name: "L1 / Year 1", nameEn: "Bachelor Year 1", order: 1 },
      { id: "uni_l2", name: "L2 / Year 2", nameEn: "Bachelor Year 2", order: 2 },
      { id: "uni_l3", name: "L3 / Year 3", nameEn: "Bachelor Year 3", order: 3 },
      { id: "uni_m1", name: "M1 / Year 4", nameEn: "Master Year 1", order: 4 },
      { id: "uni_m2", name: "M2 / Year 5", nameEn: "Master Year 2", order: 5 },
      { id: "uni_d1", name: "D1 / PhD Year 1", nameEn: "PhD Year 1", order: 6 },
      { id: "uni_d2", name: "D2 / PhD Year 2", nameEn: "PhD Year 2", order: 7 },
      { id: "uni_d3", name: "D3 / PhD Year 3", nameEn: "PhD Year 3", order: 8 },
      { id: "uni_doctorat", name: "Doctorat / PhD", nameEn: "Doctorate / PhD", order: 9 }
    ]
  },
  {
    id: "professional",
    name: "Professionnel",
    nameEn: "Professional",
    code: "PRO",
    subLevels: [
      { id: "pro_cap", name: "CAP", nameEn: "CAP", order: 1 },
      { id: "pro_bep", name: "BEP", nameEn: "BEP", order: 2 },
      { id: "pro_bts", name: "BTS", nameEn: "BTS", order: 3 },
      { id: "pro_hnd", name: "HND", nameEn: "HND", order: 4 },
      { id: "pro_licence_pro", name: "Licence Pro", nameEn: "Professional Bachelor", order: 5 },
      { id: "pro_master_pro", name: "Master Pro", nameEn: "Professional Master", order: 6 },
      { id: "pro_certificat", name: "Certificat Professionnel", nameEn: "Professional Certificate", order: 7 }
    ]
  }
];

// Fonctions utilitaires
export const getAllEducationLevels = () => {
  return educationLevels;
};

export const getMainLevels = () => {
  return educationLevels.map(level => ({
    id: level.id,
    name: level.name,
    nameEn: level.nameEn,
    code: level.code
  }));
};

export const getSubLevels = (mainLevelId) => {
  const level = educationLevels.find(l => l.id === mainLevelId);
  return level ? level.subLevels : [];
};

export const getLevelName = (levelId, language = 'fr') => {
  for (const level of educationLevels) {
    // Chercher dans les sous-niveaux
    const subLevel = level.subLevels.find(sl => sl.id === levelId);
    if (subLevel) {
      return language === 'fr' ? subLevel.name : subLevel.nameEn;
    }
    // Chercher dans les niveaux principaux
    if (level.id === levelId) {
      return language === 'fr' ? level.name : level.nameEn;
    }
  }
  return '';
};

export const getMainLevelFromSubLevel = (subLevelId) => {
  for (const level of educationLevels) {
    const found = level.subLevels.some(sl => sl.id === subLevelId);
    if (found) return level.id;
  }
  return null;
};

export const getLevelCode = (levelId) => {
  for (const level of educationLevels) {
    if (level.id === levelId) return level.code;
    const subLevel = level.subLevels.find(sl => sl.id === levelId);
    if (subLevel) return `${level.code}-${subLevel.order}`;
  }
  return '';
};

// Exporter le tableau simple pour compatibilité avec l'ancien code
const simpleEducationLevels = ["Primaire", "Secondaire", "Universitaire", "Professionnel"];
export default simpleEducationLevels;