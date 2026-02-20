import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Calendar, Users, Trophy, ArrowRight } from 'lucide-react';

const TournamentList = () => {
    const [tournaments, setTournaments] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchTournaments = async () => {
            try {
                const response = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/tournaments`);
                const data = await response.json();
                setTournaments(data);
            } catch (error) {
                console.error('Error fetching tournaments:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchTournaments();
    }, []);

    const user = JSON.parse(localStorage.getItem('user'));
    const isOrganizer = user && (user.role === 'organizer' || user.role === 'admin');

    if (loading) return <div className="text-center text-white pt-24">Loading Tournaments...</div>;

    return (
        <div className="pt-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto min-h-screen">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-display font-bold text-white">Tournaments</h1>
                    <p className="text-gray-400">Compete in the highest level esports events.</p>
                </div>
                {isOrganizer && (
                    <Link to="/tournaments/create" className="btn-primary px-6 py-2 rounded-lg font-bold text-white shadow-lg shadow-indigo-500/20">
                        Create Tournament
                    </Link>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {tournaments.map((tournament) => (
                    <motion.div
                        key={tournament._id}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="glass-card group hover:border-indigo-500/50 transition-colors"
                    >
                        <div className="flex justify-between items-start mb-4">
                            <span className={`px-2 py-1 rounded text-xs font-bold uppercase tracking-wide
                                ${tournament.status === 'upcoming' ? 'bg-emerald-500/20 text-emerald-400' :
                                    tournament.status === 'ongoing' ? 'bg-amber-500/20 text-amber-400' : 'bg-gray-700 text-gray-400'}`}>
                                {tournament.status}
                            </span>
                            {tournament.game?.icon ? (
                                <img src={tournament.game.icon} alt={tournament.game.name} className="w-6 h-6 rounded-md" title={tournament.game.name} />
                            ) : (
                                <Trophy className="h-5 w-5 text-indigo-400" />
                            )}
                        </div>

                        <h3 className="text-xl font-bold text-white mb-2 group-hover:text-indigo-400 transition-colors">{tournament.name}</h3>
                        <p className="text-gray-400 text-sm mb-4 line-clamp-2">{tournament.description}</p>

                        <div className="flex items-center gap-4 text-sm text-gray-500 mb-6">
                            <div className="flex items-center gap-1">
                                <Users className="h-4 w-4" />
                                <span>{tournament.participants.length} / {tournament.maxParticipants}</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <Calendar className="h-4 w-4" />
                                <span>{new Date(tournament.startDate).toLocaleDateString()}</span>
                            </div>
                        </div>

                        <Link to={`/tournaments/${tournament._id}`} className="w-full bg-slate-800 hover:bg-slate-700 text-white py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2">
                            View Details <ArrowRight className="h-4 w-4" />
                        </Link>
                    </motion.div>
                ))}
            </div>

            {tournaments.length === 0 && (
                <div className="text-center text-gray-500 mt-12">No tournaments found. Be the first to create one!</div>
            )}
        </div>
    );
};

export default TournamentList;
