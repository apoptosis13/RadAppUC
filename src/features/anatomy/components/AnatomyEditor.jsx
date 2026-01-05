import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next'; // Import useTranslation
import {
    MousePointer,
    Type,
    Circle,
    Move,
    RotateCw,
    FlipHorizontal,
    Trash2,
    Layers,
    Plus,
    ArrowUpRight,
    ChevronLeft,
    ChevronRight,
    Activity,
    Bone,
    Disc,
    CircleDot,
    AlignJustify,
    Droplet,
    Zap,
    Heart,
    Hexagon,
    Languages,
    Loader2, // For loading state
    Settings,
    FastForward,
    ArrowUpDown,
    ZoomIn,
    ZoomOut,
    Maximize,
    Hand
} from 'lucide-react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../../../config/firebase';
import { getSmoothPath } from '../../../utils/svgUtils';
import { calculateInsertIndex } from '../../../utils/geometryUtils';

import { ANATOMY_CATEGORIES } from '../../../utils/anatomyConstants';

const AnatomyEditor = ({ series, onUpdate }) => {
    const { t } = useTranslation(); // Initialize translation hook
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [selectedTool, setSelectedTool] = useState('select'); // select, point, line, polygon, pan
    const [selectedCategory, setSelectedCategory] = useState('bones');
    const [propagationRange, setPropagationRange] = useState('all'); // 'current', '10', '20', 'all'
    const [transform, setTransform] = useState({ rotate: 0, flipH: false });
    const [viewport, setViewport] = useState({ zoom: 1, x: 0, y: 0 }); // Zoom & Pan state
    const [selectedAnnotationId, setSelectedAnnotationId] = useState(null);
    const [drawingLine, setDrawingLine] = useState(null); // { startX, startY }
    const [currentPolygonPoints, setCurrentPolygonPoints] = useState([]); // Array of {x, y}
    const [dragging, setDragging] = useState(null); // { id, pointIndex } for polygons, or { id } for points
    const [isTranslating, setIsTranslating] = useState(false); // Translation loading state
    const [showManagement, setShowManagement] = useState(false); // Toggle for management menu
    const [isPanning, setIsPanning] = useState(false); // Track pan interaction

    const containerRef = useRef(null);
    const imageRef = useRef(null);
    const wrapperRef = useRef(null); // Ref for wrapper to attach non-passive wheel listener

    const handleClearAnnotations = (category = 'all') => {
        const confirmMsg = category === 'all'
            ? "¿Estás seguro de eliminar TODAS las anotaciones de esta serie?"
            : `¿Estás seguro de eliminar todas las anotaciones de la categoría "${category}"?`;

        if (!window.confirm(confirmMsg)) return;

        // 1. Clear Legacy Annotations
        const updatedImages = series.images.map(img => ({
            ...img,
            annotations: (img.annotations || []).filter(ann => {
                if (category === 'all') return false;
                return ann.category !== category;
            })
        }));

        // 2. Clear Series Structures
        const updatedStructures = (series.structures || []).filter(struct => {
            if (category === 'all') return false;
            return struct.category !== category;
        });

        onUpdate({
            images: updatedImages,
            structures: updatedStructures
        });

        setShowManagement(false);
    };

    const currentImage = series.images[currentImageIndex];
    // Merge legacy and series structures
    const legacyAnnotations = currentImage?.annotations || [];
    const seriesStructures = series.structures || [];

    // Get strutures visible on current slice
    const visibleStructures = seriesStructures
        .filter(s => s.locations && s.locations[currentImageIndex])
        .map(s => ({
            ...s,
            ...s.locations[currentImageIndex],
            id: s.id,
            isSeriesStructure: true
        }));

    const annotations = [...legacyAnnotations, ...visibleStructures];

    // Reset index if series changes and index is out of bounds
    useEffect(() => {
        if (currentImageIndex >= series.images.length) {
            setCurrentImageIndex(0);
        }
    }, [series.images.length]);

    // ... wheel listener ...

    const handleAnnotationUpdate = (id, updates) => {
        try {
            // Check if it's a series structure
            const structureIndex = seriesStructures.findIndex(s => s.id === id);

            if (structureIndex >= 0) {
                // Update series structure
                const newStructures = [...seriesStructures];
                const structure = { ...newStructures[structureIndex] }; // Deep(er) copy of structure top level

                if (!structure) {
                    console.error("Structure not found at index", structureIndex);
                    return;
                }

                // Distinguish between spatial updates (slice-specific) and metadata updates (series-wide)
                const spatialKeys = ['x', 'y', 'points'];
                const isSpatialUpdate = Object.keys(updates).some(k => spatialKeys.includes(k));

                if (isSpatialUpdate) {
                    const { _forceCurrent, ...validUpdates } = updates;

                    // Ensure locations object exists and is a copy
                    const newLocations = { ...(structure.locations || {}) };

                    // Safe access to current image index
                    const idx = currentImageIndex;

                    // Ensure the location object exists for the current slice
                    if (!newLocations[idx]) {
                        // If we are creating a location where none existed (e.g. after deletion or sync issue),
                        // we should probably initialize it with defaults or the current state if possible.
                        // For now, empty object + updates.
                        newLocations[idx] = {};
                    }

                    // 1. Update Current Image
                    newLocations[idx] = {
                        ...newLocations[idx],
                        ...validUpdates
                    };

                    // PROPAGATION IS DISABLED FOR EDITS.

                    newStructures[structureIndex] = { ...structure, locations: newLocations };
                } else {
                    // Metadata update (label, category, description)
                    newStructures[structureIndex] = { ...structure, ...updates };

                    // If updating description or descriptionEn, sync with other structures having the same label
                    if ((updates.description !== undefined || updates.descriptionEn !== undefined || updates.labelEn !== undefined) && structure.label) {
                        seriesStructures.forEach((s, idx) => {
                            if (idx !== structureIndex && s.label === structure.label) {
                                const newProps = {};
                                if (updates.description !== undefined) newProps.description = updates.description;
                                if (updates.descriptionEn !== undefined) newProps.descriptionEn = updates.descriptionEn;
                                if (updates.labelEn !== undefined) newProps.labelEn = updates.labelEn;

                                newStructures[idx] = { ...newStructures[idx], ...newProps };
                            }
                        });
                    }
                }

                onUpdate({ structures: newStructures });
            } else {
                // Update legacy annotation
                const updatedImages = series.images.map((img, index) => {
                    if (index !== currentImageIndex) return img;
                    return {
                        ...img,
                        annotations: (img.annotations || []).map(ann =>
                            ann.id === id ? { ...ann, ...updates } : ann
                        )
                    };
                });
                onUpdate({ images: updatedImages });
            }
        } catch (error) {
            console.error("CRITICAL: Error updating annotation:", error);
            // Don't throw, just log to prevent app crash
        }
    };

    const handleDeleteAnnotation = (id) => {
        const structureIndex = seriesStructures.findIndex(s => s.id === id);
        if (structureIndex >= 0) {
            // Remove location from current slice ONLY? Or delete structure entirely?
            // "Me gustaría que al agregar una estructura en una serie, esta quede disponible en toda la serie"
            // Usually deleting means removing from this slice. To delete from series, maybe a specific action.
            // Let's implement: Remove from slice.
            const newStructures = [...seriesStructures];
            const structure = { ...newStructures[structureIndex] };
            const newLocations = { ...structure.locations };
            delete newLocations[currentImageIndex];

            // If no locations left, maybe remove structure? Or keep as "unused"? Keep as unused for now.
            structure.locations = newLocations;
            newStructures[structureIndex] = structure;

            onUpdate({ structures: newStructures });
        } else {
            const updatedImages = series.images.map((img, index) => {
                if (index !== currentImageIndex) return img;
                return {
                    ...img,
                    annotations: (img.annotations || []).filter(ann => ann.id !== id)
                };
            });
            onUpdate({ images: updatedImages });
        }
        if (selectedAnnotationId === id) setSelectedAnnotationId(null);
    };

    const handleDeleteSeriesStructure = (id) => {
        if (!window.confirm(t('¿Estás seguro de que quieres eliminar esta estructura de TODA la serie? Esta acción no se puede deshacer.'))) return;

        const structureIndex = seriesStructures.findIndex(s => s.id === id);
        if (structureIndex >= 0) {
            const newStructures = seriesStructures.filter((_, index) => index !== structureIndex);
            onUpdate({ structures: newStructures });
            if (selectedAnnotationId === id) setSelectedAnnotationId(null);
        }
    };

    const handleDeleteForward = (id) => {
        if (!window.confirm(t('¿Eliminar esta estructura de la imagen actual y TODAS las siguientes?'))) return;

        const structureIndex = seriesStructures.findIndex(s => s.id === id);
        if (structureIndex >= 0) {
            const newStructures = [...seriesStructures];
            const structure = { ...newStructures[structureIndex] };
            const newLocations = { ...structure.locations };

            // Delete from current index + forward
            const totalImages = series.images.length;
            for (let i = currentImageIndex; i < totalImages; i++) {
                delete newLocations[i];
            }

            structure.locations = newLocations;
            newStructures[structureIndex] = structure;

            onUpdate({ structures: newStructures });
            if (selectedAnnotationId === id) setSelectedAnnotationId(null);
        }
    }

    // Drag Handlers
    const handleDragStart = (e, id, pointIndex = null) => {
        e.stopPropagation();
        // e.preventDefault(); // Removed to allow click/dblclick events
        setDragging({ id, pointIndex });
        setSelectedAnnotationId(id);
    };

    const handleDragMove = (e) => {
        if (!dragging || !currentImage) return;

        const container = containerRef.current;
        if (!container) return;

        const rect = container.getBoundingClientRect();

        // Calculate new coordinates (0-1 range)
        const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));

        const structureIndex = seriesStructures.findIndex(s => s.id === dragging.id);
        const structure = seriesStructures[structureIndex];
        const legacyIndex = (currentImage.annotations || []).findIndex(a => a.id === dragging.id);

        if (structure && structure.locations && structure.locations[currentImageIndex]) {
            // Update Series Structure
            const currentLocation = { ...structure.locations[currentImageIndex] };

            if (dragging.pointIndex !== null && structure.type === 'polygon') {
                // Moving Vertex
                const newPoints = [...currentLocation.points];
                newPoints[dragging.pointIndex] = { x, y };
                handleAnnotationUpdate(dragging.id, { points: newPoints, _forceCurrent: e.shiftKey });
            } else if (structure.type === 'point') {
                // Moving Point
                handleAnnotationUpdate(dragging.id, { x, y, _forceCurrent: e.shiftKey });
            }
        } else if (legacyIndex >= 0) {
            // Update Legacy Annotation
            const ann = currentImage.annotations[legacyIndex];
            if (dragging.pointIndex !== null && ann.type === 'polygon') {
                // Safety for legacy polygons
            } else {
                handleAnnotationUpdate(dragging.id, { x, y });
            }
        }
    };

    const handleDragEnd = () => {
        setDragging(null);
    };

    // Global listeners for drag
    useEffect(() => {
        if (dragging) {
            window.addEventListener('mousemove', handleDragMove);
            window.addEventListener('mouseup', handleDragEnd);
        }
        return () => {
            window.removeEventListener('mousemove', handleDragMove);
            window.removeEventListener('mouseup', handleDragEnd);
        };
    }, [dragging, currentImage, seriesStructures]);

    const toggleTransform = (type) => {
        setTransform(prev => {
            const newTransform = { ...prev };
            if (type === 'rotate') newTransform.rotate = (prev.rotate + 90) % 360;
            if (type === 'flipH') newTransform.flipH = !prev.flipH;
            return newTransform;
        });
    };

    // Preload images
    useEffect(() => {
        if (series?.images) {
            series.images.forEach(img => {
                const image = new Image();
                image.src = img.previewUrl || img.url;
            });
        }
    }, [series]);
    const addSeriesStructure = (type, data) => {
        const newId = Date.now().toString();

        // Determine range of images to populate
        const locations = {};
        // Ensure currentImageIndex is a number to prevent string concatenation (e.g., "5" + 10 = "510")
        const currentIndex = Number(currentImageIndex);
        let startIndex = currentIndex;
        let endIndex = series.images.length; // Exclusive

        if (propagationRange === 'current') {
            endIndex = currentIndex + 1;
        } else if (propagationRange === '10') {
            endIndex = Math.min(series.images.length, currentIndex + 10);
        } else if (propagationRange === '20') {
            endIndex = Math.min(series.images.length, currentIndex + 20);
        }

        const loopStart = (propagationRange === 'all') ? 0 : startIndex;

        for (let i = loopStart; i < endIndex; i++) {
            locations[i] = JSON.parse(JSON.stringify(data));
        }

        const newStructure = {
            id: newId,
            label: type === 'polygon' ? 'Músculo/Región' : 'Estructura',
            category: selectedCategory,
            type: type,
            color: ANATOMY_CATEGORIES.find(c => c.id === selectedCategory)?.color || '#ffffff',
            locations: locations
        };

        onUpdate({
            structures: [...(series.structures || []), newStructure]
        });
        setSelectedAnnotationId(newId);
    };

    const handleReverseSeries = () => {
        if (!window.confirm('¿Invertir el orden de toda la serie? Las anotaciones se ajustarán automáticamente.')) return;

        const totalImages = series.images.length;

        // 1. Reverse Images
        const reversedImages = [...series.images].reverse();

        // 2. Remap Structure Locations
        // Old Index 0 -> New Index (Total-1)
        // Old Index i -> New Index (Total-1-i)
        const remappedStructures = (series.structures || []).map(structure => {
            const newLocations = {};
            if (structure.locations) {
                Object.entries(structure.locations).forEach(([indexStr, data]) => {
                    const oldIndex = parseInt(indexStr);
                    const newIndex = (totalImages - 1) - oldIndex;
                    if (newIndex >= 0 && newIndex < totalImages) {
                        newLocations[newIndex] = data;
                    }
                });
            }
            return { ...structure, locations: newLocations };
        });

        // 3. Update State
        onUpdate({
            images: reversedImages,
            structures: remappedStructures
        });

        // Adjust current index to stay approximately relative or reset?
        // Let's invert current index too so user stays looking at the "same" visual geometric slice (though it's now inverted order)
        setCurrentImageIndex((totalImages - 1) - currentImageIndex);
    };

    const handleCanvasClick = (e) => {
        if (!currentImage || isPanning) return; // Ignore click if panning

        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.nativeEvent.offsetX / rect.width;
        const y = e.nativeEvent.offsetY / rect.height;

        if (selectedTool === 'point') {
            addSeriesStructure('point', { x, y });
            setSelectedTool('select');
        } else if (selectedTool === 'line') {
            if (!drawingLine) {
                setDrawingLine({ startX: x, startY: y });
            } else {
                addSeriesStructure('line', {
                    startX: drawingLine.startX,
                    startY: drawingLine.startY,
                    endX: x,
                    endY: y
                });
                setDrawingLine(null);
                setSelectedTool('select');
            }
        } else if (selectedTool === 'polygon') {
            // Add point to polygon
            const newPoint = { x, y };

            // Check if closing polygon (near first point)
            if (currentPolygonPoints.length > 2) {
                const startPoint = currentPolygonPoints[0];
                const distance = Math.sqrt(Math.pow(x - startPoint.x, 2) + Math.pow(y - startPoint.y, 2));
                // 3% threshold for closing
                if (distance < 0.03) {
                    addSeriesStructure('polygon', { points: currentPolygonPoints });
                    setCurrentPolygonPoints([]);
                    setSelectedTool('select');
                    return;
                }
            }
            setCurrentPolygonPoints([...currentPolygonPoints, newPoint]);
        } else if (selectedTool === 'select' || selectedTool === 'pan') {
            // Only deselect if not clicking an annotation (handled by stopPropagation in annotation)
            setSelectedAnnotationId(null);
        }
    };

    // Zoom Logic
    const applyZoom = (delta) => {
        setViewport(prev => ({
            ...prev,
            zoom: Math.max(0.5, Math.min(5, prev.zoom + delta))
        }));
    };

    const resetView = () => {
        setViewport({ zoom: 1, x: 0, y: 0 });
        setTransform({ rotate: 0, flipH: false });
    };

    // Native Wheel Listener for Non-Passive Event (Prevents Browser Scroll)
    useEffect(() => {
        const el = wrapperRef.current;
        if (!el) return;

        const onWheel = (e) => {
            e.preventDefault(); // This now works guaranteed because of passive: false

            const delta = Math.sign(e.deltaY);

            if (delta > 0) {
                setCurrentImageIndex(p => Math.min(series.images.length - 1, p + 1));
            } else if (delta < 0) {
                setCurrentImageIndex(p => Math.max(0, p - 1));
            }
        };

        el.addEventListener('wheel', onWheel, { passive: false });

        return () => {
            el.removeEventListener('wheel', onWheel);
        };
    }, [series.images.length, setCurrentImageIndex]); // Re-bind if series changes, added setCurrentImageIndex to deps

    // Pan Handlers
    const lastPanRef = useRef({ x: 0, y: 0 });

    const handlePanStart = (e) => {
        if (selectedTool !== 'pan' && !e.buttons === 4) return; // Pan tool or Middle click
        // Or if holding space (implemented via keyboard listener later maybe, stick to tool for now)
        setIsPanning(true);
        lastPanRef.current = { x: e.clientX, y: e.clientY };
    };

    const handlePanMove = (e) => {
        if (!isPanning) return;
        const dx = e.clientX - lastPanRef.current.x;
        const dy = e.clientY - lastPanRef.current.y;
        lastPanRef.current = { x: e.clientX, y: e.clientY };

        setViewport(prev => ({
            ...prev,
            x: prev.x + dx,
            y: prev.y + dy
        }));
    };

    const handlePanEnd = () => {
        setIsPanning(false);
    };

    // Global Pan Listeners
    useEffect(() => {
        if (isPanning) {
            window.addEventListener('mousemove', handlePanMove);
            window.addEventListener('mouseup', handlePanEnd);
        }
        return () => {
            window.removeEventListener('mousemove', handlePanMove);
            window.removeEventListener('mouseup', handlePanEnd);
        };
    }, [isPanning]);


    if (!currentImage) return <div className="text-center p-10 text-gray-500">No hay imágenes en esta serie</div>;

    return (
        <div className="flex flex-col h-[700px] border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-gray-900">
            {/* Top Toolbar */}
            <div className="bg-gray-800 p-2 border-b border-gray-700 flex items-center justify-between">
                <div className="flex space-x-2">
                    <button
                        onClick={() => setSelectedTool('select')}
                        className={`p-2 rounded ${selectedTool === 'select' ? 'bg-indigo-900 text-indigo-300' : 'text-gray-400 hover:bg-gray-700'}`}
                        title="Seleccionar (V)"
                    >
                        <MousePointer className="w-5 h-5" />
                    </button>
                    <button
                        onClick={() => setSelectedTool('pan')}
                        className={`p-2 rounded ${selectedTool === 'pan' ? 'bg-indigo-900 text-indigo-300' : 'text-gray-400 hover:bg-gray-700'}`}
                        title="Mover Vista (H)"
                    >
                        <Hand className="w-5 h-5" />
                    </button>
                    <div className="w-px h-6 bg-gray-700 mx-2" />
                    <button
                        onClick={() => setSelectedTool('point')}
                        className={`p-2 rounded ${selectedTool === 'point' ? 'bg-indigo-900 text-indigo-300' : 'text-gray-400 hover:bg-gray-700'}`}
                        title="Añadir Punto"
                    >
                        <CircleDot className="w-5 h-5" />
                    </button>
                    <button
                        onClick={() => setSelectedTool('line')}
                        className={`p-2 rounded ${selectedTool === 'line' ? 'bg-indigo-900 text-indigo-300' : 'text-gray-400 hover:bg-gray-700'}`}
                        title="Añadir Flecha"
                    >
                        <ArrowUpRight className="w-5 h-5" />
                    </button>
                    <button
                        onClick={() => setSelectedTool('polygon')}
                        className={`p-2 rounded ${selectedTool === 'polygon' ? 'bg-indigo-900 text-indigo-300' : 'text-gray-400 hover:bg-gray-700'}`}
                        title="Añadir Polígono/Región"
                    >
                        <Hexagon className="w-5 h-5" />
                    </button>
                    <div className="w-px h-6 bg-gray-700 mx-2" />
                    {/* Zoom and Transform Controls */}
                    <div className="flex items-center space-x-1">
                        <button onClick={() => applyZoom(-0.2)} className="p-2 rounded text-gray-400 hover:bg-gray-700" title="Alejar">
                            <ZoomOut className="w-5 h-5" />
                        </button>
                        <span className="text-xs text-gray-500 w-10 text-center">{Math.round(viewport.zoom * 100)}%</span>
                        <button onClick={() => applyZoom(0.2)} className="p-2 rounded text-gray-400 hover:bg-gray-700" title="Acercar">
                            <ZoomIn className="w-5 h-5" />
                        </button>
                        <button onClick={resetView} className="p-2 rounded text-gray-400 hover:bg-gray-700" title="Restablecer Vista">
                            <Maximize className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="w-px h-6 bg-gray-700 mx-2" />
                    <button
                        onClick={() => toggleTransform('rotate')}
                        className="p-2 rounded text-gray-400 hover:bg-gray-700"
                        title="Rotar 90°"
                    >
                        <RotateCw className="w-5 h-5" />
                    </button>
                    <button
                        onClick={() => toggleTransform('flipH')}
                        className="p-2 rounded text-gray-400 hover:bg-gray-700"
                        title="Voltear Horizontalmente"
                    >
                        <FlipHorizontal className="w-5 h-5" />
                    </button>
                    <div className="w-px h-6 bg-gray-700 mx-2" />
                    <button
                        onClick={handleReverseSeries}
                        className="p-2 rounded text-indigo-400 hover:bg-gray-700 font-bold"
                        title="Invertir Orden de Serie"
                    >
                        <ArrowUpDown className="w-5 h-5" />
                    </button>
                    <div className="w-px h-6 bg-gray-700 mx-2" />

                    <button
                        onClick={() => {
                            if (window.confirm('¿Eliminar esta imagen de la serie?')) {
                                const newImages = series.images.filter((_, i) => i !== currentImageIndex);
                                onUpdate({ images: newImages });
                            }
                        }}
                        className="p-2 rounded text-red-400 hover:bg-red-900/30"
                        title="Eliminar Imagen Actual"
                    >
                        <Trash2 className="w-5 h-5" />
                    </button>
                </div>

                <div className="bg-gray-800 p-2 border-b border-gray-700 flex items-center justify-between">
                    <div className="flex space-x-2">

                        <div className="flex items-center space-x-4">
                            <div className="flex items-center space-x-2">
                                <span className="text-sm text-gray-400">Categoría:</span>
                                <select
                                    value={selectedCategory}
                                    onChange={(e) => setSelectedCategory(e.target.value)}
                                    className="text-sm bg-gray-700 border-gray-600 text-white rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                >
                                    {ANATOMY_CATEGORIES.map(cat => (
                                        <option key={cat.id} value={cat.id}>{cat.label}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="w-px h-6 bg-gray-600 mx-2" />

                            <div className="flex items-center space-x-2">
                                <span className="text-sm text-gray-400">Propagación:</span>
                                <select
                                    value={propagationRange}
                                    onChange={(e) => setPropagationRange(e.target.value)}
                                    className="text-sm bg-gray-700 border-gray-600 text-white rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                    title="En cuántas imágenes se replicará la estructura creada"
                                >
                                    <option value="current">Solo Actual</option>
                                    <option value="10">Siguientes 10</option>
                                    <option value="20">Siguientes 20</option>
                                    <option value="all">Toda la Serie</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex flex-1 overflow-hidden">
                {/* Main Canvas Area */}
                <div className="flex-1 flex flex-col relative bg-black">
                    <div ref={wrapperRef} className="flex-1 relative overflow-hidden flex items-center justify-center" onMouseDown={handlePanStart} style={{ cursor: selectedTool === 'pan' || isPanning ? 'grab' : 'default' }}>
                        <div
                            ref={containerRef}
                            className="relative shadow-2xl origin-center will-change-transform" // Added origin-center and will-change
                            style={{
                                transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom}) rotate(${transform.rotate}deg) scaleX(${transform.flipH ? -1 : 1})`,
                                transition: isPanning ? 'none' : 'transform 0.1s ease-out' // Remove transition during pan for performance
                            }}
                        >
                            {/* Stack Rendering for smooth scroll */}
                            {series.images.map((img, index) => (
                                <img
                                    key={img.id || index}
                                    ref={index === currentImageIndex ? imageRef : null} // Only ref the active one for coordinates
                                    src={img.previewUrl || img.url}
                                    alt={`Anatomy slice ${index + 1}`}
                                    className="max-w-full max-h-[550px] object-contain select-none pointer-events-none"
                                    style={{
                                        display: index === currentImageIndex ? 'block' : 'none'
                                    }}
                                />
                            ))}

                            {/* Annotations Overlay */}
                            <div
                                className={`absolute inset-0 ${selectedTool !== 'select' && selectedTool !== 'pan' ? 'cursor-crosshair' : ''}`}
                                onClick={handleCanvasClick}
                            >
                                {/* Slice Indicator */}
                                {series.images.length > 1 && (
                                    <div className="absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded pointer-events-none z-20 font-mono border border-white/20">
                                        Img: {currentImageIndex + 1} / {series.images.length}
                                    </div>
                                )}
                                {annotations.map(ann => {
                                    const category = ANATOMY_CATEGORIES.find(c => c.id === ann.category);
                                    const isSelected = selectedAnnotationId === ann.id;
                                    const color = category?.color || '#ffffff';

                                    if (ann.type === 'line') {
                                        // Calculate length and angle for line rendering if needed, but SVG is easier
                                        return (
                                            <svg key={ann.id} className="absolute inset-0 w-full h-full pointer-events-none">
                                                <defs>
                                                    <marker
                                                        id={`arrowhead-${ann.id}`}
                                                        markerWidth="12"
                                                        markerHeight="12"
                                                        refX="10"
                                                        refY="6"
                                                        orient="auto"
                                                        markerUnits="userSpaceOnUse"
                                                    >
                                                        <polygon points="0 0, 12 6, 0 12" fill={color} />
                                                    </marker>
                                                </defs>
                                                <line
                                                    x1={`${ann.startX * 100}%`}
                                                    y1={`${ann.startY * 100}%`}
                                                    x2={`${ann.endX * 100}%`}
                                                    y2={`${ann.endY * 100}%`}
                                                    stroke={color}
                                                    strokeWidth={isSelected ? "4" : "2"}
                                                    markerEnd={`url(#arrowhead-${ann.id})`}
                                                    className="pointer-events-auto cursor-pointer transition-all hover:filter hover:brightness-150"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setSelectedAnnotationId(ann.id);
                                                        setSelectedTool('select');
                                                    }}
                                                />
                                                {/* Start point only */}
                                                <circle cx={`${ann.startX * 100}%`} cy={`${ann.startY * 100}%`} r="0.3" fill={color} />
                                            </svg>
                                        );
                                    }

                                    if (ann.type === 'polygon') {
                                        const points = ann.points.map(p => `${p.x * 100},${p.y * 100}`).join(' ');
                                        return (
                                            <svg
                                                key={ann.id}
                                                className="absolute inset-0 w-full h-full pointer-events-none"
                                                viewBox="0 0 100 100"
                                                preserveAspectRatio="none"
                                            >
                                                {/* Hit Area Path (Captures all events on polygon) */}
                                                <path
                                                    d={getSmoothPath(ann.points)}
                                                    fill="white"
                                                    fillOpacity="0"
                                                    stroke="white"
                                                    strokeOpacity="0"
                                                    strokeWidth="10" // Generous hit capability on edge
                                                    vectorEffect="non-scaling-stroke"
                                                    className="pointer-events-auto cursor-pointer"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        // Always select if clicked
                                                        if (!isSelected) {
                                                            setSelectedAnnotationId(ann.id);
                                                            setSelectedTool('select');
                                                            return;
                                                        }

                                                        if (selectedTool === 'select') {
                                                            const svg = e.target.ownerSVGElement;
                                                            let pt = svg.createSVGPoint();
                                                            pt.x = e.clientX;
                                                            pt.y = e.clientY;

                                                            // Transform screen point to SVG local coordinates
                                                            const loc = pt.matrixTransform(svg.getScreenCTM().inverse());

                                                            // Normalize (0-100 -> 0-1)
                                                            const clickX = loc.x / 100;
                                                            const clickY = loc.y / 100;

                                                            const { index: insertIndex, distance } = calculateInsertIndex({ x: clickX, y: clickY }, ann.points);

                                                            // Threshold: 1.5% of canvas width (adjust as needed)
                                                            // Since strokeWidth=10 with non-scaling-stroke is ~10px, 
                                                            // and 0.015 usually maps to ~7-10px depending on screen size/zoom.
                                                            // Let's use a dynamic check: if distance is small enough, add point.
                                                            if (distance < 0.02) {
                                                                const newPoints = [...ann.points];
                                                                newPoints.splice(insertIndex, 0, { x: clickX, y: clickY });

                                                                handleAnnotationUpdate(ann.id, { points: newPoints, _forceCurrent: e.shiftKey });
                                                            }
                                                            // If distance is large, we just "selected" it (handled above or implicit no-op)
                                                        }
                                                    }}
                                                />
                                                {/* Visible Path */}
                                                <path
                                                    d={getSmoothPath(ann.points)}
                                                    fill={color}
                                                    fillOpacity={isSelected ? 0.75 : 0.55}
                                                    stroke={color}
                                                    strokeWidth="0.5"
                                                    vectorEffect="non-scaling-stroke"
                                                    className="pointer-events-none transition-all" // Events handled by hit path
                                                />
                                                {/* Vertices for Editing (only when selected) */}
                                                {isSelected && ann.points.map((p, idx) => (
                                                    <circle
                                                        key={idx}
                                                        cx={p.x * 100}
                                                        cy={p.y * 100}
                                                        r="0.4"
                                                        fill="white"
                                                        stroke={color}
                                                        strokeWidth="0.1"
                                                        vectorEffect="non-scaling-stroke"
                                                        className="pointer-events-auto cursor-move transition-all hover:r-0.6"
                                                        onMouseDown={(e) => {
                                                            e.stopPropagation();
                                                            // If Alt key pressed, skip drag to allow click for delete
                                                            if (e.altKey || e.metaKey) return;
                                                            handleDragStart(e, ann.id, idx);
                                                        }}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            // Alt + Click to Delete
                                                            if ((e.altKey || e.metaKey) && ann.points.length > 3) {
                                                                const newPoints = ann.points.filter((_, i) => i !== idx);
                                                                handleAnnotationUpdate(ann.id, { points: newPoints, _forceCurrent: e.shiftKey });
                                                            }
                                                        }}
                                                        onDoubleClick={(e) => {
                                                            e.stopPropagation();
                                                            if (ann.points.length > 3) {
                                                                const newPoints = ann.points.filter((_, i) => i !== idx);
                                                                handleAnnotationUpdate(ann.id, { points: newPoints, _forceCurrent: e.shiftKey });
                                                            }
                                                        }}
                                                    />
                                                ))}
                                            </svg>
                                        );
                                    }

                                    return (
                                        <div
                                            key={ann.id}
                                            className={`absolute w-2.5 h-2.5 -ml-1.25 -mt-1.25 rounded-full border cursor-pointer transition-transform hover:scale-125 ${isSelected ? 'ring-2 ring-white z-10' : 'z-0'}`}
                                            style={{
                                                left: `${ann.x * 100}%`,
                                                top: `${ann.y * 100}%`,
                                                backgroundColor: color + '4D', // 30% opacity
                                                borderColor: 'white'
                                            }}
                                            onMouseDown={(e) => handleDragStart(e, ann.id)}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedAnnotationId(ann.id);
                                                setSelectedTool('select');
                                            }}
                                        />
                                    );
                                })}

                                {/* Drawing Line Preview */}
                                {drawingLine && (
                                    <div className="absolute w-3 h-3 bg-white rounded-full opacity-50 pointer-events-none"
                                        style={{ left: `calc(${drawingLine.startX * 100}% - 6px)`, top: `calc(${drawingLine.startY * 100}% - 6px)` }}
                                    />
                                )}

                                {/* Drawing Polygon Preview */}
                                {currentPolygonPoints.length > 0 && (
                                    <svg
                                        className="absolute inset-0 w-full h-full pointer-events-none"
                                        viewBox="0 0 100 100"
                                        preserveAspectRatio="none"
                                    >
                                        <polyline
                                            points={currentPolygonPoints.map(p => `${p.x * 100},${p.y * 100}`).join(' ')}
                                            fill="none"
                                            stroke="white"
                                            strokeWidth="0.5"
                                            strokeDasharray="1"
                                            vectorEffect="non-scaling-stroke"
                                        />
                                        {currentPolygonPoints.map((p, idx) => (
                                            <circle
                                                key={idx}
                                                cx={`${p.x * 100}%`}
                                                cy={`${p.y * 100}%`}
                                                r="0.4"
                                                fill="white"
                                            />
                                        ))}
                                        {/* Closing hint if > 2 points */}
                                        {currentPolygonPoints.length > 2 && (
                                            <circle
                                                cx={`${currentPolygonPoints[0].x * 100}%`}
                                                cy={`${currentPolygonPoints[0].y * 100}%`}
                                                r="1.5"
                                                fill="transparent"
                                                stroke="yellow"
                                                strokeWidth="2"
                                                className="animate-pulse"
                                            />
                                        )}
                                    </svg>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Slice Navigation (Bottom) */}
                    {series.images.length > 1 && (
                        <div className="h-16 bg-gray-800 border-t border-gray-700 flex items-center px-4 space-x-4">
                            <button
                                onClick={() => setCurrentImageIndex(prev => Math.max(0, prev - 1))}
                                disabled={currentImageIndex === 0}
                                className="p-1 rounded-full hover:bg-gray-700 disabled:opacity-50 text-white"
                            >
                                <ChevronLeft className="w-6 h-6" />
                            </button>

                            <div className="flex-1 flex items-center space-x-2">
                                <span className="text-xs text-gray-400 w-12 text-right">{currentImageIndex + 1}</span>
                                <input
                                    type="range"
                                    min="0"
                                    max={series.images.length - 1}
                                    value={currentImageIndex}
                                    onChange={(e) => setCurrentImageIndex(parseInt(e.target.value))}
                                    className="flex-1 h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                                />
                                <span className="text-xs text-gray-400 w-12">{series.images.length}</span>
                            </div>

                            <button
                                onClick={() => setCurrentImageIndex(prev => Math.min(series.images.length - 1, prev + 1))}
                                disabled={currentImageIndex === series.images.length - 1}
                                className="p-1 rounded-full hover:bg-gray-700 disabled:opacity-50 text-white"
                            >
                                <ChevronRight className="w-6 h-6" />
                            </button>
                        </div>
                    )}
                </div>

                {/* Sidebar Properties */}
                <div className="w-72 bg-gray-800 border-l border-gray-700 flex flex-col">
                    <div className="p-4 border-b border-gray-700">
                        <div className="flex justify-between items-center">
                            <h3 className="text-white font-medium flex items-center">
                                <Layers className="w-5 h-5 mr-2 text-indigo-400" />
                                {t('anatomy.editor.structures')}
                            </h3>
                            <button
                                onClick={() => setShowManagement(!showManagement)}
                                className={`p-1.5 rounded-md hover:bg-gray-700 transition-colors ${showManagement ? 'bg-gray-700 text-white' : 'text-gray-400'}`}
                                title="Gestionar Estructuras"
                            >
                                <Settings className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Management Menu */}
                        {showManagement && (
                            <div className="mt-3 p-3 bg-gray-900 rounded-md border border-gray-600 space-y-3 animate-in slide-in-from-top-2 duration-200">
                                <p className="text-xs font-medium text-gray-400 uppercase">Borrado Masivo</p>
                                <select
                                    className="w-full text-xs rounded bg-gray-800 border-gray-600 text-white focus:border-red-500 focus:ring-red-500"
                                    onChange={(e) => {
                                        if (e.target.value) {
                                            handleClearAnnotations(e.target.value);
                                            e.target.value = "";
                                        }
                                    }}
                                    defaultValue=""
                                >
                                    <option value="" disabled>Borrar por categoría...</option>
                                    {ANATOMY_CATEGORIES.map(cat => (
                                        <option key={cat.id} value={cat.id}>{cat.label}</option>
                                    ))}
                                </select>
                                <button
                                    onClick={() => handleClearAnnotations('all')}
                                    className="w-full flex items-center justify-center px-2 py-1.5 bg-red-900/40 text-red-400 rounded hover:bg-red-900/60 transition-colors text-xs font-medium border border-red-900/50"
                                >
                                    <Trash2 className="w-3 h-3 mr-1.5" />
                                    Borrar Todo
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {selectedAnnotationId ? (
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-medium text-gray-400 mb-1">
                                        Etiqueta (ES) / Label (EN)
                                    </label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <input
                                            type="text"
                                            placeholder="Español"
                                            value={annotations.find(a => a.id === selectedAnnotationId)?.label || ''}
                                            onChange={(e) => handleAnnotationUpdate(selectedAnnotationId, { label: e.target.value })}
                                            className="w-full text-sm rounded-md bg-gray-700 border-gray-600 text-white focus:border-indigo-500 focus:ring-indigo-500"
                                        />
                                        <input
                                            type="text"
                                            placeholder="English"
                                            value={annotations.find(a => a.id === selectedAnnotationId)?.labelEn || ''}
                                            onChange={(e) => handleAnnotationUpdate(selectedAnnotationId, { labelEn: e.target.value })}
                                            className="w-full text-sm rounded-md bg-gray-700 border-gray-600 text-white focus:border-indigo-500 focus:ring-indigo-500"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-400 mb-1">
                                        {t('anatomy.editor.category')}
                                    </label>
                                    <select
                                        value={annotations.find(a => a.id === selectedAnnotationId)?.category || 'bones'}
                                        onChange={(e) => handleAnnotationUpdate(selectedAnnotationId, { category: e.target.value })}
                                        className="w-full text-sm rounded-md bg-gray-700 border-gray-600 text-white focus:border-indigo-500 focus:ring-indigo-500"
                                    >
                                        {ANATOMY_CATEGORIES.map(cat => (
                                            <option key={cat.id} value={cat.id}>{cat.label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <div className="flex justify-between items-center mb-1">
                                        <label className="block text-xs font-medium text-gray-400">
                                            Descripción (ES) / Description (EN)
                                        </label>
                                        <button
                                            onClick={async () => {
                                                const ann = annotations.find(a => a.id === selectedAnnotationId);
                                                if (!ann) return;

                                                // 1. Translate Description
                                                if (ann.description) {
                                                    setIsTranslating(true);
                                                    try {
                                                        const translateText = httpsCallable(functions, 'translateText');
                                                        const result = await translateText({ text: ann.description, target: 'en' });
                                                        handleAnnotationUpdate(selectedAnnotationId, { descriptionEn: result.data.translation });
                                                    } catch (error) {
                                                        console.error("Translation failed:", error);
                                                        alert("Error al traducir. Verifica tu conexión.");
                                                    } finally {
                                                        setIsTranslating(false);
                                                    }
                                                }

                                                // 2. Translate Label (if simple copy needed or if we want to translate structure names too)
                                                // For now, let's keep the user behavior of just copying/translating user text.
                                                // Most medical terms might be standard, but auto-translation helps.
                                                if (ann.label && !ann.labelEn) {
                                                    // Optional: Also translate label if empty
                                                    // handleAnnotationUpdate(selectedAnnotationId, { labelEn: ann.label }); 
                                                }
                                            }}
                                            disabled={isTranslating}
                                            className={`text-xs flex items-center ${isTranslating ? 'text-gray-500 cursor-wait' : 'text-indigo-400 hover:text-indigo-300'}`}
                                            title="Traducir descripción con Google Cloud AI"
                                        >
                                            {isTranslating ? (
                                                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                            ) : (
                                                <Languages className="w-3 h-3 mr-1" />
                                            )}
                                            {isTranslating ? 'Traduciendo...' : 'Auto-Traducir'}
                                        </button>
                                    </div>
                                    <div className="space-y-2">
                                        <textarea
                                            rows={3}
                                            placeholder="Descripción en Español..."
                                            value={annotations.find(a => a.id === selectedAnnotationId)?.description || ''}
                                            onChange={(e) => handleAnnotationUpdate(selectedAnnotationId, { description: e.target.value })}
                                            className="w-full text-sm rounded-md bg-gray-700 border-gray-600 text-white focus:border-indigo-500 focus:ring-indigo-500"
                                        />
                                        <textarea
                                            rows={3}
                                            placeholder="Description in English..."
                                            value={annotations.find(a => a.id === selectedAnnotationId)?.descriptionEn || ''}
                                            onChange={(e) => handleAnnotationUpdate(selectedAnnotationId, { descriptionEn: e.target.value })}
                                            className="w-full text-sm rounded-md bg-gray-700 border-gray-600 text-white focus:border-indigo-500 focus:ring-indigo-500"
                                        />
                                    </div>
                                </div>
                                <div className="pt-4 border-t border-gray-700 mt-4 space-y-2">
                                    <button
                                        onClick={() => handleDeleteAnnotation(selectedAnnotationId)}
                                        className="w-full py-2 px-4 bg-red-900/30 text-red-400 rounded-md hover:bg-red-900/50 flex items-center justify-center transition-colors"
                                    >
                                        <Trash2 className="w-4 h-4 mr-2" />
                                        Eliminar de esta imagen
                                    </button>

                                    {/* Delete Forward Button */}
                                    {seriesStructures.some(s => s.id === selectedAnnotationId) && (
                                        <button
                                            onClick={() => handleDeleteForward(selectedAnnotationId)}
                                            className="w-full py-2 px-4 bg-orange-900/30 text-orange-400 rounded-md hover:bg-orange-900/50 flex items-center justify-center transition-colors border border-orange-900/30"
                                            title="Eliminar de esta imagen y todas las siguientes"
                                        >
                                            <FastForward className="w-4 h-4 mr-2" />
                                            Eliminar Adelante (⏩)
                                        </button>
                                    )}

                                    {/* Show 'Delete from Series' only if it's a series structure */}
                                    {seriesStructures.some(s => s.id === selectedAnnotationId) && (
                                        <button
                                            onClick={() => handleDeleteSeriesStructure(selectedAnnotationId)}
                                            className="w-full py-2 px-4 bg-red-700 text-white rounded-md hover:bg-red-600 flex items-center justify-center transition-colors shadow-sm"
                                            title="Eliminar de todas las imágenes de la serie"
                                        >
                                            <Trash2 className="w-4 h-4 mr-2" />
                                            Eliminar de TODA la serie
                                        </button>
                                    )}
                                    <button
                                        onClick={() => setSelectedAnnotationId(null)}
                                        className="w-full py-1 text-sm text-gray-400 hover:text-white mt-2"
                                    >
                                        {t('anatomy.editor.close')}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                <p className="text-xs text-gray-500 uppercase font-semibold mb-2">Anotaciones en este corte</p>
                                {annotations.length === 0 ? (
                                    <p className="text-sm text-gray-500 text-center py-4">
                                        No hay anotaciones.
                                    </p>
                                ) : (
                                    annotations.map(ann => {
                                        const CategoryIcon = ANATOMY_CATEGORIES.find(c => c.id === ann.category)?.icon || Circle;
                                        return (
                                            <div
                                                key={ann.id}
                                                onClick={() => setSelectedAnnotationId(ann.id)}
                                                className="flex items-center p-2 rounded hover:bg-gray-700 cursor-pointer group"
                                            >
                                                <CategoryIcon className="w-4 h-4 mr-2 text-gray-400 group-hover:text-white" />
                                                <span className="text-sm text-gray-300 group-hover:text-white truncate flex-1">
                                                    {ann.label}
                                                </span>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AnatomyEditor;
