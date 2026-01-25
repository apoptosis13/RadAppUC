import React, { useState } from 'react';
import { Loader2, AlertCircle, Maximize2, ExternalLink } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const DocumentViewer = ({ fileUrl, type = 'pdf', title }) => {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    const getViewerUrl = () => {
        if (!fileUrl) return '';

        const lowerUrl = fileUrl.toLowerCase();

        // 1. If it's already an embed link or a known viewer URL, don't wrap it
        if (lowerUrl.includes('embed') ||
            lowerUrl.includes('view.aspx') ||
            lowerUrl.includes('sharepoint.com') ||
            lowerUrl.includes('docs.google.com/presentation') ||
            lowerUrl.includes('docs.google.com/document') ||
            lowerUrl.includes('/pub?')) {
            return fileUrl;
        }

        // 2. Special handling for OneDrive Short Links (1drv.ms)
        // These are redirection landers and cannot be wrapped in Office Online Viewer.
        if (lowerUrl.includes('1drv.ms')) {
            return fileUrl;
        }

        // 3. For direct file links to presentations, use Microsoft Office Online Viewer
        if (type === 'presentation' || lowerUrl.endsWith('.pptx') || lowerUrl.endsWith('.ppt') || lowerUrl.includes('.pptx?') || lowerUrl.includes('.ppt?')) {
            return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(fileUrl)}&wdAr=1.7777777777777777`;
        }

        // Standard PDF viewing (handled by browser or nested iframe)
        return fileUrl;
    };

    return (
        <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-lg">
            {/* Header / Toolbar */}
            <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <span className="p-1.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded">
                        <Maximize2 size={16} />
                    </span>
                    <h4 className="text-sm font-bold text-gray-700 dark:text-gray-200 truncate max-w-md">
                        {title || t('supportMaterial.viewer.defaultTitle', 'Documento adjunto')}
                    </h4>
                </div>
                <div className="flex items-center gap-3">
                    <a
                        href={fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                        title={t('supportMaterial.viewer.openNewTab', 'Abrir en pestaña nueva')}
                    >
                        <ExternalLink size={18} />
                    </a>
                </div>
            </div>

            {/* Viewer Area */}
            <div className="relative flex-1 bg-gray-100 dark:bg-gray-950 min-h-[600px]">
                {loading && !error && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
                        <Loader2 className="w-10 h-10 text-indigo-500 animate-spin mb-3" />
                        <p className="text-gray-500 text-xs font-bold uppercase tracking-widest">{t('supportMaterial.viewer.preparing', 'Preparando visor...')}</p>
                    </div>
                )}

                {error ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center">
                        <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
                        <p className="text-gray-800 dark:text-gray-200 font-bold">{t('supportMaterial.viewer.error', 'No se pudo cargar el documento')}</p>
                        <p className="text-gray-500 text-sm mt-2 max-w-xs">
                            {t('supportMaterial.viewer.errorDesc', 'El archivo podría no estar disponible o el servidor bloqueó la visualización incrustada.')}
                        </p>
                    </div>
                ) : (
                    <iframe
                        src={getViewerUrl()}
                        width="100%"
                        height="100%"
                        className="w-full h-full border-none"
                        onLoad={() => setLoading(false)}
                        onError={() => setError(true)}
                        title={title || "Viewer"}
                    ></iframe>
                )}
            </div>
        </div>
    );
};

export default DocumentViewer;
