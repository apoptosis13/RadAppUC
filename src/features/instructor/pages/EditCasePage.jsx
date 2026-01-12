import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { caseService } from '../../../services/caseService';
import { Save, ArrowLeft, X, Upload, Plus, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const EditCasePage = () => {
    const { caseId: id } = useParams();
    const navigate = useNavigate();
    const { t } = useTranslation();
    const [loading, setLoading] = useState(true);
    const [formData, setFormData] = useState({
        title: '',
        modality: 'X-Ray',
        difficulty: 'Beginner',
        history: '',
        images: [],
        correctDiagnosis: '',
        correctDiagnosis_en: '',
        caseComments: '',
        diagnosisAliases: [],
        questions: [],
        learningObjectives: ['', '', ''],
        learningObjectives_en: ['', '', '']
    });
    const [isCompressing, setIsCompressing] = useState(false);
    const [error, setError] = useState(null);
    const [newAlias, setNewAlias] = useState('');

    useEffect(() => {
        const fetchCase = async () => {
            try {
                const caseItem = await caseService.getCaseById(id);
                if (caseItem) {
                    const initialData = { ...caseItem };

                    // Ensure images array exists
                    if (!initialData.images) {
                        initialData.images = initialData.image ? [initialData.image] : [];
                    }

                    // Pre-fill fields from translation keys if actual values are missing
                    if (!initialData.title && initialData.titleKey) {
                        initialData.title = t(initialData.titleKey);
                    }
                    if (!initialData.history && initialData.historyKey) {
                        initialData.history = t(initialData.historyKey);
                    }
                    if (!initialData.correctDiagnosis && initialData.correctDiagnosisKey) {
                        initialData.correctDiagnosis = t(initialData.correctDiagnosisKey);
                    }
                    if (!initialData.caseComments) {
                        initialData.caseComments = '';
                    }

                    if (!initialData.questions || initialData.questions.length === 0) {
                        initialData.questions = [
                            { text: '', options: ['', '', '', ''], correctAnswer: 0 },
                            { text: '', options: ['', '', '', ''], correctAnswer: 0 }
                        ];
                    }

                    if (!initialData.questions_en || initialData.questions_en.length === 0) {
                        initialData.questions_en = [
                            { text: '', options: ['', '', '', ''], correctAnswer: 0 },
                            { text: '', options: ['', '', '', ''], correctAnswer: 0 }
                        ];
                    }

                    if (!initialData.learningObjectives || initialData.learningObjectives.length === 0) {
                        initialData.learningObjectives = ['', '', ''];
                    }

                    if (!initialData.learningObjectives_en || initialData.learningObjectives_en.length === 0) {
                        initialData.learningObjectives_en = ['', '', ''];
                    }

                    if (!initialData.diagnosisAliases) {
                        initialData.diagnosisAliases = [];
                    }
                    setFormData(initialData);
                } else {
                    alert(t('cases.notFound'));
                    navigate('/instructor/manage');
                }
            } catch (err) {
                console.error("Error fetching case:", err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchCase();
    }, [id, navigate, t]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const compressImage = (file) => {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (event) => {
                const img = new Image();
                img.src = event.target.result;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const MAX_WIDTH = 800; // Limit width to 800px
                    const scaleSize = MAX_WIDTH / img.width;
                    canvas.width = MAX_WIDTH;
                    canvas.height = img.height * scaleSize;

                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

                    // Compress to JPEG with 0.7 quality
                    const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
                    resolve(dataUrl);
                };
            };
        });
    };

    const handleImageUpload = async (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        setIsCompressing(true);
        try {
            const compressedImages = await Promise.all(files.map(file => compressImage(file)));
            setFormData(prev => ({
                ...prev,
                images: [...prev.images, ...compressedImages]
            }));
        } catch (error) {
            console.error("Error compressing images", error);
            alert("Error processing images");
        } finally {
            setIsCompressing(false);
        }
    };

    const removeImage = (index) => {
        setFormData(prev => ({
            ...prev,
            images: prev.images.filter((_, i) => i !== index)
        }));
    };

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

    const handleQuestionChange = (index, field, value) => {
        setFormData(prev => {
            const newQuestions = [...prev.questions];
            newQuestions[index] = { ...newQuestions[index], [field]: value };
            return { ...prev, questions: newQuestions };
        });
    };

    const handleOptionChange = (qIndex, oIndex, value) => {
        setFormData(prev => {
            const newQuestions = [...prev.questions];
            const newOptions = [...newQuestions[qIndex].options];
            newOptions[oIndex] = value;
            newQuestions[qIndex] = { ...newQuestions[qIndex], options: newOptions };
            return { ...prev, questions: newQuestions };
        });
    };

    const handleEnglishQuestionChange = (index, field, value) => {
        setFormData(prev => {
            const newQuestions = [...(prev.questions_en || [])];
            // Ensure object exists at index
            if (!newQuestions[index]) {
                newQuestions[index] = { text: '', options: ['', '', '', ''], correctAnswer: 0 };
            }
            newQuestions[index] = { ...newQuestions[index], [field]: value };
            return { ...prev, questions_en: newQuestions };
        });
    };

    const handleEnglishOptionChange = (qIndex, oIndex, value) => {
        setFormData(prev => {
            const newQuestions = [...(prev.questions_en || [])];
            // Ensure object exists at index
            if (!newQuestions[qIndex]) {
                newQuestions[qIndex] = { text: '', options: ['', '', '', ''], correctAnswer: 0 };
            }
            const newOptions = [...(newQuestions[qIndex].options || ['', '', '', ''])];
            newOptions[oIndex] = value;
            newQuestions[qIndex] = { ...newQuestions[qIndex], options: newOptions };
            return { ...prev, questions_en: newQuestions };
        });
    };

    const handleObjectiveChange = (index, value) => {
        setFormData(prev => {
            const newObjectives = [...prev.learningObjectives];
            newObjectives[index] = value;
            return { ...prev, learningObjectives: newObjectives };
        });
    };

    const handleEnglishObjectiveChange = (index, value) => {
        setFormData(prev => {
            const newObjectives = [...(prev.learningObjectives_en || ['', '', ''])];
            newObjectives[index] = value;
            return { ...prev, learningObjectives_en: newObjectives };
        });
    };

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
        setError(null);
        try {
            // Check if diagnosis changed to clear stale aliases
            const originalCase = await caseService.getCaseById(id);
            const updatedData = { ...formData };

            if (originalCase && originalCase.correctDiagnosis !== formData.correctDiagnosis) {
                updatedData.diagnosisAliases = [];
            }

            await caseService.updateCase(updatedData);

            // --- ACTIVITY LOG INJECTION ---
            try {
                const { activityLogService } = await import('../../../services/activityLogService');
                await activityLogService.logActivity('UPDATE_CASE', {
                    caseId: id,
                    title: updatedData.title
                });
            } catch (e) {
                console.error('Failed to log update case:', e);
            }
            // ------------------------------

            alert(t('instructor.form.success'));
            navigate('/instructor/manage');
        } catch (err) {
            console.error("Error updating case:", err);
            setError(err.message);
            window.scrollTo(0, 0);
        }
    };

    if (loading) return <div>{t('cases.loading')}</div>;

    return (
        <div className="max-w-4xl mx-auto bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">Editar Caso</h2>
                    <p className="mt-1 text-sm text-gray-500">Modificar detalles del caso</p>
                </div>
                <button
                    onClick={() => navigate('/instructor/manage')}
                    className="text-gray-400 hover:text-gray-500"
                >
                    <ArrowLeft className="h-6 w-6" />
                </button>
            </div>

            {error && (
                <div className="mx-6 mt-4 bg-red-50 border-l-4 border-red-400 p-4">
                    <div className="flex">
                        <div className="flex-shrink-0">
                            <X className="h-5 w-5 text-red-400" />
                        </div>
                        <div className="ml-3">
                            <p className="text-sm text-red-700">
                                {error}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                    <div className="col-span-2">
                        <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('instructor.form.title')}</label>
                        <input
                            type="text"
                            name="title"
                            id="title"
                            required
                            value={formData.title}
                            onChange={handleChange}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        />
                    </div>

                    <div className="col-span-2">
                        <label htmlFor="title_en" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Title (English)</label>
                        <input
                            type="text"
                            name="title_en"
                            id="title_en"
                            value={formData.title_en || ''}
                            onChange={handleChange}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            placeholder="English translation of title"
                        />
                    </div>

                    <div>
                        <label htmlFor="modality" className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('instructor.form.modality')}</label>
                        <select
                            name="modality"
                            id="modality"
                            value={formData.modality}
                            onChange={handleChange}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        >
                            <option value="X-Ray">X-Ray</option>
                            <option value="CT">CT</option>
                            <option value="MRI">MRI</option>
                            <option value="Ultrasound">Ultrasound</option>
                        </select>
                    </div>

                    <div>
                        <label htmlFor="difficulty" className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('instructor.form.difficulty')}</label>
                        <select
                            name="difficulty"
                            id="difficulty"
                            value={formData.difficulty}
                            onChange={handleChange}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        >
                            <option value="Beginner">Beginner</option>
                            <option value="Intermediate">Intermediate</option>
                            <option value="Advanced">Advanced</option>
                        </select>
                    </div>

                    <div className="col-span-2">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('instructor.form.imageUrl')}</label>

                        {/* Image Preview Grid */}
                        {formData.images && formData.images.length > 0 && (
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-4">
                                {formData.images.map((img, index) => (
                                    <div key={index} className="relative group">
                                        <img
                                            src={img}
                                            alt={`Preview ${index + 1}`}
                                            className="h-32 w-full object-cover rounded-md border border-gray-200 dark:border-gray-600"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => removeImage(index)}
                                            className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <X size={16} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 dark:border-gray-600 border-dashed rounded-md">
                            <div className="space-y-1 text-center">
                                <Upload className="mx-auto h-12 w-12 text-gray-400" />
                                <div className="flex text-sm text-gray-600 justify-center">
                                    <label
                                        htmlFor="file-upload-edit"
                                        className="relative cursor-pointer bg-white dark:bg-gray-700 rounded-md font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500"
                                    >
                                        <span>{isCompressing ? "Processing..." : t('instructor.form.uploadImage')}</span>
                                        <input
                                            id="file-upload-edit"
                                            name="file-upload"
                                            type="file"
                                            className="sr-only"
                                            accept="image/*"
                                            multiple
                                            onChange={handleImageUpload}
                                            disabled={isCompressing}
                                        />
                                    </label>
                                </div>
                                <p className="text-xs text-gray-500">PNG, JPG, GIF (Max 800px width, auto-compressed)</p>
                            </div>
                        </div>
                    </div>

                    <div className="col-span-2">
                        <label htmlFor="history_en" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Clinical History (English)</label>
                        <textarea
                            name="history_en"
                            id="history_en"
                            rows={3}
                            value={formData.history_en || ''}
                            onChange={handleChange}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            placeholder="English translation of clinical history"
                        />
                    </div>

                    <div className="col-span-2">
                        <label htmlFor="history" className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('instructor.form.history')}</label>
                        <textarea
                            name="history"
                            id="history"
                            rows={3}
                            required
                            value={formData.history}
                            onChange={handleChange}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        />
                    </div>

                    <div className="col-span-2">
                        <label htmlFor="correctDiagnosis" className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('instructor.form.correctDiagnosis')}</label>
                        <input
                            type="text"
                            name="correctDiagnosis"
                            id="correctDiagnosis"
                            required
                            value={formData.correctDiagnosis}
                            onChange={handleChange}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        />
                    </div>

                    <div className="col-span-2">
                        <label htmlFor="correctDiagnosis_en" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Diagnóstico en Inglés (Validación y Referencias)
                        </label>
                        <input
                            type="text"
                            name="correctDiagnosis_en"
                            id="correctDiagnosis_en"
                            placeholder="e.g. Bucket-handle meniscal tear"
                            value={formData.correctDiagnosis_en || ''}
                            onChange={handleChange}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        />
                        <p className="mt-1 text-xs text-gray-500">
                            Este valor se usará para validar respuestas en inglés y para buscar referencias.
                        </p>
                    </div>

                    <div className="col-span-2">
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


                    <div className="col-span-2">
                        <label htmlFor="caseComments" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Comentarios del Caso (Opcional)
                        </label>
                        <textarea
                            name="caseComments"
                            id="caseComments"
                            rows={3}
                            placeholder="Información adicional, perlas clínicas, o contexto extra para el estudiante..."
                            value={formData.caseComments || ''}
                            onChange={handleChange}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        />
                        <p className="mt-1 text-xs text-gray-500">
                            Se mostrará bajo la sección de referencias una vez resuelto el caso.
                        </p>
                    </div>

                    <div className="col-span-2 border-t pt-6 mt-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-medium text-gray-900 dark:text-white">Preguntas de Alternativas</h3>
                            <button
                                type="button"
                                onClick={handleAddQuestion}
                                className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200 dark:bg-indigo-900 dark:text-indigo-300"
                            >
                                <Plus className="w-4 h-4 mr-1" />
                                Añadir Pregunta
                            </button>
                        </div>
                        <div className="space-y-4">
                            {formData.questions.map((question, qIndex) => (
                                <div key={qIndex} className="bg-gray-50 dark:bg-gray-700 p-3 rounded-md space-y-4 relative group">
                                    <button
                                        type="button"
                                        onClick={() => handleRemoveQuestion(qIndex)}
                                        className="absolute top-2 right-2 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                                        title="Eliminar pregunta"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>

                                    {/* Spanish Version */}
                                    <div>
                                        <h4 className="text-xs font-bold text-gray-900 dark:text-white mb-2 border-b border-gray-200 dark:border-gray-600 pb-1 pr-8">Versión Español</h4>
                                        <div className="mb-2">
                                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                Pregunta {qIndex + 1}
                                            </label>
                                            <input
                                                type="text"
                                                value={question.text}
                                                onChange={(e) => handleQuestionChange(qIndex, 'text', e.target.value)}
                                                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm py-1.5 px-2 border dark:bg-gray-600 dark:border-gray-500 dark:text-white"
                                                placeholder="Ingrese la pregunta..."
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
                                                Alternativas (Seleccione la correcta)
                                            </label>
                                            {question.options.map((option, oIndex) => (
                                                <div key={oIndex} className="flex items-center space-x-2">
                                                    <input
                                                        type="radio"
                                                        name={`correct-answer-${qIndex}`}
                                                        checked={parseInt(question.correctAnswer) === oIndex}
                                                        onChange={() => handleQuestionChange(qIndex, 'correctAnswer', oIndex)}
                                                        className="focus:ring-indigo-500 h-3.5 w-3.5 text-indigo-600 border-gray-300"
                                                    />
                                                    <input
                                                        type="text"
                                                        value={option}
                                                        onChange={(e) => handleOptionChange(qIndex, oIndex, e.target.value)}
                                                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-xs py-1 px-2 border dark:bg-gray-600 dark:border-gray-500 dark:text-white"
                                                        placeholder={`Alternativa ${oIndex + 1}`}
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* English Version */}
                                    <div>
                                        <h4 className="text-xs font-bold text-gray-900 dark:text-white mb-2 border-b border-gray-200 dark:border-gray-600 pb-1">Versión Inglés (Traducción)</h4>
                                        <div className="mb-2">
                                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                Question {qIndex + 1} (English)
                                            </label>
                                            <input
                                                type="text"
                                                value={formData.questions_en?.[qIndex]?.text || ''}
                                                onChange={(e) => handleEnglishQuestionChange(qIndex, 'text', e.target.value)}
                                                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm py-1.5 px-2 border dark:bg-gray-600 dark:border-gray-500 dark:text-white"
                                                placeholder="English question text..."
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
                                                Alternatives (English)
                                            </label>
                                            {(formData.questions_en?.[qIndex]?.options || ['', '', '', '']).map((option, oIndex) => (
                                                <div key={oIndex} className="flex items-center space-x-2">
                                                    <div className="w-3.5 h-3.5" /> {/* Spacer for alignment with radio buttons */}
                                                    <input
                                                        type="text"
                                                        value={option}
                                                        onChange={(e) => handleEnglishOptionChange(qIndex, oIndex, e.target.value)}
                                                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-xs py-1 px-2 border dark:bg-gray-600 dark:border-gray-500 dark:text-white"
                                                        placeholder={`Option ${oIndex + 1} (English)`}
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="col-span-2 border-t pt-6 mt-6">
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Objetivos de Aprendizaje</h3>
                        <div className="space-y-4">
                            {formData.learningObjectives.map((objective, index) => (
                                <div key={index} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            Objetivo {index + 1} (Español)
                                        </label>
                                        <input
                                            type="text"
                                            value={objective}
                                            onChange={(e) => handleObjectiveChange(index, e.target.value)}
                                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border dark:bg-gray-600 dark:border-gray-500 dark:text-white"
                                            placeholder={`Objetivo de aprendizaje ${index + 1}...`}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            Objective {index + 1} (English)
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.learningObjectives_en?.[index] || ''}
                                            onChange={(e) => handleEnglishObjectiveChange(index, e.target.value)}
                                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border dark:bg-gray-600 dark:border-gray-500 dark:text-white"
                                            placeholder={`Learning objective ${index + 1}...`}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="flex justify-end">
                    <button
                        type="submit"
                        disabled={isCompressing}
                        className={`inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white ${isCompressing ? 'bg-gray-400' : 'bg-indigo-600 hover:bg-indigo-700'} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500`}
                    >
                        <Save className="mr-2 h-4 w-4" />
                        Guardar Cambios
                    </button>
                </div>
            </form>
        </div>
    );
};

export default EditCasePage;
