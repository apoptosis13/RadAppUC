import { db, storage, functions } from '../config/firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, getDocs, getDoc, query, where, orderBy } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { httpsCallable } from 'firebase/functions';

const ANATOMY_COLLECTION = 'anatomy_modules';

export const anatomyService = {
    // --- MODULES (Mapped to anatomy_templates collection) ---
    getModules: async (region, modality) => {
        try {
            let q = query(collection(db, ANATOMY_COLLECTION));
            if (region) q = query(q, where('region', '==', region));
            if (modality) q = query(q, where('modality', '==', modality));

            const snapshot = await getDocs(q);
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            // Sort client-side to avoid composite index requirement
            return data.sort((a, b) => {
                const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
                const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
                return dateB - dateA; // Descending
            });
        } catch (error) {
            console.error("Error fetching modules:", error);
            throw error;
        }
    },

    getModuleById: async (id) => {
        try {
            const docRef = doc(db, ANATOMY_COLLECTION, id);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                return { id: docSnap.id, ...docSnap.data() };
            } else {
                throw new Error("Module not found");
            }
        } catch (error) {
            console.error("Error fetching module:", error);
            throw error;
        }
    },

    createModule: async (moduleData) => {
        try {
            const docRef = await addDoc(collection(db, ANATOMY_COLLECTION), {
                ...moduleData,
                createdAt: new Date(),
                updatedAt: new Date()
            });
            return docRef.id;
        } catch (error) {
            console.error("Error creating module:", error);
            throw error;
        }
    },

    updateModule: async (id, moduleData) => {
        try {
            const docRef = doc(db, ANATOMY_COLLECTION, id);
            await updateDoc(docRef, {
                ...moduleData,
                updatedAt: new Date()
            });
        } catch (error) {
            console.error("Error updating module:", error);
            throw error;
        }
    },

    deleteModule: async (id) => {
        try {
            await deleteDoc(doc(db, ANATOMY_COLLECTION, id));
        } catch (error) {
            console.error("Error deleting module:", error);
            throw error;
        }
    },

    // --- ALIASES FOR BACKWARD COMPATIBILITY (Optional but safe) ---
    getTemplates: async (region, modality) => {
        return anatomyService.getModules(region, modality);
    },
    getTemplateById: async (id) => {
        return anatomyService.getModuleById(id);
    },

    // --- IMAGES ---
    uploadImage: async (file, path = 'anatomy_images') => {
        try {
            const storageRef = ref(storage, `${path}/${Date.now()}_${file.name}`);
            const snapshot = await uploadBytes(storageRef, file);
            const downloadURL = await getDownloadURL(snapshot.ref);
            return downloadURL;
        } catch (error) {
            console.error("Error uploading image:", error);
            throw error;
        }
    },


};
