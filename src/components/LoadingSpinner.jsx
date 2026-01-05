import React from 'react';
import { Loader } from 'lucide-react';

const LoadingSpinner = () => {
    return (
        <div className="flex items-center justify-center min-h-screen bg-black text-white">
            <Loader className="w-8 h-8 animate-spin text-indigo-500" />
            <span className="ml-2 text-lg font-medium">Cargando...</span>
        </div>
    );
};

export default LoadingSpinner;
