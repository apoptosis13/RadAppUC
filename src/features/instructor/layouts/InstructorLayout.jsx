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
        <div className="min-h-screen bg-gray-100 flex flex-col md:flex-row">
            {/* Sidebar */}
            <div className="w-full md:w-64 bg-indigo-900 text-white flex flex-col">
                <div className="p-6 border-b border-indigo-800 flex items-center justify-between md:block">
                    <div className="flex items-center">
                        <Shield className="h-8 w-8 text-indigo-300 mr-3" />
                        <h1 className="text-xl font-bold">{t('instructor.dashboard')}</h1>
                    </div>
                </div>

                <nav className="flex-1 p-4 space-y-2">
                    {navigation.map((item) => {
                        const Icon = item.icon;
                        const isActive = location.pathname === item.href;
                        return (
                            <Link
                                key={item.name}
                                to={item.href}
                                className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${isActive
                                    ? 'bg-indigo-800 text-white'
                                    : 'text-indigo-300 hover:bg-indigo-800 hover:text-white'
                                    }`}
                            >
                                <Icon className="w-5 h-5" />
                                <span>{item.name}</span>
                            </Link>
                        );
                    })}
                    <Link
                        to="/"
                        className="flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors text-indigo-300 hover:bg-indigo-800 hover:text-white"
                    >
                        <ArrowLeft className="w-5 h-5" />
                        <span>{t('navigation.home')}</span>
                    </Link>
                </nav>

                <div className="p-4 border-t border-indigo-800">
                    <button
                        onClick={logout}
                        className="flex items-center space-x-3 px-4 py-3 w-full text-indigo-300 hover:bg-indigo-800 hover:text-white rounded-lg transition-colors"
                    >
                        <LogOut className="w-5 h-5" />
                        <span>{t('auth.logout')}</span>
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-auto p-8">
                <Outlet />
            </div>
        </div>
    );
};

export default InstructorLayout;
