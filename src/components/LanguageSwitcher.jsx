import React from 'react';
import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';

const LanguageSwitcher = () => {
    const { i18n } = useTranslation();

    const toggleLanguage = () => {
        const newLang = i18n.language === 'es' ? 'en' : 'es';
        i18n.changeLanguage(newLang);
    };

    return (
        <button
            onClick={toggleLanguage}
            className="p-2 rounded-md text-gray-500 hover:text-indigo-600 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500 flex items-center"
            title={i18n.language === 'es' ? 'Switch to English' : 'Cambiar a Español'}
        >
            <Globe className="w-5 h-5 mr-1" />
            <span className="text-sm font-medium uppercase">{i18n.language}</span>
        </button>
    );
};

export default LanguageSwitcher;
