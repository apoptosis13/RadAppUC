import { db, auth } from '../config/firebase';
import { doc, getDoc, setDoc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';

export const userService = {
    /**
     * Get user vocabulary list
     * @returns {Promise<string[]>} List of custom terms
     */
    getUserVocabulary: async () => {
        const user = auth.currentUser;
        if (!user) return [];

        try {
            const userDocRef = doc(db, 'users', user.uid);
            const userDoc = await getDoc(userDocRef);

            if (userDoc.exists() && userDoc.data().vocabulary) {
                return userDoc.data().vocabulary;
            }
            return [];
        } catch (error) {
            console.error("Error fetching vocabulary:", error);
            return [];
        }
    },

    /**
     * Add a term to vocabulary
     * @param {string} term 
     */
    addVocabularyTerm: async (term) => {
        const user = auth.currentUser;
        if (!user || !term) return;

        try {
            const userDocRef = doc(db, 'users', user.uid);
            // Ensure doc exists
            await setDoc(userDocRef, { email: user.email }, { merge: true });

            await updateDoc(userDocRef, {
                vocabulary: arrayUnion(term)
            });
            return true;
        } catch (error) {
            console.error("Error adding term:", error);
            throw error;
        }
    },

    /**
     * Add multiple terms to vocabulary
     * @param {string[]} terms 
     */
    addBatchVocabularyTerms: async (terms) => {
        const user = auth.currentUser;
        if (!user || !terms || terms.length === 0) return;

        try {
            const userDocRef = doc(db, 'users', user.uid);
            // Ensure doc exists
            await setDoc(userDocRef, { email: user.email }, { merge: true });

            await updateDoc(userDocRef, {
                vocabulary: arrayUnion(...terms)
            });
            return true;
        } catch (error) {
            console.error("Error adding batch terms:", error);
            throw error;
        }
    },

    /**
     * Remove a term from vocabulary
     * @param {string} term 
     */
    removeVocabularyTerm: async (term) => {
        const user = auth.currentUser;
        if (!user || !term) return;

        try {
            const userDocRef = doc(db, 'users', user.uid);
            await updateDoc(userDocRef, {
                vocabulary: arrayRemove(term)
            });
            return true;
        } catch (error) {
            console.error("Error removing term:", error);
            throw error;
        }
    },

    // --- Global Vocabulary (Admin/Instructor) ---

    getGlobalVocabulary: async () => {
        try {
            const docRef = doc(db, 'settings', 'vocabulary');
            const snap = await getDoc(docRef);
            if (snap.exists() && snap.data().terms) {
                return snap.data().terms;
            }
            return [];
        } catch (error) {
            console.error("Error fetching global vocabulary:", error);
            return [];
        }
    },

    addGlobalVocabularyTerm: async (term) => {
        if (!term) return;
        try {
            const docRef = doc(db, 'settings', 'vocabulary');
            // Ensure doc exists
            await setDoc(docRef, { type: 'global_vocabulary' }, { merge: true });

            await updateDoc(docRef, {
                terms: arrayUnion(term)
            });
            return true;
        } catch (error) {
            console.error("Error adding global term:", error);
            throw error;
        }
    },

    addBatchGlobalVocabularyTerms: async (terms) => {
        if (!terms || terms.length === 0) return;
        try {
            const docRef = doc(db, 'settings', 'vocabulary');
            // Ensure doc exists
            await setDoc(docRef, { type: 'global_vocabulary' }, { merge: true });

            await updateDoc(docRef, {
                terms: arrayUnion(...terms)
            });
            return true;
        } catch (error) {
            console.error("Error adding batch global terms:", error);
            throw error;
        }
    },

    removeGlobalVocabularyTerm: async (term) => {
        if (!term) return;
        try {
            const docRef = doc(db, 'settings', 'vocabulary');
            await updateDoc(docRef, {
                terms: arrayRemove(term)
            });
            return true;
        } catch (error) {
            console.error("Error removing global term:", error);
            throw error;
        }
    },

    // --- Preferences ---

    saveMicrophonePreference: async (deviceId) => {
        const user = auth.currentUser;
        if (!user) return;
        try {
            const userDocRef = doc(db, 'users', user.uid);
            await setDoc(userDocRef, {
                preferences: { microphoneId: deviceId }
            }, { merge: true });
        } catch (error) {
            console.error("Error saving mic preference:", error);
        }
    },

    getMicrophonePreference: async () => {
        const user = auth.currentUser;
        if (!user) return null;
        try {
            const userDocRef = doc(db, 'users', user.uid);
            const snap = await getDoc(userDocRef);
            if (snap.exists() && snap.data().preferences) {
                return snap.data().preferences.microphoneId;
            }
            return null;
        } catch (error) {
            console.error("Error getting mic preference:", error);
            return null;
        }
    },

    // --- Personalized Voice Training ---

    getUserVoiceTraining: async () => {
        const user = auth.currentUser;
        if (!user) return [];
        try {
            const userDocRef = doc(db, 'users', user.uid);
            const userDoc = await getDoc(userDocRef);
            if (userDoc.exists() && userDoc.data().voiceTraining) {
                return userDoc.data().voiceTraining;
            }
            return [];
        } catch (error) {
            console.error("Error fetching voice training:", error);
            return [];
        }
    },

    addVoiceTrainingExample: async (misunderstood, correct) => {
        const user = auth.currentUser;
        if (!user || !misunderstood || !correct) return;
        try {
            const userDocRef = doc(db, 'users', user.uid);
            await setDoc(userDocRef, { email: user.email }, { merge: true });
            await updateDoc(userDocRef, {
                voiceTraining: arrayUnion({ misunderstood, correct })
            });
            return true;
        } catch (error) {
            console.error("Error adding voice training example:", error);
            throw error;
        }
    },

    removeVoiceTrainingExample: async (example) => {
        const user = auth.currentUser;
        if (!user || !example) return;
        try {
            const userDocRef = doc(db, 'users', user.uid);
            await updateDoc(userDocRef, {
                voiceTraining: arrayRemove(example)
            });
            return true;
        } catch (error) {
            console.error("Error removing voice training example:", error);
            throw error;
        }
    }
};
