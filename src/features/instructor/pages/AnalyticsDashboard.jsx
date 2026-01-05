import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
    PieChart, Pie, Cell, ResponsiveContainer,
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
    BarChart, Bar, Legend
} from 'recharts';
import { activityLogService } from '../../../services/activityLogService';
import { useAuth } from '../../../context/AuthContext';
import { Shield, TrendingUp, Users, Activity, X } from 'lucide-react';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];
const SUPER_ADMIN = 'gonzalodiazs@gmail.com';

const AnalyticsDashboard = () => {
    const { user } = useAuth();
    const { t } = useTranslation();
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        totalActions: 0,
        activeUsers: 0,
        onlineCount: 0,
        onlineUsersList: [],
        actionDistribution: [],
        dailyActivity: [],
        topInstructores: []
    });
    const [showOnlineModal, setShowOnlineModal] = useState(false);

    useEffect(() => {
        if (user?.email !== SUPER_ADMIN) return;
        loadData();
    }, [user]);

    const loadData = async () => {
        const logs = await activityLogService.getGlobalLogs(1000); // Fetch last 1000 actions
        processLogs(logs);
        setLoading(false);
    };

    const processLogs = (logs) => {
        // 1. Action Distribution
        const actionCounts = {};
        logs.forEach(log => {
            const action = log.action;
            actionCounts[action] = (actionCounts[action] || 0) + 1;
        });
        const actionDistribution = Object.keys(actionCounts).map(key => ({
            name: key,
            value: actionCounts[key]
        }));

        // 2. Daily Activity (Last 30 days)
        const dailyCounts = {};
        // Initialize last 30 days with 0
        for (let i = 29; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dateStr = d.toLocaleDateString('es-CL');
            dailyCounts[dateStr] = 0;
        }

        logs.forEach(log => {
            const dateStr = new Date(log.timestamp).toLocaleDateString('es-CL');
            if (dailyCounts.hasOwnProperty(dateStr)) {
                dailyCounts[dateStr]++;
            }
        });
        const dailyActivity = Object.keys(dailyCounts).map(date => ({
            date,
            count: dailyCounts[date]
        }));

        // 3. Top Instructors (Content Creation)
        const instructorActivity = {};
        logs.filter(l => ['CREATE_CASE', 'EDIT_ANATOMY', 'UPDATE_CASE'].includes(l.action)).forEach(log => {
            const name = log.displayName || log.email;
            instructorActivity[name] = (instructorActivity[name] || 0) + 1;
        });
        const topInstructores = Object.keys(instructorActivity)
            .map(name => ({ name, value: instructorActivity[name] }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 5);

        // 4. Unique Users
        const uniqueUsers = new Set(logs.map(l => l.email)).size;

        // 5. Online Users (Active in last 15 minutes)
        const now = new Date();
        const fifteenMinutesAgo = new Date(now.getTime() - 15 * 60 * 1000);
        const onlineUsersMap = new Map();

        logs.forEach(log => {
            const logTime = new Date(log.timestamp);
            if (logTime >= fifteenMinutesAgo) {
                const currentData = onlineUsersMap.get(log.email);
                const currentLastActive = currentData ? currentData.lastActive : new Date(0); // handle previous format mismatch if any

                // Check if valid object or needs init
                if (!currentData || logTime > currentData.lastActive) {
                    onlineUsersMap.set(log.email, {
                        lastActive: logTime,
                        displayName: log.displayName
                    });
                } else if (currentData && !currentData.displayName && log.displayName) {
                    currentData.displayName = log.displayName;
                }
            }
        });

        const onlineUsersList = Array.from(onlineUsersMap.entries()).map(([email, data]) => ({
            email,
            lastActive: data.lastActive,
            displayName: data.displayName
        })).sort((a, b) => b.lastActive - a.lastActive);

        setStats({
            totalActions: logs.length,
            activeUsers: uniqueUsers,
            onlineCount: onlineUsersList.length,
            onlineUsersList,
            actionDistribution,
            dailyActivity,
            topInstructores
        });
    };

    if (user?.email !== SUPER_ADMIN) {
        return <div className="p-8 text-center text-red-600">Acceso Denegado. Esta vista es exclusiva para el Super Administrador.</div>;
    }

    if (loading) return <div className="p-8 text-center">Cargando analíticas...</div>;

    return (
        <div className="p-6 space-y-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                <Activity className="w-8 h-8 mr-2 text-indigo-600" />
                Panel de Analíticas y Estadísticas
            </h1>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-6 rounded-lg shadow border border-gray-100 flex items-center">
                    <div className="p-3 rounded-full bg-blue-100 text-blue-600 mr-4">
                        <TrendingUp className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-sm text-gray-500 font-medium">Acciones (Muestra)</p>
                        <h3 className="text-2xl font-bold text-gray-900">{stats.totalActions}</h3>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-lg shadow border border-gray-100 flex items-center">
                    <div className="p-3 rounded-full bg-green-100 text-green-600 mr-4">
                        <Users className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-sm text-gray-500 font-medium">Usuarios Activos</p>
                        <h3 className="text-2xl font-bold text-gray-900">{stats.activeUsers}</h3>
                    </div>
                </div>

                {/* Online Users Card */}
                <div
                    onClick={() => setShowOnlineModal(true)}
                    className="bg-white p-6 rounded-lg shadow border border-gray-100 flex items-center cursor-pointer hover:bg-gray-50 transition-colors"
                >
                    <div className="relative p-3 rounded-full bg-indigo-50 text-indigo-600 mr-4">
                        <Activity className="w-6 h-6" />
                        <span className="absolute top-0 right-0 block h-3 w-3 rounded-full ring-2 ring-white bg-green-400 animate-pulse"></span>
                    </div>
                    <div>
                        <p className="text-sm text-gray-500 font-medium">En Línea (15 min)</p>
                        <h3 className="text-2xl font-bold text-gray-900">{stats.onlineCount}</h3>
                    </div>
                </div>
            </div>

            {/* Charts Row 1 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Evolution Chart */}
                <div className="bg-white p-6 rounded-lg shadow">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">Evolución de Actividad (30 días)</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={stats.dailyActivity}>
                                <defs>
                                    <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8} />
                                        <stop offset="95%" stopColor="#8884d8" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="date" hide />
                                <YAxis />
                                <Tooltip />
                                <Area type="monotone" dataKey="count" stroke="#8884d8" fillOpacity={1} fill="url(#colorCount)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Distribution Chart */}
                <div className="bg-white p-6 rounded-lg shadow">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">Distribución de Acciones</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={stats.actionDistribution}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                                    outerRadius={80}
                                    fill="#8884d8"
                                    dataKey="value"
                                >
                                    {stats.actionDistribution.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Top Instructors */}
            <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                    <Shield className="w-5 h-5 mr-2 text-indigo-500" />
                    Top Instructores (Creación de Contenido)
                </h3>
                <div className="h-64">
                    {stats.topInstructores.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={stats.topInstructores} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                <XAxis type="number" />
                                <YAxis dataKey="name" type="category" width={150} />
                                <Tooltip />
                                <Bar dataKey="value" fill="#82ca9d" name="Acciones de Creación/Edición" />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="flex items-center justify-center h-full text-gray-500">
                            No hay actividad de creación suficiente para mostrar ranking.
                        </div>
                    )}
                </div>
            </div>
            {/* Online Users Modal */}
            {showOnlineModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-bold text-gray-900 flex items-center">
                                <span className="relative flex h-3 w-3 mr-3">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                                </span>
                                Usuarios En Línea ({stats.onlineCount})
                            </h3>
                            <button
                                onClick={() => setShowOnlineModal(false)}
                                className="text-gray-400 hover:text-gray-500"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                        <div className="max-h-96 overflow-y-auto">
                            {stats.onlineUsersList.length > 0 ? (
                                <div className="divide-y divide-gray-100">
                                    {stats.onlineUsersList.map((user, idx) => (
                                        <div key={idx} className="py-3 flex items-center justify-between">
                                            <div className="flex items-center">
                                                <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-xs mr-3">
                                                    {user.email.charAt(0).toUpperCase()}
                                                </div>
                                                <span className="text-gray-700 font-medium">
                                                    {user.email} {user.displayName && <span className="text-gray-500 font-normal">({user.displayName})</span>}
                                                </span>
                                            </div>
                                            <span className="text-xs text-gray-400">
                                                {user.lastActive.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-gray-500 text-center py-4">No hay usuarios activos adicionales.</p>
                            )}
                        </div>
                        <div className="mt-4 pt-4 border-t border-gray-100 text-right">
                            <button
                                onClick={() => setShowOnlineModal(false)}
                                className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded hover:bg-indigo-700"
                            >
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AnalyticsDashboard;
