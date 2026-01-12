import { Outlet, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, PlusCircle, FileText, LogOut, Shield, ArrowLeft, Users, Brain, Activity } from 'lucide-react';
import { useTranslation } from 'react-i18next';


import { useAuth } from '../../../context/AuthContext';

const InstructorLayout = () => {
    const location = useLocation();
    const { t } = useTranslation();
    const { logout, user } = useAuth();

    const navigation = [
        { name: t('instructor.dashboard'), href: '/instructor', icon: LayoutDashboard },
        { name: t('instructor.createCase'), href: '/instructor/cases/create', icon: PlusCircle },
        { name: t('instructor.manageCases'), href: '/instructor/cases', icon: FileText },
        { name: 'Anatomía', href: '/instructor/anatomy', icon: Brain },
        { name: t('instructor.users.title'), href: '/instructor/users', icon: Users },
    ];

    if (user?.email === 'gonzalodiazs@gmail.com') {
        navigation.push({ name: 'Analíticas', href: '/instructor/analytics', icon: Activity });
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

                <nav className="flex-1 p-4 space-y-1">
                    {navigation.map((item) => {
                        const Icon = item.icon;
                        const isActive = location.pathname === item.href;
                        return (
                            <Link
                                key={item.name}
                                to={item.href}
                                className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 group ${isActive
                                    ? 'bg-gray-800 text-white border-l-4 border-indigo-500'
                                    : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                                    }`}
                            >
                                <Icon className={`w-5 h-5 transition-colors ${isActive ? 'text-indigo-400' : 'text-gray-500 group-hover:text-gray-300'}`} />
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
