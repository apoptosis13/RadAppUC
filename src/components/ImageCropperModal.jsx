import React, { useState } from 'react';
import Cropper from 'react-easy-crop';
import { X, ZoomIn, ZoomOut, Check } from 'lucide-react';
import getCroppedImg from '../utils/canvasUtils';

const ImageCropperModal = ({ imageSrc, onCancel, onCropComplete, aspect = 1 }) => {
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);

    const handleCropComplete = (croppedArea, croppedAreaPixels) => {
        setCroppedAreaPixels(croppedAreaPixels);
    };

    const handleSave = async () => {
        setIsProcessing(true);
        try {
            const croppedBlob = await getCroppedImg(imageSrc, croppedAreaPixels);
            onCropComplete(croppedBlob);
        } catch (error) {
            console.error("Error cropping image:", error);
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">Ajustar Imagen</h3>
                    <button onClick={onCancel} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="relative h-80 w-full bg-gray-900">
                    <Cropper
                        image={imageSrc}
                        crop={crop}
                        zoom={zoom}

                        aspect={aspect}
                        onCropChange={setCrop}
                        onCropComplete={handleCropComplete}
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
                            onClick={onCancel}
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={isProcessing}
                            className="flex items-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                        >
                            {isProcessing ? (
                                <>Processing...</>
                            ) : (
                                <>
                                    <Check className="w-4 h-4 mr-2" />
                                    Usar Imagen
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ImageCropperModal;
