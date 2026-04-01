// backend/server.js - VERSION COMPLÈTE POUR PRODUCTION
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Chargement du .env
const envPath = path.resolve(__dirname, '.env');
console.log('🔍 Chargement du .env depuis:', envPath);
console.log('🔍 Fichier existe:', fs.existsSync(envPath));

const result = dotenv.config({ path: envPath });

if (result.error) {
  console.error('❌ Erreur chargement .env:', result.error);
  if (process.env.NODE_ENV === 'production') {
    console.error('❌ Arrêt du serveur: fichier .env manquant en production');
    process.exit(1);
  }
} else {
  console.log('✅ .env chargé avec succès');
}

console.log('🔐 JWT_SECRET présent:', !!process.env.JWT_SECRET);
console.log('🔐 JWT_SECRET longueur:', process.env.JWT_SECRET?.length);
console.log('🔐 MONGODB_URI présent:', !!process.env.MONGODB_URI);
console.log('🔧 NODE_ENV:', process.env.NODE_ENV);

import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import os from 'os';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';

// Import des routes
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import examRoutes from './routes/exams.js';
import manualQuizRoutes from './routes/manualQuiz.js';
import questionRoutes from './routes/questionRoutes.js';
import aiRoutes from './routes/aiRoutes.js';
import resultRoutes from './routes/results.js';
import composeRoutes from './routes/composeRoutes.js';
import surveillanceRoutes from './routes/surveillanceRoutes.js';
import uploadRoutes from './routes/uploadRoutes.js';

// Import des modèles
import User from './models/User.js';
import Question from './models/Question.js';
import Exam from './models/Exam.js';
import Result from './models/Result.js';

// ═══════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════
const SERVER_LOCAL_IP = process.env.SERVER_LOCAL_IP || 'localhost';
const ROUTER_IP = '192.168.0.1';
const PORT = parseInt(process.env.PORT) || 5000;
const FRONTEND_PORT = parseInt(process.env.FRONTEND_PORT) || 5001;
const MONGODB_URI = process.env.MONGODB_URI;
const JWT_SECRET = process.env.JWT_SECRET;
const NODE_ENV = process.env.NODE_ENV || 'development';
const isProduction = NODE_ENV === 'production';

// ✅ Vérification finale du secret
if (!JWT_SECRET) {
  console.error('❌ ERREUR CRITIQUE: JWT_SECRET non défini!');
  if (isProduction) {
    process.exit(1);
  }
  console.error('⚠️ Utilisation d\'un secret temporaire pour le développement');
  const TEMP_SECRET = 'tempSecretForDevelopment123!';
  process.env.JWT_SECRET = TEMP_SECRET;
}

// Configuration CORS
const CORS_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:5000',
  'http://localhost:5001',
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  `http://localhost:${FRONTEND_PORT}`,
  `http://${SERVER_LOCAL_IP}:3000`,
  `http://${SERVER_LOCAL_IP}:5000`,
  `http://${SERVER_LOCAL_IP}:5001`,
  `http://${SERVER_LOCAL_IP}:${FRONTEND_PORT}`,
  `http://${SERVER_LOCAL_IP}:${PORT}`,
  `http://${ROUTER_IP}:3000`,
  `http://${ROUTER_IP}:5000`,
  `http://${ROUTER_IP}:5001`,
  `http://${ROUTER_IP}:${FRONTEND_PORT}`,
  `http://${ROUTER_IP}:${PORT}`,
  'http://192.168.0.1:5000',
  'http://192.168.0.1:5001',
  'http://192.168.0.1:3000',
  'http://192.168.106.51:5000',
  'http://192.168.106.51:5001',
  process.env.FRONTEND_URL,
  'https://na2quizapp.netlify.app',
].filter(Boolean);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isProduction ? 300 : 500,
  message: 'Trop de requêtes, veuillez réessayer plus tard.',
  skip: (req) => req.path === '/health' || req.path === '/api/health',
  handler: (req, res) => {
    console.warn(`⚠️ Rate limit exceeded for ${req.ip} on ${req.path}`);
    res.status(429).json({
      success: false,
      message: 'Trop de requêtes, veuillez réessayer dans quelques minutes.'
    });
  }
});

// ═══════════════════════════════════════════════════════════════
// INITIALISATION EXPRESS
// ═══════════════════════════════════════════════════════════════
const app = express();
const server = createServer(app);

// Middlewares
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: false,
}));
app.use(compression());
app.use(limiter);
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// CORS
app.use((req, res, next) => {
  const origin = req.headers.origin;

  if (!isProduction) {
    res.header('Access-Control-Allow-Origin', origin || '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Max-Age', '86400');
  } else if (origin && CORS_ORIGINS.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.header('Access-Control-Allow-Credentials', 'true');
  }

  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Socket.IO
const io = new Server(server, {
  cors: {
    origin: isProduction ? CORS_ORIGINS : '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization']
  },
  allowEIO3: true,
  transports: ['polling', 'websocket'],
  pingTimeout: 60000,
  pingInterval: 25000,
  maxHttpBufferSize: 1e7,
});

// ═══════════════════════════════════════════════════════════════
// SERVEUR STATIQUE
// ═══════════════════════════════════════════════════════════════
const publicDir = path.join(__dirname, 'public');
if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });
app.use(express.static(publicDir, { maxAge: isProduction ? '1d' : 0 }));

app.get('/terminal.html', (req, res) => {
  const filePath = path.join(publicDir, 'terminal.html');
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).send('<h1>terminal.html non trouvé</h1><p>Placez le fichier terminal.html dans le dossier public/</p>');
  }
});

// Page d'accueil
app.get('/', (req, res) => {
  const networkInterfaces = os.networkInterfaces();
  let localIp = 'localhost';
  for (const [name, interfaces] of Object.entries(networkInterfaces)) {
    for (const iface of interfaces) {
      if (iface.family === 'IPv4' && !iface.internal && iface.address.startsWith('192.168.')) {
        localIp = iface.address;
        break;
      }
    }
  }

  res.send(`
    <!DOCTYPE html>
    <html lang="fr">
    <head><meta charset="UTF-8"><title>NA²QUIZ - Serveur</title>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body {
        background: linear-gradient(135deg, #05071a 0%, #0a0f2e 60%, #05071a 100%);
        color: white;
        font-family: 'Segoe UI', 'DM Sans', system-ui, sans-serif;
        display: flex;
        justify-content: center;
        align-items: center;
        min-height: 100vh;
        padding: 20px;
      }
      .container {
        text-align: center;
        background: rgba(15,23,42,0.85);
        backdrop-filter: blur(20px);
        border: 1px solid rgba(245,158,11,0.3);
        border-radius: 32px;
        padding: 48px;
        max-width: 600px;
        width: 100%;
        box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5);
      }
      h1 {
        background: linear-gradient(135deg, #f59e0b, #fbbf24);
        -webkit-background-clip: text;
        background-clip: text;
        color: transparent;
        font-size: 2.5rem;
        margin-bottom: 16px;
      }
      .status-badge {
        display: inline-block;
        padding: 6px 16px;
        border-radius: 999px;
        font-size: 0.75rem;
        font-weight: 600;
        margin-bottom: 24px;
      }
      .status-badge.online {
        background: rgba(16,185,129,0.2);
        color: #10b981;
        border: 1px solid rgba(16,185,129,0.3);
      }
      .ip-box {
        background: rgba(0,0,0,0.4);
        padding: 16px;
        border-radius: 16px;
        margin: 20px 0;
        font-family: monospace;
        font-size: 0.9rem;
      }
      .btn-group {
        display: flex;
        gap: 12px;
        justify-content: center;
        flex-wrap: wrap;
        margin: 24px 0;
      }
      .btn {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 12px 24px;
        background: linear-gradient(135deg, #3b82f6, #2563eb);
        color: white;
        text-decoration: none;
        border-radius: 12px;
        font-weight: 600;
        transition: transform 0.2s, box-shadow 0.2s;
      }
      .btn:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 20px rgba(59,130,246,0.4);
      }
      .btn-secondary {
        background: linear-gradient(135deg, #8b5cf6, #7c3aed);
      }
      .info {
        color: #64748b;
        font-size: 0.75rem;
        margin-top: 24px;
        padding-top: 20px;
        border-top: 1px solid rgba(255,255,255,0.1);
      }
      .stats {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 12px;
        margin: 20px 0;
      }
      .stat-card {
        background: rgba(255,255,255,0.05);
        border-radius: 12px;
        padding: 12px;
      }
      .stat-value {
        font-size: 1.2rem;
        font-weight: 700;
        color: #f59e0b;
      }
      .stat-label {
        font-size: 0.7rem;
        color: #64748b;
      }
    </style>
    </head>
    <body>
      <div class="container">
        <div class="status-badge online">● SERVEUR ACTIF</div>
        <h1>🚀 NA²QUIZ</h1>
        <p>Système d'Évaluation Intelligente</p>
        <div class="ip-box">
          📡 Accès réseau: <strong>http://${localIp}:${PORT}</strong><br>
          🔌 Socket.IO: <strong>ws://${localIp}:${PORT}</strong>
        </div>
        <div class="stats" id="stats">
          <div class="stat-card"><div class="stat-value" id="usersCount">-</div><div class="stat-label">Utilisateurs</div></div>
          <div class="stat-card"><div class="stat-value" id="questionsCount">-</div><div class="stat-label">Questions</div></div>
          <div class="stat-card"><div class="stat-value" id="examsCount">-</div><div class="stat-label">Épreuves</div></div>
          <div class="stat-card"><div class="stat-value" id="resultsCount">-</div><div class="stat-label">Résultats</div></div>
        </div>
        <div class="btn-group">
          <a href="/terminal.html" class="btn">🖥️ Terminal étudiant</a>
          <a href="${process.env.FRONTEND_URL || `http://localhost:${FRONTEND_PORT}`}" class="btn btn-secondary">📱 Interface enseignant</a>
        </div>
        <div class="info">
          💡 Les terminaux sur le réseau utilisent: http://${localIp}:${PORT}<br>
          🔧 API REST: /api/exams, /api/results, /api/questions, /api/compose
        </div>
      </div>
      <script>
        fetch('/api/stats')
          .then(res => res.json())
          .then(data => {
            if(data.success) {
              document.getElementById('usersCount').textContent = data.data.users || 0;
              document.getElementById('questionsCount').textContent = data.data.questions?.total || 0;
              document.getElementById('examsCount').textContent = data.data.exams || 0;
              document.getElementById('resultsCount').textContent = data.data.results || 0;
            }
          })
          .catch(() => {});
      </script>
    </body>
    </html>
  `);
});

// ═══════════════════════════════════════════════════════════════
// CONNEXION MONGODB
// ═══════════════════════════════════════════════════════════════
let isConnected = false;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;

async function connectDB() {
  if (isConnected) return;
  try {
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 8000,
      maxPoolSize: 20,
      socketTimeoutMS: 45000,
    });
    isConnected = true;
    reconnectAttempts = 0;
    console.log('[DB] ✅ Connecté à MongoDB');
    await createDefaultData();
  } catch (err) {
    console.error('[DB] ❌ Erreur de connexion:', err.message);
    if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
      reconnectAttempts++;
      console.log(`[DB] Tentative de reconnexion ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS}...`);
      setTimeout(connectDB, 5000);
    } else if (isProduction) {
      console.error('[DB] ❌ Échec de connexion MongoDB, arrêt du serveur');
      process.exit(1);
    }
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
        level: 'Système'
      });
      console.log('✅ Admin système créé: admin@na2quiz.com / Admin123!');
    }

    const delegateExists = await User.findOne({ role: 'ADMIN_DELEGUE' });
    if (!delegateExists) {
      const hashedPassword = await bcrypt.hash('Delegate123!', 10);
      await User.create({
        name: 'Administrateur Délégué',
        email: 'delegate@na2quiz.com',
        username: 'admin_delegate',
        password: hashedPassword,
        role: 'ADMIN_DELEGUE',
        matricule: 'DEL001',
        level: 'Administration'
      });
      console.log('✅ Admin délégué créé: delegate@na2quiz.com / Delegate123!');
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
        level: 'Secondaire'
      });
      console.log('✅ Enseignant créé: teacher@na2quiz.com / Teacher123!');
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
        level: 'Licence 1'
      });
      console.log('✅ Apprenant créé: student@na2quiz.com / Student123!');
    }

  } catch (err) {
    console.error('❌ Erreur création données par défaut:', err.message);
  }
}

connectDB();

// ═══════════════════════════════════════════════════════════════
// MIDDLEWARES AUTH
// ═══════════════════════════════════════════════════════════════
const generateToken = (id) => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET non configuré');
  }
  return jwt.sign({ id }, secret, { expiresIn: '30d' });
};

const protect = async (req, res, next) => {
  let token;
  if (req.headers.authorization?.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id).select('-password');
      if (!req.user) throw new Error();
      next();
    } catch (error) {
      console.error('❌ Auth error:', error.message);
      return res.status(401).json({ message: 'Non autorisé, token invalide' });
    }
  }
  if (!token) {
    return res.status(401).json({ message: 'Non autorisé, pas de token' });
  }
};

const authorize = (...roles) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ message: 'Non autorisé' });
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({
      message: `Rôle ${req.user.role} non autorisé. Rôles requis: ${roles.join(', ')}`
    });
  }
  next();
};

// Export pour les routes
export { protect, authorize, generateToken };

// ═══════════════════════════════════════════════════════════════
// ROUTES API
// ═══════════════════════════════════════════════════════════════
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/exams', examRoutes);
app.use('/api/questions', questionRoutes);
app.use('/api/results', resultRoutes);
app.use('/api/manual-quiz', manualQuizRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/compose', composeRoutes);
app.use('/api/surveillance', surveillanceRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

// Routes de santé
app.get('/health', (_, res) => res.json({
  status: 'UP',
  timestamp: new Date(),
  uptime: process.uptime(),
  environment: NODE_ENV,
  mongodb: isConnected ? 'connected' : 'disconnected'
}));

app.get('/api/health', (_, res) => res.json({
  status: 'UP',
  db: isConnected ? 'connected' : 'disconnected',
  timestamp: new Date()
}));

// Statistiques
app.get('/api/stats', async (req, res) => {
  try {
    const [totalUsers, totalQuestions, totalExams, totalResults, pendingQuestions] = await Promise.all([
      User.countDocuments(),
      Question.countDocuments(),
      Exam.countDocuments(),
      Result.countDocuments(),
      Question.countDocuments({ status: 'pending' })
    ]);

    res.json({
      success: true,
      data: {
        users: totalUsers,
        questions: {
          total: totalQuestions,
          pending: pendingQuestions,
          approved: totalQuestions - pendingQuestions
        },
        exams: totalExams,
        results: totalResults
      }
    });
  } catch (error) {
    console.error('Erreur stats:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Configuration
app.get('/api/check-config', (_, res) => {
  res.json({
    configured: !!process.env.DEEPSEEK_API_KEY,
    mode: process.env.DEEPSEEK_API_KEY ? 'api' : 'demo',
    mongodb: isConnected ? 'connected' : 'disconnected',
    environment: NODE_ENV
  });
});

// Test token
app.get('/api/test-token', protect, async (req, res) => {
  console.log('🔐 [TEST-TOKEN] Utilisateur:', req.user?.email);
  console.log('🔐 [TEST-TOKEN] Rôle:', req.user?.role);
  res.json({
    success: true,
    message: 'Token valide',
    user: {
      id: req.user._id,
      email: req.user.email,
      role: req.user.role,
      name: req.user.name,
      matricule: req.user.matricule
    }
  });
});

// Informations serveur
app.get('/api/server-info', (req, res) => {
  const networkInterfaces = os.networkInterfaces();
  const ips = [];

  for (const [name, interfaces] of Object.entries(networkInterfaces)) {
    for (const iface of interfaces) {
      if (iface.family === 'IPv4' && !iface.internal) {
        ips.push({ interface: name, address: iface.address });
      }
    }
  }

  res.json({
    port: PORT,
    localIp: SERVER_LOCAL_IP,
    routerIp: ROUTER_IP,
    availableIps: ips,
    mongodbConnected: isConnected,
    environment: NODE_ENV
  });
});

// Classements
app.get('/api/rankings/:examId', protect, async (req, res) => {
  try {
    const { examId } = req.params;
    const results = await Result.find({ examId })
      .sort({ percentage: -1 })
      .lean();

    const rankings = results.map((r, index) => ({ ...r, rank: index + 1 }));
    res.json({ success: true, rankings });
  } catch (error) {
    console.error('Erreur classement:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════
// SOCKET.IO - VERSION COMPLÈTE
// ═══════════════════════════════════════════════════════════════
const activeSessions = new Map();
const pendingReconnections = new Map();
const activeDistributedExams = new Map();

const emitSessionUpdate = () => {
  const sessionsToSend = Array.from(activeSessions.values()).filter(s => s.type !== 'surveillance');
  io.emit('sessionUpdate', { activeSessions: sessionsToSend });
};

io.on('connection', (socket) => {
  console.log(`[Socket] 🔌 Nouvelle connexion: ${socket.id}`);

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

  socket.on('studentReadyForExam', ({ examId, studentInfo, status = 'composing', sessionId, examOption }) => {
    const targetId = socket.id;
    const stableSessionId = sessionId || `STU_${examId}_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

    console.log(`[Socket] 👨‍🎓 studentReadyForExam: exam=${examId}, student=${studentInfo?.firstName} ${studentInfo?.lastName}, status=${status}, option=${examOption}, socketId=${targetId}`);

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
      status: status,
      progress: 0,
      examOption: examOption || 'A',
      lastUpdate: Date.now(),
      resultUrl: null,
      isOnline: true
    };

    activeSessions.set(targetId, session);
    console.log(`[Socket] ✅ Student ajouté: ${studentInfo.firstName} ${studentInfo.lastName} (status=${status})`);
    console.log(`[Socket] 📊 Total students: ${Array.from(activeSessions.values()).filter(s => s.type === 'student').length}`);

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
      url: `${process.env.FRONTEND_URL || `http://localhost:${FRONTEND_PORT}`}/exam/profile/${data.examId}`,
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
        socket.emit('examDistributed', { 
          url: `${process.env.FRONTEND_URL || `http://localhost:${FRONTEND_PORT}`}/exam/profile/${examId}`, 
          examId, 
          examOption: info.option, 
          isReconnect: true 
        });
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

// Routes de surveillance
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

// ═══════════════════════════════════════════════════════════════
// BULLETIN HTML (version complète)
// ═══════════════════════════════════════════════════════════════
function escapeHtml(text) {
  if (!text) return '';
  return String(text)
    .replace(/[&<>]/g, function(m) {
      if (m === '&') return '&amp;';
      if (m === '<') return '&lt;';
      if (m === '>') return '&gt;';
      return m;
    })
    .replace(/\n/g, '<br>');
}

function formatAnswer(answer) {
  if (!answer) return '—';
  if (Array.isArray(answer)) return answer.join(', ');
  return String(answer);
}

app.get('/api/bulletin/:resultId', async (req, res) => {
  try {
    const result = await Result.findById(req.params.resultId);
    if (!result) return res.status(404).send('<h1>Résultat introuvable</h1>');

    let exam = null;
    try { exam = await Exam.findById(result.examId); } catch (err) {}

    const questions = result.examQuestions?.length ? result.examQuestions : exam?.questions || [];
    const answers = result.answers instanceof Map ? Object.fromEntries(result.answers) : result.answers || {};
    const noteOn20 = ((result.percentage / 100) * 20).toFixed(2);

    let mention = '', mentionColor = '';
    if (result.percentage >= 90) { mention = 'Très Bien'; mentionColor = '#10b981'; }
    else if (result.percentage >= 75) { mention = 'Bien'; mentionColor = '#3b82f6'; }
    else if (result.percentage >= 60) { mention = 'Assez Bien'; mentionColor = '#8b5cf6'; }
    else if (result.percentage >= 50) { mention = 'Passable'; mentionColor = '#f59e0b'; }
    else { mention = 'Insuffisant'; mentionColor = '#ef4444'; }

    let rows = '';
    questions.forEach((q, i) => {
      const qId = q._id?.toString();
      let studentAnswer = '—';
      if (qId && answers[qId] !== undefined) {
        studentAnswer = formatAnswer(answers[qId]);
      }
      
      let correctAnswer = '';
      if (q.correctAnswer) {
        correctAnswer = formatAnswer(q.correctAnswer);
      } else if (typeof q.bonOpRep === 'number' && q.options) {
        correctAnswer = q.options[q.bonOpRep] || '';
      }
      
      const isCorrect = studentAnswer !== '—' && 
        (studentAnswer === correctAnswer || 
         (Array.isArray(answers[qId]) && answers[qId].join(',') === correctAnswer));
      
      const points = q.points || 1;
      rows += `<tr style="border-bottom:1px solid #e2e8f0;">
                  <td style="padding:12px 8px;">${i+1}<\/td>
                  <td style="padding:12px 8px;">${escapeHtml(q.libQuestion || q.question || '—')}<\/td>
                  <td style="padding:12px 8px; color:${isCorrect ? '#16a34a' : '#dc2626'}">${escapeHtml(studentAnswer)}<\/td>
                  <td style="padding:12px 8px; color:#16a34a;">${escapeHtml(correctAnswer)}<\/td>
                  <td style="padding:12px 8px; text-align:center;">${isCorrect ? '✅' : '❌'}<\/td>
                  <td style="padding:12px 8px; text-align:center; color:#f59e0b;">${points}<\/td>
                <\/tr>`;
    });

    const examDomain = exam?.domain || result.domain || '';
    const examLevel = exam?.level || result.level || '';
    const examSubject = exam?.subject || result.subject || '';

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
      .mention{display:inline-block;background:white;color:${mentionColor};padding:6px 20px;border-radius:999px;margin-top:16px;}
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
          ${examDomain ? `<div class="info-card"><div class="info-label">Domaine</div><div class="info-value">${escapeHtml(examDomain)}</div></div>` : ''}
          ${examLevel ? `<div class="info-card"><div class="info-label">Niveau</div><div class="info-value">${escapeHtml(examLevel)}</div></div>` : ''}
          ${examSubject ? `<div class="info-card"><div class="info-label">Matière</div><div class="info-value">${escapeHtml(examSubject)}</div></div>` : ''}
        </div>
        <table class="question-table"><thead><tr><th>#</th><th>Question</th><th>Votre réponse</th><th>Réponse correcte</th><th>Résultat</th><th>Points</th></tr></thead><tbody>${rows}</tbody></table>
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

// 404 et erreurs
app.use('*', (req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} introuvable` });
});

app.use((err, req, res, next) => {
  console.error('❌ Erreur serveur:', err);
  res.status(500).json({ 
    error: 'Erreur serveur interne',
    message: isProduction ? 'Une erreur est survenue' : err.message
  });
});

// ═══════════════════════════════════════════════════════════════
// DÉMARRAGE
// ═══════════════════════════════════════════════════════════════
server.listen(PORT, '0.0.0.0', () => {
  const networkInterfaces = os.networkInterfaces();
  let localIp = 'localhost';
  for (const [name, interfaces] of Object.entries(networkInterfaces)) {
    for (const iface of interfaces) {
      if (iface.family === 'IPv4' && !iface.internal && iface.address.startsWith('192.168.')) {
        localIp = iface.address;
        break;
      }
    }
  }
  
  console.log(`\n${'='.repeat(70)}`);
  console.log(`🚀 NA²QUIZ Serveur - ${isProduction ? 'PRODUCTION' : 'DÉVELOPPEMENT'}`);
  console.log(`${'='.repeat(70)}`);
  console.log(`📡 API REST:        http://localhost:${PORT}`);
  console.log(`🔌 Socket.IO:       ws://localhost:${PORT}`);
  console.log(`🌐 Accès réseau:    http://${localIp}:${PORT}`);
  console.log(`🎨 Frontend:        ${process.env.FRONTEND_URL || `http://localhost:${FRONTEND_PORT}`}`);
  console.log(`🖥️  Terminal:        http://localhost:${PORT}/terminal.html`);
  console.log(`📊 Santé:           http://localhost:${PORT}/health`);
  console.log(`📈 Stats:           http://localhost:${PORT}/api/stats`);
  console.log(`💾 MongoDB:         ${isConnected ? '✅ Connecté' : '❌ Déconnecté'}`);
  console.log(`🔧 Environnement:   ${NODE_ENV}`);
  console.log(`${'='.repeat(70)}`);
  if (!isProduction) {
    console.log(`\n💡 Comptes par défaut:`);
    console.log(`   Admin système:    admin@na2quiz.com / Admin123!`);
    console.log(`   Admin délégué:    delegate@na2quiz.com / Delegate123!`);
    console.log(`   Enseignant:       teacher@na2quiz.com / Teacher123!`);
    console.log(`   Apprenant:        student@na2quiz.com / Student123!`);
  }
  console.log(`${'='.repeat(70)}\n`);
});

export default app;