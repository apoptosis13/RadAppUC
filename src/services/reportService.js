import { db, auth } from '../config/firebase';
import { collection, addDoc, query, where, getDocs, serverTimestamp, orderBy } from 'firebase/firestore';

const COLLECTION_NAME = 'user_reports';

export const reportService = {
    /**
     * Saves a polished report for a user.
     * @param {Object} reportData
     * @param {string} reportData.caseId
     * @param {string} reportData.content - The polished HTML/Text content
     * @param {string} reportData.originalTranscript - The raw STT transcript
     * @returns {Promise<string>} The ID of the saved report
     */
    saveReport: async ({ caseId, content, structuredReport, originalTranscript, caseTitle }) => {
        const user = auth.currentUser;
        if (!user) throw new Error("Must be logged in to save reports");

        try {
            const docRef = await addDoc(collection(db, COLLECTION_NAME), {
                userId: user.uid,
                userEmail: user.email,
                caseId,
                caseTitle: caseTitle || '',
                content, // Deprecated or used as backup string representation
                structuredReport: structuredReport || null, // { exam, findings, impression }
                originalTranscript,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            });
            return docRef.id;
        } catch (error) {
            console.error("Error saving report:", error);
            throw error;
        }
    },

    /**
     * Retrieves all reports for a specific case and user.
     * @param {string} caseId 
     * @returns {Promise<Array>} List of reports
     */
    getUserReportsForCase: async (caseId) => {
        const user = auth.currentUser;
        if (!user) return [];

        try {
            const q = query(
                collection(db, COLLECTION_NAME),
                where('caseId', '==', caseId),
                where('userId', '==', user.uid),
                orderBy('createdAt', 'desc')
            );

            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                createdAt: doc.data().createdAt?.toDate() // Convert Timestamp to Date
            }));
        } catch (error) {
            console.error("Error fetching user reports:", error);
            return [];
        }
    }
};
