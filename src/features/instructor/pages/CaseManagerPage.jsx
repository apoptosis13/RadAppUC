import React, { useState, useEffect } from 'react';
import { caseService } from '../../../services/caseService';
import { Activity, Brain, FileText, Edit, Trash2, Plus, Search, Archive } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import CaseEditor from './CaseEditor';

const CaseManagerPage = () => {
    const { t } = useTranslation();
    const [viewMode, setViewMode] = useState('list'); // 'list', 'edit', 'create'
    const [selectedCaseId, setSelectedCaseId] = useState(null);
    const [cases, setCases] = useState([]);
    const [filter, setFilter] = useState('');
    const [category, setCategory] = useState('All');

    useEffect(() => {
        loadCases();
    }, []);

    const loadCases = async () => {
        const data = await caseService.getAllCases();
        setCases(data);
    };

    const handleCreate = () => {
        setSelectedCaseId(null);
        setViewMode('create');
    };

    const handleEdit = (id) => {
        setSelectedCaseId(id);
        setViewMode('edit');
    };

    const handleCancel = () => {
        setViewMode('list');
        setSelectedCaseId(null);
    };

    const handleSuccess = () => {
        loadCases();
        setViewMode('list');
        setSelectedCaseId(null);
    };

    const handleDelete = async (id) => {
        if (window.confirm(t('instructor.users.deleteCaseConfirm'))) {
            try {
                await caseService.deleteCase(id);
                setCases(cases.filter(c => c.id !== id));
            } catch (error) {
                console.error("Error deleting case:", error);
                alert("Error deleting case");
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

    const filteredCases = cases.filter(c => {
        const matchesFilter = (c.title || '').toLowerCase().includes(filter.toLowerCase());
        const matchesCategory = category === 'All' || c.difficulty === category;
        return matchesFilter && matchesCategory;
    });

    if (viewMode === 'create' || viewMode === 'edit') {
        return (
            <CaseEditor
                caseId={selectedCaseId}
                onCancel={handleCancel}
                onSuccess={handleSuccess}
            />
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Gestión de Casos</h1>
                    <p className="text-sm text-gray-500">Administra el banco de casos clínicos y quizes.</p>
                </div>
                <button
                    onClick={handleCreate}
                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
                >
                    <Plus className="-ml-1 mr-2 h-5 w-5" />
                    Nuevo Caso
                </button>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row justify-between items-center bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm gap-4">
                <div className="relative w-full sm:w-64">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="h-4 w-4 text-gray-400" />
                    </div>
                    <input
                        type="text"
                        placeholder="Buscar casos..."
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        className="block w-full pl-10 sm:text-sm border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white p-2 border"
                    />
                </div>
                <div className="flex space-x-2">
                    {['All', 'Beginner', 'Intermediate', 'Advanced'].map((cat) => (
                        <button
                            key={cat}
                            onClick={() => setCategory(cat)}
                            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${category === cat
                                    ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-200'
                                    : 'text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700'
                                }`}
                        >
                            {cat === 'All' ? 'Todos' : cat}
                        </button>
                    ))}
                </div>
            </div>

            {/* List */}
            <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-md">
                <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                    {filteredCases.map((caseItem) => {
                        const Icon = getIcon(caseItem.modality);
                        return (
                            <li key={caseItem.id} className="hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
                                <div className="px-4 py-4 flex items-center sm:px-6">
                                    <div className="min-w-0 flex-1 sm:flex sm:items-center sm:justify-between">
                                        <div className="flex items-center">
                                            <div className="flex-shrink-0 h-12 w-12 relative">
                                                <img
                                                    className="h-12 w-12 rounded-lg object-cover border border-gray-200 dark:border-gray-600"
                                                    src={caseItem.image || (caseItem.images && caseItem.images[0]) || (caseItem.imageStacks && caseItem.imageStacks[0]?.images[0])}
                                                    alt=""
                                                />
                                                <div className="absolute -bottom-1 -right-1 bg-white dark:bg-gray-800 rounded-full p-0.5 shadow-sm">
                                                    <Icon className="w-4 h-4 text-indigo-500" />
                                                </div>
                                            </div>
                                            <div className="ml-4">
                                                <div className="flex items-center">
                                                    <p className="font-bold text-indigo-600 dark:text-indigo-400 truncate text-sm">
                                                        {caseItem.title || t(caseItem.titleKey)}
                                                    </p>
                                                    <span className={`ml-2 px-2 inline-flex text-[10px] leading-4 font-semibold rounded-full ${caseItem.difficulty === 'Beginner' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                                                            caseItem.difficulty === 'Intermediate' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' :
                                                                'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                                                        }`}>
                                                        {caseItem.difficulty}
                                                    </span>
                                                    {caseItem.hideManualQuestions && (
                                                        <span className="ml-2 px-2 inline-flex text-[10px] leading-4 font-semibold rounded-full bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400">
                                                            AI Quiz Only
                                                        </span>
                                                    )}
                                                    {(caseItem.imageStacks && caseItem.imageStacks.length > 0) && (
                                                        <span className="ml-2 px-2 inline-flex text-[10px] leading-4 font-semibold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                                                            {caseItem.imageStacks.length} Series
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="mt-1 flex">
                                                    <p className="flex items-center text-xs text-gray-500 dark:text-gray-400 truncate max-w-md">
                                                        {caseItem.history || t(caseItem.historyKey)}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="ml-5 flex-shrink-0 flex space-x-2">
                                        <button
                                            onClick={() => handleEdit(caseItem.id)}
                                            className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-full dark:text-indigo-400 dark:hover:bg-indigo-900/50"
                                            title="Editar"
                                        >
                                            <Edit className="h-5 w-5" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(caseItem.id)}
                                            className="p-2 text-red-600 hover:bg-red-50 rounded-full dark:text-red-400 dark:hover:bg-red-900/50"
                                            title="Eliminar"
                                        >
                                            <Trash2 className="h-5 w-5" />
                                        </button>
                                    </div>
                                </div>
                            </li>
                        );
                    })}
                    {filteredCases.length === 0 && (
                        <li className="px-4 py-12 text-center text-gray-500 dark:text-gray-400 flex flex-col items-center">
                            <Archive className="w-12 h-12 text-gray-300 mb-2" />
                            <p>No se encontraron casos.</p>
                        </li>
                    )}
                </ul>
            </div>
        </div>
    );
};

export default CaseManagerPage;
