import { Outlet, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, PlusCircle, FileText, LogOut, Shield, ArrowLeft, Users, Brain, Activity } from 'lucide-react';
import { useTranslation } from 'react-i18next';


import { useAuth } from '../../../context/AuthContext';

const InstructorLayout = () => {
    const location = useLocation();
    const { t } = useTranslation();
    const { logout, user } = useAuth();

    const navigation = [
        { name: t('instructor.manageCases'), href: '/instructor/cases', icon: FileText, color: 'blue' },
        { name: 'Anatomía', href: '/instructor/anatomy', icon: Brain, color: 'purple' },
        { name: t('instructor.users.title'), href: '/instructor/users', icon: Users, color: 'orange' },
    ];

    if (user?.email === 'gonzalodiazs@gmail.com') {
        navigation.push({ name: 'Analíticas', href: '/instructor/analytics', icon: Activity, color: 'indigo' });
    }

    return (
        <div className="min-h-screen bg-black flex flex-col md:flex-row font-sans">
            {/* Sidebar */}
            <div className="w-full md:w-64 bg-gray-900 border-r border-gray-800 flex flex-col">
                <div className="p-6 border-b border-gray-800 flex items-center justify-between md:block">
                    <div className="flex items-center">
                        <div className="bg-indigo-600/20 p-2 rounded-lg mr-3">
                            <Shield className="h-6 w-6 text-indigo-400" />
                        </div>
                        <h1 className="text-xl font-bold text-white tracking-tight">VoxelHub <span className="text-gray-500 text-sm block font-medium">Instructor</span></h1>
                    </div>
                </div>

                <nav className="flex-1 p-4 space-y-2">
                    {/* Standalone Dashboard Button */}
                    <Link
                        to="/instructor"
                        className={`flex items-center space-x-3 px-4 py-4 rounded-xl transition-all duration-300 group ${location.pathname === '/instructor'
                            ? 'bg-orange-500/10 text-white border-2 border-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.3)]'
                            : 'bg-gray-800/40 text-gray-400 hover:bg-gray-800 hover:text-white border border-transparent hover:border-gray-700'
                            }`}
                    >
                        <LayoutDashboard className={`w-6 h-6 transition-colors ${location.pathname === '/instructor' ? 'text-orange-400' : 'text-gray-500 group-hover:text-gray-300'}`} />
                        <span className="font-bold text-lg">{t('instructor.dashboard')}</span>
                    </Link>

                    <div className="pt-4 pb-2">
                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest px-4 mb-2">Gestión</p>
                    </div>

                    {navigation.map((item) => {
                        const Icon = item.icon;
                        const isActive = location.pathname === item.href;
                        const colorClass = item.color || 'indigo';

                        // Dynamic Tailwind mappings
                        const activeStyles = {
                            blue: 'bg-blue-500/5 text-white border-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.1)]',
                            green: 'bg-green-500/5 text-white border-green-500 shadow-[0_0_10px_rgba(34,197,94,0.1)]',
                            purple: 'bg-purple-500/5 text-white border-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.1)]',
                            orange: 'bg-orange-500/5 text-white border-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.1)]',
                            indigo: 'bg-indigo-500/5 text-white border-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.1)]'
                        };

                        const iconStyles = {
                            blue: 'text-blue-400',
                            green: 'text-green-400',
                            purple: 'text-purple-400',
                            orange: 'text-orange-400',
                            indigo: 'text-indigo-400'
                        };

                        return (
                            <Link
                                key={item.name}
                                to={item.href}
                                className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 group border-l-4 ${isActive
                                    ? activeStyles[colorClass]
                                    : 'text-gray-400 border-transparent hover:bg-gray-800/50 hover:text-white hover:border-gray-700'
                                    }`}
                            >
                                <Icon className={`w-5 h-5 transition-colors ${isActive ? iconStyles[colorClass] : 'text-gray-500 group-hover:text-gray-300'}`} />
                                <span className="font-medium">{item.name}</span>
                            </Link>
                        );
                    })}
                    <div className="my-4 border-t border-gray-800"></div>
                    <Link
                        to="/"
                        className="flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors text-gray-400 hover:bg-gray-800 hover:text-white group"
                    >
                        <ArrowLeft className="w-5 h-5 text-gray-500 group-hover:text-gray-300" />
                        <span className="font-medium">{t('navigation.home')}</span>
                    </Link>
                </nav>

                <div className="p-4 border-t border-gray-800">
                    <button
                        onClick={logout}
                        className="flex items-center space-x-3 px-4 py-3 w-full text-gray-400 hover:bg-red-900/20 hover:text-red-400 rounded-lg transition-colors group"
                    >
                        <LogOut className="w-5 h-5 group-hover:text-red-400 transition-colors" />
                        <span className="font-medium">{t('auth.logout')}</span>
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-auto bg-black p-8">
                <div className="max-w-7xl mx-auto">
                    <Outlet />
                </div>
            </div>
        </div>
    );
};

export default InstructorLayout;
