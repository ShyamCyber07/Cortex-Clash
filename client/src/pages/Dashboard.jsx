import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, Trophy, Users, Activity, LogOut, Shield, UserPlus, LogIn } from 'lucide-react';
import PlayerAnalytics from '../components/Analytics/PlayerAnalytics';

const Dashboard = () => {
    const user = JSON.parse(localStorage.getItem('user'));
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('overview'); // For future tabs if needed

    const [team, setTeam] = useState(null);
    const [teamLoading, setTeamLoading] = useState(true);

    useEffect(() => {
        const fetchTeamInfo = async () => {
            try {
                const response = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/teams/my-team`, {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    }
                });

                if (response.ok) {
                    const data = await response.json();
                    if (data && data._id) {
                        setTeam(data);
                    }
                }
            } catch (error) {
                console.error('Error fetching team on dashboard:', error);
            } finally {
                setTeamLoading(false);
            }
        };

        if (user) {
            fetchTeamInfo();
        }
    }, [user]);

    if (!user) {
        window.location.href = '/login';
        return null;
    }

    const winRate = user?.stats?.matchesPlayed > 0
        ? Math.round((user.stats.wins / user.stats.matchesPlayed) * 100)
        : 0;

    // Safe access helpers
    const rankPoints = user?.stats?.rankPoints || 0;
    const consistency = user?.stats?.consistency || 0;

    return (
        <div className="pt-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-8"
            >
                <h1 className="text-3xl sm:text-4xl font-display font-bold text-white">
                    Welcome back, <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">{user.username}</span>
                </h1>
            </motion.div>

            {/* Analytics Section */}
            <div className="mt-8 mb-8">
                <h2 className="text-2xl font-bold text-white mb-6">Your Performance</h2>
                <PlayerAnalytics />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-12">
                {/* Stats Card */}
                <div className="glass-card">
                    <h3 className="text-gray-400 text-sm font-medium uppercase tracking-wider mb-2">Rank Rating</h3>
                    <div className="text-4xl font-bold font-display text-white">{rankPoints}</div>
                    <div className="text-emerald-400 text-sm mt-2 flex items-center gap-1">
                        +125 <span className="text-gray-500">since last week</span>
                    </div>
                </div>
                <div className="glass-card">
                    <h3 className="text-gray-400 text-sm font-medium uppercase tracking-wider mb-2">Win Rate</h3>
                    <div className="text-4xl font-bold font-display text-white">{winRate}%</div>
                    <div className="text-emerald-400 text-sm mt-2 flex items-center gap-1">
                        {consistency}% <span className="text-gray-500">consistency</span>
                    </div>
                </div>
                <div className="glass-card">
                    <h3 className="text-gray-400 text-sm font-medium uppercase tracking-wider mb-2">Next Match</h3>
                    <div className="text-xl font-bold font-display text-white mt-1">vs. Team Liquid</div>
                    <div className="text-indigo-400 text-sm mt-2">
                        Today, 8:00 PM
                    </div>
                </div>
            </div>

            {/* Team Section */}
            <div className="mt-8 glass-card">
                <div className="flex items-center gap-3 mb-6">
                    <Shield className="h-6 w-6 text-indigo-500" />
                    <h3 className="text-xl font-bold text-white">Your Team</h3>
                </div>

                {teamLoading ? (
                    <div className="text-gray-400">Loading team data...</div>
                ) : team ? (
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-800/30 p-4 rounded-lg border border-slate-700/50">
                        <div>
                            <h4 className="text-2xl font-bold text-white mb-1">{team.name}</h4>
                            <div className="flex items-center gap-4 text-sm">
                                <span className="text-gray-400">Captain: <span className="text-indigo-400 font-medium">{team.captain?.username}</span></span>
                                <span className="text-gray-400 flex items-center gap-1"><Users className="h-4 w-4" /> {team.members?.length} Members</span>
                            </div>
                        </div>
                        <Link to="/team" className="bg-slate-700 hover:bg-slate-600 px-4 py-2 rounded-lg font-bold text-white transition-colors">
                            Manage Team
                        </Link>
                    </div>
                ) : (
                    <div className="bg-slate-800/30 p-6 rounded-lg border border-slate-700/50 text-center">
                        <h4 className="text-lg font-bold text-gray-300 mb-2">No Team Found</h4>
                        <p className="text-sm text-gray-400 mb-6 font-medium">You need an active team to register for tournaments.</p>
                        <div className="flex flex-col sm:flex-row justify-center gap-4 max-w-sm mx-auto">
                            <Link to="/team" className="flex-1 btn-primary py-2 px-4 rounded-lg font-bold flex items-center justify-center gap-2">
                                <UserPlus className="h-4 w-4" /> Create Team
                            </Link>
                            <Link to="/team" className="flex-1 bg-slate-700 hover:bg-slate-600 py-2 px-4 rounded-lg font-bold text-white flex items-center justify-center gap-2 transition-colors">
                                <LogIn className="h-4 w-4" /> Join Team
                            </Link>
                        </div>
                    </div>
                )}
            </div>

            {/* Recent Matches */}
            <div className="mt-8 glass-card">
                <h3 className="text-xl font-bold text-white mb-6">Recent Match History</h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-gray-700 text-gray-400 text-sm uppercase">
                                <th className="pb-4">Tournament</th>
                                <th className="pb-4">Result</th>
                                <th className="pb-4">K/D/A</th>
                                <th className="pb-4">Map</th>
                            </tr>
                        </thead>
                        <tbody className="text-gray-300">
                            <tr className="border-b border-gray-800">
                                <td className="py-4 font-medium text-white">Weekly Showdown #42</td>
                                <td className="py-4 text-emerald-400">Victory</td>
                                <td className="py-4">18/4/12</td>
                                <td className="py-4">Ascent</td>
                            </tr>
                            <tr className="border-b border-gray-800">
                                <td className="py-4 font-medium text-white">Pro League Qualifiers</td>
                                <td className="py-4 text-rose-400">Defeat</td>
                                <td className="py-4">12/15/8</td>
                                <td className="py-4">Haven</td>
                            </tr>
                            <tr>
                                <td className="py-4 font-medium text-white">Scrimmage</td>
                                <td className="py-4 text-emerald-400">Victory</td>
                                <td className="py-4">24/8/5</td>
                                <td className="py-4">Bind</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

export default Dashboard;
