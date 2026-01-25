import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { supportMaterialService } from '../../../services/supportMaterialService';
import PageHeader from '../../../components/PageHeader';
import SupportMaterialCard from '../components/SupportMaterialCard';
import VideoPlayer from '../components/VideoPlayer';
import DocumentViewer from '../components/DocumentViewer';
import { BookOpen, Search, X, Filter, LayoutGrid } from 'lucide-react';

const CATEGORIES = [
    { id: 'all' },
    { id: 'rx' },
    { id: 'us' },
    { id: 'mri' },
    { id: 'ct' },
    { id: 'other' }
];

const TYPES = [
    { id: 'all' },
    { id: 'video' },
    { id: 'presentation' },
    { id: 'article' }
];

const SupportMaterialPage = () => {
    const { t, i18n } = useTranslation();
    const isEnglish = i18n.language?.startsWith('en');
    const [materials, setMaterials] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [selectedType, setSelectedType] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedMaterial, setSelectedMaterial] = useState(null);

    useEffect(() => {
        loadMaterials();
    }, [selectedCategory]);

    const loadMaterials = async () => {
        setLoading(true);
        try {
            // We fetch by category from server, and filter by type locally for simplicity
            // or we could update the service to support dual filtering
            const data = await supportMaterialService.getAllMaterials(selectedCategory);
            setMaterials(data);
        } catch (error) {
            console.error("Error loading support materials:", error);
        } finally {
            setLoading(false);
        }
    };

    const filteredMaterials = materials.filter(m => {
        const matchesType = selectedType === 'all' || m.type === selectedType;
        const matchesSearch = m.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            m.description.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesType && matchesSearch;
    });

    const handleOpenMaterial = (material) => {
        setSelectedMaterial(material);
        // Track analytics here if needed
    };

    const handleCloseMaterial = () => {
        setSelectedMaterial(null);
    };

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-in fade-in duration-500">
            <PageHeader
                title={t('supportMaterial.title')}
                subtitle={t('supportMaterial.subtitle')}
                icon={BookOpen}
            />

            {/* Filters & Search */}
            <div className="flex flex-col gap-6 mb-10">
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                    <input
                        type="text"
                        placeholder={t('supportMaterial.searchPlaceholder')}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-12 pr-4 py-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all dark:text-white"
                    />
                </div>

                <div className="space-y-4">
                    {/* Modality Filter */}
                    <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
                        <Filter className="text-gray-400 mr-2 shrink-0" size={18} />
                        {CATEGORIES.map(cat => (
                            <button
                                key={cat.id}
                                onClick={() => setSelectedCategory(cat.id)}
                                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider whitespace-nowrap transition-all border ${selectedCategory === cat.id
                                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-md scale-105'
                                    : 'bg-white dark:bg-gray-800 text-gray-400 dark:text-gray-500 border-gray-200 dark:border-gray-700 hover:border-indigo-300'
                                    }`}
                            >
                                {t(`supportMaterial.modalities.${cat.id}`)}
                            </button>
                        ))}
                    </div>

                    {/* Type Filter */}
                    <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
                        <LayoutGrid className="text-gray-400 mr-2 shrink-0" size={18} />
                        {TYPES.map(type => (
                            <button
                                key={type.id}
                                onClick={() => setSelectedType(type.id)}
                                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider whitespace-nowrap transition-all border ${selectedType === type.id
                                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-md scale-105'
                                    : 'bg-white dark:bg-gray-800 text-gray-400 dark:text-gray-500 border-gray-200 dark:border-gray-700 hover:border-emerald-300'
                                    }`}
                            >
                                {t(`supportMaterial.types.${type.id}`)}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Content Grid */}
            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {[1, 2, 3, 4, 5, 6].map(i => (
                        <div key={i} className="h-80 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />
                    ))}
                </div>
            ) : filteredMaterials.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {filteredMaterials.map(m => (
                        <SupportMaterialCard
                            key={m.id}
                            material={m}
                            onClick={handleOpenMaterial}
                        />
                    ))}
                </div>
            ) : (
                <div className="text-center py-20 bg-gray-50 dark:bg-gray-800/30 rounded-3xl border-2 border-dashed border-gray-200 dark:border-gray-700">
                    <div className="p-4 bg-gray-100 dark:bg-gray-700 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                        <LayoutGrid className="text-gray-400" size={32} />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                        {t('supportMaterial.noResults.title')}
                    </h3>
                    <p className="text-gray-500 dark:text-gray-400">
                        {t('supportMaterial.noResults.desc')}
                    </p>
                </div>
            )}

            {/* Material Modal Viewer */}
            {selectedMaterial && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="w-full max-w-6xl h-[90vh] flex flex-col relative">
                        <button
                            onClick={() => setSelectedMaterial(null)}
                            className="absolute -top-12 right-0 p-2 text-white hover:bg-white/10 rounded-full transition-colors flex items-center gap-2 group"
                        >
                            <span className="text-xs font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">{t('common.close', 'Cerrar')}</span>
                            <X size={32} />
                        </button>

                        <div className="flex-1 min-h-0 bg-gray-900 rounded-2xl overflow-hidden shadow-2xl border border-white/10">
                            {selectedMaterial.type === 'video' ? (
                                <VideoPlayer
                                    videoUrl={selectedMaterial.url}
                                    provider={selectedMaterial.provider}
                                    title={(isEnglish && selectedMaterial.title_en) ? selectedMaterial.title_en : selectedMaterial.title}
                                />
                            ) : (
                                <DocumentViewer
                                    fileUrl={selectedMaterial.url}
                                    type={selectedMaterial.type}
                                    title={(isEnglish && selectedMaterial.title_en) ? selectedMaterial.title_en : selectedMaterial.title}
                                />
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SupportMaterialPage;
