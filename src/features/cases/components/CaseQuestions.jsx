import React, { useState } from 'react';
import { CheckCircle, XCircle, HelpCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const CaseQuestions = ({ questions, onAllQuestionsAnswered }) => {
    const [selectedAnswers, setSelectedAnswers] = useState({});
    const [feedback, setFeedback] = useState({});
    const { t } = useTranslation();

    if (!questions || questions.length === 0) return null;

    const handleOptionSelect = (qIndex, oIndex) => {
        if (feedback[qIndex]) return; // Prevent changing answer after submission
        setSelectedAnswers(prev => ({ ...prev, [qIndex]: oIndex }));
    };

    const checkAnswer = (qIndex) => {
        const question = questions[qIndex];
        const selected = selectedAnswers[qIndex];

        if (selected === undefined) return;

        const isCorrect = parseInt(question.correctAnswer) === selected;

        const newFeedback = {
            ...feedback,
            [qIndex]: {
                isCorrect,
                correctAnswer: parseInt(question.correctAnswer)
            }
        };

        setFeedback(newFeedback);

        // Check if all questions are answered
        if (Object.keys(newFeedback).length === questions.length && onAllQuestionsAnswered) {
            onAllQuestionsAnswered();
        }
    };

    return (
        <div className="bg-white rounded-lg shadow p-4 border border-gray-200 mt-6">
            <h3 className="text-md font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-indigo-600" />
                {t('cases.questions.title')}
            </h3>
            <div className="space-y-4">
                {questions.map((question, qIndex) => (
                    <div key={qIndex} className="border-b border-gray-100 last:border-0 pb-4 last:pb-0">
                        <p className="text-sm font-medium text-gray-800 mb-2">
                            {qIndex + 1}. {question.text}
                        </p>
                        <div className="space-y-1">
                            {question.options.map((option, oIndex) => {
                                const isSelected = selectedAnswers[qIndex] === oIndex;
                                const qFeedback = feedback[qIndex];
                                const isCorrectAnswer = qFeedback && qFeedback.correctAnswer === oIndex;
                                const isWrongSelection = qFeedback && !qFeedback.isCorrect && isSelected;

                                let optionClass = "flex items-center p-2 rounded-md border cursor-pointer transition-colors text-sm ";

                                if (qFeedback) {
                                    if (isCorrectAnswer) {
                                        optionClass += "bg-green-50 border-green-200 text-green-800";
                                    } else if (isWrongSelection) {
                                        optionClass += "bg-red-50 border-red-200 text-red-800";
                                    } else {
                                        optionClass += "bg-gray-50 border-gray-200 text-gray-400 opacity-60";
                                    }
                                } else {
                                    if (isSelected) {
                                        optionClass += "bg-indigo-50 border-indigo-200 text-indigo-900 ring-1 ring-indigo-200";
                                    } else {
                                        optionClass += "bg-white border-gray-200 hover:bg-gray-50 text-gray-700";
                                    }
                                }

                                return (
                                    <div
                                        key={oIndex}
                                        className={optionClass}
                                        onClick={() => handleOptionSelect(qIndex, oIndex)}
                                    >
                                        <div className={`w-3 h-3 rounded-full border flex items-center justify-center mr-2 ${isSelected || isCorrectAnswer ? 'border-current' : 'border-gray-400'
                                            }`}>
                                            {(isSelected || isCorrectAnswer) && (
                                                <div className="w-1.5 h-1.5 rounded-full bg-current" />
                                            )}
                                        </div>
                                        <span className="flex-1">{option}</span>
                                        {isCorrectAnswer && <CheckCircle className="w-4 h-4 text-green-600 ml-2" />}
                                        {isWrongSelection && <XCircle className="w-4 h-4 text-red-600 ml-2" />}
                                    </div>
                                );
                            })}
                        </div>

                        {!feedback[qIndex] ? (
                            <button
                                onClick={() => checkAnswer(qIndex)}
                                disabled={selectedAnswers[qIndex] === undefined}
                                className={`mt-2 px-3 py-1.5 rounded-md text-xs font-medium text-white transition-colors ${selectedAnswers[qIndex] !== undefined
                                    ? 'bg-indigo-600 hover:bg-indigo-700'
                                    : 'bg-gray-300 cursor-not-allowed'
                                    }`}
                            >
                                {t('cases.questions.verify')}
                            </button>
                        ) : (
                            <div className={`mt-2 p-2 rounded-md text-xs ${feedback[qIndex].isCorrect ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
                                }`}>
                                {feedback[qIndex].isCorrect
                                    ? t('cases.questions.correct')
                                    : t('cases.questions.incorrect')}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default CaseQuestions;
