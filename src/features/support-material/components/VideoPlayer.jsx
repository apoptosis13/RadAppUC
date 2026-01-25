import React, { useState } from 'react';
import { Loader2, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const VideoPlayer = ({ videoUrl, provider = 'bunny', title }) => {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    // Helper to generate correct embed URL
    const getEmbedUrl = () => {
        if (!videoUrl) return '';

        if (provider === 'bunny') {
            // Expected bunny format: https://iframe.mediadelivery.net/embed/LIBRARY_ID/VIDEO_ID
            return videoUrl;
        }

        if (provider === 'vimeo') {
            // Expected vimeo format: https://player.vimeo.com/video/VIDEO_ID
            return videoUrl;
        }

        return videoUrl;
    };

    return (
        <div className="relative w-full aspect-video bg-black rounded-xl overflow-hidden shadow-2xl ring-1 ring-white/10">
            {loading && !error && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900 border border-gray-800 rounded-xl z-10">
                    <Loader2 className="w-12 h-12 text-indigo-500 animate-spin mb-4" />
                    <p className="text-gray-400 text-sm font-medium">{t('supportMaterial.player.loading', 'Cargando video de forma segura...')}</p>
                </div>
            )}

            {error ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900 border border-red-900/20 rounded-xl">
                    <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
                    <p className="text-gray-300 font-bold">{t('supportMaterial.player.error', 'Error al cargar el video')}</p>
                    <p className="text-gray-500 text-sm mt-1">{t('supportMaterial.player.errorDesc', 'Verifica tu conexión o los permisos de acceso.')}</p>
                </div>
            ) : (
                <iframe
                    src={`${getEmbedUrl()}?autoplay=false&loop=false&muted=false&preload=true&responsive=true`}
                    loading="lazy"
                    className="absolute top-0 left-0 w-full h-full border-none"
                    allow="accelerometer;gyroscope;autoplay;encrypted-media;picture-in-picture;"
                    allowFullScreen={true}
                    onLoad={() => setLoading(false)}
                    onError={() => setError(true)}
                    title={title || "Video Player"}
                ></iframe>
            )}
        </div>
    );
};

export default VideoPlayer;
