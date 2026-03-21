// netlify/functions/api.js
// ─────────────────────────────────────────────────────────────
//  NA²QUIZ — Serverless API (Netlify Functions)
//  Wraps the full Express REST API via serverless-http.
//  Socket.IO n'est PAS ici → voir socket-server/ (Railway)
// ─────────────────────────────────────────────────────────────
'use strict';

const express      = require('express');
const mongoose     = require('mongoose');
const serverless   = require('serverless-http');
const cors         = require('cors');
const bcrypt       = require('bcryptjs');
const jwt          = require('jsonwebtoken');
const PDFDocument  = require('pdfkit');

// ── Connexion MongoDB (pool réutilisé entre invocations) ─────
let isConnected = false;

async function connectDB() {
  if (isConnected) return;
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI manquant dans les variables d\'environnement');
  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 5000,
    maxPoolSize: 5,            // pool réduit pour serverless
  });
  isConnected = true;
  console.log('[DB] Connecté à MongoDB Atlas');
}

// ── Schémas ──────────────────────────────────────────────────
const UserSchema = new mongoose.Schema({
  name:     { type: String, required: true },
  username: { type: String, unique: true, sparse: true },
  email:    { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role:     { type: String, enum: ['student','teacher','admin'], default: 'student' },
  isAdmin:  { type: Boolean, default: false },
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
  domaine:       { type: String, required: true },
  sousDomaine:   { type: String, default: '' },
  niveau:        { type: String, required: true },
  matiere:       { type: String, required: true },
  question:      { type: String, required: true },
  options:       [{ type: String, required: true }],
  correctAnswer: { type: mongoose.Schema.Types.Mixed, required: true },
  points:        { type: Number, default: 1, min: 0.5, max: 10 },
  explanation:   { type: String, default: '' },
  type:          { type: String, enum: ['single','multiple'], default: 'single' },
  difficulty:    { type: String, enum: ['facile','moyen','difficile'], default: 'moyen' },
  tags:          [String],
  createdBy:     { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

const ExamQuestionSchema = new mongoose.Schema({
  question:      { type: String, required: true },
  text:          { type: String },
  options:       [{ type: String, required: true }],
  correctAnswer: { type: mongoose.Schema.Types.Mixed, required: true },
  points:        { type: Number, default: 1 },
  explanation:   { type: String, default: '' },
  type:          { type: String, enum: ['QCM','single','multiple'], default: 'single' },
}, { _id: true });

const ExamSchema = new mongoose.Schema({
  title:         { type: String, required: true, trim: true },
  description:   { type: String, default: '' },
  duration:      { type: Number, required: true, min: 1 },
  domain:        { type: String, required: true, trim: true },
  category:      { type: String, trim: true },
  level:         { type: String, required: true, trim: true },
  subject:       { type: String, required: true, trim: true },
  questions:     [ExamQuestionSchema],
  passingScore:  { type: Number, default: 70 },
  questionCount: { type: Number, default: 0 },
  totalPoints:   { type: Number, default: 0 },
  status:        { type: String, enum: ['draft','published','archived'], default: 'published' },
  tags:          [String],
  isAIgenerated: { type: Boolean, default: false },
  examOption:    { type: String, enum: ['A','B','C','D',null], default: null },
  teacherName:   { type: String, default: '' },
  teacherGrade:  { type: String, default: '' },
  source:        { type: String, enum: ['manual','database','ai_generated'], default: 'manual' },
  createdBy:     { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true, toJSON: { virtuals: true } });

ExamSchema.pre('save', function (next) {
  this.questionCount = this.questions.length;
  this.totalPoints   = this.questions.reduce((s, q) => s + (q.points || 1), 0);
  next();
});

const ResultSchema = new mongoose.Schema({
  examId:      { type: mongoose.Schema.Types.ObjectId, ref: 'Exam', required: true },
  studentInfo: {
    firstName: { type: String, required: true },
    lastName:  { type: String, required: true },
    matricule: { type: String },
    level:     { type: String },
  },
  answers:        { type: Map, of: mongoose.Schema.Types.Mixed, required: true },
  score:          { type: Number, required: true },
  percentage:     { type: Number, required: true, set: v => parseFloat(parseFloat(v).toFixed(2)) },
  passed:         { type: Boolean, required: true },
  totalQuestions: Number,
  examTitle:      String,
  examLevel:      String,
  domain:         String,
  subject:        String,
  category:       String,
  duration:       Number,
  passingScore:   Number,
  examOption:     { type: String, enum: ['A','B','C','D',null], default: null },
  examQuestions:  [{
    _id:           mongoose.Schema.Types.ObjectId,
    question:      String,
    options:       [String],
    correctAnswer: mongoose.Schema.Types.Mixed,
    type:          { type: String, default: 'single' },
  }],
  pdfPath: { type: String, default: null },
}, { timestamps: true });

// Modèles (éviter de re-définir entre invocations)
const User     = mongoose.models.User     || mongoose.model('User',     UserSchema);
const Question = mongoose.models.Question || mongoose.model('Question', QuestionSchema);
const Exam     = mongoose.models.Exam     || mongoose.model('Exam',     ExamSchema);
const Result   = mongoose.models.Result   || mongoose.model('Result',   ResultSchema);

// ── Middleware auth ───────────────────────────────────────────
function protect(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Non autorisé — token manquant' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'na2quiz_secret_key');
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ message: 'Token invalide ou expiré' });
  }
}

// ── App Express ───────────────────────────────────────────────
const app = express();

const allowedOrigins = [
  process.env.FRONTEND_URL || '',
  'http://localhost:3000',
  'http://localhost:5001',
].filter(Boolean);

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.some(o => origin.startsWith(o))) return cb(null, true);
    // En dev, tout autoriser
    if (process.env.NODE_ENV !== 'production') return cb(null, true);
    cb(new Error(`CORS bloqué: ${origin}`));
  },
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));

// ── Middleware de connexion DB avant chaque requête ───────────
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    console.error('[DB] Erreur connexion:', err.message);
    res.status(503).json({ error: 'Base de données indisponible', detail: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════
//  ROUTES AUTH
// ═══════════════════════════════════════════════════════════════
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
    res.status(201).json({ message: 'Inscription réussie' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: 'Utilisateur non trouvé' });

    const ok = await user.matchPassword(password);
    if (!ok) return res.status(400).json({ message: 'Mot de passe incorrect' });

    const token = jwt.sign(
      { id: user._id, role: user.role, isAdmin: user.isAdmin },
      process.env.JWT_SECRET || 'na2quiz_secret_key',
      { expiresIn: '7d' }
    );
    res.json({ token, user: { id: user._id, name: user.name, email: user.email, role: user.role, isAdmin: user.isAdmin } });
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

// ═══════════════════════════════════════════════════════════════
//  ROUTES QUESTIONS (banque)
// ═══════════════════════════════════════════════════════════════
app.get('/api/questions', async (req, res) => {
  try {
    const { domaine, sousDomaine, niveau, matiere, difficulty, type, limit = 1000 } = req.query;
    const filter = {};
    if (domaine)     filter.domaine     = domaine;
    if (sousDomaine) filter.sousDomaine = sousDomaine;
    if (niveau)      filter.niveau      = niveau;
    if (matiere)     filter.matiere     = matiere;
    if (difficulty)  filter.difficulty  = difficulty;
    if (type)        filter.type        = type;

    const questions = await Question.find(filter).sort({ createdAt: -1 }).limit(parseInt(limit));
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
    res.json({ success: true, count: saved.length, message: `${saved.length} questions enregistrées` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.put('/api/questions/:id', async (req, res) => {
  try {
    const q = await Question.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
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
    res.json({ success: true, message: 'Question supprimée' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════
//  ROUTES EXAMENS
// ═══════════════════════════════════════════════════════════════
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
    const exam = new Exam(req.body);
    const saved = await exam.save();
    res.status(201).json(saved);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/exams/:id', async (req, res) => {
  try {
    const updated = await Exam.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
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
    res.json({ success: true, message: 'Épreuve supprimée' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════
//  ROUTES RÉSULTATS
// ═══════════════════════════════════════════════════════════════
app.post('/api/results', async (req, res) => {
  try {
    const { examId, studentInfo, answers } = req.body;
    if (!examId || !studentInfo || !answers)
      return res.status(400).json({ error: 'Données manquantes' });

    const exam = await Exam.findById(examId);
    if (!exam) return res.status(404).json({ error: 'Épreuve introuvable' });

    // Calcul du score côté serveur
    let score = 0;
    const details = {};
    const totalPoints = exam.questions.reduce((s, q) => s + (q.points || 1), 0);

    exam.questions.forEach(q => {
      const qId        = q._id.toString();
      const student    = answers[qId];
      const correct    = q.correctAnswer;
      const isCorrect  = student != null &&
                         String(student).trim() === String(correct).trim();
      if (isCorrect) score += (q.points || 1);
      details[qId] = {
        question: q.question, studentAnswer: student ?? null,
        correctAnswer: correct, isCorrect,
        points: q.points || 1, earned: isCorrect ? (q.points || 1) : 0,
      };
    });

    const percentage = totalPoints > 0
      ? parseFloat(((score / totalPoints) * 100).toFixed(2))
      : 0;
    const passed = percentage >= (exam.passingScore || 70);

    const result = new Result({
      examId: exam._id, studentInfo, answers,
      score, percentage, passed,
      totalQuestions: exam.questions.length,
      examTitle:   exam.title,
      examLevel:   exam.level   || '',
      domain:      exam.domain  || '',
      subject:     exam.subject || '',
      category:    exam.category || '',
      duration:    exam.duration,
      passingScore: exam.passingScore || 70,
      examOption:  exam.examOption || null,
      examQuestions: exam.questions.map(q => ({
        _id: q._id,
        question: q.question || q.text,
        options: q.options,
        correctAnswer: q.correctAnswer,
        type: q.type || 'single',
      })),
    });

    const saved = await result.save();
    res.status(201).json({ result: saved, details });
  } catch (err) {
    console.error('[API] Erreur POST /api/results:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/results', async (req, res) => {
  try {
    const results = await Result.find()
      .sort({ createdAt: -1 })
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

// ═══════════════════════════════════════════════════════════════
//  ROUTE CLASSEMENTS
// ═══════════════════════════════════════════════════════════════
app.get('/api/rankings/:examId', async (req, res) => {
  try {
    const exam    = await Exam.findById(req.params.examId);
    if (!exam) return res.status(404).json({ error: 'Épreuve introuvable' });

    const results = await Result.find({ examId: req.params.examId })
      .sort({ percentage: -1, score: -1, createdAt: 1 });

    const rankings = results.map((r, i) => ({
      rank:         i + 1,
      _id:          r._id,
      resultId:     r._id.toString(),
      resultUrl:    `/api/bulletin/${r._id}`,
      studentInfo:  r.studentInfo,
      score:        r.score,
      percentage:   r.percentage,
      passed:       r.passed,
      examOption:   r.examOption,
      totalQuestions: r.totalQuestions,
      submittedAt:  r.createdAt,
      examId: {
        _id:        exam._id,
        title:      exam.title,
        totalPoints: exam.questions.reduce((s, q) => s + (q.points || 1), 0),
        questions:  exam.questions,
      },
    }));

    res.json({
      rankings,
      examTitle:  exam.title,
      examDomain: exam.domain  || '',
      examLevel:  exam.level   || '',
      total:   rankings.length,
      passed:  rankings.filter(r => r.passed).length,
      average: rankings.length
        ? parseFloat((rankings.reduce((s, r) => s + r.percentage, 0) / rankings.length).toFixed(2))
        : 0,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════
//  ROUTE BULLETIN HTML (imprimable / PDF navigateur)
// ═══════════════════════════════════════════════════════════════
app.get('/api/bulletin/:resultId', async (req, res) => {
  try {
    const result = await Result.findById(req.params.resultId);
    if (!result) return res.status(404).send('<h1>Résultat introuvable</h1>');

    const exam      = await Exam.findById(result.examId);
    const questions = result.examQuestions?.length ? result.examQuestions : (exam?.questions || []);
    const answers   = result.answers instanceof Map
      ? Object.fromEntries(result.answers)
      : (result.answers || {});

    const mention = result.percentage >= 90 ? 'Très Bien'
      : result.percentage >= 75 ? 'Bien'
      : result.percentage >= 60 ? 'Assez Bien'
      : result.percentage >= 50 ? 'Passable' : 'Insuffisant';
    const mentionColor = result.percentage >= 75 ? '#16a34a'
      : result.percentage >= 50 ? '#d97706' : '#dc2626';
    const noteOn20 = ((result.percentage / 100) * 20).toFixed(2);

    const rows = questions.map((q, i) => {
      const qId    = q._id?.toString();
      const student = answers[qId] ?? '—';
      const ok     = student !== '—' && String(student).trim() === String(q.correctAnswer).trim();
      return `<tr style="border-bottom:1px solid #e2e8f0">
        <td style="padding:10px 8px;color:#64748b;width:32px">${i+1}</td>
        <td style="padding:10px 8px;font-size:0.88rem">${q.question||q.text||''}</td>
        <td style="padding:10px 8px;color:${ok?'#16a34a':'#dc2626'}">${student}</td>
        <td style="padding:10px 8px;color:#16a34a">${q.correctAnswer}</td>
        <td style="padding:10px 8px;text-align:center">${ok?'✅':'❌'}</td>
      </tr>`;
    }).join('');

    const html = `<!DOCTYPE html><html lang="fr"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Bulletin — ${result.studentInfo?.lastName} ${result.studentInfo?.firstName}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Segoe UI',Arial,sans-serif;background:#f8fafc;color:#1e293b}
.page{max-width:860px;margin:0 auto;padding:32px 24px}
.header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:28px;padding-bottom:18px;border-bottom:2px solid #3b82f6}
.logo{font-size:1.4rem;font-weight:900;color:#3b82f6}.title{font-size:1rem;font-weight:700;margin-top:3px}.date{font-size:0.78rem;color:#64748b;margin-top:2px}
.badge{padding:6px 16px;border-radius:999px;font-weight:800;font-size:0.95rem;color:#fff;background:${result.passed?'#16a34a':'#dc2626'}}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:24px}
.box{background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:12px 14px}
.lbl{font-size:0.68rem;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:3px}
.val{font-size:0.92rem;font-weight:600}
.score{background:linear-gradient(135deg,#1e40af,#3b82f6);border-radius:14px;padding:22px;text-align:center;margin-bottom:24px;color:#fff}
.pct{font-size:2.75rem;font-weight:900;line-height:1}
.mention{font-size:1rem;font-weight:700;color:${mentionColor};background:#fff;display:inline-block;padding:4px 14px;border-radius:999px;margin-top:8px}
.detail{font-size:0.82rem;opacity:0.85;margin-top:6px}
table{width:100%;border-collapse:collapse;background:#fff;border-radius:10px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.08)}
thead{background:#f1f5f9}th{padding:10px 8px;text-align:left;font-size:0.72rem;font-weight:700;color:#64748b;text-transform:uppercase}
.footer{margin-top:28px;padding-top:14px;border-top:1px solid #e2e8f0;display:flex;justify-content:space-between;font-size:0.72rem;color:#94a3b8}
.noprint{margin-top:20px;text-align:center}.noprint button{padding:10px 24px;background:#3b82f6;color:#fff;border:none;border-radius:8px;font-size:0.9rem;font-weight:600;cursor:pointer}
@media print{body{background:#fff}.noprint{display:none}@page{size:A4;margin:12mm}}
</style></head><body><div class="page">
<div class="header">
  <div><div class="logo">NA²QUIZ</div>
    <div class="title">Bulletin — ${result.examTitle||exam?.title||'Épreuve'}</div>
    <div class="date">${new Date(result.createdAt).toLocaleDateString('fr-FR',{weekday:'long',year:'numeric',month:'long',day:'numeric'})}</div>
  </div>
  <span class="badge">${result.passed?'✓ REÇU':'✗ AJOURNÉ'}</span>
</div>
<div class="grid">
  <div class="box"><div class="lbl">Nom complet</div><div class="val">${result.studentInfo?.lastName||''} ${result.studentInfo?.firstName||''}</div></div>
  <div class="box"><div class="lbl">Matricule</div><div class="val">${result.studentInfo?.matricule||'—'}</div></div>
  <div class="box"><div class="lbl">Niveau</div><div class="val">${result.studentInfo?.level||'—'}</div></div>
  <div class="box"><div class="lbl">Domaine · Matière</div><div class="val">${result.domain||'—'} · ${result.subject||'—'}</div></div>
  <div class="box"><div class="lbl">Durée</div><div class="val">${result.duration||'—'} min</div></div>
  <div class="box"><div class="lbl">Seuil</div><div class="val">${result.passingScore||50}%</div></div>
</div>
<div class="score">
  <div class="pct">${result.percentage}%</div>
  <div class="detail">${result.score} pt(s) · ${result.totalQuestions||questions.length} questions · Note /20 : ${noteOn20}</div>
  <div class="mention">${mention}</div>
</div>
<h3 style="font-size:0.85rem;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:10px">Détail par question</h3>
<table><thead><tr><th style="width:32px">#</th><th>Question</th><th>Réponse donnée</th><th>Bonne réponse</th><th style="width:40px;text-align:center">Résultat</th></tr></thead>
<tbody>${rows}</tbody></table>
<div class="footer">
  <span>NA²QUIZ — Système d'Évaluation Sommative · AFRICANUT INDUSTRY</span>
  <span>Réf : ${result._id}</span>
</div>
<div class="noprint"><button onclick="window.print()">🖨️ Imprimer / Enregistrer en PDF</button></div>
</div></body></html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (err) {
    res.status(500).send(`<h1>Erreur: ${err.message}</h1>`);
  }
});

// ═══════════════════════════════════════════════════════════════
//  ROUTE IA (génération de questions via DeepSeek)
// ═══════════════════════════════════════════════════════════════
app.post('/api/generate-questions', async (req, res) => {
  try {
    const { subject, niveau, domaine, numberOfQuestions = 5, language = 'fr' } = req.body;
    if (!subject) return res.status(400).json({ error: 'Sujet requis' });

    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) return res.status(503).json({ error: 'Clé API DeepSeek non configurée' });

    const prompt = `Génère ${numberOfQuestions} questions QCM en ${language} sur le sujet : "${subject}"${domaine ? ` (Domaine: ${domaine})` : ''}${niveau ? `, niveau ${niveau}` : ''}.
Retourne UNIQUEMENT un JSON valide avec ce format exact, sans texte avant ni après :
{"questions":[{"question":"...","options":["A) ...","B) ...","C) ...","D) ..."],"correctAnswer":"A) ...","explanation":"...","points":1}]}`;

    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 3000,
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return res.status(502).json({ error: 'Erreur DeepSeek', detail: err.error?.message });
    }

    const data    = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    const clean   = content.replace(/```json|```/g, '').trim();
    const parsed  = JSON.parse(clean);

    res.json({ success: true, questions: parsed.questions || [] });
  } catch (err) {
    console.error('[AI]', err.message);
    res.status(500).json({ error: 'Erreur génération IA', detail: err.message });
  }
});

app.get('/api/check-config', (req, res) => {
  res.json({
    deepseek: !!process.env.DEEPSEEK_API_KEY,
    mongodb:  !!process.env.MONGODB_URI,
    jwt:      !!process.env.JWT_SECRET,
  });
});

// ── Health ────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'UP', db: isConnected ? 'connected' : 'disconnected', ts: new Date() });
});

// ── 404 ───────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} introuvable` });
});

// ── Export serverless ─────────────────────────────────────────
const handler = serverless(app);

module.exports.handler = async (event, context) => {
  // Éviter que Lambda/Netlify attende la fermeture de la connexion MongoDB
  context.callbackWaitsForEmptyEventLoop = false;
  return handler(event, context);
};
