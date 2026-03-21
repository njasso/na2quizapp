const mongoose = require("mongoose");
const fs = require("fs");

// 📌 Remplace par ton URI MongoDB
const mongoURI = "mongodb://localhost:27017/quizapp";

// 📌 Lecture du fichier JSON
const data = JSON.parse(fs.readFileSync("questions_quiz.json", "utf8"));

// 📌 Définition du schéma
const questionSchema = new mongoose.Schema({
  domaine: String,
  sousDomaine: String,
  niveau: String,
  matiere: String,
  questions: [
    {
      question: String,
      options: [String],
      answer: String,
    },
  ],
});

const Question = mongoose.model("Question", questionSchema);

mongoose
  .connect(mongoURI)
  .then(async () => {
    console.log("✅ Connecté à MongoDB");

    // ⚠️ On supprime les anciennes données pour éviter les doublons
    await Question.deleteMany({});

    const entries = [];

    for (const domaine in data) {
      const sousDomaines = data[domaine];
      for (const sousDomaine in sousDomaines) {
        const niveaux = sousDomaines[sousDomaine];
        for (const niveau in niveaux) {
          const matieres = niveaux[niveau];
          for (const matiere in matieres) {
            entries.push({
              domaine,
              sousDomaine,
              niveau,
              matiere,
              questions: matieres[matiere],
            });
          }
        }
      }
    }

    await Question.insertMany(entries);
    console.log("✅ Import terminé avec succès !");
    process.exit();
  })
  .catch((err) => {
    console.error("❌ Erreur de connexion MongoDB", err);
    process.exit(1);
  });
