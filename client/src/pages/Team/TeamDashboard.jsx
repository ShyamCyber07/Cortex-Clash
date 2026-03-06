import { useState, useEffect } from 'react';
import { Users, Shield, UserPlus, Copy, LogIn } from 'lucide-react';
import { motion } from 'framer-motion';

const TeamDashboard = () => {
    const [team, setTeam] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [view, setView] = useState('none'); // 'none', 'create', 'join', 'dashboard'

    const [createData, setCreateData] = useState({ name: '', maxMembers: 4 });
    const [joinData, setJoinData] = useState({ inviteCode: '' });

    const fetchTeam = async () => {
        try {
            setLoading(true);
            const response = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/teams/my-team`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                setTeam(data);
                setView('dashboard');
            } else {
                setTeam(null);
                setView('none');
            }
        } catch (err) {
            console.error('Error fetching team:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTeam();
    }, []);

    const handleCreateTeam = async (e) => {
        e.preventDefault();
        setError('');
        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/teams/create`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(createData)
            });

            const data = await response.json();
            if (response.ok) {
                fetchTeam();
            } else {
                setError(data.message || 'Failed to create team');
            }
        } catch (err) {
            setError('Server error');
        }
    };

    const handleJoinTeam = async (e) => {
        e.preventDefault();
        setError('');
        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/teams/join`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ inviteCode: joinData.inviteCode.trim() })
            });

            const data = await response.json();
            if (response.ok) {
                fetchTeam();
            } else {
                setError(data.message || 'Failed to join team');
            }
        } catch (err) {
            setError('Server error');
        }
    };

    const copyToClipboard = () => {
        if (team?.inviteCode) {
            navigator.clipboard.writeText(team.inviteCode);
            alert('Invite code copied to clipboard!');
        }
    };

    if (loading) {
        return <div className="min-h-screen pt-24 text-center text-white">Loading team data...</div>;
    }

    return (
        <div className="pt-24 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto min-h-screen">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-card p-8"
            >
                <div className="flex items-center gap-3 mb-8">
                    <Shield className="h-8 w-8 text-indigo-500" />
                    <h1 className="text-3xl font-display font-bold text-white">Team Management</h1>
                </div>

                {error && (
                    <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-4 rounded-lg mb-6">
                        {error}
                    </div>
                )}

                {view === 'none' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-slate-800/50 p-6 rounded-lg border border-slate-700 text-center hover:border-indigo-500/50 transition-colors">
                            <h3 className="text-xl font-bold text-white mb-2">Create a New Team</h3>
                            <p className="text-gray-400 mb-6 text-sm">Become a captain and invite your friends to compete.</p>
                            <button onClick={() => setView('create')} className="btn-primary w-full py-2 rounded-lg font-bold flex items-center justify-center gap-2">
                                <UserPlus className="h-4 w-4" /> Create Team
                            </button>
                        </div>
                        <div className="bg-slate-800/50 p-6 rounded-lg border border-slate-700 text-center hover:border-indigo-500/50 transition-colors">
                            <h3 className="text-xl font-bold text-white mb-2">Join a Team</h3>
                            <p className="text-gray-400 mb-6 text-sm">Have an invite code? Join an existing team here.</p>
                            <button onClick={() => setView('join')} className="bg-slate-700 hover:bg-slate-600 w-full py-2 rounded-lg font-bold flex items-center justify-center gap-2 transition-colors">
                                <LogIn className="h-4 w-4" /> Join Team
                            </button>
                        </div>
                    </div>
                )}

                {view === 'create' && (
                    <form onSubmit={handleCreateTeam} className="space-y-6 max-w-md mx-auto">
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">Team Name</label>
                            <input
                                type="text"
                                className="w-full bg-slate-900/50 border border-slate-700 rounded-lg py-3 px-4 text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                                placeholder="Awesome Esports Team"
                                value={createData.name}
                                onChange={(e) => setCreateData({ ...createData, name: e.target.value })}
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">Max Members</label>
                            <input
                                type="number"
                                min="2"
                                max="10"
                                className="w-full bg-slate-900/50 border border-slate-700 rounded-lg py-3 px-4 text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                                value={createData.maxMembers}
                                onChange={(e) => setCreateData({ ...createData, maxMembers: parseInt(e.target.value) })}
                                required
                            />
                        </div>
                        <div className="flex gap-4">
                            <button type="button" onClick={() => { setView('none'); setError(''); }} className="flex-1 bg-slate-700 hover:bg-slate-600 py-3 rounded-lg font-bold transition-colors">
                                Cancel
                            </button>
                            <button type="submit" className="flex-1 btn-primary py-3 rounded-lg font-bold">
                                Create
                            </button>
                        </div>
                    </form>
                )}

                {view === 'join' && (
                    <form onSubmit={handleJoinTeam} className="space-y-6 max-w-md mx-auto">
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">Invite Code</label>
                            <input
                                type="text"
                                className="w-full bg-slate-900/50 border border-slate-700 rounded-lg py-3 px-4 text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent uppercase transition-all"
                                placeholder="CC-XXXX"
                                value={joinData.inviteCode}
                                onChange={(e) => setJoinData({ inviteCode: e.target.value.toUpperCase() })}
                                required
                            />
                        </div>
                        <div className="flex gap-4">
                            <button type="button" onClick={() => { setView('none'); setError(''); }} className="flex-1 bg-slate-700 hover:bg-slate-600 py-3 rounded-lg font-bold transition-colors">
                                Cancel
                            </button>
                            <button type="submit" className="flex-1 btn-primary py-3 rounded-lg font-bold">
                                Join
                            </button>
                        </div>
                    </form>
                )}

                {view === 'dashboard' && team && (
                    <div className="space-y-8">
                        <div className="bg-slate-800/50 p-6 rounded-lg border border-slate-700 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                            <div>
                                <h2 className="text-2xl font-bold text-white mb-1">{team.name}</h2>
                                <p className="text-sm text-gray-400">Captain: <span className="text-indigo-400 font-medium">{team.captain?.username}</span></p>
                            </div>
                            <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-700 flex items-center gap-3">
                                <div>
                                    <p className="text-xs text-gray-500 font-medium tracking-wider uppercase mb-1">Invite Code</p>
                                    <p className="text-lg font-mono font-bold text-emerald-400">{team.inviteCode}</p>
                                </div>
                                <button onClick={copyToClipboard} className="p-2 hover:bg-slate-800 rounded bg-slate-700/50 text-gray-300 transition-colors" title="Copy to clipboard">
                                    <Copy className="h-4 w-4" />
                                </button>
                            </div>
                        </div>

                        <div>
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                    <Users className="h-5 w-5 text-indigo-400" /> Team Members
                                </h3>
                                <span className="text-sm text-gray-400 bg-slate-800 px-2 py-1 rounded-md border border-slate-700">
                                    {team.members.length} / {team.maxMembers}
                                </span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {team.members.map(member => (
                                    <div key={member._id} className="bg-slate-800/30 p-4 rounded-lg border border-slate-700/50 flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-indigo-900/50 border border-indigo-500/30 flex items-center justify-center text-indigo-300 font-bold uppercase">
                                            {member.username ? member.username.substring(0, 2) : 'UK'}
                                        </div>
                                        <div>
                                            <p className="font-medium text-gray-200">{member.username}</p>
                                            {member._id === team.captain?._id && (
                                                <span className="text-xs text-indigo-400 font-medium uppercase tracking-wider">Captain</span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </motion.div>
        </div>
    );
};

export default TeamDashboard;
