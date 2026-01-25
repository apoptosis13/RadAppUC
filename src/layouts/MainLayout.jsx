import React, { useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Layout, BookOpen, FileText, Menu, User, LogOut, Settings, Sun, Moon, Crown, Mic, Library } from 'lucide-react';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '../components/LanguageSwitcher';
import UserAvatar from '../components/UserAvatar';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const MainLayout = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { t } = useTranslation();
    const { user, logout } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const navItems = [
        { path: '/', label: t('navigation.home'), icon: Layout },
        { path: '/anatomy', label: t('navigation.anatomy'), icon: BookOpen },
        { path: '/cases', label: t('navigation.cases'), icon: FileText },
        { path: '/report-training', label: t('navigation.reportTraining'), icon: Mic },
        { path: '/support-material', label: t('navigation.supportMaterial'), icon: Library },
    ];

    // Immersive mode: Full width for Anatomy Viewer, Instructor Editors, and Anatomy Index
    const isImmersive = location.pathname.startsWith('/anatomy/') ||
        location.pathname.includes('/instructor/cases'); // Also cases management often needs space

    return (
        <div className={clsx(
            "bg-gray-50 dark:bg-[#0B1120] text-gray-900 dark:text-gray-100 font-sans flex flex-col transition-colors duration-200 w-full",
            isImmersive ? "h-screen overflow-hidden" : "min-h-screen"
        )}>
            {/* Navigation Bar */}
            <nav className="bg-white dark:bg-[#0f172a] border-b border-gray-200 dark:border-gray-800 sticky top-0 z-50 shadow-sm transition-colors duration-200 flex-none">
                <div className={clsx(
                    'mx-auto px-4 sm:px-6 lg:px-8',
                    isImmersive ? 'max-w-full' : 'max-w-7xl'
                )}>
                    <div className="flex justify-between h-16">
                        <div className="flex">
                            <div className="flex-shrink-0 flex items-center">
                                <img className="h-10 w-auto drop-shadow-[0_1px_3px_rgba(0,0,0,0.4)] dark:drop-shadow-none" src="/voxelhub-logo-full.png" alt="VoxelHub Logo" />
                            </div>
                            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                                {navItems.map((item) => {
                                    const Icon = item.icon;
                                    const isActive = location.pathname === item.path;
                                    return (
                                        <Link
                                            key={item.path}
                                            to={item.path}
                                            className={clsx(
                                                'inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors duration-200',
                                                isActive
                                                    ? 'border-indigo-500 text-gray-900 dark:text-white'
                                                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600 hover:text-gray-700 dark:hover:text-gray-200'
                                            )}
                                        >
                                            <Icon className="w-4 h-4 mr-2" />
                                            {item.label}
                                        </Link>
                                    );
                                })}
                                {(user?.role === 'admin' || user?.role === 'instructor') && (
                                    <Link
                                        to="/instructor"
                                        className={clsx(
                                            'inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors duration-200',
                                            location.pathname.startsWith('/instructor')
                                                ? 'border-indigo-500 text-gray-900 dark:text-white'
                                                : 'border-transparent text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600 hover:text-gray-700 dark:hover:text-gray-200'
                                        )}
                                    >
                                        <Crown className="w-4 h-4 mr-2 text-indigo-500" />
                                        {t('navigation.instructor', 'Portal Instructor')}
                                    </Link>
                                )}
                            </div>
                        </div>
                        <div className="hidden sm:ml-6 sm:flex sm:items-center space-x-4">
                            <button
                                onClick={toggleTheme}
                                className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-gray-800"
                                aria-label="Toggle Dark Mode"
                            >
                                {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                            </button>
                            <LanguageSwitcher />

                            {user ? (
                                <div className="ml-3 relative z-50">
                                    <div>
                                        <button
                                            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                                            className="bg-white dark:bg-gray-800 rounded-full flex text-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-gray-800 items-center space-x-2"
                                        >
                                            <span className="sr-only">Open user menu</span>
                                            <div className="relative">
                                                <UserAvatar
                                                    src={user.photoURL}
                                                    name={user.displayName || user.name}
                                                    size="sm"
                                                />

                                                {/* Role Badge */}
                                                {user.email === 'gonzalodiazs@gmail.com' && (
                                                    <div className="absolute -top-1 -right-1 bg-white dark:bg-gray-800 rounded-full p-0.5 shadow-sm" title="Super Admin">
                                                        <Crown className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                                                    </div>
                                                )}
                                                {user.email !== 'gonzalodiazs@gmail.com' && (user.role === 'admin' || user.role === 'instructor') && (
                                                    <div className="absolute -top-1 -right-1 bg-white dark:bg-gray-800 rounded-full p-0.5 shadow-sm" title="Instructor">
                                                        <Crown className="w-3 h-3 text-slate-400 fill-slate-400" />
                                                    </div>
                                                )}
                                            </div>
                                            <span className="hidden md:block text-gray-700 dark:text-gray-200 font-medium max-w-[100px] truncate">
                                                {user.displayName || user.name}
                                            </span>
                                        </button>
                                    </div>
                                    {isUserMenuOpen && (
                                        <div className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg py-1 bg-white dark:bg-gray-700 ring-1 ring-black ring-opacity-5 focus:outline-none z-50">
                                            <Link
                                                to="/profile"
                                                className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600 flex items-center"
                                                onClick={() => setIsUserMenuOpen(false)}
                                            >
                                                <Settings className="mr-2 h-4 w-4" />
                                                {t('profile.title')}
                                            </Link>
                                            <Link
                                                to="/about"
                                                className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600 flex items-center"
                                                onClick={() => setIsUserMenuOpen(false)}
                                            >
                                                <BookOpen className="mr-2 h-4 w-4" />
                                                {t('about.menuLink', 'Acerca de')}
                                            </Link>
                                            <button
                                                onClick={() => {
                                                    setIsUserMenuOpen(false);
                                                    logout();
                                                    navigate('/login');
                                                }}
                                                className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600 flex items-center"
                                            >
                                                <LogOut className="mr-2 h-4 w-4" />
                                                {t('auth.logout')}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <Link
                                    to="/login"
                                    className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 font-medium text-sm"
                                >
                                    {t('auth.loginButton')}
                                </Link>
                            )}
                        </div>
                        <div className="flex items-center sm:hidden">
                            <button
                                onClick={toggleTheme}
                                className="p-2 mr-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500"
                            >
                                {theme === 'dark' ? <Sun className="h-6 w-6" /> : <Moon className="h-6 w-6" />}
                            </button>
                            <LanguageSwitcher />
                            <button
                                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                                className="ml-2 p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500"
                            >
                                <Menu className="h-6 w-6" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Mobile Menu */}
                {isMobileMenuOpen && (
                    <div className="sm:hidden bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
                        <div className="pt-2 pb-3 space-y-1">
                            {navItems.map((item) => {
                                const Icon = item.icon;
                                const isActive = location.pathname === item.path;
                                return (
                                    <Link
                                        key={item.path}
                                        to={item.path}
                                        onClick={() => setIsMobileMenuOpen(false)}
                                        className={clsx(
                                            'block pl-3 pr-4 py-2 border-l-4 text-base font-medium',
                                            isActive
                                                ? 'bg-indigo-50 dark:bg-indigo-900/50 border-indigo-500 text-indigo-700 dark:text-indigo-300'
                                                : 'border-transparent text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:text-gray-700 dark:hover:text-gray-200'
                                        )}
                                    >
                                        <div className="flex items-center">
                                            <Icon className="w-5 h-5 mr-3" />
                                            {item.label}
                                        </div>
                                    </Link>
                                );
                            })}
                            {(user?.role === 'admin' || user?.role === 'instructor') && (
                                <Link
                                    to="/instructor"
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className={clsx(
                                        'block pl-3 pr-4 py-2 border-l-4 text-base font-medium',
                                        location.pathname.startsWith('/instructor')
                                            ? 'bg-indigo-50 dark:bg-indigo-900/50 border-indigo-500 text-indigo-700 dark:text-indigo-300'
                                            : 'border-transparent text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:text-gray-700 dark:hover:text-gray-200'
                                    )}
                                >
                                    <div className="flex items-center">
                                        <Crown className="w-5 h-5 mr-3 text-indigo-500" />
                                        {t('navigation.instructor', 'Portal Instructor')}
                                    </div>
                                </Link>
                            )}
                        </div>
                        <div className="pt-4 pb-4 border-t border-gray-200 dark:border-gray-700">
                            {user ? (
                                <div className="space-y-1">
                                    <div className="flex items-center px-4 mb-3">
                                        <div className="flex-shrink-0">
                                            <UserAvatar
                                                src={user.photoURL}
                                                name={user.name || user.displayName}
                                                size="md"
                                            />
                                        </div>
                                        <div className="ml-3">
                                            <div className="text-base font-medium text-gray-800 dark:text-white">{user.name}</div>
                                            <div className="text-sm font-medium text-gray-500 dark:text-gray-400">{user.username}</div>
                                        </div>
                                    </div>
                                    <Link
                                        to="/profile"
                                        onClick={() => setIsMobileMenuOpen(false)}
                                        className="block px-4 py-2 text-base font-medium text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center"
                                    >
                                        <Settings className="mr-3 h-5 w-5" />
                                        {t('navigation.profile')}
                                    </Link>
                                    <button
                                        onClick={() => {
                                            setIsMobileMenuOpen(false);
                                            logout();
                                            navigate('/login');
                                        }}
                                        className="block w-full text-left px-4 py-2 text-base font-medium text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center"
                                    >
                                        <LogOut className="mr-3 h-5 w-5" />
                                        {t('auth.logout')}
                                    </button>
                                </div>
                            ) : (
                                <div className="px-4">
                                    <Link
                                        to="/login"
                                        onClick={() => setIsMobileMenuOpen(false)}
                                        className="block text-center w-full px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                                    >
                                        {t('auth.loginButton')}
                                    </Link>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </nav>

            {/* Main Content - Flex Grow to take remaining space */}
            <main className={clsx(
                'flex-grow w-full flex flex-col', // Added flex flex-col to ensure children can take full height
                isImmersive ? 'p-0 overflow-hidden' : 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8'
            )}>
                <Outlet />
            </main>

            {/* Footer - Always visible as per user request */}
            <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 transition-colors duration-200 flex-none">
                <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center">
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            &copy; {new Date().getFullYear()} VoxelHub. {t('home.footer.rights')}
                        </p>
                        <div className="flex space-x-6">

                        </div>
                    </div>
                </div>
            </footer>
        </div>

    );
};

export default MainLayout;
