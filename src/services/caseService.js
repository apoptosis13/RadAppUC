import { db, storage } from '../config/firebase';
import { collection, getDocs, doc, getDoc, addDoc, updateDoc, deleteDoc, deleteField, setDoc } from 'firebase/firestore';
import { ref, uploadString, getDownloadURL, uploadBytes } from 'firebase/storage';
import { cases as initialCases } from '../features/cases/data/cases';

const COLLECTION_NAME = 'cases';
const LOCAL_STORAGE_KEY = 'radiology_app_cases';

// Helper to check if we should use local storage
const getLocalCases = () => {
    try {
        const local = localStorage.getItem(LOCAL_STORAGE_KEY);
        return local ? JSON.parse(local) : [];
    } catch (e) {
        console.error("Local storage error:", e);
        return [];
    }
};

const saveLocalCases = (cases) => {
    try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(cases));
    } catch (e) {
        console.error("Local storage save error:", e);
    }
};

// Helper to upload base64 images to Firebase Storage
const uploadImageToStorage = async (base64String, caseId, index) => {
    // If it's already a URL, return it
    if (!base64String.startsWith('data:')) return base64String;

    try {
        const storageRef = ref(storage, `cases/${caseId}/${Date.now()}_${index}.jpg`);

        // Convert base64 to blob? uploadString handles base64 directly with 'data_url' format
        await uploadString(storageRef, base64String, 'data_url');
        const downloadURL = await getDownloadURL(storageRef);
        return downloadURL;
    } catch (error) {
        console.error("Error uploading image to storage:", error);
        // Fallback: return the base64 string if upload fails (though this might still fail firestore size limit)
        return base64String;
    }
};

export const caseService = {
    getAllCases: async () => {
        let firestoreCases = [];
        try {
            const querySnapshot = await getDocs(collection(db, COLLECTION_NAME));
            if (!querySnapshot.empty) {
                firestoreCases = querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
            }
        } catch (error) {
            console.warn("Firestore access failed:", error);
        }

        const localCases = getLocalCases();
        const caseMap = new Map();

        firestoreCases.forEach(c => caseMap.set(c.id, c));
        localCases.forEach(c => {
            // Prioritize local if it exists (assuming local edits might be newer/unsynced)
            // But actually, for hybrid mode, we might want to prioritize Firestore if it has data.
            // Let's stick to merging: if ID exists in both, use local? 
            // Better: use Firestore as source of truth if available, local as fallback/addition.
            if (!caseMap.has(c.id)) {
                caseMap.set(c.id, c);
            }
        });

        const mergedCases = Array.from(caseMap.values());
        if (mergedCases.length === 0) return initialCases;

        saveLocalCases(mergedCases);
        return mergedCases;
    },

    getCaseById: async (id) => {
        try {
            const docRef = doc(db, COLLECTION_NAME, id);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                return { ...docSnap.data(), id: docSnap.id };
            }
        } catch (error) {
            console.warn("Firestore get failed, checking local:", error);
        }

        const localCases = getLocalCases();
        const found = localCases.find(c => c.id === id);
        return found || initialCases.find(c => c.id === id) || null;
    },

    addCase: async (newCase) => {
        // Generate a new ID from Firestore (without saving yet) to assume folder path
        const newDocRef = doc(collection(db, COLLECTION_NAME));
        const newId = newDocRef.id;

        const rawImages = newCase.images || (newCase.image ? [newCase.image] : []);

        // Upload images to Storage
        let processedImages = [];
        try {
            processedImages = await Promise.all(
                rawImages.map((img, idx) => uploadImageToStorage(img, newId, idx))
            );
        } catch (storageError) {
            console.error("Storage upload failed, using raw images:", storageError);
            processedImages = rawImages;
        }

        // Upload Image Stacks
        let processedStacks = [];
        if (newCase.imageStacks && Array.isArray(newCase.imageStacks)) {
            try {
                processedStacks = await Promise.all(newCase.imageStacks.map(async (stack) => {
                    const stackImages = await Promise.all(
                        (stack.images || []).map((img, idx) => uploadImageToStorage(img, newId, `stack_${stack.id}_${idx}`))
                    );
                    return { ...stack, images: stackImages };
                }));
            } catch (stackError) {
                console.error("Stack upload failed:", stackError);
                processedStacks = newCase.imageStacks;
            }
        }

        const caseData = {
            ...newCase,
            id: newId,
            id: newId,
            images: processedImages,
            imageStacks: processedStacks,
            image: processedImages.length > 0 ? processedImages[0] : null,
            createdAt: new Date().toISOString()
        };

        try {
            await setDoc(newDocRef, caseData);
        } catch (error) {
            console.warn("Firestore add failed, saving to local only:", error);
        }

        const currentLocal = getLocalCases();
        saveLocalCases([...currentLocal, caseData]);

        return caseData;
    },

    updateCase: async (updatedCase) => {
        const { id, ...data } = updatedCase;
        const rawImages = data.images || (data.image ? [data.image] : []);

        // Upload any *new* base64 images
        let processedImages = [];
        try {
            processedImages = await Promise.all(
                rawImages.map((img, idx) => uploadImageToStorage(img, id, idx))
            );
        } catch (storageError) {
            console.error("Storage upload failed (update), using raw images:", storageError);
            processedImages = rawImages;
        }

        // Upload Image Stacks (Update)
        let processedStacks = [];
        if (data.imageStacks && Array.isArray(data.imageStacks)) {
            try {
                processedStacks = await Promise.all(data.imageStacks.map(async (stack) => {
                    const stackImages = await Promise.all(
                        (stack.images || []).map((img, idx) => uploadImageToStorage(img, id, `stack_${stack.id}_${idx}`))
                    );
                    return { ...stack, images: stackImages };
                }));
            } catch (stackError) {
                console.error("Stack upload failed (update):", stackError);
                processedStacks = data.imageStacks || [];
            }
        }

        const cleanData = {
            ...data,
            images: processedImages,
            imageStacks: processedStacks,
            image: processedImages.length > 0 ? processedImages[0] : null,
            titleKey: deleteField(),
            historyKey: deleteField(),
            correctDiagnosisKey: deleteField(),
            findingsKey: deleteField(),
            questions_en: (data.questions_en && data.questions_en.length > 0 && data.questions_en[0].text) ? data.questions_en : deleteField()
        };

        const localData = {
            ...updatedCase,
            images: processedImages,
            imageStacks: processedStacks,
            image: processedImages.length > 0 ? processedImages[0] : null
        };

        try {
            const caseRef = doc(db, COLLECTION_NAME, id);
            await updateDoc(caseRef, cleanData);
        } catch (error) {
            console.warn("Firestore update failed, updating local only:", error);
        }

        const currentLocal = getLocalCases();
        const index = currentLocal.findIndex(c => c.id === id);
        if (index !== -1) {
            currentLocal[index] = { ...currentLocal[index], ...localData };
            saveLocalCases(currentLocal);
        } else {
            saveLocalCases([...currentLocal, localData]);
        }

        return localData;
    },

    deleteCase: async (id) => {
        try {
            await deleteDoc(doc(db, COLLECTION_NAME, id));
            // Optional: Delete images from storage? (Complex without listing)
        } catch (error) {
            console.warn("Firestore delete failed, deleting from local:", error);
        }

        const currentLocal = getLocalCases();
        saveLocalCases(currentLocal.filter(c => c.id !== id));
    },

    resetDatabase: async () => {
        localStorage.removeItem(LOCAL_STORAGE_KEY);
        try {
            const querySnapshot = await getDocs(collection(db, COLLECTION_NAME));
            const deletePromises = querySnapshot.docs.map(doc => deleteDoc(doc.ref));
            await Promise.all(deletePromises);

            const uploadPromises = initialCases.map(async (c) => {
                const caseData = { ...c, createdAt: new Date().toISOString() };
                await addDoc(collection(db, COLLECTION_NAME), caseData);
            });
            await Promise.all(uploadPromises);

            const newSnapshot = await getDocs(collection(db, COLLECTION_NAME));
            return newSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
        } catch (e) {
            console.error("Reset failed", e);
            return initialCases;
        }
    }
};
