import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Save, Copy, FileText, Check, AlertCircle, Sparkles, Book, X } from 'lucide-react';
import { caseService } from '../../../services/caseService';
import { reportService } from '../../../services/reportService';
import ImageViewer from '../../anatomy/components/ImageViewer'; // Reuse existing viewer from anatomy
import DictationControl from '../../cases/components/DictationControl'; // Reuse Dictation
import RichTextEditor from '../../../components/RichTextEditor'; // Reuse Editor
import { httpsCallable, getFunctions } from 'firebase/functions';

import StructuredReportEditor from '../components/StructuredReportEditor';

import FloatingWindow from '../../../components/FloatingWindow';
import VocabularyManager from '../components/VocabularyManager';
import ReportChecklist from '../components/ReportChecklist';
import { userService } from '../../../services/userService';

const ReportWorkspace = () => {
    const { caseId } = useParams();
    const navigate = useNavigate();
    const { t, i18n } = useTranslation();
    const [caseData, setCaseData] = useState(null);
    const [loading, setLoading] = useState(true);

    // Report Data (Structured)
    const [reportData, setReportData] = useState({
        exam: '',
        findings: '',
        impression: ''
    });

    const [savedReports, setSavedReports] = useState([]);
    const [vocabulary, setVocabulary] = useState([]);
    const [voiceTraining, setVoiceTraining] = useState([]); // New state for voice training
    const [showVocabManager, setShowVocabManager] = useState(false);

    // UI States
    const [activeTab, setActiveTab] = useState('editor'); // 'editor' | 'history'
    const [isSaving, setIsSaving] = useState(false);
    const [showReportWindow, setShowReportWindow] = useState(true);
    const [showChecklist, setShowChecklist] = useState(false);

    useEffect(() => {
        const loadCase = async () => {
            if (!caseId) return;
            try {
                const data = await caseService.getCaseById(caseId);
                setCaseData(data);

                // Set default Exam Title if empty
                const isEnglish = i18n.language?.startsWith('en');
                const title = (isEnglish && data.title_en) ? data.title_en : data.title;
                setReportData(prev => ({ ...prev, exam: title || '' }));

                // Load user's previous reports for this case
                const reports = await reportService.getUserReportsForCase(caseId);
                setSavedReports(reports);

                // Load Vocabulary and Voice Training
                const [userVocab, globalVocab, userVoice] = await Promise.all([
                    userService.getUserVocabulary(),
                    userService.getGlobalVocabulary(),
                    userService.getUserVoiceTraining() // Fetch user's voice training examples
                ]);

                // Combine and deduplicate vocabulary
                const combined = [...new Set([...(userVocab || []), ...(globalVocab || [])])];
                setVocabulary(combined);
                setVoiceTraining(userVoice || []); // Set voice training state
            } catch (error) {
                console.error("Error loading case:", error);
            } finally {
                setLoading(false);
            }
        };
        loadCase();
    }, [caseId]);

    const handlePolishedReport = async (transcriptText, audioBase64) => {
        // We allow empty transcript if we have audio
        if ((!transcriptText || typeof transcriptText !== 'string') && !audioBase64) return;

        try {
            const functions = getFunctions();
            const polishRadiologyReport = httpsCallable(functions, 'polishRadiologyReport');

            console.log("Transcript to polish:", transcriptText);
            console.log("Audio provided:", audioBase64 ? "Yes (Base64)" : "No");

            const result = await polishRadiologyReport({
                transcript: transcriptText,
                audioBase64: audioBase64, // Pass audio
                language: 'es',
                vocabulary: vocabulary,
                voiceTraining: voiceTraining
            });

            console.log("AI Polish Result:", result.data);
            const data = result.data;

            if (typeof data === 'string') {
                setReportData(prev => ({ ...prev, findings: data }));
            } else if (data && typeof data === 'object') {
                setReportData(prev => {
                    let newExam = caseData.title || data.exam || prev.exam;
                    let newFindings = data.findings || data.Findings || data.report || prev.findings;
                    let newImpression = data.impression || data.Impression || prev.impression;

                    // Helper to convert plain text with \n to Tiptap HTML
                    const formatToHtml = (text) => {
                        if (!text) return '';
                        // If it already looks like HTML, don't double wrap
                        if (text.includes('<p>') || text.includes('<br>')) return text;
                        return text
                            .trim()
                            .split(/\n\r?|\r\n?/)
                            .filter(line => line.trim())
                            .map(line => `<p>${line.trim()}</p>`)
                            .join('');
                    };

                    // SMART SPLIT: If findings contains marker, force split if impression is low-quality or identical
                    const splitMarkers = [
                        /\*?\*?IMPRESIÓN[:\s]\*?\*?/i,
                        /\*?\*?CONCLUSIÓN[:\s]\*?\*?/i,
                        /\*?\*?IMPRESSION[:\s]\*?\*?/i,
                        /\*?\*?SUMMARY[:\s]\*?\*?/i
                    ];

                    for (const marker of splitMarkers) {
                        const match = newFindings.match(marker);
                        if (match) {
                            const parts = newFindings.split(marker);
                            // If index 1 exists, we have a split
                            if (parts.length > 1 && parts[1].trim().length > 0) {
                                newFindings = parts[0].trim();
                                // Only overwrite impression if the current one is shorter or AI didn't provide it separately
                                if (!newImpression || newImpression.length < 5 || newFindings.includes(newImpression)) {
                                    newImpression = parts[1].trim();
                                }
                                break;
                            }
                        }
                    }

                    // CLEANUP: Remove labels and Markdown artifacts
                    const cleanupLabel = (text) => {
                        if (!text) return '';
                        let cleaned = text
                            .replace(/^\*?\*?(INFORME RADIOLÓGICO|RADIOLOGICAL REPORT)[:\s]*\*?\*?/i, '')
                            .replace(/^\*?\*?(HALLAZGOS|FINDINGS)[:\s]*\*?\*?/i, '')
                            .replace(/^\*?\*?(IMPRESIÓN|IMPRESSION|CONCLUSIÓN|CONCLUSION)[:\s]*\*?\*?/i, '')
                            .replace(/^[*•\s]+/g, '')
                            .replace(/\s+[*•]\s+/g, ' ')
                            .replace(/\*?\*/g, '')
                            .trim();

                        return formatToHtml(cleaned);
                    };

                    newFindings = cleanupLabel(newFindings);
                    newImpression = cleanupLabel(newImpression);

                    return {
                        exam: newExam,
                        findings: newFindings,
                        impression: newImpression
                    };
                });
            }

            setActiveTab('editor');
        } catch (error) {
            console.error("Error enhancing report:", error);
            alert(t('training.workspace.aiError'));
            // Fallback to raw text
            setReportData(prev => ({ ...prev, findings: transcriptText }));
        }
    };

    const handleSaveReport = async () => {
        if (!reportData.findings && !reportData.impression) return;

        setIsSaving(true);
        try {
            await reportService.saveReport({
                caseId,
                caseTitle: caseData?.title,
                content: `EXAMEN: ${reportData.exam}\n\nHALLAZGOS:\n${reportData.findings}\n\nIMPRESIÓN:\n${reportData.impression}`, // Flat backup
                structuredReport: reportData,
                originalTranscript: '',
            });

            // Refresh list
            const reports = await reportService.getUserReportsForCase(caseId);
            setSavedReports(reports);

            alert(t('training.workspace.saveSuccess'));
        } catch (error) {
            console.error("Error saving report:", error);
            alert(t('training.workspace.saveError'));
        } finally {
            setIsSaving(false);
        }
    };

    if (loading) {
        return <div className="flex items-center justify-center h-screen bg-gray-900 text-white">{t('training.workspace.loading')}</div>;
    }

    if (!caseData) {
        return <div className="text-white text-center pt-20">{t('training.workspace.caseNotFound')}</div>;
    }

    return (
        <div className="h-[calc(100vh-64px)] overflow-hidden flex flex-col bg-gray-900 text-white">
            {/* Header Toolbar */}
            <div className="h-16 bg-gray-800 border-b border-gray-700 flex items-center justify-between px-6 shrink-0">
                <div className="flex items-center space-x-4">
                    <button
                        onClick={() => navigate('/report-training')}
                        className="p-2 hover:bg-gray-700 rounded-lg text-gray-400 hover:text-white transition-colors"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h2 className="font-bold text-lg text-gray-100">
                            {(i18n.language?.startsWith('en') && caseData.title_en) ? caseData.title_en : (caseData.title || t('common.untitled'))}
                        </h2>
                        <span className="text-xs text-gray-400 font-mono hidden md:inline-block">
                            {caseData.modality ? t(`cases.modality.${caseData.modality}`) : 'RX'} • {caseData.difficulty ? t(`cases.difficulty.${caseData.difficulty}`) : 'Normal'} • ID: {caseId}
                        </span>
                    </div>
                </div>

                <div className="flex items-center space-x-3">
                    <button
                        onClick={() => setShowReportWindow(!showReportWindow)}
                        className={`px-3 py-1.5 rounded text-xs font-bold transition-colors ${showReportWindow ? 'bg-indigo-600 text-white' : 'bg-gray-700 text-gray-300'}`}
                    >
                        {showReportWindow ? t('training.workspace.hideReport') : t('training.workspace.showReport')}
                    </button>
                    <div className="hidden md:flex items-center px-3 py-1 bg-blue-900/30 border border-blue-500/30 rounded-full text-xs text-blue-300">
                        <Sparkles size={12} className="mr-2" />
                        {t('training.workspace.trainingMode')}
                    </div>
                </div>
            </div>

            {/* Main Content: Full Screen Image Viewer */}
            <div className="flex-1 flex overflow-hidden relative">
                <div className="w-full h-full bg-black">
                    <ImageViewer
                        images={caseData.images || []}
                        imageStacks={caseData.imageStacks || []}
                        modality={caseData.modality}
                    />
                </div>

                {/* Floating Report Window */}
                <FloatingWindow
                    title={t('training.workspace.editor')}
                    isOpen={showReportWindow}
                    onClose={() => setShowReportWindow(false)}
                >
                    <div className="flex flex-col h-full w-full bg-gray-900 text-white relative">

                        {/* Clinical Context Helper + Utils */}
                        <div className="p-3 border-b border-gray-800 bg-gray-800/30 flex justify-between items-start">
                            <div className="text-xs text-gray-400 max-w-[70%]">
                                <span className="font-bold text-gray-300">{t('training.workspace.history')}:</span> {(i18n.language?.startsWith('en') && caseData.history_en) ? caseData.history_en : (caseData.history || caseData.clinicalHistory || t('training.dashboard.noDescription'))}
                            </div>
                            <button
                                onClick={() => setShowVocabManager(true)}
                                className="flex items-center space-x-1 px-2 py-1 bg-gray-800 hover:bg-gray-700 rounded border border-gray-600 transition-colors text-xs text-gray-300"
                                title={t('training.workspace.vocabulary')}
                            >
                                <Book size={12} />
                                <span>{t('training.workspace.vocabulary')}</span>
                            </button>

                            {caseData.checklist && caseData.checklist.length > 0 && (
                                <button
                                    onClick={() => setShowChecklist(!showChecklist)}
                                    className={`flex items-center space-x-1 px-2 py-1 rounded border transition-colors text-xs font-bold ${showChecklist
                                        ? 'bg-green-600 border-green-500 text-white'
                                        : 'bg-gray-800 hover:bg-gray-700 border-gray-600 text-gray-300'}`}
                                    title={t('training.workspace.checklist')}
                                >
                                    <Check size={12} />
                                    <span>{t('training.workspace.checklist')}</span>
                                </button>
                            )}
                        </div>

                        {showVocabManager && (
                            <VocabularyManager
                                onClose={async () => {
                                    setShowVocabManager(false);
                                    // Reload both vocabularies
                                    const [userVocab, globalVocab] = await Promise.all([
                                        userService.getUserVocabulary(),
                                        userService.getGlobalVocabulary()
                                    ]);
                                    const combined = [...new Set([...(userVocab || []), ...(globalVocab || [])])];
                                    setVocabulary(combined);
                                }}
                            />
                        )}

                        {/* Dictation Control */}
                        <div className="p-4 border-b border-gray-800 relative">
                            <DictationControl onFinalReport={handlePolishedReport} />
                        </div>

                        {/* Tabs */}
                        <div className="flex border-b border-gray-800">
                            <button
                                onClick={() => setActiveTab('editor')}
                                className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider transition-colors ${activeTab === 'editor'
                                    ? 'border-b-2 border-indigo-500 text-indigo-400 bg-indigo-900/10'
                                    : 'text-gray-500 hover:text-gray-300'
                                    }`}
                            >
                                {t('training.workspace.editor')}
                            </button>
                            <button
                                onClick={() => setActiveTab('history')}
                                className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider transition-colors ${activeTab === 'history'
                                    ? 'border-b-2 border-indigo-500 text-indigo-400 bg-indigo-900/10'
                                    : 'text-gray-500 hover:text-gray-300'
                                    }`}
                            >
                                {t('training.workspace.history')}
                            </button>
                        </div>

                        {/* Content Area */}
                        <div className="flex-1 min-h-0 relative">
                            {/* Checklist Side Panel Overlay */}
                            {showChecklist && caseData.checklist && (
                                <div className="absolute top-0 right-0 bottom-0 w-64 z-40 bg-gray-900/95 backdrop-blur-sm shadow-2xl border-l border-gray-700 flex flex-col animate-in slide-in-from-right duration-300">
                                    <div className="flex justify-end p-2 border-b border-gray-800">
                                        <button
                                            onClick={() => setShowChecklist(false)}
                                            className="p-1.5 hover:bg-gray-800 rounded-full text-gray-400 hover:text-white transition-colors"
                                        >
                                            <X size={16} />
                                        </button>
                                    </div>
                                    <div className="flex-1 overflow-hidden">
                                        <ReportChecklist
                                            checklist={caseData.checklist}
                                            reportContent={`${reportData.findings} ${reportData.impression}`}
                                        />
                                    </div>
                                </div>
                            )}

                            <div className="h-full overflow-y-auto custom-scrollbar">
                                {activeTab === 'editor' ? (
                                    <div className="h-full flex flex-col">
                                        <div className="flex-1">
                                            <StructuredReportEditor
                                                data={reportData}
                                                onChange={setReportData}
                                                lockTitle={true}
                                            />
                                        </div>
                                        <div className="p-3 border-t border-gray-800 bg-gray-800 flex justify-end">
                                            <button
                                                onClick={handleSaveReport}
                                                disabled={isSaving}
                                                className="flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-sm font-bold shadow-lg"
                                            >
                                                {isSaving ? t('training.workspace.saving') : <><Save size={16} className="mr-2" /> {t('training.workspace.saveBtn')}</>}
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="p-4 space-y-3">
                                        {savedReports.length === 0 && (
                                            <div className="text-center py-10 text-gray-500 text-sm">
                                                {t('training.workspace.noCases')}
                                            </div>
                                        )}
                                        {savedReports.map((repo) => (
                                            <div key={repo.id} className="bg-gray-800 p-3 rounded border border-gray-700 cursor-pointer hover:border-indigo-500"
                                                onClick={() => {
                                                    if (repo.structuredReport) setReportData(repo.structuredReport);
                                                    else setReportData({ exam: '', findings: repo.content, impression: '' });
                                                    setActiveTab('editor');
                                                }}
                                            >
                                                <div className="text-xs text-gray-400 mb-1">{repo.createdAt?.toLocaleString()}</div>
                                                <div className="font-bold text-sm text-white">{repo.caseTitle || t('common.untitled')}</div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </FloatingWindow>
            </div>
        </div>
    );
};

export default ReportWorkspace;
