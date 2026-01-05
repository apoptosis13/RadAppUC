import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { activityLogService } from '../services/activityLogService';

const ActivityTracker = () => {
    const location = useLocation();

    useEffect(() => {
        // Log the page view
        const logPageView = async () => {
            try {
                // Update local activity timestamp for session timeout logic
                localStorage.setItem('lastActivity', Date.now().toString());

                await activityLogService.logActivity('VIEW_PAGE', {
                    path: location.pathname,
                    search: location.search
                });
            } catch (error) {
                // Silently fail to not disrupt user experience
                console.error('Error logging page view:', error);
            }
        };

        logPageView();
    }, [location.pathname]); // Only log when path changes, ignoring query param updates for now to avoid spam

    return null; // This component renders nothing
};

export default ActivityTracker;
