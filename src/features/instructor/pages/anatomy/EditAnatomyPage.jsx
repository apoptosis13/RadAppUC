import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { anatomyService } from '../../../../services/anatomyService';
import { ArrowLeft, Save, Upload, Plus, Trash2, Image as ImageIcon, Layers, AlertTriangle, Wand2, Languages, Loader2 } from 'lucide-react';
import { activityLogService } from '../../../../services/activityLogService';
import { translationService } from '../../../../services/translationService';
import AnatomyEditor from "../../../anatomy/components/AnatomyEditor";
import { ANATOMY_CATEGORIES } from '../../../../utils/anatomyConstants';

const pruneData = (obj) => {
    if (Array.isArray(obj)) {
        return obj
            .map(v => (v && typeof v === 'object') ? pruneData(v) : v)
            .filter(v => v !== undefined &&
                (Array.isArray(v) ? v.length > 0 : true) &&
                (typeof v === 'object' && v !== null && !(v instanceof Date) ? Object.keys(v).length > 0 : true));
    } else if (obj && typeof obj === 'object' && !(obj instanceof Date)) {
        return Object.entries(obj).reduce((a, [k, v]) => {
            const pruned = (v && typeof v === 'object') ? pruneData(v) : v;
            if (pruned !== undefined &&
                (Array.isArray(pruned) ? pruned.length > 0 : true) &&
                (typeof pruned === 'object' && pruned !== null && !(pruned instanceof Date) ? Object.keys(pruned).length > 0 : true)) {
                a[k] = pruned;
            }
            return a;
        }, {});
    }
    return obj;
};

const EditAnatomyPage = () => {
    const { moduleId } = useParams();
    const navigate = useNavigate();
    const isEditing = !!moduleId;

    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        titleEn: '', // English Title field
        region: 'lower-limb',
        modality: 'MRI',
        description: '',
        descriptionEn: '', // English Description field
        series: [] // Array of { id, name, images: [{ id, url, annotations: [] }] }
    });

    const [activeSeriesId, setActiveSeriesId] = useState(null);
    const [editorImageIndex, setEditorImageIndex] = useState(0);
    const [error, setError] = useState(null);
    const [translatingFields, setTranslatingFields] = useState({}); // Tracking which field is translating

    useEffect(() => {
        if (isEditing) {
            loadModule();
        }
    }, [moduleId]);

    const loadModule = async () => {
        setLoading(true);
        try {
            const data = await anatomyService.getModuleById(moduleId);
            if (data) {
                setFormData(data);
                if (data.series && data.series.length > 0) {
                    setActiveSeriesId(data.series[0].id);
                }
            }
        } catch (error) {
            console.error("Error loading module:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleAutoTranslate = async (sourceField, targetField) => {
        const sourceText = formData[sourceField];
        if (!sourceText || !sourceText.trim()) {
            alert("No hay texto en español para traducir.");
            return;
        }

        setTranslatingFields(prev => ({ ...prev, [targetField]: true }));
        try {
            const translation = await translationService.translate(sourceText);
            setFormData(prev => ({ ...prev, [targetField]: translation }));
        } catch (err) {
            console.error("Translation fail:", err);
            alert("Error al traducir: " + err.message);
        } finally {
            setTranslatingFields(prev => ({ ...prev, [targetField]: false }));
        }
    };

    const handleAddSeries = () => {
        const newSeries = {
            id: Date.now().toString(),
            name: 'Nueva Serie',
            plane: 'axial', // Default
            sequence: 'T1', // Default
            images: [],
            structures: [] // Series-level definitions { id, label, category, type, color }
        };
        setFormData(prev => ({
            ...prev,
            series: [...(prev.series || []), newSeries]
        }));
        setActiveSeriesId(newSeries.id);
    };

    const handleRemoveSeries = (seriesId) => {
        if (window.confirm('¿Estás seguro de eliminar esta serie y todas sus imágenes? (Debes guardar el módulo para aplicar los cambios)')) {
            setFormData(prev => ({
                ...prev,
                series: prev.series.filter(s => s.id !== seriesId)
            }));
            if (activeSeriesId === seriesId) {
                setActiveSeriesId(null);
            }
        }
    };

    const handleSeriesNameChange = (seriesId, newName) => {
        setFormData(prev => ({
            ...prev,
            series: prev.series.map(s => s.id === seriesId ? { ...s, name: newName } : s)
        }));
    };

    const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });

    const handleImageUpload = async (e, seriesId) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        setUploading(true);
        setError(null);
        setUploadProgress({ current: 0, total: files.length });

        try {
            const newImages = [];
            const BATCH_SIZE = 3;

            // Process files in batches
            for (let i = 0; i < files.length; i += BATCH_SIZE) {
                const batch = files.slice(i, i + BATCH_SIZE);

                const batchPromises = batch.map(async (file) => {
                    try {
                        // Upload to Firebase
                        const url = await anatomyService.uploadImage(file);

                        // Update progress
                        setUploadProgress(prev => ({ ...prev, current: prev.current + 1 }));

                        const checkIsDicom = async (file) => false;

                        const isDicom = await checkIsDicom(file);
                        console.log('Uploading file:', file.name, 'Type:', file.type, 'Detected as DICOM:', isDicom);

                        return {
                            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
                            url: url,
                            // previewUrl removed to avoid blob expiration issues. We use the remote url.
                            type: 'image',
                            annotations: []
                        };
                    } catch (err) {
                        console.error(`Error uploading file ${file.name}:`, err);
                        return null; // Return null for failed uploads
                    }
                });

                // Wait for current batch to complete before starting next
                const batchResults = await Promise.all(batchPromises);
                const successfulUploads = batchResults.filter(img => img !== null);
                newImages.push(...successfulUploads);
            }

            if (newImages.length < files.length) {
                setError(`Se subieron ${newImages.length} de ${files.length} imágenes. Algunas fallaron.`);
            }

            setFormData(prev => ({
                ...prev,
                series: prev.series.map(s =>
                    s.id === seriesId
                        ? { ...s, images: [...s.images, ...newImages] }
                        : s
                )
            }));

        } catch (error) {
            console.error("Error in batch upload:", error);
            setError("Error crítico al subir imágenes.");
        } finally {
            setUploading(false);
            setUploadProgress({ current: 0, total: 0 });
        }
    };

    const handleUpdateSeries = (seriesId, updates) => {
        setFormData(prev => ({
            ...prev,
            series: prev.series.map(s =>
                s.id === seriesId
                    ? { ...s, ...updates }
                    : s
            )
        }));
    };

    const handleCopyAnnotations = (sourceSeriesId) => {
        const sourceSeries = formData.series.find(s => s.id === sourceSeriesId);
        const targetSeries = activeSeries;

        if (!sourceSeries || !targetSeries) return;

        if (window.confirm(`¿Estás seguro de copiar las anotaciones de "${sourceSeries.name}" a "${targetSeries.name}"? Esto agregará las estructuras a las imágenes actuales.`)) {
            let copiedLegacyCount = 0;
            let copiedStructuresCount = 0;

            // 1. Copy Legacy Image Annotations
            const updatedImages = targetSeries.images.map((targetImg, index) => {
                const sourceImg = sourceSeries.images[index];
                if (!sourceImg || !sourceImg.annotations || sourceImg.annotations.length === 0) {
                    return targetImg;
                }

                // Deep clone and regenerate IDs for legacy annotations
                const newAnnotations = sourceImg.annotations.map(ann => ({
                    ...ann,
                    id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
                    points: ann.points ? ann.points.map(p => ({ ...p })) : undefined
                }));

                copiedLegacyCount += newAnnotations.length;

                return {
                    ...targetImg,
                    annotations: [...(targetImg.annotations || []), ...newAnnotations]
                };
            });

            // 2. Copy Series Structures (New Model)
            const newStructures = (sourceSeries.structures || []).map(struct => ({
                ...struct,
                id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
                locations: JSON.parse(JSON.stringify(struct.locations || {}))
            }));

            copiedStructuresCount = newStructures.length;

            handleUpdateSeries(targetSeries.id, {
                images: updatedImages,
                structures: [...(targetSeries.structures || []), ...newStructures]
            });

            const totalCopied = copiedLegacyCount + copiedStructuresCount;
            if (totalCopied > 0) {
                alert(`Anotaciones copiadas correctamente.`);
            } else {
                alert("No se encontraron estructuras para copiar en la serie origen.");
            }
        }
    };

    const handleReverseSeries = (seriesId) => {
        if (!window.confirm("¿Invertir el orden de todas las imágenes y anotaciones de esta serie?")) return;

        const s = formData.series.find(is => is.id === seriesId);
        if (!s) return;

        const totalImages = s.images.length;
        if (totalImages === 0) return;

        // 1. Reverse Images
        const reversedImages = [...s.images].reverse();

        // 2. Remap Structure Locations: newIndex = (N - 1) - oldIndex
        const newStructures = (s.structures || []).map(struct => {
            const newLocations = {};
            Object.entries(struct.locations || {}).forEach(([oldIdxStr, data]) => {
                const oldIdx = parseInt(oldIdxStr, 10);
                const newIdx = (totalImages - 1) - oldIdx;
                if (newIdx >= 0 && newIdx < totalImages) {
                    newLocations[newIdx] = data;
                }
            });
            return { ...struct, locations: newLocations };
        });

        // 3. Update Series
        handleUpdateSeries(seriesId, {
            images: reversedImages,
            structures: newStructures
        });
    };

    const handleDeleteImage = (seriesId, imageIndex) => {
        if (!window.confirm("¿Eliminar esta imagen y sus anotaciones asociadas?")) return;

        const s = formData.series.find(is => is.id === seriesId);
        if (!s) return;

        // 1. Filter Images
        const newImages = s.images.filter((_, idx) => idx !== imageIndex);

        // 2. Shift Structure Locations
        // If idx < deletedIndex: keep
        // If idx == deletedIndex: remove
        // If idx > deletedIndex: shift down (idx - 1)
        const newStructures = (s.structures || []).map(struct => {
            const newLocations = {};
            Object.entries(struct.locations || {}).forEach(([idxStr, data]) => {
                const idx = parseInt(idxStr, 10);
                if (idx < imageIndex) {
                    newLocations[idx] = data;
                } else if (idx > imageIndex) {
                    newLocations[idx - 1] = data;
                }
                // idx == imageIndex is skipped (deleted)
            });
            return { ...struct, locations: newLocations };
        });

        // 3. Update Series
        handleUpdateSeries(seriesId, {
            images: newImages,
            structures: newStructures
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            // 1. Initial cleaning of previewUrls
            const baseCleanData = {
                ...formData,
                series: formData.series.map(s => ({
                    ...s,
                    images: s.images.map(({ previewUrl, ...img }) => img)
                }))
            };

            // 2. Recursive pruning of undefined/empty values
            const cleanFinalData = pruneData(baseCleanData);

            // 3. Size estimation and limit check
            const stringified = JSON.stringify(cleanFinalData);
            const sizeInBytes = new Blob([stringified]).size;
            console.log(`Payload size: ${(sizeInBytes / 1024).toFixed(2)} KB`);

            if (sizeInBytes > 1000000) {
                throw new Error(`El módulo es demasiado grande (${(sizeInBytes / 1024 / 1024).toFixed(2)} MB). El límite de Firestore es 1 MB. Intenta dividirlo o reducir el número de anotaciones.`);
            }

            if (isEditing) {
                await anatomyService.updateModule(moduleId, cleanFinalData);
            } else {
                await anatomyService.createModule(cleanFinalData);
            }

            // --- ACTIVITY LOG INJECTION ---
            try {
                await activityLogService.logActivity('EDIT_ANATOMY', {
                    moduleId: moduleId || 'NEW_MODULE',
                    title: cleanFinalData.title,
                    actionType: isEditing ? 'UPDATE' : 'CREATE'
                });
            } catch (e) {
                console.error('Failed to log activity:', e);
            }
            // ------------------------------

            navigate('/instructor/anatomy');
        } catch (error) {
            console.error("Error saving module:", error);
            const deployTs = "2026-01-08 00:50"; // Version marker
            alert(`[v${deployTs}] Error al guardar el módulo: ${error.message || 'Error desconocido'}`);
        } finally {
            setLoading(false);
        }
    };

    if (loading && isEditing && !formData.title) return <div className="p-8 text-center">Cargando...</div>;

    const activeSeries = formData.series?.find(s => s.id === activeSeriesId);

    return (
        <div className="w-full mx-auto space-y-6 pb-24 px-4">
            <div className="flex items-center justify-between">
                <button
                    onClick={() => navigate('/instructor/anatomy')}
                    className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                    <ArrowLeft className="w-4 h-4 mr-1" />
                    Volver
                </button>
                <div className="flex items-center space-x-4">
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                        {isEditing ? 'Editar Módulo' : 'Crear Nuevo Módulo'}
                    </h1>
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow space-y-6">
                {/* Basic Info */}
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
                    <div className="col-span-1">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Título del Módulo
                        </label>
                        <input
                            type="text"
                            name="title"
                            value={formData.title}
                            onChange={handleChange}
                            required
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm"
                        />
                    </div>
                    {/* English Title Field */}
                    <div className="col-span-1">
                        <label className="flex items-center justify-between text-sm font-medium text-gray-700 dark:text-gray-300">
                            <span>Título en Inglés (Opcional)</span>
                            <button
                                type="button"
                                onClick={() => handleAutoTranslate('title', 'titleEn')}
                                disabled={translatingFields.titleEn || !formData.title}
                                className="inline-flex items-center text-[10px] text-indigo-600 hover:text-indigo-500 font-bold uppercase tracking-wider"
                                title="Traducir automáticamente desde el español"
                            >
                                {translatingFields.titleEn ? (
                                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                ) : (
                                    <Languages className="w-3 h-3 mr-1" />
                                )}
                                Auto-traducir
                            </button>
                        </label>
                        <input
                            type="text"
                            name="titleEn"
                            value={formData.titleEn || ''}
                            onChange={handleChange}
                            placeholder="Knee MRI"
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Región Anatómica
                        </label>
                        <select
                            name="region"
                            value={formData.region}
                            onChange={handleChange}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm"
                        >
                            <option value="upper-limb">Miembro Superior</option>
                            <option value="lower-limb">Miembro Inferior</option>
                            <option value="thoracoabdominal">Pared Toracoabdominal</option>

                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Modalidad
                        </label>
                        <select
                            name="modality"
                            value={formData.modality}
                            onChange={handleChange}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm"
                        >
                            <option value="MRI">RM</option>
                            <option value="CT">TC</option>
                            <option value="X-Ray">Radiografía</option>
                            <option value="Illustration">Ilustración</option>
                        </select>
                    </div>
                </div>

                {/* Description Fields */}
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Descripción (Español)
                        </label>
                        <textarea
                            name="description"
                            rows={3}
                            value={formData.description || ''}
                            onChange={handleChange}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm"
                        />
                    </div>
                    <div>
                        <label className="flex items-center justify-between text-sm font-medium text-gray-700 dark:text-gray-300">
                            <span>Descripción (Inglés - Opcional)</span>
                            <button
                                type="button"
                                onClick={() => handleAutoTranslate('description', 'descriptionEn')}
                                disabled={translatingFields.descriptionEn || !formData.description}
                                className="inline-flex items-center text-[10px] text-indigo-600 hover:text-indigo-500 font-bold uppercase tracking-wider"
                                title="Traducir automáticamente desde el español"
                            >
                                {translatingFields.descriptionEn ? (
                                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                ) : (
                                    <Languages className="w-3 h-3 mr-1" />
                                )}
                                Auto-traducir
                            </button>
                        </label>
                        <textarea
                            name="descriptionEn"
                            rows={3}
                            value={formData.descriptionEn || ''}
                            onChange={handleChange}
                            placeholder="Detailed anatomy of the knee joint..."
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm"
                        />
                    </div>
                </div>

                {/* Series Management */}
                <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-medium text-gray-900 dark:text-white flex items-center">
                            <Layers className="w-5 h-5 mr-2" />
                            Series de Imágenes
                        </h2>
                        <button
                            type="button"
                            onClick={handleAddSeries}
                            className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200 dark:bg-indigo-900 dark:text-indigo-300"
                        >
                            <Plus className="w-4 h-4 mr-1" />
                            Añadir Serie
                        </button>
                    </div>

                    {/* Series Tabs */}
                    <div className="flex space-x-2 overflow-x-auto pb-2 mb-4">
                        {formData.series?.map(series => (
                            <button
                                key={series.id}
                                onClick={() => setActiveSeriesId(series.id)}
                                className={`flex items-center px-4 py-2 rounded-md text-sm font-medium whitespace-nowrap ${activeSeriesId === series.id
                                    ? 'bg-indigo-600 text-white'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300'
                                    }`}
                            >
                                {series.name}
                            </button>
                        ))}
                    </div>

                    {/* Active Series Editor */}
                    {activeSeries ? (
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Plano
                                    </label>
                                    <select
                                        value={activeSeries.plane || 'axial'}
                                        onChange={(e) => {
                                            const newPlane = e.target.value;
                                            const currentSeq = activeSeries.sequence || 'T1';
                                            const newName = `${newPlane.charAt(0).toUpperCase() + newPlane.slice(1)} ${currentSeq}`;
                                            handleUpdateSeries(activeSeries.id, {
                                                plane: newPlane,
                                                name: newName
                                            });
                                        }}
                                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm"
                                    >
                                        <option value="axial">Axial</option>
                                        <option value="coronal">Coronal</option>
                                        <option value="sagital">Sagital</option>
                                        <option value="other">Otro</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Secuencia/Tipo
                                    </label>
                                    <div className="flex space-x-2">
                                        <select
                                            value={['T1', 'T2', 'STIR', 'FLAIR', 'PD', 'T2*', 'DWI', 'ADC'].includes(activeSeries.sequence) ? activeSeries.sequence : 'other'}
                                            onChange={(e) => {
                                                const newSeq = e.target.value;
                                                if (newSeq === 'other') {
                                                    // Don't change the actual value yet, let the user type in the input
                                                    // Or better, set it to empty string so input shows empty?
                                                    // Let's set it to 'Custom' or clear it?
                                                    // If we set to 'other', it's not a valid sequence name to display.
                                                    // We can set it to empty string to prompt typing.
                                                    handleUpdateSeries(activeSeries.id, { sequence: '' });
                                                } else {
                                                    const currentPlane = activeSeries.plane || 'axial';
                                                    const newName = `${currentPlane.charAt(0).toUpperCase() + currentPlane.slice(1)} ${newSeq}`;
                                                    handleUpdateSeries(activeSeries.id, {
                                                        sequence: newSeq,
                                                        name: newName
                                                    });
                                                }
                                            }}
                                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm"
                                        >
                                            <option value="T1">T1</option>
                                            <option value="T2">T2</option>
                                            <option value="STIR">STIR</option>
                                            <option value="FLAIR">FLAIR</option>
                                            <option value="PD">Densidad de Protones</option>
                                            <option value="T2*">T2* (Eco de Gradiente)</option>
                                            <option value="DWI">Difusión (DWI)</option>
                                            <option value="ADC">ADC</option>
                                            <option value="other">Otro / Manual</option>
                                        </select>
                                    </div>
                                    {/* Show input if 'other' is selected (meaning current value is not standard) */}
                                    {!['T1', 'T2', 'STIR', 'FLAIR', 'PD', 'T2*', 'DWI', 'ADC'].includes(activeSeries.sequence) && (
                                        <input
                                            type="text"
                                            value={activeSeries.sequence === 'other' ? '' : activeSeries.sequence}
                                            onChange={(e) => {
                                                const manualSeq = e.target.value;
                                                const currentPlane = activeSeries.plane || 'axial';
                                                const newName = `${currentPlane.charAt(0).toUpperCase() + currentPlane.slice(1)} ${manualSeq}`;
                                                handleUpdateSeries(activeSeries.id, {
                                                    sequence: manualSeq,
                                                    name: newName
                                                });
                                            }}
                                            placeholder="Escribe la secuencia (ej. DPFS)"
                                            className="mt-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm"
                                        />
                                    )}
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Nombre Display
                                    </label>
                                    <input
                                        type="text"
                                        value={activeSeries.name}
                                        onChange={(e) => handleSeriesNameChange(activeSeries.id, e.target.value)}
                                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm"
                                        placeholder="Ej. Axial T2"
                                    />
                                </div>
                            </div>

                            {/* Copy Annotations Control */}
                            {formData.series.length > 1 && (
                                <div className="flex items-center space-x-4 bg-gray-50 dark:bg-gray-900 p-3 rounded-md mb-4 border border-gray-200 dark:border-gray-700">
                                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Importar estructuras:
                                    </span>
                                    <select
                                        onChange={(e) => {
                                            if (e.target.value) {
                                                handleCopyAnnotations(e.target.value);
                                                e.target.value = ""; // Reset select
                                            }
                                        }}
                                        className="block w-64 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm"
                                        defaultValue=""
                                    >
                                        <option value="" disabled>Copiar desde...</option>
                                        {formData.series
                                            .filter(s => s.id !== activeSeries.id && (s.plane || 'axial') === (activeSeries.plane || 'axial'))
                                            .map(s => (
                                                <option key={s.id} value={s.id}>
                                                    {s.name} ({s.images?.length || 0} imgs)
                                                </option>
                                            ))
                                        }
                                        {formData.series.every(s => s.id === activeSeries.id || (s.plane || 'axial') !== (activeSeries.plane || 'axial')) && (
                                            <option disabled>No hay otras series del mismo plano</option>
                                        )}
                                    </select>
                                </div>
                            )}

                            <div className="flex items-center space-x-4">
                                <button
                                    type="button"
                                    onClick={() => {
                                        console.log('Deleting series:', activeSeries.id);
                                        handleRemoveSeries(activeSeries.id);
                                    }}
                                    className="text-red-600 hover:text-red-800 p-2"
                                    title="Eliminar Serie"
                                >
                                    <Trash2 className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Image Upload for Series */}
                            {activeSeries.images.length === 0 && (
                                <div className="mt-4 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 dark:border-gray-600 border-dashed rounded-md">
                                    <div className="space-y-1 text-center">
                                        <ImageIcon className="mx-auto h-12 w-12 text-gray-400" />
                                        <div className="flex text-sm text-gray-600 dark:text-gray-400">
                                            <label
                                                htmlFor={`file-upload-${activeSeries.id}`}
                                                className="relative cursor-pointer bg-white dark:bg-gray-800 rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500"
                                            >
                                                <span>Subir imágenes</span>
                                                <input
                                                    id={`file-upload-${activeSeries.id}`}
                                                    name={`file-upload-${activeSeries.id}`}
                                                    type="file"
                                                    className="sr-only"
                                                    accept="image/*"
                                                    multiple
                                                    onChange={(e) => handleImageUpload(e, activeSeries.id)}
                                                    disabled={uploading}
                                                />
                                            </label>
                                            <p className="pl-1">o arrastra y suelta</p>
                                        </div>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                            PNG, JPG (Selecciona múltiples archivos para crear un stack)
                                        </p>
                                        {uploading && (
                                            <p className="text-sm text-indigo-500 font-medium">
                                                Subiendo {uploadProgress.current} de {uploadProgress.total}...
                                            </p>
                                        )}
                                        {error && <p className="text-sm text-red-500 mt-2">{error}</p>}
                                    </div>
                                </div>
                            )}

                            {/* Anatomy Editor with Series Data */}
                            {activeSeries.images.length > 0 && (
                                <div className="mt-4">
                                    <AnatomyEditor
                                        series={activeSeries}
                                        onUpdate={(updates) => handleUpdateSeries(activeSeries.id, updates)}
                                        onReverseOrder={() => handleReverseSeries(activeSeries.id)}
                                        onImageIndexChange={setEditorImageIndex}
                                    />
                                    <div className="mt-2 flex flex-col items-end space-y-2">
                                        {uploading && (
                                            <span className="text-sm text-indigo-500 font-medium">
                                                Subiendo {uploadProgress.current} de {uploadProgress.total}...
                                            </span>
                                        )}
                                        <label
                                            htmlFor={`file-upload-more-${activeSeries.id}`}
                                            className="cursor-pointer text-sm text-indigo-600 hover:text-indigo-500 flex items-center"
                                        >
                                            <Plus className="w-4 h-4 mr-1" />
                                            Añadir más imágenes a esta serie
                                            <input
                                                id={`file-upload-more-${activeSeries.id}`}
                                                type="file"
                                                className="sr-only"
                                                accept="image/*"
                                                multiple
                                                onChange={(e) => handleImageUpload(e, activeSeries.id)}
                                                disabled={uploading}
                                            />
                                        </label>
                                        <button
                                            type="button"
                                            onClick={() => handleDeleteImage(activeSeries.id, editorImageIndex)}
                                            className="text-xs text-red-500 hover:text-red-700 font-medium flex items-center transition-colors"
                                            title="Eliminar la imagen que se está viendo actualmente"
                                        >
                                            <Trash2 className="w-3 h-3 mr-1" />
                                            Eliminar imagen actual
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="text-center py-12 text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-700">
                            <Layers className="mx-auto h-12 w-12 text-gray-400" />
                            <p className="mt-2 text-sm font-medium">No hay series seleccionadas</p>
                            <p className="text-sm">Crea una nueva serie o selecciona una existente para empezar.</p>
                            <button
                                onClick={handleAddSeries}
                                className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
                            >
                                <Plus className="w-5 h-5 mr-2" />
                                Crear Primera Serie
                            </button>
                        </div>
                    )}
                </div>
            </div>


            {/* Footer with Save Button */}
            <div className="fixed bottom-0 right-0 w-full bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4 flex justify-end z-50 shadow-lg">
                <button
                    onClick={handleSubmit}
                    disabled={loading || uploading}
                    className="inline-flex items-center px-6 py-3 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                >
                    <Save className="-ml-1 mr-2 h-5 w-5" />
                    {loading ? 'Guardando...' : 'Guardar Módulo'}
                </button>
            </div>
        </div >
    );
};

export default EditAnatomyPage;
