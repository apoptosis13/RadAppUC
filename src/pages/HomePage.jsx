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
                        <div className="relative inline-flex flex-col">
                            <img
                                src="/voxelhub-logo-full.png"
                                alt="VoxelHub Logo"
                                className="h-32 md:h-48 w-auto mb-2 drop-shadow-2xl transform hover:scale-105 transition-transform duration-500"
                            />
                            <h1 className="text-xl tracking-tight font-bold text-indigo-400 sm:text-2xl md:text-3xl pl-32 md:pl-48 -mt-6 text-left">
                                {t('home.subtitle')}
                            </h1>
                        </div>
                    </div>
                    <p className="mt-6 max-w-3xl mx-auto text-xl text-gray-300 text-center">
                        {t('home.description')}
                    </p>
                </div>
            </div>

            {/* Feature Highlights */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
                    {[
                        {
                            title: t('home.features.anatomy.title'),
                            description: t('home.features.anatomy.description'),
                            icon: Bone,
                            href: '/anatomy',
                            color: 'text-indigo-400',
                            bg: 'bg-indigo-500/10',
                            border: 'border-indigo-500/20',
                            hover: 'hover:border-indigo-500/50',
                            linkLabel: t('home.features.anatomy.link')
                        },
                        {
                            title: t('home.features.cases.title'),
                            description: t('home.features.cases.description'),
                            icon: Images,
                            href: '/cases',
                            color: 'text-emerald-400',
                            bg: 'bg-emerald-500/10',
                            border: 'border-emerald-500/20',
                            hover: 'hover:border-emerald-500/50',
                            linkLabel: t('home.features.cases.link')
                        },
                        ...(user && user.role === 'admin' ? [{
                            title: t('home.features.instructor.title'),
                            description: t('home.features.instructor.description'),
                            icon: Shield,
                            href: '/instructor',
                            color: 'text-purple-400',
                            bg: 'bg-purple-500/10',
                            border: 'border-purple-500/20',
                            hover: 'hover:border-purple-500/50',
                            linkLabel: t('home.features.instructor.link')
                        }] : [])
                    ].map((card) => {
                        const Icon = card.icon;
                        return (
                            <Link
                                key={card.href}
                                to={card.href}
                                className={`group flex flex-col h-full bg-gray-900 p-6 rounded-xl border ${card.border} ${card.hover} hover:shadow-2xl hover:shadow-indigo-500/10 transition-all duration-300 transform hover:-translate-y-1 relative overflow-hidden`}
                            >
                                {/* Glow Effect */}
                                <div className={`absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 ${card.bg} rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500`}></div>

                                <div className={`w-12 h-12 ${card.bg} rounded-lg flex items-center justify-center mb-4 transition-transform group-hover:scale-110`}>
                                    <Icon className={`w-6 h-6 ${card.color}`} />
                                </div>
                                <h3 className="text-xl font-bold text-white mb-2 group-hover:text-indigo-300 transition-colors">
                                    {card.title}
                                </h3>
                                <p className="text-gray-400 mb-4 flex-grow text-sm leading-relaxed">
                                    {card.description}
                                </p>
                                <div className={`text-sm font-medium ${card.color} flex items-center mt-auto opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0 transition-all duration-300`}>
                                    {card.linkLabel} <ArrowRight className="ml-1 w-4 h-4" />
                                </div>
                            </Link>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default HomePage;
