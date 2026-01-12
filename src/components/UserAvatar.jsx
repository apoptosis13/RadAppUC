import React, { useState } from 'react';
import { User } from 'lucide-react';

const UserAvatar = ({ src, name, size = 'md', className = '' }) => {
    const [error, setError] = useState(false);

    const sizeClasses = {
        xs: 'h-6 w-6 text-[10px]',
        sm: 'h-8 w-8 text-xs',
        md: 'h-10 w-10 text-sm',
        lg: 'h-12 w-12 text-base',
        xl: 'h-16 w-16 text-lg',
    };

    const currentSizeClass = sizeClasses[size] || sizeClasses.md;

    if (!src || error) {
        return (
            <div className={`${currentSizeClass} rounded-full bg-gray-100 flex items-center justify-center text-gray-400 font-bold uppercase border border-gray-200 ${className}`}>
                {name ? name.charAt(0) : <User className="w-1/2 h-1/2" />}
            </div>
        );
    }

    return (
        <div className={`${currentSizeClass} rounded-full overflow-hidden bg-gray-100 border border-gray-200 ${className}`}>
            <img
                src={src}
                alt={name || 'Avatar'}
                className="h-full w-full object-cover"
                onError={() => setError(true)}
            />
        </div>
    );
};

export default UserAvatar;
