import React from 'react';
import { Trophy, Star, RefreshCw, X } from 'lucide-react';
import Confetti from 'react-confetti'; // Optional: Just in case we have it? No, keeping it vanilla for now.

const QuizResults = ({ score, totalQuestions, onRetry, onClose }) => {
    // Max theoretical score: (100 + 30) * 10 = 1300
    // Good score: > 1000
    const percentage = Math.round((score / (totalQuestions * 130)) * 100);

    return (
        <div className="text-center py-8">
            <div className="flex justify-center mb-6">
                <div className="relative">
                    <Trophy className="w-24 h-24 text-yellow-500 drop-shadow-lg" />
                    <Star className="w-8 h-8 text-yellow-300 absolute -top-1 -right-2 animate-bounce" />
                </div>
            </div>

            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                ¡Desafío Completado!
            </h2>

            <p className="text-gray-500 dark:text-gray-400 mb-8">
                Has completado el diagnóstico diferencial.
            </p>

            <div className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-2xl p-8 max-w-sm mx-auto shadow-2xl mb-8 transform hover:scale-105 transition-transform duration-300">
                <div className="text-sm font-medium opacity-90 uppercase tracking-wider mb-1">Puntaje Final</div>
                <div className="text-6xl font-black tracking-tight mb-2">{score}</div>
                <div className="w-full bg-white/20 h-1.5 rounded-full mb-2">
                    <div className="bg-white h-1.5 rounded-full" style={{ width: `${/*cap at 100*/ Math.min(percentage, 100)}%` }}></div>
                </div>
                <div className="text-xs opacity-80">¡Gran trabajo, Doctor!</div>
            </div>

            <div className="flex justify-center space-x-4">
                <button
                    onClick={onClose}
                    className="inline-flex items-center px-6 py-3 border border-gray-300 dark:border-gray-600 shadow-sm text-base font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                    <X className="w-5 h-5 mr-2" />
                    Cerrar
                </button>
                <button
                    onClick={onRetry}
                    className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 transition-colors shadow-md"
                >
                    <RefreshCw className="w-5 h-5 mr-2" />
                    Intentar de Nuevo
                </button>
            </div>
        </div>
    );
};

export default QuizResults;
