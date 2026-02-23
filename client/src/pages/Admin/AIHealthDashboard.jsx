import { useState, useEffect } from 'react';
import axios from 'axios';
import { Brain, Activity, Target, ShieldCheck, AlertTriangle } from 'lucide-react';

const AIHealthDashboard = () => {
    const [metrics, setMetrics] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchMetrics();
    }, []);

    const fetchMetrics = async () => {
        try {
            const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
            const { data } = await axios.get(`${API_URL}/api/v1/ai/metrics`, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`
                }
            });
            setMetrics(data);
            setError('');
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to fetch AI metrics');
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="p-8 text-center text-gray-400">Loading AI Health Data...</div>;
    if (error) return <div className="p-8 text-center text-red-500">{error}</div>;

    const brierStatus = metrics.avgBrierScore < 0.2 ? 'Excellent' : (metrics.avgBrierScore < 0.25 ? 'Fair' : 'Needs Retraining');
    const accuracyColor = metrics.accuracy > 65 ? 'text-green-400' : 'text-yellow-400';

    return (
        <div className="p-6 md:p-8 space-y-8 animate-fade-in flex-1">
            <div className="flex justify-between items-center bg-slate-800 p-6 rounded-2xl shadow-lg border border-slate-700/50 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
                <div>
                    <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                        <Brain className="w-8 h-8 text-indigo-400" />
                        AI Health & Monitoring
                    </h1>
                    <p className="text-gray-400 mt-2">Real-time performance metrics of the Predictive Engine.</p>
                </div>
                <button
                    onClick={fetchMetrics}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors shadow-lg shadow-indigo-600/20"
                >
                    <Activity className="w-4 h-4" /> Refresh Data
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <MetricCard
                    title="Prediction Accuracy"
                    value={`${metrics.accuracy}%`}
                    subtitle="Last 100 Matches"
                    icon={<Target className="w-6 h-6 text-green-400" />}
                    valueColor={accuracyColor}
                />
                <MetricCard
                    title="Avg Confidence / Truth"
                    value={`${metrics.avgConfidence}%`}
                    subtitle="Expected Win Rate"
                    icon={<Activity className="w-6 h-6 text-indigo-400" />}
                />
                <MetricCard
                    title="Brier Score"
                    value={metrics.avgBrierScore}
                    subtitle={brierStatus}
                    icon={<ShieldCheck className={`w-6 h-6 ${brierStatus === 'Excellent' ? 'text-green-400' : 'text-yellow-400'}`} />}
                    valueColor={brierStatus === 'Excellent' ? 'text-white' : 'text-yellow-400'}
                />
                <MetricCard
                    title="Matches Analyzed"
                    value={metrics.totalAnalyzed}
                    subtitle="In Sample Data"
                    icon={<Brain className="w-6 h-6 text-purple-400" />}
                />
            </div>

            <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden shadow-xl">
                <div className="p-6 border-b border-slate-700 flex justify-between items-center">
                    <h2 className="text-xl font-bold flex items-center gap-2 text-white">
                        <Target className="w-5 h-5 text-indigo-400" />
                        Recent Prediction Outcomes
                    </h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-900/50 text-gray-400 text-sm">
                                <th className="p-4 font-medium">Match ID</th>
                                <th className="p-4 font-medium">Win Probability</th>
                                <th className="p-4 font-medium">Predicted Winner</th>
                                <th className="p-4 font-medium">Outcome</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700">
                            {metrics.history.slice(0, 10).map(item => (
                                <tr key={item._id} className="hover:bg-slate-700/30 transition-colors">
                                    <td className="p-4 text-gray-300 text-sm font-mono">{String(item.match).slice(-6)}</td>
                                    <td className="p-4 text-gray-300">{(item.winProbability * 100).toFixed(1)}%</td>
                                    <td className="p-4 text-gray-300">{item.predictedWinner.toUpperCase()}</td>
                                    <td className="p-4">
                                        {item.isCorrect ? (
                                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-green-500/10 text-green-400 border border-green-500/20">
                                                <Target className="w-3.5 h-3.5" /> Correct
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20">
                                                <AlertTriangle className="w-3.5 h-3.5" /> Miss
                                            </span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {metrics.history.length === 0 && (
                        <div className="p-8 text-center text-gray-500">No AI predictions tracked yet.</div>
                    )}
                </div>
            </div>
        </div>
    );
};

const MetricCard = ({ title, value, subtitle, icon, valueColor = 'text-white' }) => (
    <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700/50 shadow-lg group hover:border-slate-600 transition-all duration-300">
        <div className="flex justify-between items-start mb-4">
            <h3 className="text-gray-400 font-medium text-sm tracking-wide uppercase">{title}</h3>
            <div className="bg-slate-900/50 p-2 rounded-lg group-hover:scale-110 transition-transform">{icon}</div>
        </div>
        <div className={`text-4xl font-bold ${valueColor} mb-2 tracking-tight`}>{value}</div>
        <p className="text-sm text-gray-400">{subtitle}</p>
    </div>
);

export default AIHealthDashboard;
