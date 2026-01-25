import React from 'react';
import { Link } from 'react-router-dom';
import { FileText, Users, Brain, PlusCircle, ArrowRight, Activity, Sparkles, Library } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const InstructorDashboard = () => {
    const { t } = useTranslation();

    const cards = [
        {
            title: t('instructor.manageLibrary'),
            description: t('instructor.manageLibraryDesc'),
            icon: FileText,
            href: '/instructor/cases?type=library',
            color: 'text-blue-400',
            bg: 'bg-blue-500/10',
            border: 'border-blue-500/20',
            hover: 'hover:border-blue-500/50'
        },
        {
            title: t('instructor.manageTraining'),
            description: t('instructor.manageTrainingDesc'),
            icon: Sparkles,
            href: '/instructor/cases?type=training',
            color: 'text-amber-400',
            bg: 'bg-amber-500/10',
            border: 'border-amber-500/20',
            hover: 'hover:border-amber-500/50'
        },

        {
            title: t('instructor.manageAnatomy'),
            description: t('instructor.manageAnatomyDesc'),
            icon: Brain,
            href: '/instructor/anatomy',
            color: 'text-purple-400',
            bg: 'bg-purple-500/10',
            border: 'border-purple-500/20',
            hover: 'hover:border-purple-500/50'
        },
        {
            title: t('instructor.users.title'),
            description: t('instructor.users.desc'),
            icon: Users,
            href: '/instructor/users',
            color: 'text-orange-400',
            bg: 'bg-orange-500/10',
            border: 'border-orange-500/20',
            hover: 'hover:border-orange-500/50'
        },
        {
            title: t('instructor.materials.title'),
            description: t('instructor.materials.subtitle'),
            icon: Library,
            href: '/instructor/materials',
            color: 'text-emerald-400',
            bg: 'bg-emerald-500/10',
            border: 'border-emerald-500/20',
            hover: 'hover:border-emerald-500/50'
        }
    ];

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-1">
                        {t('instructor.dashboard')}
                    </h1>
                    <p className="text-gray-400 text-sm">{t('instructor.dashboardSubtitle', 'Administra contenido y usuarios de VoxelHub')}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {cards.map((card) => {
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
                                {t('instructor.access')} <ArrowRight className="ml-1 w-4 h-4" />
                            </div>
                        </Link>
                    );
                })}
            </div>
        </div>
    );
};

export default InstructorDashboard;
