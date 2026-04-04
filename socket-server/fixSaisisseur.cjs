const mongoose = require('mongoose');

const MONGODB_URI = 'mongodb://localhost:27017/na2quiz';

const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  username: String,
  password: String,
  matricule: String,
  role: String,
  status: String,
  level: String,
  department: String,
  createdAt: Date,
  updatedAt: Date
});

const User = mongoose.models.User || mongoose.model('User', userSchema);

async function fixSaisisseur() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connecté à MongoDB');
    
    // Supprimer l'ancien SAISISEUR
    const deleted = await User.deleteOne({ email: 'saisisseur@na2quiz.com' });
    console.log(`🗑️ Ancien utilisateur supprimé: ${deleted.deletedCount > 0 ? 'oui' : 'non'}`);
    
    // Créer le nouveau SAISISEUR avec toutes les dates
    const now = new Date();
    const saisisseur = new User({
      name: 'Saisisseur QCM',
      email: 'saisisseur@na2quiz.com',
      username: 'saisisseur_qcm',
      password: '$2b$10$ljue0LUOlA3QRM4fSlWnReMyvH5mrr2Nf4DUGP15Yhqw3iFPTN5oK', // Saisie2026!
      matricule: 'SAI001',
      role: 'SAISISEUR',
      status: 'active',
      level: 'Licence',
      department: 'Direction des Examens',
      createdAt: now,
      updatedAt: now
    });
    
    await saisisseur.save();
    
    console.log('\n✅ SAISISEUR recréé avec succès!');
    console.log('═══════════════════════════════════════');
    console.log('📧 Email: saisisseur@na2quiz.com');
    console.log('🔑 Mot de passe: Saisie2026!');
    console.log('🆔 Matricule: SAI001');
    console.log('📅 Créé le:', now.toLocaleString('fr-FR'));
    console.log('═══════════════════════════════════════');
    
    // Vérifier que tout est OK
    const check = await User.findOne({ email: 'saisisseur@na2quiz.com' });
    console.log('\n✅ Vérification:');
    console.log(`   Nom: ${check.name}`);
    console.log(`   Rôle: ${check.role}`);
    console.log(`   Créé le: ${check.createdAt}`);
    console.log(`   Statut: ${check.status}`);
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Déconnecté de MongoDB');
    process.exit(0);
  }
}

fixSaisisseur();
