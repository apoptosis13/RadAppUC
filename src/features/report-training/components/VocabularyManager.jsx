import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Trash2, X, Book, Globe, User, Lock, Mic, ArrowRight, MessageSquareOff } from 'lucide-react';
import { userService } from '../../../services/userService';
import { authService } from '../../../services/authService';

const VocabularyManager = ({ onClose }) => {
    const { t } = useTranslation();
    const [userTerms, setUserTerms] = useState([]);
    const [globalTerms, setGlobalTerms] = useState([]);
    const [voiceExamples, setVoiceExamples] = useState([]);
    const [newTerm, setNewTerm] = useState('');
    const [newMisunderstood, setNewMisunderstood] = useState('');
    const [newCorrect, setNewCorrect] = useState('');
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('personal'); // 'personal' | 'global' | 'voice'
    const [canEditGlobal, setCanEditGlobal] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [uTerms, gTerms, vExamples, user] = await Promise.all([
                userService.getUserVocabulary(),
                userService.getGlobalVocabulary(),
                userService.getUserVoiceTraining(),
                authService.getUserData(authService.getCurrentUser()?.email)
            ]);

            setUserTerms(uTerms || []);
            setGlobalTerms(gTerms || []);
            setVoiceExamples(vExamples || []);

            // Check permissions (admin or instructor)
            if (user && (user.role === 'admin' || user.role === 'instructor')) {
                setCanEditGlobal(true);
            }
        } catch (error) {
            console.error("Error loading manager data:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleAdd = async (e) => {
        e.preventDefault();
        if (!newTerm.trim()) return;

        // Split by comma or newline and filter empty
        const termsToAdd = newTerm.split(/[,\n]/).map(t => t.trim()).filter(t => t.length > 0);
        if (termsToAdd.length === 0) return;

        setNewTerm('');

        if (activeTab === 'personal') {
            setUserTerms([...userTerms, ...termsToAdd]); // Optimistic
            try {
                if (termsToAdd.length === 1) {
                    await userService.addVocabularyTerm(termsToAdd[0]);
                } else {
                    await userService.addBatchVocabularyTerms(termsToAdd);
                }
            } catch (error) {
                console.error("Error adding personal terms:", error);
                loadData();
            }
        } else if (activeTab === 'global') {
            if (!canEditGlobal) return;
            setGlobalTerms([...globalTerms, ...termsToAdd]);
            try {
                if (termsToAdd.length === 1) {
                    await userService.addGlobalVocabularyTerm(termsToAdd[0]);
                } else {
                    await userService.addBatchGlobalVocabularyTerms(termsToAdd);
                }
            } catch (error) {
                console.error("Error adding global terms:", error);
                loadData();
            }
        }
    };

    const handleAddVoice = async (e) => {
        e.preventDefault();
        if (!newMisunderstood.trim() || !newCorrect.trim()) return;

        const misunderstood = newMisunderstood.trim();
        const correct = newCorrect.trim();

        setVoiceExamples([...voiceExamples, { misunderstood, correct }]);
        setNewMisunderstood('');
        setNewCorrect('');

        try {
            await userService.addVoiceTrainingExample(misunderstood, correct);
        } catch (error) {
            console.error("Error adding voice example:", error);
            loadData();
        }
    };

    const handleRemove = async (term) => {
        if (activeTab === 'personal') {
            setUserTerms(userTerms.filter(t => t !== term));
            try {
                await userService.removeVocabularyTerm(term);
            } catch (error) {
                setUserTerms(prev => [...prev, term]);
            }
        } else {
            if (!canEditGlobal) return;
            setGlobalTerms(globalTerms.filter(t => t !== term));
            try {
                await userService.removeGlobalVocabularyTerm(term);
            } catch (error) {
                setGlobalTerms(prev => [...prev, term]);
            }
        }
    };

    const handleRemoveVoice = async (example) => {
        setVoiceExamples(voiceExamples.filter(ex => ex.misunderstood !== example.misunderstood || ex.correct !== example.correct));
        try {
            await userService.removeVoiceTrainingExample(example);
        } catch (error) {
            loadData();
        }
    };

    const currentTerms = activeTab === 'personal' ? userTerms : globalTerms;

    return (
        <div className="absolute inset-0 bg-gray-900/95 z-50 flex flex-col p-6 animate-in fade-in duration-200">
            <div className="flex justify-between items-center mb-4">
                <div className="flex items-center space-x-3">
                    <div className="p-2 bg-indigo-600 rounded-lg text-white">
                        {activeTab === 'voice' ? <Mic size={20} /> : <Book size={20} />}
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-white">
                            {activeTab === 'voice' ? t('vocabulary.titleVoice') : t('vocabulary.title')}
                        </h3>
                        <p className="text-xs text-gray-400">
                            {activeTab === 'voice'
                                ? t('vocabulary.descVoice')
                                : t('vocabulary.desc')}
                        </p>
                    </div>
                </div>
                <button onClick={onClose} className="p-2 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white transition-colors">
                    <X size={20} />
                </button>
            </div>

            {/* Tabs */}
            <div className="flex space-x-1 bg-gray-800/50 p-1 rounded-lg mb-4">
                <button
                    onClick={() => setActiveTab('personal')}
                    className={`flex-1 flex items-center justify-center space-x-2 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'personal' ? 'bg-indigo-600 text-white shadow' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}
                >
                    <User size={14} />
                    <span>{t('vocabulary.personal')}</span>
                </button>
                <button
                    onClick={() => setActiveTab('voice')}
                    className={`flex-1 flex items-center justify-center space-x-2 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'voice' ? 'bg-indigo-600 text-white shadow' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}
                >
                    <Mic size={14} />
                    <span>{t('vocabulary.voice')}</span>
                </button>
                <button
                    onClick={() => setActiveTab('global')}
                    className={`flex-1 flex items-center justify-center space-x-2 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'global' ? 'bg-indigo-600 text-white shadow' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}
                >
                    <Globe size={14} />
                    <span>{t('vocabulary.global')}</span>
                </button>
            </div>

            {/* Forms */}
            {activeTab === 'voice' ? (
                <form onSubmit={handleAddVoice} className="bg-gray-800/40 p-4 rounded-xl border border-gray-700/50 mb-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                            <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1 ml-1">{t('vocabulary.voiceInputLabel')}</label>
                            <input
                                value={newMisunderstood}
                                onChange={(e) => setNewMisunderstood(e.target.value)}
                                placeholder="Ej: jofa, sofa, ofa"
                                className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1 ml-1">{t('vocabulary.voiceOutputLabel')}</label>
                            <input
                                value={newCorrect}
                                onChange={(e) => setNewCorrect(e.target.value)}
                                placeholder="Ej: Hoffa"
                                className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-sm"
                            />
                        </div>
                    </div>
                    <button
                        type="submit"
                        disabled={!newMisunderstood.trim() || !newCorrect.trim()}
                        className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                    >
                        <Plus size={18} className="mr-2" />
                        {t('vocabulary.saveVoice')}
                    </button>
                </form>
            ) : (activeTab === 'personal' || canEditGlobal) ? (
                <form onSubmit={handleAdd} className="flex gap-2 mb-4 items-start">
                    <textarea
                        value={newTerm}
                        onChange={(e) => setNewTerm(e.target.value)}
                        placeholder={`Añadir términos ${activeTab === 'global' ? 'globales' : 'personales'}...\n(Separados por comas o saltos de línea)`}
                        className="flex-1 bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none min-h-[42px] max-h-[100px] resize-y text-sm"
                        rows={1}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleAdd(e);
                            }
                        }}
                    />
                    <button
                        type="submit"
                        disabled={!newTerm.trim()}
                        className="h-[42px] bg-indigo-600 hover:bg-indigo-500 text-white px-4 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center shrink-0"
                    >
                        <Plus size={18} className="mr-2" />
                        {t('vocabulary.addBtn')}
                    </button>
                </form>
            ) : (
                <div className="mb-4 p-3 bg-blue-900/20 border border-blue-500/30 rounded-lg flex items-center space-x-3">
                    <Lock size={16} className="text-blue-400" />
                    <span className="text-sm text-blue-200">{t('vocabulary.globalLock')}</span>
                </div>
            )}

            {/* List */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
                {loading ? (
                    <div className="text-center text-gray-500 py-10">{t('vocabulary.loading')}</div>
                ) : activeTab === 'voice' ? (
                    <div className="space-y-2">
                        {voiceExamples.length === 0 ? (
                            <div className="text-center border-2 border-dashed border-gray-800 rounded-xl p-8">
                                <MessageSquareOff className="w-12 h-12 text-gray-700 mx-auto mb-3" />
                                <p className="text-gray-500">{t('vocabulary.emptyVoice')}</p>
                                <p className="text-xs text-gray-500 mt-2">{t('vocabulary.emptyVoiceHint')}</p>
                            </div>
                        ) : (
                            voiceExamples.map((ex, index) => (
                                <div key={index} className="flex items-center bg-gray-800 p-4 rounded-xl border border-gray-700 group hover:border-indigo-500/30 transition-all">
                                    <div className="flex-1 flex items-center space-x-3">
                                        <div className="text-red-400 bg-red-400/10 px-3 py-1 rounded-full text-xs font-mono">{ex.misunderstood}</div>
                                        <ArrowRight size={14} className="text-gray-600" />
                                        <div className="text-green-400 bg-green-400/10 px-3 py-1 rounded-full text-xs font-bold font-mono">{ex.correct}</div>
                                    </div>
                                    <button
                                        onClick={() => handleRemoveVoice(ex)}
                                        className="text-gray-500 hover:text-red-400 p-2 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                ) : currentTerms.length === 0 ? (
                    <div className="text-center border-2 border-dashed border-gray-800 rounded-xl p-8">
                        <p className="text-gray-500">{t('vocabulary.emptyList')}</p>
                        <p className="text-xs text-gray-500 mt-2">{t('vocabulary.emptyListHint')}</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {currentTerms.map((term, index) => (
                            <div key={index} className="flex items-center justify-between bg-gray-800 p-3 rounded-lg border border-gray-700 group hover:border-gray-600">
                                <span className={`font-medium ${activeTab === 'global' ? 'text-blue-200' : 'text-gray-200'}`}>{term}</span>
                                {(activeTab === 'personal' || canEditGlobal) && (
                                    <button
                                        onClick={() => handleRemove(term)}
                                        className="text-gray-500 hover:text-red-400 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                                        title="Eliminar"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default VocabularyManager;
