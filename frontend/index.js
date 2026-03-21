// index.js
const express = require('express');
const mongoose = require('mongoose');
const authRoutes = require('./routes/authRoutes');
const dotenv = require('dotenv');
const app = express();
const resultRoutes = require('./routes/resultRoutes');
app.use('/api/results', resultRoutes);

// Middleware pour parser le corps des requêtes en JSON
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes); // Ce middleware permet d'accéder à /api/auth/login

// Connecter à la base de données MongoDB
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Connexion à MongoDB réussie'))
  .catch((err) => console.log('Erreur de connexion à MongoDB :', err));

// Démarrer le serveur...
mongoose.connect('mongodb://localhost:27017/quiz-app', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log("✅ Connecté à MongoDB");
}).catch((err) => {
  console.error("❌ Erreur MongoDB :", err);
});

// Lancer le serveur
app.listen(5000, () => {
  console.log("Serveur démarré sur le port 5000");
});
