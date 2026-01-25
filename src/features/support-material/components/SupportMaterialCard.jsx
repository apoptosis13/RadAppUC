import React from 'react';
import { useTranslation } from 'react-i18next';
import { FileText, Video, Presentation, Calendar, ChevronRight, File } from 'lucide-react';

const SupportMaterialCard = ({ material, onClick }) => {
    const { t, i18n } = useTranslation();
    const { title, title_en, type, category, description, description_en, createdAt, thumbnail } = material;
    const isEnglish = i18n.language?.startsWith('en');

    const getIcon = () => {
        switch (type) {
            case 'video': return Video;
            case 'presentation': return Presentation;
            case 'article': return FileText;
            default: return File;
        }
    };

    const Icon = getIcon();

    const formattedDate = createdAt ? new Intl.DateTimeFormat('es-CL', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    }).format(createdAt) : '';

    return (
        <div
            onClick={() => onClick(material)}
            className="group bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-md transition-all duration-300 border border-gray-200 dark:border-gray-700 overflow-hidden cursor-pointer flex flex-col h-full"
        >
            <div className="relative h-40 bg-gray-100 dark:bg-gray-900 flex items-center justify-center overflow-hidden">
                {thumbnail ? (
                    <img
                        src={thumbnail}
                        alt={(isEnglish && title_en) ? title_en : title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                ) : (
                    <div className="flex flex-col items-center text-gray-400 dark:text-gray-500">
                        <Icon size={48} className="mb-2 opacity-30" />
                        <span className="text-[10px] uppercase tracking-widest font-black opacity-30">
                            {t(`supportMaterial.types.${type}`)}
                        </span>
                    </div>
                )}

                {/* Modality Badge (Top Left) */}
                <div className="absolute top-3 left-3">
                    <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider shadow-sm ${category === 'mri' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300' :
                        category === 'us' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300' :
                            category === 'ct' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300' :
                                category === 'rx' ? 'bg-slate-100 text-slate-700 dark:bg-slate-900/50 dark:text-slate-300' :
                                    'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                        }`}>
                        {t(`supportMaterial.modalities.${category}`)}
                    </span>
                </div>

                {/* Type Badge (Top Right) */}
                <div className="absolute top-3 right-3">
                    <div className={`p-1.5 rounded-full shadow-sm ${type === 'video' ? 'bg-red-500 text-white' :
                        type === 'presentation' ? 'bg-orange-500 text-white' :
                            'bg-indigo-500 text-white'
                        }`}>
                        <Icon size={12} />
                    </div>
                </div>

                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>

            <div className="p-5 flex flex-col flex-1">
                <div className="flex justify-between items-start mb-2">
                    <span className={`text-[10px] font-black uppercase tracking-widest ${type === 'video' ? 'text-red-500' :
                        type === 'presentation' ? 'text-orange-500' :
                            'text-indigo-500'
                        }`}>
                        {t(`supportMaterial.types.${type}`)}
                    </span>
                    {createdAt && (
                        <div className="flex items-center text-[10px] text-gray-400 font-medium">
                            <Calendar size={10} className="mr-1" />
                            {formattedDate}
                        </div>
                    )}
                </div>

                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2 line-clamp-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                    {(isEnglish && title_en) ? title_en : title}
                </h3>

                <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mb-4 flex-1">
                    {(isEnglish && description_en) ? description_en : description}
                </p>

                <div className="flex items-center text-indigo-600 dark:text-indigo-400 text-xs font-bold uppercase tracking-wider group-hover:gap-2 transition-all">
                    {t('supportMaterial.card.view')}
                    <ChevronRight size={14} />
                </div>
            </div>
        </div>
    );
};

export default SupportMaterialCard;
