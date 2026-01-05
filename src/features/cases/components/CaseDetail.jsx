import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { caseService } from '../../../services/caseService';
import ImageViewer from '../../anatomy/components/ImageViewer';
import CaseQuestions from './CaseQuestions';
import DiagnosisForm from './DiagnosisForm';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import i18n from '../../../i18n';

const CaseDetail = () => {
    const { caseId } = useParams();
    const [caseItem, setCaseItem] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isDiagnosisSubmitted, setIsDiagnosisSubmitted] = useState(false);
    const [areQuestionsAnswered, setAreQuestionsAnswered] = useState(false);
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
        <div className="max-w-5xl mx-auto">
            <div className="mb-6">
                <Link to="/cases" className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700">
                    <ArrowLeft className="w-4 h-4 mr-1" />
                    {t('cases.back')}
                </Link>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                {/* Left Column - Image (Sticky) */}
                <div className="lg:col-span-7 lg:sticky lg:top-6 space-y-4">
                    <div className="bg-white rounded-lg shadow overflow-hidden">
                        <div className="p-1">
                            <ImageViewer
                                images={caseItem.images || (caseItem.image ? [caseItem.image] : [])}
                                alt={caseItem.title || t(caseItem.titleKey)}
                            />
                        </div>
                    </div>
                </div>

                {/* Right Column - Info & Tools (Scrollable) */}
                <div className="lg:col-span-5 space-y-6">
                    {/* Case Header */}
                    <div className="bg-white rounded-lg shadow p-6 border-l-4 border-indigo-500">
                        <h1 className="text-2xl font-bold text-gray-900 mb-2">
                            {(caseItem.titleKey && t(caseItem.titleKey)) ||
                                (i18n.language === 'en' && caseItem.title_en) ||
                                caseItem.title}
                        </h1>
                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                            <span className="bg-gray-100 px-2 py-1 rounded font-medium text-gray-700">{t(`cases.modality.${caseItem.modality}`)}</span>
                            <span className={`px-2 py-1 rounded font-medium ${caseItem.difficulty === 'Beginner' ? 'bg-green-100 text-green-800' :
                                caseItem.difficulty === 'Intermediate' ? 'bg-yellow-100 text-yellow-800' :
                                    'bg-red-100 text-red-800'
                                }`}>
                                {t(`cases.difficulty.${caseItem.difficulty}`)}
                            </span>
                        </div>
                    </div>

                    {/* History Section */}
                    <div className="bg-white rounded-lg shadow p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-2 flex items-center">
                            <span className="w-1 h-6 bg-indigo-500 rounded mr-2"></span>
                            {t('cases.history')}
                        </h2>
                        <p className="text-gray-700 leading-relaxed">
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
                            <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
                                <h3 className="text-sm font-medium text-blue-900 mb-2">{t('cases.objectives.title')}</h3>
                                <ul className="list-disc list-inside text-sm text-blue-800 space-y-1">
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
                </div>
            </div>

            {/* Questions - Full Width at Bottom */}
            {((i18n.language === 'en' && caseItem.questions_en) || caseItem.questions) &&
                (((i18n.language === 'en' && caseItem.questions_en) || caseItem.questions).length > 0) && (
                    <div className="mt-8">
                        <CaseQuestions
                            questions={(i18n.language === 'en' && caseItem.questions_en) ? caseItem.questions_en : caseItem.questions}
                            onAllQuestionsAnswered={() => setAreQuestionsAnswered(true)}
                        />
                    </div>
                )}
        </div>
    );
};

export default CaseDetail;
