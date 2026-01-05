import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/authService';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../config/firebase';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    const SESSION_TIMEOUT_MS = 72 * 60 * 60 * 1000; // 72 hours

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                // Check session timeout
                const lastActivity = localStorage.getItem('lastActivity');
                if (lastActivity && (Date.now() - parseInt(lastActivity, 10) > SESSION_TIMEOUT_MS)) {
                    console.log('Session timed out due to inactivity.');
                    await authService.logout();
                    setUser(null);
                    setLoading(false);
                    return;
                }

                // Update activity timestamp if valid session
                localStorage.setItem('lastActivity', Date.now().toString());

                try {
                    // Fetch additional user data from Firestore (role, status)
                    const dbUser = await authService.getUserData(firebaseUser.email);
                    if (dbUser) {
                        setUser(dbUser);
                    } else {
                        // User exists in Auth but not in DB (e.g. deleted by admin but session active)
                        // Re-create the user document in Firestore as 'pending'
                        const newUser = {
                            uid: firebaseUser.uid,
                            email: firebaseUser.email,
                            displayName: firebaseUser.displayName,
                            photoURL: firebaseUser.photoURL,
                            role: 'guest',
                            status: 'pending',
                            createdAt: new Date().toISOString()
                        };

                        try {
                            const { doc, setDoc } = await import('firebase/firestore');
                            const { db } = await import('../config/firebase');
                            // We need to use the imported functions here since we are in a hook/context 
                            // but simpler to call a service method if possible.
                            // Let's rely on authService for cleanliness if possible, or just use direct firestore here.
                            // However, authService imports are available in this file scope if we check imports.
                            // Checking imports in file... 'authService' is imported.

                            // Let's call a new method `authService.ensureUserExists` or just `setDoc` manually?
                            // authService has `loginWithGoogle` logic. Let's use authService.addUser/syncUser?

                            // Easier: reuse authService logic? No, let's just write to DB here to fix it immediately.
                            // Wait, imports at top of file don't include setDoc/db?
                            // Checking imports...
                        } catch (e) { console.error(e); }

                        // Actually, let's use a service method to keep Context clean.
                        await authService.syncUser(newUser);

                        setUser(newUser);
                    }
                } catch (error) {
                    console.error("Error fetching user data:", error);
                    setUser(null);
                }
            } else {
                setUser(null);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const login = async () => {
        setLoading(true);
        try {
            const user = await authService.loginWithGoogle();
            setUser(user);
            return user;
        } catch (error) {
            throw error;
        } finally {
            setLoading(false);
        }
    };

    const logout = async () => {
        setLoading(true);
        try {
            await authService.logout();
            setUser(null);
        } finally {
            setLoading(false);
        }
    };

    const requestRole = async (role) => {
        if (!user) return;
        setLoading(true);
        try {
            const updatedUser = await authService.requestRole(user.email, role);
            setUser(updatedUser);
        } finally {
            setLoading(false);
        }
    };

    const updateProfile = async (data) => {
        if (!user) return;
        setLoading(true);
        try {
            const updatedUser = await authService.updateUserProfile(user.uid, data);
            setUser(prev => ({ ...prev, ...updatedUser }));
            return updatedUser;
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, requestRole, updateProfile, loading }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
