import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Calendar, CheckCircle } from 'lucide-react';
import { adminService } from '../../services/adminService';
import { motion } from 'framer-motion';

const SeasonManagement = () => {
    const [seasons, setSeasons] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({});
    const [editingId, setEditingId] = useState(null);

    useEffect(() => {
        loadSeasons();
    }, []);

    const loadSeasons = async () => {
        try {
            const data = await adminService.getSeasons();
            setSeasons(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingId) {
                const response = await adminService.updateSeason(editingId, formData);
                setSeasons(seasons.map(s => s._id === editingId ? response : s));
            } else {
                const response = await adminService.createSeason(formData);
                setSeasons([response, ...seasons]);
            }
            setShowForm(false);
            setEditingId(null);
            setFormData({});
        } catch (error) {
            alert('Operation failed: ' + error.message);
        }
    };

    const handleEdit = (season) => {
        setEditingId(season._id);
        const { _id, __v, createdAt, updatedAt, ...data } = season;
        // Format dates for input
        data.startDate = new Date(data.startDate).toISOString().split('T')[0];
        data.endDate = new Date(data.endDate).toISOString().split('T')[0];
        setFormData(data);
        setShowForm(true);
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Delete this season?')) return;
        try {
            await adminService.deleteSeason(id);
            setSeasons(seasons.filter(s => s._id !== id));
        } catch (error) {
            alert('Failed to delete season');
        }
    };

    return (
        <div className="pt-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto min-h-screen">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-display font-bold text-white mb-2">Season Management</h1>
                    <p className="text-gray-400">Manage competitive seasons and active pools.</p>
                </div>
                <button
                    onClick={() => { setShowForm(true); setEditingId(null); setFormData({}); }}
                    className="btn-primary py-2 px-4 rounded-lg font-bold flex items-center gap-2"
                >
                    <Plus className="h-5 w-5" /> Start New Season
                </button>
            </div>

            {/* Form Modal */}
            {showForm && (
                <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-slate-900 border border-slate-700 rounded-xl p-6 max-w-lg w-full"
                    >
                        <h2 className="text-xl font-bold text-white mb-4">
                            {editingId ? 'Edit Season' : 'Create Season'}
                        </h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="text-sm text-gray-400 block mb-1">Season Name</label>
                                <input
                                    className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white"
                                    required
                                    value={formData.name || ''}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm text-gray-400 block mb-1">Start Date</label>
                                    <input
                                        type="date"
                                        className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white"
                                        required
                                        value={formData.startDate || ''}
                                        onChange={e => setFormData({ ...formData, startDate: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="text-sm text-gray-400 block mb-1">End Date</label>
                                    <input
                                        type="date"
                                        className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white"
                                        required
                                        value={formData.endDate || ''}
                                        onChange={e => setFormData({ ...formData, endDate: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="flex items-center gap-2 py-2">
                                <input
                                    type="checkbox"
                                    id="isActive"
                                    className="rounded border-slate-700 bg-slate-800 text-indigo-500"
                                    checked={formData.isActive || false}
                                    onChange={e => setFormData({ ...formData, isActive: e.target.checked })}
                                />
                                <label htmlFor="isActive" className="text-white">Set as Active Season?</label>
                            </div>

                            <div className="flex justify-end gap-3 mt-6">
                                <button
                                    type="button"
                                    onClick={() => setShowForm(false)}
                                    className="px-4 py-2 text-gray-400 hover:text-white"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="btn-primary px-6 py-2 rounded-lg font-bold text-white"
                                >
                                    Save
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {seasons.map(season => (
                    <div key={season._id} className={`glass-card p-6 border ${season.isActive ? 'border-indigo-500/50 shadow-lg shadow-indigo-500/10' : 'border-slate-700'}`}>
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                {season.isActive && (
                                    <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-full mb-2">
                                        <CheckCircle className="h-3 w-3" /> ACTIVE
                                    </span>
                                )}
                                <h3 className="text-xl font-bold text-white">{season.name}</h3>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => handleEdit(season)} className="p-2 text-gray-400 hover:text-white bg-slate-800 rounded">
                                    <Edit2 className="h-4 w-4" />
                                </button>
                                <button onClick={() => handleDelete(season._id)} className="p-2 text-red-400 hover:text-red-300 bg-slate-800 rounded">
                                    <Trash2 className="h-4 w-4" />
                                </button>
                            </div>
                        </div>

                        <div className="space-y-2 text-sm text-gray-400">
                            <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4" />
                                <span>{new Date(season.startDate).toLocaleDateString()} — {new Date(season.endDate).toLocaleDateString()}</span>
                            </div>
                            <div>
                                {season.games?.length || 0} Games in Rotation
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default SeasonManagement;
