import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
    PieChart, Pie, Cell, ResponsiveContainer,
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
    BarChart, Bar, Legend, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';
import { activityLogService } from '../../../services/activityLogService';
import { caseService } from '../../../services/caseService';
import { anatomyService } from '../../../services/anatomyService';
import { statsService } from '../../../services/statsService';
import { useAuth } from '../../../context/AuthContext';
import { Shield, TrendingUp, Users, Activity, X, BookOpen, Map as MapIcon, Clock, AlertCircle, Trophy, Eye, ChevronRight } from 'lucide-react';

const COLORS = [
    '#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
    '#ec4899', '#0ea5e9', '#f97316', '#14b8a6', '#64748b',
    '#a855f7', '#06b6d4'
];
const SUPER_ADMIN = 'gonzalodiazs@gmail.com';

const AnalyticsDashboard = () => {
    const { user } = useAuth();
    const { t } = useTranslation();
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('overview');
    const [stats, setStats] = useState({
        totalActions: 0,
        activeUsers: 0,
        onlineCount: 0,
        onlineUsersList: [],
        actionDistribution: [],
        dailyActivity: [],
        topInstructores: [],
        regionalDistribution: [],
        topCases: [],
        topModules: [],
        topStudents: [],
        errorRate: 0,
        inventory: { cases: 0, modules: 0 },
        quizStats: {
            totalPlayed: 0,
            avgScore: 0,
            leaderboard: [],
            distribution: []
        },
        allUsers: []
    });
    const [showOnlineModal, setShowOnlineModal] = useState(false);

    // User Detail State
    const [selectedUser, setSelectedUser] = useState(null);
    const [userHistory, setUserHistory] = useState([]);
    const [showUserModal, setShowUserModal] = useState(false);
    const [historyLoading, setHistoryLoading] = useState(false);

    const [errorMsg, setErrorMsg] = useState(null);

    useEffect(() => {
        if (!user?.email) return;
        if (user.email.toLowerCase() !== SUPER_ADMIN.toLowerCase()) return;
        loadData();
    }, [user]);

    const loadData = async () => {
        setLoading(true);
        setErrorMsg(null);
        try {
            const [logs, allCases, allModules] = await Promise.all([
                activityLogService.getGlobalLogs(2000).catch(e => {
                    console.error("Logs fetch failed", e);
                    return [];
                }),
                caseService.getAllCases().catch(e => {
                    console.error("Cases fetch failed", e);
                    return [];
                }),
                anatomyService.getModules().catch(e => {
                    console.error("Modules fetch failed", e);
                    return [];
                })
            ]);

            if (logs.length === 0 && allCases.length === 0 && allModules.length === 0) {
                setErrorMsg("No se pudieron recuperar datos de ninguna fuente. Verifica tu conexión o permisos.");
            }

            processData(logs, allCases, allModules);
        } catch (error) {
            console.error("Critical error loading analytics data:", error);
            setErrorMsg("Error crítico al procesar datos: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    const processData = (logs, cases, modules) => {
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

        const errors = actionCounts['ERROR'] || 0;
        const errorRate = ((errors / logs.length) * 100).toFixed(1);

        // 2. Daily Activity
        const dailyCounts = {};
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

        // 3. Regional Distribution
        const regions = {};
        cases.forEach(c => {
            const reg = c.region || 'Otro';
            regions[reg] = (regions[reg] || 0) + 1;
        });
        modules.forEach(m => {
            const reg = m.region || 'Otro';
            regions[reg] = (regions[reg] || 0) + 1;
        });
        const regionalDistribution = Object.keys(regions).map(name => ({
            name: name,
            value: regions[name]
        }));

        // 4. Popularity
        const caseViews = {};
        const moduleViews = {};
        const studentActivity = {};
        const instructorActivity = {};

        logs.forEach(log => {
            if (log.action === 'VIEW_CASE' && log.details?.title) {
                caseViews[log.details.title] = (caseViews[log.details.title] || 0) + 1;
            }
            if (log.action === 'VIEW_ANATOMY' && log.details?.title) {
                moduleViews[log.details.title] = (moduleViews[log.details.title] || 0) + 1;
            }
            if (log.email !== SUPER_ADMIN) {
                const name = log.displayName || log.email;
                studentActivity[name] = (studentActivity[name] || 0) + 1;

                if (['CREATE_CASE', 'EDIT_ANATOMY', 'UPDATE_CASE'].includes(log.action)) {
                    instructorActivity[name] = (instructorActivity[name] || 0) + 1;
                }
            }
        });

        const topCases = Object.entries(caseViews).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 10);
        const topModules = Object.entries(moduleViews).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 10);
        const topStudents = Object.entries(studentActivity).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 5);
        const topInstructores = Object.entries(instructorActivity).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 5);

        // 5. Online Users
        const now = new Date();
        const fifteenMinutesAgo = new Date(now.getTime() - 15 * 60 * 1000);
        const onlineUsersMap = new Map();

        logs.forEach(log => {
            const logTime = new Date(log.timestamp);
            if (logTime >= fifteenMinutesAgo) {
                const currentData = onlineUsersMap.get(log.email);
                if (!currentData || logTime > currentData.lastActive) {
                    onlineUsersMap.set(log.email, {
                        lastActive: logTime,
                        displayName: log.displayName,
                        userAgent: log.userAgent
                    });
                }
            }
        });

        const onlineUsersList = Array.from(onlineUsersMap.entries()).map(([email, data]) => ({
            email,
            ...data
        })).sort((a, b) => b.lastActive - a.lastActive);

        // 6. Anatomical Quiz Stats from Logs
        const quizLogs = logs.filter(l => l.action === 'COMPLETE_ANATOMY_QUIZ');
        const totalPlayed = quizLogs.length;
        const totalScore = quizLogs.reduce((acc, l) => acc + (l.details?.score || 0), 0);
        const avgScore = totalPlayed > 0 ? Math.round(totalScore / totalPlayed) : 0;

        const leaderboard = quizLogs
            .map(l => ({
                uid: l.uid,
                email: l.email,
                user: l.displayName || l.email,
                score: l.details?.score || 0,
                module: l.details?.moduleTitle || 'Desconocido',
                date: new Date(l.timestamp).toLocaleDateString()
            }))
            .sort((a, b) => b.score - a.score)
            .slice(0, 10);

        // 7. Extract Unique Users for List
        const usersMap = new Map();
        logs.forEach(log => {
            if (log.email && !usersMap.has(log.email)) {
                usersMap.set(log.email, {
                    uid: log.uid, // May be undefined in old logs, but needed for fetching history
                    email: log.email,
                    displayName: log.displayName || log.email.split('@')[0],
                    lastActive: new Date(log.timestamp)
                });
            } else if (log.email && usersMap.has(log.email)) {
                // Update last active if newer
                const existing = usersMap.get(log.email);
                const current = new Date(log.timestamp);
                if (current > existing.lastActive) {
                    existing.lastActive = current;
                    // Try to capture UID if we missed it before
                    if (!existing.uid && log.uid) existing.uid = log.uid;
                    usersMap.set(log.email, existing);
                }
            }
        });
        const allUsers = Array.from(usersMap.values()).sort((a, b) => b.lastActive - a.lastActive);

        setStats({
            totalActions: logs.length,
            activeUsers: usersMap.size,
            onlineCount: onlineUsersList.length,
            onlineUsersList,
            actionDistribution,
            dailyActivity,
            topInstructores,
            regionalDistribution,
            topCases,
            topModules,
            topStudents,
            errorRate,
            inventory: { cases: cases.length, modules: modules.length },
            quizStats: {
                totalPlayed,
                avgScore,
                leaderboard
            }
        });
    };



    const handleViewUser = async (user) => {
        if (!user.uid) {
            alert("Este usuario no tiene un ID registrado en los logs nuevos, no se puede buscar su historial.");
            return;
        }
        setSelectedUser(user);
        setHistoryLoading(true);
        setShowUserModal(true);
        try {
            const history = await statsService.getHistory(user.uid, 50);
            setUserHistory(history);
        } catch (error) {
            console.error("Error fetching user history", error);
        } finally {
            setHistoryLoading(false);
        }
    };

    const parseUserAgent = (ua) => {
        if (!ua) return 'Desconocido';
        if (ua.includes('Windows')) return 'Windows';
        if (ua.includes('Macintosh')) return 'Mac';
        if (ua.includes('Android')) return 'Android';
        if (ua.includes('iPhone') || ua.includes('iPad')) return 'iOS';
        return 'Browser';
    };

    if (user?.email?.toLowerCase() !== SUPER_ADMIN.toLowerCase()) {
        return <div className="p-8 text-center text-red-600">Acceso Denegado. Esta vista es exclusiva para el Super Administrador.</div>;
    }

    if (loading) return <div className="p-8 text-center">Cargando analíticas robustas...</div>;

    return (
        <div className="p-6 space-y-6 max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                    <Activity className="w-8 h-8 mr-2 text-indigo-600" />
                    Panel de Inteligencia Educativa
                </h1>

                {/* Tabs & Controls */}
                <div className="flex flex-wrap items-center gap-2">
                    <button
                        onClick={loadData}
                        className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-gray-100 rounded-lg transition-colors mr-2"
                        title="Actualizar Datos"
                    >
                        <TrendingUp className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                    <div className="flex bg-gray-100 p-1 rounded-lg">
                        <button
                            onClick={() => setActiveTab('overview')}
                            className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'overview' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            Visión General
                        </button>
                        <button
                            onClick={() => setActiveTab('content')}
                            className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'content' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            Popularidad y Contenido
                        </button>
                        <button
                            onClick={() => setActiveTab('users')}
                            className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'users' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            Estadísticas de Usuarios
                        </button>
                        <button
                            onClick={() => setActiveTab('quizzes')}
                            className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'quizzes' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            Evaluaciones
                        </button>
                    </div>
                </div>
            </div>

            {errorMsg && (
                <div className="bg-amber-50 border-l-4 border-amber-400 p-4 rounded-r-lg flex items-start">
                    <AlertCircle className="w-5 h-5 text-amber-500 mr-3 mt-0.5" />
                    <div>
                        <p className="text-sm text-amber-800 font-medium">Atención</p>
                        <p className="text-xs text-amber-700 mt-1">{errorMsg}</p>
                    </div>
                </div>
            )}

            {activeTab === 'overview' && (
                <div className="space-y-6 animate-in fade-in duration-500">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Muestra de Logs</p>
                                    <h3 className="text-2xl font-bold text-gray-900 mt-1">{stats.totalActions}</h3>
                                </div>
                                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                                    <TrendingUp className="w-5 h-5" />
                                </div>
                            </div>
                            <p className="text-xs text-gray-500 mt-3">Últimas acciones procesadas</p>
                        </div>

                        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Inventario Total</p>
                                    <h3 className="text-2xl font-bold text-gray-900 mt-1">{stats.inventory.cases + stats.inventory.modules}</h3>
                                </div>
                                <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
                                    <BookOpen className="w-5 h-5" />
                                </div>
                            </div>
                            <p className="text-xs text-gray-500 mt-3">{stats.inventory.cases} casos / {stats.inventory.modules} módulos</p>
                        </div>

                        <div
                            onClick={() => setShowOnlineModal(true)}
                            className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 cursor-pointer hover:border-indigo-200 transition-colors"
                        >
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">En Línea Ahora</p>
                                    <h3 className="text-2xl font-bold text-gray-900 mt-1">{stats.onlineCount}</h3>
                                </div>
                                <div className="relative p-2 bg-green-50 text-green-600 rounded-lg">
                                    <Activity className="w-5 h-5" />
                                    <span className="absolute top-0 right-0 h-2 w-2 bg-green-500 rounded-full animate-pulse"></span>
                                </div>
                            </div>
                            <p className="text-xs text-indigo-600 font-medium mt-3 hover:underline">Ver quiénes están →</p>
                        </div>

                        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Tasa de Error</p>
                                    <h3 className={`text-2xl font-bold mt-1 ${parseFloat(stats.errorRate) > 5 ? 'text-red-600' : 'text-gray-900'}`}>
                                        {stats.errorRate}%
                                    </h3>
                                </div>
                                <div className={`p-2 rounded-lg ${parseFloat(stats.errorRate) > 5 ? 'bg-red-50 text-red-600' : 'bg-gray-50 text-gray-400'}`}>
                                    <AlertCircle className="w-5 h-5" />
                                </div>
                            </div>
                            <p className="text-xs text-gray-500 mt-3">Errores del frontend capturados</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                            <h3 className="text-sm font-semibold text-gray-700 mb-6 uppercase tracking-wider">Evolución Semanal de Actividad</h3>
                            <div className="h-72">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={stats.dailyActivity}>
                                        <defs>
                                            <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                                                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                        <XAxis dataKey="date" hide />
                                        <YAxis stroke="#94a3b8" fontSize={12} />
                                        <Tooltip
                                            contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                            labelStyle={{ fontWeight: 'bold' }}
                                        />
                                        <Area type="monotone" dataKey="count" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorCount)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                            <h3 className="text-sm font-semibold text-gray-700 mb-6 uppercase tracking-wider">Naturaleza de las Acciones</h3>
                            <div className="h-72">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={stats.actionDistribution}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={70}
                                            outerRadius={105}
                                            paddingAngle={4}
                                            dataKey="value"
                                            label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                                        >
                                            {stats.actionDistribution.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="none" />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            formatter={(value, name) => [`${value} acciones`, name]}
                                        />
                                        <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'content' && (
                <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                            <h3 className="text-sm font-semibold text-gray-700 mb-6 flex items-center uppercase tracking-wider">
                                <MapIcon className="w-4 h-4 mr-2 text-indigo-500" />
                                Distribución por Región Anatómica
                            </h3>
                            <div className="h-80">
                                {stats.regionalDistribution.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <RadarChart cx="50%" cy="50%" outerRadius="80%" data={stats.regionalDistribution}>
                                            <PolarGrid stroke="#e2e8f0" />
                                            <PolarAngleAxis dataKey="name" fontSize={11} stroke="#64748b" />
                                            <PolarRadiusAxis angle={30} domain={[0, 'auto']} hide />
                                            <Radar
                                                name="Contenido"
                                                dataKey="value"
                                                stroke="#6366f1"
                                                fill="#6366f1"
                                                fillOpacity={0.6}
                                            />
                                            <Tooltip />
                                        </RadarChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="flex items-center justify-center h-full text-gray-400">Sin datos de inventario.</div>
                                )}
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                                <h3 className="text-xs font-bold text-gray-400 mb-4 uppercase tracking-widest">Módulos de Anatomía más Vistos</h3>
                                <div className="space-y-2">
                                    {stats.topModules.map((item, i) => (
                                        <div key={i} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 group">
                                            <div className="flex items-center">
                                                <span className="w-6 text-sm font-bold text-indigo-300 group-hover:text-indigo-600 transition-colors">#{i + 1}</span>
                                                <span className="text-sm text-gray-700 font-medium ml-2 truncate max-w-[200px]">{item.name}</span>
                                            </div>
                                            <div className="flex items-center">
                                                <div className="h-1.5 w-16 bg-gray-100 rounded-full mr-3 overflow-hidden">
                                                    <div className="h-full bg-indigo-500" style={{ width: `${(item.value / (stats.topModules[0]?.value || 1)) * 100}%` }}></div>
                                                </div>
                                                <span className="text-xs font-bold text-gray-500">{item.value}</span>
                                            </div>
                                        </div>
                                    ))}
                                    {stats.topModules.length === 0 && <p className="text-center text-gray-400 text-sm py-4">Sin datos de visualización aún.</p>}
                                </div>
                            </div>

                            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                                <h3 className="text-xs font-bold text-gray-400 mb-4 uppercase tracking-widest">Casos Clínicos más Populares</h3>
                                <div className="space-y-2">
                                    {stats.topCases.map((item, i) => (
                                        <div key={i} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 group">
                                            <div className="flex items-center">
                                                <span className="w-6 text-sm font-bold text-emerald-300 group-hover:text-emerald-600 transition-colors">#{i + 1}</span>
                                                <span className="text-sm text-gray-700 font-medium ml-2 truncate max-w-[200px]">{item.name}</span>
                                            </div>
                                            <div className="flex items-center">
                                                <div className="h-1.5 w-16 bg-gray-100 rounded-full mr-3 overflow-hidden">
                                                    <div className="h-full bg-emerald-500" style={{ width: `${(item.value / (stats.topCases[0]?.value || 1)) * 100}%` }}></div>
                                                </div>
                                                <span className="text-xs font-bold text-gray-500">{item.value}</span>
                                            </div>
                                        </div>
                                    ))}
                                    {stats.topCases.length === 0 && <p className="text-center text-gray-400 text-sm py-4">Sin datos de visualización aún.</p>}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'users' && (
                <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                            <h3 className="text-sm font-semibold text-gray-700 mb-6 flex items-center uppercase tracking-wider">
                                <Shield className="w-5 h-5 mr-2 text-indigo-500" />
                                Leaderboard: Instructores (Creación)
                            </h3>
                            <div className="h-64">
                                {stats.topInstructores.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={stats.topInstructores} layout="vertical">
                                            <CartesianGrid strokeDasharray="2 2" horizontal={false} stroke="#f1f5f9" />
                                            <XAxis type="number" hide />
                                            <YAxis dataKey="name" type="category" width={120} fontSize={11} stroke="#64748b" />
                                            <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                            <Bar dataKey="value" fill="#6366f1" radius={[0, 4, 4, 0]} barSize={20} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="flex items-center justify-center h-full text-gray-400 text-sm">Sin volumen de creación reciente.</div>
                                )}
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                            <h3 className="text-sm font-semibold text-gray-700 mb-6 flex items-center uppercase tracking-wider">
                                <TrendingUp className="w-5 h-5 mr-2 text-emerald-500" />
                                Ranking: Estudiantes más Activos
                            </h3>
                            <div className="h-64">
                                {stats.topStudents.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={stats.topStudents} layout="vertical">
                                            <CartesianGrid strokeDasharray="2 2" horizontal={false} stroke="#f1f5f9" />
                                            <XAxis type="number" hide />
                                            <YAxis dataKey="name" type="category" width={120} fontSize={11} stroke="#64748b" />
                                            <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                            <Bar dataKey="value" fill="#10b981" radius={[0, 4, 4, 0]} barSize={20} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="flex items-center justify-center h-full text-gray-400 text-sm">Sin actividad de estudiantes detectada.</div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                        <h3 className="text-sm font-semibold text-gray-700 mb-6 flex items-center uppercase tracking-wider">
                            <Users className="w-5 h-5 mr-2 text-indigo-500" />
                            Directorio de Usuarios ({stats.allUsers?.length || 0})
                        </h3>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Usuario</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Última Actividad</th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {stats.allUsers?.map((u, idx) => (
                                        <tr key={idx} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{u.displayName}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{u.email}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {u.lastActive.toLocaleDateString('es-CL')} {u.lastActive.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                <button
                                                    onClick={() => handleViewUser(u)}
                                                    className="text-indigo-600 hover:text-indigo-900 flex items-center justify-end w-full"
                                                >
                                                    <Eye className="w-4 h-4 mr-1" />
                                                    Ver Detalle
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {(!stats.allUsers || stats.allUsers.length === 0) && (
                                        <tr>
                                            <td colSpan="4" className="px-6 py-4 text-center text-sm text-gray-500">No hay usuarios registrados en los logs recientes.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'quizzes' && (
                <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
                            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Quizzes Completados</p>
                            <h3 className="text-2xl font-bold text-gray-900 mt-1">{stats.quizStats.totalPlayed}</h3>
                        </div>
                        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
                            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Puntaje Promedio</p>
                            <h3 className="text-2xl font-bold text-indigo-600 mt-1">{stats.quizStats.avgScore}</h3>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                        <h3 className="text-sm font-semibold text-gray-700 mb-6 flex items-center uppercase tracking-wider">
                            <Trophy className="w-5 h-5 mr-2 text-yellow-500" />
                            Tabla de Líderes (Top 10 Puntajes)
                        </h3>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Usuario</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Módulo</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Puntaje</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {stats.quizStats.leaderboard.map((entry, idx) => (
                                        <tr
                                            key={idx}
                                            className="hover:bg-indigo-50 cursor-pointer transition-colors group"
                                            onClick={() => handleViewUser({ uid: entry.uid, displayName: entry.user, email: entry.email })}
                                            title="Ver historial completo del usuario"
                                        >
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 flex items-center">
                                                <Eye className="w-3 h-3 mr-2 text-indigo-400 opacity-0 group-hover:opacity-100" />
                                                {entry.user}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{entry.module}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-indigo-600">{entry.score}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{entry.date}</td>
                                        </tr>
                                    ))}
                                    {stats.quizStats.leaderboard.length === 0 && (
                                        <tr>
                                            <td colSpan="4" className="px-6 py-4 text-center text-sm text-gray-500">No hay registros de quizzes aún.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {showOnlineModal && (
                <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl animate-in zoom-in duration-300">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-gray-900 flex items-center">
                                <span className="relative flex h-3 w-3 mr-3">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                                </span>
                                Usuarios en Línea ({stats.onlineCount})
                            </h3>
                            <button onClick={() => setShowOnlineModal(false)} className="p-1 hover:bg-gray-100 rounded-lg text-gray-400">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="max-h-96 overflow-y-auto pr-2 space-y-3">
                            {stats.onlineUsersList.length > 0 ? (
                                stats.onlineUsersList.map((onlineUser, idx) => (
                                    <div key={idx} className="p-4 rounded-xl border border-gray-100 flex items-center justify-between hover:bg-gray-50 transition-colors">
                                        <div className="flex items-center">
                                            <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold mr-4 border-2 border-white shadow-sm">
                                                {onlineUser.email.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-gray-800 truncate max-w-[180px]">
                                                    {onlineUser.displayName || onlineUser.email.split('@')[0]}
                                                </p>
                                                <p className="text-[10px] text-gray-500 flex items-center gap-2 mt-0.5">
                                                    <Clock className="w-3 h-3" />
                                                    {onlineUser.lastActive.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}
                                                    <span className="bg-gray-200 px-1 rounded">{parseUserAgent(onlineUser.userAgent)}</span>
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[10px] font-mono text-gray-400 truncate max-w-[120px]">{onlineUser.email}</p>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="text-gray-400 text-center py-10 italic">Nadie está conectado en este momento.</p>
                            )}
                        </div>

                        <div className="mt-8 border-t border-gray-100 pt-4 flex justify-end">
                            <button
                                onClick={() => setShowOnlineModal(false)}
                                className="px-6 py-2.5 bg-gray-900 text-white text-sm font-bold rounded-xl hover:bg-gray-800 shadow-md transition-all active:scale-95"
                            >
                                Entendido
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showUserModal && selectedUser && (
                <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl p-6 max-w-4xl w-full shadow-2xl animate-in zoom-in duration-300 max-h-[90vh] flex flex-col">
                        <div className="flex justify-between items-center mb-6 shrink-0">
                            <div>
                                <h3 className="text-xl font-bold text-gray-900 flex items-center">
                                    <BookOpen className="w-6 h-6 mr-2 text-indigo-600" />
                                    Historial de Evaluaciones
                                </h3>
                                <p className="text-sm text-gray-500 mt-1">
                                    Usuario: <span className="font-semibold">{selectedUser.displayName}</span> ({selectedUser.email})
                                </p>
                            </div>
                            <button onClick={() => setShowUserModal(false)} className="p-1 hover:bg-gray-100 rounded-lg text-gray-400">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto pr-2">
                            {historyLoading ? (
                                <div className="flex justify-center items-center h-48">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                                </div>
                            ) : userHistory.length > 0 ? (
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50 sticky top-0">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actividad</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Detalle</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Puntaje</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {userHistory.map((h, idx) => (
                                            <tr key={idx} className="hover:bg-gray-50">
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 capitalize">
                                                    {h.type === 'anatomy' ? 'Quiz Anatomía' : 'Caso Clínico'}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    {h.moduleTitle || h.caseTitle || 'Sin título'}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-indigo-600">
                                                    {h.score}%
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    {h.timestamp ? new Date(h.timestamp.seconds * 1000).toLocaleString('es-CL') : 'N/A'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ) : (
                                <div className="text-center py-10">
                                    <p className="text-gray-400 italic">No hay historial de evaluaciones registrado para este usuario.</p>
                                </div>
                            )}
                        </div>

                        <div className="mt-6 border-t border-gray-100 pt-4 flex justify-end shrink-0">
                            <button
                                onClick={() => setShowUserModal(false)}
                                className="px-6 py-2.5 bg-gray-900 text-white text-sm font-bold rounded-xl hover:bg-gray-800 shadow-md transition-all active:scale-95"
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
