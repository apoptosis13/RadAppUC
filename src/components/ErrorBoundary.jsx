import React from 'react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        // Update state so the next render will show the fallback UI.
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        // You can also log the error to an error reporting service
        console.error("Uncaught error:", error, errorInfo);
        this.setState({ errorInfo });
    }

    render() {
        if (this.state.hasError) {
            // You can render any custom fallback UI
            return (
                <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
                    <div className="max-w-md w-full space-y-8 text-center p-6 bg-white dark:bg-gray-800 shadow-xl rounded-lg border border-red-100 dark:border-red-900">
                        <h2 className="text-2xl font-bold text-red-600 dark:text-red-400">Something went wrong</h2>
                        <div className="text-gray-500 dark:text-gray-300 text-sm text-left bg-gray-100 dark:bg-gray-900 p-4 rounded overflow-auto max-h-48">
                            <p className="font-mono">{this.state.error && this.state.error.toString()}</p>
                        </div>
                        <button
                            onClick={() => window.location.reload()}
                            className="mt-4 w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        >
                            Reload Page
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
