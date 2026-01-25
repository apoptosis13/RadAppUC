import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { BookOpen, Search, ArrowRight, Activity } from 'lucide-react';
import { caseService } from '../../../services/caseService';
import PageHeader from '../../../components/PageHeader';
import { Sparkles } from 'lucide-react';

const ReportTrainingDashboard = () => {
    const { t, i18n } = useTranslation();
    const navigate = useNavigate();
    const [cases, setCases] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const loadCases = async () => {
            try {
                const fetchedCases = await caseService.getAllCases();
                setCases(fetchedCases);
            } catch (error) {
                console.error("Error loading cases for training:", error);
            } finally {
                setLoading(false);
            }
        };
        loadCases();
    }, []);

    const filteredCases = cases.filter(c =>
        (c.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.diagnosis?.toLowerCase().includes(searchTerm.toLowerCase())) &&
        c.type === 'training' // Only show training cases
    );

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8">
            <PageHeader
                title={t('training.dashboard.title')}
                subtitle={t('training.dashboard.subtitle')}
                icon={Sparkles}
            />

            {/* Search Bar */}
            <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500" size={20} />
                <input
                    type="text"
                    placeholder={t('training.dashboard.searchPlaceholder')}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 bg-gray-800/50 border border-gray-700/50 rounded-xl text-gray-200 focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                />
            </div>

            {/* Case Grid */}
            {loading ? (
                <div className="flex justify-center py-20">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500"></div>
                </div>
            ) : filteredCases.length === 0 ? (
                <div className="text-center py-20 text-gray-500">
                    {t('training.dashboard.noCases')}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredCases.map((caseItem) => (
                        <div
                            key={caseItem.id}
                            onClick={() => navigate(`/report-training/${caseItem.id}`)}
                            className="group relative bg-gray-800/40 hover:bg-gray-800/80 border border-gray-700/50 hover:border-teal-500/50 rounded-2xl p-6 transition-all duration-300 cursor-pointer overflow-hidden shadow-lg hover:shadow-teal-900/10"
                        >
                            <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                <ArrowRight className="text-teal-400" />
                            </div>

                            <div className="flex items-center space-x-3 mb-4">
                                <div className="p-3 bg-teal-900/20 rounded-lg text-teal-400 group-hover:scale-110 transition-transform">
                                    <Activity size={24} />
                                </div>
                                <span className={`text-xs font-bold px-2 py-1 rounded-full border ${caseItem.difficulty === 'Expert' ? 'border-red-500/30 text-red-400 bg-red-900/10' :
                                    caseItem.difficulty === 'Intermediate' ? 'border-yellow-500/30 text-yellow-400 bg-yellow-900/10' :
                                        'border-green-500/30 text-green-400 bg-green-900/10'
                                    }`}>
                                    {caseItem.difficulty ? t(`cases.difficulty.${caseItem.difficulty}`) : 'Normal'}
                                </span>
                            </div>

                            <h3 className="text-xl font-bold text-gray-100 mb-2 group-hover:text-teal-300 transition-colors">
                                {(i18n.language?.startsWith('en') && caseItem.title_en) ? caseItem.title_en : (caseItem.title || t('common.untitled'))}
                            </h3>

                            <p className="text-sm text-gray-400 line-clamp-2">
                                {(i18n.language?.startsWith('en') && caseItem.history_en) ? caseItem.history_en : (caseItem.history || caseItem.clinicalHistory || caseItem.description || t('training.dashboard.noDescription'))}
                            </p>

                            <div className="mt-4 pt-4 border-t border-gray-700/50 flex justify-between items-center">
                                <span className="text-xs text-gray-500 font-mono">
                                    {caseItem.modality ? t(`cases.modality.${caseItem.modality}`) : 'RX'}
                                </span>
                                <span className="text-xs font-bold text-teal-500 group-hover:translate-x-1 transition-transform flex items-center">
                                    {t('training.dashboard.startPractice')}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default ReportTrainingDashboard;
