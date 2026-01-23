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
        console.log('AuthProvider initialized, waiting for onAuthStateChanged...');

        // Safety timeout in case Firebase is unreachable
        const safetyTimeout = setTimeout(() => {
            if (loading) {
                console.error("Auth timeout: Firebase didn't respond in time.");
                setLoading(false);
            }
        }, 15000);

        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            clearTimeout(safetyTimeout);
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
                        // NOTE: getUserData is now robust, so if we are here, TRULY no user exists.
                        const newUser = {
                            id: firebaseUser.uid, // ENSURE ID IS SET
                            uid: firebaseUser.uid,
                            email: firebaseUser.email,
                            displayName: firebaseUser.displayName,
                            photoURL: firebaseUser.photoURL,
                            role: isSuperAdmin ? 'admin' : 'student', // Default is student, not guest
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
        // Local loading only
        try {
            const user = await authService.loginWithGoogle();
            setUser(user);
            return user;
        } catch (error) {
            throw error;
        }
    };

    const logout = async () => {
        // Local loading only
        try {
            await authService.logout();
            setUser(null);
        } catch (error) {
            console.error("Logout error", error);
        }
    };

    const requestRole = async (role) => {
        if (!user) return;
        try {
            // Use ID or UID to be safe
            const targetId = user.id || user.uid;
            if (!targetId) throw new Error("User ID missing");

            const updatedUser = await authService.requestRole(targetId, role);
            setUser(updatedUser);
        } catch (error) {
            throw error;
        }
    };

    const updateProfile = async (data) => {
        if (!user) return;
        try {
            const updatedUser = await authService.updateUserProfile(user.id, data);
            setUser(prev => ({ ...prev, ...updatedUser }));
            return updatedUser;
        } catch (error) {
            throw error;
        }
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, requestRole, updateProfile, loading }}>
            {loading ? (
                <div className="min-h-screen flex items-center justify-center bg-gray-900">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mx-auto mb-4"></div>
                        <p className="text-gray-400">Iniciando VoxelHub...</p>
                    </div>
                </div>
            ) : (
                children
            )}
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
