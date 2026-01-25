import { db } from '../config/firebase';
import { collection, getDocs, doc, getDoc, addDoc, updateDoc, deleteDoc, query, orderBy, where, serverTimestamp } from 'firebase/firestore';

const COLLECTION_NAME = 'support_materials';

export const supportMaterialService = {
    /**
     * Get all support materials, optionally filtered by category.
     */
    getAllMaterials: async (category = 'all') => {
        try {
            const materialsRef = collection(db, COLLECTION_NAME);
            let q;

            if (category !== 'all') {
                q = query(
                    materialsRef,
                    where('category', '==', category),
                    orderBy('createdAt', 'desc')
                );
            } else {
                q = query(materialsRef, orderBy('createdAt', 'desc'));
            }

            const querySnapshot = await getDocs(q);
            return querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                createdAt: doc.data().createdAt?.toDate()
            }));
        } catch (error) {
            console.error("Error fetching materials:", error);
            throw error;
        }
    },

    /**
     * Get a single material by ID.
     */
    getMaterialById: async (id) => {
        try {
            const docRef = doc(db, COLLECTION_NAME, id);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                return {
                    id: docSnap.id,
                    ...docSnap.data(),
                    createdAt: docSnap.data().createdAt?.toDate()
                };
            }
            return null;
        } catch (error) {
            console.error("Error fetching material:", error);
            throw error;
        }
    },

    /**
     * Add a new support material.
     */
    addMaterial: async (materialData) => {
        try {
            const docRef = await addDoc(collection(db, COLLECTION_NAME), {
                ...materialData,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            });
            return docRef.id;
        } catch (error) {
            console.error("Error adding material:", error);
            throw error;
        }
    },

    /**
     * Update an existing material.
     */
    updateMaterial: async (id, materialData) => {
        try {
            const docRef = doc(db, COLLECTION_NAME, id);
            await updateDoc(docRef, {
                ...materialData,
                updatedAt: serverTimestamp()
            });
            return true;
        } catch (error) {
            console.error("Error updating material:", error);
            throw error;
        }
    },

    /**
     * Delete a material.
     */
    deleteMaterial: async (id) => {
        try {
            const docRef = doc(db, COLLECTION_NAME, id);
            await deleteDoc(docRef);
            return true;
        } catch (error) {
            console.error("Error deleting material:", error);
            throw error;
        }
    }
};
