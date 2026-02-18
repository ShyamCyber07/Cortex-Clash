import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, Award, Activity, Swords } from 'lucide-react';

const PlayerAnalytics = () => {
    const { id } = useParams(); // User ID
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    // If no ID passed, use current user
    const targetId = id || JSON.parse(localStorage.getItem('user'))?._id;

    useEffect(() => {
        const fetchAnalytics = async () => {
            try {
                const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/v1/analytics/player/${targetId}`, {
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
                });
                const result = await response.json();
                setData(result);
            } catch (error) {
                console.error('Error fetching analytics:', error);
            } finally {
                setLoading(false);
            }
        };

        if (targetId) fetchAnalytics();
    }, [targetId]);

    if (loading) return <div className="text-center py-12 text-white">Loading Analytics...</div>;
    if (!data) return <div className="text-center py-12 text-white">No data available.</div>;

    return (
        <div className="space-y-8">
            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="glass-card p-4">
                    <div className="flex items-center gap-3 mb-2">
                        <Award className="h-5 w-5 text-yellow-400" />
                        <h4 className="text-gray-400 text-sm">Review</h4>
                    </div>
                    <p className="text-2xl font-bold text-white">{data?.stats?.currentElo || 0} <span className="text-xs text-gray-500">ELO</span></p>
                </div>
                <div className="glass-card p-4">
                    <div className="flex items-center gap-3 mb-2">
                        <TrendingUp className="h-5 w-5 text-emerald-400" />
                        <h4 className="text-gray-400 text-sm">Win Rate</h4>
                    </div>
                    <p className="text-2xl font-bold text-white">{data?.stats?.winRate || 0}%</p>
                </div>
                <div className="glass-card p-4">
                    <div className="flex items-center gap-3 mb-2">
                        <Swords className="h-5 w-5 text-indigo-400" />
                        <h4 className="text-gray-400 text-sm">Matches</h4>
                    </div>
                    <p className="text-2xl font-bold text-white">{data?.stats?.matchesPlayed || 0}</p>
                </div>
                <div className="glass-card p-4">
                    <div className="flex items-center gap-3 mb-2">
                        <Activity className="h-5 w-5 text-blue-400" />
                        <h4 className="text-gray-400 text-sm">Consistency</h4>
                    </div>
                    <p className="text-2xl font-bold text-white">{data?.stats?.consistency || 0}</p>
                </div>
            </div>

            {/* Elo Chart */}
            <div className="glass-card p-6">
                <h3 className="text-lg font-bold text-white mb-6">Elo Progression</h3>
                <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={data?.eloHistory || []}>
                            <defs>
                                <linearGradient id="colorElo" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8} />
                                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                            <XAxis dataKey="date" stroke="#94a3b8" />
                            <YAxis stroke="#94a3b8" domain={['dataMin - 50', 'dataMax + 50']} />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#fff' }}
                                itemStyle={{ color: '#fff' }}
                            />
                            <Area type="monotone" dataKey="rating" stroke="#6366f1" fillOpacity={1} fill="url(#colorElo)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Recent Matches */}
            <div className="glass-card p-6">
                <h3 className="text-lg font-bold text-white mb-4">Recent Performance</h3>
                <div className="space-y-3">
                    {data.recentMatches.map(match => (
                        <div key={match._id} className="flex justify-between items-center p-3 bg-slate-800/50 rounded border border-slate-700">
                            <div className="flex flex-col">
                                <span className="text-white font-medium">{match.tournament?.name || 'Match'}</span>
                                <span className="text-xs text-gray-400">vs {match.participants.find(p => p._id !== targetId)?.username || 'Opponent'}</span>
                            </div>
                            <div className={`px-2 py-1 rounded text-xs font-bold ${match.winner?._id === targetId ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                                {match.winner?._id === targetId ? 'WON' : 'LOST'}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default PlayerAnalytics;
