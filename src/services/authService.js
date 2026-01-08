import { auth, googleProvider, db } from '../config/firebase';
import { signInWithPopup, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, collection, getDocs, deleteDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../config/firebase';

import { getRandomAvatar } from '../utils/userConstants';

const SUPER_ADMIN_EMAIL = 'gonzalodiazs@gmail.com';

export const authService = {
    // ... (previous code)

    loginWithGoogle: async () => {
        try {
            googleProvider.setCustomParameters({ prompt: 'select_account' });
            const result = await signInWithPopup(auth, googleProvider);
            const user = result.user;

            // 1. Try to find user by UID first (modern way)
            let userSnap = await getDoc(doc(db, 'users', user.uid));
            let userRef = doc(db, 'users', user.uid);
            let isLegacy = false;

            // 2. If not found, try by Email (legacy way)
            if (!userSnap.exists()) {
                const emailRef = doc(db, 'users', user.email);
                const emailSnap = await getDoc(emailRef);
                if (emailSnap.exists()) {
                    userSnap = emailSnap;
                    userRef = emailRef;
                    isLegacy = true;
                }
            }

            let dbUser;
            const isSuperAdmin = user.email === SUPER_ADMIN_EMAIL;

            if (!userSnap.exists()) {
                // New user - Use UID as ID
                const avatar = user.photoURL || getRandomAvatar(user.uid);
                dbUser = {
                    uid: user.uid,
                    email: user.email,
                    displayName: user.displayName,
                    photoURL: avatar,
                    role: isSuperAdmin ? 'admin' : 'guest',
                    status: isSuperAdmin ? 'approved' : 'pending',
                    createdAt: new Date().toISOString()
                };
                userRef = doc(db, 'users', user.uid); // Ensure we use UID for new docs
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
                        uid: user.uid // Ensure UID is stored even in legacy docs
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
                    isLegacy
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

    logout: async () => {
        await signOut(auth);
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

            // Priority 2: Email lookup
            const userRef = doc(db, 'users', email);
            const userSnap = await getDoc(userRef);
            return userSnap.exists() ? { id: userSnap.id, ...userSnap.data() } : null;
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
        if (userData.email === SUPER_ADMIN_EMAIL) {
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
    requestRole: async (email, requestedRole) => {
        const userRef = doc(db, 'users', email);
        await updateDoc(userRef, { requestedRole });
        const userSnap = await getDoc(userRef);
        return userSnap.data();
    },

    deleteUser: async (docId) => {
        const currentUser = auth.currentUser;
        if (!currentUser) throw new Error("No autenticado");

        // Protection: Don't allow deleting the ACTIVE session document
        if (docId === currentUser.uid) {
            throw new Error("No puedes eliminar el documento de tu sesión activa");
        }

        const userRef = doc(db, 'users', docId);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) return;

        const userData = userSnap.data();

        // Protection: Non-superadmins cannot delete a superadmin doc
        if (userData.email === SUPER_ADMIN_EMAIL && currentUser.email !== SUPER_ADMIN_EMAIL) {
            throw new Error("Solo el Administrador Principal puede eliminar documentos de Admin");
        }

        await deleteDoc(userRef);
    },

    // ... (rest of the file)

    // Legacy method support (if needed) or remove
    addUser: async (userData) => {
        // For manual addition by admin (if kept)
        // We use email as ID
        if (!userData.email && userData.username) userData.email = `${userData.username}@example.com`; // Fallback

        await setDoc(doc(db, 'users', userData.email), {
            ...userData,
            status: 'approved', // Admin added users are approved
            createdAt: new Date().toISOString()
        });
    },

    updateUser: async (email, updates) => {
        await updateDoc(doc(db, 'users', email), updates);
    },

    syncUser: async (userData) => {
        const userRef = doc(db, 'users', userData.email);
        await setDoc(userRef, userData, { merge: true });
    },

    updateUserProfile: async (uid, data) => {
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
        // We use email as doc ID
        const userRef = doc(db, 'users', user.email);
        await setDoc(userRef, data, { merge: true });

        // Return updated combined data
        const snap = await getDoc(userRef);
        return { ...user, ...snap.data() };
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
