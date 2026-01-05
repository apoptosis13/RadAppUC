import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Edit, Trash2, Eye } from 'lucide-react';
import { anatomyService } from '../../../../services/anatomyService';
import { useTranslation } from 'react-i18next';

const ManageAnatomyPage = () => {
    const [modules, setModules] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadModules();
    }, []);

    const loadModules = async () => {
        try {
            const data = await anatomyService.getModules();
            setModules(data);
        } catch (error) {
            console.error("Error loading modules:", error);
        } finally {
            setLoading(false);
        }
    };

    const { t } = useTranslation();

    const handleDelete = async (id) => {
        if (window.confirm(t('instructor.users.deleteModuleConfirm'))) {
            try {
                await anatomyService.deleteModule(id);
                setModules(modules.filter(m => m.id !== id));
            } catch (error) {
                console.error("Error deleting module:", error);
                alert("Error al eliminar el módulo. Inténtalo de nuevo.");
            }
        }
    };

    if (loading) return <div className="p-8 text-center">Cargando módulos...</div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Gestión de Anatomía</h1>
                <Link
                    to="/instructor/anatomy/create"
                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                    <Plus className="-ml-1 mr-2 h-5 w-5" />
                    Nuevo Módulo
                </Link>
            </div>

            <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-md">
                <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                    {modules.map((module) => (
                        <li key={module.id}>
                            <div className="px-4 py-4 flex items-center sm:px-6">
                                <div className="min-w-0 flex-1 sm:flex sm:items-center sm:justify-between">
                                    <div className="flex items-center">
                                        <div className="flex-shrink-0 h-12 w-12">
                                            <img
                                                className="h-12 w-12 rounded-md object-cover"
                                                src={module.image || (module.series && module.series[0]?.images?.[0]?.url) || 'https://via.placeholder.com/150'}
                                                alt={module.title}
                                            />
                                        </div>
                                        <div className="ml-4">
                                            <div className="text-sm font-medium text-indigo-600 dark:text-indigo-400 truncate">
                                                {module.title}
                                            </div>
                                            <div className="flex mt-1">
                                                <p className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                                                    {module.region} • {module.modality}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="ml-5 flex-shrink-0 flex space-x-2">
                                    <Link
                                        to={`/anatomy/${module.id}`}
                                        target="_blank"
                                        className="p-2 text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
                                        title="Ver"
                                    >
                                        <Eye className="w-5 h-5" />
                                    </Link>
                                    <Link
                                        to={`/instructor/anatomy/edit/${module.id}`}
                                        className="p-2 text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300"
                                        title="Editar"
                                    >
                                        <Edit className="w-5 h-5" />
                                    </Link>
                                    <button
                                        onClick={() => handleDelete(module.id)}
                                        className="p-2 text-red-400 hover:text-red-500 dark:hover:text-red-300"
                                        title="Eliminar"
                                    >
                                        <Trash2 className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        </li>
                    ))}
                    {modules.length === 0 && (
                        <li className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                            No hay módulos creados. ¡Crea el primero!
                        </li>
                    )}
                </ul>
            </div>
        </div>
    );
};

export default ManageAnatomyPage;
