import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, Filter, MoreVertical, Shield, Ban, CheckCircle } from 'lucide-react';
import { adminService } from '../../services/adminService';
import Table from '../../components/Admin/Table';

const UserManagement = () => {
    const [users, setUsers] = useState([]);
    const [filteredUsers, setFilteredUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState('all');

    const fetchUsers = async () => {
        try {
            const data = await adminService.getUsers();
            setUsers(data);
            setFilteredUsers(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    useEffect(() => {
        let result = users;
        if (search) {
            result = result.filter(u =>
                u.username.toLowerCase().includes(search.toLowerCase()) ||
                u.email.toLowerCase().includes(search.toLowerCase())
            );
        }
        if (roleFilter !== 'all') {
            result = result.filter(u => u.role === roleFilter);
        }
        setFilteredUsers(result);
    }, [search, roleFilter, users]);

    const handleRoleUpdate = async (userId, newRole) => {
        if (!window.confirm(`Change user role to ${newRole}?`)) return;

        // Optimistic UI Update
        const originalUsers = [...users];
        setUsers(users.map(u => u._id === userId ? { ...u, role: newRole } : u));

        try {
            await adminService.updateUserRole(userId, newRole);
        } catch (error) {
            alert('Failed to update role');
            setUsers(originalUsers); // Revert
        }
    };

    const columns = ['User', 'Email', 'Role', 'Stats', 'Joined'];

    return (
        <div className="pt-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto min-h-screen">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                <div>
                    <h1 className="text-3xl font-display font-bold text-white mb-2">User Management</h1>
                    <p className="text-gray-400">View and manage platform users.</p>
                </div>
            </div>

            {/* Filters */}
            <div className="glass-card p-4 mb-6 flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
                    <input
                        type="text"
                        placeholder="Search users..."
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-10 pr-4 py-2 text-white focus:outline-none focus:border-indigo-500"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <div className="flex items-center gap-2">
                    <Filter className="h-5 w-5 text-gray-500" />
                    <select
                        className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none"
                        value={roleFilter}
                        onChange={(e) => setRoleFilter(e.target.value)}
                    >
                        <option value="all">All Roles</option>
                        <option value="player">Player</option>
                        <option value="organizer">Organizer</option>
                        <option value="admin">Admin</option>
                    </select>
                </div>
            </div>

            {loading ? (
                <div className="text-center text-white py-12">Loading users...</div>
            ) : (
                <Table
                    headers={columns}
                    data={filteredUsers}
                    renderRow={(user) => (
                        <>
                            <td className="p-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-slate-700 overflow-hidden">
                                        {user.avatar ? (
                                            <img src={user.avatar} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-xs font-bold text-gray-400">
                                                {user.username[0].toUpperCase()}
                                            </div>
                                        )}
                                    </div>
                                    <span className="font-medium text-white">{user.username}</span>
                                </div>
                            </td>
                            <td className="p-4 text-gray-400">{user.email}</td>
                            <td className="p-4">
                                <span className={`px-2 py-1 rounded-full text-xs font-bold uppercase
                                    ${user.role === 'admin' ? 'bg-purple-500/20 text-purple-400' :
                                        user.role === 'organizer' ? 'bg-amber-500/20 text-amber-400' :
                                            'bg-slate-700 text-gray-400'}`}>
                                    {user.role}
                                </span>
                            </td>
                            <td className="p-4 text-gray-400 text-sm">
                                {user.stats?.matchesPlayed || 0} matches • {user.stats?.rankPoints || 1000} MMR
                            </td>
                            <td className="p-4 text-gray-500 text-sm">
                                {new Date(user.createdAt).toLocaleDateString()}
                            </td>
                        </>
                    )}
                    actions={(user) => (
                        <div className="flex justify-end gap-2">
                            {user.role !== 'admin' && (
                                <button
                                    onClick={() => handleRoleUpdate(user._id, 'admin')}
                                    className="p-2 hover:bg-slate-700 rounded-lg text-purple-400"
                                    title="Promote to Admin"
                                >
                                    <Shield className="h-4 w-4" />
                                </button>
                            )}
                            {user.role === 'player' && (
                                <button
                                    onClick={() => handleRoleUpdate(user._id, 'organizer')}
                                    className="p-2 hover:bg-slate-700 rounded-lg text-amber-400"
                                    title="Promote to Organizer"
                                >
                                    <MoreVertical className="h-4 w-4" />
                                </button>
                            )}
                            {/* Ban button placeholder - API needs Ban endpoint */}
                            <button className="p-2 hover:bg-slate-700 rounded-lg text-red-500" title="Ban User">
                                <Ban className="h-4 w-4" />
                            </button>
                        </div>
                    )}
                />
            )}
        </div>
    );
};

export default UserManagement;
