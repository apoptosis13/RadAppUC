import React from 'react';
import { Brain, Trophy, Clock } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const QuizStart = ({ diagnosis, difficulty, onStart, error }) => {
    const { t } = useTranslation();
    return (
        <div className="text-center space-y-6">
            <div className="flex justify-center">
                <div className="p-4 bg-indigo-100 dark:bg-indigo-900 rounded-full">
                    <Brain className="w-16 h-16 text-indigo-600 dark:text-indigo-300" />
                </div>
            </div>

            <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                    {t('aiQuiz.start.title', 'Desafío de Diagnóstico Diferencial')}
                </h2>
                <p className="text-lg text-indigo-600 dark:text-indigo-400 font-medium">
                    {diagnosis}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                    {t('aiQuiz.start.level', 'Nivel: ')}
                    {difficulty === 'Beginner' ? t('aiQuiz.start.r1', 'R1 (Principiante)') :
                        difficulty === 'Intermediate' ? t('aiQuiz.start.r2', 'R2 (Intermedio)') :
                            t('aiQuiz.start.r3', 'R3 (Avanzado)')}
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mx-auto text-left">
                <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                    <div className="flex items-center space-x-2 mb-2">
                        <Brain className="w-5 h-5 text-indigo-500" />
                        <h3 className="font-semibold text-gray-900 dark:text-white">{t('aiQuiz.start.features.questions.title', '10 Preguntas')}</h3>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                        {t('aiQuiz.start.features.questions.desc', 'Generadas con IA específicamente para este caso.')}
                    </p>
                </div>
                <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                    <div className="flex items-center space-x-2 mb-2">
                        <Clock className="w-5 h-5 text-green-500" />
                        <h3 className="font-semibold text-gray-900 dark:text-white">{t('aiQuiz.start.features.time.title', 'Tiempo Limitado')}</h3>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                        {t('aiQuiz.start.features.time.desc', 'Suma puntos extra por responder rápido.')}
                    </p>
                </div>
                <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                    <div className="flex items-center space-x-2 mb-2">
                        <Trophy className="w-5 h-5 text-yellow-500" />
                        <h3 className="font-semibold text-gray-900 dark:text-white">{t('aiQuiz.start.features.lives.title', '2 Oportunidades')}</h3>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                        {t('aiQuiz.start.features.lives.desc', 'Si fallas, tienes un segundo intento por mitad de puntaje.')}
                    </p>
                </div>
            </div>

            {error && (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-sm">
                    {error}
                </div>
            )}

            <button
                onClick={onStart}
                className="inline-flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 transition-colors shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
                {t('aiQuiz.start.beginBtn', 'Comenzar Quiz')}
            </button>
        </div>
    );
};

export default QuizStart;
