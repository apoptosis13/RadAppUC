import React from 'react';
import { Link } from 'react-router-dom';
import { Bone, Images, Shield, ArrowRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Button from '../components/Button';
import { useAuth } from '../context/AuthContext';

const HomePage = () => {
    const { t } = useTranslation();
    const { user } = useAuth();
    return (
        <div className="space-y-16">
            {/* Hero Section */}
            <div className="relative bg-gray-900 overflow-hidden rounded-2xl shadow-xl">
                <div className="absolute inset-0">
                    <img
                        className="w-full h-full object-cover"
                        src="/hero-bg.png"
                        alt="Radiology reading room"
                    />
                    <div className="absolute inset-0 bg-gray-900 opacity-70"></div>
                </div>
                <div className="relative max-w-7xl mx-auto py-24 px-4 sm:py-32 sm:px-6 lg:px-8">
                    <div className="flex flex-col items-center">
                        <img
                            src="/voxelhub-logo-full.png"
                            alt="VoxelHub Logo"
                            className="h-32 md:h-48 w-auto mb-6 drop-shadow-2xl transform hover:scale-105 transition-transform duration-500"
                        />
                        <h1 className="text-4xl tracking-tight font-extrabold text-white sm:text-5xl md:text-6xl text-center">
                            <span className="block text-indigo-400 mt-2">{t('home.subtitle')}</span>
                        </h1>
                    </div>
                    <p className="mt-6 max-w-3xl mx-auto text-xl text-gray-300 text-center">
                        {t('home.description')}
                    </p>
                </div>
            </div>

            {/* Feature Highlights */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md border border-gray-100 dark:border-gray-700 hover:shadow-lg transition-all duration-200">
                        <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900 rounded-lg flex items-center justify-center mb-4">
                            <Bone className="w-6 h-6 text-indigo-600 dark:text-indigo-300" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{t('home.features.anatomy.title')}</h3>
                        <p className="text-gray-600 dark:text-gray-300 mb-4">
                            {t('home.features.anatomy.description')}
                        </p>
                        <Link to="/anatomy" className="text-indigo-600 dark:text-indigo-400 font-medium hover:text-indigo-500 dark:hover:text-indigo-300 inline-flex items-center">
                            {t('home.features.anatomy.link')} <ArrowRight className="ml-1 w-4 h-4" />
                        </Link>
                    </div>

                    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md border border-gray-100 dark:border-gray-700 hover:shadow-lg transition-all duration-200">
                        <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center mb-4">
                            <Images className="w-6 h-6 text-green-600 dark:text-green-300" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{t('home.features.cases.title')}</h3>
                        <p className="text-gray-600 dark:text-gray-300 mb-4">
                            {t('home.features.cases.description')}
                        </p>
                        <Link to="/cases" className="text-indigo-600 dark:text-indigo-400 font-medium hover:text-indigo-500 dark:hover:text-indigo-300 inline-flex items-center">
                            {t('home.features.cases.link')} <ArrowRight className="ml-1 w-4 h-4" />
                        </Link>
                    </div>

                    {user && user.role === 'admin' && (
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md border border-gray-100 dark:border-gray-700 hover:shadow-lg transition-all duration-200">
                            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center mb-4">
                                <Shield className="w-6 h-6 text-purple-600 dark:text-purple-300" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{t('home.features.instructor.title')}</h3>
                            <p className="text-gray-600 dark:text-gray-300 mb-4">
                                {t('home.features.instructor.description')}
                            </p>
                            <Link to="/instructor" className="text-indigo-600 dark:text-indigo-400 font-medium hover:text-indigo-500 dark:hover:text-indigo-300 inline-flex items-center">
                                {t('home.features.instructor.link')} <ArrowRight className="ml-1 w-4 h-4" />
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default HomePage;
