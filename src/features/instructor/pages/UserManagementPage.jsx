import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Edit, Trash2, X, Check, XCircle, Ban, PlayCircle, Crown } from 'lucide-react';
import { authService } from '../../../services/authService';
import { auth } from '../../../config/firebase';
import { onAuthStateChanged } from 'firebase/auth';

import UserActivityModal from '../components/UserActivityModal';

const SUPER_ADMIN_EMAIL = 'gonzalodiazs@gmail.com';

const UserManagementPage = () => {
    const { t } = useTranslation();
    const [currentUser, setCurrentUser] = useState(authService.getCurrentUser());
    const [users, setUsers] = useState([]);
    const [error, setError] = useState('');
    const [selectedUser, setSelectedUser] = useState(null);

    // Manual reactivity
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setCurrentUser(user);
        });
        return () => unsubscribe();
    }, []);

    // Check if current user is admin (Instructor)
    const isAdmin = currentUser?.role === 'admin';
    // Keep Super Admin distinction for critical actions if needed (like deleting other admins)
    const isSuperAdmin = currentUser?.email?.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();

    // Allow access if admin OR super admin (redundant but safe)
    const canViewActivity = isAdmin || isSuperAdmin;

    const loadUsers = React.useCallback(async () => {
        try {
            const allUsers = await authService.getAllUsers();
            setUsers(allUsers);
        } catch (err) {
            console.error('Failed to load users', err);
        }
    }, []);

    useEffect(() => {
        loadUsers();
    }, [loadUsers]);

    const handleStatusChange = async (id, newStatus, newRole) => {
        try {
            await authService.updateUserStatus(id, newStatus, newRole);

            // Log this administrative action if current user is super admin
            if (currentUser?.email === SUPER_ADMIN_EMAIL) {
                const { activityLogService } = await import('../../../services/activityLogService');
                const targetUser = users.find(u => u.id === id);
                await activityLogService.logActivity('USER_STATUS_CHANGE', {
                    targetUser: targetUser?.email === SUPER_ADMIN_EMAIL ? 'Administrador' : (targetUser?.email || id),
                    newStatus,
                    newRole
                });
            }

            loadUsers();
            if (selectedUser && selectedUser.id === id) {
                const updatedUser = users.find(u => u.id === id);
                if (updatedUser) setSelectedUser({ ...updatedUser, status: newStatus, role: newRole || updatedUser.role });
            }
        } catch (err) {
            setError(err.message || 'Failed to update user status');
        }
    };

    const handleDeleteUser = async (id) => {
        if (window.confirm('¿Estás seguro de que quieres eliminar este registro? Esta acción no se puede deshacer.')) {
            try {
                await authService.deleteUser(id);
                loadUsers();
            } catch (err) {
                console.error(err);
                setError(err.message || 'Failed to delete user');
            }
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gray-900">{t('instructor.users.title')}</h1>
            </div>

            {error && (
                <div className="bg-red-50 border-l-4 border-red-400 p-4">
                    <p className="text-sm text-red-700">{error}</p>
                </div>
            )}

            <div className="bg-white shadow overflow-hidden sm:rounded-lg">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Usuario
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Email
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Rol Actual
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Estado
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Solicitud
                            </th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Acciones
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {users.map((user) => {
                            const isTargetSuperAdmin = user.email === SUPER_ADMIN_EMAIL;
                            const isCurrentActiveSession = user.id === currentUser?.uid;

                            // allow management if:
                            // 1. It's not a superadmin doc OR
                            // 2. It's a superadmin doc but NOT the active session one (cleanup of dupes)
                            const canManageDoc = !isTargetSuperAdmin || (isSuperAdmin && !isCurrentActiveSession);
                            const canManageActions = isSuperAdmin || user.role !== 'admin';

                            return (
                                <tr key={user.id}>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                            <div className="h-8 w-8 rounded-full overflow-hidden bg-gray-100 relative">
                                                {user.photoURL ? (
                                                    <img src={user.photoURL} alt="" className="h-full w-full object-cover" />
                                                ) : (
                                                    <div className="h-full w-full flex items-center justify-center text-gray-400 font-bold">
                                                        {user.displayName?.charAt(0)}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="relative -ml-3 -mt-3">
                                                {user.email === 'gonzalodiazs@gmail.com' && (
                                                    <div className="absolute top-0 right-0 bg-white rounded-full p-0.5 shadow-sm z-10" title="Super Admin">
                                                        <Crown className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                                                    </div>
                                                )}
                                                {user.email !== 'gonzalodiazs@gmail.com' && (user.role === 'admin' || user.role === 'instructor') && (
                                                    <div className="absolute top-0 right-0 bg-white rounded-full p-0.5 shadow-sm z-10" title="Instructor">
                                                        <Crown className="w-3 h-3 text-slate-400 fill-slate-400" />
                                                    </div>
                                                )}
                                            </div>
                                            <div className="ml-3">
                                                <div className="text-sm font-medium text-gray-900">{user.displayName}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex flex-col">
                                            <div className="text-sm text-gray-500 font-medium">
                                                {isTargetSuperAdmin ? 'Administrador' : user.email}
                                            </div>
                                            <div className="flex items-center space-x-2 mt-1">
                                                <span className={`text-[10px] px-1.5 py-0.5 rounded border leading-none font-bold uppercase tracking-wider ${user.id?.includes('@')
                                                    ? 'bg-amber-50 text-amber-600 border-amber-200'
                                                    : 'bg-indigo-50 text-indigo-600 border-indigo-200'
                                                    }`}>
                                                    {user.id?.includes('@') ? 'Legacy' : 'UID'}
                                                </span>
                                                <code className="text-[10px] text-gray-400 font-mono">
                                                    #{user.id?.substring(user.id.length - 6)}
                                                </code>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2.5 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full border ${isTargetSuperAdmin
                                            ? 'bg-purple-50 text-purple-700 border-purple-200' :
                                            user.role === 'admin' || user.role === 'instructor' ? 'bg-slate-50 text-slate-700 border-slate-200' :
                                                user.role === 'student' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                                    'bg-gray-50 text-gray-600 border-gray-200'
                                            }`}>
                                            {isTargetSuperAdmin ? 'Administrador' :
                                                (user.role === 'admin' || user.role === 'instructor') ? 'Instructor' :
                                                    user.role === 'student' ? 'Alumno' : 'Invitado'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${user.status === 'approved' ? 'bg-green-100 text-green-800' :
                                            user.status === 'suspended' ? 'bg-red-100 text-red-800' :
                                                'bg-yellow-100 text-yellow-800'
                                            }`}>
                                            {user.status === 'approved' ? 'Aprobado' :
                                                user.status === 'suspended' ? 'Suspendido' :
                                                    'Pendiente'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        {user.requestedRole && user.status === 'pending' && (
                                            <span className="text-xs text-indigo-600 font-medium">
                                                Solicita: {user.requestedRole === 'admin' || user.requestedRole === 'instructor' ? 'Instructor' : 'Alumno'}
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <div className="flex justify-end space-x-2">
                                            {canViewActivity && (
                                                <button
                                                    onClick={() => setSelectedUser(user)}
                                                    className="text-indigo-600 hover:text-indigo-900 mr-2"
                                                    title="Gestionar y Ver Actividad"
                                                >
                                                    <Edit className="w-5 h-5" />
                                                </button>
                                            )}

                                            {canManageDoc && canManageActions && (
                                                <>
                                                    {user.status === 'pending' && (
                                                        <>
                                                            <button
                                                                onClick={() => {
                                                                    const roleToAssign = (user.requestedRole === 'admin' || user.requestedRole === 'instructor') ? 'admin' : 'student';
                                                                    handleStatusChange(user.id, 'approved', roleToAssign);
                                                                }}
                                                                className="text-green-600 hover:text-green-900"
                                                                title="Aprobar"
                                                            >
                                                                <Check className="w-5 h-5" />
                                                            </button>
                                                            <button
                                                                onClick={() => handleStatusChange(user.id, 'rejected')}
                                                                className="text-red-600 hover:text-red-900"
                                                                title="Rechazar"
                                                            >
                                                                <XCircle className="w-5 h-5" />
                                                            </button>
                                                        </>
                                                    )}

                                                    {user.status === 'approved' && (
                                                        <button
                                                            onClick={() => handleStatusChange(user.id, 'suspended', user.role)}
                                                            className="text-orange-600 hover:text-orange-900"
                                                            title="Suspender"
                                                        >
                                                            <Ban className="w-5 h-5" />
                                                        </button>
                                                    )}

                                                    {user.status === 'suspended' && (
                                                        <button
                                                            onClick={() => handleStatusChange(user.id, 'approved', user.role)}
                                                            className="text-green-600 hover:text-green-900"
                                                            title="Reactivar"
                                                        >
                                                            <PlayCircle className="w-5 h-5" />
                                                        </button>
                                                    )}

                                                    <button
                                                        onClick={() => handleDeleteUser(user.id)}
                                                        className="text-gray-400 hover:text-red-600"
                                                        title="Eliminar registro"
                                                    >
                                                        <Trash2 className="w-5 h-5" />
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>

            {selectedUser && (
                <UserActivityModal
                    user={selectedUser}
                    onClose={() => setSelectedUser(null)}
                    onRoleChange={async (id, status, newRole) => {
                        await handleStatusChange(id, status, newRole);
                        const { activityLogService } = await import('../../../services/activityLogService');
                        const targetUser = users.find(u => u.id === id);
                        await activityLogService.logActivity('USER_ROLE_CHANGE', {
                            targetUser: targetUser?.email === SUPER_ADMIN_EMAIL ? 'Administrador' : (targetUser?.email || id),
                            newRole
                        });
                        const updatedUser = users.find(u => u.id === id);
                        if (updatedUser) setSelectedUser({ ...updatedUser, role: newRole });
                        loadUsers();
                    }}
                />
            )}
        </div>
    );
};

export default UserManagementPage;
