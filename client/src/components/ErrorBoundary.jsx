import React, { Component } from 'react';

class ErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        this.setState({ error, errorInfo });
        console.error("Uncaught error:", error, errorInfo);
        // Here you would log to a monitoring service (Sentry, LogRocket, etc.)
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="flex items-center justify-center min-h-screen bg-slate-900 text-white p-4">
                    <div className="glass-card max-w-md w-full p-8 text-center border-red-500/30 bg-red-500/5">
                        <div className="mx-auto w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mb-6">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        </div>
                        <h2 className="text-2xl font-bold mb-2">Something went wrong</h2>
                        <p className="text-gray-400 mb-6">
                            We've been notified about this issue and are working to fix it.
                        </p>
                        <button
                            onClick={() => window.location.href = '/'}
                            className="btn-primary w-full py-3 rounded-lg font-bold"
                        >
                            Return Home
                        </button>

                        {process.env.NODE_ENV !== 'production' && this.state.error && (
                            <div className="mt-8 text-left text-xs text-red-300 bg-red-950/50 p-4 rounded overflow-auto max-h-48">
                                <p className="font-bold mb-1">{this.state.error.toString()}</p>
                                <pre>{this.state.errorInfo.componentStack}</pre>
                            </div>
                        )}
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
