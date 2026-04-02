// socket-server/server.js - Version finale corrigée
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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

// ═══════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════
const PORT = process.env.PORT || 10000;
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://na2quizapp.netlify.app';
const JWT_SECRET = process.env.JWT_SECRET || 'na2quiz_secret_key';
const NODE_ENV = process.env.NODE_ENV || 'development';
const isProduction = NODE_ENV === 'production';
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI non défini');
  if (isProduction) process.exit(1);
}

// ═══════════════════════════════════════════════════════════════
// CORS - Configuration complète
// ═══════════════════════════════════════════════════════════════
const CORS_ORIGINS = [
  FRONTEND_URL,
  'https://na2quizapp.netlify.app',
  'http://localhost:3000',
  'http://localhost:5000',
  'http://localhost:5001',
  'http://127.0.0.1:3000',
  'http://192.168.0.1:3000',
  'http://192.168.106.51:5000',
];

// ═══════════════════════════════════════════════════════════════
// INITIALISATION EXPRESS
// ═══════════════════════════════════════════════════════════════
const app = express();
const server = createServer(app);

// CORS
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (!isProduction) return callback(null, true);
    if (CORS_ORIGINS.includes(origin)) return callback(null, true);
    console.warn(`[CORS] Origine bloquée: ${origin}`);
    callback(new Error('CORS non autorisé'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Security (désactivé en dev pour éviter les blocages)
if (isProduction) {
  app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" }, contentSecurityPolicy: false }));
  app.use(compression());
}

// Trust proxy (Render passe par un reverse proxy — obligatoire pour express-rate-limit)
app.set('trust proxy', 1);

// Rate limiting
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

// Servir les fichiers statiques (uploads + terminal.html)
app.use(express.static(publicDir));
app.use('/uploads', express.static(path.join(publicDir, 'uploads')));

// ═══════════════════════════════════════════════════════════════
// SCHÉMAS MONGOOSE (COMPLETS)
// ═══════════════════════════════════════════════════════════════

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
  role: { type: String, enum: ['APPRENANT', 'ENSEIGNANT', 'OPERATEUR_EVALUATION', 'ADMIN_DELEGUE', 'ADMIN_SYSTEME'], default: 'APPRENANT' },
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

// === Question Schema ===
const questionSchema = new mongoose.Schema({
  domaine: { type: String, required: true },
  sousDomaine: { type: String, default: '' },
  niveau: { type: String, required: true },
  matiere: { type: String, required: true },
  libChapitre: { type: String, default: '' },
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

// Index (cleInterne sans unicité pour éviter les doublons)
questionSchema.index({ cleInterne: 1 });
questionSchema.index({ matiere: 1, libQuestion: 1 });
questionSchema.index({ domaine: 1, niveau: 1, matiere: 1 });
questionSchema.index({ status: 1 });

// Génération de cleInterne unique avant sauvegarde
questionSchema.pre('save', function(next) {
  if (this.matiere && this.libQuestion) {
    const cleanMatiere = this.matiere.replace(/[^a-zA-Z0-9]/g, '_');
    const cleanLib = this.libQuestion.substring(0, 50).replace(/[^a-zA-Z0-9]/g, '_');
    this.cleInterne = `${cleanMatiere}::${cleanLib}::${Date.now()}`;
  } else if (!this.cleInterne) {
    this.cleInterne = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
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

// === Exam Schema ===
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
  examOption: { type: String, enum: ['A', 'B', 'C', 'D', null], default: null },
  cleExterne: { type: String, default: '' }
}, { timestamps: true });

examSchema.virtual('totalPoints').get(function() {
  return this.questions?.reduce((sum, q) => sum + (q.points || 1), 0) || 0;
});

examSchema.virtual('questionCount').get(function() {
  return this.questions?.length || 0;
});

// === Result Schema ===
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
  examOption: { type: String, enum: ['A', 'B', 'C', 'D', null], default: null },
  examQuestions: { type: Array, default: [] },
  pdfPath: { type: String, default: null },
  cleExterne: { type: String, default: '' }
}, { timestamps: true });

resultSchema.virtual('fullName').get(function() {
  return `${this.studentInfo.firstName} ${this.studentInfo.lastName}`;
});

resultSchema.virtual('note20').get(function() {
  return ((this.percentage / 100) * 20).toFixed(2);
});

// === Domain Schema ===
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

// === Subject Schema ===
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
    await createDefaultData();
  })
  .catch(err => console.error('[DB] ❌ Erreur:', err.message));

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
    version: '2.0.0',
    status: 'running',
    environment: NODE_ENV,
    mongodb: isConnected ? 'connected' : 'disconnected',
    endpoints: {
      health: '/health',
      api: '/api',
      terminal: '/terminal.html',
      socket: '/socket.io'
    }
  });
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

// ==================== QUESTIONS ROUTES ====================
app.get('/api/questions/public', async (req, res) => {
  try {
    const { domaine, sousDomaine, niveau, matiere, limit = 1000 } = req.query;
    const filter = { status: 'approved' };
    if (domaine) filter.domaine = domaine;
    if (sousDomaine) filter.sousDomaine = sousDomaine;
    if (niveau) filter.niveau = niveau;
    if (matiere) filter.matiere = matiere;
    const questions = await Question.find(filter).sort({ createdAt: -1 }).limit(parseInt(limit));
    res.json({ success: true, data: questions, count: questions.length });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

app.get('/api/questions/pending', protect, authorize('ADMIN_DELEGUE'), async (req, res) => {
  try {
    const questions = await Question.find({ status: 'pending' }).populate('createdBy', 'name email').sort({ createdAt: -1 });
    res.json({ success: true, data: questions });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

app.get('/api/questions', protect, async (req, res) => {
  try {
    const { domaine, sousDomaine, niveau, matiere, status, limit = 1000, page = 1 } = req.query;
    const filter = {};
    if (domaine) filter.domaine = domaine;
    if (sousDomaine) filter.sousDomaine = sousDomaine;
    if (niveau) filter.niveau = niveau;
    if (matiere) filter.matiere = matiere;
    if (status) filter.status = status;
    else if (req.user.role !== 'ADMIN_DELEGUE') filter.status = 'approved';
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const questions = await Question.find(filter).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)).populate('createdBy', 'name email');
    const total = await Question.countDocuments(filter);
    res.json({ success: true, data: questions, count: questions.length, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

app.get('/api/questions/:id', protect, async (req, res) => {
  try {
    const question = await Question.findById(req.params.id).populate('createdBy', 'name email').select('+imageBase64');
    if (!question) return res.status(404).json({ success: false, error: 'Question non trouvée' });
    const canView = req.user.role === 'ADMIN_DELEGUE' || (req.user.role === 'ENSEIGNANT' && (question.status === 'approved' || question.createdBy?._id?.toString() === req.user._id?.toString()));
    if (!canView) return res.status(403).json({ success: false, error: 'Accès non autorisé' });
    res.json({ success: true, data: question });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

app.post('/api/questions', protect, authorize('ENSEIGNANT', 'ADMIN_DELEGUE'), async (req, res) => {
  try {
    const { libQuestion, question, options, correctAnswer, bonOpRep, matiere, niveau, domaine, sousDomaine, typeQuestion, points, explanation, type, difficulty, imageQuestion, imageBase64 } = req.body;
    const questionText = libQuestion || question;
    if (!questionText) return res.status(400).json({ success: false, error: 'libQuestion requis' });
    if (!options || !Array.isArray(options) || options.length < 3 || options.length > 5) return res.status(400).json({ success: false, error: '3 à 5 options requises' });
    if (!matiere) return res.status(400).json({ success: false, error: 'matiere requis' });
    if (!niveau) return res.status(400).json({ success: false, error: 'niveau requis' });
    if (!domaine) return res.status(400).json({ success: false, error: 'domaine requis' });
    
    let finalBonOpRep = bonOpRep;
    if (finalBonOpRep === undefined && correctAnswer !== undefined) finalBonOpRep = options.findIndex(opt => opt === correctAnswer);
    if (finalBonOpRep === undefined || finalBonOpRep < 0) return res.status(400).json({ success: false, error: 'correctAnswer ou bonOpRep requis' });
    
    const newQuestion = new Question({
      libQuestion: questionText, options, bonOpRep: finalBonOpRep, matiere, niveau, domaine, sousDomaine: sousDomaine || '',
      imageQuestion: imageQuestion || '', imageBase64: imageBase64 || '', typeQuestion: typeQuestion || 1,
      points: points || 1, explanation: explanation || '', type: type || 'single', difficulty: difficulty || 'moyen',
      createdBy: req.user._id, matriculeAuteur: req.user.matricule, status: 'pending'
    });
    await newQuestion.save();
    res.json({ success: true, message: 'Question créée et en attente de validation', data: newQuestion });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

app.post('/api/questions/save', protect, authorize('ENSEIGNANT', 'ADMIN_DELEGUE'), async (req, res) => {
  try {
    const { questions } = req.body;
    if (!Array.isArray(questions) || questions.length === 0) return res.status(400).json({ success: false, error: 'Array de questions requis' });
    
    const questionsWithMetadata = [];
    for (const q of questions) {
      // Vérifier si la question existe déjà (éviter doublons)
      const existing = await Question.findOne({ 
        matiere: q.matiere, 
        libQuestion: q.libQuestion 
      });
      
      if (existing) {
        console.log(`[Questions] Question dupliquée ignorée: ${q.libQuestion?.substring(0, 50)}`);
        continue;
      }
      
      const questionText = q.libQuestion || q.question;
      let bonOpRep = q.bonOpRep;
      if (bonOpRep === undefined && q.correctAnswer !== undefined) bonOpRep = q.options.findIndex(opt => opt === q.correctAnswer);
      
      questionsWithMetadata.push({
        libQuestion: questionText, 
        options: q.options, 
        bonOpRep, 
        matiere: q.matiere || '', 
        niveau: q.niveau || '', 
        domaine: q.domaine || '',
        sousDomaine: q.sousDomaine || '', 
        typeQuestion: q.typeQuestion || 1, 
        points: q.points || 1, 
        explanation: q.explanation || '',
        type: q.type || 'single', 
        difficulty: q.difficulty || 'moyen', 
        createdBy: req.user._id, 
        matriculeAuteur: req.user.matricule,
        status: 'pending', 
        createdAt: new Date(), 
        updatedAt: new Date()
      });
    }
    
    if (questionsWithMetadata.length === 0) {
      return res.json({ success: true, message: 'Aucune nouvelle question à ajouter', data: [] });
    }
    
    const result = await Question.insertMany(questionsWithMetadata);
    res.json({ success: true, message: `${result.length} questions enregistrées`, data: result });
  } catch (err) { 
    console.error('[Questions] Erreur save:', err);
    res.status(500).json({ success: false, error: err.message }); 
  }
});

app.put('/api/questions/:id', protect, async (req, res) => {
  try {
    const question = await Question.findById(req.params.id);
    if (!question) return res.status(404).json({ success: false, error: 'Question non trouvée' });
    const canEdit = req.user.role === 'ADMIN_DELEGUE' || (question.createdBy?.toString() === req.user._id?.toString() && question.status === 'pending');
    if (!canEdit) return res.status(403).json({ success: false, error: 'Non autorisé' });
    const updated = await Question.findByIdAndUpdate(req.params.id, { ...req.body, updatedAt: new Date() }, { new: true });
    res.json({ success: true, data: updated });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

app.put('/api/questions/:id/validate', protect, authorize('ADMIN_DELEGUE'), async (req, res) => {
  try {
    const { approved, comment } = req.body;
    const question = await Question.findById(req.params.id);
    if (!question) return res.status(404).json({ success: false, error: 'Question non trouvée' });
    question.status = approved ? 'approved' : 'rejected';
    if (comment) question.rejectionComment = comment;
    question.approvedBy = req.user._id;
    question.approvedAt = new Date();
    await question.save();
    res.json({ success: true, message: approved ? 'Question approuvée' : 'Question rejetée', data: question });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

app.delete('/api/questions/:id', protect, async (req, res) => {
  try {
    const question = await Question.findById(req.params.id);
    if (!question) return res.status(404).json({ success: false, error: 'Question non trouvée' });
    const canDelete = req.user.role === 'ADMIN_DELEGUE' || (question.createdBy?.toString() === req.user._id?.toString() && question.status === 'pending');
    if (!canDelete) return res.status(403).json({ success: false, error: 'Non autorisé' });
    await Question.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Question supprimée' });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// ==================== EXAM ROUTES ====================
app.get('/api/exams/available', protect, authorize('APPRENANT', 'ADMIN_SYSTEME'), async (req, res) => {
  try {
    const exams = await Exam.find({ status: 'published' }).sort({ createdAt: -1 });
    res.json({ success: true, data: exams });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

app.get('/api/exams/teacher', protect, authorize('ENSEIGNANT', 'ADMIN_DELEGUE', 'OPERATEUR_EVALUATION', 'ADMIN_SYSTEME'), async (req, res) => {
  try {
    const exams = await Exam.find({ createdBy: req.user._id }).sort({ createdAt: -1 });
    res.json({ success: true, data: exams });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

app.get('/api/exams/by-subject/:subject', protect, authorize('ADMIN_SYSTEME', 'ADMIN_DELEGUE', 'ENSEIGNANT', 'OPERATEUR_EVALUATION', 'APPRENANT'), async (req, res) => {
  try {
    const exams = await Exam.find({ subject: req.params.subject, status: 'published' }).sort({ createdAt: -1 });
    res.json({ success: true, data: exams });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

app.get('/api/exams/by-domain/:domain', protect, authorize('ADMIN_SYSTEME', 'ADMIN_DELEGUE', 'ENSEIGNANT', 'OPERATEUR_EVALUATION', 'APPRENANT'), async (req, res) => {
  try {
    const filter = { domain: req.params.domain, status: 'published' };
    if (req.query.subDomain) filter['questions.sousDomaine'] = req.query.subDomain;
    const exams = await Exam.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, data: exams });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

app.post('/api/exams/:id/duplicate', protect, authorize('ENSEIGNANT', 'ADMIN_DELEGUE', 'ADMIN_SYSTEME', 'OPERATEUR_EVALUATION'), async (req, res) => {
  try {
    const original = await Exam.findById(req.params.id);
    if (!original) return res.status(404).json({ success: false, message: 'Examen non trouvé' });
    const copy = new Exam({ ...original.toObject(), _id: undefined, title: `${original.title} (Copie)`, createdBy: req.user._id, createdAt: new Date() });
    await copy.save();
    res.status(201).json({ success: true, data: copy });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

app.get('/api/exams', protect, authorize('ADMIN_SYSTEME', 'ADMIN_DELEGUE', 'ENSEIGNANT', 'OPERATEUR_EVALUATION', 'APPRENANT'), async (req, res) => {
  try {
    const exams = await Exam.find().sort({ createdAt: -1 });
    res.json({ success: true, data: exams, count: exams.length });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

app.get('/api/exams/:id', protect, authorize('ADMIN_SYSTEME', 'ADMIN_DELEGUE', 'ENSEIGNANT', 'OPERATEUR_EVALUATION', 'APPRENANT'), async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id);
    if (!exam) return res.status(404).json({ success: false, message: 'Examen non trouvé' });
    res.json({ success: true, data: exam });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

app.post('/api/exams', protect, authorize('ENSEIGNANT', 'ADMIN_DELEGUE', 'ADMIN_SYSTEME', 'OPERATEUR_EVALUATION'), async (req, res) => {
  try {
    const exam = new Exam({ ...req.body, createdBy: req.user._id });
    await exam.save();
    res.status(201).json({ success: true, data: exam });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

app.put('/api/exams/:id', protect, authorize('ENSEIGNANT', 'ADMIN_DELEGUE', 'ADMIN_SYSTEME', 'OPERATEUR_EVALUATION'), async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id);
    if (!exam) return res.status(404).json({ success: false, message: 'Examen non trouvé' });
    const isAdmin = ['ADMIN_SYSTEME', 'ADMIN_DELEGUE', 'OPERATEUR_EVALUATION'].includes(req.user.role);
    const isOwner = exam.createdBy?.toString() === req.user._id?.toString();
    if (!isAdmin && !isOwner) return res.status(403).json({ success: false, message: 'Non autorisé' });
    const updated = await Exam.findByIdAndUpdate(req.params.id, { ...req.body, updatedAt: Date.now() }, { new: true });
    res.json({ success: true, data: updated });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

app.delete('/api/exams/:id', protect, authorize('ADMIN_SYSTEME', 'ADMIN_DELEGUE', 'OPERATEUR_EVALUATION'), async (req, res) => {
  try {
    const exam = await Exam.findByIdAndDelete(req.params.id);
    if (!exam) return res.status(404).json({ success: false, message: 'Examen non trouvé' });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ==================== RESULT ROUTES ====================
app.get('/api/results/student', protect, authorize('APPRENANT', 'ADMIN_SYSTEME'), async (req, res) => {
  try {
    const results = await Result.find({ 'studentInfo.matricule': req.user.matricule }).populate('examId', 'title domain subject level').sort({ createdAt: -1 });
    res.json({ success: true, data: results });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

app.get('/api/results/exam/:examId', protect, authorize('ENSEIGNANT', 'ADMIN_DELEGUE', 'ADMIN_SYSTEME', 'OPERATEUR_EVALUATION'), async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.examId);
    if (!exam) return res.status(404).json({ success: false, message: 'Épreuve non trouvée' });
    const isOwner = exam.createdBy?.toString() === req.user._id?.toString();
    const isAdmin = ['ADMIN_SYSTEME', 'ADMIN_DELEGUE', 'OPERATEUR_EVALUATION'].includes(req.user.role);
    if (!isOwner && !isAdmin) return res.status(403).json({ success: false, message: 'Accès non autorisé' });
    const results = await Result.find({ examId: req.params.examId }).sort({ percentage: -1 });
    res.json({ success: true, data: results });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

app.get('/api/results', protect, authorize('ADMIN_SYSTEME', 'ADMIN_DELEGUE', 'ENSEIGNANT', 'OPERATEUR_EVALUATION'), async (req, res) => {
  try {
    const results = await Result.find({}).populate('examId', 'title domain subject level passingScore').sort({ createdAt: -1 });
    res.json({ success: true, data: results, count: results.length });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

app.get('/api/results/:id', protect, authorize('ADMIN_SYSTEME', 'ADMIN_DELEGUE', 'ENSEIGNANT', 'OPERATEUR_EVALUATION', 'APPRENANT'), async (req, res) => {
  try {
    const result = await Result.findById(req.params.id).populate('examId');
    if (!result) return res.status(404).json({ success: false, message: 'Résultat non trouvé' });
    const isOwner = result.studentInfo?.matricule === req.user.matricule;
    const isAdmin = ['ADMIN_SYSTEME', 'ADMIN_DELEGUE', 'ENSEIGNANT', 'OPERATEUR_EVALUATION'].includes(req.user.role);
    if (!isOwner && !isAdmin) return res.status(403).json({ success: false, message: 'Accès non autorisé' });
    res.json({ success: true, data: result });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

app.post('/api/results', protect, authorize('APPRENANT', 'ADMIN_SYSTEME'), async (req, res) => {
  try {
    const { examId, studentInfo, answers } = req.body;
    const exam = await Exam.findById(examId);
    if (!exam) return res.status(404).json({ success: false, message: 'Examen non trouvé' });
    
    let score = 0;
    const totalPoints = exam.questions.reduce((sum, q) => sum + (q.points || 1), 0);
    const answersMap = new Map(Object.entries(answers));
    
    exam.questions.forEach(q => {
      const studentAnswer = answersMap.get(q._id.toString());
      const isCorrect = studentAnswer != null && Number(studentAnswer) === q.bonOpRep;
      if (isCorrect) score += (q.points || 1);
    });
    
    const percentage = totalPoints > 0 ? parseFloat(((score / totalPoints) * 100).toFixed(2)) : 0;
    
    const result = new Result({
      examId, studentInfo: { firstName: studentInfo.firstName, lastName: studentInfo.lastName, matricule: studentInfo.matricule, level: studentInfo.level },
      answers: answersMap, score, percentage, passed: percentage >= (exam.passingScore || 70), totalQuestions: exam.questions.length,
      examTitle: exam.title, examLevel: exam.level, domain: exam.domain, subject: exam.subject, category: exam.category,
      duration: exam.duration, passingScore: exam.passingScore, examOption: exam.examOption, examQuestions: exam.questions
    });
    await result.save();
    res.status(201).json({ success: true, message: 'Résultat soumis avec succès', data: result });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

app.delete('/api/results/:id', protect, authorize('ADMIN_SYSTEME', 'ADMIN_DELEGUE', 'OPERATEUR_EVALUATION'), async (req, res) => {
  try {
    const result = await Result.findByIdAndDelete(req.params.id);
    if (!result) return res.status(404).json({ success: false, message: 'Résultat non trouvé' });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ==================== IA ROUTES ====================
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;

// Fonction pour extraire et nettoyer le JSON d'une réponse
function extractJSONFromResponse(content) {
  if (!content) return null;
  
  let cleanContent = content.trim();
  
  // Supprimer les balises markdown
  cleanContent = cleanContent.replace(/```json\s*/gi, '');
  cleanContent = cleanContent.replace(/```\s*/g, '');
  
  if (cleanContent.startsWith('json')) {
    cleanContent = cleanContent.substring(4);
  }
  
  cleanContent = cleanContent.trim();
  
  // Chercher un tableau de questions
  const arrayMatch = cleanContent.match(/\[\s*\{[\s\S]*\}\s*\]/);
  if (arrayMatch) {
    let extracted = arrayMatch[0];
    // Nettoyer les virgules en trop
    extracted = extracted.replace(/,\s*}/g, '}');
    extracted = extracted.replace(/,\s*]/g, ']');
    extracted = extracted.replace(/},\s*,/g, '},');
    return extracted;
  }
  
  // Chercher un objet avec "questions"
  const objMatch = cleanContent.match(/\{\s*"questions"\s*:\s*\[[\s\S]*\]\s*\}/);
  if (objMatch) {
    let extracted = objMatch[0];
    extracted = extracted.replace(/,\s*}/g, '}');
    extracted = extracted.replace(/,\s*]/g, ']');
    return extracted;
  }
  
  // Fallback : trouver le premier [ et le dernier ]
  const firstBracket = cleanContent.indexOf('[');
  const lastBracket = cleanContent.lastIndexOf(']');
  if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
    let extracted = cleanContent.substring(firstBracket, lastBracket + 1);
    extracted = extracted.replace(/,\s*}/g, '}');
    extracted = extracted.replace(/,\s*]/g, ']');
    return extracted;
  }
  
  return null;
}

// Fonction pour extraire les questions par regex (fallback ultime)
function extractQuestionsByRegex(content) {
  const questions = [];
  // Pattern plus robuste pour capturer les questions
  const regex = /"text"\s*:\s*"([^"]+)"\s*,\s*"options"\s*:\s*\[([^\]]+)\]\s*,\s*"answer"\s*:\s*"([^"]+)"/g;
  let match;
  
  while ((match = regex.exec(content)) !== null) {
    const options = match[2].split(',').map(o => o.trim().replace(/^"|"$/g, ''));
    questions.push({
      text: match[1],
      options: options,
      answer: match[3],
      explanation: ''
    });
  }
  
  return questions;
}

// Fonction pour valider une question générée
function validateQuestion(q) {
  return q && 
         typeof q.text === 'string' && q.text.trim().length > 5 &&
         Array.isArray(q.options) && q.options.length >= 2 &&
         typeof q.answer === 'string' && q.answer.trim().length > 0;
}

// Fonction pour corriger une question mal formée
function fixQuestion(q, index, subject, level) {
  const fixed = { ...q };
  
  if (!fixed.text || fixed.text.trim().length < 5) {
    fixed.text = `Question ${index + 1} sur ${subject} (niveau ${level})`;
  }
  
  if (!Array.isArray(fixed.options) || fixed.options.length < 2) {
    fixed.options = ['Option A', 'Option B', 'Option C', 'Option D'];
  }
  
  if (!fixed.answer || !fixed.options.includes(fixed.answer)) {
    fixed.answer = fixed.options[0];
  }
  
  if (!fixed.explanation) {
    fixed.explanation = `La bonne réponse est : ${fixed.answer}`;
  }
  
  fixed.points = fixed.points || 1;
  fixed.difficulty = fixed.difficulty || 'moyen';
  
  return fixed;
}

// Route de configuration IA
app.get('/api/ai/config', protect, authorize('ENSEIGNANT', 'ADMIN_DELEGUE'), (req, res) => {
  res.json({
    success: true,
    configured: !!DEEPSEEK_API_KEY,
    model: DEEPSEEK_API_KEY ? 'deepseek-chat' : 'mock',
    maxQuestions: 30,
    supportedTypes: [1, 2]
  });
});

// Route de génération IA - CORRIGÉE
app.post('/api/ai/generate-questions', protect, authorize('ENSEIGNANT', 'ADMIN_DELEGUE', 'ADMIN_SYSTEME'), async (req, res) => {
  try {
    const { 
      domain, sousDomaine, level, subject, 
      numQuestions = 5, 
      typeQuestion = 1,
      difficulty = 'moyen',
      keywords = '' 
    } = req.body;

    if (!domain || !level || !subject) {
      return res.status(400).json({ 
        success: false, 
        error: 'Domaine, niveau et matière sont requis' 
      });
    }

    // Prompt plus strict
    const prompt = `Génère EXACTEMENT ${numQuestions} questions QCM au format JSON VALIDE.
RÈGLES IMPÉRATIVES:
1. Réponds UNIQUEMENT avec un tableau JSON, rien d'autre
2. Pas de markdown, pas de backticks, pas de texte explicatif
3. Le JSON doit être valide (pas de virgules en trop)
4. Utilise des guillemets doubles partout

Exemple VALIDE:
[
  {
    "text": "Question ?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "answer": "Option A",
    "explanation": "Explication"
  }
]

Sujet: "${subject}"
Niveau: ${level}
Domaine: ${domain}
${sousDomaine ? `Sous-domaine: ${sousDomaine}` : ''}
${keywords ? `Mots-clés: ${keywords}` : ''}
Difficulté: ${difficulty}
Nombre: ${numQuestions}`;

    let generatedQuestions = [];

    if (DEEPSEEK_API_KEY) {
      try {
        console.log('[IA] Appel à DeepSeek API...');
        
        const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
          },
          body: JSON.stringify({
            model: 'deepseek-chat',
            messages: [
              { 
                role: 'system', 
                content: 'Tu es un expert QCM. Réponds UNIQUEMENT au format JSON valide. Tu ne mets JAMAIS de virgule après le dernier élément d\'un tableau ou d\'un objet.' 
              },
              { role: 'user', content: prompt }
            ],
            temperature: 0.5,
            max_tokens: 3000
          })
        });

        if (response.ok) {
          const data = await response.json();
          const rawContent = data.choices[0]?.message?.content || '';
          
          console.log('[IA] Réponse brute reçue, longueur:', rawContent.length);
          
          const cleanJson = extractJSONFromResponse(rawContent);
          
          if (cleanJson) {
            try {
              let parsed = JSON.parse(cleanJson);
              
              // Si c'est un tableau direct
              if (Array.isArray(parsed)) {
                generatedQuestions = parsed;
                console.log(`[IA] ✅ ${generatedQuestions.length} questions (tableau direct)`);
              }
              // Si c'est un objet avec questions
              else if (parsed.questions && Array.isArray(parsed.questions)) {
                generatedQuestions = parsed.questions;
                console.log(`[IA] ✅ ${generatedQuestions.length} questions (objet questions)`);
              }
              // Si c'est un objet avec une autre propriété contenant le tableau
              else {
                for (const key in parsed) {
                  if (Array.isArray(parsed[key]) && parsed[key].length > 0 && parsed[key][0].text) {
                    generatedQuestions = parsed[key];
                    console.log(`[IA] ✅ ${generatedQuestions.length} questions (propriété ${key})`);
                    break;
                  }
                }
              }
            } catch (parseError) {
              console.error('[IA] Erreur parsing JSON:', parseError.message);
              
              // Tentative de récupération par regex
              const regexQuestions = extractQuestionsByRegex(cleanJson);
              if (regexQuestions.length > 0) {
                generatedQuestions = regexQuestions;
                console.log(`[IA] ✅ ${regexQuestions.length} questions récupérées par regex`);
              }
            }
          } else {
            console.error('[IA] Impossible d\'extraire le JSON, tentative regex...');
            const regexQuestions = extractQuestionsByRegex(rawContent);
            if (regexQuestions.length > 0) {
              generatedQuestions = regexQuestions;
              console.log(`[IA] ✅ ${regexQuestions.length} questions récupérées par regex (fallback)`);
            }
          }
        } else {
          console.error('[IA] Erreur DeepSeek API:', response.status, response.statusText);
        }
      } catch (err) {
        console.error('[IA] Erreur appel DeepSeek:', err.message);
      }
    } else {
      console.log('[IA] Pas de clé API DeepSeek, utilisation du mode mock');
    }

    // Validation et correction des questions
    if (generatedQuestions.length > 0) {
      const validQuestions = [];
      for (let i = 0; i < generatedQuestions.length; i++) {
        const q = generatedQuestions[i];
        if (validateQuestion(q)) {
          validQuestions.push(q);
        } else {
          console.warn(`[IA] Question ${i + 1} invalide, correction...`);
          validQuestions.push(fixQuestion(q, i, subject, level));
        }
      }
      generatedQuestions = validQuestions;
    }

    // Fallback si pas assez de questions
    if (generatedQuestions.length < numQuestions) {
      console.log(`[IA] Génération fallback: ${generatedQuestions.length}/${numQuestions} questions valides`);
      const fallbackNeeded = numQuestions - generatedQuestions.length;
      const fallbackQuestions = generateMockQuestions(domain, subject, level, fallbackNeeded);
      generatedQuestions = [...generatedQuestions, ...fallbackQuestions];
    }

    // Limiter au nombre demandé
    generatedQuestions = generatedQuestions.slice(0, numQuestions);

    console.log(`[IA] ✅ Final: ${generatedQuestions.length} questions générées`);

    res.json({
      success: true,
      questions: generatedQuestions,
      metadata: {
        model: DEEPSEEK_API_KEY ? 'deepseek-chat' : 'mock',
        generatedAt: new Date().toISOString(),
        count: generatedQuestions.length,
        requested: numQuestions,
        domain,
        level,
        subject
      }
    });

  } catch (error) {
    console.error('[IA] Erreur génération:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Erreur lors de la génération des questions' 
    });
  }
});

// Fonction de fallback améliorée
function generateMockQuestions(domain, subject, level, count) {
  const mockQuestions = [];
  
  const templates = [
    { 
      text: `Qu'est-ce que ${subject} ?`, 
      options: [`La discipline qui étudie ${subject}`, 'Une science exacte', 'Un art', 'Une technique'], 
      answer: `La discipline qui étudie ${subject}`, 
      explanation: `${subject} est une discipline fondamentale qui permet de comprendre...` 
    },
    { 
      text: `Quelle est l'importance de ${subject} au niveau ${level} ?`, 
      options: ['Fondamentale', 'Secondaire', 'Optionnelle', 'Non requise'], 
      answer: 'Fondamentale', 
      explanation: `À ce niveau, ${subject} constitue une base essentielle pour la formation.` 
    },
    { 
      text: `Parmi ces concepts, lequel est central en ${subject} ?`, 
      options: ['Concept fondamental A', 'Concept secondaire B', 'Aspect périphérique C', 'Détail technique D'], 
      answer: 'Concept fondamental A', 
      explanation: `Le concept fondamental A est au cœur de la discipline ${subject}.` 
    }
  ];

  for (let i = 0; i < Math.min(count, templates.length); i++) {
    const t = templates[i % templates.length];
    mockQuestions.push({
      text: t.text,
      options: t.options,
      answer: t.answer,
      explanation: t.explanation,
      points: 1,
      difficulty: 'moyen'
    });
  }

  while (mockQuestions.length < count) {
    const idx = mockQuestions.length + 1;
    mockQuestions.push({
      text: `Question ${idx} : Quel est l'élément clé à retenir concernant ${subject} au niveau ${level} ?`,
      options: [
        `L'élément essentiel A de ${subject}`,
        `Un détail secondaire de ${subject}`,
        `Un aspect périphérique de ${subject}`,
        `Une information non pertinente`
      ],
      answer: `L'élément essentiel A de ${subject}`,
      explanation: `Dans ${subject} au niveau ${level}, il est fondamental de maîtriser cet élément.`,
      points: 1,
      difficulty: 'moyen'
    });
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
  const networkInterfaces = os.networkInterfaces();
  const ips = [];
  for (const [name, interfaces] of Object.entries(networkInterfaces)) {
    for (const iface of interfaces) {
      if (iface.family === 'IPv4' && !iface.internal) ips.push({ interface: name, address: iface.address });
    }
  }
  res.json({ port: PORT, availableIps: ips, mongodbConnected: isConnected, environment: NODE_ENV });
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

app.post('/api/upload/question-image', protect, authorize('ENSEIGNANT', 'ADMIN_DELEGUE'), upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, error: 'Aucun fichier uploadé' });
    const fileBuffer = fs.readFileSync(req.file.path);
    const base64Image = `data:${req.file.mimetype};base64,${fileBuffer.toString('base64')}`;
    res.json({ success: true, imageUrl: `/uploads/questions/${req.file.filename}`, imageBase64: base64Image, filename: req.file.filename });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

app.post('/api/upload/question-image-base64', protect, authorize('ENSEIGNANT', 'ADMIN_DELEGUE'), async (req, res) => {
  try {
    const { base64, mimeType, originalName } = req.body;
    if (!base64) return res.status(400).json({ success: false, error: 'Base64 requis' });
    if (base64.startsWith('http')) return res.json({ success: true, imageUrl: base64, imageBase64: '' });
    res.json({ success: true, imageUrl: '', imageBase64: base64, metadata: { originalName: originalName || 'image.png', mimeType: mimeType || 'image/png', storageType: 'base64' } });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

app.delete('/api/upload/question-image/:filename', protect, authorize('ENSEIGNANT', 'ADMIN_DELEGUE'), (req, res) => {
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
    const result = await Result.findById(req.params.resultId);
    if (!result) return res.status(404).send('<h1>Résultat introuvable</h1>');
    const exam = await Exam.findById(result.examId);
    const questions = result.examQuestions?.length ? result.examQuestions : exam?.questions || [];
    const answers = result.answers instanceof Map ? Object.fromEntries(result.answers) : result.answers || {};
    const noteOn20 = ((result.percentage / 100) * 20).toFixed(2);
    let mention = '';
    if (result.percentage >= 90) mention = 'Très Bien';
    else if (result.percentage >= 75) mention = 'Bien';
    else if (result.percentage >= 60) mention = 'Assez Bien';
    else if (result.percentage >= 50) mention = 'Passable';
    else mention = 'Insuffisant';
    
    let rows = '';
    questions.forEach((q, i) => {
      const qId = q._id?.toString();
      const studentAnswer = qId && answers[qId] ? answers[qId] : '—';
      const correctAnswer = q.correctAnswer || (q.options?.[q.bonOpRep] || '');
      const isCorrect = studentAnswer !== '—' && String(studentAnswer).trim() === String(correctAnswer).trim();
      rows += `<tr style="border-bottom:1px solid #e2e8f0;">
                <td style="padding:12px 8px;">${i+1}<\/td>
                <td style="padding:12px 8px;">${escapeHtml(q.libQuestion || q.question || '—')}<\/td>
                <td style="padding:12px 8px; color:${isCorrect ? '#16a34a' : '#dc2626'}">${escapeHtml(studentAnswer)}<\/td>
                <td style="padding:12px 8px; color:#16a34a;">${escapeHtml(correctAnswer)}<\/td>
                <td style="padding:12px 8px; text-align:center;">${isCorrect ? '✅' : '❌'}<\/td>
              <\/tr>`;
    });
    
    const html = `<!DOCTYPE html>
    <html><head><meta charset="UTF-8"><title>Bulletin - ${escapeHtml(result.studentInfo?.lastName || 'Candidat')}</title>
    <style>
      *{margin:0;padding:0;box-sizing:border-box;}
      body{font-family:'Segoe UI',Arial,sans-serif;background:#f1f5f9;padding:40px 20px;}
      .container{max-width:1000px;margin:0 auto;background:white;border-radius:20px;box-shadow:0 20px 40px rgba(0,0,0,0.1);overflow:hidden;}
      .header{background:linear-gradient(135deg,#1e293b,#0f172a);color:white;padding:30px 40px;text-align:center;}
      .logo{font-size:2rem;font-weight:800;background:linear-gradient(135deg,#f59e0b,#fbbf24);-webkit-background-clip:text;background-clip:text;color:transparent;}
      .badge{display:inline-block;padding:6px 16px;border-radius:999px;font-weight:700;margin-top:16px;}
      .badge.success{background:#10b98120;color:#10b981;border:1px solid #10b98140;}
      .badge.error{background:#ef444420;color:#ef4444;border:1px solid #ef444440;}
      .content{padding:32px 40px;}
      .score-section{background:linear-gradient(135deg,#3b82f6,#2563eb);border-radius:16px;padding:24px;color:white;text-align:center;margin-bottom:32px;}
      .score-percent{font-size:3rem;font-weight:800;}
      .mention{display:inline-block;background:white;color:#f59e0b;padding:6px 20px;border-radius:999px;margin-top:16px;}
      .info-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:16px;margin-bottom:32px;}
      .info-card{background:#f8fafc;border-radius:12px;padding:16px;border:1px solid #e2e8f0;}
      .info-label{font-size:0.7rem;text-transform:uppercase;color:#64748b;}
      .info-value{font-size:0.95rem;font-weight:600;}
      .question-table{width:100%;border-collapse:collapse;}
      .question-table th{text-align:left;padding:12px 8px;background:#f1f5f9;color:#64748b;}
      .question-table td{padding:12px 8px;vertical-align:top;}
      .footer{background:#f8fafc;padding:20px;text-align:center;font-size:0.7rem;color:#94a3b8;}
      .btn-print{text-align:center;margin-top:20px;}
      .btn-print button{background:#3b82f6;color:white;border:none;padding:12px 32px;border-radius:10px;cursor:pointer;}
      @media print{.btn-print{display:none;}}
    </style>
    </head><body>
    <div class="container">
      <div class="header"><div class="logo">NA²QUIZ</div><div class="badge ${result.passed ? 'success' : 'error'}">${result.passed ? '✓ REÇU' : '✗ AJOURNÉ'}</div></div>
      <div class="content">
        <div class="score-section"><div class="score-percent">${result.percentage}%</div><div>Note : ${noteOn20} / 20</div><div class="mention">${mention}</div></div>
        <div class="info-grid">
          <div class="info-card"><div class="info-label">Candidat</div><div class="info-value">${escapeHtml(result.studentInfo?.lastName || '')} ${escapeHtml(result.studentInfo?.firstName || '')}</div></div>
          <div class="info-card"><div class="info-label">Matricule</div><div class="info-value">${escapeHtml(result.studentInfo?.matricule || '—')}</div></div>
          <div class="info-card"><div class="info-label">Épreuve</div><div class="info-value">${escapeHtml(result.examTitle || exam?.title || '—')}</div></div>
          <div class="info-card"><div class="info-label">Score</div><div class="info-value">${result.score} / ${result.totalQuestions || questions.length}</div></div>
        </div>
        <table class="question-table"><thead><tr><th>#</th><th>Question</th><th>Votre réponse</th><th>Réponse correcte</th><th>Résultat</th></tr></thead><tbody>${rows}</tbody></table>
        <div class="btn-print"><button onclick="window.print()">🖨️ Imprimer / PDF</button></div>
      </div>
      <div class="footer"><p>NA²QUIZ - Système d'Évaluation Intelligente</p><p>Africanut Industry - Ebolowa, Cameroun</p></div>
    </div>
    </body></html>`;
    
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (err) {
    console.error('[API] Erreur bulletin:', err);
    res.status(500).send('<h1>Erreur lors de la génération du bulletin</h1>');
  }
});

// ==================== SOCKET.IO ====================
const activeSessions = new Map();
const activeDistributedExams = new Map();
const pendingReconnections = new Map();

const io = new Server(server, {
  cors: { origin: isProduction ? CORS_ORIGINS : '*', credentials: true },
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000,
});

const emitSessionUpdate = () => {
  const sessionsToSend = Array.from(activeSessions.values()).filter(s => s.type !== 'surveillance');
  io.emit('sessionUpdate', { activeSessions: sessionsToSend });
};

io.on('connection', (socket) => {
  console.log(`[Socket] 🔌 Connexion: ${socket.id}`);

  socket.on('registerSession', (data) => {
    const existing = Array.from(activeSessions.values()).find(s => s.sessionId === data.sessionId && s.type === data.type);
    if (existing) {
      const pending = pendingReconnections.get(data.sessionId);
      if (pending) clearTimeout(pending);
      activeSessions.delete(existing.socketId);
      Object.assign(existing, { socketId: socket.id, isOnline: true, lastUpdate: Date.now() });
      activeSessions.set(socket.id, existing);
      if (existing.type === 'student' && existing.currentExamId) socket.join(`exam:${existing.currentExamId}`);
      emitSessionUpdate();
      return;
    }

    const session = {
      socketId: socket.id, type: data.type, sessionId: data.sessionId || socket.id, status: data.status || 'idle',
      currentExamId: data.examId || null, studentInfo: data.studentInfo || null, examOption: data.examOption || null,
      progress: 0, lastUpdate: Date.now(), isOnline: true,
    };
    activeSessions.set(socket.id, session);
    if (data.type === 'student' && data.examId) socket.join(`exam:${data.examId}`);
    if (data.type === 'terminal') socket.join('terminals');
    if (data.type === 'surveillance') socket.join('surveillance');
    emitSessionUpdate();
  });

  socket.on('studentReadyForExam', ({ examId, studentInfo, status, examOption }) => {
    const session = activeSessions.get(socket.id);
    if (session) {
      session.status = status || 'waiting';
      session.currentExamId = examId;
      session.studentInfo = studentInfo;
      session.examOption = examOption;
      if (status === 'waiting') {
        const waitingCount = Array.from(activeSessions.values()).filter(s => s.type === 'student' && s.currentExamId === examId && s.status === 'waiting').length;
        io.emit('waitingCountUpdate', { examId, count: waitingCount });
      }
      emitSessionUpdate();
    }
  });

  socket.on('distributeExam', (data) => {
    if (!data.examId || !data.examOption) return;
    activeDistributedExams.set(data.examId, { option: data.examOption, distributedAt: new Date(), questionCount: data.questionCount || 0 });
    io.to('terminals').emit('examDistributed', { url: `${FRONTEND_URL}/exam/profile/${data.examId}`, examId: data.examId, examOption: data.examOption });
  });

  socket.on('startExam', ({ examId, option }) => {
    const waitingStudents = Array.from(activeSessions.values()).filter(s => s.type === 'student' && s.currentExamId === examId && s.status === 'waiting');
    waitingStudents.forEach(s => {
      const studentSocket = io.sockets.sockets.get(s.socketId);
      if (studentSocket) {
        s.status = 'composing';
        studentSocket.emit('examStartedForOptionB', { examId, questionIndex: 0 });
      }
    });
    io.emit('waitingCountUpdate', { examId, count: 0 });
    emitSessionUpdate();
  });

  socket.on('disconnect', () => {
    const session = activeSessions.get(socket.id);
    if (session) {
      session.isOnline = false;
      const timeout = setTimeout(() => {
        const current = activeSessions.get(socket.id);
        if (current && !current.isOnline) {
          activeSessions.delete(socket.id);
          emitSessionUpdate();
        }
        pendingReconnections.delete(session.sessionId);
      }, 45000);
      pendingReconnections.set(session.sessionId, timeout);
    }
  });
});

app.get('/api/active-sessions', (req, res) => {
  const sessions = Array.from(activeSessions.values());
  res.json({ success: true, count: sessions.length, sessions });
});

app.get('/api/surveillance-data', (req, res) => {
  const sessions = Array.from(activeSessions.values());
  const waitingStudents = sessions.filter(s => s.type === 'student' && s.status === 'waiting');
  res.json({ success: true, activeSessions: sessions, waitingStudents });
});

// ==================== 404 ====================
app.use('*', (req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} introuvable` });
});

// ==================== DÉMARRAGE ====================
server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`[NA²QUIZ] 🚀 Serveur Socket.IO`);
  console.log(`[NA²QUIZ] 🌍 Environnement: ${NODE_ENV}`);
  console.log(`[NA²QUIZ] 📡 Port: ${PORT}`);
  console.log(`[NA²QUIZ] 🌐 Frontend: ${FRONTEND_URL}`);
  console.log(`[NA²QUIZ] 📄 Terminal: ${FRONTEND_URL}/terminal.html (via Netlify) ou /terminal.html (local)`);
  console.log(`[NA²QUIZ] 💾 MongoDB: ${isConnected ? '✅ Connecté' : '❌ Déconnecté'}`);
  console.log(`${'='.repeat(60)}\n`);
});

export default app;