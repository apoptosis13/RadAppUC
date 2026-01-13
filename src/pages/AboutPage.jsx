import React from 'react';
import { useTranslation } from 'react-i18next';
import { Shield, GitBranch, Mail, Tag, Calendar, CheckCircle } from 'lucide-react';

const AboutPage = () => {
    const { t } = useTranslation();

    const ADMIN_INFO = {
        name: 'Gonzalo Díaz',
        role: 'Administrador',
        email: 'admin@voxelhub.cl'
    };

    const VERSIONS = [
        {
            version: '1.0.0-beta.5',
            date: '2026-01-11',
            title: 'Refinamiento de UI y Tipografía',
            changes: [
                'Nueva tipografía moderna (Inter) en toda la plataforma',
                'Atlas Anatómico: Escala de texto inteligente dinámica',
                'Me Mejoras de legibilidad en etiquetas y paneles'
            ]
        },
        {
            version: '1.0.0-beta.4',
            date: '2026-01-11',
            title: 'Optimización y Estabilidad',
            changes: [
                'Rebranding oficial a VoxelHub (Nueva identidad visual)',
                'Solución crítica de error de inicio (Crash Loop)',
                'Nuevo Sistema de Avatares (Soporte de iniciales y fallback)',
                'Simplificación de flujo de casos (Eliminación de Hallazgos)',
                'Optimización de rendimiento (Carga diferida de imágenes)'
            ]
        },
        {
            version: '1.0.0-beta.3',
            date: '2026-01-04',
            title: 'Consolidación del Visor y Seguridad',
            changes: [
                'Zonas Anatómicas (Visualización de áreas poligonales)',
                'Navegación Mejorada (Scroll de cortes, Zoom de precisión)',
                'Seguridad Robusta en Almacenamiento (RBAC)',
                'Optimización de Estabilidad y Carga de Imágenes'
            ]
        },
        {
            version: '1.0.0-beta.2',
            date: '2026-01-01',
            title: 'Mejoras de Estabilidad',
            changes: [
                'Mejoras generales de seguridad y rendimiento',
                'Corrección crítica en flujo de despliegue',
                'Optimizaciones internas del sistema'
            ]
        },
        {
            version: '1.0.0-beta',
            date: '2025-12-26',
            title: 'Lanzamiento Beta Inicial',
            changes: [
                'Módulos de Anatomía Interactiva (Visor y Editor)',
                'Gestión de Casos Clínicos con Preguntas',
                'Sistema de Roles (Estudiante, Instructor, Super Admin)',
                'Soporte Multilenguaje (Español / Inglés)',
                'Preferencias de Usuario (Tema Claro/Oscuro)',
                'Distintivos de Rol en Avatar'
            ]
        }
    ];

    return (
        <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-8">
            <div className="text-center">
                <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white sm:text-4xl">
                    {t('about.title', 'Acerca de la App')}
                </h1>
                <p className="mt-3 max-w-2xl mx-auto text-xl text-gray-500 dark:text-gray-400">
                    Plataforma de Entrenamiento en Radiología
                </p>
            </div>

            {/* Administration Section */}
            <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg">
                <div className="px-4 py-5 sm:px-6 flex items-center border-b border-gray-200 dark:border-gray-700">
                    <Shield className="h-6 w-6 text-indigo-600 dark:text-indigo-400 mr-2" />
                    <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
                        {t('about.admin.title', 'Administración')}
                    </h3>
                </div>
                <div className="px-4 py-5 sm:p-6">
                    <div className="flex items-center space-x-4">
                        <div className="flex-shrink-0">
                            <div className="h-12 w-12 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center">
                                <span className="text-indigo-600 dark:text-indigo-300 font-bold text-lg">
                                    {ADMIN_INFO.name.charAt(0)}
                                </span>
                            </div>
                        </div>
                        <div>
                            <h4 className="text-lg font-bold text-gray-900 dark:text-white">{ADMIN_INFO.name}</h4>
                            <p className="text-sm text-gray-500 dark:text-gray-400">{ADMIN_INFO.role}</p>
                            <div className="flex items-center mt-1 text-sm text-gray-500 dark:text-gray-400">
                                <Mail className="h-4 w-4 mr-1" />
                                <a href={`mailto:${ADMIN_INFO.email}`} className="hover:text-indigo-600 dark:hover:text-indigo-400">
                                    {ADMIN_INFO.email}
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Changelog Section */}
            <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg">
                <div className="px-4 py-5 sm:px-6 flex items-center border-b border-gray-200 dark:border-gray-700">
                    <GitBranch className="h-6 w-6 text-green-600 dark:text-green-400 mr-2" />
                    <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
                        {t('about.changelog.title', 'Historial de Versiones')}
                    </h3>
                </div>
                <div className="px-4 py-5 sm:p-6">
                    <div className="flow-root">
                        <ul className="-mb-8">
                            {VERSIONS.map((versionItem, versionIdx) => (
                                <li key={versionItem.version}>
                                    <div className="relative pb-8">
                                        {versionIdx !== VERSIONS.length - 1 ? (
                                            <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200 dark:bg-gray-700" aria-hidden="true" />
                                        ) : null}
                                        <div className="relative flex space-x-3">
                                            <div>
                                                <span className="h-8 w-8 rounded-full bg-green-500 flex items-center justify-center ring-8 ring-white dark:ring-gray-800">
                                                    <Tag className="h-5 w-5 text-white" aria-hidden="true" />
                                                </span>
                                            </div>
                                            <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                                                <div>
                                                    <div className="flex items-center space-x-2">
                                                        <p className="text-sm font-bold text-gray-900 dark:text-white">
                                                            v{versionItem.version}
                                                        </p>
                                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                                                            Beta
                                                        </span>
                                                    </div>
                                                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 font-medium">
                                                        {versionItem.title}
                                                    </p>

                                                    <ul className="mt-2 space-y-1">
                                                        {versionItem.changes.map((change, i) => (
                                                            <li key={i} className="flex items-start text-sm text-gray-600 dark:text-gray-300">
                                                                <CheckCircle className="h-4 w-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                                                                {change}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                                <div className="text-right text-sm whitespace-nowrap text-gray-500 dark:text-gray-400">
                                                    <div className="flex items-center">
                                                        <Calendar className="h-4 w-4 mr-1" />
                                                        <time dateTime={versionItem.date}>{versionItem.date}</time>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AboutPage;
