import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Edit, Trash2, X, Check, XCircle, Ban, PlayCircle, Crown, ArrowRightLeft, Search, ArrowUp, ArrowDown, Users } from 'lucide-react';
import PageHeader from '../../../components/PageHeader';
import { authService } from '../../../services/authService';
import { auth } from '../../../config/firebase';
import { onAuthStateChanged } from 'firebase/auth';

import UserAvatar from '../../../components/UserAvatar';
import UserActivityModal from '../components/UserActivityModal';

const SUPER_ADMIN_EMAIL = 'gonzalodiazs@gmail.com';

const UserManagementPage = () => {
    const { t } = useTranslation();
    const [currentUser, setCurrentUser] = useState(authService.getCurrentUser());
    const [users, setUsers] = useState([]);
    const [error, setError] = useState('');
    const [selectedUser, setSelectedUser] = useState(null);
    const [userToDelete, setUserToDelete] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortConfig, setSortConfig] = useState({ key: 'displayName', direction: 'asc' });

    // Manual reactivity
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setCurrentUser(user);
        });
        return () => unsubscribe();
    }, []);

    // Check if current user is admin (Instructor)
    // We need to look up the role from the loaded users list or use a separate state if users aren't loaded yet.
    // Ideally, we'd have a useUserProfile hook, but here we can find it in 'users' or assume specific context.
    // For now, let's derive it from the 'users' array if available, or default to false until loaded.
    const currentUserProfile = users.find(u => u.uid === currentUser?.uid || u.email === currentUser?.email);
    // Ensure Super Admin is always Admin, even if profile lookup fails
    const isSuperAdmin = currentUser?.email?.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();
    const isAdmin = isSuperAdmin || currentUserProfile?.role === 'admin';

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

    // Role weighting for sorting (1 is Highest Rank/Top)
    const getRoleWeight = (user) => {
        if (user.email === SUPER_ADMIN_EMAIL) return 1;
        switch (user.role) {
            case 'admin':
            case 'instructor':
                return 2;
            case 'student':
                return 3;
            default:
                return 4;
        }
    };

    const handleSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const getSortedAndFilteredUsers = React.useMemo(() => {
        let filtered = [...users];

        // Filter
        if (searchTerm) {
            const lowerTerm = searchTerm.toLowerCase();
            filtered = filtered.filter(u =>
                (u.displayName || '').toLowerCase().includes(lowerTerm) ||
                (u.email || '').toLowerCase().includes(lowerTerm)
            );
        }

        // Sort
        filtered.sort((a, b) => {
            if (sortConfig.key === 'role') {
                const weightA = getRoleWeight(a);
                const weightB = getRoleWeight(b);

                if (weightA !== weightB) {
                    // Primary Sort: Role Rank
                    const result = weightA - weightB;
                    return sortConfig.direction === 'asc' ? result : -result;
                }

                // Secondary Sort: Alphabetical by Name (Always A-Z for consistency within groups)
                const nameA = (a.displayName || '').toLowerCase();
                const nameB = (b.displayName || '').toLowerCase();
                return nameA.localeCompare(nameB);
            } else {
                // Default string sort (displayName, email, etc)
                const valA = (a[sortConfig.key] || '').toString().toLowerCase();
                const valB = (b[sortConfig.key] || '').toString().toLowerCase();

                if (valA === valB) return 0;
                const result = valA < valB ? -1 : 1;
                return sortConfig.direction === 'asc' ? result : -result;
            }
        });

        return filtered;
    }, [users, searchTerm, sortConfig]);

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

    const handleDeleteUser = (id) => {
        const user = users.find(u => u.id === id);
        if (user) {
            setUserToDelete(user);
        }
    };

    const executeDeleteUser = async () => {
        if (!userToDelete) return;

        const id = userToDelete.id;
        try {
            await authService.deleteUser(id);
            await loadUsers();
            setUserToDelete(null); // Close modal
            // Optional: User feedback handled by UI update, but we can add a transient success state if needed
        } catch (err) {
            console.error("Error deleting user:", err);
            // Close modal even on error to prevent stuck state, show error in main UI
            setUserToDelete(null);
            setError(`Error al eliminar: ${err.message}. Revisa la consola.`);
        }
    };

    const handleMigrateUser = async (email, uid) => {
        if (window.confirm(`¿Confirmas la migración del usuario ${email} al nuevo sistema UID? El registro antiguo será eliminado.`)) {
            try {
                await authService.migrateUser(email, uid);
                loadUsers();
            } catch (err) {
                setError(err.message || 'Failed to migrate user');
            }
        }
    };

    return (
        <div className="space-y-6">
            <PageHeader
                title={t('instructor.users.title')}
                icon={Users}
                actions={
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search className="h-4 w-4 text-gray-400" />
                        </div>
                        <input
                            type="text"
                            placeholder="Buscar usuario..."
                            className="block w-full pl-9 pr-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg leading-5 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent sm:text-sm shadow-sm transition-all"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                }
            />

            {error && (
                <div className="bg-red-50 border-l-4 border-red-400 p-4">
                    <p className="text-sm text-red-700">{error}</p>
                </div>
            )}

            <div className="bg-white shadow overflow-hidden sm:rounded-lg overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th
                                scope="col"
                                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 group"
                                onClick={() => handleSort('displayName')}
                            >
                                <div className="flex items-center">
                                    Usuario
                                    {sortConfig.key === 'displayName' && (
                                        sortConfig.direction === 'asc' ? <ArrowUp className="ml-1 h-4 w-4" /> : <ArrowDown className="ml-1 h-4 w-4" />
                                    )}
                                </div>
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Email
                            </th>
                            <th
                                scope="col"
                                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                                onClick={() => handleSort('role')}
                            >
                                <div className="flex items-center">
                                    Rol Actual
                                    {sortConfig.key === 'role' && (
                                        sortConfig.direction === 'asc' ? <ArrowUp className="ml-1 h-4 w-4" /> : <ArrowDown className="ml-1 h-4 w-4" />
                                    )}
                                </div>
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
                        {getSortedAndFilteredUsers.map((user) => {
                            const isTargetSuperAdmin = user.email === SUPER_ADMIN_EMAIL;
                            const isCurrentActiveSession = user.id === currentUser?.uid;

                            // allow management if:
                            // 1. It's not a superadmin doc OR
                            // 2. It's a superadmin doc but NOT the active session one (cleanup of dupes)
                            const canManageDoc = !isTargetSuperAdmin || (isSuperAdmin && !isCurrentActiveSession);
                            // Only admins can manage. Super admins can do everything. Regular admins can manage non-admins.
                            // Only admins can manage. Super admins can do everything. Regular admins can manage non-admins.
                            // If isSuperAdmin -> True always.
                            // If isAdmin -> True if target is NOT an admin.
                            const canManageActions = isSuperAdmin || (isAdmin && user.role !== 'admin' && user.role !== 'instructor');

                            return (
                                <tr key={user.id}>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                            <div className="relative">
                                                <UserAvatar
                                                    src={user.photoURL}
                                                    name={user.displayName}
                                                    size="sm"
                                                />
                                                {/* Crown Badge */}
                                                {user.email === SUPER_ADMIN_EMAIL ? (
                                                    <div className="absolute -bottom-0.5 -right-0.5 bg-white rounded-full p-0.5 shadow-md z-10" title="Super Admin">
                                                        <Crown className="w-2.5 h-2.5 text-yellow-500 fill-yellow-500" />
                                                    </div>
                                                ) : (user.role === 'admin' || user.role === 'instructor') ? (
                                                    <div className="absolute -bottom-0.5 -right-0.5 bg-white rounded-full p-0.5 shadow-md z-10" title="Instructor">
                                                        <Crown className="w-2.5 h-2.5 text-slate-400 fill-slate-400" />
                                                    </div>
                                                ) : null}
                                            </div>
                                            <div className="ml-3">
                                                <div className="text-sm font-medium text-gray-900 font-outfit">{user.displayName}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex flex-col">
                                            <div className="text-sm text-gray-500 font-medium">
                                                {isTargetSuperAdmin ? 'Administrador' : user.email}
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

                                                    {isSuperAdmin && user.id.includes('@') && user.uid && (
                                                        <button
                                                            onClick={() => handleMigrateUser(user.id, user.uid)}
                                                            className="text-blue-500 hover:text-blue-700"
                                                            title="Migrar a UID (Best Practice)"
                                                        >
                                                            <ArrowRightLeft className="w-5 h-5" />
                                                        </button>
                                                    )}

                                                    <button
                                                        onClick={() => handleDeleteUser(user.id)}
                                                        className="text-gray-500 hover:text-red-700 hover:bg-red-50 p-1 rounded transition-colors"
                                                        title="Eliminar usuario permanentemente"
                                                    >
                                                        <Trash2 className="w-5 h-5 text-red-500" />
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

            {/* Delete Confirmation Modal */}
            {userToDelete && (
                <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
                    <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                        {/* Background overlay */}
                        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={() => setUserToDelete(null)}></div>

                        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

                        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                            <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                                <div className="sm:flex sm:items-start">
                                    <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                                        <Trash2 className="h-6 w-6 text-red-600" aria-hidden="true" />
                                    </div>
                                    <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                                        <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                                            Eliminar Usuario
                                        </h3>
                                        <div className="mt-2">
                                            <p className="text-sm text-gray-500">
                                                ¿Estás seguro de que deseas eliminar permanentemente al usuario <strong>{userToDelete.displayName}</strong> ({userToDelete.email})?
                                                <br /><br />
                                                Esta acción eliminará todos sus datos y acceso. <span className="text-red-600 font-bold">Esta acción no se puede deshacer.</span>
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                                <button
                                    type="button"
                                    onClick={executeDeleteUser}
                                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm"
                                >
                                    Eliminar Definitivamente
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setUserToDelete(null)}
                                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                                >
                                    Cancelar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserManagementPage;
