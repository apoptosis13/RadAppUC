import React, { useState } from 'react';
import { X, Send, AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const FeedbackModal = ({ isOpen, onClose, onSubmit, questionContext }) => {
    const { t } = useTranslation();
    const [reason, setReason] = useState('incorrect_answer');
    const [comment, setComment] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await onSubmit({
                reason,
                comment,
                questionContext // Includes question text, options, correct answer, etc.
            });
            onClose();
            setComment('');
            setReason('incorrect_answer');
        } catch (error) {
            console.error("Error submitting feedback:", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full border border-gray-200 dark:border-gray-700 animate-in fade-in zoom-in-95 duration-200">
                <div className="flex justify-between items-center p-4 border-b border-gray-100 dark:border-gray-700">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center">
                        <AlertTriangle className="w-5 h-5 mr-2 text-yellow-500" />
                        {t('aiQuiz.feedback.title', 'Reportar Problema')}
                    </h3>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-4 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            {t('aiQuiz.feedback.reasonLabel', 'Motivo del reporte')}
                        </label>
                        <select
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            className="w-full rounded-lg border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white sm:text-sm p-2.5 focus:ring-indigo-500 focus:border-indigo-500"
                        >
                            <option value="incorrect_answer">{t('aiQuiz.feedback.reason.incorrect', 'Respuesta incorrecta')}</option>
                            <option value="poor_phrasing">{t('aiQuiz.feedback.reason.phrasing', 'Redacción confusa')}</option>
                            <option value="inappropriate">{t('aiQuiz.feedback.reason.inappropriate', 'Contenido inapropiado')}</option>
                            <option value="other">{t('aiQuiz.feedback.reason.other', 'Otro')}</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            {t('aiQuiz.feedback.commentLabel', 'Comentarios adicionales (opcional)')}
                        </label>
                        <textarea
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            rows={3}
                            placeholder={t('aiQuiz.feedback.commentPlaceholder', 'Describe el error o sugiere una corrección...')}
                            className="w-full rounded-lg border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white sm:text-sm p-3 focus:ring-indigo-500 focus:border-indigo-500"
                        />
                    </div>

                    <div className="flex justify-end space-x-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                            {t('common.cancel', 'Cancelar')}
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition-colors"
                        >
                            {isSubmitting ? (
                                <span>{t('common.sending', 'Enviando...')}</span>
                            ) : (
                                <>
                                    <Send className="w-4 h-4 mr-2" />
                                    {t('common.send', 'Enviar Reporte')}
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default FeedbackModal;
