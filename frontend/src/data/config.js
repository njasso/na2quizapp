export const DIFFICULTY_LEVELS = {
  primaire: { easy: 60, medium: 30, hard: 10 },
  secondaire: { easy: 30, medium: 50, hard: 20 },
  universitaire: { easy: 10, medium: 40, hard: 50 },
  professionnel: { easy: 20, medium: 50, hard: 30 }
};

export const QUESTION_TYPES = {
  TEXT: 'text',
  IMAGE: 'image',
  AUDIO: 'audio',
  FORMULA: 'formula'
};

export const MEDIA_CONFIG = {
  basePath: '/assets/media/',
  imageFormats: ['jpg', 'png', 'svg'],
  audioFormats: ['mp3', 'wav'],
  formulaEngine: 'mathjax'
};