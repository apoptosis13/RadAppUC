import React, { useState, useEffect, useCallback } from 'react';
import { caseService } from '../../../services/caseService';
import { Save, X, Upload, Plus, Trash2, Layers, Image as ImageIcon, RotateCw, FlipHorizontal, ArrowUpDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const StackEditor = React.memo(({ stack, updateStackLabel, rotateStack, flipStack, invertStackOrder, handleImageUpload, removeStack, removeImage }) => {
    const [currentIndex, setCurrentIndex] = useState(0);

    // Reset index if out of bounds (e.g. after deletion)
    useEffect(() => {
        if (currentIndex >= stack.images.length && stack.images.length > 0) {
            setCurrentIndex(stack.images.length - 1);
        }
    }, [stack.images.length]);

    // Preload images for smooth scrolling
    useEffect(() => {
        if (!stack.images || stack.images.length === 0) return;

        // Prioritize current, next, and previous images
        const priorityIndices = [
            currentIndex,
            currentIndex + 1 < stack.images.length ? currentIndex + 1 : 0,
            currentIndex - 1 >= 0 ? currentIndex - 1 : stack.images.length - 1
        ];

        priorityIndices.forEach(idx => {
            const img = new Image();
            img.src = stack.images[idx];
        });

        // Then preload the rest in background
        const timeoutId = setTimeout(() => {
            stack.images.forEach((src, idx) => {
                if (!priorityIndices.includes(idx)) {
                    const img = new Image();
                    img.src = src;
                }
            });
        }, 500);

        return () => clearTimeout(timeoutId);
    }, [stack.images, currentIndex]);

    const handlePrev = useCallback(() => setCurrentIndex(prev => (prev === 0 ? stack.images.length - 1 : prev - 1)), [stack.images.length]);
    const handleNext = useCallback(() => setCurrentIndex(prev => (prev === stack.images.length - 1 ? 0 : prev + 1)), [stack.images.length]);

    return (
        <div className="border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 p-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-3 gap-3">
                <div className="flex-1 w-full sm:w-auto mr-4">
                    <input
                        type="text"
                        value={stack.label}
                        onChange={(e) => updateStackLabel(stack.id, e.target.value)}
                        className="block w-full text-sm font-medium border-0 border-b border-gray-200 focus:ring-0 focus:border-indigo-500 bg-transparent px-0"
                        placeholder="Nombre de la Serie (ej. Axial T2)"
                    />
                </div>
                <div className="flex items-center space-x-2 bg-gray-50 dark:bg-gray-700/50 p-1.5 rounded-md self-end sm:self-auto">
                    <button type="button" onClick={() => rotateStack(stack.id)} className="text-gray-500 hover:text-indigo-600 p-1" title="Rotar 90°">
                        <RotateCw size={16} />
                    </button>
                    <button type="button" onClick={() => flipStack(stack.id)} className={`text-gray-500 hover:text-indigo-600 p-1 ${stack.flipH ? 'text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30' : ''}`} title="Voltear Horizontal">
                        <FlipHorizontal size={16} />
                    </button>
                    <div className="w-px h-4 bg-gray-300 dark:bg-gray-600 mx-1"></div>
                    <button type="button" onClick={() => invertStackOrder(stack.id)} className="text-gray-500 hover:text-indigo-600 p-1" title="Invertir Orden Imágenes">
                        <ArrowUpDown size={16} />
                    </button>
                </div>
                <div className="flex items-center space-x-2 self-end sm:self-auto">
                    <button type="button" onClick={() => removeStack(stack.id)} className="text-red-400 hover:text-red-500 p-1">
                        <Trash2 size={16} />
                    </button>
                </div>
            </div>

            {/* Player View */}
            {stack.images.length === 0 ? (
                <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-lg text-sm text-gray-500 flex flex-col items-center justify-center">
                    <ImageIcon className="w-8 h-8 text-gray-300 mb-2" />
                    <span>Arrastra imágenes o usa "+ Añadir imágenes"</span>
                    <label className="mt-4 cursor-pointer inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700">
                        <Plus className="w-4 h-4 mr-1.5" />
                        Añadir Imágenes
                        <input type="file" className="hidden" accept="image/*" multiple onChange={(e) => handleImageUpload(e, stack.id)} />
                    </label>
                </div>
            ) : (
                <div className="bg-black rounded-lg overflow-hidden relative shadow-inner">
                    <div className="relative w-full h-80 flex items-center justify-center bg-gray-900">
                        <div
                            className="relative max-h-full max-w-full"
                            style={{
                                transform: `rotate(${stack.rotate || 0}deg) scaleX(${stack.flipH ? -1 : 1})`,
                                transition: 'transform 0.3s ease'
                            }}
                        >
                            <img
                                src={stack.images[currentIndex]}
                                className="max-h-80 object-contain" // Fixed height for consistency
                                alt={`Slice ${currentIndex + 1}`}
                            />
                        </div>
                        {/* Overlay Controls */}
                        <button
                            onClick={() => removeImage(currentIndex, stack.id)}
                            className="absolute top-2 right-2 p-1.5 bg-red-600/80 hover:bg-red-600 text-white rounded-full transition-colors z-20"
                            title="Eliminar esta imagen"
                        >
                            <Trash2 size={14} />
                        </button>
                        <div className="absolute top-2 left-2 px-2 py-1 bg-black/60 text-white text-xs rounded font-mono z-20 pointer-events-none">
                            {currentIndex + 1} / {stack.images.length}
                        </div>
                    </div>

                    {/* Navigation Slider Bar */}
                    <div className="bg-gray-800 p-3 flex items-center space-x-4 border-t border-gray-700">
                        <button
                            onClick={handlePrev}
                            className="p-1 rounded-full hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
                        >
                            <ChevronLeft size={20} />
                        </button>

                        <div className="flex-1 flex items-center space-x-3">
                            <input
                                type="range"
                                min="0"
                                max={stack.images.length - 1}
                                value={currentIndex}
                                onChange={(e) => setCurrentIndex(Number(e.target.value))}
                                className="flex-1 h-1.5 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                            />
                        </div>

                        <button
                            onClick={handleNext}
                            className="p-1 rounded-full hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
                        >
                            <ChevronRight size={20} />
                        </button>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-900/50 px-4 py-2 border-t border-gray-200 dark:border-gray-700 flex justify-end">
                        <label className="cursor-pointer text-xs text-indigo-600 hover:text-indigo-500 font-medium flex items-center">
                            <Plus className="w-3 h-3 mr-1" />
                            Añadir más imágenes al final
                            <input type="file" className="hidden" accept="image/*" multiple onChange={(e) => handleImageUpload(e, stack.id)} />
                        </label>
                    </div>
                </div>
            )}
        </div>
    );
});

const CaseEditor = ({ caseId, onCancel, onSuccess }) => {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(!!caseId);
    const [formData, setFormData] = useState({
        title: '',
        title_en: '',
        modality: 'X-Ray',
        difficulty: 'Beginner',
        history: '',
        history_en: '',
        images: [],
        imageStacks: [], // [{ id, label, images: [] }]
        correctDiagnosis: '',
        correctDiagnosis_en: '',
        diagnosisAliases: [],
        caseComments: '',
        questions: [{ text: '', options: ['', '', '', ''], correctAnswer: 0 }],
        questions_en: [{ text: '', options: ['', '', '', ''], correctAnswer: 0 }],
        learningObjectives: ['', '', ''],
        learningObjectives_en: ['', '', ''],
        hideManualQuestions: false
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [newAlias, setNewAlias] = useState('');
    const [activeStackId, setActiveStackId] = useState(null); // 'main' or stack ID

    useEffect(() => {
        if (caseId) {
            loadCase();
        } else {
            setLoading(false);
        }
    }, [caseId]);

    const loadCase = async () => {
        try {
            const caseItem = await caseService.getCaseById(caseId);
            if (caseItem) {
                // Normalization
                const data = { ...caseItem };
                if (!data.images) data.images = data.image ? [data.image] : [];
                if (!data.imageStacks) data.imageStacks = [];
                if (!data.questions) data.questions = [{ text: '', options: ['', '', '', ''], correctAnswer: 0 }];
                if (!data.learningObjectives) data.learningObjectives = ['', '', ''];
                if (data.hideManualQuestions === undefined) data.hideManualQuestions = false;

                // Ensure English fields exist
                if (!data.title_en) data.title_en = '';
                if (!data.history_en) data.history_en = '';
                if (!data.correctDiagnosis_en) data.correctDiagnosis_en = '';


                setFormData(data);
            }
        } catch (error) {
            console.error("Error loading case:", error);
            alert("Error loading case");
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    // --- Image Handling (Single & Stack) ---
    const compressImage = (file) => {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (event) => {
                const img = new Image();
                img.src = event.target.result;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const MAX_WIDTH = 800;
                    const scaleSize = MAX_WIDTH / img.width;
                    if (img.width > MAX_WIDTH) {
                        canvas.width = MAX_WIDTH;
                        canvas.height = img.height * scaleSize;
                    } else {
                        canvas.width = img.width;
                        canvas.height = img.height;
                    }
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                    resolve(canvas.toDataURL('image/jpeg', 0.7));
                };
            };
        });
    };

    const handleImageUpload = async (e, stackId = null) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        setIsSubmitting(true); // Re-using state to block interactions
        try {
            const compressedImages = await Promise.all(files.map(file => compressImage(file)));

            if (stackId) {
                setFormData(prev => ({
                    ...prev,
                    imageStacks: prev.imageStacks.map(s =>
                        s.id === stackId ? { ...s, images: [...s.images, ...compressedImages] } : s
                    )
                }));
            } else {
                setFormData(prev => ({
                    ...prev,
                    images: [...prev.images, ...compressedImages]
                }));
            }
        } catch (error) {
            console.error("Error compressing images", error);
            alert("Error processing images");
        } finally {
            setIsSubmitting(false);
        }
    };

    const removeImage = (index, stackId = null) => {
        if (stackId) {
            setFormData(prev => ({
                ...prev,
                imageStacks: prev.imageStacks.map(s =>
                    s.id === stackId ? { ...s, images: s.images.filter((_, i) => i !== index) } : s
                )
            }));
        } else {
            setFormData(prev => ({
                ...prev,
                images: prev.images.filter((_, i) => i !== index)
            }));
        }
    };

    // --- Stack Management ---
    const addStack = () => {
        const newStack = {
            id: Date.now().toString(),
            label: `Nueva Serie ${formData.imageStacks.length + 1}`,
            images: [],
            rotate: 0,
            flipH: false
        };
        setFormData(prev => ({
            ...prev,
            imageStacks: [...prev.imageStacks, newStack]
        }));
    };

    const removeStack = (stackId) => {
        if (window.confirm("¿Eliminar esta serie y sus imágenes?")) {
            setFormData(prev => ({
                ...prev,
                imageStacks: prev.imageStacks.filter(s => s.id !== stackId)
            }));
        }
    };

    const updateStackLabel = (stackId, label) => {
        setFormData(prev => ({
            ...prev,
            imageStacks: prev.imageStacks.map(s => s.id === stackId ? { ...s, label } : s)
        }));
    };

    // --- Stack Enhancements (Rotate, Flip, Invert) ---
    const invertStackOrder = (stackId) => {
        if (!window.confirm("¿Invertir el orden de las imágenes en esta serie?")) return;
        setFormData(prev => ({
            ...prev,
            imageStacks: prev.imageStacks.map(s =>
                s.id === stackId ? { ...s, images: [...s.images].reverse() } : s
            )
        }));
    };

    const rotateStack = (stackId) => {
        setFormData(prev => ({
            ...prev,
            imageStacks: prev.imageStacks.map(s =>
                s.id === stackId ? { ...s, rotate: ((s.rotate || 0) + 90) % 360 } : s
            )
        }));
    };

    const flipStack = (stackId) => {
        setFormData(prev => ({
            ...prev,
            imageStacks: prev.imageStacks.map(s =>
                s.id === stackId ? { ...s, flipH: !(s.flipH || false) } : s
            )
        }));
    };


    // --- Generic Array Handlers ---
    const handleArrayChange = (arrayName, index, field, value) => {
        setFormData(prev => {
            const newArray = [...(prev[arrayName] || [])];
            // Ensure object/item exists is a bit complex generically, handled per specific array
            // Simpler to just special case questions vs objectives
            return prev;
        });
    };

    // Questions
    const handleAddQuestion = () => {
        setFormData(prev => ({
            ...prev,
            questions: [...prev.questions, { text: '', options: ['', '', '', ''], correctAnswer: 0 }],
            questions_en: [...(prev.questions_en || []), { text: '', options: ['', '', '', ''], correctAnswer: 0 }]
        }));
    };

    const handleRemoveQuestion = (index) => {
        setFormData(prev => ({
            ...prev,
            questions: prev.questions.filter((_, i) => i !== index),
            questions_en: (prev.questions_en || []).filter((_, i) => i !== index)
        }));
    };

    const handleQuestionChange = (index, field, value, lang = 'es') => {
        const key = lang === 'en' ? 'questions_en' : 'questions';
        setFormData(prev => {
            const arr = [...(prev[key] || [])];
            if (!arr[index]) arr[index] = { text: '', options: ['', '', '', ''], correctAnswer: 0 };
            arr[index] = { ...arr[index], [field]: value };
            return { ...prev, [key]: arr };
        });
    };

    const handleOptionChange = (qIndex, oIndex, value, lang = 'es') => {
        const key = lang === 'en' ? 'questions_en' : 'questions';
        setFormData(prev => {
            const arr = [...(prev[key] || [])];
            if (!arr[qIndex]) arr[qIndex] = { text: '', options: ['', '', '', ''], correctAnswer: 0 };
            const newOpts = [...(arr[qIndex].options || ['', '', '', ''])];
            newOpts[oIndex] = value;
            arr[qIndex] = { ...arr[qIndex], options: newOpts };
            return { ...prev, [key]: arr };
        });
    };

    // Objectives
    const handleObjectiveChange = (index, value, lang = 'es') => {
        const key = lang === 'en' ? 'learningObjectives_en' : 'learningObjectives';
        setFormData(prev => {
            const arr = [...(prev[key] || ['', '', ''])];
            arr[index] = value;
            return { ...prev, [key]: arr };
        });
    };

    // Aliases
    const handleAddAlias = () => {
        if (!newAlias.trim()) return;
        setFormData(prev => ({
            ...prev,
            diagnosisAliases: [...(prev.diagnosisAliases || []), newAlias.trim()]
        }));
        setNewAlias('');
    };

    const handleRemoveAlias = (index) => {
        setFormData(prev => ({
            ...prev,
            diagnosisAliases: prev.diagnosisAliases.filter((_, i) => i !== index)
        }));
    };


    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            if (caseId) {
                await caseService.updateCase({ ...formData, id: caseId });
            } else {
                await caseService.addCase(formData);
            }
            onSuccess();
        } catch (error) {
            console.error("Submit error:", error);
            alert("Error saving case");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) return <div className="p-10 text-center">Cargando caso...</div>;

    return (
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex justify-between items-center sticky top-0 z-20">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                    {caseId ? 'Editar Caso' : 'Nuevo Caso'}
                </h2>
                <div className="flex items-center space-x-3">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    >
                        <X size={24} />
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
                    >
                        <Save className="mr-2 h-4 w-4" />
                        Guardar
                    </button>
                </div>
            </div>

            <form className="p-6 space-y-8">

                {/* --- BASIC INFO --- */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Título</label>
                        <input type="text" name="title" value={formData.title} onChange={handleChange} required
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Title (English)</label>
                        <input type="text" name="title_en" value={formData.title_en} onChange={handleChange}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Diagnóstico Correcto</label>
                        <input type="text" name="correctDiagnosis" value={formData.correctDiagnosis} onChange={handleChange} required
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Diagnosis (English)</label>
                        <input type="text" name="correctDiagnosis_en" value={formData.correctDiagnosis_en} onChange={handleChange}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                    </div>

                    <div className="col-span-1 md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Diagnósticos Alternativos (Sinónimos aceptados)
                        </label>
                        <div className="space-y-2 mb-2">
                            {(formData.diagnosisAliases || []).map((alias, index) => (
                                <div key={index} className="flex items-center justify-between bg-gray-50 dark:bg-gray-700 p-2 rounded border border-gray-200 dark:border-gray-600">
                                    <span className="text-sm text-gray-700 dark:text-gray-300">{alias}</span>
                                    <button
                                        type="button"
                                        onClick={() => handleRemoveAlias(index)}
                                        className="text-red-500 hover:text-red-700 text-sm"
                                    >
                                        Eliminar
                                    </button>
                                </div>
                            ))}
                        </div>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={newAlias}
                                onChange={(e) => setNewAlias(e.target.value)}
                                placeholder="Agregar variante aceptada (ej. 'Desgarro menisco')"
                                className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        handleAddAlias();
                                    }
                                }}
                            />
                            <button
                                type="button"
                                onClick={handleAddAlias}
                                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                            >
                                Agregar
                            </button>
                        </div>
                        <p className="mt-1 text-xs text-gray-500">
                            Agrega variantes en español o inglés que también deban considerarse correctas.
                        </p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Modalidad</label>
                        <select name="modality" value={formData.modality} onChange={handleChange}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                            <option value="X-Ray">X-Ray</option>
                            <option value="CT">CT</option>
                            <option value="MRI">MRI</option>
                            <option value="Ultrasound">Ultrasound</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Dificultad</label>
                        <select name="difficulty" value={formData.difficulty} onChange={handleChange}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                            <option value="Beginner">Beginner</option>
                            <option value="Intermediate">Intermediate</option>
                            <option value="Advanced">Advanced</option>
                        </select>
                    </div>

                    <div className="col-span-2">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Historia Clínica</label>
                        <textarea name="history" rows={2} value={formData.history} onChange={handleChange} required
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                    </div>
                </div>

                {/* --- IMAGE SERIES MANAGER --- */}
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-5 bg-gray-50 dark:bg-gray-800/50">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white flex items-center">
                            <Layers className="w-5 h-5 mr-2 text-indigo-500" />
                            Gestor de Imágenes y Series
                        </h3>
                        <div className="flex space-x-2">
                            <label className="cursor-pointer inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                                <ImageIcon className="w-4 h-4 mr-1.5" />
                                + Imagen
                                <input type="file" className="hidden" accept="image/*" multiple onChange={(e) => handleImageUpload(e)} disabled={isSubmitting} />
                            </label>
                            <button type="button" onClick={addStack} className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700">
                                <Plus className="w-4 h-4 mr-1.5" />
                                + Serie
                            </button>
                        </div>
                    </div>

                    {/* Loose Images */}
                    {formData.images.length > 0 && (
                        <div className="mb-6">
                            <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-2">Imágenes Individuales</h4>
                            <div className="flex overflow-x-auto gap-4 pb-2">
                                {formData.images.map((img, idx) => (
                                    <div key={idx} className="relative flex-shrink-0 w-32 h-32 group">
                                        <img src={img} className="w-full h-full object-cover rounded-md border border-gray-300" />
                                        <button type="button" onClick={() => removeImage(idx)} className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                                            <X size={14} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Stacks */}
                    <div className="space-y-4">
                        {formData.imageStacks.map((stack) => (
                            <StackEditor
                                key={stack.id}
                                stack={stack}
                                updateStackLabel={updateStackLabel}
                                rotateStack={rotateStack}
                                flipStack={flipStack}
                                invertStackOrder={invertStackOrder}
                                handleImageUpload={handleImageUpload}
                                removeStack={removeStack}
                                removeImage={removeImage}
                            />
                        ))}
                    </div>
                </div>

                {/* --- TOGGLES & COMMENTS --- */}
                <div className="grid grid-cols-1 gap-6">
                    <div className="flex items-center justify-between bg-indigo-50 dark:bg-indigo-900/30 p-4 rounded-lg">
                        <div>
                            <h4 className="text-sm font-medium text-gray-900 dark:text-white">Quiz IA Exclusivo</h4>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Oculta las preguntas manuales en el visualizador.</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" name="hideManualQuestions" checked={formData.hideManualQuestions} onChange={handleChange} className="sr-only peer" />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600"></div>
                        </label>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Comentarios (Post-resolución)</label>
                        <textarea name="caseComments" rows={2} value={formData.caseComments} onChange={handleChange}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                    </div>
                </div>

                {/* --- MANUAL QUESTIONS --- */}
                <div className="border-t pt-6">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white">Preguntas Manuales</h3>
                        <button type="button" onClick={handleAddQuestion} className="text-indigo-600 hover:text-indigo-500 text-sm font-medium">
                            + Añadir Pregunta
                        </button>
                    </div>

                    <div className="space-y-6">
                        {formData.questions.map((q, i) => (
                            <div key={i} className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg border border-gray-200 dark:border-gray-700 relative">
                                <button type="button" onClick={() => handleRemoveQuestion(i)} className="absolute top-2 right-2 text-gray-400 hover:text-red-500">
                                    <X size={16} />
                                </button>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-semibold uppercase text-gray-500 mb-1">Español</label>
                                        <input type="text" value={q.text} onChange={(e) => handleQuestionChange(i, 'text', e.target.value)} placeholder="Pregunta..."
                                            className="block w-full rounded-md border-gray-300 shadow-sm text-sm p-2 border mb-2" />
                                        {q.options.map((opt, oid) => (
                                            <div key={oid} className="flex items-center space-x-2 mb-1">
                                                <input type="radio" checked={parseInt(q.correctAnswer) === oid} onChange={() => handleQuestionChange(i, 'correctAnswer', oid)} />
                                                <input type="text" value={opt} onChange={(e) => handleOptionChange(i, oid, e.target.value)} placeholder={`Opción ${oid + 1}`}
                                                    className="block w-full text-xs border-gray-300 rounded p-1" />
                                            </div>
                                        ))}
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold uppercase text-gray-500 mb-1">English (Translation)</label>
                                        <input type="text" value={formData.questions_en?.[i]?.text || ''} onChange={(e) => handleQuestionChange(i, 'text', e.target.value, 'en')} placeholder="Question..."
                                            className="block w-full rounded-md border-gray-300 shadow-sm text-sm p-2 border mb-2" />
                                        {(formData.questions_en?.[i]?.options || ['', '', '', '']).map((opt, oid) => (
                                            <div key={oid} className="flex items-center space-x-2 mb-1 pl-5">
                                                <input type="text" value={opt} onChange={(e) => handleOptionChange(i, oid, e.target.value, 'en')} placeholder={`Option ${oid + 1}`}
                                                    className="block w-full text-xs border-gray-300 rounded p-1" />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

            </form>
        </div>
    );
};

export default CaseEditor;
