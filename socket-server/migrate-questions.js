
// socket-server/migrate-questions-safe.js
// Version SÉCURISÉE avec sauvegarde avant migration

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs';
import readline from 'readline';
import DOMAIN_DATA, { 
  getDomainNom,
  getSousDomaineNom,
  getLevelNom,
  getMatiereNom,
  getMatiereCode
} from './domainConfig.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI non défini');
  process.exit(1);
}

// Schéma pour la migration
const questionSchema = new mongoose.Schema({
  domaine: { type: String },
  sousDomaine: { type: String },
  niveau: { type: String },
  matiere: { type: String },
  libChapitre: { type: String },
  libQuestion: { type: String },
  options: { type: [String] },
  bonOpRep: { type: Number },
  points: { type: Number },
  status: { type: String },
  createdBy: { type: mongoose.Schema.Types.ObjectId },
  createdAt: { type: Date },
  domaineId: { type: String },
  sousDomaineId: { type: String },
  niveauId: { type: String },
  matiereId: { type: String },
  matiereCode: { type: String }
}, { timestamps: true });

const Question = mongoose.model('Question', questionSchema);

// Mapping des noms vers IDs
function findDomainIdByName(domainName) {
  if (!domainName) return null;
  const domainMap = {
    'Éducatif': '1',
    'Professionnel': '2',
    'Spiritualité et Culture Camerounaise': '3',
    'Test': '1' // Rediriger Test vers Éducatif
  };
  
  if (domainMap[domainName]) return domainMap[domainName];
  
  for (const [id, data] of Object.entries(DOMAIN_DATA)) {
    if (data.nom === domainName || data.nom.toLowerCase() === domainName.toLowerCase()) {
      return id;
    }
  }
  return '1'; // Par défaut: Éducatif
}

function findSousDomaineIdByName(domainId, sousDomaineName) {
  if (!domainId || !sousDomaineName) return null;
  
  const domain = DOMAIN_DATA[domainId];
  if (!domain) return null;
  
  const sousDomaineMap = {
    'Secondaire Général': '12',
    'Secondaire Général (Francophone)': '12',
    'Universitaire': '1D',
    'Management': '22',
    'Compétences Professionnelles': '21'
  };
  
  if (sousDomaineMap[sousDomaineName]) return sousDomaineMap[sousDomaineName];
  
  for (const [id, data] of Object.entries(domain.sousDomaines)) {
    if (data.nom === sousDomaineName || data.nom.toLowerCase() === sousDomaineName.toLowerCase()) {
      return id;
    }
  }
  return '12'; // Par défaut: Secondaire Général
}

function findLevelIdByName(domainId, sousDomaineId, levelName) {
  if (!domainId || !sousDomaineId || !levelName) return null;
  
  const levelMap = {
    'Terminale C': '130',
    'Terminale D': '133',
    'L1': '1D1',
    'MBA': '223',
    'Certificat Professionnel': '215'
  };
  
  if (levelMap[levelName]) return levelMap[levelName];
  
  const domain = DOMAIN_DATA[domainId];
  if (!domain) return null;
  
  const sousDomaine = domain.sousDomaines[sousDomaineId];
  if (!sousDomaine || !sousDomaine.levels) return null;
  
  const level = sousDomaine.levels.find(l => 
    l.nom === levelName || l.nom.toLowerCase() === levelName.toLowerCase()
  );
  return level ? String(level.id) : '130'; // Par défaut: Terminale C
}

function findMatiereIdByName(domainId, sousDomaineId, matiereName) {
  if (!domainId || !sousDomaineId || !matiereName) return null;
  
  const matiereMap = {
    'Mathématiques': '1219',
    'Géographie': '1214',
    'Chimie': '1221',
    'Droit Civil': '1D102',
    'Management de la Qualité': '2217',
    'Pisciculture': '2114'
  };
  
  if (matiereMap[matiereName]) return matiereMap[matiereName];
  
  const domain = DOMAIN_DATA[domainId];
  if (!domain) return null;
  
  const sousDomaine = domain.sousDomaines[sousDomaineId];
  if (!sousDomaine || !sousDomaine.matieres) return null;
  
  const matiere = sousDomaine.matieres.find(m => 
    m.nom === matiereName || m.nom.toLowerCase() === matiereName.toLowerCase()
  );
  return matiere ? String(matiere.id) : '1219'; // Par défaut: Mathématiques
}

async function migrateQuestions() {
  let backupFile = null;
  
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connecté à MongoDB Atlas\n');
    
    // 1. Sauvegarde des données originales
    const originalQuestions = await Question.find({});
    backupFile = `backup_questions_${Date.now()}.json`;
    fs.writeFileSync(backupFile, JSON.stringify(originalQuestions, null, 2));
    console.log(`💾 Sauvegarde créée: ${backupFile}`);
    console.log(`📋 ${originalQuestions.length} questions à traiter\n`);
    
    // 2. Demander confirmation
    console.log('⚠️  ATTENTION: Ce script va modifier vos données dans MongoDB Atlas !');
    console.log('⚠️  Une sauvegarde a été créée en local.');
    console.log('\n📝 Modifications à appliquer:');
    console.log('   - Ajout des champs domaineId, sousDomaineId, niveauId, matiereId');
    console.log('   - Correction des libChapitre vides');
    console.log('   - Harmonisation des valeurs "Test"');
    
    // Interface readline pour la confirmation
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    const answer = await new Promise((resolve) => {
      rl.question('\n✅ Voulez-vous continuer ? (oui/non): ', resolve);
    });
    rl.close();
    
    if (answer.toLowerCase() !== 'oui') {
      console.log('❌ Migration annulée');
      process.exit(0);
    }
    
    // 3. Migration
    let updatedCount = 0;
    let errorCount = 0;
    
    for (const q of originalQuestions) {
      try {
        const updateData = {};
        
        // Domaine
        if (!q.domaineId) {
          const domainId = findDomainIdByName(q.domaine);
          updateData.domaineId = domainId;
          if (domainId === '1') updateData.domaine = 'Éducatif';
          if (domainId === '2') updateData.domaine = 'Professionnel';
          if (domainId === '3') updateData.domaine = 'Spiritualité et Culture Camerounaise';
          updateData.domaineCode = DOMAIN_DATA[domainId]?.code || 'EDU';
        }
        
        // Sous-domaine
        if (!q.sousDomaineId && updateData.domaineId) {
          const sousDomaineId = findSousDomaineIdByName(updateData.domaineId || q.domaineId, q.sousDomaine);
          if (sousDomaineId) {
            updateData.sousDomaineId = sousDomaineId;
            const domain = DOMAIN_DATA[updateData.domaineId || q.domaineId];
            updateData.sousDomaineCode = domain?.sousDomaines[sousDomaineId]?.code || '';
          }
        }
        
        // Niveau
        if (!q.niveauId && (updateData.domaineId || q.domaineId) && (updateData.sousDomaineId || q.sousDomaineId)) {
          const niveauId = findLevelIdByName(
            updateData.domaineId || q.domaineId,
            updateData.sousDomaineId || q.sousDomaineId,
            q.niveau
          );
          if (niveauId) updateData.niveauId = niveauId;
        }
        
        // Matière
        if (!q.matiereId && (updateData.domaineId || q.domaineId) && (updateData.sousDomaineId || q.sousDomaineId)) {
          const matiereId = findMatiereIdByName(
            updateData.domaineId || q.domaineId,
            updateData.sousDomaineId || q.sousDomaineId,
            q.matiere
          );
          if (matiereId) {
            updateData.matiereId = matiereId;
            const domain = DOMAIN_DATA[updateData.domaineId || q.domaineId];
            const sousDomaine = domain?.sousDomaines[updateData.sousDomaineId || q.sousDomaineId];
            const matiere = sousDomaine?.matieres?.find(m => String(m.id) === matiereId);
            updateData.matiereCode = matiere?.code || '';
          }
        }
        
        // Chapitre
        if (!q.libChapitre || q.libChapitre.trim() === '') {
          updateData.libChapitre = 'Chapitre général';
        } else if (q.libChapitre !== q.libChapitre.trim()) {
          updateData.libChapitre = q.libChapitre.trim();
        }
        
        // Appliquer les mises à jour
        if (Object.keys(updateData).length > 0) {
          await Question.updateOne({ _id: q._id }, { $set: updateData });
          updatedCount++;
          console.log(`✅ ${updatedCount}. Question ${q._id} mise à jour`);
        }
        
      } catch (err) {
        errorCount++;
        console.error(`❌ Erreur sur question ${q._id}:`, err.message);
      }
    }
    
    console.log(`\n✅ Migration terminée !`);
    console.log(`📊 ${updatedCount} questions mises à jour`);
    console.log(`❌ ${errorCount} erreurs`);
    console.log(`💾 Sauvegarde disponible: ${backupFile}`);
    
    // 4. Vérification post-migration
    const afterCount = await Question.countDocuments();
    const missingDomain = await Question.countDocuments({ domaineId: { $exists: false } });
    const missingChapitre = await Question.countDocuments({ libChapitre: { $exists: false } });
    
    console.log(`\n📊 Vérification post-migration:`);
    console.log(`   - Total questions: ${afterCount}`);
    console.log(`   - Sans domaineId: ${missingDomain}`);
    console.log(`   - Sans chapitre: ${missingChapitre}`);
    
  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 Déconnecté de MongoDB Atlas');
  }
}

migrateQuestions();