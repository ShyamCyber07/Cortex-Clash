import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Trophy, Clock, Shield, AlertTriangle, Activity, TrendingUp } from 'lucide-react';
import { useSocket } from '../../context/SocketContext';

const MatchRoom = () => {
    const { id } = useParams();
    const [match, setMatch] = useState(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    // Form State
    const [winnerId, setWinnerId] = useState('');
    const [score, setScore] = useState({}); // Stores structured data or string
    const [replayLink, setReplayLink] = useState('');

    // Prediction State
    const [prediction, setPrediction] = useState(null);
    const [loadingPrediction, setLoadingPrediction] = useState(false);

    const user = JSON.parse(localStorage.getItem('user'));
    const socket = useSocket();

    const fetchMatch = async () => {
        setLoading(prev => !match ? true : prev); // Only load full screen first time
        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/matches/${id}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            if (response.ok) {
                const data = await response.json();
                setMatch(data);
                if (data.status === 'completed') {
                    setWinnerId(data.winner?._id || data.winner);
                }
                // Fetch Prediction only if match is active or scheduled
                if (data.status !== 'completed' && data.participants?.length === 2) {
                    fetchPrediction();
                }
            }
        } catch (error) {
            console.error('Error fetching match:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchPrediction = async () => {
        setLoadingPrediction(true);
        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/matches/${id}/prediction`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            if (response.ok) {
                const data = await response.json();
                setPrediction(data);
            }
        } catch (err) {
            console.error("Failed to load prediction", err);
        } finally {
            setLoadingPrediction(false);
        }
    };

    // Socket Connection with Reconnection Logic
    useEffect(() => {
        if (!socket || !id) return;

        const handleConnect = () => {
            console.log('Socket connected/reconnected. Joining room...');
            socket.emit('join_match', id);
            // Re-fetch authoritative state on reconnect to sync missed events
            fetchMatch();
        };

        const handleMatchUpdate = (updatedMatch) => {
            console.log('Real-time update received:', updatedMatch);
            setMatch(updatedMatch);
            if (updatedMatch.status === 'completed') {
                setWinnerId(updatedMatch.winner?._id || updatedMatch.winner);
            }
        };

        socket.on('connect', handleConnect);
        socket.on('match_update', handleMatchUpdate);

        // Initial join if already connected
        if (socket.connected) {
            handleConnect();
        }

        return () => {
            socket.off('connect', handleConnect);
            socket.off('match_update', handleMatchUpdate);
            socket.emit('leave_match', id);
        };
    }, [socket, id]);

    // Initial Fetch
    useEffect(() => {
        fetchMatch();
    }, [id]);

    const handleSubmitResult = async (e) => {
        e.preventDefault();
        if (!window.confirm('Submit these results? This cannot be undone.')) return;

        setSubmitting(true);
        try {
            const scoringType = match.tournament?.game?.scoringType || 'win-loss';
            let payload = { replayLink };

            if (scoringType === 'win-loss') {
                payload.winnerId = winnerId;
            } else if (scoringType === 'round-based' || scoringType === 'points-based') {
                payload.result = { scores: score }; // score state holds the object
            }

            const response = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/matches/${id}/result`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                // Socket will update the UI
            } else {
                const data = await response.json();
                alert(data.message || 'Failed to submit result');
            }
        } catch (error) {
            console.error('Error submitting result:', error);
        } finally {
            setSubmitting(false);
        }
    };

    const handleConfirmResult = async () => {
        if (!window.confirm('Confirm this result?')) return;
        setSubmitting(true);
        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/matches/${id}/confirm`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (!response.ok) {
                const data = await response.json();
                alert(data.message);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <div className="pt-24 text-center text-white">Loading Match Room...</div>;
    if (!match) return <div className="pt-24 text-center text-white">Match not found.</div>;

    const isCompleted = match.status === 'completed';
    const isPending = match.verificationStatus === 'pending';
    // Check if the current user can confirm (must be participant, NOT the submitter)
    const canConfirm = isPending && user && match.participants.some(p => p._id === user._id) && match.submittedBy !== user._id;


    return (
        <div className="pt-24 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto min-h-screen">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-card p-8"
            >
                {/* Header */}
                <div className="text-center mb-10">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800 text-sm text-gray-400 mb-4 border border-slate-700">
                        <Trophy className="h-4 w-4 text-indigo-400" />
                        <span>{match.tournament?.name || 'Tournament Match'}</span>
                        <span className="mx-1">•</span>
                        <span>Round {match.round}</span>
                    </div>

                    <h1 className="text-4xl font-display font-bold text-white mb-2">Match Room</h1>
                    <div className={`inline-flex items-center gap-2 px-4 py-1 rounded text-sm font-bold uppercase tracking-wide
                        ${isCompleted ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
                        {match.verificationStatus === 'pending' ? 'Pending Confirmation' : match.status}
                    </div>
                </div>

                {/* Players VS */}
                <div className="flex flex-col md:flex-row items-center justify-center gap-8 md:gap-16 mb-12">
                    {/* Player 1 */}
                    <div className={`text-center transition-all ${match.winner && (match.winner._id === match.participants[0]?._id || match.winner === match.participants[0]?._id) ? 'scale-110' : ''}`}>
                        <div className={`w-24 h-24 mx-auto rounded-full flex items-center justify-center mb-4 border-4 
                            ${match.winner && (match.winner._id === match.participants[0]?._id || match.winner === match.participants[0]?._id) ? 'border-emerald-500 bg-emerald-500/20' : 'border-slate-700 bg-slate-800'}`}>
                            {match.participants[0]?.avatar ?
                                <img src={match.participants[0].avatar} alt="" className="w-full h-full rounded-full object-cover" /> :
                                <Shield className="h-10 w-10 text-gray-500" />
                            }
                        </div>
                        <h3 className="text-xl font-bold text-white">{match.participants[0]?.username}</h3>
                        <p className="text-indigo-400 text-sm">Rank {match.participants[0]?.stats?.rankPoints || 'N/A'}</p>
                    </div>

                    <div className="text-4xl font-display font-bold text-slate-600">VS</div>

                    {/* Player 2 */}
                    <div className={`text-center transition-all ${match.winner && (match.winner._id === match.participants[1]?._id || match.winner === match.participants[1]?._id) ? 'scale-110' : ''}`}>
                        <div className={`w-24 h-24 mx-auto rounded-full flex items-center justify-center mb-4 border-4 
                            ${match.winner && (match.winner._id === match.participants[1]?._id || match.winner === match.participants[1]?._id) ? 'border-emerald-500 bg-emerald-500/20' : 'border-slate-700 bg-slate-800'}`}>
                            {match.participants[1]?.avatar ?
                                <img src={match.participants[1].avatar} alt="" className="w-full h-full rounded-full object-cover" /> :
                                <Shield className="h-10 w-10 text-gray-500" />
                            }
                        </div>
                        <h3 className="text-xl font-bold text-white">{match.participants[1]?.username}</h3>
                        <p className="text-indigo-400 text-sm">Rank {match.participants[1]?.stats?.rankPoints || 'N/A'}</p>
                    </div>
                </div>

                {/* AI Prediction Card */}
                {prediction && !isCompleted && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-10 bg-slate-900/50 backdrop-blur-sm rounded-xl border border-indigo-500/20 overflow-hidden"
                    >
                        <div className="p-4 border-b border-white/5 bg-white/5 flex items-center justify-between">
                            <h3 className="text-indigo-300 font-bold flex items-center gap-2">
                                <Activity className="w-4 h-4" />
                                Cortex AI Prediction
                            </h3>
                            {prediction.confidence_score > 0.6 && (
                                <div className="text-xs px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                                    <TrendingUp className="w-3 h-3" /> High Confidence
                                </div>
                            )}
                        </div>

                        <div className="p-6 relative">
                            <div className="flex justify-between items-end mb-2 text-sm font-medium">
                                <div className="text-slate-300">
                                    {match.participants[0]?.username} <span className="text-slate-500">({(prediction.win_probability * 100).toFixed(1)}%)</span>
                                </div>
                                <div className="text-slate-300">
                                    <span className="text-slate-500">({((1 - prediction.win_probability) * 100).toFixed(1)}%)</span> {match.participants[1]?.username}
                                </div>
                            </div>

                            {/* Probability Bar */}
                            <div className="h-4 bg-slate-800 rounded-full overflow-hidden flex relative">
                                {/* Separator Line for 50% */}
                                <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-slate-900 z-10" />

                                <motion.div
                                    initial={{ width: '50%' }}
                                    animate={{ width: `${prediction.win_probability * 100}%` }}
                                    transition={{ duration: 1.5, ease: "easeOut" }}
                                    className="h-full bg-gradient-to-r from-indigo-500 to-purple-500"
                                />
                                <motion.div
                                    initial={{ width: '50%' }}
                                    animate={{ width: `${(1 - prediction.win_probability) * 100}%` }}
                                    transition={{ duration: 1.5, ease: "easeOut" }}
                                    className="h-full bg-slate-700"
                                />
                            </div>

                            <div className="mt-2 text-center text-xs text-slate-500">
                                Win Probability based on {match.tournament?.game?.name || 'historical'} performance
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* Result Submission / Display */}
                <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
                    <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                        {isCompleted ? 'Match Results' : 'Submit Result'}
                    </h3>

                    {isCompleted ? (
                        <div className="text-center space-y-4">
                            <div className="text-2xl text-white font-mono">{match.score}</div>
                            <div className="text-emerald-400 font-bold">
                                Winner: {match.winner?.username || 'Unknown'}
                            </div>
                            {match.replayLink && (
                                <a href={match.replayLink} target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:text-indigo-300 underline text-sm">
                                    Watch Replay
                                </a>
                            )}
                        </div>
                    ) : isPending ? (
                        <div className="text-center p-6 bg-slate-800 rounded-lg">
                            <h4 className="text-xl font-bold text-amber-400 mb-2">Verification Pending</h4>
                            <p className="text-gray-400 mb-6">
                                Result submitted.
                                {canConfirm ? ' Please verify the outcome.' : ' Awaiting opponent confirmation.'}
                            </p>

                            {canConfirm && (
                                <button
                                    onClick={handleConfirmResult}
                                    disabled={submitting}
                                    className="btn-primary px-8 py-3 rounded-lg font-bold text-white shadow-lg shadow-emerald-500/20"
                                >
                                    {submitting ? 'Verifying...' : '✅ Confirm Result'}
                                </button>
                            )}
                        </div>
                    ) : (
                        <form onSubmit={handleSubmitResult} className="space-y-6">
                            {/* Only show to organizer/admin or participants */}
                            {user && (match.participants.some(p => p._id === user._id) || user.role === 'organizer' || user.role === 'admin') ? (
                                <>
                                    {/* Dynamic Form based on Scoring Type */}
                                    {(() => {
                                        const scoringType = match.tournament?.game?.scoringType || 'win-loss';

                                        if (scoringType === 'round-based') {
                                            return (
                                                <div className="grid grid-cols-2 gap-4">
                                                    {match.participants.map(p => (
                                                        <div key={p._id}>
                                                            <label className="block text-sm font-medium text-gray-400 mb-2">{p.username}'s Score</label>
                                                            <input
                                                                type="number"
                                                                min="0"
                                                                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-indigo-500"
                                                                onChange={(e) => {
                                                                    const val = parseInt(e.target.value) || 0;
                                                                    setScore(prev => ({ ...prev, [p._id]: val }));
                                                                    // Auto-set winner based on higher score
                                                                    // Not setting winnerId state here to avoid confusion, simpler to determining logic or let backend decide
                                                                }}
                                                                required
                                                            />
                                                        </div>
                                                    ))}
                                                </div>
                                            );
                                        } else if (scoringType === 'points-based') {
                                            return (
                                                <div className="space-y-4">
                                                    {match.participants.map(p => (
                                                        <div key={p._id} className="bg-slate-900/50 p-4 rounded-lg border border-slate-700">
                                                            <h4 className="text-white font-bold mb-2">{p.username}</h4>
                                                            <div className="grid grid-cols-2 gap-4">
                                                                <div>
                                                                    <label className="block text-xs text-gray-400 mb-1">Rank (#)</label>
                                                                    <input
                                                                        type="number"
                                                                        min="1"
                                                                        className="w-full bg-slate-800 border border-slate-600 rounded p-2 text-white"
                                                                        onChange={(e) => {
                                                                            const val = parseInt(e.target.value) || 0;
                                                                            setScore(prev => ({
                                                                                ...prev,
                                                                                [p._id]: { ...prev[p._id], rank: val }
                                                                            }));
                                                                        }}
                                                                        required
                                                                    />
                                                                </div>
                                                                <div>
                                                                    <label className="block text-xs text-gray-400 mb-1">Kills</label>
                                                                    <input
                                                                        type="number"
                                                                        min="0"
                                                                        className="w-full bg-slate-800 border border-slate-600 rounded p-2 text-white"
                                                                        onChange={(e) => {
                                                                            const val = parseInt(e.target.value) || 0;
                                                                            setScore(prev => ({
                                                                                ...prev,
                                                                                [p._id]: { ...prev[p._id], kills: val }
                                                                            }));
                                                                        }}
                                                                        required
                                                                    />
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            );
                                        } else {
                                            // Default Win/Loss
                                            return (
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-400 mb-2">Winner</label>
                                                    <select
                                                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                                        value={winnerId}
                                                        onChange={(e) => setWinnerId(e.target.value)}
                                                        required
                                                    >
                                                        <option value="">Select Winner</option>
                                                        {match.participants.map(p => (
                                                            <option key={p._id} value={p._id}>{p.username}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            );
                                        }
                                    })()}

                                    <div>
                                        <label className="block text-sm font-medium text-gray-400 mb-2">Replay Link (Optional)</label>
                                        <input
                                            type="url"
                                            placeholder="https://twitch.tv/..."
                                            className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                            value={replayLink}
                                            onChange={(e) => setReplayLink(e.target.value)}
                                        />
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={submitting}
                                        className="w-full btn-primary py-3 rounded-lg font-bold text-white shadow-lg shadow-indigo-500/20 disabled:opacity-50"
                                    >
                                        {submitting ? 'Submitting...' : 'Submit Result'}
                                    </button>
                                </>
                            ) : (
                                <div className="flex items-start gap-4 p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-200">
                                    <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <h4 className="font-bold mb-1">Awaiting Result</h4>
                                        <p className="text-sm opacity-90">
                                            The match is currently ongoing. Please report your scores to the tournament organizer.
                                        </p>
                                    </div>
                                </div>
                            )}
                        </form>
                    )}
                </div>
            </motion.div>
        </div>
    );
};

export default MatchRoom;
