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
    Globe,
    Magnet
} from 'lucide-react';
import { getSmoothPath } from '../../../utils/svgUtils';
import { ANATOMY_CATEGORIES } from '../../../utils/anatomyConstants';
import { translateAnatomyTerm } from '../../../utils/anatomyTranslations';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../../../config/firebase';



const AnatomyEditor = ({ series, onUpdate, onReverseOrder, onImageIndexChange }) => {
    const { t } = useTranslation();
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [selectedTool, setSelectedTool] = useState('select'); // select, point, line, polygon, pan
    const [selectedCategory, setSelectedCategory] = useState('bones');
    const [propagationRange, setPropagationRange] = useState('current'); // 'current', 'forward', '10', '20', 'all'
    const [adjustments, setAdjustments] = useState({ rotate: 0, flipH: false, brightness: 100, contrast: 100 });
    const [viewport, setViewport] = useState({ cx: null, cy: null, scale: 1 });
    const [selectedAnnotationId, setSelectedAnnotationId] = useState(null);
    const [drawingLine, setDrawingLine] = useState(null); // { startX, startY }
    const [currentPolygonPoints, setCurrentPolygonPoints] = useState([]); // Array of {x, y}
    const [dragging, setDragging] = useState(null); // { id, pointIndex }
    const [isPanning, setIsPanning] = useState(false);
    const [isTranslating, setIsTranslating] = useState(false);
    const [showManagement, setShowManagement] = useState(false); // Legacy sidebar toggle

    // Sync adjustments when series changes
    useEffect(() => {
        setAdjustments(prev => ({
            ...prev,
            rotate: series.rotate || 0,
            flipH: series.flipH || false
        }));
    }, [series.id]);

    // Handle updates to the parent
    const updateRotation = (newRotate) => {
        setAdjustments(p => ({ ...p, rotate: newRotate }));
        onUpdate({ rotate: newRotate });
    };

    const toggleFlipH = () => {
        const newFlipH = !adjustments.flipH;
        setAdjustments(p => ({ ...p, flipH: newFlipH }));
        onUpdate({ flipH: newFlipH });
    };

    // Magnet Mode State
    const [magnetActive, setMagnetActive] = useState(false);
    const offscreenCanvasRef = useRef(null);

    useEffect(() => {
        onImageIndexChange?.(currentImageIndex);
    }, [currentImageIndex, onImageIndexChange]);


    // Size State
    const [naturalSize, setNaturalSize] = useState({ width: 0, height: 0 });
    const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

    const containerRef = useRef(null);
    const canvasRef = useRef(null);

    const isImageLoaded = series.images && series.images.length > 0 && naturalSize.width > 0;
    const currentImage = series.images && series.images.length > 0 ? series.images[currentImageIndex] : null;
    const previewImageUrl = currentImage?.previewUrl || currentImage?.url;

    // --- MAGNET MODE HELPERS ---
    useEffect(() => {
        if (!currentImage || !isImageLoaded) return;

        const img = new Image();
        img.crossOrigin = "Anonymous";
        img.src = currentImage.previewUrl || currentImage.url;
        img.onload = () => {
            if (!offscreenCanvasRef.current) {
                offscreenCanvasRef.current = document.createElement('canvas');
            }
            const cvs = offscreenCanvasRef.current;
            cvs.width = img.naturalWidth;
            cvs.height = img.naturalHeight;
            const ctx = cvs.getContext('2d');
            ctx.drawImage(img, 0, 0);
        };
    }, [currentImage]);

    const snapToEdge = (x, y) => {
        if (!magnetActive || !offscreenCanvasRef.current) return { x, y };

        const cvs = offscreenCanvasRef.current;
        const ctx = cvs.getContext('2d');
        const width = cvs.width;
        const height = cvs.height;

        const px = Math.floor(x * width);
        const py = Math.floor(y * height);

        const radius = 15;
        let maxGradient = -1;
        let bestX = x;
        let bestY = y;

        const sobelX = [[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]];
        const sobelY = [[-1, -2, -1], [0, 0, 0], [1, 2, 1]];

        const startX = Math.max(1, px - radius);
        const endX = Math.min(width - 2, px + radius);
        const startY = Math.max(1, py - radius);
        const endY = Math.min(height - 2, py + radius);

        const patchW = endX - startX + 3;
        const patchH = endY - startY + 3;

        if (patchW <= 0 || patchH <= 0) return { x, y };

        try {
            const imageData = ctx.getImageData(startX - 1, startY - 1, patchW, patchH);
            const data = imageData.data;

            const getPixel = (ox, oy) => {
                const idx = ((oy) * patchW + (ox)) * 4;
                return (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
            };

            for (let cy = 1; cy < patchH - 1; cy++) {
                for (let cx = 1; cx < patchW - 1; cx++) {
                    let gx = 0;
                    let gy = 0;

                    for (let i = -1; i <= 1; i++) {
                        for (let j = -1; j <= 1; j++) {
                            const val = getPixel(cx + j, cy + i);
                            gx += val * sobelX[i + 1][j + 1];
                            gy += val * sobelY[i + 1][j + 1];
                        }
                    }

                    const gradient = Math.sqrt(gx * gx + gy * gy);

                    const absX = (startX - 1 + cx);
                    const absY = (startY - 1 + cy);
                    const dx = absX - px;
                    const dy = absY - py;
                    const dist = Math.sqrt(dx * dx + dy * dy);

                    const score = gradient / (1 + dist * 0.5);

                    if (score > maxGradient && gradient > 50) {
                        maxGradient = score;
                        bestX = absX / width;
                        bestY = absY / height;
                    }
                }
            }
        } catch (e) {
            console.warn("Magnet processing error", e);
            return { x, y };
        }

        return { x: bestX, y: bestY };
    };


    // Load Image Dimensions
    // Track previous series to avoid checking dimensions on every slice
    const prevSeriesIdRef = useRef(series?.id);

    // Load Image Dimensions
    useEffect(() => {
        if (!previewImageUrl) return;

        const seriesChanged = series?.id !== prevSeriesIdRef.current;

        // If series hasn't changed and we have dimensions, skip the "new Image()" check
        // This prevents the "slow loading" feeling and layout shifts on scroll
        if (!seriesChanged && naturalSize.width > 0 && naturalSize.height > 0) {
            return;
        }

        if (seriesChanged) {
            prevSeriesIdRef.current = series?.id;
            // Optional: Reset size if you want to ensure no stale dimensions, 
            // but for scrolling speed, keeping old size until new one loads is often better
            // setNaturalSize({ width: 0, height: 0 }); 
        }

        const img = new Image();
        img.src = previewImageUrl;
        img.onload = () => {
            setNaturalSize({ width: img.naturalWidth, height: img.naturalHeight });

            // Only initialize viewport if it's the first load or series changed significantly
            // We check cx === null for first load.
            setViewport(prev => {
                if (prev.cx === null || seriesChanged) {
                    return { cx: img.naturalWidth / 2, cy: img.naturalHeight / 2, scale: 1 };
                }
                return prev;
            });
        };
    }, [previewImageUrl, series?.id]); // Depend on URL AND series ID



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
                // Apply update to range
                for (let i = currentIndex; i < endIndex; i++) {
                    // Start propagation
                    if (newLocations[i]) {
                        // User Request: Only propagate to EXISTING points. Do not create new ones.
                        newLocations[i] = { ...newLocations[i], ...validUpdates };
                    }
                    // REMOVED: Implicit creation of points. 
                    // If the user wants to ADD points to a slice, they should use the add tool or copy/paste (future feature).
                    // Dragging an existing point should simply adjust the "track".
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

        if (propagationRange === 'current' || propagationRange === 'forward') endIndex = currentIndex + 1;
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


    // --- POLYGON EDITING HELPERS ---
    const deletePolygonPoint = (id, pointIndex) => {
        const structure = seriesStructures.find(s => s.id === id);
        if (!structure) return;

        const currentPoints = structure.locations && structure.locations[currentImageIndex] ? structure.locations[currentImageIndex].points : null;
        if (currentPoints) {
            // Remove the point
            const newPoints = currentPoints.filter((_, i) => i !== pointIndex);

            // Allow down to 2 points? If < 3 it's technically a line, but usually we allow editing freely.
            // If empty, maybe delete? Let's minimal logic.

            handleAnnotationUpdate(id, { points: newPoints, _forceCurrent: true });
        }
    };

    const insertPolygonPoint = (id, clickPoint) => {
        const structure = seriesStructures.find(s => s.id === id);
        if (!structure) return;

        const currentPoints = structure.locations && structure.locations[currentImageIndex] ? structure.locations[currentImageIndex].points : null;
        if (!currentPoints || currentPoints.length < 2) return;

        // Find closest segment
        let minDistance = Infinity;
        let insertIndex = -1;
        let newPoint = null;

        for (let i = 0; i < currentPoints.length; i++) {
            const p1 = currentPoints[i];
            const p2 = currentPoints[(i + 1) % currentPoints.length]; // Wrap around

            // Distance from point to line segment
            const l2 = Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2);
            if (l2 === 0) continue; // p1 == p2

            let t = ((clickPoint.x - p1.x) * (p2.x - p1.x) + (clickPoint.y - p1.y) * (p2.y - p1.y)) / l2;
            t = Math.max(0, Math.min(1, t)); // Clamp to segment

            const projX = p1.x + t * (p2.x - p1.x);
            const projY = p1.y + t * (p2.y - p1.y);

            const d = Math.sqrt(Math.pow(clickPoint.x - projX, 2) + Math.pow(clickPoint.y - projY, 2));

            if (d < minDistance) {
                minDistance = d;
                insertIndex = i + 1; // Insert AFTER p1
                const snapped = snapToEdge(projX, projY);
                newPoint = { x: snapped.x, y: snapped.y };
            }
        }

        if (insertIndex !== -1 && newPoint) {
            const newPoints = [...currentPoints];
            newPoints.splice(insertIndex, 0, newPoint);
            handleAnnotationUpdate(id, { points: newPoints, _forceCurrent: true });
        }
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
        // Button 0: Left, 1: Middle, 2: Right
        if (selectedTool === 'pan' || e.button === 1 || e.button === 2) {
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
            const rawPoint = { x: pt.x, y: pt.y };
            const snapped = snapToEdge(pt.x, pt.y);
            const newPoint = { x: snapped.x, y: snapped.y };

            if (currentPolygonPoints.length > 2) {
                const start = currentPolygonPoints[0];
                const dist = Math.sqrt(Math.pow(newPoint.x - start.x, 2) + Math.pow(newPoint.y - start.y, 2));
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
            let nx = Math.max(0, Math.min(1, pt.x));
            let ny = Math.max(0, Math.min(1, pt.y));

            if (magnetActive) {
                const snapped = snapToEdge(nx, ny);
                nx = snapped.x;
                ny = snapped.y;
            }

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

    const handleWheel = (e) => {
        // Prevent default browser scrolling in all cases when hovering canvas
        e.preventDefault();

        if (e.ctrlKey || e.shiftKey) {
            const delta = e.deltaY * -0.002;
            setViewport(prev => {
                const newScale = Math.min(Math.max(prev.scale * (1 + delta), 0.1), 20);
                return { ...prev, scale: newScale };
            });
        } else {
            if (series.images.length > 1) {
                const direction = e.deltaY > 0 ? 1 : -1;
                setCurrentImageIndex(prev => {
                    const next = prev + direction;
                    if (next < 0) return 0;
                    if (next >= series.images.length) return series.images.length - 1;
                    return next;
                });
            }
        }
    };

    // Native Wheel Listener to prevent default scroll (passive: false is required for this)
    useEffect(() => {
        const currentContainer = containerRef.current;
        if (currentContainer) {
            const handleWheelNative = (e) => {
                // We must call preventDefault here to stop browser scroll
                e.preventDefault();
                handleWheel(e);
            };
            // passive: false allows us to call preventDefault
            currentContainer.addEventListener('wheel', handleWheelNative, { passive: false });
            return () => {
                currentContainer.removeEventListener('wheel', handleWheelNative);
            };
        }
    }, [handleWheel]); // Re-attach if handleWheel changes (it shouldn't often, but safe)

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

                    <button onClick={() => updateRotation((adjustments.rotate + 90) % 360)} className="p-2 rounded text-gray-400 hover:bg-gray-700" title="Rotar 90°">
                        <RotateCw className="w-5 h-5" />
                    </button>
                    <button onClick={toggleFlipH} className="p-2 rounded text-gray-400 hover:bg-gray-700" title="Voltear Horizontalmente">
                        <FlipHorizontal className="w-5 h-5" />
                    </button>
                    {onReverseOrder && (
                        <button
                            onClick={onReverseOrder}
                            className="p-2 rounded text-gray-400 hover:bg-gray-700 hover:text-indigo-400"
                            title="Invertir Orden de Serie"
                        >
                            <ArrowUpDown className="w-5 h-5" />
                        </button>
                    )}
                </div>

                {/* Magnet Toggle */}
                <div className="flex items-center space-x-2 ml-4 border-l border-gray-700 pl-4">
                    <button
                        onClick={() => setMagnetActive(!magnetActive)}
                        className={`p-2 rounded flex items-center space-x-1 ${magnetActive ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:bg-gray-700'}`}
                        title="Modo Imán: Ajuste automático a bordes"
                    >
                        <Magnet className="w-5 h-5" />
                        <span className="text-xs font-medium hidden sm:inline">Imán</span>
                    </button>
                    <button
                        onClick={() => setPropagationRange(prev => prev === 'current' ? 'forward' : 'current')}
                        className={`p-2 rounded flex items-center space-x-1 ${propagationRange === 'forward' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:bg-gray-700'}`}
                        title={propagationRange === 'forward' ? "Editando hacia adelante (Click para solo actual)" : "Editar solo actual (Click para editar hacia adelante)"}
                    >
                        <FastForward className="w-5 h-5" />
                        <span className="text-xs font-medium hidden sm:inline">Adelante</span>
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
                                onContextMenu={(e) => e.preventDefault()} // Disable context menu for Right Click Pan
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
                                    {(series.images || []).map((img, idx) => (
                                        <image
                                            key={idx}
                                            href={img.previewUrl || img.url}
                                            width={naturalSize.width}
                                            height={naturalSize.height}
                                            style={{
                                                opacity: (idx === currentImageIndex) ? 1 : 0,
                                                pointerEvents: 'none',
                                                filter: `brightness(${adjustments.brightness}%) contrast(${adjustments.contrast}%)`
                                            }}
                                        />
                                    ))}
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
                                                    {/* Hitbox/Buffer for easier clicking on line to add point */}
                                                    <path d={getSmoothPath(ann.points)} fill="none" stroke="transparent" strokeWidth="15" vectorEffect="non-scaling-stroke"
                                                        transform={`scale(${naturalSize.width / 100} ${naturalSize.height / 100})`}
                                                        onClick={(e) => {
                                                            if (e.ctrlKey) {
                                                                e.stopPropagation();
                                                                const pt = getSVGPoint(e);
                                                                if (pt) insertPolygonPoint(ann.id, pt);
                                                            }
                                                        }}
                                                        style={{ cursor: 'crosshair' }}
                                                        title="Ctrl+Click para agregar punto"
                                                    />
                                                    <path d={getSmoothPath(ann.points)} fill={color} fillOpacity="0.3" stroke={color} strokeWidth="2" vectorEffect="non-scaling-stroke"
                                                        transform={`scale(${naturalSize.width / 100} ${naturalSize.height / 100})`}
                                                        style={{ pointerEvents: 'none' }}
                                                    />
                                                    {isSelected && ann.points.map((p, idx) => {
                                                        const px = p.x * naturalSize.width;
                                                        const py = p.y * naturalSize.height;
                                                        const r = (naturalSize.width / 200) / viewport.scale;
                                                        return (
                                                            <circle key={idx} cx={px} cy={py} r={r} fill="white" stroke={color} strokeWidth={r / 2}
                                                                onMouseDown={(e) => {
                                                                    if (e.ctrlKey) {
                                                                        e.stopPropagation();
                                                                        deletePolygonPoint(ann.id, idx);
                                                                    } else {
                                                                        e.stopPropagation();
                                                                        setDragging({ id: ann.id, pointIndex: idx });
                                                                    }
                                                                }}
                                                                style={{ cursor: 'move' }}
                                                                title="Ctrl+Click para borrar punto"
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
        </div >
    );

};

export default AnatomyEditor;
