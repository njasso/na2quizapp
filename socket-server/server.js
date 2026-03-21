// socket-server/server.js
// ─────────────────────────────────────────────────────────────
//  NA²QUIZ — Serveur Socket.IO standalone
//  Déployé sur Railway (gratuit) ou Render
//  Gère UNIQUEMENT le temps réel : distribution d'épreuves,
//  surveillance, progression des étudiants.
//  L'API REST est sur Netlify Functions.
// ─────────────────────────────────────────────────────────────
import express   from 'express';
import cors      from 'cors';
import { createServer } from 'http';
import { Server }       from 'socket.io';
import dotenv from 'dotenv';
dotenv.config();

const app    = express();
const server = createServer(app);

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

const io = new Server(server, {
  cors: {
    origin: [FRONTEND_URL, 'http://localhost:3000', 'http://localhost:5001'],
    methods: ['GET', 'POST'],
    credentials: true,
  },
  allowEIO3: true,
  transports: ['polling', 'websocket'],
  pingTimeout:  60000,
  pingInterval: 25000,
});

app.use(cors({ origin: [FRONTEND_URL, 'http://localhost:3000', 'http://localhost:5001'] }));
app.use(express.json());

// ── État en mémoire (par session socket) ─────────────────────
const activeSessions         = new Map(); // socketId → session
const activeDistributedExams = new Map(); // examId → examInfo
const pendingReconnections   = new Map(); // sessionId → timeout

const emitSessionUpdate = () => {
  const sessions = Array.from(activeSessions.values()).filter(s => s.type !== 'surveillance');
  io.emit('sessionUpdate', { activeSessions: sessions });
};

// ── Routes santé ─────────────────────────────────────────────
app.get('/',       (_, res) => res.json({ status: 'NA²QUIZ Socket Server', uptime: process.uptime() }));
app.get('/health', (_, res) => res.json({ status: 'UP', connections: activeSessions.size }));
app.get('/sessions', (_, res) => res.json({ sessions: Array.from(activeSessions.values()) }));

// ── Socket.IO ─────────────────────────────────────────────────
io.on('connection', (socket) => {
  console.log(`[Socket] 🔌 Connexion : ${socket.id}`);

  // ── Enregistrement générique ──
  socket.on('registerSession', (data) => {
    const existing = Array.from(activeSessions.values())
      .find(s => s.sessionId === data.sessionId && s.type === data.type);

    if (existing) {
      // Reconnexion — reprendre la session
      const pending = pendingReconnections.get(data.sessionId);
      if (pending) { clearTimeout(pending); pendingReconnections.delete(data.sessionId); }
      activeSessions.delete(existing.socketId);
      existing.socketId  = socket.id;
      existing.isOnline  = true;
      existing.lastUpdate = Date.now();
      activeSessions.set(socket.id, existing);

      if (existing.type === 'surveillance') socket.join('surveillance');
      if (existing.type === 'student' && existing.currentExamId) {
        socket.join(`exam:${existing.currentExamId}`);
        if (existing.status === 'waiting')   socket.join(`exam:${existing.currentExamId}:waiting`);
        if (existing.status === 'composing') socket.join(`exam:${existing.currentExamId}:composing`);
      }
      emitSessionUpdate();
      return;
    }

    const session = {
      socketId:       socket.id,
      type:           data.type,
      sessionId:      data.sessionId || socket.id,
      status:         data.status || 'idle',
      currentExamId:  data.examId || null,
      studentInfo:    data.studentInfo || null,
      progress:       0,
      lastUpdate:     Date.now(),
      resultUrl:      null,
      isOnline:       true,
    };
    activeSessions.set(socket.id, session);

    if (data.type === 'surveillance') socket.join('surveillance');
    if (data.type === 'student' && data.examId) {
      socket.join(`exam:${data.examId}`);
      if (data.status === 'waiting')   socket.join(`exam:${data.examId}:waiting`);
      if (data.status === 'composing') socket.join(`exam:${data.examId}:composing`);
    }

    // Remettre l'état des examens en cours pour une nouvelle surveillance
    if (data.type === 'surveillance') {
      activeDistributedExams.forEach((info, examId) => {
        if (info.option === 'A' && info.currentQuestionIndex !== undefined) {
          socket.emit('currentQuestionIndexForOptionA', { examId, questionIndex: info.currentQuestionIndex });
        }
      });
    }

    emitSessionUpdate();
  });

  // ── Enregistrement terminal ──
  socket.on('registerTerminal', (data) => {
    const existing = Array.from(activeSessions.values())
      .find(s => s.sessionId === data.sessionId && s.type === 'terminal');

    if (existing) {
      const pending = pendingReconnections.get(data.sessionId);
      if (pending) { clearTimeout(pending); pendingReconnections.delete(data.sessionId); }
      activeSessions.delete(existing.socketId);
      existing.socketId  = socket.id;
      existing.isOnline  = true;
      existing.lastUpdate = Date.now();
      activeSessions.set(socket.id, existing);
      socket.join('terminals');
      // Re-distribuer les examens en cours
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      activeDistributedExams.forEach((info, examId) => {
        socket.emit('examDistributed', {
          url: `${frontendUrl}/exam/profile/${examId}`,
          examId, examOption: info.option, isReconnect: true,
        });
      });
      emitSessionUpdate();
      return;
    }

    activeSessions.set(socket.id, {
      socketId: socket.id, type: 'terminal',
      sessionId: data.sessionId || `TERM_${Date.now()}`,
      status: 'connected', currentExamId: null,
      studentInfo: null, progress: 0,
      lastUpdate: Date.now(), resultUrl: null, isOnline: true,
    });
    socket.join('terminals');
    console.log(`[Socket] ✅ Terminal enregistré`);
    emitSessionUpdate();
  });

  // ── Distribution épreuve ──
  socket.on('distributeExam', (data) => {
    if (!data.examId || !data.examOption) return;
    console.log(`[Socket] 📢 Distribution exam ${data.examId} option ${data.examOption}`);

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const examUrl     = `${frontendUrl}/exam/profile/${data.examId}`;
    const examData    = { option: data.examOption, distributedAt: new Date(), questionCount: 0 };

    if (data.examOption === 'A') {
      examData.currentQuestionIndex = 0;
      io.emit('currentQuestionIndexForOptionA', { examId: data.examId, questionIndex: 0 });
    }

    activeDistributedExams.set(data.examId, examData);
    io.to('terminals').emit('examDistributed', { url: examUrl, examId: data.examId, examOption: data.examOption });
    emitSessionUpdate();
  });

  // ── Démarrage épreuve ──
  socket.on('startExam', ({ examId, option }) => {
    if (!examId) return;
    console.log(`[Socket] 🚀 Démarrage exam ${examId} option ${option}`);

    const examInfo = activeDistributedExams.get(examId);
    if (!examInfo) return;

    if (option === 'B') {
      const waiting = Array.from(activeSessions.values())
        .filter(s => s.type === 'student' && s.currentExamId === examId && s.status === 'waiting');
      waiting.forEach(s => {
        activeSessions.set(s.socketId, { ...s, status: 'composing', lastUpdate: Date.now() });
        io.to(s.socketId).emit('examStartedForOptionB', { examId, questionIndex: 0 });
      });
      io.emit('waitingCountUpdate', { examId, count: 0 });
    } else {
      const composing = Array.from(activeSessions.values())
        .filter(s => s.type === 'student' && s.currentExamId === examId);
      composing.forEach(s => {
        io.to(s.socketId).emit('examStarted', { examId, questionIndex: 0 });
      });
    }
    emitSessionUpdate();
  });

  // ── Étudiant prêt ──
  socket.on('studentReadyForExam', ({ examId, studentInfo, studentSocketId, status = 'composing', sessionId }) => {
    const targetId = studentSocketId || socket.id;
    const session  = {
      socketId: targetId, type: 'student',
      sessionId: sessionId || targetId,
      currentExamId: examId, studentInfo,
      status, progress: 0,
      lastUpdate: Date.now(), resultUrl: null, isOnline: true,
    };
    activeSessions.set(targetId, session);

    const s = io.sockets.sockets.get(targetId);
    if (s) {
      s.join(`exam:${examId}`);
      if (status === 'waiting')   s.join(`exam:${examId}:waiting`);
      if (status === 'composing') s.join(`exam:${examId}:composing`);
    }

    if (status === 'waiting') {
      const count = Array.from(activeSessions.values())
        .filter(x => x.type === 'student' && x.currentExamId === examId && x.status === 'waiting').length;
      io.emit('waitingCountUpdate', { examId, count });
    }
    emitSessionUpdate();
  });

  // ── Avancer question ──
  socket.on('advanceQuestionForOptionA', ({ examId, nextQuestionIndex }) => {
    const info = activeDistributedExams.get(examId);
    if (!info) return;
    info.currentQuestionIndex = nextQuestionIndex;
    activeDistributedExams.set(examId, info);
    Array.from(activeSessions.values())
      .filter(s => s.type === 'student' && s.currentExamId === examId)
      .forEach(s => io.to(s.socketId).emit('displayQuestion', { examId, questionIndex: nextQuestionIndex }));
    io.emit('currentQuestionIndexForOptionA', { examId, questionIndex: nextQuestionIndex });
  });

  socket.on('displayQuestion', ({ examId, questionIndex }) => {
    const info = activeDistributedExams.get(examId);
    if (info) { info.currentQuestionIndex = questionIndex; activeDistributedExams.set(examId, info); }
    Array.from(activeSessions.values())
      .filter(s => s.type === 'student' && s.currentExamId === examId)
      .forEach(s => io.to(s.socketId).emit('displayQuestion', { examId, questionIndex }));
  });

  // ── Progression ──
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

  // ── Soumission ──
  socket.on('examSubmitted', ({ studentSocketId, examResultId }) => {
    const s = activeSessions.get(studentSocketId);
    if (s?.type === 'student') {
      activeSessions.set(studentSocketId, {
        ...s, status: 'finished',
        resultUrl: `/api/bulletin/${examResultId}`,
        lastUpdate: Date.now(),
      });
      emitSessionUpdate();
    }
  });

  socket.on('examSubmitting', ({ studentSocketId }) => {
    const s = activeSessions.get(studentSocketId || socket.id);
    if (s) activeSessions.set(s.socketId, { ...s, status: 'submitting', lastUpdate: Date.now() });
  });

  // ── Fin épreuve ──
  socket.on('finishExam', ({ examId }) => {
    io.emit('examFinished', { examId });
    activeDistributedExams.delete(examId);
    emitSessionUpdate();
  });

  // ── Ping ──
  socket.on('ping', () => {
    const s = activeSessions.get(socket.id);
    if (s) { s.lastUpdate = Date.now(); s.isOnline = true; }
    socket.emit('pong');
  });

  // ── Surveillance data ──
  socket.on('getSurveillanceData', () => {
    socket.emit('sessionUpdate', { activeSessions: Array.from(activeSessions.values()) });
  });

  // ── Déconnexion ──
  socket.on('disconnect', (reason) => {
    const session = activeSessions.get(socket.id);
    if (!session) return;
    console.log(`[Socket] 👋 Déconnexion : ${session.type} (${reason})`);

    session.isOnline = false;
    session.lastUpdate = Date.now();

    const timeout = setTimeout(() => {
      const cur = activeSessions.get(socket.id);
      if (cur && !cur.isOnline) {
        activeSessions.delete(socket.id);
        emitSessionUpdate();
      }
      pendingReconnections.delete(session.sessionId);
    }, 45000); // 45s pour reconnecter

    pendingReconnections.set(session.sessionId, timeout);
  });
});

// ── Démarrage ─────────────────────────────────────────────────
const PORT = process.env.PORT || 4000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`[NA²QUIZ Socket] ✅ Serveur démarré sur le port ${PORT}`);
  console.log(`[NA²QUIZ Socket] 🌐 Frontend attendu: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
});
