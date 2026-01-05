import React from 'react';
import clsx from 'clsx';

const Button = ({
    children,
    variant = 'primary',
    size = 'md',
    className,
    ...props
}) => {
    const baseStyles = "inline-flex items-center justify-center font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors duration-200";

    const variants = {
        primary: "bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-indigo-500 border border-transparent",
        secondary: "bg-white text-indigo-700 hover:bg-indigo-50 focus:ring-indigo-500 border border-indigo-200",
        outline: "bg-transparent text-gray-700 hover:bg-gray-50 focus:ring-indigo-500 border border-gray-300",
        danger: "bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 border border-transparent",
    };

    const sizes = {
        sm: "px-3 py-1.5 text-xs",
        md: "px-4 py-2 text-sm",
        lg: "px-6 py-3 text-base",
    };

    return (
        <button
            className={clsx(baseStyles, variants[variant], sizes[size], className)}
            {...props}
        >
            {children}
        </button>
    );
};

export default Button;
