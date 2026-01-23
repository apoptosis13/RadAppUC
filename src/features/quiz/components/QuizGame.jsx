import React, { useState, useEffect, useRef } from 'react';
import { Timer, CheckCircle, XCircle, AlertCircle, ArrowRight, AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { quizService } from '../../../services/quizService';
import FeedbackModal from './FeedbackModal';

const QUESTION_DURATION = 30; // seconds

const QuizGame = ({ questions, onFinish }) => {
    const { t } = useTranslation();
    const [currentIndex, setCurrentIndex] = useState(0);
    const [timeLeft, setTimeLeft] = useState(QUESTION_DURATION);
    const [selectedOption, setSelectedOption] = useState(null);
    const [attempts, setAttempts] = useState(0); // 0, 1 (max 2)
    const [feedback, setFeedback] = useState(null); // 'correct', 'incorrect', 'timeout'
    const [score, setScore] = useState(0);
    const [hasAnsweredCorrectly, setHasAnsweredCorrectly] = useState(false);
    const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);

    const timerRef = useRef(null);

    const currentQuestion = questions[currentIndex];

    // Timer Logic
    useEffect(() => {
        if (hasAnsweredCorrectly || feedback === 'timeout' || isFeedbackModalOpen) return;

        timerRef.current = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    clearInterval(timerRef.current);
                    handleTimeout();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timerRef.current);
    }, [currentIndex, hasAnsweredCorrectly, feedback, attempts, isFeedbackModalOpen]);

    const handleTimeout = () => {
        setFeedback('timeout');
        // If timeout, no points? Or treat as wrong?
        // Let's treat as wrong for this attempt.
        if (attempts === 0) {
            // Allow second attempt? Maybe not on timeout to keep it simple or strictly enforce speed?
            // User request: "el usuario que contesta estas preguntas tiene dos opciones para reponer"
            // Let's say timeout counts as a wrong attempt.
            setAttempts(1);
        } else {
            // Failed completely
        }
    };

    const handleOptionClick = (index) => {
        if (hasAnsweredCorrectly || feedback === 'timeout') return; // Prevent clicking after correct/timeout
        if (attempts >= 2) return; // Max attempts reached
        if (selectedOption === index) return; // Already selected this one (maybe waiting for confirmation? No, instant feedback is better)

        setSelectedOption(index);

        const isCorrect = index === currentQuestion.correctAnswer;

        if (isCorrect) {
            handleCorrectAnswer();
        } else {
            handleIncorrectAnswer();
        }
    };

    const handleCorrectAnswer = () => {
        setHasAnsweredCorrectly(true);
        setFeedback('correct');
        clearInterval(timerRef.current);

        // Calculate Score
        // Base: 100
        // Time Bonus: 1 pt per second left
        // Attempt Penalty: 1st try = 1x, 2nd try = 0.5x

        let points = 100;
        if (attempts === 1) points = 50;

        // Time bonus only on first try? Or both? Let's say both but smaller?
        // Let's keep it simple: Points + TimeLeft
        const timeBonus = timeLeft;
        const totalPoints = points + timeBonus;

        setScore(prev => prev + totalPoints);
    };

    const handleIncorrectAnswer = () => {
        if (attempts === 0) {
            setFeedback('incorrect');
            setAttempts(1);
            // Don't stop timer? Or pause?
            // "Dos opciones para responder". Maybe pause timer or reset?
            // Usually in games, time keeps ticking.
        } else {
            setFeedback('failed'); // 2nd wrong answer
            setHasAnsweredCorrectly(true); // Technically "done" with this question
            clearInterval(timerRef.current);
        }
    };

    const handleNext = () => {
        if (currentIndex < questions.length - 1) {
            setCurrentIndex(prev => prev + 1);
            resetQuestionState();
        } else {
            onFinish(score);
        }
    };

    const resetQuestionState = () => {
        setTimeLeft(QUESTION_DURATION);
        setSelectedOption(null);
        setAttempts(0);
        setFeedback(null);
        setHasAnsweredCorrectly(false);
    };

    const handleFeedbackSubmit = async (data) => {
        try {
            await quizService.submitFeedback({
                ...data,
                questionId: currentQuestion.id || null, // If available
                questionText: currentQuestion.question
            });
            alert(t('aiQuiz.feedback.success', '¡Gracias! Tu reporte ha sido enviado.'));
        } catch (error) {
            console.error(error);
            alert(t('aiQuiz.feedback.error', 'Error al enviar reporte.'));
        }
    };

    const getOptionClass = (index) => {
        let base = "w-full text-left p-4 rounded-lg border-2 transition-all duration-200 flex justify-between items-center ";

        // Logic for styling based on state
        if (feedback === 'correct' && index === currentQuestion.correctAnswer) {
            return base + "border-green-500 bg-green-50 text-green-700 font-medium";
        }

        if (selectedOption === index && feedback === 'incorrect') {
            return base + "border-yellow-500 bg-yellow-50 text-yellow-700";
        }

        if (selectedOption === index && feedback === 'failed') {
            return base + "border-red-500 bg-red-50 text-red-700";
        }

        // Reveal correct answer if failed or done
        if ((feedback === 'failed' || feedback === 'timeout') && index === currentQuestion.correctAnswer) {
            return base + "border-green-500 bg-green-50 text-green-700 opacity-60";
        }

        // Default or hover
        if (!hasAnsweredCorrectly && feedback !== 'failed' && feedback !== 'timeout') {
            return base + "border-gray-200 hover:border-indigo-300 dark:border-gray-700 dark:hover:border-indigo-700 dark:bg-gray-800 dark:text-white";
        }

        // Disabled look for others when done
        return base + "border-gray-100 text-gray-400 dark:border-gray-800 dark:text-gray-600 cursor-not-allowed";
    };

    return (
        <div className="max-w-2xl mx-auto relative">
            {/* Header: Progress & Score */}
            <div className="flex justify-between items-center mb-6 text-sm font-medium text-gray-500 dark:text-gray-400">
                <span>{t('aiQuiz.game.progress', { current: currentIndex + 1, total: questions.length })}</span>
                <span className="text-indigo-600 dark:text-indigo-400 font-bold text-lg">{t('aiQuiz.game.points', { score })}</span>
            </div>

            {/* Timer Bar */}
            <div className="w-full bg-gray-200 rounded-full h-2 mb-6 dark:bg-gray-700 overflow-hidden">
                <div
                    className={`h-2 rounded-full transition-all duration-1000 ease-linear ${timeLeft < 10 ? 'bg-red-500' : 'bg-indigo-600'}`}
                    style={{ width: `${(timeLeft / QUESTION_DURATION) * 100}%` }}
                ></div>
            </div>

            {/* Question */}
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
                {currentQuestion.question}
            </h3>

            {/* Options */}
            <div className="space-y-3 mb-8">
                {currentQuestion.options.map((option, index) => (
                    <button
                        key={index}
                        onClick={() => handleOptionClick(index)}
                        disabled={hasAnsweredCorrectly || feedback === 'failed' || feedback === 'timeout' || (attempts === 1 && selectedOption === index)}
                        className={getOptionClass(index)}
                    >
                        <span>{option}</span>
                        {feedback === 'correct' && index === currentQuestion.correctAnswer && <CheckCircle className="w-5 h-5 text-green-500" />}
                        {feedback === 'incorrect' && selectedOption === index && <AlertCircle className="w-5 h-5 text-yellow-500" />}
                        {feedback === 'failed' && selectedOption === index && <XCircle className="w-5 h-5 text-red-500" />}
                    </button>
                ))}
            </div>

            {/* Feedback / Next Section */}
            {(hasAnsweredCorrectly || feedback === 'failed' || feedback === 'timeout') && (
                <div className="animate-fade-in-up bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg border border-gray-100 dark:border-gray-700 mb-4">
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                        {feedback === 'correct' ? t('aiQuiz.game.correct', '¡Correcto!') : t('aiQuiz.game.explanation', 'Respuesta / Explicación:')}
                    </h4>
                    <p className="text-gray-600 dark:text-gray-300 text-sm mb-4">
                        {currentQuestion.explanation}
                    </p>

                    <div className="flex justify-end">
                        <button
                            onClick={handleNext}
                            className="inline-flex items-center px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium transition-colors"
                        >
                            {currentIndex < questions.length - 1 ? t('aiQuiz.game.next', 'Siguiente Pregunta') : t('aiQuiz.game.results', 'Ver Resultados')}
                            <ArrowRight className="w-4 h-4 ml-2" />
                        </button>
                    </div>
                </div>
            )}

            {/* First attempt tip */}
            {attempts === 1 && feedback === 'incorrect' && !hasAnsweredCorrectly && (
                <div className="text-center text-yellow-600 dark:text-yellow-400 font-medium animate-pulse">
                    {t('aiQuiz.game.retryTip', '¡Inténtalo de nuevo! Te queda 1 vida.')}
                </div>
            )}

            {/* Report Button - Always visible or only when finished with question? Better always visible for bad questions */}
            <div className="mt-8 pt-4 border-t border-gray-100 dark:border-gray-800 flex justify-center">
                <button
                    onClick={() => setIsFeedbackModalOpen(true)}
                    className="flex items-center text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                >
                    <AlertTriangle className="w-3 h-3 mr-1.5" />
                    {t('aiQuiz.reportIssue', 'Reportar un problema con esta pregunta')}
                </button>
            </div>

            <FeedbackModal
                isOpen={isFeedbackModalOpen}
                onClose={() => setIsFeedbackModalOpen(false)}
                onSubmit={handleFeedbackSubmit}
                questionContext={currentQuestion}
            />
        </div>
    );
};

export default QuizGame;
