import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Shield, Medal } from 'lucide-react';

const Rankings = () => {
    const [loading, setLoading] = useState(true);
    const [games, setGames] = useState([]);
    const [activeGameId, setActiveGameId] = useState('global');
    const [leaderboard, setLeaderboard] = useState([]);
    const [gameName, setGameName] = useState('Global');

    useEffect(() => {
        // Fetch Games for tabs
        const fetchGames = async () => {
            try {
                const res = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/games`);
                const data = await res.json();
                setGames(data);
            } catch (err) {
                console.error('Failed to load games', err);
            }
        };
        fetchGames();
    }, []);

    useEffect(() => {
        const fetchLeaderboard = async () => {
            setLoading(true);
            try {
                let url = `${import.meta.env.VITE_API_URL}/api/v1/leaderboard`;
                if (activeGameId !== 'global') {
                    url += `/${activeGameId}`;
                }

                const res = await fetch(url);
                const data = await res.json();

                if (activeGameId === 'global') {
                    setLeaderboard(data);
                    setGameName('Global');
                } else {
                    setLeaderboard(data.leaderboard || []);
                    setGameName(data.gameName || 'Game');
                }
            } catch (err) {
                console.error('Failed to load leaderboard', err);
            } finally {
                setLoading(false);
            }
        };

        fetchLeaderboard();
    }, [activeGameId]);

    const getRankBadge = (rank) => {
        if (rank === 1) return <Medal className="h-6 w-6 text-yellow-400" />;
        if (rank === 2) return <Medal className="h-6 w-6 text-gray-300" />;
        if (rank === 3) return <Medal className="h-6 w-6 text-amber-600" />;
        return <span className="font-mono font-bold text-gray-500">#{rank}</span>;
    };

    return (
        <div className="pt-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto min-h-screen">
            <div className="text-center mb-12">
                <h1 className="text-4xl font-display font-bold text-white mb-4">
                    <span className="text-indigo-500">Cortex</span> Rankings
                </h1>

                {/* Season Indicator */}
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-gradient-to-r from-purple-500/20 to-indigo-500/20 border border-indigo-500/50 rounded-full mb-4">
                    <Trophy className="h-4 w-4 text-yello-400" />
                    <span className="text-xs font-bold text-indigo-300 uppercase tracking-wider">Season 1: Genesis Active</span>
                </div>

                <p className="text-gray-400 max-w-2xl mx-auto">
                    See who dominates the arena. Climb the ladder and prove your worth.
                </p>
            </div>

            {/* Game Tabs */}
            <div className="flex flex-wrap justify-center gap-4 mb-10">
                <button
                    onClick={() => setActiveGameId('global')}
                    className={`px-6 py-2 rounded-full font-bold transition-all flex items-center gap-2
                        ${activeGameId === 'global'
                            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/25 scale-105'
                            : 'bg-slate-800 text-gray-400 hover:bg-slate-700'}`}
                >
                    <Trophy className="h-4 w-4" /> Global
                </button>
                {games.map(game => (
                    <button
                        key={game._id}
                        onClick={() => setActiveGameId(game._id)}
                        className={`px-6 py-2 rounded-full font-bold transition-all flex items-center gap-2
                            ${activeGameId === game._id
                                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/25 scale-105'
                                : 'bg-slate-800 text-gray-400 hover:bg-slate-700'}`}
                    >
                        {game.icon ? <img src={game.icon} className="w-4 h-4 rounded-full" alt="" /> : <Shield className="h-4 w-4" />}
                        {game.name}
                    </button>
                ))}
            </div>

            {/* Leaderboard Table */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                key={activeGameId} // Re-animate on toggle
                className="glass-card overflow-hidden"
            >
                <div className="p-6 border-b border-slate-700 bg-slate-800/50 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        {gameName} Leaderboard
                    </h2>
                    <span className="text-sm text-gray-400">Top 100 Players</span>
                </div>

                {loading ? (
                    <div className="p-12 text-center text-gray-400">Loading rankings...</div>
                ) : leaderboard.length === 0 ? (
                    <div className="p-12 text-center text-gray-400">No ranked players found for this game yet.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-slate-900/50 text-gray-400 text-sm uppercase tracking-wider">
                                <tr>
                                    <th className="px-6 py-4 font-medium">Rank</th>
                                    <th className="px-6 py-4 font-medium">Player</th>
                                    <th className="px-6 py-4 font-medium text-right">Rating</th>
                                    <th className="px-6 py-4 font-medium text-center">W / L</th>
                                    <th className="px-6 py-4 font-medium text-right">Win Rate</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-700/50">
                                {leaderboard.map((player) => (
                                    <tr key={player._id} className="hover:bg-slate-700/30 transition-colors">
                                        <td className="px-6 py-4 w-20">
                                            <div className="flex justify-center w-8">
                                                {getRankBadge(player.rank)}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-slate-700 overflow-hidden border border-slate-600">
                                                    {player.avatar ? (
                                                        <img src={player.avatar} alt="" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-xs text-gray-500 font-bold">
                                                            {player.username.substring(0, 2).toUpperCase()}
                                                        </div>
                                                    )}
                                                </div>
                                                <span className="font-bold text-white">{player.username}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <span className="text-indigo-400 font-bold font-mono">{player.rating}</span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className="text-emerald-400">{player.wins}</span>
                                            <span className="text-gray-600 mx-2">/</span>
                                            <span className="text-red-400">{player.losses}</span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <span className={`${player.winRate >= 50 ? 'text-emerald-400' : 'text-gray-400'}`}>
                                                {player.winRate}%
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </motion.div>
        </div>
    );
};

export default Rankings;
