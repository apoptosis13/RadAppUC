import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { validateDiagnosis } from '../../../utils/validationUtils';

const DiagnosisForm = ({ correctDiagnosis, caseData, onComplete }) => {
    const { t, i18n } = useTranslation();
    const [diagnosis, setDiagnosis] = useState('');
    const [submitted, setSubmitted] = useState(false);
    const [isCorrect, setIsCorrect] = useState(false);

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



        setIsCorrect(isMatch);
        setSubmitted(true);

        if (onComplete) onComplete(isMatch);
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

                    {/* Findings Feedback */}
                    {/* Findings Feedback - Simplified to just show expected findings */}
                    {(caseData.findings || caseData.findingsKey || caseData.findings_en) && (
                        <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                            <h4 className="text-sm font-medium text-blue-900 mb-2">
                                Hallazgos Esperados
                            </h4>
                            <p className="text-sm text-blue-800 italic">
                                {(caseData.findingsKey && t(caseData.findingsKey)) ||
                                    (i18n.language === 'en' && caseData.findings_en) ||
                                    caseData.findings}
                            </p>
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
