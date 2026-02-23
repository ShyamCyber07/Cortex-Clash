import { useState, useEffect } from 'react';
import { Shield, AlertTriangle, CheckCircle, Search, RefreshCcw, ArrowRight, User as UserIcon, Activity } from 'lucide-react';
import { motion } from 'framer-motion';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area
} from 'recharts';

const IntegrityDashboard = () => {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState(null);
    const [error, setError] = useState(null);

    const fetchData = async () => {
        try {
            setLoading(true);
            const res = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/integrity/overview`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            if (!res.ok) throw new Error('Failed to fetch integrity data');
            setData(await res.json());
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleUpdateStatus = async (userId, status) => {
        try {
            const res = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/integrity/status/${userId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ status })
            });
            if (res.ok) {
                fetchData(); // Refresh
            }
        } catch (err) {
            console.error(err);
        }
    };

    if (loading && !data) return (
        <div className="pt-24 flex justify-center items-center min-h-screen">
            <RefreshCcw className="h-10 w-10 text-indigo-500 animate-spin" />
        </div>
    );

    if (error) return (
        <div className="pt-24 px-4 max-w-7xl mx-auto">
            <div className="bg-red-500/10 border border-red-500 p-6 rounded-xl text-red-400">
                {error}
            </div>
        </div>
    );

    const summaryItems = [
        { label: 'Total Flagged', value: data.summary.totalFlagged, icon: AlertTriangle, color: 'text-red-400' },
        { label: 'Under Review', value: data.summary.activeInvestigations, icon: Shield, color: 'text-blue-400' },
        { label: 'Avg Suspicion', value: data.summary.avgSuspicionScore, icon: Activity, color: 'text-amber-400' },
        { label: 'Upset Rate', value: `${data.summary.avgUpsetProb}%`, icon: CheckCircle, color: 'text-emerald-400' }
    ];

    return (
        <div className="pt-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto min-h-screen pb-12">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-display font-bold text-white flex items-center gap-3">
                        <Shield className="h-8 w-8 text-red-500" />
                        Integrity Analytics
                    </h1>
                    <p className="text-gray-400 mt-2">Monitor and manage platform fairness.</p>
                </div>
                <button
                    onClick={fetchData}
                    className="p-2 glass-card hover:bg-slate-800 transition-colors rounded-lg"
                >
                    <RefreshCcw className="h-5 w-5 text-indigo-400" />
                </button>
            </div>

            {/* Summary Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                {summaryItems.map((item, id) => (
                    <motion.div
                        key={id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="glass-card p-6"
                    >
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-sm font-medium text-gray-400 mb-1">{item.label}</p>
                                <p className={`text-2xl font-bold text-white`}>{item.value}</p>
                            </div>
                            <item.icon className={`h-6 w-6 ${item.color}`} />
                        </div>
                    </motion.div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
                {/* Suspicion Trend (Mock data for visuals) */}
                <div className="lg:col-span-2 glass-card p-6">
                    <h3 className="text-lg font-bold text-white mb-6">Suspicion Distribution</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={[
                                { name: 'Day 1', score: 20 },
                                { name: 'Day 2', score: 45 },
                                { name: 'Day 3', score: 30 },
                                { name: 'Day 4', score: 70 },
                                { name: 'Day 5', score: 65 },
                                { name: 'Day 6', score: 85 },
                                { name: 'Day 7', score: 40 },
                            ]}>
                                <defs>
                                    <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                                <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px' }}
                                    itemStyle={{ color: '#fff' }}
                                />
                                <Area type="monotone" dataKey="score" stroke="#ef4444" strokeWidth={3} fillOpacity={1} fill="url(#colorScore)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Top Suspected */}
                <div className="glass-card p-6 overflow-hidden">
                    <h3 className="text-lg font-bold text-white mb-6">High Risk Players</h3>
                    <div className="space-y-4">
                        {data.topSuspected.map(user => (
                            <div key={user._id} className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50 hover:bg-slate-800 transition-colors group">
                                <div className="flex items-center gap-3">
                                    <div className="h-8 w-8 rounded-full bg-slate-700 flex items-center justify-center">
                                        <UserIcon className="h-4 w-4 text-gray-400" />
                                    </div>
                                    <div>
                                        <div className="text-sm font-bold text-white">{user.username}</div>
                                        <div className="text-xs text-gray-500">Streak: {user.integrity?.winStreak || 0}</div>
                                    </div>
                                </div>
                                <div className={`text-sm font-bold ${user.integrity?.suspicionScore > 70 ? 'text-red-400' : 'text-amber-400'}`}>
                                    {user.integrity?.suspicionScore}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Logs Table */}
            <div className="glass-card overflow-hidden">
                <div className="p-6 border-b border-slate-800 flex justify-between items-center">
                    <h3 className="text-lg font-bold text-white">Integrity Logs</h3>
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">Showing last 20 events</span>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-800/50 text-slate-400 text-xs uppercase font-bold">
                            <tr>
                                <th className="px-6 py-4">Player</th>
                                <th className="px-6 py-4">Anomaly Event</th>
                                <th className="px-6 py-4">Impact</th>
                                <th className="px-6 py-4">Date</th>
                                <th className="px-6 py-4">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                            {data.recentLogs.map(log => (
                                <tr key={log._id} className="hover:bg-slate-800/30 transition-all text-sm">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <span className="text-white font-bold">{log.user?.username || 'System'}</span>
                                            {log.user?.integrity?.isFlagged && <AlertTriangle className="h-3 w-3 text-red-500" />}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-gray-300">{log.reason}</td>
                                    <td className="px-6 py-4">
                                        <span className="text-red-400">+{log.scoreDelta}</span>
                                    </td>
                                    <td className="px-6 py-4 text-gray-500">
                                        {new Date(log.createdAt).toLocaleString()}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => handleUpdateStatus(log.user?._id, 'under_review')}
                                                className="px-2 py-1 rounded bg-blue-500/10 text-blue-400 text-xs hover:bg-blue-500/20"
                                            >
                                                Review
                                            </button>
                                            <button
                                                onClick={() => handleUpdateStatus(log.user?._id, 'cleared')}
                                                className="px-2 py-1 rounded bg-emerald-500/10 text-emerald-400 text-xs hover:bg-emerald-500/20"
                                            >
                                                Clear
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default IntegrityDashboard;
