import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, Trophy, Users, Activity, LogOut } from 'lucide-react';
import PlayerAnalytics from '../components/Analytics/PlayerAnalytics';

const Dashboard = () => {
    const user = JSON.parse(localStorage.getItem('user'));
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('overview'); // For future tabs if needed
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
