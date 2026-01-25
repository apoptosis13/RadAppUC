import React from 'react';

/**
 * PageHeader component for consistent page titles across the app.
 * 
 * @param {string} title - The main page title.
 * @param {string} subtitle - Optional description or subtitle.
 * @param {React.ReactNode} icon - Optional Lucide icon component.
 * @param {React.ReactNode} actions - Optional action buttons/components for the right side.
 * @param {string} className - Optional additional classes for the container.
 */
const PageHeader = ({
    title,
    subtitle,
    icon: Icon,
    actions,
    className = ""
}) => {
    return (
        <div className={`flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 ${className}`}>
            <div className="space-y-1">
                <div className="flex items-center gap-3">
                    {Icon && (
                        <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400">
                            <Icon size={24} />
                        </div>
                    )}
                    <h1 className="text-3xl font-extrabold tracking-tight">
                        <span className="bg-clip-text text-transparent bg-gradient-to-r from-teal-400 to-blue-500">
                            {title}
                        </span>
                    </h1>
                </div>
                {subtitle && (
                    <p className="text-gray-500 dark:text-gray-400 max-w-2xl leading-relaxed">
                        {subtitle}
                    </p>
                )}
            </div>
            {actions && (
                <div className="flex items-center gap-3 shrink-0">
                    {actions}
                </div>
            )}
        </div>
    );
};

export default PageHeader;
