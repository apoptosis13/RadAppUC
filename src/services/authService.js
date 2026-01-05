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

            const userRef = doc(db, 'users', user.email);
            const userSnap = await getDoc(userRef);

            let dbUser;

            if (!userSnap.exists()) {
                // New user
                const isSuperAdmin = user.email === SUPER_ADMIN_EMAIL;

                // Generate random avatar if none provided by provider
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

                await setDoc(userRef, dbUser);
            } else {
                // Update existing user info from Google if needed
                dbUser = userSnap.data();

                // Ensure Super Admin always has admin rights
                if (user.email === SUPER_ADMIN_EMAIL && dbUser.role !== 'admin') {
                    dbUser.role = 'admin';
                    dbUser.status = 'approved';
                    await updateDoc(userRef, { role: 'admin', status: 'approved' });
                } else {
                    // Update profile info
                    await updateDoc(userRef, {
                        displayName: user.displayName,
                        photoURL: user.photoURL
                    });
                }
            }

            // --- ACTIVITY LOG INJECTION ---
            try {
                // Dynamically import to avoid circular dependencies if any
                const { activityLogService } = await import('./activityLogService');
                await activityLogService.logActivity('LOGIN', {
                    method: 'google',
                    email: user.email
                });
            } catch (e) {
                console.error('Failed to log login:', e);
            }
            // ------------------------------

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
            const userRef = doc(db, 'users', email);
            const userSnap = await getDoc(userRef);
            return userSnap.exists() ? userSnap.data() : null;
        } catch (error) {
            console.error("Error fetching user data:", error);
            return null;
        }
    },

    // Admin methods
    getAllUsers: async () => {
        const querySnapshot = await getDocs(collection(db, 'users'));
        return querySnapshot.docs.map(doc => doc.data());
    },

    updateUserStatus: async (email, newStatus, newRole) => {
        if (email === SUPER_ADMIN_EMAIL) {
            throw new Error("Cannot modify Super Admin status");
        }
        const userRef = doc(db, 'users', email);
        const updates = { status: newStatus };
        if (newRole !== undefined) {
            updates.role = newRole;
        }
        await updateDoc(userRef, updates);
        return { email, ...updates };
    },

    // For user to request a role
    requestRole: async (email, requestedRole) => {
        const userRef = doc(db, 'users', email);
        await updateDoc(userRef, { requestedRole });
        const userSnap = await getDoc(userRef);
        return userSnap.data();
    },

    deleteUser: async (email) => {
        if (email === SUPER_ADMIN_EMAIL) {
            throw new Error("Cannot delete Super Admin");
        }
        await deleteDoc(doc(db, 'users', email));
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
