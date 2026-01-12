import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle, XCircle, AlertCircle, Info, Hash, Sparkles, Loader2 } from 'lucide-react';
import { validateDiagnosis } from '../../../utils/validationUtils';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../../../config/firebase';

const DiagnosisForm = ({ correctDiagnosis, caseData, onComplete }) => {
    const { t, i18n } = useTranslation();
    const [diagnosis, setDiagnosis] = useState('');
    const [submitted, setSubmitted] = useState(false);
    const [isCorrect, setIsCorrect] = useState(false);

    // Determine search query for references
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
        const allValidDiagnoses = [
            correctDiagnosis,
            caseData?.correctDiagnosis_en,
            ...aliases
        ].filter(Boolean);

        const isMatch = validateDiagnosis(diagnosis, allValidDiagnoses);

        setIsCorrect(isMatch);
        setSubmitted(true);

        if (onComplete) onComplete(isMatch);
    };

    return (
        <div className="bg-gray-800/50 rounded-xl shadow-inner p-5 border border-gray-700/50">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center">
                <Sparkles className="w-4 h-4 mr-2 text-indigo-400" />
                {t('cases.diagnosis.title')}
            </h3>

            {!submitted ? (
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="diagnosis" className="block text-sm font-medium text-gray-300 mb-1">
                            {t('cases.diagnosis.primaryDiagnosis')}
                        </label>
                        <input
                            type="text"
                            id="diagnosis"
                            className="block w-full rounded-lg border-gray-600 bg-gray-900/50 text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2.5 placeholder-gray-500 transition-colors"
                            placeholder={t('cases.diagnosis.diagnosisPlaceholder')}
                            value={diagnosis}
                            onChange={(e) => setDiagnosis(e.target.value)}
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-lg shadow-indigo-500/20 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-indigo-500 transition-all duration-200 transform hover:-translate-y-0.5"
                    >
                        {t('cases.diagnosis.submit')}
                    </button>
                </form>
            ) : (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {/* Diagnosis Result */}
                    <div className={`text-center p-5 rounded-xl border ${isCorrect ? 'bg-green-900/20 border-green-500/30' : 'bg-red-900/20 border-red-500/30'}`}>
                        <div className="flex justify-center mb-3">
                            {isCorrect ? (
                                <div className="bg-green-500/20 p-2 rounded-full">
                                    <CheckCircle className="w-8 h-8 text-green-400" />
                                </div>
                            ) : (
                                <div className="bg-red-500/20 p-2 rounded-full">
                                    <XCircle className="w-8 h-8 text-red-400" />
                                </div>
                            )}
                        </div>
                        <h4 className={`text-lg font-bold ${isCorrect ? 'text-green-300' : 'text-red-300'}`}>
                            {isCorrect ? t('cases.diagnosis.correct') : t('cases.diagnosis.incorrect')}
                        </h4>
                        <p className="mt-2 text-sm text-gray-400">
                            {t('cases.diagnosis.correctIs')} <span className="font-bold text-white block mt-1 text-base">{correctDiagnosis}</span>
                        </p>
                    </div>

                    {/* References Section */}
                    <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-700">
                        <h4 className="text-xs font-bold text-gray-500 uppercase mb-3">Referencias</h4>
                        <div className="flex flex-wrap gap-2">
                            <a
                                href={`https://radiopaedia.org/search?q=${encodeURIComponent(referenceQuery)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center px-3 py-1.5 border border-gray-600 shadow-sm text-xs font-medium rounded-md text-gray-300 bg-gray-800 hover:bg-gray-700 hover:text-white transition-colors"
                            >
                                Radiopaedia
                            </a>
                            <a
                                href={`https://scholar.google.com/scholar?q=${encodeURIComponent(referenceQuery)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center px-3 py-1.5 border border-gray-600 shadow-sm text-xs font-medium rounded-md text-gray-300 bg-gray-800 hover:bg-gray-700 hover:text-white transition-colors"
                            >
                                Google Scholar
                            </a>
                        </div>
                    </div>

                    {/* Case Comments Section */}
                    {caseData.caseComments && (
                        <div className="bg-yellow-900/20 p-4 rounded-lg border border-yellow-500/20">
                            <h4 className="text-sm font-medium text-yellow-400 mb-2 flex items-center">
                                <Info className="w-4 h-4 mr-2" />
                                Comentarios del Caso
                            </h4>
                            <p className="text-sm text-yellow-200/80 whitespace-pre-line leading-relaxed">
                                {caseData.caseComments}
                            </p>
                        </div>
                    )}

                    <button
                        onClick={() => {
                            setSubmitted(false);
                            setDiagnosis('');
                        }}
                        className="w-full mt-2 text-sm font-medium text-indigo-400 hover:text-indigo-300 transition-colors"
                    >
                        {t('cases.diagnosis.tryAgain')}
                    </button>
                </div>
            )}
        </div>
    );
};

export default DiagnosisForm;
