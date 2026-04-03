// socket-server/server.js - Version finale avec terminal.html
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
// CORS - Configuration unique et permissive pour Render
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
  'https://na2quizapp.onrender.com'
];

// ═══════════════════════════════════════════════════════════════
// INITIALISATION EXPRESS
// ═══════════════════════════════════════════════════════════════
const app = express();
const server = createServer(app);

// ✅ UN SEUL appel app.use(cors())
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (!isProduction) return callback(null, true);
    if (CORS_ORIGINS.includes(origin)) return callback(null, true);
    if (origin?.endsWith('.netlify.app')) return callback(null, true);
    if (origin?.endsWith('.onrender.com')) return callback(null, true);
    
    console.warn(`[CORS] Origine non standard mais acceptée: ${origin}`);
    callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
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

questionSchema.index({ cleInterne: 1 }, { unique: true, sparse: true });
questionSchema.index({ matiere: 1, libQuestion: 1 }, { unique: true });
questionSchema.index({ domaine: 1, niveau: 1, matiere: 1 });
questionSchema.index({ status: 1 });

questionSchema.pre('save', function(next) {
  if (!this.cleInterne && this.matiere && this.libQuestion) {
    this.cleInterne = `${this.matiere}::${this.libQuestion}`;
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
    
    const questionsWithMetadata = questions.map(q => {
      const questionText = q.libQuestion || q.question;
      let bonOpRep = q.bonOpRep;
      if (bonOpRep === undefined && q.correctAnswer !== undefined) bonOpRep = q.options.findIndex(opt => opt === q.correctAnswer);
      return {
        libQuestion: questionText, options: q.options, bonOpRep, matiere: q.matiere || '', niveau: q.niveau || '', domaine: q.domaine || '',
        sousDomaine: q.sousDomaine || '', typeQuestion: q.typeQuestion || 1, points: q.points || 1, explanation: q.explanation || '',
        type: q.type || 'single', difficulty: q.difficulty || 'moyen', createdBy: req.user._id, matriculeAuteur: req.user.matricule,
        status: 'pending', createdAt: new Date(), updatedAt: new Date()
      };
    });
    const result = await Question.insertMany(questionsWithMetadata);
    res.json({ success: true, message: `${result.length} questions enregistrées`, data: result });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
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
    console.log('[API] Recherche résultats pour matricule:', req.user.matricule);
    console.log('[API] Utilisateur:', req.user.email, req.user.role);
    
    let results = [];
    if (req.user.matricule) {
      results = await Result.find({ 'studentInfo.matricule': req.user.matricule })
        .populate('examId', 'title domain subject level')
        .sort({ createdAt: -1 });
    } else {
      console.warn('[API] Utilisateur sans matricule, recherche par email?');
      results = await Result.find({ 
        'studentInfo.email': req.user.email 
      }).sort({ createdAt: -1 });
    }
    
    console.log('[API] Résultats trouvés:', results.length);
    
    res.json({ 
      success: true, 
      data: results,
      count: results.length 
    });
  } catch (err) { 
    console.error('[API] Erreur:', err);
    res.status(500).json({ success: false, message: err.message }); 
  }
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

// ==================== RESULT ROUTES ====================
// ✅ ROUTE POST CORRIGÉE - Version finale parfaite
app.post('/api/results', protect, authorize('APPRENANT', 'ADMIN_SYSTEME'), async (req, res) => {
  try {
    const { examId, studentInfo, answers } = req.body;
    
    console.log('[API] Soumission résultats - examId:', examId);
    console.log('[API] answers reçues:', answers);
    
    const exam = await Exam.findById(examId);
    if (!exam) {
      return res.status(404).json({ success: false, message: 'Examen non trouvé' });
    }
    
    // ✅ Fonction pour extraire les options
    const getQuestionOptions = (q) => {
      if (q.options && Array.isArray(q.options) && q.options.length > 0) {
        return q.options;
      }
      const options = [];
      for (let i = 1; i <= 5; i++) {
        const optKey = `opRep${i}`;
        if (q[optKey] && q[optKey] !== '') {
          options.push(String(q[optKey]));
        }
      }
      return options;
    };
    
    let score = 0;
    const totalQuestions = exam.questions.length;
    let totalPoints = 0;
    
    exam.questions.forEach(q => {
      totalPoints += (q.points || 1);
    });
    
    console.log('[API] Total questions:', totalQuestions);
    console.log('[API] Total points:', totalPoints);
    
    // ✅ Calcul du score
    exam.questions.forEach((q, idx) => {
      const studentAnswer = answers[idx] || answers[String(idx)];
      const options = getQuestionOptions(q);
      const correctAnswerIndex = q.bonOpRep;
      const correctAnswerText = options[correctAnswerIndex] || q.correctAnswer;
      
      let isCorrect = false;
      if (studentAnswer) {
        const selectedIndex = options.findIndex(opt => opt === studentAnswer);
        isCorrect = selectedIndex === correctAnswerIndex;
      }
      
      if (isCorrect) {
        score += (q.points || 1);
      }
      
      console.log(`[Q${idx}] Réponse: "${studentAnswer || 'NON'}", Correcte: ${isCorrect ? '✓' : '✗'}`);
    });
    
    const percentage = totalPoints > 0 ? parseFloat(((score / totalPoints) * 100).toFixed(2)) : 0;
    
    console.log('[API] Score final:', score, '/', totalPoints, '=', percentage, '%');
    
    // ✅ Construction du snapshot
    const examQuestionsWithOptions = exam.questions.map(q => ({
      _id: q._id,
      libQuestion: q.libQuestion || q.question || q.text,
      options: getQuestionOptions(q),
      bonOpRep: q.bonOpRep,
      correctAnswer: q.correctAnswer || getQuestionOptions(q)[q.bonOpRep],
      points: q.points || 1,
      explanation: q.explanation || ''
    }));
    
    const result = new Result({
      examId,
      studentInfo: {
        firstName: studentInfo.firstName || '',
        lastName: studentInfo.lastName || '',
        matricule: studentInfo.matricule || '',
        level: studentInfo.level || ''
      },
      answers: new Map(Object.entries(answers)),
      score,
      percentage,
      passed: percentage >= (exam.passingScore || 70),
      totalQuestions: totalQuestions,
      examTitle: exam.title,
      examLevel: exam.level,
      domain: exam.domain,
      subject: exam.subject,
      duration: exam.duration,
      passingScore: exam.passingScore,
      examOption: exam.examOption,
      examQuestions: examQuestionsWithOptions
    });
    
    await result.save();
    
    console.log('[API] ✅ Résultat sauvegardé - ID:', result._id);
    
    res.status(201).json({ 
      success: true, 
      message: 'Résultat soumis avec succès', 
      data: result 
    });
    
  } catch (err) {
    console.error('[API] Erreur soumission résultats:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==================== IA ROUTES ====================
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;

app.post('/api/ai/generate-questions', protect, authorize('ENSEIGNANT', 'ADMIN_DELEGUE', 'ADMIN_SYSTEME'), async (req, res) => {
  try {
    const { 
      domain, sousDomaine, level, subject, 
      numQuestions = 5, 
      typeQuestion = 1,
      tempsMinParQuestion = 60,
      difficulty = 'moyen',
      keywords = '' 
    } = req.body;

    if (!domain || !level || !subject) {
      return res.status(400).json({ 
        success: false, 
        error: 'Domain, level et subject sont requis' 
      });
    }

    const prompt = `Génère ${numQuestions} questions de type QCM (${typeQuestion === 2 ? 'choix multiples' : 'choix unique'}) sur le thème "${subject}" au niveau "${level}" dans le domaine "${domain}"${sousDomaine ? `, sous-domaine "${sousDomaine}"` : ''}.
    
    ${keywords ? `Mots-clés spécifiques: ${keywords}` : ''}
    Difficulté: ${difficulty}
    
    Pour chaque question, fournis:
    - La question
    - 4 options de réponse
    - La bonne réponse (index 0-3)
    - Une brève explication
    
    Format JSON attendu:
    {
      "questions": [
        {
          "text": "question",
          "options": ["opt1", "opt2", "opt3", "opt4"],
          "answer": "opt2",
          "explanation": "explication"
        }
      ]
    }`;

    let generatedQuestions = [];

    if (DEEPSEEK_API_KEY) {
      try {
        const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
          },
          body: JSON.stringify({
            model: 'deepseek-chat',
            messages: [
              { role: 'system', content: 'Tu es un générateur de QCM pédagogique. Réponds uniquement au format JSON demandé.' },
              { role: 'user', content: prompt }
            ],
            temperature: 0.7,
            max_tokens: 4000
          })
        });

        if (response.ok) {
          const data = await response.json();
          const content = data.choices[0]?.message?.content || '';
          try {
            const parsed = JSON.parse(content);
            generatedQuestions = parsed.questions || [];
          } catch (e) {
            console.error('Erreur parsing JSON IA:', e);
          }
        }
      } catch (err) {
        console.error('Erreur appel DeepSeek:', err.message);
      }
    }

    if (generatedQuestions.length === 0) {
      generatedQuestions = generateMockQuestions(domain, subject, level, numQuestions);
    }

    res.json({
      success: true,
      questions: generatedQuestions,
      metadata: {
        model: DEEPSEEK_API_KEY ? 'deepseek-chat' : 'mock',
        generatedAt: new Date().toISOString(),
        count: generatedQuestions.length,
        domain,
        level,
        subject
      }
    });

  } catch (error) {
    console.error('Erreur génération IA:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Erreur lors de la génération des questions' 
    });
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
    mockQuestions.push({
      text: `Question ${mockQuestions.length + 1} sur ${subject} en ${level} ?`,
      options: ['Option A', 'Option B', 'Option C', 'Option D'],
      answer: 'Option A',
      explanation: `Explication pour la question ${mockQuestions.length + 1}`,
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
  cors: {
    origin: true,
    credentials: true,
    methods: ['GET', 'POST']
  },
  transports: ['polling'],
  allowEIO3: true,
  pingTimeout: 60000,
  pingInterval: 25000,
  allowUpgrades: false,
  cookie: false
});

// ✅ Fonction pour émettre les statistiques
const emitRealtimeStats = (examId) => {
  if (!examId) return;
  
  const students = Array.from(activeSessions.values()).filter(s => 
    s.type === 'student' && s.currentExamId === examId && s.status === 'composing'
  );
  
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
  console.log(`[Socket] 🔌 Connexion: ${socket.id}`);

  // ✅ NOUVEAU: Enregistrement automatique comme terminal par défaut
  // Pour s'assurer que tout socket non enregistré puisse recevoir les distributions
  socket.join('terminals');
  console.log(`[Socket] ✅ Socket ${socket.id} automatiquement ajouté à la room 'terminals'`);

  // ── registerSession ────────────────────────────────────────────
  socket.on('registerSession', (data) => {
    console.log(`[Socket] registerSession reçu: type=${data.type}, sessionId=${data.sessionId}, socketId=${socket.id}`);
    
    const existing = Array.from(activeSessions.values()).find(s => s.sessionId === data.sessionId && s.type === data.type);
    if (existing) {
      const pending = pendingReconnections.get(data.sessionId);
      if (pending) clearTimeout(pending);
      activeSessions.delete(existing.socketId);
      Object.assign(existing, { socketId: socket.id, isOnline: true, lastUpdate: Date.now() });
      activeSessions.set(socket.id, existing);
      
      // ✅ S'assurer que le socket est dans la bonne room
      if (existing.type === 'terminal') {
        socket.join('terminals');
        console.log(`[Socket] Terminal ${socket.id} a rejoint la room 'terminals' (reconnexion)`);
      }
      if (existing.type === 'student' && existing.currentExamId) {
        socket.join(`exam:${existing.currentExamId}`);
        console.log(`[Socket] Student ${socket.id} a rejoint exam:${existing.currentExamId}`);
      }
      if (existing.type === 'surveillance') {
        socket.join('surveillance');
      }
      
      emitSessionUpdate();
      if (existing.currentExamId) emitRealtimeStats(existing.currentExamId);
      return;
    }

    const session = {
      socketId: socket.id, type: data.type, sessionId: data.sessionId || socket.id,
      status: data.status || 'idle', currentExamId: data.examId || null,
      studentInfo: data.studentInfo || null, examOption: data.examOption || null,
      progress: 0, score: 0, currentQuestion: 0, lastUpdate: Date.now(), isOnline: true,
    };
    activeSessions.set(socket.id, session);
    
    // ✅ Rejoindre les rooms appropriées
    if (data.type === 'student' && data.examId) {
      socket.join(`exam:${data.examId}`);
      console.log(`[Socket] Student ${socket.id} a rejoint exam:${data.examId}`);
    }
    if (data.type === 'terminal') {
      socket.join('terminals');
      console.log(`[Socket] Terminal ${socket.id} a rejoint la room 'terminals'`);
    }
    if (data.type === 'surveillance') {
      socket.join('surveillance');
      console.log(`[Socket] Surveillance ${socket.id} a rejoint la room 'surveillance'`);
    }
    
    emitSessionUpdate();
    if (data.examId) emitRealtimeStats(data.examId);
  });

  // ── studentReadyForExam ────────────────────────────────────────
  socket.on('studentReadyForExam', ({ examId, studentInfo, examOption, config }) => {
    console.log(`[Socket] studentReadyForExam: examId=${examId}, option=${examOption}, socketId=${socket.id}`);
    
    const session = activeSessions.get(socket.id);
    if (session) {
      session.status = 'waiting';
      session.currentExamId = examId;
      session.studentInfo = studentInfo;
      session.examOption = examOption;
      session.config = config || null;
      session.lastUpdate = Date.now();
      if (!session.joinedExam) {
        socket.join(`exam:${examId}`);
        session.joinedExam = true;
        console.log(`[Socket] Student ${socket.id} a rejoint exam:${examId}`);
      }
      
      const waitingCount = Array.from(activeSessions.values())
        .filter(s => s.type === 'student' && s.currentExamId === examId && s.status === 'waiting').length;
      console.log(`[Socket] Compteur attente pour ${examId}: ${waitingCount}`);
      io.emit('waitingCountUpdate', { examId, count: waitingCount });
      emitSessionUpdate();
    } else {
      console.warn(`[Socket] studentReadyForExam: session non trouvée pour socket ${socket.id}`);
    }
  });

  // ── distributeExam — avec logs améliorés ────────────────────────
  socket.on('distributeExam', (data) => {
    if (!data.examId || !data.examOption) {
      console.error('[Socket] distributeExam: examId ou examOption manquant', data);
      return;
    }
    
    // ✅ Vérifier la room 'terminals'
    const terminalsRoom = io.sockets.adapter.rooms.get('terminals');
    const terminalsCount = terminalsRoom?.size || 0;
    const allSocketsCount = io.sockets.sockets.size;
    
    console.log(`[Socket] 📡 Distribution épreuve ${data.examId} (Option ${data.examOption})`);
    console.log(`[Socket] 📊 Statut: Room 'terminals' = ${terminalsCount} sockets, Total sockets = ${allSocketsCount}`);
    
    // ✅ Lister les terminaux actifs
    const terminalSessions = Array.from(activeSessions.values())
      .filter(s => s.type === 'terminal' && s.isOnline !== false);
    console.log(`[Socket] 📊 Terminaux actifs dans activeSessions: ${terminalSessions.length}`);
    terminalSessions.forEach(s => {
      console.log(`[Socket]   - Terminal: socketId=${s.socketId}, sessionId=${s.sessionId}, status=${s.status}`);
    });
    
    activeDistributedExams.set(data.examId, {
      option: data.examOption,
      config: data.config || null,
      distributedAt: new Date(),
      questionCount: data.questionCount || 0
    });
    
    // ✅ Envoyer à la room 'terminals'
    io.to('terminals').emit('examDistributed', {
      examId: data.examId,
      examOption: data.examOption,
      config: data.config || null,
      timestamp: Date.now()
    });
    
    // ✅ Envoi individuel de secours à tous les sockets terminaux
    terminalSessions.forEach(session => {
      const targetSocket = io.sockets.sockets.get(session.socketId);
      if (targetSocket && targetSocket.connected) {
        targetSocket.emit('examDistributed', {
          examId: data.examId,
          examOption: data.examOption,
          config: data.config || null,
          timestamp: Date.now()
        });
        console.log(`[Socket] ✅ Envoi direct à ${session.socketId}`);
      }
    });
    
    io.to('surveillance').emit('examDistributedConfirm', {
      examId: data.examId,
      examOption: data.examOption,
      terminalCount: terminalsCount
    });
    console.log(`[Socket] ✅ Épreuve distribuée à ${terminalsCount} terminaux (room) + ${terminalSessions.length} directs`);
  });

  // ── startExam ──────────────────────────────────────────────────
  socket.on('startExam', ({ examId, option }) => {
    console.log(`[Socket] 🚀 startExam examId=${examId} option=${option}`);
    
    const waitingStudents = Array.from(activeSessions.values()).filter(s => 
      s.type === 'student' && s.currentExamId === examId && s.status === 'waiting'
    );
    
    console.log(`[Socket] Étudiants en attente pour ${examId}: ${waitingStudents.length}`);
    
    if (waitingStudents.length === 0) {
      socket.emit('noWaitingStudents', { examId, message: 'Aucun étudiant en attente' });
      return;
    }
    
    waitingStudents.forEach(s => {
      const studentSocket = io.sockets.sockets.get(s.socketId);
      if (studentSocket && studentSocket.connected) {
        s.status = 'composing';
        s.lastUpdate = Date.now();
        
        studentSocket.emit('examStarted', { 
          examId, 
          questionIndex: 0, 
          examOption: s.examOption 
        });
        console.log(`[Socket] ✅ examStarted envoyé à ${s.socketId}`);
      } else {
        console.warn(`[Socket] ❌ Socket étudiant non trouvé ou déconnecté: ${s.socketId}`);
      }
    });
    
    io.emit('waitingCountUpdate', { examId, count: 0 });
    socket.emit('examStartedConfirm', { examId, option, startedCount: waitingStudents.length });
    emitSessionUpdate();
    emitRealtimeStats(examId);
  });

  // ── displayQuestion ────────────────────────────────────────────
  socket.on('displayQuestion', ({ examId, questionIndex }) => {
    console.log(`[Socket] ❓ displayQuestion examId=${examId} idx=${questionIndex}`);
    io.to(`exam:${examId}`).emit('displayQuestion', { examId, questionIndex });
    io.to('surveillance').emit('currentQuestionIndexForOptionA', { examId, questionIndex });
  });

  // ── advanceQuestionForOptionA ──────────────────────────────────
  socket.on('advanceQuestionForOptionA', ({ examId, nextQuestionIndex }) => {
    console.log(`[Socket] ⏩ advanceQuestion examId=${examId} next=${nextQuestionIndex}`);
    io.to(`exam:${examId}`).emit('displayQuestion', { examId, questionIndex: nextQuestionIndex });
    io.to('surveillance').emit('currentQuestionIndexForOptionA', { examId, questionIndex: nextQuestionIndex });
  });

  // ── finishExam ─────────────────────────────────────────────────
  socket.on('finishExam', ({ examId }) => {
    console.log(`[Socket] 🏁 finishExam examId=${examId}`);
    io.to(`exam:${examId}`).emit('examFinished', { examId });
    io.to('terminals').emit('examFinished', { examId });
    
    Array.from(activeSessions.values())
      .filter(s => s.type === 'student' && s.currentExamId === examId)
      .forEach(s => { s.status = 'finished'; s.lastUpdate = Date.now(); });
    
    emitSessionUpdate();
    emitRealtimeStats(examId);
  });

  // ── updateStudentProgress ──────────────────────────────────────
  socket.on('updateStudentProgress', ({ examId, progress, score, currentQuestion, percentage }) => {
    const session = activeSessions.get(socket.id);
    if (session) {
      session.progress = progress || 0;
      session.score = score || 0;
      session.percentage = percentage || 0;
      session.currentQuestion = currentQuestion || 0;
      session.lastUpdate = Date.now();
      
      io.to('surveillance').emit('studentProgressUpdate', {
        studentId: socket.id,
        studentInfo: session.studentInfo,
        examId: session.currentExamId,
        progress: session.progress,
        currentQuestion: session.currentQuestion,
        score: session.score,
        percentage: session.percentage
      });
    }
    emitRealtimeStats(examId);
  });

  // ── terminalReadyForExam ───────────────────────────────────────
  socket.on('terminalReadyForExam', (data) => {
    console.log(`[Socket] 🖥️ Terminal prêt pour épreuve: ${data.examId} (Option ${data.examOption})`);
    const session = activeSessions.get(socket.id);
    if (session) {
      session.status = 'exam_distributed';
      session.currentExamId = data.examId;
      session.examOption = data.examOption;
      session.lastUpdate = Date.now();
      activeSessions.set(socket.id, session);
      io.to('surveillance').emit('terminalReady', {
        terminalId: session.sessionId,
        examId: data.examId,
        examOption: data.examOption,
        status: 'exam_distributed'
      });
      emitSessionUpdate();
    } else {
      console.warn(`[Socket] terminalReadyForExam: session non trouvée pour socket ${socket.id}`);
    }
  });

  // ── ping ───────────────────────────────────────────────────────
  socket.on('ping', () => {
    const session = activeSessions.get(socket.id);
    if (session) { session.lastUpdate = Date.now(); session.isOnline = true; }
    socket.emit('pong');
  });

  // ── disconnect ─────────────────────────────────────────────────
  socket.on('disconnect', () => {
    console.log(`[Socket] 👋 Déconnexion: ${socket.id}`);
    const session = activeSessions.get(socket.id);
    if (session) {
      session.isOnline = false;
      if (session.type === 'student') {
        io.to('surveillance').emit('studentDisconnected', {
          studentName: session.studentInfo
            ? `${session.studentInfo.firstName} ${session.studentInfo.lastName}`
            : 'Inconnu',
          examId: session.currentExamId,
          socketId: socket.id
        });
        if (session.currentExamId) emitRealtimeStats(session.currentExamId);
      }
      const timeout = setTimeout(() => {
        const current = activeSessions.get(socket.id);
        if (current && !current.isOnline) {
          activeSessions.delete(socket.id);
          emitSessionUpdate();
          console.log(`[Socket] 🗑️ Session expirée supprimée: ${socket.id}`);
        }
        pendingReconnections.delete(session.sessionId);
      }, 45000);
      pendingReconnections.set(session.sessionId, timeout);
    }
  });
});

// Routes API pour les sessions actives
app.get('/api/active-sessions', (req, res) => {
  const sessions = Array.from(activeSessions.values());
  res.json({ success: true, count: sessions.length, sessions });
});

app.get('/api/surveillance-data', (req, res) => {
  const sessions = Array.from(activeSessions.values());
  const waitingStudents = sessions.filter(s => s.type === 'student' && s.status === 'waiting');
  const realtimeStats = {
    activeStudentsCount: sessions.filter(s => s.type === 'student' && s.status === 'composing').length,
    averageScore: 0,
    passRate: 0,
    lastUpdate: new Date()
  };
  res.json({ success: true, activeSessions: sessions, waitingStudents, realtimeStats });
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