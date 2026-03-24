// socket-server/server.js
// ─────────────────────────────────────────────────────────────
//  NA²QUIZ — Serveur unifié : Socket.IO + API REST
//  CORRIGÉ POUR L'OPTION B - Affichage des étudiants en attente
// ─────────────────────────────────────────────────────────────
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config();

const app = express();
const server = createServer(app);

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
const JWT_SECRET = process.env.JWT_SECRET || 'na2quiz_secret_key';

// ══════════════════════════════════════════════════════════════
//  CORS
// ══════════════════════════════════════════════════════════════
const allowedOrigins = [
  FRONTEND_URL,
  'http://localhost:3000',
  'http://localhost:5001',
  'https://na2quizapp.netlify.app',
].filter(Boolean);

app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    if (allowedOrigins.some(o => origin.startsWith(o))) return cb(null, true);
    if (process.env.NODE_ENV !== 'production') return cb(null, true);
    cb(new Error(`CORS bloqué: ${origin}`));
  },
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));

// ══════════════════════════════════════════════════════════════
//  MONGODB
// ══════════════════════════════════════════════════════════════
let isConnected = false;

async function connectDB() {
  if (isConnected) return;
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI manquant');
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000, maxPoolSize: 10 });
  isConnected = true;
  console.log('[DB] ✅ Connecté à MongoDB Atlas');
}

connectDB().catch(err => console.error('[DB] ❌', err.message));

// ══════════════════════════════════════════════════════════════
//  SCHÉMAS MONGOOSE (inchangés)
// ══════════════════════════════════════════════════════════════
const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  username: { type: String, unique: true, sparse: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['student', 'teacher', 'admin'], default: 'student' },
  isAdmin: { type: Boolean, default: false },
}, { timestamps: true });

UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});
UserSchema.methods.matchPassword = function (pwd) {
  return bcrypt.compare(pwd, this.password);
};

const QuestionSchema = new mongoose.Schema({
  domaine: { type: String, required: true },
  sousDomaine: { type: String, default: '' },
  niveau: { type: String, required: true },
  matiere: { type: String, required: true },
  question: { type: String, required: true },
  options: [{ type: String, required: true }],
  correctAnswer: { type: mongoose.Schema.Types.Mixed, required: true },
  points: { type: Number, default: 1 },
  explanation: { type: String, default: '' },
  type: { type: String, enum: ['single', 'multiple'], default: 'single' },
  difficulty: { type: String, enum: ['facile', 'moyen', 'difficile'], default: 'moyen' },
  tags: [String],
}, { timestamps: true });

const ExamQuestionSchema = new mongoose.Schema({
  question: { type: String, required: true },
  text: String,
  options: [{ type: String, required: true }],
  correctAnswer: { type: mongoose.Schema.Types.Mixed, required: true },
  points: { type: Number, default: 1 },
  explanation: { type: String, default: '' },
  type: { type: String, default: 'single' },
}, { _id: true });

const ExamSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  duration: { type: Number, required: true, min: 1 },
  domain: { type: String, required: true, trim: true },
  category: { type: String, trim: true },
  level: { type: String, required: true, trim: true },
  subject: { type: String, required: true, trim: true },
  questions: [ExamQuestionSchema],
  passingScore: { type: Number, default: 70 },
  questionCount: { type: Number, default: 0 },
  totalPoints: { type: Number, default: 0 },
  status: { type: String, enum: ['draft', 'published', 'archived'], default: 'published' },
  tags: [String],
  isAIgenerated: { type: Boolean, default: false },
  examOption: { type: String, enum: ['A', 'B', 'C', 'D', null], default: null },
  teacherName: { type: String, default: '' },
  teacherGrade: { type: String, default: '' },
  source: { type: String, default: 'manual' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

ExamSchema.pre('save', function (next) {
  this.questionCount = this.questions.length;
  this.totalPoints = this.questions.reduce((s, q) => s + (q.points || 1), 0);
  next();
});

const ResultSchema = new mongoose.Schema({
  examId: { type: mongoose.Schema.Types.ObjectId, ref: 'Exam', required: true },
  studentInfo: {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    matricule: String,
    level: String,
  },
  answers: { type: Map, of: mongoose.Schema.Types.Mixed, required: true },
  score: { type: Number, required: true },
  percentage: { type: Number, required: true, set: v => parseFloat(parseFloat(v).toFixed(2)) },
  passed: { type: Boolean, required: true },
  totalQuestions: Number,
  examTitle: String,
  examLevel: String,
  domain: String,
  subject: String,
  category: String,
  duration: Number,
  passingScore: Number,
  examOption: { type: String, enum: ['A', 'B', 'C', 'D', null], default: null },
  examQuestions: [{
    _id: mongoose.Schema.Types.ObjectId,
    question: String,
    options: [String],
    correctAnswer: mongoose.Schema.Types.Mixed,
    type: { type: String, default: 'single' },
  }],
  pdfPath: { type: String, default: null },
}, { timestamps: true });

const User = mongoose.models.User || mongoose.model('User', UserSchema);
const Question = mongoose.models.Question || mongoose.model('Question', QuestionSchema);
const Exam = mongoose.models.Exam || mongoose.model('Exam', ExamSchema);
const Result = mongoose.models.Result || mongoose.model('Result', ResultSchema);

// ══════════════════════════════════════════════════════════════
//  SOCKET.IO VARIABLES
// ══════════════════════════════════════════════════════════════
const activeSessions = new Map();
const activeDistributedExams = new Map();
const pendingReconnections = new Map();

// ══════════════════════════════════════════════════════════════
//  MIDDLEWARE AUTH
// ══════════════════════════════════════════════════════════════
function protect(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Non autorisé — token manquant' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ message: 'Token invalide ou expiré' });
  }
}

// ══════════════════════════════════════════════════════════════
//  MIDDLEWARE DB
// ══════════════════════════════════════════════════════════════
app.use('/api', async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    res.status(503).json({ error: 'Base de données indisponible', detail: err.message });
  }
});

// ══════════════════════════════════════════════════════════════
//  REDIRECTS
// ══════════════════════════════════════════════════════════════
app.get('/terminal.html', (req, res) => {
  res.redirect(301, `${FRONTEND_URL}/terminal.html`);
});

app.get('/exam/*', (req, res) => {
  res.redirect(301, `${FRONTEND_URL}${req.path}`);
});

// ══════════════════════════════════════════════════════════════
//  ROUTES SANTÉ
// ══════════════════════════════════════════════════════════════
app.get('/', (_, res) => res.json({ status: 'NA²QUIZ Unified Server', uptime: process.uptime() }));
app.get('/health', (_, res) => res.json({ status: 'UP', connections: activeSessions.size }));
app.get('/sessions', (_, res) => res.json({ sessions: Array.from(activeSessions.values()) }));

app.get('/api/health', (_, res) =>
  res.json({ status: 'UP', db: isConnected ? 'connected' : 'disconnected', ts: new Date() })
);

app.get('/api/check-config', (_, res) => res.json({
  deepseek: !!process.env.DEEPSEEK_API_KEY,
  mongodb: !!process.env.MONGODB_URI,
  jwt: !!process.env.JWT_SECRET,
}));

// ══════════════════════════════════════════════════════════════
//  AUTH (inchangé)
// ══════════════════════════════════════════════════════════════
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, username, email, password } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ message: 'Nom, email et mot de passe requis' });
    if (await User.findOne({ email }))
      return res.status(400).json({ message: 'Email déjà utilisé' });
    if (username && await User.findOne({ username }))
      return res.status(400).json({ message: "Nom d'utilisateur déjà pris" });
    const user = new User({ name, username, email, password });
    await user.save();
    const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ token, message: 'Inscription réussie', name: user.name, email: user.email, role: user.role, _id: user._id });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: 'Utilisateur non trouvé' });
    if (!await user.matchPassword(password))
      return res.status(400).json({ message: 'Mot de passe incorrect' });
    const token = jwt.sign({ id: user._id, role: user.role, isAdmin: user.isAdmin }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, name: user.name, email: user.email, username: user.username, role: user.role, isAdmin: user.isAdmin, _id: user._id });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.get('/api/auth/me', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) return res.status(404).json({ message: 'Utilisateur non trouvé' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ══════════════════════════════════════════════════════════════
//  QUESTIONS (simplifié)
// ══════════════════════════════════════════════════════════════
app.get('/api/questions', async (req, res) => {
  try {
    const { limit = 1000 } = req.query;
    const questions = await Question.find().sort({ createdAt: -1 }).limit(parseInt(limit));
    res.json({ success: true, data: questions, count: questions.length });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/questions/:id', async (req, res) => {
  try {
    const q = await Question.findById(req.params.id);
    if (!q) return res.status(404).json({ success: false, message: 'Question non trouvée' });
    res.json({ success: true, data: q });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/questions/save', async (req, res) => {
  try {
    const { questions } = req.body;
    if (!Array.isArray(questions) || !questions.length)
      return res.status(400).json({ success: false, error: 'Tableau de questions requis' });
    const saved = await Question.insertMany(questions, { ordered: false });
    res.json({ success: true, count: saved.length });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.put('/api/questions/:id', async (req, res) => {
  try {
    const q = await Question.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!q) return res.status(404).json({ success: false, message: 'Question non trouvée' });
    res.json({ success: true, data: q });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/api/questions/:id', async (req, res) => {
  try {
    const q = await Question.findByIdAndDelete(req.params.id);
    if (!q) return res.status(404).json({ success: false, message: 'Question non trouvée' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ══════════════════════════════════════════════════════════════
//  EXAMENS
// ══════════════════════════════════════════════════════════════
app.get('/api/exams', async (req, res) => {
  try {
    const exams = await Exam.find().sort({ createdAt: -1 });
    res.json({ success: true, data: exams, count: exams.length });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/exams/:id', async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id);
    if (!exam) return res.status(404).json({ error: 'Épreuve introuvable' });
    res.json(exam);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/exams', async (req, res) => {
  try {
    const saved = await new Exam(req.body).save();
    res.status(201).json(saved);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/exams/:id', async (req, res) => {
  try {
    const updated = await Exam.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updated) return res.status(404).json({ error: 'Épreuve introuvable' });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/exams/:id', async (req, res) => {
  try {
    const deleted = await Exam.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Épreuve introuvable' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ══════════════════════════════════════════════════════════════
//  RÉSULTATS
// ══════════════════════════════════════════════════════════════
app.post('/api/results', async (req, res) => {
  try {
    const { examId, studentInfo, answers } = req.body;
    if (!examId || !studentInfo || !answers)
      return res.status(400).json({ error: 'Données manquantes' });

    const exam = await Exam.findById(examId);
    if (!exam) return res.status(404).json({ error: 'Épreuve introuvable' });

    let score = 0;
    const details = {};
    const totalPoints = exam.questions.reduce((s, q) => s + (q.points || 1), 0);

    exam.questions.forEach(q => {
      const qId = q._id.toString();
      const student = answers[qId];
      const isCorrect = student != null && String(student).trim() === String(q.correctAnswer).trim();
      if (isCorrect) score += (q.points || 1);
      details[qId] = {
        question: q.question,
        studentAnswer: student ?? null,
        correctAnswer: q.correctAnswer,
        isCorrect,
        points: q.points || 1,
        earned: isCorrect ? (q.points || 1) : 0
      };
    });

    const percentage = totalPoints > 0 ? parseFloat(((score / totalPoints) * 100).toFixed(2)) : 0;
    const saved = await new Result({
      examId: exam._id, studentInfo, answers,
      score, percentage, passed: percentage >= (exam.passingScore || 70),
      totalQuestions: exam.questions.length,
      examTitle: exam.title, examLevel: exam.level || '', domain: exam.domain || '',
      subject: exam.subject || '', category: exam.category || '',
      duration: exam.duration, passingScore: exam.passingScore || 70,
      examOption: exam.examOption || null,
      examQuestions: exam.questions.map(q => ({
        _id: q._id,
        question: q.question || q.text,
        options: q.options,
        correctAnswer: q.correctAnswer,
        type: q.type || 'single'
      })),
    }).save();

    res.status(201).json({ result: saved, details });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/results', async (req, res) => {
  try {
    const results = await Result.find().sort({ createdAt: -1 })
      .populate('examId', 'title questions domain category level subject duration passingScore totalPoints');
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/results/:id', async (req, res) => {
  try {
    const r = await Result.findById(req.params.id).populate('examId');
    if (!r) return res.status(404).json({ error: 'Résultat introuvable' });
    res.json(r);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/results/:id', async (req, res) => {
  try {
    await Result.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ══════════════════════════════════════════════════════════════
//  CLASSEMENTS
// ══════════════════════════════════════════════════════════════
app.get('/api/rankings/:examId', async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.examId);
    if (!exam) return res.status(404).json({ error: 'Épreuve introuvable' });
    const results = await Result.find({ examId: req.params.examId }).sort({ percentage: -1, score: -1, createdAt: 1 });
    const rankings = results.map((r, i) => ({
      rank: i + 1, _id: r._id, resultId: r._id.toString(),
      resultUrl: `/api/bulletin/${r._id}`,
      studentInfo: r.studentInfo, score: r.score, percentage: r.percentage,
      passed: r.passed, examOption: r.examOption, totalQuestions: r.totalQuestions,
      submittedAt: r.createdAt,
      examId: {
        _id: exam._id,
        title: exam.title,
        totalPoints: exam.questions.reduce((s, q) => s + (q.points || 1), 0),
        questions: exam.questions
      },
    }));
    res.json({
      rankings, examTitle: exam.title, examDomain: exam.domain || '', examLevel: exam.level || '',
      total: rankings.length, passed: rankings.filter(r => r.passed).length,
      average: rankings.length ? parseFloat((rankings.reduce((s, r) => s + r.percentage, 0) / rankings.length).toFixed(2)) : 0
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ══════════════════════════════════════════════════════════════
//  BULLETIN HTML (simplifié)
// ══════════════════════════════════════════════════════════════
app.get('/api/bulletin/:resultId', async (req, res) => {
  try {
    const result = await Result.findById(req.params.resultId);
    if (!result) return res.status(404).send('<h1>Résultat introuvable</h1>');
    const exam = await Exam.findById(result.examId);
    const questions = result.examQuestions?.length ? result.examQuestions : (exam?.questions || []);
    const answers = result.answers instanceof Map ? Object.fromEntries(result.answers) : (result.answers || {});
    const mention = result.percentage >= 90 ? 'Très Bien' : result.percentage >= 75 ? 'Bien' : result.percentage >= 60 ? 'Assez Bien' : result.percentage >= 50 ? 'Passable' : 'Insuffisant';
    const mColor = result.percentage >= 75 ? '#16a34a' : result.percentage >= 50 ? '#d97706' : '#dc2626';
    const note20 = ((result.percentage / 100) * 20).toFixed(2);

    let rows = '';
    questions.forEach((q, i) => {
      const qId = q._id?.toString();
      const student = answers[qId] ?? '—';
      const ok = student !== '—' && String(student).trim() === String(q.correctAnswer).trim();
      rows += `<tr style="border-bottom:1px solid #e2e8f0">
        <td style="padding:10px 8px;color:#64748b;width:32px">${i + 1}<\/td>
        <td style="padding:10px 8px;font-size:0.88rem">${q.question || q.text || ''}<\/td>
        <td style="padding:10px 8px;color:${ok ? '#16a34a' : '#dc2626'}">${student}<\/td>
        <td style="padding:10px 8px;color:#16a34a">${q.correctAnswer}<\/td>
        <td style="padding:10px 8px;text-align:center">${ok ? '✅' : '❌'}<\/td>
       <\/tr>`;
    });

    const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><title>Bulletin</title><style>...</style></head><body>...</body></html>`;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (err) {
    res.status(500).send(`<h1>Erreur: ${err.message}</h1>`);
  }
});

// ══════════════════════════════════════════════════════════════
//  IA — DEEPSEEK
// ══════════════════════════════════════════════════════════════
app.post('/api/generate-questions', async (req, res) => {
  try {
    const body = req.body;
    const mat = body.subject || body.matiere || '';
    const dom = body.domain || body.domaine || '';
    const sdom = body.subDomain || body.sousDomaine || '';
    const niv = body.level || body.niveau || '';
    const nbQ = body.numQuestions || body.numberOfQuestions || 5;
    const mots = body.keywords ? ` Mots-clés : ${body.keywords}.` : '';
    const lang = body.language || 'fr';

    if (!mat) return res.status(400).json({ error: 'Sujet/matière requis' });

    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) return res.status(503).json({ error: 'Clé API DeepSeek non configurée' });

    const prompt = `Tu es un expert en évaluation scolaire (Cameroun).
Génère exactement ${nbQ} questions QCM en ${lang} sur : "${mat}"${dom ? ` (${dom})` : ''}${sdom ? `, ${sdom}` : ''}${niv ? `, niveau ${niv}` : ''}.${mots}
Retourne UNIQUEMENT du JSON valide sans texte avant/après ni backticks.
Format : {"questions":[{"text":"Question ?","options":["A","B","C","D"],"correctAnswer":"A","explanation":"Explication","points":1,"difficulty":"moyen"}]}`;

    const ctrl = new AbortController();
    const tmo = setTimeout(() => ctrl.abort(), 85000);

    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({ model: 'deepseek-chat', messages: [{ role: 'user', content: prompt }], temperature: 0.6, max_tokens: 4000 }),
      signal: ctrl.signal,
    });
    clearTimeout(tmo);

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return res.status(502).json({ error: 'Erreur API DeepSeek', detail: err.error?.message });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    const clean = content.replace(/```json|```/g, '').trim();
    let parsed;
    try {
      parsed = JSON.parse(clean);
    } catch (_) {
      const m = clean.match(/\{[\s\S]*\}/);
      if (!m) throw new Error('Réponse IA non parseable');
      parsed = JSON.parse(m[0]);
    }

    const questions = (parsed.questions || []).map(q => ({
      text: q.text || q.question || '', options: q.options || [],
      correctAnswer: q.correctAnswer || q.answer || '',
      explanation: q.explanation || '', points: q.points || 1, difficulty: q.difficulty || 'moyen',
    }));

    res.json({ success: true, questions, metadata: { subject: mat, level: niv, count: questions.length } });
  } catch (err) {
    if (err.name === 'AbortError') return res.status(503).json({ error: 'Timeout DeepSeek (>85s), réessayez.' });
    res.status(500).json({ error: 'Erreur génération IA', detail: err.message });
  }
});

// ══════════════════════════════════════════════════════════════
//  SURVEILLANCE DATA
// ══════════════════════════════════════════════════════════════
app.get('/api/surveillance-data', (_, res) => {
  const sessions = Array.from(activeSessions.values());
  const students = sessions.filter(s => s.type === 'student');
  const terminals = sessions.filter(s => s.type === 'terminal');
  const waitingStudents = students.filter(s => s.status === 'waiting');

  const byExam = {};
  students.forEach(s => {
    if (!s.currentExamId) return;
    if (!byExam[s.currentExamId]) byExam[s.currentExamId] = { waiting: 0, composing: 0, finished: 0 };
    if (s.status === 'waiting') byExam[s.currentExamId].waiting++;
    if (s.status === 'composing') byExam[s.currentExamId].composing++;
    if (s.status === 'finished') byExam[s.currentExamId].finished++;
  });

  console.log(`[API] 📊 Surveillance data: ${waitingStudents.length} étudiants en attente`);

  res.json({
    success: true,
    activeSessions: sessions,
    students,
    waitingStudents,
    terminals,
    examStats: byExam,
    distributedExams: Array.from(activeDistributedExams.entries()).map(([id, info]) => ({ examId: id, ...info })),
    total: sessions.length,
    ts: new Date(),
  });
});

// ══════════════════════════════════════════════════════════════
//  SESSIONS ACTIVES (API pour la surveillance)
// ══════════════════════════════════════════════════════════════
app.get('/api/active-sessions', (_, res) => {
  const sessions = Array.from(activeSessions.values()).map(s => ({
    socketId: s.socketId,
    type: s.type,
    sessionId: s.sessionId,
    status: s.status,
    currentExamId: s.currentExamId,
    studentInfo: s.studentInfo,
    progress: s.progress,
    examOption: s.examOption,
    lastUpdate: s.lastUpdate,
    isOnline: s.isOnline,
    score: s.score,
    totalQuestions: s.totalQuestions,
    percentage: s.percentage,
    resultUrl: s.resultUrl
  }));

  const waitingCount = sessions.filter(s => s.type === 'student' && s.status === 'waiting').length;
  const composingCount = sessions.filter(s => s.type === 'student' && s.status === 'composing').length;

  console.log(`[API] 📊 ${sessions.length} sessions actives:`);
  sessions.forEach(s => {
    if (s.type === 'student') {
      console.log(`  - ${s.studentInfo?.firstName} ${s.studentInfo?.lastName}: status=${s.status}, option=${s.examOption}`);
    }
  });
  console.log(`[API] Résumé: ${waitingCount} en attente, ${composingCount} en composition`);

  res.json({
    success: true,
    count: sessions.length,
    waitingCount,
    composingCount,
    sessions
  });
});

// ══════════════════════════════════════════════════════════════
//  404
// ══════════════════════════════════════════════════════════════
app.use((req, res) => res.status(404).json({ error: `Route ${req.method} ${req.path} introuvable` }));

// ══════════════════════════════════════════════════════════════
//  SOCKET.IO
// ══════════════════════════════════════════════════════════════
const io = new Server(server, {
  cors: { origin: allowedOrigins, methods: ['GET', 'POST'], credentials: true },
  allowEIO3: true,
  transports: ['polling', 'websocket'],
  pingTimeout: 60000,
  pingInterval: 25000,
});

const emitSessionUpdate = () => {
  const sessions = Array.from(activeSessions.values()).filter(s => s.type !== 'surveillance');
  io.emit('sessionUpdate', { activeSessions: sessions });
};

io.on('connection', (socket) => {
  console.log(`[Socket] 🔌 Nouvelle connexion: ${socket.id}`);

  // ==================== REGISTRATION ====================
  socket.on('registerSession', (data) => {
    console.log(`[Socket] 📝 registerSession: type=${data.type}, sessionId=${data.sessionId}`);

    const existing = Array.from(activeSessions.values()).find(s => s.sessionId === data.sessionId && s.type === data.type);
    if (existing) {
      const pending = pendingReconnections.get(data.sessionId);
      if (pending) { clearTimeout(pending); pendingReconnections.delete(data.sessionId); }
      activeSessions.delete(existing.socketId);
      Object.assign(existing, { socketId: socket.id, isOnline: true, lastUpdate: Date.now() });
      activeSessions.set(socket.id, existing);

      if (existing.type === 'surveillance') socket.join('surveillance');
      if (existing.type === 'student' && existing.currentExamId) {
        socket.join(`exam:${existing.currentExamId}`);
        socket.join(`exam:${existing.currentExamId}:all`);
        if (existing.status === 'waiting') socket.join(`exam:${existing.currentExamId}:waiting`);
        if (existing.status === 'composing') socket.join(`exam:${existing.currentExamId}:composing`);
      }
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
      progress: 0,
      lastUpdate: Date.now(),
      resultUrl: null,
      isOnline: true,
      examOption: data.examOption || null
    };
    activeSessions.set(socket.id, session);

    if (data.type === 'surveillance') {
      socket.join('surveillance');
      console.log('[Socket] ✅ Surveillance enregistrée');
    }
    if (data.type === 'student' && data.examId) {
      socket.join(`exam:${data.examId}`);
      socket.join(`exam:${data.examId}:all`);
      if (data.status === 'waiting') socket.join(`exam:${data.examId}:waiting`);
      if (data.status === 'composing') socket.join(`exam:${data.examId}:composing`);
      console.log(`[Socket] 👨‍🎓 Étudiant ${data.studentInfo?.firstName} ${data.studentInfo?.lastName} enregistré (status=${data.status})`);
    }
    if (data.type === 'terminal') {
      socket.join('terminals');
      console.log('[Socket] 🖥️ Terminal enregistré');
    }

    emitSessionUpdate();
  });

  // ==================== STUDENT READY (CORRIGÉ POUR OPTION B) ====================
  socket.on('studentReadyForExam', ({ examId, studentInfo, status = 'composing', sessionId, examOption }) => {
    // ✅ IMPORTANT: Utiliser socket.id, PAS studentSocketId
    const targetId = socket.id;
    const stableSessionId = sessionId || `STU_${examId}_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

    console.log(`[Socket] 👨‍🎓 studentReadyForExam: exam=${examId}, student=${studentInfo?.firstName} ${studentInfo?.lastName}, status=${status}, option=${examOption}, socketId=${targetId}`);

    // Vérifier si l'étudiant existe déjà
    const existingStudent = Array.from(activeSessions.values()).find(
      s => s.type === 'student' &&
        s.studentInfo?.matricule === studentInfo.matricule &&
        s.currentExamId === examId
    );

    if (existingStudent && existingStudent.socketId !== targetId) {
      activeSessions.delete(existingStudent.socketId);
      console.log(`[Socket] ♻️ Remplacé ancienne session pour ${studentInfo.firstName} ${studentInfo.lastName}`);
    }

    const session = {
      socketId: targetId,
      type: 'student',
      sessionId: stableSessionId,
      currentExamId: examId,
      studentInfo,
      status: status,  // ✅ status = 'waiting' pour Option B
      progress: 0,
      examOption: examOption || 'A',
      lastUpdate: Date.now(),
      resultUrl: null,
      isOnline: true
    };

    activeSessions.set(targetId, session);
    console.log(`[Socket] ✅ Student ajouté: ${studentInfo.firstName} ${studentInfo.lastName} (status=${status})`);
    console.log(`[Socket] 📊 Total students: ${Array.from(activeSessions.values()).filter(s => s.type === 'student').length}`);

    // Joindre les rooms
    const studentSocket = io.sockets.sockets.get(targetId);
    if (studentSocket) {
      studentSocket.join(`exam:${examId}`);
      studentSocket.join(`exam:${examId}:all`);

      if (status === 'waiting') {
        studentSocket.join(`exam:${examId}:waiting`);
        console.log(`[Socket] ⏳ [WAITING] ${studentInfo.firstName} ${studentInfo.lastName} - Option ${examOption}`);

        const waitingCount = Array.from(activeSessions.values()).filter(
          x => x.type === 'student' && x.currentExamId === examId && x.status === 'waiting'
        ).length;
        io.emit('waitingCountUpdate', { examId, count: waitingCount });
        console.log(`[Socket] 📊 Attente: ${waitingCount} étudiants`);

        io.to('surveillance').emit('studentJoinedWaiting', { examId, studentInfo, waitingCount });
      } else if (status === 'composing') {
        studentSocket.join(`exam:${examId}:composing`);
        console.log(`[Socket] ✍️ [COMPOSING] ${studentInfo.firstName} ${studentInfo.lastName} - Option ${examOption}`);
      }
    }

    emitSessionUpdate();
  });

  // ==================== START EXAM ====================
  socket.on('startExam', ({ examId, option }) => {
    console.log(`[Socket] 🚀 DEMANDE DE DÉMARRAGE - Examen: ${examId}, Option: ${option}`);

    if (!examId) {
      console.log('[Socket] ⚠️ examId manquant');
      socket.emit('startExamError', { examId, error: 'ID examen manquant' });
      return;
    }

    const examInfo = activeDistributedExams.get(examId);
    if (!examInfo) {
      console.log(`[Socket] ⚠️ Examen ${examId} non distribué`);
      socket.emit('startExamError', { examId, error: 'Examen non distribué' });
      return;
    }

    if (option === 'B') {
      const waitingStudents = Array.from(activeSessions.values()).filter(
        s => s.type === 'student' && s.currentExamId === examId && s.status === 'waiting'
      );

      console.log(`[Socket] 📋 ${waitingStudents.length} étudiant(s) en attente pour Option B`);

      if (waitingStudents.length === 0) {
        console.log(`[Socket] ⚠️ Aucun étudiant en attente pour l'examen ${examId}`);
        socket.emit('noWaitingStudents', { examId });
        return;
      }

      let startedCount = 0;

      waitingStudents.forEach(student => {
        const studentSocket = io.sockets.sockets.get(student.socketId);

        if (studentSocket && studentSocket.connected) {
          const updatedStudent = {
            ...student,
            status: 'composing',
            lastUpdate: Date.now(),
            examStartTime: Date.now()
          };
          activeSessions.set(student.socketId, updatedStudent);

          studentSocket.leave(`exam:${examId}:waiting`);
          studentSocket.join(`exam:${examId}:composing`);

          studentSocket.emit('examStartedForOptionB', {
            examId,
            questionIndex: 0,
            timestamp: Date.now(),
            totalQuestions: examInfo.questionCount || 0
          });

          startedCount++;
          console.log(`[Socket] ✅ Examen démarré pour ${student.studentInfo?.firstName} ${student.studentInfo?.lastName}`);
        } else {
          console.log(`[Socket] ⚠️ Socket non connecté pour ${student.studentInfo?.firstName} ${student.studentInfo?.lastName}`);
        }
      });

      io.emit('waitingCountUpdate', { examId, count: 0 });

      if (startedCount > 0) {
        socket.emit('examStartedConfirm', {
          examId,
          startedCount,
          totalWaiting: waitingStudents.length
        });

        io.to('surveillance').emit('examStartedSuccess', {
          examId,
          startedCount,
          message: `${startedCount} étudiant(s) ont commencé l'épreuve`
        });
      } else {
        socket.emit('startExamError', { examId, error: 'Aucun étudiant n\'a pu démarrer l\'épreuve' });
      }
    } else {
      const students = Array.from(activeSessions.values()).filter(
        s => s.type === 'student' && s.currentExamId === examId
      );

      students.forEach(s => {
        const studentSocket = io.sockets.sockets.get(s.socketId);
        if (studentSocket && studentSocket.connected) {
          studentSocket.emit('examStarted', { examId, questionIndex: 0 });
          activeSessions.set(s.socketId, { ...s, status: 'composing', lastUpdate: Date.now() });
        }
      });

      socket.emit('examStartedConfirm', { examId, startedCount: students.length });
    }

    emitSessionUpdate();
  });

  // ==================== AUTRES ÉVÉNEMENTS ====================
  socket.on('distributeExam', (data) => {
    if (!data.examId || !data.examOption) return;
    const examData = {
      option: data.examOption,
      distributedAt: new Date(),
      questionCount: data.questionCount || 0
    };
    if (data.examOption === 'A') {
      examData.currentQuestionIndex = 0;
      io.emit('currentQuestionIndexForOptionA', { examId: data.examId, questionIndex: 0 });
    }
    activeDistributedExams.set(data.examId, examData);
    io.to('terminals').emit('examDistributed', {
      url: `${FRONTEND_URL}/exam/profile/${data.examId}`,
      examId: data.examId,
      examOption: data.examOption
    });
    emitSessionUpdate();
  });

  socket.on('registerTerminal', (data) => {
    const existing = Array.from(activeSessions.values()).find(s => s.sessionId === data.sessionId && s.type === 'terminal');
    if (existing) {
      const pending = pendingReconnections.get(data.sessionId);
      if (pending) { clearTimeout(pending); pendingReconnections.delete(data.sessionId); }
      activeSessions.delete(existing.socketId);
      Object.assign(existing, { socketId: socket.id, isOnline: true, lastUpdate: Date.now() });
      activeSessions.set(socket.id, existing);
      socket.join('terminals');
      activeDistributedExams.forEach((info, examId) => {
        socket.emit('examDistributed', { url: `${FRONTEND_URL}/exam/profile/${examId}`, examId, examOption: info.option, isReconnect: true });
      });
      emitSessionUpdate();
      return;
    }
    activeSessions.set(socket.id, {
      socketId: socket.id,
      type: 'terminal',
      sessionId: data.sessionId || `TERM_${Date.now()}`,
      status: 'connected',
      currentExamId: null,
      studentInfo: null,
      progress: 0,
      lastUpdate: Date.now(),
      resultUrl: null,
      isOnline: true
    });
    socket.join('terminals');
    emitSessionUpdate();
  });

  socket.on('advanceQuestionForOptionA', ({ examId, nextQuestionIndex }) => {
    const info = activeDistributedExams.get(examId);
    if (!info) return;
    info.currentQuestionIndex = nextQuestionIndex;
    activeDistributedExams.set(examId, info);
    Array.from(activeSessions.values()).filter(s => s.type === 'student' && s.currentExamId === examId)
      .forEach(s => io.to(s.socketId).emit('displayQuestion', { examId, questionIndex: nextQuestionIndex }));
    io.emit('currentQuestionIndexForOptionA', { examId, questionIndex: nextQuestionIndex });
  });

  socket.on('displayQuestion', ({ examId, questionIndex }) => {
    const info = activeDistributedExams.get(examId);
    if (info) { info.currentQuestionIndex = questionIndex; activeDistributedExams.set(examId, info); }
    Array.from(activeSessions.values()).filter(s => s.type === 'student' && s.currentExamId === examId)
      .forEach(s => io.to(s.socketId).emit('displayQuestion', { examId, questionIndex }));
  });

  socket.on('updateStudentProgress', (data) => {
    const s = activeSessions.get(socket.id);
    if (s?.type === 'student') {
      activeSessions.set(socket.id, {
        ...s, progress: data.progress, status: 'composing',
        score: data.score, totalQuestions: data.totalQuestions,
        percentage: data.percentage, lastUpdate: Date.now(),
      });
      emitSessionUpdate();
    }
  });

  socket.on('examSubmitted', ({ studentSocketId, examResultId }) => {
    const s = activeSessions.get(studentSocketId);
    if (s?.type === 'student') {
      activeSessions.set(studentSocketId, { ...s, status: 'finished', resultUrl: `/api/bulletin/${examResultId}`, lastUpdate: Date.now() });
      emitSessionUpdate();
    }
  });

  socket.on('examSubmitting', ({ studentSocketId }) => {
    const s = activeSessions.get(studentSocketId || socket.id);
    if (s) activeSessions.set(s.socketId, { ...s, status: 'submitting', lastUpdate: Date.now() });
  });

  socket.on('finishExam', ({ examId }) => {
    io.emit('examFinished', { examId });
    activeDistributedExams.delete(examId);
    emitSessionUpdate();
  });

  socket.on('ping', () => {
    const s = activeSessions.get(socket.id);
    if (s) { s.lastUpdate = Date.now(); s.isOnline = true; }
    socket.emit('pong');
  });

  socket.on('getSurveillanceData', () => {
    socket.emit('sessionUpdate', { activeSessions: Array.from(activeSessions.values()) });
  });

  socket.on('disconnect', (reason) => {
    const session = activeSessions.get(socket.id);
    if (!session) return;

    console.log(`[Socket] 👋 Déconnexion: ${socket.id}, raison: ${reason}`);
    session.isOnline = false;
    session.lastUpdate = Date.now();

    const timeout = setTimeout(() => {
      const cur = activeSessions.get(socket.id);
      if (cur && !cur.isOnline) {
        activeSessions.delete(socket.id);
        emitSessionUpdate();
        console.log(`[Socket] 🧹 Session supprimée: ${socket.id}`);
      }
      pendingReconnections.delete(session.sessionId);
    }, 45000);

    pendingReconnections.set(session.sessionId, timeout);
  });
});

// ══════════════════════════════════════════════════════════════
//  DÉMARRAGE
// ══════════════════════════════════════════════════════════════
const PORT = process.env.PORT || 4000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`[NA²QUIZ] ✅ Serveur unifié démarré sur le port ${PORT}`);
  console.log(`[NA²QUIZ] 🌐 Frontend: ${FRONTEND_URL}`);
  console.log(`[NA²QUIZ] 🔧 MongoDB: ${process.env.MONGODB_URI ? 'configuré' : '❌ MANQUANT'}`);
  console.log(`[NA²QUIZ] 🤖 DeepSeek: ${process.env.DEEPSEEK_API_KEY ? 'configuré' : '❌ MANQUANT'}`);
});
