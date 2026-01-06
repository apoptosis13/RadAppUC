import React from 'react';
import { Link } from 'react-router-dom';
import { FileText, Users, Brain, PlusCircle, ArrowRight, Activity } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Diagnostics from '../components/Diagnostics';

const InstructorDashboard = () => {
    const { t } = useTranslation();

    const cards = [
        {
            title: t('instructor.manageCases'),
            description: 'Ver, editar y eliminar casos clínicos existentes.',
            icon: FileText,
            href: '/instructor/cases',
            colorClass: 'bg-blue-100 dark:bg-blue-900',
            iconColor: 'text-blue-600 dark:text-blue-300'
        },
        {
            title: t('instructor.createCase'),
            description: 'Crear nuevos casos clínicos para los alumnos.',
            icon: PlusCircle,
            href: '/instructor/cases/create',
            colorClass: 'bg-green-100 dark:bg-green-900',
            iconColor: 'text-green-600 dark:text-green-300'
        },
        {
            title: 'Gestión de Anatomía',
            description: 'Administrar módulos de anatomía y anotaciones.',
            icon: Brain,
            href: '/instructor/anatomy',
            colorClass: 'bg-purple-100 dark:bg-purple-900',
            iconColor: 'text-purple-600 dark:text-purple-300'
        },
        {
            title: t('instructor.users.title'),
            description: 'Gestionar usuarios y permisos de la plataforma.',
            icon: Users,
            href: '/instructor/users',
            colorClass: 'bg-orange-100 dark:bg-orange-900',
            iconColor: 'text-orange-600 dark:text-orange-300'
        }
    ];

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                    {t('instructor.dashboard')}
                </h1>
            </div>

            <Diagnostics />

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {cards.map((card) => {
                    const Icon = card.icon;
                    return (
                        <div key={card.href} className="flex flex-col h-full bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md border border-gray-100 dark:border-gray-700 hover:shadow-lg transition-all duration-200">
                            <div className={`w-12 h-12 ${card.colorClass} rounded-lg flex items-center justify-center mb-4`}>
                                <Icon className={`w-6 h-6 ${card.iconColor}`} />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                                {card.title}
                            </h3>
                            <p className="text-gray-600 dark:text-gray-300 mb-4 flex-grow">
                                {card.description}
                            </p>
                            <Link
                                to={card.href}
                                className="text-indigo-600 dark:text-indigo-400 font-medium hover:text-indigo-500 dark:hover:text-indigo-300 inline-flex items-center mt-auto"
                            >
                                Acceder <ArrowRight className="ml-1 w-4 h-4" />
                            </Link>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default InstructorDashboard;
