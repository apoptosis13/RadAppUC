import React, { useState, useEffect } from 'react';
import { X, Shield, Clock, BookOpen, User, Edit, AlertTriangle } from 'lucide-react';
import { authService } from '../../../services/authService';
import { activityLogService } from '../../../services/activityLogService';

const UserActivityModal = ({ user, onClose, onRoleChange }) => {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedRole, setSelectedRole] = useState(user.role);

    useEffect(() => {
        const fetchLogs = async () => {
            if (user?.email) {
                const userLogs = await activityLogService.getUserLogs(user.email);
                setLogs(userLogs);
                setLoading(false);
            }
        };
        fetchLogs();
    }, [user]);

    const handleRoleUpdate = async () => {
        if (selectedRole !== user.role) {
            await onRoleChange(user.id, user.status, selectedRole);
        }
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleString('es-CL');
    };

    const getActionIcon = (action) => {
        if (action.includes('LOGIN')) return <User className="w-4 h-4 text-green-500" />;
        if (action.includes('CASE')) return <BookOpen className="w-4 h-4 text-blue-500" />;
        if (action.includes('ANATOMY')) return <Shield className="w-4 h-4 text-purple-500" />;
        if (action.includes('USER')) return <Edit className="w-4 h-4 text-orange-500" />;
        if (action === 'ERROR') return <AlertTriangle className="w-4 h-4 text-red-600" />;
        return <Clock className="w-4 h-4 text-gray-500" />;
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="flex justify-between items-center p-6 border-b border-gray-200">
                    <div className="flex items-center space-x-4">
                        <div className="h-12 w-12 rounded-full overflow-hidden bg-gray-100">
                            {user.photoURL ? (
                                <img src={user.photoURL} alt="" className="h-full w-full object-cover" />
                            ) : (
                                <div className="h-full w-full flex items-center justify-center text-xl font-bold text-gray-400">
                                    {user.displayName?.charAt(0)}
                                </div>
                            )}
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">{user.displayName}</h2>
                            <p className="text-sm text-gray-500">
                                {user.email === 'gonzalodiazs@gmail.com' ? 'Administrador' : user.email}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-auto p-6 space-y-8">
                    {/* Role Management */}
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Gestión de Roles</h3>
                        <div className="flex items-center space-x-4">
                            <select
                                value={selectedRole}
                                onChange={(e) => setSelectedRole(e.target.value)}
                                className="block w-48 pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                            >
                                <option value="student">Alumno</option>
                                <option value="admin">Instructor (Admin)</option>
                                <option value="guest">Invitado</option>
                            </select>
                            <button
                                onClick={handleRoleUpdate}
                                disabled={selectedRole === user.role}
                                className={`px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white 
                                    ${selectedRole === user.role
                                        ? 'bg-gray-400 cursor-not-allowed'
                                        : 'bg-indigo-600 hover:bg-indigo-700'}`}
                            >
                                Actualizar Rol
                            </button>
                        </div>
                    </div>

                    {/* Activity Log */}
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Registro de Actividad (Últimos 100 eventos)</h3>
                        <div className="border rounded-lg overflow-hidden">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acción</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Detalles</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {loading ? (
                                        <tr>
                                            <td colSpan="3" className="px-6 py-4 text-center text-gray-500">Cargando actividad...</td>
                                        </tr>
                                    ) : logs.length === 0 ? (
                                        <tr>
                                            <td colSpan="3" className="px-6 py-4 text-center text-gray-500">No hay actividad registrada.</td>
                                        </tr>
                                    ) : (
                                        logs.map((log) => (
                                            <tr key={log.id} className={log.action === 'ERROR' ? "bg-red-50 hover:bg-red-100" : "hover:bg-gray-50"}>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    {formatDate(log.timestamp)}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center">
                                                        {getActionIcon(log.action)}
                                                        <span className={`ml-2 text-sm font-medium ${log.action === 'ERROR' ? 'text-red-700' : 'text-gray-900'}`}>{log.action}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-sm text-gray-500">
                                                    <pre className={`whitespace-pre-wrap font-mono text-xs p-1 rounded ${log.action === 'ERROR' ? 'text-red-800 bg-red-100 border border-red-200' : 'text-gray-600 bg-gray-50'}`}>
                                                        {JSON.stringify(log.details, null, 2)}
                                                    </pre>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UserActivityModal;
