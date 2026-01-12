import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { Lock, User, Shield, AlertTriangle, Ban, XCircle } from 'lucide-react';

const LoginPage = () => {
    const [error, setError] = useState('');
    // Get loading directly from AuthContext
    const { login, logout, requestRole, user, loading } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const { t } = useTranslation();

    const from = location.state?.from?.pathname || '/';

    const pendingUser = user?.status === 'pending' ? user : null;
    const suspendedUser = user?.status === 'suspended' ? user : null;
    const rejectedUser = user?.status === 'rejected' ? user : null;

    // Redirect if already logged in and approved
    useEffect(() => {
        if (user && user.status === 'approved') {
            navigate(from, { replace: true });
        }
    }, [user, navigate, from]);

    const handleGoogleLogin = async () => {
        setError('');
        try {
            await login();
            // Navigation handled by useEffect for 'approved' users.
            // If user is suspended after login, handle it here.
            // The `user` state will be updated by `login()` and then this component re-renders.
            // The `suspendedUser` check below will then be true.
        } catch (err) {
            console.error(err);
            // Translate common firebase errors
            let msg = t('auth.error');
            if (err.code === 'auth/popup-closed-by-user') msg = "El inicio de sesión fue cancelado.";
            if (err.code === 'auth/popup-blocked') msg = "El navegador bloqueó la ventana emergente. Por favor permítela e intenta de nuevo.";
            if (err.code === 'auth/network-request-failed') msg = "Error de red. Verifica tu conexión.";

            setError(msg);
        }
    };

    const handleRoleRequest = async (role) => {
        try {
            await requestRole(role);
        } catch (err) {
            console.error(err);
            setError('Error al solicitar el rol. Inténtalo de nuevo.');
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-900">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
            </div>
        );
    }

    if (rejectedUser) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
                <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-lg shadow-lg border-l-4 border-gray-500">
                    <div className="text-center">
                        <div className="mx-auto h-12 w-12 bg-gray-100 rounded-full flex items-center justify-center">
                            <XCircle className="h-6 w-6 text-gray-600" />
                        </div>
                        <h2 className="mt-6 text-center text-2xl font-bold text-gray-900">
                            Solicitud Rechazada
                        </h2>
                        <p className="mt-4 text-center text-gray-600">
                            Hola <span className="font-semibold">{rejectedUser.displayName}</span>.
                        </p>
                        <p className="mt-2 text-center text-sm text-gray-500">
                            Lamentablemente, tu solicitud de acceso a la plataforma ha sido rechazada.
                        </p>
                        <div className="mt-6 p-4 bg-gray-50 rounded-md">
                            <p className="text-xs text-gray-500 text-center">
                                Si necesitas acceder, por favor intenta con otra cuenta o contacta al administrador.
                            </p>
                        </div>
                        <div className="mt-8">
                            <button
                                onClick={async () => {
                                    await logout(); // Logout
                                    window.location.reload();
                                }}
                                className="w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-gray-600 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
                            >
                                Iniciar con otra cuenta
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (suspendedUser) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
                <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-lg shadow-lg border-l-4 border-red-500">
                    <div className="text-center">
                        <div className="mx-auto h-12 w-12 bg-red-100 rounded-full flex items-center justify-center">
                            <Ban className="h-6 w-6 text-red-600" />
                        </div>
                        <h2 className="mt-6 text-center text-2xl font-bold text-gray-900">
                            Cuenta Suspendida
                        </h2>
                        <p className="mt-4 text-center text-gray-600">
                            Hola <span className="font-semibold">{suspendedUser.displayName}</span>.
                        </p>
                        <p className="mt-2 text-center text-sm text-gray-500">
                            Tu acceso a la plataforma ha sido suspendido temporalmente por un administrador.
                        </p>
                        <div className="mt-6 p-4 bg-gray-50 rounded-md">
                            <p className="text-xs text-gray-500 text-center">
                                Si crees que esto es un error, por favor contacta al soporte técnico o al administrador del sistema.
                            </p>
                        </div>
                        <div className="mt-8">
                            <button
                                onClick={async () => {
                                    await logout(); // Logout to allow signing in with another account
                                    window.location.reload();
                                }}
                                className="w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
                            >
                                Cerrar Sesión
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (pendingUser) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
                <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-lg shadow">
                    <div className="text-center">
                        <div className="mx-auto h-12 w-12 bg-yellow-100 rounded-full flex items-center justify-center">
                            <AlertTriangle className="h-6 w-6 text-yellow-600" />
                        </div>
                        <h2 className="mt-6 text-center text-2xl font-bold text-gray-900">
                            Cuenta Pendiente de Aprobación
                        </h2>
                        <p className="mt-2 text-center text-sm text-gray-600">
                            Hola, {pendingUser.displayName}. Tu cuenta necesita ser aprobada por un administrador.
                        </p>
                    </div>

                    {!pendingUser.requestedRole ? (
                        <div className="mt-8 space-y-4">
                            <p className="text-center text-sm text-gray-700 font-medium">
                                Por favor, selecciona el rol que deseas solicitar:
                            </p>
                            <button
                                onClick={() => handleRoleRequest('student')}
                                disabled={loading}
                                className="w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                            >
                                {loading ? 'Solicitando...' : 'Solicitar Acceso como Alumno'}
                            </button>
                            <button
                                onClick={() => handleRoleRequest('instructor')}
                                disabled={loading}
                                className="w-full flex justify-center py-3 px-4 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                            >
                                {loading ? 'Solicitando...' : 'Solicitar Acceso como Instructor'}
                            </button>
                        </div>
                    ) : (
                        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-md p-4">
                            <div className="flex">
                                <div className="flex-shrink-0">
                                    <Shield className="h-5 w-5 text-blue-400" />
                                </div>
                                <div className="ml-3">
                                    <h3 className="text-sm font-medium text-blue-800">Solicitud Enviada</h3>
                                    <div className="mt-2 text-sm text-blue-700">
                                        <p>
                                            Has solicitado acceso como <strong>{pendingUser.requestedRole === 'student' ? 'Alumno' : 'Instructor'}</strong>.
                                            Te notificaremos cuando tu cuenta sea aprobada.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}


                    <div className="mt-6 border-t border-gray-100 pt-6">
                        <button
                            onClick={async () => {
                                await logout();
                                window.location.reload();
                            }}
                            className="w-full flex justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
                        >
                            Ingresar con otra cuenta
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-900 py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-10">
                <div className="absolute inset-0 bg-[url('/hero-bg.png')] bg-cover bg-center"></div>
            </div>

            <div className="max-w-md w-full space-y-8 bg-gray-800 p-8 rounded-xl shadow-2xl border border-gray-700 relative z-10">
                <div className="flex flex-col items-center">
                    {/* Custom Logo */}
                    <img
                        src="/voxelhub-logo-full.png"
                        alt="VoxelHub Logo"
                        className="h-32 w-auto mb-6 drop-shadow-xl transform hover:scale-105 transition-transform duration-300"
                    />

                    <div className="mx-auto h-12 w-12 bg-indigo-900/50 rounded-full flex items-center justify-center mb-4 border border-indigo-500/30">
                        <Lock className="h-6 w-6 text-indigo-400" />
                    </div>

                    <h2 className="text-center text-3xl font-extrabold text-white tracking-tight">
                        {t('auth.loginTitle')}
                    </h2>
                    <p className="mt-2 text-center text-sm text-gray-400">
                        Inicia sesión con tu cuenta de Google Institucional
                    </p>
                </div>

                <div className="mt-8">
                    <button
                        onClick={handleGoogleLogin}
                        disabled={loading}
                        className={`group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white ${loading ? 'bg-indigo-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 shadow-lg transition-all duration-200 ease-in-out transform hover:-translate-y-0.5`}
                    >
                        <span className="absolute left-0 inset-y-0 flex items-center pl-3">
                            <div className="bg-white p-1 rounded-full">
                                {loading ? (
                                    <div className="animate-spin h-4 w-4 border-2 border-indigo-600 border-t-transparent rounded-full"></div>
                                ) : (
                                    <svg className="h-4 w-4" viewBox="0 0 24 24">
                                        <path
                                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                            fill="#4285F4"
                                        />
                                        <path
                                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                            fill="#34A853"
                                        />
                                        <path
                                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                            fill="#FBBC05"
                                        />
                                        <path
                                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                            fill="#EA4335"
                                        />
                                    </svg>
                                )}
                            </div>
                        </span>
                        {loading ? 'Iniciando sesión...' : 'Sign in with Google'}
                    </button>
                </div>

                {error && (
                    <div className="bg-red-900/30 border border-red-800 text-red-300 px-4 py-3 rounded relative text-sm text-center" role="alert">
                        <span className="block sm:inline">{error}</span>
                    </div>
                )}
            </div>
        </div>
    );
};

export default LoginPage;
