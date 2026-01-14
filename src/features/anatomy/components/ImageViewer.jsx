import React, { useState, useEffect, useRef } from 'react';
import clsx from 'clsx';
import { ZoomIn, ZoomOut, Sun, Contrast, RotateCcw, ChevronLeft, ChevronRight, MousePointer2, Layout, Image as ImageIcon, Layers } from 'lucide-react';

const ImageViewer = ({ images = [], imageStacks = [], alt, overlays = [] }) => {
    // 1. Merge sources: Create a unified "playlist" of stacks
    const allStacks = React.useMemo(() => {
        const combined = [];

        // Add single images as the first "stack" if they exist
        if (images && images.length > 0) {
            combined.push({
                id: 'main-images',
                label: 'Imágenes Principales',
                type: 'images',
                images: images,
                rotate: 0,
                flipH: false
            });
        }

        // Add proper image stacks
        if (imageStacks && imageStacks.length > 0) {
            combined.push(...imageStacks);
        }

        return combined.length > 0 ? combined : [{ id: 'empty', label: 'Sin Imágenes', images: [] }];
    }, [images, imageStacks]);

    const [activeStackIndex, setActiveStackIndex] = useState(0);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [zoom, setZoom] = useState(1);
    const [brightness, setBrightness] = useState(100);
    const [contrast, setContrast] = useState(100);
    const [activeOverlay, setActiveOverlay] = useState(null);
    const [showSidebar, setShowSidebar] = useState(allStacks.length > 1);

    const currentStack = allStacks[activeStackIndex];
    const currentImages = currentStack ? currentStack.images : [];

    // Preload images for smooth scrolling (current stack only)
    useEffect(() => {
        if (currentImages.length > 0) {
            currentImages.forEach((src, idx) => {
                // Priority loading for first few images
                if (idx < 5) {
                    const img = new Image();
                    img.src = src;
                }
            });
            // Lazy load the rest
            const timeout = setTimeout(() => {
                currentImages.forEach((src, idx) => {
                    if (idx >= 5) {
                        const img = new Image();
                        img.src = src;
                    }
                });
            }, 1000);
            return () => clearTimeout(timeout);
        }
    }, [currentImages]);

    // Reset index when stack changes
    useEffect(() => {
        setCurrentIndex(0);
    }, [activeStackIndex]);

    // Use ref for the image container to attach non-passive listener
    const containerRef = useRef(null);

    // Handle wheel with non-passive listener to prevent default page scroll
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const handleWheel = (e) => {
            if (currentImages.length <= 1) return;

            // Prevent default page scrolling
            e.preventDefault();
            e.stopPropagation();

            const direction = e.deltaY > 0 ? 1 : -1;
            setCurrentIndex(prev => {
                const next = prev + direction;
                if (next >= 0 && next < currentImages.length) return next;
                return prev;
            });
        };

        // Attach with passive: false to ensure we can preventDefault
        container.addEventListener('wheel', handleWheel, { passive: false });

        return () => {
            container.removeEventListener('wheel', handleWheel);
        };
    }, [currentImages.length]);

    const handlePrev = () => setCurrentIndex(prev => (prev === 0 ? currentImages.length - 1 : prev - 1));
    const handleNext = () => setCurrentIndex(prev => (prev === currentImages.length - 1 ? 0 : prev + 1));

    const resetTools = () => {
        setZoom(1);
        setBrightness(100);
        setContrast(100);
        setCurrentIndex(0);
    };

    // Ensure index is valid
    if (currentIndex >= currentImages.length && currentImages.length > 0) setCurrentIndex(0);

    // If no images at all
    if (!currentImages.length) return <div className="bg-gray-200 dark:bg-gray-800 h-64 flex items-center justify-center text-gray-400">No Image Available</div>;

    return (
        <div className="flex flex-col md:flex-row gap-4 h-[600px] md:h-[700px]">
            {/* Sidebar for Series Selection */}
            {allStacks.length > 1 && (
                <div className={clsx(
                    "flex-shrink-0 bg-gray-900 border-r border-gray-800 flex flex-col transition-all duration-300",
                    showSidebar ? "w-full md:w-64" : "w-0 overflow-hidden md:w-16"
                )}>
                    <div className="p-3 border-b border-gray-800 bg-gray-900 flex items-center justify-between">
                        <span className={clsx("text-xs font-bold text-gray-400 uppercase tracking-wider", !showSidebar && "hidden")}>Explorador</span>
                        <button onClick={() => setShowSidebar(!showSidebar)} className="text-gray-400 hover:text-white">
                            <Layout size={18} />
                        </button>
                    </div>
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-2">
                        {allStacks.map((stack, idx) => (
                            <button
                                key={stack.id || idx}
                                onClick={() => setActiveStackIndex(idx)}
                                className={clsx(
                                    "w-full flex items-start space-x-3 p-2 rounded-lg transition-colors text-left",
                                    activeStackIndex === idx
                                        ? "bg-indigo-600/20 text-white border border-indigo-500/50"
                                        : "text-gray-400 hover:bg-gray-800 hover:text-gray-200 border border-transparent"
                                )}
                            >
                                <div className="flex-shrink-0 mt-0.5">
                                    {stack.images.length > 1 ? (
                                        <Layers size={16} className={activeStackIndex === idx ? "text-indigo-400" : "text-gray-500"} />
                                    ) : (
                                        <ImageIcon size={16} className={activeStackIndex === idx ? "text-indigo-400" : "text-gray-500"} />
                                    )}
                                </div>
                                <div className={clsx("flex-1 min-w-0", !showSidebar && "hidden md:hidden")}>
                                    <p className="text-sm font-medium truncate">{stack.label || `Serie ${idx + 1}`}</p>
                                    <p className="text-xs text-gray-500">{stack.images.length} imág.</p>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Main Viewer Area */}
            <div className="flex-1 flex flex-col min-w-0 bg-gray-950 rounded-xl overflow-hidden shadow-2xl border border-gray-800">
                {/* Toolbar */}
                <div className="flex flex-wrap items-center gap-2 p-2 bg-gray-900 border-b border-gray-800 text-gray-300">
                    <div className="flex items-center space-x-1 bg-black/30 rounded-lg p-1">
                        <button onClick={() => setZoom(z => Math.max(1, z - 0.1))} className="p-1.5 hover:bg-gray-700 rounded transition-colors" title="Zoom Out">
                            <ZoomOut size={16} />
                        </button>
                        <span className="text-xs w-8 text-center font-medium font-mono">{Math.round(zoom * 100)}%</span>
                        <button onClick={() => setZoom(z => Math.min(3, z + 0.1))} className="p-1.5 hover:bg-gray-700 rounded transition-colors" title="Zoom In">
                            <ZoomIn size={16} />
                        </button>
                    </div>

                    <div className="h-4 w-px bg-gray-700 mx-1"></div>

                    <div className="flex items-center space-x-2 bg-black/30 rounded-lg p-1 px-2">
                        <Sun size={16} className="text-gray-500" />
                        <input
                            type="range"
                            min="50"
                            max="150"
                            value={brightness}
                            onChange={(e) => setBrightness(Number(e.target.value))}
                            className="w-20 h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                        />
                    </div>

                    <div className="flex items-center space-x-2 bg-black/30 rounded-lg p-1 px-2">
                        <Contrast size={16} className="text-gray-500" />
                        <input
                            type="range"
                            min="50"
                            max="150"
                            value={contrast}
                            onChange={(e) => setContrast(Number(e.target.value))}
                            className="w-20 h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                        />
                    </div>

                    <div className="ml-auto">
                        <button onClick={resetTools} className="flex items-center px-3 py-1.5 text-xs font-medium text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors">
                            <RotateCcw size={14} className="mr-1.5" />
                            Reset
                        </button>
                    </div>
                </div>

                {/* Viewport */}
                <div className="flex-1 relative overflow-hidden bg-black flex items-center justify-center">
                    <div
                        ref={containerRef}
                        className="relative transition-transform duration-200 ease-out origin-center max-w-full max-h-full"
                        style={{
                            transform: `scale(${zoom}) rotate(${currentStack?.rotate || 0}deg) scaleX(${currentStack?.flipH ? -1 : 1})`,
                            filter: `brightness(${brightness}%) contrast(${contrast}%)`
                        }}
                    >
                        {/* Stack Rendering */}
                        {currentImages.map((imgSrc, index) => (
                            <img
                                key={index}
                                src={imgSrc}
                                alt={alt}
                                className="max-w-full max-h-[600px] object-contain select-none"
                                draggable={false}
                                style={{
                                    display: index === currentIndex ? 'block' : 'none'
                                }}
                            />
                        ))}
                    </div>

                    {/* Overlays */}
                    {zoom === 1 && overlays.map((overlay) => (
                        <div
                            key={overlay.id}
                            className={clsx(
                                "absolute border-2 rounded-full cursor-pointer transition-all duration-200",
                                activeOverlay === overlay.id ? "border-yellow-400 bg-yellow-400/20" : "border-white/50 hover:border-white"
                            )}
                            style={{
                                top: `${overlay.y}%`,
                                left: `${overlay.x}%`,
                                width: '24px',
                                height: '24px',
                                transform: 'translate(-50%, -50%)'
                            }}
                            onMouseEnter={() => setActiveOverlay(overlay.id)}
                            onMouseLeave={() => setActiveOverlay(null)}
                        >
                            {activeOverlay === overlay.id && (
                                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-black/80 text-white text-xs rounded whitespace-nowrap pointer-events-none z-10 border border-gray-700">
                                    {overlay.label}
                                </div>
                            )}
                        </div>
                    ))}

                    {/* HUD / Info Overlay */}
                    <div className="absolute top-4 right-4 flex flex-col items-end pointer-events-none space-y-1">
                        {activeStackIndex !== -1 && (
                            <div className="bg-black/60 backdrop-blur text-white text-xs px-2 py-1 rounded border border-white/10">
                                {currentStack?.label || 'Serie'}
                            </div>
                        )}
                        {currentImages.length > 1 && (
                            <div className="bg-black/60 backdrop-blur text-indigo-400 font-mono text-xs px-2 py-1 rounded border border-white/10">
                                Img: {currentIndex + 1} / {currentImages.length}
                            </div>
                        )}
                    </div>

                    {/* Interaction Hints */}
                    {currentImages.length > 1 && (
                        <div className="absolute bottom-4 left-4 pointer-events-none opacity-50 bg-black/40 px-2 py-1 rounded text-[10px] text-white">
                            Scroll para navegar
                        </div>
                    )}

                    {/* Navigation Arrows (On Hover or Always visible on Touch) */}
                    {currentImages.length > 1 && (
                        <>
                            <button
                                onClick={handlePrev}
                                className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black/40 hover:bg-black/80 text-white p-2 rounded-full backdrop-blur transition-all"
                            >
                                <ChevronLeft size={24} />
                            </button>
                            <button
                                onClick={handleNext}
                                className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black/40 hover:bg-black/80 text-white p-2 rounded-full backdrop-blur transition-all"
                            >
                                <ChevronRight size={24} />
                            </button>
                        </>
                    )}
                </div>

                {/* Enhanced Slider (Bottom) */}
                {currentImages.length > 1 && (
                    <div className="bg-gray-900 p-2 border-t border-gray-800 flex items-center space-x-3">
                        <button onClick={handlePrev} className="text-gray-400 hover:text-white">
                            <ChevronLeft size={16} />
                        </button>

                        <div className="flex-1 relative h-6 flex items-center group">
                            <div className="absolute inset-x-0 h-1 bg-gray-700 rounded-full"></div>
                            <input
                                type="range"
                                min="0"
                                max={currentImages.length - 1}
                                value={currentIndex}
                                onChange={(e) => setCurrentIndex(Number(e.target.value))}
                                className="relative w-full h-4 opacity-0 cursor-pointer z-10"
                            />
                            <div
                                className="absolute h-1 bg-indigo-500 rounded-full"
                                style={{ width: `${(currentIndex / (currentImages.length - 1)) * 100}%` }}
                            ></div>
                            <div
                                className="absolute h-3 w-3 bg-white rounded-full shadow-lg transform -translate-y-1/2 top-1/2 transition-transform group-hover:scale-125"
                                style={{ left: `${(currentIndex / (currentImages.length - 1)) * 100}%` }}
                            ></div>
                        </div>

                        <button onClick={handleNext} className="text-gray-400 hover:text-white">
                            <ChevronRight size={16} />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ImageViewer;
