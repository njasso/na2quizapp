const subjectsData = [
  {
    name: "Mathématiques",
    domain: "Scientifique",
    levels: ["Seconde", "Première", "Terminale"],
    questions: [
      {
        text: "Quelle est la dérivée de ln(x) ?",
        answers: [
          { id: "a1", text: "1/x" },
          { id: "a2", text: "x" },
          { id: "a3", text: "e^x" },
          { id: "a4", text: "1" }
        ],
        correctAnswers: ["a1"],
        explanation: "La dérivée de ln(x) est 1/x selon les règles de dérivation des fonctions logarithmes.",
        feedback: "C'est une dérivée classique à connaître."
      },
      {
        text: "Quelle est la solution de l'équation x² - 5x + 6 = 0 ?",
        answers: [
          { id: "b1", text: "x = 2 et x = 3" },
          { id: "b2", text: "x = -2 et x = -3" },
          { id: "b3", text: "x = 1 et x = 6" },
          { id: "b4", text: "x = -1 et x = -6" }
        ],
        correctAnswers: ["b1"],
        explanation: "Les solutions sont obtenues par factorisation: (x-2)(x-3) = 0.",
        feedback: "Les équations du second degré se résolvent facilement par factorisation ou avec le discriminant."
      }
    ]
  },
  {
    name: "Physique-Chimie",
    domain: "Scientifique",
    levels: ["Seconde", "Première", "Terminale"],
    questions: [
      {
        text: "Quelle est l'unité de mesure de la force dans le système international ?",
        answers: [
          { id: "c1", text: "Newton" },
          { id: "c2", text: "Joule" },
          { id: "c3", text: "Pascal" },
          { id: "c4", text: "Watt" }
        ],
        correctAnswers: ["c1"],
        explanation: "Le newton (symbole : N) est l'unité de mesure de la force dans le système international.",
        feedback: "C'est une unité fondamentale de la mécanique classique."
      }
    ]
  },
  {
    name: "Histoire-Géographie",
    domain: "Littéraire",
    levels: ["Seconde", "Première", "Terminale"],
    questions: [
      {
        text: "En quelle année a eu lieu la Révolution française ?",
        answers: [
          { id: "d1", text: "1789" },
          { id: "d2", text: "1799" },
          { id: "d3", text: "1776" },
          { id: "d4", text: "1815" }
        ],
        correctAnswers: ["d1"],
        explanation: "La Révolution française a commencé en 1789 avec la prise de la Bastille le 14 juillet.",
        feedback: "C'est une date charnière de l'histoire moderne."
      }
    ]
  },
  {
    name: "Philosophie",
    domain: "Littéraire",
    levels: ["Terminale"],
    questions: [
      {
        text: "Qui a dit 'Je pense, donc je suis' ?",
        answers: [
          { id: "e1", text: "Descartes" },
          { id: "e2", text: "Socrate" },
          { id: "e3", text: "Platon" },
          { id: "e4", text: "Kant" }
        ],
        correctAnswers: ["e1"],
        explanation: "René Descartes est l'auteur de cette célèbre proposition philosophique.",
        feedback: "C'est le fondement de la philosophie cartésienne."
      }
    ]
  },
  {
    name: "Sciences Économiques et Sociales",
    domain: "Économique",
    levels: ["Première", "Terminale"],
    questions: [
      {
        text: "Qu'est-ce que le PIB ?",
        answers: [
          { id: "f1", text: "Produit Intérieur Brut" },
          { id: "f2", text: "Produit Industriel de Base" },
          { id: "f3", text: "Progrès International des Biens" },
          { id: "f4", text: "Produit d'Investissement Brut" }
        ],
        correctAnswers: ["f1"],
        explanation: "Le PIB mesure la valeur totale de la production de biens et services dans un pays.",
        feedback: "C'est l'indicateur économique le plus utilisé pour mesurer la richesse d'un pays."
      }
    ]
  }
];

export default subjectsData;