export const questions = {
  primaire: {
    SIL: {
      "Français": [
        {
          id: 1,
          question: "Quel est le verbe dans la phrase : 'Le chat mange du poisson.' ?",
          options: ["chat", "mange", "poisson", "du"],
          correctAnswer: "mange",
          difficulty: "facile",
          explanation: "Le verbe est l'action réalisée par le sujet.",
          category: "Grammaire"
        },
        {
          id: 2,
          question: "Combien de voyelles existe-t-il dans l'alphabet français ?",
          options: ["5", "6", "7", "8"],
          correctAnswer: "6",
          difficulty: "moyen",
          explanation: "Les voyelles sont : A, E, I, O, U, Y",
          category: "Alphabétisation"
        }
      ],
      "Mathématiques": [
        {
          id: 3,
          question: "Quel est le résultat de 5 + 3 ?",
          options: ["7", "8", "9", "10"],
          correctAnswer: "8",
          difficulty: "facile",
          explanation: "Addition simple de nombres entiers",
          category: "Calcul"
        }
      ]
    },
    CP: {
      "Culture et spiritualité": [
        {
          id: 4,
          question: "Quel est le premier pilier de l'Islam ?",
          options: ["La prière", "Le jeûne", "L'aumône", "La profession de foi"],
          correctAnswer: "La profession de foi",
          difficulty: "moyen",
          explanation: "La chahada est le fondement de la foi islamique",
          category: "Éducation religieuse"
        }
      ]
    }
  },
  secondaire: {
    "6e": {
      "SVT": [
        {
          id: 5,
          question: "Quel est l'organe responsable de la photosynthèse chez les plantes ?",
          options: ["La racine", "La tige", "La feuille", "La fleur"],
          correctAnswer: "La feuille",
          difficulty: "moyen",
          explanation: "Les chloroplastes dans les feuilles captent la lumière",
          category: "Biologie végétale"
        }
      ]
    }
  },
  universitaire: {
    "Licence 1": {
      "Droit": [
        {
          id: 6,
          question: "Quelle est la source principale du droit français ?",
          options: ["La loi", "La jurisprudence", "La doctrine", "Les coutumes"],
          correctAnswer: "La loi",
          difficulty: "difficile",
          explanation: "Système de droit civil codifié",
          category: "Droit civil"
        }
      ]
    }
  },
  professionnel: {
    "Électricité": {
      "Installation Électrique": [
        {
          id: 7,
          question: "Quelle est la tension standard dans les installations résidentielles ?",
          options: ["110V", "220V", "380V", "500V"],
          correctAnswer: "220V",
          difficulty: "moyen",
          explanation: "Norme de tension monophasée en France",
          category: "Électricité bâtiment"
        }
      ]
    },
    "Couture": {
      "Confection": [
        {
          id: 8,
          question: "Quel type de point est utilisé pour les ourlets ?",
          options: ["Point droit", "Point zigzag", "Point invisible", "Point de surjet"],
          correctAnswer: "Point invisible",
          difficulty: "facile",
          explanation: "Permet une finition discrète",
          category: "Techniques de base"
        }
      ]
    }
  }
};

// Fonction utilitaire pour récupérer les questions
export const getQuestions = (domain, level, subject) => {
  return questions[domain]?.[level]?.[subject] || [];
};