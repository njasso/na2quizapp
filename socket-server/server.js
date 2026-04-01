// socket-server/server.js - Version complète et corrigée
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

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Security (désactivé en dev pour éviter les blocages)
if (isProduction) {
  app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" }, contentSecurityPolicy: false }));
  app.use(compression());
}

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isProduction ? 500 : 5000,
  skip: (req) => req.path === '/health',
});
app.use(limiter);

// ═══════════════════════════════════════════════════════════════
// SCHÉMAS MONGOOSE (version complète)
// ═══════════════════════════════════════════════════════════════
const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true, select: false },
  role: { type: String, enum: ['APPRENANT', 'ENSEIGNANT', 'ADMIN_DELEGUE', 'ADMIN_SYSTEME', 'OPERATEUR_EVALUATION'], default: 'APPRENANT' },
  username: { type: String, unique: true, sparse: true },
  matricule: { type: String, unique: true, sparse: true },
  level: { type: String, default: '' },
  grade: { type: String, default: '' },
  isAdmin: { type: Boolean, default: false },
}, { timestamps: true });

UserSchema.pre('save', async function(next) {
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 10);
  }
  next();
});

UserSchema.methods.matchPassword = async function(password) {
  return await bcrypt.compare(password, this.password);
};

const ExamSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, default: '' },
  duration: { type: Number, required: true },
  domain: { type: String, required: true },
  level: { type: String, required: true },
  subject: { type: String, required: true },
  questions: { type: Array, default: [] },
  passingScore: { type: Number, default: 70 },
  status: { type: String, enum: ['draft', 'published', 'archived'], default: 'published' },
  examOption: { type: String, enum: ['A', 'B', 'C', 'D', null], default: null },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  source: { type: String, default: 'manual' },
}, { timestamps: true });

const ResultSchema = new mongoose.Schema({
  examId: { type: mongoose.Schema.Types.ObjectId, ref: 'Exam', required: true },
  studentInfo: {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    matricule: { type: String },
    level: { type: String },
  },
  answers: { type: Map, of: mongoose.Schema.Types.Mixed, required: true },
  score: { type: Number, required: true },
  percentage: { type: Number, required: true },
  passed: { type: Boolean, required: true },
  examTitle: { type: String },
  examQuestions: { type: Array, default: [] },
}, { timestamps: true });

const User = mongoose.models.User || mongoose.model('User', UserSchema);
const Exam = mongoose.models.Exam || mongoose.model('Exam', ExamSchema);
const Result = mongoose.models.Result || mongoose.model('Result', ResultSchema);

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

// ═══════════════════════════════════════════════════════════════
// ROUTES API
// ═══════════════════════════════════════════════════════════════
app.get('/health', (req, res) => {
  res.json({ status: 'UP', db: isConnected ? 'connected' : 'disconnected', timestamp: new Date() });
});

// AUTH
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email }).select('+password');
    if (!user) return res.status(401).json({ message: 'Email ou mot de passe incorrect' });
    if (!(await user.matchPassword(password))) return res.status(401).json({ message: 'Email ou mot de passe incorrect' });
    
    const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    res.json({
      token,
      _id: user._id,
      email: user.email,
      name: user.name,
      username: user.username,
      role: user.role,
      matricule: user.matricule,
      isAdmin: user.isAdmin
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post('/api/auth/logout', async (req, res) => {
  try {
    res.status(200).json({ success: true, message: 'Déconnexion réussie' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.get('/api/auth/me', protect, async (req, res) => {
  try {
    res.json({
      _id: req.user._id,
      email: req.user.email,
      name: req.user.name,
      username: req.user.username,
      role: req.user.role,
      matricule: req.user.matricule
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// EXAMENS
app.get('/api/exams', protect, async (req, res) => {
  try {
    const exams = await Exam.find().sort({ createdAt: -1 });
    res.json({ success: true, data: exams, count: exams.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/exams/:id', protect, async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id);
    if (!exam) return res.status(404).json({ error: 'Examen non trouvé' });
    res.json(exam);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/exams', protect, async (req, res) => {
  try {
    const exam = await Exam.create({ ...req.body, createdBy: req.user._id });
    res.status(201).json({ success: true, data: exam });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/exams/:id', protect, async (req, res) => {
  try {
    const exam = await Exam.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!exam) return res.status(404).json({ error: 'Examen non trouvé' });
    res.json({ success: true, data: exam });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/exams/:id', protect, async (req, res) => {
  try {
    const exam = await Exam.findByIdAndDelete(req.params.id);
    if (!exam) return res.status(404).json({ error: 'Examen non trouvé' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// RÉSULTATS
app.post('/api/results', protect, async (req, res) => {
  try {
    const { examId, studentInfo, answers } = req.body;
    const exam = await Exam.findById(examId);
    if (!exam) return res.status(404).json({ error: 'Examen non trouvé' });
    
    let score = 0;
    const totalPoints = exam.questions.reduce((s, q) => s + (q.points || 1), 0);
    
    exam.questions.forEach(q => {
      const studentAnswer = answers[q._id?.toString()];
      if (studentAnswer && String(studentAnswer).trim() === String(q.correctAnswer).trim()) {
        score += (q.points || 1);
      }
    });
    
    const percentage = totalPoints ? parseFloat(((score / totalPoints) * 100).toFixed(2)) : 0;
    
    const result = await Result.create({
      examId,
      studentInfo,
      answers,
      score,
      percentage,
      passed: percentage >= (exam.passingScore || 70),
      examTitle: exam.title,
      examQuestions: exam.questions
    });
    
    res.status(201).json({ success: true, result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/results', protect, async (req, res) => {
  try {
    const results = await Result.find().sort({ createdAt: -1 }).populate('examId', 'title');
    res.json({ success: true, data: results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/results/:id', protect, async (req, res) => {
  try {
    const result = await Result.findById(req.params.id).populate('examId');
    if (!result) return res.status(404).json({ error: 'Résultat non trouvé' });
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// CLASSEMENTS
app.get('/api/rankings/:examId', protect, async (req, res) => {
  try {
    const results = await Result.find({ examId: req.params.examId })
      .sort({ percentage: -1, score: -1 });
    const rankings = results.map((r, i) => ({ ...r.toObject(), rank: i + 1 }));
    res.json({ success: true, rankings });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// STATS
app.get('/api/stats', protect, async (req, res) => {
  try {
    const [users, exams, results] = await Promise.all([
      User.countDocuments(),
      Exam.countDocuments(),
      Result.countDocuments()
    ]);
    res.json({ success: true, data: { users, exams, results } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════
// SOCKET.IO
// ═══════════════════════════════════════════════════════════════
const activeSessions = new Map();
const activeDistributedExams = new Map();
const pendingReconnections = new Map();

const io = new Server(server, {
  cors: {
    origin: isProduction ? CORS_ORIGINS : '*',
    credentials: true,
  },
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
      socketId: socket.id,
      type: data.type,
      sessionId: data.sessionId || socket.id,
      status: data.status || 'idle',
      currentExamId: data.examId || null,
      studentInfo: data.studentInfo || null,
      examOption: data.examOption || null,
      progress: 0,
      lastUpdate: Date.now(),
      isOnline: true,
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
        const waitingCount = Array.from(activeSessions.values()).filter(
          s => s.type === 'student' && s.currentExamId === examId && s.status === 'waiting'
        ).length;
        io.emit('waitingCountUpdate', { examId, count: waitingCount });
      }
      emitSessionUpdate();
    }
  });

  socket.on('distributeExam', (data) => {
    if (!data.examId || !data.examOption) return;
    activeDistributedExams.set(data.examId, {
      option: data.examOption,
      distributedAt: new Date(),
      questionCount: data.questionCount || 0
    });
    io.to('terminals').emit('examDistributed', {
      url: `${FRONTEND_URL}/exam/profile/${data.examId}`,
      examId: data.examId,
      examOption: data.examOption
    });
  });

  socket.on('startExam', ({ examId, option }) => {
    const waitingStudents = Array.from(activeSessions.values()).filter(
      s => s.type === 'student' && s.currentExamId === examId && s.status === 'waiting'
    );
    
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

// Routes de surveillance Socket
app.get('/api/active-sessions', (req, res) => {
  const sessions = Array.from(activeSessions.values());
  res.json({ success: true, count: sessions.length, sessions });
});

app.get('/api/surveillance-data', (req, res) => {
  const sessions = Array.from(activeSessions.values());
  const waitingStudents = sessions.filter(s => s.type === 'student' && s.status === 'waiting');
  res.json({ success: true, activeSessions: sessions, waitingStudents });
});

// ═══════════════════════════════════════════════════════════════
// BULLETIN HTML
// ═══════════════════════════════════════════════════════════════
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
        <table class="question-table"><thead>编码<th>#</th><th>Question</th><th>Votre réponse</th><th>Réponse correcte</th><th>Résultat</th> </thead><tbody>${rows}</tbody> </table>
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

// ═══════════════════════════════════════════════════════════════
// 404
// ═══════════════════════════════════════════════════════════════
app.use('*', (req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} introuvable` });
});

// ═══════════════════════════════════════════════════════════════
// DÉMARRAGE
// ═══════════════════════════════════════════════════════════════
server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`[NA²QUIZ] 🚀 Serveur Socket.IO`);
  console.log(`[NA²QUIZ] 🌍 Environnement: ${NODE_ENV}`);
  console.log(`[NA²QUIZ] 📡 Port: ${PORT}`);
  console.log(`[NA²QUIZ] 🌐 Frontend: ${FRONTEND_URL}`);
  console.log(`[NA²QUIZ] 💾 MongoDB: ${isConnected ? '✅ Connecté' : '❌ Déconnecté'}`);
  console.log(`${'='.repeat(60)}\n`);
});

export default app;