import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { supportMaterialService } from '../../../services/supportMaterialService';
import PageHeader from '../../../components/PageHeader';
import { Library, Plus, Search, Edit, Trash2, Video, FileText, Presentation, ExternalLink, Filter, Activity } from 'lucide-react';

const CATEGORIES = [
    { id: 'all' },
    { id: 'rx' },
    { id: 'us' },
    { id: 'mri' },
    { id: 'ct' },
    { id: 'other' }
];

const INITIAL_FORM = {
    title: '',
    title_en: '',
    description: '',
    description_en: '',
    category: 'mri', // Default to MRI as it's common in MSK
    type: 'video', // video, presentation, article
    url: '',
    thumbnail: '',
    provider: 'bunny'
};

const ManageMaterialsPage = () => {
    const { t } = useTranslation();
    const [materials, setMaterials] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterCategory, setFilterCategory] = useState('all');
    const [isEditing, setIsEditing] = useState(false);
    const [currentMaterialId, setCurrentMaterialId] = useState(null);
    const [form, setForm] = useState(INITIAL_FORM);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        loadMaterials();
    }, []);

    const loadMaterials = async () => {
        setLoading(true);
        try {
            const data = await supportMaterialService.getAllMaterials('all');
            setMaterials(data);
        } catch (error) {
            console.error("Error loading materials:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (material) => {
        setForm({
            title: material.title,
            title_en: material.title_en || '',
            description: material.description,
            description_en: material.description_en || '',
            category: material.category,
            type: material.type,
            url: material.url,
            thumbnail: material.thumbnail || '',
            provider: material.provider || 'bunny'
        });
        setCurrentMaterialId(material.id);
        setIsEditing(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDelete = async (id) => {
        if (!window.confirm(t('instructor.materials.alerts.deleteConfirm'))) return;

        try {
            await supportMaterialService.deleteMaterial(id);
            loadMaterials();
        } catch (error) {
            alert(t('instructor.materials.alerts.deleteError'));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            if (isEditing) {
                await supportMaterialService.updateMaterial(currentMaterialId, form);
            } else {
                await supportMaterialService.addMaterial(form);
            }
            setForm(INITIAL_FORM);
            setIsEditing(false);
            setCurrentMaterialId(null);
            loadMaterials();
            alert(isEditing ? t('instructor.materials.alerts.saveSuccess') : t('instructor.materials.alerts.createSuccess'));
        } catch (error) {
            console.error("Error submitting material:", error);
            alert(t('instructor.materials.alerts.saveError'));
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCancel = () => {
        setForm(INITIAL_FORM);
        setIsEditing(false);
        setCurrentMaterialId(null);
    };

    const filteredMaterials = materials.filter(m =>
        (m.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            m.category.toLowerCase().includes(searchTerm.toLowerCase())) &&
        (filterCategory === 'all' || m.category === filterCategory)
    );

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-20">
            <PageHeader
                title={t('instructor.materials.title')}
                subtitle={t('instructor.materials.subtitle')}
                icon={Library}
                actions={
                    <div className="bg-gray-100 dark:bg-gray-800 p-1 rounded-lg flex space-x-1 border border-gray-200 dark:border-gray-700">
                        {CATEGORIES.slice(0, 5).map(cat => (
                            <button
                                key={cat.id}
                                onClick={() => setFilterCategory(cat.id)}
                                className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${filterCategory === cat.id ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                            >
                                {cat.id === 'all' ? t('supportMaterial.modalities.all') : t(`supportMaterial.modalities.${cat.id}`)}
                            </button>
                        ))}
                    </div>
                }
            />

            {/* Editor Section */}
            <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 shadow-sm border border-gray-100 dark:border-gray-700">
                <h3 className="text-xl font-black text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                    <Plus className="text-indigo-500" />
                    {isEditing ? t('instructor.materials.editMaterial') : t('instructor.materials.newMaterial')}
                </h3>

                <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-1.5">{t('instructor.materials.form.title')}</label>
                            <input
                                required
                                type="text"
                                value={form.title}
                                onChange={e => setForm({ ...form, title: e.target.value })}
                                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border-none rounded-xl focus:ring-2 focus:ring-indigo-500 text-gray-900 dark:text-white transition-all font-medium"
                                placeholder={t('instructor.materials.form.titlePlaceholder')}
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-1.5">{t('instructor.materials.form.titleEn', 'Title (English)')}</label>
                            <input
                                type="text"
                                value={form.title_en}
                                onChange={e => setForm({ ...form, title_en: e.target.value })}
                                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border-none rounded-xl focus:ring-2 focus:ring-indigo-500 text-gray-900 dark:text-white transition-all font-medium"
                                placeholder="English Title"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-1.5">{t('instructor.materials.form.description')}</label>
                            <textarea
                                required
                                value={form.description}
                                onChange={e => setForm({ ...form, description: e.target.value })}
                                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border-none rounded-xl focus:ring-2 focus:ring-indigo-500 text-gray-900 dark:text-white transition-all font-medium min-h-[100px]"
                                placeholder={t('instructor.materials.form.descriptionPlaceholder')}
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-1.5">{t('instructor.materials.form.descriptionEn', 'Description (English)')}</label>
                            <textarea
                                value={form.description_en}
                                onChange={e => setForm({ ...form, description_en: e.target.value })}
                                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border-none rounded-xl focus:ring-2 focus:ring-indigo-500 text-gray-900 dark:text-white transition-all font-medium min-h-[100px]"
                                placeholder="English Description"
                            />
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-1.5">{t('instructor.materials.form.category')}</label>
                                <select
                                    value={form.category}
                                    onChange={e => setForm({ ...form, category: e.target.value })}
                                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border-none rounded-xl focus:ring-2 focus:ring-indigo-500 text-gray-900 dark:text-white transition-all font-medium"
                                >
                                    {CATEGORIES.filter(c => c.id !== 'all').map(c => (
                                        <option key={c.id} value={c.id}>{t(`supportMaterial.modalities.${c.id}`)}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-1.5">{t('instructor.materials.form.type')}</label>
                                <select
                                    value={form.type}
                                    onChange={e => setForm({ ...form, type: e.target.value })}
                                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border-none rounded-xl focus:ring-2 focus:ring-indigo-500 text-gray-900 dark:text-white transition-all font-medium"
                                >
                                    <option value="video">{t('supportMaterial.types.video')}</option>
                                    <option value="presentation">{t('supportMaterial.types.presentation')}</option>
                                    <option value="article">{t('supportMaterial.types.article')}</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-1.5">
                                {t('instructor.materials.form.url')}
                            </label>
                            <input
                                required
                                type="url"
                                value={form.url}
                                onChange={e => setForm({ ...form, url: e.target.value })}
                                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border-none rounded-xl focus:ring-2 focus:ring-indigo-500 text-gray-900 dark:text-white transition-all font-medium"
                                placeholder={form.type === 'video' ? "https://iframe.mediadelivery.net/embed/..." : "https://firebasestorage.googleapis.com/..."}
                            />
                            {form.type === 'video' && (
                                <p className="text-[10px] text-gray-400 mt-1 italic">{t('instructor.materials.form.bunnyTip')}</p>
                            )}
                        </div>

                        {form.type === 'video' && (
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-1.5">{t('instructor.materials.form.provider')}</label>
                                    <select
                                        value={form.provider}
                                        onChange={e => setForm({ ...form, provider: e.target.value })}
                                        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border-none rounded-xl focus:ring-2 focus:ring-indigo-500 text-gray-900 dark:text-white transition-all font-medium"
                                    >
                                        <option value="bunny">Bunny.net Stream</option>
                                        <option value="vimeo">Vimeo</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-1.5">{t('instructor.materials.form.thumbnail')}</label>
                                    <input
                                        type="url"
                                        value={form.thumbnail}
                                        onChange={e => setForm({ ...form, thumbnail: e.target.value })}
                                        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border-none rounded-xl focus:ring-2 focus:ring-indigo-500 text-gray-900 dark:text-white transition-all font-medium"
                                        placeholder="URL imagen"
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="md:col-span-2 flex justify-end gap-3 mt-4">
                        {isEditing && (
                            <button
                                type="button"
                                onClick={handleCancel}
                                className="px-6 py-3 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 font-bold rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
                            >
                                {t('common.cancel')}
                            </button>
                        )}
                        <button
                            disabled={isSubmitting}
                            type="submit"
                            className="px-8 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-500/20 transition-all active:scale-95 flex items-center gap-2 disabled:opacity-50"
                        >
                            {isSubmitting && <Activity size={18} className="animate-spin" />}
                            {isEditing ? t('instructor.materials.form.save') : t('instructor.materials.form.create')}
                        </button>
                    </div>
                </form>
            </div>

            {/* List Section */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-2">
                        {t('instructor.materials.list.title')}
                        <span className="text-xs font-medium text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">{filteredMaterials.length}</span>
                    </h3>
                    <div className="relative w-64">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                        <input
                            type="text"
                            placeholder={t('instructor.materials.list.searchPlaceholder')}
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 bg-white dark:bg-gray-800 border-none rounded-xl focus:ring-2 focus:ring-indigo-500 text-sm shadow-sm"
                        />
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-3xl overflow-hidden shadow-sm border border-gray-100 dark:border-gray-700">
                    <table className="min-w-full divide-y divide-gray-100 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-900/50">
                            <tr>
                                <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-gray-400">{t('instructor.materials.list.table.resource')}</th>
                                <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-gray-400 text-center">{t('instructor.materials.list.table.type')}</th>
                                <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-gray-400 text-center">{t('instructor.materials.list.table.category')}</th>
                                <th className="px-6 py-4 text-right text-[10px] font-black uppercase tracking-widest text-gray-400">{t('instructor.materials.list.table.actions')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                            {filteredMaterials.map(m => {
                                const TypeIcon = m.type === 'video' ? Video : m.type === 'presentation' ? Presentation : FileText;
                                return (
                                    <tr key={m.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/40 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center">
                                                <div className="shrink-0 mr-4">
                                                    <div className={`p-2 rounded-lg ${m.type === 'video' ? 'bg-red-50 text-red-500' :
                                                        m.type === 'presentation' ? 'bg-orange-50 text-orange-500' :
                                                            'bg-blue-50 text-blue-500'
                                                        }`}>
                                                        <TypeIcon size={20} />
                                                    </div>
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-gray-900 dark:text-white line-clamp-1">{m.title}</p>
                                                    <p className="text-[10px] text-gray-400 font-medium font-mono truncate max-w-[200px]">{m.url}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{t(`supportMaterial.types.${m.type}`)}</span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-900 text-[10px] font-bold text-gray-500 rounded-full">{t(`supportMaterial.modalities.${m.category}`)}</span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                <a href={m.url} target="_blank" rel="noreferrer" className="p-2 text-gray-400 hover:text-indigo-500 transition-colors">
                                                    <ExternalLink size={18} />
                                                </a>
                                                <button onClick={() => handleEdit(m)} className="p-2 text-gray-400 hover:text-blue-500 transition-colors">
                                                    <Edit size={18} />
                                                </button>
                                                <button onClick={() => handleDelete(m.id)} className="p-2 text-gray-400 hover:text-red-500 transition-colors">
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                            {filteredMaterials.length === 0 && (
                                <tr>
                                    <td colSpan="4" className="px-6 py-20 text-center text-gray-400 font-medium italic">
                                        {t('instructor.materials.list.empty')}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default ManageMaterialsPage;
