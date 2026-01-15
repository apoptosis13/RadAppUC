import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, Move } from 'lucide-react';

const LocateMode = ({ currentStructure }) => {
    const { t, i18n } = useTranslation();
    const currentLang = i18n.language;

    const label = (currentLang === 'en' && currentStructure.labelEn) ? currentStructure.labelEn : currentStructure.label;

    // --- Drag Logic ---
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const dragOffset = useRef({ x: 0, y: 0 });

    const handleMouseDown = (e) => {
        setIsDragging(true);
        // Calculate offset (mouse pos relative to element top-left)
        // If element is transformed, we need to account for that usually, but here we just track delta
        // Simpler approach: record initial mouse pos and initial element pos?
        // Or just let it jump to center?
        // Let's rely on event.clientX

        // Better approach for smooth drag without jumping:
        // Get current element rect NOT needed if we just use relative movement.
        // Actually, we are using transform translate.

        dragOffset.current = {
            x: e.clientX - position.x,
            y: e.clientY - position.y
        };
    };

    useEffect(() => {
        const handleMouseMove = (e) => {
            if (!isDragging) return;
            e.preventDefault(); // Stop selection etc

            setPosition({
                x: e.clientX - dragOffset.current.x,
                y: e.clientY - dragOffset.current.y
            });
        };

        const handleMouseUp = () => {
            setIsDragging(false);
        };

        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging]);


    return (
        <div
            className="fixed pointer-events-auto cursor-grab active:cursor-grabbing z-50 transition-shadow hover:shadow-2xl"
            style={{
                left: '50%',
                bottom: '100px',
                transform: `translate(calc(-50% + ${position.x}px), ${position.y}px)`
            }}
            onMouseDown={handleMouseDown}
        >
            <div className="bg-gray-900/90 backdrop-blur-sm p-6 rounded-xl border border-gray-700 shadow-2xl animate-in fade-in slide-in-from-bottom-4 text-center max-w-md w-full relative group">

                {/* Drag Handle Intimation */}
                <div className="absolute top-2 right-2 text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Move className="w-4 h-4" />
                </div>

                <div className="flex justify-center mb-3">
                    <div className="bg-indigo-600/20 p-3 rounded-full border border-indigo-500/30">
                        <Search className="w-8 h-8 text-indigo-400" />
                    </div>
                </div>
                <h3 className="text-gray-400 font-medium mb-1 uppercase tracking-wider text-sm select-none">
                    {t('quiz.locateInstruction', 'Localiza la estructura:')}
                </h3>
                <h2 className="text-2xl font-bold text-white mb-2 select-none">
                    {label}
                </h2>
                <p className="text-indigo-300 text-xs animate-pulse select-none">
                    {t('quiz.clickToAnswer', 'Haz clic en la imagen')}
                </p>
            </div>
        </div>
    );
};

export default LocateMode;
