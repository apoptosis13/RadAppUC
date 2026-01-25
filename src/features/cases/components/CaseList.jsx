import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { caseService } from '../../../services/caseService';
import { Activity, Brain, FileText } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import PageHeader from '../../../components/PageHeader';

const CaseList = () => {
    const [cases, setCases] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState('All');
    const { t, i18n } = useTranslation();

    useEffect(() => {
        const fetchCases = async () => {
            try {
                const data = await caseService.getAllCases();
                setCases(data);
            } catch (error) {
                console.error("Error fetching cases:", error);
            }
        };
        fetchCases();
    }, []);

    const getIcon = (modality) => {
        switch (modality) {
            case 'MRI': return Activity;
            case 'CT': return Brain;
            default: return FileText;
        }
    };

    const categories = ['All', 'Beginner', 'Intermediate', 'Advanced'];

    const filteredCases = (selectedCategory === 'All'
        ? cases
        : cases.filter(c => c.difficulty === selectedCategory)
    ).filter(c => c.type !== 'training'); // Exclude training cases

    return (
        <div className="space-y-6">
            <PageHeader
                title={t('cases.pageTitle')}
                actions={
                    <div className="flex space-x-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg border border-gray-200 dark:border-gray-700">
                        {categories.map((category) => (
                            <button
                                key={category}
                                onClick={() => setSelectedCategory(category)}
                                className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all duration-200 ${selectedCategory === category
                                    ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                                    }`}
                            >
                                {category === 'All' ? t('cases.all') : t(`cases.difficulty.${category}`)}
                            </button>
                        ))}
                    </div>
                }
            />

            <div className="text-sm text-gray-500">
                {t('cases.showing', { count: filteredCases.length })}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredCases.map((caseItem) => {
                    const Icon = getIcon(caseItem.modality);
                    return (
                        <Link
                            key={caseItem.id}
                            to={`/cases/${caseItem.id}`}
                            className="block bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-md transition-shadow duration-200 border border-gray-200 dark:border-gray-700 overflow-hidden"
                        >
                            <div className="h-48 bg-gray-200 dark:bg-gray-700 relative">
                                <img
                                    src={caseItem.images && caseItem.images.length > 0
                                        ? caseItem.images[0]
                                        : (caseItem.image || (caseItem.imageStacks && caseItem.imageStacks.length > 0 && caseItem.imageStacks[0].images && caseItem.imageStacks[0].images.length > 0 ? caseItem.imageStacks[0].images[0] : null))}
                                    alt={caseItem.title}
                                    className="w-full h-full object-cover transition-opacity duration-300 ease-in-out"
                                    loading="lazy"
                                    decoding="async"
                                />
                                <div className="absolute top-2 right-2 bg-black/70 text-white px-2 py-1 rounded text-xs font-medium">
                                    {t(`cases.modality.${caseItem.modality}`)}
                                </div>
                            </div>
                            <div className="p-4">
                                <div className="flex items-center justify-between mb-2">
                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                        {(caseItem.titleKey && t(caseItem.titleKey)) ||
                                            (i18n.language?.startsWith('en') && caseItem.title_en) ||
                                            caseItem.title}
                                    </h3>
                                    <Icon className="w-5 h-5 text-gray-400" />
                                </div>
                                <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2 mb-3">
                                    {(caseItem.historyKey && t(caseItem.historyKey)) ||
                                        (i18n.language?.startsWith('en') && caseItem.history_en) ||
                                        caseItem.history}
                                </p>
                                <div className="flex items-center justify-between">
                                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${caseItem.difficulty === 'Beginner' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                                        caseItem.difficulty === 'Intermediate' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                                            'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                                        }`}>
                                        {t(`cases.difficulty.${caseItem.difficulty}`)}
                                    </span>
                                    <span className="text-indigo-600 dark:text-indigo-400 text-sm font-medium hover:underline">
                                        {t('cases.solve')} &rarr;
                                    </span>
                                </div>
                            </div>
                        </Link>
                    );
                })}
            </div>
        </div>
    );
};

export default CaseList;
