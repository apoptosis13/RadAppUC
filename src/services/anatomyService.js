import { db, storage } from '../config/firebase';
import {
    collection,
    doc,
    getDocs,
    getDoc,
    addDoc,
    updateDoc,
    deleteDoc,
    query,
    where
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

const COLLECTION_NAME = 'anatomy_modules';

export const anatomyService = {
    // Get all modules, optionally filtered by region
    getModules: async (region = null) => {
        try {
            let q = collection(db, COLLECTION_NAME);
            if (region) {
                q = query(q, where('region', '==', region));
            }
            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (error) {
            console.error("Error getting anatomy modules:", error);
            // Return empty array instead of throwing to prevent breaking Promise.all in dashboard
            return [];
        }
    },

    // Get a single module by ID
    getModuleById: async (id) => {
        try {
            const docRef = doc(db, COLLECTION_NAME, id);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                return { id: docSnap.id, ...docSnap.data() };
            } else {
                return null;
            }
        } catch (error) {
            console.error("Error getting anatomy module:", error);
            throw error;
        }
    },

    // Create a new module
    createModule: async (moduleData) => {
        try {
            const docRef = await addDoc(collection(db, COLLECTION_NAME), {
                ...moduleData,
                createdAt: new Date(),
                updatedAt: new Date()
            });
            return docRef.id;
        } catch (error) {
            console.error("Error creating anatomy module:", error);
            throw error;
        }
    },

    // Update an existing module
    updateModule: async (id, moduleData) => {
        try {
            const docRef = doc(db, COLLECTION_NAME, id);
            await updateDoc(docRef, {
                ...moduleData,
                updatedAt: new Date()
            });
        } catch (error) {
            console.error("Error updating anatomy module:", error);
            throw error;
        }
    },

    // Delete a module
    deleteModule: async (id) => {
        try {
            await deleteDoc(doc(db, COLLECTION_NAME, id));
        } catch (error) {
            console.error("Error deleting anatomy module:", error);
            throw error;
        }
    },

    // Upload an image file to Firebase Storage
    uploadImage: async (file) => {
        try {
            const storageRef = ref(storage, `anatomy/${Date.now()}_${file.name}`);

            // Create a timeout promise
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('La subida de la imagen ha excedido el tiempo de espera (120s).')), 120000);
            });

            // Race the upload against the timeout
            const snapshot = await Promise.race([
                uploadBytes(storageRef, file),
                timeoutPromise
            ]);

            const downloadURL = await getDownloadURL(snapshot.ref);
            return downloadURL;
        } catch (error) {
            console.error("Error uploading image:", error);
            throw error;
        }
    }
};
