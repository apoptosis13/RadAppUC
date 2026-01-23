import { httpsCallable } from 'firebase/functions';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { functions, db } from '../config/firebase';

export const quizService = {
    /**
     * Generates a quiz for a specific diagnosis and difficult level.
     * @param {string} diagnosis - The diagnosis to generate the quiz for.
     * @param {string} difficulty - The difficulty level (Beginner, Intermediate, Advanced).
     * @returns {Promise<Array>} - A promise that resolves to an array of question objects.
     */
    generateQuiz: async (diagnosis, difficulty, language = 'es') => {
        try {
            const generateQuizAI = httpsCallable(functions, 'generateQuizAI_v2');
            const result = await generateQuizAI({ diagnosis, difficulty, language });
            return result.data.quiz;
        } catch (error) {
            console.error("Error generating quiz:", error);
            throw error;
        }
    },

    /**
     * Submits feedback for a quiz question.
     * @param {Object} feedbackData - The feedback data.
     * @returns {Promise<void>}
     */
    submitFeedback: async (feedbackData) => {
        try {
            const feedbackRef = collection(db, 'quiz_feedback');
            await addDoc(feedbackRef, {
                ...feedbackData,
                createdAt: serverTimestamp(),
                status: 'pending' // pending, reviewed, resolved
            });
        } catch (error) {
            console.error("Error submitting feedback:", error);
            throw error;
        }
    }
};
