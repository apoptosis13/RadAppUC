import React, { useEffect } from 'react';
import { activityLogService } from '../services/activityLogService';

const GlobalErrorHandler = ({ children }) => {
    useEffect(() => {
        const handleError = (event) => {
            console.error("Global captured error:", event.error);
            try {
                activityLogService.logActivity('ERROR', {
                    message: event.message || 'Unknown error',
                    stack: event.error?.stack || 'No stack trace',
                    source: event.filename,
                    lineno: event.lineno,
                    colno: event.colno,
                    type: 'window_error'
                });
            } catch (loggingError) {
                console.error("Failed to log global error:", loggingError);
            }
        };

        const handleRejection = (event) => {
            console.error("Global unhandled rejection:", event.reason);
            try {
                activityLogService.logActivity('ERROR', {
                    message: event.reason?.message || String(event.reason),
                    stack: event.reason?.stack || 'No stack trace',
                    type: 'unhandled_rejection'
                });
            } catch (loggingError) {
                console.error("Failed to log rejection:", loggingError);
            }
        };

        window.addEventListener('error', handleError);
        window.addEventListener('unhandledrejection', handleRejection);

        return () => {
            window.removeEventListener('error', handleError);
            window.removeEventListener('unhandledrejection', handleRejection);
        };
    }, []);

    return <>{children}</>;
};

export default GlobalErrorHandler;
