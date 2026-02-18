import { Plus, Trophy, Users, Settings, Calendar, Shield, AlertTriangle } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';

const AdminDashboard = () => {
    const navigate = useNavigate();
    const [stats, setStats] = useState({
        users: 0,
        tournaments: 0,
        matches: 0
    });

    useEffect(() => {
        // Optional: Fetch platform stats
    }, []);

    const actions = [
        {
            title: 'Create Tournament',
            description: 'Set up a new competitive event.',
            icon: Trophy,
            link: '/tournaments/create',
            color: 'bg-indigo-500'
        },
        {
            title: 'Manage Seasons',
            description: 'Start or end competitive seasons.',
            icon: Calendar,
            link: '/admin/seasons', // We might need to build this or just a placeholder
            color: 'bg-emerald-500'
        },
        {
            title: 'User Management',
            description: 'View and ban users.',
            icon: Users,
            link: '/admin/users',
            color: 'bg-blue-500'
        },
        {
            title: 'Game Settings',
            description: 'Configure game rules and maps.',
            icon: Settings,
            link: '/admin/games',
            color: 'bg-purple-500'
        },
        {
            title: 'Integrity System',
            description: 'Monitor suspicious player activity.',
            icon: AlertTriangle,
            link: '/admin/integrity',
            color: 'bg-red-500'
        }
    ];

    const [flaggedUsers, setFlaggedUsers] = useState([]);

    useEffect(() => {
        const fetchFlagged = async () => {
            try {
                const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/v1/users/flagged`, {
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
                });
                if (res.ok) setFlaggedUsers(await res.json());
            } catch (e) { console.error(e); }
        };
        fetchFlagged();
    }, []);

    return (
        <div className="pt-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto min-h-screen">
            <div className="mb-8">
                <h1 className="text-3xl font-display font-bold text-white flex items-center gap-3">
                    <Shield className="h-8 w-8 text-indigo-500" />
                    Admin Control Panel
                </h1>
                <p className="text-gray-400 mt-2">Manage the Cortex Clash platform.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {actions.map((action, index) => (
                    <motion.div
                        key={action.title}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                    >
                        <Link
                            to={action.link}
                            className="block h-full p-6 glass-card hover:bg-slate-800/50 transition-all group"
                        >
                            <div className={`w-12 h-12 rounded-lg ${action.color} bg-opacity-20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                                <action.icon className={`h-6 w-6 ${action.color.replace('bg-', 'text-')}`} />
                            </div>
                            <h3 className="text-lg font-bold text-white mb-2">{action.title}</h3>
                            <p className="text-sm text-gray-400">{action.description}</p>
                        </Link>
                    </motion.div>
                ))}
            </div>

            {/* Quick Stats Placeholder */}
            <div className="mt-12">
                <h2 className="text-xl font-bold text-white mb-6">Platform Overview</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="p-6 bg-slate-800 rounded-xl border border-slate-700">
                        <div className="text-gray-400 text-sm font-medium">Total Users</div>
                        <div className="text-3xl font-bold text-white mt-1">1,248</div>
                    </div>
                    <div className="p-6 bg-slate-800 rounded-xl border border-slate-700">
                        <div className="text-gray-400 text-sm font-medium">Active Tournaments</div>
                        <div className="text-3xl font-bold text-white mt-1">12</div>
                    </div>
                    <div className="p-6 bg-slate-800 rounded-xl border border-slate-700">
                        <div className="text-gray-400 text-sm font-medium">Matches Played</div>
                        <div className="text-3xl font-bold text-white mt-1">8,503</div>
                    </div>
                </div>
            </div>
            {/* Integrity Alert Section */}
            {flaggedUsers.length > 0 && (
                <div className="mt-12">
                    <h2 className="text-xl font-bold text-red-400 mb-6 flex items-center gap-2">
                        <AlertTriangle className="h-6 w-6" /> Flagged Accounts for Review
                    </h2>
                    <div className="bg-slate-900 border border-red-500/20 rounded-xl overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-slate-800 text-slate-400 text-sm uppercase">
                                    <tr>
                                        <th className="px-6 py-4">Player</th>
                                        <th className="px-6 py-4">Suspicion Score</th>
                                        <th className="px-6 py-4">Win Streak</th>
                                        <th className="px-6 py-4">Status</th>
                                        <th className="px-6 py-4">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800">
                                    {flaggedUsers.map(user => (
                                        <tr key={user._id} className="hover:bg-slate-800/50">
                                            <td className="px-6 py-4 font-bold text-white">{user.username}</td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-1 rounded text-xs font-bold ${user.integrity?.suspicionScore > 75 ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'
                                                    }`}>
                                                    {user.integrity?.suspicionScore || 0}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-gray-300">{user.integrity?.winStreak || 0}</td>
                                            <td className="px-6 py-4">
                                                {user.integrity?.isFlagged ? (
                                                    <span className="text-red-400 text-sm font-bold animate-pulse">FLAGGED</span>
                                                ) : (
                                                    <span className="text-gray-500 text-sm">Monitoring</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <button className="text-indigo-400 hover:text-indigo-300 text-sm font-bold">Review</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminDashboard;
