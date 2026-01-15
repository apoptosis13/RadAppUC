import { db } from '../config/firebase';
import { activityLogService } from './activityLogService';
import { doc, setDoc, getDoc, collection, getDocs, updateDoc, increment, serverTimestamp, addDoc, query, orderBy, limit } from 'firebase/firestore';

export const statsService = {
    /**
     * Save a score for an Anatomy Module Quiz
     * @param {string} userId
     * @param {string} moduleId
     * @param {object} scoreData { score, totalQuestions, correctCount, mode, timeSpent }
     */
    saveAnatomyScore: async (userId, moduleId, scoreData) => {
        try {
            const statsRef = doc(db, 'users', userId, 'stats', 'anatomy');
            const moduleRef = doc(statsRef, 'modules', moduleId);

            // We want to keep track of the BEST score and TOTAL attempts
            const docSnap = await getDoc(moduleRef);
            const currentStats = docSnap.exists() ? docSnap.data() : { highScore: 0, attempts: 0 };

            const newStats = {
                lastPlayed: serverTimestamp(),
                lastScore: scoreData.score,
                attempts: increment(1),
                // Update high score if current is better
                highScore: Math.max(currentStats.highScore || 0, scoreData.score),
                // Keep track of best performance details
                bestPerformance: (scoreData.score > (currentStats.highScore || 0)) ? scoreData : (currentStats.bestPerformance || scoreData)
            };

            await setDoc(moduleRef, newStats, { merge: true });

            // Save to History Log
            const historyRef = collection(db, 'users', userId, 'history');
            await addDoc(historyRef, {
                type: 'anatomy',
                moduleId,
                moduleTitle: scoreData.moduleTitle || moduleId,
                score: scoreData.score,
                mode: scoreData.mode || 'standard',
                timestamp: serverTimestamp(),
                details: {
                    correct: scoreData.correctCount,
                    total: scoreData.totalQuestions
                }
            });

            // Log Global Activity for Analytics
            await activityLogService.logActivity('COMPLETE_ANATOMY_QUIZ', {
                moduleId,
                moduleTitle: scoreData.moduleTitle || moduleId,
                score: scoreData.score,
                mode: scoreData.mode || 'standard'
            });

            return true;
        } catch (error) {
            console.error('Error saving anatomy score:', error);
            throw error;
        }
    },

    /**
     * Get all anatomy stats for a user
     * @param {string} userId
     * @returns {Promise<object>} Map of moduleId -> stats
     */
    getAnatomyStats: async (userId) => {
        try {
            const statsRef = collection(db, 'users', userId, 'stats', 'anatomy', 'modules');
            const querySnapshot = await getDocs(statsRef);
            const stats = {};
            querySnapshot.forEach((doc) => {
                stats[doc.id] = doc.data();
            });
            return stats;
        } catch (error) {
            console.error('Error getting anatomy stats:', error);
            return {};
        }
    },

    /**
     * Save a score for a AI Case Quiz
     * @param {string} userId
     * @param {string} caseId
     * @param {object} scoreData { score, totalQuestions, correctCount }
     */
    saveCaseScore: async (userId, caseId, scoreData) => {
        try {
            // Structure: users/{userId}/stats/cases/games/{caseId}
            // Note: We might want a flatter structure or aggregation later, but this works for per-case tracking
            const statsRef = doc(db, 'users', userId, 'stats', 'cases');
            const caseRef = doc(statsRef, 'games', caseId);

            await setDoc(caseRef, {
                ...scoreData,
                lastPlayed: serverTimestamp(),
                attempts: increment(1)
            }, { merge: true });

            // Save to History Log
            const historyRef = collection(db, 'users', userId, 'history');
            await addDoc(historyRef, {
                type: 'case',
                caseId,
                title: scoreData.title || caseId,
                score: scoreData.score,
                timestamp: serverTimestamp(),
                details: {
                    correct: scoreData.correctCount,
                    total: scoreData.totalQuestions
                }
            });

            return true;
        } catch (error) {
            console.error('Error saving case score:', error);
            throw error;
        }
    },

    /**
     * Get all case stats for a user
     * @param {string} userId
     */
    getCaseStats: async (userId) => {
        try {
            const statsRef = collection(db, 'users', userId, 'stats', 'cases', 'games');
            const querySnapshot = await getDocs(statsRef);
            const stats = {};
            querySnapshot.forEach((doc) => {
                stats[doc.id] = doc.data();
            });
            return stats;
        } catch (error) {
            console.error('Error getting case stats:', error);
            return {};
        }
    },

    /**
     * Get user activity history (quizzes, cases)
     * @param {string} userId
     * @param {number} limitCount
     */
    getHistory: async (userId, limitCount = 50) => {
        try {
            const historyRef = collection(db, 'users', userId, 'history');
            const q = query(historyRef, orderBy('timestamp', 'desc'), limit(limitCount));
            const querySnapshot = await getDocs(q);

            return querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                // partial handling for non-serializable timestamp if needed, 
                // typically we return data as is and format in component
            }));
        } catch (error) {
            console.error("Error getting history:", error);
            return [];
        }
    }
};
