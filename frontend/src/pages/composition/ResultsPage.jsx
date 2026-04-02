// src/pages/composition/ResultsPage.jsx — avec affichage de la configuration et support des nouveaux champs QCM
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useParams, useNavigate } from 'react-router-dom';
import { jsPDF } from 'jspdf';
import { motion } from 'framer-motion';
import axios from 'axios';
import { toast, Toaster } from 'react-hot-toast';
import QRCode from 'qrcode';
import logo from '../logo.png';
import { Download, CheckCircle, XCircle, Award, User, Calendar, FileText, Printer, Settings } from 'lucide-react';

const NODE_BACKEND_URL = process.env.REACT_APP_BACKEND_URL || (process.env.NODE_ENV === 'production' ? 'https://na2quizapp.onrender.com' : 'http://localhost:5000');

// ✅ Fonction pour récupérer le token JWT
const getAuthToken = () => {
    return localStorage.getItem('userToken') || localStorage.getItem('token');
};

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
        terminalSessionId: passedTerminalSessionId,
    } = state || {};

    const [exam, setExam] = useState(null);
    const [config, setConfig] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [countdown, setCountdown] = useState(120);
    const [redirectTimerActive, setRedirectTimerActive] = useState(true);
    const questionDetailsRef = useRef([]);
    const redirectTimeoutRef = useRef(null);
    const countdownIntervalRef = useRef(null);

    const terminalSessionId = passedTerminalSessionId || localStorage.getItem('terminalSessionId');

    const cleanupBeforeRedirect = useCallback(() => {
        if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
        if (redirectTimeoutRef.current) clearTimeout(redirectTimeoutRef.current);
    }, []);

    // ✅ Correction : redirection vers le terminal sur Render
    const redirectToTerminal = useCallback(() => {
        cleanupBeforeRedirect();
        localStorage.removeItem('studentInfoForExam');
        // Nettoyer les sauvegardes automatiques
        if (examId) {
            localStorage.removeItem(`exam_${examId}_answers`);
            localStorage.removeItem(`exam_${examId}_index`);
            localStorage.removeItem(`exam_${examId}_attempts`);
            localStorage.removeItem(`exam_${examId}_showResult`);
        }
        const redirectUrl = `https://na2quizapp.onrender.com/terminal.html${terminalSessionId ? `?sessionId=${terminalSessionId}` : ''}`;
        window.location.replace(redirectUrl);
    }, [terminalSessionId, cleanupBeforeRedirect, examId]);

    useEffect(() => {
        if (isLoading || !redirectTimerActive) return;
        countdownIntervalRef.current = setInterval(() => {
            setCountdown(prev => {
                if (prev <= 1) { redirectToTerminal(); return 0; }
                return prev - 1;
            });
        }, 1000);
        return () => { if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current); };
    }, [isLoading, redirectTimerActive, redirectToTerminal]);

    const extendStay = useCallback(() => {
        setRedirectTimerActive(false);
        toast.success("Temps prolongé. Vous pouvez fermer cette page manuellement.", { duration: 4000, icon: '⏱️' });
        setTimeout(() => {
            setRedirectTimerActive(true);
            setCountdown(120);
            toast.info("Retour automatique au terminal dans 2 minutes", { duration: 3000 });
        }, 300000);
    }, []);

    // Fonction pour normaliser les questions du nouveau format
    const normalizeQuestionForDisplay = (q, studentAnswer) => {
        // Déterminer l'index de la bonne réponse
        let correctAnswerIndex = -1;
        let correctAnswerText = '';
        
        if (typeof q.bonOpRep === 'number') {
            correctAnswerIndex = q.bonOpRep;
            correctAnswerText = q.options?.[correctAnswerIndex] || '';
        } else if (q.correctAnswer) {
            correctAnswerText = q.correctAnswer;
            correctAnswerIndex = q.options?.findIndex(opt => opt === q.correctAnswer) || -1;
        }
        
        // Déterminer si la réponse est correcte
        let isCorrect = false;
        if (typeof q.bonOpRep === 'number') {
            const selectedIndex = q.options?.findIndex(opt => opt === studentAnswer);
            isCorrect = selectedIndex === q.bonOpRep;
        } else {
            isCorrect = studentAnswer === q.correctAnswer;
        }
        
        return {
            _id: q._id,
            questionText: q.libQuestion || q.question || q.text,
            options: q.options || [],
            studentAnswer: studentAnswer || 'Non répondu',
            correctAnswer: correctAnswerText,
            isCorrect,
            type: q.type || (q.typeQuestion === 2 ? 'multiple' : 'single'),
            points: q.points || 1,
            explanation: q.explanation || '',
            domaine: q.domaine || '',
            niveau: q.niveau || '',
            matiere: q.matiere || '',
        };
    };

    useEffect(() => {
        if (!examId || !submittedAnswers || !studentInfo || submittedScore === undefined || submittedPercentage === undefined) {
            toast.error("Données de résultats manquantes. Veuillez refaire l'épreuve.");
            navigate(`/exam/profile/${examId}`, { replace: true });
            return;
        }

        const fetchAndProcessResults = async () => {
            try {
                // ✅ Ajout du token JWT
                const token = getAuthToken();
                const axiosConfig = token ? {
                    headers: { Authorization: `Bearer ${token}` }
                } : {};

                // Utiliser le snapshot s'il existe
                if (passedResultSnapshot?.examQuestions?.length > 0) {
                    questionDetailsRef.current = passedResultSnapshot.examQuestions.map(q => {
                        const answer = submittedAnswers[q._id?.toString()] || submittedAnswers[q._id] || 'Non répondu';
                        return normalizeQuestionForDisplay(q, answer);
                    });
                }

                const response = await axios.get(`${NODE_BACKEND_URL}/api/exams/${examId}`, { 
                    timeout: 10000,
                    ...axiosConfig 
                });
                
                const examData = response.data;
                setExam(examData);
                setConfig(examData.config || null);

                // Si pas de snapshot, construire depuis les questions de l'examen
                if (!passedResultSnapshot?.examQuestions?.length) {
                    questionDetailsRef.current = examData.questions.map(q => {
                        const answer = submittedAnswers[q._id] || submittedAnswers[q._id?.toString()] || 'Non répondu';
                        return normalizeQuestionForDisplay(q, answer);
                    });
                }

                const actualPassingScore = examData.passingScore || passedPassingScore;
                const passStatusText = submittedPercentage >= actualPassingScore ? 'Réussi' : 'Échoué';
                toast[passStatusText === 'Réussi' ? 'success' : 'error'](
                    `${passStatusText === 'Réussi' ? 'Félicitations' : 'Dommage'} ! Vous avez ${submittedPercentage.toFixed(2)}%` +
                    (actualPassingScore ? ` (seuil: ${actualPassingScore}%)` : '')
                );
            } catch (error) {
                console.error("Erreur lors du chargement des détails de l'épreuve pour les résultats:", error);
                
                // ✅ Gestion de l'erreur 401
                if (error.response?.status === 401) {
                    toast.error("Session expirée. Veuillez vous reconnecter.");
                    localStorage.removeItem('userToken');
                    localStorage.removeItem('token');
                    setTimeout(() => navigate('/login'), 2000);
                    return;
                }
                
                // Fallback: utiliser les données passées dans state
                if (passedExamQuestions?.length > 0) {
                    questionDetailsRef.current = passedExamQuestions.map((q, idx) => {
                        const answer = submittedAnswers[q._id] || submittedAnswers[idx] || 'Non répondu';
                        return normalizeQuestionForDisplay(q, answer);
                    });
                    setExam({
                        title: passedExamTitle || 'Titre inconnu',
                        questions: passedExamQuestions,
                        passingScore: passedPassingScore,
                        domain: passedResultSnapshot?.domain || 'N/A',
                        subject: passedResultSnapshot?.subject || 'N/A',
                        category: passedResultSnapshot?.category || 'N/A',
                        level: passedResultSnapshot?.examLevel || studentInfo?.level || 'N/A',
                        duration: passedResultSnapshot?.duration || 60,
                    });
                    setConfig(passedResultSnapshot?.config || null);
                } else if (error.response?.status === 404 && passedExamQuestions?.length > 0) {
                    toast.error("Épreuve introuvable sur le serveur. Affichage à partir des données locales.");
                    setExam({
                        title: passedExamTitle || 'Titre inconnu',
                        questions: passedExamQuestions,
                        passingScore: passedPassingScore,
                        domain: 'Domaine inconnu', subject: 'Matière inconnue',
                        category: 'Catégorie inconnue', level: studentInfo?.level || 'N/A', duration: 60,
                    });
                    setConfig(null);
                    questionDetailsRef.current = passedExamQuestions.map((q, idx) => {
                        const answer = submittedAnswers[q._id] || submittedAnswers[idx] || 'Non répondu';
                        return normalizeQuestionForDisplay(q, answer);
                    });
                } else {
                    toast.error(`Erreur: ${error.response ? error.response.status : 'Réseau ou serveur inaccessible'}`);
                    setExam(null);
                }
            } finally {
                setIsLoading(false);
            }
        };

        fetchAndProcessResults();

        return () => cleanupBeforeRedirect();
    }, [examId, submittedAnswers, studentInfo, submittedScore, submittedPercentage, passedPassingScore, passedExamTitle, passedExamQuestions, passedQuestionDetails, passedResultSnapshot, navigate, cleanupBeforeRedirect]);

    const getNote = useCallback(() => {
        if (!exam) return null;
        const bareme = exam.totalPoints || 20;
        const total = exam.questions?.length || 0;
        if (!total) return null;
        const rawNote = (submittedScore / total) * bareme;
        return { note: parseFloat(rawNote.toFixed(2)), bareme };
    }, [exam, submittedScore]);

    const getOptionLabel = (opt) => {
        const labels = {
            A: 'Collective Figée',
            B: 'Collective Souple',
            C: 'Personnalisée',
            D: 'Aléatoire'
        };
        return labels[opt] || `Option ${opt}`;
    };

    const printBulletin = useCallback(() => {
        const noteInfo = getNote();
        const noteStr = noteInfo ? `${noteInfo.note} / ${noteInfo.bareme}` : 'N/A';
        const passStatus = submittedPercentage >= (exam?.passingScore || passedPassingScore) ? 'RÉUSSI' : 'ÉCHOUÉ';
        const passColor = passStatus === 'RÉUSSI' ? '#10b981' : '#ef4444';

        const configHtml = config ? `
            <div style="margin: 16px 0; padding: 12px; background: #f1f5f9; border-radius: 12px; border: 1px solid #8b5cf6;">
                <h3 style="margin:0 0 8px; font-size:0.9rem; color:#6d28d9;">⚙️ Configuration de l'épreuve</h3>
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:6px; font-size:0.8rem;">
                    <span><strong>Option :</strong></span><span>${getOptionLabel(config.examOption)} (${config.examOption})</span>
                    ${config.openRange ? `<span><strong>Plage ouverte :</strong></span><span>${config.requiredQuestions} questions à traiter</span>` : ''}
                    <span><strong>Séquencement :</strong></span><span>${config.sequencing === 'identical' ? 'Identique pour tous' : 'Aléatoire par étudiant'}</span>
                    ${config.allowRetry ? `<span><strong>Reprise :</strong></span><span>Autorisée (une fois)</span>` : ''}
                    <span><strong>Chronomètre :</strong></span><span>${config.timerPerQuestion ? `${config.timePerQuestion} sec/question` : `${config.totalTime} min totales`}</span>
                    ${config.showBinaryResult ? '<span colspan="2">✓ Résultat binaire affiché après chaque QCM</span>' : ''}
                    ${config.showCorrectAnswer ? '<span colspan="2">✓ Bonne réponse affichée après chaque QCM</span>' : ''}
                </div>
            </div>
        ` : '';

        const questionsHtml = questionDetailsRef.current.map((q, i) => `
            <div style="margin-bottom:12px; padding:10px; border:1px solid ${q.isCorrect ? '#22c55e' : '#ef4444'}; border-radius:8px;">
                <p style="font-weight:600; margin:0 0 6px;">Q${i + 1}. ${q.questionText}</p>
                ${q.options.map((opt, optIdx) => {
                    const isCorrectOpt = opt === q.correctAnswer;
                    const isStudentOpt = opt === q.studentAnswer;
                    return `
                        <p style="margin:2px 0; padding:3px 8px; border-radius:4px;
                            background:${isCorrectOpt ? '#dcfce7' : isStudentOpt && !isCorrectOpt ? '#fee2e2' : 'transparent'};
                            color:${isCorrectOpt ? '#15803d' : isStudentOpt && !isCorrectOpt ? '#dc2626' : '#374151'}">
                            ${String.fromCharCode(65 + optIdx)}. ${opt}${isStudentOpt ? ' ← votre réponse' : ''}${isCorrectOpt && !isStudentOpt ? ' ✓ correcte' : ''}
                        </p>
                    `;
                }).join('')}
                <p style="margin:6px 0 0; font-size:0.85rem; color:${q.isCorrect ? '#15803d' : '#dc2626'}; font-weight:600;">
                    ${q.isCorrect ? '✓ Correct' : `✗ Incorrect — Bonne réponse : ${q.correctAnswer}`}
                </p>
                ${q.explanation ? `<p style="margin:4px 0 0; font-size:0.75rem; color:#64748b;">💡 ${q.explanation}</p>` : ''}
            </div>
        `).join('');

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
                <div class="note-label">${submittedScore} bonne(s) réponse(s) sur ${exam?.questions?.length || 0} · ${submittedPercentage.toFixed(2)}%</div>
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
                    <p><b>Titre :</b> ${exam?.title || passedExamTitle || 'N/A'}</p>
                    <p><b>Matière :</b> ${exam?.subject || 'N/A'}</p>
                    <p><b>Domaine :</b> ${exam?.domain || 'N/A'}</p>
                    <p><b>Seuil de réussite :</b> ${exam?.passingScore || passedPassingScore || 'N/A'}%</p>
                </div>
            </div>
            ${configHtml}
            <h2>Détail des réponses</h2>
            ${questionsHtml}
            <script>window.onload = () => { window.print(); setTimeout(() => window.close(), 800); }</script>
        </body></html>`);
        win.document.close();
    }, [exam, studentInfo, submittedScore, submittedPercentage, passedExamTitle, passedPassingScore, getNote, config]);

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
        } catch (e) { console.warn("Logo non trouvé"); }
        
        doc.setFontSize(16);
        doc.setTextColor(59, 130, 246);
        doc.text('NA²QUIZ', 35, 20);
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(26);
        doc.text('Bulletin de Résultats', 105, yPos, { align: 'center' });
        yPos += 15;

        // Informations étudiant
        doc.setFontSize(14);
        doc.setTextColor(59, 130, 246);
        doc.text('Informations de l\'étudiant :', margin, yPos);
        yPos += 10;
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(12);
        doc.text(`Nom: ${studentInfo?.lastName || 'N/A'}`, margin, yPos); yPos += lineHeight;
        doc.text(`Prénom: ${studentInfo?.firstName || 'N/A'}`, margin, yPos); yPos += lineHeight;
        doc.text(`Niveau d'étude: ${studentInfo?.level || 'N/A'}`, margin, yPos); yPos += lineHeight;
        if (studentInfo?.matricule) { doc.text(`Matricule: ${studentInfo?.matricule}`, margin, yPos); yPos += lineHeight; }
        yPos += 10;

        // Résumé de l'épreuve
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

        // Performance
        doc.setFontSize(14);
        doc.setTextColor(59, 130, 246);
        doc.text('Performance :', margin, yPos);
        yPos += 10;
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(12);
        doc.text(`Score Obtenu: ${submittedScore} / ${exam.questions?.length || 0}`, margin, yPos); yPos += lineHeight;
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

        // Configuration
        if (config) {
            doc.setFontSize(14);
            doc.setTextColor(139, 92, 246);
            doc.text('Configuration de l\'épreuve :', margin, yPos);
            yPos += 8;
            doc.setTextColor(0, 0, 0);
            doc.setFontSize(10);
            const configLines = [
                `Option : ${getOptionLabel(config.examOption)} (${config.examOption})`,
                config.openRange ? `Plage ouverte : ${config.requiredQuestions} questions à traiter` : null,
                `Séquencement : ${config.sequencing === 'identical' ? 'Identique pour tous' : 'Aléatoire par étudiant'}`,
                config.allowRetry ? `Reprise : Autorisée (une fois)` : null,
                `Chronomètre : ${config.timerPerQuestion ? `${config.timePerQuestion} sec/question` : `${config.totalTime} min totales`}`,
                config.showBinaryResult ? `✓ Résultat binaire affiché après chaque QCM` : null,
                config.showCorrectAnswer ? `✓ Bonne réponse affichée après chaque QCM` : null,
            ].filter(l => l);
            configLines.forEach(line => {
                const split = doc.splitTextToSize(line, maxWidth);
                doc.text(split, margin, yPos);
                yPos += split.length * lineHeight;
            });
            yPos += 5;
        }

        // Détails des réponses
        doc.setFontSize(14);
        doc.setTextColor(59, 130, 246);
        doc.text('Détails des réponses :', margin, yPos);
        yPos += 10;

        questionDetailsRef.current.forEach((qDetail, index) => {
            const questionLines = doc.splitTextToSize(`Question ${index + 1}: ${qDetail.questionText}`, maxWidth);
            const totalHeight = questionLines.length * lineHeight + (qDetail.options.length * 5) + 30;
            if (yPos + totalHeight > doc.internal.pageSize.height - margin - 40) {
                doc.addPage();
                yPos = margin;
            }
            doc.setFontSize(12);
            doc.setTextColor(0, 0, 0);
            doc.text(questionLines, margin, yPos);
            yPos += questionLines.length * lineHeight;
            doc.setFontSize(10);
            qDetail.options.forEach((optText, optIdx) => {
                const prefix = `${String.fromCharCode(65 + optIdx)}. `;
                const optionLines = doc.splitTextToSize(prefix + optText, maxWidth - 5);
                doc.text(optionLines, margin + 5, yPos);
                yPos += optionLines.length * 5;
            });
            doc.text(`Votre réponse: ${qDetail.studentAnswer || 'Non répondu'}`, margin, yPos); yPos += 5;
            doc.text(`Bonne réponse: ${qDetail.correctAnswer || 'N/A'}`, margin, yPos); yPos += 5;
            if (qDetail.explanation) {
                doc.text(`Explication: ${qDetail.explanation}`, margin, yPos); yPos += 5;
            }
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
        } catch (e) { console.warn("Erreur génération QR code:", e); }

        doc.save(`bulletin_resultats_${studentInfo?.lastName || 'Anonyme'}_${studentInfo?.firstName || 'Anonyme'}.pdf`);
        toast.success("Le bulletin de résultats a été exporté en PDF !");
    }, [exam, studentInfo, submittedScore, submittedPercentage, passedExamTitle, passedPassingScore, getNote, config]);

    if (isLoading) {
        return (
            <div style={{
                minHeight: '100vh',
                background: 'linear-gradient(135deg, #05071a 0%, #0a0f2e 60%, #05071a 100%)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                fontFamily: "'DM Sans', sans-serif",
            }}>
                <div style={{ width: '48px', height: '48px', border: '3px solid rgba(59,130,246,0.1)', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                <p style={{ color: '#94a3b8', marginTop: '16px' }}>Chargement des résultats...</p>
                <Toaster />
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
        );
    }

    if (!exam || !studentInfo || submittedAnswers === undefined || submittedPercentage === undefined) {
        return (
            <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #05071a 0%, #0a0f2e 60%, #05071a 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444', fontFamily: "'DM Sans', sans-serif" }}>
                Impossible de charger l'épreuve ou ses résultats.
            </div>
        );
    }

    const totalQuestions = exam.questions?.length || 0;
    const currentPassStatus = submittedPercentage >= (exam.passingScore || passedPassingScore) ? 'Réussi' : 'Échoué';

    return (
        <div style={{
            minHeight: '100vh', fontFamily: "'DM Sans', sans-serif",
            background: 'linear-gradient(135deg, #05071a 0%, #0a0f2e 60%, #05071a 100%)',
            position: 'relative', overflow: 'hidden', padding: '24px',
        }}>
            <div style={{ position: 'fixed', inset: 0, backgroundImage: 'linear-gradient(rgba(59,130,246,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,0.03) 1px, transparent 1px)', backgroundSize: '40px 40px', pointerEvents: 'none', zIndex: 0 }} />
            <div style={{ position: 'fixed', top: '-15%', left: '50%', transform: 'translateX(-50%)', width: '70vw', height: '50vh', background: 'radial-gradient(ellipse, rgba(37,99,235,0.12) 0%, transparent 70%)', pointerEvents: 'none', zIndex: 0 }} />

            <main style={{ position: 'relative', zIndex: 1, maxWidth: '900px', margin: '0 auto' }}>

                {/* Compte à rebours retour terminal */}
                {!isLoading && redirectTimerActive && (
                    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
                        style={{ marginBottom: '16px', padding: '12px 20px', background: countdown <= 30 ? 'rgba(239,68,68,0.12)' : 'rgba(59,130,246,0.1)', border: `1px solid ${countdown <= 30 ? 'rgba(239,68,68,0.3)' : 'rgba(59,130,246,0.25)'}`, borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: countdown <= 30 ? '#ef4444' : '#3b82f6', display: 'inline-block', animation: 'pulse 1s infinite' }} />
                            <span style={{ color: '#94a3b8', fontSize: '0.875rem' }}>Retour automatique au terminal dans</span>
                            <span style={{ fontFamily: "'Sora', sans-serif", fontWeight: 700, fontSize: '1.25rem', color: countdown <= 30 ? '#ef4444' : '#60a5fa', minWidth: '60px' }}>
                                {Math.floor(countdown / 60).toString().padStart(2, '0')}:{(countdown % 60).toString().padStart(2, '0')}
                            </span>
                        </div>
                        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={extendStay}
                            style={{ padding: '6px 12px', background: 'rgba(59,130,246,0.2)', border: '1px solid rgba(59,130,246,0.4)', borderRadius: '8px', color: '#93c5fd', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}>
                            + 5 min
                        </motion.button>
                    </motion.div>
                )}

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                    style={{ background: 'rgba(15,23,42,0.7)', backdropFilter: 'blur(12px)', border: '1px solid rgba(59,130,246,0.15)', borderRadius: '24px', padding: '32px' }}>
                    
                    <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '5px 14px', marginBottom: '16px', background: 'rgba(37,99,235,0.12)', border: '1px solid rgba(59,130,246,0.25)', borderRadius: '999px' }}>
                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#3b82f6', boxShadow: '0 0 8px #3b82f6' }} />
                            <span style={{ fontSize: '0.75rem', color: '#93c5fd', fontWeight: 600, letterSpacing: '0.08em' }}>RÉSULTATS</span>
                        </div>
                        <h1 style={{ fontFamily: "'Sora', sans-serif", fontSize: '2rem', fontWeight: 700, color: '#f8fafc', marginBottom: '8px' }}>
                            Bulletin de Résultats
                        </h1>
                    </div>

                    {/* Informations Étudiant et Performance */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '32px' }}>
                        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}
                            style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: '16px', padding: '20px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                                <User size={20} color="#3b82f6" />
                                <h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#f8fafc' }}>Informations de l'étudiant</h2>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <p style={{ color: '#94a3b8' }}><span style={{ color: '#f8fafc', fontWeight: 500 }}>Nom:</span> {studentInfo?.lastName || 'N/A'}</p>
                                <p style={{ color: '#94a3b8' }}><span style={{ color: '#f8fafc', fontWeight: 500 }}>Prénom:</span> {studentInfo?.firstName || 'N/A'}</p>
                                <p style={{ color: '#94a3b8' }}><span style={{ color: '#f8fafc', fontWeight: 500 }}>Niveau:</span> {studentInfo?.level || 'N/A'}</p>
                                {studentInfo?.matricule && <p style={{ color: '#94a3b8' }}><span style={{ color: '#f8fafc', fontWeight: 500 }}>Matricule:</span> {studentInfo?.matricule}</p>}
                            </div>
                        </motion.div>

                        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}
                            style={{ background: submittedPercentage >= (exam.passingScore || passedPassingScore) ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', border: `1px solid ${submittedPercentage >= (exam.passingScore || passedPassingScore) ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`, borderRadius: '16px', padding: '20px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                                <Award size={20} color={submittedPercentage >= (exam.passingScore || passedPassingScore) ? '#10b981' : '#ef4444'} />
                                <h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#f8fafc' }}>Performance</h2>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <p style={{ color: '#94a3b8' }}><span style={{ color: '#f8fafc', fontWeight: 500 }}>Titre:</span> {exam.title || passedExamTitle || 'N/A'}</p>
                                <p style={{ color: '#94a3b8' }}><span style={{ color: '#f8fafc', fontWeight: 500 }}>Score:</span> {submittedScore} / {totalQuestions}</p>
                                <p style={{ color: '#94a3b8' }}><span style={{ color: '#f8fafc', fontWeight: 500 }}>Pourcentage:</span>{' '}
                                    <span style={{ color: submittedPercentage >= (exam.passingScore || passedPassingScore) ? '#10b981' : '#ef4444', fontWeight: 600 }}>
                                        {submittedPercentage.toFixed(2)}%
                                    </span>
                                </p>
                                {(() => { const n = getNote(); return n ? (
                                    <div style={{ marginTop: '8px', padding: '10px 14px', background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.35)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <span style={{ fontSize: '0.8125rem', color: '#93c5fd', fontWeight: 600, letterSpacing: '0.04em' }}>NOTE / BARÈME</span>
                                        <span style={{ fontSize: '1.5rem', fontWeight: 800, color: '#60a5fa' }}>{n.note}<span style={{ fontSize: '0.9rem', color: '#94a3b8' }}> / {n.bareme}</span></span>
                                    </div>
                                ) : null; })()}
                                <p style={{ color: '#94a3b8' }}><span style={{ color: '#f8fafc', fontWeight: 500 }}>Statut:</span>{' '}
                                    <span style={{ color: currentPassStatus === 'Réussi' ? '#10b981' : '#ef4444', fontWeight: 600 }}>{currentPassStatus}</span>
                                </p>
                            </div>
                        </motion.div>
                    </div>

                    {/* Configuration de l'épreuve */}
                    {config && (
                        <div style={{ marginBottom: '24px', background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 12, padding: '14px 16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                                <Settings size={14} color="#8b5cf6" />
                                <span style={{ color: '#a5b4fc', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Configuration de l'épreuve</span>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.78rem' }}>
                                <span style={{ color: '#64748b' }}>Option :</span>
                                <span style={{ color: '#e2e8f0' }}>{getOptionLabel(config.examOption)} ({config.examOption})</span>
                                
                                {config.openRange && (
                                    <>
                                        <span style={{ color: '#64748b' }}>Plage ouverte :</span>
                                        <span style={{ color: '#e2e8f0' }}>{config.requiredQuestions} questions à traiter</span>
                                    </>
                                )}
                                
                                <span style={{ color: '#64748b' }}>Séquencement :</span>
                                <span style={{ color: '#e2e8f0' }}>{config.sequencing === 'identical' ? 'Identique pour tous' : 'Aléatoire par étudiant'}</span>
                                
                                {config.allowRetry && (
                                    <>
                                        <span style={{ color: '#64748b' }}>Reprise :</span>
                                        <span style={{ color: '#e2e8f0' }}>Autorisée (une fois)</span>
                                    </>
                                )}
                                
                                <span style={{ color: '#64748b' }}>Chronomètre :</span>
                                <span style={{ color: '#e2e8f0' }}>
                                    {config.timerPerQuestion 
                                        ? `${config.timePerQuestion} sec/question` 
                                        : `${config.totalTime} min totales`}
                                </span>
                                
                                {config.showBinaryResult && (
                                    <span style={{ color: '#64748b', gridColumn: 'span 2' }}>✓ Résultat binaire affiché après chaque QCM</span>
                                )}
                                {config.showCorrectAnswer && (
                                    <span style={{ color: '#64748b', gridColumn: 'span 2' }}>✓ Bonne réponse affichée après chaque QCM</span>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Détails des Réponses */}
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} style={{ marginBottom: '32px' }}>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#f8fafc', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <FileText size={20} color="#3b82f6" /> Détails des Réponses
                        </h2>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {questionDetailsRef.current.map((qDetail, index) => (
                                <div key={qDetail._id || `q-${index}`}
                                    style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${qDetail.isCorrect ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`, borderRadius: '12px', padding: '16px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
                                        <p style={{ color: '#f8fafc', fontWeight: 600 }}>Question {index + 1}</p>
                                        {qDetail.isCorrect ? <CheckCircle size={20} color="#10b981" /> : <XCircle size={20} color="#ef4444" />}
                                    </div>
                                    <p style={{ color: '#94a3b8', marginBottom: '12px' }}>{qDetail.questionText}</p>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '12px' }}>
                                        {qDetail.options.map((opt, i) => {
                                            const isCorrectOpt = opt === qDetail.correctAnswer;
                                            const isStudentOpt = opt === qDetail.studentAnswer;
                                            return (
                                                <div key={i}
                                                    style={{ padding: '8px 12px', background: isCorrectOpt ? 'rgba(16,185,129,0.1)' : isStudentOpt && !isCorrectOpt ? 'rgba(239,68,68,0.1)' : 'rgba(255,255,255,0.02)', border: `1px solid ${isCorrectOpt ? 'rgba(16,185,129,0.3)' : isStudentOpt && !isCorrectOpt ? 'rgba(239,68,68,0.3)' : 'rgba(255,255,255,0.05)'}`, borderRadius: '8px', color: '#94a3b8', fontSize: '0.9375rem' }}>
                                                    {String.fromCharCode(65 + i)}. {opt}
                                                    {isStudentOpt && <span style={{ marginLeft: '8px', color: isCorrectOpt ? '#10b981' : '#ef4444' }}>(Votre réponse)</span>}
                                                    {isCorrectOpt && !isStudentOpt && <span style={{ marginLeft: '8px', color: '#10b981' }}>(Correcte)</span>}
                                                </div>
                                            );
                                        })}
                                    </div>
                                    <div style={{ display: 'flex', gap: '16px', fontSize: '0.875rem', flexWrap: 'wrap' }}>
                                        <p style={{ color: '#94a3b8' }}>Votre réponse: <span style={{ color: qDetail.isCorrect ? '#10b981' : '#ef4444' }}>{qDetail.studentAnswer || 'Non répondu'}</span></p>
                                        <p style={{ color: '#94a3b8' }}>Bonne réponse: <span style={{ color: '#10b981' }}>{qDetail.correctAnswer}</span></p>
                                        {qDetail.points && <p style={{ color: '#94a3b8' }}>Points: {qDetail.points}</p>}
                                    </div>
                                    {qDetail.explanation && (
                                        <div style={{ marginTop: '8px', padding: '8px', background: 'rgba(59,130,246,0.05)', borderRadius: '8px' }}>
                                            <p style={{ color: '#64748b', fontSize: '0.8rem' }}>💡 {qDetail.explanation}</p>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </motion.div>

                    {/* Boutons d'export */}
                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={printBulletin}
                            style={{ flex: 1, minWidth: '160px', padding: '14px', background: 'linear-gradient(135deg, #0f172a, #1e293b)', border: '1px solid rgba(59,130,246,0.3)', borderRadius: '12px', color: '#93c5fd', fontSize: '0.9375rem', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer' }}>
                            <Printer size={18} /> Imprimer le Corrigé
                        </motion.button>
                        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={exportToPDF}
                            style={{ flex: 1, minWidth: '160px', padding: '14px', background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)', border: 'none', borderRadius: '12px', color: '#fff', fontSize: '0.9375rem', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer', boxShadow: '0 4px 12px rgba(139,92,246,0.3)' }}>
                            <Download size={18} /> Exporter PDF
                        </motion.button>
                    </div>
                </motion.div>
            </main>
            <Toaster />
            <style>{`@import url('https://fonts.googleapis.com/css2?family=Sora:wght@600;700;800&family=DM+Sans:wght@400;500;600&display=swap'); @keyframes pulse { 0%,100%{opacity:1}50%{opacity:0.5} }`}</style>
        </div>
    );
};

export default ResultsPage;