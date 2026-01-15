import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next'; // Import useTranslation
import { ArrowLeft, Trophy } from 'lucide-react';
import AnatomyInteractiveViewer from '../components/AnatomyInteractiveViewer';
import AnatomyQuiz from '../../quiz/AnatomyQuiz/AnatomyQuiz';
import { anatomyService } from '../../../services/anatomyService';
import { activityLogService } from '../../../services/activityLogService';

import { getLocalizedModuleField } from '../../../utils/anatomyTranslations';

const AnatomyViewerPage = () => {
    const { moduleId } = useParams();
    const [module, setModule] = useState(null);
    const [loading, setLoading] = useState(true);
    const [preloading, setPreloading] = useState(false);
    const [progress, setProgress] = useState(0);
    const { t, i18n } = useTranslation(); // Use translation hook
    const navigate = useNavigate();

    // Quiz State
    const [isQuizActive, setIsQuizActive] = useState(false);
    const [quizProps, setQuizProps] = useState({
        controlledSelection: false,
        selectedId: null,
        hideLabels: false,
        onAnnotationClick: null,
        forceSlice: null,
        forceSeriesId: null,
        isHighIntensity: false,
        dimUnselected: false
    });
    const [lastUserClick, setLastUserClick] = useState(null);

    const handleViewerUpdate = useCallback((newProps) => {
        setQuizProps(prev => ({ ...prev, ...newProps }));
    }, []);

    useEffect(() => {
        loadModule();
    }, [moduleId]);

    const loadModule = async () => {
        setLoading(true);
        setModule(null);
        try {
            const firestoreData = await anatomyService.getModuleById(moduleId);
            if (firestoreData) {
                setModule(firestoreData);
                // Start preloading images
                preloadImages(firestoreData);

                // --- ACTIVITY LOG INJECTION ---
                try {
                    await activityLogService.logActivity('VIEW_ANATOMY', {
                        moduleId: moduleId,
                        title: firestoreData.title
                    });
                } catch (e) {
                    console.error('Failed to log anatomy view:', e);
                }
                // ------------------------------
            } else {
                setModule(null);
            }
        } catch (error) {
            console.error("Error loading module:", error);
        } finally {
            setLoading(false);
        }
    };

    const preloadImages = async (moduleData) => {
        if (!moduleData || !moduleData.series) return;

        const allImages = [];
        moduleData.series.forEach(series => {
            if (series.images) {
                series.images.forEach(img => {
                    if (img.url) allImages.push(img.url);
                });
            }
        });

        // Also add single image if present (legacy)
        if (moduleData.image) allImages.push(moduleData.image);

        if (allImages.length === 0) return;

        setPreloading(true);
        setProgress(0);

        let loadedCount = 0;
        const total = allImages.length;

        const promises = allImages.map(url => {
            return new Promise((resolve) => {
                const img = new Image();
                img.src = url;
                img.onload = () => {
                    loadedCount++;
                    setProgress(Math.round((loadedCount / total) * 100));
                    resolve();
                };
                img.onerror = () => {
                    console.warn("Failed to preload image:", url);
                    loadedCount++; // Count as handled to avoid hanging
                    setProgress(Math.round((loadedCount / total) * 100));
                    resolve();
                };
            });
        });

        try {
            await Promise.all(promises);
        } catch (err) {
            console.error("Preload error:", err);
        } finally {
            setPreloading(false);
        }
    };

    if (loading) {
        return <div className="flex justify-center items-center min-h-screen text-white">{t('viewer.loading', 'Cargando módulo...')}</div>;
    }

    if (!module) {
        return (
            <div className="text-center py-12">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">{t('cases.notFound', 'Módulo no encontrado')}</h2>
                <Link to="/anatomy" className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 mt-4 inline-block">
                    {t('anatomy.back', 'Volver a Anatomía')}
                </Link>
            </div>
        );
    }

    if (preloading) {
        return (
            <div className="flex flex-col justify-center items-center min-h-screen bg-gray-900 text-white space-y-4">
                <div className="text-center">
                    <h2 className="text-xl font-bold mb-2">{getLocalizedModuleField(module, 'title', i18n.language)}</h2>
                    <p className="text-gray-400 text-sm">Cargando imágenes...</p>
                </div>
                <div className="w-64 h-2 bg-gray-700 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-indigo-500 transition-all duration-300 ease-out"
                        style={{ width: `${progress}%` }}
                    />
                </div>
                <p className="text-xs text-gray-500">{progress}%</p>
            </div>
        );
    }

    return (
        <div className="h-full w-full flex flex-col bg-black">
            <div className="flex-1 overflow-hidden relative">
                <AnatomyInteractiveViewer
                    module={module}
                    className="h-full w-full"
                    onBack={() => navigate('/anatomy')}
                    // Quiz Overrides
                    controlledSelection={quizProps.controlledSelection}
                    selectedId={quizProps.selectedId}
                    hideLabels={quizProps.hideLabels}
                    forceSlice={quizProps.forceSlice}
                    forceSeriesId={quizProps.forceSeriesId}
                    isHighIntensity={quizProps.isHighIntensity}
                    dimUnselected={quizProps.dimUnselected}
                    onAnnotationClick={
                        isQuizActive
                            ? (ann) => setLastUserClick(ann)
                            : null
                    }
                    onStartQuiz={!isQuizActive ? () => setIsQuizActive(true) : null}
                />

                {isQuizActive && (
                    <AnatomyQuiz
                        module={module}
                        onClose={() => {
                            setIsQuizActive(false);
                            setQuizProps({ controlledSelection: false, selectedId: null, hideLabels: false });
                        }}
                        onViewerUpdate={handleViewerUpdate}
                        userClickTrigger={lastUserClick}
                    />
                )}
            </div>
        </div>
    );
};

export default AnatomyViewerPage;
