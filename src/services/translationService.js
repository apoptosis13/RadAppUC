import { functions } from '../config/firebase';
import { httpsCallable } from 'firebase/functions';

export const translationService = {
    /**
     * Translates text from Spanish to English using translateText Cloud Function.
     * @param {string} text - The text to translate.
     * @param {string} target - The target language (default 'en').
     * @returns {Promise<string>} - The translated text.
     */
    translate: async (text, target = 'en') => {
        if (!text || !text.trim()) return '';

        try {
            const translateText = httpsCallable(functions, 'translateText');
            const result = await translateText({ text, target });
            return result.data.translation;
        } catch (error) {
            console.error("Translation error:", error);
            throw new Error(error.message || "Error al traducir el texto.");
        }
    }
};
