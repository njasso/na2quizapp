const mongoose = require('mongoose');
const Question = require('../models/Question'); // Ton modèle Mongoose

mongoose.connect('mongodb://localhost:27017/quizDB', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const questions = [
  {
    question: "Quelle est la capitale du Cameroun ?",
    options: ["Yaoundé", "Douala", "Bafoussam", "Garoua"],
    correctAnswer: "Yaoundé",
    level: "Primaire",
    subject: "Éducation civique"
  },
  {
    question: "Combien font 7 + 3 ?",
    options: ["5", "10", "8", "7"],
    correctAnswer: "10",
    level: "Primaire",
    subject: "Mathématiques"
  },
  // Ajoute autant de questions que nécessaire
];

Question.insertMany(questions)
  .then(() => {
    console.log("Questions insérées avec succès !");
    mongoose.connection.close();
  })
  .catch(err => {
    console.error("Erreur lors de l'insertion :", err);
  });
