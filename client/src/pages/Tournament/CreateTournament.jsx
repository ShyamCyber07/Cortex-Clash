import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

const CreateTournament = () => {
    const navigate = useNavigate();
    const [games, setGames] = useState([]);
    const [selectedGame, setSelectedGame] = useState(null);
    const [loading, setLoading] = useState(true);

    const [formData, setFormData] = useState({
        name: '',
        description: '',
        game: '', // ObjectId
        matchFormat: '',
        format: 'single-elimination',
        startDate: '',
        maxParticipants: 64,
        rules: ''
    });

    useEffect(() => {
        const fetchGames = async () => {
            try {
                const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/v1/games`);
                const data = await res.json();
                setGames(data);
                if (data.length > 0) {
                    // pre-select first game ? No, force user choice or not.
                }
            } catch (err) {
                console.error('Failed to load games', err);
            } finally {
                setLoading(false);
            }
        };
        fetchGames();
    }, []);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleGameChange = (e) => {
        const gameId = e.target.value;
        const game = games.find(g => g._id === gameId);
        setSelectedGame(game);
        setFormData({
            ...formData,
            game: gameId,
            matchFormat: game?.supportedFormats[0] || '' // Default to first format
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const token = localStorage.getItem('token');

        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/v1/tournaments`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                navigate('/tournaments');
            } else {
                const errorData = await response.json();
                alert(`Failed to create tournament: ${errorData.message}`);
            }
        } catch (error) {
            console.error('Error creating tournament:', error);
        }
    };

    if (loading) return <div className="pt-24 text-center text-white">Loading games...</div>;

    return (
        <div className="pt-24 px-4 sm:px-6 lg:px-8 max-w-3xl mx-auto min-h-screen">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-card p-8"
            >
                <h2 className="text-2xl font-bold font-display text-white mb-6">Create Tournament</h2>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Tournament Name</label>
                        <input
                            type="text"
                            name="name"
                            required
                            onChange={handleChange}
                            className="w-full bg-slate-900/50 border border-slate-700 rounded-lg py-3 px-4 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
                        <textarea
                            name="description"
                            rows="3"
                            onChange={handleChange}
                            className="w-full bg-slate-900/50 border border-slate-700 rounded-lg py-3 px-4 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        ></textarea>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">Select Game</label>
                            <select
                                name="game"
                                required
                                onChange={handleGameChange}
                                className="w-full bg-slate-900/50 border border-slate-700 rounded-lg py-3 px-4 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            >
                                <option value="">-- Select a Game --</option>
                                {games.map(g => (
                                    <option key={g._id} value={g._id}>{g.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">Match Format</label>
                            <select
                                name="matchFormat"
                                required
                                value={formData.matchFormat}
                                onChange={handleChange}
                                disabled={!selectedGame}
                                className="w-full bg-slate-900/50 border border-slate-700 rounded-lg py-3 px-4 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
                            >
                                {selectedGame ? (
                                    selectedGame.supportedFormats.map(fmt => (
                                        <option key={fmt} value={fmt}>{fmt}</option>
                                    ))
                                ) : (
                                    <option value="">Select game first</option>
                                )}
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">Tournament Format</label>
                            <select
                                name="format"
                                onChange={handleChange}
                                className="w-full bg-slate-900/50 border border-slate-700 rounded-lg py-3 px-4 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            >
                                <option value="single-elimination">Single Elimination</option>
                                <option value="double-elimination">Double Elimination</option>
                                <option value="round-robin">Round Robin</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">Max Participants</label>
                            <input
                                type="number"
                                name="maxParticipants"
                                defaultValue={64}
                                onChange={handleChange}
                                className="w-full bg-slate-900/50 border border-slate-700 rounded-lg py-3 px-4 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Start Date</label>
                        <input
                            type="datetime-local"
                            name="startDate"
                            required
                            onChange={handleChange}
                            className="w-full bg-slate-900/50 border border-slate-700 rounded-lg py-3 px-4 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Rules</label>
                        <textarea
                            name="rules"
                            rows="4"
                            defaultValue={selectedGame?.defaultRules || ''}
                            onChange={handleChange}
                            className="w-full bg-slate-900/50 border border-slate-700 rounded-lg py-3 px-4 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        ></textarea>
                    </div>

                    <div className="flex justify-end gap-4">
                        <button
                            type="button"
                            onClick={() => navigate('/tournaments')}
                            className="px-6 py-3 text-gray-300 font-medium hover:text-white transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="btn-primary px-8 py-3 rounded-lg font-bold text-white shadow-lg shadow-indigo-500/20"
                        >
                            Create Tournament
                        </button>
                    </div>
                </form>
            </motion.div>
        </div>
    );
};

export default CreateTournament;
