import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Trophy, Menu, X, User, LogOut, LayoutDashboard } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
    const [isOpen, setIsOpen] = useState(false);
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <nav className="fixed w-full z-50 glass-nav">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-20">
                    <div className="flex items-center">
                        <Link to="/" className="flex-shrink-0 flex items-center gap-2 group">
                            <div className="relative">
                                <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full blur opacity-25 group-hover:opacity-75 transition duration-200"></div>
                                <Trophy className="relative h-8 w-8 text-indigo-400 group-hover:text-indigo-300 transition-colors" />
                            </div>
                            <span className="font-display font-bold text-2xl tracking-wider text-white">
                                CORTEX<span className="text-indigo-500">CLASH</span>
                            </span>
                        </Link>
                    </div>
                    <div className="hidden md:block">
                        <div className="ml-10 flex items-baseline space-x-8">
                            <Link to="/" className="text-gray-300 hover:text-indigo-400 px-3 py-2 rounded-md font-medium transition-colors">Home</Link>
                            <Link to="/tournaments" className="text-gray-300 hover:text-indigo-400 px-3 py-2 rounded-md font-medium transition-colors">Tournaments</Link>
                            <Link to="/rankings" className="text-gray-300 hover:text-indigo-400 px-3 py-2 rounded-md font-medium transition-colors">Rankings</Link>
                            <Link to="/analytics" className="text-gray-300 hover:text-indigo-400 px-3 py-2 rounded-md font-medium transition-colors">Analytics</Link>
                        </div>
                    </div>
                    <div className="hidden md:block">
                        <div className="flex items-center gap-4">
                            {user ? (
                                <>
                                    <div className="flex items-center gap-3 mr-4">
                                        <div className="w-8 h-8 rounded-full bg-indigo-500/20 border border-indigo-500/50 flex items-center justify-center text-indigo-400">
                                            {user.avatar ? <img src={user.avatar} alt="" className="w-full h-full rounded-full" /> : <User className="h-5 w-5" />}
                                        </div>
                                        <span className="text-gray-300 font-medium">{user.username}</span>
                                    </div>
                                    <Link to="/dashboard" className="text-gray-300 hover:text-white font-medium transition-colors flex items-center gap-2">
                                        <LayoutDashboard className="h-4 w-4" /> Dashboard
                                    </Link>
                                    {user.role === 'admin' && (
                                        <Link to="/admin" className="text-indigo-400 hover:text-white font-medium transition-colors flex items-center gap-2">
                                            <Trophy className="h-4 w-4" /> Admin
                                        </Link>
                                    )}
                                    <button
                                        onClick={handleLogout}
                                        className="btn-primary px-4 py-2 rounded-lg font-bold shadow-lg shadow-red-500/10 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 text-red-400 flex items-center gap-2 transition-all"
                                    >
                                        <LogOut className="h-4 w-4" /> Logout
                                    </button>
                                </>
                            ) : (
                                <>
                                    <Link to="/login" className="text-gray-300 hover:text-white font-medium transition-colors">Log In</Link>
                                    <Link to="/signup" className="btn-primary px-6 py-2 rounded-lg font-bold shadow-lg shadow-indigo-500/20 transform hover:-translate-y-0.5 transition-all">
                                        Join Now
                                    </Link>
                                </>
                            )}
                        </div>
                    </div>
                    <div className="-mr-2 flex md:hidden">
                        <button onClick={() => setIsOpen(!isOpen)} className="text-gray-300 hover:text-white p-2">
                            {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                        </button>
                    </div>
                </div>
            </div>
            {/* Mobile menu */}
            {isOpen && (
                <div className="md:hidden glass border-t border-white/10 animate-in slide-in-from-top-5 fade-in duration-200">
                    <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
                        <Link to="/" className="text-gray-300 hover:text-white block px-3 py-2 rounded-md text-base font-medium">Home</Link>
                        <Link to="/tournaments" className="text-gray-300 hover:text-white block px-3 py-2 rounded-md text-base font-medium">Tournaments</Link>
                        <Link to="/rankings" className="text-gray-300 hover:text-white block px-3 py-2 rounded-md text-base font-medium">Rankings</Link>

                        {user ? (
                            <>
                                <Link to="/dashboard" className="text-indigo-400 hover:text-white block px-3 py-2 rounded-md text-base font-medium">Dashboard</Link>
                                <button onClick={handleLogout} className="text-red-400 hover:text-red-300 block w-full text-left px-3 py-2 rounded-md text-base font-medium">Logout</button>
                            </>
                        ) : (
                            <>
                                <Link to="/login" className="text-gray-300 hover:text-white block px-3 py-2 rounded-md text-base font-medium">Log In</Link>
                                <Link to="/signup" className="bg-indigo-600 text-white block px-3 py-2 rounded-md text-base font-medium mt-4 text-center">Join Now</Link>
                            </>
                        )}
                    </div>
                </div>
            )}
        </nav>
    );
};

export default Navbar;
