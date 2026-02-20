import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Users, Calendar, Shield, Swords, Play } from 'lucide-react';
import BracketView from '../../components/Tournament/BracketView';

const TournamentDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [tournament, setTournament] = useState(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);

    const user = JSON.parse(localStorage.getItem('user'));
    const isOrganizer = user && (user.role === 'organizer' || user.role === 'admin');

    // Check if current user is already registered
    const isRegistered = tournament?.participants.includes(user?._id);

    const fetchTournament = async () => {
        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/tournaments/${id}`);
            const data = await response.json();
            setTournament(data);
        } catch (error) {
            console.error('Error fetching tournament:', error);
        } finally {
            setLoading(false);
            setActionLoading(false);
        }
    };

    useEffect(() => {
        fetchTournament();
    }, [id]);

    const handleRegister = async () => {
        if (!user) return navigate('/login');

        setActionLoading(true);
        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/tournaments/${id}/join`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (response.ok) {
                fetchTournament(); // Refresh data
            } else {
                const data = await response.json();
                alert(data.message);
            }
        } catch (error) {
            console.error('Error registering:', error);
        } finally {
            setActionLoading(false);
        }
    };

    const handleStartTournament = async () => {
        if (!window.confirm('Are you sure you want to start the tournament? This will generate matches.')) return;

        setActionLoading(true);
        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/tournaments/${id}/start`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (response.ok) {
                fetchTournament();
            } else {
                const data = await response.json();
                alert(data.message);
            }
        } catch (error) {
            console.error('Error starting tournament:', error);
        } finally {
            setActionLoading(false);
        }
    };

    if (loading) return <div className="text-center text-white pt-24">Loading details...</div>;
    if (!tournament) return <div className="text-center text-white pt-24">Tournament not found</div>;

    return (
        <div className="pt-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto min-h-screen">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-card overflow-hidden"
            >
                <div className="relative h-48 bg-gradient-to-r from-indigo-900 to-purple-900 overflow-hidden">
                    {tournament.game?.banner && (
                        <div className="absolute inset-0 z-0">
                            <img src={tournament.game.banner} alt="" className="w-full h-full object-cover opacity-40 blur-sm" />
                        </div>
                    )}
                    <div className="absolute inset-0 bg-black/30 z-10"></div>
                    <div className="absolute bottom-6 left-8 z-20">
                        <h1 className="text-4xl font-display font-bold text-white mb-2">{tournament.name}</h1>
                        <div className="flex gap-4 text-gray-300 text-sm">
                            <span className="flex items-center gap-1"><Calendar className="h-4 w-4" /> {new Date(tournament.startDate).toLocaleString()}</span>
                            <span className="flex items-center gap-1">
                                {tournament.game?.icon ? (
                                    <img src={tournament.game.icon} alt="" className="w-4 h-4 rounded-full" />
                                ) : (
                                    <Shield className="h-4 w-4" />
                                )}
                                {tournament.game?.name || 'Unknown Game'} ({tournament.matchFormat})
                            </span>
                        </div>
                    </div>
                </div>

                <div className="p-8">
                    <div className="flex flex-col md:flex-row gap-8">
                        <div className="flex-1">
                            <div className="prose prose-invert max-w-none">
                                <h3 className="text-xl font-bold text-white mb-4">About this Tournament</h3>
                                <p className="text-gray-400 mb-6">{tournament.description}</p>

                                <h3 className="text-xl font-bold text-white mb-4">Rules</h3>
                                <div className="bg-slate-900/50 p-4 rounded-lg text-gray-400 text-sm whitespace-pre-wrap">
                                    {tournament.rules || 'No specific rules provided.'}
                                </div>
                            </div>
                        </div>

                        <div className="w-full md:w-80 space-y-6">
                            <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700">
                                <h4 className="text-white font-bold mb-4 flex items-center gap-2">
                                    <Users className="h-5 w-5 text-indigo-400" /> Participants
                                </h4>
                                <div className="text-3xl font-bold text-white mb-1">
                                    {tournament.participants.length} <span className="text-lg text-gray-500 font-normal">/ {tournament.maxParticipants}</span>
                                </div>
                                <div className="w-full bg-slate-700 h-2 rounded-full overflow-hidden mb-6">
                                    <div
                                        className="bg-indigo-500 h-full transition-all duration-1000"
                                        style={{ width: `${(tournament.participants.length / tournament.maxParticipants) * 100}%` }}
                                    ></div>
                                </div>

                                {/* Actions */}
                                {tournament.status === 'upcoming' ? (
                                    <>
                                        {isOrganizer ? (
                                            <button
                                                onClick={handleStartTournament}
                                                disabled={actionLoading}
                                                className="w-full btn-primary py-3 rounded-lg font-bold text-white flex items-center justify-center gap-2"
                                            >
                                                {actionLoading ? 'Starting...' : <><Play className="h-4 w-4" /> Start Tournament</>}
                                            </button>
                                        ) : (
                                            <button
                                                onClick={handleRegister}
                                                disabled={isRegistered || actionLoading || tournament.participants.length >= tournament.maxParticipants}
                                                className={`w-full py-3 rounded-lg font-bold text-white transition-all
                                                    ${isRegistered
                                                        ? 'bg-emerald-600 cursor-default'
                                                        : 'btn-primary hover:scale-[1.02] active:scale-[0.98]'}`}
                                            >
                                                {isRegistered ? 'Registered ✅' : 'Register Now'}
                                            </button>
                                        )}
                                    </>
                                ) : (
                                    <div className="text-center py-3 bg-slate-700/50 rounded-lg text-gray-300 font-medium border border-slate-600">
                                        Tournament is {tournament.status}
                                    </div>
                                )}
                            </div>

                            {/* Participant List Preview - simplified */}
                            <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700">
                                <h4 className="text-white font-bold mb-4">Confirmed Players</h4>
                                {/* In a real app we'd map participant names here if populated */}
                                <div className="text-sm text-gray-400">
                                    {tournament.participants.length > 0 ? 'Participants hidden for privacy' : 'No players yet'}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Bracket Section */}
                    {(tournament.status === 'ongoing' || tournament.status === 'completed') && (
                        <div className="mt-12 border-t border-slate-700 pt-8">
                            <BracketView tournament={tournament} />
                        </div>
                    )}
                </div>
            </motion.div>
        </div>
    );
};

export default TournamentDetails;
