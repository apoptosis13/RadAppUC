import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
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
    Loader2,
    Settings,
    FastForward,
    ArrowUpDown,
    ZoomIn,
    ZoomOut,
    Maximize,
    Hand,
    Globe
} from 'lucide-react';
import { getSmoothPath } from '../../../utils/svgUtils';
import { ANATOMY_CATEGORIES } from '../../../utils/anatomyConstants';
import { translateAnatomyTerm } from '../../../utils/anatomyTranslations';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../../../config/firebase';

const AnatomyEditor = ({ series, onUpdate }) => {
    const { t } = useTranslation();
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [selectedTool, setSelectedTool] = useState('select'); // select, point, line, polygon, pan
    const [selectedCategory, setSelectedCategory] = useState('bones');
    const [propagationRange, setPropagationRange] = useState('all'); // 'current', '10', '20', 'all'
    const [adjustments, setAdjustments] = useState({ rotate: 0, flipH: false, brightness: 100, contrast: 100 });
    const [viewport, setViewport] = useState({ cx: null, cy: null, scale: 1 });
    const [selectedAnnotationId, setSelectedAnnotationId] = useState(null);
    const [drawingLine, setDrawingLine] = useState(null); // { startX, startY }
    const [currentPolygonPoints, setCurrentPolygonPoints] = useState([]); // Array of {x, y}
    const [dragging, setDragging] = useState(null); // { id, pointIndex }
    const [isPanning, setIsPanning] = useState(false);
    const [isTranslating, setIsTranslating] = useState(false);
    const [showManagement, setShowManagement] = useState(false); // Legacy sidebar toggle

    // Size State
    const [naturalSize, setNaturalSize] = useState({ width: 0, height: 0 });
    const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
    const isImageLoaded = naturalSize.width > 0 && naturalSize.height > 0;

    const containerRef = useRef(null);
    const canvasRef = useRef(null); // SVG Ref

    // Reset loop if index out of bounds
    useEffect(() => {
        if (series.images.length > 0 && currentImageIndex >= series.images.length) {
            setCurrentImageIndex(0);
        }
    }, [series.images.length]);

    const currentImage = series.images[currentImageIndex];
    const previewImageUrl = currentImage?.previewUrl || currentImage?.url;

    // Load Image Dimensions
    useEffect(() => {
        if (!previewImageUrl) return;
        const img = new Image();
        img.src = previewImageUrl;
        img.onload = () => {
            setNaturalSize({ width: img.naturalWidth, height: img.naturalHeight });
            // Initialize Viewport Center if first load
            setViewport(prev => {
                if (prev.cx === null) {
                    return { cx: img.naturalWidth / 2, cy: img.naturalHeight / 2, scale: 1 };
                }
                return prev;
            });
        };
    }, [previewImageUrl]); // Depend on URL to reload if image changes

    // Resize Observer
    useEffect(() => {
        if (!containerRef.current) return;
        const ro = new ResizeObserver(entries => {
            const { width, height } = entries[0].contentRect;
            if (width > 0 && height > 0) setContainerSize({ width, height });
        });
        ro.observe(containerRef.current);
        return () => ro.disconnect();
    }, []);

    // --- VIEW BOX CALCULATION (Exact Match to Viewer) ---
    const rotatePoint = (point, center, angle) => {
        const radians = (angle * Math.PI) / 180;
        const cos = Math.cos(radians);
        const sin = Math.sin(radians);
        const dx = point.x - center.x;
        const dy = point.y - center.y;
        return {
            x: center.x + (dx * cos - dy * sin),
            y: center.y + (dx * sin + dy * cos)
        };
    };

    const isRotated90 = Math.abs(adjustments.rotate) % 180 === 90;

    const calculateViewBox = () => {
        if (!isImageLoaded || containerSize.width === 0 || containerSize.height === 0) return "0 0 100 100";

        const cx = viewport.cx ?? naturalSize.width / 2;
        const cy = viewport.cy ?? naturalSize.height / 2;
        const scale = viewport.scale || 1;

        const effNaturalWidth = isRotated90 ? naturalSize.height : naturalSize.width;
        const effNaturalHeight = isRotated90 ? naturalSize.width : naturalSize.height;

        const containerAR = containerSize.width / containerSize.height;
        const imageAR = effNaturalWidth / effNaturalHeight;

        let baseWidth, baseHeight;

        if (imageAR > containerAR) {
            baseWidth = effNaturalWidth;
            baseHeight = baseWidth / containerAR;
        } else {
            baseHeight = effNaturalHeight;
            baseWidth = baseHeight * containerAR;
        }

        const visibleWidth = baseWidth / scale;
        const visibleHeight = baseHeight / scale;

        const imageCenter = { x: naturalSize.width / 2, y: naturalSize.height / 2 };
        const rotatedTarget = rotatePoint({ x: cx, y: cy }, imageCenter, adjustments.rotate);

        const minX = rotatedTarget.x - (visibleWidth / 2);
        const minY = rotatedTarget.y - (visibleHeight / 2);

        return `${minX} ${minY} ${visibleWidth} ${visibleHeight}`;
    };

    const viewBoxString = calculateViewBox();

    // --- DATA MANAGEMENT ---
    const legacyAnnotations = currentImage?.annotations || [];
    const seriesStructures = series.structures || [];
    const visibleStructures = seriesStructures
        .filter(s => s.locations && s.locations[currentImageIndex])
        .map(s => ({ ...s, ...s.locations[currentImageIndex], id: s.id, isSeriesStructure: true }));
    const annotations = [...legacyAnnotations, ...visibleStructures];


    // --- ACTIONS ---
    const handleAnnotationUpdate = (id, updates) => {
        const structureIndex = seriesStructures.findIndex(s => s.id === id);
        if (structureIndex >= 0) {
            // Series Structure Update
            const newStructures = [...seriesStructures];
            const structure = { ...newStructures[structureIndex] };
            const isSpatial = ['x', 'y', 'points'].some(k => Object.keys(updates).includes(k));

            if (isSpatial) {
                const { _forceCurrent, ...validUpdates } = updates;
                const newLocations = { ...(structure.locations || {}) };

                // Propagation Logic for Spatial Updates (Drag/Move)
                // If _forceCurrent is true (e.g. dragging), we obey the `propagationRange` state
                // BUT usually dragging is 'current only' unless specified. 
                // The user requested "posibilidad de editar en estas mismas propagaciones".
                // Let's assume real-time dragging propagates if enabled, or at least setting value does.

                const currentIndex = Number(currentImageIndex);
                let endIndex = currentIndex + 1; // Default 'current'

                if (propagationRange === '10') endIndex = Math.min(series.images.length, currentIndex + 10);
                else if (propagationRange === '20') endIndex = Math.min(series.images.length, currentIndex + 20);
                else if (propagationRange === 'all') endIndex = series.images.length;
                else if (propagationRange === 'forward') endIndex = series.images.length; // Custom 'forward' logic or same as all from here? 'forward' usually means all from here.

                // Apply update to range
                for (let i = currentIndex; i < endIndex; i++) {
                    // Start propagation
                    if (newLocations[i]) {
                        newLocations[i] = { ...newLocations[i], ...validUpdates };
                    } else if (propagationRange !== 'current') {
                        // If standardizing creation on propagation:
                        // newLocations[i] = { ...validUpdates }; 
                        // But usually we only update EXISTING points in a drag unless we want to CREATE points?
                        // For "Edit", we usually modify existing. 
                        newLocations[i] = { ...(newLocations[i] || {}), ...validUpdates };
                    }
                }

                newStructures[structureIndex] = { ...structure, locations: newLocations };
            } else {
                // Metadata updates (Name, Category) - usually global for the structure?
                // Or per location? The Model says `label` is on the structure root, logic checks out.
                newStructures[structureIndex] = { ...structure, ...updates };
            }
            onUpdate({ structures: newStructures });
        } else {
            // Legacy Annotation Update
            const updatedImages = series.images.map((img, idx) => {
                if (idx !== currentImageIndex) return img;
                return {
                    ...img,
                    annotations: (img.annotations || []).map(ann => ann.id === id ? { ...ann, ...updates } : ann)
                };
            });
            onUpdate({ images: updatedImages });
        }
    };

    const addSeriesStructure = (type, data) => {
        const newId = Date.now().toString();
        const locations = {};
        const currentIndex = Number(currentImageIndex);
        let endIndex = series.images.length;

        if (propagationRange === 'current') endIndex = currentIndex + 1;
        else if (propagationRange === '10') endIndex = Math.min(series.images.length, currentIndex + 10);
        else if (propagationRange === '20') endIndex = Math.min(series.images.length, currentIndex + 20);

        const loopStart = (propagationRange === 'all') ? 0 : currentIndex;

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
        onUpdate({ structures: [...seriesStructures, newStructure] });
        setSelectedAnnotationId(newId);
    };

    const handleDeleteAnnotation = (id, scope = 'current') => {
        const structureIndex = seriesStructures.findIndex(s => s.id === id);
        if (structureIndex >= 0) {
            const newStructures = [...seriesStructures];
            const structure = { ...newStructures[structureIndex] };

            if (scope === 'all') {
                // Delete the Structure entirely
                newStructures.splice(structureIndex, 1);
            } else {
                const newLocations = { ...structure.locations };
                const currentIndex = Number(currentImageIndex);

                if (scope === 'current') {
                    delete newLocations[currentIndex];
                } else if (scope === 'forward') {
                    // Delete from current to end
                    Object.keys(newLocations).forEach(key => {
                        if (Number(key) >= currentIndex) delete newLocations[key];
                    });
                }

                structure.locations = newLocations;

                // If no locations left, maybe delete structure? 
                if (Object.keys(newLocations).length === 0) {
                    newStructures.splice(structureIndex, 1);
                } else {
                    newStructures[structureIndex] = structure;
                }
            }
            onUpdate({ structures: newStructures });
            if (scope === 'all' || !structure.locations[currentImageIndex]) {
                setSelectedAnnotationId(null);
            }
        } else {
            const updatedImages = series.images.map((img, idx) => {
                if (idx !== currentImageIndex) return img;
                return { ...img, annotations: (img.annotations || []).filter(a => a.id !== id) };
            });
            onUpdate({ images: updatedImages });
            setSelectedAnnotationId(null);
        }
    };


    // --- INTERACTION HANDLERS (SVG Coordinate System) ---
    const getSVGPoint = (e) => {
        if (!canvasRef.current) return null;
        const svg = canvasRef.current;
        const pt = svg.createSVGPoint();
        pt.x = e.clientX;
        pt.y = e.clientY;

        // We need to transform the screen point into the "Image Space" (inside the group with transforms)
        // Find the group element
        const contentGroup = svg.getElementById('content-group');
        if (!contentGroup) return null;

        const loc = pt.matrixTransform(contentGroup.getScreenCTM().inverse());

        // Normalize 0-1
        return {
            x: loc.x / naturalSize.width,
            y: loc.y / naturalSize.height
        };
    };

    // Legacy: Clear Annotations (moved from old file)
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
    const handleMouseDown = (e) => {
        // Panning Logic handled separately or integrated?
        if (selectedTool === 'pan' || e.button === 1) { // Middle click usually 1
            setIsPanning(true);
            return;
        }

        // Tool Logic
        const pt = getSVGPoint(e);
        if (!pt) return;

        if (selectedTool === 'point') {
            addSeriesStructure('point', { x: pt.x, y: pt.y });
            setSelectedTool('select');
        } else if (selectedTool === 'line') {
            if (!drawingLine) {
                setDrawingLine({ startX: pt.x, startY: pt.y });
            } else {
                addSeriesStructure('line', { startX: drawingLine.startX, startY: drawingLine.startY, endX: pt.x, endY: pt.y });
                setDrawingLine(null);
                setSelectedTool('select');
            }
        } else if (selectedTool === 'polygon') {
            const newPoint = { x: pt.x, y: pt.y };
            if (currentPolygonPoints.length > 2) {
                const start = currentPolygonPoints[0];
                const dist = Math.sqrt(Math.pow(pt.x - start.x, 2) + Math.pow(pt.y - start.y, 2));
                // 3% distance threshold (normalized) seems okay, maybe check pixel distance
                if (dist < 0.03) {
                    addSeriesStructure('polygon', { points: currentPolygonPoints });
                    setCurrentPolygonPoints([]);
                    setSelectedTool('select');
                    return;
                }
            }
            setCurrentPolygonPoints([...currentPolygonPoints, newPoint]);
        } else if (selectedTool === 'select') {
            // If we clicked blank space, deselect
            setSelectedAnnotationId(null);
        }
    };

    const handleMouseMove = (e) => {
        // Pan Logic (Global movement)
        if (isPanning) {
            const movementX = e.movementX;
            const movementY = e.movementY;
            // Similar logic to Viewer for panning
            // For now simple implementation without rotation correction for pan direction
            // Better to match Viewer's robust pan
            // Calculate ratio (ViewBox Units per Screen Pixel)
            if (containerSize.width === 0) return;
            const viewBoxRaw = viewBoxString.split(' ').map(Number);
            const visibleWidth = viewBoxRaw[2];
            const ratio = visibleWidth / containerSize.width;

            // Simple Pan (No rotation correction for this quick pass, or copy full logic)
            // Copy full logic for consistency
            const dxPx = movementX;
            const dyPx = movementY;

            let vDx = -dxPx * ratio;
            let vDy = -dyPx * ratio;

            const rad = (-adjustments.rotate * Math.PI) / 180;
            const cos = Math.cos(rad);
            const sin = Math.sin(rad);

            let iDx = vDx * cos - vDy * sin;
            let iDy = vDx * sin + vDy * cos;
            if (adjustments.flipH) iDx = -iDx;

            setViewport(p => ({
                ...p,
                cx: (p.cx ?? naturalSize.width / 2) + iDx,
                cy: (p.cy ?? naturalSize.height / 2) + iDy
            }));
            return;
        }

        // Dragging Logic
        if (dragging) {
            const pt = getSVGPoint(e);
            if (!pt) return;

            // Bound to 0-1
            const nx = Math.max(0, Math.min(1, pt.x));
            const ny = Math.max(0, Math.min(1, pt.y));

            if (dragging.pointIndex !== undefined && dragging.pointIndex !== null) {
                // Polygon Vertex
                const structure = seriesStructures.find(s => s.id === dragging.id) || annotations.find(a => a.id === dragging.id);
                // Need to find which is it. Logic in handleAnnotationUpdate handles both but we need current points
                // Simplified: assuming we found it.
                // We actually need the CURRENT points to update index.
                // This is tricky without access to exact structure object easily.
                // Let's re-find it.
                let target = annotations.find(a => a.id === dragging.id);
                if (target && target.points) {
                    const newPoints = [...target.points];
                    newPoints[dragging.pointIndex] = { x: nx, y: ny };
                    handleAnnotationUpdate(dragging.id, { points: newPoints, _forceCurrent: true });
                }
            } else {
                // Point or Line Endpoint? Line endpoints usually separate?
                // Current dragging logic for Point
                handleAnnotationUpdate(dragging.id, { x: nx, y: ny, _forceCurrent: true });
            }
        }
    };

    const handleMouseUp = () => {
        setIsPanning(false);
        setDragging(null);
    };

    const handleDragStart = (e, id) => {
        setDragging({ id });
    };

    // --- RENDER HELPERS ---
    const project = (x, y) => ({ x: x * naturalSize.width, y: y * naturalSize.height });

    const ZoomControls = () => (
        <div className="flex items-center space-x-1">
            <button onClick={() => setViewport(p => ({ ...p, scale: p.scale * 0.8 }))} className="p-2 rounded text-gray-400 hover:bg-gray-700"><ZoomOut className="w-5 h-5" /></button>
            <span className="text-xs text-gray-500 w-10 text-center">{Math.round(viewport.scale * 100)}%</span>
            <button onClick={() => setViewport(p => ({ ...p, scale: p.scale * 1.2 }))} className="p-2 rounded text-gray-400 hover:bg-gray-700"><ZoomIn className="w-5 h-5" /></button>
            <button onClick={() => setViewport(p => ({ ...p, cx: naturalSize.width / 2, cy: naturalSize.height / 2, scale: 1 }))} className="p-2 rounded text-gray-400 hover:bg-gray-700"><Maximize className="w-5 h-5" /></button>
        </div>
    );

    const TransformControls = () => (
        <>
            <button onClick={() => setAdjustments(p => ({ ...p, rotate: (p.rotate + 90) % 360 }))} className="p-2 rounded text-gray-400 hover:bg-gray-700"><RotateCw className="w-5 h-5" /></button>
            <button onClick={() => setAdjustments(p => ({ ...p, flipH: !p.flipH }))} className="p-2 rounded text-gray-400 hover:bg-gray-700"><FlipHorizontal className="w-5 h-5" /></button>
        </>
    );

    if (!currentImage) return <div className="text-center p-10">No hay imágenes</div>;


    return (
        <div className="flex flex-col h-[700px] border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-gray-900">
            {/* Top Toolbar */}
            <div className="bg-gray-800 p-2 border-b border-gray-700 flex items-center justify-between">
                <div className="flex space-x-2">
                    <button onClick={() => setSelectedTool('select')} className={`p-2 rounded ${selectedTool === 'select' ? 'bg-indigo-900 text-indigo-300' : 'text-gray-400 hover:bg-gray-700'}`} title="Seleccionar (V)">
                        <MousePointer className="w-5 h-5" />
                    </button>
                    <button onClick={() => setSelectedTool('pan')} className={`p-2 rounded ${selectedTool === 'pan' ? 'bg-indigo-900 text-indigo-300' : 'text-gray-400 hover:bg-gray-700'}`} title="Mover Vista">
                        <Hand className="w-5 h-5" />
                    </button>
                    <div className="w-px h-6 bg-gray-700 mx-2" />
                    <button onClick={() => setSelectedTool('point')} className={`p-2 rounded ${selectedTool === 'point' ? 'bg-indigo-900 text-indigo-300' : 'text-gray-400 hover:bg-gray-700'}`} title="Añadir Punto">
                        <CircleDot className="w-5 h-5" />
                    </button>
                    <button onClick={() => setSelectedTool('line')} className={`p-2 rounded ${selectedTool === 'line' ? 'bg-indigo-900 text-indigo-300' : 'text-gray-400 hover:bg-gray-700'}`} title="Añadir Flecha">
                        <ArrowUpRight className="w-5 h-5" />
                    </button>
                    <button onClick={() => setSelectedTool('polygon')} className={`p-2 rounded ${selectedTool === 'polygon' ? 'bg-indigo-900 text-indigo-300' : 'text-gray-400 hover:bg-gray-700'}`} title="Añadir Polígono/Región">
                        <Hexagon className="w-5 h-5" />
                    </button>

                    <div className="w-px h-6 bg-gray-700 mx-2" />

                    {/* View Controls */}
                    <div className="flex items-center space-x-1">
                        <button onClick={() => setViewport(p => ({ ...p, scale: p.scale * 0.8 }))} className="p-2 rounded text-gray-400 hover:bg-gray-700" title="Alejar">
                            <ZoomOut className="w-5 h-5" />
                        </button>
                        <span className="text-xs text-gray-500 w-10 text-center">{Math.round(viewport.scale * 100)}%</span>
                        <button onClick={() => setViewport(p => ({ ...p, scale: p.scale * 1.2 }))} className="p-2 rounded text-gray-400 hover:bg-gray-700" title="Acercar">
                            <ZoomIn className="w-5 h-5" />
                        </button>
                        <button onClick={() => setViewport(p => ({ ...p, cx: naturalSize.width / 2, cy: naturalSize.height / 2, scale: 1 }))} className="p-2 rounded text-gray-400 hover:bg-gray-700" title="Restablecer Vista">
                            <Maximize className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="w-px h-6 bg-gray-700 mx-2" />

                    <button onClick={() => setAdjustments(p => ({ ...p, rotate: (p.rotate + 90) % 360 }))} className="p-2 rounded text-gray-400 hover:bg-gray-700" title="Rotar 90°">
                        <RotateCw className="w-5 h-5" />
                    </button>
                    <button onClick={() => setAdjustments(p => ({ ...p, flipH: !p.flipH }))} className="p-2 rounded text-gray-400 hover:bg-gray-700" title="Voltear Horizontalmente">
                        <FlipHorizontal className="w-5 h-5" />
                    </button>
                </div>

                {/* Top Right Controls */}
                <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-400">Categoría:</span>
                        <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} className="text-sm bg-gray-700 border-gray-600 text-white rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500">
                            {ANATOMY_CATEGORIES.map(cat => (
                                <option key={cat.id} value={cat.id}>{cat.label}</option>
                            ))}
                        </select>
                    </div>
                    <div className="w-px h-6 bg-gray-600 mx-2" />
                    <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-400">Propagación:</span>
                        <select value={propagationRange} onChange={(e) => setPropagationRange(e.target.value)} className="text-sm bg-gray-700 border-gray-600 text-white rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500" title="Replicar estructura">
                            <option value="current">Solo Actual</option>
                            <option value="10">Siguientes 10</option>
                            <option value="20">Siguientes 20</option>
                            <option value="all">Toda la Serie</option>
                        </select>
                    </div>
                </div>
            </div>

            <div className="flex flex-1 overflow-hidden">
                {/* Main Canvas Area */}
                <div className="flex-1 flex flex-col relative bg-black">
                    <div ref={containerRef} className="flex-1 relative overflow-hidden flex items-center justify-center">
                        {isImageLoaded ? (
                            <svg
                                ref={canvasRef}
                                className="w-full h-full"
                                viewBox={viewBoxString}
                                preserveAspectRatio="none"
                                onMouseDown={handleMouseDown}
                                onMouseMove={handleMouseMove}
                                onMouseUp={handleMouseUp}
                                onMouseLeave={handleMouseUp}
                                style={{ cursor: selectedTool === 'pan' || isPanning ? 'grabbing' : (selectedTool === 'select' ? 'default' : 'crosshair') }}
                            >
                                <g
                                    id="content-group"
                                    style={{
                                        transformOrigin: `${naturalSize.width / 2}px ${naturalSize.height / 2}px`,
                                        transform: `rotate(${adjustments.rotate}deg) scaleX(${adjustments.flipH ? -1 : 1})`,
                                        transition: isPanning ? 'none' : 'transform 0.3s'
                                    }}
                                >
                                    <image
                                        href={previewImageUrl}
                                        width={naturalSize.width}
                                        height={naturalSize.height}
                                        style={{ filter: `brightness(${adjustments.brightness}%) contrast(${adjustments.contrast}%)` }}
                                    />
                                    {annotations.map(ann => {
                                        const category = ANATOMY_CATEGORIES.find(c => c.id === ann.category);
                                        const color = category?.color || '#fff';
                                        const isSelected = selectedAnnotationId === ann.id;

                                        if (ann.type === 'point') {
                                            const { x, y } = project(ann.x, ann.y);
                                            const radius = (naturalSize.width / 150) / viewport.scale;
                                            return (
                                                <g key={ann.id} onClick={(e) => { e.stopPropagation(); setSelectedAnnotationId(ann.id); }}>
                                                    <circle cx={x} cy={y} r={radius} fill={color} stroke="white" strokeWidth={radius * 0.2} opacity={0.8} />
                                                    <circle cx={x} cy={y} r={radius * 3} fill="transparent"
                                                        onMouseDown={(e) => { e.stopPropagation(); handleDragStart(e, ann.id); }}
                                                        style={{ cursor: 'move' }}
                                                    />
                                                    {isSelected && <circle cx={x} cy={y} r={radius * 1.5} fill="none" stroke="white" strokeWidth={radius * 0.5} strokeDasharray="4 2" />}
                                                </g>
                                            );
                                        }
                                        if (ann.type === 'polygon') {
                                            return (
                                                <g key={ann.id} onClick={(e) => { e.stopPropagation(); setSelectedAnnotationId(ann.id); }}>
                                                    <path d={getSmoothPath(ann.points)} fill={color} fillOpacity="0.3" stroke={color} strokeWidth="2" vectorEffect="non-scaling-stroke"
                                                        transform={`scale(${naturalSize.width / 100} ${naturalSize.height / 100})`}
                                                    />
                                                    {isSelected && ann.points.map((p, idx) => {
                                                        const px = p.x * naturalSize.width;
                                                        const py = p.y * naturalSize.height;
                                                        const r = (naturalSize.width / 200) / viewport.scale;
                                                        return (
                                                            <circle key={idx} cx={px} cy={py} r={r} fill="white" stroke={color} strokeWidth={r / 2}
                                                                onMouseDown={(e) => { e.stopPropagation(); setDragging({ id: ann.id, pointIndex: idx }); }}
                                                                style={{ cursor: 'move' }}
                                                            />
                                                        );
                                                    })}
                                                </g>
                                            );
                                        }
                                        return null;
                                    })}
                                    {drawingLine && <line x1={drawingLine.startX * naturalSize.width} y1={drawingLine.startY * naturalSize.height} x2={getSVGPoint({ clientX: dragging?.lx || 0, clientY: dragging?.ly || 0 })?.x} stroke="white" strokeWidth="2" />}
                                    {currentPolygonPoints.length > 0 && <g> <path d={getSmoothPath(currentPolygonPoints.map(p => ({ x: p.x * 100, y: p.y * 100 })))} fill="none" stroke="yellow" strokeWidth="2" vectorEffect="non-scaling-stroke" transform={`scale(${naturalSize.width / 100} ${naturalSize.height / 100})`} /> {currentPolygonPoints.map((p, i) => (<circle key={i} cx={p.x * naturalSize.width} cy={p.y * naturalSize.height} r={5} fill="yellow" />))} </g>}
                                </g>
                            </svg>
                        ) : (
                            <div className="flex items-center justify-center h-full text-white"><Loader2 className="w-8 h-8 animate-spin mr-2" /> Cargando imagen...</div>
                        )}

                        {/* Slice Indicator */}
                        {series.images.length > 1 && (
                            <div className="absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded pointer-events-none z-20 font-mono border border-white/20">
                                Img: {currentImageIndex + 1} / {series.images.length}
                            </div>
                        )}
                    </div>

                    {/* Slice Navigation (Bottom) */}
                    {series.images.length > 1 && (
                        <div className="h-16 bg-gray-800 border-t border-gray-700 flex items-center px-4 space-x-4 z-10">
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

                {/* SIDEBAR PROPERTIES PANEL (RESTORED) */}
                <div className="w-72 bg-gray-800 border-l border-gray-700 flex flex-col z-20">
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

                                                // 1. Translated Label
                                                if (ann.label && !ann.labelEn) {
                                                    const translation = translateAnatomyTerm(ann.label);
                                                    if (translation) handleAnnotationUpdate(selectedAnnotationId, { labelEn: translation });
                                                }

                                                // 2. Translate Description
                                                if (ann.description) {
                                                    setIsTranslating(true);
                                                    try {
                                                        const translateText = httpsCallable(functions, 'translateText');
                                                        const result = await translateText({ text: ann.description, target: 'en' });
                                                        handleAnnotationUpdate(selectedAnnotationId, { descriptionEn: result.data.translation });
                                                    } catch (error) {
                                                        console.error("Translation failed:", error);
                                                    } finally {
                                                        setIsTranslating(false);
                                                    }
                                                }
                                            }}
                                            disabled={isTranslating}
                                            className={`text-xs flex items-center ${isTranslating ? 'text-gray-500 cursor-wait' : 'text-indigo-400 hover:text-indigo-300'}`}
                                            title="Traducir descripción con Google Cloud AI"
                                        >
                                            {isTranslating ? (
                                                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                            ) : (
                                                <Globe className="w-3 h-3 mr-1" />
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
                                        onClick={() => handleDeleteAnnotation(selectedAnnotationId, 'current')}
                                        className="w-full py-2 px-4 bg-red-900/30 text-red-400 rounded-md hover:bg-red-900/50 flex items-center justify-center transition-colors"
                                    >
                                        <Trash2 className="w-4 h-4 mr-2" />
                                        Eliminar de esta imagen
                                    </button>

                                    <button
                                        onClick={() => handleDeleteAnnotation(selectedAnnotationId, 'forward')}
                                        className="w-full py-2 px-4 bg-orange-900/30 text-orange-400 rounded-md hover:bg-orange-900/50 flex items-center justify-center transition-colors border border-orange-900/30"
                                        title="Eliminar de esta imagen y todas las siguientes"
                                    >
                                        <FastForward className="w-4 h-4 mr-2" />
                                        Eliminar Adelante (» )
                                    </button>

                                    <button
                                        onClick={() => handleDeleteAnnotation(selectedAnnotationId, 'all')}
                                        className="w-full py-2 px-4 bg-red-700 text-white rounded-md hover:bg-red-600 flex items-center justify-center transition-colors shadow-sm"
                                        title="Eliminar de todas las imágenes de la serie"
                                    >
                                        <Trash2 className="w-4 h-4 mr-2" />
                                        Eliminar de TODA la serie
                                    </button>

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
