import { useState, useEffect } from 'react';

const Debug = () => {
    const [healthStatus, setHealthStatus] = useState('Checking...');
    const [envVar, setEnvVar] = useState(import.meta.env.VITE_API_URL || 'Not Set (Using Localhost fallback)');

    const checkHealth = async () => {
        try {
            const url = `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}`;
            const res = await fetch(url);
            const text = await res.text();
            setHealthStatus(`Success: ${res.status} ${res.statusText} - ${text}`);
        } catch (err) {
            setHealthStatus(`Error: ${err.message}`);
        }
    };

    useEffect(() => {
        checkHealth();
    }, []);

    return (
        <div className="pt-24 px-8 text-white">
            <h1 className="text-2xl font-bold mb-4">Deployment Debugger</h1>
            <div className="space-y-4">
                <div className="p-4 bg-slate-800 rounded">
                    <h2 className="font-bold text-gray-400">VITE_API_URL</h2>
                    <code className="block mt-2 bg-black p-2 rounded">{envVar}</code>
                </div>
                <div className="p-4 bg-slate-800 rounded">
                    <h2 className="font-bold text-gray-400">Backend Connection Test</h2>
                    <pre className="block mt-2 bg-black p-2 rounded whitespace-pre-wrap">{healthStatus}</pre>
                </div>
                <button onClick={checkHealth} className="btn-primary px-4 py-2 rounded">
                    Retry Connection
                </button>
            </div>
        </div>
    );
};

export default Debug;
