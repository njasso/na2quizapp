// scripts/transfererQuestionsAKamga.js
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/na2quiz';

// Schéma Question simplifié
const questionSchema = new mongoose.Schema({}, { strict: false });
const Question = mongoose.models.Question || mongoose.model('Question', questionSchema);

async function transfererQuestions() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connecté à MongoDB\n');

        // Nouvel ID de Pierre Kamga
        const KAMGA_ID = '69d07bce5d5fccdd14a01bbc';
        const KAMGA_MATRICULE = 'TCH001';
        const KAMGA_NAME = 'Pierre Kamga';

        console.log('👤 Enseignant cible:');
        console.log(`   Nom: ${KAMGA_NAME}`);
        console.log(`   ID: ${KAMGA_ID}`);
        console.log(`   Matricule: ${KAMGA_MATRICULE}\n`);

        // 1. Afficher les questions avant mise à jour
        const beforeStats = await Question.aggregate([
            { $group: { _id: "$matriculeAuteur", count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]);
        
        console.log('📊 Répartition des questions AVANT mise à jour:');
        beforeStats.forEach(stat => {
            console.log(`   - ${stat._id || 'sans matricule'}: ${stat.count} questions`);
        });
        console.log('');

        // 2. Mettre à jour TOUTES les questions qui ne sont pas déjà à TCH001
        //    et qui sont des questions de mathématiques ou pisciculture
        const result = await Question.updateMany(
            {
                $or: [
                    { matriculeAuteur: { $ne: KAMGA_MATRICULE } },
                    { createdBy: { $ne: KAMGA_ID } }
                ],
                $and: [
                    {
                        $or: [
                            { matiere: 'Mathématiques' },
                            { matiere: 'Pisciculture' },
                            { domaine: 'Éducatif' },
                            { domaine: 'Professionnel' }
                        ]
                    }
                ]
            },
            {
                $set: {
                    matriculeAuteur: KAMGA_MATRICULE,
                    createdBy: KAMGA_ID
                }
            }
        );

        console.log(`✅ Mise à jour exécutée:`);
        console.log(`   ${result.matchedCount} questions trouvées`);
        console.log(`   ${result.modifiedCount} questions modifiées\n`);

        // 3. Vérifier les questions de Kamga après mise à jour
        const kamgaQuestions = await Question.find({ 
            matriculeAuteur: KAMGA_MATRICULE 
        }).select('libQuestion matiere status matriculeAuteur createdBy');
        
        console.log(`📊 Pierre Kamga a maintenant ${kamgaQuestions.length} questions:`);
        kamgaQuestions.forEach((q, i) => {
            console.log(`   ${i+1}. ${q.libQuestion?.substring(0, 60)}... (${q.matiere}) - ${q.status}`);
        });

        // 4. Afficher la nouvelle répartition
        const afterStats = await Question.aggregate([
            { $group: { _id: "$matriculeAuteur", count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]);
        
        console.log('\n📊 Répartition des questions APRÈS mise à jour:');
        afterStats.forEach(stat => {
            const isKamga = stat._id === KAMGA_MATRICULE ? '✅ KAMGA' : '';
            console.log(`   - ${stat._id || 'sans matricule'}: ${stat.count} questions ${isKamga}`);
        });

        // 5. Vérification spécifique des IDs
        const questionsAvecAncienId = await Question.find({
            createdBy: { $ne: KAMGA_ID },
            matiere: 'Mathématiques'
        }).countDocuments();
        
        if (questionsAvecAncienId === 0) {
            console.log('\n✅ Toutes les questions de mathématiques sont maintenant attribuées à Pierre Kamga');
        } else {
            console.log(`\n⚠️ Il reste ${questionsAvecAncienId} questions avec d\'autres créateurs`);
        }

    } catch (error) {
        console.error('❌ Erreur:', error.message);
    } finally {
        await mongoose.disconnect();
        console.log('\n🔌 Déconnecté de MongoDB');
        process.exit(0);
    }
}

transfererQuestions();