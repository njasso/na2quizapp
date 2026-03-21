// config/db.js
import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Charger les variables d'environnement
dotenv.config();

// Configuration de la connexion MongoDB
const connectToDatabase = async () => {
  try {
    // Vérification de l'URI MongoDB
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI non définie dans les variables d\'environnement');
    }

    // Configuration de Mongoose
    mongoose.set('strictQuery', true);
    
    // Options de connexion
    const options = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000,
      maxPoolSize: 10
    };

    // Établir la connexion
    await mongoose.connect(process.env.MONGODB_URI, options);
    
    console.log('✅ Connecté à MongoDB avec succès');

  } catch (error) {
    console.error('❌ Échec de la connexion à MongoDB:', error.message);
    process.exit(1); // Quitter l'application en cas d'erreur
  }
};

// Gestion des événements de connexion
mongoose.connection.on('connected', () => {
  console.log(`📊 MongoDB connecté sur: ${mongoose.connection.host}`);
});

mongoose.connection.on('error', (err) => {
  console.error('Erreur de connexion MongoDB:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('⚠️ Déconnecté de MongoDB');
});

// Gestion propre de la déconnexion
process.on('SIGINT', async () => {
  await mongoose.connection.close();
  console.log('🚪 Connexion MongoDB fermée (SIGINT)');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await mongoose.connection.close();
  console.log('🚪 Connexion MongoDB fermée (SIGTERM)');
  process.exit(0);
});

export default connectToDatabase;