import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useParams, useNavigate } from 'react-router-dom';
import { jsPDF } from 'jspdf';
import { motion } from 'framer-motion';
import axios from 'axios';
import { toast, Toaster } from 'react-hot-toast';
import QRCode from 'qrcode';
import logo from '../logo.png';
import { Download, CheckCircle, XCircle, Award, User, Calendar, FileText, Printer } from 'lucide-react';

const NODE_BACKEND_URL = process.env.REACT_APP_BACKEND_URL || (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:5000');

const ResultsPage = () => {
    const { examId } = useParams();
    const { state } = useLocation();
    const navigate = useNavigate();

    const {
        submittedAnswers,
        studentInfo,
        submittedScore,
        submittedPercentage,
        examTitle: passedExamTitle,
        passingScore: passedPassingScore,
        examQuestions: passedExamQuestions,
        questionDetails: passedQuestionDetails,
        resultSnapshot: passedResultSnapshot,
        terminalSessionId: passedTerminalSessionId, // ✅ Récupérer depuis l'état
    } = state || {};

    const [exam, setExam] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [countdown, setCountdown] = useState(120); // 2 minutes avant retour terminal
    const [redirectTimerActive, setRedirectTimerActive] = useState(true);
    const questionDetailsRef = useRef([]);
    const redirectTimeoutRef = useRef(null);
    const countdownIntervalRef = useRef(null);

    // Récupération du sessionId terminal (priorité à l'état, sinon localStorage)
    const terminalSessionId = passedTerminalSessionId || localStorage.getItem('terminalSessionId');

    // ✅ Fonction de nettoyage avant redirection
    const cleanupBeforeRedirect = useCallback(() => {
        if (countdownIntervalRef.current) {
            clearInterval(countdownIntervalRef.current);
            countdownIntervalRef.current = null;
        }
        if (redirectTimeoutRef.current) {
            clearTimeout(redirectTimeoutRef.current);
            redirectTimeoutRef.current = null;
        }
    }, []);

    // ✅ Redirection vers le terminal
    const redirectToTerminal = useCallback(() => {
        cleanupBeforeRedirect();
        
        // Effacer les données d'examen de la session
        localStorage.removeItem('studentInfoForExam');
        
        // Construire l'URL de redirection
        const baseUrl = NODE_BACKEND_URL;
        const redirectUrl = `${baseUrl}/terminal.html${terminalSessionId ? `?sessionId=${terminalSessionId}` : ''}`;
        
        // Redirection avec remplacement
        window.location.replace(redirectUrl);
    }, [terminalSessionId, cleanupBeforeRedirect]);

    // ── COMPTE À REBOURS + REDIRECTION TERMINAL ──────────────────────────
    useEffect(() => {
        if (isLoading || !redirectTimerActive) return;

        // Démarrer le compte à rebours
        countdownIntervalRef.current = setInterval(() => {
            setCountdown(prev => {
                if (prev <= 1) {
                    // Temps écoulé, rediriger
                    redirectToTerminal();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => {
            if (countdownIntervalRef.current) {
                clearInterval(countdownIntervalRef.current);
                countdownIntervalRef.current = null;
            }
        };
    }, [isLoading, redirectTimerActive, redirectToTerminal]);

    // ✅ Permettre à l'utilisateur de rester plus longtemps
    const extendStay = useCallback(() => {
        setRedirectTimerActive(false);
        setCountdown(prev => prev); // Garder la valeur actuelle
        
        toast.success("Temps prolongé. Vous pouvez fermer cette page manuellement.", {
            duration: 4000,
            icon: '⏱️'
        });
        
        // Réactiver après 5 minutes
        setTimeout(() => {
            setRedirectTimerActive(true);
            setCountdown(120); // Remettre à 2 minutes
            toast.info("Retour automatique au terminal dans 2 minutes", {
                duration: 3000
            });
        }, 300000); // 5 minutes
    }, []);

    useEffect(() => {
        if (!examId || !submittedAnswers || !studentInfo || submittedScore === undefined || submittedPercentage === undefined) {
            toast.error("Données de résultats manquantes. Veuillez refaire l'épreuve.");
            navigate(`/exam/profile/${examId}`, { replace: true });
            return;
        }

        const buildDetailsFromQuestions = (questions) => {
            return questions.map(q => {
                const studentAnswer = submittedAnswers[q._id] || 'Non répondu';
                const isCorrect = studentAnswer !== 'Non répondu' && studentAnswer === q.correctAnswer;
                return {
                    _id: q._id,
                    questionText: q.question,
                    options: q.options,
                    studentAnswer,
                    correctAnswer: q.correctAnswer,
                    isCorrect,
                    type: q.type
                };
            });
        };

        const buildDetailsFromSnapshot = (snapQuestions) => {
            return snapQuestions.map(q => {
                const rawAnswer = submittedAnswers instanceof Map
                    ? submittedAnswers.get(q._id?.toString())
                    : (submittedAnswers?.[q._id?.toString()] ?? submittedAnswers?.[q._id]);
                const studentAnswer = rawAnswer ?? 'Non répondu';

                let isCorrect = false;
                if (q.type === 'multiple') {
                    const correct = Array.isArray(q.correctAnswer) ? [...q.correctAnswer].sort() : [q.correctAnswer];
                    const given   = Array.isArray(studentAnswer)
                        ? [...studentAnswer].sort()
                        : typeof studentAnswer === 'string' && studentAnswer !== 'Non répondu'
                            ? studentAnswer.split(',').map(s => s.trim()).sort()
                            : [];
                    isCorrect = given.length === correct.length && given.every((v, i) => v === correct[i]);
                } else {
                    isCorrect = studentAnswer !== 'Non répondu' && studentAnswer === q.correctAnswer;
                }

                return {
                    _id:           q._id,
                    questionText:  q.question,
                    options:       q.options || [],
                    studentAnswer: Array.isArray(studentAnswer) ? studentAnswer.join(', ') : studentAnswer,
                    correctAnswer: Array.isArray(q.correctAnswer) ? q.correctAnswer.join(', ') : q.correctAnswer,
                    isCorrect,
                    type:          q.type || 'single',
                };
            });
        };

        const fetchAndProcessResults = async () => {
            try {
                if (passedResultSnapshot?.examQuestions?.length > 0) {
                    questionDetailsRef.current = buildDetailsFromSnapshot(passedResultSnapshot.examQuestions);
                }

                const response = await axios.get(`${NODE_BACKEND_URL}/api/exams/${examId}`, {
                    timeout: 10000
                });
                const examData = response.data;
                setExam(examData);

                if (!passedResultSnapshot?.examQuestions?.length && passedQuestionDetails?.length > 0) {
                    questionDetailsRef.current = passedQuestionDetails.map((d, i) => {
                        const q = examData.questions[i] || {};
                        return {
                            _id:           q._id || i,
                            questionText:  d.question,
                            options:       q.options || [],
                            studentAnswer: d.userAnswer,
                            correctAnswer: d.correctAnswer,
                            isCorrect:     d.isCorrect,
                            type:          q.type || 'single',
                        };
                    });
                } else if (!passedResultSnapshot?.examQuestions?.length && !passedQuestionDetails?.length) {
                    questionDetailsRef.current = buildDetailsFromQuestions(examData.questions);
                }

                const actualPassingScore = examData.passingScore || passedPassingScore;
                const passStatusText = submittedPercentage >= actualPassingScore ? 'Réussi' : 'Échoué';
                toast[passStatusText === 'Réussi' ? 'success' : 'error'](
                    `${passStatusText === 'Réussi' ? 'Félicitations' : 'Dommage'} ! Vous avez ${submittedPercentage.toFixed(2)}%` +
                    (actualPassingScore ? ` (seuil: ${actualPassingScore}%)` : '')
                );
            } catch (error) {
                console.error("Erreur lors du chargement des détails de l'épreuve pour les résultats:", error);

                if (passedResultSnapshot?.examQuestions?.length > 0) {
                    questionDetailsRef.current = buildDetailsFromSnapshot(passedResultSnapshot.examQuestions);
                    setExam({
                        title:       passedResultSnapshot.examTitle || passedExamTitle || 'Titre inconnu',
                        questions:   passedResultSnapshot.examQuestions,
                        passingScore: passedResultSnapshot.passingScore || passedPassingScore,
                        domain:      passedResultSnapshot.domain   || 'N/A',
                        subject:     passedResultSnapshot.subject  || 'N/A',
                        category:    passedResultSnapshot.category || 'N/A',
                        level:       passedResultSnapshot.examLevel || studentInfo?.level || 'N/A',
                        duration:    passedResultSnapshot.duration || 60,
                    });
                } else if (passedQuestionDetails?.length > 0) {
                    questionDetailsRef.current = passedQuestionDetails.map((d, i) => ({
                        _id:           i,
                        questionText:  d.question,
                        options:       passedExamQuestions?.[i]?.options || [],
                        studentAnswer: d.userAnswer,
                        correctAnswer: d.correctAnswer,
                        isCorrect:     d.isCorrect,
                        type:          passedExamQuestions?.[i]?.type || 'single',
                    }));
                    setExam({
                        title: passedExamTitle || 'Titre inconnu',
                        questions: passedExamQuestions || [],
                        passingScore: passedPassingScore,
                        domain: 'N/A', subject: 'N/A', category: 'N/A',
                        level: studentInfo?.level || 'N/A', duration: 60,
                    });
                } else if (error.response?.status === 404 && passedExamQuestions?.length > 0) {
                    toast.error("Épreuve introuvable sur le serveur. Affichage à partir des données locales.");
                    setExam({
                        title: passedExamTitle || 'Titre inconnu',
                        questions: passedExamQuestions,
                        passingScore: passedPassingScore,
                        domain: 'Domaine inconnu', subject: 'Matière inconnue',
                        category: 'Catégorie inconnue', level: studentInfo?.level || 'N/A', duration: 60,
                    });
                    questionDetailsRef.current = buildDetailsFromQuestions(passedExamQuestions);
                } else {
                    toast.error(`Erreur: ${error.response ? error.response.status : 'Réseau ou serveur inaccessible'}`);
                    setExam(null);
                }
            } finally {
                setIsLoading(false);
            }
        };

        fetchAndProcessResults();

        return () => {
            cleanupBeforeRedirect();
        };
    }, [examId, submittedAnswers, studentInfo, submittedScore, submittedPercentage, passedPassingScore, passedExamTitle, passedExamQuestions, passedQuestionDetails, passedResultSnapshot, navigate, cleanupBeforeRedirect]);

    const getNote = useCallback(() => {
        if (!exam) return null;
        const bareme = exam.totalPoints || 20;
        const total = exam.questions.length;
        if (!total) return null;
        const rawNote = (submittedScore / total) * bareme;
        return { note: parseFloat(rawNote.toFixed(2)), bareme };
    }, [exam, submittedScore]);

    const printBulletin = useCallback(() => {
        const noteInfo = getNote();
        const noteStr = noteInfo ? `${noteInfo.note} / ${noteInfo.bareme}` : 'N/A';
        const passStatus = submittedPercentage >= (exam?.passingScore || passedPassingScore) ? 'RÉUSSI' : 'ÉCHOUÉ';
        const passColor = passStatus === 'RÉUSSI' ? '#10b981' : '#ef4444';

        const questionsHtml = questionDetailsRef.current.map((q, i) => `
            <div style="margin-bottom:12px; padding:10px; border:1px solid ${q.isCorrect ? '#22c55e' : '#ef4444'}; border-radius:8px;">
                <p style="font-weight:600; margin:0 0 6px;">Q${i + 1}. ${q.questionText}</p>
                ${q.options.map(opt => `
                    <p style="margin:2px 0; padding:3px 8px; border-radius:4px;
                        background:${opt === q.correctAnswer ? '#dcfce7' : opt === q.studentAnswer && opt !== q.correctAnswer ? '#fee2e2' : 'transparent'};
                        color:${opt === q.correctAnswer ? '#15803d' : opt === q.studentAnswer && opt !== q.correctAnswer ? '#dc2626' : '#374151'}">
                        ${opt}${opt === q.studentAnswer ? ' ← votre réponse' : ''}${opt === q.correctAnswer && opt !== q.studentAnswer ? ' ✓ correcte' : ''}
                    </p>`).join('')}
                <p style="margin:6px 0 0; font-size:0.85rem; color:${q.isCorrect ? '#15803d' : '#dc2626'}; font-weight:600;">
                    ${q.isCorrect ? '✓ Correct' : `✗ Incorrect — Bonne réponse : ${q.correctAnswer}`}
                </p>
            </div>`).join('');

        const win = window.open('', '_blank');
        win.document.write(`<!DOCTYPE html><html><head>
            <title>Corrigé — ${studentInfo?.lastName} ${studentInfo?.firstName}</title>
            <style>
                body { font-family: 'DM Sans', Arial, sans-serif; margin: 0; padding: 20px; color: #1e293b; }
                @media print { @page { size: A4; margin: 15mm; } }
                .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #3b82f6; padding-bottom: 12px; margin-bottom: 20px; }
                .brand { font-size: 1.5rem; font-weight: 800; color: #3b82f6; }
                .badge { padding: 6px 16px; border-radius: 999px; font-size: 1.1rem; font-weight: 800; background: ${passColor}22; color: ${passColor}; border: 2px solid ${passColor}; }
                .note-box { text-align: center; margin: 16px 0; padding: 12px; background: #f8fafc; border-radius: 12px; border: 2px solid #3b82f6; }
                .note-val { font-size: 2.5rem; font-weight: 800; color: #3b82f6; }
                .note-label { font-size: 0.8rem; color: #64748b; }
                .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px; }
                .info-box { padding: 12px; background: #f8fafc; border-radius: 8px; }
                .info-box h3 { margin: 0 0 8px; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; }
                p { margin: 3px 0; font-size: 0.875rem; }
                h2 { font-size: 1rem; margin: 20px 0 10px; color: #1e293b; }
            </style>
        </head><body>
            <div class="header">
                <div>
                    <div class="brand">NA²QUIZ</div>
                    <div style="font-size:1.125rem; font-weight:700; margin-top:4px;">Corrigé Individuel</div>
                    <div style="font-size:0.8rem; color:#64748b;">${new Date().toLocaleString('fr-FR')}</div>
                </div>
                <div class="badge">${passStatus}</div>
            </div>
            <div class="note-box">
                <div class="note-label">NOTE OBTENUE</div>
                <div class="note-val">${noteStr}</div>
                <div class="note-label">${submittedScore} bonne(s) réponse(s) sur ${exam.questions.length} · ${submittedPercentage.toFixed(2)}%</div>
            </div>
            <div class="info-grid">
                <div class="info-box">
                    <h3>Candidat</h3>
                    <p><b>Nom :</b> ${studentInfo?.lastName || 'N/A'}</p>
                    <p><b>Prénom :</b> ${studentInfo?.firstName || 'N/A'}</p>
                    <p><b>Matricule :</b> ${studentInfo?.matricule || 'N/A'}</p>
                    <p><b>Niveau :</b> ${studentInfo?.level || 'N/A'}</p>
                </div>
                <div class="info-box">
                    <h3>Épreuve</h3>
                    <p><b>Titre :</b> ${exam.title || passedExamTitle || 'N/A'}</p>
                    <p><b>Matière :</b> ${exam.subject || 'N/A'}</p>
                    <p><b>Domaine :</b> ${exam.domain || 'N/A'}</p>
                    <p><b>Seuil de réussite :</b> ${exam.passingScore || passedPassingScore || 'N/A'}%</p>
                </div>
            </div>
            <h2>Détail des réponses</h2>
            ${questionsHtml}
            <script>window.onload = () => { window.print(); setTimeout(() => window.close(), 800); }</script>
        </body></html>`);
        win.document.close();
    }, [exam, studentInfo, submittedScore, submittedPercentage, passedExamTitle, passedPassingScore, getNote]);

    const exportToPDF = useCallback(async () => {
        if (!exam || !studentInfo || questionDetailsRef.current.length === 0) {
            toast.error("Données incomplètes pour l'export PDF.");
            return;
        }

        const doc = new jsPDF();
        let yPos = 30;
        const margin = 20;
        const lineHeight = 7;
        const maxWidth = doc.internal.pageSize.width - 2 * margin;

        try {
            doc.addImage(logo, 'PNG', 10, 10, 20, 20);
        } catch (e) {
            console.warn("Logo non trouvé, continuation sans logo");
        }
        
        doc.setFontSize(16);
        doc.setTextColor(59, 130, 246);
        doc.text('NA²QUIZ', 35, 20);
        doc.setTextColor(0, 0, 0);

        doc.setFontSize(26);
        doc.text('Bulletin de Résultats', 105, yPos, { align: 'center' });
        yPos += 15;

        doc.setFontSize(14);
        doc.setTextColor(59, 130, 246);
        doc.text('Informations de l\'étudiant :', margin, yPos);
        yPos += 10;
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(12);
        doc.text(`Nom: ${studentInfo?.lastName || 'N/A'}`, margin, yPos); yPos += lineHeight;
        doc.text(`Prénom: ${studentInfo?.firstName || 'N/A'}`, margin, yPos); yPos += lineHeight;
        doc.text(`Niveau d'étude: ${studentInfo?.level || 'N/A'}`, margin, yPos); yPos += lineHeight;
        if (studentInfo?.matricule) {
            doc.text(`Matricule: ${studentInfo?.matricule}`, margin, yPos); yPos += lineHeight;
        }
        yPos += 10;

        doc.setFontSize(14);
        doc.setTextColor(59, 130, 246);
        doc.text('Résumé de l\'épreuve :', margin, yPos);
        yPos += 10;
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(12);
        doc.text(`Titre de l'épreuve: ${exam.title || passedExamTitle || 'N/A'}`, margin, yPos); yPos += lineHeight;
        doc.text(`Domaine: ${exam.domain || 'N/A'}`, margin, yPos); yPos += lineHeight;
        doc.text(`Catégorie: ${exam.category || 'N/A'}`, margin, yPos); yPos += lineHeight;
        doc.text(`Matière: ${exam.subject || 'N/A'}`, margin, yPos); yPos += lineHeight;
        doc.text(`Niveau: ${exam.level || 'N/A'}`, margin, yPos); yPos += lineHeight;
        doc.text(`Durée: ${exam.duration || 'N/A'} minutes`, margin, yPos); yPos += 10;

        doc.setFontSize(14);
        doc.setTextColor(59, 130, 246);
        doc.text('Performance :', margin, yPos);
        yPos += 10;
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(12);
        doc.text(`Score Obtenu: ${submittedScore} / ${exam.questions.length}`, margin, yPos); yPos += lineHeight;
        doc.text(`Pourcentage: ${submittedPercentage.toFixed(2)}%`, margin, yPos); yPos += lineHeight;
        doc.text(`Seuil de Réussite: ${exam.passingScore || passedPassingScore || 'N/A'}%`, margin, yPos); yPos += lineHeight;
        
        const noteInfo = getNote();
        if (noteInfo) {
            doc.setFontSize(14);
            doc.setTextColor(59, 130, 246);
            doc.text(`NOTE : ${noteInfo.note} / ${noteInfo.bareme}`, margin, yPos); yPos += lineHeight + 2;
            doc.setTextColor(0, 0, 0);
            doc.setFontSize(12);
        } else { yPos += lineHeight; }
        
        const passStatusColor = submittedPercentage >= (exam.passingScore || passedPassingScore) ? '#22C55E' : '#EF4444';
        doc.setTextColor(passStatusColor);
        doc.text(`Statut: ${submittedPercentage >= (exam.passingScore || passedPassingScore) ? 'Réussi' : 'Échoué'}`, margin, yPos); yPos += 10;
        doc.setTextColor(0, 0, 0);

        doc.setFontSize(14);
        doc.setTextColor(59, 130, 246);
        doc.text('Détails des réponses :', margin, yPos);
        yPos += 10;

        questionDetailsRef.current.forEach((qDetail, index) => {
            const questionLines = doc.splitTextToSize(`Question ${index + 1}: ${qDetail.questionText}`, maxWidth);
            const questionHeight = questionLines.length * lineHeight;
            const optionsHeight = qDetail.options.length * 5;
            const totalHeight = questionHeight + optionsHeight + 30;

            if (yPos + totalHeight > doc.internal.pageSize.height - margin - 40) {
                doc.addPage();
                yPos = margin;
            }

            doc.setFontSize(12);
            doc.setTextColor(0, 0, 0);
            doc.text(questionLines, margin, yPos);
            yPos += questionLines.length * lineHeight;

            doc.setFontSize(10);
            qDetail.options.forEach(optText => {
                const optionLines = doc.splitTextToSize(` - ${optText}`, maxWidth - 5);
                doc.text(optionLines, margin + 5, yPos);
                yPos += optionLines.length * 5;
            });

            doc.text(`Votre réponse: ${qDetail.studentAnswer || 'Non répondu'}`, margin, yPos); yPos += 5;
            doc.text(`Bonne réponse: ${qDetail.correctAnswer || 'N/A'}`, margin, yPos); yPos += 5;
            
            const textColor = qDetail.isCorrect ? '#22C55E' : '#EF4444';
            doc.setTextColor(textColor);
            doc.text(`Statut: ${qDetail.isCorrect ? 'Correct' : 'Incorrect'}`, margin, yPos); yPos += 10;
            doc.setTextColor(0, 0, 0);
            yPos += 5;
        });

        try {
            const qrCodeData = `Nom: ${studentInfo?.lastName || 'N/A'} ${studentInfo?.firstName || 'N/A'}\nMatricule: ${studentInfo?.matricule || 'N/A'}\nDate: ${new Date().toLocaleString()}`;
            const qrCode = await QRCode.toDataURL(qrCodeData, { width: 100 });
            doc.addImage(qrCode, 'PNG', doc.internal.pageSize.width - 120, doc.internal.pageSize.height - 120, 100, 100);
        } catch (e) {
            console.warn("Erreur génération QR code:", e);
        }

        doc.save(`bulletin_resultats_${studentInfo?.lastName || 'Anonyme'}_${studentInfo?.firstName || 'Anonyme'}.pdf`);
        toast.success("Le bulletin de résultats a été exporté en PDF !");
    }, [exam, studentInfo, submittedScore, submittedPercentage, passedExamTitle, passedPassingScore, getNote]);

    if (isLoading) {
        return (
            <div style={{
                minHeight: '100vh',
                background: 'linear-gradient(135deg, #05071a 0%, #0a0f2e 60%, #05071a 100%)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: "'DM Sans', sans-serif",
            }}>
                <div style={{
                    width: '48px',
                    height: '48px',
                    border: '3px solid rgba(59,130,246,0.1)',
                    borderTopColor: '#3b82f6',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite',
                }} />
                <p style={{ color: '#94a3b8', marginTop: '16px' }}>Chargement des résultats...</p>
                <Toaster />
                <style>{`
                    @keyframes spin { to { transform: rotate(360deg); } }
                `}</style>
            </div>
        );
    }

    if (!exam || !studentInfo || submittedAnswers === undefined || submittedPercentage === undefined) {
        return (
            <div style={{
                minHeight: '100vh',
                background: 'linear-gradient(135deg, #05071a 0%, #0a0f2e 60%, #05071a 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ef4444',
                fontFamily: "'DM Sans', sans-serif",
            }}>
                Impossible de charger l'épreuve ou ses résultats.
            </div>
        );
    }

    const totalQuestions = exam.questions.length;
    const currentPassStatus = submittedPercentage >= (exam.passingScore || passedPassingScore) ? 'Réussi' : 'Échoué';

    return (
        <div style={{
            minHeight: '100vh',
            fontFamily: "'DM Sans', sans-serif",
            background: 'linear-gradient(135deg, #05071a 0%, #0a0f2e 60%, #05071a 100%)',
            position: 'relative',
            overflow: 'hidden',
            padding: '24px',
        }}>
            <div style={{
                position: 'fixed', inset: 0,
                backgroundImage: 'linear-gradient(rgba(59,130,246,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,0.03) 1px, transparent 1px)',
                backgroundSize: '40px 40px', pointerEvents: 'none', zIndex: 0,
            }} />

            <div style={{
                position: 'fixed', top: '-15%', left: '50%', transform: 'translateX(-50%)',
                width: '70vw', height: '50vh',
                background: 'radial-gradient(ellipse, rgba(37,99,235,0.12) 0%, transparent 70%)',
                pointerEvents: 'none', zIndex: 0,
            }} />

            <main style={{ position: 'relative', zIndex: 1, maxWidth: '900px', margin: '0 auto' }}>

                {/* ── COMPTE À REBOURS RETOUR TERMINAL ── */}
                {!isLoading && redirectTimerActive && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        style={{
                            marginBottom: '16px',
                            padding: '12px 20px',
                            background: countdown <= 30 ? 'rgba(239,68,68,0.12)' : 'rgba(59,130,246,0.1)',
                            border: `1px solid ${countdown <= 30 ? 'rgba(239,68,68,0.3)' : 'rgba(59,130,246,0.25)'}`,
                            borderRadius: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '12px',
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
                            <span style={{
                                width: '8px', height: '8px', borderRadius: '50%',
                                background: countdown <= 30 ? '#ef4444' : '#3b82f6',
                                display: 'inline-block',
                                animation: 'pulse 1s infinite',
                            }} />
                            <span style={{ color: '#94a3b8', fontSize: '0.875rem' }}>
                                Retour automatique au terminal dans
                            </span>
                            <span style={{
                                fontFamily: "'Sora', sans-serif",
                                fontWeight: 700,
                                fontSize: '1.25rem',
                                color: countdown <= 30 ? '#ef4444' : '#60a5fa',
                                minWidth: '60px',
                            }}>
                                {Math.floor(countdown / 60).toString().padStart(2, '0')}:{(countdown % 60).toString().padStart(2, '0')}
                            </span>
                        </div>
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={extendStay}
                            style={{
                                padding: '6px 12px',
                                background: 'rgba(59,130,246,0.2)',
                                border: '1px solid rgba(59,130,246,0.4)',
                                borderRadius: '8px',
                                color: '#93c5fd',
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                            }}
                        >
                            + 5 min
                        </motion.button>
                    </motion.div>
                )}

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{
                        background: 'rgba(15,23,42,0.7)',
                        backdropFilter: 'blur(12px)',
                        border: '1px solid rgba(59,130,246,0.15)',
                        borderRadius: '24px',
                        padding: '32px',
                    }}
                >
                    <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                        <div style={{
                            display: 'inline-flex', alignItems: 'center', gap: '8px',
                            padding: '5px 14px', marginBottom: '16px',
                            background: 'rgba(37,99,235,0.12)',
                            border: '1px solid rgba(59,130,246,0.25)',
                            borderRadius: '999px',
                        }}>
                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#3b82f6', boxShadow: '0 0 8px #3b82f6' }} />
                            <span style={{ fontSize: '0.75rem', color: '#93c5fd', fontWeight: 600, letterSpacing: '0.08em' }}>
                                RÉSULTATS
                            </span>
                        </div>
                        <h1 style={{
                            fontFamily: "'Sora', sans-serif",
                            fontSize: '2rem',
                            fontWeight: 700,
                            color: '#f8fafc',
                            marginBottom: '8px',
                        }}>
                            Bulletin de Résultats
                        </h1>
                    </div>

                    {/* Informations Étudiant et Performance */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '32px' }}>
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.1 }}
                            style={{
                                background: 'rgba(59,130,246,0.1)',
                                border: '1px solid rgba(59,130,246,0.2)',
                                borderRadius: '16px',
                                padding: '20px',
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                                <User size={20} color="#3b82f6" />
                                <h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#f8fafc' }}>
                                    Informations de l'étudiant
                                </h2>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <p style={{ color: '#94a3b8' }}>
                                    <span style={{ color: '#f8fafc', fontWeight: 500 }}>Nom:</span> {studentInfo?.lastName || 'N/A'}
                                </p>
                                <p style={{ color: '#94a3b8' }}>
                                    <span style={{ color: '#f8fafc', fontWeight: 500 }}>Prénom:</span> {studentInfo?.firstName || 'N/A'}
                                </p>
                                <p style={{ color: '#94a3b8' }}>
                                    <span style={{ color: '#f8fafc', fontWeight: 500 }}>Niveau:</span> {studentInfo?.level || 'N/A'}
                                </p>
                                {studentInfo?.matricule && (
                                    <p style={{ color: '#94a3b8' }}>
                                        <span style={{ color: '#f8fafc', fontWeight: 500 }}>Matricule:</span> {studentInfo?.matricule}
                                    </p>
                                )}
                            </div>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.2 }}
                            style={{
                                background: submittedPercentage >= (exam.passingScore || passedPassingScore)
                                    ? 'rgba(16,185,129,0.1)'
                                    : 'rgba(239,68,68,0.1)',
                                border: `1px solid ${submittedPercentage >= (exam.passingScore || passedPassingScore)
                                    ? 'rgba(16,185,129,0.3)'
                                    : 'rgba(239,68,68,0.3)'}`,
                                borderRadius: '16px',
                                padding: '20px',
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                                <Award size={20} color={submittedPercentage >= (exam.passingScore || passedPassingScore) ? '#10b981' : '#ef4444'} />
                                <h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#f8fafc' }}>
                                    Performance
                                </h2>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <p style={{ color: '#94a3b8' }}>
                                    <span style={{ color: '#f8fafc', fontWeight: 500 }}>Titre:</span> {exam.title || passedExamTitle || 'N/A'}
                                </p>
                                <p style={{ color: '#94a3b8' }}>
                                    <span style={{ color: '#f8fafc', fontWeight: 500 }}>Score:</span> {submittedScore} / {totalQuestions}
                                </p>
                                <p style={{ color: '#94a3b8' }}>
                                    <span style={{ color: '#f8fafc', fontWeight: 500 }}>Pourcentage:</span>{' '}
                                    <span style={{
                                        color: submittedPercentage >= (exam.passingScore || passedPassingScore) ? '#10b981' : '#ef4444',
                                        fontWeight: 600,
                                    }}>
                                        {submittedPercentage.toFixed(2)}%
                                    </span>
                                </p>
                                {(() => { const n = getNote(); return n ? (
                                    <div style={{
                                        marginTop: '8px',
                                        padding: '10px 14px',
                                        background: 'rgba(59,130,246,0.12)',
                                        border: '1px solid rgba(59,130,246,0.35)',
                                        borderRadius: '10px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                    }}>
                                        <span style={{ fontSize: '0.8125rem', color: '#93c5fd', fontWeight: 600, letterSpacing: '0.04em' }}>
                                            NOTE / BARÈME
                                        </span>
                                        <span style={{ fontSize: '1.5rem', fontWeight: 800, color: '#60a5fa' }}>
                                            {n.note}<span style={{ fontSize: '0.9rem', color: '#94a3b8' }}> / {n.bareme}</span>
                                        </span>
                                    </div>
                                ) : null; })()}
                                <p style={{ color: '#94a3b8' }}>
                                    <span style={{ color: '#f8fafc', fontWeight: 500 }}>Statut:</span>{' '}
                                    <span style={{
                                        color: currentPassStatus === 'Réussi' ? '#10b981' : '#ef4444',
                                        fontWeight: 600,
                                    }}>
                                        {currentPassStatus}
                                    </span>
                                </p>
                            </div>
                        </motion.div>
                    </div>

                    {/* Détails des Réponses */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        style={{ marginBottom: '32px' }}
                    >
                        <h2 style={{
                            fontSize: '1.25rem',
                            fontWeight: 600,
                            color: '#f8fafc',
                            marginBottom: '16px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                        }}>
                            <FileText size={20} color="#3b82f6" />
                            Détails des Réponses
                        </h2>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {questionDetailsRef.current.map((qDetail, index) => (
                                <div
                                    key={qDetail._id || `q-${index}`}
                                    style={{
                                        background: 'rgba(255,255,255,0.02)',
                                        border: `1px solid ${qDetail.isCorrect ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
                                        borderRadius: '12px',
                                        padding: '16px',
                                    }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
                                        <p style={{ color: '#f8fafc', fontWeight: 600 }}>
                                            Question {index + 1}
                                        </p>
                                        {qDetail.isCorrect ? (
                                            <CheckCircle size={20} color="#10b981" />
                                        ) : (
                                            <XCircle size={20} color="#ef4444" />
                                        )}
                                    </div>

                                    <p style={{ color: '#94a3b8', marginBottom: '12px' }}>
                                        {qDetail.questionText}
                                    </p>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '12px' }}>
                                        {qDetail.options.map((opt, i) => (
                                            <div
                                                key={i}
                                                style={{
                                                    padding: '8px 12px',
                                                    background: opt === qDetail.correctAnswer
                                                        ? 'rgba(16,185,129,0.1)'
                                                        : opt === qDetail.studentAnswer && opt !== qDetail.correctAnswer
                                                            ? 'rgba(239,68,68,0.1)'
                                                            : 'rgba(255,255,255,0.02)',
                                                    border: `1px solid ${
                                                        opt === qDetail.correctAnswer
                                                            ? 'rgba(16,185,129,0.3)'
                                                            : opt === qDetail.studentAnswer && opt !== qDetail.correctAnswer
                                                                ? 'rgba(239,68,68,0.3)'
                                                                : 'rgba(255,255,255,0.05)'
                                                    }`,
                                                    borderRadius: '8px',
                                                    color: '#94a3b8',
                                                    fontSize: '0.9375rem',
                                                }}
                                            >
                                                {opt}
                                                {opt === qDetail.studentAnswer && (
                                                    <span style={{ marginLeft: '8px', color: opt === qDetail.correctAnswer ? '#10b981' : '#ef4444' }}>
                                                        (Votre réponse)
                                                    </span>
                                                )}
                                                {opt === qDetail.correctAnswer && opt !== qDetail.studentAnswer && (
                                                    <span style={{ marginLeft: '8px', color: '#10b981' }}>
                                                        (Correcte)
                                                    </span>
                                                )}
                                            </div>
                                        ))}
                                    </div>

                                    <div style={{ display: 'flex', gap: '16px', fontSize: '0.875rem' }}>
                                        <p style={{ color: '#94a3b8' }}>
                                            Votre réponse:{' '}
                                            <span style={{ color: qDetail.isCorrect ? '#10b981' : '#ef4444' }}>
                                                {qDetail.studentAnswer || 'Non répondu'}
                                            </span>
                                        </p>
                                        <p style={{ color: '#94a3b8' }}>
                                            Bonne réponse:{' '}
                                            <span style={{ color: '#10b981' }}>
                                                {qDetail.correctAnswer}
                                            </span>
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </motion.div>

                    {/* Boutons d'export */}
                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={printBulletin}
                            style={{
                                flex: 1,
                                minWidth: '160px',
                                padding: '14px',
                                background: 'linear-gradient(135deg, #0f172a, #1e293b)',
                                border: '1px solid rgba(59,130,246,0.3)',
                                borderRadius: '12px',
                                color: '#93c5fd',
                                fontSize: '0.9375rem',
                                fontWeight: 600,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                cursor: 'pointer',
                            }}
                        >
                            <Printer size={18} />
                            Imprimer le Corrigé
                        </motion.button>
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={exportToPDF}
                            style={{
                                flex: 1,
                                minWidth: '160px',
                                padding: '14px',
                                background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
                                border: 'none',
                                borderRadius: '12px',
                                color: '#fff',
                                fontSize: '0.9375rem',
                                fontWeight: 600,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                cursor: 'pointer',
                                boxShadow: '0 4px 12px rgba(139,92,246,0.3)',
                            }}
                        >
                            <Download size={18} />
                            Exporter PDF
                        </motion.button>
                    </div>
                </motion.div>
            </main>
            <Toaster />
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Sora:wght@600;700;800&family=DM+Sans:wght@400;500;600&display=swap');
                @keyframes pulse { 0%,100%{opacity:1}50%{opacity:0.5} }
            `}</style>
        </div>
    );
};

export default ResultsPage;