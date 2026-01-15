import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
    RotateCw,
    FlipHorizontal,
    Maximize,
    Minimize,
    ChevronLeft,
    ChevronRight,
    Layers,
    Eye,
    EyeOff,
    Activity,
    AlignJustify,
    Disc,
    CircleDot,
    Droplet,
    Heart,
    Zap,
    BookOpen,
    Sun,
    PanelLeft,
    PanelRight,
    Info, // Added Info icon
    Hexagon, // Added Hexagon icon for Zones
    Trophy // Added Trophy icon for Quiz
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { getSmoothPath } from '../../../utils/svgUtils';

const ANATOMY_CATEGORIES = [
    { id: 'general', icon: Activity },
    { id: 'bones', color: '#60A5FA', icon: AlignJustify },
    { id: 'joints', color: '#FCD34D', icon: Disc },
    { id: 'joint_cavity', color: '#FDE047', icon: CircleDot },
    { id: 'fat_pad', color: '#FEF08A', icon: Layers },
    { id: 'menisci', color: '#60A5FA', icon: Disc },
    { id: 'ligaments', color: '#34D399', icon: AlignJustify },
    { id: 'muscles', color: '#F87171', icon: Activity },
    { id: 'tendons', color: '#FB923C', icon: AlignJustify },
    { id: 'bursae', color: '#A78BFA', icon: Droplet },
    { id: 'arteries', color: '#EF4444', icon: Heart },
    { id: 'veins', color: '#3B82F6', icon: Heart },
    { id: 'nerves', color: '#FBBF24', icon: Zap },
];

const AnatomyInteractiveViewer = ({
    module,
    className,
    onBack,
    // --- New Props for Quiz Mode ---
    controlledSelection = false, // If true, selection is driven by props
    selectedId = null,           // External selection ID
    onAnnotationClick = null,    // External click handler
    hideLabels = false,          // Hide text labels (for Identify Mode)
    highlightColor = null,       // Optional override color
    onStartQuiz = null,          // Callback to start quiz
    forceSlice = null,           // Force specific slice index
    forceSeriesId = null,        // Force specific series ID
    isHighIntensity = false,     // Use pulsing highlight
    dimUnselected = false        // Dim non-selected items (Isolation Mode)
}) => {
    const { t, i18n } = useTranslation();
    const currentLang = i18n.language;

    const [activeSeriesId, setActiveSeriesId] = useState(null);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    // State Declarations
    const [showAdjustments, setShowAdjustments] = useState(false);
    const [showZones, setShowZones] = useState(false); // Toggle for Anatomic Zones (Polygons)

    const [isLeftSidebarOpen, setIsLeftSidebarOpen] = useState(true);
    const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(true);

    // Track Image Dimensions state
    const [naturalSize, setNaturalSize] = useState({ width: 0, height: 0 });
    // Track Container Dimensions for "Fit Width" logic
    const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
    const isImageLoaded = naturalSize.width > 0 && naturalSize.height > 0;

    const [visibleCategories, setVisibleCategories] = useState(
        ANATOMY_CATEGORIES.reduce((acc, cat) => ({ ...acc, [cat.id]: true }), {})
    );
    const [selectedAnnotationId, setSelectedAnnotationId] = useState(null);

    // Resolve effective selection based on mode
    const effectiveSelectedId = controlledSelection ? selectedId : selectedAnnotationId;
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [viewMode, setViewMode] = useState('default'); // 'default' | 'atlas'


    // Viewport State (Camera)
    // scale 1 = "Contain" (Image is fully visible).
    // cx, cy are nullable to allow auto-centering on first load
    const [viewport, setViewport] = useState({ cx: null, cy: null, scale: 1 });

    // Visual Adjustments
    const [adjustments, setAdjustments] = useState({ brightness: 100, contrast: 100, rotate: 0, flipH: false });

    // Interaction State
    const [isDragging, setIsDragging] = useState(false);
    const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });

    const containerRef = useRef(null);
    const canvasRef = useRef(null);

    // Update container size
    useEffect(() => {
        if (!canvasRef.current) return;
        const ro = new ResizeObserver(entries => {
            const { width, height } = entries[0].contentRect;
            // Guard against 0 dimensions
            if (width > 0 && height > 0) {
                setContainerSize({ width, height });
            }
        });
        ro.observe(canvasRef.current);
        return () => ro.disconnect();
    }, [isImageLoaded]); // Critical: Re-run when canvas is actually rendered



    // Initialize active series
    useEffect(() => {
        if (module?.series && module.series.length > 0) {
            setActiveSeriesId(module.series[0].id);
            setCurrentImageIndex(0);
        } else if (module?.image) {
            // Legacy support
        }
    }, [module]);

    // Preload current image to get dimensions and reset viewport
    const currentImageUrl = useMemo(() => {
        const series = module?.series?.find(s => s.id === activeSeriesId) ||
            (module?.image ? { id: 'default', images: [{ url: module.image }] } : null);
        return series?.images?.[currentImageIndex]?.url;
    }, [module, activeSeriesId, currentImageIndex]);

    // Track previous series to prevent glitching when switching series (reset dimensions)
    const previousSeriesIdRef = useRef(activeSeriesId);

    useEffect(() => {
        if (!currentImageUrl) return;

        const hasSeriesChanged = activeSeriesId !== previousSeriesIdRef.current;

        if (hasSeriesChanged) {
            // Reset dimensions to force "loading" state and prevent visual glitch
            setNaturalSize({ width: 0, height: 0 });
            previousSeriesIdRef.current = activeSeriesId;
        }

        const img = new Image();
        img.src = currentImageUrl;
        img.onload = () => {
            const nw = img.naturalWidth;
            const nh = img.naturalHeight;
            setNaturalSize({ width: nw, height: nh });

            // Only reset Viewport/Adjustments if we switched SERIES.
            // This preserves Zoom/Pan when just scrolling through slices.
            if (hasSeriesChanged) {
                setViewport({ cx: nw / 2, cy: nh / 2, scale: 1 });
                setAdjustments(p => ({
                    ...p,
                    rotate: activeSeries.rotate || 0,
                    flipH: activeSeries.flipH || false
                }));
            }
        };
    }, [currentImageUrl, activeSeriesId]);

    // Handle External Force Navigation (Quiz)
    useEffect(() => {
        if (forceSeriesId && forceSeriesId !== activeSeriesId) {
            setActiveSeriesId(forceSeriesId);
        }
        if (forceSlice !== null && forceSlice !== undefined && forceSlice !== currentImageIndex) {
            setCurrentImageIndex(forceSlice);
        }
    }, [forceSlice, forceSeriesId]);


    const activeSeries = module?.series?.find(s => s.id === activeSeriesId) ||
        (module?.image ? { id: 'default', name: 'Default', images: [{ url: module.image, annotations: module.annotations || [] }] } : null);

    // --- ANNOTATION MERGING LOGIC ---
    const currentImage = activeSeries?.images?.[currentImageIndex];
    const legacyAnnotations = currentImage?.annotations || [];
    const seriesStructures = activeSeries?.structures || [];
    const currentSliceStructures = seriesStructures
        .filter(s => s.locations && s.locations[currentImageIndex])
        .map(s => ({ ...s, ...s.locations[currentImageIndex], id: s.id }));
    const annotations = [...legacyAnnotations, ...currentSliceStructures];

    const activeCategories = ANATOMY_CATEGORIES.filter(cat => {
        if (cat.id === 'general') return false;
        // Check if category exists in current data
        let exists = false;
        const scan = (list) => list?.forEach(a => { if (a.category === cat.id) exists = true; });
        if (module?.annotations) scan(module.annotations);
        module?.series?.forEach(s => {
            if (s.structures) scan(s.structures);
            s.images?.forEach(img => scan(img.annotations));
        });
        return exists;
    });







    // --- HELPERS ---
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

    // --- VIEW BOX CALCULATION ---
    // --- VIEW BOX CALCULATION (Refactored to return details) ---
    const calculateViewBox = () => {
        if (!isImageLoaded || containerSize.width === 0 || containerSize.height === 0) return null;

        const cx = viewport.cx ?? naturalSize.width / 2;
        const cy = viewport.cy ?? naturalSize.height / 2;
        const scale = viewport.scale || 1;

        // Effective Dimensions based on rotation
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

        return { minX, minY, visibleWidth, visibleHeight, string: `${minX} ${minY} ${visibleWidth} ${visibleHeight}` };
    };

    const viewBoxDetails = calculateViewBox();
    const viewBoxString = viewBoxDetails?.string || "0 0 100 100";


    // --- HANDLERS ---
    const toggleCategory = (id) => setVisibleCategories(p => ({ ...p, [id]: !p[id] }));
    const updateAdjustment = (key, val) => setAdjustments(p => ({ ...p, [key]: val }));

    // Zoom Helper
    const applyZoom = (delta) => {
        setViewport(prev => {
            const newScale = Math.min(Math.max(prev.scale * (1 + delta), 0.1), 20);
            return { ...prev, scale: newScale };
        });
    };

    // Coordinate Projection: Normalized (0-1) -> Image Space
    const project = (a) => {
        let nx, ny;
        if (a.type === 'polygon' && a.points) {
            nx = a.points.reduce((s, p) => s + p.x, 0) / a.points.length;
            ny = a.points.reduce((s, p) => s + p.y, 0) / a.points.length;
        } else if (a.type === 'line') {
            nx = (a.startX + a.endX) / 2;
            ny = (a.startY + a.endY) / 2;
        } else {
            nx = a.x; ny = a.y;
        }
        return { x: nx * naturalSize.width, y: ny * naturalSize.height };
    };

    const renderAnnotations = () => {
        // In Atlas Mode, we hide only the TEXT, but keep dots if needed?
        // Actually, user wants "Texts outside". Dots remaining on anatomy is fine.
        const visibleAnnotations = annotations.filter(ann => visibleCategories[ann.category]);
        return visibleAnnotations.map(ann => {
            const category = ANATOMY_CATEGORIES.find(c => c.id === ann.category);
            const color = category?.color || '#fff';
            const { x, y } = project(ann);
            const isSelected = effectiveSelectedId === ann.id;
            const label = (currentLang === 'en' && ann.labelEn) ? ann.labelEn : ann.label;


            // --- POLYGON / ZONE RENDERING ---
            // Show if Zones are enabled GLOBALLY OR if this specific annotation is SELECTED
            if (ann.type === 'polygon' && ann.points && (showZones || isSelected)) {
                return (
                    <g
                        key={ann.id}
                        style={{ cursor: 'pointer' }}
                        onClick={(e) => {
                            e.stopPropagation();
                            if (onAnnotationClick) onAnnotationClick(ann);
                            if (!controlledSelection) setSelectedAnnotationId(ann.id);
                        }}
                    >
                        <path
                            d={getSmoothPath(ann.points)}
                            fill={color}
                            fillOpacity={isSelected ? 0.6 : 0.3}
                            stroke={color}
                            strokeWidth="2"
                            vectorEffect="non-scaling-stroke"
                            strokeOpacity={isSelected ? 1 : 0.7}
                            // FIXED: getSmoothPath uses 0-100 coordinates.
                            // We must scale down by 100 then up by naturalSize.
                            // Or simply scale by naturalSize / 100.
                            transform={`scale(${naturalSize.width / 100} ${naturalSize.height / 100})`}
                        />
                        {/* Centroid Label/Dot if selected? Maybe yes */}
                        {isSelected && !hideLabels && (
                            <text
                                x={x} y={y}
                                textAnchor="middle"
                                dy=".3em"
                                fill="white"
                                fontSize={naturalSize.width / 50} // Relative font size
                                fontWeight="bold"
                                style={{
                                    textShadow: '0 0 4px black',
                                    pointerEvents: 'none',
                                    userSelect: 'none'
                                }}
                            >
                                {label}
                            </text>
                        )}
                    </g>
                );
            }

            // --- POINT RENDERING (Default & Fallback) ---

            // Scale dot size relative to image, correcting for zoom
            // USER REQUEST 2026-01-04: Smaller points, 50% opacity
            // USER REQUEST UPDATE: Even smaller in Atlas Mode
            const sizeFactor = viewMode === 'atlas' ? 300 : 150;
            const baseRadius = (naturalSize.width / sizeFactor) / viewport.scale;
            // If Atlas Mode, we DO NOT render text here. We render it in overlay.
            // If Normal Mode, we render text if selected.
            const showText = isSelected && viewMode !== 'atlas' && !hideLabels;

            return (
                <g
                    key={ann.id}
                    style={{ cursor: 'pointer' }}
                    onClick={(e) => {
                        e.stopPropagation();
                        if (onAnnotationClick) onAnnotationClick(ann);
                        if (!controlledSelection) setSelectedAnnotationId(ann.id);
                    }}
                >
                    <circle
                        cx={x} cy={y}
                        r={isSelected ? baseRadius * 1.5 : baseRadius}
                        fill={color}
                        opacity={dimUnselected ? (isSelected ? 1 : 0.1) : (isSelected ? 1 : 0.5)}
                        stroke="white"
                        strokeWidth={isSelected ? baseRadius * 0.3 : baseRadius * 0.2}
                        className={isSelected && isHighIntensity ? 'animate-pulse' : ''}
                    />
                    {showText && (
                        <text
                            x={x} y={y - baseRadius * 2}
                            textAnchor="middle"
                            fill="white"
                            fontSize={baseRadius * 3}
                            fontWeight="bold"
                            style={{ textShadow: '0 0 5px black', pointerEvents: 'none' }}
                        >
                            {label}
                        </text>
                    )}
                </g>
            );
        });
    };

    // --- ATLAS OVERLAY RENDERER ---
    const renderAtlasOverlay = () => {
        if (viewMode !== 'atlas' || !isImageLoaded || !viewBoxDetails) return null;

        const visibleAnnotations = annotations.filter(ann => visibleCategories[ann.category]);

        // Responsive Font Size Calculation
        const densityFactor = visibleAnnotations.length > 20 ? 80 : 50;
        // Clamp between 12px and 24px, primarily driven by container width / density
        const fontSize = Math.max(12, Math.min(24, containerSize.width / densityFactor));
        const lineHeight = fontSize * 1.5;

        // 1. Calculate Screen Positions for ALL items
        const items = visibleAnnotations.map(ann => {
            const category = ANATOMY_CATEGORIES.find(c => c.id === ann.category);
            const color = category?.color || '#fff';
            let { x, y } = project(ann);
            const label = (currentLang === 'en' && ann.labelEn) ? ann.labelEn : ann.label;

            if (adjustments.flipH) x = naturalSize.width - x;

            const imageCenter = { x: naturalSize.width / 2, y: naturalSize.height / 2 };
            const rotatedPoint = rotatePoint({ x, y }, imageCenter, adjustments.rotate);

            const screenX = (rotatedPoint.x - viewBoxDetails.minX) * (containerSize.width / viewBoxDetails.visibleWidth);
            const screenY = (rotatedPoint.y - viewBoxDetails.minY) * (containerSize.height / viewBoxDetails.visibleHeight);

            const isRight = screenX > containerSize.width / 2;

            return {
                id: ann.id,
                label,
                color,
                screenX, // Origin
                screenY, // Origin
                isRight,
                textY: screenY // Initial Target
            };
        });

        // 2. Resolve Collisions per side
        const resolveSide = (sideItems) => {
            // Sort by Y ascending
            sideItems.sort((a, b) => a.screenY - b.screenY);

            // Simple stack: ensure y[i] >= y[i-1] + lineHeight
            // To prevent massive drift downwards, we can try to "center" the stack around the cluster,
            // but a downward push is safer and standard for connected labels.
            for (let i = 1; i < sideItems.length; i++) {
                const prev = sideItems[i - 1];
                const curr = sideItems[i];
                if (curr.textY < prev.textY + lineHeight) {
                    curr.textY = prev.textY + lineHeight;
                }
            }
            return sideItems;
        };

        const leftItems = resolveSide(items.filter(i => !i.isRight));
        const rightItems = resolveSide(items.filter(i => i.isRight));
        const allAdjustedItems = [...leftItems, ...rightItems];

        return (
            <svg className="absolute inset-0 w-full h-full pointer-events-none z-30">
                {allAdjustedItems.map(item => {
                    const textX = item.isRight ? containerSize.width - 10 : 10;
                    const textAnchor = item.isRight ? 'end' : 'start';

                    return (
                        <g key={item.id}>
                            {/* Connection Line: From Anatomy Point (screenX, screenY) to Text Label (textX, textY) */}
                            <path
                                d={`M ${item.screenX} ${item.screenY} L ${textX} ${item.textY}`}
                                stroke={item.color}
                                strokeWidth="1"
                                opacity="0.6"
                                fill="none"
                            />
                            <circle cx={item.screenX} cy={item.screenY} r="2" fill={item.color} />
                            {!hideLabels && (
                                <text
                                    x={textX}
                                    y={item.textY - 3} // Shift text up so line acts as underline
                                    textAnchor={textAnchor}
                                    fill={item.color}
                                    fontSize={fontSize}
                                    fontWeight="normal"
                                    style={{
                                        paintOrder: 'stroke',
                                        stroke: '#000000', // Black halo
                                        strokeWidth: '4px', // Thick enough to hide line
                                        strokeLinecap: 'round',
                                        strokeLinejoin: 'round'
                                    }}
                                >
                                    {item.label}
                                </text>
                            )}
                            {/* Invisible interactive area for easier clicking */}
                            <rect
                                x={item.isRight ? textX - (item.label.length * fontSize * 0.6) : textX}
                                y={item.textY - fontSize}
                                width={item.label.length * fontSize * 0.6}
                                height={fontSize * 1.5}
                                fill="transparent"
                                style={{
                                    cursor: 'pointer',
                                    pointerEvents: 'auto'
                                }}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (onAnnotationClick) onAnnotationClick(item); // Note: item is simplified ann
                                    if (!controlledSelection) setSelectedAnnotationId(item.id);
                                }}
                            />
                        </g>
                    );
                })}
            </svg>
        );
    };

    const handleWheel = (e) => {
        if (e.ctrlKey) {
            e.preventDefault();
            const delta = e.deltaY * -0.002;
            applyZoom(delta);
        } else {
            if (activeSeries.images.length > 1) {
                const direction = e.deltaY > 0 ? 1 : -1;
                setCurrentImageIndex(prev => {
                    const next = prev + direction;
                    if (next < 0) return 0;
                    if (next >= activeSeries.images.length) return activeSeries.images.length - 1;
                    return next;
                });
            }
        }
    };

    // Pan Logic - Global Listeners for Robustness
    const dragStartPos = useRef({ x: 0, y: 0 });

    const handleMouseDown = e => {
        setIsDragging(true);
        setLastMousePos({ x: e.clientX, y: e.clientY });
        dragStartPos.current = { x: e.clientX, y: e.clientY };
        e.preventDefault(); // Prevent text selection
    };

    // Effect to handle global move/up when dragging
    useEffect(() => {
        if (!isDragging) return;

        const handleGlobalMove = (e) => {
            const dxPx = e.clientX - lastMousePos.x;
            const dyPx = e.clientY - lastMousePos.y;

            // Calculate ratio (ViewBox Units per Screen Pixel) Using EFFECTIVE dimensions
            const effNaturalWidth = isRotated90 ? naturalSize.height : naturalSize.width;
            const effNaturalHeight = isRotated90 ? naturalSize.width : naturalSize.height;

            const containerAR = containerSize.width / containerSize.height;
            const imageAR = effNaturalWidth / effNaturalHeight;

            let baseWidth;
            if (imageAR > containerAR) baseWidth = effNaturalWidth;
            else baseWidth = effNaturalHeight * containerAR;

            const visibleWidth = baseWidth / viewport.scale;
            const ratio = visibleWidth / containerSize.width;

            // Visual Delta (Viewport move)
            // Move Right (dx > 0) -> Camera Left (delta < 0)
            let vDx = -dxPx * ratio;
            let vDy = -dyPx * ratio;

            // Rotation Correction
            const rad = (-adjustments.rotate * Math.PI) / 180;
            const cos = Math.cos(rad);
            const sin = Math.sin(rad);

            let iDx = vDx * cos - vDy * sin;
            let iDy = vDx * sin + vDy * cos;

            // Handle Flip (Applied BEFORE rotation in visual stack, so inverse is after? No, logic holds)
            // transform="rotate(deg) scaleX(flip)"
            // Visual = Rot( Flip( Image ) )
            // Image = FlipInv( RotInv( Visual ) )
            // We applied RotInv. Now FlipInv.
            if (adjustments.flipH) iDx = -iDx;

            setViewport(p => ({
                ...p,
                cx: p.cx + iDx,
                cy: p.cy + iDy
            }));
            setLastMousePos({ x: e.clientX, y: e.clientY });
        };

        const handleGlobalUp = () => {
            setIsDragging(false);
        };

        window.addEventListener('mousemove', handleGlobalMove);
        window.addEventListener('mouseup', handleGlobalUp);
        return () => {
            window.removeEventListener('mousemove', handleGlobalMove);
            window.removeEventListener('mouseup', handleGlobalUp);
        };
    }, [isDragging, lastMousePos, containerSize, naturalSize, viewport.scale, adjustments, isRotated90]);

    const handleMouseMove = () => { };
    const handleMouseUp = () => { };

    if (!activeSeries || !isImageLoaded) return <div className="text-white text-center p-10">{t('anatomy.viewer.loading')}</div>;

    return (
        <div ref={containerRef} className={`flex flex-col bg-gray-950 relative overflow-hidden ${isFullscreen ? 'fixed inset-0 z-50 h-screen w-screen' : (className || 'h-full')}`}>
            {/* Toolbar */}
            <div className="bg-gray-900 border-b border-gray-800 p-2 flex justify-between items-center z-40">
                <div className="flex items-center space-x-4">
                    <div className="flex items-center">
                        {onBack && (
                            <button onClick={onBack} className="text-gray-400 hover:text-white mr-2" title={t('anatomy.back', 'Volver')}>
                                <ChevronLeft className="w-6 h-6" />
                            </button>
                        )}
                        <button
                            onClick={() => setIsLeftSidebarOpen(!isLeftSidebarOpen)}
                            className={`p-1.5 mr-2 rounded transition-colors ${!isLeftSidebarOpen ? 'bg-gray-800 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}
                            title="Alternar Panel Izquierdo"
                        >
                            <PanelLeft className="w-5 h-5" />
                        </button>
                    </div>
                    <h2 className="text-white font-medium text-sm px-2">
                        {module.title} - <span className="text-gray-400">{activeSeries.name.replace('Sagittal', 'Sagital')}</span>
                    </h2>
                </div>
                <div className="flex items-center space-x-2 relative">
                    {onStartQuiz && (
                        <button
                            onClick={() => onStartQuiz()}
                            className="flex items-center space-x-2 px-4 py-1.5 rounded-full transition-all duration-200 border bg-indigo-600 border-indigo-500 text-white shadow-lg hover:bg-indigo-700 hover:scale-105 active:scale-95"
                            title={t('quiz.startQuiz', 'Desafío de Anatomía')}
                        >
                            <Trophy className="w-4 h-4 text-yellow-300" />
                            <span className="text-xs font-bold uppercase tracking-wide">Desafío</span>
                        </button>
                    )}

                    <div className="w-px h-6 bg-gray-700 mx-1" />

                    <button
                        onClick={() => setShowAdjustments(!showAdjustments)}
                        className={`p-1.5 rounded transition-colors ${showAdjustments ? 'bg-gray-800 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}
                        title="Ajustar Imagen"
                    >
                        <Sun className="w-5 h-5" />
                    </button>
                    {showAdjustments && (
                        <div className="absolute top-10 right-0 bg-gray-900 border border-gray-700 p-4 rounded-lg shadow-xl z-50 w-64 space-y-4">
                            <div>
                                <label className="text-xs text-gray-400 mb-1 block flex justify-between">Brillo <span>{adjustments.brightness}%</span></label>
                                <input
                                    type="range" min="50" max="150" value={adjustments.brightness}
                                    onChange={(e) => updateAdjustment('brightness', parseInt(e.target.value))}
                                    className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                                />
                            </div>
                            <div>
                                <label className="text-xs text-gray-400 mb-1 block flex justify-between">Contraste <span>{adjustments.contrast}%</span></label>
                                <input
                                    type="range" min="50" max="150" value={adjustments.contrast}
                                    onChange={(e) => updateAdjustment('contrast', parseInt(e.target.value))}
                                    className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                                />
                            </div>
                            <div className="flex justify-between gap-2">
                                <button onClick={() => updateAdjustment('rotate', (adjustments.rotate + 90) % 360)} className="flex-1 py-1 text-xs text-center border border-gray-700 rounded hover:bg-gray-800 text-gray-300">Rotar</button>
                                <button onClick={() => updateAdjustment('flipH', !adjustments.flipH)} className="flex-1 py-1 text-xs text-center border border-gray-700 rounded hover:bg-gray-800 text-gray-300">Voltear</button>
                            </div>
                            <button
                                onClick={() => { setAdjustments({ brightness: 100, contrast: 100, rotate: 0, flipH: false }); setViewport(p => ({ ...p, scale: 1, cx: naturalSize.width / 2, cy: naturalSize.height / 2 })); }}
                                className="w-full py-1 text-xs text-gray-400 hover:text-white hover:bg-gray-800 rounded border border-gray-700"
                            >
                                Restablecer
                            </button>
                        </div>
                    )}

                    {/* Button Removed from here */}

                    <div className="w-px h-6 bg-gray-700 mx-2" />

                    <button
                        onClick={() => {
                            const newMode = viewMode === 'default' ? 'atlas' : 'default';
                            setViewMode(newMode);
                            if (newMode === 'atlas') {
                                // Zoom out to create side margins ("place where there is no image")
                                setViewport(p => ({
                                    ...p,
                                    scale: p.scale * 0.75, // reduce scale by 25%
                                    cx: naturalSize.width / 2, // centers the view
                                    cy: naturalSize.height / 2
                                }));
                            }
                        }}
                        className={`flex items-center space-x-2 px-4 py-1.5 rounded-full transition-all duration-200 border ${viewMode === 'atlas' ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-900/50 scale-105' : 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700 hover:border-gray-600'}`}
                        title={viewMode === 'default' ? "Modo Atlas" : "Modo Normal"}
                    >
                        <BookOpen className="w-4 h-4" />
                        <span className="text-xs font-bold uppercase tracking-wide">Modo Atlas</span>
                    </button>

                    <div className="w-px h-6 bg-gray-700 mx-2" />

                    {/* Removed Debug Overlay */}

                    <button
                        onClick={() => {
                            const effNaturalWidth = isRotated90 ? naturalSize.height : naturalSize.width;
                            const effNaturalHeight = isRotated90 ? naturalSize.width : naturalSize.height;

                            const containerAR = containerSize.width / containerSize.height;
                            const imageAR = effNaturalWidth / effNaturalHeight;

                            let targetScale = 1;

                            if (imageAR < containerAR) {
                                // Image narrower than container. Scale up to fit width.
                                targetScale = containerAR / imageAR;
                            } else {
                                targetScale = 1;
                            }

                            if (Math.abs(viewport.scale - targetScale) < 0.05) {
                                setViewport(p => ({ ...p, scale: 1, cx: naturalSize.width / 2, cy: naturalSize.height / 2 }));
                            } else {
                                setViewport(p => ({ ...p, scale: targetScale, cx: naturalSize.width / 2 }));
                            }
                        }}
                        className="p-1.5 text-gray-400 hover:text-white rounded hover:bg-gray-800"
                        title="Ajustar Ancho"
                    >
                        <Maximize className="w-5 h-5" />
                    </button>


                    <div className="w-px h-6 bg-gray-700 mx-2" />
                    <button onClick={() => applyZoom(-0.2)} className="p-1.5 text-gray-400 hover:text-white rounded hover:bg-gray-800"><Minimize className="w-5 h-5" /></button>
                    <span className="text-gray-400 text-xs self-center w-8 text-center">{Math.round(viewport.scale * 100)}%</span>
                    <button onClick={() => applyZoom(0.2)} className="p-1.5 text-gray-400 hover:text-white rounded hover:bg-gray-800"><Maximize className="w-5 h-5" /></button>

                    <div className="w-px h-6 bg-gray-700 mx-2" />
                    <button onClick={() => isFullscreen ? document.exitFullscreen() : containerRef.current.requestFullscreen()} className="p-1.5 text-gray-400 hover:text-white rounded hover:bg-gray-800">
                        {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
                    </button>
                    <div className="w-px h-6 bg-gray-700 mx-2" />
                    <button
                        onClick={() => setIsRightSidebarOpen(!isRightSidebarOpen)}
                        className={`p-1.5 rounded transition-colors ${!isRightSidebarOpen ? 'bg-gray-800 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}
                        title="Alternar Panel Derecho"
                    >
                        <PanelRight className="w-5 h-5" />
                    </button>
                </div>
            </div>

            <div className="flex flex-1 overflow-hidden relative">
                {/* Left Sidebar */}
                <div className={`${isLeftSidebarOpen ? 'w-20 md:w-24 xl:w-32' : 'w-0 border-none'} bg-gray-900 border-r border-gray-800 flex flex-col z-20 overflow-y-auto hide-scrollbar transition-all duration-300`}>
                    {module.series && module.series.map(series => (
                        <button
                            key={series.id}
                            onClick={() => { setActiveSeriesId(series.id); setCurrentImageIndex(0); }}
                            className={`flex flex-col items-center justify-center p-2 border-b border-gray-800 transition-colors ${activeSeriesId === series.id ? 'bg-indigo-900/50 border-indigo-500' : 'hover:bg-gray-800 text-gray-400'}`}
                            title={series.name}
                        >
                            <div className={`w-12 h-12 md:w-16 md:h-16 bg-black rounded overflow-hidden mb-1 border-2 ${activeSeriesId === series.id ? 'border-indigo-500' : 'border-gray-700'}`}>
                                <img src={series.images[0].url} alt={series.name} className="w-full h-full object-cover opacity-80" />
                            </div>
                            <span className={`text-[10px] md:text-xs text-center font-medium leading-tight ${activeSeriesId === series.id ? 'text-indigo-300' : 'text-gray-500'}`}>
                                {series.name.replace('Sagittal', 'Sagital')}
                            </span>
                        </button>
                    ))}
                </div>

                {/* Main Content Column */}
                <div className="flex-1 flex flex-col relative bg-black">
                    {/* Canvas Container (Resized by flex to fit available space) */}
                    <div ref={canvasRef} className="flex-1 relative w-full flex items-center justify-center overflow-hidden" onWheel={handleWheel}>
                        {isImageLoaded && (
                            <svg
                                className="w-full h-full"
                                viewBox={viewBoxString}
                                preserveAspectRatio="none" // Important: We match aspect ratio manually in viewBox calculation
                                onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}
                                onClick={(e) => {
                                    const dx = Math.abs(e.clientX - dragStartPos.current.x);
                                    const dy = Math.abs(e.clientY - dragStartPos.current.y);
                                    if (dx < 5 && dy < 5) {
                                        if (onAnnotationClick) onAnnotationClick(null);
                                        if (!controlledSelection) setSelectedAnnotationId(null);
                                    }
                                }}
                                style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
                            >
                                {/* Content Group (Rotation/Flip) */}
                                <g style={{
                                    transformOrigin: `${naturalSize.width / 2}px ${naturalSize.height / 2}px`,
                                    transform: `rotate(${adjustments.rotate}deg) scaleX(${adjustments.flipH ? -1 : 1})`,
                                    transition: 'transform 0.3s'
                                }}>
                                    {/* 1. Underlying Images */}
                                    {activeSeries.images.map((img, idx) => (
                                        <image
                                            key={idx}
                                            href={img.url}
                                            x={0} y={0} width={naturalSize.width} height={naturalSize.height}
                                            style={{
                                                opacity: (idx === currentImageIndex) ? (viewMode === 'atlas' ? 0.8 : 1) : 0,
                                                pointerEvents: 'none',
                                                filter: `brightness(${adjustments.brightness}%) contrast(${adjustments.contrast}%)`
                                            }}
                                        />
                                    ))}
                                    {/* 2. Annotations */}
                                    {renderAnnotations()}
                                </g>
                            </svg>
                        )}

                        {/* Render Atlas Overlay (on top of canvas) */}
                        {renderAtlasOverlay()}

                        {/* Selected Annotation Description Overlay */}
                        {(() => {
                            // Hide description in Quiz Mode (usually)
                            if (hideLabels) return null;

                            const selectedAnn = annotations.find(a => a.id === effectiveSelectedId);
                            const desc = selectedAnn ? ((currentLang === 'en' && selectedAnn.descriptionEn) ? selectedAnn.descriptionEn : selectedAnn.description) : null;

                            if (selectedAnn && desc) {
                                return (
                                    <div className="absolute bottom-4 left-4 bg-gray-900/90 p-4 rounded-xl border border-gray-700 max-w-md z-40 backdrop-blur-sm shadow-xl transition-all duration-300 animate-fade-in">
                                        <h3 className="text-indigo-400 font-bold mb-1 text-sm uppercase tracking-wider flex items-center">
                                            <Info className="w-4 h-4 mr-2" />
                                            {(currentLang === 'en' && selectedAnn.labelEn) ? selectedAnn.labelEn : selectedAnn.label}
                                        </h3>
                                        <p className="text-gray-200 text-sm leading-relaxed">
                                            {desc}
                                        </p>
                                    </div>
                                );
                            }
                            return null;
                        })()}
                    </div>

                    {/* Slice Slider Bar (Dedicated Space) */}
                    {activeSeries.images.length > 1 && (
                        <div className="flex-none bg-gray-900 border-t border-gray-800 p-2 flex items-center justify-center space-x-4 z-30">
                            <button onClick={() => setCurrentImageIndex(p => Math.max(0, p - 1))} className="text-gray-300 hover:text-white p-1"><ChevronLeft className="w-5 h-5" /></button>

                            <input
                                type="range"
                                min="0"
                                max={activeSeries.images.length - 1}
                                value={currentImageIndex}
                                onChange={(e) => setCurrentImageIndex(parseInt(e.target.value))}
                                className="w-64 md:w-96 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                            />

                            <button onClick={() => setCurrentImageIndex(p => Math.min(activeSeries.images.length - 1, p + 1))} className="text-gray-300 hover:text-white p-1"><ChevronRight className="w-5 h-5" /></button>
                            <span className="text-xs text-white font-mono w-12 text-center">{currentImageIndex + 1}/{activeSeries.images.length}</span>
                        </div>
                    )}
                </div>

                {/* Sidebar */}
                <div className={`${isRightSidebarOpen ? 'w-64 xl:w-80' : 'w-0 border-none'} bg-gray-900 border-l border-gray-800 flex flex-col z-10 transition-all duration-300`}>
                    <div className="p-3 border-b border-gray-800 font-medium text-gray-300 text-sm flex items-center">
                        <Layers className="w-4 h-4 mr-2" /> {t('anatomy.viewer.structures')}
                    </div>
                    <div className="overflow-y-auto flex-1 p-2 space-y-1">
                        <button onClick={() => setVisibleCategories(ANATOMY_CATEGORIES.reduce((a, c) => ({ ...a, [c.id]: true }), {}))} className="w-full text-xs text-left px-2 py-1 text-gray-500 hover:text-white">Ver Todo</button>
                        <button onClick={() => setVisibleCategories({})} className="w-full text-xs text-left px-2 py-1 text-gray-500 hover:text-white">Ocultar Todo</button>

                        <div className="my-1 border-t border-gray-800"></div>
                        <button
                            onClick={() => setShowZones(!showZones)}
                            className={`w-full text-left px-2 py-2 rounded flex items-center justify-between ${showZones ? 'bg-indigo-900/40 text-indigo-300' : 'text-gray-400 hover:text-white'}`}
                        >
                            <span className="flex items-center text-xs font-medium">
                                <Hexagon className="w-4 h-4 mr-2" />
                                Zonas Anatómicas
                            </span>
                            {showZones ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                        </button>
                        <div className="my-1 border-b border-gray-800"></div>
                        {activeCategories.map(cat => (
                            <button key={cat.id} onClick={() => toggleCategory(cat.id)} className={`w-full text-left px-3 py-2 rounded flex items-center justify-between ${visibleCategories[cat.id] ? 'bg-gray-800 text-white' : 'text-gray-400'}`}>
                                <span className="flex items-center text-sm">
                                    <cat.icon className="w-4 h-4 mr-2" style={{ color: visibleCategories[cat.id] ? cat.color : '#666' }} />
                                    {t(`anatomy.categories.${cat.id}`)}
                                </span>
                                {visibleCategories[cat.id] ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AnatomyInteractiveViewer;
