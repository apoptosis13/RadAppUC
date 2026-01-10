import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle, XCircle, AlertCircle, Info, Hash, Sparkles, Loader2 } from 'lucide-react';
import { validateDiagnosis, validateFindings } from '../../../utils/validationUtils';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../../../config/firebase';

const DiagnosisForm = ({ correctDiagnosis, caseData, onComplete }) => {
    const { t, i18n } = useTranslation();
    const [diagnosis, setDiagnosis] = useState('');
    const [findings, setFindings] = useState('');
    const [submitted, setSubmitted] = useState(false);
    const [isCorrect, setIsCorrect] = useState(false);
    const [findingsResult, setFindingsResult] = useState(null);
    const [isAnalyzingAI, setIsAnalyzingAI] = useState(false);

    React.useEffect(() => {
        const pingAI = httpsCallable(functions, 'pingAI');
        pingAI().then(res => console.log("AI Ping Result:", res.data))
            .catch(err => console.error("AI Ping Failed:", err));
    }, []);

    // Determine search query for references
    // Priority:
    // 1. Explicit English diagnosis provided by instructor (caseData.englishDiagnosis)
    // 2. Standard translation key (if it matches the current diagnosis)
    // 3. Fallback to current diagnosis (edited but no English term provided)

    let referenceQuery = correctDiagnosis;

    if (caseData?.correctDiagnosis_en) {
        referenceQuery = caseData.correctDiagnosis_en;
    } else if (caseData?.correctDiagnosisKey && correctDiagnosis === t(caseData.correctDiagnosisKey)) {
        referenceQuery = i18n.t(caseData.correctDiagnosisKey, { lng: 'en' });
    }

    const expectedFindingsText = (caseData.findingsKey && t(caseData.findingsKey)) ||
        (i18n.language === 'en' && caseData.findings_en) ||
        caseData.findings;

    const handleSubmit = (e) => {
        e.preventDefault();

        // Smart Diagnosis Validation
        const aliases = caseData?.diagnosisAliases || [];
        // Include the main correct diagnosis AND the English version in the aliases check
        const allValidDiagnoses = [
            correctDiagnosis,
            caseData?.correctDiagnosis_en,
            ...aliases
        ].filter(Boolean); // Remove null/undefined

        const isMatch = validateDiagnosis(diagnosis, allValidDiagnoses);

        // Smart Findings Validation
        const result = validateFindings(findings, caseData?.findingKeywords || [], expectedFindingsText);

        setIsCorrect(isMatch);
        setFindingsResult(result);
        setSubmitted(true);

        if (onComplete) onComplete(isMatch);
    };

    const handleAIAnalysis = async () => {
        setIsAnalyzingAI(true);
        try {
            // Get ID Token for manual HTTP auth
            const idToken = await auth.currentUser.getIdToken();
            const response = await fetch('https://us-central1-radiology-app-v2.cloudfunctions.net/analyzeFindingsAI_http', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${idToken}`
                },
                body: JSON.stringify({
                    data: {
                        userFindings: findings,
                        expertFindings: expectedFindingsText,
                        keywords: caseData?.findingKeywords || []
                    }
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || response.statusText);
            }

            const result = await response.json();

            if (result.data) {
                if (result.data.error) {
                    alert(`Error de IA: ${result.data.message || result.data.error}\n\n${result.data.details || ''}`);
                    return;
                }
                setFindingsResult(prev => ({
                    ...prev,
                    ...result.data,
                    isAI: true
                }));
            }
        } catch (error) {
            console.error("AI Analysis Error:", error);
            const errorMsg = error.message || "Error desconocido";
            alert(`No se pudo realizar el análisis por IA: ${errorMsg}`);
        } finally {
            setIsAnalyzingAI(false);
        }
    };

    return (
        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('cases.diagnosis.title')}</h3>

            {!submitted ? (
                <form onSubmit={handleSubmit} className="space-y-4">


                    <div>
                        <label htmlFor="diagnosis" className="block text-sm font-medium text-gray-700">
                            {t('cases.diagnosis.primaryDiagnosis')}
                        </label>
                        <input
                            type="text"
                            id="diagnosis"
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                            placeholder={t('cases.diagnosis.diagnosisPlaceholder')}
                            value={diagnosis}
                            onChange={(e) => setDiagnosis(e.target.value)}
                            required
                        />
                    </div>

                    <div>
                        <label htmlFor="findings" className="block text-sm font-medium text-gray-700">
                            {t('cases.diagnosis.findings', 'Hallazgos')}
                        </label>
                        <textarea
                            id="findings"
                            rows={4}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                            placeholder={t('cases.diagnosis.findingsPlaceholder', 'Describe los hallazgos observados...')}
                            value={findings}
                            onChange={(e) => setFindings(e.target.value)}
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                        {t('cases.diagnosis.submit')}
                    </button>
                </form>
            ) : (
                <div className="space-y-4">
                    {/* Diagnosis Result */}
                    <div className={`text-center p-4 rounded-lg ${isCorrect ? 'bg-green-50' : 'bg-red-50'}`}>
                        <div className="flex justify-center mb-2">
                            {isCorrect ? (
                                <CheckCircle className="w-12 h-12 text-green-500" />
                            ) : (
                                <XCircle className="w-12 h-12 text-red-500" />
                            )}
                        </div>
                        <h4 className={`text-lg font-medium ${isCorrect ? 'text-green-900' : 'text-red-900'}`}>
                            {isCorrect ? t('cases.diagnosis.correct') : t('cases.diagnosis.incorrect')}
                        </h4>
                        <p className="mt-2 text-sm text-gray-600">
                            {t('cases.diagnosis.correctIs')} <span className="font-bold">{correctDiagnosis}</span>
                        </p>
                    </div>

                    {/* Findings Validation Result */}
                    {findingsResult && (
                        <div className="bg-white p-4 rounded-lg border border-gray-200">
                            <div className="flex items-center justify-between mb-3">
                                <h4 className="text-sm font-bold text-gray-900 border-b-2 border-indigo-500 pb-1">
                                    {t('cases.feedback.findingsAnalysis', 'Análisis de Hallazgos')}
                                </h4>
                                <div className="flex items-center space-x-2">
                                    <Hash className="w-4 h-4 text-indigo-500" />
                                    <span className="text-xs font-bold text-indigo-700">
                                        {Math.round(findingsResult.score * 100)}% Match
                                    </span>
                                </div>
                            </div>

                            {/* AI Review Button (only if not already AI reviewed) */}
                            {!findingsResult.isAI && (
                                <button
                                    onClick={handleAIAnalysis}
                                    disabled={isAnalyzingAI}
                                    className="mb-4 w-full flex items-center justify-center space-x-2 py-2 px-4 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold border border-indigo-200 transition-colors disabled:opacity-50"
                                >
                                    {isAnalyzingAI ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            <span>Analizando con Gemini...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Sparkles className="w-4 h-4" />
                                            <span>Solicitar Revisión con IA (Gemini)</span>
                                        </>
                                    )}
                                </button>
                            )}

                            {findingsResult.isAI && (
                                <div className="mb-4 p-2 bg-indigo-900 text-white rounded text-[10px] uppercase font-bold tracking-widest text-center flex items-center justify-center space-x-2">
                                    <Sparkles className="w-3 h-3" />
                                    <span>Revisión por Inteligencia Artificial</span>
                                </div>
                            )}

                            <div className="space-y-4">
                                {findingsResult.found?.length > 0 && (
                                    <div className="bg-green-50/50 p-3 rounded-lg border border-green-100">
                                        <div className="flex items-center text-green-700 text-xs font-bold mb-2 uppercase tracking-wider">
                                            <CheckCircle className="w-4 h-4 mr-1" />
                                            {t('cases.feedback.detectedConcepts', 'Conceptos Detectados')}
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {findingsResult.found.map((kw, idx) => (
                                                <span key={idx} className="px-2 py-0.5 bg-green-100 text-green-800 rounded text-xs font-medium border border-green-200">
                                                    {kw}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {findingsResult.missing?.length > 0 && (
                                    <div className="bg-amber-50/50 p-3 rounded-lg border border-amber-100">
                                        <div className="flex items-center text-amber-700 text-xs font-bold mb-2 uppercase tracking-wider">
                                            <AlertCircle className="w-4 h-4 mr-1" />
                                            {t('cases.feedback.missingConcepts', 'Conceptos Omitidos')}
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {findingsResult.missing.map((kw, idx) => (
                                                <span key={idx} className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded text-xs font-medium border border-amber-200">
                                                    {kw}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {findingsResult.feedback && (
                                    <div className="bg-indigo-50 p-3 rounded-lg border border-indigo-100">
                                        <div className="flex items-center text-indigo-700 text-xs font-bold mb-1 uppercase tracking-wider">
                                            <Sparkles className="w-4 h-4 mr-1 transition-pulse" />
                                            {t('cases.feedback.aiComment', 'Comentario de la IA')}
                                        </div>
                                        <p className="text-sm text-indigo-900 font-medium italic">
                                            "{findingsResult.feedback}"
                                        </p>
                                    </div>
                                )}

                                <div className="mt-4 pt-4 border-t border-gray-100">
                                    <h5 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 flex items-center">
                                        <Info className="w-3 h-3 mr-1" />
                                        {t('cases.feedback.expectedDescription', 'Descripción Esperada')}
                                    </h5>
                                    <p className="text-sm text-gray-700 leading-relaxed italic bg-gray-50 p-3 rounded-lg border border-gray-100">
                                        {expectedFindingsText}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* References Section */}
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                        <h4 className="text-sm font-medium text-gray-900 mb-2">Referencias y Lectura Adicional</h4>
                        <div className="flex flex-wrap gap-3">
                            <a
                                href={`https://radiopaedia.org/search?q=${encodeURIComponent(referenceQuery)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50"
                            >
                                Radiopaedia
                            </a>
                            <a
                                href={`https://scholar.google.com/scholar?q=${encodeURIComponent(referenceQuery)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50"
                            >
                                Google Scholar
                            </a>
                        </div>
                    </div>

                    {/* Case Comments Section */}
                    {caseData.caseComments && (
                        <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-100">
                            <h4 className="text-sm font-medium text-yellow-900 mb-2">Comentarios del Caso</h4>
                            <p className="text-sm text-yellow-800 whitespace-pre-line">
                                {caseData.caseComments}
                            </p>
                        </div>
                    )}

                    <button
                        onClick={() => {
                            setSubmitted(false);
                            setDiagnosis('');
                            setFindings('');
                            setFindingsResult(null);
                        }}
                        className="w-full mt-2 text-sm font-medium text-indigo-600 hover:text-indigo-500"
                    >
                        {t('cases.diagnosis.tryAgain')}
                    </button>
                </div>
            )}
        </div>
    );
};

export default DiagnosisForm;
