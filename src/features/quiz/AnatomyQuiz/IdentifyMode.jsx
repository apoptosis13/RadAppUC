import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, X } from 'lucide-react';

const IdentifyMode = ({ currentStructure, allStructures, onAnswer, disabled }) => {
    const { t, i18n } = useTranslation();
    const currentLang = i18n.language;

    const [input, setInput] = useState('');
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [selectedOption, setSelectedOption] = useState(null);

    // Draggable State
    const [position, setPosition] = useState({ x: 0, y: 0 }); // Offset from center
    const isDragging = useRef(false);
    const dragStart = useRef({ x: 0, y: 0 });
    const modalRef = useRef(null);

    // Reset input on question change
    useEffect(() => {
        setInput('');
        setSelectedOption(null);
        setShowSuggestions(false);
    }, [currentStructure?.id]);

    const handleMouseDown = (e) => {
        // Prevent drag if interacting with input or button
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON') return;

        isDragging.current = true;
        dragStart.current = { x: e.clientX - position.x, y: e.clientY - position.y };

        // Add global listeners
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
    };

    const handleMouseMove = (e) => {
        if (!isDragging.current) return;
        setPosition({
            x: e.clientX - dragStart.current.x,
            y: e.clientY - dragStart.current.y
        });
    };

    const handleMouseUp = () => {
        isDragging.current = false;
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
    };

    // Cleanup
    useEffect(() => {
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, []);

    // Filter unique labels for autocomplete
    const options = useMemo(() => {
        const uniqueLabels = new Set();
        allStructures.forEach(s => {
            const label = (currentLang === 'en' && s.labelEn) ? s.labelEn : s.label;
            if (label) uniqueLabels.add(label);
        });
        return Array.from(uniqueLabels).sort();
    }, [allStructures, currentLang]);

    // Helper: Normalize text for flexible matching (case, accents, punctuation)
    const normalizeText = (text) => {
        if (!text) return '';
        return text
            .toString()
            .toLowerCase()
            .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Remove accents
            .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "") // Remove punctuation
            .replace(/\s{2,}/g, " ") // Remove extra spaces
            .trim();
    };

    const filteredOptions = useMemo(() => {
        if (!input.trim()) return [];
        const normalizedInput = normalizeText(input);

        const matches = options.filter(opt =>
            normalizeText(opt).includes(normalizedInput)
        );

        return matches.slice(0, 5); // Limit to 5 suggestions
    }, [input, options]);

    const handleSubmit = () => {
        if (!selectedOption && !input) return;

        const answer = selectedOption || input;
        const correctLabel = (currentLang === 'en' && currentStructure.labelEn) ? currentStructure.labelEn : currentStructure.label;

        // Flexible comparison
        const isCorrect = normalizeText(answer) === normalizeText(correctLabel);

        // Pass original answer for display, but logic uses normalized comparison
        onAnswer(isCorrect, answer);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            if (filteredOptions.length > 0 && showSuggestions) {
                // Select first suggestion if visible
                handleSelect(filteredOptions[0]);
            } else {
                handleSubmit();
            }
        }
    };

    const handleSelect = (opt) => {
        setInput(opt);
        setSelectedOption(opt);
        setShowSuggestions(false);
    };

    return (
        <div
            ref={modalRef}
            onMouseDown={handleMouseDown}
            style={{
                transform: `translate(${position.x}px, ${position.y}px)`,
                cursor: 'move',
                touchAction: 'none' // Prevent scrolling on touch
            }}
            className="w-full max-w-md mx-auto bg-gray-900/90 backdrop-blur-sm p-6 rounded-xl border border-gray-700 shadow-2xl animate-in fade-in slide-in-from-bottom-4 transition-shadow hover:shadow-indigo-500/20"
        >
            <h3 className="text-xl font-bold text-white mb-4 text-center select-none cursor-move">
                {t('quiz.identifyQuestion', '¿Qué estructura está señalada?')}
            </h3>

            <div className="relative mb-4">
                <input
                    type="text"
                    value={input}
                    onChange={(e) => {
                        setInput(e.target.value);
                        setSelectedOption(null);
                        setShowSuggestions(true);
                    }}
                    onFocus={() => setShowSuggestions(true)}
                    /* onBlur={() => setTimeout(() => setShowSuggestions(false), 200)} */ // Delay to allow click
                    onKeyDown={handleKeyDown}
                    disabled={disabled}
                    placeholder={t('quiz.typeStructure', 'Escribe el nombre de la estructura...')}
                    className="w-full bg-gray-800 text-white border border-gray-600 rounded-lg px-4 py-3 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all placeholder-gray-500"
                    autoFocus
                />

                {showSuggestions && filteredOptions.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-xl max-h-48 overflow-y-auto ring-1 ring-black/50">
                        {filteredOptions.map((opt, idx) => (
                            <button
                                key={idx}
                                onClick={() => handleSelect(opt)}
                                className="w-full text-left px-4 py-2 text-gray-100 bg-gray-800 hover:bg-indigo-600 hover:text-white transition-colors border-b border-gray-700 last:border-0"
                            >
                                {opt}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            <button
                onClick={handleSubmit}
                disabled={disabled || (!input && !selectedOption)}
                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-bold py-3 rounded-lg transition-all transform active:scale-95 flex justify-center items-center"
            >
                {t('quiz.submit', 'Confirmar')}
            </button>



        </div>
    );
};

export default IdentifyMode;
