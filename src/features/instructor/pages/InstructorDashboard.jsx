import React from 'react';
import { Link } from 'react-router-dom';
import { FileText, Users, Brain, PlusCircle } from 'lucide-react';
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
            color: 'bg-blue-500'
        },
        {
            title: t('instructor.createCase'),
            description: 'Crear nuevos casos clínicos para los alumnos.',
            icon: PlusCircle,
            href: '/instructor/cases/create',
            color: 'bg-green-500'
        },
        {
            title: 'Gestión de Anatomía',
            description: 'Administrar módulos de anatomía y anotaciones.',
            icon: Brain,
            href: '/instructor/anatomy',
            color: 'bg-purple-500'
        },
        {
            title: t('instructor.users.title'),
            description: 'Gestionar usuarios y permisos de la plataforma.',
            icon: Users,
            href: '/instructor/users',
            color: 'bg-orange-500'
        }
    ];

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {t('instructor.dashboard')}
            </h1>

            <Diagnostics />

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {cards.map((card) => {
                    const Icon = card.icon;
                    return (
                        <Link
                            key={card.href}
                            to={card.href}
                            className="block bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-md transition-shadow overflow-hidden border border-gray-200 dark:border-gray-700"
                        >
                            <div className="p-6">
                                <div className={`w-12 h-12 rounded-lg ${card.color} flex items-center justify-center mb-4`}>
                                    <Icon className="w-6 h-6 text-white" />
                                </div>
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                                    {card.title}
                                </h3>
                                <p className="text-gray-500 dark:text-gray-400">
                                    {card.description}
                                </p>
                            </div>
                        </Link>
                    );
                })}
            </div>
        </div>
    );
};

export default InstructorDashboard;
