export const EXPLANATIONS = {
  MATH: {
    ADDITION: (a, b) => `L'addition de ${a} et ${b} se calcule en...`,
    FORMULA: "La formule générale est a + b = c"
  },
  HISTORY: {
    EVENT: (event) => `L'événement ${event} s'est produit en...`
  }
};

export function getExplanation(type, ...args) {
  return EXPLANATIONS[type](...args);
}