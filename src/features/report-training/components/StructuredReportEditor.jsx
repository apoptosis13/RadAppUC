import React from 'react';
import { useTranslation } from 'react-i18next';
import RichTextEditor from '../../../components/RichTextEditor';

const StructuredReportEditor = ({ data, onChange, readOnly = false, lockTitle = false }) => {
    const { t } = useTranslation();
    // data = { exam: '', findings: '', impression: '' }

    const handleChange = (field, value) => {
        onChange({
            ...data,
            [field]: value
        });
    };

    return (
        <div className="flex flex-col h-full bg-gray-950 text-gray-200 overflow-hidden">
            {/* Exam Title Section */}
            <div className="p-2 border-b border-gray-800 bg-gray-900">
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">{t('reportEditor.exam')}</label>
                <input
                    type="text"
                    value={data.exam || ''}
                    onChange={(e) => handleChange('exam', e.target.value)}
                    readOnly={readOnly || lockTitle}
                    className={`w-full border rounded p-2 text-sm focus:outline-none focus:border-indigo-500 font-bold tracking-wide transition-all ${lockTitle
                        ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-300 cursor-default shadow-inner'
                        : 'bg-gray-800 border-gray-700 text-white'
                        }`}
                    placeholder="Ej: RM COLUMNA TOTAL"
                />
            </div>

            {/* Findings Section - Main Body */}
            <div className="flex-1 flex flex-col min-h-0 border-b border-gray-800">
                <div className="bg-gray-800/50 px-3 py-1 border-b border-gray-800 flex justify-between items-center shrink-0">
                    <span className="text-xs font-bold text-yellow-500 uppercase tracking-widest">{t('reportEditor.findings')}</span>
                </div>
                <div className="flex-1 overflow-hidden relative">
                    <RichTextEditor
                        content={data.findings || ''}
                        onChange={(val) => handleChange('findings', val)}
                        editable={!readOnly}
                        simpleToolbar={true} // Cleaner toolbar for PACS feel?
                        allowImages={false} // Disable images in report
                        editorClassName='prose dark:prose-invert max-w-none focus:outline-none p-4 text-gray-300 text-sm h-full'
                    />
                </div>
            </div>

            {/* Impression Section - Conclusion */}
            <div className="h-1/3 flex flex-col min-h-[150px] shrink-0">
                <div className="bg-gray-800/50 px-3 py-1 border-b border-gray-800 border-t border-gray-800 flex justify-between items-center shrink-0">
                    <span className="text-xs font-bold text-green-400 uppercase tracking-widest">{t('reportEditor.impression')}</span>
                </div>
                <div className="flex-1 overflow-hidden relative bg-gray-900">
                    <RichTextEditor
                        content={data.impression || ''}
                        onChange={(val) => handleChange('impression', val)}
                        editable={!readOnly}
                        simpleToolbar={true}
                        allowImages={false}
                        editorClassName='prose dark:prose-invert max-w-none focus:outline-none p-4 text-gray-300 text-sm h-full'
                    />
                </div>
            </div>
        </div>
    );
};

export default StructuredReportEditor;
