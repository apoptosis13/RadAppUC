import { httpsCallable } from 'firebase/functions';
import { functions } from '../config/firebase';

export const quizService = {
    /**
     * Generates a quiz for a specific diagnosis and difficult level.
     * @param {string} diagnosis - The diagnosis to generate the quiz for.
     * @param {string} difficulty - The difficulty level (Beginner, Intermediate, Advanced).
     * @returns {Promise<Array>} - A promise that resolves to an array of question objects.
     */
    generateQuiz: async (diagnosis, difficulty) => {
        try {
            const generateQuizFunction = httpsCallable(functions, 'generateQuizAI');
            const result = await generateQuizFunction({ diagnosis, difficulty });
            return result.data.quiz;
        } catch (error) {
            console.error("Error generating quiz:", error);
            throw error;
        }
    }
};
