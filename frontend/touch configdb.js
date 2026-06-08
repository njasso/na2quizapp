const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/quizapp', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('Connecté à MongoDB avec succès');
  } catch (error) {
    console.error('Erreur de connexion à MongoDB:', error.message);
    process.exit(1);
  }
};

module.exports = connectDB;