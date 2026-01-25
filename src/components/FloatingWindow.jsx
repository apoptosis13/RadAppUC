import React, { useState, useRef, useEffect } from 'react';
import { X, Maximize2, Minimize2, GripHorizontal, Scaling } from 'lucide-react';

const FloatingWindow = ({ title, children, onClose, isOpen = true }) => {
    const [position, setPosition] = useState({ x: 100, y: 100 });
    const [size, setSize] = useState({ width: 500, height: 600 });

    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

    const [isResizing, setIsResizing] = useState(false);
    const [resizeStart, setResizeStart] = useState({ x: 0, y: 0 });
    const [startSize, setStartSize] = useState({ width: 0, height: 0 });

    const [isMinimized, setIsMinimized] = useState(false);

    // Constraints
    const windowRef = useRef(null);

    // --- Dragging Logic ---
    const handleMouseDown = (e) => {
        if (e.target.closest('.no-drag')) return;
        setIsDragging(true);
        setDragOffset({
            x: e.clientX - position.x,
            y: e.clientY - position.y
        });
    };

    // --- Resizing Logic ---
    const handleResizeMouseDown = (e) => {
        e.stopPropagation(); // Don't trigger drag
        setIsResizing(true);
        setResizeStart({ x: e.clientX, y: e.clientY });
        setStartSize({ width: size.width, height: size.height });
    };

    const handleMouseMove = (e) => {
        if (isDragging) {
            e.preventDefault();
            setPosition({
                x: e.clientX - dragOffset.x,
                y: e.clientY - dragOffset.y
            });
        }
        if (isResizing) {
            e.preventDefault();
            const deltaX = e.clientX - resizeStart.x;
            const deltaY = e.clientY - resizeStart.y;

            setSize({
                width: Math.max(300, startSize.width + deltaX),
                height: Math.max(200, startSize.height + deltaY)
            });
        }
    };

    const handleMouseUp = () => {
        setIsDragging(false);
        setIsResizing(false);
    };

    useEffect(() => {
        if (isDragging || isResizing) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        } else {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        }
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, isResizing]);

    if (!isOpen) return null;

    return (
        <div
            ref={windowRef}
            style={{
                top: position.y,
                left: position.x,
                width: isMinimized ? 'auto' : size.width,
                height: isMinimized ? 'auto' : size.height,
                position: 'fixed',
                zIndex: 50
            }}
            className={`flex flex-col bg-gray-900 border border-gray-700 rounded-lg shadow-2xl overflow-hidden max-w-[95vw] max-h-[95vh] ${isResizing ? 'select-none' : ''}`}
        >
            {/* Header / Drag Handle */}
            <div
                onMouseDown={handleMouseDown}
                className={`bg-gray-800 p-2 flex items-center justify-between cursor-move select-none border-b border-gray-700 ${isDragging ? 'cursor-grabbing' : ''}`}
            >
                <div className="flex items-center space-x-2 text-gray-300">
                    <GripHorizontal size={16} />
                    <span className="text-xs font-bold uppercase tracking-wider">{title}</span>
                </div>
                <div className="flex items-center space-x-2 no-drag">
                    <button
                        onClick={() => setIsMinimized(!isMinimized)}
                        className="p-1 hover:bg-gray-700 rounded text-gray-400 hover:text-white"
                        title={isMinimized ? "Restaurar" : "Minimizar"}
                    >
                        {isMinimized ? <Maximize2 size={14} /> : <Minimize2 size={14} />}
                    </button>
                    {onClose && (
                        <button
                            onClick={onClose}
                            className="p-1 hover:bg-red-900/50 rounded text-gray-400 hover:text-red-400"
                        >
                            <X size={14} />
                        </button>
                    )}
                </div>
            </div>

            {/* Content */}
            {!isMinimized && (
                <>
                    <div className="flex-1 overflow-auto bg-gray-900 p-0 relative">
                        {children}
                    </div>

                    {/* Resize Handle */}
                    <div
                        onMouseDown={handleResizeMouseDown}
                        className="absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize z-50 flex items-center justify-center opacity-50 hover:opacity-100 no-drag bg-gray-800 rounded-tl"
                    >
                        <Scaling size={10} className="text-gray-400 transform rotate-90" />
                    </div>
                </>
            )}
        </div>
    );
};

export default FloatingWindow;
