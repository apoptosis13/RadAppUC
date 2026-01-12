import React, { useState } from 'react';
import clsx from 'clsx';
import { ZoomIn, ZoomOut, Sun, Contrast, RotateCcw, ChevronLeft, ChevronRight, MousePointer2 } from 'lucide-react';

// ... imports

const ImageViewer = ({ images = [], alt, overlays = [] }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [zoom, setZoom] = useState(1);
    const [brightness, setBrightness] = useState(100);
    const [contrast, setContrast] = useState(100);
    const [activeOverlay, setActiveOverlay] = useState(null);

    // Preload images for smooth scrolling
    React.useEffect(() => {
        if (images.length > 0) {
            images.forEach(src => {
                const img = new Image();
                img.src = src;
            });
        }
    }, [images]);

    // Use ref for the image container to attach non-passive listener
    const containerRef = React.useRef(null);

    // Handle wheel with non-passive listener to prevent default page scroll
    React.useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const handleWheel = (e) => {
            if (images.length <= 1) return;

            // Prevent default page scrolling
            e.preventDefault();
            e.stopPropagation();

            const direction = e.deltaY > 0 ? 1 : -1;
            setCurrentIndex(prev => {
                const next = prev + direction;
                if (next >= 0 && next < images.length) return next;
                return prev;
            });
        };

        // Attach with passive: false to ensure we can preventDefault
        container.addEventListener('wheel', handleWheel, { passive: false });

        return () => {
            container.removeEventListener('wheel', handleWheel);
        };
    }, [images.length]);

    const handlePrev = () => setCurrentIndex(prev => (prev === 0 ? images.length - 1 : prev - 1));
    const handleNext = () => setCurrentIndex(prev => (prev === images.length - 1 ? 0 : prev + 1));

    const resetTools = () => {
        setZoom(1);
        setBrightness(100);
        setContrast(100);
        setCurrentIndex(0);
    };

    // Ensure index is valid
    if (currentIndex >= images.length && images.length > 0) setCurrentIndex(0);
    if (!images.length) return <div className="bg-gray-200 h-64 flex items-center justify-center">No Image Available</div>;

    return (
        <div className="space-y-4">
            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-4 p-2 bg-gray-100 rounded-lg text-gray-700">
                <div className="flex items-center space-x-2">
                    <button onClick={() => setZoom(z => Math.max(1, z - 0.1))} className="p-1 hover:bg-gray-200 rounded" title="Zoom Out">
                        <ZoomOut size={20} />
                    </button>
                    <span className="text-xs w-8 text-center font-medium">{Math.round(zoom * 100)}%</span>
                    <button onClick={() => setZoom(z => Math.min(3, z + 0.1))} className="p-1 hover:bg-gray-200 rounded" title="Zoom In">
                        <ZoomIn size={20} />
                    </button>
                </div>

                <div className="h-6 w-px bg-gray-300"></div>

                <div className="flex items-center space-x-2">
                    <Sun size={20} />
                    <input
                        type="range"
                        min="50"
                        max="150"
                        value={brightness}
                        onChange={(e) => setBrightness(Number(e.target.value))}
                        className="w-24 h-2 bg-gray-300 rounded-lg appearance-none cursor-pointer accent-indigo-600 border border-gray-400"
                    />
                </div>

                <div className="flex items-center space-x-2">
                    <Contrast size={20} />
                    <input
                        type="range"
                        min="50"
                        max="150"
                        value={contrast}
                        onChange={(e) => setContrast(Number(e.target.value))}
                        className="w-24 h-2 bg-gray-300 rounded-lg appearance-none cursor-pointer accent-indigo-600 border border-gray-400"
                    />
                </div>

                <div className="ml-auto">
                    <button onClick={resetTools} className="flex items-center px-2 py-1 text-sm text-gray-600 hover:text-gray-900 transition-colors">
                        <RotateCcw size={16} className="mr-1" />
                        Reset
                    </button>
                </div>
            </div>

            {/* Image Container */}
            <div className="relative inline-block w-full overflow-hidden rounded-lg shadow-lg bg-black group">
                <div
                    ref={containerRef}
                    className="relative transition-transform duration-200 ease-out origin-center"
                    style={{
                        transform: `scale(${zoom})`,
                        filter: `brightness(${brightness}%) contrast(${contrast}%)`
                    }}
                >
                    {/* Stack Rendering: Render ALL images, toggle visibility via display */}
                    {images.map((imgSrc, index) => (
                        <img
                            key={index}
                            src={imgSrc}
                            alt={alt}
                            className="w-full h-auto"
                            style={{
                                display: index === currentIndex ? 'block' : 'none'
                            }}
                        />
                    ))}

                    {/* Overlays (only show if zoom is 1 and on correct image - assuming overlays are for index 0 or generic?) 
                        Logic check: overlays prop seems generic. If overlays are tied to specific images, structure needs change.
                        For now, assuming overlays might apply generally or logic is missing for per-image overlay.
                        Preserving existing behavior: it was applied to `currentImage`.
                    */}
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
                                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-black/80 text-white text-xs rounded whitespace-nowrap pointer-events-none z-10">
                                    {overlay.label}
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                {/* Slice Indicator */}
                {images.length > 1 && (
                    <>
                        <div className="absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded pointer-events-none z-20 font-mono border border-white/20">
                            Img: {currentIndex + 1} / {images.length}
                        </div>

                        {/* Scroll Hint */}
                        <div className="absolute top-2 left-2 bg-black/50 text-white text-xs px-2 py-1 rounded pointer-events-none z-20 flex items-center space-x-1 border border-white/20">
                            <MousePointer2 size={14} />
                            <span>Scroll</span>
                        </div>
                    </>
                )}

                {/* Navigation Arrows */}
                {images.length > 1 && (
                    <>
                        <button
                            onClick={handlePrev}
                            className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                            <ChevronLeft size={24} />
                        </button>
                        <button
                            onClick={handleNext}
                            className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                            <ChevronRight size={24} />
                        </button>

                        {/* Dots Indicator (truncate if too many?) */}
                        {images.length < 20 && (
                            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
                                {images.map((_, idx) => (
                                    <div
                                        key={idx}
                                        className={`w-2 h-2 rounded-full ${idx === currentIndex ? 'bg-white' : 'bg-white/50'}`}
                                    />
                                ))}
                            </div>
                        )}
                    </>
                )}


            </div>

            {/* Slider Navigation */}
            {images.length > 1 && (
                <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow flex items-center space-x-4 border border-gray-200 dark:border-gray-700">
                    <button
                        onClick={handlePrev}
                        className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors"
                    >
                        <ChevronLeft size={20} />
                    </button>

                    <div className="flex-1 flex items-center space-x-3">
                        <span className="text-xs text-gray-500 font-mono w-8 text-right">{currentIndex + 1}</span>
                        <input
                            type="range"
                            min="0"
                            max={images.length - 1}
                            value={currentIndex}
                            onChange={(e) => setCurrentIndex(Number(e.target.value))}
                            className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 accent-indigo-600"
                        />
                        <span className="text-xs text-gray-500 font-mono w-8">{images.length}</span>
                    </div>

                    <button
                        onClick={handleNext}
                        className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors"
                    >
                        <ChevronRight size={20} />
                    </button>
                </div>
            )}
        </div>
    );
};

export default ImageViewer;
