import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, Circle, AlertCircle, Sparkles } from 'lucide-react';

/**
 * ReportChecklist component
 * Displays a list of required elements for a report and marks them as completed
 * when they are detected in the report content.
 */
const ReportChecklist = ({ checklist = [], reportContent = '' }) => {
    const { t } = useTranslation();

    const items = useMemo(() => {
        const normalize = (str) => {
            if (!str) return '';
            return str
                .replace(/<[^>]*>?/gm, '') // Strip HTML
                .toLowerCase()
                .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Remove accents for fuzzy matching
                .replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, "") // Remove punctuation
                .replace(/\s+/g, ' ') // Collapse spaces
                .trim();
        };

        const normalizedContent = normalize(reportContent);

        return checklist.map(original => {
            const normalizedRequirement = normalize(original);
            const isFound = normalizedContent.includes(normalizedRequirement);
            return {
                text: original,
                isFound
            };
        });
    }, [checklist, reportContent]);

    const completedCount = items.filter(i => i.isFound).length;
    const totalCount = items.length;
    const isComplete = completedCount === totalCount;

    if (!checklist || checklist.length === 0) return null;

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden flex flex-col h-full animate-in slide-in-from-right duration-500">
            <div className={`px-4 py-3 flex items-center justify-between border-b ${isComplete ? 'bg-green-50 dark:bg-green-900/20 border-green-100 dark:border-green-900/30' : 'bg-gray-50 dark:bg-gray-900 border-gray-100 dark:border-gray-700'}`}>
                <div className="flex items-center space-x-2">
                    <Sparkles size={16} className={isComplete ? 'text-green-500' : 'text-indigo-500'} />
                    <h4 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">{t('training.workspace.checklist')}</h4>
                </div>
                <div className={`text-xs font-bold px-2 py-0.5 rounded-full ${isComplete ? 'bg-green-500 text-white' : 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300'}`}>
                    {completedCount} / {totalCount}
                </div>
            </div>

            <div className="p-4 flex-1 overflow-y-auto custom-scrollbar space-y-3">
                {items.map((item, index) => (
                    <div
                        key={index}
                        className={`flex items-start space-x-3 p-2 rounded-lg transition-all ${item.isFound ? 'bg-green-50/50 dark:bg-green-900/10' : 'bg-transparent'}`}
                    >
                        <div className="shrink-0 mt-0.5">
                            {item.isFound ? (
                                <CheckCircle2 size={18} className="text-green-500 animate-in zoom-in duration-300" />
                            ) : (
                                <Circle size={18} className="text-gray-300 dark:text-gray-600" />
                            )}
                        </div>
                        <span className={`text-sm leading-tight transition-colors ${item.isFound ? 'text-green-700 dark:text-green-300 font-medium' : 'text-gray-600 dark:text-gray-400'}`}>
                            {item.text}
                        </span>
                    </div>
                ))}
            </div>

            {isComplete ? (
                <div className="p-4 bg-green-500 text-white text-center text-xs font-bold uppercase tracking-widest animate-pulse">
                    {t('training.workspace.saveSuccess')}
                </div>
            ) : completedCount > 0 ? (
                <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 flex flex-col items-center">
                    <div className="w-full h-1 bg-indigo-200 dark:bg-indigo-900/50 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-indigo-500 transition-all duration-1000"
                            style={{ width: `${(completedCount / totalCount) * 100}%` }}
                        />
                    </div>
                </div>
            ) : null}
        </div>
    );
};

export default ReportChecklist;
