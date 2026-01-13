import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { caseService } from '../../../services/caseService';
import ImageViewer from '../../anatomy/components/ImageViewer';
import CaseQuestions from './CaseQuestions';
import DiagnosisForm from './DiagnosisForm';
import { ArrowLeft, AlertCircle, Brain } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import i18n from '../../../i18n';
import QuizModule from '../../quiz/QuizModule';

const CaseDetail = () => {
    const { caseId } = useParams();
    const [caseItem, setCaseItem] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isDiagnosisSubmitted, setIsDiagnosisSubmitted] = useState(false);
    const [areQuestionsAnswered, setAreQuestionsAnswered] = useState(false);
    const [showQuiz, setShowQuiz] = useState(false);
    const { t } = useTranslation();

    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchCase = async () => {
            try {
                const foundCase = await caseService.getCaseById(caseId);
                setCaseItem(foundCase);

                // --- ACTIVITY LOG INJECTION ---
                if (foundCase) {
                    try {
                        const { activityLogService } = await import('../../../services/activityLogService');
                        await activityLogService.logActivity('VIEW_CASE', {
                            caseId: caseId,
                            title: foundCase.title
                        });
                    } catch (e) {
                        console.error('Failed to log view case:', e);
                    }
                }
                // ------------------------------
            } catch (err) {
                console.error("Error fetching case:", err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchCase();
    }, [caseId]);

    if (loading) return <div>{t('cases.loading')}</div>;

    if (error) {
        return (
            <div className="text-center py-12">
                <AlertCircle className="mx-auto h-12 w-12 text-red-500" />
                <h3 className="mt-2 text-lg font-medium text-red-900">Error loading case</h3>
                <p className="mt-1 text-sm text-red-500">{error}</p>
                <div className="mt-6">
                    <Link to="/cases" className="text-indigo-600 hover:text-indigo-500">
                        {t('cases.back')}
                    </Link>
                </div>
            </div>
        );
    }

    if (!caseItem) {
        return (
            <div className="text-center py-12">
                <AlertCircle className="mx-auto h-12 w-12 text-red-500" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">{t('cases.notFound')}</h3>
                <div className="mt-6">
                    <Link to="/cases" className="text-indigo-600 hover:text-indigo-500">
                        {t('cases.back')}
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black text-gray-100 flex flex-col">
            {/* Immersive Header */}
            <div className="bg-gray-900/50 backdrop-blur-md border-b border-gray-800 sticky top-0 z-40 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center space-x-4">
                    <Link to="/cases" className="p-2 rounded-full hover:bg-gray-800 text-gray-400 hover:text-white transition-colors">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div>
                        <h1 className="text-xl font-bold text-white tracking-tight">
                            {(caseItem.titleKey && t(caseItem.titleKey)) ||
                                (i18n.language === 'en' && caseItem.title_en) ||
                                caseItem.title}
                        </h1>
                        <div className="flex items-center space-x-3 text-xs text-gray-400 mt-1">
                            <span className="uppercase tracking-wider font-semibold">{t(`cases.modality.${caseItem.modality}`)}</span>
                            <span className="w-1 h-1 bg-gray-600 rounded-full"></span>
                            <span className={`${caseItem.difficulty === 'Beginner' ? 'text-green-400' :
                                caseItem.difficulty === 'Intermediate' ? 'text-yellow-400' :
                                    'text-red-400'
                                }`}>
                                {t(`cases.difficulty.${caseItem.difficulty}`)}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-0 overflow-hidden h-[calc(100vh-80px)]">
                {/* Left Column - Image (Main Stage) */}
                <div className="lg:col-span-8 bg-black relative flex items-center justify-center border-r border-gray-800">
                    <div className="w-full h-full p-4">
                        <ImageViewer
                            images={caseItem.images || (caseItem.image ? [caseItem.image] : [])}
                            alt={caseItem.title || t(caseItem.titleKey)}
                        />
                    </div>
                </div>

                {/* Right Column - Info & Tools (Sidebar) */}
                <div className="lg:col-span-4 bg-gray-900 border-l border-gray-800 overflow-y-auto custom-scrollbar">
                    <div className="p-6 space-y-6">
                        {/* History Section */}
                        <div className="bg-gray-800/50 rounded-xl p-5 border border-gray-700/50 shadow-inner">
                            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center">
                                <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full mr-2"></span>
                                {t('cases.history')}
                            </h2>
                            <p className="text-gray-300 leading-relaxed text-sm">
                                {(caseItem.historyKey && t(caseItem.historyKey)) ||
                                    (i18n.language === 'en' && caseItem.history_en) ||
                                    caseItem.history}
                            </p>
                        </div>

                        {/* Diagnosis Form */}
                        <DiagnosisForm
                            correctDiagnosis={(caseItem.correctDiagnosisKey && t(caseItem.correctDiagnosisKey)) ||
                                (i18n.language === 'en' && caseItem.correctDiagnosis_en) ||
                                caseItem.correctDiagnosis}
                            caseData={caseItem}
                            onComplete={() => setIsDiagnosisSubmitted(true)}
                        />

                        {/* Learning Objectives (Conditional) */}
                        {isDiagnosisSubmitted && areQuestionsAnswered && (
                            (() => {
                                const hasEnglish = caseItem.learningObjectives_en && caseItem.learningObjectives_en.some(o => o && o.trim());
                                const objectives = (i18n.language === 'en' && hasEnglish) ? caseItem.learningObjectives_en : caseItem.learningObjectives;
                                return objectives && objectives.length > 0 && objectives.some(o => o);
                            })()
                        ) && (
                                <div className="bg-blue-900/20 rounded-xl p-4 border border-blue-500/30">
                                    <h3 className="text-sm font-medium text-blue-300 mb-2">{t('cases.objectives.title')}</h3>
                                    <ul className="list-disc list-inside text-sm text-blue-200 space-y-1">
                                        {(() => {
                                            const hasEnglish = caseItem.learningObjectives_en && caseItem.learningObjectives_en.some(o => o && o.trim());
                                            const objectives = (i18n.language === 'en' && hasEnglish) ? caseItem.learningObjectives_en : caseItem.learningObjectives;
                                            return objectives.map((objective, index) => (
                                                objective && <li key={index}>{objective}</li>
                                            ));
                                        })()}
                                    </ul>
                                </div>
                            )}

                        {/* AI Quiz Trigger */}
                        {isDiagnosisSubmitted && (
                            <div className="bg-indigo-900/20 rounded-xl p-5 border border-indigo-500/30 text-center">
                                <div className="flex justify-center mb-3">
                                    <div className="p-3 bg-indigo-500/20 rounded-full">
                                        <Brain className="w-8 h-8 text-indigo-400" />
                                    </div>
                                </div>
                                <h3 className="text-lg font-bold text-white mb-2">
                                    Desafío de Conocimiento
                                </h3>
                                <p className="text-sm text-indigo-200 mb-4">
                                    Pon a prueba lo aprendido con 10 preguntas generadas por IA sobre este caso.
                                </p>
                                <button
                                    onClick={() => setShowQuiz(true)}
                                    className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm transition-colors"
                                >
                                    <Brain className="w-4 h-4 mr-2" />
                                    Iniciar Quiz con IA
                                </button>
                            </div>
                        )}

                        {/* Questions */}
                        {((i18n.language === 'en' && caseItem.questions_en) || caseItem.questions) &&
                            (((i18n.language === 'en' && caseItem.questions_en) || caseItem.questions).length > 0) && (
                                <div className="mt-8 pt-6 border-t border-gray-800">
                                    <CaseQuestions
                                        questions={(i18n.language === 'en' && caseItem.questions_en) ? caseItem.questions_en : caseItem.questions}
                                        onAllQuestionsAnswered={() => setAreQuestionsAnswered(true)}
                                    />
                                </div>
                            )}
                    </div>
                </div>
            </div>

            {/* Quiz Modal */}
            {showQuiz && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <QuizModule
                        diagnosis={(caseItem.correctDiagnosisKey && t(caseItem.correctDiagnosisKey)) ||
                            (i18n.language === 'en' && caseItem.correctDiagnosis_en) ||
                            caseItem.correctDiagnosis}
                        difficulty={caseItem.difficulty}
                        onClose={() => setShowQuiz(false)}
                    />
                </div>
            )}
        </div>
    );
};

export default CaseDetail;
