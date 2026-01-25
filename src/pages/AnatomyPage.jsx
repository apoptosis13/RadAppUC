import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { anatomyService } from '../services/anatomyService';
import { Image as ImageIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { getLocalizedModuleField } from '../utils/anatomyTranslations';
import PageHeader from '../components/PageHeader';

const REGION_IDS = ['upper-limb', 'lower-limb'];

import { useAuth } from '../context/AuthContext';

const AnatomyPage = () => {
    const { t, i18n } = useTranslation();
    const { user, loading: authLoading } = useAuth();
    const [firestoreModules, setFirestoreModules] = useState([]);
    const [loading, setLoading] = useState(true);

    const loadModules = async () => {
        try {
            const modules = await anatomyService.getModules(); // Fetch all, filtered client-side
            setFirestoreModules(modules);
        } catch (error) {
            console.error("Error loading modules:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!authLoading) {
            if (user) {
                loadModules();
            } else {
                setLoading(false); // No user, stop loading (will show empty or login prompt ideally)
            }
        }
    }, [authLoading, user]);

    const regions = REGION_IDS.map(regionId => {
        // Filter modules by region AND exclude non-MSK modules (Chest, Brain)
        const regionModules = firestoreModules
            .filter(m => m.region === regionId && !['chest-xray', 'brain-ct'].includes(m.id))
            .map(m => {
                // Find first image from first series as preview
                let previewImage = null;
                if (m.series && m.series.length > 0) {
                    for (const s of m.series) {
                        if (s.images && s.images.length > 0) {
                            previewImage = s.images[0].url;
                            break;
                        }
                    }
                }
                // Use the utility to get translated title and description (subtitle)
                const displayTitle = getLocalizedModuleField(m, 'title', i18n.language);
                const displaySubtitle = getLocalizedModuleField(m, 'description', i18n.language) || m.subtitle;

                // Resolve Thumbnail with Local Fallback
                const LOCAL_THUMBNAILS = {
                    'knee': '/thumbnails/knee.png',
                    'rodilla': '/thumbnails/knee.png',
                    'shoulder': '/thumbnails/shoulder.png',
                    'hombro': '/thumbnails/shoulder.png',
                    'elbow': '/thumbnails/elbow.png',
                    'codo': '/thumbnails/elbow.png',
                    'wrist': '/thumbnails/wrist.png',
                    'muñeca': '/thumbnails/wrist.png',
                    'pelvis': '/thumbnails/pelvis.png',
                    'hip': '/thumbnails/hip.png',
                    'cadera': '/thumbnails/hip.png',
                    'ankle': '/thumbnails/ankle.png',
                    'tobillo': '/thumbnails/ankle.png',
                    'pubis': '/thumbnails/pubis.png',
                    'pubic': '/thumbnails/pubis.png',
                    'pie': '/thumbnails/foot.png',
                    'foot': '/thumbnails/foot.png'
                };

                let finalThumbnail = m.thumbnail;

                if (!finalThumbnail) {
                    // Check ID or Title for keywords
                    const searchStr = (m.id + ' ' + (displayTitle || '')).toLowerCase();
                    const key = Object.keys(LOCAL_THUMBNAILS).find(k => searchStr.includes(k));
                    if (key) {
                        finalThumbnail = LOCAL_THUMBNAILS[key];
                    }
                }

                // Fallback to previewImage (full res) if no thumbnail found
                finalThumbnail = finalThumbnail || previewImage;

                return { ...m, previewImage, thumbnail: finalThumbnail, displayTitle, displaySubtitle };
            });
        return {
            id: regionId,
            title: t(`anatomy.regions.${regionId}.title`),
            description: t(`anatomy.regions.${regionId}.description`),
            modules: regionModules
        };
    });

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <PageHeader
                title={t('anatomy.landing.title')}
                subtitle={t('anatomy.landing.description')}
            />

            <div className="space-y-16">
                {regions.map((region) => (
                    <div key={region.id} className="space-y-6">
                        <div className="border-b border-gray-200 dark:border-gray-700 pb-4">
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                                {region.title}
                            </h2>
                            <p className="mt-1 text-gray-500 dark:text-gray-400">
                                {region.description}
                            </p>
                        </div>

                        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                            {region.modules.map((module) => (
                                <Link
                                    key={module.id}
                                    to={`/anatomy/${module.id}`}
                                    className="group block bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-200 dark:border-gray-700"
                                >
                                    <div className="relative h-48 bg-gray-200 dark:bg-gray-700 overflow-hidden flex items-center justify-center">
                                        {module.thumbnail ? (
                                            <img
                                                src={module.thumbnail}
                                                alt={module.displayTitle}
                                                className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500"
                                                loading="lazy"
                                                decoding="async"
                                            />
                                        ) : (
                                            <ImageIcon className="w-12 h-12 text-gray-400 dark:text-gray-500" />
                                        )}
                                        <div className="absolute top-2 right-2">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${module.modality === 'MRI' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                                                module.modality === 'CT' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                                                    module.modality === 'X-Ray' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' :
                                                        'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                                                }`}>
                                                {module.modality}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="p-4">
                                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                            {module.displayTitle}
                                        </h3>
                                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                            {module.displaySubtitle}
                                        </p>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default AnatomyPage;
