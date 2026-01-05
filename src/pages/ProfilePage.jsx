import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';
import { authService } from '../services/authService';
import { User, Save, Camera, Upload, Check, Moon, Sun, Globe, Monitor, X, ZoomIn, ZoomOut } from 'lucide-react';
import Cropper from 'react-easy-crop';
import getCroppedImg from '../utils/canvasUtils';
import { AVATAR_PRESETS } from '../utils/userConstants';

const ProfilePage = () => {
    const { user, updateProfile } = useAuth();
    const { t, i18n } = useTranslation();
    const { theme, toggleTheme } = useTheme();

    // Local state for form
    const [formData, setFormData] = useState({
        displayName: '',
        photoURL: '',
        preferences: {
            theme: 'light',
            language: 'es'
        }
    });

    const [message, setMessage] = useState({ type: '', text: '' });
    const [isUploading, setIsUploading] = useState(false);
    const [showAvatarSelector, setShowAvatarSelector] = useState(false);

    // Cropper State
    const [imageSrc, setImageSrc] = useState(null);
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
    const [showCropper, setShowCropper] = useState(false);

    // Initialize state from user object
    useEffect(() => {
        if (user) {
            setFormData({
                displayName: user.displayName || '',
                photoURL: user.photoURL || '',
                preferences: {
                    theme: user.preferences?.theme || theme,
                    language: user.preferences?.language || i18n.language
                }
            });
        }
    }, [user, theme, i18n.language]);

    const handleChange = (e) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handlePreferenceChange = (key, value) => {
        setFormData(prev => ({
            ...prev,
            preferences: {
                ...prev.preferences,
                [key]: value
            }
        }));
    };

    const onCropComplete = (croppedArea, croppedAreaPixels) => {
        setCroppedAreaPixels(croppedAreaPixels);
    };

    const handleFileSelect = async (e) => {
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.addEventListener('load', () => {
                setImageSrc(reader.result);
                setShowCropper(true);
                setShowAvatarSelector(false); // Close selector
            });
            reader.readAsDataURL(file);
        }
    };

    const handleSaveCroppedImage = async () => {
        setIsUploading(true);
        try {
            const croppedBlob = await getCroppedImg(imageSrc, croppedAreaPixels);

            // Create a File object from the Blob to keep the original name if needed, or just upload Blob
            const file = new File([croppedBlob], "avatar_cropped.jpg", { type: "image/jpeg" });

            const downloadURL = await authService.uploadAvatar(file, user.uid);
            setFormData(prev => ({ ...prev, photoURL: downloadURL }));

            setShowCropper(false);
            setImageSrc(null);
            setMessage({ type: 'success', text: 'Avatar actualizado correctamente' });
        } catch (error) {
            console.error("Upload failed", error);
            setMessage({ type: 'error', text: 'Error subiendo la imagen' });
        } finally {
            setIsUploading(false);
        }
    };

    const handleCancelCrop = () => {
        setShowCropper(false);
        setImageSrc(null);
    };

    const handleAvatarPreset = (url) => {
        setFormData(prev => ({ ...prev, photoURL: url }));
        setShowAvatarSelector(false);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage({ type: '', text: '' });

        try {
            await updateProfile(formData);

            // Apply language immediately if changed
            if (formData.preferences.language !== i18n.language) {
                i18n.changeLanguage(formData.preferences.language);
            }

            setMessage({ type: 'success', text: t('profile.success') });
        } catch (error) {
            console.error(error);
            setMessage({ type: 'error', text: 'Error updating profile' });
        }
    };

    return (
        <div className="max-w-4xl mx-auto py-8 px-4">
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">{t('profile.title')}</h2>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t('profile.subtitle')}</p>
                </div>

                <div className="p-6 md:flex md:space-x-8">
                    {/* Left Column: Avatar */}
                    <div className="flex-shrink-0 mb-6 md:mb-0 md:w-1/3 flex flex-col items-center">
                        <div className="relative group">
                            <div className="w-40 h-40 rounded-full overflow-hidden border-4 border-gray-100 dark:border-gray-700 shadow-md">
                                <img
                                    src={formData.photoURL || `https://ui-avatars.com/api/?name=${formData.displayName || 'User'}&background=random`}
                                    alt="Profile"
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                        e.target.onerror = null; // Prevent loop
                                        e.target.src = `https://ui-avatars.com/api/?name=${formData.displayName || 'User'}&background=random`;
                                    }}
                                />
                            </div>
                            <button
                                onClick={() => setShowAvatarSelector(!showAvatarSelector)}
                                className="absolute bottom-2 right-2 bg-indigo-600 text-white p-2 rounded-full hover:bg-indigo-700 shadow-lg transition-colors"
                                title={t('profile.changeAvatar')}
                            >
                                <Camera className="w-5 h-5" />
                            </button>
                        </div>

                        {showAvatarSelector && (
                            <div className="mt-4 w-full bg-gray-50 dark:bg-gray-900 p-4 rounded-lg border border-gray-200 dark:border-gray-700 animate-fadeIn">
                                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wider">{t('profile.presets')}</p>
                                <div className="flex justify-center space-x-2 mb-4">
                                    {AVATAR_PRESETS.map((url, index) => (
                                        <button
                                            key={index}
                                            onClick={() => handleAvatarPreset(url)}
                                            className="w-12 h-12 border-2 border-transparent hover:border-indigo-500 transition-all transform hover:scale-110 shadow-sm rounded-full p-0 bg-transparent relative"
                                            title={`Avatar ${index + 1}`}
                                        >
                                            <img
                                                src={url}
                                                alt={`Preset ${index}`}
                                                className="w-full h-full object-cover rounded-full"
                                                style={{ display: 'block' }}
                                            />
                                        </button>
                                    ))}
                                </div>
                                <div className="border-t border-gray-200 dark:border-gray-700 pt-3 flex justify-center">
                                    <label className="cursor-pointer flex items-center px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700">
                                        <Upload className="w-4 h-4 mr-2" />
                                        {isUploading ? 'Uploading...' : t('profile.uploadAvatar')}
                                        <input type="file" className="hidden" accept="image/*" onChange={handleFileSelect} disabled={isUploading} />
                                    </label>
                                </div>
                            </div>
                        )}
                        <h3 className="mt-4 text-xl font-medium text-gray-900 dark:text-white text-center">{formData.displayName || user?.email}</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 text-center">{user?.role}</p>
                    </div>

                    {/* Right Column: Form */}
                    <div className="flex-1 md:border-l md:border-gray-200 dark:md:border-gray-700 md:pl-8">
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {message.text && (
                                <div className={`p-4 rounded-md ${message.type === 'success' ? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300' : 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300'}`}>
                                    {message.text}
                                </div>
                            )}

                            {/* User Info */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    {t('profile.username')}
                                </label>
                                <input
                                    type="text"
                                    value={user?.email}
                                    disabled
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    {t('profile.name')}
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <User className="h-5 w-5 text-gray-400" />
                                    </div>
                                    <input
                                        type="text"
                                        name="displayName"
                                        value={formData.displayName}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2 pl-10 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                                    />
                                </div>
                            </div>

                            <hr className="border-gray-200 dark:border-gray-700" />

                            {/* Preferences */}
                            <div>
                                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">{t('profile.preferences')}</h3>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Appearance */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            {t('profile.theme')}
                                        </label>
                                        <div className="flex space-x-2 bg-gray-100 dark:bg-gray-700 p-1 rounded-lg">
                                            <button
                                                type="button"
                                                onClick={() => handlePreferenceChange('theme', 'light')}
                                                className={`flex-1 flex items-center justify-center py-2 px-3 rounded-md text-sm font-medium transition-all ${formData.preferences.theme === 'light' ? 'bg-white text-gray-900 shadow' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}
                                            >
                                                <Sun className="w-4 h-4 mr-2" />
                                                {t('profile.light')}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handlePreferenceChange('theme', 'dark')}
                                                className={`flex-1 flex items-center justify-center py-2 px-3 rounded-md text-sm font-medium transition-all ${formData.preferences.theme === 'dark' ? 'bg-gray-600 text-white shadow' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}
                                            >
                                                <Moon className="w-4 h-4 mr-2" />
                                                {t('profile.dark')}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Language */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            {t('profile.language')}
                                        </label>
                                        <div className="flex space-x-2 bg-gray-100 dark:bg-gray-700 p-1 rounded-lg">
                                            <button
                                                type="button"
                                                onClick={() => handlePreferenceChange('language', 'es')}
                                                className={`flex-1 flex items-center justify-center py-2 px-3 rounded-md text-sm font-medium transition-all ${formData.preferences.language === 'es' ? 'bg-white dark:bg-gray-600 text-indigo-600 dark:text-white shadow' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}
                                            >
                                                <span className="mr-2">🇪🇸</span>
                                                {t('profile.spanish')}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handlePreferenceChange('language', 'en')}
                                                className={`flex-1 flex items-center justify-center py-2 px-3 rounded-md text-sm font-medium transition-all ${formData.preferences.language === 'en' ? 'bg-white dark:bg-gray-600 text-indigo-600 dark:text-white shadow' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}
                                            >
                                                <span className="mr-2">🇺🇸</span>
                                                {t('profile.english')}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end pt-6">
                                <button
                                    type="submit"
                                    className="flex items-center space-x-2 px-6 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium transition-colors shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                                >
                                    <Save className="w-4 h-4" />
                                    <span>{t('profile.save')}</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>

            {/* Cropper Modal */}
            {showCropper && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
                    <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">{t('profile.adjustImage') || 'Ajustar Imagen'}</h3>
                            <button onClick={handleCancelCrop} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="relative h-64 w-full bg-gray-900">
                            <Cropper
                                image={imageSrc}
                                crop={crop}
                                zoom={zoom}
                                aspect={1}
                                onCropChange={setCrop}
                                onCropComplete={onCropComplete}
                                onZoomChange={setZoom}
                            />
                        </div>

                        <div className="p-4 space-y-4">
                            <div className="flex items-center space-x-2">
                                <ZoomOut className="w-4 h-4 text-gray-500" />
                                <input
                                    type="range"
                                    value={zoom}
                                    min={1}
                                    max={3}
                                    step={0.1}
                                    aria-labelledby="Zoom"
                                    onChange={(e) => setZoom(Number(e.target.value))}
                                    className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                                />
                                <ZoomIn className="w-4 h-4 text-gray-500" />
                            </div>

                            <div className="flex justify-end space-x-3">
                                <button
                                    onClick={handleCancelCrop}
                                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700"
                                >
                                    {t('common.cancel') || 'Cancelar'}
                                </button>
                                <button
                                    onClick={handleSaveCroppedImage}
                                    disabled={isUploading}
                                    className="flex items-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                                >
                                    {isUploading ? (
                                        <>
                                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            Subiendo...
                                        </>
                                    ) : (
                                        <>
                                            <Check className="w-4 h-4 mr-2" />
                                            {t('common.save') || 'Guardar'}
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProfilePage;
