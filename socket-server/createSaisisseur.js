// scripts/createSaisisseur.js - Version ES Module
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Pour utiliser dotenv avec ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/na2quiz';

const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  username: String,
  password: String,
  matricule: String,
  role: String,
  status: String,
  level: String,
  department: String
});

const User = mongoose.models.User || mongoose.model('User', userSchema);

async function createSaisisseur() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connecté à MongoDB');
    
    // Vérifier si un SAISISEUR existe déjà
    const existing = await User.findOne({ role: 'SAISISEUR' });
    if (existing) {
      console.log('⚠️ Un utilisateur SAISISEUR existe déjà:', existing.email);
      console.log('📧 Email:', existing.email);
      process.exit(0);
    }
    
    // Vérifier si l'email existe déjà
    const existingEmail = await User.findOne({ email: 'saisisseur@na2quiz.com' });
    if (existingEmail) {
      console.log('⚠️ L\'email saisisseur@na2quiz.com est déjà utilisé');
      process.exit(0);
    }
    
    const hashedPassword = await bcrypt.hash('Saisie2026!', 10);
    
    const saisisseur = new User({
      name: 'Saisisseur QCM',
      email: 'saisisseur@na2quiz.com',
      username: 'saisisseur_qcm',
      password: hashedPassword,
      matricule: 'SAI001',
      role: 'SAISISEUR',
      status: 'active',
      level: 'Licence',
      department: 'Direction des Examens'
    });
    
    await saisisseur.save();
    console.log('\n✅ Utilisateur SAISISEUR créé avec succès!');
    console.log('═══════════════════════════════════════');
    console.log('📧 Email: saisisseur@na2quiz.com');
    console.log('🔑 Mot de passe: Saisie2026!');
    console.log('🆔 Matricule: SAI001');
    console.log('👤 Nom: Saisisseur QCM');
    console.log('🎭 Rôle: SAISISEUR');
    console.log('═══════════════════════════════════════');
    console.log('\n📝 Le saisisseur peut uniquement :');
    console.log('  ✅ Créer des questions (/create/question)');
    console.log('  ✅ Voir le statut de ses questions (/teacher/questions)');
    console.log('  ✅ Consulter la banque des QCM (/qcm-bank)');
    console.log('\n❌ Le saisisseur ne peut PAS :');
    console.log('  ❌ Créer des épreuves');
    console.log('  ❌ Valider des questions');
    console.log('  ❌ Accéder à la surveillance');
    console.log('  ❌ Voir les rapports');
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Déconnecté de MongoDB');
    process.exit(0);
  }
}

createSaisisseur();