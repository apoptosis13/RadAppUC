import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { caseService } from '../../../services/caseService';
import { Activity, Brain, FileText, Edit, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const ManageCasesPage = () => {
    const [cases, setCases] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState('All');
    const { t, i18n } = useTranslation();

    useEffect(() => {
        const fetchCases = async () => {
            const data = await caseService.getAllCases();
            setCases(data);
        };
        fetchCases();
    }, []);

    const handleDelete = async (id) => {
        if (window.confirm(t('instructor.users.deleteCaseConfirm'))) {
            try {
                await caseService.deleteCase(id);
                // Optimistic update or refetch
                const data = await caseService.getAllCases();
                setCases(data);
            } catch (error) {
                console.error("Error deleting case:", error);
                alert("Error al eliminar el caso. Inténtalo de nuevo.");
            }
        }
    };

    const getIcon = (modality) => {
        switch (modality) {
            case 'MRI': return Activity;
            case 'CT': return Brain;
            default: return FileText;
        }
    };

    const categories = ['All', 'Beginner', 'Intermediate', 'Advanced'];

    const filteredCases = selectedCategory === 'All'
        ? cases
        : cases.filter(c => c.difficulty === selectedCategory);

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">{t('instructor.manageCases')}</h1>
                    <p className="text-sm text-gray-500 mt-1">{t('instructor.dashboard')}</p>
                </div>

                <button
                    onClick={async () => {
                        if (window.confirm("¿Estás seguro de reiniciar la base de datos? Esto borrará todos los casos actuales y restaurará los ejemplos predeterminados con las nuevas traducciones.")) {
                            try {
                                const newData = await caseService.resetDatabase();
                                setCases(newData);
                                alert("Base de datos reiniciada correctamente.");
                            } catch (error) {
                                console.error("Error resetting database:", error);
                                alert("Error al reiniciar la base de datos.");
                            }
                        }
                    }}
                    className="px-4 py-2 bg-red-100 text-red-700 rounded-md text-sm font-medium hover:bg-red-200 transition-colors"
                >
                    Reiniciar Base de Datos (Fix Translations)
                </button>

                {/* Category Tabs */}
                <div className="flex space-x-2 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
                    {categories.map((category) => (
                        <button
                            key={category}
                            onClick={() => setSelectedCategory(category)}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${selectedCategory === category
                                ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                                }`}
                        >
                            {category === 'All' ? t('cases.all') : t(`cases.difficulty.${category}`)}
                        </button>
                    ))}
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-md">
                <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                    {filteredCases.map((caseItem) => {
                        const Icon = getIcon(caseItem.modality);
                        return (
                            <li key={caseItem.id}>
                                <div className="px-4 py-4 flex items-center sm:px-6">
                                    <div className="min-w-0 flex-1 sm:flex sm:items-center sm:justify-between">
                                        <div className="flex items-center">
                                            <div className="flex-shrink-0 h-12 w-12 relative">
                                                <img
                                                    className="h-12 w-12 rounded-full object-cover"
                                                    src={caseItem.image}
                                                    alt=""
                                                />
                                                <div className="absolute bottom-0 right-0 -mb-1 -mr-1 bg-white dark:bg-gray-800 rounded-full p-0.5">
                                                    <Icon className="w-4 h-4 text-gray-400" />
                                                </div>
                                            </div>
                                            <div className="ml-4">
                                                <div className="flex items-center">
                                                    <p className="font-medium text-indigo-600 dark:text-indigo-400 truncate">
                                                        {(i18n.language?.startsWith('en') && caseItem.title_en) ? caseItem.title_en : (caseItem.title || t(caseItem.titleKey))}
                                                    </p>
                                                    <span className={`ml-2 px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${caseItem.difficulty === 'Beginner' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                                                        caseItem.difficulty === 'Intermediate' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                                                            'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                                                        }`}>
                                                        {t(`cases.difficulty.${caseItem.difficulty}`)}
                                                    </span>
                                                </div>
                                                <div className="mt-2 flex">
                                                    <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                                                        <p className="truncate">
                                                            {(i18n.language?.startsWith('en') && caseItem.history_en) ? caseItem.history_en : (caseItem.history || t(caseItem.historyKey))}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="ml-5 flex-shrink-0 flex space-x-2">
                                        <Link
                                            to={`/instructor/cases/edit/${caseItem.id}`}
                                            className="inline-flex items-center p-2 border border-transparent rounded-full shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                        >
                                            <Edit className="h-4 w-4" aria-hidden="true" />
                                        </Link>
                                        <button
                                            type="button"
                                            onClick={() => handleDelete(caseItem.id)}
                                            className="inline-flex items-center p-2 border border-transparent rounded-full shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                                        >
                                            <Trash2 className="h-4 w-4" aria-hidden="true" />
                                        </button>
                                    </div>
                                </div>
                            </li>
                        );
                    })}
                    {filteredCases.length === 0 && (
                        <li className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                            {t('cases.notFound')}
                        </li>
                    )}
                </ul>
            </div>
        </div>
    );
};

export default ManageCasesPage;
