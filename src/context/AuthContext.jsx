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
                    // Fetch additional user data from Firestore
                    const dbUser = await authService.getUserData(firebaseUser.email);

                    const SUPER_ADMIN_EMAIL = 'gonzalodiazs@gmail.com';
                    const isSuperAdmin = firebaseUser.email === SUPER_ADMIN_EMAIL;

                    if (dbUser) {
                        // FORCE PROTECTION: If it's super admin but DB is wrong, correct it locally and in DB
                        if (isSuperAdmin && (dbUser.role !== 'admin' || dbUser.status !== 'approved')) {
                            console.warn("Recovering super admin privileges...");
                            const correctedUser = { ...dbUser, role: 'admin', status: 'approved' };
                            setUser(correctedUser);
                            // Correct in background
                            authService.updateUser(dbUser.id || firebaseUser.email, { role: 'admin', status: 'approved' });
                        } else {
                            setUser(dbUser);
                        }
                    } else {
                        // User exists in Auth but not in DB
                        const newUser = {
                            uid: firebaseUser.uid,
                            email: firebaseUser.email,
                            displayName: firebaseUser.displayName,
                            photoURL: firebaseUser.photoURL,
                            role: isSuperAdmin ? 'admin' : 'guest',
                            status: isSuperAdmin ? 'approved' : 'pending',
                            createdAt: new Date().toISOString()
                        };

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
