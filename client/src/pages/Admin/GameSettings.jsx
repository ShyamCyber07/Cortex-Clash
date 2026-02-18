import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Check, X } from 'lucide-react';
import { adminService } from '../../services/adminService';
import Table from '../../components/Admin/Table';

const GameSettings = () => {
    const [games, setGames] = useState([]);
    const [editingGame, setEditingGame] = useState(null);
    const [isCreating, setIsCreating] = useState(false);
    const [formData, setFormData] = useState({});

    useEffect(() => {
        loadGames();
    }, []);

    const loadGames = async () => {
        try {
            const data = await adminService.getGames();
            setGames(data);
        } catch (error) {
            console.error(error);
        }
    };

    const handleEdit = (game) => {
        setEditingGame(game._id);
        const { _id, __v, createdAt, updatedAt, ...editableData } = game;
        // Flatten arrays for simple input (comma separated)
        setFormData({
            ...editableData,
            supportedFormats: editableData.supportedFormats.join(', '),
        });
        setIsCreating(false);
    };

    const handleCreate = () => {
        setEditingGame('new');
        setFormData({
            name: '', slug: '', description: '',
            supportedFormats: '5v5', maxPlayersPerTeam: 5,
            scoringType: 'win-loss', defaultRules: '',
            icon: '', banner: ''
        });
        setIsCreating(true);
    };

    const handleSave = async () => {
        try {
            const payload = {
                ...formData,
                supportedFormats: formData.supportedFormats.split(',').map(s => s.trim())
            };

            if (isCreating) {
                await adminService.createGame(payload);
            } else {
                await adminService.updateGame(editingGame, payload);
            }
            setEditingGame(null);
            loadGames();
        } catch (error) {
            alert('Failed to save game');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Delete this game? This will break tournaments using it.')) return;
        try {
            await adminService.deleteGame(id);
            setGames(games.filter(g => g._id !== id));
        } catch (error) {
            alert('Failed to delete game');
        }
    };

    // Columns for the table
    const columns = ['Name', 'Slug', 'Type', 'Formats', 'Status'];

    return (
        <div className="pt-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto min-h-screen">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-display font-bold text-white mb-2">Game Settings</h1>
                    <p className="text-gray-400">Configure supported esports titles.</p>
                </div>
                <button
                    onClick={handleCreate}
                    className="btn-primary py-2 px-4 rounded-lg font-bold flex items-center gap-2"
                >
                    <Plus className="h-5 w-5" /> Add Game
                </button>
            </div>

            {/* Editor Modal / Form (Inline for simplicity) */}
            {editingGame && (
                <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-slate-700 rounded-xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <h2 className="text-2xl font-bold text-white mb-6">
                            {isCreating ? 'Add New Game' : 'Edit Game'}
                        </h2>

                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm text-gray-400">Name</label>
                                    <input
                                        className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white"
                                        value={formData.name || ''}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="text-sm text-gray-400">Slug (URL)</label>
                                    <input
                                        className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white"
                                        value={formData.slug || ''}
                                        onChange={e => setFormData({ ...formData, slug: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-sm text-gray-400">Description</label>
                                <textarea
                                    className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white h-20"
                                    value={formData.description || ''}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm text-gray-400">Scoring Type</label>
                                    <select
                                        className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white"
                                        value={formData.scoringType || 'win-loss'}
                                        onChange={e => setFormData({ ...formData, scoringType: e.target.value })}
                                    >
                                        <option value="win-loss">Win/Loss</option>
                                        <option value="round-based">Round Based (Valorant/CS)</option>
                                        <option value="points-based">Points Based (Battle Royale)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-sm text-gray-400">Max Team Size</label>
                                    <input
                                        type="number"
                                        className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white"
                                        value={formData.maxPlayersPerTeam || 1}
                                        onChange={e => setFormData({ ...formData, maxPlayersPerTeam: parseInt(e.target.value) })}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-sm text-gray-400">Formats (comma separated)</label>
                                <input
                                    className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white"
                                    value={formData.supportedFormats || ''}
                                    onChange={e => setFormData({ ...formData, supportedFormats: e.target.value })}
                                    placeholder="5v5, 1v1"
                                />
                            </div>

                            <div>
                                <label className="text-sm text-gray-400">Icon URL</label>
                                <input
                                    className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white"
                                    value={formData.icon || ''}
                                    onChange={e => setFormData({ ...formData, icon: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-4 mt-8">
                            <button
                                onClick={() => setEditingGame(null)}
                                className="px-4 py-2 text-gray-400 hover:text-white"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                className="btn-primary px-6 py-2 rounded-lg font-bold text-white"
                            >
                                Save Changes
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <Table
                headers={columns}
                data={games}
                renderRow={(game) => (
                    <>
                        <td className="p-4 font-bold text-white flex items-center gap-3">
                            {game.icon && <img src={game.icon} className="w-6 h-6 rounded" />}
                            {game.name}
                        </td>
                        <td className="p-4 text-gray-400 font-mono text-sm">{game.slug}</td>
                        <td className="p-4 text-gray-300">{game.scoringType}</td>
                        <td className="p-4 text-gray-400">{game.supportedFormats.join(', ')}</td>
                        <td className="p-4">
                            <span className="text-emerald-400 text-xs font-bold bg-emerald-500/10 px-2 py-1 rounded">ACTIVE</span>
                        </td>
                    </>
                )}
                actions={(game) => (
                    <div className="flex justify-end gap-2">
                        <button onClick={() => handleEdit(game)} className="p-2 text-indigo-400 hover:bg-slate-700 rounded">
                            <Edit2 className="h-4 w-4" />
                        </button>
                        <button onClick={() => handleDelete(game._id)} className="p-2 text-red-400 hover:bg-slate-700 rounded">
                            <Trash2 className="h-4 w-4" />
                        </button>
                    </div>
                )}
            />
        </div>
    );
};

export default GameSettings;
