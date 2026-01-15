import { auth, googleProvider, db, functions } from '../config/firebase'; // Ensure functions is imported
import { signInWithPopup, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, collection, getDocs, deleteDoc, query, where } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { httpsCallable } from 'firebase/functions'; // Import directly
import { storage } from '../config/firebase';

import { getRandomAvatar } from '../utils/userConstants';

const SUPER_ADMIN_EMAIL = 'gonzalodiazs@gmail.com';

export const authService = {
    // Basic Auth
    register: async (email, password, displayName) => {
        // ... handled by firebase auth usually, but if manual:
        const { createUserWithEmailAndPassword, updateProfile } = await import('firebase/auth');
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        await updateProfile(user, { displayName });

        // Create user doc
        await setDoc(doc(db, 'users', user.uid), {
            uid: user.uid,
            email,
            displayName,
            role: 'student', // Default role
            status: 'pending',
            createdAt: new Date().toISOString()
        });

        return user;
    },

    login: async (email, password) => {
        const { signInWithEmailAndPassword } = await import('firebase/auth');
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        return userCredential.user;
    },

    loginWithGoogle: async () => {
        try {
            googleProvider.setCustomParameters({ prompt: 'select_account' });
            const result = await signInWithPopup(auth, googleProvider);
            const user = result.user;

            // 1. Try to find user by UID first (modern way)
            let userRef = doc(db, 'users', user.uid);
            let userSnap = await getDoc(userRef);
            let wasMigrated = false;

            // 2. If not found by UID, perform robust search by Email to find ANY legacy/duplicate account
            // We use the static imports (query, where) defined at the top
            if (!userSnap.exists()) {
                const usersRef = collection(db, 'users');
                const q = query(usersRef, where("email", "==", user.email));
                const querySnap = await getDocs(q);

                if (!querySnap.empty) {
                    // Found existing doc(s). Pick the first one.
                    const existingDoc = querySnap.docs[0];
                    const existingData = existingDoc.data();

                    console.log("Found existing user by email:", existingDoc.id);

                    // Consolidate to UID doc
                    const newData = { ...existingData, uid: user.uid };

                    // Save to correct UID location
                    await setDoc(userRef, newData);

                    // Delete the old doc (whether it was email-ID or a different UID that shouldn't exist)
                    // ONLY delete if the ID is different from the new UID (avoid self-delete logic error)
                    if (existingDoc.id !== user.uid) {
                        await deleteDoc(existingDoc.ref);
                    }

                    // Reload from new location
                    userSnap = await getDoc(userRef);
                    // userRef is already correct
                    wasMigrated = true;

                    // Clean up any OTHER duplicates if they exist (Delete all other docs with same email)
                    if (querySnap.size > 1) {
                        console.warn("Found multiple duplicates for email, cleaning up...");
                        for (let i = 1; i < querySnap.docs.length; i++) {
                            const dupDoc = querySnap.docs[i];
                            if (dupDoc.id !== user.uid) {
                                await deleteDoc(dupDoc.ref);
                            }
                        }
                    }
                }
            }

            let dbUser;
            const isSuperAdmin = user.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();

            if (!userSnap.exists()) {
                // New user - Use UID as ID
                const avatar = user.photoURL || getRandomAvatar(user.uid);
                dbUser = {
                    uid: user.uid,
                    email: user.email,
                    displayName: user.displayName,
                    photoURL: avatar,
                    // DEFAULT ROLE IS NOW 'student' (Pending), NOT 'guest'
                    role: isSuperAdmin ? 'admin' : 'student',
                    status: isSuperAdmin ? 'approved' : 'pending',
                    createdAt: new Date().toISOString()
                };
                userRef = doc(db, 'users', user.uid);
                await setDoc(userRef, dbUser);
            } else {
                // Update existing user info
                dbUser = { id: userSnap.id, ...userSnap.data() };

                // Force Super Admin rights
                if (isSuperAdmin && (dbUser.role !== 'admin' || dbUser.status !== 'approved')) {
                    dbUser.role = 'admin';
                    dbUser.status = 'approved';
                    await updateDoc(userRef, { role: 'admin', status: 'approved' });
                } else {
                    // Update profile info
                    const updates = {
                        displayName: user.displayName,
                        photoURL: user.photoURL,
                        uid: user.uid
                    };
                    await updateDoc(userRef, updates);
                    dbUser = { ...dbUser, ...updates };
                }
            }

            // Log activity
            try {
                const { activityLogService } = await import('./activityLogService');
                await activityLogService.logActivity('LOGIN', {
                    method: 'google',
                    email: user.email,
                    migrated: wasMigrated
                });
            } catch (e) {
                console.error('Failed to log login:', e);
            }

            return dbUser;
        } catch (error) {
            console.error("Google Sign-In Error:", error);
            throw error;
        }
    },

    migrateUser: async (email, uid) => {
        if (!email || !uid) throw new Error("Email y UID son requeridos para migración");

        const legacyRef = doc(db, 'users', email);
        const legacySnap = await getDoc(legacyRef);

        if (!legacySnap.exists()) {
            throw new Error("El documento legacy no existe");
        }

        const data = legacySnap.data();
        const newRef = doc(db, 'users', uid);
        const newSnap = await getDoc(newRef);

        // If UID doc exists, we just delete the legacy one (it was already migrated or new one is fresher)
        if (newSnap.exists()) {
            await deleteDoc(legacyRef);
            return { id: uid, ...newSnap.data() };
        }

        // Copy and Move
        await setDoc(newRef, { ...data, uid });
        await deleteDoc(legacyRef);

        return { id: uid, ...data, uid };
    },

    logout: async () => {
        await signOut(auth);
    },

    revokeSessions: async () => {
        const revokeFn = httpsCallable(functions, 'revokeUserSessions');
        const result = await revokeFn();
        return result.data;
    },

    getCurrentUser: () => {
        return auth.currentUser;
    },

    getUserData: async (email) => {
        try {
            // Priority 1: Current UID if authenticated
            const currentUser = auth.currentUser;
            if (currentUser) {
                const uidRef = doc(db, 'users', currentUser.uid);
                const uidSnap = await getDoc(uidRef);
                if (uidSnap.exists()) return { id: uidSnap.id, ...uidSnap.data() };
            }

            // Priority 2: Email lookup (Legacy ID = email)
            const userRef = doc(db, 'users', email);
            const userSnap = await getDoc(userRef);
            if (userSnap.exists()) return { id: userSnap.id, ...userSnap.data() };

            // Priority 3: Robust Query lookup (Any ID, matches email)
            const usersRef = collection(db, 'users');
            const q = query(usersRef, where("email", "==", email));
            const querySnap = await getDocs(q);

            if (!querySnap.empty) {
                const foundDoc = querySnap.docs[0];
                return { id: foundDoc.id, ...foundDoc.data() };
            }

            return null;
        } catch (error) {
            console.error("Error fetching user data:", error);
            return null;
        }
    },

    // Admin methods
    getAllUsers: async () => {
        const querySnapshot = await getDocs(collection(db, 'users'));
        return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    },

    updateUserStatus: async (docId, newStatus, newRole) => {
        const userRef = doc(db, 'users', docId);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) throw new Error("Usuario no encontrado");
        const userData = userSnap.data();

        // Protection: Don't allow changing super admin status
        if (userData.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase()) {
            throw new Error("No se puede modificar el estado del Administrador Principal");
        }

        const updates = { status: newStatus };
        if (newRole !== undefined) {
            updates.role = newRole;
        }
        await updateDoc(userRef, updates);
        return { id: docId, ...updates };
    },

    // For user to request a role
    requestRole: async (docId, requestedRole) => {
        const userRef = doc(db, 'users', docId);
        await updateDoc(userRef, { requestedRole });

        // Force update just in case state is stale
        const userSnap = await getDoc(userRef);
        return { id: docId, ...userSnap.data() };
    },

    deleteUser: async (docId) => {
        // 1. Try Cloud Function first (Deletes Auth + Firestore)
        try {
            console.log("Attempting delete via Cloud Function for:", docId);
            const deleteUserFn = httpsCallable(functions, 'deleteUser');
            await deleteUserFn({ userId: docId });
            console.log("Cloud Function delete successful");
            return; // Success
        } catch (fnError) {
            console.warn("Cloud Function deletion failed:", fnError);
            console.log("Falling back to direct Firestore deletion...");
        }

        // 2. Fallback: Direct Firestore Delete (Manual Cleanup)
        // This handles cases where Cloud Functions aren't deployed or the user is a legacy/email-only user.
        try {
            const userRef = doc(db, 'users', docId);
            await deleteDoc(userRef);
            console.log("Direct Firestore deletion successful");
        } catch (dbError) {
            console.error("Direct deletion also failed:", dbError);
            throw new Error(`Failed to delete user: ${dbError.message}`);
        }
    },

    // ... (rest of the file)

    // Legacy method support (if needed) or remove
    addUser: async (userData) => {
        // For manual addition by admin (if kept)
        // Prefer UID if available, else Email
        const id = userData.uid || userData.email || `${userData.username}@example.com`;

        await setDoc(doc(db, 'users', id), {
            ...userData,
            email: userData.email || id,
            status: 'approved', // Admin added users are approved
            createdAt: new Date().toISOString()
        });
    },

    updateUser: async (email, updates) => {
        await updateDoc(doc(db, 'users', email), updates);
    },

    syncUser: async (userData) => {
        const id = userData.uid || userData.email;
        const userRef = doc(db, 'users', id);
        await setDoc(userRef, userData, { merge: true });
    },

    updateUserProfile: async (docId, data) => {
        // data: { displayName, photoURL, preferences: { theme, language } }
        const user = auth.currentUser;
        if (!user) throw new Error("No authenticated user");

        // 1. Update Authentication Profile (displayName, photoURL)
        const authUpdates = {};
        if (data.displayName) authUpdates.displayName = data.displayName;
        if (data.photoURL) authUpdates.photoURL = data.photoURL;

        if (Object.keys(authUpdates).length > 0) {
            await import('firebase/auth').then(module => module.updateProfile(user, authUpdates));
        }

        // 2. Update Firestore (preferences, etc)
        const userRef = doc(db, 'users', docId);
        await setDoc(userRef, data, { merge: true });

        // Return updated combined data
        const snap = await getDoc(userRef);
        return { id: docId, ...snap.data() };
    },

    uploadAvatar: async (file, uid) => {
        const storageRef = ref(storage, `avatars/${uid}/${file.name}`);
        const metadata = {
            contentType: file.type || 'image/jpeg',
            cacheControl: 'public, max-age=31536000',
        };
        const snapshot = await uploadBytes(storageRef, file, metadata);
        const downloadURL = await getDownloadURL(snapshot.ref);
        return downloadURL;
    }
};
