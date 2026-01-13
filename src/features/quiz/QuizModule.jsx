import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { quizService } from '../../services/quizService';
import QuizStart from './components/QuizStart';
import QuizGame from './components/QuizGame';
import QuizResults from './components/QuizResults';
import { Loader2, AlertCircle } from 'lucide-react';

const QuizModule = ({ diagnosis, difficulty, onClose }) => {
    const { t } = useTranslation();
    const [gameState, setGameState] = useState('START'); // START, LOADING, PLAYING, RESULTS
    const [questions, setQuestions] = useState([]);
    const [score, setScore] = useState(0);
    const [error, setError] = useState(null);

    const handleStartQuiz = async () => {
        setGameState('LOADING');
        setError(null);
        try {
            const quizData = await quizService.generateQuiz(diagnosis, difficulty);
            setQuestions(quizData);
            setGameState('PLAYING');
        } catch (err) {
            console.error("Failed to load quiz", err);
            setError("No se pudo generar el quiz. Intenta nuevamente.");
            setGameState('START');
        }
    };

    const handleFinishQuiz = (finalScore) => {
        setScore(finalScore);
        setGameState('RESULTS');
    };

    const handleRetry = () => {
        setScore(0);
        setGameState('PLAYING'); // Replay same questions? Or generate new? user asked for 10 questions. Replaying same is easier for now to fix mistakes.
        // Actually, typically "Retry" might mean just checking results or re-doing. 
        // For "Gamification", maybe we want to allow re-playing the same set to get 100%?
        // Let's stick to re-playing the same set for now to not burn API tokens.
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl overflow-hidden border border-gray-200 dark:border-gray-700 w-full max-w-4xl mx-auto my-8">
            <div className="p-6">
                {gameState === 'START' && (
                    <QuizStart
                        diagnosis={diagnosis}
                        difficulty={difficulty}
                        onStart={handleStartQuiz}
                        error={error}
                        isLoading={gameState === 'LOADING'}
                    />
                )}

                {gameState === 'LOADING' && (
                    <div className="flex flex-col items-center justify-center py-20">
                        <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mb-4" />
                        <p className="text-gray-600 dark:text-gray-300 animate-pulse">
                            Generando desafío con IA...
                        </p>
                    </div>
                )}

                {gameState === 'PLAYING' && (
                    <QuizGame
                        questions={questions}
                        onFinish={handleFinishQuiz}
                    />
                )}

                {gameState === 'RESULTS' && (
                    <QuizResults
                        score={score}
                        totalQuestions={questions.length}
                        onRetry={handleRetry}
                        onClose={onClose}
                    />
                )}
            </div>
        </div>
    );
};

export default QuizModule;
