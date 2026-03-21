import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
    FileText, Download, Printer, Filter, ChevronDown, ChevronUp, Search,
    BarChart2, PieChart, Home, RefreshCw, ChevronLeft, User, Clock,
    Book, Award, Trash2, CheckCircle, XCircle, Calendar, ListOrdered,
    TrendingUp, Users, GraduationCap, Eye, Send, Share2, Link,
    BarChart3, Percent, Target, BookOpen, Trophy
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast, Toaster } from 'react-hot-toast';
import axios from 'axios';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const NODE_BACKEND_URL = process.env.REACT_APP_BACKEND_URL || (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:5000');

const containerVariants = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: { staggerChildren: 0.05 }
    }
};

const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
};

const ReportsPage = () => {
    const navigate = useNavigate();
    const location = useLocation();

    const [reportsData, setReportsData] = useState([]);
    const [isLoadingReports, setIsLoadingReports] = useState(true);
    const [errorReports, setErrorReports] = useState(null);
    const [filters, setFilters] = useState({ examType: '', dateRange: '', status: '' });
    const [showFilters, setShowFilters] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    const [exams, setExams] = useState([]);
    const [selectedRankingExamId, setSelectedRankingExamId] = useState('');
    const [rankingsData, setRankingsData] = useState([]);
    const [isLoadingRankings, setIsLoadingRankings] = useState(false);
    const [errorRankings, setErrorRankings] = useState(null);
    const [showRankingsSection, setShowRankingsSection] = useState(false);

    // ── Classement par Session — groupement (examId + date du jour) ──────
    // Pas d'appel API supplémentaire : calculé depuis reportsData
    const [expandedSessionKeys, setExpandedSessionKeys] = useState({}); // { sessionKey: bool }
    const [showSessionRankings, setShowSessionRankings] = useState(false);

    const reportContentRef = useRef(null);
    const rankingsPrintRef = useRef(null);

    // ── Statistiques Évaluation Sommative ─────────────────────────────
    const [selectedStatsExamId, setSelectedStatsExamId] = useState('');
    const [showStatsSection, setShowStatsSection] = useState(false);

    const fetchExams = useCallback(async () => {
        try {
            const response = await axios.get(`${NODE_BACKEND_URL}/api/exams`);
            const examsArray = Array.isArray(response.data)
                ? response.data
                : Array.isArray(response.data?.data) ? response.data.data : [];
            setExams(examsArray);
        } catch (err) {
            console.error("Erreur lors du chargement des épreuves:", err);
            toast.error("Impossible de charger la liste des épreuves.", {
                style: { background: '#1e293b', color: '#f8fafc', border: '1px solid #ef4444' }
            });
        }
    }, []);

    const fetchReports = useCallback(async () => {
        setIsLoadingReports(true);
        setErrorReports(null);
        try {
            const response = await axios.get(`${NODE_BACKEND_URL}/api/results`);
            setReportsData(response.data);
            console.log("Rapports chargés avec succès:", response.data);
        } catch (err) {
            const errorMessage = err.response?.data?.message || err.message || "Une erreur inconnue est survenue.";
            setErrorReports(errorMessage);
            console.error('Erreur lors du chargement des rapports:', err);
            toast.error(`Erreur lors du chargement des rapports: ${errorMessage}`, {
                style: { background: '#1e293b', color: '#f8fafc', border: '1px solid #ef4444' }
            });
        } finally {
            setIsLoadingReports(false);
        }
    }, []);

    const fetchRankings = useCallback(async (examId) => {
        if (!examId) {
            setRankingsData([]);
            return;
        }
        setIsLoadingRankings(true);
        setErrorRankings(null);
        try {
            const response = await axios.get(`${NODE_BACKEND_URL}/api/rankings/${examId}`);
            if (response.data && Array.isArray(response.data.rankings)) {
                setRankingsData(response.data.rankings);
                console.log(`Classement pour l'examen ${examId} chargé:`, response.data.rankings);
            } else {
                setRankingsData([]);
                console.warn(`Réponse inattendue pour le classement de l'examen ${examId}:`, response.data);
                setErrorRankings(response.data?.message || "Format de données de classement inattendu.");
            }
        } catch (err) {
            setRankingsData([]);
            const errorMessage = err.response?.data?.message || err.message || "Une erreur inconnue est survenue.";
            setErrorRankings(errorMessage);
            console.error(`Erreur lors du chargement du classement pour l'examen ${examId}:`, err);
            toast.error(`Erreur classement: ${errorMessage}`, {
                style: { background: '#1e293b', color: '#f8fafc', border: '1px solid #ef4444' }
            });
        } finally {
            setIsLoadingRankings(false);
        }
    }, []);

    useEffect(() => {
        fetchReports();
        fetchExams();
    }, [fetchReports, fetchExams]);

    useEffect(() => {
        if (location.state?.newResultId && reportsData.length > 0) {
            const newReport = reportsData.find(r => r._id === location.state.newResultId);
            if (newReport) {
                toast.success(
                    <div style={{ color: '#f8fafc' }}>
                        <p>Résultats sauvegardés avec succès !</p>
                        {newReport?.pdfPath ? (
                            <button
                                onClick={() => window.open(`${NODE_BACKEND_URL}${newReport.pdfPath}`, '_blank')}
                                style={{
                                    marginTop: '8px',
                                    padding: '6px 12px',
                                    background: '#3b82f6',
                                    border: 'none',
                                    borderRadius: '6px',
                                    color: '#fff',
                                    fontSize: '0.875rem',
                                    cursor: 'pointer',
                                }}
                            >
                                Télécharger le bulletin
                            </button>
                        ) : (
                            <p style={{ marginTop: '8px', fontSize: '0.875rem', color: '#94a3b8' }}>
                                Le PDF n'est pas encore disponible pour ce rapport.
                            </p>
                        )}
                    </div>,
                    {
                        duration: 6000,
                        style: { background: '#1e293b', border: '1px solid #10b981' }
                    }
                );
                navigate(location.pathname, { replace: true, state: {} });
            }
        }
    }, [location.state?.newResultId, reportsData, navigate, location.pathname]);

    useEffect(() => {
        if (selectedRankingExamId) {
            fetchRankings(selectedRankingExamId);
        } else {
            setRankingsData([]);
        }
    }, [selectedRankingExamId, fetchRankings]);

    const handleFilterChange = (e) => {
        setFilters({ ...filters, [e.target.name]: e.target.value });
    };

    const filterByDateRange = (dateString, range) => {
        if (!dateString) return true;
        const now = new Date();
        const reportDate = new Date(dateString);
        if (isNaN(reportDate.getTime())) return false;
        switch (range) {
            case 'last-week':
                return (now - reportDate) <= 7 * 24 * 60 * 60 * 1000;
            case 'last-month':
                return (now - reportDate) <= 30 * 24 * 60 * 60 * 1000;
            case 'last-year':
                return (now - reportDate) <= 365 * 24 * 60 * 60 * 1000;
            default:
                return true;
        }
    };

    const filteredAndSearchedReports = reportsData.filter(report => {
        const examTitle = report.examId?.title || '';
        const firstName = report.studentInfo?.firstName || '';
        const lastName = report.studentInfo?.lastName || '';
        const matricule = report.studentInfo?.matricule || '';
        const domain = report.examId?.domain || '';
        const subject = report.examId?.subject || '';
        const level = report.examId?.level || '';
        const category = report.examId?.category || '';

        const matchesSearch = examTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
            firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            matricule.toLowerCase().includes(searchTerm.toLowerCase()) ||
            domain.toLowerCase().includes(searchTerm.toLowerCase()) ||
            subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
            level.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesFilters = (
            (filters.examType === '' || category === filters.examType) &&
            (filters.status === '' || (report.passed ? 'Réussi' : 'Échoué') === filters.status) &&
            (filters.dateRange === '' || filterByDateRange(report.createdAt, filters.dateRange))
        );
        return matchesSearch && matchesFilters;
    });

    const deleteReport = async (reportId) => {
        toast((t) => (
            <div style={{ background: '#1e293b', padding: '16px', borderRadius: '12px', color: '#fff' }}>
                <p style={{ marginBottom: '12px' }}>Êtes-vous sûr de vouloir supprimer ce rapport définitivement ?</p>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                    <button
                        onClick={() => {
                            toast.dismiss(t.id);
                            performDeleteReport(reportId);
                        }}
                        style={{
                            background: '#ef4444',
                            color: '#fff',
                            border: 'none',
                            padding: '8px 16px',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontWeight: 600,
                        }}
                    >
                        Confirmer
                    </button>
                    <button
                        onClick={() => toast.dismiss(t.id)}
                        style={{
                            background: '#475569',
                            color: '#fff',
                            border: 'none',
                            padding: '8px 16px',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontWeight: 600,
                        }}
                    >
                        Annuler
                    </button>
                </div>
            </div>
        ), { duration: Infinity });
    };

    const performDeleteReport = async (reportId) => {
        try {
            await axios.delete(`${NODE_BACKEND_URL}/api/results/${reportId}`);
            setReportsData(prev => prev.filter(r => r._id !== reportId));
            toast.success("Rapport supprimé avec succès.", {
                style: { background: '#1e293b', color: '#f8fafc', border: '1px solid #10b981' }
            });
        } catch (err) {
            const errorMessage = err.response?.data?.message || err.message || "Échec de la suppression du rapport.";
            toast.error(`Échec de la suppression du rapport: ${errorMessage}`, {
                style: { background: '#1e293b', color: '#f8fafc', border: '1px solid #ef4444' }
            });
            console.error("Erreur lors de la suppression du rapport:", err);
        }
    };

    const downloadBackendPdf = (pdfPath) => {
        if (pdfPath) {
            window.open(`${NODE_BACKEND_URL}${pdfPath}`, '_blank');
        } else {
            toast.error("Aucun PDF pré-généré disponible pour ce rapport.", {
                style: { background: '#1e293b', color: '#f8fafc', border: '1px solid #ef4444' }
            });
        }
    };

    const generatePDF = async () => {
        const element = reportContentRef.current;
        if (!element) {
            toast.error("Contenu non trouvé pour la génération du PDF.", {
                style: { background: '#1e293b', color: '#f8fafc', border: '1px solid #ef4444' }
            });
            return;
        }
        toast.loading("Génération du PDF en cours...", {
            id: 'pdfGen',
            style: { background: '#1e293b', color: '#f8fafc', border: '1px solid #3b82f6' }
        });
        try {
            const canvas = await html2canvas(element, { scale: 2 });
            const pdf = new jsPDF('p', 'mm', 'a4');
            const imgData = canvas.toDataURL('image/png');
            const imgProps = pdf.getImageProperties(imgData);
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

            let heightLeft = pdfHeight;
            let position = 0;

            pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
            heightLeft -= pdf.internal.pageSize.getHeight();

            while (heightLeft >= 0) {
                position = heightLeft - pdfHeight;
                pdf.addPage();
                pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
                heightLeft -= pdf.internal.pageSize.getHeight();
            }

            pdf.save(`rapports_${new Date().toISOString().slice(0, 10)}.pdf`);
            toast.success("PDF généré avec succès !", {
                id: 'pdfGen',
                style: { background: '#1e293b', color: '#f8fafc', border: '1px solid #10b981' }
            });
        } catch (err) {
            toast.error("Erreur lors de la génération du PDF.", {
                id: 'pdfGen',
                style: { background: '#1e293b', color: '#f8fafc', border: '1px solid #ef4444' }
            });
            console.error("Erreur jsPDF/html2canvas:", err);
        }
    };

    const printAllReports = async () => {
        const element = reportContentRef.current;
        if (!element) {
            toast.error("Contenu non trouvé pour l'impression.", {
                style: { background: '#1e293b', color: '#f8fafc', border: '1px solid #ef4444' }
            });
            return;
        }
        toast.loading("Préparation de l'impression...", {
            id: 'printPrep',
            style: { background: '#1e293b', color: '#f8fafc', border: '1px solid #3b82f6' }
        });
        try {
            const canvas = await html2canvas(element, { scale: 2 });
            const printWindow = window.open('', '_blank');
            printWindow.document.write(`
                <html>
                    <head>
                        <title>Rapports d'Évaluation</title>
                        <style>
                            body { margin: 0; font-family: 'DM Sans', sans-serif; background: #05071a; color: #f8fafc; }
                            img { max-width: 100%; height: auto; display: block; margin: 0 auto; }
                            @media print {
                                @page { size: A4; margin: 10mm; }
                                body { margin: 0; background: white; }
                                img { filter: invert(1) hue-rotate(180deg); }
                            }
                        </style>
                    </head>
                    <body>
                        <img src="${canvas.toDataURL('image/png')}" />
                        <script>
                            window.onload = function() {
                                window.print();
                                setTimeout(() => window.close(), 1000);
                            };
                        </script>
                    </body>
                </html>
            `);
            printWindow.document.close();
            toast.success("Impression lancée.", {
                id: 'printPrep',
                style: { background: '#1e293b', color: '#f8fafc', border: '1px solid #10b981' }
            });
        } catch (err) {
            toast.error("Erreur lors de l'impression.", {
                id: 'printPrep',
                style: { background: '#1e293b', color: '#f8fafc', border: '1px solid #ef4444' }
            });
            console.error("Erreur d'impression:", err);
        }
    };

    // ── IMPRESSION CORRIGÉ INDIVIDUEL ──────────────────────────────────
    const printIndividualReport = useCallback((report) => {
        // ✅ Note /20 calculée depuis le pourcentage — indépendant de examId.questions
        const note = ((report.percentage || 0) / 100 * 20).toFixed(2);
        const totalQ = report.examId?.questions?.length || report.totalQuestions || '?';
        const bareme = 20;
        const passColor = report.passed ? '#15803d' : '#dc2626';
        const passText = report.passed ? 'RÉUSSI' : 'ÉCHOUÉ';

        const questionsHtml = (report.examId?.questions || report.examQuestions || []).map((q, i) => {
            const studentAns = report.answers?.[q._id] || 'Non répondu';
            const isCorrect = studentAns !== 'Non répondu' && studentAns === q.correctAnswer;
            return `
            <div style="margin-bottom:10px; padding:10px; border:1px solid ${isCorrect ? '#22c55e' : '#ef4444'}; border-radius:8px; font-size:0.85rem;">
                <p style="font-weight:700; margin:0 0 6px; color:#1e293b;">Q${i + 1}. ${q.question}</p>
                ${(q.options || []).map(opt => `
                    <p style="margin:2px 0; padding:3px 8px; border-radius:4px;
                        background:${opt === q.correctAnswer ? '#dcfce7' : opt === studentAns && opt !== q.correctAnswer ? '#fee2e2' : '#f8fafc'};
                        color:${opt === q.correctAnswer ? '#15803d' : opt === studentAns && opt !== q.correctAnswer ? '#dc2626' : '#374151'}">
                        ${opt}${opt === studentAns ? ' ← votre réponse' : ''}${opt === q.correctAnswer && opt !== studentAns ? ' ✓ correcte' : ''}</p>`).join('')}
                <p style="margin:6px 0 0; font-weight:700; color:${isCorrect ? '#15803d' : '#dc2626'};">
                    ${isCorrect ? '✓ Correct' : `✗ Incorrect — Bonne réponse : ${q.correctAnswer || 'N/A'}`}</p>
            </div>`;
        }).join('') || '<p style="color:#64748b;">Détails des questions non disponibles.</p>';

        const win = window.open('', '_blank');
        win.document.write(`<!DOCTYPE html><html><head>
            <title>Corrigé — ${report.studentInfo?.lastName} ${report.studentInfo?.firstName}</title>
            <style>
                * { box-sizing: border-box; }
                body { font-family: Arial, sans-serif; margin: 0; padding: 20px; color: #1e293b; font-size: 0.875rem; }
                @media print { @page { size: A4; margin: 12mm; } body { padding: 0; } }
                .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #3b82f6; padding-bottom: 12px; margin-bottom: 16px; }
                .brand { font-size: 1.25rem; font-weight: 800; color: #3b82f6; }
                .badge { padding: 5px 14px; border-radius: 999px; font-size: 1rem; font-weight: 800; background:${passColor}22; color:${passColor}; border: 2px solid ${passColor}; }
                .note-box { text-align: center; padding: 12px; background: #eff6ff; border: 2px solid #3b82f6; border-radius: 12px; margin-bottom: 16px; }
                .note-val { font-size: 2.25rem; font-weight: 800; color: #1d4ed8; }
                .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px; }
                .box { background: #f8fafc; padding: 10px 12px; border-radius: 8px; border: 1px solid #e2e8f0; }
                .box h3 { margin: 0 0 6px; font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; }
                .box p { margin: 2px 0; }
                h2 { font-size: 0.95rem; font-weight: 700; margin: 16px 0 8px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; }
                .footer { margin-top: 20px; padding-top: 10px; border-top: 1px solid #e2e8f0; font-size: 0.75rem; color: #94a3b8; text-align: center; }
            </style>
        </head><body>
            <div class="header">
                <div>
                    <div class="brand">NA²QUIZ — Corrigé Individuel</div>
                    <div style="color:#64748b; font-size:0.8rem; margin-top:2px;">
                        Épreuve : ${report.examId?.title || report.examTitle || 'N/A'} · ${new Date(report.createdAt).toLocaleString('fr-FR')}
                    </div>
                </div>
                <div class="badge">${passText}</div>
            </div>
            <div class="note-box">
                <div style="font-size:0.75rem; color:#64748b; text-transform:uppercase; letter-spacing:0.05em;">NOTE INDIVIDUELLE</div>
                <div class="note-val">${note} <span style="font-size:1.1rem; color:#64748b;">/ ${bareme}</span></div>
                <div style="font-size:0.8rem; color:#64748b;">${report.score || 0} bonne(s) / ${totalQ} questions · ${report.percentage || 0}%</div>
            </div>
            <div class="grid2">
                <div class="box">
                    <h3>Candidat</h3>
                    <p><b>Nom :</b> ${report.studentInfo?.lastName || 'N/A'}</p>
                    <p><b>Prénom :</b> ${report.studentInfo?.firstName || 'N/A'}</p>
                    <p><b>Matricule :</b> ${report.studentInfo?.matricule || 'N/A'}</p>
                    <p><b>Niveau :</b> ${report.studentInfo?.level || 'N/A'}</p>
                </div>
                <div class="box">
                    <h3>Épreuve</h3>
                    <p><b>Matière :</b> ${report.examId?.subject || report.subject || 'N/A'}</p>
                    <p><b>Domaine :</b> ${report.examId?.domain || report.domain || 'N/A'}</p>
                    <p><b>Durée :</b> ${report.examId?.duration || report.duration || 'N/A'} min</p>
                    <p><b>Seuil :</b> ${report.examId?.passingScore || report.passingScore || 'N/A'}%</p>
                </div>
            </div>
            <h2>Détail des réponses</h2>
            ${questionsHtml}
            <div class="footer">Document généré par NA²QUIZ · ${new Date().toLocaleString('fr-FR')}</div>
            <script>window.onload = () => { window.print(); setTimeout(() => window.close(), 800); }</script>
        </body></html>`);
        win.document.close();
    }, []);

    // ── DISTRIBUTION DU CORRIGÉ ────────────────────────────────────────
    const distributeCorrige = useCallback((report) => {
        const resultLink = `${NODE_BACKEND_URL}/api/bulletin/${report._id}`;

        if (navigator.clipboard) {
            navigator.clipboard.writeText(resultLink).then(() => {
                toast.success(
                    <div>
                        <p style={{ fontWeight: 600, marginBottom: '4px' }}>Lien copié dans le presse-papiers !</p>
                        <p style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                            {report.studentInfo?.firstName} {report.studentInfo?.lastName}
                        </p>
                    </div>,
                    { style: { background: '#1e293b', color: '#f8fafc', border: '1px solid #10b981' } }
                );
            });
        } else {
            // Fallback: open in new tab
            window.open(resultLink, '_blank');
            toast.success('Corrigé ouvert dans un nouvel onglet.', {
                style: { background: '#1e293b', color: '#f8fafc', border: '1px solid #10b981' }
            });
        }
    }, []);

    // ── DISTRIBUTION DE TOUS LES CORRIGÉS ─────────────────────────────
    const distributeAllCorrigesForExam = useCallback((examId) => {
        const examReports = reportsData.filter(r =>
            (r.examId?._id || r.examId) === examId
        );
        if (!examReports.length) {
            toast.error('Aucun résultat pour cette épreuve.');
            return;
        }
        const links = examReports.map(r =>
            `${r.studentInfo?.lastName} ${r.studentInfo?.firstName} (${r.studentInfo?.matricule}): ${r.pdfPath ? NODE_BACKEND_URL + r.pdfPath : `${window.location.origin}/results/${examId}`}`
        ).join('\n');
        if (navigator.clipboard) {
            navigator.clipboard.writeText(links).then(() => {
                toast.success(`${examReports.length} liens copiés !`, {
                    style: { background: '#1e293b', color: '#f8fafc', border: '1px solid #10b981' }
                });
            });
        }
    }, [reportsData]);

    // ── IMPRESSION FICHE DE CLASSEMENT ────────────────────────────────
    const printRankings = useCallback(() => {
        if (!rankingsData.length) {
            toast.error('Aucun classement à imprimer.');
            return;
        }
        const examTitle = exams.find(e => e._id === selectedRankingExamId)?.title || 'Épreuve';
        const rows = rankingsData.map((entry, i) => {
            const medals = ['🥇', '🥈', '🥉'];
            const medal = i < 3 ? medals[i] : '';
            return `<tr style="border-bottom:1px solid #e2e8f0; background:${i % 2 === 0 ? '#f8fafc' : '#fff'}">
                <td style="padding:8px 12px; font-weight:700; text-align:center;">${medal || entry.rank}</td>
                <td style="padding:8px 12px; font-weight:600;">${entry.studentInfo?.firstName || ''} ${entry.studentInfo?.lastName || ''}</td>
                <td style="padding:8px 12px; color:#64748b; font-family:monospace;">${entry.studentInfo?.matricule || 'N/A'}</td>
                <td style="padding:8px 12px; text-align:center;">${entry.score}</td>
                <td style="padding:8px 12px; text-align:center; font-weight:700; color:${entry.percentage >= 50 ? '#15803d' : '#dc2626'};">${entry.percentage}%</td>
            </tr>`;
        }).join('');

        const passCount = rankingsData.filter(e => e.percentage >= 50).length;
        const avg = rankingsData.reduce((a, e) => a + (e.percentage || 0), 0) / (rankingsData.length || 1);

        const win = window.open('', '_blank');
        win.document.write(`<!DOCTYPE html><html><head>
            <title>Classement — ${examTitle}</title>
            <style>
                * { box-sizing: border-box; }
                body { font-family: Arial, sans-serif; margin: 0; padding: 20px; color: #1e293b; }
                @media print { @page { size: A4 landscape; margin: 10mm; } }
                h1 { font-size: 1.25rem; font-weight: 800; margin: 0 0 4px; color: #1e293b; }
                .subtitle { color: #64748b; font-size: 0.8rem; margin-bottom: 16px; }
                .brand { color: #3b82f6; font-weight: 800; }
                table { width: 100%; border-collapse: collapse; font-size: 0.875rem; }
                thead tr { background: #1e293b; color: #f8fafc; }
                th { padding: 10px 12px; text-align: left; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; }
                .summary { display: flex; gap: 24px; margin-bottom: 16px; }
                .stat { padding: 8px 16px; border-radius: 8px; border: 1px solid #e2e8f0; background: #f8fafc; font-size: 0.875rem; }
                .stat span { font-weight: 700; font-size: 1.1rem; color: #3b82f6; display: block; }
                .footer { margin-top: 20px; padding-top: 10px; border-top: 1px solid #e2e8f0; font-size: 0.75rem; color: #94a3b8; text-align: center; }
            </style>
        </head><body>
            <div style="display:flex;justify-content:space-between;align-items:flex-start; margin-bottom:16px; border-bottom:3px solid #3b82f6; padding-bottom:12px;">
                <div>
                    <div class="brand" style="font-size:1rem;">NA²QUIZ · ÉVALUATION SOMMATIVE</div>
                    <h1>Fiche de Classement Collectif</h1>
                    <div class="subtitle">${examTitle} · Généré le ${new Date().toLocaleString('fr-FR')}</div>
                </div>
            </div>
            <div class="summary">
                <div class="stat"><span>${rankingsData.length}</span>Participants</div>
                <div class="stat"><span>${avg.toFixed(1)}%</span>Moyenne</div>
                <div class="stat"><span>${passCount}</span>Reçus</div>
                <div class="stat" style="color:#dc2626;"><span style="color:#dc2626;">${rankingsData.length - passCount}</span>Recalés</div>
                <div class="stat"><span>${rankingsData[0]?.percentage || 0}%</span>Meilleur score</div>
            </div>
            <table>
                <thead><tr>
                    <th style="width:60px;">Rang</th>
                    <th>Candidat</th>
                    <th>Matricule</th>
                    <th style="width:80px; text-align:center;">Score</th>
                    <th style="width:100px; text-align:center;">Résultat</th>
                </tr></thead>
                <tbody>${rows}</tbody>
            </table>
            <div class="footer">Fiche de classement · NA²QUIZ · ${new Date().toLocaleString('fr-FR')}</div>
            <script>window.onload = () => { window.print(); setTimeout(() => window.close(), 800); }</script>
        </body></html>`);
        win.document.close();
    }, [rankingsData, exams, selectedRankingExamId]);

    // ── PDF CLASSEMENT ─────────────────────────────────────────────────
    const downloadRankingsPDF = useCallback(async () => {
        const el = rankingsPrintRef.current;
        if (!el || !rankingsData.length) {
            toast.error('Aucun classement disponible.');
            return;
        }
        toast.loading('Génération PDF classement...', { id: 'rankPdf' });
        try {
            const canvas = await html2canvas(el, { scale: 2 });
            const pdf = new jsPDF('l', 'mm', 'a4');
            const imgData = canvas.toDataURL('image/png');
            const imgProps = pdf.getImageProperties(imgData);
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
            const examTitle = exams.find(e => e._id === selectedRankingExamId)?.title || 'classement';
            pdf.save(`classement_${examTitle}_${new Date().toISOString().slice(0, 10)}.pdf`);
            toast.success('PDF généré !', { id: 'rankPdf' });
        } catch (err) {
            toast.error('Erreur génération PDF classement.', { id: 'rankPdf' });
        }
    }, [rankingsData, exams, selectedRankingExamId]);

    // ── SESSIONS — groupement (examId + date du jour) ─────────────────
    // Clé de session = "${examId}__${YYYY-MM-DD}"
    // Chaque passation d'un même examen à une date différente = session distincte.
    const computedSessions = useMemo(() => {
        const groups = {};
        reportsData.forEach(r => {
            const examId  = r.examId?._id || r.examId || 'unknown';
            const dateStr = r.createdAt
                ? new Date(r.createdAt).toISOString().slice(0, 10)   // YYYY-MM-DD
                : 'sans-date';
            const key = `${examId}__${dateStr}`;

            if (!groups[key]) {
                groups[key] = {
                    key,
                    examId,
                    dateStr,
                    examTitle:  r.examId?.title  || 'Épreuve inconnue',
                    examDomain: r.examId?.domain || '',
                    examLevel:  r.examId?.level  || '',
                    results:    [],
                };
            }
            groups[key].results.push(r);
        });

        // Trier les résultats de chaque session par percentage desc → rang
        return Object.values(groups)
            .map(session => ({
                ...session,
                rankings: [...session.results]
                    .sort((a, b) => (b.percentage || 0) - (a.percentage || 0))
                    .map((r, i) => ({ ...r, rank: i + 1 })),
            }))
            // Sessions les plus récentes en premier
            .sort((a, b) => b.dateStr.localeCompare(a.dateStr));
    }, [reportsData]);

    const toggleSessionExpand = useCallback((key) => {
        setExpandedSessionKeys(prev => ({ ...prev, [key]: !prev[key] }));
    }, []);

    // ── IMPRESSION CLASSEMENT DE SESSION ──────────────────────────────
    const printSessionRanking = useCallback((session) => {
        const { rankings, examTitle, examDomain, examLevel, dateStr } = session;
        if (!rankings.length) return toast.error('Aucun classement pour cette session.');

        const dateLabel = dateStr !== 'sans-date'
            ? new Date(dateStr).toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
            : '';
        const medals  = ['🥇', '🥈', '🥉'];
        const passed  = rankings.filter(r => r.passed || r.percentage >= 50).length;
        const avg     = (rankings.reduce((a, r) => a + (r.percentage || 0), 0) / rankings.length).toFixed(1);
        const bareme  = rankings[0]?.examId?.totalPoints || 20;
        const totalQ  = rankings[0]?.examId?.questions?.length || 1;

        const rows = rankings.map((r, i) => {
            const note = ((r.score || 0) / totalQ * bareme).toFixed(2);
            return `<tr style="border-bottom:1px solid #e2e8f0;background:${i%2===0?'#f8fafc':'#fff'}">
              <td style="padding:7px 10px;font-weight:700;text-align:center;font-size:1.1rem;">${i<3?medals[i]:r.rank}</td>
              <td style="padding:7px 10px;font-weight:600;">${r.studentInfo?.firstName||''} ${r.studentInfo?.lastName||''}</td>
              <td style="padding:7px 10px;color:#64748b;font-family:monospace;font-size:0.82rem;">${r.studentInfo?.matricule||'N/A'}</td>
              <td style="padding:7px 10px;text-align:center;">${r.score ?? '—'} / ${totalQ}</td>
              <td style="padding:7px 10px;text-align:center;font-weight:700;color:${(r.percentage||0)>=50?'#15803d':'#dc2626'};">${r.percentage??0}%</td>
              <td style="padding:7px 10px;text-align:center;font-weight:700;color:#1d4ed8;">${note} / ${bareme}</td>
              <td style="padding:7px 10px;text-align:center;">${r.pdfPath?`<a href="${NODE_BACKEND_URL}${r.pdfPath}" target="_blank" style="color:#7c3aed;font-weight:600;font-size:0.8rem;">PDF ↗</a>`:'—'}</td>
            </tr>`;
        }).join('');

        const win = window.open('', '_blank');
        win.document.write(`<!DOCTYPE html><html><head>
          <title>Classement — ${examTitle} — ${dateLabel}</title>
          <style>
            *{box-sizing:border-box}
            body{font-family:Arial,sans-serif;margin:0;padding:18px;color:#1e293b;font-size:0.875rem}
            @media print{@page{size:A4 landscape;margin:8mm}body{padding:0}}
            .brand{color:#3b82f6;font-weight:800;font-size:0.9rem;letter-spacing:-.01em}
            h1{font-size:1.1rem;font-weight:800;margin:2px 0}
            .sub{color:#64748b;font-size:0.75rem;margin-bottom:14px}
            table{width:100%;border-collapse:collapse}
            thead tr{background:#1e293b;color:#f8fafc}
            th{padding:8px 10px;text-align:left;font-size:0.68rem;text-transform:uppercase;letter-spacing:.05em}
            .stats{display:flex;gap:14px;margin-bottom:14px;flex-wrap:wrap}
            .stat{padding:6px 12px;border-radius:7px;border:1px solid #e2e8f0;background:#f8fafc;font-size:0.82rem}
            .stat span{font-weight:700;font-size:0.95rem;color:#3b82f6;display:block}
            .footer{margin-top:14px;padding-top:8px;border-top:1px solid #e2e8f0;font-size:0.7rem;color:#94a3b8;text-align:center}
          </style>
        </head><body>
          <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px;border-bottom:3px solid #3b82f6;padding-bottom:10px;">
            <div>
              <div class="brand">NA²QUIZ · Classement de Session</div>
              <h1>${examTitle}</h1>
              <div class="sub">${dateLabel}${examDomain ? ' · ' + examDomain : ''}${examLevel ? ' · ' + examLevel : ''}</div>
            </div>
          </div>
          <div class="stats">
            <div class="stat"><span>${rankings.length}</span>Participants</div>
            <div class="stat"><span>${avg}%</span>Moyenne</div>
            <div class="stat" style="color:#15803d"><span style="color:#15803d">${passed}</span>Reçus</div>
            <div class="stat" style="color:#dc2626"><span style="color:#dc2626">${rankings.length-passed}</span>Recalés</div>
            <div class="stat"><span>${rankings[0]?.percentage??0}%</span>Meilleur</div>
          </div>
          <table>
            <thead><tr>
              <th style="width:50px;text-align:center">Rang</th>
              <th>Candidat</th><th>Matricule</th>
              <th style="width:90px;text-align:center">Score / Total</th>
              <th style="width:80px;text-align:center">%</th>
              <th style="width:90px;text-align:center">Note / ${bareme}</th>
              <th style="width:65px;text-align:center">Bulletin</th>
            </tr></thead>
            <tbody>${rows}</tbody>
          </table>
          <div class="footer">Classement de Session · NA²QUIZ Rapports · Imprimé le ${new Date().toLocaleString('fr-FR')}</div>
          <script>window.onload=()=>{window.print();setTimeout(()=>window.close(),800)}</script>
        </body></html>`);
        win.document.close();
    }, []);

    // ── STATISTIQUES SOMMATIVES ────────────────────────────────────────
    const computeSommativeStats = useCallback((examId) => {
        const results = reportsData.filter(r =>
            (r.examId?._id || r.examId) === examId
        );
        if (!results.length) return null;

        const scores = results.map(r => r.percentage || 0).sort((a, b) => a - b);
        const total = scores.length;
        const mean = scores.reduce((a, b) => a + b, 0) / total;
        const median = total % 2 === 0
            ? (scores[total / 2 - 1] + scores[total / 2]) / 2
            : scores[Math.floor(total / 2)];
        const passed = results.filter(r => r.passed).length;
        const passRate = (passed / total) * 100;
        const highest = scores[total - 1];
        const lowest = scores[0];
        const stdDev = Math.sqrt(scores.reduce((a, s) => a + Math.pow(s - mean, 2), 0) / total);

        // Distribution par tranche de 10%
        const distribution = Array.from({ length: 10 }, (_, i) => ({
            label: `${i * 10}-${(i + 1) * 10}%`,
            count: scores.filter(s => s >= i * 10 && s < (i + 1) * 10 + (i === 9 ? 1 : 0)).length,
        }));

        return { total, mean: mean.toFixed(1), median: median.toFixed(1), passed, passRate: passRate.toFixed(1), highest, lowest, stdDev: stdDev.toFixed(1), distribution, results };
    }, [reportsData]);

    const StatCard = ({ icon, label, value, gradient, color }) => {
        const getGradient = () => {
            switch(gradient) {
                case 'blue': return 'linear-gradient(135deg, #1e3a8a, #3b82f6)';
                case 'green': return 'linear-gradient(135deg, #065f46, #10b981)';
                case 'purple': return 'linear-gradient(135deg, #5b21b6, #8b5cf6)';
                case 'orange': return 'linear-gradient(135deg, #9a3412, #f97316)';
                case 'red': return 'linear-gradient(135deg, #991b1b, #ef4444)';
                case 'pink': return 'linear-gradient(135deg, #831843, #ec4899)';
                case 'teal': return 'linear-gradient(135deg, #115e59, #14b8a6)';
                case 'indigo': return 'linear-gradient(135deg, #3730a3, #6366f1)';
                default: return 'linear-gradient(135deg, #1e293b, #334155)';
            }
        };

        return (
            <div style={{
                background: getGradient(),
                borderRadius: '12px',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {React.cloneElement(icon, { size: 18, color: 'rgba(255,255,255,0.9)' })}
                    <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'rgba(255,255,255,0.9)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        {label}
                    </span>
                </div>
                <span style={{ fontSize: '1.5rem', fontWeight: 700, color: '#fff' }}>{value}</span>
            </div>
        );
    };

    const QuestionFeedback = ({ question, studentAnswer, index }) => {
        const isCorrect = studentAnswer && studentAnswer === question.correctAnswer;
        const studentResponse = studentAnswer || 'Non répondu';
        return (
            <div style={{
                marginBottom: '12px',
                padding: '12px',
                background: 'rgba(255,255,255,0.02)',
                border: `1px solid ${isCorrect ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
                borderRadius: '8px',
            }}>
                <p style={{ color: '#f8fafc', fontWeight: 600, marginBottom: '8px' }}>
                    Question {index + 1}: {question.question}
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span style={{ color: '#94a3b8', fontSize: '0.875rem' }}>Votre réponse:</span>
                    <span style={{
                        color: isCorrect ? '#10b981' : '#ef4444',
                        fontSize: '0.875rem',
                        fontWeight: 500,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                    }}>
                        {studentResponse}
                        {isCorrect ? <CheckCircle size={14} /> : <XCircle size={14} />}
                    </span>
                </div>
                {!isCorrect && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ color: '#94a3b8', fontSize: '0.875rem' }}>Bonne réponse:</span>
                        <span style={{ color: '#10b981', fontSize: '0.875rem', fontWeight: 500 }}>
                            {question.correctAnswer || 'N/A'}
                        </span>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div style={{
            minHeight: '100vh',
            fontFamily: "'DM Sans', sans-serif",
            background: 'linear-gradient(135deg, #05071a 0%, #0a0f2e 60%, #05071a 100%)',
            position: 'relative',
            overflow: 'hidden',
            padding: '24px',
        }}>
            {/* Grid */}
            <div style={{
                position: 'fixed', inset: 0,
                backgroundImage: 'linear-gradient(rgba(59,130,246,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,0.03) 1px, transparent 1px)',
                backgroundSize: '40px 40px', pointerEvents: 'none', zIndex: 0,
            }} />

            {/* Top glow */}
            <div style={{
                position: 'fixed', top: '-15%', left: '50%', transform: 'translateX(-50%)',
                width: '70vw', height: '50vh',
                background: 'radial-gradient(ellipse, rgba(37,99,235,0.12) 0%, transparent 70%)',
                pointerEvents: 'none', zIndex: 0,
            }} />

            {/* Topbar */}
            <header style={{
                position: 'sticky', top: 0, zIndex: 50,
                background: 'rgba(5,7,26,0.88)',
                backdropFilter: 'blur(20px)',
                borderBottom: '1px solid rgba(59,130,246,0.12)',
                padding: '0 32px',
                height: '60px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '24px',
            }}>
                <div style={{
                    fontFamily: "'Sora', sans-serif",
                    fontWeight: 800, fontSize: '1.125rem',
                    letterSpacing: '-0.02em',
                    background: 'linear-gradient(135deg, #60a5fa, #a78bfa)',
                    WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent',
                }}>
                    NA²QUIZ · RAPPORTS
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                    <motion.button
                        whileHover={{ scale: 1.04 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={fetchReports}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '7px',
                            padding: '8px 16px', borderRadius: '8px',
                            background: 'rgba(255,255,255,0.06)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            color: '#cbd5e1', fontSize: '0.875rem', fontWeight: 500,
                            cursor: 'pointer',
                        }}
                    >
                        <RefreshCw size={15} />
                        Actualiser
                    </motion.button>
                    <motion.button
                        whileHover={{ scale: 1.04 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => navigate('/')}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '7px',
                            padding: '8px 16px', borderRadius: '8px',
                            background: 'rgba(255,255,255,0.06)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            color: '#cbd5e1', fontSize: '0.875rem', fontWeight: 500,
                            cursor: 'pointer',
                        }}
                    >
                        <Home size={15} />
                        Accueil
                    </motion.button>
                </div>
            </header>

            <main style={{ position: 'relative', zIndex: 1, maxWidth: '1400px', margin: '0 auto' }}>
                <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    animate="show"
                >
                    {/* Header */}
                    <motion.div variants={itemVariants} style={{ textAlign: 'center', marginBottom: '32px' }}>
                        <div style={{
                            display: 'inline-flex', alignItems: 'center', gap: '8px',
                            padding: '5px 14px', marginBottom: '16px',
                            background: 'rgba(37,99,235,0.12)',
                            border: '1px solid rgba(59,130,246,0.25)',
                            borderRadius: '999px',
                        }}>
                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#3b82f6', boxShadow: '0 0 8px #3b82f6' }} />
                            <span style={{ fontSize: '0.75rem', color: '#93c5fd', fontWeight: 600, letterSpacing: '0.08em' }}>
                                ANALYTIQUE
                            </span>
                        </div>
                        <h1 style={{
                            fontFamily: "'Sora', sans-serif",
                            fontSize: '2rem',
                            fontWeight: 700,
                            color: '#f8fafc',
                            marginBottom: '8px',
                        }}>
                            Rapports d'Évaluation
                        </h1>
                        <p style={{ fontSize: '0.9375rem', color: 'rgba(203,213,225,0.7)' }}>
                            Analysez les résultats, consultez les bulletins et suivez les performances
                        </p>
                    </motion.div>

                    {/* Search and Actions */}
                    <motion.div variants={itemVariants} style={{
                        background: 'rgba(15,23,42,0.7)',
                        backdropFilter: 'blur(12px)',
                        border: '1px solid rgba(59,130,246,0.15)',
                        borderRadius: '20px',
                        padding: '20px',
                        marginBottom: '24px',
                    }}>
                        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
                            <div style={{ position: 'relative', flex: 1, minWidth: '250px' }}>
                                <Search size={18} style={{ position: 'absolute', left: '12px', top: '12px', color: '#64748b' }} />
                                <input
                                    type="text"
                                    placeholder="Rechercher par titre, nom, matricule..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '12px 12px 12px 40px',
                                        background: 'rgba(255,255,255,0.05)',
                                        border: '1px solid rgba(59,130,246,0.2)',
                                        borderRadius: '10px',
                                        color: '#f8fafc',
                                        fontSize: '0.9375rem',
                                        outline: 'none',
                                    }}
                                    onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                                    onBlur={(e) => e.target.style.borderColor = 'rgba(59,130,246,0.2)'}
                                />
                            </div>

                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => setShowFilters(!showFilters)}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '8px',
                                    padding: '12px 20px',
                                    background: 'rgba(255,255,255,0.05)',
                                    border: '1px solid rgba(59,130,246,0.2)',
                                    borderRadius: '10px',
                                    color: '#cbd5e1',
                                    fontSize: '0.9375rem',
                                    cursor: 'pointer',
                                }}
                            >
                                <Filter size={18} />
                                Filtres
                                {showFilters ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                            </motion.button>

                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={generatePDF}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '8px',
                                    padding: '12px 20px',
                                    background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                                    border: 'none',
                                    borderRadius: '10px',
                                    color: '#fff',
                                    fontSize: '0.9375rem',
                                    fontWeight: 500,
                                    cursor: 'pointer',
                                }}
                            >
                                <Download size={18} />
                                PDF
                            </motion.button>

                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={printAllReports}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '8px',
                                    padding: '12px 20px',
                                    background: 'linear-gradient(135deg, #10b981, #059669)',
                                    border: 'none',
                                    borderRadius: '10px',
                                    color: '#fff',
                                    fontSize: '0.9375rem',
                                    fontWeight: 500,
                                    cursor: 'pointer',
                                }}
                            >
                                <Printer size={18} />
                                Imprimer
                            </motion.button>
                        </div>

                        {/* Filters Panel */}
                        <AnimatePresence>
                            {showFilters && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    transition={{ duration: 0.3 }}
                                    style={{
                                        marginTop: '16px',
                                        paddingTop: '16px',
                                        borderTop: '1px solid rgba(59,130,246,0.15)',
                                        display: 'grid',
                                        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                                        gap: '16px',
                                    }}
                                >
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.875rem', color: '#94a3b8', marginBottom: '6px' }}>
                                            Type d'Épreuve
                                        </label>
                                        <select
                                            name="examType"
                                            value={filters.examType}
                                            onChange={handleFilterChange}
                                            style={{
                                                width: '100%',
                                                padding: '10px',
                                                background: 'rgba(255,255,255,0.05)',
                                                border: '1px solid rgba(59,130,246,0.2)',
                                                borderRadius: '8px',
                                                color: '#f8fafc',
                                                fontSize: '0.875rem',
                                                outline: 'none',
                                            }}
                                        >
                                            <option value="" style={{ background: '#1e293b' }}>Tous</option>
                                            <option value="Formatif" style={{ background: '#1e293b' }}>Formatif</option>
                                            <option value="Sommative" style={{ background: '#1e293b' }}>Sommative</option>
                                            <option value="Diagnostique" style={{ background: '#1e293b' }}>Diagnostique</option>
                                            <option value="Professionnel" style={{ background: '#1e293b' }}>Professionnel</option>
                                            <option value="Éducatif" style={{ background: '#1e293b' }}>Éducatif</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.875rem', color: '#94a3b8', marginBottom: '6px' }}>
                                            Période
                                        </label>
                                        <select
                                            name="dateRange"
                                            value={filters.dateRange}
                                            onChange={handleFilterChange}
                                            style={{
                                                width: '100%',
                                                padding: '10px',
                                                background: 'rgba(255,255,255,0.05)',
                                                border: '1px solid rgba(59,130,246,0.2)',
                                                borderRadius: '8px',
                                                color: '#f8fafc',
                                                fontSize: '0.875rem',
                                                outline: 'none',
                                            }}
                                        >
                                            <option value="" style={{ background: '#1e293b' }}>Toutes</option>
                                            <option value="last-week" style={{ background: '#1e293b' }}>Dernière semaine</option>
                                            <option value="last-month" style={{ background: '#1e293b' }}>Dernier mois</option>
                                            <option value="last-year" style={{ background: '#1e293b' }}>Dernière année</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.875rem', color: '#94a3b8', marginBottom: '6px' }}>
                                            Statut
                                        </label>
                                        <select
                                            name="status"
                                            value={filters.status}
                                            onChange={handleFilterChange}
                                            style={{
                                                width: '100%',
                                                padding: '10px',
                                                background: 'rgba(255,255,255,0.05)',
                                                border: '1px solid rgba(59,130,246,0.2)',
                                                borderRadius: '8px',
                                                color: '#f8fafc',
                                                fontSize: '0.875rem',
                                                outline: 'none',
                                            }}
                                        >
                                            <option value="" style={{ background: '#1e293b' }}>Tous</option>
                                            <option value="Réussi" style={{ background: '#1e293b' }}>Réussi</option>
                                            <option value="Échoué" style={{ background: '#1e293b' }}>Échoué</option>
                                        </select>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>

                    {/* Reports Section */}
                    <motion.div variants={itemVariants}>
                        <h2 style={{
                            fontFamily: "'Sora', sans-serif",
                            fontSize: '1.5rem',
                            fontWeight: 600,
                            color: '#f8fafc',
                            marginBottom: '20px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                        }}>
                            <FileText size={24} color="#3b82f6" />
                            Rapports Individuels
                            <span style={{
                                background: 'rgba(59,130,246,0.2)',
                                color: '#3b82f6',
                                fontSize: '0.875rem',
                                fontWeight: 600,
                                padding: '2px 10px',
                                borderRadius: '999px',
                                marginLeft: '12px',
                            }}>
                                {filteredAndSearchedReports.length}
                            </span>
                        </h2>

                        {isLoadingReports ? (
                            <div style={{
                                background: 'rgba(15,23,42,0.7)',
                                borderRadius: '20px',
                                padding: '60px',
                                textAlign: 'center',
                            }}>
                                <RefreshCw size={40} style={{ color: '#3b82f6', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
                                <p style={{ color: '#94a3b8' }}>Chargement des rapports...</p>
                            </div>
                        ) : errorReports ? (
                            <div style={{
                                background: 'rgba(239,68,68,0.1)',
                                border: '1px solid #ef4444',
                                borderRadius: '20px',
                                padding: '40px',
                                textAlign: 'center',
                            }}>
                                <p style={{ color: '#ef4444' }}>Erreur: {errorReports}</p>
                            </div>
                        ) : filteredAndSearchedReports.length === 0 ? (
                            <div style={{
                                background: 'rgba(15,23,42,0.7)',
                                borderRadius: '20px',
                                padding: '60px',
                                textAlign: 'center',
                            }}>
                                <p style={{ color: '#94a3b8' }}>Aucun rapport trouvé</p>
                            </div>
                        ) : (
                            <div ref={reportContentRef} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                <AnimatePresence>
                                    {filteredAndSearchedReports.map(report => (
                                        <motion.div
                                            key={report._id}
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -20 }}
                                            style={{
                                                background: 'rgba(15,23,42,0.7)',
                                                backdropFilter: 'blur(12px)',
                                                border: '1px solid rgba(59,130,246,0.15)',
                                                borderRadius: '20px',
                                                padding: '24px',
                                            }}
                                        >
                                            {/* Report Header */}
                                            <div style={{
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'start',
                                                marginBottom: '20px',
                                                paddingBottom: '20px',
                                                borderBottom: '1px solid rgba(59,130,246,0.15)',
                                            }}>
                                                <div>
                                                    <h3 style={{
                                                        fontFamily: "'Sora', sans-serif",
                                                        fontSize: '1.25rem',
                                                        fontWeight: 600,
                                                        color: '#f8fafc',
                                                        marginBottom: '8px',
                                                    }}>
                                                        {report.examId?.title || report.examTitle || 'Titre inconnu'}
                                                    </h3>
                                                    <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                                                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#94a3b8', fontSize: '0.875rem' }}>
                                                            <User size={14} />
                                                            {report.studentInfo?.firstName} {report.studentInfo?.lastName}
                                                        </span>
                                                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#94a3b8', fontSize: '0.875rem' }}>
                                                            <GraduationCap size={14} />
                                                            {report.studentInfo?.matricule}
                                                        </span>
                                                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#94a3b8', fontSize: '0.875rem' }}>
                                                            <Calendar size={14} />
                                                            {new Date(report.createdAt).toLocaleDateString()}
                                                        </span>
                                                    </div>
                                                </div>

                                                <div style={{ display: 'flex', gap: '8px' }}>
                                                    <motion.button
                                                        whileHover={{ scale: 1.1 }}
                                                        whileTap={{ scale: 0.9 }}
                                                        onClick={() => window.open(`${NODE_BACKEND_URL}/api/bulletin/${report._id}`, '_blank')}
                                                        title="Ouvrir le bulletin (imprimable / PDF)"
                                                        style={{
                                                            padding: '8px',
                                                            background: 'rgba(59,130,246,0.1)',
                                                            border: '1px solid #3b82f6',
                                                            borderRadius: '8px',
                                                            color: '#3b82f6',
                                                            cursor: 'pointer',
                                                        }}
                                                    >
                                                        <Download size={16} />
                                                    </motion.button>
                                                    {/* ── IMPRIMER CORRIGÉ INDIVIDUEL ── */}
                                                    <motion.button
                                                        whileHover={{ scale: 1.1 }}
                                                        whileTap={{ scale: 0.9 }}
                                                        onClick={() => printIndividualReport(report)}
                                                        title="Imprimer le corrigé individuel"
                                                        style={{
                                                            padding: '8px',
                                                            background: 'rgba(16,185,129,0.1)',
                                                            border: '1px solid #10b981',
                                                            borderRadius: '8px',
                                                            color: '#10b981',
                                                            cursor: 'pointer',
                                                        }}
                                                    >
                                                        <Printer size={16} />
                                                    </motion.button>
                                                    {/* ── DISTRIBUER LE CORRIGÉ ── */}
                                                    <motion.button
                                                        whileHover={{ scale: 1.1 }}
                                                        whileTap={{ scale: 0.9 }}
                                                        onClick={() => distributeCorrige(report)}
                                                        title="Copier le lien du corrigé (distribuer)"
                                                        style={{
                                                            padding: '8px',
                                                            background: 'rgba(139,92,246,0.1)',
                                                            border: '1px solid #8b5cf6',
                                                            borderRadius: '8px',
                                                            color: '#8b5cf6',
                                                            cursor: 'pointer',
                                                        }}
                                                    >
                                                        <Share2 size={16} />
                                                    </motion.button>
                                                    <motion.button
                                                        whileHover={{ scale: 1.1 }}
                                                        whileTap={{ scale: 0.9 }}
                                                        onClick={() => deleteReport(report._id)}
                                                        title="Supprimer"
                                                        style={{
                                                            padding: '8px',
                                                            background: 'rgba(239,68,68,0.1)',
                                                            border: '1px solid #ef4444',
                                                            borderRadius: '8px',
                                                            color: '#ef4444',
                                                            cursor: 'pointer',
                                                        }}
                                                    >
                                                        <Trash2 size={16} />
                                                    </motion.button>
                                                </div>
                                            </div>

                                            {/* Stats Grid */}
                                            <div style={{
                                                display: 'grid',
                                                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                                                gap: '12px',
                                                marginBottom: '20px',
                                            }}>
                                                {/* NOTE INDIVIDUELLE — prominent */}
                                                <div style={{
                                                    background: 'linear-gradient(135deg, #1d4ed8, #3b82f6)',
                                                    borderRadius: '12px',
                                                    padding: '16px',
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    gap: '6px',
                                                    boxShadow: '0 4px 12px rgba(59,130,246,0.3)',
                                                    gridColumn: 'span 1',
                                                }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        <Award size={16} color="rgba(255,255,255,0.9)" />
                                                        <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'rgba(255,255,255,0.8)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                                                            NOTE / BARÈME
                                                        </span>
                                                    </div>
                                                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                                                        <span style={{ fontSize: '1.75rem', fontWeight: 800, color: '#fff' }}>
                                                            {((report.percentage || 0) / 100 * 20).toFixed(2)}
                                                        </span>
                                                        <span style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.6)' }}>
                                                            / 20
                                                        </span>
                                                    </div>
                                                    <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)' }}>
                                                        {report.score || 0} pt(s) · {report.totalQuestions || report.examId?.questions?.length || 0} Q · {report.percentage || 0}%
                                                    </span>
                                                </div>
                                                <StatCard
                                                    icon={<Award />}
                                                    label="Score"
                                                    value={`${report.percentage || 0}%`}
                                                    gradient={report.passed ? 'green' : 'red'}
                                                />
                                                <StatCard
                                                    icon={<BarChart2 />}
                                                    label="Questions"
                                                    value={report.examId?.questions?.length || report.totalQuestions || 0}
                                                    gradient="blue"
                                                />
                                                <StatCard
                                                    icon={<Book />}
                                                    label="Matière"
                                                    value={report.examId?.subject || report.subject || 'N/A'}
                                                    gradient="purple"
                                                />
                                                <StatCard
                                                    icon={<Clock />}
                                                    label="Durée"
                                                    value={`${report.examId?.duration || report.duration || 0} min`}
                                                    gradient="orange"
                                                />
                                            </div>

                                            {/* Second Stats Row */}
                                            <div style={{
                                                display: 'grid',
                                                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                                                gap: '12px',
                                                marginBottom: '20px',
                                            }}>
                                                <StatCard
                                                    icon={<FileText />}
                                                    label="Domaine"
                                                    value={report.examId?.domain || report.domain || 'N/A'}
                                                    gradient="gray"
                                                />
                                                <StatCard
                                                    icon={<PieChart />}
                                                    label="Catégorie"
                                                    value={report.examId?.category || report.category || 'N/A'}
                                                    gradient="teal"
                                                />
                                                <StatCard
                                                    icon={<TrendingUp />}
                                                    label="Seuil"
                                                    value={`${report.examId?.passingScore || report.passingScore || 0}%`}
                                                    gradient="indigo"
                                                />
                                                <StatCard
                                                    icon={<Users />}
                                                    label="Niveau"
                                                    value={report.examId?.level || report.examLevel || 'N/A'}
                                                    gradient="pink"
                                                />
                                            </div>

                                            {/* Question Details */}
                                            {report.examId?.questions?.length > 0 && (
                                                <div>
                                                    <h4 style={{
                                                        fontSize: '1rem',
                                                        fontWeight: 600,
                                                        color: '#f8fafc',
                                                        marginBottom: '12px',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '8px',
                                                    }}>
                                                        <Eye size={16} color="#3b82f6" />
                                                        Détails des réponses
                                                    </h4>
                                                    <div style={{
                                                        background: 'rgba(0,0,0,0.2)',
                                                        borderRadius: '12px',
                                                        padding: '16px',
                                                    }}>
                                                        {report.examId.questions.map((question, index) => (
                                                            <QuestionFeedback
                                                                key={question._id || index}
                                                                question={question}
                                                                studentAnswer={report.answers?.[question._id]}
                                                                index={index}
                                                            />
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </motion.div>
                                    ))}
                                </AnimatePresence>
                            </div>
                        )}
                    </motion.div>

                    {/* ════════════════════════════════════════════════
                        STATISTIQUES ÉVALUATION SOMMATIVE
                    ════════════════════════════════════════════════ */}
                    <motion.div variants={itemVariants} style={{ marginTop: '40px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                            <h2 style={{
                                fontFamily: "'Sora', sans-serif", fontSize: '1.5rem', fontWeight: 600,
                                color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px',
                            }}>
                                <BarChart3 size={24} color="#10b981" />
                                Statistiques Évaluation Sommative
                            </h2>
                            <motion.button
                                whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                                onClick={() => setShowStatsSection(!showStatsSection)}
                                style={{ padding: '8px', background: 'rgba(16,185,129,0.1)', border: '1px solid #10b981', borderRadius: '8px', color: '#10b981', cursor: 'pointer' }}>
                                {showStatsSection ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                            </motion.button>
                        </div>
                        <AnimatePresence>
                            {showStatsSection && (
                                <motion.div
                                    initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
                                    style={{ background: 'rgba(15,23,42,0.7)', backdropFilter: 'blur(12px)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: '20px', padding: '24px' }}
                                >
                                    {/* Exam selector */}
                                    <div style={{ marginBottom: '24px' }}>
                                        <label style={{ display: 'block', fontSize: '0.875rem', color: '#94a3b8', marginBottom: '8px' }}>
                                            Sélectionner une épreuve
                                        </label>
                                        <select
                                            value={selectedStatsExamId}
                                            onChange={(e) => setSelectedStatsExamId(e.target.value)}
                                            style={{ width: '100%', maxWidth: '400px', padding: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '10px', color: '#f8fafc', fontSize: '0.9375rem', outline: 'none' }}
                                        >
                                            <option value="" style={{ background: '#1e293b' }}>-- Choisir une épreuve --</option>
                                            {exams.map((exam) => (
                                                <option key={exam._id} value={exam._id} style={{ background: '#1e293b' }}>
                                                    {exam.title} ({exam.domain} - {exam.level})
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    {selectedStatsExamId && (() => {
                                        const stats = computeSommativeStats(selectedStatsExamId);
                                        if (!stats) return (
                                            <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                                                Aucun résultat disponible pour cette épreuve.
                                            </div>
                                        );
                                        return (
                                            <div>
                                                {/* KPI row */}
                                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', marginBottom: '24px' }}>
                                                    {[
                                                        { label: 'Participants', value: stats.total, icon: <Users size={18} />, color: '#3b82f6', bg: 'linear-gradient(135deg,#1e3a8a,#3b82f6)' },
                                                        { label: 'Moyenne', value: `${stats.mean}%`, icon: <Percent size={18} />, color: '#10b981', bg: 'linear-gradient(135deg,#065f46,#10b981)' },
                                                        { label: 'Médiane', value: `${stats.median}%`, icon: <TrendingUp size={18} />, color: '#8b5cf6', bg: 'linear-gradient(135deg,#5b21b6,#8b5cf6)' },
                                                        { label: 'Taux réussite', value: `${stats.passRate}%`, icon: <Target size={18} />, color: '#f59e0b', bg: 'linear-gradient(135deg,#92400e,#f59e0b)' },
                                                        { label: 'Reçus', value: stats.passed, icon: <CheckCircle size={18} />, color: '#10b981', bg: 'linear-gradient(135deg,#065f46,#10b981)' },
                                                        { label: 'Écart-type', value: `${stats.stdDev}%`, icon: <BarChart2 size={18} />, color: '#ec4899', bg: 'linear-gradient(135deg,#831843,#ec4899)' },
                                                        { label: 'Meilleur', value: `${stats.highest}%`, icon: <Award size={18} />, color: '#fbbf24', bg: 'linear-gradient(135deg,#78350f,#fbbf24)' },
                                                        { label: 'Plus bas', value: `${stats.lowest}%`, icon: <XCircle size={18} />, color: '#ef4444', bg: 'linear-gradient(135deg,#991b1b,#ef4444)' },
                                                    ].map((kpi, ki) => (
                                                        <div key={ki} style={{ background: kpi.bg, borderRadius: '12px', padding: '14px', boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                                                                {React.cloneElement(kpi.icon, { color: 'rgba(255,255,255,0.85)' })}
                                                                <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'rgba(255,255,255,0.8)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                                                    {kpi.label}
                                                                </span>
                                                            </div>
                                                            <span style={{ fontSize: '1.375rem', fontWeight: 800, color: '#fff' }}>{kpi.value}</span>
                                                        </div>
                                                    ))}
                                                </div>

                                                {/* Distribution des scores */}
                                                <div style={{ marginBottom: '24px' }}>
                                                    <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#94a3b8', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                        <BarChart3 size={16} color="#10b981" /> Distribution des scores
                                                    </h4>
                                                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '6px', height: '80px' }}>
                                                        {stats.distribution.map((d, di) => {
                                                            const maxCount = Math.max(...stats.distribution.map(x => x.count), 1);
                                                            const barH = maxCount > 0 ? (d.count / maxCount) * 70 : 0;
                                                            const isPass = di >= 5;
                                                            return (
                                                                <div key={di} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                                                                    <span style={{ fontSize: '0.65rem', color: '#64748b' }}>{d.count}</span>
                                                                    <div style={{
                                                                        width: '100%', height: `${barH}px`, minHeight: d.count > 0 ? '4px' : '0',
                                                                        background: isPass ? 'linear-gradient(to top, #10b981, #34d399)' : 'linear-gradient(to top, #ef4444, #f87171)',
                                                                        borderRadius: '4px 4px 0 0',
                                                                        transition: 'height 0.3s',
                                                                    }} />
                                                                    <span style={{ fontSize: '0.55rem', color: '#475569', transform: 'rotate(-30deg)', transformOrigin: 'center', whiteSpace: 'nowrap' }}>
                                                                        {di * 10}%
                                                                    </span>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                    <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginTop: '8px', fontSize: '0.75rem' }}>
                                                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#ef4444' }}>
                                                            <div style={{ width: '10px', height: '10px', background: '#ef4444', borderRadius: '2px' }} /> Échec (0–49%)
                                                        </span>
                                                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#10b981' }}>
                                                            <div style={{ width: '10px', height: '10px', background: '#10b981', borderRadius: '2px' }} /> Réussite (50–100%)
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Distribute all action */}
                                                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                                                    <motion.button
                                                        whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                                                        onClick={() => distributeAllCorrigesForExam(selectedStatsExamId)}
                                                        style={{
                                                            display: 'flex', alignItems: 'center', gap: '8px',
                                                            padding: '10px 18px',
                                                            background: 'linear-gradient(135deg, #7c3aed, #8b5cf6)',
                                                            border: 'none', borderRadius: '10px', color: '#fff',
                                                            fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer',
                                                        }}
                                                    >
                                                        <Send size={16} />
                                                        Distribuer tous les corrigés ({stats.total})
                                                    </motion.button>
                                                </div>
                                            </div>
                                        );
                                    })()}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>

                    {/* Rankings Section */}
                    <motion.div variants={itemVariants} style={{ marginTop: '40px' }}>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            marginBottom: '20px',
                        }}>
                            <h2 style={{
                                fontFamily: "'Sora', sans-serif",
                                fontSize: '1.5rem',
                                fontWeight: 600,
                                color: '#f8fafc',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                            }}>
                                <ListOrdered size={24} color="#8b5cf6" />
                                Classement des Compétiteurs
                            </h2>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                {/* ── IMPRIMER CLASSEMENT ── */}
                                {rankingsData.length > 0 && (
                                    <>
                                        <motion.button
                                            whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                                            onClick={printRankings}
                                            title="Imprimer la fiche de classement"
                                            style={{
                                                display: 'flex', alignItems: 'center', gap: '6px',
                                                padding: '8px 14px',
                                                background: 'rgba(16,185,129,0.12)',
                                                border: '1px solid rgba(16,185,129,0.4)',
                                                borderRadius: '8px', color: '#10b981',
                                                fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer',
                                            }}
                                        >
                                            <Printer size={15} /> Imprimer
                                        </motion.button>
                                        <motion.button
                                            whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                                            onClick={downloadRankingsPDF}
                                            title="Télécharger le classement en PDF"
                                            style={{
                                                display: 'flex', alignItems: 'center', gap: '6px',
                                                padding: '8px 14px',
                                                background: 'rgba(139,92,246,0.12)',
                                                border: '1px solid rgba(139,92,246,0.4)',
                                                borderRadius: '8px', color: '#8b5cf6',
                                                fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer',
                                            }}
                                        >
                                            <Download size={15} /> PDF
                                        </motion.button>
                                    </>
                                )}
                                <motion.button
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.9 }}
                                    onClick={() => setShowRankingsSection(!showRankingsSection)}
                                    style={{
                                        padding: '8px',
                                        background: 'rgba(139,92,246,0.1)',
                                        border: '1px solid #8b5cf6',
                                        borderRadius: '8px',
                                        color: '#8b5cf6',
                                        cursor: 'pointer',
                                    }}
                                >
                                    {showRankingsSection ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                </motion.button>
                            </div>
                        </div>

                        <AnimatePresence>
                            {showRankingsSection && (
                                <motion.div
                                    initial={{ opacity: 0, y: -20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -20 }}
                                    style={{
                                        background: 'rgba(15,23,42,0.7)',
                                        backdropFilter: 'blur(12px)',
                                        border: '1px solid rgba(139,92,246,0.3)',
                                        borderRadius: '20px',
                                        padding: '24px',
                                    }}
                                >
                                    <div style={{ marginBottom: '20px' }}>
                                        <label style={{ display: 'block', fontSize: '0.875rem', color: '#94a3b8', marginBottom: '8px' }}>
                                            Sélectionner une épreuve
                                        </label>
                                        <select
                                            value={selectedRankingExamId}
                                            onChange={(e) => setSelectedRankingExamId(e.target.value)}
                                            style={{
                                                width: '100%',
                                                maxWidth: '400px',
                                                padding: '12px',
                                                background: 'rgba(255,255,255,0.05)',
                                                border: '1px solid rgba(139,92,246,0.3)',
                                                borderRadius: '10px',
                                                color: '#f8fafc',
                                                fontSize: '0.9375rem',
                                                outline: 'none',
                                            }}
                                        >
                                            <option value="" style={{ background: '#1e293b' }}>-- Choisir une épreuve --</option>
                                            {exams.map((exam) => (
                                                <option key={exam._id} value={exam._id} style={{ background: '#1e293b' }}>
                                                    {exam.title} ({exam.domain} - {exam.level})
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    {isLoadingRankings ? (
                                        <div style={{ textAlign: 'center', padding: '40px' }}>
                                            <RefreshCw size={30} style={{ color: '#8b5cf6', animation: 'spin 1s linear infinite', margin: '0 auto 12px' }} />
                                            <p style={{ color: '#94a3b8' }}>Chargement du classement...</p>
                                        </div>
                                    ) : errorRankings ? (
                                        <div style={{
                                            background: 'rgba(239,68,68,0.1)',
                                            border: '1px solid #ef4444',
                                            borderRadius: '10px',
                                            padding: '20px',
                                            textAlign: 'center',
                                            color: '#ef4444',
                                        }}>
                                            {errorRankings}
                                        </div>
                                    ) : rankingsData.length === 0 ? (
                                        <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                                            Aucun classement disponible pour cette épreuve
                                        </div>
                                    ) : (
                                        <div ref={rankingsPrintRef} style={{ overflowX: 'auto' }}>
                                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                                <thead>
                                                    <tr style={{ borderBottom: '1px solid rgba(139,92,246,0.3)' }}>
                                                        <th style={{ padding: '12px', textAlign: 'left', color: '#94a3b8', fontWeight: 500 }}>Rang</th>
                                                        <th style={{ padding: '12px', textAlign: 'left', color: '#94a3b8', fontWeight: 500 }}>Étudiant</th>
                                                        <th style={{ padding: '12px', textAlign: 'left', color: '#94a3b8', fontWeight: 500 }}>Matricule</th>
                                                        <th style={{ padding: '12px', textAlign: 'left', color: '#94a3b8', fontWeight: 500 }}>Score</th>
                                                        <th style={{ padding: '12px', textAlign: 'left', color: '#94a3b8', fontWeight: 500 }}>Pourcentage</th>
                                                        <th style={{ padding: '12px', textAlign: 'left', color: '#94a3b8', fontWeight: 500 }}>Bulletin</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {rankingsData.map((entry, index) => (
                                                        <motion.tr
                                                            key={entry.resultId || entry._id?.toString() || index}
                                                            initial={{ opacity: 0, x: -20 }}
                                                            animate={{ opacity: 1, x: 0 }}
                                                            transition={{ delay: index * 0.05 }}
                                                            style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
                                                        >
                                                            <td style={{ padding: '12px' }}>
                                                                <span style={{
                                                                    display: 'inline-flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'center',
                                                                    width: '28px',
                                                                    height: '28px',
                                                                    background: index === 0 ? '#fbbf24' : index === 1 ? '#94a3b8' : index === 2 ? '#b45309' : 'rgba(255,255,255,0.1)',
                                                                    color: index < 3 ? '#000' : '#94a3b8',
                                                                    borderRadius: '50%',
                                                                    fontWeight: 600,
                                                                    fontSize: '0.875rem',
                                                                }}>
                                                                    {entry.rank}
                                                                </span>
                                                            </td>
                                                            <td style={{ padding: '12px', color: '#f8fafc' }}>
                                                                {entry.studentInfo?.firstName} {entry.studentInfo?.lastName}
                                                            </td>
                                                            <td style={{ padding: '12px', color: '#94a3b8' }}>
                                                                {entry.studentInfo?.matricule || 'N/A'}
                                                            </td>
                                                            <td style={{ padding: '12px', color: '#f8fafc' }}>
                                                                {entry.score}
                                                            </td>
                                                            <td style={{ padding: '12px' }}>
                                                                <span style={{
                                                                    color: entry.percentage >= 70 ? '#10b981' : '#ef4444',
                                                                    fontWeight: 600,
                                                                }}>
                                                                    {entry.percentage}%
                                                                </span>
                                                            </td>
                                                            <td style={{ padding: '12px' }}>
                                                                {(entry.resultUrl || entry._id) ? (
                                                                    <a
                                                                        href={entry.resultUrl ? `${NODE_BACKEND_URL}${entry.resultUrl}` : `${NODE_BACKEND_URL}/api/bulletin/${entry._id}`}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        style={{
                                                                            display: 'inline-flex',
                                                                            alignItems: 'center',
                                                                            gap: '4px',
                                                                            color: '#a78bfa',
                                                                            textDecoration: 'none',
                                                                            fontWeight: 600,
                                                                            fontSize: '0.8rem',
                                                                            padding: '3px 9px',
                                                                            borderRadius: '6px',
                                                                            background: 'rgba(139,92,246,0.12)',
                                                                            border: '1px solid rgba(139,92,246,0.3)',
                                                                        }}
                                                                    >
                                                                        <Download size={12} />
                                                                        Bulletin
                                                                    </a>
                                                                ) : <span style={{ color: '#334155', fontSize: '0.78rem' }}>—</span>}
                                                            </td>
                                                        </motion.tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>
                    </motion.div>

                    {/* ══════════════════════════════════════════════════
                        CLASSEMENT PAR SESSION (toutes les épreuves)
                    ══════════════════════════════════════════════════ */}
                    <motion.div variants={itemVariants} style={{ marginTop: '40px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                            <h2 style={{ fontFamily: "'Sora', sans-serif", fontSize: '1.5rem', fontWeight: 600, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '10px', margin: 0 }}>
                                <Trophy size={24} color="#f59e0b" />
                                Classements par Session
                            </h2>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                                    {computedSessions.length} session{computedSessions.length > 1 ? 's' : ''} détectée{computedSessions.length > 1 ? 's' : ''}
                                </span>
                                <motion.button
                                    whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                                    onClick={() => setShowSessionRankings(!showSessionRankings)}
                                    style={{ padding: '8px', background: 'rgba(245,158,11,0.1)', border: '1px solid #f59e0b', borderRadius: '8px', color: '#f59e0b', cursor: 'pointer' }}
                                >
                                    {showSessionRankings ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                </motion.button>
                            </div>
                        </div>

                        {/* Explication du regroupement */}
                        {showSessionRankings && (
                            <div style={{ marginBottom: '16px', padding: '10px 14px', background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.18)', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Calendar size={14} color="#f59e0b" />
                                <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                                    Chaque session = un examen à une date précise. Deux passations du même examen à des jours différents apparaissent séparément.
                                </span>
                            </div>
                        )}

                        <AnimatePresence>
                            {showSessionRankings && (
                                <motion.div
                                    initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
                                    style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}
                                >
                                    {computedSessions.length === 0 ? (
                                        <div style={{ textAlign: 'center', padding: '40px', color: '#475569', background: 'rgba(15,23,42,0.7)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.07)' }}>
                                            Aucun résultat enregistré. Les sessions apparaîtront ici après la première composition.
                                        </div>
                                    ) : computedSessions.map(session => {
                                        const isExpanded = !!expandedSessionKeys[session.key];
                                        const { rankings, examTitle, examDomain, examLevel, dateStr, results } = session;
                                        const passed = rankings.filter(r => r.passed || r.percentage >= 50).length;
                                        const avg    = rankings.length
                                            ? (rankings.reduce((a, r) => a + (r.percentage || 0), 0) / rankings.length).toFixed(1)
                                            : '0.0';
                                        // Date lisible
                                        const dateLabel = dateStr !== 'sans-date'
                                            ? new Date(dateStr).toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })
                                            : 'Date inconnue';

                                        return (
                                            <motion.div
                                                key={session.key}
                                                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                                                style={{ background: 'rgba(15,23,42,0.75)', backdropFilter: 'blur(12px)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: '16px', overflow: 'hidden' }}
                                            >
                                                {/* ── En-tête de session ── */}
                                                <div
                                                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', cursor: 'pointer', background: isExpanded ? 'rgba(245,158,11,0.06)' : 'transparent', transition: 'background 0.2s', userSelect: 'none' }}
                                                    onClick={() => toggleSessionExpand(session.key)}
                                                >
                                                    <div style={{ flex: 1, minWidth: 0 }}>
                                                        {/* Titre + badges */}
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '5px' }}>
                                                            {/* Badge date — identifiant principal de la session */}
                                                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: 'rgba(245,158,11,0.15)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.35)', borderRadius: '999px', padding: '2px 10px', fontSize: '0.72rem', fontWeight: 700, flexShrink: 0 }}>
                                                                <Calendar size={11} />
                                                                {dateLabel}
                                                            </span>
                                                            <span style={{ fontFamily: "'Sora', sans-serif", fontWeight: 700, color: '#f1f5f9', fontSize: '0.93rem' }}>
                                                                {examTitle}
                                                            </span>
                                                            {(examDomain || examLevel) && (
                                                                <span style={{ fontSize: '0.7rem', color: '#64748b', background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: '999px', border: '1px solid rgba(255,255,255,0.07)' }}>
                                                                    {examDomain}{examDomain && examLevel ? ' · ' : ''}{examLevel}
                                                                </span>
                                                            )}
                                                        </div>
                                                        {/* Stats inline */}
                                                        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                                                            <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                                                                <span style={{ color: '#3b82f6', fontWeight: 700 }}>{results.length}</span> participant{results.length > 1 ? 's' : ''}
                                                            </span>
                                                            <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                                                                Moy. <span style={{ color: '#8b5cf6', fontWeight: 700 }}>{avg}%</span>
                                                            </span>
                                                            <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                                                                Reçus <span style={{ color: '#10b981', fontWeight: 700 }}>{passed}</span>
                                                                <span style={{ color: '#334155' }}> / </span>
                                                                Recalés <span style={{ color: '#ef4444', fontWeight: 700 }}>{results.length - passed}</span>
                                                            </span>
                                                            {rankings[0] && (
                                                                <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                                                                    🥇 <span style={{ color: '#fbbf24', fontWeight: 700 }}>{rankings[0].percentage}%</span>
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '12px', flexShrink: 0 }}>
                                                        {isExpanded && rankings.length > 0 && (
                                                            <motion.button
                                                                whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                                                                onClick={(e) => { e.stopPropagation(); printSessionRanking(session); }}
                                                                style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 14px', background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}
                                                            >
                                                                <Printer size={13} /> Imprimer PDF
                                                            </motion.button>
                                                        )}
                                                        <span style={{ color: '#f59e0b' }}>
                                                            {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* ── Tableau classement ── */}
                                                <AnimatePresence>
                                                    {isExpanded && (
                                                        <motion.div
                                                            initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                                                            style={{ overflow: 'hidden', borderTop: '1px solid rgba(255,255,255,0.06)' }}
                                                        >
                                                            <div style={{ overflowX: 'auto', padding: '16px 20px' }}>
                                                                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '560px' }}>
                                                                    <thead>
                                                                        <tr style={{ borderBottom: '2px solid rgba(245,158,11,0.25)' }}>
                                                                            {['Rang', 'Étudiant', 'Matricule', 'Score', '%', 'Bulletin'].map(h => (
                                                                                <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: '#64748b', fontWeight: 600, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                                                                            ))}
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody>
                                                                        {rankings.map((r, idx) => (
                                                                            <motion.tr
                                                                                key={r._id || idx}
                                                                                initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.035 }}
                                                                                style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', background: idx === 0 ? 'rgba(251,191,36,0.04)' : idx === 1 ? 'rgba(148,163,184,0.02)' : idx === 2 ? 'rgba(180,83,9,0.02)' : 'transparent' }}
                                                                            >
                                                                                <td style={{ padding: '9px 12px' }}>
                                                                                    <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '26px', height: '26px', borderRadius: '50%', fontWeight: 700, fontSize: '0.88rem', background: idx === 0 ? '#fbbf24' : idx === 1 ? '#94a3b8' : idx === 2 ? '#b45309' : 'rgba(255,255,255,0.06)', color: idx < 3 ? '#000' : '#94a3b8' }}>
                                                                                        {idx < 3 ? ['🥇','🥈','🥉'][idx] : r.rank}
                                                                                    </span>
                                                                                </td>
                                                                                <td style={{ padding: '9px 12px', color: '#f1f5f9', fontWeight: 500, fontSize: '0.88rem' }}>
                                                                                    {r.studentInfo?.firstName} {r.studentInfo?.lastName}
                                                                                </td>
                                                                                <td style={{ padding: '9px 12px', color: '#64748b', fontFamily: 'monospace', fontSize: '0.82rem' }}>
                                                                                    {r.studentInfo?.matricule || 'N/A'}
                                                                                </td>
                                                                                <td style={{ padding: '9px 12px', color: '#f1f5f9', fontWeight: 600 }}>
                                                                                    {r.score ?? '—'}
                                                                                </td>
                                                                                <td style={{ padding: '9px 12px' }}>
                                                                                    <span style={{ display: 'inline-block', padding: '2px 9px', borderRadius: '999px', fontWeight: 700, fontSize: '0.82rem', background: (r.percentage || 0) >= 50 ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)', color: (r.percentage || 0) >= 50 ? '#10b981' : '#ef4444', border: `1px solid ${(r.percentage || 0) >= 50 ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}` }}>
                                                                                        {r.percentage ?? 0}%
                                                                                    </span>
                                                                                </td>
                                                                                <td style={{ padding: '9px 12px' }}>
                                                                                    {r._id ? (
                                                                                        <a href={`${NODE_BACKEND_URL}/api/bulletin/${r._id}`} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#a78bfa', textDecoration: 'none', fontWeight: 600, fontSize: '0.8rem', padding: '3px 9px', borderRadius: '6px', background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.3)' }}>
                                                                                            <Download size={11} /> Bulletin
                                                                                        </a>
                                                                                    ) : <span style={{ color: '#334155', fontSize: '0.78rem' }}>—</span>}
                                                                                </td>
                                                                            </motion.tr>
                                                                        ))}
                                                                    </tbody>
                                                                </table>
                                                            </div>
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </motion.div>
                                        );
                                    })}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>

            </main>

            <Toaster
                position="top-right"
                toastOptions={{
                    style: {
                        background: '#1e293b',
                        color: '#f8fafc',
                        border: '1px solid #3b82f6',
                        borderRadius: '10px',
                        padding: '12px 16px',
                        fontSize: '0.875rem',
                    },
                    success: {
                        style: { border: '1px solid #10b981' },
                        iconTheme: { primary: '#10b981', secondary: '#fff' },
                    },
                    error: {
                        style: { border: '1px solid #ef4444' },
                        iconTheme: { primary: '#ef4444', secondary: '#fff' },
                    },
                }}
            />

            <style>{`
                @font-face {
  font-family: 'Sora';
  font-style: normal;
  font-weight: 400 800;
  src: local('Segoe UI'), local('Ubuntu'), local('Cantarell'), local('Arial');
}
@font-face {
  font-family: 'DM Sans';
  font-style: normal;
  font-weight: 400 700;
  src: local('Segoe UI'), local('Ubuntu'), local('Cantarell'), local('Arial');
}
                @keyframes spin { to { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
};

export default ReportsPage;