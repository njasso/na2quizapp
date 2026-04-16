// socket-server/server.js - Version COMPLÈTE avec numérotation séquentielle des questions
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import fs from 'fs';

// ✅ IMPORT DU RÉFÉRENTIEL CAMEROUNAIS
import DOMAIN_DATA, { 
  getAllDomaines, 
  getAllSousDomaines, 
  getAllLevels, 
  getAllMatieres,
  getDomainNom,
  getSousDomaineNom,
  getLevelNom,
  getMatiereNom,
  getMatiereCode
} from './domainConfig.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

// ═══════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════
const PORT = process.env.PORT || 5000;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
const JWT_SECRET = process.env.JWT_SECRET || 'na2quiz_secret_key';
const NODE_ENV = process.env.NODE_ENV || 'development';
const isProduction = NODE_ENV === 'production';
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI non défini');
  if (isProduction) process.exit(1);
}

// ═══════════════════════════════════════════════════════════════
// CONFIGURATIONS COMPLÈTES A à K
// ═══════════════════════════════════════════════════════════════
const EXAM_FULL_CONFIGS = {
  A: { examOption: 'A', label: 'Collective Figée', openRange: false, sequencing: 'identical', showBinaryResult: true, showCorrectAnswer: false, allowRetry: false, requiredQuestions: 0, timerPerQuestion: true, timePerQuestion: 60, totalTime: 60, color: '#ef4444' },
  B: { examOption: 'B', label: 'Collective Souple', openRange: false, sequencing: 'identical', showBinaryResult: true, showCorrectAnswer: true, allowRetry: false, requiredQuestions: 0, timerPerQuestion: false, timePerQuestion: 60, totalTime: 60, color: '#ef4444' },
  C: { examOption: 'C', label: 'Personnalisée', openRange: false, sequencing: 'identical', showBinaryResult: false, showCorrectAnswer: false, allowRetry: false, requiredQuestions: 0, timerPerQuestion: false, timePerQuestion: 60, totalTime: 60, color: '#ef4444' },
  D: { examOption: 'D', label: 'Aléatoire', openRange: false, sequencing: 'randomPerStudent', showBinaryResult: true, showCorrectAnswer: false, allowRetry: false, requiredQuestions: 0, timerPerQuestion: true, timePerQuestion: 60, totalTime: 60, color: '#f59e0b' },
  E: { examOption: 'E', label: 'Aléatoire+', openRange: false, sequencing: 'randomPerStudent', showBinaryResult: true, showCorrectAnswer: true, allowRetry: false, requiredQuestions: 0, timerPerQuestion: false, timePerQuestion: 60, totalTime: 60, color: '#f59e0b' },
  F: { examOption: 'F', label: 'Aléatoire Libre', openRange: false, sequencing: 'randomPerStudent', showBinaryResult: false, showCorrectAnswer: false, allowRetry: false, requiredQuestions: 0, timerPerQuestion: false, timePerQuestion: 60, totalTime: 60, color: '#f59e0b' },
  G: { examOption: 'G', label: 'Plage Ouverte + Reprise', openRange: true, sequencing: 'identical', showBinaryResult: true, showCorrectAnswer: false, allowRetry: true, requiredQuestions: 0, timerPerQuestion: false, timePerQuestion: 60, totalTime: 60, color: '#10b981' },
  H: { examOption: 'H', label: 'Plage Ouverte', openRange: true, sequencing: 'identical', showBinaryResult: true, showCorrectAnswer: false, allowRetry: false, requiredQuestions: 0, timerPerQuestion: false, timePerQuestion: 60, totalTime: 60, color: '#10b981' },
  I: { examOption: 'I', label: 'Plage Ouverte+', openRange: true, sequencing: 'identical', showBinaryResult: true, showCorrectAnswer: true, allowRetry: true, requiredQuestions: 0, timerPerQuestion: false, timePerQuestion: 60, totalTime: 60, color: '#10b981' },
  J: { examOption: 'J', label: 'Plage Ouverte++', openRange: true, sequencing: 'identical', showBinaryResult: true, showCorrectAnswer: true, allowRetry: false, requiredQuestions: 0, timerPerQuestion: false, timePerQuestion: 60, totalTime: 60, color: '#10b981' },
  K: { examOption: 'K', label: 'Plage Ouverte Libre', openRange: true, sequencing: 'identical', showBinaryResult: false, showCorrectAnswer: false, allowRetry: false, requiredQuestions: 0, timerPerQuestion: false, timePerQuestion: 60, totalTime: 60, color: '#10b981' }
};

// ═══════════════════════════════════════════════════════════════
// CORS - Configuration dynamique
// ═══════════════════════════════════════════════════════════════
const CORS_ORIGINS = [
  FRONTEND_URL,
  'https://na2quizapp.netlify.app',
  'http://localhost:3000',
  'http://localhost:5000',
  'http://localhost:5001',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5000',
  'http://192.168.0.1:3000',
  'http://192.168.106.51:5000',
  'https://na2quizapp.onrender.com'
];

// ═══════════════════════════════════════════════════════════════
// INITIALISATION EXPRESS
// ═══════════════════════════════════════════════════════════════
const app = express();
const server = createServer(app);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (!isProduction) return callback(null, true);
    if (CORS_ORIGINS.includes(origin)) return callback(null, true);
    if (origin?.endsWith('.netlify.app')) return callback(null, true);
    if (origin?.endsWith('.onrender.com')) return callback(null, true);
    
    if (origin.match(/^https?:\/\/(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.)/)) {
      return callback(null, true);
    }
    
    console.warn(`[CORS] Origine non standard mais acceptée: ${origin}`);
    callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

if (isProduction) {
  app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" }, contentSecurityPolicy: false }));
  app.use(compression());
}

app.set('trust proxy', 1);

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isProduction ? 500 : 5000,
  skip: (req) => req.path === '/health',
});
app.use(limiter);

// ═══════════════════════════════════════════════════════════════
// SERVEUR STATIQUE POUR UPLOADS ET FICHIERS STATIQUES
// ═══════════════════════════════════════════════════════════════
const publicDir = path.join(__dirname, 'public');
if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });
const uploadsDir = path.join(publicDir, 'uploads/questions');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

app.use(express.static(publicDir));
app.use('/uploads', express.static(path.join(publicDir, 'uploads')));

// ═══════════════════════════════════════════════════════════════
// SCHÉMAS MONGOOSE
// ═══════════════════════════════════════════════════════════════

// === Counter Schema pour la numérotation séquentielle ===
const counterSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 }
});

const Counter = mongoose.models.Counter || mongoose.model('Counter', counterSchema);

// Fonction pour obtenir la prochaine séquence
async function getNextSequence(seqName) {
  const counter = await Counter.findByIdAndUpdate(
    seqName,
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return counter.seq;
}

// === User Schema ===
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  username: { type: String, unique: true, sparse: true, lowercase: true },
  password: { type: String, required: true, select: false },
  matricule: { type: String, unique: true, sparse: true, uppercase: true },
  level: { type: String, default: '' },
  grade: { type: String, default: '' },
  department: { type: String, default: '' },
  role: { 
    type: String, 
    enum: ['APPRENANT', 'ENSEIGNANT', 'SAISISEUR', 'OPERATEUR_EVALUATION', 'ADMIN_DELEGUE', 'ADMIN_SYSTEME'], 
    default: 'APPRENANT' 
  },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  isAdmin: { type: Boolean, default: false },
  lastLogin: { type: Date },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

userSchema.pre('save', async function(next) {
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 10);
  }
  next();
});

userSchema.methods.matchPassword = async function(password) {
  return await bcrypt.compare(password, this.password);
};

userSchema.methods.toJSON = function() {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

// === Question Schema - VERSION AVEC RÉFÉRENTIEL COMPLET ET RÉFÉRENCE ===
const questionSchema = new mongoose.Schema({
  // ✅ Référence séquentielle unique (Q0001, Q0002, etc.)
  reference: { type: String, unique: true, sparse: true, index: true },
  
  // ✅ CHAMPS RÉFÉRENTIEL (IDs pour validation et recherche)
  domaineId: { type: String, required: true },
  domaine: { type: String, required: true },
  domaineCode: { type: String, default: '' },
  
  sousDomaineId: { type: String, required: true },
  sousDomaine: { type: String, required: true },
  sousDomaineCode: { type: String, default: '' },
  
  niveauId: { type: String, required: true },
  niveau: { type: String, required: true },
  
  matiereId: { type: String, required: true },
  matiere: { type: String, required: true },
  matiereCode: { type: String, default: '' },
  
  libChapitre: { type: String, required: true },
  
  // ✅ Contenu de la question
  libQuestion: { type: String, required: true },
  imageQuestion: { type: String, default: '' },
  imageBase64: { type: String, default: '', select: false },
  imageMetadata: {
    originalName: { type: String, default: '' },
    mimeType: { type: String, default: '' },
    size: { type: Number, default: 0 },
    storageType: { type: String, enum: ['url', 'base64', 'none'], default: 'none' }
  },
  typeQuestion: { type: Number, enum: [1, 2, 3], required: true },
  options: { type: [String], required: true, validate: { validator: v => v && v.length >= 3 && v.length <= 5 } },
  bonOpRep: { type: Number, required: true, validate: { validator: function(v) { return v >= 0 && v < this.options.length; } } },
  tempsMin: { type: Number, default: 1, min: 0.5 },
  matriculeAuteur: { type: String, required: true },
  dateCreation: { type: Date, default: Date.now },
  cleInterne: { type: String, default: '' },
  points: { type: Number, default: 1 },
  explanation: { type: String, default: '' },
  type: { type: String, enum: ['single', 'multiple'], default: 'single' },
  difficulty: { type: String, enum: ['facile', 'moyen', 'difficile'], default: 'moyen' },
  tags: { type: [String], default: [] },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  approvedAt: { type: Date },
  rejectionComment: { type: String, default: '' }
}, { timestamps: true });

// ✅ INDEX OPTIMISÉS
questionSchema.index({ domaineId: 1, sousDomaineId: 1, niveauId: 1, matiereId: 1 });
questionSchema.index({ matiereCode: 1 });
questionSchema.index({ status: 1, createdAt: -1 });
questionSchema.index({ createdBy: 1, status: 1 });
questionSchema.index({ cleInterne: 1 }, { unique: true, sparse: true });
questionSchema.index({ libChapitre: 1 });
questionSchema.index({ reference: 1 });

// ✅ PRE-SAVE HOOK - Génération de la référence pour les questions approuvées
questionSchema.pre('save', async function(next) {
  // Générer la référence si la question est approuvée et n'a pas encore de référence
  if (this.status === 'approved' && !this.reference) {
    try {
      const seq = await getNextSequence('question_reference');
      this.reference = `Q${String(seq).padStart(4, '0')}`;
      console.log(`[DB] ✅ Référence générée: ${this.reference} pour la question ${this._id}`);
    } catch (err) {
      console.error('[DB] Erreur génération référence:', err);
    }
  }
  
  if (!this.cleInterne && this.matiere && this.libQuestion) {
    this.cleInterne = `${this.matiere}::${this.libQuestion}`;
  }
  if (!this.matiereCode && this.matiereId && this.sousDomaineId && this.domaineId) {
    const code = getMatiereCode(this.domaineId, this.sousDomaineId, this.matiereId);
    if (code) this.matiereCode = code;
  }
  if (this.imageQuestion && this.imageQuestion.trim()) {
    this.imageMetadata.storageType = 'url';
  } else if (this.imageBase64 && this.imageBase64.trim()) {
    this.imageMetadata.storageType = 'base64';
  } else {
    this.imageMetadata.storageType = 'none';
  }
  next();
});

// ✅ POST-UPDATE HOOK - Générer la référence si la question devient approuvée
questionSchema.post('findOneAndUpdate', async function(doc) {
  if (doc && doc.status === 'approved' && !doc.reference) {
    try {
      const seq = await getNextSequence('question_reference');
      doc.reference = `Q${String(seq).padStart(4, '0')}`;
      await doc.save();
      console.log(`[DB] ✅ Référence générée post-update: ${doc.reference}`);
    } catch (err) {
      console.error('[DB] Erreur génération référence post-update:', err);
    }
  }
});

// === Exam Schema - AVEC TOUTES LES OPTIONS A à K ===
const examSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, default: '' },
  duration: { type: Number, required: true },
  domain: { type: String, required: true },
  category: { type: String, default: '' },
  level: { type: String, required: true },
  subject: { type: String, required: true },
  questions: { type: Array, default: [] },
  passingScore: { type: Number, default: 70 },
  status: { type: String, enum: ['draft', 'published', 'archived'], default: 'published' },
  source: { type: String, enum: ['manual', 'database', 'ai_generated'], default: 'manual' },
  teacherName: { type: String, default: '' },
  teacherGrade: { type: String, default: '' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  examOption: { type: String, enum: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', null], default: null },
  cleExterne: { type: String, default: '' },
  
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
  scheduledDate: { type: Date, default: null },
  sessionRoom: { type: String, default: 'Salle principale' },
  
  config: {
    examOption: { type: String, enum: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', null], default: null },
    openRange: { type: Boolean, default: false },
    requiredQuestions: { type: Number, default: 0 },
    sequencing: { type: String, default: 'identical' },
    allowRetry: { type: Boolean, default: false },
    showBinaryResult: { type: Boolean, default: false },
    showCorrectAnswer: { type: Boolean, default: false },
    timerPerQuestion: { type: Boolean, default: false },
    timePerQuestion: { type: Number, default: 60 },
    totalTime: { type: Number, default: 60 },
    pointsType: { type: String, enum: ['uniform', 'variable'], default: 'uniform' },
    globalPoints: { type: Number, default: 1 },
    timerDisplayMode: { type: String, enum: ['once', 'twice', 'fourTimes', 'permanent'], default: 'permanent' }
  }
}, { timestamps: true });

examSchema.virtual('totalPoints').get(function() {
  return this.questions?.reduce((sum, q) => sum + (q.points || 1), 0) || 0;
});

examSchema.virtual('questionCount').get(function() {
  return this.questions?.length || 0;
});

examSchema.index({ assignedTo: 1, status: 1 });
examSchema.index({ createdBy: 1, createdAt: -1 });

// === Result Schema - AVEC TOUTES LES OPTIONS A à K ===
const resultSchema = new mongoose.Schema({
  examId: { type: mongoose.Schema.Types.ObjectId, ref: 'Exam', required: true },
  studentInfo: {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    matricule: { type: String, uppercase: true },
    level: { type: String }
  },
  answers: { type: Map, of: mongoose.Schema.Types.Mixed, required: true },
  score: { type: Number, required: true },
  percentage: { type: Number, required: true },
  passed: { type: Boolean, required: true },
  totalQuestions: { type: Number },
  examTitle: { type: String },
  examLevel: { type: String },
  domain: { type: String },
  subject: { type: String },
  category: { type: String },
  duration: { type: Number },
  passingScore: { type: Number },
  examOption: { type: String, enum: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', null], default: null },
  examQuestions: { type: Array, default: [] },
  pdfPath: { type: String, default: null },
  cleExterne: { type: String, default: '' },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  
  config: {
    examOption: { type: String, enum: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', null], default: null },
    openRange: { type: Boolean, default: false },
    requiredQuestions: { type: Number, default: 0 },
    sequencing: { type: String, default: 'identical' },
    allowRetry: { type: Boolean, default: false },
    showBinaryResult: { type: Boolean, default: false },
    showCorrectAnswer: { type: Boolean, default: false },
    timerPerQuestion: { type: Boolean, default: false },
    timePerQuestion: { type: Number, default: 60 },
    totalTime: { type: Number, default: 60 },
    pointsType: { type: String, enum: ['uniform', 'variable'], default: 'uniform' },
    globalPoints: { type: Number, default: 1 },
    timerDisplayMode: { type: String, enum: ['once', 'twice', 'fourTimes', 'permanent'], default: 'permanent' }
  },
  
  questionDetails: { type: Array, default: [] },
  
  qrCodeHash: { type: String, unique: true, sparse: true },
  bulletinUrl: { type: String, default: '' },
  generatedAt: { type: Date, default: Date.now },
  generatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  emailSent: { type: Boolean, default: false },
  emailSentAt: { type: Date },
  ipAddress: { type: String },
  userAgent: { type: String }
}, { timestamps: true });

// Virtual fields
resultSchema.virtual('fullName').get(function() {
  return `${this.studentInfo.firstName} ${this.studentInfo.lastName}`;
});

resultSchema.virtual('note20').get(function() {
  return ((this.percentage / 100) * 20).toFixed(2);
});

resultSchema.virtual('mention').get(function() {
  if (this.percentage >= 90) return 'Très Bien';
  if (this.percentage >= 75) return 'Bien';
  if (this.percentage >= 60) return 'Assez Bien';
  if (this.percentage >= 50) return 'Passable';
  return 'Insuffisant';
});

resultSchema.virtual('statusText').get(function() {
  return this.passed ? 'Reçu' : 'Échoué';
});

resultSchema.virtual('correctCount').get(function() {
  if (!this.questionDetails || this.questionDetails.length === 0) return 0;
  return this.questionDetails.filter(q => q.isCorrect === true).length;
});

// Indexes
resultSchema.index({ examId: 1, createdAt: -1 });
resultSchema.index({ 'studentInfo.matricule': 1 });
resultSchema.index({ createdAt: -1 });
resultSchema.index({ percentage: -1 });
resultSchema.index({ userId: 1 });
resultSchema.index({ userId: 1, createdAt: -1 });
resultSchema.index({ qrCodeHash: 1 });

// === Domain Schema (MongoDB) ===
const subDomainSchema = new mongoose.Schema({
  name: { type: String, required: true },
  code: { type: String, required: true, uppercase: true },
  description: { type: String, default: '' },
  order: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true }
}, { _id: true });

const domainSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  description: { type: String, default: '' },
  code: { type: String, uppercase: true, unique: true, sparse: true },
  icon: { type: String, default: '🏛️' },
  color: { type: String, default: '#6366f1' },
  order: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
  subDomains: { type: [subDomainSchema], default: [] },
  categories: [{ name: String, description: String, order: Number }]
}, { timestamps: true });

const subjectSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  description: { type: String, default: '' },
  domain: { type: mongoose.Schema.Types.ObjectId, ref: 'Domain', required: true },
  sousDomaine: { type: String, default: '' },
  code: { type: String, uppercase: true, unique: true, sparse: true },
  icon: { type: String, default: '📚' },
  color: { type: String, default: '#3b82f6' },
  isActive: { type: Boolean, default: true },
  order: { type: Number, default: 0 },
  matriculeAuteur: { type: String }
}, { timestamps: true });

// Modèles
const User = mongoose.models.User || mongoose.model('User', userSchema);
const Question = mongoose.models.Question || mongoose.model('Question', questionSchema);
const Exam = mongoose.models.Exam || mongoose.model('Exam', examSchema);
const Result = mongoose.models.Result || mongoose.model('Result', resultSchema);
const Domain = mongoose.models.Domain || mongoose.model('Domain', domainSchema);
const Subject = mongoose.models.Subject || mongoose.model('Subject', subjectSchema);

// ═══════════════════════════════════════════════════════════════
// CONNEXION MONGODB
// ═══════════════════════════════════════════════════════════════
let isConnected = false;

mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 8000 })
  .then(async () => {
    isConnected = true;
    console.log('[DB] ✅ Connecté à MongoDB');
    await cleanIndexes();
    await createDefaultData();
    await generateReferencesForExistingQuestions();
  })
  .catch(err => console.error('[DB] ❌ Erreur:', err.message));

async function cleanIndexes() {
  try {
    const collection = mongoose.connection.collection('questions');
    const indexes = await collection.indexes();
    const problematicIndex = indexes.find(idx => idx.name === 'matiere_1_libQuestion_1');
    if (problematicIndex) {
      console.log('[DB] 🗑️ Suppression de l\'index problématique');
      await collection.dropIndex('matiere_1_libQuestion_1');
    }
    await collection.createIndex({ matiere: 1, libQuestion: 1 });
    console.log('[DB] ✅ Index de recherche créé');
  } catch (err) {
    console.error('[DB] Erreur nettoyage indexes:', err.message);
  }
}

async function createDefaultData() {
  try {
    const adminExists = await User.findOne({ role: 'ADMIN_SYSTEME' });
    if (!adminExists) {
      const hashedPassword = await bcrypt.hash('Admin123!', 10);
      await User.create({
        name: 'Administrateur Système',
        email: 'admin@na2quiz.com',
        username: 'admin_systeme',
        password: hashedPassword,
        role: 'ADMIN_SYSTEME',
        matricule: 'ADMIN001',
      });
      console.log('✅ Admin système créé');
    }

    const teacherExists = await User.findOne({ role: 'ENSEIGNANT' });
    if (!teacherExists) {
      const hashedPassword = await bcrypt.hash('Teacher123!', 10);
      await User.create({
        name: 'Enseignant Test',
        email: 'teacher@na2quiz.com',
        username: 'teacher_test',
        password: hashedPassword,
        role: 'ENSEIGNANT',
        matricule: 'TCH001',
      });
      console.log('✅ Enseignant créé');
    }

    const studentExists = await User.findOne({ role: 'APPRENANT' });
    if (!studentExists) {
      const hashedPassword = await bcrypt.hash('Student123!', 10);
      await User.create({
        name: 'Étudiant Test',
        email: 'student@na2quiz.com',
        username: 'student_test',
        password: hashedPassword,
        role: 'APPRENANT',
        matricule: 'STU001',
      });
      console.log('✅ Apprenant créé');
    }
  } catch (err) {
    console.error('❌ Erreur création données:', err.message);
  }
}

// ✅ Script pour générer les références des questions existantes
async function generateReferencesForExistingQuestions() {
  try {
    const approvedQuestions = await Question.find({ 
      status: 'approved', 
      reference: { $exists: false } 
    }).sort({ approvedAt: 1, createdAt: 1 });
    
    if (approvedQuestions.length === 0) {
      console.log('[DB] ✅ Aucune question existante sans référence');
      return;
    }
    
    console.log(`[DB] 🔄 Génération de références pour ${approvedQuestions.length} questions existantes...`);
    
    let counter = await Counter.findByIdAndUpdate(
      'question_reference',
      { $inc: { seq: approvedQuestions.length } },
      { new: true, upsert: true }
    );
    
    let startSeq = (counter.seq - approvedQuestions.length) + 1;
    
    for (let i = 0; i < approvedQuestions.length; i++) {
      const q = approvedQuestions[i];
      q.reference = `Q${String(startSeq + i).padStart(4, '0')}`;
      await q.save();
      console.log(`[DB] ✅ ${q.reference} - ${q.libQuestion?.substring(0, 50)}...`);
    }
    
    console.log(`[DB] 🎯 ${approvedQuestions.length} questions mises à jour avec leur référence`);
  } catch (err) {
    console.error('[DB] Erreur génération références existantes:', err);
  }
}

// ═══════════════════════════════════════════════════════════════
// MIDDLEWARE AUTH
// ═══════════════════════════════════════════════════════════════
const protect = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Non autorisé' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = await User.findById(decoded.id).select('-password');
    if (!req.user) throw new Error();
    next();
  } catch {
    res.status(401).json({ message: 'Token invalide' });
  }
};

const authorize = (...roles) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ message: 'Non autorisé' });
  if (req.user.role === 'ADMIN_SYSTEME') return next();
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ message: `Rôle ${req.user.role} non autorisé. Rôles requis: ${roles.join(', ')}` });
  }
  next();
};

// ═══════════════════════════════════════════════════════════════
// ROUTES API
// ═══════════════════════════════════════════════════════════════

// Route racine
app.get('/', (req, res) => {
  res.json({
    name: 'NA²QUIZ API',
    version: '5.0.0',
    status: 'running',
    environment: NODE_ENV,
    mongodb: isConnected ? 'connected' : 'disconnected',
    configurations: Object.keys(EXAM_FULL_CONFIGS),
    endpoints: {
      health: '/health',
      api: '/api',
      referentiel: '/api/referentiel',
      terminal: '/terminal.html',
      socket: '/socket.io',
      configs: '/api/configs'
    }
  });
});

// Route pour récupérer toutes les configurations
app.get('/api/configs', (req, res) => {
  res.json({ success: true, data: EXAM_FULL_CONFIGS });
});

// Servir terminal.html
app.get('/terminal.html', (req, res) => {
  const terminalPath = path.join(publicDir, 'terminal.html');
  if (fs.existsSync(terminalPath)) {
    res.sendFile(terminalPath);
  } else {
    res.status(404).send(`
      <!DOCTYPE html>
      <html>
      <head><title>Terminal non trouvé</title></head>
      <body>
        <h1>❌ terminal.html non trouvé</h1>
        <p>Placez le fichier terminal.html dans le dossier public/</p>
        <p>Chemin attendu: ${publicDir}/terminal.html</p>
      </body>
      </html>
    `);
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'UP', db: isConnected ? 'connected' : 'disconnected', timestamp: new Date() });
});

// ==================== ROUTES RÉFÉRENTIEL ====================
app.get('/api/referentiel/domains', (req, res) => {
  try {
    const domains = getAllDomaines();
    res.json({ success: true, data: domains });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/referentiel/sous-domaines/:domaineId', (req, res) => {
  try {
    const { domaineId } = req.params;
    const sousDomaines = getAllSousDomaines(domaineId);
    res.json({ success: true, data: sousDomaines });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/referentiel/levels/:domaineId/:sousDomaineId', (req, res) => {
  try {
    const { domaineId, sousDomaineId } = req.params;
    const levels = getAllLevels(domaineId, sousDomaineId);
    res.json({ success: true, data: levels });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/referentiel/matieres/:domaineId/:sousDomaineId', (req, res) => {
  try {
    const { domaineId, sousDomaineId } = req.params;
    const matieres = getAllMatieres(domaineId, sousDomaineId);
    res.json({ success: true, data: matieres });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/referentiel/chapitres/:matiereId', async (req, res) => {
  try {
    const { matiereId } = req.params;
    const chapitres = await Question.distinct('libChapitre', { matiereId: matiereId, status: 'approved' });
    res.json({ success: true, data: chapitres.filter(c => c && c.trim()) });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==================== AUTH ROUTES ====================
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email }).select('+password');
    if (!user) return res.status(401).json({ message: 'Email ou mot de passe incorrect' });
    if (!(await user.matchPassword(password))) return res.status(401).json({ message: 'Email ou mot de passe incorrect' });
    
    const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    res.json({
      token, _id: user._id, email: user.email, name: user.name,
      username: user.username, role: user.role, matricule: user.matricule, isAdmin: user.isAdmin
    });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

app.post('/api/auth/logout', async (req, res) => {
  res.status(200).json({ success: true, message: 'Déconnexion réussie' });
});

app.get('/api/auth/me', protect, async (req, res) => {
  res.json({ _id: req.user._id, email: req.user.email, name: req.user.name, username: req.user.username, role: req.user.role, matricule: req.user.matricule });
});

app.post('/api/auth/register', protect, authorize('ADMIN_SYSTEME', 'ADMIN_DELEGUE'), async (req, res) => {
  try {
    const { name, email, username, password, role, matricule, level, grade } = req.body;
    const userExists = await User.findOne({ $or: [{ email }, { username }] });
    if (userExists) return res.status(400).json({ message: 'Utilisateur déjà existant' });
    const user = await User.create({ name, email, username, password, role, matricule, level, grade, createdBy: req.user._id });
    res.status(201).json({ success: true, data: user });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ==================== USERS ROUTES ====================
app.get('/api/users', protect, authorize('ADMIN_SYSTEME', 'ADMIN_DELEGUE'), async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.json({ success: true, data: users });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/users/:id', protect, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) return res.status(404).json({ error: 'Utilisateur non trouvé' });
    res.json({ success: true, data: user });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/users/:id', protect, authorize('ADMIN_SYSTEME', 'ADMIN_DELEGUE', 'ENSEIGNANT'), async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, req.body, { new: true }).select('-password');
    if (!user) return res.status(404).json({ error: 'Utilisateur non trouvé' });
    res.json({ success: true, data: user });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/users/:id', protect, authorize('ADMIN_SYSTEME'), async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ error: 'Utilisateur non trouvé' });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ==================== ROUTES POUR OPÉRATEUR ====================
app.get('/api/exams/assigned', protect, authorize('OPERATEUR_EVALUATION', 'ADMIN_SYSTEME', 'ADMIN_DELEGUE'), async (req, res) => {
  try {
    let examsData;
    if (req.user.role === 'OPERATEUR_EVALUATION') {
      examsData = await Exam.find({ 
        status: 'published',
        $or: [{ assignedTo: req.user._id }, { assignedTo: null }]
      }).sort({ createdAt: -1 });
    } else {
      examsData = await Exam.find().sort({ createdAt: -1 });
    }
    res.json({ success: true, data: examsData });
  } catch (err) {
    console.error('[API] Erreur GET /api/exams/assigned:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==================== ASSIGNATION D'UNE ÉPREUVE À UN OPÉRATEUR ====================
app.put('/api/exams/:id/assign', protect, authorize('ADMIN_SYSTEME', 'ADMIN_DELEGUE'), async (req, res) => {
  try {
    const { id } = req.params;
    const { operatorId, scheduledDate, sessionRoom } = req.body;
    
    // Vérifier que l'épreuve existe
    const exam = await Exam.findById(id);
    if (!exam) {
      return res.status(404).json({ success: false, message: 'Épreuve non trouvée' });
    }
    
    // ✅ VALIDATION DE LA DATE - Ne pas autoriser les dates passées
    if (scheduledDate) {
      const proposedDate = new Date(scheduledDate);
      const now = new Date();
      // Comparer les dates sans les heures/minutes pour les dates de jour
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const proposedDay = new Date(proposedDate.getFullYear(), proposedDate.getMonth(), proposedDate.getDate());
      
      if (proposedDay < today) {
        return res.status(400).json({ 
          success: false, 
          message: 'Impossible d\'assigner une épreuve à une date passée. Veuillez sélectionner une date future ou aujourd\'hui.' 
        });
      }
    }
    
    // ✅ Vérifier si l'opérateur existe (si operatorId fourni)
    if (operatorId) {
      const operator = await User.findById(operatorId);
      if (!operator || operator.role !== 'OPERATEUR_EVALUATION') {
        return res.status(404).json({ success: false, message: 'Opérateur non trouvé ou rôle invalide' });
      }
    }
    
    // Mettre à jour l'épreuve
    const updatedExam = await Exam.findByIdAndUpdate(
      id, 
      { 
        assignedTo: operatorId || null,
        scheduledDate: scheduledDate || null,
        sessionRoom: sessionRoom || 'Salle principale',
        updatedAt: new Date()
      }, 
      { new: true }
    ).populate('assignedTo', 'name email');
    
    console.log(`[API] ✅ Épreuve ${exam.title} ${operatorId ? 'assignée à' : 'désassignée de'} ${operatorId || 'aucun opérateur'}`);
    
    res.json({ 
      success: true, 
      message: operatorId ? 'Épreuve assignée avec succès' : 'Épreuve désassignée avec succès',
      data: updatedExam 
    });
    
  } catch (err) {
    console.error('[API] Erreur assignation:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

app.get('/api/operators', protect, authorize('ADMIN_SYSTEME', 'ADMIN_DELEGUE'), async (req, res) => {
  try {
    const operators = await User.find({ role: 'OPERATEUR_EVALUATION', status: 'active' }).select('name email matricule _id');
    console.log(`[API] 📋 ${operators.length} opérateur(s) trouvé(s)`);
    res.json({ success: true, data: operators });
  } catch (err) {
    console.error('[API] Erreur GET /api/operators:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==================== QUESTIONS ROUTES ====================
app.get('/api/questions/public', async (req, res) => {
  try {
    const { domaineId, sousDomaineId, niveauId, matiereId, limit = 1000 } = req.query;
    const filter = { status: 'approved' };
    if (domaineId) filter.domaineId = domaineId;
    if (sousDomaineId) filter.sousDomaineId = sousDomaineId;
    if (niveauId) filter.niveauId = niveauId;
    if (matiereId) filter.matiereId = matiereId;
    const questions = await Question.find(filter)
      .select('+imageBase64')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));
    res.json({ success: true, data: questions, count: questions.length });
  } catch (err) { 
    res.status(500).json({ success: false, error: err.message }); 
  }
});

app.get('/api/questions/pending', protect, authorize('ADMIN_DELEGUE', 'ADMIN_SYSTEME'), async (req, res) => {
  try {
    const questions = await Question.find({ status: 'pending' })
      .select('+imageBase64')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });
    res.json({ success: true, data: questions });
  } catch (err) { 
    res.status(500).json({ success: false, error: err.message }); 
  }
});

app.get('/api/questions', protect, async (req, res) => {
  try {
    const { 
      domaineId, sousDomaineId, niveauId, matiereId, matiereCode,
      libChapitre, status, limit = 1000, page = 1, createdBy 
    } = req.query;
    
    const filter = {};
    
    if (domaineId) filter.domaineId = domaineId;
    if (sousDomaineId) filter.sousDomaineId = sousDomaineId;
    if (niveauId) filter.niveauId = niveauId;
    if (matiereId) filter.matiereId = matiereId;
    if (matiereCode) filter.matiereCode = matiereCode;
    if (libChapitre) filter.libChapitre = { $regex: libChapitre, $options: 'i' };
    if (status) filter.status = status;
    
    const userRole = req.user.role;
    const userId = req.user._id.toString();
    
    if (userRole === 'ADMIN_SYSTEME' || userRole === 'ADMIN_DELEGUE') {
      // Admins voient tout
    } else if (userRole === 'SAISISEUR') {
      filter.createdBy = new mongoose.Types.ObjectId(userId);
    } else if (userRole === 'ENSEIGNANT') {
      if (!filter.status) filter.status = 'approved';
    } else {
      filter.status = 'approved';
    }
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const questions = await Question.find(filter)
      .select('+imageBase64')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('createdBy', 'name email');
    
    const total = await Question.countDocuments(filter);
    
    console.log(`[API] 📋 ${questions.length} questions trouvées`);
    
    res.json({ 
      success: true, 
      data: questions, 
      count: questions.length, 
      total, 
      page: parseInt(page), 
      limit: parseInt(limit) 
    });
    
  } catch (err) { 
    console.error('[API] Erreur GET /api/questions:', err);
    res.status(500).json({ success: false, error: err.message }); 
  }
});

app.get('/api/questions/:id', protect, async (req, res) => {
  try {
    const question = await Question.findById(req.params.id).populate('createdBy', 'name email').select('+imageBase64');
    if (!question) return res.status(404).json({ success: false, error: 'Question non trouvée' });
    
    const userRole = req.user.role;
    const userId = req.user._id.toString();
    const isOwner = question.createdBy?._id?.toString() === userId;
    
    let canView = false;
    if (userRole === 'ADMIN_SYSTEME' || userRole === 'ADMIN_DELEGUE') {
      canView = true;
    } else if (userRole === 'SAISISEUR') {
      canView = isOwner;
    } else if (userRole === 'ENSEIGNANT') {
      canView = isOwner || question.status === 'approved';
    } else if (userRole === 'OPERATEUR_EVALUATION' || userRole === 'APPRENANT') {
      canView = question.status === 'approved';
    }
    
    if (!canView) {
      return res.status(403).json({ success: false, error: 'Accès non autorisé' });
    }
    
    res.json({ success: true, data: question });
  } catch (err) { 
    res.status(500).json({ success: false, error: err.message }); 
  }
});

app.post('/api/questions', protect, authorize('ENSEIGNANT', 'SAISISEUR', 'ADMIN_DELEGUE'), async (req, res) => {
  try {
    const { 
      libQuestion, question, options, correctAnswer, bonOpRep, 
      matiereId, matiere, matiereCode,
      niveauId, niveau,
      domaineId, domaine, domaineCode,
      sousDomaineId, sousDomaine, sousDomaineCode,
      libChapitre, typeQuestion, points, explanation, 
      type, difficulty, imageQuestion, imageBase64
    } = req.body;

    const questionText = libQuestion || question;
    if (!questionText) return res.status(400).json({ success: false, error: 'libQuestion requis' });
    if (!options || !Array.isArray(options) || options.length < 3 || options.length > 5) 
      return res.status(400).json({ success: false, error: '3 à 5 options requises' });
    
    if (!domaineId) return res.status(400).json({ success: false, error: 'domaineId requis' });
    if (!sousDomaineId) return res.status(400).json({ success: false, error: 'sousDomaineId requis' });
    if (!niveauId) return res.status(400).json({ success: false, error: 'niveauId requis' });
    if (!matiereId) return res.status(400).json({ success: false, error: 'matiereId requis' });
    if (!libChapitre || libChapitre.trim() === '') return res.status(400).json({ success: false, error: 'libChapitre requis' });
    
    const domainData = DOMAIN_DATA[domaineId];
    if (!domainData) return res.status(400).json({ success: false, error: 'Domaine invalide' });
    
    const sousDomaineData = domainData.sousDomaines[sousDomaineId];
    if (!sousDomaineData) return res.status(400).json({ success: false, error: 'Sous-domaine invalide' });
    
    const levelData = sousDomaineData.levels?.find(l => String(l.id) === niveauId);
    if (!levelData) return res.status(400).json({ success: false, error: 'Niveau invalide' });
    
    const matiereData = sousDomaineData.matieres?.find(m => String(m.id) === matiereId);
    if (!matiereData) return res.status(400).json({ success: false, error: 'Matière invalide' });
    
    let finalBonOpRep = bonOpRep;
    if (finalBonOpRep === undefined && correctAnswer !== undefined) finalBonOpRep = options.findIndex(opt => opt === correctAnswer);
    if (finalBonOpRep === undefined || finalBonOpRep < 0) return res.status(400).json({ success: false, error: 'correctAnswer ou bonOpRep requis' });
    
    const newQuestion = new Question({
      libQuestion: questionText,
      options,
      bonOpRep: finalBonOpRep,
      
      domaineId: domaineId,
      domaine: domainData.nom,
      domaineCode: domainData.code,
      sousDomaineId: sousDomaineId,
      sousDomaine: sousDomaineData.nom,
      sousDomaineCode: sousDomaineData.code,
      niveauId: niveauId,
      niveau: levelData.nom,
      matiereId: matiereId,
      matiere: matiereData.nom,
      matiereCode: matiereData.code,
      libChapitre: libChapitre,
      
      imageQuestion: imageQuestion || '',
      imageBase64: imageBase64 || '',
      typeQuestion: typeQuestion || 1,
      points: points || 1,
      explanation: explanation || '',
      type: type || 'single',
      difficulty: difficulty || 'moyen',
      createdBy: req.user._id,
      matriculeAuteur: req.user.matricule,
      status: 'pending'
    });

    await newQuestion.save();
    res.json({ success: true, message: 'Question créée et en attente de validation', data: newQuestion });
  } catch (err) { 
    res.status(500).json({ success: false, error: err.message }); 
  }
});

app.post('/api/questions/save', protect, authorize('ENSEIGNANT', 'ADMIN_DELEGUE', 'ADMIN_SYSTEME'), async (req, res) => {
  console.log('[SAVE] ===== NOUVELLE REQUÊTE REÇUE =====');
  
  try {
    const { questions } = req.body;
    
    if (!Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ success: false, error: 'Array de questions requis' });
    }
    
    const questionsWithMetadata = questions.map(q => {
      const questionText = q.libQuestion || q.question;
      let bonOpRep = q.bonOpRep;
      if (bonOpRep === undefined && q.correctAnswer !== undefined) {
        bonOpRep = q.options.findIndex(opt => opt === q.correctAnswer);
      }
      
      if (!q.libChapitre || q.libChapitre.trim() === '') {
        throw new Error(`Le chapitre est obligatoire pour la question: ${questionText?.substring(0, 50)}`);
      }
      
      const domainData = DOMAIN_DATA[q.domaineId];
      const sousDomaineData = domainData?.sousDomaines[q.sousDomaineId];
      const levelData = sousDomaineData?.levels?.find(l => String(l.id) === q.niveauId);
      const matiereData = sousDomaineData?.matieres?.find(m => String(m.id) === q.matiereId);
      
      const uniqueKey = `${q.matiere || ''}::${questionText}::${Date.now()}`;
      
      return {
        libQuestion: questionText,
        options: q.options,
        bonOpRep,
        matiere: matiereData?.nom || q.matiere,
        matiereId: q.matiereId,
        matiereCode: matiereData?.code || '',
        niveau: levelData?.nom || q.niveau,
        niveauId: q.niveauId,
        domaine: domainData?.nom || q.domaine,
        domaineId: q.domaineId,
        domaineCode: domainData?.code || '',
        sousDomaine: sousDomaineData?.nom || q.sousDomaine,
        sousDomaineId: q.sousDomaineId,
        sousDomaineCode: sousDomaineData?.code || '',
        libChapitre: q.libChapitre,
        typeQuestion: q.typeQuestion || 1,
        points: q.points || 1,
        explanation: q.explanation || '',
        type: q.type || 'single',
        difficulty: q.difficulty || 'moyen',
        createdBy: req.user._id,
        matriculeAuteur: req.user.matricule,
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
        cleInterne: uniqueKey,
        imageQuestion: q.imageQuestion || '',
        imageBase64: q.imageBase64 || '',
        imageMetadata: q.imageMetadata || { originalName: '', mimeType: '', size: 0, storageType: 'none' }
      };
    });
    
    const result = await Question.insertMany(questionsWithMetadata, { ordered: false });
    
    console.log('[SAVE] ✅ Succès!', result.length, 'questions insérées');
    
    res.json({ 
      success: true, 
      message: `${result.length} questions enregistrées et en attente de validation`, 
      data: result,
      count: result.length
    });
    
  } catch (err) {
    console.error('[SAVE] ❌ ERREUR:', err);
    
    if (err.code === 11000) {
      const insertedCount = err.result?.insertedCount || 0;
      if (insertedCount > 0) {
        return res.json({ 
          success: true, 
          message: `${insertedCount} questions enregistrées (doublons ignorés)`,
          data: { insertedCount }
        });
      } else {
        return res.status(409).json({ 
          success: false, 
          error: 'Ces questions existent déjà dans la base de données'
        });
      }
    }
    
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==================== VALIDATION DES QUESTIONS ====================
app.put('/api/questions/:id/validate', protect, authorize('ADMIN_DELEGUE', 'ADMIN_SYSTEME'), async (req, res) => {
  try {
    const { id } = req.params;
    const { approved, comment } = req.body;
    
    const question = await Question.findById(id);
    if (!question) return res.status(404).json({ success: false, message: 'Question non trouvée' });
    
    if (question.status !== 'pending') {
      return res.status(400).json({ success: false, message: `Cette question a déjà été ${question.status}` });
    }
    
    // ✅ Générer la référence si la question est approuvée
    if (approved && !question.reference) {
      const seq = await getNextSequence('question_reference');
      question.reference = `Q${String(seq).padStart(4, '0')}`;
      console.log(`[Validation] ✅ Référence générée: ${question.reference}`);
    }
    
    question.status = approved ? 'approved' : 'rejected';
    question.approvedBy = req.user._id;
    question.approvedAt = new Date();
    if (!approved && comment) question.rejectionComment = comment;
    await question.save();
    
    res.json({ success: true, message: approved ? 'Question approuvée' : 'Question rejetée', data: question });
  } catch (err) {
    console.error('[Validation] Erreur:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

app.patch('/api/questions/:id/status', protect, authorize('ADMIN_DELEGUE', 'ADMIN_SYSTEME'), async (req, res) => {
  try {
    const { id } = req.params;
    const { status, comment } = req.body;
    
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Status invalide' });
    }
    
    const question = await Question.findById(id);
    if (!question) return res.status(404).json({ success: false, message: 'Question non trouvée' });
    
    if (question.status !== 'pending') {
      return res.status(400).json({ success: false, message: `Cette question a déjà été ${question.status}` });
    }
    
    // ✅ Générer la référence si la question devient approuvée
    if (status === 'approved' && !question.reference) {
      const seq = await getNextSequence('question_reference');
      question.reference = `Q${String(seq).padStart(4, '0')}`;
      console.log(`[Status] ✅ Référence générée: ${question.reference}`);
    }
    
    question.status = status;
    question.approvedBy = req.user._id;
    question.approvedAt = new Date();
    if (status === 'rejected' && comment) question.rejectionComment = comment;
    await question.save();
    
    res.json({ success: true, message: status === 'approved' ? 'Question approuvée' : 'Question rejetée', data: question });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.get('/api/questions/validation-stats', protect, authorize('ADMIN_DELEGUE', 'ADMIN_SYSTEME'), async (req, res) => {
  try {
    const [pending, approved, rejected, total] = await Promise.all([
      Question.countDocuments({ status: 'pending' }),
      Question.countDocuments({ status: 'approved' }),
      Question.countDocuments({ status: 'rejected' }),
      Question.countDocuments()
    ]);
    
    const topValidators = await Question.aggregate([
      { $match: { approvedBy: { $exists: true } } },
      { $group: { _id: '$approvedBy', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
      { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'validator' } },
      { $unwind: { path: '$validator', preserveNullAndEmptyArrays: true } },
      { $project: { name: '$validator.name', email: '$validator.email', count: 1 } }
    ]);
    
    res.json({
      success: true,
      data: { pending, approved, rejected, total, approvalRate: total > 0 ? (approved / total * 100).toFixed(2) : 0, topValidators }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==================== UPDATE QUESTION (VERSION CORRIGÉE) ====================
app.put('/api/questions/:id', protect, authorize('ENSEIGNANT', 'SAISISEUR', 'ADMIN_DELEGUE', 'ADMIN_SYSTEME'), async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      libQuestion, question, options, correctAnswer, bonOpRep, 
      matiereId, matiere, matiereCode,
      niveauId, niveau,
      domaineId, domaine, domaineCode,
      sousDomaineId, sousDomaine, sousDomaineCode,
      libChapitre, typeQuestion, points, explanation, 
      type, difficulty, imageQuestion, imageBase64, imageMetadata,
      matriculeAuteur
    } = req.body;

    const existingQuestion = await Question.findById(id);
    if (!existingQuestion) {
      return res.status(404).json({ success: false, error: 'Question non trouvée' });
    }

    const isAdmin = ['ADMIN_SYSTEME', 'ADMIN_DELEGUE'].includes(req.user.role);
    const isOwner = existingQuestion.createdBy?.toString() === req.user._id?.toString();
    
    if (!isAdmin && !isOwner) {
      return res.status(403).json({ success: false, error: 'Non autorisé à modifier cette question' });
    }

    const questionText = libQuestion || question;
    if (!questionText || questionText.trim() === '') {
      return res.status(400).json({ success: false, error: 'libQuestion requis' });
    }
    
    let cleanOptions = options;
    if (Array.isArray(options)) {
      cleanOptions = options.filter(opt => opt && typeof opt === 'string' && opt.trim() !== '');
    }
    
    if (!cleanOptions || cleanOptions.length < 3) {
      return res.status(400).json({ success: false, error: 'Au moins 3 options sont requises' });
    }
    if (cleanOptions.length > 5) {
      return res.status(400).json({ success: false, error: 'Maximum 5 options autorisées' });
    }

    if (!domaineId) return res.status(400).json({ success: false, error: 'domaineId requis' });
    if (!sousDomaineId) return res.status(400).json({ success: false, error: 'sousDomaineId requis' });
    if (!niveauId) return res.status(400).json({ success: false, error: 'niveauId requis' });
    if (!matiereId) return res.status(400).json({ success: false, error: 'matiereId requis' });
    if (!libChapitre || libChapitre.trim() === '') {
      return res.status(400).json({ success: false, error: 'libChapitre requis' });
    }

    const domainData = DOMAIN_DATA[domaineId];
    if (!domainData) return res.status(400).json({ success: false, error: 'Domaine invalide' });
    
    const sousDomaineData = domainData.sousDomaines[sousDomaineId];
    if (!sousDomaineData) return res.status(400).json({ success: false, error: 'Sous-domaine invalide' });
    
    const levelData = sousDomaineData.levels?.find(l => String(l.id) === niveauId);
    if (!levelData) return res.status(400).json({ success: false, error: 'Niveau invalide' });
    
    const matiereData = sousDomaineData.matieres?.find(m => String(m.id) === matiereId);
    if (!matiereData) return res.status(400).json({ success: false, error: 'Matière invalide' });

    let finalBonOpRep = bonOpRep;
    if (finalBonOpRep === undefined && correctAnswer !== undefined) {
      finalBonOpRep = cleanOptions.findIndex(opt => opt === correctAnswer);
    }
    
    if (finalBonOpRep === undefined || finalBonOpRep === null) {
      return res.status(400).json({ success: false, error: 'correctAnswer ou bonOpRep requis' });
    }
    
    if (finalBonOpRep < 0 || finalBonOpRep >= cleanOptions.length) {
      return res.status(400).json({ 
        success: false, 
        error: `bonOpRep (${finalBonOpRep}) invalide. Doit être entre 0 et ${cleanOptions.length - 1}` 
      });
    }

    const updateData = {
      libQuestion: questionText,
      options: cleanOptions,
      bonOpRep: finalBonOpRep,
      
      domaineId,
      domaine: domainData.nom,
      domaineCode: domainData.code,
      sousDomaineId,
      sousDomaine: sousDomaineData.nom,
      sousDomaineCode: sousDomaineData.code,
      niveauId,
      niveau: levelData.nom,
      matiereId,
      matiere: matiereData.nom,
      matiereCode: matiereData.code,
      libChapitre: libChapitre.trim(),
      
      typeQuestion: typeQuestion || 1,
      points: points || 1,
      explanation: explanation || '',
      type: type || 'single',
      difficulty: difficulty || 'moyen',
      
      updatedAt: new Date()
    };

    if (imageQuestion !== undefined) updateData.imageQuestion = imageQuestion;
    if (imageBase64 !== undefined) updateData.imageBase64 = imageBase64;
    if (imageMetadata !== undefined) updateData.imageMetadata = imageMetadata;

    if (!isAdmin) {
      updateData.status = 'pending';
      updateData.approvedBy = null;
      updateData.approvedAt = null;
      updateData.rejectionComment = '';
    }

    if (matriculeAuteur) updateData.matriculeAuteur = matriculeAuteur;

    const updatedQuestion = await Question.findByIdAndUpdate(
      id, 
      updateData, 
      { new: true, runValidators: false }
    ).populate('createdBy', 'name email');

    if (!updatedQuestion) {
      return res.status(404).json({ success: false, error: 'Question non trouvée après mise à jour' });
    }

    console.log(`[API] ✅ Question ${id} mise à jour par ${req.user.name} (rôle: ${req.user.role})`);
    
    res.json({ 
      success: true, 
      message: !isAdmin ? 'Question modifiée et renvoyée en validation' : 'Question mise à jour avec succès',
      data: updatedQuestion 
    });
    
  } catch (err) { 
    console.error('[API] Erreur PUT /api/questions/:id:', err);
    
    if (err.name === 'ValidationError') {
      const errors = Object.values(err.errors).map(e => e.message);
      return res.status(400).json({ success: false, error: errors.join(', ') });
    }
    
    res.status(500).json({ success: false, error: err.message }); 
  }
});

// ==================== DELETE QUESTION ====================
app.delete('/api/questions/:id', protect, authorize('ENSEIGNANT', 'SAISISEUR', 'ADMIN_DELEGUE', 'ADMIN_SYSTEME'), async (req, res) => {
  try {
    const { id } = req.params;
    
    const existingQuestion = await Question.findById(id);
    if (!existingQuestion) {
      return res.status(404).json({ success: false, error: 'Question non trouvée' });
    }
    
    const isAdmin = ['ADMIN_SYSTEME', 'ADMIN_DELEGUE'].includes(req.user.role);
    const isOwner = existingQuestion.createdBy?.toString() === req.user._id?.toString();
    
    if (!isAdmin && !isOwner) {
      return res.status(403).json({ success: false, error: 'Non autorisé à supprimer cette question' });
    }
    
    if (!isAdmin && existingQuestion.status === 'approved') {
      return res.status(403).json({ success: false, error: 'Impossible de supprimer une question approuvée. Contactez un administrateur.' });
    }
    
    await Question.findByIdAndDelete(id);
    
    console.log(`[API] ✅ Question ${id} supprimée par ${req.user.name}`);
    res.json({ success: true, message: 'Question supprimée avec succès' });
    
  } catch (err) {
    console.error('[API] Erreur DELETE /api/questions/:id:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==================== EXAM ROUTES ====================
app.get('/api/exams', protect, async (req, res) => {
  try {
    let exams;
    const userRole = req.user.role;
    const userId = req.user._id;
    
    console.log(`[API] GET /api/exams - Rôle: ${userRole}, ID: ${userId}`);
    
    if (userRole === 'ADMIN_SYSTEME' || userRole === 'ADMIN_DELEGUE') {
      exams = await Exam.find().sort({ createdAt: -1 });
      console.log(`[API] ✅ Admin: ${exams.length} épreuves trouvées`);
    } else if (userRole === 'ENSEIGNANT') {
      exams = await Exam.find({ 
        $or: [{ createdBy: userId }, { status: 'published' }] 
      }).sort({ createdAt: -1 });
    } else if (userRole === 'OPERATEUR_EVALUATION') {
      exams = await Exam.find({ 
        assignedTo: userId,
        status: 'published'
      }).sort({ createdAt: -1 });
    } else {
      exams = await Exam.find({ status: 'published' }).sort({ createdAt: -1 });
    }
    
    res.json({ success: true, data: exams, count: exams.length });
  } catch (err) { 
    console.error('[API] Erreur GET /api/exams:', err);
    res.status(500).json({ success: false, message: err.message }); 
  }
});

app.get('/api/exams/available', protect, authorize('APPRENANT', 'ADMIN_SYSTEME'), async (req, res) => {
  try {
    const exams = await Exam.find({ status: 'published' }).sort({ createdAt: -1 });
    res.json({ success: true, data: exams });
  } catch (err) { 
    res.status(500).json({ success: false, message: err.message }); 
  }
});

app.get('/api/exams/teacher', protect, authorize('ENSEIGNANT', 'ADMIN_DELEGUE', 'OPERATEUR_EVALUATION', 'ADMIN_SYSTEME'), async (req, res) => {
  try {
    const exams = await Exam.find({ createdBy: req.user._id }).sort({ createdAt: -1 });
    res.json({ success: true, data: exams });
  } catch (err) { 
    res.status(500).json({ success: false, message: err.message }); 
  }
});

app.get('/api/exams/by-subject/:subject', protect, authorize('ADMIN_SYSTEME', 'ADMIN_DELEGUE', 'ENSEIGNANT', 'OPERATEUR_EVALUATION', 'APPRENANT'), async (req, res) => {
  try {
    const exams = await Exam.find({ subject: req.params.subject, status: 'published' }).sort({ createdAt: -1 });
    res.json({ success: true, data: exams });
  } catch (err) { 
    res.status(500).json({ success: false, message: err.message }); 
  }
});

app.get('/api/exams/by-domain/:domain', protect, authorize('ADMIN_SYSTEME', 'ADMIN_DELEGUE', 'ENSEIGNANT', 'OPERATEUR_EVALUATION', 'APPRENANT'), async (req, res) => {
  try {
    const filter = { domain: req.params.domain, status: 'published' };
    if (req.query.subDomain) filter['questions.sousDomaine'] = req.query.subDomain;
    const exams = await Exam.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, data: exams });
  } catch (err) { 
    res.status(500).json({ success: false, message: err.message }); 
  }
});

app.get('/api/exams/count', protect, async (req, res) => {
  try {
    const { teacher, matiere, niveau } = req.query;
    const filter = {};
    if (teacher) filter['createdBy.matricule'] = teacher;
    if (matiere) filter.matiere = matiere;
    if (niveau) filter.niveau = niveau;
    const count = await Exam.countDocuments(filter);
    res.json({ success: true, count });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/exams/:id', protect, authorize('ADMIN_SYSTEME', 'ADMIN_DELEGUE', 'ENSEIGNANT', 'OPERATEUR_EVALUATION', 'APPRENANT'), async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id);
    if (!exam) return res.status(404).json({ success: false, message: 'Examen non trouvé' });
    res.json({ success: true, data: exam });
  } catch (err) { 
    res.status(500).json({ success: false, message: err.message }); 
  }
});

app.post('/api/exams', protect, authorize('ENSEIGNANT', 'ADMIN_DELEGUE', 'ADMIN_SYSTEME', 'OPERATEUR_EVALUATION'), async (req, res) => {
  try {
    const exam = new Exam({ ...req.body, createdBy: req.user._id });
    await exam.save();
    res.status(201).json({ success: true, data: exam });
  } catch (err) { 
    console.error('[API] Erreur POST /api/exams:', err);
    res.status(500).json({ success: false, message: err.message }); 
  }
});

app.put('/api/exams/:id', protect, authorize('ENSEIGNANT', 'ADMIN_DELEGUE', 'ADMIN_SYSTEME', 'OPERATEUR_EVALUATION'), async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id);
    if (!exam) return res.status(404).json({ success: false, message: 'Examen non trouvé' });
    
    const isAdmin = ['ADMIN_SYSTEME', 'ADMIN_DELEGUE', 'OPERATEUR_EVALUATION'].includes(req.user.role);
    const isOwner = exam.createdBy?.toString() === req.user._id?.toString();
    
    if (!isAdmin && !isOwner) {
      return res.status(403).json({ success: false, message: 'Non autorisé' });
    }
    
    const updated = await Exam.findByIdAndUpdate(req.params.id, { ...req.body, updatedAt: Date.now() }, { new: true });
    res.json({ success: true, data: updated });
  } catch (err) { 
    res.status(500).json({ success: false, message: err.message }); 
  }
});

app.delete('/api/exams/:id', protect, authorize('ADMIN_SYSTEME', 'ADMIN_DELEGUE', 'OPERATEUR_EVALUATION'), async (req, res) => {
  try {
    const exam = await Exam.findByIdAndDelete(req.params.id);
    if (!exam) return res.status(404).json({ success: false, message: 'Examen non trouvé' });
    res.json({ success: true });
  } catch (err) { 
    res.status(500).json({ success: false, message: err.message }); 
  }
});

app.post('/api/exams/:id/duplicate', protect, authorize('ENSEIGNANT', 'ADMIN_DELEGUE', 'ADMIN_SYSTEME', 'OPERATEUR_EVALUATION'), async (req, res) => {
  try {
    const original = await Exam.findById(req.params.id);
    if (!original) return res.status(404).json({ success: false, message: 'Examen non trouvé' });
    
    const copy = new Exam({ 
      ...original.toObject(), 
      _id: undefined, 
      title: `${original.title} (Copie)`, 
      createdBy: req.user._id, 
      createdAt: new Date(),
      updatedAt: new Date(),
      status: 'draft'
    });
    await copy.save();
    res.status(201).json({ success: true, data: copy });
  } catch (err) { 
    res.status(500).json({ success: false, message: err.message }); 
  }
});

app.get('/api/operator/exams/all', protect, authorize('OPERATEUR_EVALUATION'), async (req, res) => {
  try {
    const exams = await Exam.find({ assignedTo: req.user._id }).sort({ scheduledDate: 1, createdAt: -1 });
    res.json(exams);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/exams/assigned-to-me', protect, authorize('OPERATEUR_EVALUATION', 'ADMIN_SYSTEME', 'ADMIN_DELEGUE'), async (req, res) => {
  try {
    const filter = { assignedTo: req.user._id };
    
    if (req.user.role !== 'OPERATEUR_EVALUATION') {
      delete filter.assignedTo;
    }
    
    const exams = await Exam.find(filter).sort({ scheduledDate: 1, createdAt: -1 });
    console.log(`[API] 📋 ${exams.length} épreuves assignées à ${req.user.name}`);
    res.json({ success: true, data: exams, count: exams.length });
  } catch (err) {
    console.error('[API] Erreur:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

app.get('/api/debug/exams', protect, authorize('ADMIN_SYSTEME'), async (req, res) => {
  try {
    const totalExams = await Exam.countDocuments();
    const examsByStatus = await Exam.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);
    const recentExams = await Exam.find().sort({ createdAt: -1 }).limit(5).select('title status createdBy createdAt');
    
    res.json({
      success: true,
      data: {
        total: totalExams,
        byStatus: examsByStatus,
        recent: recentExams,
        sample: recentExams.length > 0 ? recentExams[0] : null
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/exams/by-role', protect, async (req, res) => {
  try {
    let filter = { status: 'published' };
    const userRole = req.user.role;
    const userId = req.user._id;
    
    console.log(`[API] GET /api/exams/by-role - Rôle: ${userRole}, ID: ${userId}`);
    
    if (userRole === 'ADMIN_SYSTEME' || userRole === 'ADMIN_DELEGUE') {
      filter = {};
    } else if (userRole === 'ENSEIGNANT') {
      filter = { $or: [{ createdBy: userId }, { status: 'published' }] };
    } else if (userRole === 'OPERATEUR_EVALUATION') {
      filter = { status: 'published', assignedTo: userId };
    }
    
    const exams = await Exam.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, data: exams, count: exams.length });
  } catch (err) {
    console.error('[API] Erreur GET /api/exams/by-role:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

app.get('/api/exams/my-created', protect, authorize('ENSEIGNANT', 'ADMIN_SYSTEME', 'ADMIN_DELEGUE'), async (req, res) => {
  try {
    const exams = await Exam.find({ createdBy: req.user._id }).sort({ createdAt: -1 });
    res.json({ success: true, data: exams, count: exams.length });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==================== RESULT ROUTES ====================
app.get('/api/results/student', protect, authorize('APPRENANT', 'ADMIN_SYSTEME'), async (req, res) => {
  try {
    let results = [];
    if (req.user.matricule) {
      results = await Result.find({ 
        $or: [
          { 'studentInfo.matricule': req.user.matricule },
          { 'studentInfo.matricule': req.user.matricule?.toUpperCase() },
          { 'studentInfo.matricule': req.user.matricule?.toLowerCase() }
        ]
      }).populate('examId', 'title domain subject level').sort({ createdAt: -1 });
    }
    
    if (results.length === 0 && req.user._id) {
      results = await Result.find({ 
        $or: [{ userId: req.user._id }, { createdBy: req.user._id }, { 'studentInfo.email': req.user.email }]
      }).populate('examId', 'title domain subject level').sort({ createdAt: -1 });
    }
    
    res.json({ success: true, data: results, count: results.length });
  } catch (err) { 
    console.error('[API] Erreur:', err);
    res.status(500).json({ success: false, message: err.message }); 
  }
});

app.post('/api/results', protect, authorize('APPRENANT', 'ADMIN_SYSTEME'), async (req, res) => {
  try {
    const { examId, studentInfo, answers, config: clientConfig } = req.body;
    
    if (!examId) return res.status(400).json({ success: false, message: 'examId requis' });
    if (!studentInfo || !studentInfo.firstName || !studentInfo.lastName) {
      return res.status(400).json({ success: false, message: 'Informations étudiant requises' });
    }
    if (!answers || Object.keys(answers).length === 0) {
      return res.status(400).json({ success: false, message: 'Réponses requises' });
    }
    
    const exam = await Exam.findById(examId);
    if (!exam) return res.status(404).json({ success: false, message: 'Examen non trouvé' });
    
    const config = exam.config || clientConfig || {};
    const pointsType = config.pointsType || 'uniform';
    const globalPoints = config.globalPoints || 1;
    const openRange = config.openRange || false;
    const requiredQuestions = config.requiredQuestions || 0;
    
    const getQuestionOptions = (q) => {
      if (q.options && Array.isArray(q.options) && q.options.length > 0) return q.options;
      const options = [];
      for (let i = 1; i <= 5; i++) {
        const optKey = `opRep${i}`;
        if (q[optKey] && q[optKey] !== '') options.push(String(q[optKey]));
      }
      return options;
    };
    
    let questionsToGrade = exam.questions;
    let selectedIndices = [];
    
    if (openRange && requiredQuestions > 0) {
      const answeredQuestions = [];
      exam.questions.forEach((q, idx) => {
        const hasAnswer = answers[idx] !== undefined && answers[idx] !== null && answers[idx] !== '';
        if (hasAnswer) {
          answeredQuestions.push({ question: q, originalIndex: idx });
          selectedIndices.push(idx);
        }
      });
      questionsToGrade = answeredQuestions.slice(0, requiredQuestions).map(item => item.question);
      selectedIndices = selectedIndices.slice(0, requiredQuestions);
    } else {
      selectedIndices = exam.questions.map((_, idx) => idx);
    }
    
    let score = 0;
    let totalPoints = 0;
    const questionResults = [];
    
    for (let idx = 0; idx < questionsToGrade.length; idx++) {
      const q = questionsToGrade[idx];
      let points = q.points || 1;
      if (pointsType === 'uniform') points = globalPoints;
      totalPoints += points;
      
      let studentAnswer = null;
      const originalIdx = openRange ? selectedIndices[idx] : idx;
      
      if (answers[originalIdx] !== undefined) studentAnswer = answers[originalIdx];
      else if (answers[String(originalIdx)] !== undefined) studentAnswer = answers[String(originalIdx)];
      else if (q._id && answers[q._id.toString()] !== undefined) studentAnswer = answers[q._id.toString()];
      
      const options = getQuestionOptions(q);
      const correctAnswerIndex = q.bonOpRep;
      const correctAnswerText = options[correctAnswerIndex] || q.correctAnswer || '';
      
      let isCorrect = false;
      if (studentAnswer && studentAnswer !== '' && studentAnswer !== 'Non répondu') {
        const selectedIndex = options.findIndex(opt => String(opt).trim().toLowerCase() === String(studentAnswer).trim().toLowerCase());
        isCorrect = selectedIndex === correctAnswerIndex;
        if (!isCorrect && typeof studentAnswer === 'number') isCorrect = studentAnswer === correctAnswerIndex;
      }
      
      if (isCorrect) score += points;
      
      questionResults.push({
        questionId: q._id,
        libQuestion: q.libQuestion || q.question || q.text,
        studentAnswer: studentAnswer || 'Non répondu',
        correctAnswer: correctAnswerText,
        isCorrect,
        points: points,
        options: options,
        explanation: q.explanation || ''
      });
    }
    
    const percentage = totalPoints > 0 ? parseFloat(((score / totalPoints) * 100).toFixed(2)) : 0;
    
    const crypto = await import('crypto');
    const qrCodeHash = crypto.createHash('sha256')
      .update(`${examId}_${studentInfo.matricule}_${Date.now()}_${Math.random()}`)
      .digest('hex')
      .substring(0, 16);
    
    const result = new Result({
      examId,
      studentInfo: {
        firstName: studentInfo.firstName || '',
        lastName: studentInfo.lastName || '',
        matricule: studentInfo.matricule || '',
        level: studentInfo.level || '',
        email: studentInfo.email || req.user?.email || ''
      },
      userId: req.user?._id,
      answers: new Map(Object.entries(answers)),
      score,
      percentage,
      passed: percentage >= (exam.passingScore || 70),
      totalQuestions: exam.questions.length,
      examTitle: exam.title,
      examLevel: exam.level,
      domain: exam.domain,
      subject: exam.subject,
      duration: exam.duration,
      passingScore: exam.passingScore,
      examOption: exam.examOption,
      examQuestions: exam.questions.map(q => ({ ...q })),
      config: {
        examOption: exam.examOption,
        openRange: openRange,
        requiredQuestions: requiredQuestions,
        sequencing: config.sequencing || 'identical',
        allowRetry: config.allowRetry || false,
        showBinaryResult: config.showBinaryResult || false,
        showCorrectAnswer: config.showCorrectAnswer || false,
        timerPerQuestion: config.timerPerQuestion || false,
        timePerQuestion: config.timePerQuestion || 60,
        totalTime: config.totalTime || 60,
        pointsType: pointsType,
        globalPoints: globalPoints,
        timerDisplayMode: config.timerDisplayMode || 'permanent'
      },
      questionDetails: questionResults,
      qrCodeHash: qrCodeHash,
      generatedAt: new Date(),
      generatedBy: req.user?._id,
      ipAddress: req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress,
      userAgent: req.headers['user-agent']
    });
    
    await result.save();
    
    console.log(`[API] ✅ Résultat enregistré: ${result._id} - ${studentInfo.firstName} ${studentInfo.lastName} - ${percentage}%`);
    
    res.status(201).json({ 
      success: true, 
      data: {
        _id: result._id,
        score: result.score,
        percentage: result.percentage,
        passed: result.passed,
        examTitle: result.examTitle,
        totalQuestions: result.totalQuestions,
        qrCodeHash: result.qrCodeHash
      },
      details: questionResults
    });
    
  } catch (err) {
    console.error('[API] ❌ Erreur soumission résultats:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

app.get('/api/results/my-results', protect, authorize('APPRENANT', 'ADMIN_SYSTEME', 'ENSEIGNANT'), async (req, res) => {
  try {
    const allResults = await Result.find({}).populate('examId', 'title domain subject level').sort({ createdAt: -1 });
    const userName = req.user.name?.toLowerCase() || '';
    const userEmail = req.user.email?.toLowerCase() || '';
    const userMatricule = req.user.matricule?.toLowerCase() || '';
    
    const filteredResults = allResults.filter(r => {
      const studentName = `${r.studentInfo?.firstName || ''} ${r.studentInfo?.lastName || ''}`.toLowerCase();
      const studentEmail = (r.studentInfo?.email || '').toLowerCase();
      const studentMatricule = (r.studentInfo?.matricule || '').toLowerCase();
      return studentName === userName || studentName.includes(userName) || userName.includes(studentName) || studentEmail === userEmail || studentMatricule === userMatricule;
    });
    
    res.json({ success: true, data: filteredResults, count: filteredResults.length });
  } catch (err) {
    console.error('[API] Erreur:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

app.get('/api/results', protect, authorize('ADMIN_SYSTEME', 'ADMIN_DELEGUE', 'ENSEIGNANT', 'OPERATEUR_EVALUATION'), async (req, res) => {
  try {
    const userRole = req.user.role;
    const userId = req.user._id;
    const { examId, startDate, endDate, status, search } = req.query;
    
    let filter = {};
    
    if (examId) filter.examId = examId;
    if (status === 'passed') filter.passed = true;
    if (status === 'failed') filter.passed = false;
    
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }
    
    if (search) {
      filter.$or = [
        { 'studentInfo.firstName': { $regex: search, $options: 'i' } },
        { 'studentInfo.lastName': { $regex: search, $options: 'i' } },
        { 'studentInfo.matricule': { $regex: search, $options: 'i' } }
      ];
    }
    
    if (userRole === 'ENSEIGNANT') {
      const teacherExams = await Exam.find({ createdBy: userId }).select('_id');
      const examIds = teacherExams.map(e => e._id);
      filter.examId = { $in: examIds };
      if (examId) filter.examId = examId;
    } else if (userRole === 'OPERATEUR_EVALUATION') {
      filter = { ...filter };
    }
    
    const results = await Result.find(filter)
      .populate('examId', 'title domain subject level passingScore examOption')
      .populate('userId', 'name email matricule')
      .sort({ createdAt: -1 });
    
    console.log(`[API] 📊 ${results.length} résultats trouvés pour ${userRole}`);
    
    res.json({ success: true, data: results, count: results.length });
  } catch (err) { 
    console.error('[API] Erreur GET /api/results:', err);
    res.status(500).json({ success: false, message: err.message }); 
  }
});

app.get('/api/results/exam/:examId', protect, authorize('ENSEIGNANT', 'ADMIN_DELEGUE', 'ADMIN_SYSTEME', 'OPERATEUR_EVALUATION'), async (req, res) => {
  try {
    const examId = req.params.examId;
    const exam = await Exam.findById(examId);
    if (!exam) return res.status(404).json({ success: false, message: 'Épreuve non trouvée' });
    
    const isOwner = exam.createdBy?.toString() === req.user._id?.toString();
    const isAdmin = ['ADMIN_SYSTEME', 'ADMIN_DELEGUE', 'OPERATEUR_EVALUATION'].includes(req.user.role);
    
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Accès non autorisé' });
    }
    
    const results = await Result.find({ examId: examId }).populate('examId', 'title domain level subject passingScore').sort({ createdAt: -1 });
    res.json({ success: true, data: results, count: results.length });
  } catch (err) { 
    console.error('[API] Erreur résultats examen:', err);
    res.status(500).json({ success: false, message: err.message }); 
  }
});

app.get('/api/results/:id', protect, authorize('ADMIN_SYSTEME', 'ADMIN_DELEGUE', 'ENSEIGNANT', 'OPERATEUR_EVALUATION', 'APPRENANT'), async (req, res) => {
  try {
    const result = await Result.findById(req.params.id).populate('examId');
    if (!result) return res.status(404).json({ success: false, message: 'Résultat non trouvé' });
    
    const isOwner = result.studentInfo?.matricule === req.user.matricule || result.userId?.toString() === req.user._id?.toString();
    const isAdmin = ['ADMIN_SYSTEME', 'ADMIN_DELEGUE', 'ENSEIGNANT', 'OPERATEUR_EVALUATION'].includes(req.user.role);
    
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Accès non autorisé' });
    }
    
    res.json({ success: true, data: result });
  } catch (err) { 
    res.status(500).json({ success: false, message: err.message }); 
  }
});

// ==================== IA ROUTES ====================
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;

app.post('/api/ai/generate-questions', protect, authorize('ENSEIGNANT', 'ADMIN_DELEGUE', 'ADMIN_SYSTEME'), async (req, res) => {
  try {
    const { domain, sousDomaine, level, subject, numQuestions = 5, typeQuestion = 1, difficulty = 'moyen', keywords = '' } = req.body;
    
    if (!domain || !level || !subject) {
      return res.status(400).json({ success: false, error: 'Domain, level et subject sont requis' });
    }
    
    const prompt = `Génère ${numQuestions} questions de type QCM (${typeQuestion === 2 ? 'choix multiples' : 'choix unique'}) sur le thème "${subject}" au niveau "${level}" dans le domaine "${domain}"${sousDomaine ? `, sous-domaine "${sousDomaine}"` : ''}.
    ${keywords ? `Mots-clés spécifiques: ${keywords}` : ''}
    Difficulté: ${difficulty}
    Format JSON: { "questions": [ { "text": "question", "options": ["opt1","opt2","opt3","opt4"], "answer": "opt2", "explanation": "explication" } ] }`;
    
    let generatedQuestions = [];
    
    if (DEEPSEEK_API_KEY) {
      try {
        const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${DEEPSEEK_API_KEY}` },
          body: JSON.stringify({ model: 'deepseek-chat', messages: [{ role: 'system', content: 'Tu es un générateur de QCM pédagogique. Réponds uniquement au format JSON demandé.' }, { role: 'user', content: prompt }], temperature: 0.7, max_tokens: 4000 })
        });
        
        if (response.ok) {
          const data = await response.json();
          let content = data.choices[0]?.message?.content || '';
          content = content.trim();
          if (content.startsWith('```json')) content = content.substring(7);
          else if (content.startsWith('```')) content = content.substring(3);
          if (content.endsWith('```')) content = content.substring(0, content.length - 3);
          content = content.trim();
          
          try {
            const parsed = JSON.parse(content);
            generatedQuestions = parsed.questions || [];
          } catch (e) {
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              try {
                const parsed = JSON.parse(jsonMatch[0]);
                generatedQuestions = parsed.questions || [];
              } catch (e2) {}
            }
          }
        }
      } catch (err) {
        console.error('Erreur appel DeepSeek:', err.message);
      }
    }
    
    if (generatedQuestions.length === 0) {
      generatedQuestions = generateMockQuestions(domain, subject, level, numQuestions);
    }
    
    res.json({ success: true, questions: generatedQuestions, metadata: { model: DEEPSEEK_API_KEY ? 'deepseek-chat' : 'mock', generatedAt: new Date().toISOString(), count: generatedQuestions.length, domain, level, subject } });
  } catch (error) {
    console.error('Erreur génération IA:', error);
    res.status(500).json({ success: false, error: error.message || 'Erreur lors de la génération des questions' });
  }
});

function generateMockQuestions(domain, subject, level, count) {
  const mockQuestions = [];
  const templates = [
    { text: `Qu'est-ce que ${subject} ?`, options: [`Définition de ${subject}`, 'Une science', 'Un art', 'Une technique'], answer: `Définition de ${subject}`, explanation: `Le ${subject} est la discipline qui étudie...` },
    { text: `Quelle est l'importance de ${subject} dans le ${level} ?`, options: ['Très importante', 'Peu importante', 'Non essentielle', 'Dépend du contexte'], answer: 'Très importante', explanation: `Le ${subject} est fondamental à ce niveau.` },
    { text: `Quel est le concept clé en ${subject} ?`, options: ['Concept A', 'Concept B', 'Concept C', 'Concept D'], answer: 'Concept A', explanation: `Le concept A est central dans ${subject}.` }
  ];
  
  for (let i = 0; i < Math.min(count, templates.length); i++) {
    const t = templates[i % templates.length];
    mockQuestions.push({ text: t.text, options: t.options, answer: t.answer, explanation: t.explanation, points: 1, difficulty: 'moyen' });
  }
  
  while (mockQuestions.length < count) {
    mockQuestions.push({ text: `Question ${mockQuestions.length + 1} sur ${subject} en ${level} ?`, options: ['Option A', 'Option B', 'Option C', 'Option D'], answer: 'Option A', explanation: `Explication pour la question ${mockQuestions.length + 1}`, points: 1, difficulty: 'moyen' });
  }
  
  return mockQuestions;
}

// ==================== RANKINGS ====================
app.get('/api/rankings/:examId', protect, async (req, res) => {
  try {
    const results = await Result.find({ examId: req.params.examId }).sort({ percentage: -1, score: -1 });
    const rankings = results.map((r, i) => ({ ...r.toObject(), rank: i + 1 }));
    res.json({ success: true, rankings });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ==================== DOMAINS & SUBJECTS ====================
app.get('/api/domains', async (req, res) => {
  try {
    const domains = await Domain.find({ isActive: true }).sort({ order: 1, name: 1 });
    res.json({ success: true, data: domains });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

app.get('/api/subjects', async (req, res) => {
  try {
    const subjects = await Subject.find({ isActive: true }).populate('domain', 'name').sort({ domain: 1, order: 1, name: 1 });
    res.json({ success: true, data: subjects });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

app.get('/api/domains/:id/subjects', async (req, res) => {
  try {
    const subjects = await Subject.find({ domain: req.params.id, isActive: true }).sort({ order: 1, name: 1 });
    res.json({ success: true, data: subjects });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// ==================== STATS ====================
app.get('/api/stats', protect, async (req, res) => {
  try {
    const [users, questions, exams, results, pendingQuestions] = await Promise.all([
      User.countDocuments(), Question.countDocuments(), Exam.countDocuments(), Result.countDocuments(), Question.countDocuments({ status: 'pending' })
    ]);
    res.json({ success: true, data: { users, questions: { total: questions, pending: pendingQuestions, approved: questions - pendingQuestions }, exams, results } });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

app.get('/api/check-config', (req, res) => {
  res.json({ configured: !!process.env.DEEPSEEK_API_KEY, mode: process.env.DEEPSEEK_API_KEY ? 'api' : 'demo', mongodb: isConnected ? 'connected' : 'disconnected', environment: NODE_ENV });
});

app.get('/api/test-token', protect, async (req, res) => {
  res.json({ success: true, message: 'Token valide', user: { id: req.user._id, email: req.user.email, role: req.user.role, name: req.user.name, matricule: req.user.matricule } });
});

app.get('/api/server-info', (req, res) => {
  const localIPs = getLocalIPs();
  const primaryIP = getPrimaryLocalIP();
  res.json({
    port: PORT,
    hostname: os.hostname(),
    platform: os.platform(),
    primaryIP,
    availableIps: localIPs.map(({ name, address }) => ({ interface: name, address })),
    mongodbConnected: isConnected,
    environment: NODE_ENV,
    uptime: process.uptime()
  });
});

// ==================== STATISTIQUES AVANCÉES ====================
app.get('/api/stats/advanced', protect, authorize('ADMIN_SYSTEME', 'ADMIN_DELEGUE'), async (req, res) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    
    const [totalUsers, totalQuestions, totalExams, totalResults, pendingQuestions, approvedQuestions, rejectedQuestions, resultsThisMonth, resultsThisWeek, avgScore] = await Promise.all([
      User.countDocuments(), Question.countDocuments(), Exam.countDocuments(), Result.countDocuments(),
      Question.countDocuments({ status: 'pending' }), Question.countDocuments({ status: 'approved' }), Question.countDocuments({ status: 'rejected' }),
      Result.countDocuments({ createdAt: { $gte: startOfMonth } }), Result.countDocuments({ createdAt: { $gte: startOfWeek } }),
      Result.aggregate([{ $group: { _id: null, avg: { $avg: '$percentage' } } }])
    ]);
    
    const topScores = await Result.find().sort({ percentage: -1 }).limit(10).populate('examId', 'title');
    const questionsBySubject = await Question.aggregate([{ $group: { _id: '$matiere', count: { $sum: 1 } } }, { $sort: { count: -1 } }, { $limit: 10 }]);
    
    res.json({ success: true, data: { users: { total: totalUsers }, questions: { total: totalQuestions, pending: pendingQuestions, approved: approvedQuestions, rejected: rejectedQuestions, bySubject: questionsBySubject }, exams: { total: totalExams }, results: { total: totalResults, thisMonth: resultsThisMonth, thisWeek: resultsThisWeek, averageScore: avgScore[0]?.avg || 0, topScores } } });
  } catch (err) {
    console.error('[Stats] Erreur:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==================== ROUTES STATISTIQUES UTILISATEUR ====================
app.get('/api/users/:id/stats', protect, authorize('ADMIN_SYSTEME', 'ADMIN_DELEGUE'), async (req, res) => {
  try {
    const userId = req.params.id;
    const targetUser = await User.findById(userId);
    if (!targetUser) return res.status(404).json({ success: false, message: 'Utilisateur non trouvé' });
    
    let stats = { lastLogin: targetUser.lastLogin, createdAt: targetUser.createdAt, status: targetUser.status };
    
    if (targetUser.role === 'ENSEIGNANT' || targetUser.role === 'SAISISEUR') {
      const questionsCreated = await Question.countDocuments({ createdBy: userId });
      stats.questionsCreated = questionsCreated;
    }
    
    if (targetUser.role === 'ENSEIGNANT') {
      const examsCreated = await Exam.countDocuments({ createdBy: userId });
      stats.examsCreated = examsCreated;
    }
    
    if (targetUser.role === 'APPRENANT') {
      const resultsCount = await Result.countDocuments({ $or: [{ userId: userId }, { 'studentInfo.matricule': targetUser.matricule }] });
      stats.resultsCount = resultsCount;
      const bestResult = await Result.findOne({ $or: [{ userId: userId }, { 'studentInfo.matricule': targetUser.matricule }] }).sort({ percentage: -1 });
      if (bestResult) { stats.bestScore = bestResult.percentage; stats.bestExamTitle = bestResult.examTitle; }
    }
    
    const sessionsCount = Array.from(activeSessions.values()).filter(s => s.userId === userId || s.sessionId === targetUser.matricule).length;
    stats.sessionCount = sessionsCount;
    
    res.json({ success: true, data: stats });
  } catch (err) {
    console.error('[API] Erreur stats utilisateur:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

app.get('/api/users/:id/sessions', protect, authorize('ADMIN_SYSTEME', 'ADMIN_DELEGUE'), async (req, res) => {
  try {
    const userId = req.params.id;
    const targetUser = await User.findById(userId);
    if (!targetUser) return res.status(404).json({ success: false, message: 'Utilisateur non trouvé' });
    
    const activeUserSessions = Array.from(activeSessions.values()).filter(s => s.userId === userId || s.studentInfo?.matricule === targetUser.matricule || s.studentInfo?.email === targetUser.email);
    const sessions = activeUserSessions.map(s => ({ _id: s.socketId, socketId: s.socketId, type: s.type, status: s.status, currentExamId: s.currentExamId, examOption: s.examOption, progress: s.progress || 0, score: s.score || 0, studentInfo: s.studentInfo, lastUpdate: s.lastUpdate, isOnline: s.isOnline !== false, createdAt: new Date(s.lastUpdate || Date.now()) }));
    
    res.json({ success: true, data: sessions, count: sessions.length });
  } catch (err) {
    console.error('[API] Erreur sessions utilisateur:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/users/:id/reset-password', protect, authorize('ADMIN_SYSTEME', 'ADMIN_DELEGUE'), async (req, res) => {
  try {
    const userId = req.params.id;
    const targetUser = await User.findById(userId);
    if (!targetUser) return res.status(404).json({ success: false, message: 'Utilisateur non trouvé' });
    
    const temporaryPassword = Math.random().toString(36).slice(-8) + Math.floor(Math.random() * 1000);
    const hashedPassword = await bcrypt.hash(temporaryPassword, 10);
    targetUser.password = hashedPassword;
    await targetUser.save();
    
    res.json({ success: true, message: 'Mot de passe réinitialisé', temporaryPassword: temporaryPassword });
  } catch (err) {
    console.error('[API] Erreur reset password:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

app.patch('/api/users/:id/status', protect, authorize('ADMIN_SYSTEME', 'ADMIN_DELEGUE'), async (req, res) => {
  try {
    const userId = req.params.id;
    const { active } = req.body;
    const targetUser = await User.findById(userId);
    if (!targetUser) return res.status(404).json({ success: false, message: 'Utilisateur non trouvé' });
    
    targetUser.status = active !== false ? 'active' : 'inactive';
    await targetUser.save();
    res.json({ success: true, message: `Utilisateur ${active !== false ? 'activé' : 'désactivé'}`, data: { _id: targetUser._id, status: targetUser.status } });
  } catch (err) {
    console.error('[API] Erreur changement statut:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/users/bulk', protect, authorize('ADMIN_SYSTEME'), async (req, res) => {
  try {
    const { userIds, action } = req.body;
    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ success: false, message: 'Liste d\'utilisateurs requise' });
    }
    
    let result;
    switch (action) {
      case 'activate': result = await User.updateMany({ _id: { $in: userIds } }, { status: 'active' }); break;
      case 'deactivate': result = await User.updateMany({ _id: { $in: userIds } }, { status: 'inactive' }); break;
      case 'delete': result = await User.deleteMany({ _id: { $in: userIds } }); break;
      default: return res.status(400).json({ success: false, message: 'Action non reconnue' });
    }
    
    res.json({ success: true, message: `${result.modifiedCount || result.deletedCount || 0} utilisateur(s) traités`, data: result });
  } catch (err) {
    console.error('[API] Erreur bulk action:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==================== UPLOAD ROUTES ====================
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `qcm-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 }, fileFilter: (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  if (allowedTypes.test(path.extname(file.originalname).toLowerCase()) && allowedTypes.test(file.mimetype)) cb(null, true);
  else cb(new Error('Seules les images sont autorisées'));
} });

app.post('/api/upload/question-image', protect, authorize('ENSEIGNANT', 'ADMIN_DELEGUE', 'ADMIN_SYSTEME'), upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, error: 'Aucun fichier uploadé' });
    const fileBuffer = fs.readFileSync(req.file.path);
    const base64Image = `data:${req.file.mimetype};base64,${fileBuffer.toString('base64')}`;
    res.json({ success: true, imageUrl: `/uploads/questions/${req.file.filename}`, imageBase64: base64Image, filename: req.file.filename });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

app.post('/api/upload/question-image-base64', protect, authorize('ENSEIGNANT', 'ADMIN_DELEGUE', 'ADMIN_SYSTEME'), async (req, res) => {
  try {
    const { base64, mimeType, originalName } = req.body;
    if (!base64) return res.status(400).json({ success: false, error: 'Base64 requis' });
    if (base64.startsWith('http')) return res.json({ success: true, imageUrl: base64, imageBase64: '' });
    res.json({ success: true, imageUrl: '', imageBase64: base64, metadata: { originalName: originalName || 'image.png', mimeType: mimeType || 'image/png', storageType: 'base64' } });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

app.delete('/api/upload/question-image/:filename', protect, authorize('ENSEIGNANT', 'ADMIN_DELEGUE', 'ADMIN_SYSTEME'), (req, res) => {
  try {
    const filePath = path.join(uploadsDir, req.params.filename);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// ==================== BULLETIN HTML ====================
function escapeHtml(text) {
  if (!text) return '';
  return String(text).replace(/[&<>]/g, (m) => {
    if (m === '&') return '&amp;';
    if (m === '<') return '&lt;';
    if (m === '>') return '&gt;';
    return m;
  });
}

app.get('/api/bulletin/:resultId', async (req, res) => {
  try {
    const result = await Result.findById(req.params.resultId).populate('examId');
    if (!result) return res.status(404).send('<!DOCTYPE html><html><head><title>Erreur</title></head><body><h1>Résultat introuvable</h1></body></html>');
    
    const exam = result.examId;
    
    let token = req.headers.authorization?.split(' ')[1];
    if (!token && req.query.token) {
      token = req.query.token;
    }
    
    let user = null;
    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        user = await User.findById(decoded.id);
      } catch(e) {
        console.log('[Bulletin] Token invalide:', e.message);
      }
    }
    
    const isAdmin = user && (user.role === 'ADMIN_SYSTEME' || user.role === 'ADMIN_DELEGUE');
    const isOwner = result.userId?.toString() === user?._id?.toString();
    const isStudent = result.studentInfo?.matricule === user?.matricule;
    
    if (!isAdmin && !isOwner && !isStudent && user) {
      return res.status(403).send('<!DOCTYPE html><html><head><title>Accès non autorisé</title></head><body><h1>Accès non autorisé</h1></body></html>');
    }
    
    const crypto = await import('crypto');
    const qrHash = crypto.createHash('sha256')
      .update(`${result._id}${process.env.JWT_SECRET}${result.createdAt}`)
      .digest('hex')
      .substring(0, 16);
    
    const verifyUrl = `${FRONTEND_URL}/verify/${qrHash}`;
    
    const questions = result.examQuestions?.length ? result.examQuestions : exam?.questions || [];
    const answers = result.answers instanceof Map ? Object.fromEntries(result.answers) : result.answers || {};
    const totalPoints = questions.reduce((sum, q) => sum + (q.points || 1), 0) || questions.length;
    const noteOn20 = ((result.percentage / 100) * 20).toFixed(2);
    
    let mention = '';
    if (result.percentage >= 90) mention = 'Très Bien';
    else if (result.percentage >= 75) mention = 'Bien';
    else if (result.percentage >= 60) mention = 'Assez Bien';
    else if (result.percentage >= 50) mention = 'Passable';
    else mention = 'Insuffisant';
    
    const getOptions = (q) => {
      if (q.options?.length > 0) return q.options;
      const opts = [];
      for (let i = 1; i <= 5; i++) {
        const v = q[`opRep${i}`];
        if (v && v !== '') opts.push(String(v));
      }
      return opts;
    };
    
    let correctCount = 0;
    let rows = '';
    questions.forEach((q, i) => {
      const opts = getOptions(q);
      const correctIdx = typeof q.bonOpRep === 'number' ? q.bonOpRep : -1;
      const correctAnswer = opts[correctIdx] || q.correctAnswer || '—';
      const qId = q._id?.toString();
      const studentAnswer = answers[i] || answers[String(i)] || (qId ? answers[qId] : null) || '—';
      
      let isCorrect = false;
      if (studentAnswer !== '—' && studentAnswer !== null) {
        const selectedIdx = opts.findIndex(opt => String(opt).trim() === String(studentAnswer).trim());
        isCorrect = correctIdx >= 0 ? selectedIdx === correctIdx : String(studentAnswer).trim() === String(correctAnswer).trim();
      }
      if (isCorrect) correctCount++;
      
      const pts = q.points || 1;
      rows += `<tr style="border-bottom:1px solid #e2e8f0; background:${i%2===0?'#fafafa':'white'}">
                <td style="padding:10px 8px; text-align:center; font-weight:600;">${i+1}<\/td>
                <td style="padding:10px 8px; font-size:0.85rem;">${escapeHtml(q.libQuestion || q.question || '—')}<\/td>
                <td style="padding:10px 8px; color:${isCorrect?'#16a34a':'#dc2626'}; font-weight:600;">${escapeHtml(String(studentAnswer))}<\/td>
                <td style="padding:10px 8px; color:#16a34a; font-weight:500;">${escapeHtml(String(correctAnswer))}<\/td>
                <td style="padding:10px 8px; text-align:center;">${isCorrect ? '✅' : '❌'}<\/td>
                <td style="padding:10px 8px; text-align:center; color:#3b82f6;">${pts}<\/td>
              <\/tr>`;
    });
    
    const qrData = encodeURIComponent(`${verifyUrl}|ID:${result._id}|MAT:${result.studentInfo?.matricule||''}|PCT:${result.percentage}%`);
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${qrData}&bgcolor=ffffff&color=1e293b`;
    
    const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bulletin NA²QUIZ — ${escapeHtml(result.studentInfo?.lastName||'Candidat')}</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box;}
    body{font-family:'Segoe UI',Arial,sans-serif;background:#f1f5f9;padding:20px;}
    .page{max-width:860px;margin:0 auto;background:white;border-radius:16px;overflow:hidden;box-shadow:0 8px 32px rgba(0,0,0,0.12);}
    .header{background:linear-gradient(135deg,#0f172a,#1e293b);color:white;padding:24px 32px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:16px;}
    .logo-block .logo{font-size:2.2rem;font-weight:900;letter-spacing:-1px;background:linear-gradient(135deg,#f59e0b,#60a5fa);-webkit-background-clip:text;background-clip:text;color:transparent;}
    .badge{padding:8px 20px;border-radius:999px;font-weight:700;font-size:0.9rem;border:2px solid;}
    .badge.pass{background:rgba(16,185,129,.15);color:#10b981;border-color:#10b981;}
    .badge.fail{background:rgba(239,68,68,.15);color:#ef4444;border-color:#ef4444;}
    .qr-block{text-align:center;font-size:0.6rem;color:#94a3b8;}
    .score-bar{background:linear-gradient(135deg,#3b82f6,#6366f1);padding:20px 32px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:16px;}
    .score-pct{font-size:3rem;font-weight:900;color:white;line-height:1;}
    .score-meta{text-align:right;}
    .score-meta .note{font-size:1.4rem;font-weight:700;color:white;}
    .mention-badge{display:inline-block;background:rgba(255,255,255,.2);padding:4px 12px;border-radius:999px;font-size:0.75rem;margin-top:4px;}
    .body{padding:24px 32px;}
    .grid2{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:20px;}
    .card{background:#f8fafc;border-radius:10px;padding:14px;border:1px solid #e2e8f0;}
    .card-lbl{font-size:0.65rem;text-transform:uppercase;color:#64748b;letter-spacing:.06em;margin-bottom:4px;}
    .card-val{font-size:0.92rem;font-weight:600;color:#0f172a;}
    .section-title{font-size:0.75rem;text-transform:uppercase;color:#64748b;letter-spacing:.08em;margin:16px 0 8px;font-weight:600;}
    table{width:100%;border-collapse:collapse;font-size:0.82rem;}
    thead tr{background:#0f172a;}
    thead th{padding:10px 8px;text-align:left;color:white;font-weight:600;}
    tbody tr:nth-child(even){background:#f8fafc;}
    .footer{background:#0f172a;padding:14px 32px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:16px;}
    .footer-text{font-size:0.65rem;color:#64748b;}
    .btn{background:#3b82f6;color:white;border:none;padding:10px 24px;border-radius:8px;cursor:pointer;font-size:0.85rem;margin-top:16px;}
    .no-print{text-align:center;}
    .watermark{position:fixed;bottom:20px;right:20px;opacity:0.05;font-size:5rem;pointer-events:none;}
    @media print{.no-print{display:none;}body{padding:0;}@page{size:A4;margin:10mm;}}
  </style>
</head>
<body>
<div class="watermark">NA²QUIZ</div>
<div class="page">
  <div class="header">
    <div class="logo-block">
      <div class="logo">NA²QUIZ</div>
      <div class="subtitle">Bulletin de Résultats Officiel</div>
    </div>
    <div class="badge ${result.passed?'pass':'fail'}">${result.passed?'✓ REÇU':'✗ AJOURNÉ'}</div>
    <div class="qr-block">
      <img src="${qrUrl}" alt="QR Sécurité" width="80" height="80" style="border-radius:6px;border:2px solid #334155;"/>
      <div style="margin-top:3px;">Vérif. sécurité</div>
    </div>
  </div>
  <div class="score-bar">
    <div>
      <div class="score-pct">${result.percentage}%</div>
      <div style="color:rgba(255,255,255,.8);font-size:0.8rem;margin-top:2px;">${correctCount} bonne(s) réponse(s) sur ${questions.length}</div>
    </div>
    <div class="score-meta">
      <div class="note">Note : ${noteOn20} / 20</div>
      <div class="mention-badge">${mention}</div>
      <div style="font-size:0.75rem;margin-top:4px;">Score : ${result.score} / ${totalPoints} pts</div>
    </div>
  </div>
  <div class="body">
    <div class="grid2">
      <div class="card"><div class="card-lbl">Candidat</div><div class="card-val">${escapeHtml((result.studentInfo?.lastName||'').toUpperCase())} ${escapeHtml(result.studentInfo?.firstName||'')}</div></div>
      <div class="card"><div class="card-lbl">Matricule</div><div class="card-val" style="font-family:monospace">${escapeHtml(result.studentInfo?.matricule||'—')}</div></div>
      <div class="card"><div class="card-lbl">Épreuve</div><div class="card-val">${escapeHtml(result.examTitle||exam?.title||'—')}</div></div>
      <div class="card"><div class="card-lbl">Niveau / Matière</div><div class="card-val">${escapeHtml(result.examLevel||'')} ${result.subject?'· '+escapeHtml(result.subject):''}</div></div>
      <div class="card"><div class="card-lbl">Seuil de réussite</div><div class="card-val">${result.passingScore||70}%</div></div>
      <div class="card"><div class="card-lbl">Date de composition</div><div class="card-val">${new Date(result.createdAt).toLocaleString('fr-FR', { timeZone: 'Africa/Douala' })}</div></div>
    </div>
    <div class="section-title">Détail des réponses</div>
    <table>
      <thead>
        <tr><th>#</th><th>Question</th><th>Votre réponse</th><th>Bonne réponse</th><th>Résultat</th><th>Pts</th></tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="no-print">
      <button class="btn" onclick="window.print()">🖨️ Imprimer / Enregistrer PDF</button>
    </div>
  </div>
  <div class="footer">
    <div class="footer-text">
      <div>NA²QUIZ · Système d'Évaluation Numérique</div>
      <div>Africanut Industry · Ebolowa, Cameroun</div>
    </div>
    <div class="footer-text" style="text-align:right;">
      <div>Réf. bulletin : ${result._id}</div>
      <div>Hash: ${qrHash}</div>
    </div>
  </div>
</div>
</body>
</html>`;
    
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (err) {
    console.error('[API] Erreur bulletin:', err);
    res.status(500).send('<!DOCTYPE html><html><head><title>Erreur</title></head><body><h1>Erreur lors de la génération du bulletin</h1></body></html>');
  }
});

app.get('/api/bulletin/verify/:resultId', async (req, res) => {
  try {
    const result = await Result.findById(req.params.resultId).select('studentInfo score percentage passed examTitle createdAt');
    if (!result) return res.status(404).json({ valid: false, message: 'Bulletin non trouvé' });
    res.json({ valid: true, candidat: `${result.studentInfo?.lastName} ${result.studentInfo?.firstName}`, matricule: result.studentInfo?.matricule, epreuve: result.examTitle, score: `${result.score}pts · ${result.percentage}%`, statut: result.passed ? 'REÇU' : 'AJOURNÉ', date: result.createdAt });
  } catch (err) { 
    res.status(500).json({ valid: false, error: err.message }); 
  }
});

// ═══════════════════════════════════════════════════════════════
// ROUTE NETWORK-INFO - Pour la détection automatique des IPs (UNE SEULE FOIS)
// ═══════════════════════════════════════════════════════════════

/**
 * Retourne toutes les IPs locales de la machine (IPv4 non-loopback)
 */
function getLocalIPs() {
  const interfaces = os.networkInterfaces();
  const ips = [];
  for (const [name, addrs] of Object.entries(interfaces)) {
    if (!addrs) continue;
    for (const addr of addrs) {
      if (
        addr.family === 'IPv4' &&
        !addr.internal &&
        addr.address !== '0.0.0.0'
      ) {
        ips.push({ name, address: addr.address });
      }
    }
  }
  return ips;
}

/**
 * Retourne l'IP principale du réseau local
 */
function getPrimaryLocalIP() {
  const ips = getLocalIPs();
  const priority = [
    (ip) => ip.address.startsWith('192.168.'),
    (ip) => ip.address.startsWith('10.'),
    (ip) => /^172\.(1[6-9]|2\d|3[01])\./.test(ip.address),
  ];
  for (const test of priority) {
    const found = ips.find(test);
    if (found) return found.address;
  }
  return ips[0]?.address || 'localhost';
}

app.get('/api/network-info', (req, res) => {
  const localIPs = getLocalIPs();
  const primaryIP = getPrimaryLocalIP();
  const PORT = process.env.PORT || 5000;

  res.json({
    success: true,
    hostname: os.hostname(),
    platform: os.platform(),
    primaryIP,
    port: PORT,
    localIPs: localIPs.map(({ name, address }) => ({
      interface: name,
      ip: address,
      backendUrl: `http://${address}:${PORT}`,
      frontendUrl: `http://${address}:3000`,
      terminalUrl: `http://${address}:${PORT}/terminal.html`,
    })),
    recommended: {
      backend: `http://${primaryIP}:${PORT}`,
      frontend: `http://${primaryIP}:3000`,
      terminal: `http://${primaryIP}:${PORT}/terminal.html`,
    },
    qrData: `http://${primaryIP}:3000`,
    environment: process.env.NODE_ENV || 'development',
    uptime: process.uptime(),
    mongoConnected: mongoose.connection.readyState === 1,
    timestamp: new Date().toISOString(),
  });
});

// ==================== SOCKET.IO ====================
const activeSessions = new Map();
const activeDistributedExams = new Map();
const pendingReconnections = new Map();
const connectionAttempts = new Map();

const rateLimitSocket = (ip) => {
  const now = Date.now();
  const attempts = connectionAttempts.get(ip) || [];
  const recent = attempts.filter(t => now - t < 60000);
  
  if (recent.length >= 30) {
    return false;
  }
  
  recent.push(now);
  connectionAttempts.set(ip, recent);
  return true;
};

const io = new Server(server, {
  cors: { 
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      
      const allowedOrigins = [
        'http://localhost:3000',
        'http://localhost:5000',
        'https://na2quizapp.netlify.app',
        'https://na2quizapp.onrender.com'
      ];
      
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      if (origin?.endsWith('.netlify.app')) {
        return callback(null, true);
      }
      if (origin?.endsWith('.onrender.com')) {
        return callback(null, true);
      }
      
      if (origin.match(/^https?:\/\/(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.)/)) {
        return callback(null, true);
      }
      
      console.warn(`[Socket] ⚠️ Origine acceptée: ${origin}`);
      callback(null, true);
    },
    credentials: true, 
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept']
  },
  transports: ['polling'],
  allowUpgrades: false,
  pingTimeout: 60000,
  pingInterval: 25000,
  cookie: false,
  path: '/socket.io/',
  serveClient: true,
  connectTimeout: 45000,
  allowEIO3: true,
  perMessageDeflate: false,
  maxHttpBufferSize: 1e6
});

io.use((socket, next) => {
  const clientIp = socket.handshake.address;
  if (rateLimitSocket(clientIp)) {
    next();
  } else {
    console.log(`[Socket] 🚫 Rate limit dépassé pour ${clientIp}`);
    next(new Error('Too many connection attempts'));
  }
});

io.engine.on('connection_error', (err) => {
  console.log('[Socket] ❌ Erreur de connexion:', err.message, err.req?.headers?.origin);
});

const emitRealtimeStats = (examId) => {
  if (!examId) return;
  const students = Array.from(activeSessions.values()).filter(s => s.type === 'student' && s.currentExamId === examId && s.status === 'composing');
  const stats = { 
    examId, 
    activeStudentsCount: students.length, 
    averageScore: students.length > 0 ? students.reduce((a, b) => a + (b.score || 0), 0) / students.length : 0, 
    averageProgress: students.length > 0 ? students.reduce((a, b) => a + (b.progress || 0), 0) / students.length : 0, 
    lastUpdate: new Date() 
  };
  io.to('surveillance').emit('realtimeExamStats', stats);
};

const emitSessionUpdate = () => {
  const sessionsToSend = Array.from(activeSessions.values()).filter(s => s.type !== 'surveillance');
  io.emit('sessionUpdate', { activeSessions: sessionsToSend });
};

io.on('connection', (socket) => {
  console.log(`[Socket] 🔌 Nouvelle connexion: ${socket.id}`);
  
  socket.on('registerSession', (data) => {
    console.log(`[Socket] registerSession reçu: type=${data.type}, sessionId=${data.sessionId}, socketId=${socket.id}`);
    
    const existingSessions = Array.from(activeSessions.entries()).filter(([id, s]) => 
      s.type === data.type && s.sessionId === data.sessionId
    );
    
    for (const [oldSocketId, oldSession] of existingSessions) {
      if (oldSocketId !== socket.id) {
        console.log(`[Socket] 🗑️ Nettoyage ancienne session ${oldSocketId} (type ${data.type})`);
        activeSessions.delete(oldSocketId);
        const oldSocket = io.sockets.sockets.get(oldSocketId);
        if (oldSocket && oldSocket.connected) {
          oldSocket.disconnect(true);
        }
      }
    }
    
    const pending = pendingReconnections.get(data.sessionId);
    if (pending) {
      clearTimeout(pending);
      pendingReconnections.delete(data.sessionId);
    }
    
    let session = activeSessions.get(socket.id);
    if (!session) {
      session = {
        socketId: socket.id,
        type: data.type,
        sessionId: data.sessionId || socket.id,
        status: data.status || 'idle',
        currentExamId: data.examId || null,
        studentInfo: data.studentInfo || null,
        examOption: data.examOption || null,
        userId: data.userId || null,
        progress: 0,
        score: 0,
        currentQuestion: 0,
        lastUpdate: Date.now(),
        isOnline: true,
        reconnectCount: 0
      };
    } else {
      session.lastUpdate = Date.now();
      session.isOnline = true;
      session.status = data.status || session.status;
      if (data.examId) session.currentExamId = data.examId;
    }
    
    activeSessions.set(socket.id, session);
    
    if (data.type === 'student' && data.examId) socket.join(`exam:${data.examId}`);
    if (data.type === 'terminal') socket.join('terminals');
    if (data.type === 'surveillance') socket.join('surveillance');
    if (data.type === 'teacher') {
      socket.join('teachers');
      if (data.userId) session.userId = data.userId;
    }
    
    console.log(`[Socket] ✅ Session enregistrée: ${data.type}, total sessions: ${activeSessions.size}`);
    emitSessionUpdate();
    if (data.examId) emitRealtimeStats(data.examId);
  });
  
  socket.on('ping', () => {
    const session = activeSessions.get(socket.id);
    if (session) {
      session.lastUpdate = Date.now();
      session.isOnline = true;
      session.reconnectCount = 0;
    }
    socket.emit('pong');
  });
  
  socket.on('terminalReady', (data) => {
    const session = activeSessions.get(socket.id);
    if (session) {
      session.status = 'connected';
      session.lastUpdate = Date.now();
      console.log(`[Socket] 🖥️ Terminal prêt: ${data?.terminalId || socket.id}`);
      emitSessionUpdate();
    }
  });

  socket.on('distributeExam', (data) => {
    const { examId, examOption } = data || {};
    if (!examId) {
      console.warn('[Socket] distributeExam: examId manquant');
      return;
    }

    console.log(`[Socket] 📡 Distribution épreuve ${examId} option ${examOption} par ${socket.id}`);

    const config = EXAM_FULL_CONFIGS[examOption] || EXAM_FULL_CONFIGS['C'];

    activeDistributedExams.set(examId, { examId, examOption, config, distributedAt: Date.now() });

    let terminalCount = 0;
    for (const [sid, session] of activeSessions) {
      if (session.type === 'terminal') {
        session.status = 'exam_distributed';
        session.currentExamId = examId;
        session.examOption = examOption;
        terminalCount++;
        const termSocket = io.sockets.sockets.get(sid);
        if (termSocket && termSocket.connected) {
          termSocket.emit('examDistributed', { examId, examOption, config });
        }
      }
    }

    console.log(`[Socket] ✅ Épreuve distribuée à ${terminalCount} terminal(aux)`);
    emitSessionUpdate();
    socket.emit('distributeExamConfirm', { success: true, terminalCount, examId, examOption });
  });

  socket.on('terminalReadyForExam', (data) => {
    const { examId, examOption, terminalId } = data || {};
    const session = activeSessions.get(socket.id);
    if (session) {
      session.status = 'exam_distributed';
      session.currentExamId = examId;
      session.examOption = examOption;
      session.lastUpdate = Date.now();
      console.log(`[Socket] 📋 Terminal ${terminalId} accusé de réception pour ${examId} option ${examOption}`);
      emitSessionUpdate();
    }
  });

  socket.on('startExam', (data) => {
    const { examId, option } = data || {};
    if (!examId) return;

    console.log(`[Socket] 🚀 Démarrage épreuve ${examId} option ${option}`);

    let startedCount = 0;

    for (const [sid, session] of activeSessions) {
      if (session.type === 'student' && session.currentExamId === examId && session.status === 'waiting') {
        session.status = 'composing';
        startedCount++;
        const stuSocket = io.sockets.sockets.get(sid);
        if (stuSocket && stuSocket.connected) {
          stuSocket.emit('examStarted', { examId, examOption: option || session.examOption });
        }
      }
    }

    io.to(`exam:${examId}`).emit('examStarted', { examId, examOption: option });

    console.log(`[Socket] ✅ ${startedCount} étudiant(s) notifiés`);
    socket.emit('examStartedConfirm', { success: true, startedCount, examId });
    emitSessionUpdate();
    emitRealtimeStats(examId);
  });

  socket.on('finishExam', (data) => {
    const { examId } = data || {};
    if (!examId) return;

    console.log(`[Socket] 🏁 Fin épreuve ${examId}`);

    for (const [sid, session] of activeSessions) {
      if (session.type === 'student' && session.currentExamId === examId && session.status === 'composing') {
        session.status = 'forced-finished';
        const stuSocket = io.sockets.sockets.get(sid);
        if (stuSocket && stuSocket.connected) {
          stuSocket.emit('forceFinishExam', { examId, reason: 'Clôture par le superviseur' });
        }
      }
    }

    for (const [sid, session] of activeSessions) {
      if (session.type === 'terminal' && session.currentExamId === examId) {
        session.status = 'connected';
        session.currentExamId = null;
        const termSocket = io.sockets.sockets.get(sid);
        if (termSocket && termSocket.connected) {
          termSocket.emit('examFinished', { examId });
        }
      }
    }

    activeDistributedExams.delete(examId);
    io.to('surveillance').emit('examFinishedConfirm', { examId });
    emitSessionUpdate();
  });

  socket.on('advanceQuestionForOptionA', (data) => {
    const { examId, nextQuestionIndex } = data || {};
    if (!examId) return;
    console.log(`[Socket] ⏭️ Option A — Question ${nextQuestionIndex} pour ${examId}`);
    io.to(`exam:${examId}`).emit('advanceToQuestion', { examId, questionIndex: nextQuestionIndex });
  });

  socket.on('displayQuestion', (data) => {
    const { examId, questionIndex } = data || {};
    if (!examId) return;
    console.log(`[Socket] 📺 Option B — Affichage question ${questionIndex} pour ${examId}`);
    io.to(`exam:${examId}`).emit('showQuestion', { examId, questionIndex });
  });

  socket.on('studentProgressUpdate', (data) => {
    const session = activeSessions.get(socket.id);
    if (session && data) {
      session.progress   = data.progress   ?? session.progress;
      session.score      = data.score      ?? session.score;
      session.percentage = data.percentage ?? session.percentage;
      session.currentQuestion = data.currentQuestion ?? session.currentQuestion;
      session.status     = data.status     ?? session.status;
      session.lastUpdate = Date.now();
      io.to('surveillance').emit('studentProgressUpdate', { studentId: socket.id, ...data });
      if (session.currentExamId) emitRealtimeStats(session.currentExamId);
    }
  });

  socket.on('examSubmitting', (data) => {
    const session = activeSessions.get(socket.id);
    if (session) {
      session.status = 'submitting';
      session.lastUpdate = Date.now();
      io.to('surveillance').emit('studentSubmitting', { studentId: socket.id, examId: data?.examId });
      emitSessionUpdate();
    }
  });

  socket.on('examSubmitted', (data) => {
    const session = activeSessions.get(socket.id);
    if (session) {
      session.status = 'finished';
      session.lastUpdate = Date.now();
      io.to('surveillance').emit('studentFinished', { studentId: socket.id, examResultId: data?.examResultId });
      if (session.currentExamId) emitRealtimeStats(session.currentExamId);
      emitSessionUpdate();
    }
  });

  socket.on('getWaitingStudents', (data, callback) => {
    const { examId } = data || {};
    const waiting = Array.from(activeSessions.values()).filter(
      s => s.type === 'student' && s.currentExamId === examId && s.status === 'waiting'
    );
    const count = waiting.length;
    io.to('surveillance').emit('waitingCountUpdate', { examId, count });
    if (typeof callback === 'function') callback({ count });
  });

  const handleStudentWaiting = (data) => {
    const { examId, examOption, studentInfo, sessionId: stuSessionId, config } = data || {};
    if (!examId) return;

    socket.join(`exam:${examId}`);
    const existingSession = activeSessions.get(socket.id);
    if (existingSession) {
      existingSession.type = 'student';
      existingSession.status = 'waiting';
      existingSession.currentExamId = examId;
      existingSession.examOption = examOption;
      existingSession.studentInfo = studentInfo || null;
      existingSession.sessionId = stuSessionId || existingSession.sessionId;
      existingSession.config = config || null;
      existingSession.lastUpdate = Date.now();
    } else {
      activeSessions.set(socket.id, {
        socketId: socket.id, type: 'student', sessionId: stuSessionId || socket.id,
        status: 'waiting', currentExamId: examId, examOption, config: config || null,
        studentInfo: studentInfo || null, progress: 0, score: 0,
        currentQuestion: 0, lastUpdate: Date.now(), isOnline: true, reconnectCount: 0
      });
    }

    const waitingCount = Array.from(activeSessions.values()).filter(
      s => s.type === 'student' && s.currentExamId === examId && s.status === 'waiting'
    ).length;

    io.to('surveillance').emit('waitingCountUpdate', { examId, count: waitingCount });
    io.to('terminals').emit('waitingCountUpdate', { examId, count: waitingCount });
    emitSessionUpdate();
    console.log(`[Socket] ⏳ Étudiant en attente pour ${examId} — option ${examOption} — total: ${waitingCount}`);
  };

  socket.on('joinWaiting', handleStudentWaiting);
  socket.on('studentReadyForExam', handleStudentWaiting);

  socket.on('disconnect', (reason) => {
    console.log(`[Socket] ❌ Déconnexion: ${socket.id}, raison: ${reason}`);
    const session = activeSessions.get(socket.id);
    if (session) {
      session.isOnline = false;
      session.lastUpdate = Date.now();
      
      if (session.type === 'student') {
        io.to('surveillance').emit('studentDisconnected', {
          studentName: session.studentInfo ? `${session.studentInfo.firstName} ${session.studentInfo.lastName}` : 'Inconnu',
          examId: session.currentExamId,
          socketId: socket.id
        });
        if (session.currentExamId) emitRealtimeStats(session.currentExamId);
      }
      
      const timeout = setTimeout(() => {
        const currentSession = activeSessions.get(socket.id);
        if (currentSession && !currentSession.isOnline) {
          console.log(`[Socket] 🗑️ Suppression session expirée: ${socket.id}`);
          activeSessions.delete(socket.id);
          emitSessionUpdate();
        }
        pendingReconnections.delete(session.sessionId);
      }, 30000);
      
      pendingReconnections.set(session.sessionId, timeout);
    }
  });
});

setInterval(() => {
  const now = Date.now();
  for (const [socketId, session] of activeSessions) {
    if (now - (session.lastUpdate || now) > 30000) {
      const socket = io.sockets.sockets.get(socketId);
      if (socket && socket.connected) {
        socket.emit('ping');
      }
    }
  }
}, 15000);

app.get('/api/active-sessions', (req, res) => {
  const sessions = Array.from(activeSessions.values());
  res.json({ success: true, count: sessions.length, sessions });
});

app.get('/api/surveillance-data', (req, res) => {
  const sessions = Array.from(activeSessions.values());
  const waitingStudents = sessions.filter(s => s.type === 'student' && s.status === 'waiting');
  const realtimeStats = { activeStudentsCount: sessions.filter(s => s.type === 'student' && s.status === 'composing').length, averageScore: 0, passRate: 0, lastUpdate: new Date() };
  res.json({ success: true, activeSessions: sessions, waitingStudents, realtimeStats });
});

// ==================== 404 ====================
app.use('*', (req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} introuvable` });
});

// ═══════════════════════════════════════════════════════════════
// DÉMARRAGE
// ═══════════════════════════════════════════════════════════════
server.listen(PORT, '0.0.0.0', () => {
  const localIPs  = getLocalIPs();
  const primaryIP = getPrimaryLocalIP();

  // ─── Fonctions d'affichage ────────────────────────────────────
  const LINE   = '═'.repeat(64);
  const row = (label, value) => {
    const content = `${label}${String(value)}`;
    return `║  ${content.padEnd(60)}║`;
  };

  console.log('');
  console.log(`╔${LINE}╗`);
  console.log(`║${'  NA²QUIZ — Serveur Socket.IO v5.0.0'.padEnd(64)}║`);
  console.log(`╠${LINE}╣`);
  console.log(row('🌍 Environnement : ', NODE_ENV));
  console.log(row('🖥️  Hostname      : ', os.hostname()));
  console.log(row('📡 Port          : ', PORT));
  console.log(row('💾 MongoDB       : ', isConnected ? '✅ Connecté' : '❌ Déconnecté'));
  console.log(row('🎛️  Configs       : ', Object.keys(EXAM_FULL_CONFIGS).join(', ')));
  console.log(`╠${LINE}╣`);
  console.log(`║${'  📍 ACCÈS LOCAUX — utilisables depuis tout le réseau'.padEnd(64)}║`);
  console.log(`╠${LINE}╣`);

  if (localIPs.length === 0) {
    console.log(row('⚠️  ', 'Aucune interface réseau locale détectée'));
  } else {
    localIPs.forEach(({ name, address }) => {
      console.log(row(`🔌 [${name.padEnd(14)}] `, `http://${address}:${PORT}`));
      console.log(row('   Frontend  → ', `http://${address}:3000`));
      console.log(row('   Terminal  → ', `http://${address}:${PORT}/terminal.html`));
      if (localIPs.length > 1) console.log(`╠${LINE}╣`);
    });
    if (localIPs.length === 1) console.log(`╠${LINE}╣`);
  }

  console.log(row('🌐 IP principale : ', `http://${primaryIP}:3000`));
  console.log(row('ℹ️  API réseau    : ', `http://${primaryIP}:${PORT}/api/network-info`));
  console.log(`╚${LINE}╝`);
  console.log('');
});

export default app;